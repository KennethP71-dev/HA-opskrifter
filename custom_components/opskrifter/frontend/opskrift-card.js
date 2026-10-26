/*
 * Opskrift-card – frontend til integrationen Opskrifter
 * Indlæses automatisk af integrationen. Kort-type: custom:opskrift-card
 */
const OC_VERSION = "1.0.0";

const COLORS = {
  red: ["Rød", "244, 67, 54"], pink: ["Pink", "233, 30, 99"], purple: ["Lilla", "156, 39, 176"],
  indigo: ["Indigo", "63, 81, 181"], blue: ["Blå", "33, 150, 243"], cyan: ["Cyan", "0, 188, 212"],
  teal: ["Petrol", "0, 150, 136"], green: ["Grøn", "76, 175, 80"], "light-green": ["Lysegrøn", "139, 195, 74"],
  amber: ["Rav", "255, 193, 7"], orange: ["Orange", "255, 152, 0"], "deep-orange": ["Dyb orange", "255, 87, 34"],
  brown: ["Brun", "121, 85, 72"], grey: ["Grå", "158, 158, 158"],
};
const UNITS = ["g", "kg", "ml", "dl", "l", "tsk.", "spsk.", "fed", "nip", "stk.", "dåse", "bdt.", "skiver"];

const rgb = (f) => {
  const name = COLORS[f] ? f : "orange";
  return `--oc-rgb: var(--rgb-${name}-color, ${COLORS[name][1]});`;
};
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slug = (s) =>
  String(s || "").toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const cap = (s) => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
const normUnit = (u) => String(u || "").toLowerCase().replace(/\./g, "").trim();
const txt = (v) => (v == null ? "" : String(v)).trim();
const dkNum = (v) => (v == null || v === "" ? "" : String(v).replace(".", ","));

const WHOLE_UNITS = ["fed", "nip", "dåse", "dåser", "bdt", "pk", "pakke", "skive", "skiver", "blade"];
const SPOON_UNITS = ["dl", "cl", "spsk", "tsk", "kop", "knsp"];

function roundAmount(v, unit) {
  const u = normUnit(unit);
  if (!(v > 0)) return 0;
  if (u === "g" || u === "ml") {
    if (v < 10) return Math.max(0.5, Math.round(v * 2) / 2);
    if (v < 100) return Math.round(v / 5) * 5;
    if (v < 1000) return Math.round(v / 10) * 10;
    return Math.round(v / 25) * 25;
  }
  if (u === "kg" || u === "l") return Math.max(0.05, Math.round(v * 20) / 20);
  if (SPOON_UNITS.includes(u)) {
    if (v < 0.25) return Math.max(0.125, Math.round(v * 8) / 8);
    return Math.round(v * 4) / 4;
  }
  if (WHOLE_UNITS.includes(u)) return Math.max(1, Math.round(v));
  return Math.max(0.5, Math.round(v * 2) / 2);
}
const FRACS = [[0.125, "⅛"], [0.25, "¼"], [0.5, "½"], [0.75, "¾"]];
function fmtNum(v) {
  const whole = Math.floor(v + 1e-9);
  const rest = v - whole;
  if (rest < 0.01) return String(whole);
  for (const [f, s] of FRACS) if (Math.abs(rest - f) < 0.01) return (whole || "") + s;
  return v.toLocaleString("da-DK", { maximumFractionDigits: 2 });
}
function fmtAmount(v, unit) {
  const u = normUnit(unit);
  if (u === "kg" || u === "l") return v.toLocaleString("da-DK", { maximumFractionDigits: 2 });
  return fmtNum(v);
}
function defaultStep(unit, base) {
  const u = normUnit(unit);
  if (u === "g" || u === "ml") return base >= 400 ? 100 : base >= 100 ? 50 : 10;
  if (u === "kg" || u === "l") return 0.25;
  if (SPOON_UNITS.includes(u)) return 0.5;
  return 1;
}
function normalize(list) {
  return (Array.isArray(list) ? list : [])
    .filter((r) => r && r.navn)
    .map((r) => ({
      ...r,
      id: r.id || slug(r.navn),
      ingredienser: (r.ingredienser || []).map((i) => (typeof i === "string" ? { navn: i } : i)),
      fremgang: r.fremgang || [],
      krydderistyrke: r.krydderistyrke ?? 100,
    }))
    .sort((a, b) => a.navn.localeCompare(b.navn, "da"));
}

const STYLE = `
:host{display:block}
ha-card{padding:12px;overflow:hidden}
.head{display:flex;align-items:center;gap:12px;padding:4px 4px 8px}
.info{flex:1;min-width:0}
.primary{font-weight:700;font-size:14px;line-height:20px;color:var(--primary-text-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.primary.big{font-size:16px;line-height:22px;white-space:normal}
.secondary{font-weight:500;font-size:12px;line-height:16px;color:var(--secondary-text-color)}
.shape{flex:none;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(var(--oc-rgb),.2);color:rgb(var(--oc-rgb));--mdc-icon-size:22px}
.icon-btn{flex:none;width:36px;height:36px;border-radius:50%;border:none;padding:0;background:transparent;color:var(--primary-text-color);cursor:pointer;display:flex;align-items:center;justify-content:center;--mdc-icon-size:20px}
.icon-btn:hover{background:rgba(var(--rgb-primary-text-color,0,0,0),.06)}
.icon-btn:disabled{opacity:.3;cursor:default}
.icon-btn.sm{width:32px;height:32px;--mdc-icon-size:18px}
.search{width:100%;box-sizing:border-box;height:40px;border-radius:12px;border:none;padding:0 14px;margin:4px 0 8px;font:inherit;font-size:14px;background:rgba(var(--rgb-primary-text-color,0,0,0),.05);color:var(--primary-text-color);outline:none}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px}
.chip{height:32px;padding:0 12px;border-radius:16px;border:none;font:inherit;font-size:12px;font-weight:600;cursor:pointer;background:rgba(var(--rgb-primary-text-color,0,0,0),.05);color:var(--primary-text-color)}
.chip.sm{height:28px;padding:0 10px}
.chip.on{background:rgba(var(--oc-rgb),.22);color:rgb(var(--oc-rgb))}
.list{display:flex;flex-direction:column;gap:2px}
.row{display:flex;align-items:center;gap:12px;padding:8px;border-radius:12px;cursor:pointer}
.row:hover{background:rgba(var(--rgb-primary-text-color,0,0,0),.04)}
.row .shape{width:38px;height:38px;--mdc-icon-size:20px}
.chev{color:var(--secondary-text-color);--mdc-icon-size:20px}
.empty,.error,.notice{padding:12px 8px;font-size:13px;line-height:1.5;color:var(--secondary-text-color)}
.error{color:var(--error-color,#db4437)}
.notice{background:rgba(var(--oc-rgb),.08);border-radius:12px;padding:10px 12px;margin:0 0 8px;color:var(--primary-text-color)}
.photo{width:100%;max-height:220px;object-fit:cover;border-radius:12px;margin:4px 0 8px;display:block}
.panel{background:rgba(var(--oc-rgb),.08);border-radius:16px;padding:12px;margin:4px 0 14px}
.label{font-size:12px;font-weight:600;color:var(--secondary-text-color);margin:2px 0 4px}
.stepper{display:flex;align-items:center;gap:8px;margin:6px 0}
.step{width:44px;height:44px;border-radius:12px;border:none;padding:0;background:rgba(var(--oc-rgb),.2);color:rgb(var(--oc-rgb));cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none}
.value{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;height:44px;border-radius:12px;background:var(--ha-card-background,var(--card-background-color,#fff));padding:0 8px;min-width:0}
.value input{width:7ch;text-align:right;border:none;background:transparent;font:inherit;font-size:22px;font-weight:700;color:var(--primary-text-color);outline:none;padding:0}
.unit{font-size:14px;font-weight:600;color:var(--secondary-text-color);min-width:4ch}
.scaleinfo{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;font-weight:500;color:var(--secondary-text-color);min-height:28px}
.link{border:none;background:none;font:inherit;font-size:12px;font-weight:700;color:rgb(var(--oc-rgb));cursor:pointer;padding:4px 2px}
.section{margin:0 4px 16px}
.h{font-size:14px;font-weight:700;color:var(--primary-text-color);margin:12px 0 6px}
.section .h{margin-top:0}
.ing{display:grid;grid-template-columns:96px 1fr auto;gap:12px;align-items:baseline;padding:7px 0;border-bottom:1px solid var(--divider-color)}
.ing:last-child{border-bottom:none}
.amt{font-weight:700;font-size:14px;color:var(--primary-text-color);white-space:nowrap;font-variant-numeric:tabular-nums}
.name{font-size:14px;color:var(--primary-text-color)}
.note{display:block;font-size:12px;color:var(--secondary-text-color)}
.tag{--mdc-icon-size:16px;color:rgb(var(--oc-rgb))}
.steps{margin:0;padding-left:22px;font-size:14px;line-height:1.5;color:var(--primary-text-color)}
.steps li{padding:3px 0 3px 4px}
.steps li::marker{font-weight:700;color:rgb(var(--oc-rgb))}
.notes{margin:0;font-size:13px;line-height:1.5;color:var(--secondary-text-color);white-space:pre-line}
.meta{font-size:11px;color:var(--secondary-text-color);margin:0 4px 4px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 14px;border-radius:12px;border:none;font:inherit;font-size:13px;font-weight:700;cursor:pointer;background:rgba(var(--rgb-primary-text-color,0,0,0),.06);color:var(--primary-text-color);--mdc-icon-size:18px}
.btn.primary-btn{background:rgb(var(--oc-rgb));color:#fff}
.btn.danger{background:rgba(var(--rgb-red-color,244,67,54),.12);color:var(--error-color,#db4437)}
.btn:disabled{opacity:.5;cursor:default}
.form{padding:0 4px 4px}
.fld{display:flex;flex-direction:column;gap:4px;margin:0 0 10px;min-width:0}
.fld span{font-size:12px;font-weight:600;color:var(--secondary-text-color)}
.fld input,.fld select,.fld textarea{box-sizing:border-box;width:100%;min-width:0;border:1px solid var(--divider-color);border-radius:10px;padding:9px 10px;font:inherit;font-size:14px;background:var(--ha-card-background,var(--card-background-color,#fff));color:var(--primary-text-color);outline:none}
.fld textarea{resize:vertical;line-height:1.45}
.fld input:focus,.fld select:focus,.fld textarea:focus{border-color:rgb(var(--oc-rgb))}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.cols3{display:grid;grid-template-columns:72px 84px 1fr;gap:8px}
.ingedit{border-radius:14px;background:rgba(var(--rgb-primary-text-color,0,0,0),.03);padding:10px 10px 6px;margin:0 0 8px}
.ingedit .fld{margin-bottom:8px}
.flags{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.spacer{flex:1}
.actions{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px;flex-wrap:wrap}
.actions .right{display:flex;gap:8px;margin-left:auto}
.search:focus-visible,.chip:focus-visible,.row:focus-visible,.step:focus-visible,.icon-btn:focus-visible,.link:focus-visible,.btn:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}
`;

const PRINT_STYLE = `
@page{size:A4;margin:18mm 20mm}
body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#222;font-size:11pt;line-height:1.45}
h1{font-size:20pt;margin:0 0 2pt}
.sub{color:#666;margin:0 0 14pt}
h2{font-size:13pt;margin:16pt 0 6pt}
table{border-collapse:collapse;width:100%}
td{padding:4pt 0;border-bottom:0.5pt solid #ddd;vertical-align:top}
td.a{width:34mm;font-weight:700;white-space:nowrap}
.n{color:#666;font-size:9.5pt}
ol{padding-left:16pt;margin:0}
li{margin:0 0 5pt}
.notes{color:#555;font-size:10pt;white-space:pre-line}
`;

class OpskriftCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._recipes = [];
    this._status = "loading";
    this._error = null;
    this._q = "";
    this._cat = null;
    this._openId = null;
    this._state = {};
    this._draft = null;
    this._saving = false;
    this._confirmDelete = false;
    this._formError = null;
    this._notice = null;
    const root = this.shadowRoot;
    root.addEventListener("click", (e) => this._onClick(e));
    root.addEventListener("input", (e) => this._onInput(e));
    root.addEventListener("change", (e) => this._onChange(e));
    root.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.classList?.contains("row")) {
        e.preventDefault();
        this._onClick(e);
      }
    });
  }

  static getStubConfig() {
    return { titel: "Opskrifter" };
  }

  setConfig(config) {
    this._config = config || {};
    this._key = "opskrift-card:" + (slug(this._config.titel) || "opskrifter");
    try { this._openId = localStorage.getItem(this._key + ":open") || null; } catch (e) { /* ignore */ }
    this._render();
  }

  set hass(h) {
    this._hass = h;
    if (!this._unsub && !this._subscribing && this.isConnected) this._subscribe();
  }

  connectedCallback() {
    if (this._hass && !this._unsub && !this._subscribing) this._subscribe();
  }

  disconnectedCallback() {
    if (this._unsub) {
      try { this._unsub(); } catch (e) { /* ignore */ }
      this._unsub = null;
    }
  }

  getCardSize() { return 8; }

  get _readonly() { return this._config?.kun_laes === true; }

  /* ---------- data ---------- */
  async _subscribe() {
    this._subscribing = true;
    try {
      this._unsub = await this._hass.connection.subscribeMessage(
        (msg) => this._onData(msg.opskrifter),
        { type: "opskrifter/subscribe" },
      );
      if (!this.isConnected) this.disconnectedCallback();
    } catch (err) {
      this._status = "error";
      this._error = err?.code === "unknown_command"
        ? "Integrationen Opskrifter er ikke sat op. Tilføj den under Indstillinger → Enheder og tjenester."
        : `Kunne ikke hente opskrifter: ${err?.message || err?.code || err}`;
      this._render();
    }
    this._subscribing = false;
  }

  _onData(list) {
    this._recipes = normalize(list);
    this._status = "ok";
    this._error = null;
    if (this._draft) return; // forstyr ikke en igangværende redigering
    this._render();
  }

  _legacy() {
    const names = new Set(this._recipes.map((r) => r.navn.trim().toLowerCase()));
    return normalize(this._config?.opskrifter || []).filter((r) => !names.has(r.navn.trim().toLowerCase()));
  }

  _modes(r) {
    const m = [];
    if (r.personer > 0) m.push({ id: "p", label: "Personer", base: r.personer, unit: "pers.", step: 1 });
    r.ingredienser.forEach((i, idx) => {
      if (i.noegle && i.maengde > 0) {
        m.push({
          id: "i" + idx, label: i.kort || cap(i.navn), base: i.maengde,
          unit: i.enhed || "", step: i.trin || defaultStep(i.enhed, i.maengde),
        });
      }
    });
    if (!m.length) m.push({ id: "f", label: "Faktor", base: 1, unit: "×", step: 0.5 });
    return m;
  }

  _getState(r) {
    if (!this._state[r.id]) {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(this._key + ":" + r.id)); } catch (e) { /* ignore */ }
      this._state[r.id] = { factor: 1, mode: null, spice: r.krydderistyrke / 100, ...(saved || {}) };
    }
    const s = this._state[r.id];
    const modes = this._modes(r);
    if (!modes.find((m) => m.id === s.mode)) s.mode = modes[0].id;
    if (!(s.factor > 0)) s.factor = 1;
    return s;
  }

  _saveState(r) {
    try { localStorage.setItem(this._key + ":" + r.id, JSON.stringify(this._state[r.id])); } catch (e) { /* ignore */ }
  }

  _scaled(i, s) {
    if (!(i.maengde > 0)) return null;
    if (i.skaler === false) return i.maengde;
    return roundAmount(i.maengde * s.factor * (i.krydderi ? s.spice : 1), i.enhed);
  }

  _groups(r) {
    const groups = new Map();
    r.ingredienser.forEach((i) => {
      const g = i.gruppe || "Ingredienser";
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(i);
    });
    return [...groups];
  }

  _summary(r, s) {
    const parts = [];
    const m = this._modes(r).find((x) => x.id === s.mode);
    if (m.id.startsWith("i")) parts.push(`${fmtAmount(roundAmount(m.base * s.factor, m.unit), m.unit)} ${m.unit} ${m.label.toLowerCase()}`);
    if (r.personer) {
      const p = Math.round(r.personer * s.factor * 2) / 2;
      parts.push(`${m.id === "p" ? "" : "ca. "}${fmtNum(p)} personer`);
    }
    if (m.id === "f") parts.push(`${fmtNum(s.factor)} × opskriften`);
    if (r.ingredienser.some((i) => i.krydderi) && Math.round(s.spice * 100) !== 100) {
      parts.push(`krydderier ${Math.round(s.spice * 100)} %`);
    }
    return cap(parts.join(", "));
  }

  /* ---------- visning ---------- */
  _render() {
    let body;
    if (this._draft) body = this._editor();
    else {
      const r = this._recipes.find((x) => x.id === this._openId);
      body = r ? this._detail(r) : this._list();
    }
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card style="${rgb(this._config?.farve)}">${body}</ha-card>`;
  }

  _list() {
    const c = this._config || {};
    const cats = [...new Set(this._recipes.map((r) => r.kategori).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "da"));
    const n = this._recipes.length;
    const legacy = this._status === "ok" && !this._readonly ? this._legacy() : [];
    const sub = this._status === "loading" ? "Henter…" : `${n} ${n === 1 ? "opskrift" : "opskrifter"}`;
    return `
      <div class="head">
        <div class="shape"><ha-icon icon="${esc(c.ikon || "mdi:chef-hat")}"></ha-icon></div>
        <div class="info">
          <div class="primary">${esc(c.titel || "Opskrifter")}</div>
          <div class="secondary">${sub}</div>
        </div>
        ${!this._readonly && this._status === "ok" ? `<button class="icon-btn" data-action="new" aria-label="Ny opskrift"><ha-icon icon="mdi:plus"></ha-icon></button>` : ""}
      </div>
      ${this._error ? `<div class="error">${esc(this._error)}</div>` : ""}
      ${this._notice ? `<div class="notice">${esc(this._notice)}</div>` : ""}
      ${legacy.length ? `<div class="notice">Kortets YAML har ${legacy.length} ${legacy.length === 1 ? "opskrift" : "opskrifter"}, som ikke er i databasen.
        <button class="link" data-action="import">Importér</button></div>` : ""}
      ${n > 1 ? `<input class="search" type="search" placeholder="Søg på navn eller ingrediens" value="${esc(this._q)}" data-input="search">` : ""}
      ${cats.length > 1 ? `<div class="chips">${["Alle", ...cats].map((k) =>
        `<button class="chip ${(k === "Alle" && !this._cat) || k === this._cat ? "on" : ""}" data-action="cat" data-value="${esc(k)}">${esc(k)}</button>`).join("")}</div>` : ""}
      <div class="list">${this._rows()}</div>`;
  }

  _rows() {
    if (this._status !== "ok") return "";
    if (!this._recipes.length) {
      return `<div class="empty">Ingen opskrifter endnu.${this._readonly ? "" : ` <button class="link" data-action="new">Opret den første</button>`}</div>`;
    }
    const q = this._q.trim().toLowerCase();
    const list = this._recipes.filter((r) =>
      (!this._cat || r.kategori === this._cat) &&
      (!q || [r.navn, r.kategori, ...r.ingredienser.map((i) => i.navn)].join(" ").toLowerCase().includes(q)));
    if (!list.length) return `<div class="empty">Ingen opskrifter matcher “${esc(this._q)}”.</div>`;
    return list.map((r) => `
      <div class="row" data-action="open" data-id="${esc(r.id)}" tabindex="0" role="button">
        <div class="shape" style="${rgb(r.farve)}"><ha-icon icon="${esc(r.ikon || "mdi:silverware-fork-knife")}"></ha-icon></div>
        <div class="info">
          <div class="primary">${esc(r.navn)}</div>
          <div class="secondary">${esc([r.personer ? `${fmtNum(r.personer)} pers.` : null, r.tid, r.kategori].filter(Boolean).join(", "))}</div>
        </div>
        <ha-icon class="chev" icon="mdi:chevron-right"></ha-icon>
      </div>`).join("");
  }

  _detail(r) {
    const s = this._getState(r);
    const modes = this._modes(r);
    const m = modes.find((x) => x.id === s.mode);
    const val = m.base * s.factor;
    const hasSpice = r.ingredienser.some((i) => i.krydderi);
    const spicePct = Math.round(s.spice * 100);
    const changed = Math.abs(s.factor - 1) > 1e-6 || spicePct !== r.krydderistyrke;
    const spiceOpts = [...new Set([50, 75, 100, 125, r.krydderistyrke])].sort((a, b) => a - b);
    const updated = r.opdateret ? new Date(r.opdateret).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" }) : null;

    return `
      <div class="head">
        <button class="icon-btn" data-action="back" aria-label="Tilbage til listen"><ha-icon icon="mdi:arrow-left"></ha-icon></button>
        <div class="shape" style="${rgb(r.farve)}"><ha-icon icon="${esc(r.ikon || "mdi:silverware-fork-knife")}"></ha-icon></div>
        <div class="info">
          <div class="primary big">${esc(r.navn)}</div>
          <div class="secondary">${esc([r.tid, r.kategori].filter(Boolean).join(", "))}</div>
        </div>
        ${this._readonly ? "" : `<button class="icon-btn" data-action="edit" aria-label="Redigér opskrift"><ha-icon icon="mdi:pencil-outline"></ha-icon></button>`}
        <button class="icon-btn" data-action="print" aria-label="Print opskrift"><ha-icon icon="mdi:printer-outline"></ha-icon></button>
      </div>
      ${r.billede ? `<img class="photo" src="${esc(r.billede)}" alt="">` : ""}
      <div style="${rgb(r.farve)}">
        <div class="panel">
          ${modes.length > 1 ? `<div class="label">Skalér efter</div><div class="chips">${modes.map((x) =>
            `<button class="chip ${x.id === m.id ? "on" : ""}" data-action="mode" data-value="${x.id}">${esc(x.label)}</button>`).join("")}</div>` : ""}
          <div class="stepper">
            <button class="step" data-action="dec" aria-label="Mindre"><ha-icon icon="mdi:minus"></ha-icon></button>
            <div class="value">
              <input type="text" inputmode="decimal" value="${esc(dkNum(+val.toFixed(2)))}" data-input="value" aria-label="${esc(m.label)}">
              <span class="unit">${esc(m.unit)}</span>
            </div>
            <button class="step" data-action="inc" aria-label="Mere"><ha-icon icon="mdi:plus"></ha-icon></button>
          </div>
          <div class="scaleinfo">
            <span>${esc(this._summary(r, s))}</span>
            ${changed ? `<button class="link" data-action="reset">Nulstil</button>` : ""}
          </div>
          ${hasSpice ? `<div class="label">Krydderier</div><div class="chips">${spiceOpts.map((p) =>
            `<button class="chip ${p === spicePct ? "on" : ""}" data-action="spice" data-value="${p}">${p} %</button>`).join("")}</div>` : ""}
        </div>
        ${this._groups(r).map(([g, items]) => `
          <div class="section">
            <div class="h">${esc(g)}</div>
            ${items.map((i) => {
              const v = this._scaled(i, s);
              const amt = v === null ? "" : `${fmtAmount(v, i.enhed)} ${esc(i.enhed || "")}`;
              const tag = i.krydderi && spicePct !== 100
                ? `<ha-icon class="tag" icon="mdi:shaker-outline" title="Krydderi justeret til ${spicePct} %"></ha-icon>` : "<span></span>";
              return `<div class="ing"><div class="amt">${amt}</div><div class="name">${esc(i.navn)}${i.note ? `<span class="note">${esc(i.note)}</span>` : ""}</div>${tag}</div>`;
            }).join("")}
          </div>`).join("")}
        ${r.fremgang.length ? `<div class="section"><div class="h">Fremgangsmåde</div><ol class="steps">${r.fremgang.map((t) => `<li>${esc(t)}</li>`).join("")}</ol></div>` : ""}
        ${r.noter ? `<div class="section"><div class="h">Noter</div><p class="notes">${esc(r.noter)}</p></div>` : ""}
        ${updated ? `<div class="meta">Senest rettet ${esc(updated)}${r.opdateret_af ? ` af ${esc(r.opdateret_af)}` : ""}</div>` : ""}
      </div>`;
  }

  /* ---------- editor ---------- */
  _newDraft(r) {
    if (r) {
      const d = JSON.parse(JSON.stringify(r));
      d.personer = dkNum(d.personer);
      d.ingredienser = d.ingredienser.map((i) => ({ ...i, maengde: dkNum(i.maengde) }));
      if (!d.ingredienser.length) d.ingredienser.push({ navn: "" });
      d.fremgangTekst = (d.fremgang || []).join("\n");
      return d;
    }
    return {
      navn: "", kategori: "", tid: "", personer: "4", ikon: "mdi:silverware-fork-knife",
      farve: "orange", krydderistyrke: 100, billede: "", noter: "", fremgangTekst: "",
      ingredienser: [{ navn: "" }, { navn: "" }, { navn: "" }],
    };
  }

  _field(label, f, val, o = {}) {
    return `<label class="fld"><span>${esc(label)}</span><input type="text" data-f="${f}" value="${esc(val ?? "")}"
      ${o.placeholder ? `placeholder="${esc(o.placeholder)}"` : ""} ${o.list ? `list="${o.list}"` : ""}
      ${o.mode ? `inputmode="${o.mode}"` : ""} autocomplete="off"></label>`;
  }

  _ifield(label, idx, k, val, o = {}) {
    return `<label class="fld"><span>${esc(label)}</span><input type="text" data-ing="${idx}" data-k="${k}" value="${esc(val ?? "")}"
      ${o.placeholder ? `placeholder="${esc(o.placeholder)}"` : ""} ${o.list ? `list="${o.list}"` : ""}
      ${o.mode ? `inputmode="${o.mode}"` : ""} autocomplete="off"></label>`;
  }

  _ingEditRows() {
    const list = this._draft.ingredienser;
    return list.map((i, idx) => `
      <div class="ingedit">
        <div class="cols3">
          ${this._ifield("Mængde", idx, "maengde", i.maengde, { mode: "decimal" })}
          ${this._ifield("Enhed", idx, "enhed", i.enhed, { list: "oc-units" })}
          ${this._ifield("Ingrediens", idx, "navn", i.navn)}
        </div>
        <div class="cols">
          ${this._ifield("Note", idx, "note", i.note, { placeholder: "Fx i fine tern" })}
          ${this._ifield("Gruppe", idx, "gruppe", i.gruppe, { placeholder: "Ingredienser", list: "oc-groups" })}
        </div>
        <div class="flags">
          <button class="chip sm ${i.krydderi ? "on" : ""}" data-action="flag" data-ing="${idx}" data-k="krydderi">Krydderi</button>
          <button class="chip sm ${i.noegle ? "on" : ""}" data-action="flag" data-ing="${idx}" data-k="noegle">Skalér efter denne</button>
          <button class="chip sm ${i.skaler === false ? "on" : ""}" data-action="flag" data-ing="${idx}" data-k="fast">Fast mængde</button>
          <span class="spacer"></span>
          <button class="icon-btn sm" data-action="ing-up" data-ing="${idx}" ${idx === 0 ? "disabled" : ""} aria-label="Flyt op"><ha-icon icon="mdi:arrow-up"></ha-icon></button>
          <button class="icon-btn sm" data-action="ing-down" data-ing="${idx}" ${idx === list.length - 1 ? "disabled" : ""} aria-label="Flyt ned"><ha-icon icon="mdi:arrow-down"></ha-icon></button>
          <button class="icon-btn sm" data-action="ing-del" data-ing="${idx}" aria-label="Fjern ingrediens"><ha-icon icon="mdi:trash-can-outline"></ha-icon></button>
        </div>
      </div>`).join("");
  }

  _editor() {
    const d = this._draft;
    const isNew = !d.id;
    const cats = [...new Set(this._recipes.map((r) => r.kategori).filter(Boolean))];
    const groups = [...new Set(["Ingredienser", "Serveres med", "Sauce", "Dressing", "Topping",
      ...this._recipes.flatMap((r) => r.ingredienser.map((i) => i.gruppe)).filter(Boolean)])];
    return `
      <div class="head">
        <button class="icon-btn" data-action="cancel" aria-label="Annullér"><ha-icon icon="mdi:close"></ha-icon></button>
        <div class="info"><div class="primary big">${isNew ? "Ny opskrift" : "Redigér opskrift"}</div></div>
        <button class="btn primary-btn" data-action="save" ${this._saving ? "disabled" : ""}>${this._saving ? "Gemmer…" : "Gem"}</button>
      </div>
      <div class="form" style="${rgb(d.farve)}">
        <datalist id="oc-cats">${cats.map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
        <datalist id="oc-units">${UNITS.map((u) => `<option value="${esc(u)}">`).join("")}</datalist>
        <datalist id="oc-groups">${groups.map((g) => `<option value="${esc(g)}">`).join("")}</datalist>
        ${this._field("Navn", "navn", d.navn, { placeholder: "Fx Nem smørkylling" })}
        <div class="cols">
          ${this._field("Kategori", "kategori", d.kategori, { list: "oc-cats", placeholder: "Fx Aftensmad" })}
          ${this._field("Tid", "tid", d.tid, { placeholder: "Fx 20 min" })}
        </div>
        <div class="cols">
          ${this._field("Personer", "personer", d.personer, { mode: "decimal" })}
          ${this._field("Krydderistyrke (%)", "krydderistyrke", d.krydderistyrke, { mode: "numeric" })}
        </div>
        <div class="cols">
          ${this._field("Ikon", "ikon", d.ikon, { placeholder: "mdi:food" })}
          <label class="fld"><span>Farve</span><select data-f="farve">${Object.entries(COLORS).map(([k, [l]]) =>
            `<option value="${k}" ${k === d.farve ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
        </div>
        ${this._field("Billede (URL, valgfrit)", "billede", d.billede, { placeholder: "/local/opskrifter/billede.jpg" })}
        <div class="h">Ingredienser</div>
        <div class="ings-edit">${this._ingEditRows()}</div>
        <button class="btn" data-action="ing-add"><ha-icon icon="mdi:plus"></ha-icon>Tilføj ingrediens</button>
        <div class="h">Fremgangsmåde</div>
        <label class="fld"><span>Ét trin pr. linje</span><textarea rows="7" data-f="fremgangTekst">${esc(d.fremgangTekst)}</textarea></label>
        <label class="fld"><span>Noter</span><textarea rows="3" data-f="noter">${esc(d.noter)}</textarea></label>
        ${this._formError ? `<div class="error">${esc(this._formError)}</div>` : ""}
        <div class="actions">
          ${isNew ? "" : `<button class="btn danger" data-action="delete">${this._confirmDelete ? "Tryk igen for at slette" : "Slet opskrift"}</button>`}
          <div class="right">
            <button class="btn" data-action="cancel">Annullér</button>
            <button class="btn primary-btn" data-action="save" ${this._saving ? "disabled" : ""}>${this._saving ? "Gemmer…" : "Gem"}</button>
          </div>
        </div>
      </div>`;
  }

  _rerenderIngredients() {
    const box = this.shadowRoot.querySelector(".ings-edit");
    if (box) box.innerHTML = this._ingEditRows();
  }

  _buildRecipe() {
    const d = this._draft;
    const num = (v) => {
      const s = txt(v).replace(",", ".");
      if (!s) return null;
      const n = Number(s);
      return Number.isFinite(n) && n > 0 ? n : NaN;
    };
    if (!txt(d.navn)) throw new Error("Giv opskriften et navn.");
    const r = { navn: txt(d.navn) };
    if (d.id) r.id = d.id;
    for (const k of ["kategori", "tid", "ikon", "farve", "billede", "noter"]) if (txt(d[k])) r[k] = txt(d[k]);
    const p = num(d.personer);
    if (Number.isNaN(p)) throw new Error("Personer skal være et tal.");
    if (p) r.personer = p;
    const ks = num(d.krydderistyrke);
    if (Number.isNaN(ks) || (ks && (ks < 10 || ks > 300))) throw new Error("Krydderistyrke skal være mellem 10 og 300 %.");
    r.krydderistyrke = ks ? Math.round(ks) : 100;
    r.ingredienser = [];
    d.ingredienser.forEach((i, n) => {
      if (!txt(i.navn)) {
        if (txt(i.maengde) || txt(i.enhed)) throw new Error(`Ingrediens ${n + 1} mangler et navn.`);
        return;
      }
      const o = { navn: txt(i.navn) };
      const m = num(i.maengde);
      if (Number.isNaN(m)) throw new Error(`Mængden for ${o.navn} skal være et tal.`);
      if (m) o.maengde = m;
      for (const k of ["enhed", "note", "gruppe", "kort"]) if (txt(i[k])) o[k] = txt(i[k]);
      if (i.krydderi) o.krydderi = true;
      if (i.noegle) {
        if (!m) throw new Error(`${cap(o.navn)} skal have en mængde for at kunne skalere efter den.`);
        o.noegle = true;
      }
      if (i.skaler === false) o.skaler = false;
      if (i.trin > 0) o.trin = Number(i.trin);
      r.ingredienser.push(o);
    });
    r.fremgang = txt(d.fremgangTekst).split("\n")
      .map((s) => s.replace(/^\s*\d+[.)]\s*/, "").trim())
      .filter(Boolean);
    return r;
  }

  async _save() {
    let recipe;
    try {
      recipe = this._buildRecipe();
    } catch (err) {
      this._formError = err.message;
      return this._render();
    }
    this._saving = true;
    this._formError = null;
    this._render();
    try {
      const res = await this._hass.callWS({ type: "opskrifter/save", opskrift: recipe });
      const saved = normalize([res.opskrift])[0];
      this._recipes = normalize([...this._recipes.filter((r) => r.id !== saved.id), saved]);
      delete this._state[saved.id];
      this._draft = null;
      this._setOpen(saved.id, false);
    } catch (err) {
      this._formError = `Kunne ikke gemme: ${err?.message || err?.code || err}`;
    }
    this._saving = false;
    this._render();
  }

  async _delete() {
    if (!this._confirmDelete) {
      this._confirmDelete = true;
      return this._render();
    }
    try {
      await this._hass.callWS({ type: "opskrifter/delete", id: this._draft.id });
      this._recipes = this._recipes.filter((r) => r.id !== this._draft.id);
      this._draft = null;
      this._setOpen(null, false);
    } catch (err) {
      this._formError = `Kunne ikke slette: ${err?.message || err?.code || err}`;
    }
    this._confirmDelete = false;
    this._render();
  }

  async _import() {
    const list = this._legacy().map(({ id, ...rest }) => rest);
    try {
      const res = await this._hass.callWS({ type: "opskrifter/import", opskrifter: list });
      this._notice = `${res.importeret} ${res.importeret === 1 ? "opskrift" : "opskrifter"} importeret. Du kan nu fjerne "opskrifter:" fra kortets YAML.`;
    } catch (err) {
      this._notice = `Import fejlede: ${err?.message || err?.code || err}`;
    }
    this._render();
  }

  /* ---------- hændelser ---------- */
  _current() {
    return this._recipes.find((x) => x.id === this._openId);
  }

  _setOpen(id, render = true) {
    this._openId = id;
    this._notice = null;
    try {
      if (id) localStorage.setItem(this._key + ":open", id);
      else localStorage.removeItem(this._key + ":open");
    } catch (e) { /* ignore */ }
    if (render) this._render();
  }

  _onClick(e) {
    const el = e.target.closest("[data-action]");
    if (!el || el.disabled) return;
    const a = el.dataset.action;

    // liste og navigation
    if (a === "open") return this._setOpen(el.dataset.id);
    if (a === "back") return this._setOpen(null);
    if (a === "cat") {
      this._cat = el.dataset.value === "Alle" ? null : el.dataset.value;
      return this._render();
    }
    if (a === "import") return this._import();
    if (a === "new" || a === "edit") {
      this._draft = this._newDraft(a === "edit" ? this._current() : null);
      this._formError = null;
      this._confirmDelete = false;
      return this._render();
    }

    // editor
    if (this._draft) {
      const d = this._draft;
      const idx = Number(el.dataset.ing);
      if (a === "cancel") { this._draft = null; return this._render(); }
      if (a === "save") return this._save();
      if (a === "delete") return this._delete();
      if (a === "ing-add") {
        d.ingredienser.push({ navn: "" });
        this._rerenderIngredients();
        const inputs = this.shadowRoot.querySelectorAll('.ings-edit input[data-k="maengde"]');
        inputs[inputs.length - 1]?.focus();
        return;
      }
      if (a === "ing-del") { d.ingredienser.splice(idx, 1); return this._rerenderIngredients(); }
      if (a === "ing-up" && idx > 0) {
        [d.ingredienser[idx - 1], d.ingredienser[idx]] = [d.ingredienser[idx], d.ingredienser[idx - 1]];
        return this._rerenderIngredients();
      }
      if (a === "ing-down" && idx < d.ingredienser.length - 1) {
        [d.ingredienser[idx + 1], d.ingredienser[idx]] = [d.ingredienser[idx], d.ingredienser[idx + 1]];
        return this._rerenderIngredients();
      }
      if (a === "flag") {
        const i = d.ingredienser[idx];
        const k = el.dataset.k;
        if (k === "fast") {
          if (i.skaler === false) delete i.skaler; else i.skaler = false;
          el.classList.toggle("on", i.skaler === false);
        } else {
          i[k] = !i[k];
          el.classList.toggle("on", !!i[k]);
        }
        return;
      }
      return;
    }

    // detaljevisning
    const r = this._current();
    if (!r) return;
    if (a === "print") return this._print(r);
    const s = this._getState(r);
    const m = this._modes(r).find((x) => x.id === s.mode);
    if (a === "mode") {
      s.mode = el.dataset.value;
    } else if (a === "inc" || a === "dec") {
      const cur = m.base * s.factor;
      let next = a === "inc"
        ? Math.floor(cur / m.step + 1e-9) * m.step + m.step
        : Math.ceil(cur / m.step - 1e-9) * m.step - m.step;
      if (next <= 0) next = m.step;
      s.factor = next / m.base;
    } else if (a === "spice") {
      s.spice = Number(el.dataset.value) / 100;
    } else if (a === "reset") {
      s.factor = 1;
      s.spice = r.krydderistyrke / 100;
    } else {
      return;
    }
    this._saveState(r);
    this._render();
  }

  _onInput(e) {
    const t = e.target;
    if (t.dataset.input === "search") {
      this._q = t.value;
      const list = this.shadowRoot.querySelector(".list");
      if (list) list.innerHTML = this._rows();
      return;
    }
    if (!this._draft) return;
    if (t.dataset.f) this._draft[t.dataset.f] = t.value;
    else if (t.dataset.ing !== undefined) this._draft.ingredienser[Number(t.dataset.ing)][t.dataset.k] = t.value;
  }

  _onChange(e) {
    const t = e.target;
    if (this._draft && t.dataset.f === "farve") {
      this._draft.farve = t.value;
      this.shadowRoot.querySelector(".form")?.setAttribute("style", rgb(t.value));
      return;
    }
    if (t.dataset.input !== "value") return;
    const r = this._current();
    if (!r) return;
    const s = this._getState(r);
    const m = this._modes(r).find((x) => x.id === s.mode);
    const v = parseFloat(String(t.value).replace(",", "."));
    if (v > 0) {
      s.factor = v / m.base;
      this._saveState(r);
    }
    this._render();
  }

  /* ---------- print ---------- */
  _print(r) {
    const s = this._getState(r);
    const groups = this._groups(r).map(([g, items]) => `
      <h2>${esc(g)}</h2>
      <table>${items.map((i) => {
        const v = this._scaled(i, s);
        return `<tr><td class="a">${v === null ? "" : `${fmtAmount(v, i.enhed)} ${esc(i.enhed || "")}`}</td>
          <td>${esc(i.navn)}${i.note ? `<div class="n">${esc(i.note)}</div>` : ""}</td></tr>`;
      }).join("")}</table>`).join("");
    const html = `<!doctype html><html lang="da"><head><meta charset="utf-8"><title>${esc(r.navn)}</title>
      <style>${PRINT_STYLE}</style></head><body>
      <h1>${esc(r.navn)}</h1>
      <p class="sub">${esc([this._summary(r, s), r.tid].filter(Boolean).join(", "))}</p>
      ${groups}
      ${r.fremgang.length ? `<h2>Fremgangsmåde</h2><ol>${r.fremgang.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>` : ""}
      ${r.noter ? `<h2>Noter</h2><p class="notes">${esc(r.noter)}</p>` : ""}
      </body></html>`;

    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    doc.open();
    doc.write(html);
    doc.close();
    const cleanup = () => setTimeout(() => frame.remove(), 500);
    frame.contentWindow.addEventListener("afterprint", cleanup);
    setTimeout(() => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch (err) {
        cleanup();
      }
    }, 250);
    setTimeout(() => frame.isConnected && frame.remove(), 120000);
  }
}

if (!customElements.get("opskrift-card")) {
  customElements.define("opskrift-card", OpskriftCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "opskrift-card",
    name: "Opskrift-kort",
    description: "Opskriftssamling med redigering og skalering efter personer, nøgleingrediens og krydderistyrke",
  });
  console.info(`%c OPSKRIFT-CARD %c v${OC_VERSION} `,
    "color:#fff;background:#ff9800;font-weight:700;border-radius:3px 0 0 3px",
    "color:#ff9800;background:#fff3e0;border-radius:0 3px 3px 0");
}
