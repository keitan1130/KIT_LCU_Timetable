export type DayOfWeek = '月' | '火' | '水' | '木' | '金' | '土' | '日';

export interface TimetableEntry {
  dayOfWeek: DayOfWeek;
  period: number;
  subject: string;
  teacher?: string;
  classroom?: string;
}

export type TimetableJSON = TimetableEntry[];
