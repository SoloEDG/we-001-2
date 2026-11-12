import type { Session, Battle, FogMemory, Team } from "../shared/types";
import { clone } from "../shared/document";
import { createMap } from "../features/terrain";
import { createUnits } from "../features/roster";
import { order } from "../features/initiative";
import { emptyFogMemory, snapshot, updateMemory } from "../features/fog";

export function newSession(): Session {
  const live: Battle = {
    tiles: createMap(),
    units: createUnits(),
    round: 1,
    queue: [],
    active: "",
    ended: null,
  };
  live.queue = order(live);
  live.active = live.queue[0];

  // 初始帧即建立双方各自的探索记忆与第一份快照
  const memory: Record<Team, FogMemory> = {
    azure: emptyFogMemory(),
    ember: emptyFogMemory(),
  };
  updateMemory(memory.azure, live, "azure", 0);
  updateMemory(memory.ember, live, "ember", 0);
  const initialSnapshot = snapshot(memory, live, 0);

  const session: Session = {
    initial: clone(live),
    live,
    events: [],
    fog: {
      memory: {
        azure: clone(initialSnapshot.memory.azure),
        ember: clone(initialSnapshot.memory.ember),
      },
      snapshots: [initialSnapshot],
    },
  };
  return session;
}
