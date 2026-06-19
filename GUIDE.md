# Call Summary — установка за 5 минут (без плагина)

Каждый вечер собирает сводку твоих созвонов из Notion, публикует страницу на Vercel
и присылает ссылку в Telegram. Работает по расписанию через Claude Routines — без
твоего сервера и без установки чего-либо на компьютер.

## Что понадобится
1. **Notion** с записями созвонов (Notion AI Meeting Notes). Коннектор Notion в Claude —
   у многих уже подключён.
2. **Telegram-бот:** @BotFather → `/newbot` → токен. chat_id: напиши боту, открой
   `https://api.telegram.org/bot<ТОКЕН>/getUpdates` → возьми `chat.id`.
3. **Vercel token:** vercel.com → Settings → Tokens → Create.

## Шаги

### 1. Создай Routine
Открой **https://claude.ai/code/routines** → **Create routine**.
- **Название:** `Сводка созвонов`
- **Расписание:** каждый день вечером (напр. 21:00).
- **Коннекторы:** включи **Notion**.

### 2. Вставь промпт
В поле инструкций вставь это (замени только ссылку на свою страницу Notion):

```
Собери мою ежедневную сводку созвонов строго по RUNBOOK.md из репозитория.

1. git clone https://github.com/skipaoff/call-summary /tmp/cs && cd /tmp/cs
2. Прочитай RUNBOOK.md. Моя страница записей в Notion: ВСТАВЬ_СВОЮ_ССЫЛКУ_NOTION
   Токены — в переменных окружения: $VERCEL_TOKEN, $TELEGRAM_BOT_TOKEN, $TELEGRAM_CHAT_ID.
3. Через коннектор Notion отбери встречи за сегодня (сверь date -u), для каждой
   возьми транскрипт (include_transcript=true), сделай саммари (схема в RUNBOOK) и
   собери days/<дата>.json.
4. Если встреч за сегодня нет — закончи, ничего не публикуй.
5. node scripts/build-day.mjs days/<дата>.json out/site
6. Задеплой out/site на Vercel под моим аккаунтом (vercel deploy --prod --yes
   --token "$VERCEL_TOKEN"; если просит --scope — определи мой team через
   `vercel teams ls` или API и повтори). Сними защиту деплоев Vercel через API
   (PATCH .../v9/projects/<проект> с ssoProtection:null, passwordProtection:null),
   чтобы ссылка открывалась без логина. Возьми deployment.url.
7. node scripts/send-telegram.mjs days/<дата>.json "<deployment.url>"

В конце выведи ссылку дня. Ошибки выводи понятно.
```

### 3. Вставь 3 секрета в среду рутины
На странице рутины открой настройки среды (иконка cloud → ⚙️) → **Environment
variables** → вставь:
```
TELEGRAM_BOT_TOKEN=твой_токен
TELEGRAM_CHAT_ID=твой_chat_id
VERCEL_TOKEN=твой_токен
```

### 4. Проверь
Нажми **Run now**. Через минуту в Telegram придёт ссылка на сводку за сегодня.
Если встреч сегодня не было — рутина просто ничего не пришлёт.

---

Готово. Дальше — каждый вечер автоматически. Каждый день получает свою постоянную
ссылку; история ссылок в Telegram и есть твой архив.
