import { execFileSync } from 'node:child_process';

// oxipng is a development asset tool. Keep RGBA values, colour profiles and transparency intact.
export const PNG_COMPRESSION = {
  tool: 'oxipng',
  options: ['-o', '2', '--strip', 'safe'],
  lossless: true,
};
export function compressPng(png: Uint8Array): Buffer {
  return execFileSync('oxipng', [...PNG_COMPRESSION.options, '--threads', '2', '--stdout', '-'], {
    input: png,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}
