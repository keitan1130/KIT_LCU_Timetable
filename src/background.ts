import type { OpenPopupMessage } from './shared/types';

// 拡張機能のインストール時にデフォルト設定を保存
chrome.runtime.onInstalled.addListener(() => {
  console.log('KIT_LCU_Timetable: Extension installed');
});

// メッセージリスナー（popup を開くリクエストを処理）
chrome.runtime.onMessage.addListener((message: OpenPopupMessage) => {
  if (message.type === 'openPopup') {
    // chrome.action.openPopup() はManifest V3では利用できないため
    // ユーザーは拡張機能アイコンをクリックして popup を開く必要がある
    console.log('KIT_LCU_Timetable: Popup open request received');
  }
});

export {};
