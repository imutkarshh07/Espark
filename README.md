# Study Insights 🎓

An AI-powered academic evaluation and cognitive diagnostic platform combining **React Native Expo (Mobile)**, **Node.js Express Backend**, **Supabase PostgreSQL & Storage**, and an independent **Python FastAPI RAG Microservice** powered by **ChromaDB** and **Google Gemini API**.

---

## 🏛️ System Architecture

- **Mobile App (`my-app/`)**: Full-featured **React Native Expo** mobile application with custom tabs (`(tabs)/index.tsx`, `insights.tsx`, `mistakes.tsx`, `more.tsx`), interactive test quiz runner (`quiz.tsx`), study focus mode (`focus.tsx`), and student profile (`profile.tsx`). Connected to Supabase Auth (`AsyncStorage`) and Node.js REST APIs.
- **Web App (`frontend/`)**: Modern React + Vite web application for desktop access.
- **Main Backend (`backend/`)**: Production-ready Node.js + Express.js layered backend (`route -> controller -> service -> repository -> Supabase`) with strict auth middleware, multi-tenant isolation, rate limiting, and RAG orchestration on Port 5000.
- **AI RAG Microservice (`rag-server/`)**: Dedicated Python FastAPI service handling PDF text extraction, sliding-window semantic chunking, dense embeddings, persistent ChromaDB vector indexing with strict tenant isolation, and cognitive mistake diagnosis using Google Gemini (`gemini-3.8-flash`) on Port 8000.
- **Database & Storage (Supabase)**: Pure PostgreSQL datastore (zero MongoDB) with Row-Level Security (RLS) policies and private S3-compatible bucket `study-documents`.

---

## 🔌 Port Mapping & Endpoints

| Component | Target / Port | Address / Command |
|---|---|---|
| **Mobile App (Expo)** | Metro Bundler | `cd my-app && npx expo start` |
| **Node.js Express Backend** | `5000` | `http://localhost:5000/api` |
| **Python RAG Microservice** | `8000` | `http://localhost:8000` |
| **Web Portal (Optional)** | `5173` | `http://localhost:5173` |

---

## 🚀 Quick Start (Local Development)

### 1. Database Setup
Open your Supabase SQL Editor and execute the schema script located in [`docs/DATABASE.md`](file:///c:/appy/docs/DATABASE.md). Then create a private storage bucket named `study-documents`.

### 2. Start Node.js Backend (Port 5000)
```bash
cd backend
npm install
npm run dev
```

### 3. Start Python RAG Microservice (Port 8000)
```bash
cd rag-server
python -m venv venv
venv\Scripts\activate      # On Windows
# source venv/bin/activate # On macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Start React Native Expo Mobile App (`my-app`)
```bash
cd my-app
npx expo start
```
- Press **`a`** for Android Emulator (auto-routes to `http://10.0.2.2:5000/api`)
- Press **`i`** for iOS Simulator (routes to `http://localhost:5000/api`)
- Press **`w`** for Web preview
- Scan the QR code with **Expo Go** on your physical phone!

---

## 🧪 Running Automated Tests

### Backend Tests (Node.js / Jest & Supertest)
```bash
cd backend
npm test
```
*Validates health check, Supabase token verification, 401 unauthorized handling, and multi-tenant security isolation (User A cannot access User B's documents, attempts, mistakes, or insights).*

### RAG Microservice Tests (Python)
```bash
cd rag-server
python -m unittest tests/test_standalone.py
```
*Validates text chunking, vector store tenant isolation, and Gemini fallback diagnosis.*

### Mobile TypeScript Check (Expo)
```bash
cd my-app
npx tsc --noEmit
```

---

## 📚 Documentation Index

- [Architecture & Design Decisions](file:///c:/appy/docs/ARCHITECTURE.md)
- [REST API Specifications](file:///c:/appy/docs/API.md)
- [Database Schema & RLS Policies](file:///c:/appy/docs/DATABASE.md)
- [RAG Pipeline & Mistake Taxonomy](file:///c:/appy/docs/RAG.md)
- [Local Setup Guide](file:///c:/appy/docs/SETUP.md)
- [Production Deployment Guide](file:///c:/appy/docs/DEPLOYMENT.md)
