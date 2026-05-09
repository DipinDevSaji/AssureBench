"""Optional OpenAI moderation integration.

The moderation check is disabled unless OPENAI_API_KEY is present. Import or API
errors fail closed for availability: the evaluator records no moderation flag and
continues with local scoring.
"""

import os
from functools import lru_cache
from typing import Dict


@lru_cache(maxsize=1)
def _get_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    try:
        from openai import OpenAI
    except Exception:
        return None

    return OpenAI(api_key=api_key)


def moderate_text(text: str) -> Dict:
    client = _get_client()
    if client is None or not text:
        return {"enabled": False, "flagged": False, "categories": {}}

    try:
        response = client.moderations.create(model="omni-moderation-latest", input=text)
        result = response.results[0]
        categories = result.categories.model_dump() if hasattr(result.categories, "model_dump") else dict(result.categories)
        return {
            "enabled": True,
            "flagged": bool(result.flagged),
            "categories": categories,
        }
    except Exception:
        return {"enabled": False, "flagged": False, "categories": {}}
