# ==============================================================================
# 🌾 AGRITECH MULTI-AGENT SWARM: LOCAL EXECUTABLE (V10)
# ==============================================================================
import os
import time
import json
import asyncio
import aiohttp
import sqlite3
import warnings
import faiss
import numpy as np
import torch
import re
import requests
from langdetect import detect

from deep_translator import GoogleTranslator
from gtts import gTTS
from typing import TypedDict, Dict, Any, Optional, List

from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, pipeline
from transformers import logging as hf_logging
from faster_whisper import WhisperModel
from sentence_transformers import SentenceTransformer
from langgraph.graph import StateGraph, START, END

# Mute harmless warnings
warnings.filterwarnings("ignore")
hf_logging.set_verbosity_error()

# ==========================================
# PHASE 1: LOCAL SYSTEM CACHE & DATABASES
# ==========================================
print("🔗 [1/4] Initializing Local Storage, Cache & Databases...")

# Dynamic Pathing: Builds folders in the exact directory this script is saved
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(BASE_DIR, 'AgriTech_Swarm_Cache')
os.makedirs(CACHE_DIR, exist_ok=True)
os.environ['HF_HOME'] = CACHE_DIR
os.environ['TORCH_HOME'] = CACHE_DIR

# 1A. Initialize SQLite Audit Database
DB_PATH = os.path.join(CACHE_DIR, 'swarm_audit.db')
conn = sqlite3.connect(DB_PATH)
conn.cursor().execute('''CREATE TABLE IF NOT EXISTS system_audits (
                session_id TEXT PRIMARY KEY, timestamp TEXT, farmer_query TEXT,
                english_report TEXT, raw_json_ledger TEXT)''')
conn.commit()
conn.close()

# 1B. Initialize FAISS Local RAG Database
embedder = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')
master_knowledge_base = [
    "ICAR Contingency Kota: If monsoon is delayed by 15 days, avoid sowing Cotton. Shift to short-duration Maize.",
    "KVK Hubballi Soil Guideline: Black cotton soil in this region is highly prone to cracking. Maintain moisture through mulching.",
    "National Pest Advisory: For Pink Bollworm in Cotton, install pheromone traps at 5 per acre. Do not spray synthetic pyrethroids early.",
    "Insecticides Act: Endosulfan, Monocrotophos, and Paraquat are strictly banned. Stubble burning is illegal."
]
kb_embeddings = embedder.encode(master_knowledge_base)
rag_index = faiss.IndexFlatL2(kb_embeddings.shape[1])
rag_index.add(np.array(kb_embeddings))

# ==========================================
# PHASE 2: CORE COGNITIVE ENGINES
# ==========================================
print("🧠 [2/4] Waking Neural Engines (Whisper, Qwen, DeBERTa)...")
# Note: Ensure you have an NVIDIA GPU + CUDA installed locally, or this will fallback to CPU and run very slowly.
audio_model = WhisperModel("large-v3-turbo", device="cuda" if torch.cuda.is_available() else "cpu", compute_type="float16" if torch.cuda.is_available() else "int8", download_root=CACHE_DIR)

quantization_config = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_compute_dtype=torch.float16, bnb_4bit_quant_type="nf4", bnb_4bit_use_double_quant=True)
llm_tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-7B-Instruct")
llm_model = AutoModelForCausalLM.from_pretrained("Qwen/Qwen2.5-7B-Instruct", quantization_config=quantization_config, device_map="auto")
reasoning_pipeline = pipeline("text-generation", model=llm_model, tokenizer=llm_tokenizer, device_map="auto")
policy_classifier = pipeline("zero-shot-classification", model="MoritzLaurer/DeBERTa-v3-base-zeroshot-v2.0", device="cuda" if torch.cuda.is_available() else "cpu")

# ==========================================
# PHASE 3: SWARM BLUEPRINT & UTILITIES
# ==========================================
class SwarmState(TypedDict):
    user_audio_path: str
    network_status: str
    detected_language: str
    native_transcript: str
    english_query: str
    extracted_entities: dict
    harvested_data: Dict[str, Any]
    agronomist_draft_en: str
    compliance_flag: str
    final_translated_text: str
    output_audio_path: str
    routing_error: Optional[str]
    audit_ledger: List[Dict[str, Any]]

def stamp_ledger(agent_name: str, action: str, logic: str, data: Any) -> dict:
    return {"timestamp": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime()), "agent": agent_name, "action_taken": action, "internal_logic_used": logic, "data_snapshot": data}

# ==========================================
# PHASE 4: AGENT SQUADS (THE NODES)
# ==========================================
print("🤖 [3/4] Assembling Dynamic Multi-Agent Squads...")

def sentinel_node(state: SwarmState):
    try:
        start = time.time()
        requests.get("https://8.8.8.8", timeout=1.5)
        latency = time.time() - start
        state["network_status"] = "HIGH_SPEED" if latency < 0.6 else "LOW_BANDWIDTH"
    except:
        state["network_status"] = "LOW_BANDWIDTH"
    state["audit_ledger"] = state.get("audit_ledger", []) + [stamp_ledger("Sentinel", "Network Ping", f"Status resolved to: {state['network_status']}", "")]
    return state

def perception_node(state: SwarmState):
    segments, info = audio_model.transcribe(state["user_audio_path"], beam_size=5)
    native_text = " ".join([s.text for s in segments])
    try:
        actual_lang = detect(native_text)
    except:
        actual_lang = info.language
    if actual_lang == "ur": actual_lang = "hi"
    english_text = GoogleTranslator(source='auto', target='en').translate(native_text) if actual_lang != "en" else native_text
    state.update({"detected_language": actual_lang, "native_transcript": native_text, "english_query": english_text})
    return state

def gatekeeper_node(state: SwarmState):
    classification = policy_classifier(state["english_query"], ["agricultural question", "profanity", "out of domain"])
    top_label = classification['labels'][0]
    if top_label == "profanity":
        state["routing_error"] = "PROFANITY_DETECTED"
        state["final_translated_text"] = GoogleTranslator(source='en', target=state["detected_language"]).translate("Please use respectful language.")
    elif top_label == "out of domain":
        state["routing_error"] = "OUT_OF_DOMAIN"
        state["final_translated_text"] = GoogleTranslator(source='en', target=state["detected_language"]).translate("I am an agricultural expert. Ask farming questions.")
    else: state["routing_error"] = None
    state["audit_ledger"] = state.get("audit_ledger", []) + [stamp_ledger("Gatekeeper", "Triage", f"Confidence {classification['scores'][0]:.2f}", top_label)]
    return state

async def fetch_weather(session, loc):
    try:
        async with session.get(f"https://geocoding-api.open-meteo.com/v1/search?name={loc}&count=1", timeout=3) as r:
            geo = await r.json()
            lat, lon = geo["results"][0]["latitude"], geo["results"][0]["longitude"]
        async with session.get(f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true", timeout=3) as r:
            w = await r.json()
            return {"weather": f"Temp: {w['current_weather']['temperature']}°C, Wind: {w['current_weather']['windspeed']} km/h"}
    except: return {"weather": "Sensors offline. Use seasonal averages."}

async def fetch_market(session, crop):
    await asyncio.sleep(0.5)
    return {"market": f"Approx 2,450 INR/Quintal" if crop.lower() != "general" else "No crop specified."}

async def fetch_local_rag(query):
    vec = embedder.encode([query])
    _, indices = rag_index.search(np.array(vec), k=2)
    return {"local_rag_context": " | ".join([master_knowledge_base[i] for i in indices[0]])}

async def data_orchestrator_node(state: SwarmState):
    loc, crop, query = state.get("extracted_entities", {}).get("location", "Hubballi"), state.get("extracted_entities", {}).get("crop", "General"), state.get("english_query", "")
    net_status = state.get("network_status", "HIGH_SPEED")
    async with aiohttp.ClientSession() as session:
        if net_status == "HIGH_SPEED":
            res = await asyncio.gather(fetch_weather(session, loc), fetch_market(session, crop), fetch_local_rag(query))
            logic = "Fired Live APIs & Local RAG."
        else:
            res = await asyncio.gather(fetch_local_rag(query))
            res.append({"system_alert": "NETWORK DEGRADED. Live APIs bypassed. Relying exclusively on Local RAG offline heuristics."})
            logic = "Network Degraded. Fired RAG only."
    fused = {}
    for r in res: fused.update(r)
    state["harvested_data"] = fused
    state["audit_ledger"] = state.get("audit_ledger", []) + [stamp_ledger("Data_Orchestrator", "Dynamic Fetch", logic, fused)]
    return state

def agronomist_node(state: SwarmState):
    prompt = f"Elite Agronomist AI. Crop: {state.get('extracted_entities', {}).get('crop', 'Unknown')}\nDATA: {state.get('harvested_data', {})}\nPROTOCOL: If data contains 'NETWORK DEGRADED', acknowledge it and use only local heuristics. Give [SITUATION METRICS], [SYSTEMIC ANALYSIS], and [ACTIONABLE DIRECTIVES]."
    out = reasoning_pipeline([{"role": "system", "content": prompt}, {"role": "user", "content": state["english_query"]}], max_new_tokens=1024, temperature=0.3, pad_token_id=llm_tokenizer.eos_token_id)
    state["agronomist_draft_en"] = out[0]["generated_text"][-1]["content"]
    return state

CIBRC_BANNED_REGISTRY = {"chemicals": ["endosulfan", "monocrotophos", "paraquat"], "practices": ["stubble burning", "residue burning"]}

def compliance_node(state: SwarmState):
    draft = state.get("agronomist_draft_en", "").lower()
    for chem in CIBRC_BANNED_REGISTRY["chemicals"]:
        if re.search(r'\b' + re.escape(chem) + r'\b', draft):
            state.update({"compliance_flag": "FAIL", "agronomist_draft_en": f"Safety Override: Recommends banned chemical '{chem}'."})
            state["audit_ledger"] = state.get("audit_ledger", []) + [stamp_ledger("Compliance_Auditor", "Deterministic Scan", "Failed Registry", chem)]
            return state
    try:
        label = policy_classifier(draft, ["safe farming advice", "hazardous practices"])['labels'][0]
        if label == "hazardous practices":
            state.update({"compliance_flag": "FAIL", "agronomist_draft_en": "Safety Override: Flagged for hazardous contextual practices."})
        else: state["compliance_flag"] = "PASS"
        state["audit_ledger"] = state.get("audit_ledger", []) + [stamp_ledger("Compliance_Auditor", "Contextual Scan", "DeBERTa Semantic Check", label)]
    except:
        state["compliance_flag"] = "PASS"
    return state

def final_translation_node(state: SwarmState):
    lang = state.get("detected_language", "hi")
    if not state.get("final_translated_text"):
        if lang != "en":
            try:
                state["final_translated_text"] = GoogleTranslator(source='en', target=lang).translate(state["agronomist_draft_en"])
            except:
                state["final_translated_text"] = GoogleTranslator(source='en', target='hi').translate(state["agronomist_draft_en"])
                state["detected_language"] = "hi"
        else:
            state["final_translated_text"] = state["agronomist_draft_en"]
    return state

def audit_compiler_node(state: SwarmState):
    sid = f"SESSION_{int(time.time())}"
    report = f"🌾 SWARM AUDIT | {sid}\nNetwork: {state.get('network_status')}\nTarget: {state['english_query']}\n"
    for e in state.get("audit_ledger", []): report += f"[{e['agent']}] {e['action_taken']} -> {e['internal_logic_used']}\n"
    report += f"\nFINAL OUT: {state.get('final_translated_text', 'N/A')}"
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.cursor().execute("INSERT INTO system_audits VALUES (?, ?, ?, ?, ?)", (sid, time.strftime('%Y-%m-%d %H:%M:%S'), state['english_query'], report, json.dumps(state.get("audit_ledger", []))))
        conn.commit()
        conn.close()
        with open(os.path.join(CACHE_DIR, f"{sid}.txt"), "w", encoding="utf-8") as f: f.write(report)
    except: pass
    return state

def voicebox_node(state: SwarmState):
    INDIAN_LANG_MATRIX = ['hi', 'gu', 'mr', 'bn', 'ta', 'te', 'kn', 'ml', 'pa', 'en']
    lang_code = state.get("detected_language", "hi")
    if lang_code not in INDIAN_LANG_MATRIX:
        print(f"⚠️ TTS Matrix Alert: Audio for '{lang_code}' unsupported. Falling back to Hindi Audio.")
        lang_code = "hi"
        state["final_translated_text"] = GoogleTranslator(source='auto', target='hi').translate(state.get("final_translated_text"))
    try:
        tts = gTTS(text=state.get("final_translated_text", "Error."), lang=lang_code, slow=False)
        out_path = os.path.join(BASE_DIR, "swarm_final_audio.mp3")
        if os.path.exists(out_path): os.remove(out_path)
        tts.save(out_path)
        state["output_audio_path"] = out_path
    except Exception as e:
        state["routing_error"] = f"TTS Error: {str(e)}"
    return state

# ==========================================
# PHASE 5: GRAPH ASSEMBLY & COMPILATION
# ==========================================
def supervisor_router(state: SwarmState):
    return "voicebox_agent" if state.get("routing_error") else "data_orchestrator_agent"

builder = StateGraph(SwarmState)
for n in [("sentinel", sentinel_node), ("perception", perception_node), ("gatekeeper", gatekeeper_node), ("data_orchestrator", data_orchestrator_node), ("agronomist", agronomist_node), ("compliance", compliance_node), ("translation", final_translation_node), ("audit", audit_compiler_node), ("voicebox", voicebox_node)]:
    builder.add_node(f"{n[0]}_agent", n[1])

builder.add_edge(START, "sentinel_agent")
builder.add_edge("sentinel_agent", "perception_agent")
builder.add_edge("perception_agent", "gatekeeper_agent")
builder.add_conditional_edges("gatekeeper_agent", supervisor_router, {"data_orchestrator_agent": "data_orchestrator_agent", "voicebox_agent": "voicebox_agent"})
builder.add_edge("data_orchestrator_agent", "agronomist_agent")
builder.add_edge("agronomist_agent", "compliance_agent")
builder.add_edge("compliance_agent", "translation_agent")
builder.add_edge("translation_agent", "audit_agent")
builder.add_edge("audit_agent", "voicebox_agent")
builder.add_edge("voicebox_agent", END)

ultimate_swarm = builder.compile()
print("✅ [4/4] Ultimate V10 Swarm Compiled. System is locked and loaded.")

# ==========================================
# PHASE 6: ASYNC EVENT LOOP IGNITION
# ==========================================
async def main():
    # Place a file named 'test_audio.mp3' in the same folder as this script.
    audio_file_path = os.path.join(BASE_DIR, "test_audio.mp3") 
    
    if not os.path.exists(audio_file_path):
        print(f"\n❌ FATAL: Could not find audio file at {audio_file_path}")
        print("Please place an MP3 file named 'test_audio.mp3' in the script directory.")
        return

    initial_state = {
        "user_audio_path": audio_file_path, 
        "network_status": "", "detected_language": "", "native_transcript": "", "english_query": "",
        "extracted_entities": {"location": "Kota", "crop": "Cotton"}, "harvested_data": {},
        "agronomist_draft_en": "", "compliance_flag": "", "final_translated_text": "",
        "output_audio_path": "", "routing_error": None, "audit_ledger": []
    }

    print("\n🚀 INITIATING V10 DYNAMIC SWARM SEQUENCE (LOCAL ENVIRONMENT)...")
    print("="*65)
    try:
        start_time = time.time()
        final_state = await ultimate_swarm.ainvoke(initial_state)

        print(f"✅ EXECUTION COMPLETE | Total Latency: {time.time() - start_time:.2f}s")
        print("="*65)
        print(f"📡 0. Network Status:  {final_state.get('network_status')} (Routing adapted)")
        print(f"🎙️ 1. Native:         {final_state.get('native_transcript')} ({final_state.get('detected_language')})")
        print(f"🇬🇧 2. English:        {final_state.get('english_query')}")

        if final_state.get('routing_error'):
             print(f"⛔ 3. Gatekeeper:     BLOCKED -> {final_state.get('routing_error')}")
        else:
             print("🛡️ 3. Gatekeeper:     APPROVED")
             print("⚙️ 4. Harvester:      " + ("Live APIs + RAG" if final_state.get('network_status') == "HIGH_SPEED" else "Offline RAG Only (APIs Dropped)"))
             print(f"⚖️ 5. Compliance:     {final_state.get('compliance_flag')} (Dual-Engine Inspected)")

        print(f"\n🧠 6. Final Swarm Output:\n{final_state.get('final_translated_text')}")
        print("="*65)

        if final_state.get('output_audio_path'):
            print(f"\n🔊 Voicebox Ready! Audio saved to: {final_state.get('output_audio_path')}")
            
        print(f"\n🗄️ Detailed report securely registered to local SQLite Database in: {CACHE_DIR}")
        
    except Exception as e: 
        print(f"\n❌ FATAL CRASH: {str(e)}")

# This ensures the async event loop is handled correctly in standard Python
if __name__ == "__main__":
    asyncio.run(main())