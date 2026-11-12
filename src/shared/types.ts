export type Terrain = "plain" | "forest" | "water" | "ridge" | "wall";
export type Profession = "guard" | "ranger" | "mage" | "medic";
export type Team = "azure" | "ember";
export interface Point {
  x: number;
  y: number;
}
export interface Tile extends Point {
  terrain: Terrain;
}
export interface Status {
  kind: "slow" | "burn" | "guard";
  turns: number;
}
export interface Unit extends Point {
  id: string;
  name: string;
  job: Profession;
  team: Team;
  hp: number;
  maxHp: number;
  power: number;
  armor: number;
  speed: number;
  move: number;
  statuses: Status[];
  moved: boolean;
  acted: boolean;
}

/** 一名敌方单位在最后一次被观测时的快照 */
export interface UnitObservation {
  unitId: string;
  name: string;
  job: Profession;
  team: Team;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  eventId: number;
}
/** 可持久化（可 JSON 序列化）的阵营迷雾记忆 */
export interface FogMemoryData {
  explored: string[];
  observations: Record<string, UnitObservation>;
}
/** 运行时阵营迷雾记忆 */
export interface FogMemory {
  explored: Set<string>;
  observations: Record<string, UnitObservation>;
}
/** 某一帧的迷雾快照：记忆 + 当时的可见格，供历史回放使用 */
export interface FogSnapshot {
  eventId: number;
  memory: Record<Team, FogMemoryData>;
  visible: Record<Team, string[]>;
}
export interface FogState {
  memory: Record<Team, FogMemoryData>;
  snapshots: FogSnapshot[];
}
export interface Battle {
  tiles: Tile[];
  units: Unit[];
  round: number;
  queue: string[];
  active: string;
  ended: string | null;
}
export type EventKind = "move" | "skill" | "wait" | "terrain";
export interface BattleEvent {
  id: number;
  kind: EventKind;
  actor: string;
  label: string;
  path: Point[];
  before: Battle;
  after: Battle;
}
export interface Session {
  initial: Battle;
  live: Battle;
  events: BattleEvent[];
  fog?: FogState;
}
/** 某一阵营在某一帧的视野视图（供 UI 渲染） */
export interface FogView {
  team: Team;
  visible: Set<string>;
  explored: Set<string>;
  visibleEnemies: Unit[];
  hiddenEnemies: {
    observation: UnitObservation;
    live: Unit | null;
    currentlyVisible: boolean;
  }[];
  isVisible: (p: Point) => boolean;
  isExplored: (p: Point) => boolean;
}
export interface Skill {
  id: string;
  name: string;
  range: number;
  power: number;
  target: "enemy" | "ally" | "self";
  status?: Status["kind"];
  description: string;
}
