import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanExports } from '../tools/clean-exports';

const roots: string[] = [];
const packageName = 'stargrove-0.1.0-android-arm64.apk';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'stargrove-exports-'));
  roots.push(root);
  const exports = join(root, 'exports');
  mkdirSync(exports);
  const put = (name: string, value = 'fixture') => {
    const path = join(exports, name);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, value);
  };
  put(packageName, 'current');
  put('.gitkeep', '');
  put('SHA256SUMS.txt', 'old checksums\n');
  const manifest = {
    version: '0.1.0',
    artifacts: [{ path: packageName, bytes: 7, sha256: hash('current') }],
    additionalDeliverables: [{ path: 'stargrove-dex.html', bytes: 3, sha256: hash('dex') }],
    supportFiles: ['android-release-build.log'],
  };
  put('stargrove-dex.html', 'dex');
  const saveManifest = () => put('artifacts.json', JSON.stringify(manifest));
  saveManifest();
  return { root, exports, put, manifest, saveManifest };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('打包后清理 exports', () => {
  it('默认预览，不修改任何文件或校验清单', async () => {
    const f = fixture();
    f.put('obsolete.log');
    const result = await cleanExports(f.root);
    expect(result.applied).toBe(false);
    expect(result.removed.map((item) => item.name)).toContain('obsolete.log');
    expect(existsSync(join(f.exports, 'obsolete.log'))).toBe(true);
    expect(readFileSync(join(f.exports, 'SHA256SUMS.txt'), 'utf8')).toBe('old checksums\n');
  });

  it('只删除旧同类包及配套文件，保留当前包、其他环境／架构／平台和存档证据', async () => {
    const f = fixture();
    const removed = [
      'stargrove-0.0.9-android-arm64.apk',
      'stargrove-0.0.9-android-arm64.build.log',
      'stargrove-0.0.9-android-arm64.apk.sha256',
      'old.log',
      'scratch.ts',
      'unreferenced-report.json',
      'SHA256SUMS',
    ];
    const kept = [
      'stargrove-0.0.9-android-staging-arm64.apk',
      'stargrove-0.0.9-android-staging-arm64.mapping.txt',
      'stargrove-0.0.9-android-arm64-staging.apk',
      'stargrove-0.0.9-android-arm64-staging.mapping.txt',
      'stargrove-0.0.9-android-armeabi-v7a.apk',
      'stargrove-0.0.9-ios-simulator-arm64.zip',
      'android-release-build.log',
      'player.stargrove',
      'story.stargrove.json',
      'story-commands.json',
      'verified-ax.txt',
      'verified.png',
      'ui-proof.json',
    ];
    for (const name of [...removed, ...kept]) f.put(name);
    writeFileSync(join(f.root, 'README.md'), '验收记录：`exports/ui-proof.json`');
    const result = await cleanExports(f.root, true);
    expect(result.verifiedDeliverables).toBe(2);
    for (const name of removed) expect(existsSync(join(f.exports, name)), name).toBe(false);
    for (const name of [...kept, packageName, 'artifacts.json', '.gitkeep'])
      expect(existsSync(join(f.exports, name)), name).toBe(true);
    expect(readFileSync(join(f.exports, 'SHA256SUMS.txt'), 'utf8')).toBe(
      `${hash('current')}  ${packageName}\n${hash('dex')}  stargrove-dex.html\n`,
    );
    expect((await cleanExports(f.root, true)).removed).toEqual([]);
  });

  it('缓存内的符号链接不会跟随删除，包含 Xcode Archive 的目录保留', async () => {
    const f = fixture();
    f.put('ios-build/cache/file');
    f.put('ios-device-build/archive.xcarchive/Info.plist');
    const outside = join(f.root, 'outside');
    mkdirSync(outside);
    writeFileSync(join(outside, 'keep.txt'), 'keep');
    symlinkSync(outside, join(f.exports, 'ios-build/cache/link'));
    symlinkSync(outside, join(f.exports, 'external'));
    await cleanExports(f.root, true);
    expect(existsSync(join(f.exports, 'ios-build'))).toBe(false);
    expect(existsSync(join(f.exports, 'ios-device-build/archive.xcarchive/Info.plist'))).toBe(true);
    expect(existsSync(join(f.exports, 'external/keep.txt'))).toBe(true);
    expect(readFileSync(join(outside, 'keep.txt'), 'utf8')).toBe('keep');
  });

  it('任一交付文件校验失败时，旧包与所有临时文件原样保留', async () => {
    const f = fixture();
    f.put('old.log');
    f.put('stargrove-0.0.9-android-arm64.apk');
    f.put('stargrove-dex.html', 'bad');
    await expect(cleanExports(f.root, true)).rejects.toThrow('SHA-256 不符');
    expect(existsSync(join(f.exports, 'old.log'))).toBe(true);
    expect(existsSync(join(f.exports, 'stargrove-0.0.9-android-arm64.apk'))).toBe(true);
    expect(readFileSync(join(f.exports, 'SHA256SUMS.txt'), 'utf8')).toBe('old checksums\n');
  });

  it('拒绝越出 exports 的产物路径', async () => {
    const f = fixture();
    f.manifest.artifacts[0]!.path = '../outside.apk';
    f.saveManifest();
    await expect(cleanExports(f.root, true)).rejects.toThrow('产物必须直接位于 exports');
  });
});
