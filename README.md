# Call Summary

Персональный пайплайн: берёт транскрипты созвонов из **Notion AI Meeting Notes**,
делает кастомное саммари через Claude, публикует **HTML-страницу на Vercel** и шлёт
краткое саммари + ссылку в **Telegram**. Запуск — по расписанию через Claude
Routines, без своего бэкенда.

Живой сайт: https://call-summary-vert.vercel.app

## Как это устроено

```
Notion (источник) → саммари (Claude) → web/content/meetings/<id>.json
                                              ↓
                              Vercel (статика)   Telegram (пуш)
```

- **Источник — сменный адаптер.** Notion это первая реализация; остальной пайплайн
  работает с единым форматом встречи `{ date, title, participants, transcript }`.
- **Без БД.** История — это накапливающиеся JSON-файлы в `web/content/meetings/`.
- **Без хардкода.** Параметры — в `config.json`, секреты — в `.env`.

## Структура

| Путь | Назначение |
|------|------------|
| `config.json` | Несекретные параметры: Notion-страница, baseUrl, проект/scope Vercel |
| `.env` | Секреты (в git не попадает) — см. `.env.example` |
| `RUNBOOK.md` | Пошаговый пайплайн для Routine (Notion → саммари → деплой → Telegram) |
| `scripts/send-telegram.mjs` | Отправка саммари в Telegram |
| `web/` | Next.js-приложение (статический экспорт), список встреч + страница встречи |

## Запуск

### Настройка
1. `cp .env.example .env` и заполнить:
   - `TELEGRAM_BOT_TOKEN` — токен бота от @BotFather
   - `TELEGRAM_CHAT_ID` — id чата-получателя
   - `VERCEL_TOKEN` — токен из Vercel → Settings → Tokens
2. Указать свою Notion-страницу с записями в `config.json` → `source.notionPageUrl`.

### Локальная разработка сайта
```bash
cd web
npm install
npm run dev      # http://localhost:3000
```

### Прогон пайплайна
Следовать `RUNBOOK.md` (вручную или из Routine). Деплой и пуш:
```bash
cd web && npx vercel@latest deploy --prod --yes --scope <scope> --token "$VERCEL_TOKEN"
node scripts/send-telegram.mjs <meetingId>
```

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `TELEGRAM_BOT_TOKEN` | Токен Telegram-бота |
| `TELEGRAM_CHAT_ID` | Куда слать саммари |
| `VERCEL_TOKEN` | Деплой на Vercel через CLI |
