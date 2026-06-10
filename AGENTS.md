<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# PDFVoice – Agent Guidelines

## Project Overview

**PDFVoice** is a local-first web application for **AI-powered studying**: it converts PDF documents to speech, offers text-to-speech playback with block-level navigation, and provides **annotation tools** (highlighting, notes, bookmarking) to help students and researchers study documents more effectively. Everything runs on the user's machine (GPU if available, CPU fallback) for maximum privacy.



## Critical Rules

### Tailwind CSS v4

This project uses **Tailwind CSS v4**, which is fundamentally different from v3:

- **DO NOT** use `@tailwind base/components/utilities` directives. Use `@import "tailwindcss"` instead.
- **DO NOT** create a `tailwind.config.ts` file. Custom tokens go in `@theme {}` inside `globals.css`.
- **DO NOT** use `tailwindcss` as a PostCSS plugin. Use `@tailwindcss/postcss`.
- Custom colors are defined as `--color-*` in `@theme {}` (e.g., `--color-primary: #8b5cf6;`).
- Custom utility classes (like `.glass-card`) are defined as plain CSS, not inside `@layer utilities`.

### Backend (Python)

- The backend runs in a **virtual environment** at `backend/venv/`.
- Always use `.\venv\Scripts\pip` for installing Python packages, never `npm install`.
- The TTS service is a **singleton** — use `TTSService.get_instance()`, never instantiate directly.
- The TTS model (SpeechT5) has a **~600 token input limit**. Text must be truncated before synthesis.
- The HiFiGAN vocoder requires `ignore_mismatched_sizes=True` when loading.
- GPU detection is automatic via `torch.cuda.is_available()`.
- PDFs are saved to `backend/app/uploads/` with a `{timestamp}_{filename}` naming convention.

### Frontend (Next.js 16 + React 19)

- The main UI is a single `"use client"` component in `src/app/page.tsx`.
- All API calls target `http://localhost:8000/api/` (the FastAPI backend).
- The TTS status is polled every 5 seconds until the engine reports `ready`.
- Audio playback uses a hidden `<audio>` element with `useRef`.
- Blocks auto-advance when audio ends via the `ended` event listener.
- The `useCallback` hook is used on `fetchAudio`, `goToBlock`, and `handleNextBlock` to maintain stable references and prevent stale closures.

### API Endpoints

| Method | Path                      | Description                                  |
|--------|---------------------------|----------------------------------------------|
| POST   | `/api/upload`             | Upload PDF → extract text → save to disk     |
| POST   | `/api/synthesize`         | Text → WAV audio (via local AI TTS)          |
| GET    | `/api/tts-status`         | Returns TTS engine status (ready/loading/error, device) |
| GET    | `/api/history`            | List all previously uploaded PDFs             |
| GET    | `/api/history/{filename}` | Re-process a previously uploaded PDF          |
| POST   | `/api/debug`              | Diagnostic: page-by-page PDF analysis         |

### Design System

- **Theme**: Dark mode with glassmorphism (`glass-card` class).
- **Colors**: Primary = violet (`#8b5cf6`), Accent = teal (`#2dd4bf`), Background = near-black (`#09090b`).
- **Animations**: `animate-fade-in`, `animate-slide-in-right`, `animate-pulse-glow` (defined in `globals.css`).
- **Icons**: `lucide-react` — always import only the icons you need.

## Running the Project

### Frontend
```bash
npm run dev
```

### Backend
```bash
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload
```

> The first TTS request will download model weights (~1–2 GB). Subsequent starts load from cache.
