# Call Summary — бот-магазин (Crypto Pay)

Telegram-бот **@skipa_pay_bot**: `/buy` → создаёт инвойс $5 в Crypto Pay → после
оплаты выдаёт покупателю ссылку на репозиторий + гайд и шлёт владельцу уведомление
«кто оплатил». Хостинг — serverless-функции на Vercel. Без БД, без зависимостей.

## Эндпоинты
- `POST /api/telegram` — вебхук Telegram (команды бота).
- `POST /api/cryptopay` — вебхук Crypto Pay (подтверждение оплаты).

## Переменные окружения (env Vercel + локально `.env`)
| Переменная | Назначение |
|---|---|
| `BOT_TOKEN` | токен бота от @BotFather |
| `BOT_USERNAME` | `skipa_pay_bot` (для кнопки возврата после оплаты) |
| `CRYPTOPAY_TOKEN` | токен Crypto Pay (@CryptoBot → Crypto Pay → Create App) |
| `OWNER_CHAT_ID` | твой Telegram id — туда летят уведомления об оплатах |
| `PRICE_USD` | цена, по умолчанию `5` |
| `REPO_URL` | что выдаём после оплаты |
| `TELEGRAM_WEBHOOK_SECRET` | случайная строка для проверки вебхука Telegram |

## Деплой и настройка
1. Задеплоить `bot/` на Vercel, задать env-переменные, снять Deployment Protection.
2. Установить вебхук Telegram:
   ```bash
   BOT_TOKEN=… TELEGRAM_WEBHOOK_SECRET=… node scripts/set-webhook.mjs https://<твой-домен>
   ```
3. В @CryptoBot → Crypto Pay → My Apps → (приложение) → **Webhooks** указать URL:
   `https://<твой-домен>/api/cryptopay` и включить.
4. Один раз нажать **/start** у @skipa_pay_bot с аккаунта владельца — иначе бот не
   сможет прислать тебе уведомления об оплатах.

## Поток оплаты
```
/start или /buy → createInvoice ($5, fiat USD) → кнопка «Оплатить» (pay_url)
   → оплата → Crypto Pay шлёт invoice_paid на /api/cryptopay
   → статус перепроверяется → покупателю ссылка, владельцу уведомление
```
