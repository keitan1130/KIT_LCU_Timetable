import type { CalendarEntry, CalendarData } from './calendarTypes';

/**
 * カレンダーページに「CSVエクスポート」ボタンを追加し、
 * クリックされた際に当月の授業情報をCSV形式で出力する
 */

// ボタンを挿入する関数
function insertExportButton(): void {
  console.log('CSVエクスポートボタンの挿入処理を開始');

  // 「追加」ボタンを検索
  const addButton = document.querySelector<HTMLButtonElement>(
    'button[onclick*="scheduleAdd"]'
  );

  if (!addButton) {
    console.error('「追加」ボタンが見つかりません');
    return;
  }

  // 既に「CSVエクスポート」ボタンが存在する場合はスキップ
  if (document.getElementById('calendar-export-btn')) {
    console.log('「CSVエクスポート」ボタンは既に存在します');
    return;
  }

  // 「CSVエクスポート」ボタンを作成
  const exportButton = document.createElement('button');
  exportButton.id = 'calendar-export-btn';
  exportButton.className = 'c-btn c-btn-submit01';
  exportButton.type = 'button';
  exportButton.setAttribute('aria-label', 'カレンダーをCSVでエクスポート');

  // 内部構造を「追加」ボタンと同じにする
  exportButton.innerHTML = `
    <span class="c-btn-link">
      <span class="c-btn-text">CSVエクスポート</span>
    </span>
  `;

  // クリックイベントを設定
  exportButton.addEventListener('click', handleExport);

  // 「追加」ボタンの直後に挿入
  addButton.after(exportButton);
  console.log('「CSVエクスポート」ボタンを挿入しました');
}

// エクスポート処理のハンドラー
function handleExport(): void {
  console.log('CSVエクスポートボタンがクリックされました');

  try {
    // 当月のデータを抽出
    const calendarData = scrapeCurrentMonthClasses();

    if (calendarData.length === 0) {
      alert('当月の授業データが見つかりませんでした。');
      return;
    }

    // デバッグ用: コンソールにテーブル表示
    console.table(calendarData);

    // CSVとして出力
    exportToCSV(calendarData);
  } catch (error) {
    console.error('カレンダーデータの抽出中にエラーが発生しました:', error);
    alert('データの抽出中にエラーが発生しました。');
  }
}

// 当月の授業データを抽出する関数
function scrapeCurrentMonthClasses(): CalendarData {
  console.log('当月の授業データの抽出を開始');

  const calendarData: CalendarData = [];

  // すべての授業イベントを取得
  const events = document.querySelectorAll<HTMLAnchorElement>(
    'a.c-timetable-usage-guide-item-class'
  );

  console.log(`見つかったイベント数: ${events.length}`);

  events.forEach((event, index) => {
    try {
      // 親の<td>要素を取得
      const tdElement = event.closest('td');

      if (!tdElement) {
        console.warn(`イベント ${index}: 親の<td>要素が見つかりません`);
        return;
      }

      // fc-day-other クラスを持つ場合は当月外なのでスキップ
      if (tdElement.classList.contains('fc-day-other')) {
        console.log(`イベント ${index}: 当月外のイベントをスキップ`);
        return;
      }

      // 日付を取得 (data-date 属性)
      const dateStr = tdElement.getAttribute('data-date');
      if (!dateStr) {
        console.warn(`イベント ${index}: 日付データが見つかりません`);
        return;
      }

      // イベントタイトルからデータを抽出
      const titleElement = event.querySelector<HTMLDivElement>('.fc-event-title');
      if (!titleElement) {
        console.warn(`イベント ${index}: タイトル要素が見つかりません`);
        return;
      }

      const titleText = titleElement.textContent?.trim();
      if (!titleText) {
        console.warn(`イベント ${index}: タイトルテキストが空です`);
        return;
      }

      // タイトルテキストを全角スペースで分割
      // 例: "電磁気学Ⅰ　３限 13:00-14:30　(情)1401講義室　許　宗焄　飯塚"
      const parts = titleText.split(/\u3000+/); // 全角スペースで分割

      if (parts.length < 2) {
        console.warn(`イベント ${index}: タイトルの形式が想定外です: "${titleText}"`);
        return;
      }

      // 授業名 (最初の要素)
      const subject = parts[0];

      // 時間情報を抽出 (2番目の要素)
      // 例: "３限 13:00-14:30"
      const timeInfo = parts[1];
      const timeMatch = timeInfo.match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);

      if (!timeMatch) {
        console.warn(
          `イベント ${index}: 時間情報が抽出できません: "${timeInfo}"`
        );
        return;
      }

      const startTime = timeMatch[1];
      const endTime = timeMatch[2];

      // 場所 (3番目の要素、存在する場合)
      const location = parts.length > 2 ? parts[2] : undefined;

      // 先生 (4番目以降の要素を結合、存在する場合)
      const teacher =
        parts.length > 3 ? parts.slice(3).join(' ').trim() : undefined;

      // データを追加
      const entry: CalendarEntry = {
        date: dateStr,
        startTime,
        endTime,
        subject,
        location,
        teacher,
      };

      calendarData.push(entry);
      console.log(`イベント ${index}: データを抽出しました`, entry);
    } catch (error) {
      console.error(`イベント ${index} の処理中にエラーが発生しました:`, error);
    }
  });

  console.log(`抽出された授業データ数: ${calendarData.length}`);
  return calendarData;
}

// CSVとしてエクスポートする関数
function exportToCSV(data: CalendarData): void {
  console.log('CSV出力処理を開始');

  // 現在表示されている年月を取得してファイル名に使用
  // datePickerの値から年月を取得 (例: "2025年12月")
  const datePickerInput = document.querySelector<HTMLInputElement>('#datePicker');
  let year = new Date().getFullYear();
  let month = new Date().getMonth() + 1;

  if (datePickerInput && datePickerInput.value) {
    // datePickerの値から年月を抽出 (例: "2025年12月")
    const dateMatch = datePickerInput.value.match(/(\d{4})年(\d{1,2})月/);
    if (dateMatch) {
      year = parseInt(dateMatch[1], 10);
      month = parseInt(dateMatch[2], 10);
      console.log(`datePickerから年月を取得: ${year}年${month}月`);
    }
  } else {
    // datePickerが見つからない場合は、fc-toolbar-titleから取得を試みる
    const calendarTitle = document.querySelector<HTMLElement>('.fc-toolbar-title');
    if (calendarTitle) {
      const titleMatch = calendarTitle.textContent?.match(/(\d{4})年(\d{1,2})月/);
      if (titleMatch) {
        year = parseInt(titleMatch[1], 10);
        month = parseInt(titleMatch[2], 10);
        console.log(`fc-toolbar-titleから年月を取得: ${year}年${month}月`);
      }
    }
  }

  // ファイル名を生成 (例: calendar_2025_12.csv)
  const fileName = `calendar_${year}_${month}.csv`;
  console.log(`生成するファイル名: ${fileName}`);

  // CSVヘッダー (参考CSVファイルの形式に合わせる)
  const headers = [
    'Subject',
    'Start Date',
    'Start Time',
    'End Date',
    'End Time',
    'All Day Event',
    'Description',
    'Location',
    'Private',
  ];

  // CSVの行を作成
  const rows: string[] = [headers.join(',')];

  data.forEach((entry) => {
    // 日付を "2025/11/4" 形式に変換
    const [y, m, d] = entry.date.split('-');
    const formattedDate = `${y}/${parseInt(m, 10)}/${parseInt(d, 10)}`;

    const row = [
      escapeCsvValue(entry.subject),
      formattedDate,
      entry.startTime,
      '', // End Date は空
      entry.endTime,
      'FALSE', // All Day Event
      escapeCsvValue(entry.teacher || ''), // Description (先生名)
      escapeCsvValue(entry.location || ''),
      'TRUE', // Private
    ];

    rows.push(row.join(','));
  });

  const csvContent = rows.join('\n');

  // BOM付きUTF-8でBlobを作成 (Excelで開いたときの文字化け防止)
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

  // ダウンロードリンクを作成してクリック
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log(`CSV出力完了: ${fileName}`);
}

// CSV用の値をエスケープする関数
function escapeCsvValue(value: string): string {
  if (!value) return '';

  // カンマ、改行、ダブルクォートが含まれる場合はダブルクォートで囲む
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    // ダブルクォートを2つにエスケープ
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

// ページ読み込み時の初期化
function init(): void {
  console.log('カレンダーページのコンテンツスクリプトを初期化');

  // DOMが完全に読み込まれるまで待機
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', insertExportButton);
  } else {
    // 既に読み込まれている場合は即座に実行
    insertExportButton();
  }

  // ページ遷移（AJAX）に対応するため、定期的にボタンの存在を確認
  const observer = new MutationObserver(() => {
    insertExportButton();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// 初期化を実行
init();

export {};
