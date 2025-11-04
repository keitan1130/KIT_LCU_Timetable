// カレンダーページ用の型定義

export interface CalendarEntry {
  date: string;          // 日にち (例: 2025-11-04)
  startTime: string;     // 開始時間 (例: 13:00)
  endTime: string;       // 終了時間 (例: 14:30)
  subject: string;       // 授業名 (例: 電磁気学Ⅰ)
  location?: string;     // 場所 (例: (情)1401講義室)
  teacher?: string;      // 先生 (例: 許 宗焄)
}

export type CalendarData = CalendarEntry[];
