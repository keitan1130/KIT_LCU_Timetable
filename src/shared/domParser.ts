import type { TimetableEntry, DayOfWeek, TimetableJSON, ExportOptions } from './types';

/**
 * RGB 文字列を HEX に変換
 * 例: "rgb(255, 107, 107)" → "#ff6b6b"
 */
export function rgbToHex(rgb: string): string | undefined {
  if (!rgb || rgb === '' || rgb === 'transparent') return undefined;

  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) return rgb.startsWith('#') ? rgb : undefined;

  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 曜日インデックスから DayOfWeek への変換
 */
const DAY_MAP: Record<number, DayOfWeek> = {
  1: '月',
  2: '火',
  3: '水',
  4: '木',
  5: '金',
  6: '土',
  7: '日',
};

/**
 * li 要素から TimetableEntry を抽出
 */
function parseCellLi(
  li: HTMLElement,
  period: number,
  dayOfWeek: DayOfWeek,
  options: ExportOptions
): TimetableEntry | null {
  // 科目名を取得（h4 タグ）
  const subjectElement = li.querySelector('h4');
  const subject = subjectElement?.textContent?.trim();
  if (!subject) return null;

  let teacher: string | undefined;
  let classroom: string | undefined;
  let memo: string | undefined;

  if (options.includeMeta) {
    // 教員名を取得（複数のセレクタを試す）
    const teacherElement =
      li.querySelector('p.teacher') ||
      li.querySelector('p:not(.credits):not(.classroom-info)');
    teacher = teacherElement?.textContent?.trim();

    // 教室を取得
    const classroomElement =
      li.querySelector('span.classroom') ||
      li.querySelector('p > span') ||
      li.querySelector('.classroom-info');
    classroom = classroomElement?.textContent?.trim();

    // メモを取得
    const memoElement = li.querySelector('.memo');
    memo = memoElement?.textContent?.trim();
  }

  // 色情報を取得
  let color: string | undefined;
  if (li.dataset.color) {
    color = li.dataset.color;
  } else if (li.style.backgroundColor) {
    color = rgbToHex(li.style.backgroundColor);
  }
  if (!color) {
    color = options.defaultColor;
  }

  return {
    dayOfWeek,
    period,
    subject,
    teacher,
    classroom,
    color,
    memo,
  };
}

/**
 * schedule-table から TimetableJSON を生成
 */
export function parseTimetableDOM(options: ExportOptions): TimetableJSON {
  const table = document.querySelector('table.schedule-table');
  if (!table) {
    console.error('schedule-table が見つかりません');
    return [];
  }

  const tbody = table.querySelector('tbody');
  if (!tbody) {
    console.error('tbody が見つかりません');
    return [];
  }

  const rows = Array.from(tbody.querySelectorAll('tr'));
  const entries: TimetableJSON = [];

  // 最初の行はヘッダ（曜日）なのでスキップ
  const dataRows = rows.slice(1);

  dataRows.forEach((row, rowIndex) => {
    const period = rowIndex + 1; // 時限は 1 始まり

    // 各セル（曜日）を走査
    for (let dayIndex = 1; dayIndex <= 7; dayIndex++) {
      const dayOfWeek = DAY_MAP[dayIndex];
      if (!dayOfWeek) continue;

      const cell = row.querySelector(`td#week${dayIndex}`);
      if (!cell) continue;

      const lis = Array.from(cell.querySelectorAll('ul > li'));

      if (lis.length === 0 && options.includeEmptyCells) {
        // 空セルを含める場合
        entries.push({
          dayOfWeek,
          period,
          subject: '',
          color: options.defaultColor,
        });
      } else {
        lis.forEach((li) => {
          const entry = parseCellLi(li as HTMLElement, period, dayOfWeek, options);
          if (entry) {
            entries.push(entry);
          }
        });
      }
    }
  });

  return entries;
}

/**
 * TimetableJSON を文字列に変換
 */
export function stringifyTimetable(timetable: TimetableJSON, format: 'pretty' | 'compact'): string {
  if (format === 'pretty') {
    return JSON.stringify(timetable, null, 2);
  }
  return JSON.stringify(timetable);
}
