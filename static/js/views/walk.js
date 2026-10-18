// Gemba walk: watch five agents work in parallel (real tool calls), then the Lead links them into one plan of cards.
import { api, store, h, AGENTS, agentChip, money, num, hours, localTime, toast, rememberedName, rememberName, glow, stream, apiUrl } from "../core.js";

const SPECIALISTS = ["reliability", "quality", "supply", "energy", "flow"];
const TOOL_LABEL = {
  plant_overview: "Plant overview", machine_condition: "Machine condition", maintenance_history: "Maintenance history",
  spare_parts: "Spare parts", technicians: "Technicians", scrap_overview: "Scrap by machine", scrap_control_chart: "Scrap control chart",
  inspect_part_photo: "Inspect part photo (Gemini vision)", material_lots: "Material lots", order_book: "Order book",
  demand_forecast: "Demand forecast", what_if: "What-if on the simulator", energy_ranking: "Energy per good part",
  night_base_load: "Night-time base load", tariff_windows: "Tariff windows", line_oee: "Line OEE", line_machines: "Line machines",
  query_sql: "SQL query", compressor_baseline: "Compressor energy baseline",
};
const SIM_KINDS = ["slow", "repair", "fix_leak", "quarantine_lot", "recalibrate"];

export async function render(main, params, query) {
  const page = h("div", { class: "page" });
  const startBtn = h("button", { class: "btn walk" }, "✦ Start a Gemba walk");
  const progress = h("div", { class: "walk-progress", "aria-hidden": "true" }, h("i"));
  const timer = h("span", { class: "num dim small" }, "");
  const stats = h("span", { class: "dim small" }, "");
  page.append(h("div", { class: "page-head" },
    h("div", { class: "grow" }, h("h1", {}, "Gemba walk"),
      h("p", {}, "In lean manufacturing, managers \"go to the gemba\" (the real place) to see problems first-hand. Here five Gemini agents walk every plant in parallel using real tools; a Lead agent links what they find and writes one plan. Nothing changes until a person approves a card.")),
    startBtn));
  const notice = h("div");
  page.append(notice, h("div", { class: "row gap2 wrap", style: "margin-bottom:14px" }, progress, timer, stats));
  const lanes = h("div", { class: "lanes" });
  const laneEls = {};
  for (const a of SPECIALISTS) {
    const st = h("span", { class: "lane-state" }, "waiting");
    const body = h("div", { class: "lane-body" }, h("p", { class: "dim small" }, `Watches ${AGENTS[a].word}.`));
    const lane = h("section", { class: `lane ag-${a}`, "aria-label": `${AGENTS[a].name} agent` },
      h("div", { class: "lane-head" }, h("span", { "aria-hidden": "true", style: "color:var(--ag)" }, AGENTS[a].ico), h("h3", {}, AGENTS[a].name), st), body);
    lanes.append(lane);
    laneEls[a] = { lane, body, st, calls: {} };
  }
  const leadBody = h("div", { class: "lane-body" }, h("p", { class: "dim small" }, "Waits for the five findings, links them and tests plans on the simulator."));
  const leadSt = h("span", { class: "lane-state" }, "waiting");
  const lead = h("section", { class: "lane ag-lead lead-band", "aria-label": "Gemba Lead" },
    h("div", { class: "lane-head" }, h("span", { style: "color:var(--ag)" }, "✦"), h("h3", {}, "Gemba Lead"), leadSt), leadBody);
  laneEls.lead = { lane: lead, body: leadBody, st: leadSt, calls: {} };
  const planBox = h("div", { style: "margin-top:16px" });
  page.append(lanes, lead, planBox);
  main.append(page);

  let es = null, tmr = null, t0 = 0, done = 0, nAgents = 5;

  function reset() {
    for (const a of [...SPECIALISTS, "lead"]) { laneEls[a].body.innerHTML = ""; laneEls[a].st.textContent = "waiting"; laneEls[a].calls = {}; }
    for (const a of SPECIALISTS) laneEls[a].lane.querySelector(".finding")?.remove();
    planBox.innerHTML = ""; done = 0; setProgress(0); notice.innerHTML = "";
  }
  const setProgress = (f) => (progress.firstElementChild.style.width = `${Math.round(f * 100)}%`);
  const thinking = () => h("span", { class: "thinking", "aria-label": "working" }, h("i"), h("i"), h("i"));

  function onEvent(ev) {
    const a = ev.agent;
    const L = laneEls[a];
    switch (ev.kind) {
      case "walk_start":
        stats.textContent = ev.recorded ? `Recorded run · ${ev.recorded.model || "Gemini"}` : `${ev.provider.label} · ${ev.provider.models.agent || ""}`;
        nAgents = (ev.agents || SPECIALISTS).length;
        for (const x of SPECIALISTS) if (!(ev.agents || SPECIALISTS).includes(x)) {
          laneEls[x].st.textContent = "not needed";
          laneEls[x].body.replaceChildren(h("p", { class: "dim small" }, "Not needed for this signal."));
          laneEls[x].lane.style.opacity = ".55";
        } else laneEls[x].lane.style.opacity = "";
        if (ev.focus) notice.replaceChildren(h("div", { class: "banner info" }, h("b", {}, "Gemba Watch"),
          h("span", {}, `noticed a new signal and called only the agents it needs: ${ev.focus.signal}`)));
        if (ev.recorded) notice.replaceChildren(h("div", { class: "banner info" }, h("b", {}, "Replay"),
          h("span", {}, `This is a recorded live Gemini walk from ${new Date(ev.recorded.saved_at * 1000).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}, replayed because the model is not reachable right now. The cards' numbers are recomputed on your plant now, and you can approve them.`)));
        break;
      case "agent_start":
        L.st.replaceChildren(thinking());
        break;
      case "tool_call": {
        if (!L) break;
        const res = h("div", { class: "res" }, thinking());
        const args = Object.entries(ev.args || {}).filter(([k]) => k !== "sql").map(([k, v]) => typeof v === "object" ? `${k}: …` : `${v}`).join(", ");
        const el = h("div", { class: "ev" }, h("span", { class: "i" }, "→"),
          h("div", {}, h("code", {}, TOOL_LABEL[ev.name] || ev.name), args ? h("span", { class: "dim" }, ` ${args}`) : null,
            ev.name === "query_sql" ? h("div", { class: "tiny faint mono", style: "white-space:pre-wrap;max-height:4.5em;overflow:hidden" }, ev.args.sql) : null, res));
        L.body.append(el);
        L.calls[ev.call_id] = { el, res };
        el.scrollIntoView?.({ block: "nearest" });
        break;
      }
      case "tool_result": {
        const c = L?.calls[ev.call_id];
        if (c) { c.res.textContent = `✓ ${ev.summary}`; if (ev.error) c.el.classList.add("err"); }
        break;
      }
      case "image": {
        const c = L?.calls[ev.call_id];
        if (!c) break;
        const wrap = h("div", { class: "inspect-view", style: "margin-top:6px" }, h("img", { src: apiUrl(ev.url), alt: `Part photo, ${ev.label || ""}`, loading: "lazy" }));
        for (const b of ev.boxes || []) {
          const [y0, x0, y1, x1] = b.box_2d;
          wrap.append(h("div", { class: "box", style: `top:${y0 / 10}%;left:${x0 / 10}%;width:${(x1 - x0) / 10}%;height:${(y1 - y0) / 10}%` }, h("span", {}, b.label)));
        }
        c.el.lastElementChild.append(wrap);
        break;
      }
      case "note":
        if (L && ev.text) L.body.append(h("div", { class: "ev" }, h("span", { class: "i" }, "“"), h("div", { class: "res" }, ev.text.slice(0, 220))));
        break;
      case "agent_error":
        if (L) L.body.append(h("div", { class: "ev err" }, h("span", { class: "i" }, "!"), h("div", { class: "res" }, `Model problem: ${ev.error}. Using the rules engine for this agent.`)));
        break;
      case "finding": {
        const f = ev.finding;
        L.st.textContent = f.fallback ? "rules fallback" : `done · ${(f.took_ms / 1000).toFixed(0)} s`;
        L.lane.append(h("div", { class: "finding" }, h("b", {}, f.headline),
          h("span", { class: `status st-${f.severity === "critical" || f.severity === "high" ? "alarm" : f.severity === "medium" ? "watch" : "ok"}` }, f.severity),
          h("ul", {}, ...f.observations.slice(0, 4).map((o) => h("li", {}, o.fact, h("span", { class: "faint" }, ` · ${TOOL_LABEL[o.source] || o.source}`)))),
          f.suspected_links?.length ? h("div", { class: "tiny dim", style: "margin-top:6px" }, "Suspects a link with: ", ...f.suspected_links.map((l) => agentChip(l.agent))) : null));
        done += 1; setProgress(done / (nAgents + 2));
        break;
      }
      case "linking":
        laneEls.lead.st.replaceChildren(thinking());
        laneEls.lead.body.append(h("div", { class: "ev" }, h("span", { class: "i" }, "✦"), h("div", {}, "Linking findings across departments…")));
        setProgress((nAgents + 1) / (nAgents + 2));
        break;
      case "plan":
        laneEls.lead.st.textContent = ev.plan.fallback ? "rules fallback" : `done · ${(ev.plan.took_ms / 1000).toFixed(0)} s`;
        renderPlan(ev.plan);
        setProgress(1);
        break;
      case "walk_error":
        toast(`The walk stopped: ${ev.error}`, "err");
        break;
      case "walk_end":
        clearInterval(tmr);
        timer.textContent = `${(ev.took_ms / 1000).toFixed(0)} s`;
        stats.textContent += ` · ${ev.stats.llm_calls} model calls · ${ev.stats.tool_calls} tool calls${ev.stats.fallbacks ? ` · ${ev.stats.fallbacks} fallbacks` : ""}`;
        startBtn.disabled = false; startBtn.textContent = "✦ Walk again";
        healthBanner();
        break;
    }
  }

  function follow(id) {
    es?.close();
    reset();
    t0 = Date.now();
    clearInterval(tmr);
    tmr = setInterval(() => (timer.textContent = `${Math.round((Date.now() - t0) / 1000)} s`), 500);
    startBtn.disabled = true; startBtn.textContent = "Walking…";
    es = stream(`/api/walk/${id}/events`);
    es.addEventListener("walk", (e) => onEvent(JSON.parse(e.data)));
    es.addEventListener("done", () => { es.close(); startBtn.disabled = false; startBtn.textContent = "✦ Walk again"; clearInterval(tmr); store.emit("changed"); });
    es.onerror = () => { /* the browser reconnects; the server replays from the start */ };
  }

  async function start() {
    try { const r = await api.post("/api/walk"); follow(r.walk_id); }
    catch (e) { toast(`Could not start the walk: ${e.message}`, "err"); }
  }
  startBtn.onclick = start;

  // ---------------------------------------------------------------- plan
  function renderPlan(plan) {
    planBox.innerHTML = "";
    const imp = plan.impact;
    const head = h("div", { class: "panel" }, h("div", { class: "plan-head" },
      h("div", { class: "row gap wrap" }, agentChip("lead"), plan.fallback ? h("span", { class: "chip" }, "rules fallback") : h("span", { class: "chip" }, plan.model)),
      h("h2", {}, plan.headline), h("p", { class: "dim" }, plan.story),
      plan.links?.length ? h("div", { class: "links-viz" }, ...plan.links.map((l) => h("span", { class: "link-pill", title: l.why }, agentChip(l.from), "→", agentChip(l.to), h("span", { class: "small dim" }, l.why.slice(0, 90))))) : null,
      imp ? impactStrip(imp) : null,
      plan.tradeoffs ? h("p", { class: "small dim" }, h("b", {}, "Trade-off: "), plan.tradeoffs) : null,
      h("p", { class: "tiny faint" }, `Impact is computed by the plant simulator over ${imp?.horizon_h || 96} h, not by the language model (${imp?.assumptions || ""}).`)));
    const cards = h("div", { class: "cards", style: "margin-top:14px" }, ...plan.cards.map(cardEl));
    planBox.append(head, cards);
    if (plan.links?.length) head.querySelector(".plan-head").insertBefore(linkGraph(plan.links), head.querySelector(".links-viz"));
    earlierCards(plan);
  }

  async function earlierCards(plan) {
    const ids = new Set(plan.cards.map((c) => c.id));
    const waiting = (await api.get("/api/cards")).filter((c) => c.status === "proposed" && !ids.has(c.id));
    if (!waiting.length) return;
    planBox.append(h("h2", { style: "margin:22px 0 10px" }, `Still waiting from earlier walks (${waiting.length})`),
      h("div", { class: "cards" }, ...waiting.map(cardEl)));
  }

  function linkGraph(links) {
    const NS = "http://www.w3.org/2000/svg", W = 360, H = 230, R = 88, cx = W / 2, cy = H / 2 + 6;
    const pos = {};
    SPECIALISTS.forEach((a, i) => { const ang = -Math.PI / 2 + i * 2 * Math.PI / 5; pos[a] = [cx + R * 1.35 * Math.cos(ang), cy + R * Math.sin(ang)]; });
    const el = (t, at) => { const e = document.createElementNS(NS, t); for (const [k, v] of Object.entries(at)) e.setAttribute(k, v); return e; };
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: "max-width:420px", role: "img", "aria-label": "How the agents' findings connect" });
    const defs = el("defs", {});
    const mk = el("marker", { id: "arr", viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" });
    mk.append(el("path", { d: "M0,0 L10,5 L0,10 z", fill: "var(--lead)" })); defs.append(mk); svg.append(defs);
    for (const a of SPECIALISTS) svg.append(el("line", { x1: cx, y1: cy, x2: pos[a][0], y2: pos[a][1], stroke: "var(--border-2)", "stroke-dasharray": "3 4" }));
    for (const l of links) {
      const [x1, y1] = pos[l.from], [x2, y2] = pos[l.to]; if (!pos[l.from] || !pos[l.to]) continue;
      const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1, k = 24 / d;
      const line = el("path", { d: `M${x1 + dx * k},${y1 + dy * k} Q${cx},${cy} ${x2 - dx * k},${y2 - dy * k}`, fill: "none", stroke: "var(--lead)", "stroke-width": "2", "marker-end": "url(#arr)" });
      const title = el("title", {}); title.textContent = l.why; line.append(title); svg.append(line);
    }
    svg.append(el("circle", { cx, cy, r: 20, fill: "var(--panel-3)", stroke: "var(--lead)" }));
    const lt = el("text", { x: cx, y: cy + 5, "text-anchor": "middle", fill: "var(--lead)", "font-size": "16" }); lt.textContent = "✦"; svg.append(lt);
    const colors = { reliability: "var(--rel)", quality: "var(--qual)", supply: "var(--sup)", energy: "var(--ene)", flow: "var(--flow)" };
    for (const a of SPECIALISTS) {
      const used = links.some((l) => l.from === a || l.to === a);
      svg.append(el("circle", { cx: pos[a][0], cy: pos[a][1], r: 20, fill: "var(--panel)", stroke: colors[a], "stroke-width": used ? 3 : 1, opacity: used ? 1 : 0.5 }));
      const t = el("text", { x: pos[a][0], y: pos[a][1] + 34, "text-anchor": "middle", fill: colors[a], "font-size": "12", "font-weight": "600" }); t.textContent = AGENTS[a].name; svg.append(t);
      const ic = el("text", { x: pos[a][0], y: pos[a][1] + 5, "text-anchor": "middle", fill: colors[a], "font-size": "15" }); ic.textContent = AGENTS[a].ico; svg.append(ic);
    }
    return h("div", { class: "row wrap gap2" }, svg, h("p", { class: "small dim", style: "max-width:46ch" }, "How the problems connect: each arrow is a link the Lead found between two departments' findings (hover for the reason)."));
  }

  function impactStrip(imp) {
    const d = imp.delta, cell = (label, value, good) => h("div", { class: "impact" }, h("div", { class: "label" }, label), h("div", { class: `value ${good ? "delta-good-up" : ""}` }, value));
    const o = imp.orders?.find((x) => x.status_do_nothing !== "on track") || imp.orders?.[0];
    return h("div", { class: "impact-strip" },
      cell("Money, next 4 days", `${d.money >= 0 ? "+" : ""}${money(d.money)}`, d.money > 0),
      cell("Good parts", `${d.good >= 0 ? "+" : ""}${num(d.good)}`, d.good > 0),
      cell("Machine-hours down", `${num(d.down_h, 0)}`, d.down_h < 0),
      cell("Energy", `${num(d.kwh)} kWh`, d.kwh < 0),
      cell("CO2e", `${num(d.co2e_kg)} kg`, d.co2e_kg < 0),
      o ? cell(`Order ${o.so} cover`, `${Math.round(o.cover_do_nothing * 100)} → ${Math.round(o.cover_plan * 100)} %`, o.cover_plan >= 1 && o.cover_do_nothing < 1) : null);
  }

  function actText(a) {
    const when = a.when_h ? `in ${hours(a.when_h)} (${localTime(store.tick.now + a.when_h * 3600, plantOf(a.target), true)})` : "now";
    switch (a.kind) {
      case "transfer_part": return `Move ${a.part_no || "part"} from ${a.from_plant || "?"} to ${a.target} · ${when}`;
      case "repair": return `Planned repair of ${a.target} (4 h stop) · ${when}`;
      case "slow": return `Run ${a.target} at ${Math.round((a.value || 0.85) * 100)} % speed · ${when}`;
      case "fix_leak": return `Fix air leaks on ${a.target} · ${when}`;
      case "quarantine_lot": return `Quarantine lot ${a.target} · ${when}`;
      case "recalibrate": return `Check / recalibrate sensor on ${a.target} · ${when}`;
      default: return `${a.kind.replace(/_/g, " ")}: ${a.target}${a.note ? ` (${a.note})` : ""} · ${when}`;
    }
  }
  const plantOf = (t) => store.machine(t)?.plant || (["PUN", "CHK", "RAY"].includes(t) ? t : store.plant);

  function cardEl(c) {
    const imp = c.impact;
    const el = h("article", { class: `gcard ${c.status}`, id: c.id });
    el.append(h("div", { class: "gcard-strip", "aria-hidden": "true" }, ...c.pillars.map((p) => h("i", { class: `ag-${p}` }))));
    const body = h("div", { class: "gcard-body" },
      h("div", { class: "row gap wrap" }, ...c.pillars.map(agentChip), h("span", { class: "chip right" }, c.urgency)),
      h("h3", {}, c.title), h("p", { class: "why" }, c.why),
      h("ul", { class: "acts" }, ...c.actions.map((a) => h("li", {}, actText(a)))),
      ...c.guardrails.map((g) => h("div", { class: "guard" }, "⛨ ", g)));
    const impBox = h("div", { class: "grid", style: "gap:6px" });
    const drawImpact = (imp, warn) => {
      impBox.replaceChildren();
      if (!imp) { impBox.append(h("p", { class: "tiny faint" }, "Logistics or communication step: no simulated impact.")); return; }
      const rows = [["Good parts", "good", (v) => num(v), (a, b) => a > b], ["Scrap parts", "scrap", (v) => num(v), (a, b) => a < b],
        ["Machine-hours down", "down_h", (v) => num(v, 0), (a, b) => a < b], ["kWh per good part", "kwh_per_good", (v) => num(v, 2), (a, b) => a < b],
        ["Energy (kWh)", "kwh", (v) => num(v), (a, b) => a < b], ["CO2e (kg)", "co2e_kg", (v) => num(v), (a, b) => a < b],
        ["Net value", "money", (v) => money(v), (a, b) => a > b]]
        .filter(([, k]) => imp.do_nothing[k] != null && imp.plan[k] != null && Math.abs(imp.plan[k] - imp.do_nothing[k]) > (k === "kwh_per_good" ? 0.005 : 0.5))
        .filter(([, k], _, arr) => !(k === "kwh" && arr.some(([, x]) => x === "kwh_per_good")));
      if (rows.length) impBox.append(h("div", { class: "compare", title: imp.assumptions }, h("span", { class: "h" }, "next 4 days"), h("span", { class: "h n" }, "do nothing"), h("span", { class: "h n" }, "with this card"),
        ...rows.flatMap(([label, k, fmt, better]) => [h("span", {}, label), h("span", { class: "n" }, fmt(imp.do_nothing[k])),
          h("span", { class: `n ${better(imp.plan[k], imp.do_nothing[k]) ? "delta-good-up" : ""}` }, fmt(imp.plan[k]))])));
      for (const o of imp.orders || []) if (o.cover_do_nothing !== o.cover_plan) impBox.append(h("div", { class: "small" }, `Order ${o.so} (${o.customer}): cover ${Math.round(o.cover_do_nothing * 100)} % → ${Math.round(o.cover_plan * 100)} %`));
      for (const [m, tr] of Object.entries(imp.trip_h || {})) if (tr.do_nothing != null) impBox.append(h("div", { class: "small" }, `${m} trips in about ${hours(tr.do_nothing)} if nothing is done${tr.plan == null ? "; this card prevents it" : `; with this timing it still trips in about ${hours(tr.plan)}`}.`));
      if (warn) impBox.append(h("div", { class: "guard", style: "color:var(--watch);background:var(--watch-bg)" }, "⚠ ", warn));
    };
    drawImpact(imp);
    body.append(impBox);
    // retime: people can move an action and see the simulator's answer before approving
    const timed = c.actions.map((a, i) => [a, i]).filter(([a]) => SIM_KINDS.includes(a.kind));
    c._when = {};
    if (c.status === "proposed" && timed.length) {
      const box = h("details", { class: "small" }, h("summary", { style: "cursor:pointer;color:var(--link)" }, "Adjust timing and see the effect"));
      for (const [a, i] of timed) {
        const out = h("span", { class: "num", style: "min-width:120px" }, `in ${hours(a.when_h || 0)}`);
        const r = h("input", { type: "range", min: "0", max: "72", step: "1", value: String(Math.round(a.when_h || 0)), "aria-label": `Start of ${a.kind} on ${a.target}, hours from now`, style: "flex:1" });
        let tmrR = null;
        r.addEventListener("input", () => {
          out.textContent = `in ${hours(+r.value)} (${localTime(store.tick.now + +r.value * 3600, plantOf(a.target), true)})`;
          clearTimeout(tmrR);
          tmrR = setTimeout(async () => {
            c._when[i] = +r.value;
            const acts = c.actions.map((x, j) => ({ ...x, when_h: c._when[j] ?? x.when_h })).filter((x) => SIM_KINDS.includes(x.kind));
            try {
              const res = await api.post("/api/whatif", { actions: acts, horizon_h: 96 });
              const tr = Object.values(res.trip_h || {})[0];
              const tp = c.actions.find((x) => x.kind === "transfer_part");
              const eta = tp ? 9 + (tp.when_h || 0) : 0;
              let warn = null;
              if (a.kind === "repair" && tp && +r.value < eta) warn = `The spare part arrives in about ${eta} h; approval will be refused for an earlier start.`;
              else if (tr && tr.plan != null && tr.plan < +r.value) warn = `The machine is likely to trip before this repair starts.`;
              drawImpact(res, warn);
            } catch (e) { toast(e.message, "err"); }
          }, 300);
        });
        box.append(h("div", { class: "row gap", style: "margin-top:8px" }, h("span", { style: "min-width:110px" }, `${a.kind.replace(/_/g, " ")} ${a.target}`), r, out));
      }
      body.append(box);
    }
    el.append(body);
    el.append(footer(c, el));
    return el;
  }

  function footer(c, el) {
    const foot = h("div", { class: "gcard-foot" });
    if (c.status === "approved") {
      foot.append(h("span", { class: "stamp", style: "color:var(--ok)" }, `✓ Approved by ${c.approved_by} at ${localTime(c.approved_at, plantOf(c.machine_id))}`),
        h("a", { class: "btn small right", href: "#/work" }, "Work orders"));
      return foot;
    }
    if (c.status === "rejected") { foot.append(h("span", { class: "stamp dim" }, `Rejected by ${c.rejected_by}: ${c.reject_reason}`)); return foot; }
    const name = h("input", { type: "text", placeholder: "Your name", value: rememberedName(), "aria-label": `Your name to approve ${c.title}`, style: "flex:1;min-width:120px" });
    const ok = h("button", { class: "btn ok" }, "Approve");
    const no = h("button", { class: "btn ghost small" }, "Reject");
    foot.append(h("span", { class: "tiny dim", style: "width:100%" }, `Owner: ${c.owner}${c.confidence != null ? ` · agent confidence ${Math.round(c.confidence * 100)} %` : ""}`), name, ok, no);
    ok.onclick = async () => {
      if (name.value.trim().length < 2) { toast("Type your name: every approval is recorded with a person's name.", "err"); glow(name); return; }
      ok.disabled = true;
      try {
        const r = await api.post(`/api/cards/${c.id}/approve`, { name: name.value.trim(), when_h: c._when || {} });
        rememberName(name.value.trim());
        Object.assign(c, r.card);
        el.replaceWith(cardEl(c));
        toast(`Approved${r.card.edits?.length ? " with your timing changes" : ""}. ${r.work_orders.length} work order${r.work_orders.length > 1 ? "s" : ""} created; the twin now follows the plan.`, "ok", 6000, { href: "#/", label: "See it on the twin" });
        store.emit("changed");
      } catch (e) { toast(e.message, "err"); ok.disabled = false; }
    };
    no.onclick = async () => {
      if (name.value.trim().length < 2) { toast("Type your name first.", "err"); glow(name); return; }
      const reason = prompt("Why do you reject this card? (helps the agents next time)");
      if (!reason) return;
      try { const r = await api.post(`/api/cards/${c.id}/reject`, { name: name.value.trim(), note: reason }); Object.assign(c, r.card); el.replaceWith(cardEl(c)); }
      catch (e) { toast(e.message, "err"); }
    };
    return foot;
  }

  function healthBanner() {
    const hl = store.health;
    if (!hl || hl.llm.available || startBtn.disabled) return;
    const kids = [h("b", {}, "Gemini is not reachable right now."),
      h("span", { class: "small" }, "The agents will run on Gemba's rules engine (clearly labelled)."),
      h("button", { class: "btn small", onclick: start }, "Run with the rules engine")];
    if (hl.recording) kids.splice(2, 0, h("button", { class: "btn small primary", onclick: async () => {
      try { const r = await api.post("/api/walk/replay"); follow(r.walk_id); } catch (e) { toast(e.message, "err"); }
    } }, "Watch a recorded Gemini walk"));
    notice.replaceChildren(h("div", { class: "banner" }, ...kids));
  }
  const offH = store.on((k) => { if (k === "health") healthBanner(); });

  // ---------------------------------------------------------------- initial state
  const latest = await api.get("/api/walk/latest").catch(() => ({ walk: null }));
  if (query?.get("start")) {
    history.replaceState(null, "", "#/walk");
    if (latest.walk?.status === "running") follow(latest.walk.id);
    else if (store.health && !store.health.llm.available && store.health.recording) healthBanner();
    else start();
  } else if (latest.walk) {
    if (latest.walk.status === "running") follow(latest.walk.id);
    else {
      for (const ev of latest.walk.events) onEvent(ev);
      // cards may have been approved since: refresh their status
      const cards = await api.get("/api/cards");
      if (latest.walk.plan) { const byId = Object.fromEntries(cards.map((c) => [c.id, c])); latest.walk.plan.cards = latest.walk.plan.cards.map((c) => byId[c.id] || c); renderPlan(latest.walk.plan); }
    }
  }
  healthBanner();
  return () => { es?.close(); clearInterval(tmr); offH(); };
}
