@echo off
rem Starts the HeLPR backend (port 8000) and frontend (port 5173) in two windows, then opens the browser.
cd /d "%~dp0.."
start "HeLPR backend" cmd /k "app\.venv\Scripts\python.exe -X utf8 -m uvicorn lpr.api:app --app-dir app\backend --port 8000"
cd app\frontend
if not exist node_modules call npm install
start "HeLPR frontend" cmd /k "npm run dev"
timeout /t 4 >nul
start http://localhost:5173
