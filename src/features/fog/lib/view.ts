import type {
  Battle,
  FogMemory,
  FogSnapshot,
  FogView,
  Point,
  Team,
  Unit,
} from "../../../shared/types";
import { key } from "../../../shared/document";
import { computeVisible } from "./vision";

/** 同阵营角色脚下永远可见（自己知道自己人在哪） */
function withAlliedTiles(b: Battle, team: Team, visible: Set<string>): Set<string> {
  const set = new Set(visible);
  for (const u of b.units) if (u.hp > 0 && u.team === team) set.add(key(u));
  return set;
}

export interface FogInput {
  battle: Battle;
  team: Team;
  memory: FogMemory;
  snapshot: FogSnapshot | null;
}

/**
 * 组装某一阵营在某一帧的视野视图：
 * - visible：当前可见格（回放优先使用该时刻保存的观测）
 * - explored：历史曾见格（记忆，撤离后仍保留）
 * - visibleEnemies / hiddenEnemies：敌人按可见性分组，
 *   隐藏敌人只保留最后观测标记，不含实时生命。
 */
export function fogView({ battle, team, memory, snapshot: snap }: FogInput): FogView {
  let visible: Set<string>;
  if (snap) {
    const list = team === "azure" ? snap.visible.azure : snap.visible.ember;
    visible = new Set(list);
  } else {
    visible = computeVisible(battle, team);
  }
  visible = withAlliedTiles(battle, team, visible);

  const explored = new Set(memory.explored);
  for (const k of visible) explored.add(k);

  const visibleEnemies: Unit[] = [];
  for (const u of battle.units) {
    if (u.team === team || u.hp <= 0) continue;
    if (visible.has(key(u))) visibleEnemies.push(u);
  }

  const hiddenEnemies = Object.values(memory.observations)
    .filter((o) => o.team !== team)
    .map((o) => {
      const live = battle.units.find((u) => u.id === o.unitId);
      const currentlyVisible = !!live && live.hp > 0 && visible.has(key(live));
      return { observation: o, live: live ?? null, currentlyVisible };
    })
    .filter((entry) => {
      // 实时可见的敌人不显示旧标记；只在“最后观测位置”曾被探索时显示
      if (entry.currentlyVisible) return false;
      return explored.has(key(entry.observation));
    });

  return {
    team,
    visible,
    explored,
    visibleEnemies,
    hiddenEnemies,
    isVisible: (p: Point) => visible.has(key(p)),
    isExplored: (p: Point) => explored.has(key(p)),
  };
}
