import {
  FIELD_ACTIVITIES,
  activityCraftFlag,
  type ActivityDefinition,
} from '../../content/fieldActivities';
import { HELD_ITEMS } from '../../content/battleTraits';
import { MAPS } from '../../content/world';
import { npcInReach } from '../exploration';
import type { GameState } from '../model';
import { awardProductionMaterials } from '../production';
import type { ActivityAction, ActivityRun } from './types';

const DIRS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;
export const PIPE_ROUTE = [0, 1, 2, 5, 4, 3, 6, 7, 8];
export function pipePorts(index: number, rotation: number) {
  const i = PIPE_ROUTE.indexOf(index);
  const at = (cell: number) => [cell % 3, Math.floor(cell / 3)];
  const here = at(index),
    previous = i === 0 ? [-1, 0] : at(PIPE_ROUTE[i - 1]!),
    next = i === 8 ? [3, 2] : at(PIPE_ROUTE[i + 1]!);
  return [previous, next].map(
    (p) =>
      (DIRS.findIndex(([x, y]) => x === p[0]! - here[0]! && y === p[1]! - here[1]!) + rotation) % 4,
  );
}
export function connectedPipes(board: number[]) {
  if (!pipePorts(0, board[0]!).includes(3)) return [];
  const seen = [0];
  for (let i = 0; i < seen.length; i++) {
    const cell = seen[i]!;
    for (const d of pipePorts(cell, board[cell]!)) {
      const [dx, dy] = DIRS[d]!,
        x = (cell % 3) + dx,
        y = Math.floor(cell / 3) + dy;
      if (x < 0 || x >= 3 || y < 0 || y >= 3) continue;
      const next = y * 3 + x;
      if (!seen.includes(next) && pipePorts(next, board[next]!).includes((d + 2) % 4))
        seen.push(next);
    }
  }
  return seen;
}
export const MIRROR_POSITIONS = [
  [2, 3],
  [2, 1],
  [0, 1],
] as const;
export function mirrorTrace(board: number[]) {
  const points: [number, number][] = [[-0.5, 3]],
    seen = new Set<string>();
  let x = -1,
    y = 3,
    dx = 1,
    dy = 0;
  for (let i = 0; i < 50; i++) {
    x += dx;
    y += dy;
    if (x < 0 || y < 0 || x >= 5 || y >= 5) {
      points.push([Math.max(-0.5, Math.min(4.5, x)), Math.max(-0.5, Math.min(4.5, y))]);
      return { points, solved: x === 0 && y === 5 };
    }
    const key = `${x},${y},${dx},${dy}`;
    if (seen.has(key)) break;
    seen.add(key);
    const mirror = MIRROR_POSITIONS.findIndex(([mx, my]) => mx === x && my === y);
    if (mirror >= 0) {
      points.push([x, y]);
      [dx, dy] = board[mirror] === 0 ? [-dy, -dx] : [dy, dx];
    }
  }
  return { points, solved: false };
}
export const miningTargets = [6, 7, 12];
export const forgeTargets = [3, 5, 4];
export const balanceWeights = (d: ActivityDefinition) =>
  d.variant % 2 ? [2, 3, 4, 5] : [1, 2, 3, 4];
export const balanceTarget = (d: ActivityDefinition) => (d.variant % 2 ? 7 : 5);
export function pushLayout(d: ActivityDefinition) {
  const reflect = (n: number) => (d.variant % 2 ? Math.floor(n / 5) * 5 + 4 - (n % 5) : n);
  return {
    walls: Array.from({ length: 25 }, (_, i) => i).filter(
      (i) => i % 5 === 0 || i % 5 === 4 || i < 5 || i > 19 || i === reflect(13),
    ),
    player: reflect(6),
    stone: reflect(12),
    goal: reflect(8),
  };
}
export function createActivity(d: ActivityDefinition): ActivityRun {
  const run: ActivityRun = {
    id: d.id,
    board: [],
    cursor: -1,
    value: 0,
    aux: 0,
    stage: 0,
    moves: 0,
    status: 'playing',
    feedback: d.instructions,
  };
  switch (d.kind) {
    case 'garden':
      run.board = [0, 0, 0];
      break;
    case 'pipes':
      run.board = Array.from({ length: 9 }, (_, i) => ((i + d.variant) % 3) + 1);
      break;
    case 'excavate':
      run.board = Array(25).fill(2);
      run.value = 18;
      break;
    case 'fish':
      run.board = [0];
      run.aux = 2;
      break;
    case 'bells':
      run.board = [3, 1, 4, 2];
      break;
    case 'forge':
      run.value = 1;
      break;
    case 'mirrors':
      run.board = [1, 0, 1];
      break;
    case 'balance':
      run.board = [0, 0, 0, 0];
      break;
    case 'push': {
      const l = pushLayout(d);
      run.cursor = l.player;
      run.aux = l.stone;
      break;
    }
    case 'slide': {
      run.board = [1, 2, 3, 4, 5, 6, 7, 8, 0];
      let empty = 8,
        previous = -1;
      for (let i = 0; i < 34; i++) {
        const neighbours = DIRS.map(([dx, dy]) => [(empty % 3) + dx, Math.floor(empty / 3) + dy])
          .filter(([x, y]) => x! >= 0 && x! < 3 && y! >= 0 && y! < 3)
          .map(([x, y]) => y! * 3 + x!)
          .filter((n) => n !== previous);
        const next = neighbours[(i * 7 + d.variant * 3) % neighbours.length]!;
        [run.board[empty], run.board[next]] = [run.board[next]!, 0];
        previous = empty;
        empty = next;
      }
      break;
    }
  }
  return run;
}
export function activitySolved(d: ActivityDefinition, run: ActivityRun) {
  switch (d.kind) {
    case 'garden':
      return run.board.every((n) => n === 2) && run.aux === 1 && run.stage === 1;
    case 'pipes':
      return connectedPipes(run.board).length === 9 && pipePorts(8, run.board[8]!).includes(1);
    case 'excavate':
      return miningTargets.every((i) => run.board[i] === 0);
    case 'fish':
      return run.stage === 3 && run.value >= 4 && run.aux > 0 && run.aux < 7;
    case 'bells':
      return run.board.every((n, i) => n === i + 1);
    case 'forge':
      return run.stage === 3;
    case 'mirrors':
      return mirrorTrace(run.board).solved;
    case 'balance':
      return [1, 2].every(
        (side) =>
          run.board.reduce((sum, n, i) => sum + (n === side ? balanceWeights(d)[i]! : 0), 0) ===
          balanceTarget(d),
      );
    case 'slide':
      return run.board.every((n, i) => n === (i + 1) % 9);
    case 'push':
      return run.aux === pushLayout(d).goal;
  }
}
export function openActivity(game: GameState, definition: ActivityDefinition) {
  const ledger = (game.activities ??= { active: null, records: {} });
  const draft = ledger.drafts?.[definition.id];
  ledger.active = draft ?? createActivity(definition);
  if (ledger.drafts) delete ledger.drafts[definition.id];
  if (
    !draft &&
    ledger.records[definition.id]?.completions &&
    !ledger.records[definition.id]!.rewardClaimed &&
    definition.reward
  ) {
    ledger.active.status = 'won';
    ledger.active.feedback = '首次完成奖励仍在工作台，请领取。';
  }
  if (definition.town) {
    const services = (game.cityServices ??= { merit: 0, quests: {}, exchanges: {} });
    services.quests[`${definition.id}_quest`] ??= 'active';
    if (definition.town !== 'harbor')
      services.quests[`${definition.town}_district_craft`] ??= 'active';
  }
  game.notice = `开始${definition.title}。`;
}
export function activityAtNpc(game: GameState, npcId: string): ActivityDefinition | undefined {
  return Object.values(FIELD_ACTIVITIES).find(
    (d) => d.npcId === npcId && (!game.progress.flags[d.goalFlag] || !!d.town),
  );
}
export function applyActivity(
  game: GameState,
  action: ActivityAction,
): { fishSpot: number } | undefined {
  const ledger = game.activities,
    run = ledger?.active,
    d = run && FIELD_ACTIVITIES[run.id];
  if (!run || !d || !ledger) return;
  if (action.kind === 'close') {
    (ledger.drafts ??= {})[run.id] = run;
    ledger.active = null;
    game.notice = '已离开工作台，本局操作、完成记录和未领取的首次奖励保留。';
    return;
  }
  if (action.kind === 'claim') {
    const record = ledger.records[d.id],
      reward = d.reward;
    if (run.status !== 'won' || !record || record.rewardClaimed || !reward) return;
    if ((game.inventory[reward.item] ?? 0) >= 999 || game.player.money + reward.money > 9999999) {
      run.feedback = '背包或旅费已满，奖励会保留，腾出位置后回来领取。';
      return;
    }
    game.inventory[reward.item] = (game.inventory[reward.item] ?? 0) + 1;
    game.player.money += reward.money;
    record.rewardClaimed = true;
    run.feedback = `首次奖励：${HELD_ITEMS[reward.item].name}×1、旅费${reward.money}。重玩可刷新最佳步数。`;
    game.notice = run.feedback;
    return;
  }
  if (action.kind === 'reset') {
    ledger.active = createActivity(d);
    return;
  }
  if (
    action.kind === 'step' &&
    action.value === 'encounter' &&
    d.kind === 'fish' &&
    run.status === 'won'
  ) {
    ledger.active = null;
    return { fishSpot: run.board[0]! };
  }
  if (run.status !== 'playing' || run.moves >= 10000) return;
  let changed = false;
  const cell = action.kind === 'cell' && Number.isInteger(action.index) ? action.index : -1;
  const step = action.kind === 'step' ? action.value : '';
  if (
    action.kind === 'tool' &&
    Number.isInteger(action.index) &&
    [0, 1].includes(action.index) &&
    d.kind === 'excavate'
  ) {
    run.cursor = action.index;
    run.feedback = action.index
      ? '已选择小锤：十字范围，消耗3点支撑。'
      : '已选择细凿：单格，消耗1点支撑。';
    return;
  }
  switch (d.kind) {
    case 'garden':
      if (cell >= 0 && cell < 3 && run.board[cell]! < 3) {
        run.board[cell]!++;
        changed = true;
      }
      if (step === 'drain') {
        const i = run.board.findIndex((n) => n === 3);
        if (i >= 0) {
          run.board[i] = 2;
          changed = true;
        }
      }
      if (step === 'shade') {
        run.aux = (run.aux + 1) % 3;
        changed = true;
      }
      if (step === 'grow') {
        run.stage = 1;
        changed = true;
        run.feedback = '检查叶片：湿润而不积水，半阴更适合幼苗。';
      }
      break;
    case 'pipes':
      if (cell >= 0 && cell < 9) {
        run.board[cell] = (run.board[cell]! + 1) % 4;
        changed = true;
      }
      break;
    case 'excavate':
      if (cell >= 0 && cell < 25 && run.board[cell]! > 0) {
        const cost = run.cursor === 1 ? 3 : 1;
        if (run.value < cost) {
          run.feedback = '支撑不足，请换细凿或重置本局。';
          return;
        }
        const targets =
          run.cursor === 1
            ? [
                cell,
                ...DIRS.map(([dx, dy]) => [(cell % 5) + dx, Math.floor(cell / 5) + dy])
                  .filter(([x, y]) => x! >= 0 && x! < 5 && y! >= 0 && y! < 5)
                  .map(([x, y]) => y! * 5 + x!),
              ]
            : [cell];
        targets.forEach((i) => {
          run.board[i] = Math.max(0, run.board[i]! - 1);
        });
        run.value -= cost;
        changed = true;
        if (run.value === 0 && !activitySolved(d, run)) {
          run.status = 'lost';
          run.feedback = '岩壁支撑耗尽，工作人员已回收工具。重置即可安全重试。';
        }
      }
      break;
    case 'fish':
      if (run.stage === 0 && cell >= 0 && cell < 2) {
        run.board[0] = cell;
        changed = true;
      }
      if (step === 'cast' && run.stage === 0) {
        run.stage = 1;
        run.value = 0;
        changed = true;
        run.feedback = '浮漂入水了，轻轻等待。';
      } else if (step === 'wait' && run.stage === 1) {
        run.value++;
        changed = true;
        run.feedback = run.value >= 2 ? '浮漂下沉了！现在提竿！' : '水面只有细小波纹，再等等。';
        if (run.value > 3) {
          run.status = 'lost';
          run.feedback = '错过了咬钩，鱼游走了。重置可再次投竿。';
        }
      } else if (step === 'hook' && run.stage === 1) {
        changed = true;
        if (run.value < 2) {
          run.status = 'lost';
          run.feedback = '提竿太早，鱼还没有咬钩。';
        } else {
          run.stage = 2;
          run.value = 0;
          run.aux = 2;
          run.feedback = '鱼已咬钩！收线推进，放线降低张力。';
        }
      } else if (run.stage === 2 && ['reel', 'slack'].includes(step)) {
        changed = true;
        if (step === 'reel') {
          run.value++;
          run.aux += 2;
        } else run.aux -= 2;
        if (run.aux <= 0 || run.aux >= 7) {
          run.status = 'lost';
          run.feedback =
            run.aux <= 0 ? '线太松，鱼脱钩了。' : '张力过大，工作人员剪断了钓线，鱼安全游走了。';
        } else if (run.value >= 4) {
          run.stage = 3;
          run.feedback = '鱼靠岸了！领取首次奖励后，可选择引出精灵进入遭遇战。';
        }
      }
      break;
    case 'bells':
      if (cell >= 0 && cell < 4) {
        if (run.cursor < 0) {
          run.cursor = cell;
          run.feedback = `选中${run.board[cell]}号铃片，再选另一枚交换。`;
        } else {
          [run.board[cell], run.board[run.cursor]] = [run.board[run.cursor]!, run.board[cell]!];
          run.cursor = -1;
        }
        changed = true;
      }
      break;
    case 'forge':
      if (step === 'heat') {
        run.value += 2;
        changed = true;
      }
      if (step === 'cool' && run.value > 0) {
        run.value--;
        changed = true;
      }
      if (step === 'strike') {
        changed = true;
        if (run.value === forgeTargets[run.stage]) {
          run.stage++;
          run.value = Math.max(0, run.value - 2);
          run.feedback = '这次锻打很稳，按照下一处温度标记继续。';
        } else {
          run.aux++;
          run.feedback = `温度不合适，工件出现细纹（${run.aux}/3）。`;
        }
      }
      if (run.value > 7 || run.aux >= 3) {
        run.status = 'lost';
        run.feedback = '工件需要重新制作。重置不消耗背包材料。';
      }
      break;
    case 'mirrors':
      if (cell >= 0 && cell < 3) {
        run.board[cell] = 1 - run.board[cell]!;
        changed = true;
      }
      break;
    case 'balance':
      if (cell >= 0 && cell < 4) {
        run.board[cell] = (run.board[cell]! + 1) % 3;
        changed = true;
      }
      break;
    case 'slide':
      if (cell >= 0 && cell < 9) {
        const empty = run.board.indexOf(0);
        if (
          Math.abs((empty % 3) - (cell % 3)) +
            Math.abs(Math.floor(empty / 3) - Math.floor(cell / 3)) ===
          1
        ) {
          [run.board[empty], run.board[cell]] = [run.board[cell]!, 0];
          changed = true;
        }
      }
      break;
    case 'push': {
      const direction = ['up', 'right', 'down', 'left'].indexOf(step);
      if (direction < 0) break;
      const [dx, dy] = DIRS[direction]!,
        next = run.cursor + dx + dy * 5,
        l = pushLayout(d);
      if (l.walls.includes(next)) break;
      if (next === run.aux) {
        const beyond = next + dx + dy * 5;
        if (l.walls.includes(beyond)) break;
        run.aux = beyond;
      }
      run.cursor = next;
      changed = true;
      break;
    }
  }
  if (!changed) return;
  run.moves++;
  if (run.status === 'playing' && activitySolved(d, run)) {
    run.status = 'won';
    const record = ledger.records[d.id];
    ledger.records[d.id] = {
      completions: Math.min(999999, (record?.completions ?? 0) + 1),
      bestMoves: Math.min(record?.bestMoves ?? 10000, run.moves),
      rewardClaimed: record?.rewardClaimed ?? !d.reward,
    };
    game.progress.flags[d.goalFlag] = true;
    if (d.town && d.town !== 'harbor') game.progress.flags[activityCraftFlag(d.town)] = true;
    run.feedback = d.reward
      ? `完成了${d.title}！首次奖励可领取，重玩记录最佳步数。`
      : '机关接通了，地图上的通道已经打开。';
    const materials = awardProductionMaterials(game, d.id);
    if (materials) run.feedback += ` ${materials}`;
    game.notice = run.feedback;
  }
}

/** Save validation checks the live source and board, not a client-supplied completion flag. */
export function validActivityLocation(game: GameState, run: ActivityRun) {
  const d = FIELD_ACTIVITIES[run.id];
  return (
    !!d &&
    !!game.progress.flags.catchTutorial &&
    !!game.progress.flags.rival &&
    (!d.prerequisite || !!game.progress.flags[d.prerequisite]) &&
    MAPS[game.player.map].npcs.some((npc) => npc.id === d.npcId && npcInReach(game, npc))
  );
}

export function validActivityBoard(run: ActivityRun) {
  const d = FIELD_ACTIVITIES[run.id];
  if (!d) return false;
  switch (d.kind) {
    case 'garden':
      return (
        run.board.length === 3 && run.board.every((n) => n <= 3) && run.aux <= 2 && run.stage <= 1
      );
    case 'pipes':
      return run.board.length === 9 && run.board.every((n) => n <= 3);
    case 'excavate':
      return (
        run.board.length === 25 &&
        run.board.every((n) => n <= 2) &&
        run.value <= 18 &&
        run.cursor >= -1 &&
        run.cursor <= 1
      );
    case 'fish':
      return run.board.length === 1 && run.board[0]! <= 1 && run.value <= 4 && run.aux <= 8;
    case 'bells':
      return (
        run.board.length === 4 &&
        new Set(run.board).size === 4 &&
        run.board.every((n) => n >= 1 && n <= 4) &&
        run.cursor <= 3
      );
    case 'forge':
      return run.board.length === 0 && run.value <= 9 && run.aux <= 3;
    case 'mirrors':
      return run.board.length === 3 && run.board.every((n) => n <= 1);
    case 'balance':
      return run.board.length === 4 && run.board.every((n) => n <= 2);
    case 'slide':
      return run.board.length === 9 && new Set(run.board).size === 9 && run.board.includes(0);
    case 'push': {
      const l = pushLayout(d);
      return (
        run.board.length === 0 &&
        run.cursor >= 0 &&
        !l.walls.includes(run.cursor) &&
        !l.walls.includes(run.aux) &&
        run.cursor !== run.aux
      );
    }
  }
}
