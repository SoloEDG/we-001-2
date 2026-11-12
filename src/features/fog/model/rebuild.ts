import type { Battle, FogMemory, FogSnapshot, Session, Team } from "../../../shared/types";
import { emptyFogMemory, snapshot, updateMemory } from "./memory";

/**
 * 按事件顺序从零重建一份战争迷雾档案。
 * 依据“该时刻的观测资料”逐帧累积：
 * 初始帧 → 每条事件的 after 帧依次并入双方记忆。
 * 重建结果只返回给调用方，绝不写回 localStorage，
 * 因此失败时原档保持不动。
 */
export function rebuildFog(session: Session): {
  memory: Record<Team, FogMemory>;
  snapshots: FogSnapshot[];
} {
  const memory: Record<Team, FogMemory> = {
    azure: emptyFogMemory(),
    ember: emptyFogMemory(),
  };
  const snapshots: FogSnapshot[] = [];
  const commit = (b: Battle, eventId: number) => {
    updateMemory(memory.azure, b, "azure", eventId);
    updateMemory(memory.ember, b, "ember", eventId);
    snapshots.push(snapshot(memory, b, eventId));
  };
  commit(session.initial, 0);
  session.events.forEach((e) => commit(e.after, e.id));
  return { memory, snapshots };
}

/**
 * 确保会话携带迷雾记忆。
 * - 记忆与每帧快照齐全（快照数 = 事件数 + 1）：直接复用；
 * - 缺失或数量错位（旧记录 / 损坏记录）：按事件顺序重建，
 *   重建只在内存中进行，失败返回 null，由上层临时降级，原档不被覆盖。
 */
export function ensureSessionFog(
  session: Session,
): { memory: Record<Team, FogMemory>; snapshots: FogSnapshot[] } | null {
  try {
    const fog = session.fog;
    const expectedSnapshots = session.events.length + 1;
    const snapshotsIntact =
      Array.isArray(fog?.snapshots) &&
      fog!.snapshots.length === expectedSnapshots &&
      fog!.snapshots.every((s, i) => s.eventId === (i === 0 ? 0 : session.events[i - 1].id));
    if (fog?.memory?.azure && fog?.memory?.ember && snapshotsIntact) {
      const memory: Record<Team, FogMemory> = {
        azure: {
          explored: new Set(fog.memory.azure.explored),
          observations: JSON.parse(
            JSON.stringify(fog.memory.azure.observations ?? {}),
          ),
        },
        ember: {
          explored: new Set(fog.memory.ember.explored),
          observations: JSON.parse(
            JSON.stringify(fog.memory.ember.observations ?? {}),
          ),
        },
      };
      return { memory, snapshots: fog.snapshots };
    }
    return rebuildFog(session);
  } catch {
    return null;
  }
}
