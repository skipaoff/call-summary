// Вебхук Crypto Pay: оплата подтверждена → выдаём доступ покупателю и шлём
// уведомление владельцу. Статус перепроверяем у Crypto Pay (не доверяем телу вслепую).
import { send } from "../lib/tg.js";
import { getInvoice } from "../lib/cryptopay.js";

const REPO = process.env.REPO_URL || "https://github.com/skipaoff/call-summary";
const GUIDE = process.env.GUIDE_URL || (REPO + "/blob/main/GUIDE.md");

function deliver(chatId) {
  const text =
    "✅ <b>Оплата получена. Спасибо!</b>\n\n" +
    "Вот твой доступ к Call Summary:\n" +
    `📦 Репозиторий: ${REPO}\n` +
    `📖 Установка за 5 минут: ${GUIDE}\n\n` +
    "Подключаешь Notion и/или Zoom, создаёшь рутину по гайду — и каждый вечер " +
    "сводка приходит сама. Вопросы — пиши прямо сюда.";
  return send(chatId, text, { disable_web_page_preview: false });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("ok");
  try {
    const update = req.body || {};
    if (update.update_type === "invoice_paid") {
      const paid = update.payload || {};
      // перепроверяем статус напрямую у Crypto Pay
      const inv = await getInvoice(paid.invoice_id);
      if (inv && inv.status === "paid") {
        let meta = {};
        try { meta = JSON.parse(inv.payload || "{}"); } catch {}
        if (meta.chat) await deliver(meta.chat);

        const owner = process.env.OWNER_CHAT_ID;
        if (owner) {
          await send(owner,
            `💰 <b>Новая оплата</b>\n` +
            `Сумма: ${inv.amount} ${inv.asset || inv.fiat || ""}\n` +
            `От: @${meta.u || "—"} (id ${meta.id || "—"})\n` +
            `Инвойс #${inv.invoice_id}`);
        }
      }
    }
  } catch (e) {
    console.error("cryptopay handler:", e);
  }
  // Crypto Pay ждёт 200, иначе будет ретраить
  return res.status(200).json({ ok: true });
}
