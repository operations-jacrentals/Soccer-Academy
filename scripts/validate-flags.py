#!/usr/bin/env python3
"""Validate flags/flags.json against the project's feature-flag conventions.

Pure standard library — runs on any CI runner with Python 3.8+. No third-party
packages required.

Usage:
    python scripts/validate-flags.py [--strict]

    --strict   treat warnings (e.g. stale flags) as failures.

Exit codes: 0 = valid, 1 = validation errors (or warnings under --strict).
"""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import date, datetime
from pathlib import Path

FLAGS_PATH = Path(__file__).resolve().parents[1] / "flags" / "flags.json"

REQUIRED_ENVS = ("staging", "production")
ALLOWED_ENVS = ("development", "staging", "production")
KEY_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
DATE_FMT = "%Y-%m-%d"

errors: list[str] = []
warnings: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def _in_ci() -> bool:
    return os.environ.get("GITHUB_ACTIONS") == "true"


def _parse_date(value, ctx: str):
    try:
        return datetime.strptime(value, DATE_FMT).date()
    except (TypeError, ValueError):
        err(f"{ctx}: expected a date 'YYYY-MM-DD', got {value!r}")
        return None


def validate() -> None:
    if not FLAGS_PATH.exists():
        err(f"flags file not found: {FLAGS_PATH}")
        return

    try:
        data = json.loads(FLAGS_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        err(f"invalid JSON in {FLAGS_PATH.name}: {exc}")
        return

    flags = data.get("flags")
    if not isinstance(flags, dict):
        err("top-level 'flags' must be an object")
        return

    today = date.today()

    for name, flag in flags.items():
        ctx = f"flag '{name}'"

        if not KEY_RE.match(name):
            err(f"{ctx}: key must be kebab-case (lowercase letters, digits, single hyphens)")

        if not isinstance(flag, dict):
            err(f"{ctx}: definition must be an object")
            continue

        desc = flag.get("description")
        if not isinstance(desc, str) or not desc.strip():
            err(f"{ctx}: 'description' is required and must be a non-empty string")

        owner = flag.get("owner")
        if not isinstance(owner, str) or not owner.strip():
            err(f"{ctx}: 'owner' is required (email or team handle)")

        created = None
        if "created" not in flag:
            err(f"{ctx}: 'created' date is required")
        else:
            created = _parse_date(flag["created"], f"{ctx}.created")

        cleanup = None
        if "cleanupBy" not in flag:
            err(f"{ctx}: 'cleanupBy' date is required (flags are temporary)")
        else:
            cleanup = _parse_date(flag["cleanupBy"], f"{ctx}.cleanupBy")

        if created and cleanup and cleanup < created:
            err(f"{ctx}: cleanupBy ({cleanup}) is before created ({created})")
        if cleanup and cleanup < today:
            warn(f"{ctx}: cleanupBy ({cleanup}) has passed — retire the flag or extend the date")

        envs = flag.get("environments")
        if not isinstance(envs, dict):
            err(f"{ctx}: 'environments' object is required")
            continue

        for required in REQUIRED_ENVS:
            if required not in envs:
                err(f"{ctx}: environments must include '{required}'")

        for env_name, value in envs.items():
            if env_name not in ALLOWED_ENVS:
                err(f"{ctx}: unknown environment '{env_name}' (allowed: {', '.join(ALLOWED_ENVS)})")
            elif not isinstance(value, bool):
                err(f"{ctx}: environments.{env_name} must be true or false")

        if envs.get("production") is True and envs.get("staging") is not True:
            warn(f"{ctx}: enabled in production but not staging — promote through staging first")


def report(strict: bool) -> int:
    ci = _in_ci()
    for w in warnings:
        print(f"::warning::{w}" if ci else f"warning: {w}")
    for e in errors:
        print(f"::error::{e}" if ci else f"error: {e}")

    n_err, n_warn = len(errors), len(warnings)
    if n_err:
        print(f"\nFAILED: {n_err} error(s), {n_warn} warning(s).")
        return 1
    if strict and n_warn:
        print(f"\nFAILED (--strict): {n_warn} warning(s).")
        return 1
    print(f"OK: flag registry valid ({n_warn} warning(s)).")
    return 0


def main() -> int:
    strict = "--strict" in sys.argv[1:]
    validate()
    return report(strict)


if __name__ == "__main__":
    raise SystemExit(main())
