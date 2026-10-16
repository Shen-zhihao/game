import { createHash } from 'node:crypto';
import {
  createReadStream,
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';

interface Artifact {
  path: string;
  bytes: number;
  sha256: string;
}

interface Manifest {
  version: string;
  artifacts: Artifact[];
  additionalDeliverables?: Artifact[];
  supportFiles?: string[];
}

const temporaryDirectories = new Set([
  'android-package-staging',
  'ios-build',
  'ios-device-build',
  'bundles',
  'final-bundles',
  'art-guides',
  'coast-guides',
]);
const packageExtension = /\.(apk|aab|ipa|zip)$/i;
const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function markdownText(directory: string): string {
  if (!existsSync(directory)) return '';
  return readdirSync(directory, { withFileTypes: true })
    .map((entry) => {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) return '';
      if (entry.isDirectory()) return markdownText(path);
      return entry.name.endsWith('.md') ? readFileSync(path, 'utf8') : '';
    })
    .join('\n');
}

function inventory(path: string): { bytes: number; files: number; archive: boolean } {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) return { bytes: 0, files: 1, archive: false };
  if (!stat.isDirectory()) return { bytes: stat.size, files: 1, archive: false };
  const total = { bytes: 0, files: 0, archive: path.endsWith('.xcarchive') };
  for (const name of readdirSync(path)) {
    const item = inventory(join(path, name));
    total.bytes += item.bytes;
    total.files += item.files;
    total.archive ||= item.archive;
  }
  return total;
}

export async function cleanExports(projectRoot: string, apply = false) {
  const directory = resolve(projectRoot, 'exports');
  if (lstatSync(directory).isSymbolicLink()) throw new Error('exports 不能是符号链接');
  const metadataText = readFileSync(join(directory, 'artifacts.json'), 'utf8');
  const manifest = JSON.parse(metadataText) as Manifest;
  if (!manifest.version || !Array.isArray(manifest.artifacts) || !manifest.artifacts.length)
    throw new Error('artifacts.json 必须列出当前已验证的安装包');

  const deliverables = [...manifest.artifacts, ...(manifest.additionalDeliverables ?? [])];
  const current = new Set<string>();
  const checksums: string[] = [];
  for (const item of deliverables) {
    if (typeof item.path !== 'string' || !/^[a-f0-9]{64}$/.test(item.sha256))
      throw new Error('产物路径或 SHA-256 无效');
    const relative = item.path.replace(/^exports\//, '');
    const path = isAbsolute(item.path) ? resolve(item.path) : resolve(directory, relative);
    if (dirname(path) !== directory) throw new Error(`产物必须直接位于 exports：${item.path}`);
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== item.bytes)
      throw new Error(`产物缺失、类型或体积不符：${item.path}`);
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    if (hash.digest('hex') !== item.sha256) throw new Error(`SHA-256 不符，停止清理：${item.path}`);
    current.add(basename(path));
    checksums.push(`${item.sha256}  ${basename(path)}`);
  }

  const names = readdirSync(directory);
  const families = manifest.artifacts.map((item) => {
    const name = basename(item.path);
    const index = name.indexOf(manifest.version);
    if (index < 0) return null;
    return new RegExp(
      `^${escapePattern(name.slice(0, index))}\\d+\\.\\d+\\.\\d+${escapePattern(name.slice(index + manifest.version.length))}$`,
    );
  });
  const obsolete = names.filter(
    (name) =>
      packageExtension.test(name) &&
      !current.has(name) &&
      families.some((pattern) => pattern?.test(name)),
  );
  const otherPackages = names.filter(
    (name) => packageExtension.test(name) && !current.has(name) && !obsolete.includes(name),
  );
  const saves = names.filter((name) => /\.stargrove(?:\.json)?$/i.test(name));
  const companionOf = (name: string, packages: string[]) =>
    packages.some((file) => {
      const stem = file.replace(/\.(?:apk|aab|ipa|zip|stargrove)(?:\.json)?$/i, '');
      return (
        name.startsWith(`${file}.`) || name.startsWith(`${stem}.`) || name.startsWith(`${stem}-`)
      );
    });
  const docs = [
    markdownText(join(projectRoot, 'docs')),
    ...['README.md', 'AGENTS.md'].map((name) => {
      const path = join(projectRoot, name);
      return existsSync(path) ? readFileSync(path, 'utf8') : '';
    }),
  ].join('\n');
  const support = new Set(manifest.supportFiles ?? []);
  const kept: string[] = [];
  const removed: { name: string; bytes: number; files: number }[] = [];
  for (const name of names) {
    const path = join(directory, name);
    const stat = lstatSync(path);
    let keep =
      current.has(name) ||
      ['.gitkeep', 'artifacts.json', 'SHA256SUMS.txt'].includes(name) ||
      support.has(name) ||
      stat.isSymbolicLink() ||
      name.endsWith('.xcarchive');
    if (!keep) {
      if (otherPackages.includes(name) || companionOf(name, otherPackages)) {
        keep = true;
      } else if (obsolete.includes(name) || companionOf(name, obsolete) || name === 'SHA256SUMS') {
        keep = false;
      } else if (stat.isDirectory()) {
        keep = !temporaryDirectories.has(name);
      } else {
        keep =
          /\.stargrove(?:\.json)?$/i.test(name) ||
          companionOf(name, saves) ||
          /-ax\.txt$/i.test(name) ||
          /\.(png|jpe?g|webp)$/i.test(name) ||
          metadataText.includes(name) ||
          docs.includes(name);
      }
    }
    if (keep) {
      kept.push(name);
      continue;
    }
    const size = inventory(path);
    if (size.archive) {
      kept.push(name);
      continue;
    }
    removed.push({ name, bytes: size.bytes, files: size.files });
  }

  if (apply) {
    for (const item of removed) rmSync(join(directory, item.name), { recursive: true });
    const checksumPath = join(directory, 'SHA256SUMS.txt');
    writeFileSync(`${checksumPath}.tmp`, `${checksums.join('\n')}\n`);
    renameSync(`${checksumPath}.tmp`, checksumPath);
  }
  return {
    applied: apply,
    verifiedDeliverables: current.size,
    removed,
    kept,
    bytes: removed.reduce((total, item) => total + item.bytes, 0),
    files: removed.reduce((total, item) => total + item.files, 0),
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--apply')) {
    console.error('用法：pnpm exports:clean [--apply]；默认只预览');
    process.exitCode = 1;
  } else {
    cleanExports(process.cwd(), args.includes('--apply'))
      .then((result) => console.log(JSON.stringify(result, null, 2)))
      .catch((error: Error) => {
        console.error(error.message);
        process.exitCode = 1;
      });
  }
}
