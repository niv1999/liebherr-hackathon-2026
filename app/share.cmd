@echo off
rem Shares HeLPR with a public link (free Cloudflare quick tunnel, no account needed).
rem The link works only while this computer is on and both windows stay open. It changes on every start.
cd /d "%~dp0.."
if not exist tools\bin\cloudflared.exe (
  echo Downloading the Cloudflare tunnel tool...
  mkdir tools\bin 2>nul
  curl -L -o tools\bin\cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
)
echo Building the web app...
pushd app\frontend
if not exist node_modules call npm install
call npm run build
popd
start "HeLPR server" cmd /k "app\.venv\Scripts\python.exe -X utf8 -m uvicorn lpr.api:app --app-dir app\backend --port 8000"
timeout /t 5 >nul
echo.
echo  The public link appears below in a box: https://....trycloudflare.com
echo  Keep this window open while you present. Close it to stop sharing.
echo.
tools\bin\cloudflared.exe tunnel --url http://localhost:8000
