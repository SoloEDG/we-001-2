import type {
  Battle,
  FogMemory,
  FogMemoryData,
  FogSnapshot,
  Profession,
  Team,
  Unit,
} from "../../../shared/types";
import { clone, key } from "../../../shared/document";
import { computeVisible } from "../lib/vision";

export function emptyFogMemoryData(): FogMemoryData {
  return { explored: [], observations: {} };
}

export function emptyFogMemory(): FogMemory {
  return { explored: new Set<string>(), observations: {} };
}

export function toFogMemoryData(m: FogMemory): FogMemoryData {
  return {
    explored: [...m.explored].sort(),
    observations: clone(m.observations),
  };
}

export function toFogMemory(data: FogMemoryData): FogMemory {
  return {
    explored: new Set(data.explored),
    observations: clone(data.observations ?? {}),
  };
}

/**
 * 用当前战场的一次观测更新该阵营的持久记忆。
 * - 可见格并入探索记忆（撤离后仍保留看过的河岸）；
 * - 仅记录敌方单位的最后观测快照（含位置、职业、当时生命），
 *   之后不再刷新，因此不会泄露其实时生命与实时位置。
 */
export function updateMemory(
  memory: FogMemory,
  b: Battle,
  team: Team,
  eventId: number,
): void {
  const visible = computeVisible(b, team);
  for (const k of visible) memory.explored.add(k);
  for (const u of b.units.filter((u) => u.team !== team)) {
    if (visible.has(key(u))) {
      memory.observations[u.id] = {
        unitId: u.id,
        name: u.name,
        job: u.job as Profession,
        team: u.team,
        x: u.x,
        y: u.y,
        hp: u.hp,
        maxHp: u.maxHp,
        eventId,
      };
    }
  }
}

/** 为当前战场生成一个不可变快照，供回放使用 */
export function snapshot(
  memory: Record<Team, FogMemory>,
  b: Battle,
  eventId: number,
): FogSnapshot {
  const visible = {
    azure: computeVisible(b, "azure"),
    ember: computeVisible(b, "ember"),
  };
  return {
    eventId,
    memory: {
      azure: toFogMemoryData(memory.azure),
      ember: toFogMemoryData(memory.ember),
    },
    visible: {
      azure: [...visible.azure].sort(),
      ember: [...visible.ember].sort(),
    },
  };
}

export function isAlive(u: Unit) {
  return u.hp > 0;
}
