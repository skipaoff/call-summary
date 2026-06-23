// Единая выдача доступа — используется и при оплате, и при вводе пароля.
import { send } from "./tg.js";

const REPO = process.env.REPO_URL || "https://github.com/skipaoff/call-summary";
const GUIDE = process.env.GUIDE_URL || REPO + "/blob/main/GUIDE.md";

export function deliverAccess(chatId, intro) {
  const text =
    `${intro}\n\n` +
    "Вот твой доступ к Call Summary:\n" +
    `📦 Репозиторий: ${REPO}\n` +
    `📖 Установка за 5 минут: ${GUIDE}\n\n` +
    "Подключаешь Notion и/или Zoom, создаёшь рутину по гайду — и каждый вечер " +
    "сводка приходит сама. Вопросы — пиши прямо сюда.";
  return send(chatId, text, { disable_web_page_preview: false });
}
