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
  return { ...env, ...process.env };
}

export function loadConfig() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "config.json"), "utf8"));
}
