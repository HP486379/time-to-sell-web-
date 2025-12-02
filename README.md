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
- S&P500 のシンボルを変更したい場合: `.env` に `SP500_SYMBOL=VOO` のように指定します（デフォルトは ^GSPC）。
- FRED API を利用して 10 年国債・CPI を取得する場合: `.env` に `FRED_API_KEY=<your_key>` を設定してください。未設定の場合は安全にダミー値へフォールバックします。
- 基準価額（円）の取得:
  - 参考基準価額: `GET /api/nav/sp500-synthetic`（S&P500 × USD/JPY）
  - eMAXIS Slim 米国株式（S&P500）基準価額: `GET /api/nav/emaxis-slim-sp500`（取得できない場合は参考値で代替）
- シンプルバックテスト（閾値売買）:
  - `POST /api/backtest` に `{ "start_date": "2004-01-01", "end_date": "2024-12-31", "initial_cash": 1000000, "buy_threshold": 40, "sell_threshold": 80 }` のように渡すと、
    日次のスコアに基づく BUY/SELL 履歴とポートフォリオ推移、単純ホールド比較を返します。

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
