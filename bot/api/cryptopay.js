// Вебхук Crypto Pay: оплата подтверждена → выдаём доступ покупателю и шлём
// уведомление владельцу. Статус перепроверяем у Crypto Pay (не доверяем телу вслепую).
import { send } from "../lib/tg.js";
import { getInvoice } from "../lib/cryptopay.js";
import { deliverAccess } from "../lib/deliver.js";

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
        if (meta.chat) await deliverAccess(meta.chat, "✅ <b>Оплата получена. Спасибо!</b>");

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
