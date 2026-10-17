import {
  CITY_EXCHANGES,
  CITY_QUESTS,
  cityFor,
  questProgress,
  servicesUnlocked,
  shopStock,
} from '../../content/cities';
import { ITEMS } from '../../content/catalog';
import { GameState } from '../model';

export function sellPrice(itemId: string): number {
  const item = ITEMS[itemId];
  return item && item.pocket !== 'key' && item.price > 0 ? Math.floor(item.price / 2) : 0;
}

export function sellReason(state: GameState, itemId: string, quantity: number): string | null {
  if (!cityFor(state.player.map) || !servicesUnlocked(state))
    return '请到城镇完成捕捉入门后出售道具。';
  if (!sellPrice(itemId)) return '重要物品和无售价的道具不能出售。';
  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > 99 ||
    (state.inventory[itemId] ?? 0) < quantity
  )
    return '请检查出售数量和背包库存，每次可出售 1 至 99 个。';
  if (state.player.money + sellPrice(itemId) * quantity > 9999999)
    return '旅费将超过上限，请减少出售数量。';
  return null;
}

export function sellItem(state: GameState, itemId: string, quantity: number): void {
  const reason = sellReason(state, itemId, quantity);
  if (reason) {
    state.notice = reason;
    return;
  }
  const income = sellPrice(itemId) * quantity;
  state.inventory[itemId]! -= quantity;
  state.player.money += income;
  state.notice = `出售${ITEMS[itemId]!.name} ×${quantity}，获得 ${income} 旅费。`;
}

export function buyItem(state: GameState, itemId: string, quantity: number): void {
  const item = ITEMS[itemId];
  if (
    !item ||
    !shopStock(state).includes(itemId) ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > 99 ||
    (state.inventory[itemId] ?? 0) + quantity > 999 ||
    state.player.money < item.price * quantity
  ) {
    state.notice = '无法购买：请在城镇完成入门后选购，并检查旅费和背包容量。';
    return;
  }
  state.player.money -= item.price * quantity;
  state.inventory[itemId] = (state.inventory[itemId] ?? 0) + quantity;
  state.notice = `购买${item.name} ×${quantity}，花费 ${item.price * quantity} 旅费。`;
}
export function transactQuest(state: GameState, questId: string, action: 'accept' | 'claim'): void {
  const quest = CITY_QUESTS[questId];
  if (!quest || !servicesUnlocked(state) || cityFor(state.player.map)?.id !== quest.cityId) {
    state.notice = '请在委托所属城镇完成入门后办理。';
    return;
  }
  const ledger = (state.cityServices ??= { merit: 0, quests: {}, exchanges: {} });
  const status = ledger.quests[questId];
  if (action === 'accept') {
    if (quest.prerequisite && ledger.quests[quest.prerequisite] !== 'claimed') {
      state.notice = `请先交付「${CITY_QUESTS[quest.prerequisite]!.name}」。`;
      return;
    }
    if (!status) {
      ledger.quests[questId] = 'active';
      state.notice = `已接受「${quest.name}」，可在任务管理查看进度。`;
    } else state.notice = status === 'claimed' ? '这份委托的奖励已领取。' : '委托已经在进行中。';
    return;
  }
  if (status !== 'active' || !questProgress(state, quest).ready) {
    state.notice =
      status === 'claimed' ? '奖励已领取，不能重复领取。' : '请先接受委托并满足交付条件。';
    return;
  }
  const costs = quest.condition.kind === 'delivery' ? quest.condition.items : {};
  const reward = quest.reward;
  if (
    state.player.money + reward.money > 9999999 ||
    Object.entries(reward.items).some(
      ([id, n]) => (state.inventory[id] ?? 0) - (costs[id] ?? 0) + n > 999,
    )
  ) {
    state.notice = '奖励暂时放不下，请整理背包或旅费后再领取。交付物品已保留。';
    return;
  }
  for (const [id, n] of Object.entries(costs)) state.inventory[id] = (state.inventory[id] ?? 0) - n;
  for (const [id, n] of Object.entries(reward.items))
    state.inventory[id] = (state.inventory[id] ?? 0) + n;
  state.player.money += reward.money;
  ledger.merit += reward.merit;
  ledger.quests[questId] = 'claimed';
  state.notice = `完成「${quest.name}」！获得旅费 ${reward.money}、调查印记 ×${reward.merit}${Object.entries(
    reward.items,
  )
    .map(([id, n]) => `、${ITEMS[id]!.name} ×${n}`)
    .join('')}。`;
}
export function exchangeItem(state: GameState, offerId: string, quantity: number): void {
  const offer = CITY_EXCHANGES[offerId];
  const ledger = state.cityServices;
  if (
    !offer ||
    !ledger ||
    !servicesUnlocked(state) ||
    cityFor(state.player.map)?.id !== offer.cityId ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > 99 ||
    ledger.merit < offer.cost * quantity ||
    (state.inventory[offer.itemId] ?? 0) + offer.quantity * quantity > 999 ||
    (ledger.exchanges[offerId] ?? 0) + quantity > 999
  ) {
    state.notice = '无法兑换：请检查所在城镇、调查印记和背包容量。';
    return;
  }
  ledger.merit -= offer.cost * quantity;
  ledger.exchanges[offerId] = (ledger.exchanges[offerId] ?? 0) + quantity;
  state.inventory[offer.itemId] = (state.inventory[offer.itemId] ?? 0) + offer.quantity * quantity;
  state.notice = `兑换${ITEMS[offer.itemId]!.name} ×${offer.quantity * quantity}，消耗调查印记 ×${offer.cost * quantity}。`;
}
