# app/risk_logic.py

def map_risk_score_to_level(score: int) -> int:
    """
    Basit kural:
    0-40   -> 1 (Bronze)
    41-70  -> 2 (Silver)
    71-100 -> 3 (Gold)
    """
    if score <= 40:
        return 1
    elif score <= 70:
        return 2
    else:
        return 3


def clamp_score(score: int) -> int:
    """
    Her ihtimale karşı skoru 0-100 arasına sıkıştır.
    """
    return max(0, min(100, score))
