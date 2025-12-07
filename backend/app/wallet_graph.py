"""Trade graph construction for Deepbook pools."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Tuple

from . import models
from .surflux_client import fetch_recent_trades

logger = logging.getLogger(__name__)


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


async def build_trade_graph_for_pool(
    pool: models.Pool,
    base_decimals: int,
    quote_decimals: int,
    trades_limit: int = 200,
) -> Dict[str, Any]:
    """
    Build a wallet interaction graph for a Deepbook pool using recent trades.

    Nodes represent balance manager IDs (traders); edges represent trades between maker and taker.
    Node risk is a heuristic favoring active/low-volume traders as less risky.
    """
    trades: List[Dict[str, Any]] = await fetch_recent_trades(pool.pool_name, limit=trades_limit)

    nodes: Dict[str, Dict[str, Any]] = {}
    edges: Dict[Tuple[str, str], Dict[str, Any]] = {}

    total_trades = 0
    for trade in trades:
        maker = trade.get("maker_balance_manager_id")
        taker = trade.get("taker_balance_manager_id")
        quote_qty_raw = trade.get("quote_quantity")

        if not maker or not taker or quote_qty_raw is None:
            continue

        try:
            quote_qty_human = float(quote_qty_raw) / (10 ** quote_decimals)
        except Exception:
            quote_qty_human = 0.0

        total_trades += 1

        for addr in (maker, taker):
            if addr not in nodes:
                nodes[addr] = {"id": addr, "volume": 0.0, "trades": 0}
            nodes[addr]["volume"] += quote_qty_human
            nodes[addr]["trades"] += 1

        # undirected edge key
        key = tuple(sorted((maker, taker)))
        if key not in edges:
            edges[key] = {
                "source": key[0],
                "target": key[1],
                "volume": 0.0,
                "trades": 0,
            }
        edges[key]["volume"] += quote_qty_human
        edges[key]["trades"] += 1

    if not nodes:
        return {
            "pool_id": pool.id,
            "pool_name": pool.pool_name,
            "nodes": [],
            "edges": [],
            "meta": {"total_volume": 0.0, "total_trades": 0},
        }

    max_volume = max((n["volume"] for n in nodes.values()), default=1.0) or 1.0
    max_trades = max((n["trades"] for n in nodes.values()), default=1) or 1

    # compute risk heuristic
    for node in nodes.values():
        volume_norm = node["volume"] / max_volume if max_volume else 0.0
        trade_freq_norm = node["trades"] / max_trades if max_trades else 0.0
        risk_score = _clamp01(volume_norm * 0.7 + (1 - trade_freq_norm) * 0.3)
        node["risk"] = risk_score

    total_volume = sum(n["volume"] for n in nodes.values())

    return {
        "pool_id": pool.id,
        "pool_name": pool.pool_name,
        "nodes": list(nodes.values()),
        "edges": list(edges.values()),
        "meta": {
            "total_volume": total_volume,
            "total_trades": total_trades,
        },
    }
