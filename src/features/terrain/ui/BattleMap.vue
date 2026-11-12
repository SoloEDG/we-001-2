<script setup lang="ts">
import type { Battle, FogView, Point, Profession, Tile } from "../../../shared/types";
import { key } from "../../../shared/document";
import { terrainRules } from "../lib/cost";
const props = defineProps<{
  battle: Battle;
  selected: string;
  routes: string[];
  targets: string[];
  path: Point[];
  fog: FogView;
  actorFog: FogView;
}>();
defineEmits<{ cell: [point: Point] }>();

const jobGlyph = (job: Profession) =>
  job === "guard" ? "♜" : job === "ranger" ? "➶" : job === "mage" ? "✦" : "✚";

const ghostAt = (p: Point) =>
  props.fog.hiddenEnemies.find(
    (g) => g.observation.x === p.x && g.observation.y === p.y,
  );

const ghostGone = (p: Point) => {
  const g = ghostAt(p);
  return !g || !g.live || g.live.hp <= 0;
};

const tileLabel = (t: Tile) =>
  `${t.x},${t.y} ${
    props.fog.isExplored(t) ? terrainRules[t.terrain].name : "未知区域"
  }`;
</script>
<template>
  <section class="map-frame">
    <div class="map-caption">
      <span>渡口 07 / 北部边境</span><span>12 × 8 · 四向网格 · 战争迷雾</span>
    </div>
    <div class="battle-map" role="grid" aria-label="战术地图">
      <button
        v-for="tile in battle.tiles"
        :key="key(tile)"
        :data-cell="key(tile)"
        :class="[
          'tile',
          tile.terrain,
          {
            reachable: routes.includes(key(tile)),
            'reach-fog': routes.includes(key(tile)) && !fog.isExplored(tile),
            target: actorFog.isVisible(tile) && targets.includes(key(tile)),
            trail: path.some((p) => key(p) === key(tile)),
            fogged: !fog.isExplored(tile),
            dimmed:
              fog.isExplored(tile) && !fog.isVisible(tile),
          },
        ]"
        :aria-label="tileLabel(tile)"
        @click="$emit('cell', tile)"
      >
        <span v-if="fog.isExplored(tile)" class="ground">{{
          terrainRules[tile.terrain].glyph
        }}</span>
        <template
          v-for="unit in battle.units.filter(
            (u) => u.hp > 0 && key(u) === key(tile),
          )"
          :key="unit.id"
        >
          <!-- 同阵营始终可见；敌方仅在当前可见格显示实时状态 -->
          <span
            v-if="unit.team === fog.team || fog.isVisible(tile)"
            :class="[
              'pawn',
              unit.team,
              {
                selected: unit.id === selected,
                active: unit.id === battle.active,
              },
            ]"
            >{{ jobGlyph(unit.job) }}<i
              :style="{ width: (unit.hp / unit.maxHp) * 100 + '%' }"
          /></span>
        </template>
        <!-- 已观测但当前不可见的敌人：只显示最后观测标记，不泄露实时生命 -->
        <span
          v-if="ghostAt(tile)"
          class="pawn ghost"
          :class="{ gone: ghostGone(tile) }"
          :title="`最后观测：${ghostAt(tile)?.observation.name ?? ''}`"
          >{{ jobGlyph(ghostAt(tile)!.observation.job) }}</span
        >
        <small v-if="fog.isExplored(tile)">{{ tile.x + 1 }}·{{ tile.y + 1 }}</small>
      </button>
    </div>
    <div class="map-caption">
      <span>浅滩纵贯南北 · 中央石桥可快速渡河</span
      ><span>◆ 当前可见　◐ 曾探索　▓ 未知　◌ 最后观测</span>
    </div>
  </section>
</template>
