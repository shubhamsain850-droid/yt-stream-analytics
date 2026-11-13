"""TubeMetrix Owner Tool - View & Add Credits to any User Account.

Run directly or with arguments:
  python manage_credits.py list
  python manage_credits.py add user@example.com 50
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

DB_NAME = "tubemetrix-db"
ROOT_DIR = Path(__file__).resolve().parent


def run_d1_query(sql: str) -> list[dict]:
    """Execute SQL on remote Cloudflare D1 database and return results."""
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
    )
    if proc.returncode != 0:
        print(f"[Error executing query]: {proc.stderr}")
        return []

    try:
        payload = json.loads(proc.stdout)
        if isinstance(payload, list) and payload:
            return payload[0].get("results", []) or []
        if isinstance(payload, dict):
            return payload.get("results", []) or []
    except Exception as exc:
        print(f"[Error parsing response]: {exc}")
    return []


def list_users() -> None:
    """Print all registered users with their credits."""
    sql = "SELECT id, email, name, credits_balance, total_purchased_credits, created_at, updated_at FROM users ORDER BY updated_at DESC"
    users = run_d1_query(sql)

    print("\n" + "=" * 80)
    print("Registered Users in TubeMetrix Database:")
    print("=" * 80)
    if not users:
        print("No users found.")
        return

    print(f"{'Email':<32} {'Name':<22} {'Credits':<10} {'Total Bought':<12}")
    print("-" * 80)
    for u in users:
        email = str(u.get("email", ""))
        name = str(u.get("name", ""))[:20]
        bal = u.get("credits_balance", 0)
        tot = u.get("total_purchased_credits", 0)
        print(f"{email:<32} {name:<22} {bal:<10} {tot:<12}")
    print("=" * 80 + "\n")


def add_credits(email: str, amount: int) -> bool:
    """Add credits to a user by email, update ledger, and refresh user row."""
    email_clean = email.strip().lower()
    if amount <= 0:
        print("[Error]: Credit amount must be greater than 0.")
        return False

    # 1. Find user
    find_sql = f"SELECT id, email, name, credits_balance, total_purchased_credits FROM users WHERE LOWER(email) = '{email_clean}'"
    users = run_d1_query(find_sql)
    if not users:
        print(f"\n[Error]: User with email '{email_clean}' not found in database.")
        print("Note: The user must have signed in with Google at least once on https://tubemetrix.net\n")
        return False

    user = users[0]
    user_id = user["id"]
    old_bal = int(user.get("credits_balance", 0))
    new_bal = old_bal + amount
    now_iso = datetime.now(timezone.utc).isoformat()
    ref_id = f"admin_grant_{uuid.uuid4().hex[:12]}"
    ledger_id = str(uuid.uuid4())

    # 2. Update users and credit_ledger
    update_user_sql = (
        f"UPDATE users SET credits_balance = credits_balance + {amount}, "
        f"total_purchased_credits = total_purchased_credits + {amount}, "
        f"updated_at = '{now_iso}' WHERE id = '{user_id}'"
    )
    insert_ledger_sql = (
        f"INSERT INTO credit_ledger (id, user_id, delta, reason, ref_id, meta_json, created_at) "
        f"VALUES ('{ledger_id}', '{user_id}', {amount}, 'owner_grant', '{ref_id}', '{{\"by\":\"owner\"}}', '{now_iso}')"
    )

    batch_sql = f"{update_user_sql}; {insert_ledger_sql}"
    run_d1_query(batch_sql)

    # 3. Verify
    verify_users = run_d1_query(find_sql)
    if verify_users:
        confirmed_bal = verify_users[0].get("credits_balance", 0)
        print("\n" + "=" * 60)
        print("SUCCESS! Credits added successfully.")
        print(f"User:        {user.get('name')} ({email_clean})")
        print(f"Added:       +{amount} credits")
        print(f"Old Balance: {old_bal} credits")
        print(f"New Balance: {confirmed_bal} credits")
        print("=" * 60 + "\n")
        return True
    return False


def interactive_menu() -> None:
    while True:
        print("==================================================")
        print("       TubeMetrix - Owner Credit Manager          ")
        print("==================================================")
        print("1. View all users & current credit balances")
        print("2. Add credits to an account (by email)")
        print("3. Exit")
        choice = input("\nSelect an option (1-3): ").strip()

        if choice == "1":
            list_users()
        elif choice == "2":
            email = input("Enter user's Google Email: ").strip()
            if not email:
                print("Email cannot be empty.\n")
                continue
            amt_str = input("Enter number of credits to add (e.g. 10, 50, 100): ").strip()
            try:
                amt = int(amt_str)
                add_credits(email, amt)
            except ValueError:
                print("Invalid number. Please enter a valid integer.\n")
        elif choice == "3":
            print("Exiting.")
            break
        else:
            print("Invalid choice, please select 1, 2, or 3.\n")


def main() -> None:
    args = sys.argv[1:]
    if not args:
        interactive_menu()
        return

    cmd = args[0].lower()
    if cmd == "list":
        list_users()
    elif cmd == "add":
        if len(args) < 3:
            print("Usage: python manage_credits.py add <email> <amount>")
            sys.exit(1)
        email = args[1]
        try:
            amt = int(args[2])
            add_credits(email, amt)
        except ValueError:
            print("Amount must be an integer.")
            sys.exit(1)
    else:
        print(f"Unknown command: {cmd}")
        print("Usage: python manage_credits.py [list | add <email> <amount>]")


if __name__ == "__main__":
    main()
