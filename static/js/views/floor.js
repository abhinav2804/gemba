// Floor: the control room. 3D twin of the selected plant with time travel (3 days back, 3 days ahead with or without
// the approved plan), plant KPIs, what needs attention, Gemba Watch activity and the walk button.
import { api, store, h, num, pct, statusChip, STATUS, money, localTime, hours } from "../core.js";
import { createTwin } from "../twin.js";

export async function render(main) {
  const page = h("div", { class: "page" });
  const headline = h("p", { class: "dim" }, "Loading the plant…");
  page.append(h("div", { class: "page-head" },
    h("div", { class: "grow" }, h("h1", {}, "Plant floor"), headline),
    h("a", { class: "btn walk", href: "#/walk?start=1" }, "✦ Start a Gemba walk")));
  const twinBox = h("div", { class: "twin-wrap" });
  const lens = h("div", { class: "lens", role: "group", "aria-label": "Colour machines by" },
    ...[["health", "Health"], ["energy", "Energy"], ["quality", "Quality"]].map(([k, l]) =>
      h("button", { "aria-pressed": String(k === "health"), "data-lens": k }, l)));
  const timeTag = h("span", { class: "chip", hidden: true }, "");
  twinBox.append(h("div", { class: "twin-overlay" }, lens, timeTag));
  twinBox.append(h("div", { class: "twin-legend", "aria-hidden": "true" },
    ...["ok", "watch", "alarm", "sensor", "repair", "idle"].map((k) => h("span", {}, h("i", { class: "dot", style: `background:var(--${k === "repair" ? "link" : k})` }), STATUS[k]))));

  // time travel
  const slider = h("input", { type: "range", min: "-72", max: "72", step: "1", value: "0", "aria-label": "Time travel: hours from now", style: "flex:1;min-width:160px" });
  const readout = h("b", { class: "num", style: "min-width:150px" }, "Live");
  const modeBox = h("div", { class: "lens", role: "group", "aria-label": "Future view", hidden: true },
    h("button", { "aria-pressed": "true", "data-mode": "plan" }, "With approved plan"), h("button", { "aria-pressed": "false", "data-mode": "nothing" }, "If we do nothing"));
  const play = h("button", { class: "btn small", title: "Play the next three days" }, "▶ Next 72 h");
  const live = h("button", { class: "btn small ghost", hidden: true }, "Back to live");
  const travel = h("section", { class: "panel", style: "margin-top:12px" }, h("div", { class: "panel-body grid", style: "gap:8px" },
    h("div", { class: "row gap wrap" }, h("span", { class: "small dim" }, "Time travel"), readout, modeBox, h("span", { class: "right row gap" }, play, live)),
    h("div", { class: "row gap" }, h("span", { class: "tiny dim" }, "−3 days"), slider, h("span", { class: "tiny dim" }, "+3 days")),
    h("p", { class: "tiny faint" }, "The twin is a simulation, so it can show the past and the likely future. Ahead of now, choose the approved plan or doing nothing.")));

  const kpis = h("div", { class: "kpis", style: "margin-top:12px" });
  const attention = h("div", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", {}, "Needs attention")), h("div", { class: "skeleton", style: "margin:16px;height:60px" }));
  const planBox = h("div", { class: "panel" });
  const watchBox = h("div", { class: "panel" });
  const linesBox = h("div", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", {}, "Lines today (OEE)")), h("div", { class: "panel-body" }));
  page.append(h("div", { class: "floor" },
    h("div", {}, twinBox, travel, kpis),
    h("div", { class: "side-stack" }, planBox, attention, watchBox, linesBox)));
  main.append(page);

  let scrap = {};
  const twin = await createTwin(twinBox, { onPick: (id) => (location.hash = `#/machine/${id}`), scrap });
  lens.addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    lens.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    if (b.dataset.lens === "quality" && !Object.keys(scrap).length) {
      const q = await api.get("/api/quality");
      for (const r of q.scrap.machines) scrap[r.machine_id] = r.scrap_24h_pct;
      twin.opts.scrap = scrap;
    }
    twin.setLens(b.dataset.lens);
  });

  // ---------------------------------------------------------------- time travel state
  let offsetH = 0, mode = "plan", travelData = null, seq = 0, timer = null, playing = null;
  async function travelTo(hh) {
    offsetH = hh;
    slider.value = String(hh);
    live.hidden = hh === 0;
    modeBox.hidden = hh <= 0;
    if (hh === 0) { travelData = null; timeTag.hidden = true; readout.textContent = "Live"; renderTick(); return; }
    const at = store.tick.now + hh * 3600;
    readout.textContent = `${localTime(at, store.plant, true)} (${hh > 0 ? "+" : "−"}${hours(Math.abs(hh))})`;
    const my = ++seq;
    try {
      const d = await api.get(`/api/twin?at=${at}&mode=${mode}`);
      if (my !== seq) return;
      travelData = d;
      timeTag.hidden = false;
      timeTag.textContent = hh < 0 ? `Past: ${localTime(at, store.plant, true)}` : `Forecast ${mode === "plan" ? "with plan" : "if we do nothing"}: ${localTime(at, store.plant, true)}`;
      renderTick();
    } catch (e) { console.warn(e); }
  }
  slider.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => travelTo(+slider.value), 180); });
  modeBox.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    mode = b.dataset.mode;
    modeBox.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    travelTo(offsetH);
  });
  live.onclick = () => { stopPlay(); travelTo(0); };
  function stopPlay() { clearInterval(playing); playing = null; play.textContent = "▶ Next 72 h"; }
  play.onclick = () => {
    if (playing) { stopPlay(); return; }
    let hh = Math.max(0, offsetH);
    play.textContent = "❚❚ Pause";
    playing = setInterval(() => { hh += 3; if (hh > 72) { stopPlay(); return; } travelTo(hh); }, 900);
  };

  // ---------------------------------------------------------------- side panels
  let lines = [];
  async function loadSlow() {
    try {
      const [ln, latest] = await Promise.all([api.get("/api/lines"), api.get("/api/walk/latest")]);
      lines = ln;
      renderLines();
      renderPlan(latest.walk);
    } catch (e) { console.warn(e); }
  }

  function renderPlan(walk) {
    planBox.innerHTML = "";
    const plan = walk?.plan;
    if (!plan) {
      planBox.append(h("div", { class: "hero-call" },
        h("h2", {}, "Send the agents on a walk"),
        h("p", {}, "Five Gemini agents (Reliability, Quality, Supply, Energy, Flow) look at every machine, order and kilowatt, find the problems that cross departments, and hand you one plan to approve."),
        h("div", { class: "row gap wrap" }, ...["reliability", "quality", "supply", "energy", "flow"].map((a) => h("span", { class: `chip agent-chip ag-${a}` }, a))),
        h("a", { class: "btn primary", href: "#/walk?start=1" }, "Start the walk (about 45 s)")));
      twin.setHighlight([]);
      return;
    }
    const open = plan.cards.filter((c) => c.status === "proposed").length;
    planBox.append(h("div", { class: "panel-head" }, h("h2", {}, "Latest plan"), h("span", { class: "right dim small" }, `${plan.cards.length} cards · ${open} waiting`)),
      h("div", { class: "panel-body grid", style: "gap:10px" },
        h("p", {}, plan.headline),
        plan.impact ? h("p", { class: "small dim" }, `If approved: ${money(plan.impact.delta.money)} over 4 days, ${num(-plan.impact.delta.down_h, 0)} fewer machine-hours down, ${num(-plan.impact.delta.co2e_kg, 0)} kg CO2e less.`) : null,
        h("a", { class: "btn", href: "#/walk" }, open ? `Review ${open} card${open > 1 ? "s" : ""}` : "Open the plan")));
    twin.setHighlight(plan.cards.map((c) => c.machine_id).filter(Boolean));
  }

  function renderWatch() {
    const evs = (store.watch || []).slice().reverse();
    watchBox.innerHTML = "";
    watchBox.append(h("div", { class: "panel-head" }, h("h2", {}, "Gemba Watch"), h("span", { class: "right dim small" }, "agents act on new signals")));
    const body = h("div", { class: "panel-body grid", style: "gap:8px" });
    if (!evs.length) body.append(h("p", { class: "small dim" }, "Quiet. When a new problem appears (a machine starts to wear, a sensor freezes, a compressor starts to leak), the right agents start by themselves and post new cards. Try it: ⏱ in the header → inject a fault."));
    for (const ev of evs.slice(0, 5)) body.append(h("a", { href: "#/walk", class: "small", style: "text-decoration:none;color:inherit" },
      h("span", { class: `status ${ev.kind === "plan" ? "st-ok" : "st-repair"}` }, ev.kind === "plan" ? "cards ready" : "investigating"), " ",
      h("span", { class: "dim" }, localTime(ev.t, store.plant)), " · ", ev.text));
    watchBox.append(body);
  }

  function renderLines() {
    const body = linesBox.querySelector(".panel-body");
    body.innerHTML = "";
    for (const l of lines.filter((x) => x.plant === store.plant)) {
      const d = l.oee - (l.oee_week_ago ?? l.oee);
      body.append(h("div", { style: "margin-bottom:10px" },
        h("div", { class: "row", style: "justify-content:space-between;font-size:14px" }, h("span", {}, l.name),
          h("span", { class: "num" }, pct(l.oee), h("span", { class: `small ${d < -0.01 ? "delta-bad-down" : "dim"}` }, ` ${d >= 0 ? "▲" : "▼"} ${Math.abs(d * 100).toFixed(1)}`))),
        h("div", { class: "bar" }, h("i", { style: `width:${(l.oee * 100).toFixed(1)}%;background:${l.oee < 0.65 ? "var(--alarm)" : l.oee < 0.7 ? "var(--watch)" : "var(--ok)"}` })),
        h("div", { class: "tiny dim" }, `A ${pct(l.availability)} · P ${pct(l.performance)} · Q ${pct(l.quality, 1)} · biggest loss: ${l.biggest_loss}`)));
    }
    if (!body.children.length) body.append(h("p", { class: "dim small" }, "No production lines at this plant."));
  }

  function renderTick() {
    const t = travelData || store.tick;
    if (!t) return;
    twin.update(t);
    const p = t.plants.find((x) => x.id === store.plant);
    const ms = t.machines.filter((m) => store.machine(m.id)?.plant === store.plant);
    const bad = ms.filter((m) => ["alarm", "down", "sensor"].includes(m.status)), watch = ms.filter((m) => m.status === "watch");
    const when = travelData ? (offsetH < 0 ? `On ${localTime(travelData.at, store.plant, true)}` : `Forecast for ${localTime(travelData.at, store.plant, true)} ${mode === "plan" ? "with the approved plan" : "if nothing is done"}`) : p.name;
    headline.textContent = bad.length || watch.length
      ? `${when}: ${bad.length ? `${bad.length} machine${bad.length > 1 ? "s need" : " needs"} action` : "no machine needs action"}${watch.length ? `, ${watch.length} on watch` : ""}. Click a machine for details.`
      : `${when}: every machine is running normally.`;
    kpis.innerHTML = "";
    const items = [
      ["Plant OEE (24 h)", pct(p.oee, 1), "availability × performance × quality"],
      ["Good parts (24 h)", num(p.good_24h), "all lines"],
      ["Power", `${num(p.kw_now)} kW`, `${num(p.co2e_kg_h)} kg CO2e per hour`],
      ["Machines needing action", String(p.alerts), `${p.watch} on watch`],
    ];
    for (const [l, v, s] of items) kpis.append(h("div", { class: "kpi" }, h("div", { class: "label" }, l), h("div", { class: "value" }, v), h("div", { class: "sub" }, s)));
    attention.innerHTML = "";
    attention.append(h("div", { class: "panel-head" }, h("h2", {}, "Needs attention"), h("span", { class: "right dim small" }, travelData ? when : `${store.plantInfo()?.name}`)));
    const full = (id) => (travelData ? travelData.machines : store.state?.machines || []).find((x) => x.id === id);
    const rows = [...ms.filter((m) => m.status === "repair"), ...bad, ...watch];
    if (!rows.length) attention.append(h("p", { class: "empty" }, "Nothing needs attention here."));
    for (const m of rows) {
      const cat = store.machine(m.id);
      const reasons = full(m.id)?.reasons || [];
      attention.append(h("a", { class: "alert-row", href: `#/machine/${m.id}` },
        h("div", { class: "grow" }, h("div", { class: "row gap" }, h("b", {}, m.id), statusChip(m.status)),
          h("div", { class: "small dim" }, `${cat.name}${reasons.length ? ` · ${reasons.join(", ")}` : ""}`)),
        h("span", { class: "num small dim" }, `health ${m.health}`)));
    }
  }

  async function refreshState() {
    try { store.state = await api.get("/api/state"); } catch (e) {}
    renderTick();
  }

  const off = store.on((kind) => {
    if (kind === "tick" && !travelData) renderTick();
    if (kind === "plant") { twin.setPlant(store.plant); renderTick(); renderLines(); }
    if (kind === "theme") twin.retheme();
    if (kind === "watch") renderWatch();
    if (kind === "changed") { refreshState(); loadSlow(); if (offsetH) travelTo(offsetH); }
  });
  await refreshState();
  renderWatch();
  loadSlow();
  const slow = setInterval(refreshState, 30000);
  return () => { off(); clearInterval(slow); stopPlay(); twin.dispose(); };
}
