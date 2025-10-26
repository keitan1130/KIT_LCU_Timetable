export type DayOfWeek = '月' | '火' | '水' | '木' | '金' | '土' | '日';

export interface TimetableEntry {
  dayOfWeek: DayOfWeek;
  period: number;
  subject: string;
  teacher?: string;
  classroom?: string;
  color?: string;
  memo?: string;
}

export type TimetableJSON = TimetableEntry[];

export interface ExportOptions {
  format: 'pretty' | 'compact';
  defaultColor: string;
  includeEmptyCells: boolean;
  includeMeta: boolean;
  outputType: 'download' | 'clipboard';
}

export interface ExportMessage {
  type: 'export';
  options: ExportOptions;
}

export interface OpenPopupMessage {
  type: 'openPopup';
}

export type Message = ExportMessage | OpenPopupMessage;
