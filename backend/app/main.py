import os
import time
import logging

from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from .database import get_db, ping_db, engine, Base
from . import models
from .surflux_client import fetch_deepbook_pools, SurfluxError
from .risk_scoring import calculate_and_store_pool_metrics
from .risk_logic import map_risk_score_to_level, clamp_score
from .wallet_risk import compute_wallet_risk_score
from .schemas import MintRiskIdentityRequest, MintRiskIdentityPayload

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Sui Liquidity Risk Index Backend",
    version="0.1.0",
)

# Sui Risk Identity konfigürasyonu (env'den okunur)
SUI_RPC_URL = os.getenv("SUI_RPC_URL", "https://fullnode.testnet.sui.io:443")

# Default olarak en son deploy ettiğin package ID'yi bırakıyorum;
# production'da mutlaka .env'den gelsin.
SUI_RISK_PACKAGE_ID = os.getenv(
    "SUI_RISK_PACKAGE_ID",
    "0xb41df90acf072d4c7e74f44091ebadbe63758b7b4a20ea1cfe6a7b4456fa5afb",
)
SUI_RISK_MODULE = os.getenv("SUI_RISK_MODULE", "risk_identity")
SUI_RISK_FUNCTION_MINT = os.getenv("SUI_RISK_FUNCTION_MINT", "mint_identity")


@app.on_event("startup")
def on_startup():
    """
    Uygulama açılırken DB'nin hazır olmasını bekle,
    hazır olunca tabloları oluştur.
    """
    max_attempts = 10
    delay_seconds = 3

    for attempt in range(1, max_attempts + 1):
        try:
            # Bağlantıyı test et
            if ping_db():
                logger.info("✅ DB bağlantısı başarılı, tablolar oluşturuluyor...")
                Base.metadata.create_all(bind=engine)
                logger.info("✅ Tablolar oluşturuldu.")
                return
        except OperationalError as e:
            logger.warning(f"DB henüz hazır değil (attempt={attempt}): {e}")
        except Exception as e:
            logger.warning(f"DB testinde hata (attempt={attempt}): {e}")

        logger.info(f"⏳ DB bekleniyor... {delay_seconds} saniye sonra tekrar denenecek.")
        time.sleep(delay_seconds)

    logger.error("❌ DB hala hazır değil, tablolar oluşturulamadı.")


@app.get("/")
def read_root():
    return {"message": "Sui Liquidity Risk Index backend ayakta! 🚀"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/db-health")
def db_health_check():
    ok = ping_db()
    return {"db_ok": ok}


@app.get("/example")
def example_endpoint(db: Session = Depends(get_db)):
    """
    İleride MySQL'deki tablolardan veri çekmek için kullanacağın pattern.
    Şu an sadece bağlantı kurup geri dönüyor.
    """
    return {"message": "DB bağlantısı kuruldu, buradan devam edebilirsin."}


@app.get("/pools")
def list_pools(db: Session = Depends(get_db)):
    pools = db.query(models.Pool).all()

    return [
        {
            "id": p.id,
            "sui_pool_id": p.sui_pool_id,
            "pool_name": p.pool_name,
            "dex_name": p.dex_name,
            "token0": p.token0.symbol if p.token0 else None,
            "token1": p.token1.symbol if p.token1 else None,
        }
        for p in pools
    ]


@app.get("/pools/{pool_id}/metrics/latest")
def get_latest_pool_metric(pool_id: int, db: Session = Depends(get_db)):
    """
    Belirli bir havuz için son kaydedilmiş risk metriklerini döner.
    """
    metric = (
        db.query(models.PoolMetric)
        .filter(models.PoolMetric.pool_id == pool_id)
        .order_by(models.PoolMetric.captured_at.desc())
        .first()
    )

    if not metric:
        raise HTTPException(status_code=404, detail="No metrics for this pool yet.")

    return {
        "pool_id": metric.pool_id,
        "tvl_usd": str(metric.tvl_usd) if metric.tvl_usd is not None else None,
        "volume_24h": str(metric.volume_24h) if metric.volume_24h is not None else None,
        "price_var_24h": metric.price_var_24h,
        "il_risk": metric.il_risk,
        "utilization": metric.utilization,
        "risk_score": metric.risk_score,
        "captured_at": metric.captured_at,
    }


@app.post("/sync/deepbook/pools")
async def sync_deepbook_pools(db: Session = Depends(get_db)):
    """
    Surflux Deepbook 'get_pools' çağrısını yapar,
    gelen datayı tokens + pools tablolarına yazar.
    """
    try:
        pools = await fetch_deepbook_pools()
    except SurfluxError as e:
        raise HTTPException(status_code=502, detail=str(e))

    created_pools = 0

    for p in pools:
        # 1) Base token'i bul/oluştur
        base_token = (
            db.query(models.Token)
            .filter(models.Token.address == p["base_asset_id"])
            .first()
        )
        if not base_token:
            base_token = models.Token(
                address=p["base_asset_id"],
                symbol=p["base_asset_symbol"],
                name=p.get("base_asset_name"),
                decimals=p.get("base_asset_decimals", 9),
            )
            db.add(base_token)
            db.flush()  # id'yi almak için

        # 2) Quote token'i bul/oluştur
        quote_token = (
            db.query(models.Token)
            .filter(models.Token.address == p["quote_asset_id"])
            .first()
        )
        if not quote_token:
            quote_token = models.Token(
                address=p["quote_asset_id"],
                symbol=p["quote_asset_symbol"],
                name=p.get("quote_asset_name"),
                decimals=p.get("quote_asset_decimals", 9),
            )
            db.add(quote_token)
            db.flush()

        # 3) Pool'u bul/oluştur
        pool = (
            db.query(models.Pool)
            .filter(models.Pool.sui_pool_id == p["pool_id"])
            .first()
        )

        if not pool:
            pool = models.Pool(
                sui_pool_id=p["pool_id"],
                pool_name=p["pool_name"],  # Surflux get_pools'tan gelen isim (SUI_USDC vb.)
                dex_name="Deepbook",
                token0_id=base_token.id,
                token1_id=quote_token.id,
            )
            db.add(pool)
            created_pools += 1
        else:
            # Eski kayıtsa pool_name yoksa/güncellenmesi gerekiyorsa set et
            if not getattr(pool, "pool_name", None) and "pool_name" in p:
                pool.pool_name = p["pool_name"]
            # Dex adını normalize etmek istersen:
            if pool.dex_name != "Deepbook":
                pool.dex_name = "Deepbook"

    db.commit()

    return {
        "message": "Deepbook pools synced",
        "total_received": len(pools),
        "new_pools_created": created_pools,
    }


@app.post("/sync/deepbook/metrics/{pool_id}")
async def sync_deepbook_metrics_for_pool(
    pool_id: int,
    db: Session = Depends(get_db),
):
    """
    Belirli bir havuz için Surflux verisini kullanarak risk metriklerini hesaplar
    ve yeni bir PoolMetric kaydı oluşturur.
    """
    pool = db.get(models.Pool, pool_id)
    if not pool:
        raise HTTPException(status_code=404, detail="Pool not found")

    if not pool.pool_name:
        raise HTTPException(status_code=500, detail="Pool has no pool_name set")

    # Surflux için pool_name: SUI_USDC, NS_SUI vb.
    pool_name = pool.pool_name

    try:
        metric = await calculate_and_store_pool_metrics(
            db=db,
            pool=pool,
            pool_name=pool_name,
        )
    except Exception as e:
        logger.exception("Risk metric calculation failed")
        raise HTTPException(status_code=500, detail=f"Metric calculation failed: {e}")

    return {
        "message": "Metrics synced for pool",
        "pool_id": pool.id,
        "risk_score": metric.risk_score,
        "tvl_usd": str(metric.tvl_usd) if metric.tvl_usd is not None else None,
        "volume_24h": str(metric.volume_24h) if metric.volume_24h is not None else None,
        "price_var_24h": metric.price_var_24h,
        "il_risk": metric.il_risk,
        "utilization": metric.utilization,
        "captured_at": metric.captured_at,
    }


@app.post("/sync/deepbook/metrics")
async def sync_deepbook_metrics_for_all_pools(db: Session = Depends(get_db)):
    """
    Kayıtlı tüm havuzlar için risk metriklerini hesaplar ve PoolMetric oluşturur.
    Demo / manuel tetikleme için ideal.
    """
    pools = db.query(models.Pool).all()
    if not pools:
        raise HTTPException(status_code=404, detail="No pools found. Run /sync/deepbook/pools first.")

    results = []
    for pool in pools:
        if not pool.pool_name:
            results.append(
                {
                    "pool_id": pool.id,
                    "error": "Pool has no pool_name set",
                }
            )
            continue

        pool_name = pool.pool_name

        try:
            metric = await calculate_and_store_pool_metrics(
                db=db,
                pool=pool,
                pool_name=pool_name,
            )
            results.append(
                {
                    "pool_id": pool.id,
                    "risk_score": metric.risk_score,
                    "tvl_usd": str(metric.tvl_usd) if metric.tvl_usd is not None else None,
                    "volume_24h": str(metric.volume_24h) if metric.volume_24h is not None else None,
                }
            )
        except Exception as e:
            logger.exception(f"Metric calculation failed for pool_id={pool.id}")
            results.append(
                {
                    "pool_id": pool.id,
                    "error": str(e),
                }
            )

    return {
        "message": "Metrics sync completed for all pools",
        "count": len(results),
        "results": results,
    }


@app.get("/risk/level-from-score")
def get_level_from_score(score: int):
    """
    Basit test:
    Verilen score'a göre hangi level olacağını döner.
    Örn: /risk/level-from-score?score=75
    """
    clamped = clamp_score(score)
    level = map_risk_score_to_level(clamped)
    return {
        "raw_score": score,
        "clamped_score": clamped,
        "level": level,
    }


@app.get("/risk/identity/wallet-score/{address}")
def get_wallet_risk_score(address: str, db: Session = Depends(get_db)):
    score = compute_wallet_risk_score(address, db)
    level = map_risk_score_to_level(score)
    return {
        "address": address,
        "score": score,
        "level": level,
    }


@app.post("/risk/identity/mint-payload", response_model=MintRiskIdentityPayload)
def get_mint_risk_identity_payload(body: MintRiskIdentityRequest, db: Session = Depends(get_db)):
    """
    Verilen cüzdan adresi ve risk skoruna göre,
    Sui üstünde çağrılması gereken Move fonksiyonunun payload'ını döner.

    Gerçek transaction'ı backend imzalamıyor;
    frontend veya wallet bu bilgiyi kullanarak
    risk_identity::mint_identity çağrısını yapacak.

    Move imzası:
    public entry fun mint_identity(
        recipient: address,
        score: u64,
        level: u8,
        ts_ms: u64,
        ctx: &mut TxContext
    )
    """

    if not SUI_RISK_PACKAGE_ID:
        # Env yanlışsa net hata verelim
        raise HTTPException(
            status_code=500,
            detail="SUI_RISK_PACKAGE_ID env değişkeni tanımlı değil.",
        )

    computed_score = compute_wallet_risk_score(body.address, db)
    score = clamp_score(computed_score)
    level = map_risk_score_to_level(score)

    ts_ms = int(time.time() * 1000)

    # 3) Move fonksiyonuna gidecek argümanlar
    args = [
        body.address,    # recipient: address
        str(score),      # score: u64
        str(level),      # level: u8
        str(ts_ms),      # ts_ms: u64
    ]

    # 4) Frontend / wallet için payload
    return MintRiskIdentityPayload(
        package_id=SUI_RISK_PACKAGE_ID,
        module=SUI_RISK_MODULE,
        function=SUI_RISK_FUNCTION_MINT,
        args=args,
        score=score,
        level=level,
        timestamp_ms=ts_ms,   # args ile aynı ts_ms
    )


@app.post("/risk/identity/store")
def store_identity(data: dict, db: Session = Depends(get_db)):
    """
    Mint edilen Risk Identity NFT bilgilerini veritabanına kaydeder.
    Frontend mint işlemi sonrasında bu endpoint'i çağırır.
    """
    entry = models.RiskIdentity(
        address=data["address"],
        score=data["score"],
        level=data["level"],
        timestamp_ms=data["timestamp_ms"],
        tx_digest=data["tx_digest"],
    )
    db.add(entry)
    db.commit()
    return {"status": "ok"}


@app.get("/risk/identity/history/{address}")
def get_identity_history(address: str, db: Session = Depends(get_db)):
    """
    Verilen cüzdan adresi için kayıtlı tüm Risk Identity geçmişini döner.
    Timestamp'e göre azalan sırada (en yeni önce).
    """
    rows = (
        db.query(models.RiskIdentity)
        .filter(models.RiskIdentity.address == address)
        .order_by(models.RiskIdentity.timestamp_ms.desc())
        .all()
    )
    return [
        {
            "score": r.score,
            "level": r.level,
            "timestamp_ms": r.timestamp_ms,
            "tx_digest": r.tx_digest,
        }
        for r in rows
    ]
