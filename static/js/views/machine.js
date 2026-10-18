// Machine 360: live sensors against alarm and trip limits, health, time-to-trip range with the forecast, energy,
// scrap control chart, maintenance history, spares and everything Gemba proposed or did for this machine.
import { api, store, h, num, pct, hours, money, statusChip, localTime } from "../core.js";
import { lineChart } from "../charts.js";

export async function render(main, [id]) {
  const page = h("div", { class: "page" }, h("div", { class: "skeleton", style: "height:300px" }));
  main.append(page);
  let d;
  try { d = await api.get(`/api/machines/${encodeURIComponent(id)}`); }
  catch (e) { page.innerHTML = ""; page.append(h("div", { class: "panel pad" }, h("h2", {}, "Machine not found"), h("p", { class: "dim" }, e.message))); return; }
  const st = d.state, cat = store.machine(st.id), plant = st.plant;
  page.innerHTML = "";
  const sentence = st.status === "sensor" ? `${st.faults[0].label} has been frozen at ${st.faults[0].value} for ${st.faults[0].hours} h. This is the sensor, not the machine: send an instrument technician, not a repair crew.`
    : st.ttf ? `Vibration is rising at steady speed (+${st.ttf.rise_mm_s_per_day} mm/s per day). At this rate it reaches the trip limit in ${hours(st.ttf.to_trip_h.p10)} to ${hours(st.ttf.to_trip_h.p90)}.`
    : st.status === "watch" ? `On watch: ${st.reasons.join(", ")}.` : st.status === "idle" ? "Not scheduled to run right now." : "Running normally.";
  page.append(h("div", { class: "page-head" },
    h("div", { class: "grow" }, h("div", { class: "row gap wrap" }, h("a", { href: "#/", class: "small" }, "← Floor"), h("span", { class: "dim small" }, `${cat.plant} · ${store.catalog.lines.find((l) => l.id === cat.line)?.name}`)),
      h("div", { class: "row gap wrap", style: "margin-top:4px" }, h("h1", {}, `${st.id}`), h("span", { class: "dim" }, st.name), statusChip(st.status)),
      h("p", { style: "margin-top:6px" }, sentence)),
    h("a", { class: "btn", href: `#/ask?q=${encodeURIComponent(`Why is ${st.id} ${st.status === "ok" ? "running fine" : "flagged"} and what should we do?`)}` }, "Ask Gemba about it")));

  const g = h("div", { class: "gauge-row" });
  const kpi = (l, v, s) => h("div", { class: "kpi" }, h("div", { class: "label" }, l), h("div", { class: "value" }, v), s ? h("div", { class: "sub" }, s) : null);
  g.append(kpi("Health", `${st.health}/100`, st.health_breakdown.map((b) => `${b.key} −${b.penalty}`).join(" · ") || "no deductions"));
  for (const [k, r] of Object.entries(st.readings)) g.append(kpi(r.label, `${num(r.value, r.value < 20 ? 2 : 1)} ${r.unit}`, `normal ${num(r.nominal, r.nominal < 20 ? 1 : 0)} · alarm ${num(r.alarm, r.alarm < 20 ? 1 : 0)} · trip ${num(r.trip, r.trip < 20 ? 1 : 0)}`));
  if (st.zone) g.append(kpi("Vibration zone", st.zone.zone, st.zone.meaning));
  if (st.anomaly != null) g.append(kpi("Anomaly score", num(st.anomaly, 2), st.anomaly > 0.98 ? "unusual pattern" : "within normal patterns"));

  const left = h("div", { class: "grid" });
  const right = h("div", { class: "grid", style: "align-content:start" });
  page.append(g, h("div", { class: "m360", style: "margin-top:16px" }, left, right));

  // sensor charts
  for (const sp of cat.sensors) {
    const pts = d.series[sp.key] || [];
    const series = [{ pts }];
    if (sp.key === "vib" && d.forecast) series.push({ pts: d.forecast, cls: "forecast" });
    const limits = sp.alarm > sp.nominal ? [{ v: sp.alarm, cls: "limit-alarm", label: `alarm ${sp.alarm}` }, { v: sp.trip, cls: "limit-trip", label: `trip ${sp.trip}` }] : [];
    const tt = d.state.ttf;
    const band = sp.key === "vib" && tt ? { t0: store.tick.now + tt.to_trip_h.p10 * 3600, t1: store.tick.now + tt.to_trip_h.p90 * 3600 } : null;
    left.append(h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h3", {}, `${sp.label} (${sp.unit})`),
      sp.key === "vib" && d.forecast ? h("span", { class: "right small dim" }, "dashed red: forecast · shaded: likely trip window") : null),
      h("div", { class: "panel-body" }, lineChart({ series, limits, now: d.state.ttf ? store.tick.now : null, band, plant, label: `${sp.label} history` }))));
  }
  left.append(h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h3", {}, "Power (kW)"), h("span", { class: "right small dim" }, `${num(d.energy.kwh_24h)} kWh and ${num(d.energy.co2e_kg_24h)} kg CO2e in 24 h`)),
    h("div", { class: "panel-body" }, lineChart({ series: [{ pts: d.power, color: "var(--ene)" }], plant, ymin: 0, height: 160, label: "power history" }))));
  if (d.spc) {
    const pts = d.spc.points.map((p) => ({ t: p.t, v: p.p * 100 }));
    left.append(h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h3", {}, "Scrap per hour (%) — control chart"),
      h("span", { class: "right small" }, d.spc.signal ? h("span", { class: "status st-watch" }, d.spc.signal) : h("span", { class: "status st-ok" }, "in control"))),
      h("div", { class: "panel-body" }, lineChart({ series: [{ pts, color: "var(--qual)" }, { pts: d.spc.points.map((p) => ({ t: p.t, v: p.ucl * 100 })), cls: "limit-alarm" }],
        limits: [{ v: d.spc.centre * 100, cls: "now-line", label: `normal ${num(d.spc.centre * 100, 2)} %` }], plant, ymin: 0, height: 170, label: "scrap control chart" }),
        h("p", { class: "small dim" }, `Last 24 h: ${d.spc.scrap_24h_pct} % scrap · ${Object.entries(d.spc.by_defect_24h).map(([k, v]) => `${k.replace(/_/g, " ")} ${num(v, 0)}`).join(" · ")}`))));
  }

  // right column
  if (d.state.ttf) {
    const tt = d.state.ttf.to_trip_h, max = Math.max(tt.p90 * 1.25, 100);
    right.append(h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h3", {}, "Time to trip limit")),
      h("div", { class: "panel-body ttf" },
        h("div", { class: "value num", style: "font-size:22px;font-weight:600" }, `${hours(tt.p10)} – ${hours(tt.p90)}`),
        h("div", { class: "ttf-bar", role: "img", "aria-label": `likely between ${hours(tt.p10)} and ${hours(tt.p90)}` },
          h("div", { class: "range", style: `left:${tt.p10 / max * 100}%;width:${(tt.p90 - tt.p10) / max * 100}%` }),
          h("div", { class: "p50", style: `left:${tt.p50 / max * 100}%` })),
        h("p", { class: "small dim" }, `Most likely ${hours(tt.p50)} (${localTime(store.tick.now + tt.p50 * 3600, plant, true)}). Alarm limit in about ${hours(d.state.ttf.to_alarm_h)}. ${d.state.ttf.method}.`))));
  }
  const mh = d.maintenance;
  right.append(h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h3", {}, "Maintenance history"),
    mh.preventive_overdue_days ? h("span", { class: "right status st-watch" }, `PM ${num(mh.preventive_overdue_days)} d overdue`) : null),
    h("div", { class: "table-wrap" }, h("table", { class: "data" }, h("thead", {}, h("tr", {}, h("th", {}, "Work order"), h("th", {}, "Type"), h("th", { class: "n" }, "Days ago"), h("th", {}, "Note"))),
      h("tbody", {}, ...mh.work_orders.map((w) => h("tr", {}, h("td", { class: "mono small" }, w.wo), h("td", {}, w.type), h("td", { class: "n" }, num(w.days_ago)), h("td", { class: "small" }, w.note))))))));
  if (d.spares) right.append(h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h3", {}, `Spare: ${d.spares.name}`)),
    h("div", { class: "panel-body" }, h("dl", { class: "kv" }, ...d.spares.stock.flatMap((r) => [h("dt", {}, r.plant), h("dd", {}, `${r.on_hand} on hand${r.in_transit ? ` + ${r.in_transit} in transit` : ""}${r.transfer_h_to_pune ? ` · ${r.transfer_h_to_pune} h to Pune` : ""}`)])))));
  right.append(h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h3", {}, "Energy")),
    h("div", { class: "panel-body" }, h("dl", { class: "kv" },
      h("dt", {}, "kWh per good part"), h("dd", {}, d.energy.kwh_per_good != null ? `${d.energy.kwh_per_good} (normal ${d.energy.kwh_per_good_baseline})` : "–"),
      h("dt", {}, "Change"), h("dd", {}, d.energy.kwh_per_good_change_pct != null ? `${d.energy.kwh_per_good_change_pct > 0 ? "+" : ""}${d.energy.kwh_per_good_change_pct} %` : "–"),
      h("dt", {}, "Cost, 24 h"), h("dd", {}, money(d.energy.cost_24h, d.energy.currency))))));
  if (d.cards.length || d.work_orders.length) right.append(h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h3", {}, "Gemba actions")),
    h("div", { class: "panel-body grid", style: "gap:8px" },
      ...d.cards.map((c) => h("a", { href: "#/walk", class: "small" }, `${c.id} · ${c.title} · ${c.status}`)),
      ...d.work_orders.map((w) => h("a", { href: `#/job/${w.id}`, class: "small" }, `${w.id} · ${w.title} · ${w.status}`)))));
  if (d.inspections.length) right.append(h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h3", {}, "Recent inspections")),
    h("div", { class: "panel-body grid", style: "gap:6px" }, ...d.inspections.map((i) => h("div", { class: "small" }, `${localTime(i.t, plant)} · ${i.by}: ${i.defect.replace(/_/g, " ")} (${Math.round(i.confidence * 100)} %)`)))));
}
