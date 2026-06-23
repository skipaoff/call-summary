// Установить вебхук Telegram на задеплоенный бот.
// Запуск: BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... node scripts/set-webhook.mjs <baseUrl>
const base = process.argv[2];
const token = process.env.BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET || "";
if (!base || !token) {
  console.error("Запуск: node scripts/set-webhook.mjs <baseUrl> (нужны BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET в env)");
  process.exit(1);
}
const url = `${base.replace(/\/$/, "")}/api/telegram`;
const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ url, secret_token: secret, allowed_updates: ["message", "callback_query"] }),
});
console.log(JSON.stringify(await res.json(), null, 2));
console.log("webhook →", url);
