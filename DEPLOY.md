# HealthCompanion Deployment Guide

This document describes how to deploy the **HealthCompanion** backend to **Render** and the frontend to **Vercel** manually.

---

## Architecture Overview
- **Backend (Render)**: Python FastAPI server communicating with Groq API, secured using environment-driven CORS origins.
- **Frontend (Vercel)**: React (Create React App) client communicating with the Render backend via custom environment variables.

---

## Step 1: Push Code to GitHub

Ensure all your local changes (including `render.yaml` and top-level `.gitignore`) are committed and pushed to your GitHub repository:
```bash
git add .
git commit -m "chore: prepare codebase for Render and Vercel deployment"
git push origin main
```

---

## Step 2: Deploy Backend on Render

1. Go to the [Render Dashboard](https://dashboard.render.com/) and log in.
2. Click **New** → **Web Service**.
3. Select your GitHub repository.
4. Configure the Web Service settings:
   - **Name**: `health-companion-backend`
   - **Root Directory**: `health-backend` *(Crucial: do not leave empty)*
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add the following **Environment Variables** in the configuration:
   - `GROQ_API_KEY`: *[Your real Groq API key]*
   - `ALLOWED_ORIGIN`: `*` *(We will restrict this to your Vercel URL in Step 4)*
6. Click **Deploy Web Service**.
7. Once deployed, copy your backend's public service URL (e.g. `https://health-companion-backend.onrender.com`).

---

## Step 3: Deploy Frontend on Vercel

1. Go to the [Vercel Dashboard](https://vercel.com/) and log in.
2. Click **Add New** → **Project**.
3. Import your GitHub repository.
4. Configure the Project settings:
   - **Root Directory**: Click *Edit* and select **`health-frontend`**.
   - **Framework Preset**: Select **`Create React App`** (Vercel should auto-detect this).
5. Open the **Environment Variables** section and add:
   - **Key**: `REACT_APP_API_URL`
   - **Value**: *[The URL of your deployed Render backend from Step 2, e.g. `https://health-companion-backend.onrender.com`]*
6. Click **Deploy**.
7. Copy your Vercel deployment URL (e.g. `https://health-companion-frontend.vercel.app`).

---

## Step 4: Secure CORS in Production

For security, you should restrict backend requests so they are only accepted from your official Vercel domain.

1. Go back to your [Render Dashboard](https://dashboard.render.com/).
2. Select your `health-companion-backend` service.
3. Go to **Environment**.
4. Update the value of **`ALLOWED_ORIGIN`** from `*` to your Vercel URL (e.g. `https://health-companion-frontend.vercel.app`).
5. Save the changes. Render will automatically redeploy the backend with the new security rule applied.
