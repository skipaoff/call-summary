// Тонкий клиент Telegram Bot API. Токен — только из окружения.
const API = "https://api.telegram.org/bot";

export async function tg(method, body) {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("Нет BOT_TOKEN");
  const res = await fetch(`${API}${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function send(chatId, text, extra = {}) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra,
  });
}
