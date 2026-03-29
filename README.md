# 🌾 AgriTech AI Swarm: Microservices Architecture

![Architecture](https://img.shields.io/badge/Architecture-Microservices-8A2BE2)
![Gateway](https://img.shields.io/badge/Gateway-Node.js%20%7C%20TypeScript-3178C6)
![AI Engine](https://img.shields.io/badge/AI_Engine-Python_FastAPI-009688)
![Environment](https://img.shields.io/badge/Environment-WSL_Ubuntu-success)

A production-grade, multi-agent artificial intelligence backend designed to provide localized, RAG-augmented agricultural heuristics to farmers.

This repository utilizes a **Microservices Architecture**. It separates standard business logic (validation, rate-limiting, and security) from heavy AI inference (transcription, LangGraph state-routing, and LLM synthesis) to ensure high availability, statelessness, and secure frontend integration.

---

## 🏗️ System Architecture & Request Lifecycle

The system is divided into two distinct services communicating internally:

1. **Primary API Gateway (Node.js/TypeScript):**
   - **Role:** The frontend-facing server (Port 3000).
   - **Responsibilities:** Request validation (Zod), payload sanitization, security (Helmet/CORS), rate limiting, enterprise logging (Winston/Pino), and standardized JSON response enveloping.

2. **AI Inference Engine (Python/FastAPI):**
   - **Role:** The internal, private AI worker (Port 8000).
   - **Responsibilities:** Faster-Whisper transcription, DeBERTa zero-shot guardrails, FAISS offline RAG retrieval, Qwen 2.5 LLM synthesis, and gTTS audio generation. It operates completely **statelessly**, converting audio payloads to Base64/Buffers and cleaning up its local disk immediately after processing.

**Request Flow:**
```
Frontend Request ➡️ Node.js Gateway (Validation) ➡️ Python FastAPI (LangGraph Swarm) ➡️ Node.js Gateway (Formatting) ➡️ Frontend Response
```

### 🧠 AI Swarm Agent Graph

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#f0edfe', 'primaryBorderColor': '#7F77DD', 'primaryTextColor': '#26215C', 'lineColor': '#888780', 'secondaryColor': '#e1f5ee', 'tertiaryColor': '#faeeda'}}}%%
graph TD

    Input(["🌾 User Audio or Text · POST Request"]):::io
    Output(["📦 Final JSON Response + Audio URL"]):::io

    Input --> GatewayAgent

    subgraph Entry_Exit ["⚡ Entry & Exit Layer"]
        GatewayAgent["**Gateway Agent**\nConcurrency & logging"]:::entry
        VoiceboxAgent["**Voicebox Agent**\nVocal synthesis"]:::entry
    end

    subgraph Sensory_Triage ["🔍 Sensory & Triage Layer"]
        SentinelAgent["**Sentinel Agent**\nNetwork telemetry"]:::sensory
        PerceptionAgent["**Perception Agent**\nAudio transcription"]:::sensory
        GatekeeperAgent["**Gatekeeper Agent**\nSecurity triage"]:::sensory
        SupervisorRouter{{"🧭 Supervisor\nRouter"}}:::router
    end

    subgraph Cognition_Compliance ["🧠 Cognition & Compliance Layer"]
        OrchestratorAgent["**Data Orchestrator**\nRAG retrieval"]:::cognition
        SynthesizerAgent["**Cognitive Synthesizer**\nAdvice generation"]:::cognition
        ComplianceAgent["**Compliance Auditor**\nSafety scan"]:::cognition
    end

    subgraph SwarmState ["🗂️ Shared SwarmState Dictionary"]
        StateVar["`session_id · network_status · native_transcript · english_query
harvested_data · agronomist_draft · compliance_flag · error_routing`"]:::state
    end

    subgraph Tools ["🔧 Tools & Models"]
        direction LR
        Tool_FastAPI[["FastAPI & aiohttp"]]:::tool
        Tool_SQLite[["SQLite3"]]:::tool
        Tool_Ping[["HTTP Ping"]]:::tool
        Tool_Whisper[["Faster-Whisper"]]:::tool
        Tool_Langdetect[["Langdetect"]]:::tool
        Tool_DeBERTa[["DeBERTa-v3"]]:::tool
        Tool_OpenMeteo[["Weather & Market APIs"]]:::tool
        Tool_FAISS[["FAISS & SentenceTrans"]]:::tool
        Tool_Qwen[["Qwen 2.5 1.5B"]]:::tool
        Tool_gTTS[["gTTS Voice Matrix"]]:::tool
    end

    %% Main agent flow
    GatewayAgent      ==> SentinelAgent
    SentinelAgent     ==> PerceptionAgent
    PerceptionAgent   ==> GatekeeperAgent
    GatekeeperAgent   ==> SupervisorRouter

    SupervisorRouter  -- "✅ Approved" --> OrchestratorAgent
    SupervisorRouter  -- "🚫 Blocked"  --> VoiceboxAgent

    OrchestratorAgent ==> SynthesizerAgent
    SynthesizerAgent  ==> ComplianceAgent
    ComplianceAgent   ==> VoiceboxAgent
    VoiceboxAgent     --> Output

    %% Tool wiring
    Tool_FastAPI      -.-> GatewayAgent
    Tool_SQLite       -.-> GatewayAgent
    Tool_Ping         -.-> SentinelAgent
    Tool_Whisper      -.-> PerceptionAgent
    Tool_Langdetect   -.-> PerceptionAgent
    Tool_DeBERTa      -.-> GatekeeperAgent
    Tool_OpenMeteo    -.-> OrchestratorAgent
    Tool_FAISS        -.-> OrchestratorAgent
    Tool_Qwen         -.-> SynthesizerAgent
    Tool_DeBERTa      -.-> ComplianceAgent
    Tool_gTTS         -.-> VoiceboxAgent

    %% Styles
    classDef io        fill:#1D9E75,stroke:#0F6E56,color:#E1F5EE,font-weight:600
    classDef entry     fill:#EEEDFE,stroke:#7F77DD,color:#26215C
    classDef sensory   fill:#E1F5EE,stroke:#1D9E75,color:#04342C
    classDef router    fill:#FAEEDA,stroke:#BA7517,color:#412402,font-weight:600
    classDef cognition fill:#FAECE7,stroke:#993C1D,color:#4A1B0C
    classDef state     fill:#F1EFE8,stroke:#B4B2A9,color:#2C2C2A,font-family:monospace
    classDef tool      fill:#E6F1FB,stroke:#185FA5,color:#042C53
```

---

## 📁 Repository Structure

```text
agritech-microservices/
├── api_gateway/                # Primary Node.js/TypeScript Backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── middlewares/        # Rate limiting, Zod validation, Error handlers
│   │   ├── services/           # Axios handlers to communicate with Python AI
│   │   └── index.ts            # Express/NestJS entry point
│   ├── package.json
│   └── tsconfig.json
│
├── ai_pipeline/                # Internal Python AI Inference Engine
│   ├── src/
│   │   ├── server.py           # FastAPI Master Swarm Architecture
│   │   ├── agents/             # LangGraph nodes (Perception, Agronomist, etc.)
│   │   └── utils/              # Base64 encoding and background cleanup tasks
│   ├── swarm_env/              # Isolated Python virtual environment
│   └── requirements.txt
│
└── README.md                   # Master documentation
```

---

## ⚙️ Local Setup Guide (WSL / Ubuntu)

### Prerequisites

- **OS:** Windows Subsystem for Linux (WSL 2) running Ubuntu.
- **Node.js:** v18.x or higher.
- **Python:** v3.10 or higher.

---

### Step 1: System-Level Dependencies

The AI engine requires OS-level C-libraries to decode audio binaries and manage the internal R&D audit database.

```bash
sudo apt update
sudo apt install ffmpeg sqlite3
```

---

### Step 2: Setup the Python AI Engine (`ai_pipeline`)

Navigate to the AI directory, create a strict sandbox, and install the CPU-forced ML libraries.

```bash
cd ai_pipeline

# 1. Forge and activate the sandbox
python3 -m venv swarm_env
source swarm_env/bin/activate

# 2. Install PyTorch (CPU-Only Bridge)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# 3. Install the Swarm Framework
pip install fastapi uvicorn pydantic langgraph transformers==4.46.1 accelerate faster-whisper gtts deep-translator aiohttp sentence-transformers faiss-cpu langdetect
```

---

### Step 3: Setup the Node.js API Gateway (`api_gateway`)

Open a new terminal window (leave the Python terminal for later) and navigate to the gateway directory.

```bash
cd api_gateway

# Install standard dependencies (Express, Zod, Axios, etc.)
npm install

# (Optional) If using TypeScript, ensure types are installed
npm install -D typescript @types/node @types/express ts-node
```

---

## 🚀 Running the Full Stack Locally

To run the complete microservices architecture, you must boot both servers simultaneously in two separate terminal windows.

### Terminal 1: Boot the Internal AI Engine

```bash
cd ai_pipeline
source swarm_env/bin/activate
python3 src/server.py
```

> Runs on `http://127.0.0.1:8000`. Note: Initial boot downloads ~3GB of neural weights. Wait for `Application startup complete.`

### Terminal 2: Boot the Primary API Gateway

```bash
cd api_gateway
npm run dev
```

> Runs on `http://127.0.0.1:3000`. This is the server your frontend will talk to.

---

## 📡 API Reference (Frontend Integration)

Your frontend application (React/Next.js) will only ever communicate with the Node.js Gateway.

- **Endpoint:** `POST http://127.0.0.1:3000/api/v1/consultation`
- **Headers:** `Content-Type: application/json`

### Payload Example (Text)

```json
{
    "inputType": "text",
    "query": "My cotton leaves are turning yellow and curling downwards. What should I do?"
}
```

### Expected Success Response

The Node.js gateway standardizes all responses into a predictable envelope for easy frontend parsing.

```json
{
    "success": true,
    "data": {
        "detectedLanguage": "en",
        "originalTranscript": "My cotton leaves are turning yellow...",
        "translatedAdvice": "Based on local KVK guidelines, this indicates...",
        "audioResponseBase64": "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA..."
    },
    "error": null
}
```

### Expected Error Response

If Zod validation fails, or if the Python server rejects the request (e.g., profanity detected), the Node gateway returns a clean error envelope.

```json
{
    "success": false,
    "data": null,
    "error": {
        "code": 400,
        "message": "Validation Error: Unsupported audio format or payload exceeds 5MB limit."
    }
}
```

---

## 🛡️ Production & Security Standards

- **Statelessness:** The Python server utilizes `BackgroundTasks` to explicitly delete temporary `.mp3` files off the hard drive the millisecond the response is fired back to the Node.js server.
- **Network Isolation:** In a production environment (like AWS or Docker), the `ai_pipeline` port (`8000`) should be blocked from the public internet entirely, accepting traffic only from the internal `api_gateway`.
