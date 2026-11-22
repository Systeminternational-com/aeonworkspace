import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

/* ===== FIREBASE CONFIG (unchanged) ===== */
const app = initializeApp({
  apiKey: "AIzaSyAF9MPjp9d-6x3spQsPJwnoDI3k8i_nHbU",
  authDomain: "aon-workspace.firebaseapp.com",
  projectId: "aon-workspace",
  storageBucket: "aon-workspace.firebasestorage.app",
  messagingSenderId: "905792340680",
  appId: "1:905792340680:web:c1cae615df03ca27b4dbfd"
});
const auth = getAuth(app), db = getFirestore(app);

/* ===== STATE ===== */
let U, ADMIN = false, ME = {}, subs = [], MEMBERS = [], nsub, NOTES = [], onNotes = null;
let CONVS = null, CT = 0, SD = null, SDT = 0, rt = 0, HAPT = true;
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
const myName = () => ME.name && ME.name !== U.email ? ME.name : cap(U.email.split("@")[0]);

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
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01", check: "M5 12.5l4.5 4.5L19 7", out: "M10 4H5v16h5M15 8l4 4-4 4M19 12H9"
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
const formSheet = (title, fields, label, run) => sheet(title, (b, close) => {
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
  } }, h("div", { class: "grp" }, ...rows), err, btn));
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
const navItems = () => [["Home", "dashboard", "home"], ["Chat", "chat", "chat"], ["Tasks", "tasks", "tasks"], ["Teams", "departments", "teams"], ["News", "announcements", "news"], ["Docs", "resources", "docs"], ["People", "members", "user"], ["Alerts", "notifications", "bell"], ...(ADMIN ? [["Admin", "admin", "admin"]] : [])];
const KI = { Person: "user", Task: "tasks", News: "news", Doc: "docs", Channel: "chat" };
async function searchData() {
  if (SD && Date.now() - SDT < 6e4) return SD;
  const [t, a, r, cv] = await Promise.all([getDocs(taskQ()), getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(50))), getDocs(resQ()), ADMIN ? loadConvs() : Promise.resolve(CONVS || [])]);
  SDT = Date.now();
  return SD = [...MEMBERS.map(x => ({ k: "Person", s: `${x.name} ${x.id} ${x.designation || ""}`, t: x.name || x.id, go: "members/" + encodeURIComponent(x.id) })),
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
  if (!user) { nsub?.(); CONVS = SD = null; document.body.classList.remove("thr"); $("#shell").hidden = true; $("#login").hidden = false; return; }
  const deny = m => { signOut(auth).then(() => { $("#loginErr").textContent = m; }); };
  if (!user.emailVerified) return deny("Email not verified. Use 'Forgot password' to verify it.");
  try { await getDoc(doc(db, "settings", "adminProbe")); ADMIN = true; } catch { ADMIN = false; }   // admin comes only from the rules
  const m = await getDoc(doc(db, "members", mail())).catch(() => null);
  if (m?.exists()) ME = m.data(); else ME = { name: user.email, dept: "", status: "active" };
  if (!ADMIN && (!m?.exists() || ME.status !== "active")) return deny("This account is not an active member.");
  $("#adminNav").hidden = !ADMIN;
  $("#login").hidden = true; $("#shell").hidden = false;
  MEMBERS = (await getDocs(collection(db, "members")).catch(() => ({ docs: [] }))).docs.map(d => ({ id: d.id, ...d.data() }));
  renderMe(); watch(); if (ADMIN) loadConvs().catch(() => {}); render();
});
// Profile chip at the bottom of the sidebar
const renderMe = () => set($("#sset"), av(myName(), hue(U.email), 36), h("div", { class: "gr" }, h("b", {}, myName()), h("span", {}, ADMIN ? "Admin" : teamName(ME.dept))), h("span", { class: "chev" }, ic("chevR", 14)));

/* ===== ROUTER (hash: #view or #view/arg) ===== */
const V = {}, TABS = ["dashboard", "chat", "tasks", "departments"];
const go = v => { if (location.hash.slice(1) === v) render(); else location.hash = v; };
addEventListener("hashchange", () => render());
$("#view").addEventListener("scroll", e => e.currentTarget.classList.toggle("sc", e.currentTarget.scrollTop > 38), { passive: true });
function render() {
  if (!U || $("#shell").hidden) return;
  let [v, arg] = location.hash.slice(1).split("/"); v = v || "dashboard";
  if (!V[v] || (v === "admin" && !ADMIN)) v = "dashboard";
  clear(); onNotes = null; const tok = ++rt, view = $("#view"), m = h("div", { class: "page" });
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
  const n = inp("Name", { required: "" }), e = inp("name@company.com", { type: "email", required: "" }), d = sel(teamOpts()), r = inp("Designation");
  formSheet("Add person", [["Name", n], ["Email", e], ["Team", d], ["Role", r]], "Add member", async close => {
    const id = e.value.trim().toLowerCase();
    await setDoc(doc(db, "members", id), { name: n.value, dept: d.value, designation: r.value, status: "active", createdAt: serverTimestamp() });
    MEMBERS = MEMBERS.filter(x => x.id !== id).concat({ id, name: n.value, dept: d.value, designation: r.value, status: "active" }); SD = null; await log("Member added: " + id); toast("Member added"); close(); render();
  });
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
  if (await sure(on ? `${x.name} will be locked out until you activate them again.` : `${x.name} will be able to sign in again.`, on ? "Deactivate" : "Activate", on, `${on ? "Deactivate" : "Activate"} ${x.name}?`)) {
    try { await updateDoc(doc(db, "members", x.id), { status: on ? "inactive" : "active" }); x.status = on ? "inactive" : "active"; log(`Member ${x.status}: ${x.id}`); toast(on ? "Deactivated" : "Activated"); } catch (e) { fail(e); } render();
  }
};
const personSheet = x => {
  let changed = false;
  sheet(x.name || x.id, (b, close) => {
    const c = dcol(x.dept);
    add(b, h("div", { class: "prof" }, av(x.name || x.id, c, 76), h("b", {}, x.name || x.id), h("span", { class: "mu s" }, x.designation || "Member"),
      h("div", { class: "chips" }, h("span", { class: "chip", style: `--c:${c}` }, teamName(x.dept)), x.status === "active" ? chip("Active", "Completed") : chip("Inactive", "Low"))),
      h("div", { class: "grp" }, kv("Email", x.id)),
      h("div", { class: "grp" },
        x.id !== mail() ? h("button", { class: "li tap", onclick: () => { close(); openDM(x.id); } }, h("span", { class: "tint" }, ic("chat", 20)), h("div", { class: "gr" }, h("b", { style: "font-weight:500;color:var(--ac)" }, "Send message"))) : null,
        ADMIN ? h("label", { class: "li" }, h("span", {}, "Team"), (() => { const s = sel(teamOpts(), x.dept); s.onchange = () => updateDoc(doc(db, "members", x.id), { dept: s.value }).then(() => { x.dept = s.value; changed = true; log(`Member ${x.id} moved to ${s.value}`); toast("Team updated"); }).catch(fail); return s; })()) : null),
      ADMIN && x.id !== mail() ? h("div", { class: "grp" }, h("button", { class: "li tap center " + (x.status === "active" ? "redt" : ""), onclick: () => { close(); setTimeout(() => togglePerson(x), 250); } }, x.status === "active" ? "Deactivate" : "Activate")) : null);
  }, () => changed && render());
};

/* ===== DASHBOARD ("Today") ===== */
const greet = () => { const x = new Date().getHours(); return x < 5 ? "Good evening" : x < 12 ? "Good morning" : x < 18 ? "Good afternoon" : "Good evening"; };
V.dashboard = async m => {
  const b = page(m, greet(), { wide: true, sub: myName() }); add(b, skel(3));
  const [t, an] = await Promise.all([getDocs(taskQ()), getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(3)))]);
  const ts = t.docs.map(d => d.data()), done = ts.filter(x => x.status === "Completed").length, over = ts.filter(late).length;
  const next = ts.filter(x => x.status !== "Completed").sort((a, c) => (a.deadline || "9").localeCompare(c.deadline || "9")).slice(0, 5);
  const unread = () => NOTES.filter(d => !d.data().read).length, alertN = h("b", {}, String(unread()));
  const stat = (icon, label, val, c, fn) => h("button", { class: "stat tap", style: `--c:${c}`, onclick: fn }, h("span", { class: "sico" }, ic(icon, 20)), val, h("span", { class: "sl" }, label));
  set(b, h("div", { class: "stats" },
    stat("alert", "Overdue", h("b", {}, String(over)), "var(--red)", () => go("tasks")),
    stat("clock", "Due today", h("b", {}, String(ts.filter(x => x.status !== "Completed" && x.deadline === iso()).length)), "var(--orange)", () => go("tasks")),
    stat("bell", "Unread alerts", alertN, "var(--ac)", () => go("notifications")),
    stat("user", "People", h("b", {}, String(MEMBERS.length)), "var(--green)", () => go("members"))),
    h("div", { class: "cols" },
      h("div", {}, h("div", { class: "card hero" }, ring(ts.length ? done / ts.length : 0), h("div", {}, h("b", { class: "big" }, `${done} of ${ts.length}`), h("span", { class: "mu" }, ts.length ? `tasks completed · ${Math.round(done / ts.length * 100)}%` : "No tasks yet"))),
        h("div", { class: "sec" }, "Up next"),
        next.length ? h("div", { class: "grp" }, ...next.map(x => h("button", { class: "li tap edge pri-" + x.priority, onclick: () => go("tasks") }, h("div", { class: "gr" }, h("b", {}, x.title), h("span", { class: "mu f13" }, x.deadline ? "Due " + x.deadline : "No due date")), late(x) ? chip("Overdue") : chip(x.status)))) : empty("tasks", "All clear", "Nothing is waiting on you.")),
      h("div", {}, h("div", { class: "sec" }, "Latest announcements"),
        an.size ? h("div", {}, ...an.docs.map(d => annRow(d.data()))) : empty("news", "No announcements yet", "News from the team shows up here.", ADMIN && "New announcement", annSheet))));
  onNotes = () => { alertN.textContent = unread(); };
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
const convAv = (c, s = 44) => c.type === "dm" ? av(convName(c), hue(convName(c)), s) : c.type === "group" ? av(c.name, hue(c.name), s, "group") : c.type === "dept" ? deptAv(c.dept, s) : logoAv(s);
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
  add(b, others.length ? h("div", { class: "grp ia" }, ...others.map(x => h("button", { class: "li tap", onclick: () => { close(); openDM(x.id); } }, av(x.name, hue(x.name)), h("div", { class: "gr" }, h("b", {}, x.name || x.id), h("span", { class: "mu s" }, x.id))))) : empty("user", "No one to message yet", "Add people first."));
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
function openThread(th, c) {
  const box = h("div", { class: "msgs", role: "log", "aria-live": "polite" }), seen = new Set(); let first = true;
  const jump = h("button", { class: "jump", onclick: () => box.scrollTo({ top: box.scrollHeight, behavior: "smooth" }) }, ic("down", 16), "Latest");
  const ta = h("textarea", { rows: "1", placeholder: "Message", maxlength: "2000", "aria-label": "Message", enterkeyhint: "send" });
  const sb = h("button", { class: "sendb", type: "button", "aria-label": "Send message", title: "Send", onclick: () => send() }, ic("send", 20));
  const grow = () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; sb.classList.toggle("on", !!ta.value.trim()); };
  const send = async () => {
    const text = ta.value.trim(); if (!text) return; ta.value = ""; grow();
    try { await addDoc(collection(db, "conversations", c.id, "messages"), { text, sender: mail(), name: ME.name || mail(), createdAt: serverTimestamp() }); if (c.members) notify(c.members, "message", `${ME.name || mail()}: ${text.slice(0, 80)}`); }
    catch (x) { fail(x); ta.value = text; grow(); }
  };
  ta.oninput = grow; ta.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } };
  box.onscroll = () => jump.classList.toggle("on", box.scrollHeight - box.scrollTop - box.clientHeight > 220);
  add(th, h("header", { class: "th" }, h("button", { class: "ib back", "aria-label": "Back to chats", title: "Back", onclick: () => go("chat") }, ic("chevL")), convAv(c, 36), h("div", { class: "gr" }, h("b", {}, convName(c)), h("span", {}, convSub(c)))), box, jump, h("div", { class: "comp" }, ta, sb));
  const delMsg = async x => { if (await sure("This message will be removed for everyone.", "Delete", true, "Delete message?")) deleteDoc(x.ref).catch(fail); };
  const msgMenu = (e, g) => ctxMenu(e, "Message", [["Copy text", () => navigator.clipboard?.writeText(g.text).then(() => toast("Copied"), () => toast("Copy failed"))], ...(ADMIN ? [["Delete message", () => delMsg(g), true]] : [])]);
  subs.push(onSnapshot(query(collection(db, "conversations", c.id, "messages"), orderBy("createdAt", "desc"), limit(60)), s => {
    const atBot = first || box.scrollHeight - box.scrollTop - box.clientHeight < 80, top = box.scrollTop;
    const ms = s.docs.slice().reverse().map(x => ({ ref: x.ref, id: x.id, pend: x.metadata.hasPendingWrites, ...x.data() }));
    ms.forEach(g => g.d = g.createdAt?.toDate?.() || new Date());
    const grp = (a, b) => a && b && a.sender === b.sender && sameDay(a.d, b.d) && Math.abs(b.d - a.d) < 3e5;
    box.replaceChildren(); let day = "";
    if (!ms.length) box.append(empty("chat", "No messages yet", "Say hello."));
    ms.forEach((g, i) => {
      if (day !== g.d.toDateString()) { day = g.d.toDateString(); box.append(h("div", { class: "day" }, dayLabel(g.d))); }
      const mine = g.sender === mail(), f = !grp(ms[i - 1], g), l = !grp(g, ms[i + 1]), isNew = !first && !seen.has(g.id); seen.add(g.id);
      const bub = h("div", { class: "bb" }, linkify(g.text, true));
      bub.addEventListener("click", e => { if (!e.target.closest("a")) bub.closest(".mr").classList.toggle("tsh"); });
      press(bub, e => msgMenu(e, g));
      box.append(h("div", { class: `mr${mine ? " mine" : ""}${f ? " f" : ""}${l ? " l" : ""}${isNew ? " pop" : ""}` },
        mine ? null : (f ? av(g.name, hue(g.sender), 28) : h("span", { class: "sp" })),
        h("div", { class: "bw" }, f && !mine && c.type !== "dm" ? h("span", { class: "who" }, g.name) : null, bub, h("span", { class: "ts" }, g.d.toLocaleTimeString([], { timeStyle: "short" })))));
    });
    const last = ms.at(-1); if (last && last.sender === mail()) box.append(h("div", { class: "dlv" }, last.pend ? "Sending…" : "Delivered"));
    box.scrollTop = atBot ? box.scrollHeight : top; first = false;
  }, fail));
}

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
    const r = h("button", { class: "li tap" + (x.status !== "active" ? " off" : ""), onclick: () => personSheet(x) }, av(x.name, dcol(x.dept)), h("div", { class: "gr" }, h("b", {}, x.name || x.id), h("span", { class: "mu s" }, `${x.designation || "Member"} · ${x.id}`)), x.status !== "active" ? chip("Inactive", "Low") : null, ic("chevR", 16));
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
        h("div", {}, h("div", { class: "sec" }, "People"), ppl.length ? h("div", { class: "grp ia" }, ...ppl.map(x => h("button", { class: "li tap", onclick: () => personSheet(x) }, av(x.name, dcol(d), 36), h("div", { class: "gr" }, h("b", {}, x.name || x.id), h("span", { class: "mu s" }, x.designation || "Member")), ic("chevR", 16)))) : empty("user", "No one yet", ADMIN ? "Assign people from the People tab." : "")),
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
    const n = NOTES.filter(d => !d.data().read).length;
    document.querySelectorAll("[data-bell]").forEach(e => { e.textContent = n > 99 ? "99+" : n; e.hidden = !n; }); onNotes?.();
  }, () => {});
};
const NI = { message: "chat", task: "tasks", announcement: "news" };
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
  h("div", { class: "card" }, h("p", {}, "Admin status is decided only by the rules file in Firebase, never by the app or a profile setting."),
    h("p", {}, "1. Open firestore.rules and find ADMIN EMAIL CONFIGURATION."), h("p", {}, "2. Add or remove emails in lowercase inside adminEmails()."), h("p", {}, "3. Press Publish in the Firebase Console. The change applies on the person's next sign-in."))));
V.admin = async m => {
  const b = page(m, "Admin", { wide: true, sub: "Everything you can do as an admin, what it does, and a button to do it." });
  const P = [
    ["news", "Post an announcement", "Publishes to News and sends an alert to every member.", "New announcement", annSheet],
    ["tasks", "Assign a task", "Give a task to people or a whole team. They get an alert. You can change its status or delete it later.", "New task", taskSheet],
    ["userplus", "Add a person", "Adds a teammate to the directory. Their login must already exist in Firebase Authentication with the same email.", "Add person", memberSheet],
    ["user", "Activate or deactivate people", "Deactivated people can’t sign in. Open a person, or swipe their row, to switch them. You can also move them between teams.", "Manage people", () => go("members")],
    ["teams", "Create a team", "Adds a team with its own channel. Then assign people and tasks to it.", "New team", teamSheet],
    ["group", "Start a group chat", "Creates a private group chat with the people you choose.", "New group", newGroup],
    ["layers", "Set up default channels", "Creates General plus Tech, Research and Marketing. Safe to run again.", "Create channels", setupChannels],
    ["docs", "Share a document link", "Adds a link to Docs for everyone or for admins only. Swipe a row to delete it.", "Add document", docSheet],
    ["chat", "Moderate chat", "You can read every conversation and delete any message: right-click or long-press it, then confirm.", "Open chat", () => go("chat")],
    ["trash", "Delete content", "Swipe left, or right-click, on tasks, news and documents to delete them. Every delete asks first.", "Open tasks", () => go("tasks")],
    ["key", "Manage admin emails", "Admins come only from the rules file in Firebase. See the steps to add or remove one.", "Show steps", adminHelp],
    ["log", "Review the activity log", "Every admin action is recorded with who did it and when.", "Jump to log", () => b.querySelector("#alog")?.scrollIntoView({ behavior: "smooth" })]
  ];
  add(b, h("div", { class: "powers" }, ...P.map(([i, t, d, l, fn], n) => h("div", { class: "pw", style: `--c:${PAL[n % PAL.length]}` }, h("span", { class: "pi" }, ic(i, 22)), h("b", {}, t), h("p", {}, d), h("button", { class: "btn sm", onclick: fn }, l)))), h("div", { class: "sec", id: "alog" }, "Activity log"));
  const s = await getDocs(query(collection(db, "activityLogs"), orderBy("createdAt", "desc"), limit(30)));
  add(b, s.size ? h("div", { class: "grp" }, ...s.docs.map(d => { const l = d.data(); return h("div", { class: "li" }, h("div", { class: "gr" }, h("b", { style: "white-space:normal" }, l.action), h("span", { class: "mu f13" }, `${nameOf(l.by)} · ${fmt(l.createdAt)}`))); })) : empty("log", "No activity yet", "Admin actions are recorded here."));
};

/* ===== MORE (mobile) + SETTINGS ===== */
const settings = () => sheet("Settings", (b, close) => {
  const cur = document.documentElement.dataset.theme || "auto", hp = h("input", { type: "checkbox", role: "switch", "aria-label": "Haptic feedback" }); hp.checked = HAPT;
  hp.onchange = () => { HAPT = hp.checked; try { localStorage.setItem("haptics", HAPT ? "1" : "0"); } catch {} buzz(); };
  const logo = h("span", { class: "appicon sm" }, "A"); withLogo(logo);
  add(b, h("div", { class: "prof" }, av(myName(), hue(U.email), 76), h("b", {}, myName()), h("span", { class: "mu s" }, U.email), h("div", { class: "chips" }, ADMIN ? chip("Admin", "Urgent") : chip("Member", "Medium"), ME.dept ? h("span", { class: "chip", style: `--c:${dcol(ME.dept)}` }, teamName(ME.dept)) : null)),
    h("div", { class: "sec" }, "Appearance"), seg([["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]], cur, setTheme),
    h("div", { class: "sec" }, "Preferences"), h("div", { class: "grp" }, h("label", { class: "li" }, h("span", {}, "Haptic feedback"), h("span", { class: "tg" }, hp, h("i", {})))),
    installRow() ? h("div", { class: "grp" }, installRow()) : null, h("div", { class: "sec" }, "About"), h("div", { class: "grp" }, h("div", { class: "li" }, logo, h("div", { class: "gr" }, h("b", {}, "AEON Workspace"), h("span", { class: "mu s" }, "Private team workspace")))),
    h("div", { class: "grp" }, h("button", { class: "li tap center redt", onclick: () => { close(); setTimeout(() => sure("You’ll need to sign in again to use AEON.", "Sign out", true, "Sign out?").then(y => y && signOut(auth)), 250); } }, "Sign out")));
});
V.more = async m => {
  const b = page(m, "More"), row = (icon, label, fn, badge) => h("button", { class: "li tap", onclick: fn }, h("span", { class: "tint" }, ic(icon, 22)), h("div", { class: "gr" }, h("b", { style: "font-weight:500" }, label)), badge, ic("chevR", 16));
  add(b, h("button", { class: "card prow tap", onclick: settings }, av(myName(), hue(U.email), 56), h("div", { class: "gr" }, h("b", {}, myName()), h("span", { class: "mu s" }, U.email), h("span", { class: "mu f13" }, "Profile, appearance and sign out")), ic("chevR", 16)),
    h("div", { class: "grp" }, row("news", "News", () => go("announcements")), row("docs", "Docs", () => go("resources")), row("user", "People", () => go("members")),
      row("bell", "Alerts", () => go("notifications"), h("b", { class: "nb", "data-bell": "", hidden: "" })), ADMIN ? row("admin", "Admin", () => go("admin")) : null), standalone() ? null : h("div", { class: "grp" }, row("down", "Install app", installApp)));
  const n = NOTES.filter(d => !d.data().read).length, bl = b.querySelector("[data-bell]"); bl.textContent = n; bl.hidden = !n;
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
