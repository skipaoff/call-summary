// Клиент Crypto Pay (CryptoBot). Токен — только из окружения.
const BASE = "https://pay.crypt.bot/api/";

async function call(method, body) {
  const res = await fetch(BASE + method, {
    method: "POST",
    headers: {
      "Crypto-Pay-API-Token": process.env.CRYPTOPAY_TOKEN,
      "content-type": "application/json",
    },
    body: JSON.stringify(body || {}),
  });
  return res.json();
}

// Инвойс в фиате ($5) — пользователь платит криптой по курсу.
export async function createInvoice({ amount, payload, description }) {
  const data = await call("createInvoice", {
    currency_type: "fiat",
    fiat: "USD",
    amount: String(amount),
    description,
    payload,
    paid_btn_name: "openBot",
    paid_btn_url: `https://t.me/${process.env.BOT_USERNAME}`,
    allow_comments: false,
    expires_in: 3600,
  });
  if (!data.ok) throw new Error("CryptoPay createInvoice: " + JSON.stringify(data.error || data));
  return data.result;
}

// Перепроверка статуса инвойса напрямую у Crypto Pay — не доверяем телу вебхука вслепую.
export async function getInvoice(invoiceId) {
  const res = await fetch(BASE + "getInvoices?invoice_ids=" + encodeURIComponent(invoiceId), {
    headers: { "Crypto-Pay-API-Token": process.env.CRYPTOPAY_TOKEN },
  });
  const data = await res.json();
  return data?.result?.items?.[0] || null;
}
