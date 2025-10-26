import { parseTimetableDOM, stringifyTimetable } from './shared/domParser';
import type { ExportMessage, ExportOptions } from './shared/types';

const BUTTON_ID = 'kit-timetable-export-btn';
const PROCESSED_ATTR = 'data-kit-timetable-processed';

/**
 * エクスポートボタンを挿入
 */
function insertExportButton(): void {
  // 既にボタンが存在する場合はスキップ
  if (document.getElementById(BUTTON_ID)) {
    return;
  }

  // ボタンを挿入する場所を探す
  const footer = document.querySelector('.c-footer-inner .side-right');
  if (!footer) {
    console.warn('KIT_LCU_Timetable: フッター要素が見つかりません');
    return;
  }

  // ボタン要素を作成
  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.className = 'c-btn c-btn-submit01 c-btn-export';
  button.setAttribute('aria-label', '時間割をJSONでエクスポート');
  button.setAttribute(PROCESSED_ATTR, 'true');

  button.innerHTML = `
    <span class="c-btn-link">
      <span class="c-btn-text">時間割 JSON エクスポート</span>
    </span>
  `;

  // クリックイベント: popup を開くメッセージを送信
  button.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'openPopup' });
  });

  footer.appendChild(button);
  console.log('KIT_LCU_Timetable: エクスポートボタンを挿入しました');
}

/**
 * エクスポートを実行
 */
function executeExport(options: ExportOptions): void {
  try {
    const timetable = parseTimetableDOM(options);
    const jsonText = stringifyTimetable(timetable, options.format);

    if (options.outputType === 'download') {
      // ダウンロード
      const blob = new Blob([jsonText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'timetable.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      console.log('KIT_LCU_Timetable: JSON をダウンロードしました');
    } else if (options.outputType === 'clipboard') {
      // クリップボードにコピー
      navigator.clipboard.writeText(jsonText).then(() => {
        console.log('KIT_LCU_Timetable: JSON をクリップボードにコピーしました');
        alert('時間割 JSON をクリップボードにコピーしました');
      }).catch((err) => {
        console.error('KIT_LCU_Timetable: クリップボードへのコピーに失敗しました', err);
        alert('クリップボードへのコピーに失敗しました');
      });
    }
  } catch (error) {
    console.error('KIT_LCU_Timetable: エクスポート中にエラーが発生しました', error);
    alert('エクスポート中にエラーが発生しました。詳細はコンソールを確認してください。');
  }
}

/**
 * 時間割ページかどうかをチェック
 */
function isTimetablePage(): boolean {
  const table = document.querySelector('table.schedule-table');
  return !!table;
}

/**
 * 初期化
 */
function init(): void {
  if (!isTimetablePage()) {
    console.log('KIT_LCU_Timetable: 時間割ページではありません');
    return;
  }

  // ボタンを挿入
  insertExportButton();

  // MutationObserver で動的に追加される要素も監視
  const observer = new MutationObserver(() => {
    if (isTimetablePage()) {
      insertExportButton();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // メッセージリスナー（popup からのエクスポート指示を受信）
  chrome.runtime.onMessage.addListener((message: ExportMessage) => {
    if (message.type === 'export') {
      executeExport(message.options);
    }
  });
}

// ページ読み込み完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

console.log('KIT_LCU_Timetable: Content script loaded');
