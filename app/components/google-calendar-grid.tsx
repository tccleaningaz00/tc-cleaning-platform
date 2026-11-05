"use client";

import { useMemo, useState } from "react";
import styles from "./google-calendar-grid.module.css";

const TIME_ZONE = "America/Phoenix";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type CalendarEvent = {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  calendarName?: string;
};

function getEventDateKey(event: CalendarEvent) {
  if (event.start?.date) return event.start.date;
  if (!event.start?.dateTime) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(event.start.dateTime));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getCalendarColor(calendarName?: string) {
  const colors = ["#3478a8", "#337b65", "#8a5ea9", "#b05b47", "#6379a8", "#a06b27"];
  const hash = [...(calendarName || "TC Cleaning")].reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  );
  return colors[hash % colors.length];
}

function formatDateKey(dateKey: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(
    new Date(`${dateKey}T12:00:00Z`)
  );
}

function formatEventTime(event: CalendarEvent) {
  if (!event.start?.dateTime) return "All day";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(event.start.dateTime));
}

export default function GoogleCalendarGrid({
  events,
  initialMonth,
  today,
}: {
  events: CalendarEvent[];
  initialMonth: string;
  today: string;
}) {
  const [month, setMonth] = useState(() => new Date(`${initialMonth}-01T12:00:00Z`));
  const [selectedDate, setSelectedDate] = useState(today);
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const monthTitle = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(month);

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const dateKey = getEventDateKey(event);
      if (!dateKey) continue;
      grouped.set(dateKey, [...(grouped.get(dateKey) || []), event]);
    }
    return grouped;
  }, [events]);

  const dayCells = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(year, monthIndex, 1, 12)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 12)).getUTCDate();
    const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

    return Array.from({ length: cellCount }, (_, index) => {
      const date = new Date(Date.UTC(year, monthIndex, index - firstWeekday + 1, 12));
      const dateKey = date.toISOString().slice(0, 10);
      return {
        dateKey,
        day: date.getUTCDate(),
        inCurrentMonth: date.getUTCMonth() === monthIndex,
        events: eventsByDate.get(dateKey) || [],
      };
    });
  }, [eventsByDate, monthIndex, year]);

  const selectedEvents = eventsByDate.get(selectedDate) || [];
  const selectedDateLabel = formatDateKey(selectedDate, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  function changeMonth(offset: number) {
    const next = new Date(Date.UTC(year, monthIndex + offset, 1, 12));
    const nextYear = next.getUTCFullYear();
    const nextMonth = String(next.getUTCMonth() + 1).padStart(2, "0");
    setMonth(next);
    setSelectedDate(`${nextYear}-${nextMonth}-01`);
  }

  function selectToday() {
    setMonth(new Date(`${today.slice(0, 7)}-01T12:00:00Z`));
    setSelectedDate(today);
  }

  return (
    <div className={styles.calendar}>
      <div className={styles.toolbar}>
        <div>
          <h3 className={styles.monthTitle}>{monthTitle}</h3>
          <p className={styles.subtitle}>Appointments from all connected calendars</p>
        </div>
        <div className={styles.controls}>
          <button className={styles.todayButton} onClick={selectToday} type="button">Today</button>
          <button className={styles.navButton} onClick={() => changeMonth(-1)} type="button" aria-label="Previous month">‹</button>
          <button className={styles.navButton} onClick={() => changeMonth(1)} type="button" aria-label="Next month">›</button>
        </div>
      </div>

      <div className={styles.weekdays} aria-hidden="true">
        {WEEKDAYS.map((weekday) => <div key={weekday}>{weekday}</div>)}
      </div>

      <div className={styles.days}>
        {dayCells.map((cell) => {
          const visibleEvents = cell.events.slice(0, 2);
          const moreCount = cell.events.length - visibleEvents.length;
          const dayLabel = formatDateKey(cell.dateKey, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          });

          return (
            <button
              key={cell.dateKey}
              className={`${styles.day} ${cell.inCurrentMonth ? "" : styles.outsideMonth} ${cell.dateKey === today ? styles.today : ""} ${cell.dateKey === selectedDate ? styles.selected : ""}`}
              onClick={() => setSelectedDate(cell.dateKey)}
              type="button"
              aria-pressed={cell.dateKey === selectedDate}
              aria-label={`${dayLabel}, ${cell.events.length} ${cell.events.length === 1 ? "appointment" : "appointments"}`}
            >
              <span className={styles.dayNumber}>{cell.day}</span>
              <span className={styles.chips}>
                {visibleEvents.map((event) => (
                  <span
                    key={`${event.calendarName || "calendar"}:${event.id}`}
                    className={styles.chip}
                    style={{ backgroundColor: getCalendarColor(event.calendarName) }}
                    title={`${event.summary || "Untitled appointment"}${event.calendarName ? ` · ${event.calendarName}` : ""}`}
                  >
                    {event.summary || "Untitled appointment"}
                  </span>
                ))}
                {moreCount > 0 && <span className={styles.more}>+{moreCount} more</span>}
              </span>
            </button>
          );
        })}
      </div>

      <section className={styles.agenda} aria-live="polite">
        <h4 className={styles.agendaTitle}>{selectedDateLabel}</h4>
        {selectedEvents.length ? (
          <ul className={styles.agendaList}>
            {selectedEvents.map((event) => (
              <li className={styles.agendaItem} key={`${event.calendarName || "calendar"}:${event.id}`}>
                <span className={styles.agendaTime}>{formatEventTime(event)}</span>
                <div>
                  <strong>{event.summary || "Untitled appointment"}</strong>
                  {event.location && <p>{event.location}</p>}
                  {event.calendarName && <span className={styles.calendarName}>{event.calendarName}</span>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyDay}>No appointments on this date.</p>
        )}
      </section>
    </div>
  );
}
