"""TubeMetrix - Owner & Admin Desktop Dashboard.

A modern dark-themed desktop application for managing users, credits, and exporting customer data from Cloudflare D1.
Features separate views for Premium (Paying) and Free users.
"""

from __future__ import annotations

import csv
import json
import os
import subprocess
import threading
import uuid
import webbrowser
from datetime import datetime, timezone
from pathlib import Path
import tkinter as tk
from tkinter import messagebox

import customtkinter as ctk

DB_NAME = "tubemetrix-db"
ROOT_DIR = Path(__file__).resolve().parent
ICON_PATH = ROOT_DIR / "frontend" / "favicon.ico"
EXPORT_DIR = ROOT_DIR / "exports"

# Set CustomTkinter theme
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("dark-blue")

# Brand colors
COLOR_ACCENT = "#ff0033"
COLOR_ACCENT_HOVER = "#cc0029"
COLOR_BG = "#0f0f12"
COLOR_CARD = "#1a1a22"
COLOR_CARD_BORDER = "#2b2b36"
COLOR_CARD_HOVER = "#242430"
COLOR_TEXT_MUTED = "#94a3b8"
COLOR_SUCCESS = "#10b981"
COLOR_GOLD = "#f59e0b"
COLOR_PREMIUM_BORDER = "#854d0e"
COLOR_PREMIUM_BG = "#1f1d17"


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
        raise RuntimeError(proc.stderr or proc.stdout)

    payload = json.loads(proc.stdout)
    if isinstance(payload, list) and payload:
        return payload[0].get("results", []) or []
    if isinstance(payload, dict):
        return payload.get("results", []) or []
    return []


def is_premium_user(user: dict) -> bool:
    """A user is premium if they have bought credits or have an active credit balance."""
    bought = NumberSafe(user.get("total_purchased_credits", 0))
    balance = NumberSafe(user.get("credits_balance", 0))
    return bought > 0 or balance > 0


def NumberSafe(val) -> int:
    try:
        return int(val or 0)
    except Exception:
        return 0


class TubeMetrixAdminApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("TubeMetrix — Owner & Admin Dashboard")
        self.geometry("1140x740")
        self.minsize(1020, 660)
        self.configure(fg_color=COLOR_BG)

        if ICON_PATH.exists():
            try:
                self.iconbitmap(str(ICON_PATH))
            except Exception:
                pass

        self.users_cache: list[dict] = []
        self.selected_user: dict | None = None
        self.is_busy = False
        self.active_tab = "all"  # 'all', 'premium', 'free'

        self._build_header()
        self._build_stats_row()
        self._build_main_workspace()
        self._build_footer()

        # Initial load in background thread
        self.refresh_data()

    def _build_header(self):
        header_frame = ctk.CTkFrame(self, fg_color="transparent")
        header_frame.pack(fill="x", padx=24, pady=(18, 10))

        # Brand Title
        title_box = ctk.CTkFrame(header_frame, fg_color="transparent")
        title_box.pack(side="left")

        title_lbl = ctk.CTkLabel(
            title_box,
            text="TubeMetrix",
            font=ctk.CTkFont(family="Segoe UI", size=24, weight="bold"),
            text_color="#ffffff",
        )
        title_lbl.pack(side="left")

        accent_lbl = ctk.CTkLabel(
            title_box,
            text=" [Admin Console]",
            font=ctk.CTkFont(family="Segoe UI", size=18, weight="bold"),
            text_color=COLOR_ACCENT,
        )
        accent_lbl.pack(side="left", padx=(4, 0))

        sub_lbl = ctk.CTkLabel(
            title_box,
            text=" • Cloudflare D1 Live Manager",
            font=ctk.CTkFont(family="Segoe UI", size=13),
            text_color=COLOR_TEXT_MUTED,
        )
        sub_lbl.pack(side="left", padx=(6, 0))

        # Status & Refresh Button on Right
        actions_box = ctk.CTkFrame(header_frame, fg_color="transparent")
        actions_box.pack(side="right")

        self.status_pill = ctk.CTkLabel(
            actions_box,
            text="● Online: tubemetrix-db",
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            text_color=COLOR_SUCCESS,
        )
        self.status_pill.pack(side="left", padx=(0, 16))

        self.btn_refresh = ctk.CTkButton(
            actions_box,
            text="⟳ Refresh Data",
            width=120,
            height=34,
            corner_radius=8,
            fg_color="#272733",
            hover_color="#363647",
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            command=self.refresh_data,
        )
        self.btn_refresh.pack(side="left")

    def _build_stats_row(self):
        self.stats_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.stats_frame.pack(fill="x", padx=24, pady=(0, 12))

        self.card_total_users = self._create_stat_card("👥 Total Registered Users", "--", COLOR_CARD)
        self.card_paying_users = self._create_stat_card("💎 Premium / Paid Users", "--", "#221d15", border_col="#713f12")
        self.card_balance_credits = self._create_stat_card("⚡ Active Credits in Pool", "--", COLOR_CARD)
        self.card_total_bought = self._create_stat_card("🛒 Lifetime Credits Purchased", "--", COLOR_CARD)

    def _create_stat_card(self, title: str, val: str, bg_color: str, border_col: str = COLOR_CARD_BORDER):
        card = ctk.CTkFrame(
            self.stats_frame,
            fg_color=bg_color,
            border_width=1,
            border_color=border_col,
            corner_radius=10,
        )
        card.pack(side="left", fill="both", expand=True, padx=4)

        lbl_t = ctk.CTkLabel(
            card,
            text=title,
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color=COLOR_TEXT_MUTED,
        )
        lbl_t.pack(anchor="w", padx=14, pady=(10, 2))

        lbl_v = ctk.CTkLabel(
            card,
            text=val,
            font=ctk.CTkFont(family="Segoe UI", size=20, weight="bold"),
            text_color="#ffffff" if bg_color == COLOR_CARD else COLOR_GOLD,
        )
        lbl_v.pack(anchor="w", padx=14, pady=(0, 10))
        return lbl_v

    def _build_main_workspace(self):
        work_frame = ctk.CTkFrame(self, fg_color="transparent")
        work_frame.pack(fill="both", expand=True, padx=24, pady=(0, 10))

        # LEFT COLUMN: User Directory, Category Tabs & Search
        left_col = ctk.CTkFrame(
            work_frame,
            fg_color=COLOR_CARD,
            border_width=1,
            border_color=COLOR_CARD_BORDER,
            corner_radius=12,
        )
        left_col.pack(side="left", fill="both", expand=True, padx=(0, 8))

        # TOP BAR: Tab Switcher (Separate Premium vs Free vs All)
        tab_box = ctk.CTkFrame(left_col, fg_color="transparent")
        tab_box.pack(fill="x", padx=14, pady=(14, 8))

        self.seg_filter = ctk.CTkSegmentedButton(
            tab_box,
            values=["All Users (0)", "💎 Premium Users (0)", "🆓 Free Users (0)"],
            height=36,
            corner_radius=8,
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            selected_color=COLOR_ACCENT,
            selected_hover_color=COLOR_ACCENT_HOVER,
            unselected_color="#181820",
            unselected_hover_color="#262632",
            command=self._on_tab_change,
        )
        self.seg_filter.set("All Users (0)")
        self.seg_filter.pack(fill="x")

        # Search Bar
        search_bar = ctk.CTkFrame(left_col, fg_color="transparent")
        search_bar.pack(fill="x", padx=14, pady=(0, 10))

        self.search_entry = ctk.CTkEntry(
            search_bar,
            placeholder_text="🔍 Search users in current view by email or name...",
            height=36,
            corner_radius=8,
            fg_color="#121217",
            border_color=COLOR_CARD_BORDER,
            font=ctk.CTkFont(family="Segoe UI", size=13),
        )
        self.search_entry.pack(side="left", fill="x", expand=True, padx=(0, 8))
        self.search_entry.bind("<KeyRelease>", lambda e: self.filter_users())

        btn_clear = ctk.CTkButton(
            search_bar,
            text="Clear",
            width=60,
            height=36,
            corner_radius=8,
            fg_color="#2b2b36",
            hover_color="#3a3a49",
            command=self._clear_search,
        )
        btn_clear.pack(side="right")

        # Users Scrollable List
        self.users_scroll = ctk.CTkScrollableFrame(
            left_col,
            fg_color="transparent",
        )
        self.users_scroll.pack(fill="both", expand=True, padx=10, pady=(0, 10))

        # RIGHT COLUMN: Manage & Add Credits Panel
        self.right_col = ctk.CTkFrame(
            work_frame,
            width=400,
            fg_color=COLOR_CARD,
            border_width=1,
            border_color=COLOR_CARD_BORDER,
            corner_radius=12,
        )
        self.right_col.pack(side="right", fill="both", padx=(8, 0))
        self.right_col.pack_propagate(False)

        self._build_manage_panel()

    def _build_manage_panel(self):
        panel_title = ctk.CTkLabel(
            self.right_col,
            text="Manage User & Credits",
            font=ctk.CTkFont(family="Segoe UI", size=16, weight="bold"),
            text_color="#ffffff",
        )
        panel_title.pack(anchor="w", padx=16, pady=(16, 8))

        # Selected User Summary Card
        self.selected_user_box = ctk.CTkFrame(
            self.right_col,
            fg_color="#131318",
            border_width=1,
            border_color=COLOR_CARD_BORDER,
            corner_radius=8,
        )
        self.selected_user_box.pack(fill="x", padx=16, pady=(0, 14))

        # Tier Badge (Premium vs Free)
        self.lbl_sel_tier_badge = ctk.CTkLabel(
            self.selected_user_box,
            text="NO USER SELECTED",
            font=ctk.CTkFont(family="Segoe UI", size=10, weight="bold"),
            text_color="#ffffff",
            fg_color="#374151",
            corner_radius=4,
            padx=8,
            pady=2,
        )
        self.lbl_sel_tier_badge.pack(anchor="w", padx=12, pady=(10, 4))

        self.lbl_sel_name = ctk.CTkLabel(
            self.selected_user_box,
            text="Select a user from the list",
            font=ctk.CTkFont(family="Segoe UI", size=15, weight="bold"),
            text_color="#ffffff",
        )
        self.lbl_sel_name.pack(anchor="w", padx=12, pady=(0, 2))

        self.lbl_sel_email = ctk.CTkLabel(
            self.selected_user_box,
            text="--",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color=COLOR_TEXT_MUTED,
        )
        self.lbl_sel_email.pack(anchor="w", padx=12, pady=(0, 6))

        self.lbl_sel_balance = ctk.CTkLabel(
            self.selected_user_box,
            text="Current Balance: --",
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color=COLOR_SUCCESS,
        )
        self.lbl_sel_balance.pack(anchor="w", padx=12, pady=(0, 10))

        # Add Credits Form
        lbl_add_title = ctk.CTkLabel(
            self.right_col,
            text="Add Free Credits (Owner Grant):",
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color="#ffffff",
        )
        lbl_add_title.pack(anchor="w", padx=16, pady=(0, 6))

        # Quick preset buttons
        preset_row = ctk.CTkFrame(self.right_col, fg_color="transparent")
        preset_row.pack(fill="x", padx=16, pady=(0, 8))

        for amt in [10, 25, 50, 100, 500]:
            btn = ctk.CTkButton(
                preset_row,
                text=f"+{amt}",
                width=58,
                height=30,
                corner_radius=6,
                fg_color="#262633",
                hover_color="#36364a",
                font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
                command=lambda a=amt: self._set_credit_input(a),
            )
            btn.pack(side="left", padx=2)

        # Custom Amount Input
        input_row = ctk.CTkFrame(self.right_col, fg_color="transparent")
        input_row.pack(fill="x", padx=16, pady=(0, 10))

        self.entry_credit_amt = ctk.CTkEntry(
            input_row,
            placeholder_text="Credits amount (e.g. 50)",
            height=36,
            corner_radius=8,
            fg_color="#121217",
            border_color=COLOR_CARD_BORDER,
            font=ctk.CTkFont(family="Segoe UI", size=13),
        )
        self.entry_credit_amt.pack(side="left", fill="x", expand=True, padx=(0, 8))

        self.btn_submit_credits = ctk.CTkButton(
            self.right_col,
            text="⚡ Add Credits Now",
            height=40,
            corner_radius=8,
            fg_color=COLOR_ACCENT,
            hover_color=COLOR_ACCENT_HOVER,
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            command=self.submit_credits_action,
        )
        self.btn_submit_credits.pack(fill="x", padx=16, pady=(0, 14))

        # Recent History
        lbl_hist_title = ctk.CTkLabel(
            self.right_col,
            text="Recent Credit Ledger Activity:",
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color="#ffffff",
        )
        lbl_hist_title.pack(anchor="w", padx=16, pady=(0, 6))

        self.hist_scroll = ctk.CTkScrollableFrame(
            self.right_col,
            fg_color="#131318",
            border_width=1,
            border_color=COLOR_CARD_BORDER,
            corner_radius=8,
            height=135,
        )
        self.hist_scroll.pack(fill="both", expand=True, padx=16, pady=(0, 16))

    def _build_footer(self):
        footer = ctk.CTkFrame(self, fg_color="transparent")
        footer.pack(fill="x", padx=24, pady=(0, 16))

        # Left: Separate Export Buttons
        btn_export_prem = ctk.CTkButton(
            footer,
            text="💎 Export Premium Emails (.csv)",
            height=34,
            corner_radius=8,
            fg_color="#854d0e",
            hover_color="#a16207",
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            command=lambda: self.export_csv_action(premium_only=True),
        )
        btn_export_prem.pack(side="left", padx=(0, 8))

        btn_export_all = ctk.CTkButton(
            footer,
            text="👥 Export All Users (.csv)",
            height=34,
            corner_radius=8,
            fg_color="#1e293b",
            hover_color="#334155",
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            command=lambda: self.export_csv_action(premium_only=False),
        )
        btn_export_all.pack(side="left")

        # Right: Quick Web Links
        btn_web = ctk.CTkButton(
            footer,
            text="🌐 Open tubemetrix.net",
            height=34,
            corner_radius=8,
            fg_color="#181822",
            hover_color="#2b2b3a",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            command=lambda: webbrowser.open("https://tubemetrix.net"),
        )
        btn_web.pack(side="right")

        btn_d1 = ctk.CTkButton(
            footer,
            text="☁️ Open Cloudflare D1 Console",
            height=34,
            corner_radius=8,
            fg_color="#181822",
            hover_color="#2b2b3a",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            command=lambda: webbrowser.open("https://dash.cloudflare.com/"),
        )
        btn_d1.pack(side="right", padx=(0, 10))

    def _on_tab_change(self, selected_val: str):
        if "Premium" in selected_val:
            self.active_tab = "premium"
        elif "Free" in selected_val:
            self.active_tab = "free"
        else:
            self.active_tab = "all"
        self.filter_users()

    def _set_credit_input(self, amt: int):
        self.entry_credit_amt.delete(0, "end")
        self.entry_credit_amt.insert(0, str(amt))

    def _clear_search(self):
        self.search_entry.delete(0, "end")
        self.filter_users()

    def refresh_data(self):
        if self.is_busy:
            return
        self.is_busy = True
        self.btn_refresh.configure(state="disabled", text="Refreshing...")
        self.status_pill.configure(text="● Querying D1...", text_color="#f59e0b")

        threading.Thread(target=self._fetch_users_thread, daemon=True).start()

    def _fetch_users_thread(self):
        sql = (
            "SELECT id, email, name, credits_balance, total_purchased_credits, created_at, updated_at "
            "FROM users ORDER BY total_purchased_credits DESC, updated_at DESC"
        )
        try:
            results = run_d1_query(sql)
            self.after(0, lambda: self._on_users_fetched(results, None))
        except Exception as exc:
            self.after(0, lambda: self._on_users_fetched([], str(exc)))

    def _on_users_fetched(self, results: list[dict], err: str | None):
        self.is_busy = False
        self.btn_refresh.configure(state="normal", text="⟳ Refresh Data")

        if err:
            self.status_pill.configure(text="● Error Connecting", text_color="#ef4444")
            messagebox.showerror("D1 Connection Error", f"Unable to reach Cloudflare D1:\n{err}")
            return

        self.users_cache = results
        self.status_pill.configure(text="● Online: tubemetrix-db", text_color=COLOR_SUCCESS)

        # Calculate counts
        total_users = len(results)
        premium_users = [u for u in results if is_premium_user(u)]
        free_users = [u for u in results if not is_premium_user(u)]

        tot_balance = sum(u.get("credits_balance") or 0 for u in results)
        tot_purchased = sum(u.get("total_purchased_credits") or 0 for u in results)

        self.card_total_users.configure(text=str(total_users))
        self.card_paying_users.configure(text=f"{len(premium_users)} users")
        self.card_balance_credits.configure(text=str(tot_balance))
        self.card_total_bought.configure(text=str(tot_purchased))

        # Update Tab Labels with dynamic counts
        tab_vals = [
            f"All Users ({total_users})",
            f"💎 Premium Users ({len(premium_users)})",
            f"🆓 Free Users ({len(free_users)})",
        ]
        self.seg_filter.configure(values=tab_vals)

        # Restore current tab
        if self.active_tab == "premium":
            self.seg_filter.set(tab_vals[1])
        elif self.active_tab == "free":
            self.seg_filter.set(tab_vals[2])
        else:
            self.seg_filter.set(tab_vals[0])

        self.filter_users()

        # If previous user was selected, re-select to refresh balance
        if self.selected_user:
            matching = [u for u in results if u.get("id") == self.selected_user.get("id")]
            if matching:
                self.select_user(matching[0])
            elif results:
                self.select_user(results[0])
        elif results:
            self.select_user(results[0])

    def filter_users(self):
        query = self.search_entry.get().strip().lower()

        # Clear scrollable list
        for child in self.users_scroll.winfo_children():
            child.destroy()

        # 1. Filter by Tab (Premium vs Free vs All)
        if self.active_tab == "premium":
            base_list = [u for u in self.users_cache if is_premium_user(u)]
        elif self.active_tab == "free":
            base_list = [u for u in self.users_cache if not is_premium_user(u)]
        else:
            base_list = self.users_cache

        # 2. Filter by Search Query
        filtered = [
            u for u in base_list
            if not query or query in str(u.get("email", "")).lower() or query in str(u.get("name", "")).lower()
        ]

        if not filtered:
            msg = (
                "No Premium users found." if self.active_tab == "premium"
                else "No Free users found." if self.active_tab == "free"
                else "No users found matching search."
            )
            no_lbl = ctk.CTkLabel(
                self.users_scroll,
                text=msg,
                text_color=COLOR_TEXT_MUTED,
                font=ctk.CTkFont(family="Segoe UI", size=13),
            )
            no_lbl.pack(pady=30)
            return

        for u in filtered:
            self._render_user_card(u)

    def _render_user_card(self, user: dict):
        is_selected = self.selected_user and self.selected_user.get("id") == user.get("id")
        prem = is_premium_user(user)

        # Premium users get gold/amber tint; free users get neutral card
        if is_selected:
            card_bg = COLOR_CARD_HOVER
            border_col = COLOR_ACCENT
        elif prem:
            card_bg = COLOR_PREMIUM_BG
            border_col = COLOR_PREMIUM_BORDER
        else:
            card_bg = "#14141a"
            border_col = COLOR_CARD_BORDER

        card = ctk.CTkFrame(
            self.users_scroll,
            fg_color=card_bg,
            border_width=1,
            border_color=border_col,
            corner_radius=8,
            cursor="hand2",
        )
        card.pack(fill="x", pady=4, padx=4)

        # Left Info
        info_box = ctk.CTkFrame(card, fg_color="transparent")
        info_box.pack(side="left", fill="both", expand=True, padx=12, pady=10)

        # Name row with badge
        name_row = ctk.CTkFrame(info_box, fg_color="transparent")
        name_row.pack(anchor="w", fill="x")

        name_lbl = ctk.CTkLabel(
            name_row,
            text=str(user.get("name", "Unknown")),
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            text_color="#ffffff",
        )
        name_lbl.pack(side="left")

        # Category tag
        if prem:
            tag_lbl = ctk.CTkLabel(
                name_row,
                text="💎 PREMIUM",
                font=ctk.CTkFont(family="Segoe UI", size=10, weight="bold"),
                text_color="#fef08a",
                fg_color="#713f12",
                corner_radius=4,
                padx=6,
                pady=1,
            )
            tag_lbl.pack(side="left", padx=(8, 0))
        else:
            tag_lbl = ctk.CTkLabel(
                name_row,
                text="FREE",
                font=ctk.CTkFont(family="Segoe UI", size=10, weight="bold"),
                text_color="#94a3b8",
                fg_color="#1e293b",
                corner_radius=4,
                padx=6,
                pady=1,
            )
            tag_lbl.pack(side="left", padx=(8, 0))

        email_lbl = ctk.CTkLabel(
            info_box,
            text=str(user.get("email", "")),
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color=COLOR_TEXT_MUTED,
        )
        email_lbl.pack(anchor="w", pady=(2, 0))

        # Right Credit Badge
        bal = user.get("credits_balance", 0)
        tot = user.get("total_purchased_credits", 0)

        badge_box = ctk.CTkFrame(card, fg_color="transparent")
        badge_box.pack(side="right", padx=12, pady=10)

        badge_lbl = ctk.CTkLabel(
            badge_box,
            text=f"⚡ {bal} Credits",
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color="#ffffff",
            fg_color="#065f46" if bal > 0 else "#374151",
            corner_radius=6,
            padx=10,
            pady=4,
        )
        badge_lbl.pack(anchor="e")

        bought_lbl = ctk.CTkLabel(
            badge_box,
            text=f"🛒 {tot} Bought" if tot > 0 else "0 Bought (Free)",
            font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold" if tot > 0 else "normal"),
            text_color=COLOR_GOLD if tot > 0 else COLOR_TEXT_MUTED,
        )
        bought_lbl.pack(anchor="e", pady=(2, 0))

        # Bind click events on card and children
        for widget in [card, info_box, name_row, name_lbl, tag_lbl, email_lbl, badge_box, badge_lbl, bought_lbl]:
            widget.bind("<Button-1>", lambda e, u=user: self.select_user(u))

    def select_user(self, user: dict):
        self.selected_user = user
        prem = is_premium_user(user)

        if prem:
            self.lbl_sel_tier_badge.configure(
                text="💎 PREMIUM / PAYING CUSTOMER",
                fg_color="#713f12",
                text_color="#fef08a",
            )
        else:
            self.lbl_sel_tier_badge.configure(
                text="🆓 FREE TIER USER",
                fg_color="#1e293b",
                text_color="#94a3b8",
            )

        self.lbl_sel_name.configure(text=str(user.get("name", "User")))
        self.lbl_sel_email.configure(text=str(user.get("email", "")))

        bal = user.get("credits_balance", 0)
        tot = user.get("total_purchased_credits", 0)
        self.lbl_sel_balance.configure(
            text=f"Current: {bal} Credits  •  Lifetime: {tot} Bought",
            text_color=COLOR_SUCCESS if bal > 0 else COLOR_TEXT_MUTED,
        )

        # Highlight in list
        self.filter_users()

        # Load history in background
        self._load_user_history(user.get("id"))

    def _load_user_history(self, user_id: str):
        for child in self.hist_scroll.winfo_children():
            child.destroy()

        loading_lbl = ctk.CTkLabel(
            self.hist_scroll,
            text="Loading history...",
            text_color=COLOR_TEXT_MUTED,
            font=ctk.CTkFont(family="Segoe UI", size=11),
        )
        loading_lbl.pack(pady=10)

        def worker():
            sql = (
                f"SELECT delta, reason, created_at FROM credit_ledger "
                f"WHERE user_id = '{user_id}' ORDER BY created_at DESC LIMIT 6"
            )
            try:
                rows = run_d1_query(sql)
                self.after(0, lambda: self._on_history_loaded(rows))
            except Exception:
                self.after(0, lambda: self._on_history_loaded([]))

        threading.Thread(target=worker, daemon=True).start()

    def _on_history_loaded(self, rows: list[dict]):
        for child in self.hist_scroll.winfo_children():
            child.destroy()

        if not rows:
            no_lbl = ctk.CTkLabel(
                self.hist_scroll,
                text="No credit transactions yet.",
                text_color=COLOR_TEXT_MUTED,
                font=ctk.CTkFont(family="Segoe UI", size=11),
            )
            no_lbl.pack(pady=10)
            return

        for r in rows:
            d = r.get("delta", 0)
            d_str = f"+{d}" if d > 0 else str(d)
            col = COLOR_SUCCESS if d > 0 else "#ef4444"
            reason = r.get("reason", "")
            time_str = str(r.get("created_at", ""))[:19].replace("T", " ")

            row_frame = ctk.CTkFrame(self.hist_scroll, fg_color="transparent")
            row_frame.pack(fill="x", pady=2)

            d_lbl = ctk.CTkLabel(
                row_frame,
                text=f"{d_str:>4}",
                font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
                text_color=col,
                width=35,
            )
            d_lbl.pack(side="left")

            r_lbl = ctk.CTkLabel(
                row_frame,
                text=f"{reason}  •  {time_str}",
                font=ctk.CTkFont(family="Segoe UI", size=11),
                text_color=COLOR_TEXT_MUTED,
            )
            r_lbl.pack(side="left", padx=4)

    def submit_credits_action(self):
        if not self.selected_user:
            messagebox.showwarning("No User Selected", "Please click on a user from the list first.")
            return

        raw_amt = self.entry_credit_amt.get().strip()
        try:
            amt = int(raw_amt)
            if amt <= 0:
                raise ValueError()
        except ValueError:
            messagebox.showerror("Invalid Input", "Please enter a valid positive number of credits.")
            return

        confirm = messagebox.askyesno(
            "Confirm Grant",
            f"Are you sure you want to grant +{amt} credits to:\n\n{self.selected_user.get('name')}\n({self.selected_user.get('email')})?",
        )
        if not confirm:
            return

        self.btn_submit_credits.configure(state="disabled", text="Adding Credits...")

        def worker():
            user_id = self.selected_user["id"]
            now_iso = datetime.now(timezone.utc).isoformat()
            ref_id = f"admin_grant_{uuid.uuid4().hex[:12]}"
            ledger_id = str(uuid.uuid4())

            update_sql = (
                f"UPDATE users SET credits_balance = credits_balance + {amt}, "
                f"total_purchased_credits = total_purchased_credits + {amt}, "
                f"updated_at = '{now_iso}' WHERE id = '{user_id}'; "
                f"INSERT INTO credit_ledger (id, user_id, delta, reason, ref_id, meta_json, created_at) "
                f"VALUES ('{ledger_id}', '{user_id}', {amt}, 'owner_grant', '{ref_id}', '{{\"by\":\"admin_gui\"}}', '{now_iso}')"
            )
            try:
                run_d1_query(update_sql)
                self.after(0, lambda: self._on_credits_granted(amt, None))
            except Exception as exc:
                self.after(0, lambda: self._on_credits_granted(amt, str(exc)))

        threading.Thread(target=worker, daemon=True).start()

    def _on_credits_granted(self, amt: int, err: str | None):
        self.btn_submit_credits.configure(state="normal", text="⚡ Add Credits Now")
        self.entry_credit_amt.delete(0, "end")

        if err:
            messagebox.showerror("Grant Failed", f"Failed to add credits:\n{err}")
            return

        messagebox.showinfo(
            "Success!",
            f"Successfully granted +{amt} credits to {self.selected_user.get('email')}!",
        )
        self.refresh_data()

    def export_csv_action(self, premium_only: bool = False):
        EXPORT_DIR.mkdir(parents=True, exist_ok=True)
        prefix = "premium_customers" if premium_only else "all_users"
        csv_file = EXPORT_DIR / f"tubemetrix_{prefix}_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"

        dataset = [u for u in self.users_cache if is_premium_user(u)] if premium_only else self.users_cache

        if not dataset:
            label = "Premium" if premium_only else "Registered"
            messagebox.showwarning("Empty", f"No {label} user records available to export.")
            return

        fields = ["email", "name", "credits_balance", "total_purchased_credits", "created_at", "updated_at"]
        try:
            with csv_file.open("w", newline="", encoding="utf-8") as fh:
                writer = csv.DictWriter(fh, fieldnames=fields)
                writer.writeheader()
                for u in dataset:
                    writer.writerow({f: u.get(f, "") for f in fields})

            kind = "Premium Customers" if premium_only else "Total Users"
            confirm_open = messagebox.askyesno(
                "Export Complete",
                f"Exported {len(dataset)} {kind} to:\n{csv_file}\n\nOpen exports folder now?",
            )
            if confirm_open:
                os.startfile(str(EXPORT_DIR))
        except Exception as exc:
            messagebox.showerror("Export Failed", f"Could not write CSV:\n{exc}")


def main():
    app = TubeMetrixAdminApp()
    app.mainloop()


if __name__ == "__main__":
    main()
