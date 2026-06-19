// Отправка краткого саммари встречи + ссылки на страницу в Telegram.
// Запуск: node scripts/send-telegram.mjs [meetingId]
// Без id — берёт последнюю встречу.
import { loadEnv, loadConfig, loadMeeting, latestMeetingId } from "./lib.mjs";

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function humanDate(date, time) {
  const [year, month, day] = date.split("-");
  const base = `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
  return time ? `${base}, ${time}` : base;
}

function buildMessage(meeting, baseUrl) {
  const lines = [];
  lines.push(`🗓 ${humanDate(meeting.date, meeting.time)}`);
  lines.push(`*${meeting.title}*`);
  if (meeting.summary) lines.push("", meeting.summary);

  if (meeting.tasks?.length) {
    lines.push("", "✅ *Задачи*");
    for (const t of meeting.tasks) {
      const due = t.due ? ` (до ${humanDate(t.due)})` : "";
      lines.push(`• ${t.owner ? t.owner + " — " : ""}${t.task}${due}`);
    }
  }

  if (meeting.reminders?.length) {
    lines.push("", "⏰ *Напоминания*");
    for (const r of meeting.reminders) lines.push(`• ${r}`);
  }

  if (baseUrl) {
    const url = `${baseUrl.replace(/\/$/, "")}/meetings/${meeting.id}/`;
    lines.push("", `→ ${url}`);
  }
  return lines.join("\n");
}

async function main() {
  const env = loadEnv();
  const config = loadConfig();

  // fail-fast: без обязательных секретов не стартуем
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token) throw new Error("Нет TELEGRAM_BOT_TOKEN в .env");
  if (!chatId) throw new Error("Нет TELEGRAM_CHAT_ID в .env (напиши боту, потом достанем chat_id)");

  const id = process.argv[2] || latestMeetingId();
  const meeting = loadMeeting(id);
  const text = buildMessage(meeting, config.site?.baseUrl);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: false,
    }),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram API: ${data.description ?? res.status}`);
  console.log(`Отправлено в Telegram: встреча ${id}`);
}

main().catch((err) => {
  console.error("Ошибка отправки:", err.message);
  process.exit(1);
});
