"""Helpers to compute wallet-level risk scores.

Placeholder heuristic keeps score deterministic per address until
we plug in richer data sources.
"""
from __future__ import annotations

import hashlib
from typing import Optional

from sqlalchemy.orm import Session

# Optional: in the future we can pull pool metrics, on-chain data, etc.
# from . import models


def compute_wallet_risk_score(address: str, db: Optional[Session] = None) -> int:
    """
    Compute a wallet-level risk score for the given address.

    Placeholder logic (hackathon-friendly):
    - Uses a deterministic hash of the address to keep scores stable.
    - If a DB session is provided, we could blend in global pool metrics later.
    Always returns an integer between 0 and 100.
    """
    # Deterministic hash based score so the same address gets the same value.
    h = hashlib.sha256(address.encode("utf-8")).hexdigest()
    base = int(h[:4], 16) % 71  # 0..70
    score = 30 + base  # 30..100
    return max(0, min(100, score))
