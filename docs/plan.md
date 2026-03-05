# 計画（Plan）

## 運用ルール

- この文書は「現在の計画」を表す。過去ログを増やさない。
- 変更履歴は直近10件までとし、重要判断は ADR に移す。
- 自動実行の対象は「Next」のみとする。Backlog は自動で着手しない。

## 現状（Status）

- フェーズ：**MiraStudy Phase A（仕様確定・初期UI）**
- ブロッカー：なし
- 直近の重要決定：MEXT Ground Truth を正解根拠の単一ソースとして採用

## ロードマップ（概略）

| Phase | 名称 | 目標 | 期間目安 |
| --- | --- | --- | --- |
| A | 仕様確定・初期UI | ログイン画面、学年判定、要件固定 | 1〜2 週間 |
| B | 生徒学習導線 | 生徒ホーム、モード選択、学習アーカイブ | 2〜3 週間 |
| C | Ground Truth 検証 | ソース限定生成、Evidence Viewer | 2〜4 週間 |
| D | 保護者運用 | ソース管理、自動収集、権限移譲UI | 2〜4 週間 |
| E | 安定化 | 品質監査、運用改善、拡張 | 継続 |

※ 期間目安は目標であり、検証結果に基づき随時見直す。

## 今月のゴール

- G1 MiraStudy の仕様正本を確定する
- G2 生徒ホームの必須導線（通常学習/テスト復習）を実装する
- G3 Ground Truth とエビデンス表示の設計を固定する

## Next（自動実行対象：最大3件）

### N-009 Firebase SDK 実接続統合（main.jsx + 環境設定）

- 目的：`main.jsx` で Firebase SDK を初期化し、`createMiraRepositoryFromEnv` に `sdkFunctions` を注入することで realtime モードを実際に動作させる
- 受入条件：
  - `VITE_FIRESTORE_MODE=realtime` 設定時に Firebase SDK を初期化して接続できる
  - SDK 初期化設定（projectId 等）を環境変数経由で外部化する
  - スタブモードではビルド成果物に Firebase SDK が含まれないか、tree-shake される
  - E2E 相当の smoke test（SDK 初期化 → 読み書き確認）を追加する
- 依存：N-008（完了済み）
- 触る領域：`web/src/main.jsx`, `web/.env.example`, `docs/runbook.md`

## Done（今期完了）

### N-008 Firestore SDK アダプタ実装（実接続 PoC） ✅

- Issue: TBD
- 完了日: 2026-03-05
- 完了: `retryHelper.js`（指数バックオフ付き `withRetry`）を新設
- 完了: `createFirestoreSdkGateway` に retry ラッパーを統合（`retryOptions` で設定可能）
- 完了: `miraRepositoryFactory.js`（`createMiraRepositoryFromEnv`）で stub/realtime を 1 箇所で制御
- 完了: `App.jsx` を factory 経由に切替（`VITE_FIRESTORE_MODE` で動的切替）
- 完了: `retryHelper.test.js`・`miraRepositoryFactory.test.js` を追加
- 完了: `docs/architecture.md`・`docs/runbook.md` 更新
- 検証: `cd web && npm run test`（36 tests pass） / `cd web && npm run build`

### N-007 Firestore 実接続準備（SDK 境界設計） ✅

- Issue: TBD
- 完了日: 2026-03-05
- 完了: Firestore SDK 境界（`readDocument/writeDocument/updateDocument`）を interface 化
- 完了: `miraFirestoreRepository` を gateway 注入型へ変更し、差し替え可能にした
- 完了: 接続失敗時の理由コードと UI 表示方針を `requirements.md` に追記
- 完了: gateway 契約と差し替えを含む単体テストを追加
- 検証: `cd web && npm run test` / `cd web && npm run build`

### N-006 Firestore 連携スタブの実装 ✅

- Issue: TBD
- 完了日: 2026-03-05
- 完了: Firestore パス定義を `web/src/repositories/firestorePaths.js` に一元化
- 完了: ダミーデータ取得層を `miraFirestoreRepository` へ分離（profiles / learningArchive / masterSources）
- 完了: `App.jsx` を repository 層経由のデータ取得へ切り替え
- 完了: repository 単体テストを追加
- 検証: `cd web && npm run test`（22 tests pass） / `cd web && npm run build`

### N-005 保護者ダッシュボード基盤の実装 ✅

- Issue: TBD
- 完了日: 2026-03-05
- 完了: Stage ごとの source ON/OFF トグル
- 完了: 自動収集キュー状態表示と実行ボタン
- 完了: 権限移譲プレースホルダー遷移（idle/preview/requested）
- 完了: 補助関数テスト（トグル/集計/遷移）
- 検証: `cd web && npm run test`（16 tests pass） / `cd web && npm run build`

### N-004 Ground Truth 検証導線の実装 ✅

- Issue: TBD
- 完了日: 2026-03-05
- 完了: `MEXT Sync Verified` バッジ表示（verified 時のみ）
- 完了: Evidence Viewer（リンク/OCR/AI解釈差分/フィンガープリント）
- 完了: URL 信頼判定と理由コードベースの配信停止（C003/C004/C005）
- 完了: SHA-256 検証ロジック（`sha256:<hex64>`）
- 完了: 単体テスト追加（Evidence 正規化・検証・URL 判定）
- 検証: `cd web && npm run test`（13 tests pass） / `cd web && npm run build`

### N-003 生徒ホーム導線の実装 ✅

- Issue: TBD
- 完了日: 2026-03-05
- 完了: `通常学習` / `テスト復習（画像解析）` のモード選択
- 完了: Stage 別教科グリッドと選択状態の維持
- 完了: 学習アーカイブの loading/empty/error 表示
- 完了: 再試行動線と理由コード表示
- 完了: 単体テスト追加（archive 状態判定・並び替え）
- 検証: `cd web && npm run test`（8 tests pass） / `cd web && npm run build`

### N-002 MVP パイプラインの確立 ✅

- Issue: #29
- 完了日: 2026-03-01
- 完了: パッケージ構造配置（core/, domain/）
- 完了: 型定義（types.py）・例外定義（exceptions.py）・設定管理（config.py）
- 完了: MVP パイプライン（入力→制約→処理→出力）
- 完了: 制約評価（C-001 max_values, C-002 NaN/inf）
- 完了: CLI スクリプト・TOML 設定ファイル
- 完了: architecture.md 更新
- PR: #30（マージ済み）、62 tests pass

### N-001 リポジトリ基盤と CI 品質ゲートの確立 ✅

- Issue: #26（PR #27 マージ済み）
- 完了日: 2025-07-10
- 完了: pyproject.toml 整備、パッケージ構造配置
- 完了: CI（ruff/mypy/pytest/policy_check）安定稼働
- 完了: スモークテスト・プロパティベーステスト作成

## Backlog（保留）

- B-001 保護者ダッシュボードの PDF 管理 UX 改善
- B-002 20歳到達時の権限移譲フロー詳細設計

## GitHub Issue / Project 対応表

| 計画 | Issue | Phase | 種別 |
| --- | --- | --- | --- |
| N-001 リポジトリ基盤と CI 品質ゲートの確立 | #26 | Foundation | task |
| N-002 MVP パイプラインの確立 | #29 | MVP | task |
| N-003 生徒ホーム導線の実装 | TBD | B | feature |
| N-004 Ground Truth 検証導線の実装 | TBD | C | feature |
| N-005 保護者ダッシュボード基盤の実装 | TBD | D | feature |
| N-006 Firestore 連携スタブの実装 | TBD | D | feature |
| N-007 Firestore 実接続準備（SDK 境界設計） | TBD | D | feature |
| N-008 Firestore SDK アダプタ実装（実接続 PoC） | TBD | D | feature |
| N-009 Firebase SDK 実接続統合（main.jsx + 環境設定） | TBD | D | feature |

GitHub Project: <!-- URL を記載 -->

## 直近の変更履歴（最大10件）

- 2026-03-05: N-008 完了（retryHelper・SDK アダプタ・factory を実装、Next を N-009 に更新）
- 2026-03-05: N-007 完了（Gateway interface と注入型 repository を実装、Next を N-008 に更新）
- 2026-03-05: N-006 完了（Firestore パス定義と repository 層を追加、Next を N-007 に更新）
- 2026-03-05: N-005 完了（保護者ダッシュボード基盤を実装、Next を N-006 に更新）
- 2026-03-05: N-004 完了（Ground Truth 検証導線を実装、Next を N-005 に更新）
- 2026-03-05: N-003 完了（生徒ホーム導線を実装、Next を N-004 のみに更新）
- 2026-03-05: MiraStudy 仕様正本を更新（requirements/constraints/policies）、Next を N-003/N-004 に再編
- 2026-03-01: N-002 完了（PR #30 マージ、Issue #29 Close）→ Done に移動、N-003 を Next に昇格
- 2025-07-14: N-001 を Done に移動、N-002 の受入条件を具体化、Issue #29 を対応表に追加
- 2025-07-10: N-001 Issue #26 対応表追加
