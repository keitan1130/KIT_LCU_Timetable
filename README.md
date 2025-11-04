# KIT LCU Timetable & Calendar Exporter

九州工業大学のLCU（Learning management system for Convenient Use）から時間割とカレンダーデータをエクスポートするChrome拡張機能です。

## 機能

### 1. 時間割エクスポート (Timetable Export)
- **対象ページ**: `SC_07002B00_01/*`, `SC_18001B00_13/*`
- **機能**: 時間割データをJSON形式でエクスポート
- **実装ファイル**: `src/timetable/content.ts`

### 2. カレンダーエクスポート (Calendar Export)
- **対象ページ**: `SC_18001B00_02/*`
- **機能**: 月次カレンダーの授業データをCSV形式でエクスポート
- **実装ファイル**: `src/calendar/content.ts`
- **出力形式**: `calendar_年_月.csv` (例: `calendar_2025_12.csv`)

#### カレンダーエクスポートの仕様
- 「追加」ボタンの右隣に「カレンダー出力」ボタンを動的に追加
- **当月のデータのみ**を抽出（`fc-day-other`クラスで前月・次月を除外）
- 以下の情報を抽出:
  - 日付 (YYYY-MM-DD形式)
  - 開始時間・終了時間 (HH:MM形式)
  - 授業名
  - 場所（教室）
  - 先生名
- CSV形式: Googleカレンダーのインポート形式に準拠
- BOM付きUTF-8エンコーディング（Excel対応）

## 技術スタック

- **言語**: TypeScript 5.9
- **ビルドツール**: Vite 7.1
- **フレームワーク**: React 19（将来的なUI拡張用）
- **拡張機能フレームワーク**: Chrome Extension Manifest V3
- **プラグイン**: @crxjs/vite-plugin（Manifest V3対応）

## プロジェクト構造

```
KIT_LCU_Timetable/
├── src/
│   ├── background.ts              # バックグラウンドサービスワーカー
│   ├── calendar/
│   │   ├── content.ts            # カレンダーページ用コンテンツスクリプト
│   │   └── calendarTypes.ts      # カレンダーデータの型定義
│   └── timetable/
│       ├── content.ts            # 時間割ページ用コンテンツスクリプト
│       ├── domParser.ts          # DOM解析ロジック
│       └── timetableTypes.ts     # 時間割データの型定義
├── dist/                          # ビルド出力ディレクトリ
├── icons/                         # 拡張機能アイコン
├── manifest.json                  # Chrome拡張機能マニフェスト
├── vite.config.ts                # Vite設定
├── tsconfig.json                 # TypeScript設定
└── package.json                  # 依存関係とスクリプト
```

## セットアップ

### 前提条件
- Node.js 18以上
- npm または yarn

### インストール

```bash
# 依存関係のインストール
npm install

# または
yarn install
```

## 開発

### 開発モードで起動
```bash
npm run dev
```

Viteの開発サーバーが起動し、ファイル変更を監視します。

### ビルド
```bash
npm run build
```

`dist/`ディレクトリに本番用のビルドが生成されます。

### リント
```bash
npm run lint
```

ESLintでコードの静的解析を実行します。

## Chrome拡張機能としてインストール

1. `npm run build`でビルドを実行
2. Chromeで`chrome://extensions/`を開く
3. 右上の「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. `dist/`フォルダを選択

## 実装の詳細

### カレンダーエクスポート (`src/calendar/content.ts`)

#### 主要な関数

- **`insertExportButton()`**: 「カレンダー出力」ボタンをページに挿入
- **`handleExport()`**: エクスポートボタンのクリックイベントハンドラー
- **`scrapeCurrentMonthClasses()`**: 当月の授業データを抽出
  - FullCalendarの`data-date`属性から日付を取得
  - イベントタイトルを全角スペースで分割して情報を抽出
  - 正規表現`(\d{1,2}:\d{2})-(\d{1,2}:\d{2})`で時間を抽出
- **`exportToCSV()`**: CSVファイルとして出力
  - `#datePicker`の値から年月を取得
  - フォールバック: `.fc-toolbar-title`から取得

#### DOM構造の想定

```html
<!-- 授業イベント -->
<a class="c-timetable-usage-guide-item-class">
  <div class="fc-event-title">
    授業名　時限 開始時刻-終了時刻　場所　先生名
  </div>
</a>

<!-- 日付セル -->
<td data-date="2025-12-01" class="fc-day">...</td>
<td data-date="2025-11-30" class="fc-day fc-day-other">...</td>
```

### 時間割エクスポート (`src/timetable/content.ts`)

（時間割機能の詳細は必要に応じて追加）

## デバッグ

### コンソールログ

各機能は詳細なログを出力します：

```javascript
// カレンダーエクスポートのログ例
console.log('カレンダー出力ボタンの挿入処理を開始');
console.log(`見つかったイベント数: ${events.length}`);
console.log(`datePickerから年月を取得: ${year}年${month}月`);
console.log(`生成するファイル名: ${fileName}`);
console.table(calendarData);  // 抽出データをテーブル表示
```

### よくある問題

1. **ボタンが表示されない**
   - ページのDOM構造が変更されている可能性
   - `button[onclick*="scheduleAdd"]`が存在するか確認

2. **年月が正しく取得できない**
   - `#datePicker`の値を確認
   - コンソールログで取得値をチェック

3. **データが抽出されない**
   - `.c-timetable-usage-guide-item-class`クラスが存在するか確認
   - イベントタイトルのフォーマットが想定通りか確認

## 対応URL

本拡張機能は以下のURLパターンで動作します：

- **時間割**: `https://virginia.jimu.kyutech.ac.jp/lcu-web/SC_07002B00_01/*`
- **時間割（別ページ）**: `https://virginia.jimu.kyutech.ac.jp/lcu-web/SC_18001B00_13/*`
- **カレンダー**: `https://virginia.jimu.kyutech.ac.jp/lcu-web/SC_18001B00_02/*`

## ライセンス

（必要に応じて追加）

## 貢献

（必要に応じて追加）

## 作成者

keitan1130

## バージョン履歴

### v1.0.1
- カレンダーページからのCSVエクスポート機能を追加
- 当月データのみを正確に抽出する機能を実装
- datePickerから年月を取得する機能を実装

### v1.0.0
- 初回リリース
- 時間割エクスポート機能の実装
