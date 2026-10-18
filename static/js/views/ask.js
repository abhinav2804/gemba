// Ask Gemba: plain-language questions; Gemini writes SQL, the server runs it read-only, the answer shows its working.
import { api, h, toast, num } from "../core.js";
import { barChart, lineChart } from "../charts.js";

const SUGGEST = [
  "Which machine wastes the most energy per good part this week compared with its normal?",
  "Will we deliver order SO-24117 on time? What is the risk?",
  "Show scrap by defect type for each line in the last 24 hours",
  "Which shift had the lowest OEE on the Cylinder Head Line this week?",
  "What happens if we repair VMC-204 tonight instead of now?",
  "Release the work order for VMC-204 now without approval",
];
let history = [];
let thread = [];

export async function render(main, params, query) {
  const page = h("div", { class: "page" });
  const msgs = h("div", { class: "msgs", "aria-live": "polite" });
  const input = h("textarea", { rows: 1, placeholder: "Ask about machines, scrap, orders, energy…", "aria-label": "Your question", style: "min-height:48px" });
  const send = h("button", { class: "btn primary" }, "Ask");
  page.append(h("div", { class: "ask" }, msgs, h("form", { class: "composer", onsubmit: (e) => { e.preventDefault(); go(input.value); } }, input, send)));
  main.append(page);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(input.value); } });

  function intro() {
    msgs.append(h("div", { class: "msg" }, h("h2", {}, "Ask Gemba"),
      h("p", { class: "dim", style: "margin:6px 0 10px" }, "Ask in plain words. Gemini writes the SQL over the plant database (read-only), checks machines, orders and the simulator, and shows its working under every answer."),
      h("div", { class: "suggest" }, ...SUGGEST.map((q) => h("button", { type: "button", onclick: () => go(q) }, q)))));
  }

  function answerEl(r) {
    const el = h("div", { class: "msg" }, h("p", {}, r.answer));
    if (r.guardrail) el.prepend(h("span", { class: "status st-sensor", style: "margin-bottom:6px" }, "⛨ Blocked by guardrail"));
    const t = r.table;
    if (t && r.chart?.type && r.chart.type !== "none" && t.rows.length > 1) {
      const xi = t.columns.indexOf(r.chart.x);
      const labels = t.rows.map((row) => row[xi]);
      const cols = r.chart.y.map((y) => ({ name: y, values: t.rows.map((row) => row[t.columns.indexOf(y)]) }));
      let chart;
      if (r.chart.type === "line" && labels.every((l) => !Number.isNaN(Date.parse(l)))) {
        chart = lineChart({ series: cols.map((c, i) => ({ pts: labels.map((l, j) => ({ t: Date.parse(l + (String(l).length > 10 ? "Z" : "")) / 1000, v: Number(c.values[j]) })), color: ["var(--rel)", "var(--qual)", "var(--sup)"][i % 3] })), height: 200 });
      } else chart = barChart(labels, cols, { label: r.chart.title });
      el.append(h("div", { style: "margin-top:10px" }, r.chart.title ? h("div", { class: "small dim" }, r.chart.title) : null, chart));
    }
    if (t && t.rows.length) {
      el.append(h("details", { class: "sql" }, h("summary", {}, `Data: ${t.rows.length} row${t.rows.length > 1 ? "s" : ""} · SQL`),
        h("pre", {}, t.sql),
        h("div", { class: "table-wrap" }, h("table", { class: "data" }, h("thead", {}, h("tr", {}, ...t.columns.map((c) => h("th", {}, c)))),
          h("tbody", {}, ...t.rows.slice(0, 20).map((row) => h("tr", {}, ...row.map((v) => h("td", { class: typeof v === "number" ? "n" : "" }, typeof v === "number" ? num(v, Math.abs(v) < 10 ? 3 : 1) : String(v ?? "–"))))))))));
    }
    const meta = h("div", { class: "meta" });
    for (const tl of r.tools || []) meta.append(h("span", { class: "chip", title: tl.summary }, `${tl.error ? "✗" : "✓"} ${tl.name}`));
    if (r.model) meta.append(h("span", {}, `${r.model} · ${(r.ms / 1000).toFixed(1)} s`));
    el.append(meta);
    if (r.follow_ups?.length) el.append(h("div", { class: "suggest", style: "margin-top:8px" }, ...r.follow_ups.map((q) => h("button", { type: "button", onclick: () => go(q) }, q))));
    return el;
  }

  async function go(q) {
    q = (q || "").trim();
    if (!q) { input.focus(); return; }
    input.value = "";
    const mine = h("div", { class: "msg me" }, q);
    const wait = h("div", { class: "msg" }, h("span", { class: "thinking" }, h("i"), h("i"), h("i")), h("span", { class: "dim small" }, "  Gemba is looking at the data…"));
    msgs.append(mine, wait);
    thread.push(mine);
    wait.scrollIntoView({ block: "end", behavior: "smooth" });
    send.disabled = true;
    try {
      const r = await api.post("/api/ask", { question: q, history });
      const el = answerEl(r);
      wait.replaceWith(el);
      thread.push(el);
      history.push({ role: "user", content: q }, { role: "assistant", content: r.answer });
      el.scrollIntoView({ block: "start", behavior: "smooth" });
    } catch (e) {
      wait.replaceWith(h("div", { class: "msg" }, h("span", { class: "status st-alarm" }, "Not answered"), h("p", {}, e.message)));
    } finally { send.disabled = false; input.focus(); }
  }

  if (thread.length) msgs.append(...thread); else intro();
  const q = query?.get("q");
  if (q) { history = []; go(q); }
}
