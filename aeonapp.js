import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp, writeBatch, runTransaction } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

/* ===== FIREBASE CONFIG (unchanged) ===== */
const CFG = {
  apiKey: "AIzaSyAF9MPjp9d-6x3spQsPJwnoDI3k8i_nHbU",
  authDomain: "aon-workspace.firebaseapp.com",
  projectId: "aon-workspace",
  storageBucket: "aon-workspace.firebasestorage.app",
  messagingSenderId: "905792340680",
  appId: "1:905792340680:web:c1cae615df03ca27b4dbfd"
};
const app = initializeApp(CFG);
const auth = getAuth(app), db = getFirestore(app);

/* ===== STATE ===== */
let U, ADMIN = false, ME = {}, subs = [], MEMBERS = [], nsub, NOTES = [], onNotes = null;
let CONVS = null, CT = 0, SD = null, SDT = 0, rt = 0, HAPT = true;
let PROFILES = {}, WR = [], INBOX = [], isub = null, onInbox = null;
try { HAPT = localStorage.getItem("haptics") !== "0"; } catch {}
const DEPTS = ["tech", "research", "marketing"];

/* ===== DOM HELPERS (no innerHTML anywhere) ===== */
const $ = s => document.querySelector(s);
const h = (t, a = {}, ...k) => {
  const e = document.createElement(t);
  for (const [x, v] of Object.entries(a)) {
    if (v == null || v === false) continue;
    x.startsWith("on") ? e.addEventListener(x.slice(2), v) : x === "class" ? e.className = v : e.setAttribute(x, v);
  }
  e.append(...k.filter(n => n != null && n !== false));
  return e;
};
// null-safe append / replace (prevents stray "null" text nodes)
const ok = k => k.filter(n => n != null && n !== false);
const add = (p, ...k) => (p.append(...ok(k)), p);
const set = (p, ...k) => (p.replaceChildren(...ok(k)), p);
const NS = "http://www.w3.org/2000/svg";
const S = (t, a) => { const e = document.createElementNS(NS, t); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); return e; };
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : "";
const buzz = () => HAPT && navigator.vibrate?.(10);
const mail = () => U.email.toLowerCase();
const clear = () => { subs.forEach(u => u()); subs = []; };
const nameOf = e => MEMBERS.find(x => x.id === e)?.name || e;
const myName = () => ME.name && !String(ME.name).includes("@") ? ME.name : cap(U.email.split("@")[0]);

/* ===== ICONS (inline SVG, thin rounded stroke) ===== */
const IC = {
  home: "M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10", chat: "M4 5h16v11H9l-5 4z", tasks: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.5l2.7 2.7L16 9.5",
  teams: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .6 3.2 2.4 3.5 5.2",
  more: "M5 12h.01M12 12h.01M19 12h.01", docs: "M7 3h7l4 4v14H7zM14 3v4h4", search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  bell: "M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 21h4", news: "M4 10v4h3l7 4V6l-7 4zM18 9.5a4 4 0 0 1 0 5",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c.7-3.6 3.6-5.5 7.5-5.5s6.8 1.9 7.5 5.5", admin: "M12 3l7.5 3v5.5c0 4.5-3 7.8-7.5 9.5-4.5-1.7-7.5-5-7.5-9.5V6z",
  gear: "M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M9 14v6", plus: "M12 5v14M5 12h14", chevL: "M15 5l-7 7 7 7", chevR: "M9 5l7 7-7 7",
  send: "M12 19V5M6 11l6-6 6 6", trash: "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13", down: "M12 5v14M6 13l6 6 6-6", x: "M6 6l12 12M18 6 6 18",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  cpu: "M8 8h8v8H8zM4 9h2M4 15h2M18 9h2M18 15h2M9 4v2M15 4v2M9 18v2M15 18v2", flask: "M9 3h6M10 3v6l-5 9a1.5 1.5 0 0 0 1.3 2.2h11.4A1.5 1.5 0 0 0 19 18l-5-9V3",
  hash: "M9 4 7 20M17 4l-2 16M5 9h15M4 15h15", group: "M4 20v-1a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v1M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z", edit: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
  alert: "M12 8v5M12 16.5h.01M10.3 4.2 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z", clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  userplus: "M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2.5 20.5c.7-3.6 3.4-5.5 6.5-5.5M18 9v6M15 12h6", layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
  copy: "M9 9h10v11H9zM5 15V4h10", log: "M5 4h14v16H5zM9 9h6M9 13h6M9 17h3", key: "M14 10a4 4 0 1 0-3.9 4l5.4 5.4 2-2-1.4-1.4 1-1-1.4-1.4 1-1-1.7-1.7",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01", check: "M5 12.5l4.5 4.5L19 7", out: "M10 4H5v16h5M15 8l4 4-4 4M19 12H9",
  inbox: "M3 6h18v12H3zM3 7l9 6 9-6", mail: "M3 6h18v12H3zM3 7l9 6 9-6", pin: "M12 3v6M8 9h8l-1 5H9zM12 14v7", archive: "M3 5h18v4H3zM5 9v10h14V9M10 13h4", smile: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 14a4.5 4.5 0 0 0 7 0M9 10h.01M15 10h.01",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5", folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", download: "M12 4v11M7 11l5 5 5-5M5 20h14",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 14v6M14 20h3", id: "M3 6h18v12H3zM7 12a2 2 0 1 0 0-.01M12 10h5M12 14h4"
};
const ic = (n, s = 22) => { const v = S("svg", { viewBox: "0 0 24 24", width: s, height: s, fill: "none", stroke: "currentColor", "stroke-width": 1.7, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" }); v.append(S("path", { d: IC[n] })); return v; };
document.querySelectorAll("[data-i]").forEach(e => e.append(ic(e.dataset.i, e.closest("#tabs") ? 26 : 21)));

/* ===== BRAND LOGO: put your image at assets/logo.png (falls back to a letter "A" if missing) ===== */
const LOGO = "assets/logo.png";
const withLogo = (box, onFail) => {
  const im = h("img", { src: LOGO, alt: "" });
  im.addEventListener("load", () => box.classList.add("img"));
  im.addEventListener("error", () => { im.remove(); onFail?.(); });
  box.append(im);
};
document.querySelectorAll(".appicon").forEach(b => withLogo(b));
const logoAv = size => { const b = h("span", { class: "av logo", style: `width:${size}px;height:${size}px` }); withLogo(b, () => { b.className = "av"; b.style.cssText = `--c:${DC.general};width:${size}px;height:${size}px`; b.append(ic("hash", Math.round(size * .52))); }); return b; };

/* ===== IDENTITY COLORS + TEAMS ===== */
const DC = { tech: "#5856D6", research: "#C93400", marketing: "#D30F45", general: "#248A3D" }, DI = { tech: "cpu", research: "flask", marketing: "news", general: "hash" };
const PAL = ["#5856D6", "#C93400", "#D30F45", "#248A3D", "#0071E3", "#8944AB", "#B25000", "#00796B"];
const hue = s => PAL[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % PAL.length];
const dcol = d => DC[d] || hue(d || "x"), dico = d => DI[d] || "teams";
const initials = n => String(n || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
const av = (label, color, size = 40, icon) => h("span", { class: "av", style: `--c:${color};width:${size}px;height:${size}px;font-size:${Math.round(size * .4)}px` }, icon ? ic(icon, Math.round(size * .52)) : initials(label));
const deptAv = (d, size = 40) => av(d, dcol(d), size, dico(d));
// Teams = built-in teams + team channels (conversations of type "dept") + any team a member belongs to. No new data model.
const teams = () => [...new Set([...DEPTS, ...(CONVS || []).filter(c => c.type === "dept").map(c => c.dept), ...MEMBERS.map(x => x.dept).filter(Boolean)])];
const teamName = d => (CONVS || []).find(c => c.type === "dept" && c.dept === d)?.name || cap(String(d || "none").replace(/-/g, " "));

/* ===== TIME ===== */
const fmt = t => t?.toDate ? t.toDate().toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "";
const iso = () => new Date().toLocaleDateString("en-CA");
const late = t => t.status !== "Completed" && t.deadline && t.deadline < iso();
const sameDay = (a, b) => a.toDateString() === b.toDateString();
const dayLabel = d => sameDay(d, new Date()) ? "Today" : sameDay(d, new Date(Date.now() - 864e5)) ? "Yesterday" : d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });

/* ===== FEEDBACK: toast, errors, notifications, activity log ===== */
const toast = m => { buzz(); document.querySelectorAll(".toast").forEach(x => x.remove()); const t = h("div", { class: "toast", role: "status" }, m); document.body.append(t); setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 260); }, 2600); };
const fail = e => toast(e.code === "permission-denied" ? "Not permitted" : e.message);
const notify = (to, type, text) => Promise.all([...new Set(to)].filter(e => e !== mail()).map(e => addDoc(collection(db, "notifications"), { to: e, from: mail(), type, text, read: false, createdAt: serverTimestamp() }))).catch(() => {});
const log = a => addDoc(collection(db, "activityLogs"), { action: a, by: mail(), createdAt: serverTimestamp() }).catch(() => {});

/* ===== SAFE TEXT + LINKS ===== */
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
const linkify = (text, chips) => {
  const f = document.createDocumentFragment();
  text.split(/(https?:\/\/[^\s<>"']+)/g).forEach((p, i) => {
    if (i % 2) f.append(chips ? h("a", { class: "lc", href: p, target: "_blank", rel: "noopener noreferrer nofollow" }, ic("link", 14), host(p)) : h("a", { href: p, target: "_blank", rel: "noopener noreferrer nofollow" }, p));
    else f.append(document.createTextNode(p));
  });
  return f;
};
const safeUrl = u => /^https?:\/\//i.test(u || "");

/* ===== THEME (auto follows system; manual override) ===== */
const setTheme = t => {
  t === "auto" ? delete document.documentElement.dataset.theme : document.documentElement.dataset.theme = t;
  try { localStorage.setItem("theme", t); } catch {}
  document.querySelectorAll("meta[name=theme-color]").forEach(m => m.content = t === "dark" ? "#000000" : t === "light" ? "#F2F2F7" : m.media.includes("dark") ? "#000000" : "#F2F2F7");
};
let savedTheme = "auto"; try { savedTheme = localStorage.getItem("theme") || "auto"; } catch {}
setTheme(savedTheme);

/* ===== OVERLAYS: bottom sheet / modal, iOS alert, action sheet, context popover ===== */
const sheets = [];
function overlay(cls, panel, onClose) {
  const prev = document.activeElement; let closed = false;
  const api = { close() {
    if (closed) return; closed = true; sheets.splice(sheets.indexOf(api), 1); wrap.classList.add("out");
    setTimeout(() => { wrap.remove(); prev?.focus?.({ preventScroll: true }); onClose?.(); }, 230);
  } };
  const wrap = h("div", { class: "ov " + cls }, h("div", { class: "bd", onclick: () => api.close() }), panel);
  document.body.append(wrap); sheets.push(api);
  setTimeout(() => (panel.querySelector(".sb input:not([type=checkbox]),.sb textarea,.sb select") || panel.querySelector(".abtn,.sb button") || panel.querySelector("button"))?.focus({ preventScroll: true }), 60);
  return api;
}
function sheet(title, build, onClose, cls = "") {
  const body = h("div", { class: "sb" }); let api;
  const panel = h("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": title }, h("div", { class: "grab" }),
    h("div", { class: "sh" }, h("b", {}, title), h("button", { class: "ib", "aria-label": "Close", title: "Close", onclick: () => api.close() }, ic("x", 20))), body);
  api = overlay(cls, panel, onClose); build(body, api.close); return api;
}
// iOS-style alert: centered popup with hairline-divided buttons
function alertBox(title, msg, btns, onClose) {
  let api; const run = fn => () => { api.close(); fn?.(); };
  const panel = h("div", { class: "abx", role: "alertdialog", "aria-modal": "true", "aria-label": title },
    h("div", { class: "at" }, h("b", {}, title), msg ? h("p", {}, msg) : null),
    h("div", { class: "abs" }, ...btns.map(([l, fn, danger, bold]) => h("button", { class: "abtn" + (danger ? " red" : "") + (bold ? " b" : ""), onclick: run(fn) }, l))));
  return api = overlay("alert", panel, onClose);
}
const sure = (msg, label = "Delete", danger = true, title = "Are you sure?") => new Promise(res => {
  let yes = false; alertBox(title, msg, [["Cancel", null], [label, () => { yes = true; }, danger, true]], () => res(yes));
});
// iOS action sheet (touch) and macOS-style popover menu (mouse)
function actionSheet(title, items) {
  let api; const run = fn => () => { api.close(); setTimeout(fn, 250); };
  const panel = h("div", { class: "asx", role: "dialog", "aria-modal": "true", "aria-label": title || "Actions" },
    h("div", { class: "asg" }, title ? h("div", { class: "ast" }, title) : null, ...items.map(([l, fn, d]) => h("button", { class: "abtn" + (d ? " red" : ""), onclick: run(fn) }, l))),
    h("div", { class: "asg" }, h("button", { class: "abtn b", onclick: () => api.close() }, "Cancel")));
  return api = overlay("as", panel);
}
let pop = null; const closePop = () => { pop?.remove(); pop = null; };
function popMenu(x, y, items) {
  closePop();
  const m = h("div", { class: "pm", role: "menu" }, ...items.map(([l, fn, d]) => h("button", { role: "menuitem", class: d ? "red" : "", onclick: () => { closePop(); fn(); } }, l)));
  pop = h("div", { class: "pmb", onclick: closePop, oncontextmenu: e => { e.preventDefault(); closePop(); } }, m); document.body.append(pop);
  m.style.left = Math.max(8, Math.min(x, innerWidth - 216)) + "px"; m.style.top = Math.max(8, Math.min(y, innerHeight - items.length * 36 - 16)) + "px"; m.querySelector("button")?.focus();
}
const ctxMenu = (e, title, items) => e && matchMedia("(pointer:fine)").matches ? popMenu(e.clientX, e.clientY, items) : actionSheet(title, items);

// Form sheet with inline validation (replaces prompt() and inline forms)
const formSheet = (title, fields, label, run, note) => sheet(title, (b, close) => {
  const err = h("p", { class: "err", role: "alert" }), btn = h("button", { class: "btn wide", type: "submit" }, label);
  const rows = fields.map(([l, el]) => h("label", { class: "fr" }, h("span", {}, l), el));
  add(b, h("form", { class: "fm", novalidate: "", onsubmit: async e => {
    e.preventDefault(); err.textContent = "";
    const bad = fields.filter(([, el]) => el.required && !el.value.trim());
    rows.forEach((r, i) => r.classList.toggle("bad", bad.includes(fields[i])));
    if (bad.length) { err.textContent = "Fill in the highlighted fields."; bad[0][1].focus(); buzz(); return; }
    btn.disabled = true; btn.classList.add("load");
    try { await run(close, err); } catch (x) { fail(x); }
    btn.disabled = false; btn.classList.remove("load");
  } }, h("div", { class: "grp" }, ...rows), note, err, btn));
});
const inp = (ph, o = {}) => h("input", { placeholder: ph, ...o });
const sel = (opts, cur) => h("select", {}, ...opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return h("option", { value: v, ...(v === cur ? { selected: "" } : {}) }, l); }));
const picker = list => { const w = h("div", { class: "pick" }, ...list.map(x => h("label", {}, h("input", { type: "checkbox", value: x.id }), x.name || x.id))); w.values = () => [...w.querySelectorAll("input:checked")].map(i => i.value); return w; };
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { if (pop) closePop(); else sheets.at(-1)?.close(); }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (!U || sheets.length) return; const p = document.querySelector("#view .gsw input"); p ? p.focus() : palette(); }
});

/* ===== GESTURES: long-press / right-click menus, swipe actions ===== */
const press = (el, fn) => {
  let t; el.addEventListener("contextmenu", e => { e.preventDefault(); fn(e); });
  el.addEventListener("touchstart", () => { t = setTimeout(() => { buzz(); fn(null); }, 550); }, { passive: true });
  ["touchend", "touchmove", "touchcancel"].forEach(ev => el.addEventListener(ev, () => clearTimeout(t), { passive: true }));
};
const swipe = (row, label, fn, tone = "") => {
  const w = h("div", { class: "sw" }, h("button", { class: "swb " + tone, tabindex: "-1", "aria-hidden": "true", onclick: () => { row.classList.remove("open"); row.style.transform = ""; fn(); } }, label), row);
  let x0 = 0, y0 = 0, dx = 0, mv = false, live = false;
  w.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; mv = false; live = true; }, { passive: true });
  w.addEventListener("touchmove", e => {
    if (!live) return; const t = e.touches[0], d = t.clientX - x0;
    if (!mv && Math.abs(t.clientY - y0) > Math.abs(d)) { live = false; return; }
    if (Math.abs(d) > 8) mv = true;
    dx = Math.max(-96, Math.min(0, d + (row.classList.contains("open") ? -96 : 0))); row.style.transition = "none"; row.style.transform = `translateX(${dx}px)`;
  }, { passive: true });
  w.addEventListener("touchend", () => { if (!live) return; live = false; row.style.transition = ""; row.classList.toggle("open", dx < -48); row.style.transform = ""; }, { passive: true });
  w.addEventListener("click", e => { if (mv) { e.preventDefault(); e.stopPropagation(); mv = false; } }, true);
  press(row, e => ctxMenu(e, "", [[label, fn, tone !== "blue"]]));
  return w;
};

/* ===== UI PIECES ===== */
const ibtn = (icon, label, fn) => h("button", { class: "ib", "aria-label": label, title: label, onclick: fn }, ic(icon, 22));
const tbtn = (label, icon, fn) => h("button", { class: "tb", onclick: fn }, ic(icon, 16), label);
const empty = (icon, title, text, action, fn) => h("div", { class: "empty" }, ic(icon, 56), h("b", {}, title), h("span", {}, text || ""), action ? h("div", {}, h("button", { class: "btn", onclick: fn }, action)) : null);
const skel = n => h("div", { class: "grp ia" }, ...Array.from({ length: n }, () => h("div", { class: "li" }, h("span", { class: "sk", style: "width:40px;height:40px;border-radius:50%" }), h("div", { class: "gr" }, h("div", { class: "sk", style: "height:14px;width:60%;margin-bottom:8px" }), h("div", { class: "sk", style: "height:12px;width:85%" })))));
const seg = (opts, cur, on) => {
  const w = h("div", { class: "seg", role: "tablist" });
  const draw = () => w.replaceChildren(...opts.map(([v, l]) => h("button", { role: "tab", "aria-selected": String(v === cur), onclick: () => { cur = v; draw(); on(v); } }, l)));
  draw(); return w;
};
const ring = p => {
  const r = 36, c = 2 * Math.PI * r, g = S("circle", { class: "fg", cx: 48, cy: 48, r, "stroke-dasharray": c, "stroke-dashoffset": c });
  const v = S("svg", { class: "ring", width: 96, height: 96, viewBox: "0 0 96 96", role: "img", "aria-label": Math.round(p * 100) + "% complete" });
  v.append(S("circle", { class: "bgc", cx: 48, cy: 48, r }), g); requestAnimationFrame(() => requestAnimationFrame(() => g.setAttribute("stroke-dashoffset", c * (1 - p)))); return v;
};
const kv = (l, v) => h("div", { class: "li" }, h("span", {}, l), h("span", { class: "val" }, v));
const chip = (t, c) => h("span", { class: "chip " + (c || t).replace(/\s/g, "") }, t);
const annRow = a => h("div", { class: "card" }, h("b", {}, a.title), h("p", {}, linkify(a.body || "")), h("small", { class: "mu" }, fmt(a.createdAt)));

/* ===== UNIVERSAL SEARCH (pill under every title + Cmd/Ctrl+K palette; suggests as you type) ===== */
const navItems = () => [["Home", "dashboard", "home"], ["Inbox", "inbox", "inbox"], ["Chat", "chat", "chat"], ["Tasks", "tasks", "tasks"], ["Teams", "departments", "teams"], ["News", "announcements", "news"], ["Docs", "resources", "docs"], ["People", "members", "user"], ["Alerts", "notifications", "bell"], ["My profile", "profile", "id"], ...(ADMIN ? [["Admin", "admin", "admin"]] : [])];
const KI = { Notice: "inbox", Person: "user", Task: "tasks", News: "news", Doc: "docs", Channel: "chat" };
async function searchData() {
  if (SD && Date.now() - SDT < 6e4) return SD;
  const [t, a, r, cv, sn] = await Promise.all([getDocs(taskQ()), getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(50))), getDocs(resQ()), ADMIN ? loadConvs() : Promise.resolve(CONVS || []), ADMIN ? getDocs(query(collection(db, "officialNotices"), orderBy("createdAt", "desc"), limit(50))).catch(() => ({ docs: [] })) : Promise.resolve({ docs: [] })]);
  SDT = Date.now();
  return SD = [...MEMBERS.map(x => ({ k: "Person", s: `${x.name} ${x.id} ${x.designation || ""}`, t: x.name || x.id, go: "profile/" + encodeURIComponent(x.id) })),
    ...sn.docs.map(d => ({ k: "Notice", s: `${d.data().subject} ${d.data().body}`, t: d.data().subject, go: "inbox/" + encodeURIComponent("s:" + d.id) })),
    ...INBOX.map(n => ({ k: "Notice", s: `${n.subject} ${n.body} ${n.senderName}`, t: n.subject, go: "inbox/" + encodeURIComponent(n.id) })),
    ...t.docs.map(d => ({ k: "Task", s: `${d.data().title} ${d.data().description || ""}`, t: d.data().title, go: "tasks" })),
    ...a.docs.map(d => ({ k: "News", s: `${d.data().title} ${d.data().body}`, t: d.data().title, go: "announcements" })),
    ...r.docs.map(d => ({ k: "Doc", s: `${d.data().name} ${d.data().description || ""}`, t: d.data().name, go: "resources" })),
    ...(cv.some(c => c.id === "general") ? [] : [{ k: "Channel", s: "general", t: "General", go: "chat/general" }]),
    ...cv.map(c => ({ k: "Channel", s: convName(c), t: convName(c), go: "chat/" + encodeURIComponent(c.id) }))];
}
const hl = (t, q) => { const i = t.toLowerCase().indexOf(q); return !q || i < 0 ? t : h("span", {}, t.slice(0, i), h("mark", {}, t.slice(i, i + q.length)), t.slice(i + q.length)); };
function searchBox(pick, inline) {
  const i = h("input", { type: "search", placeholder: "Search", "aria-label": "Search", autocomplete: "off", enterkeyhint: "search" }), out = h("div", { class: "sgs" + (inline ? " in" : ""), role: "listbox" });
  let items = [], hit = [], at = 0, loaded = false;
  const load = () => { if (loaded) return; loaded = true; searchData().then(d => { items = d; draw(); }).catch(e => { loaded = false; fail(e); }); };
  const draw = () => {
    const q = i.value.trim().toLowerCase();
    const navs = navItems().filter(n => !q || n[0].toLowerCase().includes(q)).map(n => ({ k: "Go to", s: n[0], t: n[0], go: n[1], ico: n[2] }));
    const data = q ? items.filter(x => x.s.toLowerCase().includes(q)).sort((a, b) => b.t.toLowerCase().startsWith(q) - a.t.toLowerCase().startsWith(q)).slice(0, inline ? 30 : 7) : [];
    hit = [...data, ...(q ? navs.slice(0, 3) : navs)]; at = Math.min(at, Math.max(hit.length - 1, 0));
    set(out, h("div", { class: "sec" }, q ? "Suggestions" : "Jump to"), hit.length ? h("div", { class: "grp ia" }, ...hit.map((x, n) => h("button", { class: "li tap" + (n === at ? " on" : ""), role: "option", "aria-selected": String(n === at), onclick: () => pick(x) },
      h("span", { class: "sico sm" }, ic(x.ico || KI[x.k], 16)), h("div", { class: "gr" }, h("b", {}, hl(x.t, q))), h("span", { class: "f13 k" }, x.k)))) : h("p", { class: "mu s", style: "padding:8px 16px 14px" }, loaded && !items.length ? "Loading…" : "No matches. Try another word."));
  };
  i.onfocus = () => { load(); draw(); }; i.oninput = () => { at = 0; load(); draw(); };
  i.onkeydown = e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); at = (at + (e.key === "ArrowDown" ? 1 : -1) + hit.length) % (hit.length || 1); draw(); out.querySelector(".on")?.scrollIntoView({ block: "nearest" }); }
    else if (e.key === "Enter" && hit[at]) { e.preventDefault(); pick(hit[at]); }
    else if (e.key === "Escape" && !inline) { e.stopPropagation(); i.value = ""; i.blur(); }
  };
  out.addEventListener("pointerdown", e => e.preventDefault());
  if (inline) { load(); draw(); }
  return { el: h("div", { class: "gsw" + (inline ? " in" : "") }, h("label", { class: "gsi" }, ic("search", 18), i), out), input: i };
}
const pillSearch = () => searchBox(x => { document.activeElement?.blur?.(); go(x.go); }).el;
const palette = () => sheet("Search", (b, close) => add(b, searchBox(x => { close(); go(x.go); }, true).el), null, "pal");

// Page scaffold: sticky nav bar (collapses the large title on scroll) + universal search under the title
const page = (m, title, o = {}) => {
  if (o.wide) m.classList.add("w");
  add(m, h("header", { class: "nbar" }, h("div", {}, o.back ? ibtn("chevL", "Back", () => go(o.back)) : null), h("b", { class: "nt" }, title), h("div", { class: "nr" }, ...(o.actions || []))),
    h("div", { class: "hd" }, h("h1", { class: "lt" }, title), o.sub ? h("p", { class: "sub" }, o.sub) : null, o.nosearch ? null : pillSearch()));
  const b = h("div", { class: "pb" }); m.append(b); return b;
};

/* ===== TRUSTED-BACKEND HELPERS, AUDIT TRAIL, BADGES, WORKSPACE REACTIONS ===== */
const audit = (action, target, changes) => addDoc(collection(db, "auditLogs"), { action, target: target || null, by: mail(), changes: changes?.length ? changes : null, createdAt: serverTimestamp() }).catch(() => {});
const activity = (member, action) => addDoc(collection(db, "memberActivity"), { member, by: mail(), action, createdAt: serverTimestamp() }).catch(() => {});
// Creates the sign-in account with Firebase Authentication only (no backend). A temporary second app instance is used so the
// admin stays signed in. The member never gets a password from us: they set their own through the reset email.
async function createAuthAccount(email) {
  const sec = initializeApp(CFG, "aeon-create-" + Date.now()), sa = getAuth(sec);
  try {
    const pw = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(36)).join("") + "Aa1!";
    await createUserWithEmailAndPassword(sa, email, pw); await sendPasswordResetEmail(sa, email); return "created";
  } catch (e) {
    if (e.code === "auth/email-already-in-use") { await sendPasswordResetEmail(auth, email); return "exists"; }
    throw e;
  } finally { await signOut(sa).catch(() => {}); deleteApp(sec).catch(() => {}); }
}
const authMsg = e => ({ "auth/invalid-email": "That email address isn’t valid.", "auth/operation-not-allowed": "Turn on Email/Password sign-in in Firebase → Authentication → Sign-in method.", "auth/network-request-failed": "Network problem. Try again.", "auth/too-many-requests": "Too many attempts. Wait a minute and try again." })[e.code] || e.message;
const relT = t => { const d = t?.toDate?.(); if (!d) return ""; if (sameDay(d, new Date())) return d.toLocaleTimeString([], { timeStyle: "short" }); if (sameDay(d, new Date(Date.now() - 864e5))) return "Yesterday"; return d.toLocaleDateString([], { month: "short", day: "numeric" }); };
const fmtDate = s => s ? new Date(s + "T00:00:00").toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" }) : "—";
const toggle = (on, fn, label) => { const i = h("input", { type: "checkbox", role: "switch", "aria-label": label }); i.checked = on; i.onchange = () => fn(i.checked); return h("span", { class: "tg" }, i, h("i", {})); };
// Avatar that shows the member's profile picture (link set by an admin) and falls back to initials
const uav = (email, name, size = 40, color) => {
  const base = av(name || email, color || hue(name || email || "x"), size), p = PROFILES[email]?.photoURL;
  if (p && /^https?:\/\//i.test(p)) { const im = h("img", { src: p, alt: "", referrerpolicy: "no-referrer", loading: "lazy" }); im.addEventListener("error", () => im.remove()); base.classList.add("ph"); base.append(im); }
  return base;
};
const inboxUnread = () => INBOX.filter(n => !n.read && !n.archived).length;
const badges = () => {
  const a = NOTES.filter(d => !d.data().read).length, i = inboxUnread();
  const put = (sel, n) => document.querySelectorAll(sel).forEach(e => { e.textContent = n > 99 ? "99+" : n; e.hidden = !n; });
  put("[data-bell]", a); put("[data-ibell]", i); put("[data-bsum]", a + i);
};
// Official reactions: stored in workspaceReactions (id = emoji code points). Admins seed the first nine automatically.
const rxKey = e => [...e].map(c => c.codePointAt(0).toString(16)).join("-");
const defaultRx = [["🚀", "Launch"], ["🧠", "Smart"], ["⚡", "Fast"], ["🏆", "Win"], ["👀", "Looking"], ["✅", "Done"], ["🔥", "Fire"], ["❤️", "Love"], ["👍", "Like"]];
async function loadReactions() {
  try {
    const get = () => getDocs(query(collection(db, "workspaceReactions"), orderBy("order")));
    let s = await get();
    if (!s.size && ADMIN) { const b = writeBatch(db); defaultRx.forEach(([e, l], i) => b.set(doc(db, "workspaceReactions", rxKey(e)), { emoji: e, label: l, active: true, order: i + 1 })); await b.commit(); s = await get(); }
    WR = s.docs.map(d => ({ key: d.id, ...d.data() }));
  } catch { WR = []; }
}
// Live inbox: one query on the member's own recipient records
function startInbox() {
  isub?.();
  isub = onSnapshot(query(collection(db, "noticeRecipients"), where("to", "==", mail()), orderBy("createdAt", "desc"), limit(200)), s => {
    INBOX = s.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() })); badges(); onInbox?.();
  }, e => { console.warn(e); if (e.code === "failed-precondition") toast("Inbox needs its index: deploy firestore.indexes.json"); });
}
// Unique member IDs: a claim document per ID, created inside a transaction
async function claimMemberId(email, id, oldId) {
  await runTransaction(db, async tx => {
    if (id) { const r = doc(db, "memberIds", id), s = await tx.get(r); if (s.exists() && s.data().email !== email) throw new Error(`Member ID ${id} is already used by ${s.data().email}.`); tx.set(r, { email, claimedAt: serverTimestamp() }); }
    if (oldId && oldId !== id) tx.delete(doc(db, "memberIds", oldId));
  });
}
async function issueMemberId(email) {
  let out = "";
  await runTransaction(db, async tx => {
    const cr = doc(db, "counters", "members"), cs = await tx.get(cr); let n = cs.exists() ? cs.data().n : 0, id = "";
    for (let k = 0; k < 50; k++) { n++; id = "AEON-" + String(n).padStart(4, "0"); if (!(await tx.get(doc(db, "memberIds", id))).exists()) break; }
    tx.set(cr, { n }); tx.set(doc(db, "memberIds", id), { email, claimedAt: serverTimestamp() });
    tx.set(doc(db, "memberProfiles", email), { memberId: id, updatedAt: serverTimestamp(), updatedBy: mail() }, { merge: true }); out = id;
  });
  PROFILES[email] = { ...(PROFILES[email] || {}), memberId: out }; return out;
}

/* ===== AUTH ===== */
const shake = el => { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); };
$("#loginForm").onsubmit = async e => {
  e.preventDefault(); const b = $("#loginBtn"); $("#loginErr").textContent = ""; b.disabled = true; b.classList.add("load");
  try { await signInWithEmailAndPassword(auth, $("#email").value.trim(), $("#pass").value); }
  catch { $("#loginErr").textContent = "Wrong email or password."; shake($("#loginForm")); buzz(); }
  b.disabled = false; b.classList.remove("load");
};
$("#reset").onclick = async () => {
  const em = $("#email").value.trim();
  if (!em) { $("#loginErr").textContent = "Enter your email first."; return $("#email").focus(); }
  try { await sendPasswordResetEmail(auth, em); $("#loginErr").textContent = "Reset link sent. Check your inbox."; }
  catch { $("#loginErr").textContent = "Could not send reset email."; }
};
onAuthStateChanged(auth, async user => {
  clear(); U = user;
  if (!user) { nsub?.(); isub?.(); INBOX = []; PROFILES = {}; Object.assign(IBX, { tab: "inbox", q: "", f: "all", cat: "all", pri: "all" }); CONVS = SD = null; document.body.classList.remove("thr"); $("#shell").hidden = true; $("#login").hidden = false; return; }
  const deny = m => { signOut(auth).then(() => { $("#loginErr").textContent = m; }); };
  if (!user.emailVerified) return deny("Email not verified. Use 'Forgot password' to verify it.");
  try { await getDoc(doc(db, "settings", "adminProbe")); ADMIN = true; } catch { ADMIN = false; }   // admin comes only from the rules
  const m = await getDoc(doc(db, "members", mail())).catch(() => null);
  if (m?.exists()) ME = { ...m.data(), _doc: true }; else ME = { name: user.email.toLowerCase(), dept: "", status: "active" };
  if (!ADMIN && (!m?.exists() || ME.status !== "active")) return deny("This account is not an active member.");
  $("#adminNav").hidden = !ADMIN;
  $("#login").hidden = true; $("#shell").hidden = false;
  MEMBERS = (await getDocs(collection(db, "members")).catch(() => ({ docs: [] }))).docs.map(d => ({ id: d.id, ...d.data() }));
  PROFILES = {}; (await getDocs(collection(db, "memberProfiles")).catch(() => ({ docs: [] }))).docs.forEach(d => { PROFILES[d.id] = d.data(); });
  await loadReactions(); renderMe(); watch(); startInbox(); if (ADMIN) loadConvs().catch(() => {}); render();
});
// Profile chip at the bottom of the sidebar
const renderMe = () => set($("#sset"), uav(mail(), myName(), 36, hue(U.email)), h("div", { class: "gr" }, h("b", {}, myName()), h("span", {}, ADMIN ? "Admin" : teamName(ME.dept))), h("span", { class: "chev" }, ic("chevR", 14)));

/* ===== ROUTER (hash: #view or #view/arg) ===== */
const V = {}, TABS = ["dashboard", "chat", "tasks", "departments"];
const go = v => { if (location.hash.slice(1) === v) render(); else location.hash = v; };
addEventListener("hashchange", () => render());
$("#view").addEventListener("scroll", e => e.currentTarget.classList.toggle("sc", e.currentTarget.scrollTop > 38), { passive: true });
function render() {
  if (!U || $("#shell").hidden) return;
  let [v, arg] = location.hash.slice(1).split("/"); v = v || "dashboard";
  if (!V[v] || (v === "admin" && !ADMIN)) v = "dashboard";
  clear(); onNotes = null; onInbox = null; const tok = ++rt, view = $("#view"), m = h("div", { class: "page" });
  document.body.classList.remove("thr"); view.classList.toggle("fill", v === "chat"); view.classList.remove("sc");
  document.querySelectorAll("#side [data-v]").forEach(a => a.classList.toggle("on", a.dataset.v === v));
  const tab = TABS.includes(v) ? v : "more";
  document.querySelectorAll("#tabs [data-t]").forEach(a => { a.classList.toggle("on", a.dataset.t === tab); a.toggleAttribute("aria-current", a.dataset.t === tab); });
  view.replaceChildren(m); view.scrollTop = 0;
  Promise.resolve(V[v](m, arg ? decodeURIComponent(arg) : null, tok)).catch(fail);
}
$("#sset").onclick = () => settings();

/* ===== SHARED ACTIONS (used by pages and by the Admin console) ===== */
const taskQ = () => ADMIN ? collection(db, "tasks") : query(collection(db, "tasks"), where("assignees", "array-contains", mail()));
const resQ = () => ADMIN ? collection(db, "resources") : query(collection(db, "resources"), where("visibility", "==", "all"));
const STATUS = ["Not Started", "In Progress", "Under Review", "Completed", "On Hold"];
const CATS = ["Company Documents", "Technical Documentation", "Research Papers", "Marketing Materials", "Product Designs", "Code References", "Investor Presentations", "Legal Documents", "Other Resources"];
const teamOpts = (first) => [...(first ? [[first, first]] : []), ...teams().map(d => [d, teamName(d)])];

const annSheet = () => {
  const t = inp("Title", { required: "" }), bd = h("textarea", { placeholder: "Message (links allowed)", required: "" });
  formSheet("New announcement", [["Title", t], ["Message", bd]], "Publish", async close => {
    await addDoc(collection(db, "announcements"), { title: t.value, body: bd.value, author: mail(), createdAt: serverTimestamp() });
    notify(MEMBERS.map(x => x.id), "announcement", "New announcement: " + t.value); log("Announcement created: " + t.value); toast("Published"); close(); render();
  });
};
const taskSheet = () => {
  const f = { title: inp("Title", { required: "" }), desc: h("textarea", { placeholder: "Description / instructions" }), link: inp("https://…", { type: "url" }), pri: sel(["Low", "Medium", "High", "Urgent"], "Medium"), due: inp("", { type: "date" }), dept: sel(teamOpts("—")), who: picker(MEMBERS) };
  formSheet("New task", [["Title", f.title], ["Details", f.desc], ["Link", f.link], ["Priority", f.pri], ["Due", f.due], ["Team", f.dept], ["Assign to", f.who]], "Assign task", async close => {
    let a = f.who.values(); const d = f.dept.value === "—" ? "" : f.dept.value;
    if (d) a = [...new Set([...a, ...MEMBERS.filter(x => x.dept === d).map(x => x.id)])];
    if (!a.length) return toast("Pick people or a team");
    if (f.link.value && !safeUrl(f.link.value)) return toast("Link must start with http(s)://");
    await addDoc(collection(db, "tasks"), { title: f.title.value, description: f.desc.value, link: f.link.value, assignees: a, dept: d, priority: f.pri.value, status: "Not Started", deadline: f.due.value, createdBy: mail(), createdAt: serverTimestamp() });
    await notify(a, "task", "New task: " + f.title.value); log("Task assigned: " + f.title.value); toast("Task assigned"); close(); render();
  });
};
const memberSheet = () => {
  const n = inp("Name", { required: "", maxlength: "80" }), e = inp("name@company.com", { type: "email", required: "" }), d = sel(teamOpts()), r = inp("Designation", { maxlength: "80" }), j = inp("", { type: "date" }); j.value = iso();
  let acct = true; const sw = toggle(true, v => { acct = v; }, "Create sign-in account");
  formSheet("Add person", [["Name", n], ["Email", e], ["Team", d], ["Designation", r], ["Joined", j]], "Add member", async close => {
    const id = e.value.trim().toLowerCase();
    if (acct) { try { await createAuthAccount(id); } catch (x) { return toast(authMsg(x)); } }
    const wb = writeBatch(db);
    wb.set(doc(db, "members", id), { name: n.value.trim(), dept: d.value, designation: r.value.trim(), status: "active", createdAt: serverTimestamp() }, { merge: true });
    wb.set(doc(db, "memberProfiles", id), { memberId: "", photoURL: "", responsibilities: "", joiningDate: j.value, projects: [], bio: "", updatedAt: serverTimestamp(), updatedBy: mail() }, { merge: true });
    wb.set(doc(collection(db, "auditLogs")), { action: "Member added", target: id, by: mail(), changes: [`${n.value.trim()} · ${teamName(d.value)}`], createdAt: serverTimestamp() });
    wb.set(doc(collection(db, "memberActivity")), { member: id, by: mail(), action: "Added to AEON", createdAt: serverTimestamp() });
    await wb.commit();
    MEMBERS = MEMBERS.filter(x => x.id !== id).concat({ id, name: n.value.trim(), dept: d.value, designation: r.value.trim(), status: "active" }); PROFILES[id] = { memberId: "", joiningDate: j.value, projects: [] }; SD = null;
    try { await issueMemberId(id); } catch {}
    log("Member added: " + id); toast(acct ? "Member added. A password-setup email was sent." : "Member added"); close(); render();
  }, h("div", { class: "grp" }, h("label", { class: "li" }, h("div", { class: "gr" }, h("b", { style: "font-weight:500" }, "Create sign-in account"), h("span", { class: "mu f13", style: "white-space:normal" }, "Uses Firebase Authentication. The member gets an email to choose their own password.")), sw)));
};
const docSheet = () => {
  const f = { name: inp("Name", { required: "" }), desc: inp("Description"), url: inp("https://…", { type: "url", required: "" }), cat: sel(CATS), dept: sel(teamOpts("company")), vis: sel([["all", "Everyone"], ["admin", "Admins only"]]) };
  formSheet("Add document", [["Name", f.name], ["About", f.desc], ["Link", f.url], ["Category", f.cat], ["Team", f.dept], ["Visible to", f.vis]], "Add document", async close => {
    if (!safeUrl(f.url.value)) return toast("URL must start with http:// or https://");
    await addDoc(collection(db, "resources"), { name: f.name.value, description: f.desc.value, category: f.cat.value, dept: f.dept.value, url: f.url.value, visibility: f.vis.value, createdBy: mail(), createdAt: serverTimestamp() });
    log("Document added: " + f.name.value); SD = null; toast("Added"); close(); render();
  });
};
// A team = a team channel (conversation type "dept"). Same data model, no rules change.
const teamSheet = () => {
  const n = inp("e.g. Design", { required: "", maxlength: "30" });
  formSheet("New team", [["Name", n]], "Create team", async close => {
    const nm = n.value.trim(), slug = nm.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug) return toast("Use letters or numbers in the name");
    const ref = doc(db, "conversations", "dept_" + slug), ex = await getDoc(ref).catch(() => null);
    if (ex?.exists() || DEPTS.includes(slug) && ex?.exists()) return toast("That team already exists");
    await setDoc(ref, { type: "dept", dept: slug, name: cap(nm), createdAt: serverTimestamp() });
    (CONVS = CONVS || []).push({ id: "dept_" + slug, type: "dept", dept: slug, name: cap(nm) }); log("Team created: " + cap(nm)); toast("Team created"); close(); render();
  });
};
const setupChannels = async () => {
  try {
    await setDoc(doc(db, "conversations", "general"), { type: "general", name: "General", createdAt: serverTimestamp() });
    for (const d of DEPTS) await setDoc(doc(db, "conversations", "dept_" + d), { type: "dept", dept: d, name: cap(d), createdAt: serverTimestamp() });
    CONVS = null; log("Default channels created"); toast("Channels ready"); if (ADMIN) loadConvs().catch(() => {});
  } catch (e) { fail(e); }
};
const togglePerson = async x => {
  const on = x.status === "active";
  if (x.id === mail()) return toast("You can’t deactivate your own account");
  if (await sure(on ? `${x.name} will be locked out until you reactivate them.` : `${x.name} will be able to sign in again.`, on ? "Deactivate" : "Reactivate", on, `${on ? "Deactivate" : "Reactivate"} ${x.name}?`)) {
    try {
      await updateDoc(doc(db, "members", x.id), { status: on ? "inactive" : "active" }); const old = x.status; x.status = on ? "inactive" : "active";
      await audit(`Member ${on ? "deactivated" : "reactivated"}`, x.id, [`status: ${old} → ${x.status}`]); activity(x.id, `Account ${on ? "deactivated" : "reactivated"} by an administrator`); log(`Member ${x.status}: ${x.id}`);
      toast(on ? "Deactivated. Workspace access is revoked." : "Reactivated");
    } catch (e) { fail(e); }
    render();
  }
};
const personSheet = x => go("profile/" + encodeURIComponent(x.id));

/* ===== DASHBOARD ("Today") ===== */
const greet = () => { const x = new Date().getHours(); return x < 5 ? "Good evening" : x < 12 ? "Good morning" : x < 18 ? "Good afternoon" : "Good evening"; };
V.dashboard = async m => {
  const b = page(m, greet(), { wide: true, sub: myName() }); add(b, skel(3));
  const [t, an] = await Promise.all([getDocs(taskQ()), getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(3)))]);
  const ts = t.docs.map(d => d.data()), done = ts.filter(x => x.status === "Completed").length, over = ts.filter(late).length;
  const next = ts.filter(x => x.status !== "Completed").sort((a, c) => (a.deadline || "9").localeCompare(c.deadline || "9")).slice(0, 5);
  const unread = () => NOTES.filter(d => !d.data().read).length, alertN = h("b", {}, String(unread())), inboxN = h("b", {}, String(inboxUnread())), notices = INBOX.filter(n => !n.archived).sort((a, c) => (!a.read === !c.read ? msOf(c.createdAt) - msOf(a.createdAt) : a.read ? 1 : -1)).slice(0, 3);
  const stat = (icon, label, val, c, fn) => h("button", { class: "stat tap", style: `--c:${c}`, onclick: fn }, h("span", { class: "sico" }, ic(icon, 20)), val, h("span", { class: "sl" }, label));
  set(b, h("div", { class: "stats" },
    stat("alert", "Overdue", h("b", {}, String(over)), "var(--red)", () => go("tasks")),
    stat("clock", "Due today", h("b", {}, String(ts.filter(x => x.status !== "Completed" && x.deadline === iso()).length)), "var(--orange)", () => go("tasks")),
    stat("bell", "Unread alerts", alertN, "var(--ac)", () => go("notifications")),
    stat("inbox", "Unread notices", inboxN, "var(--green)", () => go("inbox"))),
    h("div", { class: "cols" },
      h("div", {}, h("div", { class: "card hero" }, ring(ts.length ? done / ts.length : 0), h("div", {}, h("b", { class: "big" }, `${done} of ${ts.length}`), h("span", { class: "mu" }, ts.length ? `tasks completed · ${Math.round(done / ts.length * 100)}%` : "No tasks yet"))),
        h("div", { class: "sec" }, "Up next"),
        next.length ? h("div", { class: "grp" }, ...next.map(x => h("button", { class: "li tap edge pri-" + x.priority, onclick: () => go("tasks") }, h("div", { class: "gr" }, h("b", {}, x.title), h("span", { class: "mu f13" }, x.deadline ? "Due " + x.deadline : "No due date")), late(x) ? chip("Overdue") : chip(x.status)))) : empty("tasks", "All clear", "Nothing is waiting on you.")),
      h("div", {}, h("div", { class: "sec" }, "Official inbox"), notices.length ? h("div", { class: "grp" }, ...notices.map(n => h("a", { class: "li tap", href: "#inbox/" + encodeURIComponent(n.id) }, n.read ? h("span", { style: "width:10px" }) : h("span", { class: "dot", "aria-label": "Unread" }), h("div", { class: "gr" }, h("b", {}, n.subject), h("span", { class: "mu f13" }, `${n.senderName} · ${relT(n.createdAt)}`)), n.priority !== "normal" ? chip(PRI[n.priority], PCLS[n.priority]) : null))) : empty("inbox", "Inbox is empty", "Official notices from admins appear here."),
        h("div", { class: "sec" }, "Latest announcements"),
        an.size ? h("div", {}, ...an.docs.map(d => annRow(d.data()))) : empty("news", "No announcements yet", "News from the team shows up here.", ADMIN && "New announcement", annSheet))));
  onNotes = () => { alertN.textContent = unread(); }; onInbox = () => { inboxN.textContent = inboxUnread(); };
};

/* ===== ANNOUNCEMENTS ===== */
V.announcements = async m => {
  const b = page(m, "News", { actions: ADMIN ? [tbtn("New", "plus", annSheet)] : [] }); add(b, skel(3));
  const s = await getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(30)));
  b.replaceChildren();
  if (!s.size) return add(b, empty("news", "No announcements yet", ADMIN ? "Share news with the whole team." : "News from the team shows up here.", ADMIN && "New announcement", annSheet));
  const del = async d => { if (await sure("This announcement will be removed for everyone.", "Delete", true, "Delete announcement?")) { await deleteDoc(d.ref).catch(fail); render(); } };
  s.docs.forEach(d => { const c = annRow(d.data()); add(b, ADMIN ? swipe(h("div", { class: "swr" }, c), "Delete", () => del(d)) : c); });
};

/* ===== CHAT ===== */
const convName = c => c.type === "dm" ? (MEMBERS.find(x => x.id === c.members.find(e => e !== mail()))?.name || "Direct message") : c.name;
const convAv = (c, s = 44) => c.type === "dm" ? uav(c.members.find(e => e !== mail()), convName(c), s) : c.type === "group" ? av(c.name, hue(c.name), s, "group") : c.type === "dept" ? deptAv(c.dept, s) : logoAv(s);
const convSub = c => c.type === "dm" ? "Direct message" : c.type === "group" ? `Group · ${c.members.length} members` : c.type === "dept" ? "Team channel" : "Everyone";
const ORD = { general: 0, dept: 1, group: 2, dm: 3 };
async function loadConvs(force) {
  if (CONVS && !force && Date.now() - CT < 6e4) return CONVS;
  let docs = [];
  if (ADMIN) docs = (await getDocs(collection(db, "conversations"))).docs;
  else {
    const ids = ["general", ...(ME.dept ? ["dept_" + ME.dept] : [])];
    const [a, b] = await Promise.all([Promise.all(ids.map(id => getDoc(doc(db, "conversations", id)).catch(() => null))), getDocs(query(collection(db, "conversations"), where("members", "array-contains", mail())))]);
    docs = [...a.filter(d => d?.exists()), ...b.docs];
  }
  CT = Date.now(); return CONVS = docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (ORD[a.type] - ORD[b.type]) || convName(a).localeCompare(convName(b)));
}
async function openDM(email) {
  const mem = [mail(), email].sort(), id = "dm_" + mem.join("__"), ref = doc(db, "conversations", id);
  try {
    const d = await getDoc(ref).catch(() => null);
    if (!d?.exists()) await setDoc(ref, { type: "dm", name: "", members: mem, createdAt: serverTimestamp() });
    if (CONVS && !CONVS.find(c => c.id === id)) CONVS.push({ id, type: "dm", name: "", members: mem });
    go("chat/" + id);
  } catch (e) { fail(e); }
}
const newDM = () => sheet("New message", (b, close) => {
  const others = MEMBERS.filter(x => x.id !== mail() && x.status === "active");
  add(b, others.length ? h("div", { class: "grp ia" }, ...others.map(x => h("button", { class: "li tap", onclick: () => { close(); openDM(x.id); } }, uav(x.id, x.name, 40), h("div", { class: "gr" }, h("b", {}, x.name || x.id), h("span", { class: "mu s" }, x.id))))) : empty("user", "No one to message yet", "Add people first."));
});
const newGroup = () => {
  const name = inp("Group name", { required: "" }), pk = picker(MEMBERS.filter(x => x.id !== mail()));
  formSheet("New group", [["Name", name], ["Members", pk]], "Create group", async close => {
    const mem = [...new Set([mail(), ...pk.values()])]; if (mem.length < 2) return toast("Pick at least one member");
    const r = await addDoc(collection(db, "conversations"), { type: "group", name: name.value.trim(), members: mem, createdAt: serverTimestamp() });
    CONVS?.push({ id: r.id, type: "group", name: name.value.trim(), members: mem }); log("Group created: " + name.value.trim()); close(); go("chat/" + r.id);
  });
};
V.chat = async (m, id, tok) => {
  const wide = matchMedia("(min-width:900px)").matches;
  const list = h("aside", { class: "clist" }, h("div", { class: "lh" }, h("h1", {}, "Chat"), h("div", {}, ibtn("edit", "New message", newDM), ADMIN ? ibtn("group", "New group", newGroup) : null)), pillSearch());
  const th = h("section", { class: "thread" }); m.append(h("div", { class: "split" + (id ? " has" : "") }, list, th));
  const sk = skel(4); list.append(sk);
  const convs = await loadConvs().catch(e => { fail(e); return []; }); if (tok !== rt) return;
  if (!id && wide && convs[0]) id = convs[0].id;
  const cur = convs.find(c => c.id === id); m.firstChild.classList.toggle("has", !!cur);
  document.body.classList.toggle("thr", !!cur && !wide);
  sk.remove();
  const row = c => h("a", { class: "li tap" + (c.id === id ? " cur" : ""), href: "#chat/" + encodeURIComponent(c.id) }, convAv(c), h("div", { class: "gr" }, h("b", {}, convName(c)), h("span", { class: "mu s" }, convSub(c))), ic("chevR", 16));
  const sec = (l, a) => a.length ? [h("div", { class: "sec cs" }, l), h("div", { class: "grp ia" }, ...a.map(row))] : [];
  add(list, ...(convs.length ? [...sec("Channels", convs.filter(c => c.type === "general" || c.type === "dept")), ...sec("Groups", convs.filter(c => c.type === "group")), ...sec("Direct messages", convs.filter(c => c.type === "dm"))] : [empty("chat", "No conversations", "Start a direct message.", "New message", newDM)]));
  if (!cur) return add(th, empty("chat", "Select a conversation", "Pick a chat from the list."));
  openThread(th, cur);
};
/* ===== CHAT THREAD: role colours, identity, reactions, (+) menu with API keys and alerts ===== */
const senderName = () => ME._doc ? ME.name : myName();
const apiCard = g => {
  let shown = false, timer;
  const mask = "•".repeat(14), val = h("code", { class: "apik" }, mask), btn = h("button", { class: "apib", type: "button" }, ic("key", 15), "Tap to reveal key");
  const cp = h("button", { class: "apib", type: "button", hidden: "", onclick: () => navigator.clipboard?.writeText(g.apiKey).then(() => toast("Key copied"), () => toast("Copy failed")) }, ic("copy", 15), "Copy");
  btn.onclick = () => { shown = !shown; clearTimeout(timer); val.textContent = shown ? g.apiKey : mask; btn.replaceChildren(ic("key", 15), shown ? "Hide key" : "Tap to reveal key"); cp.hidden = !shown; if (shown) timer = setTimeout(() => shown && btn.onclick(), 20000); };
  return h("div", { class: "apic" }, h("div", { class: "apih" }, ic("key", 16), h("b", {}, g.apiTitle || "API")),
    h("details", { class: "apid" }, h("summary", {}, ic("folder", 16), "Description"), h("p", {}, linkify(g.apiDesc || "No description provided."))),
    val, h("div", { class: "apia" }, btn, cp));
};
function openThread(th, c) {
  const box = h("div", { class: "msgs", role: "log", "aria-live": "polite" }), seen = new Set(), RX = new Map(), rxBoxes = new Map(); let first = true;
  const jump = h("button", { class: "jump", onclick: () => box.scrollTo({ top: box.scrollHeight, behavior: "smooth" }) }, ic("down", 16), "Latest");
  const ta = h("textarea", { rows: "1", placeholder: "Message", maxlength: "2000", "aria-label": "Message", enterkeyhint: "send" });
  const sb = h("button", { class: "sendb", type: "button", "aria-label": "Send message", title: "Send", onclick: () => send() }, ic("send", 20));
  const grow = () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; sb.classList.toggle("on", !!ta.value.trim()); };
  // role is set from the user's real admin status; the rules reject a role that does not match
  const post = (text, extra = {}) => addDoc(collection(db, "conversations", c.id, "messages"), { text, sender: mail(), name: senderName(), role: ADMIN ? "admin" : "member", createdAt: serverTimestamp(), ...extra });
  const audience = () => c.members || (c.type === "dept" ? MEMBERS.filter(x => x.dept === c.dept && x.status === "active").map(x => x.id) : MEMBERS.filter(x => x.status === "active").map(x => x.id));
  const send = async () => {
    const text = ta.value.trim(); if (!text) return; ta.value = ""; grow();
    try { await post(text); if (c.members) notify(c.members, "message", `${myName()}: ${text.slice(0, 80)}`); }
    catch (x) { fail(x); ta.value = text; grow(); }
  };
  ta.oninput = grow; ta.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } };
  box.onscroll = () => jump.classList.toggle("on", box.scrollHeight - box.scrollTop - box.clientHeight > 220);
  // (+) menu: API sharing and emergency alert
  const apiSheet = () => {
    const t = inp("e.g. Maps API", { required: "", maxlength: "80" }), d = h("textarea", { placeholder: "What is this API for? Where is it used?", maxlength: "500" }), k = inp("Paste the API key", { required: "", maxlength: "500", autocomplete: "off", spellcheck: "false" });
    formSheet("Share an API", [["Name", t], ["Folder note", d], ["API key", k]], "Send API", async close => {
      await post(`API · ${t.value.trim()}`, { type: "api", apiTitle: t.value.trim(), apiDesc: d.value.trim(), apiKey: k.value.trim() }); toast("API shared"); close();
    }, h("p", { class: "mu f13", style: "padding:0 4px 12px" }, "The key stays hidden in chat until someone taps it, but anyone in this conversation (and workspace admins) can reveal it. Only share keys meant for this group."));
  };
  const alertSheet = () => {
    const t = h("textarea", { placeholder: "Describe the emergency or urgent issue…", maxlength: "500", required: "" });
    formSheet("Emergency alert", [["Message", t]], "Send alert", async close => {
      if (!(await sure(`Everyone in ${convName(c)} will be notified right away.`, "Send alert", true, "Send emergency alert?"))) return;
      const msg = t.value.trim(); await post(msg, { type: "alert" }); notify(audience(), "alert", `ALERT in ${convName(c)}: ${msg.slice(0, 200)}`); toast("Alert sent"); close();
    }, h("p", { class: "mu f13", style: "padding:0 4px 12px" }, "Shown as a red message and sent as an alert notification. Use it for emergencies and urgent incidents only."));
  };
  const plus = h("button", { class: "plus", type: "button", "aria-label": "Share an API or send an alert", title: "More", onclick: e => ctxMenu(e, "Send", [["Share an API…", apiSheet], ["Send emergency alert…", alertSheet, true]]) }, ic("plus", 22));
  add(th, h("header", { class: "th" }, h("button", { class: "ib back", "aria-label": "Back to chats", title: "Back", onclick: () => go("chat") }, ic("chevL")), convAv(c, 36), h("div", { class: "gr" }, h("b", {}, convName(c)), h("span", {}, convSub(c)))), box, jump, h("div", { class: "comp" }, plus, ta, sb));
  // reactions
  const wi = k => { const i = WR.findIndex(r => r.key === k); return i < 0 ? 99 : i; };
  const paintRx = mid => {
    const el = rxBoxes.get(mid), m = RX.get(mid); if (!el) return;
    set(el, ...(m ? [...m.entries()].sort((a, b) => wi(a[0]) - wi(b[0])).map(([key, v]) => h("button", { class: "rxc" + (v.users.has(mail()) ? " me" : ""), "aria-pressed": String(v.users.has(mail())), title: [...v.users].map(nameOf).join(", "), onclick: () => toggleRx(mid, key, v.emoji) }, v.emoji, h("span", {}, String(v.users.size)))) : [])); el.hidden = !(m && m.size);
  };
  const toggleRx = async (mid, key, emoji) => {
    const ref = doc(db, "conversations", c.id, "reactions", `${mid}__${key}__${mail()}`);
    try { if (RX.get(mid)?.get(key)?.users.has(mail())) await deleteDoc(ref); else await setDoc(ref, { mid, key, emoji, by: mail(), createdAt: serverTimestamp() }); } catch (e) { fail(e); }
  };
  subs.push(onSnapshot(query(collection(db, "conversations", c.id, "reactions"), orderBy("createdAt", "desc"), limit(600)), s => {
    RX.clear(); s.docs.forEach(d => { const r = d.data(); if (!RX.has(r.mid)) RX.set(r.mid, new Map()); const m = RX.get(r.mid); if (!m.has(r.key)) m.set(r.key, { emoji: r.emoji, users: new Set() }); m.get(r.key).users.add(r.by); });
    rxBoxes.forEach((_, mid) => paintRx(mid));
  }, () => {}));
  const delMsg = async x => { if (await sure("This message will be removed for everyone.", "Delete", true, "Delete message?")) deleteDoc(x.ref).catch(fail); };
  const msgPop = (e, bub, g) => {
    closePop();
    const act = WR.filter(r => r.active), key = g.type === "api";
    const items = [[key ? "Copy API key" : "Copy text", () => navigator.clipboard?.writeText(key ? g.apiKey : g.text).then(() => toast("Copied"), () => toast("Copy failed"))], ...(ADMIN ? [["Delete message", () => delMsg(g), true]] : [])];
    const bar = act.length ? h("div", { class: "rbar", role: "group", "aria-label": "Add reaction" }, ...act.map(r => h("button", { title: r.label, "aria-label": r.label, onclick: () => { closePop(); toggleRx(g.id, r.key, r.emoji); } }, r.emoji))) : h("p", { class: "mu f13", style: "padding:8px 12px" }, ADMIN ? "Add reactions in Admin → Manage reactions." : "No reactions available yet.");
    const m = h("div", { class: "pm wide", role: "menu" }, bar, ...items.map(([l, fn, d]) => h("button", { role: "menuitem", class: d ? "red" : "", onclick: () => { closePop(); fn(); } }, l)));
    pop = h("div", { class: "pmb", onclick: closePop, oncontextmenu: ev => { ev.preventDefault(); closePop(); } }, m); document.body.append(pop);
    const r = bub.getBoundingClientRect(), x = e ? e.clientX : r.left + r.width / 2 - m.offsetWidth / 2, y = e ? e.clientY : r.top;
    m.style.left = Math.max(8, Math.min(x, innerWidth - m.offsetWidth - 8)) + "px";
    m.style.top = Math.max(8, y + m.offsetHeight + 16 > innerHeight ? y - m.offsetHeight - 8 : y + 8) + "px"; m.querySelector("button")?.focus();
  };
  subs.push(onSnapshot(query(collection(db, "conversations", c.id, "messages"), orderBy("createdAt", "desc"), limit(60)), s => {
    const atBot = first || box.scrollHeight - box.scrollTop - box.clientHeight < 80, top = box.scrollTop;
    const ms = s.docs.slice().reverse().map(x => ({ ref: x.ref, id: x.id, pend: x.metadata.hasPendingWrites, ...x.data() }));
    ms.forEach(g => g.d = g.createdAt?.toDate?.() || new Date());
    const grp = (a, b) => a && b && a.sender === b.sender && sameDay(a.d, b.d) && Math.abs(b.d - a.d) < 3e5;
    box.replaceChildren(); rxBoxes.clear(); let day = "";
    if (!ms.length) box.append(empty("chat", "No messages yet", "Say hello."));
    ms.forEach((g, i) => {
      if (day !== g.d.toDateString()) { day = g.d.toDateString(); box.append(h("div", { class: "day" }, dayLabel(g.d))); }
      const mine = g.sender === mail(), role = g.role === "admin" ? "admin" : "member", ty = g.type || "text", f = !grp(ms[i - 1], g), l = !grp(g, ms[i + 1]), isNew = !first && !seen.has(g.id), t = g.d.toLocaleTimeString([], { timeStyle: "short" }); seen.add(g.id);
      const bub = h("div", { class: "bb" + (ty === "alert" ? " alert" : ty === "api" ? " api" : "") }, ty === "alert" ? h("div", { class: "ah" }, ic("alert", 15), "EMERGENCY ALERT") : null, ty === "api" ? apiCard(g) : linkify(g.text, true), h("span", { class: "bt" }, t));
      press(bub, e => msgPop(e, bub, g));
      const rxb = h("div", { class: "rx", hidden: "" }); rxBoxes.set(g.id, rxb);
      const who = f ? h("div", { class: "who" }, h("b", {}, g.name || g.sender), role === "admin" ? h("span", { class: "abdg" }, "Admin") : null, h("span", { class: "wt" }, t)) : null;
      const pic = f ? uav(g.sender, g.name, 30) : h("span", { class: "sp" }), more = h("button", { class: "rxadd", "aria-label": "React or more actions", title: "React", onclick: e => { e.stopPropagation(); msgPop(e, bub, g); } }, ic("smile", 17));
      const bw = h("div", { class: "bw" }, who, bub, rxb);
      box.append(h("div", { class: `mr r-${role}${mine ? " mine" : ""}${ty === "alert" ? " alertm" : ""}${f ? " f" : ""}${l ? " l" : ""}${isNew ? " pop" : ""}` }, ...(mine ? [more, bw, pic] : [pic, bw, more])));
      paintRx(g.id);
    });
    const last = ms.at(-1); if (last && last.sender === mail()) box.append(h("div", { class: "dlv" }, last.pend ? "Sending…" : "Delivered"));
    box.scrollTop = atBot ? box.scrollHeight : top; first = false;
  }, fail));
}

/* ===== OFFICIAL INBOX (Apple Mail style): one private record per recipient ===== */
const PRI = { normal: "Normal", important: "Important", urgent: "Urgent" }, PCLS = { normal: "Low", important: "High", urgent: "Urgent" };
const CAT = { general: "General announcement", meeting: "Meeting notice", instruction: "Important instruction", policy: "Policy update", project: "Project update", admin: "Administrative notice" };
const IBX = { tab: "inbox", q: "", f: "all", cat: "all", pri: "all" }, autoRead = new Set();
const msOf = t => t?.toMillis?.() ?? 0;
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const noticeBits = o => ({ subject: o.subject, body: o.body, priority: o.priority, category: o.category, requiresAck: o.requiresAck, ackDeadline: o.ackDeadline || null });

function composeSheet() {
  const people = MEMBERS.filter(x => x.status === "active" && x.id !== mail()); let mode = "all", pri = "normal";
  sheet("New official notice", (b, close) => {
    const audBox = h("div"), count = h("p", { class: "mu f13", style: "padding:0 16px 12px" });
    const dsel = sel(teamOpts()), one = sel(people.map(x => [x.id, x.name || x.id])), many = picker(people);
    const subj = inp("Subject", { maxlength: "140" }), cat = sel(Object.entries(CAT)), body = h("textarea", { placeholder: "Write your notice…", maxlength: "5000", rows: "7", "aria-label": "Message" });
    const dl = h("label", { class: "fr", hidden: "" }, h("span", {}, "Deadline"), inp("", { type: "date", min: iso() })), err = h("p", { class: "err", role: "alert" });
    const recips = () => mode === "all" ? people : mode === "dept" ? people.filter(x => x.dept === dsel.value) : mode === "one" ? people.filter(x => x.id === one.value) : people.filter(x => many.values().includes(x.id));
    const refresh = () => {
      set(audBox, mode === "dept" ? h("div", { class: "grp" }, h("label", { class: "fr" }, h("span", {}, "Department"), dsel)) : mode === "one" ? h("div", { class: "grp" }, h("label", { class: "fr" }, h("span", {}, "Person"), one)) : mode === "many" ? h("div", { class: "grp" }, h("div", { class: "fr" }, many)) : null);
      const n = recips().length; count.textContent = `Will be delivered to ${n} ${n === 1 ? "person" : "people"}.`;
    };
    [dsel, one].forEach(e => e.onchange = refresh); many.addEventListener("change", refresh);
    let ack = false; const ackRow = h("label", { class: "li" }, h("span", {}, "Require acknowledgement"), toggle(false, v => { ack = v; dl.hidden = !v; }, "Require acknowledgement"));
    const btn = h("button", { class: "btn wide", type: "button" }, "Send notice");
    btn.onclick = async () => {
      err.textContent = ""; const list = recips();
      if (!subj.value.trim() || !body.value.trim()) return err.textContent = "Add a subject and a message.";
      if (!list.length) return err.textContent = "Choose at least one recipient.";
      btn.disabled = true; btn.classList.add("load");
      try {
        const aud = mode === "all" ? "All active members" : mode === "dept" ? `Department: ${teamName(dsel.value)}` : `${list.length} selected ${list.length === 1 ? "person" : "people"}`;
        const dd = ack ? dl.querySelector("input").value || null : null;
        const nb = { ...noticeBits({ subject: subj.value.trim(), body: body.value.trim(), priority: pri, category: cat.value, requiresAck: ack, ackDeadline: dd }), senderEmail: mail(), senderName: senderName(), audience: aud };
        const nref = await addDoc(collection(db, "officialNotices"), { ...nb, recipientCount: list.length, createdAt: serverTimestamp() });
        let done = 0;
        for (const part of chunk(list, 400)) {
          const wb = writeBatch(db);
          part.forEach(x => wb.set(doc(db, "noticeRecipients", `${nref.id}_${x.id}`), { ...nb, noticeId: nref.id, to: x.id, read: false, readAt: null, acknowledged: false, ackAt: null, pinned: false, archived: false, createdAt: serverTimestamp() }));
          await wb.commit(); done += part.length;
        }
        audit("Official notice sent", "notice:" + nref.id, [`${nb.subject} → ${list.length} recipients (${aud})`]); log("Official notice sent: " + nb.subject);
        toast(`Delivered to ${done} ${done === 1 ? "person" : "people"}`); close(); IBX.tab = "sent"; go("inbox");
      } catch (e) { fail(e); err.textContent = "Sending failed. If some recipients were reached, open Sent to check delivery."; }
      btn.disabled = false; btn.classList.remove("load");
    };
    add(b, seg([["all", "All active"], ["dept", "Department"], ["many", "Selected"], ["one", "One person"]], mode, v => { mode = v; refresh(); }), audBox, count,
      h("div", { class: "grp" }, h("label", { class: "fr" }, h("span", {}, "Subject"), subj), h("label", { class: "fr" }, h("span", {}, "Category"), cat)),
      h("div", { class: "sec" }, "Priority"), seg(Object.entries(PRI), pri, v => { pri = v; }),
      h("div", { class: "grp" }, ackRow, dl), h("div", { class: "grp" }, h("div", { class: "fr" }, body)), err, btn);
    refresh();
  }, null, "mail");
}
function editNoticeSheet(nt, refs, after) {
  const f = { subj: inp("Subject", { maxlength: "140", required: "" }), cat: sel(Object.entries(CAT), nt.category), pri: sel(Object.entries(PRI), nt.priority), body: h("textarea", { maxlength: "5000", rows: "6", required: "" }), ack: sel([["no", "Not required"], ["yes", "Required"]], nt.requiresAck ? "yes" : "no"), dl: inp("", { type: "date" }) };
  f.subj.value = nt.subject; f.body.value = nt.body; f.dl.value = nt.ackDeadline || "";
  formSheet("Edit notice", [["Subject", f.subj], ["Category", f.cat], ["Priority", f.pri], ["Acknowledge", f.ack], ["Deadline", f.dl], ["Message", f.body]], "Save changes", async close => {
    const nb = noticeBits({ subject: f.subj.value.trim(), body: f.body.value.trim(), priority: f.pri.value, category: f.cat.value, requiresAck: f.ack.value === "yes", ackDeadline: f.dl.value || null });
    await updateDoc(doc(db, "officialNotices", nt.id), { ...nb, editedAt: serverTimestamp() });
    for (const part of chunk(refs, 400)) { const wb = writeBatch(db); part.forEach(r => wb.update(r, { ...nb, editedAt: serverTimestamp() })); await wb.commit(); }
    audit("Official notice edited", "notice:" + nt.id, [nb.subject]); toast("Notice updated"); close(); after();
  });
}
V.inbox = async (m, arg, tok) => {
  const wide = matchMedia("(min-width:900px)").matches, report = ADMIN && arg?.startsWith("s:"); if (!ADMIN) IBX.tab = "inbox"; else if (report) IBX.tab = "sent";
  const list = h("aside", { class: "clist mailist" }), rd = h("section", { class: "thread reader" });
  m.append(h("div", { class: "split" + (arg ? " has" : "") }, list, rd)); document.body.classList.toggle("thr", !!arg && !wide);
  const body = h("div", { class: "mlbody" }), q = h("input", { type: "search", class: "flt", placeholder: "Search notices", "aria-label": "Search notices" }); q.value = IBX.q;
  const csel = sel([["all", "All categories"], ...Object.entries(CAT)], IBX.cat), psel = sel([["all", "Any priority"], ...Object.entries(PRI)], IBX.pri); csel.className = psel.className = "pillsel"; csel.setAttribute("aria-label", "Filter by category"); psel.setAttribute("aria-label", "Filter by priority");
  const fseg = seg([["all", "All"], ["unread", "Unread"], ["pinned", "Pinned"], ["archived", "Archived"]], IBX.f, v => { IBX.f = v; drawList(); });
  let SENT = null;
  add(list, h("div", { class: "lh" }, h("h1", {}, "Inbox"), h("div", {}, ADMIN ? tbtn("Compose", "edit", composeSheet) : null)),
    h("div", { class: "mlt" }, ADMIN ? seg([["inbox", "Inbox"], ["sent", "Sent"]], IBX.tab, v => { IBX.tab = v; go("inbox"); }) : null, q, IBX.tab === "inbox" ? h("div", { class: "frow" }, csel, psel) : null, IBX.tab === "inbox" ? fseg : null), body);
  const drawList = async () => {
    if (IBX.tab === "sent") {
      if (!SENT) { set(body, skel(3)); try { SENT = (await getDocs(query(collection(db, "officialNotices"), orderBy("createdAt", "desc"), limit(50)))).docs.map(d => ({ id: d.id, ...d.data() })); } catch (e) { fail(e); SENT = []; } if (tok !== rt) return; }
      const rows = SENT.filter(n => (n.subject + n.body).toLowerCase().includes(IBX.q.toLowerCase()));
      return set(body, rows.length ? h("div", { class: "mlist" }, ...rows.map(n => h("a", { class: "mrow" + (arg === "s:" + n.id ? " cur" : ""), href: "#inbox/" + encodeURIComponent("s:" + n.id) }, h("span", { class: "mdot" }), h("div", { class: "mbody" }, h("div", { class: "mtop" }, h("b", { class: "msnd" }, n.audience), h("span", { class: "mtime" }, relT(n.createdAt))), h("div", { class: "msub" }, n.priority !== "normal" ? h("span", { class: "pflag " + PCLS[n.priority] }, ic("flag", 13)) : null, n.subject), h("div", { class: "mprev" }, `${n.recipientCount} recipients · ${CAT[n.category] || ""}`))))) : empty("inbox", "No notices sent yet", "Compose your first official notice.", "Compose", composeSheet));
    }
    const ql = IBX.q.toLowerCase();
    const rows = INBOX.filter(n => IBX.f === "archived" ? n.archived : !n.archived).filter(n => IBX.f === "unread" ? !n.read : IBX.f === "pinned" ? n.pinned : true)
      .filter(n => IBX.cat === "all" || n.category === IBX.cat).filter(n => IBX.pri === "all" || n.priority === IBX.pri)
      .filter(n => !ql || `${n.subject} ${n.body} ${n.senderName}`.toLowerCase().includes(ql)).sort((a, c) => (c.pinned - a.pinned) || (msOf(c.createdAt) - msOf(a.createdAt)));
    set(body, rows.length ? h("div", { class: "mlist" }, ...rows.map(n => h("a", { class: "mrow" + (n.read ? "" : " unread") + (n.id === arg ? " cur" : ""), href: "#inbox/" + encodeURIComponent(n.id) },
      h("span", { class: "mdot", "aria-label": n.read ? "Read" : "Unread" }, n.read ? null : h("i", {})),
      h("div", { class: "mbody" }, h("div", { class: "mtop" }, h("b", { class: "msnd" }, n.senderName, h("span", { class: "abdg" }, "Admin")), h("span", { class: "mtime" }, relT(n.createdAt))),
        h("div", { class: "msub" }, n.priority !== "normal" ? h("span", { class: "pflag " + PCLS[n.priority], title: PRI[n.priority] }, ic("flag", 13)) : null, h("span", { class: "st" }, n.subject), n.pinned ? ic("pin", 13) : null),
        h("div", { class: "mprev" }, prev(n.body)), h("div", { class: "mtags" }, chip(CAT[n.category] || "Notice", "Medium"), n.requiresAck ? chip(n.acknowledged ? "Acknowledged" : "Needs acknowledgement", n.acknowledged ? "Completed" : "High") : null))))) : empty("inbox", IBX.f === "all" && !ql ? "Inbox zero" : "No matching notices", IBX.f === "all" && !ql ? "Official notices from administrators appear here." : "Try another filter or search."));
  };
  const prev = s => String(s || "").replace(/\s+/g, " ").slice(0, 140);
  const back = () => h("button", { class: "ib back", "aria-label": "Back to inbox", title: "Back", onclick: () => go("inbox") }, ic("chevL"));
  const paintReader = async () => {
    if (!arg) return set(rd, empty("inbox", "Select a notice", "Choose a message from the list to read it."));
    if (report) return openReport(arg.slice(2));
    const n = INBOX.find(x => x.id === arg); if (!n) return set(rd, h("header", { class: "th" }, back(), h("div", { class: "gr" }, h("b", {}, "Notice"))), empty("inbox", "Notice not found", "It may have been withdrawn by an administrator."));
    if (!n.read && !autoRead.has(n.id)) { autoRead.add(n.id); updateDoc(n.ref, { read: true, readAt: serverTimestamp() }).catch(fail); }
    const late2 = n.requiresAck && !n.acknowledged && n.ackDeadline && n.ackDeadline < iso(), logo = h("span", { class: "appicon sm" }, "A"); withLogo(logo);
    const tool = (icon, label, fn, on) => h("button", { class: "ib" + (on ? " on" : ""), "aria-label": label, title: label, "aria-pressed": on == null ? null : String(!!on), onclick: fn }, ic(icon, 21));
    const ackBtn = h("button", { class: "btn", onclick: async () => {
      if (await sure(`Confirm that you have read and understood “${n.subject}”.`, "Acknowledge", false, "Acknowledge notice?")) {
        try { await updateDoc(n.ref, { acknowledged: true, ackAt: serverTimestamp() }); activity(mail(), `Acknowledged notice: ${n.subject}`.slice(0, 190)); toast("Acknowledged"); } catch (e) { fail(e); }
      } } }, ic("check", 18), "Acknowledge");
    set(rd, h("header", { class: "th" }, back(), h("div", { class: "gr" }, h("b", {}, "Official notice"), h("span", {}, CAT[n.category] || "Notice")),
      h("div", { class: "tools" }, tool("mail", n.read ? "Mark as unread" : "Mark as read", () => updateDoc(n.ref, n.read ? { read: false } : { read: true, readAt: serverTimestamp() }).catch(fail)), tool("pin", n.pinned ? "Unpin" : "Pin notice", () => updateDoc(n.ref, { pinned: !n.pinned }).catch(fail), n.pinned), tool("archive", n.archived ? "Move to inbox" : "Archive", () => updateDoc(n.ref, { archived: !n.archived }).then(() => toast(n.archived ? "Moved to inbox" : "Archived")).catch(fail), n.archived))),
      h("article", { class: "mread" }, h("div", { class: "mbrand" }, logo, h("div", {}, h("b", {}, "AEON"), h("span", {}, "OFFICIAL NOTICE"))),
        h("h2", { class: "msubj" }, n.subject),
        h("div", { class: "mmeta" }, uav(n.senderEmail, n.senderName, 44), h("div", { class: "gr" }, h("b", {}, n.senderName, h("span", { class: "abdg" }, "Admin")), h("span", { class: "mu f13" }, `To: you · ${fmt(n.createdAt)}`))),
        h("div", { class: "mchips" }, chip(PRI[n.priority] || "Normal", PCLS[n.priority] || "Low"), chip(CAT[n.category] || "Notice", "Medium"), n.pinned ? chip("Pinned", "UnderReview") : null),
        h("div", { class: "mtext" }, linkify(n.body)),
        n.requiresAck ? h("div", { class: "ackp" + (n.acknowledged ? " done" : late2 ? " late" : "") }, n.acknowledged ? h("div", { class: "gr" }, h("b", {}, "You acknowledged this notice"), h("span", { class: "f13" }, fmt(n.ackAt))) : h("div", { class: "gr" }, h("b", {}, "Acknowledgement required"), h("span", { class: "f13" }, n.ackDeadline ? `${late2 ? "Overdue since" : "Please acknowledge by"} ${fmtDate(n.ackDeadline)}` : "Please confirm you have read this notice.")), n.acknowledged ? ic("check", 22) : ackBtn) : null,
        h("p", { class: "mfoot" }, "Official AEON notice. Content can only be edited by administrators.")));
  };
  const openReport = async id => {
    set(rd, h("header", { class: "th" }, back(), h("div", { class: "gr" }, h("b", {}, "Delivery report"))), skel(2));
    try {
      const [ns, rs] = await Promise.all([getDoc(doc(db, "officialNotices", id)), getDocs(query(collection(db, "noticeRecipients"), where("noticeId", "==", id)))]);
      if (tok !== rt) return;
      if (!ns.exists()) return set(rd, h("header", { class: "th" }, back(), h("div", { class: "gr" }, h("b", {}, "Report"))), empty("inbox", "Notice not found", "It may have been deleted."));
      const nt = { id, ...ns.data() }, R = rs.docs.map(d => d.data()), refs = rs.docs.map(d => d.ref);
      const opened = R.filter(r => r.readAt).length, acked = R.filter(r => r.acknowledged).length, unread = R.filter(r => !r.read).length;
      const tile = (l, v, c) => h("div", { class: "stat", style: `--c:${c}` }, h("b", {}, String(v)), h("span", { class: "sl" }, l));
      set(rd, h("header", { class: "th" }, back(), h("div", { class: "gr" }, h("b", {}, "Delivery report"), h("span", {}, nt.audience)), h("div", { class: "tools" }, ibtn("edit", "Edit notice", () => editNoticeSheet(nt, refs, () => render())), ibtn("trash", "Delete notice", async () => {
        if (await sure("The notice is removed from every recipient’s inbox. This can’t be undone.", "Delete", true, "Delete notice?")) { try { for (const p of chunk(refs, 400)) { const wb = writeBatch(db); p.forEach(r => wb.delete(r)); await wb.commit(); } await deleteDoc(doc(db, "officialNotices", id)); audit("Official notice deleted", "notice:" + id, [nt.subject]); toast("Notice deleted"); SENT = null; go("inbox"); } catch (e) { fail(e); } } }))),
        h("article", { class: "mread" }, h("h2", { class: "msubj" }, nt.subject), h("div", { class: "mchips" }, chip(PRI[nt.priority], PCLS[nt.priority]), chip(CAT[nt.category] || "Notice", "Medium"), h("span", { class: "mu f13" }, fmt(nt.createdAt))),
          h("div", { class: "stats five" }, tile("Total recipients", R.length, "var(--ac)"), tile("Delivered", R.length, "var(--green)"), tile("Opened", opened, "var(--orange)"), tile("Acknowledged", nt.requiresAck ? `${acked}/${R.length}` : "n/a", "var(--green)"), tile("Unread", unread, "var(--red)")),
          h("div", { class: "sec" }, "Recipients"), h("div", { class: "grp ia" }, ...R.sort((a, c) => (a.read - c.read)).map(r => h("div", { class: "li" }, uav(r.to, nameOf(r.to), 36), h("div", { class: "gr" }, h("b", {}, nameOf(r.to)), h("span", { class: "mu f13" }, r.readAt ? `Opened ${fmt(r.readAt)}` : "Not opened yet")), r.read ? chip("Read", "Completed") : chip("Unread", "Low"), nt.requiresAck ? (r.acknowledged ? chip("Acknowledged", "Completed") : chip("Pending", "High")) : null))),
          h("div", { class: "mtext", style: "margin-top:20px" }, linkify(nt.body))));
    } catch (e) { fail(e); }
  };
  q.oninput = () => { IBX.q = q.value; drawList(); }; csel.onchange = () => { IBX.cat = csel.value; drawList(); }; psel.onchange = () => { IBX.pri = psel.value; drawList(); };
  onInbox = () => { if (!report) { drawList(); paintReader(); } };
  drawList(); paintReader();
};

/* ===== QR CODE (byte mode, error correction M, versions 1-10; no libraries) ===== */
const QR_ECC = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26], QR_BLK = [1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const qrRaw = v => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const a = Math.floor(v / 7) + 2; r -= (25 * a - 10) * a - 55; if (v >= 7) r -= 36; } return r; };
const gfMul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z; };
const rsDiv = (data, deg) => {
  let g = [1]; for (let i = 0, r = 1; i < deg; i++) { const n = [...g, 0]; for (let j = 0; j < g.length; j++) { n[j + 1] ^= gfMul(g[j], r); } g = n; r = gfMul(r, 2); }
  g = g.slice(1); const res = new Array(deg).fill(0);
  for (const b of data) { const f = b ^ res.shift(); res.push(0); g.forEach((c, i) => { res[i] ^= gfMul(c, f); }); }
  return res;
};
function qrMatrix(text) {
  const bytes = [...new TextEncoder().encode(text)]; let ver = 0, cap = 0;
  for (let v = 1; v <= 10; v++) { cap = Math.floor(qrRaw(v) / 8) - QR_ECC[v - 1] * QR_BLK[v - 1]; if (4 + (v < 10 ? 8 : 16) + 8 * bytes.length <= cap * 8) { ver = v; break; } }
  if (!ver) throw new Error("QR data too long");
  const bits = []; const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, ver < 10 ? 8 : 16); bytes.forEach(b => put(b, 8));
  put(0, Math.min(4, cap * 8 - bits.length)); while (bits.length % 8) bits.push(0);
  const data = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let p = 0xEC; data.length < cap; p ^= 0xEC ^ 0x11) data.push(p);
  const nb = QR_BLK[ver - 1], ecl = QR_ECC[ver - 1], raw = Math.floor(qrRaw(ver) / 8), short = nb - raw % nb, sl = Math.floor(raw / nb);
  const blocks = []; for (let i = 0, k = 0; i < nb; i++) { const d = data.slice(k, k + sl - ecl + (i < short ? 0 : 1)); k += d.length; blocks.push({ d, e: rsDiv(d, ecl) }); }
  const all = []; for (let i = 0; i < blocks[nb - 1].d.length; i++) blocks.forEach(b => { if (i < b.d.length) all.push(b.d[i]); });
  for (let i = 0; i < ecl; i++) blocks.forEach(b => all.push(b.e[i]));
  const n = ver * 4 + 17, M = Array.from({ length: n }, () => new Array(n).fill(false)), F = Array.from({ length: n }, () => new Array(n).fill(false));
  const set = (x, y, d) => { if (x >= 0 && x < n && y >= 0 && y < n) { M[y][x] = d; F[y][x] = true; } };
  for (let i = 0; i < n; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const finder = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)); set(cx + dx, cy + dy, d !== 2 && d !== 4); } };
  finder(3, 3); finder(n - 4, 3); finder(3, n - 4);
  const na = ver === 1 ? 0 : Math.floor(ver / 7) + 2, step = ver === 1 ? 0 : Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2, al = [6];
  for (let p = n - 7; al.length < na; p -= step) al.splice(1, 0, p);
  al.forEach((ax, i) => al.forEach((ay, j) => { if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) return; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }));
  const fmt = mask => { // level M = 0b00
    let d = mask, r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537); const bitsF = ((d << 10) | r) ^ 0x5412, g = i => ((bitsF >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) set(8, i, g(i)); set(8, 7, g(6)); set(8, 8, g(7)); set(7, 8, g(8)); for (let i = 9; i < 15; i++) set(14 - i, 8, g(i));
    for (let i = 0; i < 8; i++) set(n - 1 - i, 8, g(i)); for (let i = 8; i < 15; i++) set(8, n - 15 + i, g(i)); set(8, n - 8, true);
  };
  fmt(0);
  if (ver >= 7) { let r = ver; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25); const v = (ver << 12) | r; for (let i = 0; i < 18; i++) { const b = ((v >>> i) & 1) !== 0, a = n - 11 + (i % 3), c = Math.floor(i / 3); set(a, c, b); set(c, a, b); } }
  const bitsAll = []; all.forEach(b => put2(b)); function put2(b) { for (let i = 7; i >= 0; i--) bitsAll.push((b >>> i) & 1); }
  let k = 0; for (let right = n - 1; right >= 1; right -= 2) { if (right === 6) right = 5; for (let v = 0; v < n; v++) for (let j = 0; j < 2; j++) { const x = right - j, y = ((right + 1) & 2) === 0 ? n - 1 - v : v; if (!F[y][x] && k < bitsAll.length) M[y][x] = bitsAll[k++] === 1; } }
  const masks = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0, (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0];
  const apply = m => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!F[y][x] && masks[m](x, y)) M[y][x] = !M[y][x]; };
  const penalty = () => {
    let p = 0, dark = 0;
    for (let y = 0; y < n; y++) { let run = 1; for (let x = 1; x < n; x++) { if (M[y][x] === M[y][x - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
    for (let x = 0; x < n; x++) { let run = 1; for (let y = 1; y < n; y++) { if (M[y][x] === M[y - 1][x]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = M[y][x]; if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) p += 3; }
    M.forEach(r => r.forEach(c => { if (c) dark++; })); p += Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10; return p;
  };
  let best = 0, bp = 1e9; for (let m = 0; m < 8; m++) { apply(m); fmt(m); const p = penalty(); if (p < bp) { bp = p; best = m; } apply(m); }
  apply(best); fmt(best); return M;
}

/* ===== MEMBER PROFILE + OFFICIAL ID CARD (internal membership card, not a government ID) ===== */
const mem = e => MEMBERS.find(x => x.id === e), pf = e => PROFILES[e] || {};
const qrLink = id => location.href.split("#")[0] + "#id/" + encodeURIComponent(id);   // the QR holds only this link, never personal data
const qrSvg = (text, px = 100) => {
  const M = qrMatrix(text), n = M.length, q = 2; let d = ""; M.forEach((r, y) => r.forEach((c, x) => { if (c) d += `M${x + q} ${y + q}h1v1h-1z`; }));
  const v = S("svg", { viewBox: `0 0 ${n + q * 2} ${n + q * 2}`, width: px, height: px, role: "img", "aria-label": "Member QR code", "shape-rendering": "crispEdges" });
  v.append(S("rect", { width: n + q * 2, height: n + q * 2, fill: "#fff" }), S("path", { d, fill: "#000" })); return v;
};
const idCard = email => {
  const x = mem(email) || {}, p = pf(email), active = x.status === "active", color = dcol(x.dept), logo = h("span", { class: "appicon sm" }, "A"); withLogo(logo);
  const fld = (l, v) => h("div", {}, h("span", {}, l), h("b", {}, v));
  return h("div", { class: "idc", style: `--c:${color}`, role: "img", "aria-label": `AEON membership card for ${x.name || email}` },
    h("div", { class: "idt" }, logo, h("div", {}, h("b", {}, "AEON"), h("span", {}, "MEMBERSHIP CARD")), h("span", { class: "ids " + (active ? "on" : "off") }, active ? "ACTIVE" : "INACTIVE")),
    h("div", { class: "idm" }, h("div", { class: "idph" }, uav(email, x.name || email, 84, color)), h("div", { class: "idn" }, h("b", {}, x.name || email), h("span", {}, x.designation || "Member"), h("span", { class: "idd" }, teamName(x.dept)))),
    h("div", { class: "idg" }, fld("MEMBER ID", p.memberId || "Not issued"), fld("JOINED", fmtDate(p.joiningDate)), fld("STATUS", active ? "Active member" : "Inactive")),
    p.memberId ? h("div", { class: "idq" }, qrSvg(qrLink(p.memberId), 96)) : null,
    h("div", { class: "idf" }, h("b", {}, "Officially issued by AEON"), h("span", {}, "Internal company membership card. Not a government identity document.")));
};
// PDF = the card drawn on a canvas, saved as JPEG, wrapped in a minimal one-page PDF
function pdfFromJpeg(jpeg, w, hh, pw, ph) {
  const enc = s => new TextEncoder().encode(s), parts = [], offs = []; let len = 0;
  const push = b => { parts.push(b); len += b.length; };
  const obj = (n, head, stream) => { offs[n] = len; push(enc(`${n} 0 obj\n${head}\n`)); if (stream) { push(enc("stream\n")); push(stream); push(enc("\nendstream\n")); } push(enc("endobj\n")); };
  push(enc("%PDF-1.4\n")); obj(1, "<< /Type /Catalog /Pages 2 0 R >>"); obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  obj(4, `<< /Type /XObject /Subtype /Image /Width ${w} /Height ${hh} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`, jpeg);
  const c = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`; obj(5, `<< /Length ${c.length} >>`, enc(c));
  const xr = len; push(enc("xref\n0 6\n0000000000 65535 f \n" + [1, 2, 3, 4, 5].map(n => String(offs[n]).padStart(10, "0") + " 00000 n \n").join("") + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`));
  return new Blob(parts, { type: "application/pdf" });
}
async function downloadCard(email) {
  const x = mem(email) || {}, p = pf(email); if (!p.memberId) return toast("No member ID has been issued yet");
  const W = 1011, H = 638, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d"), color = dcol(x.dept), active = x.status === "active";
  const load = (src, cors) => new Promise(res => { const i = new Image(); if (cors) i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  const [logo, photo] = await Promise.all([load(LOGO), p.photoURL && /^https?:\/\//i.test(p.photoURL) ? load(p.photoURL, true) : null]);
  const F = "-apple-system, 'SF Pro Display', Inter, Helvetica, Arial, sans-serif", txt = (s, X, Y, size, wt, col, ls = 0) => { g.font = `${wt} ${size}px ${F}`; g.fillStyle = col; g.letterSpacing = ls + "px"; g.fillText(s, X, Y); g.letterSpacing = "0px"; };
  const grad = g.createLinearGradient(0, 0, W, H); grad.addColorStop(0, "#FFFFFF"); grad.addColorStop(1, "#EAEEF6"); g.fillStyle = grad; g.fillRect(0, 0, W, H);
  g.fillStyle = color; g.fillRect(0, 0, W, 18); g.strokeStyle = "#CBD2DE"; g.lineWidth = 4; g.strokeRect(2, 2, W - 4, H - 4);
  if (logo) g.drawImage(logo, 48, 52, 76, 76); txt("AEON", 142, 100, 46, 700, "#111827"); txt("MEMBERSHIP CARD", 144, 128, 19, 600, "#6B7280", 3);
  g.fillStyle = active ? "#D8F3DF" : "#E5E7EB"; g.beginPath(); g.roundRect(W - 230, 62, 182, 50, 25); g.fill(); txt(active ? "ACTIVE" : "INACTIVE", W - 205, 96, 24, 700, active ? "#1E7A34" : "#4B5563", 2);
  g.save(); g.beginPath(); g.roundRect(48, 178, 220, 220, 28); g.clip();
  if (photo) g.drawImage(photo, 48, 178, 220, 220); else { g.fillStyle = color; g.fillRect(48, 178, 220, 220); g.font = `700 92px ${F}`; g.fillStyle = "#fff"; g.textAlign = "center"; g.fillText(initials(x.name), 158, 318); g.textAlign = "left"; } g.restore();
  txt(x.name || email, 306, 232, 52, 700, "#111827"); txt(x.designation || "Member", 306, 280, 30, 500, "#374151"); txt(teamName(x.dept), 306, 326, 28, 600, color);
  txt("MEMBER ID", 48, 452, 17, 600, "#6B7280", 2); txt(p.memberId, 48, 492, 34, 700, "#111827"); txt("JOINED", 340, 452, 17, 600, "#6B7280", 2); txt(fmtDate(p.joiningDate), 340, 492, 28, 600, "#111827");
  const M = qrMatrix(qrLink(p.memberId)), n = M.length, q = 2, T = 214, cell = T / (n + q * 2), QX = W - T - 56, QY = 168;
  g.fillStyle = "#fff"; g.beginPath(); g.roundRect(QX - 10, QY - 10, T + 20, T + 20, 18); g.fill(); g.strokeStyle = "#CBD2DE"; g.lineWidth = 2; g.stroke(); g.fillStyle = "#000";
  M.forEach((r, y) => r.forEach((c, xx) => { if (c) g.fillRect(QX + (xx + q) * cell, QY + (y + q) * cell, cell + .6, cell + .6); })); txt("Scan inside AEON", QX + 22, QY + T + 42, 19, 500, "#6B7280");
  g.fillStyle = "#D9DEE8"; g.fillRect(48, 548, W - 96, 2); txt("Officially issued by AEON", 48, 592, 24, 700, "#111827"); txt("Internal company membership card. Not a government identity document.", 48, 620, 17, 400, "#6B7280");
  const blob = await new Promise(r => cv.toBlob(r, "image/jpeg", .95)), pdf = pdfFromJpeg(new Uint8Array(await blob.arrayBuffer()), W, H, 242.64, 153.07);
  const url = URL.createObjectURL(pdf), a = h("a", { href: url, download: `AEON-ID-${p.memberId}.pdf` }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); toast("ID card downloaded");
}
const isoDate = () => new Date().toLocaleDateString("en-CA");
const editProfileSheet = email => {
  const x = mem(email), p = pf(email); let priv = {};
  getDoc(doc(db, "memberPrivate", email)).then(s => { if (s.exists()) { priv = s.data(); f.phone.value = priv.phone || ""; f.em.value = priv.emergency || ""; } }).catch(() => {});
  const f = { name: inp("Full name", { required: "", maxlength: "80" }), photo: inp("https://… link to a photo", { type: "url" }), dept: sel(teamOpts(), x?.dept), role: inp("Designation", { maxlength: "80" }), resp: h("textarea", { placeholder: "Responsibilities", maxlength: "600", rows: "3" }), mid: inp("AEON-0001", { maxlength: "24" }), join: inp("", { type: "date" }), phone: inp("Phone", { maxlength: "30" }), em: inp("Emergency contact", { maxlength: "120" }), status: sel([["active", "Active"], ["inactive", "Inactive"]], x?.status || "active"), proj: inp("Project A, Project B", { maxlength: "300" }) };
  f.name.value = x?.name || ""; f.photo.value = p.photoURL || ""; f.role.value = x?.designation || ""; f.resp.value = p.responsibilities || ""; f.mid.value = p.memberId || ""; f.join.value = p.joiningDate || isoDate(); f.proj.value = (p.projects || []).join(", ");
  formSheet(x ? "Edit profile" : "Create member record", [["Full name", f.name], ["Photo link", f.photo], ["Team", f.dept], ["Designation", f.role], ["Member ID", f.mid], ["Joined", f.join], ["Status", f.status], ["Projects", f.proj], ["Responsibilities", f.resp], ["Phone", f.phone], ["Emergency", f.em]], "Save profile", async close => {
    const nm = f.name.value.trim(), newId = f.mid.value.trim().toUpperCase(), photo = f.photo.value.trim();
    if (photo && !safeUrl(photo)) return toast("Photo link must start with http(s)://");
    if (newId && !/^[A-Z0-9][A-Z0-9-]{2,23}$/.test(newId)) return toast("Member ID: 3-24 letters, numbers or dashes");
    if (newId !== (p.memberId || "")) await claimMemberId(email, newId, p.memberId);
    const projects = f.proj.value.split(",").map(s => s.trim()).filter(Boolean).slice(0, 20), ch = [], d = (l, a, b) => { if ((a || "") !== (b || "")) ch.push(`${l}: ${a || "—"} → ${b || "—"}`); };
    d("name", x?.name, nm); d("team", x?.dept, f.dept.value); d("designation", x?.designation, f.role.value.trim()); d("status", x?.status, f.status.value); d("member ID", p.memberId, newId); d("joined", p.joiningDate, f.join.value); d("photo", p.photoURL, photo); d("projects", (p.projects || []).join(", "), projects.join(", ")); d("responsibilities", p.responsibilities, f.resp.value.trim());
    const wb = writeBatch(db);
    wb.set(doc(db, "members", email), { name: nm, dept: f.dept.value, designation: f.role.value.trim(), status: f.status.value, ...(x ? {} : { createdAt: serverTimestamp() }) }, { merge: true });
    wb.set(doc(db, "memberProfiles", email), { memberId: newId, photoURL: photo, responsibilities: f.resp.value.trim(), joiningDate: f.join.value, projects, updatedAt: serverTimestamp(), updatedBy: mail() }, { merge: true });
    wb.set(doc(db, "memberPrivate", email), { phone: f.phone.value.trim(), emergency: f.em.value.trim(), updatedAt: serverTimestamp() }, { merge: true });
    wb.set(doc(collection(db, "auditLogs")), { action: x ? "Member profile edited" : "Member record created", target: email, by: mail(), changes: ch.length ? ch : null, createdAt: serverTimestamp() });
    wb.set(doc(collection(db, "memberActivity")), { member: email, by: mail(), action: x ? "Profile updated by an administrator" : "Added to AEON", createdAt: serverTimestamp() });
    await wb.commit();
    MEMBERS = MEMBERS.filter(m => m.id !== email).concat({ id: email, name: nm, dept: f.dept.value, designation: f.role.value.trim(), status: f.status.value }); PROFILES[email] = { ...p, memberId: newId, photoURL: photo, responsibilities: f.resp.value.trim(), joiningDate: f.join.value, projects }; SD = null;
    toast("Profile saved"); close(); render();
  });
};
const selfEditSheet = () => {
  const p = pf(mail()), bio = h("textarea", { placeholder: "A short line about you", maxlength: "300", rows: "3" }), ph = inp("Phone", { maxlength: "30" }), em = inp("Emergency contact", { maxlength: "120" }); bio.value = p.bio || "";
  getDoc(doc(db, "memberPrivate", mail())).then(s => { if (s.exists()) { ph.value = s.data().phone || ""; em.value = s.data().emergency || ""; } }).catch(() => {});
  formSheet("Edit my info", [["About", bio], ["Phone", ph], ["Emergency", em]], "Save", async close => {
    if (PROFILES[mail()]) { await updateDoc(doc(db, "memberProfiles", mail()), { bio: bio.value.trim(), updatedAt: serverTimestamp() }); PROFILES[mail()].bio = bio.value.trim(); }
    await setDoc(doc(db, "memberPrivate", mail()), { phone: ph.value.trim(), emergency: em.value.trim(), updatedAt: serverTimestamp() }, { merge: true }); toast("Saved"); close(); render();
  }, PROFILES[mail()] ? null : h("p", { class: "mu f13", style: "padding:0 4px 10px" }, "Your profile card is created by an administrator. Phone details can still be saved."));
};
const quickUpdate = (email, field, title, opts) => {
  const x = mem(email), ctl = opts ? sel(opts, x[field]) : inp(title, { required: "", maxlength: "80" }); if (!opts) ctl.value = x[field] || "";
  formSheet(title, [[title.replace(/^(Transfer|Change) /, "").replace(/ to another team/, "Team"), ctl]], "Save", async close => {
    const old = x[field], val = ctl.value.trim(); if (val === old) return close();
    await updateDoc(doc(db, "members", email), { [field]: val }); x[field] = val;
    await audit(field === "dept" ? "Member transferred" : "Designation changed", email, [`${field}: ${old || "—"} → ${val}`]); activity(email, field === "dept" ? `Transferred to ${teamName(val)}` : `Designation changed to ${val}`);
    toast("Updated"); close(); render();
  });
};
V.id = async (m, arg) => {
  const b = page(m, "Member ID", { nosearch: true }); add(b, skel(1));
  try { const s = await getDoc(doc(db, "memberIds", arg || "-")); if (!s.exists()) return set(b, empty("id", "ID not found", "This member ID isn’t registered in AEON.")); history.replaceState(null, "", "#profile/" + encodeURIComponent(s.data().email)); render(); }
  catch (e) { fail(e); set(b, empty("id", "Can’t open this ID", "You need to be an active AEON member to view profiles.")); }
};
V.profile = async (m, arg) => {
  const email = (arg || mail()).toLowerCase(), self = email === mail(), x = mem(email);
  const b = page(m, self ? "My Profile" : (x?.name || "Profile"), { wide: true, back: self ? null : "members", actions: ADMIN ? [tbtn(x ? "Edit profile" : "Create record", "edit", () => editProfileSheet(email))] : (self && x ? [tbtn("Edit my info", "edit", selfEditSheet)] : []) });
  if (!x) return add(b, empty("id", "No member record", ADMIN ? "This account has no member record yet." : "Ask an administrator to add you to AEON.", ADMIN && "Create record", () => editProfileSheet(email)));
  const priv = self || ADMIN ? await getDoc(doc(db, "memberPrivate", email)).then(s => s.exists() ? s.data() : {}).catch(() => ({})) : null, p = pf(email), active = x.status === "active", panel = h("div");
  const issue = async () => { try { const id = await issueMemberId(email); audit("Member ID issued", email, [id]); activity(email, `Member ID ${id} issued`); toast("Member ID issued: " + id); render(); } catch (e) { fail(e); } };
  const row = (icon, label, fn, red) => h("button", { class: "li tap" + (red ? " redt" : ""), onclick: fn }, h("span", { class: red ? "" : "tint" }, ic(icon, 21)), h("div", { class: "gr" }, h("b", { style: "font-weight:500" }, label)), ic("chevR", 16));
  const overview = () => set(panel, h("div", { class: "grp" }, kv("Email", email), kv("Team", teamName(x.dept)), kv("Designation", x.designation || "—"), kv("Joined", fmtDate(p.joiningDate)), kv("Status", active ? "Active" : "Inactive"), kv("Member ID", p.memberId || "Not issued"), priv ? kv("Phone", priv.phone || "—") : null, priv ? kv("Emergency", priv.emergency || "—") : null),
    p.responsibilities ? h("div", {}, h("div", { class: "sec" }, "Responsibilities"), h("div", { class: "card" }, h("p", {}, p.responsibilities))) : null, p.bio ? h("div", {}, h("div", { class: "sec" }, "About"), h("div", { class: "card" }, h("p", {}, p.bio))) : null,
    ADMIN ? h("div", {}, h("div", { class: "sec" }, "Administration"), h("div", { class: "grp" }, !p.memberId ? row("id", "Issue member ID", issue) : null, row("teams", "Transfer to another team", () => quickUpdate(email, "dept", "Transfer to another team", teamOpts())), row("edit", "Change designation", () => quickUpdate(email, "designation", "Change designation")),
      row("key", "Send password reset email", async () => { if (await sure(`${x.name} will get an email with a secure link to choose a new password. You never see the password.`, "Send email", false, "Send reset email?")) { try { await sendPasswordResetEmail(auth, email); audit("Password reset email sent", email); activity(email, "Password reset email sent"); toast("Reset email sent"); } catch (e) { fail(e); } } }),
      email !== mail() ? row(active ? "x" : "check", active ? "Deactivate member" : "Reactivate member", () => togglePerson(x), active) : null), h("p", { class: "mu f13", style: "padding:0 16px" }, "Changing a team or designation never grants administrator access. Admins are set only in the security rules.")) : null);
  const tasksPanel = async () => { set(panel, skel(2)); try { const s = await getDocs(query(collection(db, "tasks"), where("assignees", "array-contains", email))); set(panel, s.size ? h("div", { class: "grp" }, ...s.docs.map(d => { const t = d.data(); return h("div", { class: "li edge pri-" + t.priority }, h("div", { class: "gr" }, h("b", {}, t.title), h("span", { class: "mu f13" }, t.deadline ? "Due " + t.deadline : "No due date")), late(t) ? chip("Overdue") : chip(t.status)); })) : empty("tasks", "No tasks assigned", "Tasks assigned to this member appear here.")); } catch (e) { fail(e); } };
  const projectsPanel = () => set(panel, (p.projects || []).length ? h("div", { class: "grp" }, ...p.projects.map(n => h("div", { class: "li" }, h("span", { class: "sico sm" }, ic("layers", 16)), h("div", { class: "gr" }, h("b", {}, n))))) : empty("layers", "No projects yet", "Assigned projects are added from Edit profile.", "Edit profile", () => editProfileSheet(email)));
  const activityPanel = async () => {
    set(panel, skel(3));
    try {
      const [a, l] = await Promise.all([getDocs(query(collection(db, "memberActivity"), where("member", "==", email), orderBy("createdAt", "desc"), limit(40))), getDocs(query(collection(db, "auditLogs"), where("target", "==", email), orderBy("createdAt", "desc"), limit(40)))]);
      const ev = [...a.docs.map(d => ({ ...d.data(), k: "Activity" })), ...l.docs.map(d => ({ ...d.data(), action: d.data().action + (d.data().changes ? " · " + d.data().changes.join("; ") : ""), k: "Audit" }))].sort((u, v) => msOf(v.createdAt) - msOf(u.createdAt));
      set(panel, ev.length ? h("div", { class: "grp" }, ...ev.map(e => h("div", { class: "li" }, h("div", { class: "gr" }, h("b", { style: "white-space:normal;font-weight:500" }, e.action), h("span", { class: "mu f13" }, `${e.k} · ${nameOf(e.by)} · ${fmt(e.createdAt)}`))))) : empty("log", "No history yet", "Important changes and workspace activity are recorded here."));
    } catch (e) { fail(e); }
  };
  const tabs = ADMIN ? seg([["o", "Overview"], ["t", "Tasks"], ["p", "Projects"], ["a", "Activity"]], "o", v => ({ o: overview, t: tasksPanel, p: projectsPanel, a: activityPanel })[v]()) : null;
  set(b, h("div", { class: "cols idcols" }, h("div", {}, idCard(email), h("div", { class: "idact" }, p.memberId ? h("button", { class: "btn", onclick: () => downloadCard(email) }, ic("download", 18), "Download PDF") : null, p.memberId ? h("button", { class: "btn gray", onclick: () => navigator.clipboard?.writeText(qrLink(p.memberId)).then(() => toast("Profile link copied"), () => toast("Copy failed")) }, ic("qr", 18), "Copy link") : null, !p.memberId && ADMIN ? h("button", { class: "btn", onclick: issue }, "Issue member ID") : null),
    h("p", { class: "mu f13 idnote" }, "Internal AEON membership card. Not a government identity document. The QR code holds only a link; it opens this profile inside AEON after sign-in.")), h("div", {}, tabs, panel))); overview();
};

/* ===== TASKS ===== */
V.tasks = async m => {
  const b = page(m, ADMIN ? "All tasks" : "My tasks", { actions: ADMIN ? [tbtn("New task", "plus", taskSheet)] : [] }); add(b, skel(3));
  const s = await getDocs(taskQ()); const T = s.docs.map(d => ({ ref: d.ref, ...d.data() })); let f = "all";
  const box = h("div", { class: "grp stagger" });
  const del = async t => { if (await sure("This task will be removed for everyone.", "Delete", true, "Delete task?")) { await deleteDoc(t.ref).catch(fail); render(); } };
  const detail = t => sheet(t.title, (sb, close) => {
    add(sb, h("div", { class: "card" }, chip(t.priority), late(t) ? chip("Overdue") : chip(t.status), h("p", {}, t.description || "No description."), t.link ? h("p", {}, linkify(t.link)) : null,
      h("small", { class: "mu" }, `Due ${t.deadline || "—"} · ${t.assignees.map(nameOf).join(", ")}`)));
    if (ADMIN) {
      const st = sel(STATUS, t.status); st.onchange = () => updateDoc(t.ref, { status: st.value }).then(() => { t.status = st.value; notify(t.assignees, "task", `${t.title} is now ${st.value}`); log(`Task "${t.title}" set to ${st.value}`); toast("Updated"); draw(); }).catch(fail);
      add(sb, h("div", { class: "grp" }, h("label", { class: "fr" }, h("span", {}, "Status"), st)), h("button", { class: "btn red wide", onclick: () => { close(); setTimeout(() => del(t), 250); } }, "Delete task"));
    }
  });
  const draw = () => {
    const rows = T.filter(t => f === "all" || (f === "mine" && t.assignees.includes(mail())) || (f === "late" && late(t)) || (f === "done" && t.status === "Completed"));
    set(box, ...rows.map((t, i) => { const r = h("button", { class: "li tap edge pri-" + t.priority, style: `--n:${Math.min(i, 8)}`, onclick: () => detail(t) }, h("div", { class: "gr" }, h("b", {}, t.title), h("span", {}, chip(t.priority), late(t) ? chip("Overdue") : chip(t.status), h("small", { class: "mu" }, t.deadline ? "Due " + t.deadline : ""))), ic("chevR", 16)); return ADMIN ? swipe(r, "Delete", () => del(t)) : r; }));
    if (!rows.length) set(box, empty("tasks", "Nothing here", f === "all" ? (ADMIN ? "Create the first task." : "No tasks assigned to you.") : "No tasks match this filter.", ADMIN && f === "all" && "New task", taskSheet));
  };
  set(b, seg([["all", "All"], ["mine", "Mine"], ["late", "Overdue"], ["done", "Completed"]], f, v => { f = v; draw(); }), box); draw();
};

/* ===== PEOPLE (grouped by team) ===== */
V.members = async (m, arg) => {
  const b = page(m, "People", { actions: ADMIN ? [tbtn("Add person", "userplus", memberSheet)] : [] });
  if (!MEMBERS.length) return add(b, empty("user", "No people yet", "Add your first teammate.", ADMIN && "Add person", memberSheet));
  let f = "all";
  const box = h("div"), row = x => {
    const r = h("button", { class: "li tap" + (x.status !== "active" ? " off" : ""), onclick: () => personSheet(x) }, uav(x.id, x.name, 40, dcol(x.dept)), h("div", { class: "gr" }, h("b", {}, x.name || x.id), h("span", { class: "mu s" }, `${x.designation || "Member"} · ${x.id}`)), x.status !== "active" ? chip("Inactive", "Low") : null, ic("chevR", 16));
    return ADMIN && x.id !== mail() ? swipe(r, x.status === "active" ? "Deactivate" : "Activate", () => togglePerson(x), x.status === "active" ? "" : "blue") : r;
  };
  const draw = () => {
    const ppl = MEMBERS.filter(x => f === "all" || (f === "active") === (x.status === "active")), tl = [...new Set(ppl.map(x => x.dept || ""))].sort((a, c) => teamName(a).localeCompare(teamName(c)));
    set(box, ...(tl.length ? tl.flatMap(d => [h("div", { class: "sec" }, `${d ? teamName(d) : "No team"} · ${ppl.filter(x => (x.dept || "") === d).length}`), h("div", { class: "grp ia" }, ...ppl.filter(x => (x.dept || "") === d).map(row))]) : [empty("user", "No one here", "Try a different filter.")]));
  };
  set(b, seg([["all", "All"], ["active", "Active"], ["inactive", "Inactive"]], f, v => { f = v; draw(); }), box);
  if (ADMIN) add(b, h("p", { class: "mu f13", style: "padding:0 16px" }, "Tap a person for details. Swipe left or right-click to activate or deactivate."));
  draw(); const p = arg && MEMBERS.find(x => x.id === arg); if (p) personSheet(p);
};

/* ===== TEAMS ===== */
V.departments = async m => {
  if (ADMIN) await loadConvs().catch(() => {});
  const mine = ADMIN ? teams() : [ME.dept].filter(Boolean);
  const b = page(m, "Teams", { wide: true, actions: ADMIN ? [tbtn("New team", "plus", teamSheet)] : [] });
  if (!mine.length) return add(b, empty("teams", "No team yet", ADMIN ? "Create the first team." : "Ask an admin to assign you to a team.", ADMIN && "New team", teamSheet));
  add(b, skel(3));
  const [t, r] = await Promise.all([getDocs(taskQ()), getDocs(resQ())]);
  const T = t.docs.map(x => x.data()), R = r.docs.map(x => x.data()), body = h("div"); let cur = mine[0];
  const stats = d => { const ts = T.filter(x => x.dept === d), done = ts.filter(x => x.status === "Completed").length; return { ts, done, n: MEMBERS.filter(x => x.dept === d).length }; };
  const tiles = h("div", { class: "tiles" });
  const drawTiles = () => set(tiles, ...mine.map(d => { const s = stats(d); return h("button", { class: "tile tap", style: `--c:${dcol(d)}`, "aria-pressed": String(d === cur), onclick: () => { cur = d; drawTiles(); show(); } }, deptAv(d, 40), h("div", {}, h("b", {}, teamName(d)), h("div", { class: "mu f13" }, `${s.n} ${s.n === 1 ? "person" : "people"} · ${s.done}/${s.ts.length} tasks`)), h("div", { class: "bar thin" }, h("i", { style: `width:${s.ts.length ? s.done / s.ts.length * 100 : 0}%` }))); }),
    ADMIN ? h("button", { class: "tile add tap", onclick: teamSheet }, ic("plus", 22), "New team") : null);
  const show = () => {
    const d = cur, s = stats(d), rs = R.filter(x => x.dept === d), ppl = MEMBERS.filter(x => x.dept === d);
    set(body, h("div", { class: "dhead" }, deptAv(d, 56), h("div", { class: "grow" }, h("b", { style: "font-size:24px;letter-spacing:-.02em" }, teamName(d)), h("div", { class: "mu s" }, `${s.n} ${s.n === 1 ? "person" : "people"} · ${s.done} of ${s.ts.length} tasks done`)), h("button", { class: "btn", onclick: () => go("chat/dept_" + d) }, "Open discussions")),
      h("div", { class: "bar", style: `--c:${dcol(d)}` }, h("i", { style: `width:${s.ts.length ? s.done / s.ts.length * 100 : 0}%` })),
      h("div", { class: "cols" },
        h("div", {}, h("div", { class: "sec" }, "People"), ppl.length ? h("div", { class: "grp ia" }, ...ppl.map(x => h("button", { class: "li tap", onclick: () => personSheet(x) }, uav(x.id, x.name, 36, dcol(d)), h("div", { class: "gr" }, h("b", {}, x.name || x.id), h("span", { class: "mu s" }, x.designation || "Member")), ic("chevR", 16)))) : empty("user", "No one yet", ADMIN ? "Assign people from the People tab." : "")),
        h("div", {}, h("div", { class: "sec" }, "Tasks"), s.ts.length ? h("div", { class: "grp" }, ...s.ts.map(x => h("button", { class: "li tap edge pri-" + x.priority, onclick: () => go("tasks") }, h("div", { class: "gr" }, h("b", {}, x.title)), chip(x.status)))) : empty("tasks", "No tasks", "Tasks for this team show here."),
          rs.length ? h("div", {}, h("div", { class: "sec" }, "Documents"), h("div", { class: "grp" }, ...rs.map(x => h(safeUrl(x.url) ? "a" : "div", { class: "li tap", ...(safeUrl(x.url) ? { href: x.url, target: "_blank", rel: "noopener noreferrer" } : {}) }, h("div", { class: "gr" }, h("b", {}, x.name)), ic("link", 18))))) : null)));
  };
  set(b, mine.length > 1 || ADMIN ? tiles : null, body); drawTiles(); show();
};

/* ===== NOTIFICATIONS ===== */
const watch = () => {
  nsub?.();
  nsub = onSnapshot(query(collection(db, "notifications"), where("to", "==", mail()), limit(50)), s => {
    NOTES = s.docs.sort((a, b) => (b.data().createdAt?.seconds || 9e9) - (a.data().createdAt?.seconds || 9e9));
    badges(); onNotes?.();
  }, () => {});
};
const NI = { message: "chat", task: "tasks", announcement: "news", alert: "alert" };
V.notifications = async m => {
  const mark = d => updateDoc(d.ref, { read: true }).catch(fail);
  const b = page(m, "Alerts", { actions: [tbtn("Read all", "check", () => NOTES.filter(d => !d.data().read).forEach(mark))] });
  const draw = () => {
    b.replaceChildren(); if (!NOTES.length) return add(b, empty("bell", "You're all caught up", "New alerts will appear here."));
    const row = d => { const n = d.data(), r = h("button", { class: "li tap", style: n.read ? "opacity:.6" : "", onclick: () => n.read || mark(d) }, av("", n.read ? "#8E8E93" : "var(--ac)", 36, NI[n.type] || "bell"), h("div", { class: "gr" }, h("b", { style: "white-space:normal" }, n.text), h("span", { class: "mu f13" }, fmt(n.createdAt))), n.read ? null : h("span", { class: "dot", "aria-label": "Unread" })); return n.read ? r : swipe(r, "Read", () => mark(d), "blue"); };
    const today = NOTES.filter(d => { const t = d.data().createdAt?.toDate?.(); return !t || sameDay(t, new Date()); }), older = NOTES.filter(d => !today.includes(d));
    [["Today", today], ["Earlier", older]].forEach(([l, a]) => a.length && add(b, h("div", { class: "sec" }, l), h("div", { class: "grp ia" }, ...a.map(row))));
  };
  onNotes = draw; draw();
};

/* ===== DOCUMENTS (external links only) ===== */
V.resources = async m => {
  const b = page(m, "Docs", { actions: ADMIN ? [tbtn("Add", "plus", docSheet)] : [] }); add(b, skel(3));
  const s = await getDocs(resQ()); let cat = "All"; let term = "";
  const q = h("input", { type: "search", placeholder: "Filter documents", "aria-label": "Filter documents", class: "flt" }), box = h("div");
  const del = async (d, r) => { if (await sure(`“${r.name}” will be removed from Docs.`, "Delete", true, "Delete document?")) { await deleteDoc(d.ref).catch(fail); log("Document deleted: " + r.name); SD = null; render(); } };
  const draw = () => {
    term = q.value.toLowerCase();
    const rows = s.docs.filter(d => { const r = d.data(); return (cat === "All" || r.category === cat) && (r.name + " " + (r.description || "")).toLowerCase().includes(term); });
    set(box, rows.length ? h("div", { class: "grp ia" }, ...rows.map(d => { const r = d.data(), el = h(safeUrl(r.url) ? "a" : "div", { class: "li tap", ...(safeUrl(r.url) ? { href: r.url, target: "_blank", rel: "noopener noreferrer" } : {}) }, av("", dcol(r.dept), 40, "docs"), h("div", { class: "gr" }, h("b", {}, r.name), h("span", { class: "mu s" }, r.description || r.category)), ic("link", 18)); return ADMIN ? swipe(el, "Delete", () => del(d, r)) : el; })) : empty("docs", "No documents found", s.size ? "Try another filter or category." : ADMIN ? "Add the first link." : "Shared links appear here.", ADMIN && !s.size && "Add document", docSheet));
  };
  q.oninput = draw; set(b, q, seg([["All", "All"], ...CATS.map(c => [c, c.replace(/ (Documents?|Documentation|Materials|Papers|Designs|References|Presentations|Resources)$/, "")])], cat, v => { cat = v; draw(); }), box); draw();
};

/* ===== ADMIN CONSOLE: every admin power, explained, with a button ===== */
const adminHelp = () => sheet("How admin access works", b => add(b,
  h("div", { class: "card" }, h("p", {}, "Admin status is decided only by the security rules in Firebase. A profile, team or designation can never make someone an administrator."),
    h("p", {}, "1. Open firestore.rules and find ADMIN EMAIL CONFIGURATION."), h("p", {}, "2. Add or remove emails (lowercase) in adminEmails()."), h("p", {}, "3. Publish the rules. The change applies on the person’s next sign-in."))));
const reactionsSheet = () => sheet("Workspace reactions", (b) => {
  const box = h("div"), isEmoji = s => { const g = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)]; return g.length === 1 && /\p{Extended_Pictographic}/u.test(s); };
  const nextOrder = () => Math.max(0, ...WR.map(r => r.order || 0)) + 1;
  const draw = () => set(box, WR.length ? h("div", { class: "grp" }, ...WR.map(r => h("div", { class: "li" }, h("span", { style: "font-size:26px;width:34px;text-align:center" }, r.emoji), h("div", { class: "gr" }, h("b", {}, r.label || "Reaction"), h("span", { class: "mu f13" }, r.active ? "Visible to everyone" : "Hidden")),
    toggle(r.active, async v => { try { await updateDoc(doc(db, "workspaceReactions", r.key), { active: v }); r.active = v; audit(`Reaction ${v ? "enabled" : "hidden"}`, null, [r.emoji]); draw(); } catch (e) { fail(e); } }, "Visible"),
    ibtn("edit", "Edit reaction", () => edit(r)), ibtn("trash", "Remove reaction", async () => { if (await sure(`Remove ${r.emoji} from the workspace? Existing reactions stay on messages.`, "Remove", true, "Remove reaction?")) { try { await deleteDoc(doc(db, "workspaceReactions", r.key)); WR = WR.filter(x => x !== r); audit("Reaction removed", null, [r.emoji]); draw(); } catch (e) { fail(e); } } })))) : empty("smile", "No reactions", "Add the first one below."));
  const edit = r => { const em = inp("Emoji", { required: "", maxlength: "16" }), lb = inp("Label", { required: "", maxlength: "30" }); em.value = r.emoji; lb.value = r.label || "";
    formSheet("Edit reaction", [["Emoji", em], ["Label", lb]], "Save", async close => {
      const e = em.value.trim(); if (!isEmoji(e)) return toast("Enter a single emoji");
      if (e === r.emoji) { await updateDoc(doc(db, "workspaceReactions", r.key), { label: lb.value.trim() }); r.label = lb.value.trim(); }
      else { const nk = rxKey(e), wb = writeBatch(db); wb.delete(doc(db, "workspaceReactions", r.key)); wb.set(doc(db, "workspaceReactions", nk), { emoji: e, label: lb.value.trim(), active: r.active, order: r.order }); await wb.commit(); Object.assign(r, { key: nk, emoji: e, label: lb.value.trim() }); }
      audit("Reaction edited", null, [e]); close(); draw(); }); };
  const ne = inp("🎉", { maxlength: "16" }), nl = inp("Label", { maxlength: "30" });
  add(b, box, h("div", { class: "sec" }, "Add a reaction"), h("div", { class: "grp" }, h("label", { class: "fr" }, h("span", {}, "Emoji"), ne), h("label", { class: "fr" }, h("span", {}, "Label"), nl)),
    h("button", { class: "btn wide", onclick: async () => { const e = ne.value.trim(); if (!isEmoji(e)) return toast("Enter a single emoji"); if (WR.some(r => r.key === rxKey(e))) return toast("That reaction already exists");
      try { const r = { key: rxKey(e), emoji: e, label: nl.value.trim() || "Reaction", active: true, order: nextOrder() }; await setDoc(doc(db, "workspaceReactions", r.key), { emoji: r.emoji, label: r.label, active: true, order: r.order }); WR.push(r); audit("Reaction added", null, [e]); ne.value = nl.value = ""; draw(); } catch (x) { fail(x); } } }, "Add reaction"));
  draw();
});
V.admin = async m => {
  const b = page(m, "Admin", { wide: true, sub: "Everything you can do as an admin, what it does, and a button to do it." });
  const P = [
    ["inbox", "Send an official notice", "Email-style notice to one person, several people, a department or everyone. Each recipient gets a private copy with its own read and acknowledgement status.", "Compose notice", composeSheet],
    ["log", "Track notice delivery", "See how many people received, opened and acknowledged each notice, who is still unread, and edit or delete a notice.", "Open sent notices", () => { IBX.tab = "sent"; go("inbox"); }],
    ["news", "Post an announcement", "Publishes to News and sends an alert to every member.", "New announcement", annSheet],
    ["tasks", "Assign a task", "Give a task to people or a whole team. They get an alert. You can change its status or delete it later.", "New task", taskSheet],
    ["userplus", "Add a person", "Creates the member, their Firebase sign-in account and a unique AEON member ID. They set their own password by email.", "Add person", memberSheet],
    ["id", "Edit member profiles", "Open any member to edit name, photo link, team, designation, responsibilities, ID, joining date, contact details, projects and status.", "Open people", () => go("members")],
    ["user", "Activate or deactivate people", "Deactivated people lose all workspace access immediately (enforced by the security rules). You can also transfer teams or send a password-reset email. Passwords are never visible.", "Manage people", () => go("members")],
    ["teams", "Create a team", "Adds a team with its own channel. Then assign people and tasks to it.", "New team", teamSheet],
    ["smile", "Manage reactions", "Add, edit, hide or remove the official emoji reactions people can use on chat messages.", "Manage reactions", reactionsSheet],
    ["group", "Start a group chat", "Creates a private group chat with the people you choose.", "New group", newGroup],
    ["layers", "Set up default channels", "Creates General plus Tech, Research and Marketing. Safe to run again.", "Create channels", setupChannels],
    ["docs", "Share a document link", "Adds a link to Docs for everyone or for admins only. Swipe a row to delete it.", "Add document", docSheet],
    ["chat", "Moderate chat", "You can read every conversation and delete any message: right-click or long-press it, then confirm.", "Open chat", () => go("chat")],
    ["key", "Manage admin emails", "Admins come only from the security rules. See the steps to add or remove one.", "Show steps", adminHelp],
    ["clock", "Review the audit trail", "Every profile change, deactivation, notice and reaction edit is recorded with who did it and when.", "Jump to audit log", () => b.querySelector("#alog")?.scrollIntoView({ behavior: "smooth" })]
  ];
  add(b, h("div", { class: "powers" }, ...P.map(([i, t, d, l, fn], n) => h("div", { class: "pw", style: `--c:${PAL[n % PAL.length]}` }, h("span", { class: "pi" }, ic(i, 22)), h("b", {}, t), h("p", {}, d), h("button", { class: "btn sm", onclick: fn }, l)))), h("div", { class: "sec", id: "alog" }, "Audit log"));
  const [a, s] = await Promise.all([getDocs(query(collection(db, "auditLogs"), orderBy("createdAt", "desc"), limit(30))).catch(() => ({ docs: [], size: 0 })), getDocs(query(collection(db, "activityLogs"), orderBy("createdAt", "desc"), limit(20))).catch(() => ({ docs: [], size: 0 }))]);
  add(b, a.size ? h("div", { class: "grp" }, ...a.docs.map(d => { const l = d.data(); return h("div", { class: "li" }, h("div", { class: "gr" }, h("b", { style: "white-space:normal" }, l.action), l.changes ? h("span", { class: "f13", style: "white-space:normal" }, l.changes.join(" · ")) : null, h("span", { class: "mu f13" }, `${nameOf(l.by)} · ${fmt(l.createdAt)}${l.target && !l.target.startsWith("notice:") ? " · " + nameOf(l.target) : ""}`))); })) : empty("log", "No audit entries yet", "Important admin changes are recorded here."),
    h("div", { class: "sec" }, "Activity log"), s.size ? h("div", { class: "grp" }, ...s.docs.map(d => { const l = d.data(); return h("div", { class: "li" }, h("div", { class: "gr" }, h("b", { style: "white-space:normal" }, l.action), h("span", { class: "mu f13" }, `${nameOf(l.by)} · ${fmt(l.createdAt)}`))); })) : empty("log", "No activity yet", "Admin actions are recorded here."));
};

/* ===== MORE (mobile) + SETTINGS ===== */
const settings = () => sheet("Settings", (b, close) => {
  const cur = document.documentElement.dataset.theme || "auto", hp = h("input", { type: "checkbox", role: "switch", "aria-label": "Haptic feedback" }); hp.checked = HAPT;
  hp.onchange = () => { HAPT = hp.checked; try { localStorage.setItem("haptics", HAPT ? "1" : "0"); } catch {} buzz(); };
  const logo = h("span", { class: "appicon sm" }, "A"); withLogo(logo);
  add(b, h("div", { class: "prof" }, uav(mail(), myName(), 76, hue(U.email)), h("b", {}, myName()), h("span", { class: "mu s" }, U.email), h("div", { class: "chips" }, ADMIN ? chip("Admin", "Urgent") : chip("Member", "Medium"), ME.dept ? h("span", { class: "chip", style: `--c:${dcol(ME.dept)}` }, teamName(ME.dept)) : null)),
    h("div", { class: "grp" }, h("button", { class: "li tap", onclick: () => { close(); setTimeout(() => go("profile"), 250); } }, h("span", { class: "tint" }, ic("id", 22)), h("div", { class: "gr" }, h("b", { style: "font-weight:500" }, "My profile & ID card"), h("span", { class: "mu s" }, "Membership card, QR code and details")), ic("chevR", 16))),
    h("div", { class: "sec" }, "Appearance"), seg([["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]], cur, setTheme),
    h("div", { class: "sec" }, "Preferences"), h("div", { class: "grp" }, h("label", { class: "li" }, h("span", {}, "Haptic feedback"), h("span", { class: "tg" }, hp, h("i", {})))),
    installRow() ? h("div", { class: "grp" }, installRow()) : null, h("div", { class: "sec" }, "About"), h("div", { class: "grp" }, h("div", { class: "li" }, logo, h("div", { class: "gr" }, h("b", {}, "AEON Workspace"), h("span", { class: "mu s" }, "Private team workspace")))),
    h("div", { class: "grp" }, h("button", { class: "li tap center redt", onclick: () => { close(); setTimeout(() => sure("You’ll need to sign in again to use AEON.", "Sign out", true, "Sign out?").then(y => y && signOut(auth)), 250); } }, "Sign out")));
});
V.more = async m => {
  const b = page(m, "More"), row = (icon, label, fn, badge) => h("button", { class: "li tap", onclick: fn }, h("span", { class: "tint" }, ic(icon, 22)), h("div", { class: "gr" }, h("b", { style: "font-weight:500" }, label)), badge, ic("chevR", 16));
  add(b, h("button", { class: "card prow tap", onclick: settings }, uav(mail(), myName(), 56, hue(U.email)), h("div", { class: "gr" }, h("b", {}, myName()), h("span", { class: "mu s" }, U.email), h("span", { class: "mu f13" }, "Profile, appearance and sign out")), ic("chevR", 16)),
    h("div", { class: "grp" }, row("inbox", "Inbox", () => go("inbox"), h("b", { class: "nb", "data-ibell": "", hidden: "" })), row("id", "My profile & ID card", () => go("profile")), row("news", "News", () => go("announcements")), row("docs", "Docs", () => go("resources")), row("user", "People", () => go("members")),
      row("bell", "Alerts", () => go("notifications"), h("b", { class: "nb", "data-bell": "", hidden: "" })), ADMIN ? row("admin", "Admin", () => go("admin")) : null), standalone() ? null : h("div", { class: "grp" }, row("down", "Install app", installApp)));
  badges();
};

/* ===== INSTALLABLE APP (PWA): service worker + install button + install guide ===== */
if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
let DIP = null;
const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
addEventListener("beforeinstallprompt", e => { e.preventDefault(); DIP = e; if (!standalone()) $("#inst").hidden = false; });
addEventListener("appinstalled", () => { DIP = null; $("#inst").hidden = true; toast("AEON installed"); });
async function installApp() {
  if (DIP) { DIP.prompt(); await DIP.userChoice.catch(() => {}); DIP = null; $("#inst").hidden = true; return; }
  const steps = isIOS()
    ? ["Open this page in Safari.", "Tap the Share button.", "Choose “Add to Home Screen”, then tap Add."]
    : ["Chrome or Edge on a computer: click the install icon at the right end of the address bar.", "Android: open the browser menu and choose “Install app” or “Add to Home screen”."];
  sheet("Install AEON", b => add(b, h("div", { class: "prof" }, h("span", { class: "appicon", ref: "" }, "A")), h("div", { class: "grp" }, ...steps.map((t, i) => h("div", { class: "li" }, h("span", { class: "sico sm" }, String(i + 1)), h("div", { class: "gr" }, h("span", { style: "white-space:normal" }, t)))))));
  document.querySelectorAll(".sheet .appicon").forEach(x => withLogo(x));
}
$("#inst").onclick = installApp;
const installRow = () => standalone() ? null : h("button", { class: "li tap", onclick: () => { document.querySelector(".ov:not(.out) .ib[aria-label=Close]")?.click(); setTimeout(installApp, 250); } }, h("span", { class: "tint" }, ic("down", 22)), h("div", { class: "gr" }, h("b", { style: "font-weight:500" }, "Install app"), h("span", { class: "mu s" }, "Add AEON to your home screen or desktop")), ic("chevR", 16));
