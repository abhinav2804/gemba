// App shell: hash router, live plant stream, header (clock, plant switch, model badge, theme), presenter controls.
import { api, store, h, $, localTime, toast, stream } from "./core.js";
import { welcome, refreshTour, startTour } from "./tour.js";

const ROUTES = {
  "": () => import("./views/floor.js"), walk: () => import("./views/walk.js"), ask: () => import("./views/ask.js"),
  quality: () => import("./views/quality.js"), energy: () => import("./views/energy.js"), supply: () => import("./views/supply.js"),
  work: () => import("./views/work.js"), job: () => import("./views/job.js"), machine: () => import("./views/machine.js"),
  trust: () => import("./views/trust.js"),
};
const NAV = { "": "floor", machine: "floor", job: "work" };
let cleanup = null;
let renderSeq = 0;

async function route() {
  const [path, query = ""] = location.hash.replace(/^#\/?/, "").split("?");
  const [name = "", ...params] = path.split("/").map(decodeURIComponent);
  const key = ROUTES[name] ? name : "";
  document.querySelectorAll(".rail a").forEach((a) => a.toggleAttribute("aria-current", a.dataset.route === (NAV[key] ?? key)));
  document.querySelectorAll(".rail a[aria-current]").forEach((a) => a.setAttribute("aria-current", "page"));
  const seq = ++renderSeq;
  if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
  const main = $("#main");
  main.innerHTML = "";
  main.scrollTop = 0;
  try {
    const mod = await ROUTES[key]();
    if (seq !== renderSeq) return;
    cleanup = (await mod.render(main, params, new URLSearchParams(query))) || null;
  } catch (e) {
    console.error(e);
    main.append(h("div", { class: "page" }, h("div", { class: "panel pad" }, h("h2", {}, "This view could not load"),
      h("p", { class: "dim" }, String(e.message || e)), h("button", { class: "btn", onclick: () => route() }, "Try again"))));
  }
  main.focus({ preventScroll: true });
}

// ------------------------------------------------------------------ live stream
function connect() {
  const es = stream("/api/stream");
  es.addEventListener("tick", (e) => {
    store.tick = JSON.parse(e.data);
    if (!store.paused) store.view = store.tick;
    watchEvents(store.tick.watch || []);
    $("#clock").firstElementChild.className = "dot live";
    updateHeader();
    store.emit("tick");
  });
  es.onerror = () => { $("#clock").firstElementChild.className = "dot"; };
}

// ------------------------------------------------------------------ Gemba Watch notifications
let watchSeen = (() => { try { return +sessionStorage.getItem("gemba-watch-seen") || 0; } catch (e) { return 0; } })();
let watchPrimed = false;
function watchEvents(evs) {
  store.watch = evs;
  if (!watchPrimed) { watchPrimed = true; if (!watchSeen && evs.length) { watchSeen = evs[evs.length - 1].id; } }
  for (const ev of evs) {
    if (ev.id <= watchSeen) continue;
    watchSeen = ev.id;
    try { sessionStorage.setItem("gemba-watch-seen", String(watchSeen)); } catch (e) {}
    toast(ev.text, ev.kind === "plan" ? "ok" : "info", 9000, { href: "#/walk", label: ev.kind === "plan" ? "Review" : "Watch the agents" });
    store.emit("watch");
    if (ev.kind === "plan") store.emit("changed");
  }
}

async function pollHealth() {
  try {
    const hl = await api.get("/api/health");
    store.health = hl;
    const b = $("#model-badge");
    const ok = hl.llm.available;
    b.classList.toggle("warn", !ok);
    b.classList.toggle("ok", ok);
    b.textContent = ok ? (hl.llm.models.agent || "Gemini") : "Gemini unreachable · rules engine";
    b.title = ok ? hl.llm.label : `The model provider is not answering right now. Gemba falls back to its rules engine (labelled) or a recorded Gemini walk.`;
    store.emit("health");
  } catch (e) {}
}

function updateHeader() {
  const t = store.tick;
  if (!t) return;
  const p = store.plantInfo();
  $("#clock-text").innerHTML = `<span class="plant-name">${p ? p.name.replace(" Plant", "") : ""} </span>${localTime(t.now, store.plant, true)}${t.session.offset_h ? ` <span class="faint">+${t.session.offset_h} h</span>` : ""}`;
  const bc = $("#badge-cards"), bw = $("#badge-wo");
  bc.hidden = !t.session.cards_open; bc.textContent = t.session.cards_open;
  bw.hidden = !t.session.work_orders_open; bw.textContent = t.session.work_orders_open;
}

function setPlant(p) {
  store.plant = p;
  try { localStorage.setItem("gemba-plant", p); } catch (e) {}
  document.querySelectorAll(".plants button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.plant === p)));
  updateHeader();
  store.emit("plant");
}

// ------------------------------------------------------------------ presenter
function presenter() {
  const dlg = $("#presenter");
  const list = $("#inject-list");
  const labels = { bearing_wear_vmc202: "Bearing wear on VMC-202", air_leak_chk: "Air leak at Chakan", sensor_stuck_hob301: "Stuck sensor on HOB-301" };
  list.innerHTML = "";
  for (const k of Object.keys(store.catalog.injectable)) {
    list.append(h("button", { class: "btn", onclick: async () => {
      try { await api.post("/api/presenter/inject", { scenario: k }); toast(`Injected: ${labels[k] || k}. Run a Gemba walk to see who catches it.`); store.emit("changed"); }
      catch (e) { toast(e.message, "err"); }
    } }, labels[k] || k));
  }
  dlg.querySelectorAll("[data-jump]").forEach((b) => b.onclick = async () => {
    try { const r = await api.post("/api/presenter/jump", { hours: +b.dataset.jump }); toast(`Clock moved forward. Now +${r.offset_h} h.`); store.emit("changed"); }
    catch (e) { toast(e.message, "err"); }
  });
  $("#reset-btn").onclick = async () => {
    await api.post("/api/presenter/reset"); toast("Demo reset to the starting story."); dlg.close(); location.hash = "#/"; setTimeout(() => location.reload(), 300);
  };
  $("#presenter-btn").onclick = () => {
    const s = store.tick?.session;
    $("#presenter-state").textContent = s ? `Clock offset +${s.offset_h} h · injected: ${s.injected.join(", ") || "none"}` : "";
    dlg.showModal();
  };
}

// ------------------------------------------------------------------ boot
async function boot() {
  store.catalog = await api.get("/api/catalog");
  const llm = store.catalog.llm;
  const badge = $("#model-badge");
  badge.textContent = llm.provider === "mock" ? "Rules engine (no model)" : `${llm.models.agent}${llm.models.lead !== llm.models.agent ? ` · ${llm.models.lead}` : ""}`;
  badge.title = llm.label;
  badge.classList.toggle("warn", llm.provider === "mock");
  document.querySelectorAll(".plants button").forEach((b) => b.onclick = () => setPlant(b.dataset.plant));
  setPlant(store.plant);
  $("#theme-btn").onclick = () => {
    const t = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("gemba-theme", t); } catch (e) {}
    store.emit("theme");
  };
  presenter();
  try { store.tick = await api.get("/api/state").then((s) => ({ now: s.now, machines: s.machines, plants: s.plants, counts: s.counts, session: s.session })); updateHeader(); } catch (e) {}
  connect();
  pollHealth();
  setInterval(pollHealth, 60000);
  addEventListener("hashchange", () => { route(); refreshTour(); });
  route();
  welcome();
  $("#tour-btn")?.addEventListener("click", startTour);
}
boot().catch((e) => { $("#main").innerHTML = `<div class="page"><div class="panel pad"><h2>Gemba could not start</h2><p class="dim">${e.message}</p></div></div>`; });
