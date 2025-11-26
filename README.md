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

※ ユニットテスト実行: `python -m pytest backend/tests/test_scoring.py`

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
