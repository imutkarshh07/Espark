@echo off
echo ========================================================
echo   Starting ESpark Backend Services (Express + Python RAG)
echo ========================================================
echo.

echo [1/2] Starting Python FastAPI RAG Server on port 8000...
start "ESpark RAG Server (Port 8000)" cmd /k "cd /d %~dp0rag-server && .\venv\Scripts\python.exe -u -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo [2/2] Starting Node.js Express Backend on port 5000...
start "ESpark Express Backend (Port 5000)" cmd /k "cd /d %~dp0backend && node server.js"

echo.
echo ========================================================
echo   Services Launched!
echo   - Express Backend: http://localhost:5000/api/health
echo   - Python RAG AI:   http://localhost:8000/health
echo ========================================================
echo.
pause
