# Local Development Setup Guide

Follow this guide to run the complete **Study Insights** stack locally with your **React Native Expo Mobile App**.

---

## 1. Prerequisites

- **Node.js**: v18.0.0 or higher (`node --version`)
- **npm**: v9.0.0 or higher (`npm --version`)
- **Python**: v3.10 to v3.14 (`python --version`)
- **Expo CLI / Expo Go**: Installed on iOS/Android device or emulator
- **Supabase Project**: Free tier project at [supabase.com](https://supabase.com)

---

## 2. Port & Endpoint Mapping

| Service | Port / Protocol | Local URL |
|---|---|---|
| **Mobile App (React Native Expo)** | Metro / `8081` | `npx expo start` in `my-app/` |
| **Node.js Express Backend** | `5000` | `http://localhost:5000/api` |
| **Python FastAPI RAG Server** | `8000` | `http://localhost:8000` |
| **Web Portal (Optional)** | `5173` | `http://localhost:5173` |

---

## 3. Database & Storage Initialization (Supabase)

1. Open your **Supabase Dashboard** $\rightarrow$ **SQL Editor**.
2. Copy and paste the entire script from [`docs/DATABASE.md`](file:///c:/appy/docs/DATABASE.md).
3. Click **Run** to execute the migrations (creates tables, foreign keys, indexes, and RLS policies).
4. Go to **Storage** $\rightarrow$ Click **New bucket**.
5. Create a bucket named `study-documents` and set it to **Private**.

---

## 4. Backend Setup (Node.js)

```bash
cd backend
npm install
cp .env.example .env
```

Configure `backend/.env`:
```env
NODE_ENV=development
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RAG_SERVER_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
```

Start the backend in development mode:
```bash
npm run dev
```

Run backend automated tests:
```bash
npm test
```

---

## 5. RAG Microservice Setup (Python)

```bash
cd rag-server
python -m venv venv

# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

Configure `rag-server/.env`:
```env
PORT=8000
ENVIRONMENT=development
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.8-flash
CHROMA_PATH=./data/chroma
```

Start the RAG server:
```bash
uvicorn app.main:app --reload --port 8000
```

Run RAG tests:
```bash
python -m unittest tests/test_standalone.py
```

---

## 6. Mobile App Setup (React Native Expo in `my-app/`)

```bash
cd my-app
npm install
cp .env.example .env
```

Configure `my-app/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://cbotvfgzvvfrbvsoyiqz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_whLK4F5JWgYWSxSVVu3T8A_w9Atcn2c
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

Start the Expo bundler:
```bash
npx expo start
```

### Running on Devices:
- **Android Emulator**: Press **`a`** in the terminal (automatically routes to `http://10.0.2.2:5000/api`).
- **iOS Simulator**: Press **`i`** in the terminal.
- **Physical Phone**: Scan the terminal QR code using **Expo Go** (ensure phone and PC are on the same Wi-Fi network).
- **Web Preview**: Press **`w`** in the terminal.
