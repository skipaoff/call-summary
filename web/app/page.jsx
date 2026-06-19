import Link from "next/link";
import { getAllMeetings } from "../lib/meetings";

const MONTHS = [
  "янв", "фев", "мар", "апр", "мая", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

function formatDay(date) {
  const [year, month, day] = date.split("-");
  return { dayNum: `${Number(day)} ${MONTHS[Number(month) - 1]}`, year };
}

export default function HomePage() {
  const meetings = getAllMeetings();

  return (
    <main className="wrap">
      <header className="site-header">
        <div>
          <span className="mono-label">Call Summary / созвоны</span>
          <h1>Записи встреч</h1>
        </div>
        <span className="mono-label count">{meetings.length} встреч</span>
      </header>

      {meetings.length === 0 ? (
        <div className="empty">Пока нет ни одной встречи.</div>
      ) : (
        <div className="meeting-list">
          {meetings.map((m) => {
            const { dayNum, year } = formatDay(m.date);
            return (
              <Link key={m.id} href={`/meetings/${m.id}/`} className="meeting-row">
                <div className="when">
                  <span className="day">{dayNum}</span>
                  {m.time ? `${m.time}` : year}
                </div>
                <div>
                  <p className="title">{m.title}</p>
                  <span className="meta">
                    <b>{m.tasks?.length ?? 0}</b> задач · {m.decisions?.length ?? 0} решений
                    {m.participants?.length ? ` · ${m.participants.join(", ")}` : ""}
                  </span>
                </div>
                <span className="chevron">›</span>
              </Link>
            );
          })}
        </div>
      )}

      <footer>
        <span>Саммари — Claude из транскрипта Notion</span>
        <span>{meetings.length} встреч в архиве</span>
      </footer>
    </main>
  );
}
