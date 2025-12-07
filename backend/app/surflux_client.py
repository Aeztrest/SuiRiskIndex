import os
from typing import Any, Dict, List, Optional

import httpx

SURFLUX_BASE_URL = "https://api.surflux.dev"
SURFLUX_API_KEY = os.getenv("SURFLUX_API_KEY")


class SurfluxError(Exception):
    pass


def _get_api_key() -> str:
    if not SURFLUX_API_KEY:
        raise SurfluxError("SURFLUX_API_KEY env değişkeni set edilmemiş.")
    return SURFLUX_API_KEY


async def fetch_deepbook_pools() -> List[Dict[str, Any]]:
    """
    Surflux Deepbook 'Get Pools' endpoint:
    GET /deepbook/get_pools?api-key=YOUR_API_KEY
    """
    api_key = _get_api_key()
    url = f"{SURFLUX_BASE_URL}/deepbook/get_pools"

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, params={"api-key": api_key})
        if resp.status_code != 200:
            raise SurfluxError(
                f"Get Pools failed: {resp.status_code} - {resp.text[:200]}"
            )
        return resp.json()


async def fetch_order_book_depth(pool_name: str, limit: int = 20) -> Dict[str, Any]:
    """
    GET /deepbook/{poolName}/order-book-depth?limit=...&api-key=...
    """
    api_key = _get_api_key()
    url = f"{SURFLUX_BASE_URL}/deepbook/{pool_name}/order-book-depth"

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            url,
            params={
                "limit": limit,
                "api-key": api_key,
            },
        )
        if resp.status_code != 200:
            raise SurfluxError(
                f"Order book depth failed: {resp.status_code} - {resp.text[:200]}"
            )
        return resp.json()


async def fetch_recent_trades(
    pool_name: str,
    limit: int = 200,
    from_ts: Optional[int] = None,
    to_ts: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Surflux Deepbook Recent Trades
    GET /deepbook/{poolName}/trades?limit=...&from=...&to=...&api-key=...
    """
    api_key = _get_api_key()
    url = f"{SURFLUX_BASE_URL}/deepbook/{pool_name}/trades"

    params: Dict[str, Any] = {
        "limit": limit,
        "api-key": api_key,
    }
    if from_ts is not None:
        params["from"] = from_ts
    if to_ts is not None:
        params["to"] = to_ts

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.get(url, params=params)
        if resp.status_code != 200:
            raise SurfluxError(
                f"Recent trades failed: {resp.status_code} - {resp.text[:200]}"
            )
        return resp.json()
