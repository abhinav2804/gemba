"""Worker voice assistant: a technician asks about the job in Hindi, Marathi, Thai or English and hears the answer.

The browser turns speech into text (or sends audio when the model accepts it) and reads the reply aloud. Gemini answers
from the work order, its steps and the machine's live data, in the worker's language, and never advises skipping
lock-out or the release check.
"""
import time

from ..analytics.snapshot import machine_state
from . import llm
from . import tools as T

LANGS = {"hi": "Hindi (Devanagari script)", "mr": "Marathi (Devanagari script)", "th": "Thai", "en": "English", "ta": "Tamil"}
SYSTEM = """You are Gemba's voice assistant for a maintenance technician on the shop floor. Hands are busy and gloves are on,
so answer in at most 3 short spoken sentences, in {lang}. Keep machine IDs, part numbers and numbers in Latin digits.
Answer only from the job card and live data below. Safety first: never suggest skipping lock-out / tag-out, removing guards,
or releasing the machine before the release check (vibration at or below 2.3 mm/s). If unsure, say to ask the supervisor.

Job card:
{job}

Live machine data:
{live}"""


async def answer(session, wo: dict | None, text: str, lang: str = "hi", audio: dict | None = None) -> dict:
    t = time.time()
    lang = lang if lang in LANGS else "en"
    now = session.world.now()
    job = "No job selected."
    live = "{}"
    if wo:
        job = T.dumps({k: wo.get(k) for k in ("id", "title", "kind", "machine_id", "status", "note")} |
                      {"steps": [f"{i + 1}. {s['text']} ({'done' if s['done'] else 'open'})" for i, s in enumerate(wo["steps"])]})
        if wo.get("machine_id"):
            st = machine_state(session.world, wo["machine_id"], now, detail=True)
            live = T.dumps({"status": st["status"], "readings": {k: {"value": r["value"], "unit": r["unit"], "alarm": r["alarm"]}
                                                                 for k, r in st["readings"].items()}, "health": st["health"]})
    if llm.provider() == "mock":
        return {"answer": "Voice answers need a model. Follow the job steps on screen; lock-out comes first.", "lang": lang,
                "fallback": True, "ms": 0}
    content = [{"type": "text", "text": text or "(spoken question attached)"}]
    if audio and audio.get("data"):
        content.append({"type": "audio", "mime": audio.get("mime", "audio/webm"), "data": audio["data"]})
    msgs = [{"role": "system", "content": SYSTEM.format(lang=LANGS[lang], job=job, live=live)}, {"role": "user", "content": content}]
    r = await llm.chat(msgs, role="voice", temperature=0.3)
    session.log("Voice assistant", f"Answered a worker question ({lang})", (text or "audio")[:160], kind="agent",
                ref=wo["id"] if wo else "")
    return {"answer": r.content.strip(), "lang": lang, "model": r.model, "ms": int(1000 * (time.time() - t))}
