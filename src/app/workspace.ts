import { computed, reactive, ref } from "vue";
import type {
  Point,
  Terrain,
  Team,
  FogMemory,
  FogSnapshot,
  FogView,
} from "../shared/types";
import { clone, findUnit, key } from "../shared/document";
import { reachable, terrainRules, paintTile } from "../features/terrain";
import { moveBudget, armorValue, tickStatuses } from "../features/roster";
import {
  getSkill,
  legalTargets,
  moveUnit,
  castSkill,
} from "../features/tactics";
import { finishTurn } from "../features/initiative";
import {
  record,
  frame,
  loadArchive,
  saveArchive,
  usePlayback,
} from "../features/replay";
import {
  emptyFogMemory,
  emptyFogMemoryData,
  ensureSessionFog,
  fogView,
  snapshot,
  toFogMemory,
  toFogMemoryData,
  updateMemory,
} from "../features/fog";
import { newSession } from "./session";

export function useWorkspace() {
  const session = reactive(loadArchive() ?? newSession());

  // 旧记录没有迷雾记忆时按事件顺序重建；失败则临时降级，原档保留不覆盖
  const ensured = ensureSessionFog(session);
  let memory: Record<Team, FogMemory> = ensured
    ? ensured.memory
    : { azure: emptyFogMemory(), ember: emptyFogMemory() };
  const fallbackSnapshots: FogSnapshot[] = ensured ? ensured.snapshots : [];
  if (ensured && (!session.fog || session.fog.snapshots !== ensured.snapshots)) {
    // 重建路径：把内存快照挂到会话状态供回放读取（不主动落盘，失败保留原档）
    if (!session.fog) {
      session.fog = {
        memory: {
          azure: toFogMemoryData(memory.azure),
          ember: toFogMemoryData(memory.ember),
        },
        snapshots: ensured.snapshots,
      };
    } else {
      session.fog.snapshots = ensured.snapshots;
    }
  }

  const cursor = ref(-1),
    selected = ref(session.live.active),
    skill = ref(""),
    brush = ref<Terrain | null>(null),
    // 当前观察战场的阵营视角，双方记忆各自独立，切换不串用
    perspective = ref<Team>("azure"),
    followActive = ref(true),
    notice = ref("选择蓝色格移动，或选择技能指定目标。");

  const playback = usePlayback(
    () => session.events.length,
    (n) => {
      cursor.value = n;
    },
  );
  const battle = computed(() => frame(session, cursor.value));
  const actor = computed(() => findUnit(battle.value, battle.value.active));
  const locked = computed(() => cursor.value >= 0 || !!session.live.ended);
  const routes = computed(() =>
    locked.value || actor.value.moved || actor.value.acted
      ? new Map()
      : reachable(session.live, actor.value, moveBudget(actor.value)),
  );

  function snapshotAt(c: number): FogSnapshot | null {
    if (c < 0) return null; // 实战帧实时计算可见格
    const list = session.fog?.snapshots?.length
      ? session.fog!.snapshots
      : fallbackSnapshots;
    return list[c] ?? null;
  }

  const fog = computed<FogView>(() => {
    const c = cursor.value;
    const team = perspective.value;
    const snap = snapshotAt(c);
    const mem: FogMemory =
      c < 0
        ? memory[team]
        : snap
          ? toFogMemory(snap.memory[team])
          : memory[team]; // 无快照时的降级路径，不影响原档
    return fogView({ battle: battle.value, team, memory: mem, snapshot: snap });
  });

  /**
   * 玩法判定专用视野：始终以当前行动角色所属阵营为准，
   * 不受手动切换观察视角影响，避免串用对方记忆。
   */
  const actorFog = computed<FogView>(() => {
    const c = cursor.value;
    const team = actor.value.team;
    const snap = snapshotAt(c);
    const mem: FogMemory =
      c < 0
        ? memory[team]
        : snap
          ? toFogMemory(snap.memory[team])
          : memory[team];
    return fogView({ battle: battle.value, team, memory: mem, snapshot: snap });
  });

  const targets = computed(() => {
    const s = getSkill(actor.value.job, skill.value);
    if (!s) return [];
    // 技能不能以隐藏敌人为目标：仅保留行动方当前可见格上的合法目标
    return legalTargets(battle.value, actor.value, s).filter((t) =>
      actorFog.value.isVisible(t),
    );
  });

  /** 每次行动后把双方新观测并入持久记忆，并保存该帧快照 */
  function commitFog() {
    const id = session.events.length;
    updateMemory(memory.azure, session.live, "azure", id);
    updateMemory(memory.ember, session.live, "ember", id);
    const snap = snapshot(memory, session.live, id);
    if (!session.fog) {
      session.fog = {
        memory: { azure: emptyFogMemoryData(), ember: emptyFogMemoryData() },
        snapshots: [],
      };
    }
    session.fog.snapshots.push(snap);
    session.fog.memory.azure = toFogMemoryData(memory.azure);
    session.fog.memory.ember = toFogMemoryData(memory.ember);
  }

  function cell(p: Point) {
    try {
      if (locked.value) throw new Error("回放只读，请返回实战");
      const before = clone(session.live),
        u = actor.value;
      if (brush.value) {
        if (!actorFog.value.isExplored(p))
          throw new Error("未探索区域无法编辑地形");
        paintTile(session.live, p, brush.value);
        record(
          session,
          before,
          "terrain",
          `地形调整为${terrainRules[brush.value].name}`,
        );
      } else if (skill.value) {
        const s = getSkill(u.job, skill.value)!;
        const t = session.live.units.find((t) => t.hp > 0 && key(t) === key(p));
        if (!t) throw new Error("请点击合法角色");
        if (!actorFog.value.isVisible(t))
          throw new Error("目标隐藏在战争迷雾中，无法指定");
        const ground = session.live.tiles.find((v) => key(v) === key(t))!;
        const high =
          session.live.tiles.find((v) => key(v) === key(u))!.terrain ===
          "ridge";
        const value = castSkill(
          session.live,
          u.id,
          t.id,
          s,
          armorValue(t),
          terrainRules[ground.terrain].cover,
          high,
        );
        record(
          session,
          before,
          "skill",
          `${u.name} → ${t.name} · ${s.name} ${value}`,
        );
        skill.value = "";
      } else {
        const route = routes.value.get(key(p));
        if (!route?.path.length)
          throw new Error("此格不可达，请检查地形与占位");
        moveUnit(session.live, u.id, route.path);
        record(
          session,
          before,
          "move",
          `${u.name}移动 · 消耗${route.cost}`,
          route.path,
        );
      }
      commitFog(); // 移动 / 死亡结算 / 地形编辑均触发视野更新
      saveArchive(session);
      notice.value = session.events.at(-1)!.label;
    } catch (e) {
      notice.value = (e as Error).message;
    }
  }

  function wait() {
    if (locked.value) return;
    const before = clone(session.live);
    finishTurn(session.live, tickStatuses);
    record(
      session,
      before,
      "wait",
      `${findUnit(before, before.active).name}结束行动`,
    );
    commitFog(); // 灼烧致死等状态结算同样刷新视野
    if (followActive.value)
      perspective.value = findUnit(session.live, session.live.active).team;
    selected.value = session.live.active;
    skill.value = "";
    saveArchive(session);
  }

  function setPerspective(team: Team) {
    perspective.value = team;
    followActive.value = false;
  }
  function followTurn() {
    followActive.value = true;
    perspective.value = actor.value.team;
  }

  function seek(n: number) {
    playback.stop();
    cursor.value = n;
    skill.value = "";
    brush.value = null;
  }
  function reset() {
    playback.stop();
    Object.assign(session, newSession());
    const rebuilt = ensureSessionFog(session);
    memory = rebuilt
      ? rebuilt.memory
      : { azure: emptyFogMemory(), ember: emptyFogMemory() };
    cursor.value = -1;
    selected.value = session.live.active;
    skill.value = "";
    brush.value = null;
    perspective.value = "azure";
    followActive.value = true;
    saveArchive(session);
    notice.value = "新战斗已就绪";
  }

  const path = computed(() =>
    cursor.value > 0 ? (session.events[cursor.value - 1]?.path ?? []) : [],
  );

  return {
    session,
    cursor,
    selected,
    skill,
    brush,
    perspective,
    followActive,
    notice,
    battle,
    actor,
    locked,
    routes,
    targets,
    path,
    fog,
    actorFog,
    playback,
    cell,
    wait,
    seek,
    reset,
    setPerspective,
    followTurn,
  };
}
