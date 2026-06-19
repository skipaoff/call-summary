# Call Summary

Персональный пайплайн: берёт транскрипты созвонов из **Notion AI Meeting Notes**,
делает кастомное саммари через Claude, публикует **одну HTML-страницу за день** на
Vercel и шлёт краткую сводку + ссылку в **Telegram**. Запуск — по расписанию через
Claude Routines, без своего бэкенда.

«Последний день» всегда тут: https://call-summary-vert.vercel.app

## Идея архитектуры (просто)

```
Notion (источник) → саммари (Claude) → days/<дата>.json
                                              ↓
                          build-day.mjs → одна HTML-страница за день
                                              ↓
                              Vercel (статика)   Telegram (одна ссылка/день)
```

- **Одна страница на день.** Все встречи дня — на одной странице, каждая детально.
- **Архив без БД.** На деплое Vercel выдаёт неизменяемый публичный URL дня. Он уходит
  в Telegram один раз и живёт вечно → **история ссылок в Telegram и есть архив.**
- **Источник — сменный адаптер.** Notion это первая реализация; остальной пайплайн
  работает с единым форматом встречи.
- **Без хардкода.** Параметры — в `config.json`, секреты — в `.env`.

## Структура

| Путь | Назначение |
|------|------------|
| `config.json` | Несекретные параметры: Notion-страница, проект/scope Vercel |
| `.env` | Секреты (в git не попадает) — см. `.env.example` |
| `RUNBOOK.md` | Пошаговый пайплайн (Notion → саммари → страница дня → деплой → Telegram) |
| `scripts/build-day.mjs` | Рендер одной HTML-страницы за день (стиль брендбука, без сборки) |
| `scripts/send-telegram.mjs` | Сводка за день + ссылка в Telegram |
| `days/<дата>.json` | Данные дня: массив встреч (пример: `days/2026-06-19.json`) |

## Запуск

### Настройка
1. `cp .env.example .env` и заполнить `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `VERCEL_TOKEN`.
2. Указать свою Notion-страницу в `config.json` → `source.notionPageUrl`.

### Локально (собрать + задеплоить + отправить)
```bash
node scripts/build-day.mjs days/2026-06-19.json out/site/index.html
cd out/site && npx vercel@latest deploy --prod --yes --scope <scope> --token "$VERCEL_TOKEN"
node scripts/send-telegram.mjs days/2026-06-19.json "<immutable-url>"
```

Полный регламент прогона — в `RUNBOOK.md`.

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `TELEGRAM_BOT_TOKEN` | Токен Telegram-бота |
| `TELEGRAM_CHAT_ID` | Куда слать сводку |
| `VERCEL_TOKEN` | Деплой на Vercel через CLI |
