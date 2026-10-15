import { Buffer } from 'buffer';
import nacl from 'tweetnacl';
import { z } from 'zod';
import { Entropy, fromUtf8, utf8 } from '../persistence/snapshot';

export const PROTOCOL_VERSION = 1;
export const MAX_FRAME = 128 * 1024;
const base64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');
const bytes = (encoded: string, length?: number): Uint8Array => {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) throw new Error('配对数据格式错误');
  const value = new Uint8Array(Buffer.from(encoded, 'base64'));
  if ((length !== undefined && value.length !== length) || base64(value) !== encoded)
    throw new Error('配对数据长度错误');
  return value;
};
export interface Pairing {
  v: 1;
  sessionId: string;
  publicKey: string;
  token: string;
  host: string;
  port: number;
  expires: number;
}
export interface ReceiverIdentity {
  pairing: Pairing;
  secretKey: Uint8Array;
}
const pairingSchema = z.strictObject({
  v: z.literal(1),
  sessionId: z.string().regex(/^[0-9a-f]{32}$/),
  publicKey: z.string().max(50),
  token: z.string().max(50),
  host: z
    .string()
    .min(1)
    .max(253)
    .regex(/^[a-zA-Z0-9.:_%\-]+$/),
  port: z.number().int().min(1).max(65535),
  expires: z.number().int().positive(),
});
export function makeReceiver(
  entropy: Entropy,
  host: string,
  port: number,
  now = Date.now(),
): ReceiverIdentity {
  const keyPair = nacl.box.keyPair.fromSecretKey(entropy(32));
  return {
    secretKey: keyPair.secretKey,
    pairing: {
      v: 1,
      sessionId: Buffer.from(entropy(16)).toString('hex'),
      publicKey: base64(keyPair.publicKey),
      token: base64(entropy(32)),
      host,
      port,
      expires: now + 120000,
    },
  };
}
export function encodePairing(pairing: Pairing): string {
  return `STARGROVE1:${base64(utf8(JSON.stringify(pairing)))}`;
}
export function decodePairing(text: string, now = Date.now()): Pairing {
  if (text.length > 1500 || !text.startsWith('STARGROVE1:'))
    throw new Error('请扫描接收端当前显示的配对码');
  const pairing = pairingSchema.parse(JSON.parse(fromUtf8(bytes(text.slice(11)))));
  bytes(pairing.publicKey, 32);
  bytes(pairing.token, 32);
  if (pairing.expires < now || pairing.expires > now + 125000)
    throw new Error('配对码已过期或手机时间差过大，请重新接收');
  return pairing;
}
export function equalToken(a: string, b: string): boolean {
  try {
    return nacl.verify(bytes(a, 32), bytes(b, 32));
  } catch {
    return false;
  }
}
export class SecureChannel {
  private readonly shared: Uint8Array;
  private outgoing = 0;
  private incoming = 0;
  constructor(
    private readonly role: 'sender' | 'receiver',
    private readonly sessionId: string,
    secretKey: Uint8Array,
    peerPublicKey: string,
    private readonly entropy: Entropy,
  ) {
    this.shared = nacl.box.before(bytes(peerPublicKey, 32), secretKey);
    if (this.shared.every((b) => b === 0)) throw new Error('无效配对公钥');
  }
  seal(message: Record<string, unknown>): string {
    const nonce = this.entropy(24);
    const plain = utf8(
      JSON.stringify({
        sessionId: this.sessionId,
        from: this.role,
        sequence: this.outgoing++,
        message,
      }),
    );
    const frame = JSON.stringify({
      n: base64(nonce),
      c: base64(nacl.box.after(plain, nonce, this.shared)),
    });
    if (frame.length > MAX_FRAME) throw new Error('传输消息过大');
    return frame + '\n';
  }
  open(frame: string): Record<string, unknown> {
    if (frame.length > MAX_FRAME) throw new Error('传输消息过大');
    const box = z
      .strictObject({ n: z.string().max(32), c: z.string().max(MAX_FRAME) })
      .parse(JSON.parse(frame));
    const plain = nacl.box.open.after(bytes(box.c), bytes(box.n, 24), this.shared);
    if (!plain) throw new Error('加密校验失败，请重新配对');
    const decoded = z
      .strictObject({
        sessionId: z.string(),
        from: z.enum(['sender', 'receiver']),
        sequence: z.number().int().nonnegative(),
        message: z.record(z.string(), z.unknown()),
      })
      .parse(JSON.parse(fromUtf8(plain)));
    if (
      decoded.sessionId !== this.sessionId ||
      decoded.from === this.role ||
      decoded.sequence !== this.incoming
    )
      throw new Error('拒绝重放或乱序消息');
    this.incoming += 1;
    return decoded.message;
  }
  dispose(): void {
    this.shared.fill(0);
  }
}
export function senderKeys(entropy: Entropy) {
  const pair = nacl.box.keyPair.fromSecretKey(entropy(32));
  return { secretKey: pair.secretKey, publicKey: base64(pair.publicKey) };
}
export class LineDecoder {
  private buffer = '';
  feed(chunk: string, onLine: (line: string) => void): void {
    // Bound the unfinished frame, while allowing several complete frames in one TCP event.
    for (const part of chunk.split('\n').entries()) {
      const [index, value] = part;
      if (index > 0) {
        onLine(this.buffer);
        this.buffer = '';
      }
      if (this.buffer.length + value.length > MAX_FRAME) throw new Error('传输帧超过上限');
      this.buffer += value;
    }
  }
}
