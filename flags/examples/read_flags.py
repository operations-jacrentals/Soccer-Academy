"""Reference feature-flag resolver (Python, standard library only).

Copy/adapt this into your app. It reads ../flags.json and answers whether a flag
is enabled for the current environment.

    APP_ENV=staging python -c "from read_flags import is_enabled; print(is_enabled('parent-dashboard'))"
"""

from __future__ import annotations

import json
import os
from pathlib import Path

_FLAGS_PATH = Path(__file__).resolve().parents[1] / "flags.json"


def _load() -> dict:
    with open(_FLAGS_PATH, encoding="utf-8") as fh:
        return json.load(fh).get("flags", {})


def current_env() -> str:
    """Environment the app is running in: development | staging | production."""
    return os.environ.get("APP_ENV", "development")


def is_enabled(name: str, env: str | None = None, default: bool = False) -> bool:
    """Return True if `name` is enabled for `env` (defaults to current_env())."""
    env = env or current_env()
    flag = _load().get(name)
    if not flag:
        return default
    return bool(flag.get("environments", {}).get(env, default))


if __name__ == "__main__":
    env = current_env()
    print(f"Environment: {env}")
    for name, flag in sorted(_load().items()):
        state = flag.get("environments", {}).get(env, False)
        print(f"  {name}: {'on' if state else 'off'}")
