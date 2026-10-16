import type { CalendarState, GameState } from '../model';

export const DAY_NIGHT_HALF_SECONDS = 30 * 60;
export const CALENDAR_DAY_SECONDS = 24 * 60 * 60;
export const CALENDAR_RATE = CALENDAR_DAY_SECONDS / (DAY_NIGHT_HALF_SECONDS * 2);
export const MAX_CALENDAR_DAY = 3652059;
const DAWN = 6 * 60 * 60;
const DUSK = 18 * 60 * 60;

export function createCalendar(playTimeSeconds = 0): CalendarState {
  const elapsed = DAWN + Math.max(0, Math.floor(playTimeSeconds)) * CALENDAR_RATE;
  return {
    day: Math.min(MAX_CALENDAR_DAY, 1 + Math.floor(elapsed / CALENDAR_DAY_SECONDS)),
    time: elapsed % CALENDAR_DAY_SECONDS,
  };
}
export const calendarFor = (game: GameState): CalendarState =>
  game.calendar ?? createCalendar(game.playTimeSeconds);

export function advanceCalendar(game: GameState): void {
  const calendar = (game.calendar ??= createCalendar(game.playTimeSeconds));
  const time = calendar.time + CALENDAR_RATE;
  if (calendar.day === MAX_CALENDAR_DAY && time >= CALENDAR_DAY_SECONDS) {
    calendar.time = CALENDAR_DAY_SECONDS - 1;
    return;
  }
  calendar.day += Math.floor(time / CALENDAR_DAY_SECONDS);
  calendar.time = time % CALENDAR_DAY_SECONDS;
}

export function calendarDetails(game: GameState) {
  const calendar = calendarFor(game);
  const date = new Date(0);
  date.setUTCFullYear(1, 0, calendar.day);
  const hour = Math.floor(calendar.time / 3600);
  const minute = Math.floor((calendar.time % 3600) / 60);
  const night = calendar.time < DAWN || calendar.time >= DUSK;
  const next =
    calendar.time < DAWN ? DAWN : calendar.time < DUSK ? DUSK : CALENDAR_DAY_SECONDS + DAWN;
  return {
    date: `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`,
    clock: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    night,
    remaining: Math.ceil((next - calendar.time) / CALENDAR_RATE),
  };
}
