📘 README — SuiRiskIndex
<h1 align="center">🛡️ SuiRiskIndex</h1> <p align="center"><strong>Liquidity Risk Scoring • Deepbook Analytics • On-chain Risk Identity NFT</strong></p>
📌 Overview

SuiRiskIndex is an end-to-end liquidity risk analytics platform built on the Sui blockchain.
It analyzes Deepbook pools via Surflux API, computes financial risk metrics, and generates a unified Risk Score for each pool.

In addition, users can mint a soulbound-style Risk Identity NFT on-chain, representing their personal risk tier within the Sui ecosystem.

This project combines:

⚡ FastAPI backend

📊 Risk computation engine

🌐 Surflux indexing integration

🧠 Move smart contracts (RiskIdentity NFT)

🔗 Sui RPC on-chain operations

🎯 Core Features
1️⃣ Deepbook Pool Indexing

Fetches all Deepbook pools using Surflux.

Automatically stores tokens and pool metadata in MySQL.

Keeps the index fresh for analytics.

2️⃣ Risk Metrics Engine

For each pool:

TVL (USD)

24h Volume

Price Variance

Impermanent Loss Risk

Utilization Rate

These metrics are normalized to produce a 0–100 Risk Score.

3️⃣ Time-Based Risk Tracking

Every sync creates a historical PoolMetric record:

Perfect for charts in frontend dashboards.

Enables comparative analysis between pools.

4️⃣ On-Chain Risk Identity NFT

Users can mint an NFT containing:

Risk Score

Level (Bronze, Silver, Gold)

Owner Address

These NFTs are soulbound-like and verified on-chain.

5️⃣ Clean Modular Architecture
backend/
 ├── main.py
 ├── models.py
 ├── database.py
 ├── surflux_client.py
 ├── risk_scoring.py
 └── sui_client.py

🧱 Tech Stack
Layer	Technology
Backend	FastAPI, SQLAlchemy
Database	MySQL 8
Blockchain	Sui Testnet
Move Modules	risk_identity
Indexing	Surflux API
Deployment	Docker
⚙️ Environment Variables

Create a .env file:

SURFLUX_API_KEY=YOUR_KEY
SUI_RPC_URL=https://fullnode.testnet.sui.io:443

SUI_RISK_PACKAGE_ID=0x...
SUI_RISK_MODULE=risk_identity
SUI_RISK_FUNCTION_MINT=mint_identity

🚀 Running the Backend
1. Install Dependencies
pip install -r requirements.txt

2. Start FastAPI
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

🔌 API Endpoints
➡️ Sync Deepbook Pools
POST /sync/deepbook/pools


Fetches and stores all pools + tokens.

➡️ Sync Metrics for One Pool
POST /sync/deepbook/metrics/{pool_id}

➡️ Sync Metrics for All Pools
POST /sync/deepbook/metrics

➡️ List Pools
GET /pools

➡️ Get Latest Risk Metrics
GET /pools/{pool_id}/metrics/latest

➡️ Mint Risk Identity NFT
POST /mint-risk-identity/{pool_id}

🧬 Risk Identity NFT Design

The Move module:

Stores owner, score, level

Uses object::new for UID generation

Transfers NFT directly to the user

Marks it soulbound through controlled API usage

📦 Smart Contract

Deployed Package ID:

0x52e5...


Module:

risk_identity


Functions:

mint_identity
get_metadata

📊 Example JSON Output

GET /pools/1/metrics/latest

{
  "pool_id": 1,
  "tvl_usd": "120000.45",
  "volume_24h": "85400.22",
  "price_var_24h": 0.032,
  "il_risk": 12,
  "utilization": 71,
  "risk_score": 68,
  "captured_at": "2025-02-15T14:03:12"
}

🛡️ Future Roadmap

🧠 AI-driven risk prediction (volatility forecasting)

📈 Frontend dashboard (charts + badges)

🔔 Alerting system for high-risk pools

🤝 Integration with Sui wallets (Mysten Wallet / Ethos)

💙 Acknowledgements

Special thanks to:

Mysten Labs – Sui blockchain

Surflux – Pool indexing API

Sui Community – Feedback & support

🏁 Final Note

SuiRiskIndex, Sui DeFi ekosistemi için güvenilir, şeffaf ve zincir üzerinde doğrulanabilen bir risk ölçüm altyapısı sunmayı hedefliyor.
Bu proje, likidite sağlayıcıları, trader’lar ve analitik araçlar için yeni bir standart oluşturmayı amaçlıyor.
