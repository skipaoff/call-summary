// Рендер мини-сайта за день: индекс со списком звонков + отдельная подстраница
// на каждый звонок. Один деплой = вся папка → один публичный URL дня, внутри
// переходы вида <url>/<time>/.
// Запуск: node scripts/build-day.mjs <day.json> [outDir]
// day.json = { "date": "YYYY-MM-DD", "meetings": [ <встреча>, ... ] }
import fs from "node:fs";
import path from "node:path";

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function humanDate(date) {
  const [y, m, d] = date.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

// Слаг подстраницы: из времени (1258) или порядкового номера, если времени нет.
function slug(meeting, index) {
  const t = (meeting.time ?? "").replace(/[^0-9]/g, "");
  return t || String(index + 1);
}

// ── общий стиль (брендбук), инлайнится в каждую страницу — каждая самодостаточна ──
const STYLE = `
:root{
  --accent:#fdd506;--accent-bg:#fdd50614;--accent-dim:#fdd50624;
  --bg:#0a0504;--bg-elevated:#130d09;--bg-panel:#1a1310;
  --fg:#f9f3e8;--fg-soft:#c8c3bc;--fg-muted:#9d9791;--fg-dimmed:#625c58;
  --rule:#2a221f;--rule-bright:#4f4541;
  --font-display:"Unbounded","Arial Black",sans-serif;
  --font-sans:"IBM Plex Sans",ui-sans-serif,system-ui,sans-serif;
  --font-mono:"JetBrains Mono",ui-monospace,monospace;
  --container-px:48px;
}
@media(max-width:1024px){:root{--container-px:40px}}
@media(max-width:768px){:root{--container-px:24px}}
@media(max-width:480px){:root{--container-px:20px}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--font-sans);font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased}
.wrap{max-width:1060px;margin:0 auto;padding:clamp(28px,6vw,72px) var(--container-px) 96px}
.mono-label{font-family:var(--font-mono);font-size:10.5px;text-transform:uppercase;letter-spacing:.16em;color:var(--fg-muted)}
a{color:inherit;text-decoration:none}
/* шапка */
.day-header{display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding-bottom:22px;border-bottom:1px solid var(--rule);margin-bottom:8px}
.day-header h1{font-family:var(--font-display);font-weight:700;font-size:clamp(26px,4.5vw,44px);line-height:1.02;letter-spacing:-.01em;text-transform:uppercase;margin:10px 0 0}
.day-header .count{white-space:nowrap}
/* индекс: список звонков */
.idx-list{display:flex;flex-direction:column}
.idx-row{display:grid;grid-template-columns:auto 1fr auto;gap:20px;align-items:center;padding:22px 4px;border-bottom:1px solid var(--rule);transition:background .15s,border-color .15s,padding-left .15s}
.idx-row:first-child{border-top:1px solid var(--rule)}
.idx-row:hover{background:var(--bg-elevated);border-bottom-color:var(--rule-bright);padding-left:14px}
.idx-row .when{font-family:var(--font-mono);font-size:22px;color:var(--accent);font-weight:500}
.idx-row .title{font-family:var(--font-display);font-weight:500;font-size:clamp(16px,2.2vw,21px);letter-spacing:-.01em;margin:0 0 5px}
.idx-row .snippet{color:var(--fg-soft);font-size:13.5px;margin:0 0 6px;max-width:70ch}
.idx-row .meta{font-family:var(--font-mono);font-size:11px;color:var(--fg-dimmed);text-transform:uppercase;letter-spacing:.1em}
.idx-row .meta b{color:var(--accent);font-weight:500}
.idx-row .chevron{color:var(--fg-dimmed);font-size:22px;transition:color .15s,transform .15s}
.idx-row:hover .chevron{color:var(--accent);transform:translateX(3px)}
@media(max-width:560px){.idx-row{grid-template-columns:auto 1fr}.idx-row .chevron{display:none}}
/* подстраница звонка */
.back{display:inline-flex;align-items:center;gap:8px;font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:var(--fg-muted);margin-bottom:26px}
.back:hover{color:var(--accent)}
.meeting-head{border-bottom:1px solid var(--rule);padding-bottom:24px;margin-bottom:6px}
.meeting-head .meta{font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--fg-dimmed);margin-bottom:8px}
.meeting-head h1{font-family:var(--font-display);font-weight:700;font-size:clamp(24px,4vw,38px);line-height:1.05;letter-spacing:-.01em;margin:0 0 14px}
.people{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex;align-items:center;font-family:var(--font-mono);font-size:11px;letter-spacing:.04em;padding:4px 11px;border:1px solid var(--rule-bright);border-radius:999px;color:var(--fg-soft);background:var(--bg-elevated)}
.section{padding:30px 0;border-bottom:1px solid var(--rule)}
.section:last-of-type{border-bottom:none}
.section-head{display:flex;align-items:baseline;gap:14px;margin-bottom:18px}
.section-num{font-family:var(--font-mono);font-size:13px;color:var(--accent);font-weight:500}
.section-title{font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:var(--fg-muted)}
.lede{font-size:16.5px;line-height:1.6;color:var(--fg);max-width:64ch;margin:0}
.numbered{list-style:none;margin:0;padding:0}
.numbered li{display:grid;grid-template-columns:auto 1fr;gap:14px;padding:11px 0;border-top:1px solid var(--rule);color:var(--fg-soft)}
.numbered li:first-child{border-top:none}
.numbered li .n{font-family:var(--font-mono);font-size:12px;color:var(--fg-dimmed)}
.owners{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:720px){.owners{grid-template-columns:1fr}}
.owner-name{display:flex;align-items:center;gap:10px;font-family:var(--font-display);font-weight:500;font-size:16px;margin-bottom:10px}
.owner-name .badge{font-family:var(--font-mono);font-size:11px;color:var(--fg-dimmed);font-weight:400}
.task{border:1px solid var(--rule-bright);border-left:2px solid var(--accent);background:var(--bg-elevated);padding:13px 15px;margin-bottom:9px}
.task .what{font-size:14px;color:var(--fg);margin:0 0 7px}
.task .due{font-family:var(--font-mono);font-size:10.5px;text-transform:uppercase;letter-spacing:.12em;color:var(--accent);background:var(--accent-bg);border:1px solid var(--accent-dim);padding:2px 8px;display:inline-block}
.task .due.none{color:var(--fg-dimmed);background:transparent;border-color:var(--rule-bright)}
.reminders{list-style:none;margin:0;padding:0}
.reminders li{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start;padding:12px 14px;margin-bottom:8px;background:var(--accent-bg);border:1px solid var(--accent-dim);color:var(--fg-soft);font-size:14px}
.reminders li .mark{color:var(--accent);font-family:var(--font-mono)}
.origin{display:inline-block;margin-top:6px;font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--fg-muted)}
.origin:hover{color:var(--accent)}
.empty{border:1px solid var(--rule);padding:48px 24px;text-align:center;color:var(--fg-muted);font-family:var(--font-mono);font-size:13px}
footer{margin-top:36px;padding-top:20px;border-top:1px solid var(--rule);font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:var(--fg-dimmed)}
`;

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`;

function shell(title, body) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
${FONTS}
<style>${STYLE}</style>
</head>
<body><div class="wrap">${body}</div></body>
</html>`;
}

function renderList(title, num, items, cls) {
  if (!items?.length) return "";
  const li = items.map((x, i) =>
    cls === "numbered"
      ? `<li><span class="n">${String(i + 1).padStart(2, "0")}</span><span>${esc(x)}</span></li>`
      : `<li><span class="mark">!</span><span>${esc(x)}</span></li>`
  ).join("");
  return `
  <section class="section">
    <div class="section-head"><span class="section-num">${num}</span><span class="section-title">${esc(title)}</span></div>
    <ul class="${cls}">${li}</ul>
  </section>`;
}

function renderTasks(num, tasks) {
  if (!tasks?.length) return "";
  const groups = new Map();
  for (const t of tasks) {
    const owner = t.owner?.trim() || "Без ответственного";
    if (!groups.has(owner)) groups.set(owner, []);
    groups.get(owner).push(t);
  }
  const cols = [...groups.entries()].map(([owner, items]) => `
    <div class="owner-col">
      <div class="owner-name">${esc(owner)}<span class="badge">${items.length}</span></div>
      ${items.map((t) => `
      <div class="task">
        <p class="what">${esc(t.task)}</p>
        <span class="due${t.due ? "" : " none"}">${t.due ? esc(humanDate(t.due)) : "без срока"}</span>
      </div>`).join("")}
    </div>`).join("");
  return `
  <section class="section">
    <div class="section-head"><span class="section-num">${num}</span><span class="section-title">Задачи · кто / что / дедлайн</span></div>
    <div class="owners">${cols}
    </div>
  </section>`;
}

// Индекс дня: карточки-ссылки на подстраницы звонков.
function renderIndex(day) {
  const meetings = day.meetings ?? [];
  const rows = meetings.map((m, i) => {
    const tasks = m.tasks?.length ?? 0;
    const people = m.participants?.length ? ` · ${esc(m.participants.join(", "))}` : "";
    return `
    <a class="idx-row" href="./${slug(m, i)}/">
      <span class="when">${esc(m.time ?? String(i + 1))}</span>
      <div>
        <p class="title">${esc(m.title)}</p>
        ${m.summary ? `<p class="snippet">${esc(m.summary)}</p>` : ""}
        <span class="meta"><b>${tasks}</b> задач · ${m.decisions?.length ?? 0} решений${people}</span>
      </div>
      <span class="chevron">›</span>
    </a>`;
  }).join("");

  const count = meetings.length;
  const body = `
  <header class="day-header">
    <div>
      <span class="mono-label">Call Summary / сводка за день</span>
      <h1>${esc(humanDate(day.date))}</h1>
    </div>
    <span class="mono-label count">${count} ${count === 1 ? "встреча" : "встреч"}</span>
  </header>
  ${count === 0 ? `<div class="empty">За этот день встреч не было.</div>` : `<div class="idx-list">${rows}</div>`}
  <footer>Саммари — Claude из транскриптов Notion</footer>`;
  return shell(`Сводка за ${humanDate(day.date)} — Call Summary`, body);
}

// Подстраница одного звонка.
function renderMeetingPage(day, meeting) {
  const people = (meeting.participants ?? []).map((p) => `<span class="chip">${esc(p)}</span>`).join("");
  const body = `
  <a class="back" href="../">‹ сводка за ${esc(humanDate(day.date))}</a>
  <div class="meeting-head">
    <div class="meta">${meeting.time ? esc(meeting.time) : ""}${meeting.source ? ` · ${esc(meeting.source)}` : ""}</div>
    <h1>${esc(meeting.title)}</h1>
    ${people ? `<div class="people">${people}</div>` : ""}
  </div>
  ${meeting.summary ? `<section class="section"><div class="section-head"><span class="section-num">01</span><span class="section-title">Саммари</span></div><p class="lede">${esc(meeting.summary)}</p></section>` : ""}
  ${renderList("Решения", "02", meeting.decisions, "numbered")}
  ${renderTasks("03", meeting.tasks)}
  ${renderList("Напоминания", "04", meeting.reminders, "reminders")}
  ${meeting.sourceUrl ? `<section class="section"><a class="origin" href="${esc(meeting.sourceUrl)}">открыть оригинал в Notion ›</a></section>` : ""}`;
  return shell(`${meeting.title} — ${humanDate(day.date)}`, body);
}

function main() {
  const input = process.argv[2];
  const outDir = process.argv[3] || "out/site";
  if (!input) throw new Error("Укажи файл дня: node scripts/build-day.mjs <day.json> [outDir]");

  const day = JSON.parse(fs.readFileSync(input, "utf8"));
  if (!day.date) throw new Error("В day.json нет поля date");

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), renderIndex(day), "utf8");

  for (const [i, meeting] of (day.meetings ?? []).entries()) {
    const dir = path.join(outDir, slug(meeting, i));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), renderMeetingPage(day, meeting), "utf8");
  }

  // Чистая статика: Vercel НЕ собирает — отдаёт каталог как есть.
  fs.writeFileSync(
    path.join(outDir, "vercel.json"),
    JSON.stringify({ framework: null, buildCommand: null, installCommand: null }, null, 2),
  );

  const n = day.meetings?.length ?? 0;
  console.log(`Сайт за ${day.date} собран в ${outDir}/ — индекс + ${n} подстр.`);
}

main();
