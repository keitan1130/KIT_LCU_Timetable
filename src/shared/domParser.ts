import type { TimetableEntry, DayOfWeek, TimetableJSON } from './types';

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
  dayOfWeek: DayOfWeek
): TimetableEntry | null {
  // 科目名を取得（h4 タグ）
  const subjectElement = li.querySelector('h4');
  const subject = subjectElement?.textContent?.trim();
  if (!subject) return null;

  // 教員名を取得（複数のセレクタを試す）
  const teacherElement =
    li.querySelector('p.teacher') ||
    li.querySelector('p:not(.credits):not(.classroom-info)');
  const teacher = teacherElement?.textContent?.trim();

  // 教室を取得
  const classroomElement =
    li.querySelector('span.classroom') ||
    li.querySelector('p > span') ||
    li.querySelector('.classroom-info');
  const classroom = classroomElement?.textContent?.trim();

  return {
    dayOfWeek,
    period,
    subject,
    teacher,
    classroom,
  };
}

/**
 * schedule-table から TimetableJSON を生成
 */
export function parseTimetableDOM(): TimetableJSON {
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

      lis.forEach((li) => {
        const entry = parseCellLi(li as HTMLElement, period, dayOfWeek);
        if (entry) {
          entries.push(entry);
        }
      });
    }
  });

  return entries;
}

/**
 * TimetableJSON を整形された文字列に変換
 */
export function stringifyTimetable(timetable: TimetableJSON): string {
  return JSON.stringify(timetable, null, 2);
}
