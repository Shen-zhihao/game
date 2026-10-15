import { MAX_SAVE_BYTES, Snapshot } from './snapshot';
export async function exportSave(snapshot: Snapshot): Promise<void> {
  const blob = new Blob([JSON.stringify(snapshot)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `stargrove-${snapshot.revisionId.slice(0, 8)}.stargrove`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function pickSave(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.stargrove,.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      if (file.size > MAX_SAVE_BYTES) {
        reject(new Error('存档超过 8 MiB 上限'));
        return;
      }
      file.text().then(resolve, reject);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
