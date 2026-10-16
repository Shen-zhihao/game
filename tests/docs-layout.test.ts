import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

describe('中文主题文档目录', () => {
  it('每份文档均放进中文主题文件夹，文件名使用中文', () => {
    for (const entry of readdirSync('docs', { withFileTypes: true })) {
      expect(entry.isDirectory(), entry.name).toBe(true);
      expect(entry.name).toMatch(/[\u4e00-\u9fff]/);
    }
    for (const path of files('docs'))
      expect(path.slice(path.lastIndexOf('/') + 1)).toMatch(/[\u4e00-\u9fff]/);
  });
  it('迁移后的文档和README本地链接都能找到目标文件', () => {
    for (const file of ['README.md', ...files('docs').filter((path) => extname(path) === '.md')]) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)) {
        const target = match[1]!;
        if (/^(https?:|mailto:|codex:|#|\/)/.test(target)) continue;
        const path = decodeURI(target.split('#')[0]!);
        expect(existsSync(resolve(dirname(file), path)), `${file}: ${target}`).toBe(true);
      }
    }
  });
});
