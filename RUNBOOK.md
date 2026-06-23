# RUNBOOK — пайплайн «Call Summary» (поденная модель)

> Инструкция, которую исполняет Claude-агент (вручную или из Routine по расписанию).
> Своего бэкенда нет. Параметры — из `config.json`, секреты — из `.env` (локально)
> или из переменных окружения среды (в облаке). Запускать из корня проекта.
>
> **Модель:** одна страница на день со всеми встречами дня. На деплое Vercel выдаёт
> неизменяемый публичный URL — он уходит в Telegram один раз и живёт вечно. Архив =
> история ссылок в Telegram. **Никакой БД и хранилища истории не нужно.**

## Шаги

### 1. Конфиг
Прочитать `config.json` → `source.type` (`notion` | `zoom`), `site.vercelProject`,
`site.vercelScope`. Для notion — `source.notion.pageId/pageUrl`.

### 2. Достать встречи за сегодня (адаптер по `source.type`)
Единственный шаг, зависящий от источника. Результат любой ветки — одинаковый внутренний
формат `{ time, title, participants, transcript }`.

**notion** (Notion-коннектор):
- `notion-fetch` по `pageId` → дочерние страницы; оставить те, чья дата в заголовке = сегодня.
- Для каждой: `notion-fetch` с `include_transcript=true` → берём `<transcript>`.

**zoom** (Zoom-коннектор):
- Через Zoom-коннектор взять облачные записи за сегодня (нужен Zoom Pro+ с cloud
  recording + audio transcription).
- Для каждой записи взять транскрипт (файл `audio_transcript`, VTT) → очистить от
  таймкодов в текст. Нет готового транскрипта — пропустить (заберётся позже).

> Новый источник = новая ветка только здесь. Дальше всё работает с единым форматом.

### 3. Саммари (кастомное, делает Claude)
Из каждого `transcript` собрать объект встречи (схема ниже). Тон — деловой, кратко,
по-русски. Собрать все встречи дня в один файл `days/<YYYY-MM-DD>.json`:
```json
{ "date": "YYYY-MM-DD", "meetings": [ <встреча>, <встреча>, ... ] }
```
Если встреч за сегодня нет — на этом закончить (ничего не собирать и не слать).

### 4. Собрать мини-сайт дня
```bash
node scripts/build-day.mjs days/<YYYY-MM-DD>.json out/site
```
Получается папка: `index.html` (сводка-список звонков) + `<time>/index.html` на
каждый звонок (детально) + `vercel.json` (framework=null → чистая статика, без сборки).
Стиль брендбука инлайнится в каждую страницу. Переходы относительные: `<url>/`,
`<url>/<time>/`.

### 5. Деплой на Vercel
```bash
cd out/site
npx vercel@latest link   --yes --project <site.vercelProject> --scope <site.vercelScope> --token "$VERCEL_TOKEN"
npx vercel@latest deploy --prod --yes --scope <site.vercelScope> --token "$VERCEL_TOKEN"
```
Из JSON-ответа взять `deployment.url` — это **неизменяемый публичный URL дня**.

> **Один раз при настройке** надо отключить Vercel Deployment Protection, иначе
> неизменяемые URL требуют логина (см. шаг setup в визарде). Через API:
> `PATCH https://api.vercel.com/v9/projects/<project>?teamId=<team>` с телом
> `{"ssoProtection": null, "passwordProtection": null}`.
>
> **Сеть облака:** среда Routine по умолчанию блокирует исходящие соединения.
> В настройках среды (Network access / Egress) надо разрешить `api.vercel.com` и
> `api.telegram.org` — иначе деплой и Telegram-пуш не пройдут. Notion идёт через
> коннектор и egress не требует.

### 6. Пуш в Telegram (одно сообщение за день)
```bash
node scripts/send-telegram.mjs days/<YYYY-MM-DD>.json "<immutable-url>"
```
Шлёт краткую сводку по всем встречам дня + одну вечную ссылку на страницу.

---

## Схема встречи (контракт для страницы и Telegram)

```json
{
  "time": "12:58",                  // HH:MM (опц.)
  "title": "Короткий стендап…",
  "participants": ["Миша", "Максим"],
  "summary": "Связный абзац: о чём договорились.",
  "decisions": ["Принятое решение 1", "…"],
  "tasks": [ { "owner": "Миша", "task": "Что сделать", "due": "2026-06-19" } ],
  "reminders": ["Напоминание"],
  "source": "notion",
  "sourceUrl": "https://app.notion.com/p/…"
}
```
Пустые секции — пустой массив `[]` (рендер их скрывает). `due` без срока — пропустить.

---

## Что параметризовано (нет хардкода)
- Notion-страница, имя сайта, проект/scope Vercel → `config.json`.
- Токены (Telegram, Vercel) → `.env` локально / переменные окружения в облаке.
