# RUNBOOK — пайплайн «Call Summary»

> Это инструкция, которую исполняет Claude-агент (вручную или из Routine по
> расписанию). Своего бэкенда нет — вся логика здесь. Параметры берём из
> `config.json`, секреты — из `.env`. Запускать из корня проекта.

## Шаги

### 1. Конфиг
Прочитать `config.json` → `source.notionPageId` (страница «Записи встреч»).

### 2. Достать встречи за сегодня (адаптер Notion)
- `notion-fetch` по `notionPageId` → список дочерних страниц (`<page>`), у каждой
  заголовок = дата/время встречи.
- Отфильтровать те, чья дата = сегодня.
- Для каждой: `notion-fetch` с `include_transcript=true` → берём `<transcript>`
  (основной вход) и метаданные. `<summary>` от Notion — максимум сырьё.

> Смена источника = переписать только этот шаг. Остальное работает с единым
> внутренним форматом `{ date, title, participants, transcript }`.

### 3. Саммари (кастомное, делает Claude)
Из `transcript` собрать JSON строго по схеме (см. ниже). Тон — деловой, кратко,
без воды. `id` = `<YYYY-MM-DD>-<HHMM>`.

### 4. Записать файл встречи
Сохранить JSON в `web/content/meetings/<id>.json`. Это и есть «история» —
накапливающиеся файлы, отдельная БД не нужна.

### 5. Деплой на Vercel
```bash
cd web
npx vercel@latest deploy --prod --yes --scope <site.vercelScope> --token "$VERCEL_TOKEN"
```
Vercel сам собирает Next.js (`output: export`) в статику. Прод-ссылка стабильна
(`site.baseUrl`).

### 6. Пуш в Telegram
Для каждой новой встречи:
```bash
node scripts/send-telegram.mjs <id>
```
Шлёт краткое саммари + ссылку на страницу встречи.

---

## Схема файла встречи (контракт для сайта и Telegram)

```json
{
  "id": "2026-06-19-1258",          // <YYYY-MM-DD>-<HHMM>, уникальный
  "date": "2026-06-19",             // YYYY-MM-DD
  "time": "12:58",                  // HH:MM (опц.)
  "timezone": "Asia/Makassar",      // опц.
  "title": "Короткий стендап…",     // заголовок встречи
  "participants": ["Миша", "Максим"],
  "summary": "Связный абзац: о чём договорились.",
  "decisions": ["Принятое решение 1", "…"],
  "tasks": [
    { "owner": "Миша", "task": "Что сделать", "due": "2026-06-19" }
  ],
  "reminders": ["Напоминание"],
  "source": "notion",
  "sourceUrl": "https://app.notion.com/p/…"
}
```

Правила: пустые секции — пустой массив `[]` (рендер сам их скрывает). `due` без
срока — пропустить поле или `null`. Любая встреча самодостаточна.

---

## Что параметризовано (нет хардкода)
- Notion-страница, имя сайта, `baseUrl`, scope/проект Vercel → `config.json`.
- Токены (Telegram, Vercel) → `.env` (в `.gitignore`).
- Путь к файлам встреч — одна константа в `web/lib/meetings.js` и `scripts/lib.mjs`.
