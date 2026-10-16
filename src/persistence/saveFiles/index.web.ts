import { MAX_SAVE_FILE_BYTES, PortableSave, saveFileData } from '../archive';
export async function exportSave(save: PortableSave): Promise<void> {
  const { filename, text } = saveFileData(save);
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function pickSave(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.stargrove,.json,application/json';
    input.hidden = true;
    document.body.appendChild(input);
    const finish = (text: string | null) => {
      input.remove();
      resolve(text);
    };
    const fail = (error: unknown) => {
      input.remove();
      reject(error);
    };
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }
      if (file.size > MAX_SAVE_FILE_BYTES) {
        fail(new Error('存档文件超过 64 MiB 上限'));
        return;
      }
      file.text().then(finish, fail);
    };
    input.oncancel = () => finish(null);
    try {
      input.click();
    } catch (error) {
      fail(error);
    }
  });
}
