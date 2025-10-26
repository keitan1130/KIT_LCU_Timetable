import type { ExportOptions } from '../shared/types';

const STORAGE_KEY = 'kit_timetable_export_options';

const DEFAULT_OPTIONS: ExportOptions = {
  format: 'pretty',
  defaultColor: '#ff6b6b',
  includeEmptyCells: false,
  includeMeta: true,
  outputType: 'download',
};

/**
 * エクスポートオプションを読み込む
 */
export async function loadOptions(): Promise<ExportOptions> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const options = result[STORAGE_KEY] as ExportOptions | undefined;
      resolve(options ?? DEFAULT_OPTIONS);
    });
  });
}

/**
 * エクスポートオプションを保存する
 */
export async function saveOptions(options: ExportOptions): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: options }, () => {
      resolve();
    });
  });
}
