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


def query_d1(sql: str) -> list[dict]:
    """Execute a remote Cloudflare D1 SQL query via Wrangler and return result rows."""
    cmd = [
        "npx.cmd" if os.name == "nt" else "npx",
        "wrangler",
        "d1",
        "execute",
        DB_NAME,
        "--remote",
        "--json",
        "--command",
        sql,
    ]
    proc = subprocess.run(
        cmd,
        cwd=str(ROOT_DIR),
        capture_output=True,
        text=True,
        check=True,
    )
    payload = json.loads(proc.stdout)
    if isinstance(payload, list) and payload:
        return payload[0].get("results", []) or []
    if isinstance(payload, dict):
        return payload.get("results", []) or []
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
