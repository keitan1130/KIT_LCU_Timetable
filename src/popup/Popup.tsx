import { useEffect, useState } from 'react';
import './Popup.css';
import { loadOptions, saveOptions } from './store';
import type { ExportOptions } from '../shared/types';

export default function Popup() {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'pretty',
    defaultColor: '#ff6b6b',
    includeEmptyCells: false,
    includeMeta: true,
    outputType: 'download',
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // 現在の設定を読み込む
    loadOptions().then((loaded) => {
      setOptions(loaded);
      setLoading(false);
    });

    // ダークモードの検出
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(darkModeQuery.matches);

    // ダークモードの変更を監視
    const handleChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    darkModeQuery.addEventListener('change', handleChange);

    return () => darkModeQuery.removeEventListener('change', handleChange);
  }, []);

  // オプション変更時に自動保存
  useEffect(() => {
    if (!loading) {
      saveOptions(options);
    }
  }, [options, loading]);

  async function handleExport() {
    setExporting(true);

    try {
      // 現在のタブを取得
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id) {
        alert('タブIDを取得できませんでした');
        setExporting(false);
        return;
      }

      // content script にエクスポート指示を送信
      chrome.tabs.sendMessage(tab.id, {
        type: 'export',
        options,
      });

      // ダウンロードの場合は少し待ってから完了メッセージ
      if (options.outputType === 'download') {
        setTimeout(() => {
          setExporting(false);
        }, 1000);
      } else {
        setExporting(false);
      }
    } catch (error) {
      console.error('エクスポートエラー:', error);
      alert('エクスポートに失敗しました。時間割ページで実行してください。');
      setExporting(false);
    }
  }

  const themeClass = isDark ? 'dark' : 'light';

  if (loading) {
    return (
      <div className={`popup-container ${themeClass}`}>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className={`popup-container ${themeClass}`}>
      <h2 className="popup-title">時間割 JSON エクスポート</h2>

      <div className={`popup-card ${themeClass}`}>
        <div className="popup-section">
          <label className="popup-label">
            <span className="popup-label-text">出力形式</span>
            <select
              value={options.format}
              onChange={(e) =>
                setOptions({ ...options, format: e.target.value as 'pretty' | 'compact' })
              }
              className="popup-select"
            >
              <option value="pretty">整形（Pretty）</option>
              <option value="compact">圧縮（Compact）</option>
            </select>
          </label>
        </div>

        <div className="popup-section">
          <label className="popup-label">
            <span className="popup-label-text">デフォルトカラー</span>
            <input
              type="text"
              value={options.defaultColor}
              onChange={(e) => setOptions({ ...options, defaultColor: e.target.value })}
              className="popup-input"
              placeholder="#ff6b6b"
            />
          </label>
        </div>

        <div className="popup-section">
          <label className="popup-label">
            <input
              type="checkbox"
              checked={options.includeEmptyCells}
              onChange={(e) =>
                setOptions({ ...options, includeEmptyCells: e.target.checked })
              }
              className="popup-checkbox"
            />
            <span className="popup-label-text">空セルを含める</span>
          </label>
        </div>

        <div className="popup-section">
          <label className="popup-label">
            <input
              type="checkbox"
              checked={options.includeMeta}
              onChange={(e) => setOptions({ ...options, includeMeta: e.target.checked })}
              className="popup-checkbox"
            />
            <span className="popup-label-text">メタ情報（教員・教室）を含める</span>
          </label>
        </div>

        <div className="popup-section">
          <label className="popup-label">
            <span className="popup-label-text">出力方法</span>
            <select
              value={options.outputType}
              onChange={(e) =>
                setOptions({
                  ...options,
                  outputType: e.target.value as 'download' | 'clipboard',
                })
              }
              className="popup-select"
            >
              <option value="download">ダウンロード</option>
              <option value="clipboard">クリップボード</option>
            </select>
          </label>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="popup-button"
        >
          {exporting ? 'エクスポート中...' : 'エクスポート'}
        </button>
      </div>

      <p className={`popup-description ${themeClass}`}>
        時間割ページでエクスポートボタンをクリックするか、このポップアップから実行できます。
      </p>
    </div>
  );
}
