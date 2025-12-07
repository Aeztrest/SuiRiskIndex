from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    DECIMAL,
    Float,
    BigInteger,
)
from sqlalchemy.orm import relationship

from .database import Base


class Token(Base):
    __tablename__ = "tokens"

    id = Column(Integer, primary_key=True, index=True)
    address = Column(String(255), unique=True, nullable=False, index=True)
    symbol = Column(String(64), nullable=False, index=True)
    name = Column(String(255), nullable=True)
    decimals = Column(Integer, default=9)

    # Bu token'ın yer aldığı havuzlar
    pools_token0 = relationship(
        "Pool",
        back_populates="token0",
        foreign_keys="Pool.token0_id",
    )
    pools_token1 = relationship(
        "Pool",
        back_populates="token1",
        foreign_keys="Pool.token1_id",
    )


class Pool(Base):
    __tablename__ = "pools"

    id = Column(Integer, primary_key=True, index=True)
    sui_pool_id = Column(String(255), unique=True, nullable=False, index=True)

    # Surflux'taki poolName (ör: SUI_USDC, NS_SUI, DEEP_SUI)
    pool_name = Column(String(128), nullable=False, index=True)

    dex_name = Column(String(128), nullable=False, index=True)

    token0_id = Column(Integer, ForeignKey("tokens.id"), nullable=False)
    token1_id = Column(Integer, ForeignKey("tokens.id"), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    token0 = relationship(
        "Token",
        foreign_keys=[token0_id],
        back_populates="pools_token0",
    )
    token1 = relationship(
        "Token",
        foreign_keys=[token1_id],
        back_populates="pools_token1",
    )

    metrics = relationship(
        "PoolMetric",
        back_populates="pool",
        cascade="all, delete-orphan",
    )


class PoolMetric(Base):
    __tablename__ = "pool_metrics"

    id = Column(Integer, primary_key=True, index=True)
    pool_id = Column(Integer, ForeignKey("pools.id"), nullable=False)

    # Finansal metrikler
    tvl_usd = Column(DECIMAL(24, 8), nullable=True)      # toplam likidite (USD)
    volume_24h = Column(DECIMAL(24, 8), nullable=True)   # 24s hacim

    # Oransal / risk metrikleri
    price_var_24h = Column(Float, nullable=True)         # 0–1 arası normalize oynaklık
    il_risk = Column(Float, nullable=True)               # 0–1 IL riski
    utilization = Column(Float, nullable=True)           # 0–1 doluluk

    risk_score = Column(Integer, nullable=True)          # 0–100 risk skoru

    captured_at = Column(DateTime, default=datetime.utcnow, index=True)

    pool = relationship("Pool", back_populates="metrics")


class RiskIdentity(Base):
    __tablename__ = "risk_identities"

    id = Column(Integer, primary_key=True, index=True)
    address = Column(String(128), index=True, nullable=False)
    score = Column(Integer, nullable=False)
    level = Column(String(32), nullable=False)
    timestamp_ms = Column(BigInteger, nullable=False)
    tx_digest = Column(String(255), nullable=False)
