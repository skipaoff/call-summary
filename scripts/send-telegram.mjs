// Одно сообщение за день: краткая сводка по всем встречам + одна ссылка на страницу.
// Запуск: node scripts/send-telegram.mjs <day.json> <pageUrl>
import fs from "node:fs";
import { loadEnv } from "./lib.mjs";

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function humanDate(date) {
  const [y, m, d] = date.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

function pluralMeetings(n) {
  if (n === 1) return "встреча";
  if (n >= 2 && n <= 4) return "встречи";
  return "встреч";
}

function buildMessage(day, url) {
  const meetings = day.meetings ?? [];
  const lines = [];
  lines.push(`🗓 *Сводка за ${humanDate(day.date)}* — ${meetings.length} ${pluralMeetings(meetings.length)}`);

  for (const m of meetings) {
    lines.push("", `*${m.title}*${m.time ? ` · ${m.time}` : ""}`);
    if (m.summary) lines.push(m.summary);
    if (m.tasks?.length) {
      for (const t of m.tasks) {
        const due = t.due ? ` (до ${humanDate(t.due)})` : "";
        lines.push(`• ${t.owner ? t.owner + " — " : ""}${t.task}${due}`);
      }
    }
  }

  lines.push("", `→ ${url}`);
  return lines.join("\n");
}

async function main() {
  const dayFile = process.argv[2];
  const url = process.argv[3];
  if (!dayFile || !url) throw new Error("Запуск: node scripts/send-telegram.mjs <day.json> <pageUrl>");

  const env = loadEnv();
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token) throw new Error("Нет TELEGRAM_BOT_TOKEN");
  if (!chatId) throw new Error("Нет TELEGRAM_CHAT_ID");

  const day = JSON.parse(fs.readFileSync(dayFile, "utf8"));
  const text = buildMessage(day, url);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", disable_web_page_preview: false }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram API: ${data.description ?? res.status}`);
  console.log(`Отправлено в Telegram: сводка за ${day.date}`);
}

main().catch((err) => {
  console.error("Ошибка отправки:", err.message);
  process.exit(1);
});
