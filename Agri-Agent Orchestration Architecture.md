# 🌾 Agri-Agent Orchestration Architecture

[![Architecture: Multi-Agent](https://img.shields.io/badge/Architecture-Multi--Agent-0d9488?style=flat-square)]()
[![Routing: Deterministic](https://img.shields.io/badge/Routing-Deterministic-4f46e5?style=flat-square)]()

## 👁️ System Overview
This repository defines the architecture of the **Agri-Agent**, a highly descriptive multi-agent generative AI system designed to deliver hyper-localized agricultural guidance. The system leverages a hierarchical routing layers: a central orchestration node evaluates multimodal inputs, enforces strict policy guardrails, and assigns cognitive loads to domain-specific sub-agents loaded in variable offline and online tools.

---

## 🗺️ Visual Architecture Diagram

```mermaid
graph TD
    %% Global Stylings
    classDef input fill:#f8fafc,stroke:#94a3b8,stroke-width:1px,color:#0f172a;
    classDef orch fill:#eef2ff,stroke:#4f46e5,stroke-width:2px,color:#1e1b4b;
    classDef guard fill:#fef2f2,stroke:#ef4444,stroke-width:2px,stroke-dasharray: 5 5,color:#450a0a;
    classDef agent fill:#f0fdfa,stroke:#0d9488,stroke-width:2px,color:#134e4a;
    classDef tool fill:#fefce8,stroke:#ca8a04,stroke-width:1px,color:#713f12;
    classDef output fill:#f0f9ff,stroke:#0284c7,stroke-width:2px,color:#0c4a6e;

    subgraph L1 [📥 L1: Multimodal Input Layer]
        direction LR
        I1[🎙️ Voice<br/>Local Language]:::input
        I2[🧪 Soil Report<br/>N/P/K, pH]:::input
        I3[☁️ Weather<br/>7-Day Forecast]:::input
        I4[📈 Market Prices<br/>Agmarknet]:::input
    end

    subgraph L2 [🧠 L2: Cognitive Orchestration]
        direction LR
        O1{Orchestrator Agent<br/>Routes & Merges}:::orch
        G1[🛡️ Guardrail<br/>Policy Filter]:::guard
        %% FIXED LINE BELOW: Using the correct, globally compatible dotted bidirectional syntax
        O1 <-.->|Enforces| G1
    end

    subgraph L3 [⚙️ L3: Specialized Agentic Layer]
        direction LR
        A1[🌱 Soil Agent<br/>Deficiency Detection]:::agent
        A2[🌤️ Weather Agent<br/>Risk & Scheduling]:::agent
        A3[📊 Market Agent<br/>ROI & Trends]:::agent
    end

    subgraph L4 [🛠️ L4: Tooling & Grounding Layer]
        direction LR
        T1[(📚 Crop KB<br/>Offline Cache)]:::tool
        T2[🌐 External APIs<br/>Meteo/Whisper]:::tool
        T3[📝 Audit Logger<br/>Hashes & Output]:::tool
    end

    subgraph L5 [📤 L5: Output Synthesis]
        Out1[📱 Farmer Advisory<br/>Text + Voice Output]:::output
    end

    %% Relational Data Flow Routing
    I1 --> O1
    I2 --> O1
    I3 --> O1
    I4 --> O1

    O1 ===>|Task Delegation| A1
    O1 ===>|Task Delegation| A2
    O1 ===>|Task Delegation| A3

    A1 -->|Query| T1
    A2 -->|API Call| T2
    A3 -->|Log State| T3

    T1 -.->|Grounded Data| Out1
    T2 -.->|Grounded Data| Out1
    T3 -.->|Verified Data| Out1
    T1 -.->|Grounded Data| Out1
    T2 -.->|Grounded Data| Out1
    T3 -.->|Verified Data| Out1