@echo off
title TubeMetrix Customer Email Exporter
cd /d "%~dp0"

echo ========================================================
echo     TubeMetrix - Exporting Customer Emails (Cloudflare D1)
echo ========================================================
echo.

python export_emails.py

echo.
echo ========================================================
echo Done! Check the "exports" folder:
echo - exports\premium_users.csv (Paying / Credit Buyers)
echo - exports\all_users.csv     (All Signed-In Users)
echo ========================================================
echo.
pause

