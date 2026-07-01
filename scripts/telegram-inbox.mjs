// Источник «telegram»: для тех, у кого нет Notion/Zoom.
// Пользователь в течение дня пересылает боту транскрипты созвонов (текстом),
// а вечером рутина считывает все сегодняшние сообщения через getUpdates.
//
// ПОЧЕМУ РАБОТАЕТ БЕЗ ПОСТОЯННОГО СЕРВЕРА (важно для Claude Routines):
// Telegram хранит непрочитанные апдейты на своих серверах ДО 24 ЧАСОВ. Бот-приёмник
// не обязан работать весь день — один вечерний вызов getUpdates забирает всё,
// что накопилось за день. Условия: (1) пересылать транскрипты в тот же день до
// вечернего прогона (что старше 24ч — Telegram удаляет); (2) у бота нет вебхука
// (getUpdates и webhook несовместимы); (3) очередь не опрашивает параллельно другой
// клиент (getUpdates отдаёт апдейты одному потребителю).
//
// Чтение НЕРАЗРУШАЮЩЕЕ: offset не передаём → апдейты не подтверждаются и не удаляются.
// Если деплой упадёт — сообщения останутся в очереди и заберутся повторно (в пределах 24ч).
// Лимит одного чтения — 100 сообщений (при >100 созвонов/день нужна постраничность).
//
// Запуск: node scripts/telegram-inbox.mjs [YYYY-MM-DD]
// Вывод (stdout): { "date": "...", "messages": [ { "time": "HH:MM", "text": "..." } ] }
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
