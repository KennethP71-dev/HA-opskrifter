/*
 * Opskrift-card – frontend til integrationen Opskrifter
 * Indlæses automatisk af integrationen. Kort-type: custom:opskrift-card
 */
const OC_VERSION = "1.2.1";

const COLORS = {
  red: ["Rød", "244, 67, 54"], pink: ["Pink", "233, 30, 99"], purple: ["Lilla", "156, 39, 176"],
  indigo: ["Indigo", "63, 81, 181"], blue: ["Blå", "33, 150, 243"], cyan: ["Cyan", "0, 188, 212"],
  teal: ["Petrol", "0, 150, 136"], green: ["Grøn", "76, 175, 80"], "light-green": ["Lysegrøn", "139, 195, 74"],
  amber: ["Rav", "255, 193, 7"], orange: ["Orange", "255, 152, 0"], "deep-orange": ["Dyb orange", "255, 87, 34"],
  brown: ["Brun", "121, 85, 72"], grey: ["Grå", "158, 158, 158"],
};
const UNITS = ["g", "kg", "ml", "dl", "l", "tsk.", "spsk.", "fed", "nip", "stk.", "dåse", "bdt.", "skiver"];
const IMAGE_ID = /^[0-9a-f]{32}$/;
const TAG_SUGGESTIONS = ["Kylling", "Oksekød", "Svinekød", "Lam", "Fisk", "Skaldyr", "Vegetar", "Grøntsager",
  "Pasta", "Ris", "Suppe", "Salat", "Spicy", "Hurtig", "Børnevenlig", "Fest", "Dessert"];
const SORTS = [["navn", "Navn"], ["sidst", "Senest lavet"], ["laengst", "Længst siden"],
  ["populaer", "Mest lavet"], ["bedst", "Bedst bedømt"]];
const isoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayIso = () => isoDate(new Date());
const yesterdayIso = () => { const d = new Date(); d.setDate(d.getDate() - 1); return isoDate(d); };
const parseIso = (iso) => { const [y, m, d] = String(iso).split("-").map(Number); return new Date(y, m - 1, d); };
function relDate(iso) {
  if (!iso) return "";
  const then = parseIso(iso);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = Math.round((now - then) / 86400000);
  if (days === 0) return "i dag";
  if (days === 1) return "i går";
  if (days > 1 && days < 14) return `for ${days} dage siden`;
  if (days >= 14 && days < 63) return `for ${Math.round(days / 7)} uger siden`;
  return then.toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
}
const fmtDate = (iso) =>
  parseIso(iso).toLocaleDateString("da-DK", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
const fmtStars = (v) => v.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

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
const imgUrl = (ref, thumb = false) =>
  IMAGE_ID.test(ref || "") ? `/api/opskrifter/billede/${ref}${thumb ? "?thumb=1" : ""}` : ref;

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
      fremgang: (r.fremgang || []).map((s) =>
        typeof s === "string" ? { tekst: s, billeder: [] } : { tekst: s?.tekst || "", billeder: s?.billeder || [] }),
      krydderistyrke: r.krydderistyrke ?? 100,
      maerker: Array.isArray(r.maerker) ? r.maerker : [],
      historik: [...(Array.isArray(r.historik) ? r.historik : [])].sort().reverse(),
      vurderinger: r.vurderinger && typeof r.vurderinger === "object" ? r.vurderinger : {},
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
.shape{flex:none;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(var(--oc-rgb),.2);color:rgb(var(--oc-rgb));--mdc-icon-size:22px;background-size:cover;background-position:center}
.icon-btn{flex:none;width:36px;height:36px;border-radius:50%;border:none;padding:0;background:transparent;color:var(--primary-text-color);cursor:pointer;display:flex;align-items:center;justify-content:center;--mdc-icon-size:20px}
.icon-btn:hover{background:rgba(var(--rgb-primary-text-color,0,0,0),.06)}
.icon-btn:disabled{opacity:.3;cursor:default}
.search{width:100%;box-sizing:border-box;height:40px;border-radius:12px;border:none;padding:0 14px;margin:4px 0 8px;font:inherit;font-size:14px;background:rgba(var(--rgb-primary-text-color,0,0,0),.05);color:var(--primary-text-color);outline:none}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px}
.chip{height:32px;padding:0 12px;border-radius:16px;border:none;font:inherit;font-size:12px;font-weight:600;cursor:pointer;background:rgba(var(--rgb-primary-text-color,0,0,0),.05);color:var(--primary-text-color)}
.chip.on{background:rgba(var(--oc-rgb),.22);color:rgb(var(--oc-rgb))}
.list{display:flex;flex-direction:column;gap:2px}
.row{display:flex;align-items:center;gap:12px;padding:8px;border-radius:12px;cursor:pointer}
.row:hover{background:rgba(var(--rgb-primary-text-color,0,0,0),.04)}
.row .shape{width:44px;height:44px;--mdc-icon-size:20px}
.chev{color:var(--secondary-text-color);--mdc-icon-size:20px}
.empty,.error,.notice{padding:12px 8px;font-size:13px;line-height:1.5;color:var(--secondary-text-color)}
.error{color:var(--error-color,#db4437)}
.notice{background:rgba(var(--oc-rgb),.08);border-radius:12px;padding:10px 12px;margin:0 0 8px;color:var(--primary-text-color)}
.hero{display:block;width:100%;padding:0;border:none;background:none;cursor:zoom-in;margin:4px 0 10px}
.hero img{width:100%;max-height:280px;object-fit:cover;border-radius:14px;display:block}
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
.h{font-size:14px;font-weight:700;color:var(--primary-text-color);margin:0 0 6px}
.ing{display:grid;grid-template-columns:96px 1fr auto;gap:12px;align-items:baseline;padding:7px 0;border-bottom:1px solid var(--divider-color)}
.ing:last-child{border-bottom:none}
.amt{font-weight:700;font-size:14px;color:var(--primary-text-color);white-space:nowrap;font-variant-numeric:tabular-nums}
.name{font-size:14px;color:var(--primary-text-color)}
.note{display:block;font-size:12px;color:var(--secondary-text-color)}
.tag{--mdc-icon-size:16px;color:rgb(var(--oc-rgb))}
.steps{margin:0;padding-left:22px;font-size:14px;line-height:1.5;color:var(--primary-text-color)}
.steps li{padding:4px 0 6px 4px}
.steps li::marker{font-weight:700;color:rgb(var(--oc-rgb))}
.thumbs{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.thumb{width:92px;height:92px;padding:0;border:none;border-radius:10px;overflow:hidden;cursor:zoom-in;background:rgba(var(--rgb-primary-text-color,0,0,0),.06)}
.thumb img{width:100%;height:100%;object-fit:cover;display:block}
.notes{margin:0;font-size:13px;line-height:1.5;color:var(--secondary-text-color);white-space:pre-line}
.meta{font-size:11px;color:var(--secondary-text-color);margin:0 4px 4px}
.lightbox{position:fixed;inset:0;z-index:20;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;cursor:zoom-out}
.lightbox img{max-width:100%;max-height:100%;border-radius:8px;object-fit:contain}
.lightbox .icon-btn{position:absolute;top:12px;right:12px;color:#fff;background:rgba(255,255,255,.12)}
.search:focus-visible,.chip:focus-visible,.row:focus-visible,.step:focus-visible,.icon-btn:focus-visible,.link:focus-visible,.thumb:focus-visible,.hero:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}

.toolbar{display:flex;gap:8px;align-items:center;margin:4px 0 8px}
.toolbar .search{margin:0;flex:1;min-width:0}
.sort{flex:none;height:40px;border-radius:12px;border:none;padding:0 10px;font:inherit;font-size:13px;font-weight:600;background:rgba(var(--rgb-primary-text-color,0,0,0),.05);color:var(--primary-text-color);max-width:45%}
.chips.tags{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
.chips.tags::-webkit-scrollbar{display:none}
.chips.tags .chip{flex:none}
.meta-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.meta-row .s{display:inline-flex;align-items:center;gap:3px;--mdc-icon-size:14px}
.meta-row .s.star-c{color:rgb(var(--rgb-amber-color,255,193,7));font-weight:700}
.tagline{display:flex;flex-wrap:wrap;gap:6px;margin:0 4px 12px}
.tagline span{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;background:rgba(var(--oc-rgb),.14);color:rgb(var(--oc-rgb))}
.panel .h{margin-bottom:10px}
.made{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin:0 0 8px}
.made .big{font-size:18px;font-weight:700;color:var(--primary-text-color)}
.chip.accent{background:rgba(var(--oc-rgb),.22);color:rgb(var(--oc-rgb))}
.chip.date{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:6px;--mdc-icon-size:16px}
.chip.date input{position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;font-size:16px}
.hist summary{cursor:pointer;font-size:12px;font-weight:600;color:var(--secondary-text-color);margin:2px 0 4px}
.hist ul{list-style:none;margin:2px 0 6px;padding:0}
.hist li{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 0;font-size:13px;color:var(--primary-text-color);border-bottom:1px solid var(--divider-color)}
.hist li:last-child{border-bottom:none}
.hist .icon-btn{width:30px;height:30px;--mdc-icon-size:16px;color:var(--secondary-text-color)}
.divider{height:1px;background:var(--divider-color);margin:12px 0}
.rate{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:1px 0}
.rate .who{font-size:14px;font-weight:600;color:var(--primary-text-color);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.stars{display:flex;flex:none}
.star{width:36px;height:36px;border:none;background:none;padding:0;cursor:pointer;color:var(--secondary-text-color);--mdc-icon-size:24px;display:flex;align-items:center;justify-content:center}
.star.on{color:rgb(var(--rgb-amber-color,255,193,7))}
.star:focus-visible{outline:2px solid var(--primary-color);outline-offset:-2px;border-radius:8px}
.printnote{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.printnote a.open{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px;border-radius:12px;background:rgb(var(--oc-rgb));color:#fff;font-weight:700;font-size:13px;text-decoration:none;--mdc-icon-size:18px}
.avg{font-size:12px;font-weight:700;color:rgb(var(--rgb-amber-color,255,193,7))}

/* ---------- editor: altid lyst tema ---------- */
ha-card.editing{--ha-card-background:#eef0f3;background:#eef0f3;color:#1c1f24;padding:0}
.editor{--e-bg:#eef0f3;--e-surface:#fff;--e-sub:#f6f7f9;--e-text:#1c1f24;--e-muted:#5c636e;--e-border:#c9ced6;
  --e-accent:color-mix(in srgb, rgb(var(--oc-rgb)) 72%, #000);--e-tint:rgba(var(--oc-rgb),.12);
  color:var(--e-text);font-size:14px;padding:0 0 12px}
.e-top{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--e-surface);border-bottom:1px solid var(--e-border)}
.e-top .title{flex:1;font-size:17px;font-weight:700}
.editor .icon-btn{color:var(--e-text)}
.editor .icon-btn:hover{background:rgba(0,0,0,.06)}
.e-card{background:var(--e-surface);border:1px solid var(--e-border);border-radius:14px;margin:12px 12px 0;padding:14px}
.e-card > .e-h{font-size:15px;font-weight:700;margin:0 0 12px;display:flex;align-items:center;gap:8px}
.e-h .count{font-size:12px;font-weight:600;color:var(--e-muted)}
.fld{display:flex;flex-direction:column;gap:5px;margin:0 0 12px;min-width:0}
.fld > span{font-size:12px;font-weight:600;color:var(--e-muted)}
.fld input,.fld select,.fld textarea{box-sizing:border-box;width:100%;min-width:0;border:1px solid var(--e-border);border-radius:10px;padding:10px 11px;font:inherit;font-size:15px;background:#fff;color:var(--e-text);outline:none}
.fld textarea{resize:vertical;line-height:1.45}
.fld input::placeholder,.fld textarea::placeholder{color:#9aa1ab}
.fld input:focus,.fld select:focus,.fld textarea:focus{border-color:var(--e-accent);box-shadow:0 0 0 3px var(--e-tint)}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.cols3{display:grid;grid-template-columns:84px 96px 1fr;gap:10px}
.e-hint{font-size:12px;color:var(--e-muted);margin:-4px 0 10px;line-height:1.4}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:38px;padding:0 14px;border-radius:10px;border:1px solid var(--e-border);font:inherit;font-size:14px;font-weight:600;cursor:pointer;background:#fff;color:var(--e-text);--mdc-icon-size:18px;white-space:nowrap}
.btn:hover{background:var(--e-sub)}
.btn.primary-btn{background:var(--e-accent);border-color:var(--e-accent);color:#fff}
.btn.danger{color:#b3261e;border-color:#e8b4b0}
.btn.quiet{border-color:transparent;background:transparent;color:var(--e-muted)}
.btn:disabled{opacity:.5;cursor:default}
.btn:focus-visible,.ing-head:focus-visible,.toggle:focus-visible{outline:2px solid var(--e-accent);outline-offset:2px}
.mainimg{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.mainimg img{width:140px;height:96px;object-fit:cover;border-radius:10px;border:1px solid var(--e-border)}
.mainimg .ph{width:140px;height:96px;border-radius:10px;border:1px dashed var(--e-border);display:flex;align-items:center;justify-content:center;color:var(--e-muted);--mdc-icon-size:28px;background:var(--e-sub)}
.upload{position:relative;overflow:hidden}
.upload input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
.ing-list{border:1px solid var(--e-border);border-radius:12px;overflow:hidden}
.ing-item + .ing-item{border-top:1px solid var(--e-border)}
.ing-head{display:flex;align-items:center;gap:12px;width:100%;box-sizing:border-box;padding:11px 12px;border:none;background:#fff;font:inherit;color:var(--e-text);text-align:left;cursor:pointer}
.ing-head:hover{background:var(--e-sub)}
.ing-item.open .ing-head{background:var(--e-tint)}
.num{flex:none;width:26px;height:26px;border-radius:50%;background:var(--e-sub);border:1px solid var(--e-border);font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;color:var(--e-muted)}
.ing-item.open .num{background:var(--e-accent);border-color:var(--e-accent);color:#fff}
.t-main{flex:1;min-width:0;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.t-name{font-size:15px;font-weight:700}
.t-name.empty{color:#9aa1ab;font-weight:600;font-style:italic}
.t-amt{font-size:14px;color:var(--e-muted);font-variant-numeric:tabular-nums}
.badge{font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:var(--e-tint);color:var(--e-accent)}
.badge.grey{background:#e7e9ed;color:#4a515c}
.ing-head ha-icon{color:var(--e-muted);--mdc-icon-size:20px;flex:none}
.ing-body{padding:14px 12px 4px 50px;background:var(--e-sub);border-top:1px solid var(--e-border);box-shadow:inset 3px 0 0 var(--e-accent)}
.toggles{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}
.toggle{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 12px 0 8px;border-radius:999px;border:1px solid var(--e-border);background:#fff;font:inherit;font-size:13px;font-weight:600;color:var(--e-text);cursor:pointer;--mdc-icon-size:18px}
.toggle ha-icon{color:#9aa1ab}
.toggle.on{background:var(--e-tint);border-color:var(--e-accent);color:var(--e-accent)}
.toggle.on ha-icon{color:var(--e-accent)}
.row-actions{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;padding:0 0 10px}
.add-row{margin-top:10px}
.step-item{display:grid;grid-template-columns:26px 1fr;gap:12px;padding:12px 0;border-top:1px solid var(--e-border)}
.step-item:first-child{border-top:none;padding-top:0}
.step-item .num{margin-top:8px;background:var(--e-accent);border-color:var(--e-accent);color:#fff}
.step-item textarea{box-sizing:border-box;width:100%;border:1px solid var(--e-border);border-radius:10px;padding:10px 11px;font:inherit;font-size:15px;line-height:1.45;background:#fff;color:var(--e-text);outline:none;resize:vertical}
.step-item textarea:focus{border-color:var(--e-accent);box-shadow:0 0 0 3px var(--e-tint)}
.e-thumbs{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 0}
.e-thumb{position:relative;width:84px;height:84px}
.e-thumb img{width:100%;height:100%;object-fit:cover;border-radius:10px;border:1px solid var(--e-border);display:block}
.e-thumb .x{position:absolute;top:-6px;right:-6px;width:26px;height:26px;border-radius:50%;border:none;background:#1c1f24;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;--mdc-icon-size:16px;padding:0}
.step-tools{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px}
.step-tools .spacer{flex:1}
.e-error{margin:12px 12px 0;padding:10px 12px;border-radius:10px;background:#fdecea;color:#8c1d18;font-size:14px}
.e-bottom{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:14px 12px 0}
.e-bottom .right{display:flex;gap:8px;margin-left:auto}
.busy{font-size:13px;color:var(--e-muted)}
.tag-pick{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}
.e-card.ai{border-color:var(--e-accent);background:linear-gradient(0deg,var(--e-tint),var(--e-tint)),#fff}
.ai-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.spinner{width:18px;height:18px;border-radius:50%;border:2px solid var(--e-tint);border-top-color:var(--e-accent);animation:spin 0.9s linear infinite;flex:none}
@keyframes spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.spinner{animation-duration:3s}}
.add-tag,.fam-row{display:flex;gap:8px;align-items:center}
.fam-row{margin:0 0 8px}
.add-tag input,.fam-row input{flex:1;box-sizing:border-box;min-width:0;border:1px solid var(--e-border);border-radius:10px;padding:9px 11px;font:inherit;font-size:15px;background:#fff;color:var(--e-text);outline:none}
.add-tag input:focus,.fam-row input:focus{border-color:var(--e-accent);box-shadow:0 0 0 3px var(--e-tint)}
@media (max-width:520px){
  .cols{grid-template-columns:1fr}
  .cols3{grid-template-columns:76px 88px 1fr}
  .ing-body{padding-left:12px}
}
`;

const PRINT_STYLE = `
@page{size:A4;margin:18mm 20mm}
body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#222;font-size:11pt;line-height:1.45}
h1{font-size:20pt;margin:0 0 2pt}
.sub{color:#666;margin:0 0 12pt}
.hero{width:100%;max-height:70mm;object-fit:cover;border-radius:4mm;margin:0 0 6pt}
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
    this._openIng = null;
    this._uploading = 0;
    this._saving = false;
    this._confirmDelete = false;
    this._formError = null;
    this._notice = null;
    this._lightbox = null;
    this._retry = null;
    this._familie = [];
    this._tags = new Set();
    this._sort = "navn";
    this._famDraft = null;
    this._newTag = "";
    this._histOpen = false;
    this._aiBusy = false;
    this._printLink = null;
    this._printBusy = false;
    const root = this.shadowRoot;
    root.addEventListener("click", (e) => this._onClick(e));
    root.addEventListener("input", (e) => this._onInput(e));
    root.addEventListener("change", (e) => this._onChange(e));
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._lightbox) {
        this._lightbox = null;
        this._render();
        return;
      }
      if (e.key === "Enter" && e.target.dataset?.input === "newtag") {
        e.preventDefault();
        this._addTag();
        return;
      }
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
    try {
      this._openId = localStorage.getItem(this._key + ":open") || null;
      this._sort = localStorage.getItem(this._key + ":sort") || "navn";
    } catch (e) { /* ignore */ }
    this._render();
  }

  set hass(h) {
    this._hass = h;
    if (!this._unsub && !this._subscribing && !this._retry && this.isConnected) this._subscribe();
  }

  connectedCallback() {
    if (this._hass && !this._unsub && !this._subscribing && !this._retry) this._subscribe();
  }

  disconnectedCallback() {
    clearTimeout(this._retry);
    this._retry = null;
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
        (msg) => this._onData(msg),
        { type: "opskrifter/subscribe" },
      );
      if (!this.isConnected) this.disconnectedCallback();
    } catch (err) {
      this._status = "error";
      this._error = err?.code === "unknown_command" || err?.code === "not_loaded"
        ? "Venter på at integrationen Opskrifter starter… Er den ikke sat op, så tilføj den under Indstillinger → Enheder og tjenester."
        : `Kunne ikke hente opskrifter: ${err?.message || err?.code || err}. Prøver igen…`;
      this._render();
      this._retry = setTimeout(() => {
        this._retry = null;
        if (this.isConnected && !this._unsub) this._subscribe();
      }, 5000);
    }
    this._subscribing = false;
  }

  _onData(data) {
    this._recipes = normalize(data?.opskrifter);
    this._familie = Array.isArray(data?.familie) ? data.familie : [];
    this._status = "ok";
    this._error = null;
    if (this._draft || this._famDraft) return; // forstyr ikke en igangværende redigering
    this._render();
  }

  _legacy() {
    const names = new Set(this._recipes.map((r) => r.navn.trim().toLowerCase()));
    return normalize(this._config?.opskrifter || []).filter((r) => !names.has(r.navn.trim().toLowerCase()));
  }

  _avg(r) {
    const vals = this._familie.map((p) => Number(r.vurderinger[p.id]) || 0).filter((v) => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  _allTags() {
    const count = new Map();
    this._recipes.forEach((r) => r.maerker.forEach((t) => count.set(t, (count.get(t) || 0) + 1)));
    return [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "da")).map(([t]) => t);
  }

  _sorted(list) {
    const last = (r) => r.historik[0] || "";
    const name = (a, b) => a.navn.localeCompare(b.navn, "da");
    const cmp = {
      navn: name,
      sidst: (a, b) => last(b).localeCompare(last(a)) || name(a, b),
      laengst: (a, b) => (last(a) || "9999").localeCompare(last(b) || "9999") || name(a, b),
      populaer: (a, b) => b.historik.length - a.historik.length || name(a, b),
      bedst: (a, b) => (this._avg(b) ?? -1) - (this._avg(a) ?? -1) || name(a, b),
    }[this._sort] || name;
    return [...list].sort(cmp);
  }

  async _ws(msg) {
    try {
      return await this._hass.callWS(msg);
    } catch (err) {
      this._notice = `Det lykkedes ikke: ${err?.message || err?.code || err}`;
      this._render();
      return null;
    }
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
    let cls = "";
    if (this._famDraft) {
      body = this._familyEditor();
      cls = "editing";
    } else if (this._draft) {
      body = this._editor();
      cls = "editing";
    } else {
      const r = this._recipes.find((x) => x.id === this._openId);
      body = r ? this._detail(r) : this._list();
    }
    const lightbox = this._lightbox
      ? `<div class="lightbox" data-action="close-lightbox"><img src="${esc(this._lightbox)}" alt="">
          <button class="icon-btn" data-action="close-lightbox" aria-label="Luk billede"><ha-icon icon="mdi:close"></ha-icon></button></div>`
      : "";
    this.shadowRoot.innerHTML =
      `<style>${STYLE}</style><ha-card class="${cls}" style="${rgb(this._config?.farve)}">${body}</ha-card>${lightbox}`;
  }

  _shape(r) {
    if (r.billede) {
      return `<div class="shape" style="${rgb(r.farve)}background-image:url('${esc(imgUrl(r.billede, true))}')"></div>`;
    }
    return `<div class="shape" style="${rgb(r.farve)}"><ha-icon icon="${esc(r.ikon || "mdi:silverware-fork-knife")}"></ha-icon></div>`;
  }

  _list() {
    const c = this._config || {};
    const cats = [...new Set(this._recipes.map((r) => r.kategori).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "da"));
    const n = this._recipes.length;
    const legacy = this._status === "ok" && !this._readonly ? this._legacy() : [];
    const sub = this._status === "loading" ? "Henter…" : `${n} ${n === 1 ? "opskrift" : "opskrifter"}`;
    const tags = this._allTags();
    return `
      <div class="head">
        <div class="shape"><ha-icon icon="${esc(c.ikon || "mdi:chef-hat")}"></ha-icon></div>
        <div class="info">
          <div class="primary">${esc(c.titel || "Opskrifter")}</div>
          <div class="secondary">${sub}</div>
        </div>
        ${!this._readonly && this._status === "ok" ? `
          <button class="icon-btn" data-action="settings" aria-label="Familie"><ha-icon icon="mdi:account-group-outline"></ha-icon></button>
          <button class="icon-btn" data-action="new" aria-label="Ny opskrift"><ha-icon icon="mdi:plus"></ha-icon></button>` : ""}
      </div>
      ${this._error ? `<div class="error">${esc(this._error)}</div>` : ""}
      ${this._notice ? `<div class="notice">${esc(this._notice)}</div>` : ""}
      ${legacy.length ? `<div class="notice">Kortets YAML har ${legacy.length} ${legacy.length === 1 ? "opskrift" : "opskrifter"}, som ikke er i databasen.
        <button class="link" data-action="import">Importér</button></div>` : ""}
      ${n > 1 ? `<div class="toolbar">
        <input class="search" type="search" placeholder="Søg på navn, ingrediens eller mærke" value="${esc(this._q)}" data-input="search">
        <select class="sort" data-input="sort" aria-label="Sortér">${SORTS.map(([k, l]) =>
          `<option value="${k}" ${k === this._sort ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>
      </div>` : ""}
      ${tags.length ? `<div class="chips tags">${this._tags.size ? `<button class="chip" data-action="tags-clear">Ryd</button>` : ""}${tags.map((t) =>
        `<button class="chip ${this._tags.has(t) ? "on" : ""}" data-action="tag" data-value="${esc(t)}" aria-pressed="${this._tags.has(t)}">${esc(t)}</button>`).join("")}</div>` : ""}
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
    const list = this._sorted(this._recipes.filter((r) =>
      (!this._cat || r.kategori === this._cat) &&
      [...this._tags].every((t) => r.maerker.includes(t)) &&
      (!q || [r.navn, r.kategori, ...r.maerker, ...r.ingredienser.map((i) => i.navn)].join(" ").toLowerCase().includes(q))));
    if (!list.length) return `<div class="empty">Ingen opskrifter matcher søgningen.</div>`;
    return list.map((r) => {
      const avg = this._avg(r);
      const made = r.historik.length ? `Lavet ${relDate(r.historik[0])}` : "Ikke lavet endnu";
      const extra = this._sort === "populaer" && r.historik.length ? `, ${r.historik.length}×` : "";
      return `
      <div class="row" data-action="open" data-id="${esc(r.id)}" tabindex="0" role="button">
        ${this._shape(r)}
        <div class="info">
          <div class="primary">${esc(r.navn)}</div>
          <div class="secondary meta-row">
            ${avg ? `<span class="s star-c"><ha-icon icon="mdi:star"></ha-icon>${fmtStars(avg)}</span>` : ""}
            <span class="s">${esc(made + extra)}</span>
            ${r.tid ? `<span class="s">${esc(r.tid)}</span>` : ""}
          </div>
        </div>
        <ha-icon class="chev" icon="mdi:chevron-right"></ha-icon>
      </div>`;
    }).join("");
  }

  _madePanel(r) {
    const last = r.historik[0];
    const n = r.historik.length;
    const avg = this._avg(r);
    return `
        <div class="panel">
          <div class="h">Lavet og bedømt</div>
          ${this._notice ? `<div class="notice">${esc(this._notice)}</div>` : ""}
          <div class="made">
            <span class="big">${last ? esc(cap(relDate(last))) : "Ikke lavet endnu"}</span>
            ${n ? `<span class="secondary">${n} ${n === 1 ? "gang" : "gange"} i alt</span>` : ""}
          </div>
          <div class="chips">
            <button class="chip accent" data-action="cooked" data-dato="${todayIso()}">I dag</button>
            <button class="chip" data-action="cooked" data-dato="${yesterdayIso()}">I går</button>
            <label class="chip date"><ha-icon icon="mdi:calendar-month-outline"></ha-icon>Vælg dato
              <input type="date" max="${todayIso()}" data-input="cooked-date" aria-label="Vælg dato for hvornår retten blev lavet"></label>
          </div>
          ${n ? `<details class="hist" ${this._histOpen ? "open" : ""}>
            <summary data-action="hist">Historik (${n})</summary>
            <ul>${r.historik.map((d) => `<li><span>${esc(cap(fmtDate(d)))}</span>
              <button class="icon-btn" data-action="cooked-del" data-dato="${esc(d)}" aria-label="Fjern ${esc(fmtDate(d))}"><ha-icon icon="mdi:close"></ha-icon></button></li>`).join("")}</ul>
          </details>` : ""}
          <div class="divider"></div>
          <div class="made"><span class="label" style="margin:0">Bedømmelser</span>${avg ? `<span class="avg">Gennemsnit ${fmtStars(avg)}</span>` : ""}</div>
          ${this._familie.length ? this._familie.map((p) => {
            const v = Number(r.vurderinger[p.id]) || 0;
            return `<div class="rate"><span class="who">${esc(p.navn)}</span><span class="stars">${[1, 2, 3, 4, 5].map((st) =>
              `<button class="star ${st <= v ? "on" : ""}" data-action="rate" data-person="${esc(p.id)}" data-stars="${st}" aria-label="${esc(p.navn)}: ${st} ${st === 1 ? "stjerne" : "stjerner"}" aria-pressed="${st <= v}"><ha-icon icon="${st <= v ? "mdi:star" : "mdi:star-outline"}"></ha-icon></button>`).join("")}</span></div>`;
          }).join("") : `<div class="secondary">Tilføj familiemedlemmer under <button class="link" data-action="settings">Familie</button> for at give stjerner.</div>`}
        </div>`;
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
          <div class="secondary">${esc([r.tid, r.kategori, r.historik[0] ? `sidst lavet ${relDate(r.historik[0])}` : null].filter(Boolean).join(", "))}</div>
        </div>
        ${this._readonly ? "" : `<button class="icon-btn" data-action="edit" aria-label="Redigér opskrift"><ha-icon icon="mdi:pencil-outline"></ha-icon></button>`}
        <button class="icon-btn" data-action="print" aria-label="Print opskrift"><ha-icon icon="mdi:printer-outline"></ha-icon></button>
      </div>
      ${this._printBusy || this._printLink ? `<div class="notice printnote" style="${rgb(r.farve)}">${this._printBusy
        ? "Gør udskriften klar…"
        : `<span>Udskriften er klar.</span><a class="open" href="${esc(this._printLink)}" target="_blank" rel="noopener" data-action="print-open"><ha-icon icon="mdi:printer-outline"></ha-icon>Åbn og udskriv</a><button class="link" data-action="print-close">Luk</button>`}</div>` : ""}
      ${r.billede ? `<button class="hero" data-action="zoom" data-src="${esc(imgUrl(r.billede))}" aria-label="Vis billedet i stor størrelse"><img src="${esc(imgUrl(r.billede))}" alt=""></button>` : ""}
      ${r.maerker.length ? `<div class="tagline" style="${rgb(r.farve)}">${r.maerker.map((t) => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
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
        ${r.fremgang.length ? `<div class="section"><div class="h">Fremgangsmåde</div><ol class="steps">${r.fremgang.map((t) => `
          <li>${esc(t.tekst)}${t.billeder.length ? `<div class="thumbs">${t.billeder.map((b) =>
            `<button class="thumb" data-action="zoom" data-src="${esc(imgUrl(b))}" aria-label="Vis billedet i stor størrelse"><img src="${esc(imgUrl(b, true))}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}</li>`).join("")}</ol></div>` : ""}
        ${r.noter ? `<div class="section"><div class="h">Noter</div><p class="notes">${esc(r.noter)}</p></div>` : ""}
        ${this._madePanel(r)}
        ${updated ? `<div class="meta">Senest rettet ${esc(updated)}${r.opdateret_af ? ` af ${esc(r.opdateret_af)}` : ""}</div>` : ""}
      </div>`;
  }

  /* ---------- editor ---------- */
  _newDraft(r) {
    if (r) {
      const d = JSON.parse(JSON.stringify(r));
      d.personer = dkNum(d.personer);
      d.ingredienser = d.ingredienser.map((i) => ({ ...i, maengde: dkNum(i.maengde) }));
      d.trin = d.fremgang.map((t) => ({ tekst: t.tekst, billeder: [...t.billeder] }));
      if (!d.trin.length) d.trin.push({ tekst: "", billeder: [] });
      d.maerker = [...(d.maerker || [])];
      return d;
    }
    return {
      navn: "", kategori: "", tid: "", personer: "4", ikon: "mdi:silverware-fork-knife",
      farve: "orange", krydderistyrke: 100, billede: "", noter: "", maerker: [],
      ingredienser: [{ navn: "" }],
      trin: [{ tekst: "", billeder: [] }],
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

  _ingHeadInner(i, idx) {
    const amount = [txt(i.maengde), txt(i.enhed)].filter(Boolean).join(" ");
    const badges = [
      i.krydderi ? `<span class="badge">Krydderi</span>` : "",
      i.noegle ? `<span class="badge">Skaleres efter</span>` : "",
      i.skaler === false ? `<span class="badge grey">Fast mængde</span>` : "",
      txt(i.gruppe) && txt(i.gruppe) !== "Ingredienser" ? `<span class="badge grey">${esc(i.gruppe)}</span>` : "",
    ].join("");
    return `
      <span class="num">${idx + 1}</span>
      <span class="t-main">
        <span class="t-name ${txt(i.navn) ? "" : "empty"}">${esc(txt(i.navn) || "Ny ingrediens")}</span>
        <span class="t-amt">${esc(amount)}</span>
        ${badges}
      </span>
      <ha-icon icon="${this._openIng === idx ? "mdi:chevron-up" : "mdi:chevron-down"}"></ha-icon>`;
  }

  _toggle(idx, k, on, label) {
    return `<button class="toggle ${on ? "on" : ""}" data-action="flag" data-ing="${idx}" data-k="${k}" aria-pressed="${on}">
      <ha-icon icon="${on ? "mdi:checkbox-marked" : "mdi:checkbox-blank-outline"}"></ha-icon>${esc(label)}</button>`;
  }

  _ingEditRows() {
    const list = this._draft.ingredienser;
    return list.map((i, idx) => {
      const open = this._openIng === idx;
      return `
      <div class="ing-item ${open ? "open" : ""}">
        <button class="ing-head" data-action="ing-toggle" data-ing="${idx}" aria-expanded="${open}">${this._ingHeadInner(i, idx)}</button>
        ${open ? `
        <div class="ing-body">
          <div class="cols3">
            ${this._ifield("Mængde", idx, "maengde", i.maengde, { mode: "decimal", placeholder: "0,5" })}
            ${this._ifield("Enhed", idx, "enhed", i.enhed, { list: "oc-units", placeholder: "spsk." })}
            ${this._ifield("Ingrediens", idx, "navn", i.navn, { placeholder: "Fx olie" })}
          </div>
          <div class="cols">
            ${this._ifield("Note", idx, "note", i.note, { placeholder: "Fx i fine tern" })}
            ${this._ifield("Gruppe", idx, "gruppe", i.gruppe, { placeholder: "Ingredienser", list: "oc-groups" })}
          </div>
          <div class="toggles">
            ${this._toggle(idx, "krydderi", !!i.krydderi, "Krydderi")}
            ${this._toggle(idx, "noegle", !!i.noegle, "Skalér efter denne")}
            ${this._toggle(idx, "fast", i.skaler === false, "Fast mængde")}
          </div>
          <div class="row-actions">
            <button class="btn quiet" data-action="ing-up" data-ing="${idx}" ${idx === 0 ? "disabled" : ""}><ha-icon icon="mdi:arrow-up"></ha-icon>Flyt op</button>
            <button class="btn quiet" data-action="ing-down" data-ing="${idx}" ${idx === list.length - 1 ? "disabled" : ""}><ha-icon icon="mdi:arrow-down"></ha-icon>Flyt ned</button>
            <button class="btn danger" data-action="ing-del" data-ing="${idx}"><ha-icon icon="mdi:trash-can-outline"></ha-icon>Fjern</button>
          </div>
        </div>` : ""}
      </div>`;
    }).join("");
  }

  _stepRows() {
    const list = this._draft.trin;
    return list.map((t, idx) => `
      <div class="step-item">
        <span class="num">${idx + 1}</span>
        <div>
          <textarea rows="3" data-trin="${idx}" placeholder="Beskriv trinnet">${esc(t.tekst)}</textarea>
          ${t.billeder.length ? `<div class="e-thumbs">${t.billeder.map((b, bi) => `
            <div class="e-thumb"><img src="${esc(imgUrl(b, true))}" alt="">
              <button class="x" data-action="step-img-del" data-trin="${idx}" data-bi="${bi}" aria-label="Fjern billede"><ha-icon icon="mdi:close"></ha-icon></button></div>`).join("")}</div>` : ""}
          <div class="step-tools">
            <label class="btn upload"><ha-icon icon="mdi:camera-plus-outline"></ha-icon>Tilføj billede
              <input type="file" accept="image/*" multiple data-upload="trin" data-trin="${idx}"></label>
            <span class="spacer"></span>
            <button class="btn quiet" data-action="step-up" data-trin="${idx}" ${idx === 0 ? "disabled" : ""} aria-label="Flyt trin op"><ha-icon icon="mdi:arrow-up"></ha-icon></button>
            <button class="btn quiet" data-action="step-down" data-trin="${idx}" ${idx === list.length - 1 ? "disabled" : ""} aria-label="Flyt trin ned"><ha-icon icon="mdi:arrow-down"></ha-icon></button>
            <button class="btn danger" data-action="step-del" data-trin="${idx}" aria-label="Fjern trin"><ha-icon icon="mdi:trash-can-outline"></ha-icon></button>
          </div>
        </div>
      </div>`).join("");
  }

  _tagPick() {
    const sel = new Set(this._draft.maerker);
    const all = [...new Set([...TAG_SUGGESTIONS, ...this._allTags(), ...this._draft.maerker])];
    return all.map((t) => `<button class="toggle ${sel.has(t) ? "on" : ""}" data-action="tag-toggle" data-tag="${esc(t)}" aria-pressed="${sel.has(t)}">
      <ha-icon icon="${sel.has(t) ? "mdi:checkbox-marked" : "mdi:checkbox-blank-outline"}"></ha-icon>${esc(t)}</button>`).join("");
  }

  _addTag() {
    const t = txt(this._newTag);
    if (!t || !this._draft) return;
    const existing = [...TAG_SUGGESTIONS, ...this._allTags()].find((x) => x.toLowerCase() === t.toLowerCase()) || cap(t);
    if (!this._draft.maerker.includes(existing)) this._draft.maerker.push(existing);
    this._newTag = "";
    const input = this.shadowRoot.querySelector('input[data-input="newtag"]');
    if (input) input.value = "";
    this._rerender(".tag-pick", this._tagPick());
  }

  _familyEditor() {
    const list = this._famDraft;
    return `
      <div class="editor" style="${rgb(this._config?.farve)}">
        <div class="e-top">
          <button class="icon-btn" data-action="fam-cancel" aria-label="Annullér"><ha-icon icon="mdi:close"></ha-icon></button>
          <div class="title">Familie</div>
          <button class="btn primary-btn" data-action="fam-save" ${this._saving ? "disabled" : ""}>Gem</button>
        </div>
        ${this._formError ? `<div class="e-error">${esc(this._formError)}</div>` : ""}
        <div class="e-card">
          <div class="e-h">Hvem bedømmer retterne?</div>
          <div class="e-hint">Omdøber du en person, beholder vedkommende sine stjerner. Fjerner du en person, slettes vedkommendes stjerner, når du gemmer.</div>
          <div class="fam-list">${list.map((p, idx) => `
            <div class="fam-row">
              <input type="text" data-fam="${idx}" value="${esc(p.navn)}" placeholder="Navn" aria-label="Navn" autocomplete="off">
              <button class="btn quiet" data-action="fam-up" data-fam="${idx}" ${idx === 0 ? "disabled" : ""} aria-label="Flyt op"><ha-icon icon="mdi:arrow-up"></ha-icon></button>
              <button class="btn danger" data-action="fam-del" data-fam="${idx}" aria-label="Fjern ${esc(p.navn || "person")}"><ha-icon icon="mdi:trash-can-outline"></ha-icon></button>
            </div>`).join("")}</div>
          <button class="btn add-row" data-action="fam-add"><ha-icon icon="mdi:plus"></ha-icon>Tilføj person</button>
        </div>
      </div>`;
  }

  async _saveFamily() {
    const names = this._famDraft.map((p) => txt(p.navn)).filter(Boolean);
    if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) {
      this._formError = "To personer har samme navn.";
      return this._render();
    }
    this._saving = true;
    this._formError = null;
    this._render();
    try {
      const res = await this._hass.callWS({
        type: "opskrifter/familie_gem",
        familie: this._famDraft.filter((p) => txt(p.navn)).map((p) => (p.id ? { id: p.id, navn: txt(p.navn) } : { navn: txt(p.navn) })),
      });
      this._familie = res.familie;
      this._famDraft = null;
    } catch (err) {
      this._formError = `Kunne ikke gemme: ${err?.message || err?.code || err}`;
    }
    this._saving = false;
    this._render();
  }

  _mainImage() {
    const d = this._draft;
    return d.billede
      ? `<img src="${esc(imgUrl(d.billede, true))}" alt="">
         <label class="btn upload"><ha-icon icon="mdi:camera-flip-outline"></ha-icon>Skift billede
           <input type="file" accept="image/*" data-upload="main"></label>
         <button class="btn danger" data-action="main-del"><ha-icon icon="mdi:trash-can-outline"></ha-icon>Fjern</button>`
      : `<div class="ph"><ha-icon icon="mdi:image-outline"></ha-icon></div>
         <label class="btn upload"><ha-icon icon="mdi:camera-plus-outline"></ha-icon>Vælg billede
           <input type="file" accept="image/*" data-upload="main"></label>`;
  }

  _editor() {
    const d = this._draft;
    const isNew = !d.id;
    const cats = [...new Set(this._recipes.map((r) => r.kategori).filter(Boolean))];
    const groups = [...new Set(["Ingredienser", "Serveres med", "Sauce", "Dressing", "Topping",
      ...this._recipes.flatMap((r) => r.ingredienser.map((i) => i.gruppe)).filter(Boolean)])];
    const busy = this._saving ? "Gemmer…" : this._aiBusy ? "Claude læser opskriften…" : this._uploading ? "Uploader billede…" : "";
    return `
      <div class="editor" style="${rgb(d.farve)}">
        <div class="e-top">
          <button class="icon-btn" data-action="cancel" aria-label="Annullér"><ha-icon icon="mdi:close"></ha-icon></button>
          <div class="title">${isNew ? "Ny opskrift" : "Redigér opskrift"}</div>
          <span class="busy">${esc(busy)}</span>
          <button class="btn primary-btn" data-action="save" ${this._saving || this._uploading || this._aiBusy ? "disabled" : ""}>Gem</button>
        </div>
        <datalist id="oc-cats">${cats.map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
        <datalist id="oc-units">${UNITS.map((u) => `<option value="${esc(u)}">`).join("")}</datalist>
        <datalist id="oc-groups">${groups.map((g) => `<option value="${esc(g)}">`).join("")}</datalist>
        ${this._formError ? `<div class="e-error">${esc(this._formError)}</div>` : ""}
        ${isNew ? `
        <div class="e-card ai">
          <div class="e-h"><ha-icon icon="mdi:text-recognition"></ha-icon>Start fra et billede</div>
          <div class="e-hint">Tag et billede af en opskrift, så udfylder Claude felterne. Du kan rette alt, før du gemmer.</div>
          <div class="ai-row">
            ${this._aiBusy
              ? `<span class="spinner" aria-hidden="true"></span><span class="busy">Claude læser opskriften. Det tager typisk 10–40 sekunder.</span>`
              : `<label class="btn primary-btn upload"><ha-icon icon="mdi:camera-outline"></ha-icon>Tag eller vælg billede
                  <input type="file" accept="image/*" data-upload="ai"></label>`}
          </div>
        </div>` : ""}

        <div class="e-card">
          <div class="e-h">Grundoplysninger</div>
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
        </div>

        <div class="e-card">
          <div class="e-h">Mærker</div>
          <div class="e-hint">Bruges til søgning og filtre, fx kødtype, grøntsager eller spicy.</div>
          <div class="tag-pick">${this._tagPick()}</div>
          <div class="add-tag">
            <input type="text" data-input="newtag" placeholder="Nyt mærke" value="${esc(this._newTag)}" autocomplete="off" aria-label="Nyt mærke">
            <button class="btn" data-action="tag-add"><ha-icon icon="mdi:plus"></ha-icon>Tilføj</button>
          </div>
        </div>

        <div class="e-card">
          <div class="e-h">Billede</div>
          <div class="mainimg">${this._mainImage()}</div>
        </div>

        <div class="e-card">
          <div class="e-h">Ingredienser <span class="count">${d.ingredienser.length}</span></div>
          <div class="e-hint">Tryk på en ingrediens for at rette den.</div>
          <div class="ing-list">${this._ingEditRows()}</div>
          <button class="btn add-row" data-action="ing-add"><ha-icon icon="mdi:plus"></ha-icon>Tilføj ingrediens</button>
        </div>

        <div class="e-card">
          <div class="e-h">Fremgangsmåde</div>
          <div class="steps-edit">${this._stepRows()}</div>
          <button class="btn add-row" data-action="step-add"><ha-icon icon="mdi:plus"></ha-icon>Tilføj trin</button>
        </div>

        <div class="e-card">
          <div class="e-h">Noter</div>
          <label class="fld"><textarea rows="3" data-f="noter" aria-label="Noter">${esc(d.noter)}</textarea></label>
        </div>

        <div class="e-bottom">
          ${isNew ? "" : `<button class="btn danger" data-action="delete">${this._confirmDelete ? "Tryk igen for at slette" : "Slet opskrift"}</button>`}
          <div class="right">
            <button class="btn" data-action="cancel">Annullér</button>
            <button class="btn primary-btn" data-action="save" ${this._saving || this._uploading ? "disabled" : ""}>Gem</button>
          </div>
        </div>
      </div>`;
  }

  _rerender(selector, html) {
    const el = this.shadowRoot.querySelector(selector);
    if (el) el.innerHTML = html;
    else this._render();
  }

  _updateIngHead(idx) {
    const head = this.shadowRoot.querySelector(`.ing-head[data-ing="${idx}"]`);
    if (head) head.innerHTML = this._ingHeadInner(this._draft.ingredienser[idx], idx);
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
    r.maerker = [...new Set((d.maerker || []).map(txt).filter(Boolean))];
    r.fremgang = d.trin
      .map((t) => ({ tekst: txt(t.tekst), billeder: t.billeder || [] }))
      .filter((t) => t.tekst || t.billeder.length);
    return r;
  }

  async _upload(file) {
    const fd = new FormData();
    fd.append("fil", file, file.name || "billede.jpg");
    const res = await this._hass.fetchWithAuth("/api/opskrifter/billede", { method: "POST", body: fd });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { msg = (await res.json()).message || msg; } catch (e) { /* ignore */ }
      throw new Error(msg);
    }
    return (await res.json()).id;
  }

  async _handleUpload(input) {
    const files = [...(input.files || [])];
    if (!files.length || !this._draft) return;
    const target = input.dataset.upload;
    const idx = Number(input.dataset.trin);
    this._uploading += 1;
    this._formError = null;
    this._render();
    try {
      for (const f of files) {
        const id = await this._upload(f);
        if (!this._draft) break;
        if (target === "ai") {
          this._uploading -= 1;
          this._aiBusy = true;
          this._render();
          try {
            await this._readFromImage(id);
          } finally {
            this._aiBusy = false;
            this._uploading += 1;
          }
          break;
        }
        if (target === "main") this._draft.billede = id;
        else this._draft.trin[idx]?.billeder.push(id);
      }
    } catch (err) {
      this._formError = target === "ai"
        ? `Opskriften kunne ikke aflæses: ${err?.message || err?.code || err}`
        : `Billedet kunne ikke uploades: ${err?.message || err}`;
    }
    this._uploading -= 1;
    if (this._draft) this._render();
  }

  async _readFromImage(imageId) {
    const res = await this._hass.callWS({ type: "opskrifter/fra_billede", billede_id: imageId });
    const r = normalize([{ ...res.opskrift, id: "ny" }])[0];
    const d = this._draft;
    if (!d) return;
    Object.assign(d, {
      navn: r.navn || d.navn,
      kategori: r.kategori || d.kategori,
      tid: r.tid || d.tid,
      personer: r.personer ? dkNum(r.personer) : d.personer,
      noter: r.noter || d.noter,
      maerker: [...new Set([...(d.maerker || []), ...r.maerker])],
      ingredienser: r.ingredienser.length ? r.ingredienser.map((i) => ({ ...i, maengde: dkNum(i.maengde) })) : d.ingredienser,
      trin: r.fremgang.length ? r.fremgang.map((t) => ({ tekst: t.tekst, billeder: [] })) : d.trin,
    });
    if (r.billede) d.billede = r.billede;
    if (r.ingredienser.some((i) => i.krydderi) && !d.krydderistyrke) d.krydderistyrke = 100;
    this._openIng = null;
    this._formError = null;
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
      await this._hass.callWS({ type: "opskrifter/delete", opskrift_id: this._draft.id });
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
    this._printLink = null;
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

    if (a === "close-lightbox") { this._lightbox = null; return this._render(); }
    if (a === "zoom") { this._lightbox = el.dataset.src; return this._render(); }

    // familie
    if (a === "settings") {
      this._famDraft = this._familie.map((p) => ({ ...p }));
      if (!this._famDraft.length) this._famDraft.push({ navn: "" });
      this._formError = null;
      return this._render();
    }
    if (this._famDraft) {
      const fi = Number(el.dataset.fam);
      const f = this._famDraft;
      switch (a) {
        case "fam-cancel": this._famDraft = null; this._formError = null; return this._render();
        case "fam-save": return this._saveFamily();
        case "fam-add":
          f.push({ navn: "" });
          this._render();
          this.shadowRoot.querySelector(`input[data-fam="${f.length - 1}"]`)?.focus();
          return;
        case "fam-del": f.splice(fi, 1); return this._render();
        case "fam-up":
          if (fi > 0) [f[fi - 1], f[fi]] = [f[fi], f[fi - 1]];
          return this._render();
        default: return;
      }
    }

    // liste og navigation
    if (a === "tag") {
      const t = el.dataset.value;
      if (this._tags.has(t)) this._tags.delete(t); else this._tags.add(t);
      return this._render();
    }
    if (a === "tags-clear") { this._tags.clear(); return this._render(); }
    if (a === "open") return this._setOpen(el.dataset.id);
    if (a === "back") return this._setOpen(null);
    if (a === "cat") {
      this._cat = el.dataset.value === "Alle" ? null : el.dataset.value;
      return this._render();
    }
    if (a === "import") return this._import();
    if (a === "new" || a === "edit") {
      this._draft = this._newDraft(a === "edit" ? this._current() : null);
      this._openIng = a === "new" ? 0 : null;
      this._formError = null;
      this._confirmDelete = false;
      return this._render();
    }

    // editor
    if (this._draft) {
      const d = this._draft;
      const idx = Number(el.dataset.ing);
      const ti = Number(el.dataset.trin);
      switch (a) {
        case "cancel": this._draft = null; return this._render();
        case "save": return this._save();
        case "delete": return this._delete();
        case "main-del": d.billede = ""; return this._rerender(".mainimg", this._mainImage());
        case "tag-toggle": {
          const t = el.dataset.tag;
          d.maerker = d.maerker.includes(t) ? d.maerker.filter((x) => x !== t) : [...d.maerker, t];
          return this._rerender(".tag-pick", this._tagPick());
        }
        case "tag-add": return this._addTag();
        case "ing-toggle":
          this._openIng = this._openIng === idx ? null : idx;
          return this._rerender(".ing-list", this._ingEditRows());
        case "ing-add":
          d.ingredienser.push({ navn: "" });
          this._openIng = d.ingredienser.length - 1;
          this._rerender(".ing-list", this._ingEditRows());
          this.shadowRoot.querySelector(`.ing-body input[data-k="maengde"]`)?.focus();
          return;
        case "ing-del":
          d.ingredienser.splice(idx, 1);
          this._openIng = null;
          return this._rerender(".ing-list", this._ingEditRows());
        case "ing-up":
        case "ing-down": {
          const to = a === "ing-up" ? idx - 1 : idx + 1;
          if (to < 0 || to >= d.ingredienser.length) return;
          [d.ingredienser[to], d.ingredienser[idx]] = [d.ingredienser[idx], d.ingredienser[to]];
          this._openIng = to;
          return this._rerender(".ing-list", this._ingEditRows());
        }
        case "flag": {
          const i = d.ingredienser[idx];
          const k = el.dataset.k;
          if (k === "fast") {
            if (i.skaler === false) delete i.skaler; else i.skaler = false;
          } else {
            i[k] = !i[k];
          }
          return this._rerender(".ing-list", this._ingEditRows());
        }
        case "step-add":
          d.trin.push({ tekst: "", billeder: [] });
          this._rerender(".steps-edit", this._stepRows());
          this.shadowRoot.querySelector(`textarea[data-trin="${d.trin.length - 1}"]`)?.focus();
          return;
        case "step-del":
          d.trin.splice(ti, 1);
          return this._rerender(".steps-edit", this._stepRows());
        case "step-up":
        case "step-down": {
          const to = a === "step-up" ? ti - 1 : ti + 1;
          if (to < 0 || to >= d.trin.length) return;
          [d.trin[to], d.trin[ti]] = [d.trin[ti], d.trin[to]];
          return this._rerender(".steps-edit", this._stepRows());
        }
        case "step-img-del":
          d.trin[ti].billeder.splice(Number(el.dataset.bi), 1);
          return this._rerender(".steps-edit", this._stepRows());
        default:
          return;
      }
    }

    // detaljevisning
    const r = this._current();
    if (!r) return;
    if (a === "print") return this._print(r);
    if (a === "print-open") {
      setTimeout(() => { this._printLink = null; this._render(); }, 800);
      return;
    }
    if (a === "print-close") { this._printLink = null; return this._render(); }
    if (a === "hist") {
      e.preventDefault();
      this._histOpen = !this._histOpen;
      return this._render();
    }
    if (a === "cooked") return this._ws({ type: "opskrifter/lavet", opskrift_id: r.id, dato: el.dataset.dato });
    if (a === "cooked-del") return this._ws({ type: "opskrifter/lavet_slet", opskrift_id: r.id, dato: el.dataset.dato });
    if (a === "rate") {
      const cur = Number(r.vurderinger[el.dataset.person]) || 0;
      const st = Number(el.dataset.stars);
      return this._ws({ type: "opskrifter/bedoem", opskrift_id: r.id, person: el.dataset.person, stjerner: cur === st ? 0 : st });
    }
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
    if (this._famDraft && t.dataset.fam !== undefined && t.tagName === "INPUT") {
      this._famDraft[Number(t.dataset.fam)].navn = t.value;
      return;
    }
    if (!this._draft) return;
    if (t.dataset.input === "newtag") {
      this._newTag = t.value;
      return;
    }
    if (t.dataset.f) {
      this._draft[t.dataset.f] = t.value;
    } else if (t.dataset.ing !== undefined) {
      const idx = Number(t.dataset.ing);
      this._draft.ingredienser[idx][t.dataset.k] = t.value;
      if (["navn", "maengde", "enhed", "gruppe"].includes(t.dataset.k)) this._updateIngHead(idx);
    } else if (t.dataset.trin !== undefined && t.tagName === "TEXTAREA") {
      this._draft.trin[Number(t.dataset.trin)].tekst = t.value;
    }
  }

  _onChange(e) {
    const t = e.target;
    if (this._draft && t.dataset.upload) {
      this._handleUpload(t);
      return;
    }
    if (this._draft && t.dataset.f === "farve") {
      this._draft.farve = t.value;
      this.shadowRoot.querySelector(".editor")?.setAttribute("style", rgb(t.value));
      return;
    }
    if (t.dataset.input === "sort") {
      this._sort = t.value;
      try { localStorage.setItem(this._key + ":sort", this._sort); } catch (err) { /* ignore */ }
      return this._render();
    }
    if (t.dataset.input === "cooked-date") {
      const r = this._current();
      if (r && t.value) this._ws({ type: "opskrifter/lavet", opskrift_id: r.id, dato: t.value });
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
  _needsPrintPage() {
    const ua = navigator.userAgent || "";
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return ios || /Home ?Assistant/i.test(ua);
  }

  _printData(r, s) {
    return {
      titel: r.navn,
      under: [this._summary(r, s), r.tid].filter(Boolean).join(", "),
      billede: IMAGE_ID.test(r.billede || "") ? r.billede : null,
      grupper: this._groups(r).map(([g, items]) => ({
        navn: g,
        linjer: items.map((i) => {
          const v = this._scaled(i, s);
          return { maengde: v === null ? "" : `${fmtAmount(v, i.enhed)} ${i.enhed || ""}`.trim(), navn: i.navn, note: i.note || "" };
        }),
      })),
      trin: r.fremgang.map((t) => t.tekst),
      noter: r.noter || "",
    };
  }

  async _printViaServer(r) {
    this._printBusy = true;
    this._printLink = null;
    this._render();
    try {
      const res = await this._hass.fetchWithAuth("/api/opskrifter/udskrift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this._printData(r, this._getState(r))),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this._printLink = new URL((await res.json()).url, location.origin).href;
    } catch (err) {
      this._notice = `Udskriften kunne ikke laves: ${err?.message || err}`;
    }
    this._printBusy = false;
    this._render();
  }

  _print(r) {
    if (this._needsPrintPage()) return this._printViaServer(r);
    const s = this._getState(r);
    const groups = this._groups(r).map(([g, items]) => `
      <h2>${esc(g)}</h2>
      <table>${items.map((i) => {
        const v = this._scaled(i, s);
        return `<tr><td class="a">${v === null ? "" : `${fmtAmount(v, i.enhed)} ${esc(i.enhed || "")}`}</td>
          <td>${esc(i.navn)}${i.note ? `<div class="n">${esc(i.note)}</div>` : ""}</td></tr>`;
      }).join("")}</table>`).join("");
    const hero = r.billede ? `<img class="hero" src="${esc(new URL(imgUrl(r.billede), location.href).href)}" alt="">` : "";
    const html = `<!doctype html><html lang="da"><head><meta charset="utf-8"><title>${esc(r.navn)}</title>
      <style>${PRINT_STYLE}</style></head><body>
      <h1>${esc(r.navn)}</h1>
      <p class="sub">${esc([this._summary(r, s), r.tid].filter(Boolean).join(", "))}</p>
      ${hero}
      ${groups}
      ${r.fremgang.length ? `<h2>Fremgangsmåde</h2><ol>${r.fremgang.map((t) => `<li>${esc(t.tekst)}</li>`).join("")}</ol>` : ""}
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
    const go = () => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch (err) {
        cleanup();
      }
    };
    const img = doc.querySelector("img");
    if (img && !img.complete) {
      img.addEventListener("load", go, { once: true });
      img.addEventListener("error", go, { once: true });
    } else {
      setTimeout(go, 250);
    }
    setTimeout(() => frame.isConnected && frame.remove(), 120000);
  }
}

if (!customElements.get("opskrift-card")) {
  customElements.define("opskrift-card", OpskriftCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "opskrift-card",
    name: "Opskrift-kort",
    description: "Opskriftssamling med billeder, bedømmelser, historik, mærker og skalering",
  });
  console.info(`%c OPSKRIFT-CARD %c v${OC_VERSION} `,
    "color:#fff;background:#ff9800;font-weight:700;border-radius:3px 0 0 3px",
    "color:#ff9800;background:#fff3e0;border-radius:0 3px 3px 0");
}
