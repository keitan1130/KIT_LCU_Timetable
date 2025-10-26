# Timetable JSON **Export-only** — 技術 README

> **目的**: ページ上の時間割（提供された `<table class="schedule-table">` 構造）を解析して **JSON でエクスポート** する機能だけを実装する。インポート機能は実装しない。

---

## 概要（要点）

* Content Script がページ DOM を走査して `TimetableJSON` を生成する（HTML → JSON）
* ページ右側の `.c-footer-inner .side-right` に「時間割 JSON エクスポート」ボタンを挿入
* ボタンは拡張の popup（React）を開き、ユーザーはエクスポートオプション（`color` の既定値、出力に含める項目のオン/オフ）を設定できる
* 設定に基づき JSON を生成し、ユーザーにダウンロードさせるか、クリップボードにコピーする

技術スタック（プロジェクト全体の方針）: TypeScript + React 19（popup） + Vite + @crxjs/vite-plugin + Chrome Extension Manifest V3

---

## 最低限のファイル構成（エクスポート専用）

```
repo/
├─ manifest.json
├─ vite.config.ts
├─ package.json
├─ src/
│  ├─ content/
│  │  └─ index.ts           # content script: DOM 読み取り・ボタン挿入・メッセージ受信
│  ├─ popup/
│  │  ├─ Popup.tsx          # React popup: オプション UI + エクスポート実行
│  │  └─ store.ts           # 小さな設定保存（chrome.storage）
│  ├─ background/
│  │  └─ serviceWorker.ts  # （必要ならダウンロード処理など）
│  └─ shared/
│     ├─ types.ts           # 型定義
│     └─ domParser.ts       # HTML -> JSON ロジック（ユニットテスト対象）
└─ README.md
```

---

## manifest.json（抜粋・エクスポート向け）

```json
{
  "manifest_version": 3,
  "name": "Timetable Exporter",
  "version": "0.1.0",
  "permissions": ["storage","scripting"],
  "host_permissions": ["*://your-university-domain.example/*"],
  "action": { "default_popup": "popup.html" },
  "background": { "service_worker": "src/background/serviceWorker.ts" },
  "content_scripts": [{ "matches": ["*://your-university-domain.example/*"], "js":["src/content/index.ts"], "run_at":"document_idle" }]
}
```

**注意**: JSON をブラウザ経由でダウンロードする際に `chrome.downloads` を使う場合は `downloads` パーミッションが必要。この README の推奨実装はダウンロードを**data URL** 経由で行い、追加権限を避ける方法を最初に実装する。

---

## 型定義（`src/shared/types.ts`）

```ts
export type DayOfWeek = '月'|'火'|'水'|'木'|'金'|'土'|'日';

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
```

---

## DOM → JSON のマッピング（`src/shared/domParser.ts`）

### 前提 DOM 構造

* 全体のテーブル: `<table class="schedule-table"><tbody>...</tbody></table>`
* 曜日ヘッダは `.week` 行（`th#week1`..`th#week7`）で表現されており、`td#weekN` が曜日セルを持つ
* 各時限は `tbody` 内の複数の `<tr>`（各 `<tr>` が時限行）
* 授業はセル内の `<ul><li ...>` 構造で表され、`li` の中に `<h4>`（科目）、`p`（教員）、`p > span`（教室）などがある

### マッピング方針

* `dayIndex` を固定マップで定義（`月:1, 火:2, ... 日:7`）。HTML で `td#week${N}` を探す。
* `period` は `tr` の時限インデックス（ヘッダ行を除外した上で、1始まりにマップ）
* 各 `li` から以下を抽出する（存在しないものは `undefined`）：

  * `subject`: `li.querySelector('h4')?.textContent?.trim()`
  * `teacher`: `li.querySelector('p.teacher')?.textContent?.trim()` もしくは最初の `p`（h4 の次）
  * `classroom`: `li.querySelector('span.classroom')?.textContent?.trim()` または `li.querySelector('p > span')`
  * `color`: `li.dataset.color` または `li.style.backgroundColor` を優先的に使う（`rgb()` を HEX に変換するユーティリティを用意する）
  * `memo`: `li.querySelector('.memo')?.textContent?.trim()` など（任意）

### 具体的な抽出サンプル（概念）

```ts
function parseCellLi(li: HTMLElement, period: number, dayOfWeek: DayOfWeek): TimetableEntry | null {
  const subject = li.querySelector('h4')?.textContent?.trim();
  if (!subject) return null;
  const teacher = li.querySelector('p.teacher')?.textContent?.trim() ?? li.querySelector('p:not(.credits)')?.textContent?.trim();
  const classroom = li.querySelector('span.classroom')?.textContent?.trim();
  const color = li.dataset.color ?? rgbToHex(li.style.backgroundColor) ?? undefined;
  const memo = li.querySelector('.memo')?.textContent?.trim();
  return { dayOfWeek, period, subject, teacher, classroom, color, memo };
}
```

**堅牢性の確保**: ページの表記ゆれに備え、複数の候補セレクタを試すロジックを実装する（例: `p.teacher` が無ければ `p:nth-of-type(1)` を読む）。

---

## エクスポートボタンの挿入（content script）

* セレクタ: `.c-footer-inner .side-right` を探す。見つかれば最後の子として次の要素を `appendChild` する。
* 追加するボタンの HTML（クラスと内部構造は既存ボタンに揃える）：

```html
<button id="timetable-export-btn" class="c-btn c-btn-submit01 c-btn-export" aria-label="時間割をJSONでエクスポート">
  <span class="c-btn-link"><span class="c-btn-text">時間割 JSON エクスポート</span></span>
</button>
```

* ボタンは `click` で `chrome.runtime.sendMessage({type:'openPopup'})` を送るか、`chrome.action.openPopup()` をトリガーする（manifest の設定とブラウザの挙動による）。

**注意**: content script が直接 `chrome.action.openPopup()` を呼べない環境があるので、`sendMessage` → background で `action.openPopup` を呼ぶ二段構成が確実。

---

## Popup（エクスポートオプション）

* Popup は簡易 UI（React）で以下を提供する：

  * 出力形式の選択: `pretty` / `compact`
  * color の既定値（HEX）入力（例デフォルト `#ff6b6b`）
  * トグル: `includeEmptyCells`（空セルをどう扱うか）, `includeMeta`（教室/教員/メモ を出力するか）
  * 実行ボタン: `Export`（クリックで `chrome.tabs.sendMessage(tabId, {type:'export', options})` を送る）
* Popup は `chrome.storage.local` にオプションを保存して次回復元する

---

## エクスポート実行フロー

1. Popup でオプションを確定して `Export` を押す
2. Popup -> content script に `export` メッセージを送信（対象タブを特定して `chrome.tabs.sendMessage`）
3. content script は DOM を走査して `TimetableJSON` を作成
4. content script は JSON を `stringify` し、`data:` URL を作ってダウンロードリンクを生成してクリックする、または `navigator.clipboard.writeText` でコピーする（ユーザー選択）

**ダウンロード実装（権限不要）サンプル**:

```ts
const blob = new Blob([jsonText], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
 a.href = url; a.download = 'timetable.json';
 document.body.appendChild(a); a.click();
 a.remove(); URL.revokeObjectURL(url);
```

---

## エッジケースと注意点

* ページの DOM 構造が変わると壊れるため、セレクタは複数候補を試すか、設定で上書き可能にする
* `li` に同一 `id` が複数ある場合の扱い（重複除去や `generatedId` の付与）
* 色情報が `rgb()` の場合は HEX に正規化するユーティリティを用意する
* `navigator.clipboard` を使う場合は HTTPS とユーザー操作が必要

---

## TODO（エクスポート専用・優先度）

1. content script の DOM パーサ実装とユニットテスト（高）
2. ボタンの挿入ロジックと background 経由での popup オープン（高）
3. Popup UI（オプション保存・送信）（中）
4. JSON ダウンロード / クリップボード出力の実装とブラウザ互換性確認（中）
5. DOM 表記ゆれに対応するセレクタの拡張（低）

---

全体方針（要点）

ページを 静的に解析する簡易判定 を行う（DOM に基づく存在チェック）。

必要なら 動的判定（MutationObserver）で後から読み込まれる UI に対応する。

判定結果に応じて「エクスポートボタン」を出すか／どのパーサを使うかを決定する。

汎用的な HTML→JSON パーサと、ページ固有の補正ルール（プロファイル）を分離する。

衝突回避：既存 JS 関数やボタンを変更せず、名前空間付き ID/クラスを使って要素を追加。

判定でチェックする「機能候補」

schedule-table（時間割テーブル）の存在：document.querySelector('table.schedule-table')

時限行・曜日ヘッダの存在：.schedule-table tbody tr と .week th#week1..week7

授業アイテムの形状：セル内に <ul><li>、li に modal-open 等のクラスがあるか

フッター領域：.c-footer-inner .side-right が存在するか（ボタン挿入先）

ページ内ボタンの onclick に特定関数（例：submitFormButton、openPopup_PU_01003B00_07、outputIndividualTimetable）が見えるか

フォーム ID：#SC_07002B00_01_RegisterForm の存在（ページが複数機能をフォームベースで切替する場合の指標）

SPA／AJAX 読み込み：window.fetch や XMLHttpRequest 後に DOM が生成される兆候（MutationObserver 必須）
