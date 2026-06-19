import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Корень проекта = на уровень выше scripts/. Без хардкода абсолютных путей.
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Источник секретов:
//  - локально — файл .env (мини-парсер, чтобы не тащить зависимость);
//  - в облаке (Routine) — переменные окружения среды, файла .env там нет.
// process.env имеет приоритет над файлом.
export function loadEnv() {
  const env = {};
  const file = path.join(ROOT, ".env");
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  }
  const merged = { ...env, ...process.env };

  // Плагин Claude Code экспортит userConfig как CLAUDE_PLUGIN_OPTION_<key>.
  // Подхватываем их под привычные имена, если прямые не заданы.
  const fromPlugin = {
    TELEGRAM_BOT_TOKEN: "CLAUDE_PLUGIN_OPTION_telegram_bot_token",
    TELEGRAM_CHAT_ID: "CLAUDE_PLUGIN_OPTION_telegram_chat_id",
    VERCEL_TOKEN: "CLAUDE_PLUGIN_OPTION_vercel_token",
  };
  for (const [target, source] of Object.entries(fromPlugin)) {
    if (!merged[target] && process.env[source]) merged[target] = process.env[source];
  }
  return merged;
}

export function loadConfig() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "config.json"), "utf8"));
}
