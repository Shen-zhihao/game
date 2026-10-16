import { reduceGame } from '../../game/engine';
import { Command, GameState } from '../../game/model';
import { SaveRepository } from '../repository';
import { Snapshot } from '../snapshot';

export interface SessionState {
  game: GameState | null;
  slot: number;
  saveStatus: string;
}
/** One queue orders saves, slot switches, forks and unloads. Late autosaves cannot cross slots. */
export class SaveSession {
  state: SessionState = { game: null, slot: 1, saveStatus: '' };
  private snapshot: Snapshot | null = null;
  private generation = 0;
  private dirty = 0;
  private saved = 0;
  private branchId: string | undefined;
  private queue: Promise<unknown> = Promise.resolve();
  private transitions = 0;
  constructor(
    private readonly repository: SaveRepository,
    private readonly changed: (state: SessionState) => void = () => undefined,
  ) {}
  private publish(update: Partial<SessionState>) {
    this.state = { ...this.state, ...update };
    this.changed(this.state);
  }
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const result = this.queue.then(work);
    this.queue = result.catch(() => undefined);
    return result;
  }
  private async persist(game: GameState, dirty: number): Promise<Snapshot | null> {
    if (dirty <= this.saved) return this.snapshot;
    this.publish({ saveStatus: '正在保存…' });
    try {
      const snapshot = await this.repository.save(
        this.state.slot,
        game,
        this.snapshot?.revisionId ?? null,
        this.branchId,
      );
      this.snapshot = snapshot;
      this.saved = dirty;
      this.publish({ saveStatus: dirty === this.dirty ? '已保存' : '有新进度' });
      return snapshot;
    } catch (error) {
      this.publish({
        saveStatus: `保存失败：${error instanceof Error ? error.message : '请重试'}`,
      });
      throw error;
    }
  }
  save(): Promise<Snapshot | null> {
    if (this.transitions) return this.queue.then(() => this.snapshot);
    const { game } = this.state;
    if (!game) return Promise.resolve(null);
    const dirty = this.dirty;
    const generation = this.generation;
    return this.enqueue(() =>
      generation === this.generation ? this.persist(game, dirty) : Promise.resolve(null),
    );
  }
  private transition<T>(work: () => Promise<T>): Promise<T> {
    this.transitions++;
    return this.enqueue(work).finally(() => {
      this.transitions--;
    });
  }
  private adopt(slot: number, snapshot: Snapshot, game: GameState, saveStatus: string) {
    this.generation++;
    this.snapshot = snapshot;
    this.branchId = this.repository.newBranch();
    this.dirty = this.saved = 0;
    this.publish({ slot, game, saveStatus });
  }
  load(slot: number): Promise<void> {
    return this.transition(async () => {
      const loaded = await this.repository.load(slot);
      if (!loaded) throw new Error('这个槽位还没有存档');
      // Switching players preserves the outgoing game. Reloading this slot intentionally
      // restores the saved version without writing unsaved movement over it first.
      if (slot !== this.state.slot && this.state.game)
        await this.persist(this.state.game, this.dirty);
      this.adopt(slot, loaded.snapshot, loaded.game, '已读取');
    });
  }
  saveAs(): Promise<number> {
    return this.transition(async () => {
      if (!this.state.game) throw new Error('请先开始或读取一段冒险');
      const { slot, snapshot } = await this.repository.saveNew(this.state.game, this.snapshot);
      this.adopt(slot, snapshot, this.state.game, '已另存为新档');
      return slot;
    });
  }
  dispatch(command: Command): void {
    const current = this.state.game;
    if (!current || this.transitions) return;
    const next = reduceGame(current, command);
    if (next === current) return;
    // Guidance and rejected actions can update the notice without changing any progress.
    // Keep that feedback visible without creating a revision or flashing the save status.
    if (
      command.kind !== 'tick' &&
      JSON.stringify({ ...next, notice: current.notice }) === JSON.stringify(current)
    ) {
      this.publish({ game: next });
      return;
    }
    this.dirty++;
    this.publish({ game: next, saveStatus: '有新进度' });
    if (!['walk', 'tick'].includes(command.kind)) void this.save().catch(() => undefined);
  }
  unload(): Promise<void> {
    return this.transition(async () => {
      if (this.state.game) await this.persist(this.state.game, this.dirty);
      this.generation++;
      this.snapshot = null;
      this.publish({ game: null });
    });
  }
}
