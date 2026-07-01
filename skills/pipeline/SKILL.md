---
name: pipeline
description: Собрать саммари сегодняшних созвонов из Notion, опубликовать страницу дня на Vercel и прислать сводку в Telegram. Запускать руками или из Routine по расписанию.
---

# Call Summary — пайплайн за день

Делает мини-сайт за сегодня (индекс звонков + подстраница на каждый), деплоит на
Vercel и шлёт одну сводку в Telegram. Своего бэкенда нет — это вся логика.

## Откуда брать параметры и секреты
- **Корень кода** (скрипты): `${CLAUDE_PLUGIN_ROOT}`. Если переменная пустая (запуск
  не из плагина) — используй корень репозитория.
- **Источник:** `config.json` → `source.type` = `notion` | `zoom` | `telegram` | `all` (что выбрал юзер).
- **Notion-страница записей** (если источник notion): `${CLAUDE_PLUGIN_OPTION_notion_page_url}`;
  если пусто — `source.notion.pageUrl` из `config.json`.
- **Секреты:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `VERCEL_TOKEN` — из переменных
  окружения (в облачной Routine их задаёт юзер в среде; локально — userConfig/.env).
  Скрипты сами умеют брать их и из `CLAUDE_PLUGIN_OPTION_*`.
- **Только для zoom через self-declared MCP** (Claude Code): `ZOOM_MCP_ACCESS_TOKEN`
  (Bearer). Если Zoom подключён через директорию коннекторов Claude — токен не нужен.
- **Рабочая папка:** создай временную (напр. текущую директорию запуска) под `days/`
  и `out/`.

## Шаги

1. **Узнай сегодняшнюю дату:** `date -u +%Y-%m-%d`.

2. **Достань встречи за сегодня — по `source.type`** (адаптер; всё остальное ниже
   работает с единым форматом `{ time, title, participants, transcript }`):

   **Если `notion` (Notion-коннектор):**
   - `notion-fetch` по странице записей → список дочерних страниц-встреч.
   - Оставь те, у кого дата в заголовке = сегодня.
   - Для каждой: `notion-fetch` с `include_transcript=true` → возьми `<transcript>`
     (основной вход; Notion-овское `<summary>` — максимум сырьё).

   **Если `zoom` (Zoom-коннектор `zoom-mcp`):**
   - `search_meetings` с `from`/`to` = сегодня (`date -u`) → список встреч за день
     (тема, хост, участники, флаги наличия транскрипта/записи). Нужен тариф Zoom Pro+
     с cloud recording + audio transcription, иначе транскрипта нет.
   - Для каждой встречи с записью: `get_recording_resource` (`meetingId`, в `types`
     запроси транскрипт) → возьми **транскрипт**. Если он в формате VTT — очисти от
     таймкодов/нумерации в чистый текст; если уже текст — используй как есть.
     (Можно также `recordings_list` для перебора облачных записей по дате.)
   - `title` = тема встречи, `time` = время начала, `participants` = участники из ответа.
   - Транскрипт ещё не готов (Zoom обрабатывает его отдельным этапом) — пропусти встречу
     на сегодня (заберётся следующим прогоном).
   - Саммари делаем **своё** из транскрипта (Zoom-овское AI-саммари — максимум сырьё).

   **Если `telegram` (эконом-режим — для тех, у кого нет Notion/Zoom):**
   Пользователь в течение дня пересылает боту-приёмнику транскрипты созвонов текстом,
   а вечером рутина их считывает. Бот-приёмник = тот же, что шлёт сводки
   (`TELEGRAM_BOT_TOKEN`), у него не должно быть вебхука.
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/telegram-inbox.mjs" <YYYY-MM-DD>` →
     JSON `{ date, messages:[{time,text}] }` (все сегодняшние сообщения от владельца).
   - Каждое сообщение = один звонок: `text` — транскрипт. Сделай саммари, `title` — из
     сути разговора (или «Созвон HH:MM»), `participants` — если видно из текста,
     `source:"telegram"`.
   - Гарантия: Telegram хранит непрочитанные апдейты до 24ч, поэтому боту не нужно
     работать весь день — вечерний прогон заберёт все сегодняшние сообщения. Условие:
     транскрипты пересланы до прогона; у бота нет вебхука.

   **Если `all`:** выполни ВСЕ настроенные ветки (notion/zoom/telegram) и объедини встречи
   в один `meetings[]`. **Дубли не склеиваем** — если созвон попал в несколько источников,
   показываем все версии (у каждой свой `source`). Отсортируй встречи по времени.

3. **Сделай саммари каждой встречи** и собери файл дня `days/<YYYY-MM-DD>.json`:
   ```json
   { "date": "YYYY-MM-DD", "meetings": [ {
       "time": "HH:MM", "title": "…", "participants": ["…"],
       "summary": "…", "decisions": ["…"],
       "tasks": [ { "owner": "…", "task": "…", "due": "YYYY-MM-DD" } ],
       "reminders": ["…"], "source": "notion", "sourceUrl": "https://app.notion.com/…"
   } ] }
   ```
   Тон деловой, кратко, по-русски. Пустые секции — `[]`.

4. **Нет встреч за сегодня → закончить.** Ничего не деплоить и не слать.

5. **Собери сайт дня:**
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/build-day.mjs" days/<YYYY-MM-DD>.json out/site
   ```

6. **Сними защиту деплоев Vercel (один раз, идемпотентно)** — иначе ссылка просит логин.
   Узнай teamId: `GET https://api.vercel.com/v2/user` / `GET .../v2/teams` или возьми из
   `config.json` (`site.vercelScope`). Затем:
   ```bash
   curl -s -X PATCH "https://api.vercel.com/v9/projects/<project>?teamId=<team>" \
     -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
     -d '{"ssoProtection": null, "passwordProtection": null}'
   ```

7. **Задеплой статику и возьми неизменяемый URL дня:**
   ```bash
   cd out/site
   npx vercel@latest link   --yes --project <project> --scope <scope> --token "$VERCEL_TOKEN"
   npx vercel@latest deploy --prod --yes --scope <scope> --token "$VERCEL_TOKEN"
   ```
   Из JSON-ответа возьми `deployment.url` — публичный URL индекса дня.

8. **Пришли сводку в Telegram:**
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/send-telegram.mjs" days/<YYYY-MM-DD>.json "<deployment.url>"
   ```

В конце выведи: URL дня и сколько встреч обработано. Ошибки не глотай — показывай понятно.

> Полный регламент и схема — в `RUNBOOK.md` рядом.
