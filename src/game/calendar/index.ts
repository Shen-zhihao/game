import type { CalendarState, GameState } from '../model';
import { isTownLocation } from '../../content/world';

export const DAY_NIGHT_HALF_SECONDS = 30 * 60;
export const CALENDAR_DAY_SECONDS = 24 * 60 * 60;
export const CALENDAR_RATE = CALENDAR_DAY_SECONDS / (DAY_NIGHT_HALF_SECONDS * 2);
export const MAX_CALENDAR_DAY = 3652059;
const DAWN = 6 * 60 * 60;
const DUSK = 18 * 60 * 60;
export type DayPeriod = 'day' | 'night';
export type RestTarget = 'morning' | 'night';

export function createCalendar(playTimeSeconds = 0): CalendarState {
  const seconds = Number.isFinite(playTimeSeconds) ? Math.max(0, Math.floor(playTimeSeconds)) : 0;
  const elapsed = Math.min(
    MAX_CALENDAR_DAY * CALENDAR_DAY_SECONDS - 1,
    DAWN + seconds * CALENDAR_RATE,
  );
  return {
    day: 1 + Math.floor(elapsed / CALENDAR_DAY_SECONDS),
    time: elapsed % CALENDAR_DAY_SECONDS,
  };
}
export const calendarFor = (game: GameState): CalendarState =>
  game.calendar ?? createCalendar(game.playTimeSeconds);
/** Gameplay always follows the saved clock, not the local lighting preference. */
export function dayPeriodFor(game: GameState): DayPeriod {
  const { time } = calendarFor(game);
  return time < DAWN || time >= DUSK ? 'night' : 'day';
}

function nextRestMoment(game: GameState, target: RestTarget): CalendarState {
  const calendar = calendarFor(game);
  const time = target === 'morning' ? DAWN : DUSK;
  return { day: calendar.day + (calendar.time >= time ? 1 : 0), time };
}

export function restBlockedReason(game: GameState, target?: RestTarget): string | null {
  if (
    game.battle ||
    game.dialogue ||
    game.activities?.active ||
    game.pending.length ||
    game.progress.flags.starterChoice
  )
    return '请先结束当前战斗、对话或活动，再安排休息。';
  if (game.challenge?.active || game.league?.active) return '挑战进行中不能休息，请先结束挑战。';
  if (!isTownLocation(game.player.map)) return '回到安全城镇后才能休息到清晨或夜晚。';
  if (!game.progress.flags.rival || !game.progress.flags.catchTutorial)
    return '完成伙伴练习与捕捉教学后，可以在城镇休息。';
  if (target && nextRestMoment(game, target).day > MAX_CALENDAR_DAY)
    return '日历已到尽头，无法休息到下一个时段。';
  return null;
}

/** Rest advances only the world calendar. It never heals, rewards, moves, or simulates ticks. */
export function applyRest(game: GameState, target: RestTarget): boolean {
  const reason = restBlockedReason(game, target);
  if (reason) {
    game.notice = reason;
    return false;
  }
  game.calendar = nextRestMoment(game, target);
  game.notice = `休息到${target === 'morning' ? '清晨 06:00' : '夜晚 18:00'}。伙伴状态、天气与游玩时长不变。`;
  return true;
}

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
  const night = dayPeriodFor(game) === 'night';
  const next =
    calendar.time < DAWN ? DAWN : calendar.time < DUSK ? DUSK : CALENDAR_DAY_SECONDS + DAWN;
  return {
    date: `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`,
    clock: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    night,
    remaining: Math.ceil((next - calendar.time) / CALENDAR_RATE),
  };
}
