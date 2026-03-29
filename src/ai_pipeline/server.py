# ==============================================================================
# 🌾 AGRITECH FASTAPI SERVER (V10 - CPU FORCED)
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
import uuid
from langdetect import detect

from deep_translator import GoogleTranslator
from gtts import gTTS
from typing import TypedDict, Dict, Any, Optional, List

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn

from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
from transformers import logging as hf_logging
from faster_whisper import WhisperModel
from sentence_transformers import SentenceTransformer
from langgraph.graph import StateGraph, START, END

# --- THE NUCLEAR KILL-SWITCH (CPU FORCED) ---
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
warnings.filterwarnings("ignore")
hf_logging.set_verbosity_error()

# ==========================================
# PHASE 1: SERVER SETUP & DATABASES
# ==========================================
app = FastAPI(title="AgriTech Swarm API")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(BASE_DIR, 'AgriTech_Swarm_Cache')
STATIC_DIR = os.path.join(BASE_DIR, 'static')
os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

# Host the 'static' directory so frontend can play the audio URLs
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

DB_PATH = os.path.join(CACHE_DIR, 'swarm_audit.db')
conn = sqlite3.connect(DB_PATH)
conn.cursor().execute('''CREATE TABLE IF NOT EXISTS system_audits (
                session_id TEXT PRIMARY KEY, timestamp TEXT, farmer_query TEXT,
                english_report TEXT, raw_json_ledger TEXT)''')
conn.commit()
conn.close()

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
# PHASE 2: GLOBAL COGNITIVE ENGINES 
# ==========================================
print("🧠 Waking Neural Engines (This only happens once on server boot)...")
audio_model = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8", download_root=CACHE_DIR)
llm_tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-1.5B-Instruct")
llm_model = AutoModelForCausalLM.from_pretrained("Qwen/Qwen2.5-1.5B-Instruct", torch_dtype=torch.float32, device_map="cpu")
reasoning_pipeline = pipeline("text-generation", model=llm_model, tokenizer=llm_tokenizer, device_map="cpu")
policy_classifier = pipeline("zero-shot-classification", model="MoritzLaurer/DeBERTa-v3-base-zeroshot-v2.0", device="cpu")

# ==========================================
# PHASE 3: GRAPH SQUADS
# ==========================================
class SwarmState(TypedDict):
    session_id: str
    user_audio_path: Optional[str]
    network_status: str
    detected_language: str
    native_transcript: str
    english_query: str
    extracted_entities: dict
    harvested_data: Dict[str, Any]
    agronomist_draft_en: str
    compliance_flag: str
    final_translated_text: str
    output_audio_url: str
    routing_error: Optional[str]
    audit_ledger: List[Dict[str, Any]]

def stamp_ledger(agent, action, logic, data):
    return {"timestamp": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime()), "agent": agent, "action_taken": action, "internal_logic_used": logic, "data_snapshot": data}

def sentinel_node(state: SwarmState):
    state["network_status"] = "HIGH_SPEED" # Hardcoded for API assumption
    return state

def perception_node(state: SwarmState):
    # DYNAMIC PERCEPTION: If it's an audio file, transcribe it. If text, skip whisper.
    if state.get("user_audio_path"):
        segments, info = audio_model.transcribe(state["user_audio_path"], beam_size=5)
        native_text = " ".join([s.text for s in segments])
        try:
            actual_lang = detect(native_text)
        except:
            actual_lang = info.language
    else:
        native_text = state.get("native_transcript", "")
        try:
            actual_lang = detect(native_text)
        except:
            actual_lang = "en"

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
    return state

async def data_orchestrator_node(state: SwarmState):
    vec = embedder.encode([state["english_query"]])
    _, indices = rag_index.search(np.array(vec), k=2)
    state["harvested_data"] = {"local_rag_context": " | ".join([master_knowledge_base[i] for i in indices[0]])}
    return state

def agronomist_node(state: SwarmState):
    prompt = f"Elite Agronomist AI. \nDATA: {state.get('harvested_data', {})}\nGive actionable directives."
    out = reasoning_pipeline([{"role": "system", "content": prompt}, {"role": "user", "content": state["english_query"]}], max_new_tokens=512, temperature=0.3, pad_token_id=llm_tokenizer.eos_token_id)
    state["agronomist_draft_en"] = out[0]["generated_text"][-1]["content"]
    return state

def compliance_node(state: SwarmState):
    state["compliance_flag"] = "PASS"
    return state

def final_translation_node(state: SwarmState):
    lang = state.get("detected_language", "hi")
    if lang != "en":
        try:
            state["final_translated_text"] = GoogleTranslator(source='en', target=lang).translate(state["agronomist_draft_en"])
        except:
            state["final_translated_text"] = state["agronomist_draft_en"]
    else:
        state["final_translated_text"] = state["agronomist_draft_en"]
    return state

def voicebox_node(state: SwarmState):
    lang_code = state.get("detected_language", "hi")
    INDIAN_LANG_MATRIX = ['hi', 'gu', 'mr', 'bn', 'ta', 'te', 'kn', 'ml', 'pa', 'en']
    if lang_code not in INDIAN_LANG_MATRIX: lang_code = "hi"
    
    try:
        tts = gTTS(text=state.get("final_translated_text", "Error."), lang=lang_code, slow=False)
        # Use the unique session ID to save the file
        filename = f"{state['session_id']}_output.mp3"
        out_path = os.path.join(STATIC_DIR, filename)
        tts.save(out_path)
        # Construct the public URL
        state["output_audio_url"] = f"/static/{filename}"
    except Exception as e:
        state["routing_error"] = f"TTS Error: {str(e)}"
    return state

def supervisor_router(state: SwarmState):
    return "voicebox_agent" if state.get("routing_error") else "data_orchestrator_agent"

builder = StateGraph(SwarmState)
for n in [("sentinel", sentinel_node), ("perception", perception_node), ("gatekeeper", gatekeeper_node), ("data_orchestrator", data_orchestrator_node), ("agronomist", agronomist_node), ("compliance", compliance_node), ("translation", final_translation_node), ("voicebox", voicebox_node)]:
    builder.add_node(f"{n[0]}_agent", n[1])

builder.add_edge(START, "sentinel_agent")
builder.add_edge("sentinel_agent", "perception_agent")
builder.add_edge("perception_agent", "gatekeeper_agent")
builder.add_conditional_edges("gatekeeper_agent", supervisor_router, {"data_orchestrator_agent": "data_orchestrator_agent", "voicebox_agent": "voicebox_agent"})
builder.add_edge("data_orchestrator_agent", "agronomist_agent")
builder.add_edge("agronomist_agent", "compliance_agent")
builder.add_edge("compliance_agent", "translation_agent")
builder.add_edge("translation_agent", "voicebox_agent")
builder.add_edge("voicebox_agent", END)
ultimate_swarm = builder.compile()

# ==========================================
# PHASE 4: FASTAPI ROUTES
# ==========================================
class SwarmRequest(BaseModel):
    input_type: str  # "audio" or "text"
    audio_url: Optional[str] = None
    text_query: Optional[str] = None

@app.post("/api/agri-advice")
async def get_agri_advice(req: SwarmRequest):
    session_id = str(uuid.uuid4())
    local_audio_path = None

    # Handle Audio Downloading from Frontend
    if req.input_type == "audio":
        if not req.audio_url:
            raise HTTPException(status_code=400, detail="audio_url is required when input_type is 'audio'")
        try:
            local_audio_path = os.path.join(STATIC_DIR, f"{session_id}_input.mp3")
            async with aiohttp.ClientSession() as session:
                async with session.get(req.audio_url) as response:
                    with open(local_audio_path, 'wb') as f:
                        f.write(await response.read())
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to download audio: {str(e)}")

    # Initialize Graph State
    initial_state = {
        "session_id": session_id,
        "user_audio_path": local_audio_path, 
        "network_status": "", "detected_language": "", 
        "native_transcript": req.text_query if req.input_type == "text" else "", 
        "english_query": "",
        "extracted_entities": {"location": "Kota", "crop": "Cotton"}, "harvested_data": {},
        "agronomist_draft_en": "", "compliance_flag": "", "final_translated_text": "",
        "output_audio_url": "", "routing_error": None, "audit_ledger": []
    }

    try:
        final_state = await ultimate_swarm.ainvoke(initial_state)
        
        # Determine the full URL for the audio based on the server's host
        base_url = "http://127.0.0.1:8000"
        audio_link = base_url + final_state.get('output_audio_url', '')

        return {
            "status": "success",
            "detected_language": final_state.get("detected_language"),
            "original_transcript": final_state.get("native_transcript"),
            "translated_response": final_state.get("final_translated_text"),
            "audio_response_url": audio_link
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Swarm Execution Failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.1", port=8000)