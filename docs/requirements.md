# 要件定義（Requirements）

## 目的

MiraStudy は、文部科学省（MEXT）の学習指導要領を唯一の根拠（Ground Truth）として扱う
小中高一貫の AI 学習支援 Web アプリである。
保護者が教育ナレッジを管理し、子供が学習実績を積み上げる
ハイブリッド・オーナーシップ・モデルを提供する。

## ターゲットユーザー

- 学習者A（ダミー）: 小学校モードの生徒
- 学習者B（ダミー）: 中学校モードの生徒（将来的に高校モード）
- 保護者サンプル（ダミー）: ソース管理、配信制御、進捗監視の責任者
- 注記: 本リポジトリのユーザーデータはすべて架空のダミーデータを使用し、実在個人情報は保持しない

## スコープ

### 対象

- React + Vite + Tailwind による Web クライアント実装
- Firebase Authentication / Firestore を想定したデータモデル実装
- Gemini 2.5 Flash を利用する RAG ベースの学習体験設計
- MEXT ソース限定の厳格グラウンディング設計

### 非対象（現フェーズ）

- MEXT 以外の一般知識を根拠とした問題生成
- 実データを用いた運用環境への接続
- 課金、外部 SNS 連携、広告機能

## 用語

| 用語 | 定義 |
| --- | --- |
| Ground Truth | MEXT 公開資料のみを正解根拠とする原則 |
| Stage | 学習段階。ES（小学校）/JHS（中学校）/HS（高校） |
| 学年年度 | 4月1日始まり。4/2〜翌4/1生まれを同一学年として扱う |
| MEXT Sync Verified | 問題が有効ソースに基づくことを示す検証バッジ |
| Source Activation | 保護者がステージごとに PDF ソースを ON/OFF 制御する機能 |

## 機能要件（FR）

### FR-001 ログイン画面（Profile Selector）

- 起動時に `政宗` `文菜` `保護者` の3プロファイルを表示する
- 子供プロファイルには年齢と自動判定学年を表示する
- 選択したロールに応じて画面遷移先を切り替える

### FR-010 学年自動判定

- 入力: 生年月日、現在日付
- 出力: 年齢、Stage、学年
- 判定ルール:
  - ES: 1〜6年
  - JHS: 1〜3年
  - HS: 1〜3年
  - 4/2〜翌4/1を同学年として扱う

### FR-020 生徒ホーム

- モード選択 `通常学習` `テスト復習（画像解析）`
- Stage に応じた教科グリッド表示
- 苦手克服ログ（learningArchive）を時系列表示
- 全画面に `ホームに戻る` ボタンを表示する

#### FR-020 詳細仕様（確定）

- `画面セクション`: ヘッダー、モード選択、教科グリッド、学習アーカイブ、ホーム復帰ボタン
- `モード定義`: `normal`（通常学習）と `review`（テスト復習）を排他的に選択する
- `初期値`: 画面初回表示時は `normal` を既定選択とする
- `モード遷移`: モード変更時に選択教科は維持し、問題セットのみ切り替える
- `教科表示`: Stage が `ES/JHS/HS` のいずれかでない場合は教科グリッドを表示しない
- `アーカイブソート`: `createdAt` の降順（新しい順）で表示する
- `アーカイブ件数`: 初期表示は最新20件、以降はページングで追加取得する
- `レスポンシブ`: iPhone 縦幅では 1カラム、iPad/横幅 768px 以上では 2〜3カラムを許可する
- `アクセシビリティ`: モード選択と教科ボタンはキーボード操作可能であること

#### FR-020 learningArchive 表示項目

- `archiveId`: ログ識別子
- `createdAt`: 学習実施日時
- `stage`: 学習時点の Stage
- `subject`: 教科名
- `topic`: 学習テーマ
- `weaknessTag`: 苦手分類タグ
- `result`: `mastered` / `in_progress` / `needs_review`
- `sourceId`: 参照した master source 識別子

#### FR-020 画面状態

- `loading`: スケルトン表示を出し、操作ボタンは無効化する
- `empty`: `学習履歴はまだありません` を表示する
- `error`: 再試行ボタンとエラー理由コードを表示する

### FR-030 学習エンジン（RAG + Grounding）

- 問題生成は有効化済み PDF ソースのみを使用する
- 処理ステップを可視化する:
  - ソース特定
  - デジタル署名照合
  - 原文抽出
  - 問題構築
- 段階的ヒント（小/中/大）を提供する

### FR-040 真偽検証システム（Evidence Viewer）

- 全問題に `MEXT Sync Verified` バッジを表示する
- バッジ押下で以下を表示する:
  - MEXT 公式 PDF へのリンク
  - OCR 生テキストと AI 解釈の比較
  - 検証用ハッシュコード（フィンガープリント）

#### FR-040 詳細仕様（確定）

- `表示条件`: 問題ごとに `verification.status === verified` の場合のみバッジを表示する
- `ドメイン制約`: 参照 URL は `https://www.mext.go.jp/` 配下のみ許可する
- `比較表示`: OCR 生テキストと AI 解釈を上下2段で表示し、差分箇所を強調する
- `出典表示`: source title、source version、retrievedAt を必須表示する

#### FR-040 ハッシュ仕様（確定）

- `アルゴリズム`: SHA-256（16進小文字64桁）
- `入力データ`: 正規化済み OCR テキスト + sourceId + sourceVersion
- `正規化ルール`: 改行コードを LF に統一、連続空白を単一空白へ圧縮、前後空白を除去
- `出力形式`: `sha256:<hex64>`
- `再現性`: 同一入力で同一ハッシュが生成されること

#### FR-040 失敗時挙動（確定）

- `署名/ハッシュ不一致`: バッジ非表示、問題配信停止、理由コード `C004_signature_verification_failed`
- `必須項目欠落`: バッジ非表示、Evidence Viewer を開いて不足項目を表示、理由コード `C005_insufficient_evidence`
- `URL 不正`: 問題配信停止、理由コード `C003_untrusted_context`

### FR-050 保護者ダッシュボード

- Stage ごとに PDF ソースの ON/OFF を管理できる
- Google Search Grounding による自動収集を実行できる
- 自動収集した PDF をライブラリへ保存し、Ground Truth ソースとして扱う
- 20歳到達時の管理権限移譲 UI を提供する

#### FR-050 詳細仕様（確定）

- `ステージ切替`: ES/JHS/HS のタブを切り替えると、当該 Stage の source 一覧を表示する
- `ON/OFF 制御`: source ごとに有効/無効をトグルできる
- `表示項目`: sourceId、タイトル、origin（manual/auto）、lastSyncedAt を表示する
- `自動収集`: 実行ボタンで収集ジョブをキューへ追加し、`queued -> running -> success/failed` の状態遷移を表示する
- `キュー集計`: queued/running/success/failed の件数を常時表示する
- `権限移譲`: `idle -> preview -> requested` のプレースホルダー遷移を提供する
- `年齢制約`: 対象が20歳未満の場合、移譲申請ボタンを無効化する

### FR-060 Firestore データ構造

- 共通ソース: `/artifacts/{appId}/public/data/masterSources`
- 学習ログ: `/artifacts/{appId}/users/{userId}/learningArchive`
- プロファイル: `/artifacts/{appId}/users/{userId}/profiles`

#### FR-060 モード切替仕様（確定）

- 切替キーは `VITE_FIRESTORE_MODE` の1箇所で管理する
- `realtime` かつ `sdkFunctions` 注入あり: Firestore SDK adapter を使用する
- `realtime` でも `sdkFunctions` 未注入: スタブへフェイルセーフ縮退する
- 未知モードまたは未設定: スタブを既定とする

#### FR-060 接続失敗時の理由コードと UI 表示方針（確定）

- `E_REPOSITORY_CONTRACT_INVALID`: repository/gateway 契約不一致
  - UI 方針: 画面初期化を停止し、再読込案内とサポート連絡メッセージを表示する
- `E_FIRESTORE_READ_FAILED`: Firestore 読み取り失敗
  - UI 方針: 対象セクションを `error` 状態に遷移し、理由コード付きで再試行ボタンを表示する
- `E_FIRESTORE_WRITE_FAILED`: Firestore 書き込み失敗
  - UI 方針: 変更をロールバックし、トーストまたはインラインで理由コードを表示する
- `E_ARCHIVE_FETCH_FAILED`: 学習アーカイブ取得失敗
  - UI 方針: 学習アーカイブ領域のみ失敗表示にし、他領域の操作は継続可能とする
- `E_PROFILES_FETCH_FAILED`: プロファイル取得失敗
  - UI 方針: プロファイル選択画面の表示を停止し、再試行導線を表示する

## 非機能要件（NFR）

### NFR-001 再現性

- 同一ソース、同一入力、同一設定で同一問題を再現できること
- 生成時にソース ID・ソース版・コミット SHA を記録すること

### NFR-010 セキュリティ

- API キー、トークン、個人情報をリポジトリに含めない
- 秘密情報検査を CI で常時実行する

### NFR-020 保守性

- 学年判定、アクセス制御、ソース検証を単体テスト対象とする
- UI は iPhone / iPad 優先で崩れないこと

### NFR-030 パフォーマンス

- 初期表示はモバイル回線想定で体感 2 秒以内を目標とする
- 主要画面遷移は 300ms 以内のレスポンスを目標とする

### NFR-040 品質保証

- `lint / type / test / policy_check` を通過しない変更はマージしない
- 仕様変更時は `requirements / constraints / policies / plan` を同時更新する

## フェーズ別受入条件

### Phase A（初期）

- プロファイル選択画面が表示される
- 政宗・文菜の年齢/学年が仕様どおりに表示される
- 学年判定の境界テストが通過する

### Phase B（生徒学習導線）

- 生徒ホームでモード選択ができる
- Stage 別教科一覧が表示される
- 学習アーカイブを表示できる

### Phase C（Ground Truth と検証）

- 問題生成が有効ソース限定で動作する
- Evidence Viewer で根拠比較とハッシュを表示できる

### Phase D（保護者運用）

- ソース ON/OFF 管理ができる
- 自動収集結果をライブラリ保存できる
- 権限移譲 UI の遷移を確認できる
