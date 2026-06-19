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
- **Notion-страница записей:** `${CLAUDE_PLUGIN_OPTION_notion_page_url}`; если пусто —
  `source.notionPageUrl` из `config.json`.
- **Секреты:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `VERCEL_TOKEN` — из переменных
  окружения (в облачной Routine их задаёт юзер в среде; локально — userConfig/.env).
  Скрипты сами умеют брать их и из `CLAUDE_PLUGIN_OPTION_*`.
- **Рабочая папка:** создай временную (напр. текущую директорию запуска) под `days/`
  и `out/`.

## Шаги

1. **Узнай сегодняшнюю дату:** `date -u +%Y-%m-%d`.

2. **Достань встречи за сегодня (Notion-коннектор):**
   - `notion-fetch` по странице записей → список дочерних страниц-встреч.
   - Оставь те, у кого дата в заголовке = сегодня.
   - Для каждой: `notion-fetch` с `include_transcript=true` → возьми `<transcript>`
     (основной вход; Notion-овское `<summary>` — максимум сырьё).

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
