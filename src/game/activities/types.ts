export interface ActivityRun {
  id: string;
  board: number[];
  cursor: number;
  value: number;
  aux: number;
  stage: number;
  moves: number;
  status: 'playing' | 'won' | 'lost';
  feedback: string;
}
export interface ActivityLedger {
  active: ActivityRun | null;
  drafts?: Record<string, ActivityRun>;
  records: Record<string, { completions: number; bestMoves: number; rewardClaimed: boolean }>;
}
export type ActivityAction =
  | { kind: 'cell'; index: number }
  | { kind: 'tool'; index: number }
  | { kind: 'step'; value: string }
  | { kind: 'reset' | 'close' | 'claim' };
