# ==============================================================================
# AgriTech FastAPI AI Inference Service (Stateless)
# ==============================================================================
import asyncio
import base64
import os
import time
import uuid
import warnings
from typing import Any, Dict, List, Literal, Optional, TypedDict

import aiohttp
import faiss
import numpy as np
import torch
import uvicorn
from deep_translator import GoogleTranslator
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
from gtts import gTTS
from langdetect import detect
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sentence_transformers import SentenceTransformer
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
from transformers import logging as hf_logging

os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
warnings.filterwarnings("ignore")
hf_logging.set_verbosity_error()

app = FastAPI(
    title="AgriTech Swarm API",
    version="1.0.0",
    description="Stateless AI inference microservice for agricultural consultation",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(BASE_DIR, "AgriTech_Swarm_Cache")
STATIC_DIR = os.path.join(BASE_DIR, "static")
os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

print("Booting AI models (one-time startup)...")
audio_model = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8", download_root=CACHE_DIR)
llm_tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-1.5B-Instruct")
llm_model = AutoModelForCausalLM.from_pretrained(
    "Qwen/Qwen2.5-1.5B-Instruct", torch_dtype=torch.float32, device_map="cpu"
)
reasoning_pipeline = pipeline("text-generation", model=llm_model, tokenizer=llm_tokenizer, device_map="cpu")
policy_classifier = pipeline(
    "zero-shot-classification", model="MoritzLaurer/DeBERTa-v3-base-zeroshot-v2.0", device="cpu"
)
embedder = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")

master_knowledge_base = [
    "ICAR Contingency Kota: If monsoon is delayed by 15 days, avoid sowing Cotton. Shift to short-duration Maize.",
    "KVK Hubballi Soil Guideline: Black cotton soil in this region is highly prone to cracking. Maintain moisture through mulching.",
    "National Pest Advisory: For Pink Bollworm in Cotton, install pheromone traps at 5 per acre. Do not spray synthetic pyrethroids early.",
    "Insecticides Act: Endosulfan, Monocrotophos, and Paraquat are strictly banned. Stubble burning is illegal.",
]
kb_embeddings = embedder.encode(master_knowledge_base)
rag_index = faiss.IndexFlatL2(kb_embeddings.shape[1])
rag_index.add(np.array(kb_embeddings))


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
    output_audio_path: Optional[str]
    routing_error: Optional[str]
    audit_ledger: List[Dict[str, Any]]


class SwarmRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    input_type: Literal["audio", "text"]
    audio_url: Optional[str] = Field(default=None)
    audio_base64: Optional[str] = Field(default=None)
    text_query: Optional[str] = Field(default=None, min_length=2)

    @model_validator(mode="after")
    def validate_payload(self) -> "SwarmRequest":
        if self.input_type == "audio" and not self.audio_url and not self.audio_base64:
            raise ValueError("audio_url or audio_base64 is required when input_type is 'audio'")
        if self.input_type == "text" and not self.text_query:
            raise ValueError("text_query is required when input_type is 'text'")
        return self


def safe_remove_file(path: Optional[str]) -> None:
    if not path:
        return
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass


def sentinel_node(state: SwarmState) -> SwarmState:
    state["network_status"] = "HIGH_SPEED"
    return state


def perception_node(state: SwarmState) -> SwarmState:
    if state.get("user_audio_path"):
        try:
            segments, info = audio_model.transcribe(state["user_audio_path"], beam_size=5)
            native_text = " ".join([s.text for s in segments]).strip()
            if not native_text:
                raise ValueError("Could not transcribe audio")
            try:
                actual_lang = detect(native_text)
            except Exception:
                actual_lang = info.language or "en"
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Audio transcription failed: {str(exc)}")
    else:
        native_text = (state.get("native_transcript") or "").strip()
        if not native_text:
            raise HTTPException(status_code=400, detail="text_query is empty")
        try:
            actual_lang = detect(native_text)
        except Exception:
            actual_lang = "en"

    if actual_lang == "ur":
        actual_lang = "hi"

    try:
        english_text = (
            GoogleTranslator(source="auto", target="en").translate(native_text) if actual_lang != "en" else native_text
        )
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Translation to English failed: {str(exc)}")

    state.update(
        {
            "detected_language": actual_lang,
            "native_transcript": native_text,
            "english_query": english_text,
        }
    )
    return state


def gatekeeper_node(state: SwarmState) -> SwarmState:
    try:
        classification = policy_classifier(
            state["english_query"], ["agricultural question", "profanity", "out of domain"]
        )
        top_label = classification["labels"][0]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Policy classification failed: {str(exc)}")

    if top_label == "profanity":
        state["routing_error"] = "PROFANITY_DETECTED"
        state["final_translated_text"] = "Please use respectful language."
    elif top_label == "out of domain":
        state["routing_error"] = "OUT_OF_DOMAIN"
        state["final_translated_text"] = "I am an agricultural expert. Ask farming questions."
    else:
        state["routing_error"] = None
    return state


async def data_orchestrator_node(state: SwarmState) -> SwarmState:
    try:
        vec = embedder.encode([state["english_query"]])
        _, indices = rag_index.search(np.array(vec), k=2)
        state["harvested_data"] = {
            "local_rag_context": " | ".join([master_knowledge_base[i] for i in indices[0]])
        }
        return state
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"RAG retrieval failed: {str(exc)}")


def agronomist_node(state: SwarmState) -> SwarmState:
    prompt = (
        "Elite Agronomist AI.\n"
        f"DATA: {state.get('harvested_data', {})}\n"
        "Give actionable directives."
    )
    try:
        out = reasoning_pipeline(
            [
                {"role": "system", "content": prompt},
                {"role": "user", "content": state["english_query"]},
            ],
            max_new_tokens=512,
            temperature=0.3,
            pad_token_id=llm_tokenizer.eos_token_id,
        )
        state["agronomist_draft_en"] = out[0]["generated_text"][-1]["content"]
        return state
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Reasoning node failed: {str(exc)}")


def compliance_node(state: SwarmState) -> SwarmState:
    state["compliance_flag"] = "PASS"
    return state


def final_translation_node(state: SwarmState) -> SwarmState:
    lang = state.get("detected_language", "hi")
    if lang == "en":
        state["final_translated_text"] = state["agronomist_draft_en"]
        return state

    try:
        state["final_translated_text"] = GoogleTranslator(source="en", target=lang).translate(
            state["agronomist_draft_en"]
        )
    except Exception:
        state["final_translated_text"] = state["agronomist_draft_en"]
    return state


def voicebox_node(state: SwarmState) -> SwarmState:
    lang_code = state.get("detected_language", "hi")
    indian_lang_matrix = ["hi", "gu", "mr", "bn", "ta", "te", "kn", "ml", "pa", "en"]
    if lang_code not in indian_lang_matrix:
        lang_code = "hi"

    try:
        tts = gTTS(text=state.get("final_translated_text", "Error."), lang=lang_code, slow=False)
        out_path = os.path.join(STATIC_DIR, f"{state['session_id']}_output.mp3")
        tts.save(out_path)
        state["output_audio_path"] = out_path
        return state
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(exc)}")


def supervisor_router(state: SwarmState) -> str:
    return "voicebox_agent" if state.get("routing_error") else "data_orchestrator_agent"


builder = StateGraph(SwarmState)
for node_name, node_fn in [
    ("sentinel", sentinel_node),
    ("perception", perception_node),
    ("gatekeeper", gatekeeper_node),
    ("data_orchestrator", data_orchestrator_node),
    ("agronomist", agronomist_node),
    ("compliance", compliance_node),
    ("translation", final_translation_node),
    ("voicebox", voicebox_node),
]:
    builder.add_node(f"{node_name}_agent", node_fn)

builder.add_edge(START, "sentinel_agent")
builder.add_edge("sentinel_agent", "perception_agent")
builder.add_edge("perception_agent", "gatekeeper_agent")
builder.add_conditional_edges(
    "gatekeeper_agent",
    supervisor_router,
    {"data_orchestrator_agent": "data_orchestrator_agent", "voicebox_agent": "voicebox_agent"},
)
builder.add_edge("data_orchestrator_agent", "agronomist_agent")
builder.add_edge("agronomist_agent", "compliance_agent")
builder.add_edge("compliance_agent", "translation_agent")
builder.add_edge("translation_agent", "voicebox_agent")
builder.add_edge("voicebox_agent", END)

ultimate_swarm = builder.compile()


@app.post("/api/agri-advice")
async def get_agri_advice(req: SwarmRequest, background_tasks: BackgroundTasks):
    session_id = str(uuid.uuid4())
    local_audio_path: Optional[str] = None

    if req.input_type == "audio":
        local_audio_path = os.path.join(STATIC_DIR, f"{session_id}_input.mp3")
        if req.audio_base64:
            try:
                with open(local_audio_path, "wb") as f:
                    f.write(base64.b64decode(req.audio_base64))
            except Exception as exc:
                raise HTTPException(status_code=422, detail=f"Invalid audio_base64 payload: {str(exc)}")
        else:
            timeout = aiohttp.ClientTimeout(total=30)
            try:
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    async with session.get(req.audio_url) as response:
                        if response.status >= 400:
                            raise HTTPException(
                                status_code=422,
                                detail=f"Could not fetch source audio from audio_url (status={response.status})",
                            )
                        with open(local_audio_path, "wb") as f:
                            f.write(await response.read())
            except HTTPException:
                raise
            except asyncio.TimeoutError:
                raise HTTPException(status_code=422, detail="Timeout while downloading audio_url")
            except Exception as exc:
                raise HTTPException(status_code=422, detail=f"Failed to download audio: {str(exc)}")

    initial_state: SwarmState = {
        "session_id": session_id,
        "user_audio_path": local_audio_path,
        "network_status": "",
        "detected_language": "",
        "native_transcript": req.text_query if req.input_type == "text" else "",
        "english_query": "",
        "extracted_entities": {},
        "harvested_data": {},
        "agronomist_draft_en": "",
        "compliance_flag": "",
        "final_translated_text": "",
        "output_audio_path": None,
        "routing_error": None,
        "audit_ledger": [
            {
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
                "event": "REQUEST_ACCEPTED",
                "input_type": req.input_type,
            }
        ],
    }

    final_state: SwarmState
    try:
        final_state = await asyncio.wait_for(ultimate_swarm.ainvoke(initial_state), timeout=180)
    except asyncio.TimeoutError:
        background_tasks.add_task(safe_remove_file, local_audio_path)
        raise HTTPException(status_code=500, detail="Swarm execution timed out")
    except HTTPException as exc:
        background_tasks.add_task(safe_remove_file, local_audio_path)
        raise exc
    except ValueError as exc:
        background_tasks.add_task(safe_remove_file, local_audio_path)
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        background_tasks.add_task(safe_remove_file, local_audio_path)
        raise HTTPException(status_code=500, detail=f"Swarm execution failed: {str(exc)}")

    output_audio_path = final_state.get("output_audio_path")
    if not output_audio_path or not os.path.exists(output_audio_path):
        background_tasks.add_task(safe_remove_file, local_audio_path)
        raise HTTPException(status_code=500, detail="Output audio was not generated")

    try:
        with open(output_audio_path, "rb") as audio_file:
            output_audio_base64 = base64.b64encode(audio_file.read()).decode("utf-8")
    except Exception as exc:
        background_tasks.add_task(safe_remove_file, local_audio_path)
        background_tasks.add_task(safe_remove_file, output_audio_path)
        raise HTTPException(status_code=500, detail=f"Failed to read generated audio: {str(exc)}")

    background_tasks.add_task(safe_remove_file, local_audio_path)
    background_tasks.add_task(safe_remove_file, output_audio_path)

    return {
        "status": "success",
        "session_id": session_id,
        "detected_language": final_state.get("detected_language"),
        "original_transcript": final_state.get("native_transcript"),
        "translated_response": final_state.get("final_translated_text"),
        "audio": {
            "mime_type": "audio/mpeg",
            "encoding": "base64",
            "content": output_audio_base64,
        },
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
