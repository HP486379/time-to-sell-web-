# S&P500 売り時ダッシュボード v1

ブラウザで動作する React + TypeScript（Vite）フロントエンドと、FastAPI バックエンドで構成された SPA です。

## 前提
- Node.js 18 以降
- Python 3.10 以降

## バックエンドの起動
1. 依存関係をインストール
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # Windows は .venv\\Scripts\\activate
   pip install -r requirements.txt
   ```
2. 開発サーバーを起動
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
3. 動作確認
   - ヘルスチェック: http://localhost:8000/api/health

### データソース設定
- 実データのシンボル
  - S&P500: `.env` に `SP500_SYMBOL=VOO` などを指定（デフォルトは `^GSPC`）。
  - TOPIX: `.env` に `TOPIX_SYMBOL=1306.T`（TOPIX ETF）を指定（デフォルトも 1306.T）。
- NAV API（任意）
  - S&P500 NAV API: `SP500_NAV_API_BASE=https://example.com/nav-api`
  - TOPIX NAV API: `TOPIX_NAV_API_BASE=https://example.com/nav-api`
  - NAV API が設定されている場合は NAV を優先し、無い場合は yfinance の終値を利用します。
- マクロ指標（FRED）
  - 10年国債利回り / CPI の実データ取得には `FRED_API_KEY=<your_key>` を設定してください。
  - 未設定時は決定的な安全ダミー値にフォールバックします。
- バックテストのフォールバック制御
  - 実データ取得に失敗した際に疑似データへ切り替えてバックテストを継続したい場合は、`.env` に以下を設定します。
    - `BACKTEST_ALLOW_FALLBACK=1`
    - `SP500_ALLOW_SYNTHETIC_FALLBACK=1`（TOPIX も同設定で有効化されます）
  - どちらか欠けている場合はフォールバックせずに 502 を返します。502 の詳細には `external data unavailable (check network / API key / symbol)` が含まれます。
- 環境変数のサンプルは `.env.example` を参照してください。
- 基準価額（円）の取得:
  - 参考基準価額: `GET /api/nav/sp500-synthetic`（S&P500 × USD/JPY）
  - eMAXIS Slim 米国株式（S&P500）基準価額: `GET /api/nav/emaxis-slim-sp500`（取得できない場合は参考値で代替）
- シンプルバックテスト（閾値売買）:
  - `POST /api/backtest` に `{ "start_date": "2004-01-01", "end_date": "2024-12-31", "initial_cash": 1000000, "buy_threshold": 40, "sell_threshold": 80, "index_type": "SP500" }` のように渡すと、
    日次のスコアに基づく BUY/SELL 履歴とポートフォリオ推移、単純ホールド比較を返します（`index_type` は `SP500` / `TOPIX`）。

※ ユニットテスト実行: `python -m pytest backend/tests`

### 計算ロジックの入力/出力メモ
- ポジション計算は「円建て S&P500 連動投信」を前提にしており、平均取得単価と評価額・損益は円で返却します（為替は yfinance の USD/JPY 終値を使用）。
- `/api/sp500/evaluate` のレスポンスには価格系列 `price_series`（日付・終値・MA20/60/200）を含め、チャートの横軸に日付を表示できるようにしています。

## フロントエンドの起動
1. 依存関係をインストール
   ```bash
   cd frontend
   npm install
   ```
2. API ベース URL を指定（任意）
   - バックエンドが別ホストの場合は `.env` に `VITE_API_BASE=<http://backend-host:8000>` を設定します。
   - ローカル開発でバックエンドを 8000 番ポートで動かす場合、未設定でも Vite の `/api` プロキシ経由でアクセスできます。
3. 開発サーバーを起動
   ```bash
   npm run dev
   ```
4. ブラウザで表示
   - http://localhost:5173

## リポジトリ構成
- `backend/`: FastAPI アプリとスコアロジック
- `frontend/`: React + Vite の SPA
