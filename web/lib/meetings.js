import fs from "node:fs";
import path from "node:path";

// Единственный источник встреч для сайта: JSON-файлы, которые пишет пайплайн.
// Путь — одной константой, чтобы не было разбросанного хардкода.
const MEETINGS_DIR = path.join(process.cwd(), "content", "meetings");

// Ключ сортировки «новые сверху»: дата + время одной строкой.
function sortKey(meeting) {
  return `${meeting.date ?? ""} ${meeting.time ?? ""}`;
}

export function getAllMeetings() {
  if (!fs.existsSync(MEETINGS_DIR)) return [];

  return fs
    .readdirSync(MEETINGS_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(fs.readFileSync(path.join(MEETINGS_DIR, file), "utf8")))
    .sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
}

export function getMeeting(id) {
  return getAllMeetings().find((meeting) => meeting.id === id) ?? null;
}

// Группировка задач по ответственному — для колонок «кто / что / дедлайн».
export function tasksByOwner(tasks = []) {
  const groups = new Map();
  for (const task of tasks) {
    const owner = task.owner?.trim() || "Без ответственного";
    if (!groups.has(owner)) groups.set(owner, []);
    groups.get(owner).push(task);
  }
  return [...groups.entries()].map(([owner, items]) => ({ owner, items }));
}
