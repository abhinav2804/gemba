// Work: every work order created from approved cards, with status, owner, timing and a link to the technician view.
import { api, store, h, localTime, hours } from "../core.js";

const ST = { Scheduled: "idle", "In transit": "sensor", "In progress": "watch", Done: "ok", Blocked: "alarm" };

export async function render(main) {
  const page = h("div", { class: "page" });
  page.append(h("div", { class: "page-head" }, h("div", { class: "grow" }, h("h1", {}, "Work orders"),
    h("p", {}, "Created only when a named person approves a Gemba card. Technicians open a job on their phone, follow the steps (lock-out first) and ask questions by voice."))));
  const box = h("div", { class: "grid" });
  page.append(box);
  main.append(page);
  async function load() {
    const wos = await api.get("/api/workorders");
    box.innerHTML = "";
    if (!wos.length) {
      box.append(h("div", { class: "panel empty" }, h("p", {}, "No work orders yet."), h("p", { class: "small" }, "Run a Gemba walk and approve a card to create them."), h("a", { class: "btn", href: "#/walk", style: "margin-top:10px" }, "Go to the Gemba walk")));
      return;
    }
    box.append(h("section", { class: "panel" }, h("div", { class: "table-wrap" }, h("table", { class: "data" },
      h("thead", {}, h("tr", {}, h("th", {}, "Work order"), h("th", {}, "Job"), h("th", {}, "Status"), h("th", {}, "Starts"), h("th", { class: "hide-phone" }, "Approved by"), h("th", {}, "Steps"))),
      h("tbody", {}, ...wos.slice().reverse().map((w) => {
        const done = w.steps.filter((s) => s.done).length;
        const plant = store.machine(w.machine_id)?.plant || store.plant;
        return h("tr", { class: "click", onclick: () => (location.hash = `#/job/${w.id}`) },
          h("td", { class: "mono" }, w.id), h("td", {}, w.title), h("td", {}, h("span", { class: `status st-${ST[w.status] || "idle"}` }, w.status)),
          h("td", { class: "small" }, w.start > store.tick.now ? `${localTime(w.start, plant, true)} (in ${hours((w.start - store.tick.now) / 3600)})` : localTime(w.start, plant, true)),
          h("td", { class: "small hide-phone" }, w.approved_by), h("td", { class: "num" }, `${done}/${w.steps.length}`));
      }))))));
  }
  await load();
  const off = store.on((k) => { if (k === "changed") load(); });
  const t = setInterval(load, 15000);
  return () => { off(); clearInterval(t); };
}
