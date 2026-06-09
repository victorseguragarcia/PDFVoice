@echo off
echo Starting PDF TO SPEECH...

echo Starting Backend (FastAPI)...
start "PDFVoice Backend" cmd /k "cd backend && .\venv\Scripts\activate && uvicorn app.main:app --reload"

echo Starting Frontend (Next.js)...
start "PDFVoice Frontend" cmd /k "npm run dev"

echo Both services are starting in new terminal windows!
