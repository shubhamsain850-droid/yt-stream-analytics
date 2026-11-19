"""Export TubeMetrix user and paying customer emails from Cloudflare D1 to CSV."""

from __future__ import annotations

import csv
import json
import os
import subprocess
from pathlib import Path

DB_NAME = "tubemetrix-db"
ROOT_DIR = Path(__file__).resolve().parent
EXPORT_DIR = ROOT_DIR / "exports"

PREMIUM_SQL = (
    "SELECT email, name, total_purchased_credits, credits_balance, created_at, updated_at "
    "FROM users WHERE total_purchased_credits > 0 "
    "ORDER BY total_purchased_credits DESC, updated_at DESC"
)

ALL_USERS_SQL = (
    "SELECT email, name, total_purchased_credits, credits_balance, created_at, updated_at "
    "FROM users ORDER BY created_at DESC"
)


import shutil


def _find_wrangler_cmd() -> list[str]:
    """Finds the fastest and most direct wrangler executable on this machine."""
    appdata = os.environ.get("APPDATA", "")
    if appdata:
        global_wrangler = Path(appdata) / "npm" / "wrangler.cmd"
        if global_wrangler.exists():
            return [str(global_wrangler)]

    local_wrangler = ROOT_DIR / "node_modules" / ".bin" / "wrangler.cmd"
    if local_wrangler.exists():
        return [str(local_wrangler)]

    which_wrangler = shutil.which("wrangler.cmd" if os.name == "nt" else "wrangler")
    if which_wrangler:
        return [which_wrangler]

    return ["npx.cmd" if os.name == "nt" else "npx", "wrangler"]


def query_d1(sql: str) -> list[dict]:
    """Execute a remote Cloudflare D1 SQL query via Wrangler and return result rows."""
    base_cmd = _find_wrangler_cmd()
    cmd = base_cmd + [
        "d1",
        "execute",
        DB_NAME,
        "--remote",
        "--json",
        "--command",
        sql,
    ]
    env = os.environ.copy()
    env["CI"] = "1"
    env["NO_UPDATE_NOTIFIER"] = "1"
    env["WRANGLER_SEND_METRICS"] = "false"

    creationflags = 0
    if os.name == "nt":
        creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)

    try:
        proc = subprocess.run(
            cmd,
            cwd=str(ROOT_DIR),
            capture_output=True,
            text=True,
            stdin=subprocess.DEVNULL,
            creationflags=creationflags,
            timeout=30,
            env=env,
        )
    except subprocess.TimeoutExpired:
        print("[Error]: D1 query timed out after 30 seconds.")
        return []
    except Exception as exc:
        print(f"[Error]: {exc}")
        return []

    if proc.returncode != 0:
        print(f"[Error]: {proc.stderr or proc.stdout}")
        return []

    raw_out = (proc.stdout or "").strip()
    if not raw_out:
        return []

    bracket_idx = raw_out.find("[")
    brace_idx = raw_out.find("{")
    start_idx = -1
    if bracket_idx != -1 and brace_idx != -1:
        start_idx = min(bracket_idx, brace_idx)
    elif bracket_idx != -1:
        start_idx = bracket_idx
    elif brace_idx != -1:
        start_idx = brace_idx

    json_str = raw_out
    if start_idx != -1:
        rbracket = raw_out.rfind("]")
        rbrace = raw_out.rfind("}")
        end_idx = max(rbracket, rbrace)
        if end_idx != -1 and end_idx >= start_idx:
            json_str = raw_out[start_idx : end_idx + 1]

    try:
        payload = json.loads(json_str)
        if isinstance(payload, list) and payload:
            return payload[0].get("results", []) or []
        if isinstance(payload, dict):
            return payload.get("results", []) or []
    except Exception as exc:
        print(f"[Error parsing response]: {exc}")
    return []


def write_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    """Write query rows to a UTF-8 CSV file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in fieldnames})


def main() -> None:
    fields = [
        "email",
        "name",
        "total_purchased_credits",
        "credits_balance",
        "created_at",
        "updated_at",
    ]

    premium_rows = query_d1(PREMIUM_SQL)
    all_rows = query_d1(ALL_USERS_SQL)

    premium_path = EXPORT_DIR / "premium_users.csv"
    all_path = EXPORT_DIR / "all_users.csv"

    write_csv(premium_path, premium_rows, fields)
    write_csv(all_path, all_rows, fields)

    print(f"Exported {len(premium_rows)} premium users -> {premium_path}")
    print(f"Exported {len(all_rows)} total signed-in users -> {all_path}")


if __name__ == "__main__":
    main()
