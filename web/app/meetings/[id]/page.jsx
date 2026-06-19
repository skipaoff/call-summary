import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllMeetings, getMeeting, tasksByOwner } from "../../../lib/meetings";

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatDate(date, time) {
  const [year, month, day] = date.split("-");
  const human = `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
  return time ? `${human} · ${time}` : human;
}

export function generateStaticParams() {
  return getAllMeetings().map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const meeting = getMeeting(id);
  return { title: meeting ? `${meeting.title} — Call Summary` : "Встреча" };
}

export default async function MeetingPage({ params }) {
  const { id } = await params;
  const meeting = getMeeting(id);
  if (!meeting) notFound();

  const owners = tasksByOwner(meeting.tasks);

  return (
    <main className="wrap">
      <Link href="/" className="back">‹ все встречи</Link>

      <div className="meeting-head">
        <span className="mono-label">{formatDate(meeting.date, meeting.time)}</span>
        <h1>{meeting.title}</h1>
        {meeting.participants?.length > 0 && (
          <div className="people">
            {meeting.participants.map((p) => (
              <span key={p} className="chip">{p}</span>
            ))}
          </div>
        )}
      </div>

      {meeting.summary && (
        <section className="section">
          <div className="section-head">
            <span className="section-num">01</span>
            <span className="section-title">Саммари</span>
          </div>
          <p className="lede">{meeting.summary}</p>
        </section>
      )}

      {meeting.decisions?.length > 0 && (
        <section className="section">
          <div className="section-head">
            <span className="section-num">02</span>
            <span className="section-title">Решения</span>
          </div>
          <ul className="numbered">
            {meeting.decisions.map((d, i) => (
              <li key={i}>
                <span className="n">{String(i + 1).padStart(2, "0")}</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {owners.length > 0 && (
        <section className="section">
          <div className="section-head">
            <span className="section-num">03</span>
            <span className="section-title">Задачи · кто / что / дедлайн</span>
          </div>
          <div className="owners">
            {owners.map(({ owner, items }) => (
              <div key={owner} className="owner-col">
                <div className="owner-name">
                  {owner}
                  <span className="badge">{items.length}</span>
                </div>
                {items.map((task, i) => (
                  <div key={i} className="task">
                    <p className="what">{task.task}</p>
                    <span className={`due${task.due ? "" : " none"}`}>
                      {task.due ? formatDate(task.due) : "без срока"}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {meeting.reminders?.length > 0 && (
        <section className="section">
          <div className="section-head">
            <span className="section-num">04</span>
            <span className="section-title">Напоминания</span>
          </div>
          <ul className="reminders">
            {meeting.reminders.map((r, i) => (
              <li key={i}>
                <span className="mark">!</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer>
        <span>Источник: {meeting.source ?? "—"}</span>
        {meeting.sourceUrl && <a href={meeting.sourceUrl}>открыть оригинал ›</a>}
      </footer>
    </main>
  );
}
