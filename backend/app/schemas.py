# app/schemas.py

from pydantic import BaseModel, Field


class MintRiskIdentityRequest(BaseModel):
    """
    Risk NFT mint payload'ı isteyen client'ın göndereceği body.
    Şimdilik score'u client veriyor, ileride backend hesaplayabilir.
    """
    address: str = Field(..., description="Kullanıcının Sui cüzdan adresi")
    score: int = Field(..., ge=0, le=100, description="0-100 arası risk skoru")


class MintRiskIdentityPayload(BaseModel):
    """
    Frontend / wallet tarafının direkt kullanabileceği Move call bilgisi.
    args = [
        address,
        score,
        level,
        ts_ms
    ]
    """
    package_id: str
    module: str
    function: str
    args: list[str]          # Move call argümanları (4 eleman)
    score: int               # normalize edilmiş risk skoru
    level: int               # risk seviye (1-3)
    timestamp_ms: int        # backend timestamp (mint_identity ts_ms parametresine gider)
