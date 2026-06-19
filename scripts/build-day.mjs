// Рендер ОДНОЙ страницы за день: все встречи дня на одном самодостаточном HTML.
// Запуск: node scripts/build-day.mjs <day.json> [outFile]
// day.json = { "date": "YYYY-MM-DD", "meetings": [ <встреча>, ... ] }
// Стиль — брендбук AI-Маркетолог, CSS инлайн (без сборки и зависимостей).
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

// Группировка задач по ответственному — колонки «кто / что / дедлайн».
function tasksByOwner(tasks = []) {
  const groups = new Map();
  for (const t of tasks) {
    const owner = t.owner?.trim() || "Без ответственного";
    if (!groups.has(owner)) groups.set(owner, []);
    groups.get(owner).push(t);
  }
  return [...groups.entries()];
}

function renderTasks(tasks) {
  const owners = tasksByOwner(tasks);
  if (owners.length === 0) return "";
  const cols = owners.map(([owner, items]) => `
        <div class="owner-col">
          <div class="owner-name">${esc(owner)}<span class="badge">${items.length}</span></div>
          ${items.map((t) => `
          <div class="task">
            <p class="what">${esc(t.task)}</p>
            <span class="due${t.due ? "" : " none"}">${t.due ? esc(humanDate(t.due)) : "без срока"}</span>
          </div>`).join("")}
        </div>`).join("");
  return `
      <div class="block">
        <div class="block-head"><span class="block-title">Задачи · кто / что / дедлайн</span></div>
        <div class="owners">${cols}
        </div>
      </div>`;
}

function renderList(title, items, cls) {
  if (!items?.length) return "";
  const li = items.map((x, i) =>
    cls === "numbered"
      ? `<li><span class="n">${String(i + 1).padStart(2, "0")}</span><span>${esc(x)}</span></li>`
      : `<li><span class="mark">!</span><span>${esc(x)}</span></li>`
  ).join("");
  return `
      <div class="block">
        <div class="block-head"><span class="block-title">${esc(title)}</span></div>
        <ul class="${cls}">${li}</ul>
      </div>`;
}

function renderMeeting(m, index) {
  const people = (m.participants ?? []).map((p) => `<span class="chip">${esc(p)}</span>`).join("");
  return `
    <article class="meeting">
      <div class="meeting-head">
        <span class="num">${String(index + 1).padStart(2, "0")}</span>
        <div>
          <div class="meeting-meta">${m.time ? esc(m.time) : ""}${m.source ? ` · ${esc(m.source)}` : ""}</div>
          <h2>${esc(m.title)}</h2>
          ${people ? `<div class="people">${people}</div>` : ""}
        </div>
      </div>
      ${m.summary ? `<p class="lede">${esc(m.summary)}</p>` : ""}
      ${renderList("Решения", m.decisions, "numbered")}
      ${renderTasks(m.tasks)}
      ${renderList("Напоминания", m.reminders, "reminders")}
      ${m.sourceUrl ? `<a class="origin" href="${esc(m.sourceUrl)}">открыть оригинал в Notion ›</a>` : ""}
    </article>`;
}

function renderPage(day) {
  const meetings = day.meetings ?? [];
  const count = meetings.length;
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Сводка за ${esc(humanDate(day.date))} — Call Summary</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
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
.day-header{display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding-bottom:22px;border-bottom:1px solid var(--rule);margin-bottom:8px}
.day-header h1{font-family:var(--font-display);font-weight:700;font-size:clamp(26px,4.5vw,44px);line-height:1.02;letter-spacing:-.01em;text-transform:uppercase;margin:10px 0 0}
.day-header .count{white-space:nowrap}
.meeting{padding:40px 0;border-bottom:1px solid var(--rule)}
.meeting:last-of-type{border-bottom:none}
.meeting-head{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:start;margin-bottom:18px}
.meeting-head .num{font-family:var(--font-mono);font-size:26px;color:var(--accent);font-weight:500;line-height:1}
.meeting-meta{font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--fg-dimmed);margin-bottom:6px}
.meeting-head h2{font-family:var(--font-display);font-weight:500;font-size:clamp(19px,3vw,28px);line-height:1.08;letter-spacing:-.01em;margin:0 0 12px}
.people{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex;align-items:center;font-family:var(--font-mono);font-size:11px;letter-spacing:.04em;padding:4px 11px;border:1px solid var(--rule-bright);border-radius:999px;color:var(--fg-soft);background:var(--bg-elevated)}
.lede{font-size:16.5px;line-height:1.6;color:var(--fg);max-width:64ch;margin:0 0 8px}
.block{padding:22px 0 4px}
.block-head{margin-bottom:14px}
.block-title{font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:var(--fg-muted)}
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
.origin{display:inline-block;margin-top:14px;font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--fg-muted);text-decoration:none}
.origin:hover{color:var(--accent)}
.empty{border:1px solid var(--rule);padding:48px 24px;text-align:center;color:var(--fg-muted);font-family:var(--font-mono);font-size:13px}
footer{margin-top:36px;padding-top:20px;border-top:1px solid var(--rule);font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:var(--fg-dimmed)}
</style>
</head>
<body>
<div class="wrap">
  <header class="day-header">
    <div>
      <span class="mono-label">Call Summary / сводка за день</span>
      <h1>${esc(humanDate(day.date))}</h1>
    </div>
    <span class="mono-label count">${count} ${count === 1 ? "встреча" : "встреч"}</span>
  </header>
  ${count === 0
    ? `<div class="empty">За этот день встреч не было.</div>`
    : meetings.map((m, i) => renderMeeting(m, i)).join("")}
  <footer>Саммари — Claude из транскриптов Notion</footer>
</div>
</body>
</html>`;
}

function main() {
  const input = process.argv[2];
  const out = process.argv[3] || "out/site/index.html";
  if (!input) throw new Error("Укажи файл дня: node scripts/build-day.mjs <day.json> [outFile]");

  const day = JSON.parse(fs.readFileSync(input, "utf8"));
  if (!day.date) throw new Error("В day.json нет поля date");

  const outDir = path.dirname(out);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(out, renderPage(day), "utf8");

  // Чистая статика: говорим Vercel НЕ собирать (никакого Next.js/билда) —
  // просто отдать каталог как есть.
  fs.writeFileSync(
    path.join(outDir, "vercel.json"),
    JSON.stringify({ framework: null, buildCommand: null, installCommand: null }, null, 2),
  );
  console.log(`Страница за ${day.date} собрана: ${out} (встреч: ${day.meetings?.length ?? 0})`);
}

main();
