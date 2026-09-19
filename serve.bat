@echo off
cd /d "%~dp0"
python "%~dp0server.py" --port 8084 --auto-port --open
pause
