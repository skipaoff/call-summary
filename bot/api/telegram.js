// Вебхук Telegram: /start, /buy и кнопка «Купить» → создаём инвойс Crypto Pay.
import { tg, send } from "../lib/tg.js";
import { createInvoice } from "../lib/cryptopay.js";
import { deliverAccess } from "../lib/deliver.js";

const PRICE = process.env.PRICE_USD || "5";

function welcome(chatId) {
  const text =
    "<b>Call Summary</b> — AI-сводки твоих созвонов из Notion и Zoom.\n\n" +
    "Каждый вечер сам собирает сводку дня, публикует страницу и шлёт ссылку в Telegram. " +
    "Без сервера, по расписанию.\n\n" +
    `Доступ — <b>$${PRICE}</b> разово, криптой. После оплаты сразу пришлю ссылку на ` +
    "репозиторий и гайд установки за 5 минут.";
  return send(chatId, text, {
    reply_markup: { inline_keyboard: [[{ text: `💳 Купить за $${PRICE}`, callback_data: "buy" }]] },
  });
}

async function startPurchase(chatId, from) {
  try {
    const invoice = await createInvoice({
      amount: PRICE,
      description: "Call Summary — доступ (lifetime)",
      payload: JSON.stringify({ chat: chatId, u: from?.username || "", id: from?.id }),
    });
    await send(chatId,
      `Счёт на <b>$${PRICE}</b> создан. Оплати по кнопке ниже — доступ придёт сюда автоматически после подтверждения.`,
      { reply_markup: { inline_keyboard: [[{ text: "Оплатить →", url: invoice.pay_url }]] } });
  } catch (e) {
    console.error(e);
    await send(chatId, "Не получилось создать счёт. Попробуй ещё раз через минуту или напиши нам.");
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("ok");
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers["x-telegram-bot-api-secret-token"] !== secret) {
    return res.status(401).send("forbidden");
  }
  try {
    const update = req.body || {};
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat?.id;
      await tg("answerCallbackQuery", { callback_query_id: cb.id });
      if (cb.data === "buy" && chatId) await startPurchase(chatId, cb.from);
    } else if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const text = (msg.text || "").trim();
      const pass = (process.env.ACCESS_PASSWORD || "").trim().toLowerCase();
      if (pass && text.toLowerCase() === pass) {
        // пароль = бесплатная копия: сразу выдаём доступ
        await deliverAccess(chatId, "🔓 <b>Доступ открыт.</b>");
        const owner = process.env.OWNER_CHAT_ID;
        if (owner && String(owner) !== String(chatId)) {
          await send(owner, `🔓 <b>Доступ по паролю</b>\nОт: @${msg.from?.username || "—"} (id ${msg.from?.id})`);
        }
      } else if (text.startsWith("/buy")) {
        await startPurchase(chatId, msg.from);
      } else {
        await welcome(chatId);
      }
    }
  } catch (e) {
    console.error("telegram handler:", e);
  }
  return res.status(200).json({ ok: true });
}
