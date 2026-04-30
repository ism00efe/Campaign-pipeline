# AdCreative AI

## 1. Project Overview

AdCreative AI is a hackathon-built MVP developed for a Generative Media Hackathon context.  
The system takes a user-provided product image and executes an autonomous generation flow:

- removes the original background,
- transforms the product into a professional e-commerce banner using a Shopify-oriented visual template,
- generates matching marketing copy (slogan and hashtags) with an LLM.

The objective is to validate an end-to-end creative automation pipeline under strict time constraints while maintaining a usable, stable interface.

## 2. Core Architecture & API Pipeline

The backend exposes a FastAPI service and orchestrates a multi-stage asynchronous pipeline.

### Stage 1: Background Removal
- Model: `wiro/remove-background`
- Input: raw product image
- Output: background-removed product asset URL

### Stage 2: Asset Generation
- Model: `wiro/shopify-template`
- Input: background-removed product image
- Output: generated e-commerce creative (image banner)

### Stage 3: LLM Integration
- Model: `deepseek-ai/deepseek-r1-distill-qwen-14b`
- Input: generation context/effect metadata
- Output: marketing text assets such as slogan, caption structure, and hashtags

### Async Execution Model
Long-running external jobs are managed with `httpx.AsyncClient` and `asyncio`-based polling loops.  
The backend starts generation tasks, polls task status asynchronously, and resolves final outputs when post-processing completes.

## 3. UX Engineering: The "Loading" Problem

Hackathon AI products frequently face long and variable response times from generation APIs.  
To avoid idle waiting and UX drop-off during polling windows, the React frontend implements interactive loading states with embedded mini-games.

Examples include:
- Click Race
- Ball Jump

Users remain engaged while asynchronous generation continues in the background, which reduces perceived latency without modifying the core API lifecycle.

## 4. Tech Stack

- Frontend: React, Tailwind CSS (Vite-based)
- Backend: FastAPI, Python
- AI/LLM: Wiro API models, DeepSeek LLM

## 5. Setup & Installation

### Prerequisites
- Python environment for backend dependencies
- Node.js/npm for frontend dependencies
- `.env` file with:

```env
WIRO_API_KEY=your_wiro_api_key
```

### Backend

```bash
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
npm run dev
```

## 6. Hackathon Constraints & Roadmap

This repository intentionally remains at MVP scope due to hackathon time constraints.

### Video Pipeline
The video API path based on `wiro/product-ads-with-caption` is integrated at the backend level, but the frontend video option is currently disabled because of stability constraints observed during rapid iteration.  
Planned next step: re-enable video mode after reliability hardening and output consistency improvements.

### Webhook Integration
Current orchestration relies on periodic polling with interval-based task status requests.  
Planned next step: migrate to a webhook-driven asynchronous completion model to reduce polling load, improve scalability, and simplify client wait-state handling.
