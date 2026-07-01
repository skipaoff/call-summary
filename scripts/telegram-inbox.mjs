// Источник «telegram»: для тех, у кого нет Notion/Zoom.
// Пользователь в течение дня пересылает боту транскрипты созвонов (текстом),
// а вечером рутина считывает все сегодняшние сообщения через getUpdates.
// Запуск: node scripts/telegram-inbox.mjs [YYYY-MM-DD]
// Вывод (stdout): { "date": "...", "messages": [ { "time": "HH:MM", "text": "..." } ] }
// Бот-приёмник не должен иметь вебхука (getUpdates и webhook несовместимы).
import { loadEnv } from "./lib.mjs";

const pad = (n) => String(n).padStart(2, "0");

async function main() {
  const env = loadEnv();
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token) throw new Error("Нет TELEGRAM_BOT_TOKEN");

  const target = process.argv[2] || new Date().toISOString().slice(0, 10);

  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100&timeout=0`);
  const data = await res.json();
  if (!data.ok) throw new Error(`getUpdates: ${data.description ?? res.status}`);

  const messages = [];
  for (const upd of data.result) {
    const m = upd.message;
    if (!m || !m.text) continue;
    if (m.text.startsWith("/")) continue; // команды пропускаем
    if (chatId && String(m.chat?.id) !== String(chatId)) continue; // только от владельца
    const d = new Date(m.date * 1000);
    if (d.toISOString().slice(0, 10) !== target) continue; // только за нужный день (UTC)
    messages.push({ time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`, text: m.text });
  }
  messages.sort((a, b) => a.time.localeCompare(b.time));

  console.log(JSON.stringify({ date: target, messages }, null, 2));
}

main().catch((err) => {
  console.error("Ошибка чтения инбокса:", err.message);
  process.exit(1);
});
