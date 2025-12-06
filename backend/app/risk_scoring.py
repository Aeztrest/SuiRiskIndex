import math
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from . import models
from .surflux_client import (
    fetch_order_book_depth,
    fetch_recent_trades,
    SurfluxError,
)


def _safe_div(numerator: float, denominator: float, default: float = 0.0) -> float:
    if denominator == 0 or denominator is None:
        return default
    return numerator / denominator


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


async def compute_pool_risk_metrics(
    pool_name: str,
    base_decimals: int,
    quote_decimals: int,
    trades_limit: int = 100,
) -> Dict[str, Any]:
    """
    Surflux Deepbook verilerini kullanarak bir pool için risk metrikleri hesaplar.

    Dönüş:
        {
          "tvl_usd": float,
          "volume_24h": float,
          "price_var_24h": float,
          "il_risk": float,
          "utilization": float,
          "risk_score": int,
        }
    """

    # 1) Order book depth verisi
    try:
        order_book = await fetch_order_book_depth(pool_name, limit=20)
    except SurfluxError as e:
        # Order book çekilemezse aşırı riskli kabul ediyoruz
        return {
            "tvl_usd": 0.0,
            "volume_24h": 0.0,
            "price_var_24h": 0.0,
            "il_risk": 1.0,
            "utilization": 0.0,
            "risk_score": 95,
            "error": f"order_book_error: {e}",
        }

    bids: List[Dict[str, Any]] = order_book.get("bids") or []
    asks: List[Dict[str, Any]] = order_book.get("asks") or []

    # Eğer hiç bid/ask yoksa havuz fiilen ölü
    if not bids or not asks:
        return {
            "tvl_usd": 0.0,
            "volume_24h": 0.0,
            "price_var_24h": 0.0,
            "il_risk": 1.0,
            "utilization": 0.0,
            "risk_score": 98,
            "error": "empty_orderbook",
        }

    # ------------- Order book metrikleri -------------
    best_bid = float(bids[0]["price"])
    best_ask = float(asks[0]["price"])
    mid_raw = (best_bid + best_ask) / 2.0

    # Spread (yüzde)
    spread_pct = _safe_div(best_ask - best_bid, mid_raw, default=1.0)

    # Fiyatı insan okuyabilir forma çevir (USDC tarzı quote varsayımı)
    # Docs: price / 10^quote_decimals  ≈ quote asset cinsinden fiyat
    # (base_decimals dahil daha kompleks formül var ama burada yaklaşık kullanıyoruz)
    mid_price_human = mid_raw / (10**quote_decimals)

    # Derinlik: ilk 10 seviye bid/ask toplamı (base asset miktarı)
    def _sum_depth(levels: List[Dict[str, Any]], depth_levels: int = 10) -> float:
        total_raw = sum(float(l["total_quantity"]) for l in levels[:depth_levels])
        return total_raw / (10**base_decimals)

    depth_bids = _sum_depth(bids)
    depth_asks = _sum_depth(asks)
    depth_total = depth_bids + depth_asks

    # TVL tahmini: görünen derinliği kullanıyoruz (tam TVL değil ama proxy)
    tvl_usd_estimate = depth_total * mid_price_human

    # Order book tarafları arasındaki dengesizlik (imbalance)
    # 0.5 = dengeli, 0 veya 1 = tek taraflı
    if depth_total > 0:
        imbalance = depth_bids / depth_total
    else:
        imbalance = 0.5

    # ------------- Trade metrikleri -------------
    try:
        trades = await fetch_recent_trades(pool_name, limit=trades_limit)
    except SurfluxError:
        trades = []

    prices: List[float] = []
    quote_volumes: List[float] = []

    for t in trades:
        price_human = float(t["price"]) / (10**quote_decimals)
        quote_qty_human = float(t["quote_quantity"]) / (10**quote_decimals)

        prices.append(price_human)
        quote_volumes.append(quote_qty_human)

    # 24h hacim (approx)
    volume_24h = sum(quote_volumes) if quote_volumes else 0.0

    # Volatilite (relatif std/mean)
    if len(prices) >= 2:
        mean_price = sum(prices) / len(prices)
        var = sum((p - mean_price) ** 2 for p in prices) / (len(prices) - 1)
        std = math.sqrt(var)
        price_var_24h = _safe_div(std, mean_price, default=0.0)
    else:
        price_var_24h = 0.0

    # ------------- Normalizasyon & Risk skorları -------------
    # Basit, ama hackathon için gayet sunulabilir heuristikler:

    # 1) Spread riski: 1% üzeri spread'i maksimum risk sayalım
    spread_risk = _clamp01(spread_pct / 0.01)  # 0.01 = %1

    # 2) Volatilite riski: %10 üzeri relatif volatilite yüksek risk
    vol_risk = _clamp01(price_var_24h / 0.10)

    # 3) Likidite (TVL) riski: 100k USD altında likiditeyi riskli sayalım
    tvl_threshold = 100_000.0
    liquidity_goodness = _clamp01(_safe_div(tvl_usd_estimate, tvl_threshold, default=0.0))
    liquidity_risk = 1.0 - liquidity_goodness  # düşük TVL -> yüksek risk

    # 4) Hacim riski: 100k USD altı 24h hacim riskli
    volume_threshold = 100_000.0
    volume_goodness = _clamp01(_safe_div(volume_24h, volume_threshold, default=0.0))
    volume_risk = 1.0 - volume_goodness

    # 5) Imbalance riski: 0.5'ten ne kadar uzaksa o kadar riskli
    imbalance_risk = _clamp01(abs(imbalance - 0.5) * 2.0)  # 0..1

    # Ağırlıklar (toplam 1.0)
    w_spread = 0.25
    w_vol = 0.25
    w_liquidity = 0.25
    w_volume = 0.15
    w_imbalance = 0.10

    risk_0_1 = (
        w_spread * spread_risk
        + w_vol * vol_risk
        + w_liquidity * liquidity_risk
        + w_volume * volume_risk
        + w_imbalance * imbalance_risk
    )

    risk_score = int(round(_clamp01(risk_0_1) * 100))

    # "IL Risk" için CLOB'ta gerçek IL yok, ama volatiliteyi proxy olarak kullanıyoruz
    il_risk = _clamp01(vol_risk)

    # "Utilization" için burada basitçe derinlik bazlı bir oran kullanıyoruz
    # (çok derin market -> 1'e yakın, sığ market -> 0'a yakın)
    depth_threshold = 10_000.0  # 10k base asset (~ proxy)
    utilization = _clamp01(_safe_div(depth_total, depth_threshold, default=0.0))

    return {
        "tvl_usd": float(tvl_usd_estimate),
        "volume_24h": float(volume_24h),
        "price_var_24h": float(price_var_24h),
        "il_risk": float(il_risk),
        "utilization": float(utilization),
        "risk_score": int(risk_score),
        "spread_pct": float(spread_pct),
        "imbalance": float(imbalance),
        "depth_total": float(depth_total),
    }


async def calculate_and_store_pool_metrics(
    db: Session,
    pool: models.Pool,
    pool_name: str,
) -> models.PoolMetric:
    """
    Verilen Pool için Surflux verisine dayanarak risk metriklerini hesaplar
    ve yeni bir PoolMetric kaydı oluşturur.
    """

    # Token decimals bilgisi lazım
    if not pool.token0 or not pool.token1:
        raise ValueError("Pool için token ilişkileri (token0/token1) yüklenmemiş.")

    base_decimals = pool.token0.decimals
    quote_decimals = pool.token1.decimals

    metrics = await compute_pool_risk_metrics(
        pool_name=pool_name,
        base_decimals=base_decimals,
        quote_decimals=quote_decimals,
    )

    pool_metric = models.PoolMetric(
        pool_id=pool.id,
        tvl_usd=metrics["tvl_usd"],
        volume_24h=metrics["volume_24h"],
        price_var_24h=metrics["price_var_24h"],
        il_risk=metrics["il_risk"],
        utilization=metrics["utilization"],
        risk_score=metrics["risk_score"],
    )

    db.add(pool_metric)
    db.commit()
    db.refresh(pool_metric)

    return pool_metric
