// Technician job view (phone first): lock-out first, tick steps with a name, ask by voice in Hindi / Marathi / Thai /
// English and hear the answer, release only with a vibration reading at or below the limit.
import { api, store, h, toast, rememberedName, rememberName, glow, localTime, hours } from "../core.js";

const LANGS = [["hi", "हिन्दी", "hi-IN"], ["mr", "मराठी", "mr-IN"], ["th", "ไทย", "th-TH"], ["en", "English", "en-IN"]];
const UI = {
  hi: { ask: "सवाल पूछने के लिए दबाएँ", listening: "सुन रहा हूँ…", type: "या यहाँ लिखें" },
  mr: { ask: "प्रश्न विचारण्यासाठी दाबा", listening: "ऐकत आहे…", type: "किंवा इथे लिहा" },
  th: { ask: "กดเพื่อถาม", listening: "กำลังฟัง…", type: "หรือพิมพ์ที่นี่" },
  en: { ask: "Hold to ask a question", listening: "Listening…", type: "or type here" },
};

export async function render(main, [id]) {
  const page = h("div", { class: "page" });
  main.append(page);
  let wo;
  try { wo = (await api.get("/api/workorders")).find((w) => w.id === id); } catch (e) {}
  if (!wo) { page.append(h("div", { class: "panel pad" }, h("h2", {}, "Job not found"), h("a", { href: "#/work" }, "Back to work orders"))); return; }
  let lang = (() => { try { return localStorage.getItem("gemba-lang") || "hi"; } catch (e) { return "hi"; } })();
  const plant = store.machine(wo.machine_id)?.plant || "PUN";
  const job = h("div", { class: "job" });
  page.append(job);

  function draw() {
    job.innerHTML = "";
    job.append(h("a", { href: "#/work", class: "small" }, "← Work orders"),
      h("div", {}, h("div", { class: "row gap wrap" }, h("h1", {}, wo.title), h("span", { class: "status st-idle" }, wo.status)),
        h("p", { class: "dim small" }, `${wo.id} · approved by ${wo.approved_by} · ${wo.start > store.tick.now ? `starts ${localTime(wo.start, plant, true)} (in ${hours((wo.start - store.tick.now) / 3600)})` : `started ${localTime(wo.start, plant, true)}`}`)));
    const name = h("input", { type: "text", value: rememberedName(), placeholder: "Your name", "aria-label": "Your name for the job record" });
    job.append(h("label", { class: "field" }, "Technician", name));
    wo.steps.forEach((s, i) => {
      const loto = i === 0 && wo.kind === "repair";
      const btn = h("button", { "aria-label": `${s.done ? "Untick" : "Tick"} step ${i + 1}`, "aria-pressed": String(s.done) }, s.done ? "✓" : String(i + 1));
      btn.onclick = async () => {
        if (name.value.trim().length < 2) { toast("Type your name first.", "err"); glow(name); return; }
        try { wo = await api.post(`/api/workorders/${wo.id}/step`, { step: i, done: !s.done, name: name.value.trim() }); rememberName(name.value.trim()); draw(); }
        catch (e) { toast(e.message, "err"); }
      };
      job.append(h("div", { class: `step ${s.done ? "done" : ""} ${loto ? "loto" : ""}` }, btn,
        h("div", {}, loto ? h("div", { class: "status st-watch", style: "margin-bottom:4px" }, "Safety first") : null, h("p", {}, s.text),
          s.done ? h("div", { class: "tiny dim" }, `${s.by} · ${localTime(s.at, plant)}`) : null)));
    });
    if (wo.status !== "Done") {
      const reading = h("input", { type: "number", step: "0.1", min: "0", placeholder: "mm/s", "aria-label": "Release vibration reading in mm/s", style: "max-width:140px" });
      const fin = h("button", { class: "btn ok" }, wo.kind === "repair" ? "Release machine" : "Mark job done");
      fin.onclick = async () => {
        if (name.value.trim().length < 2) { toast("Type your name first.", "err"); glow(name); return; }
        try {
          wo = await api.post(`/api/workorders/${wo.id}/complete`, { name: name.value.trim(), reading: wo.kind === "repair" ? parseFloat(reading.value) || null : null });
          toast("Job closed and recorded in the audit log."); draw(); store.emit("changed");
        } catch (e) { toast(e.message, "err"); glow(wo.kind === "repair" ? reading : fin); }
      };
      job.append(h("div", { class: "panel pad grid", style: "gap:8px" },
        wo.kind === "repair" ? h("label", { class: "field" }, "Release check: vibration at 12,000 rpm (limit 2.3 mm/s)", reading) : null, fin));
    } else job.append(h("p", { class: "status st-ok" }, `Done${wo.release_reading != null ? ` · release reading ${wo.release_reading} mm/s` : ""}`));
    voicePanel();
  }

  function voicePanel() {
    const t = UI[lang];
    const convo = h("div", { class: "grid", style: "gap:8px" });
    const langBar = h("div", { class: "plants", role: "group", "aria-label": "Language" }, ...LANGS.map(([k, label]) =>
      h("button", { "aria-pressed": String(k === lang), lang: k, onclick: () => { lang = k; try { localStorage.setItem("gemba-lang", k); } catch (e) {} draw(); } }, label)));
    const mic = h("button", { class: "mic", "aria-label": t.ask }, "🎙");
    const text = h("input", { type: "text", placeholder: t.type, lang, "aria-label": "Type your question" });
    const status = h("p", { class: "small dim center", lang }, t.ask);
    job.append(h("section", { class: "panel pad grid", style: "gap:12px" }, h("h2", {}, "Ask Gemba (voice)"), langBar,
      h("div", { class: "center" }, mic), status, h("form", { onsubmit: (e) => { e.preventDefault(); ask(text.value); text.value = ""; } }, text), convo));
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let rec = null;
    mic.onclick = () => {
      if (!SR) { toast("Voice input is not supported in this browser; type the question instead.", "info"); text.focus(); return; }
      if (rec) { rec.stop(); return; }
      rec = new SR();
      rec.lang = LANGS.find((l) => l[0] === lang)[2];
      rec.interimResults = false;
      rec.onstart = () => { mic.classList.add("on"); status.textContent = t.listening; };
      rec.onend = () => { mic.classList.remove("on"); status.textContent = t.ask; rec = null; };
      rec.onerror = (e) => toast(`Voice: ${e.error}`, "err");
      rec.onresult = (e) => ask(e.results[0][0].transcript);
      rec.start();
    };
    async function ask(q) {
      q = (q || "").trim(); if (!q) return;
      convo.append(h("div", { class: "bubble me", lang }, q));
      const wait = h("div", { class: "bubble" }, h("span", { class: "thinking" }, h("i"), h("i"), h("i")));
      convo.append(wait);
      try {
        const r = await api.post("/api/voice", { text: q, lang, wo_id: wo.id });
        wait.replaceWith(h("div", { class: "bubble", lang }, r.answer, h("div", { class: "tiny faint", lang: "en" }, `${r.model || ""} · ${((r.ms || 0) / 1000).toFixed(1)} s`)));
        speak(r.answer);
      } catch (e) { wait.replaceWith(h("div", { class: "bubble" }, e.message)); }
    }
  }

  function speak(textToSay) {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(textToSay);
    u.lang = LANGS.find((l) => l[0] === lang)[2];
    const v = speechSynthesis.getVoices().find((x) => x.lang?.startsWith(lang));
    if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }
  draw();
  return () => { try { speechSynthesis.cancel(); } catch (e) {} };
}
