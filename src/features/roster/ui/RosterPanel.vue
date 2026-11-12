<script setup lang="ts">
import { computed } from "vue";
import type { FogView, Unit } from "../../../shared/types";
import { professions } from "../model/professions";
import { statusNames } from "../lib/status";
const props = defineProps<{
  units: Unit[];
  selected: string;
  active: string;
  fog: FogView;
}>();
defineEmits<{ select: [id: string] }>();

const allies = computed(() =>
  props.units.filter((u) => u.team === props.fog.team),
);
// 敌方编队仅包含当前可见的敌人
const visibleEnemies = computed(() =>
  props.units.filter(
    (u) => u.team !== props.fog.team && u.hp > 0 && props.fog.isVisible(u),
  ),
);
const ghosts = computed(() => props.fog.hiddenEnemies);
</script>
<template>
  <section class="panel roster-panel">
    <div class="eyebrow">02 / COMBAT SQUAD</div>
    <h3>
      战场编队
      <small>{{ fog.visibleEnemies.length }} 名可见敌军 · 隐藏目标不显示</small>
    </h3>

    <div class="roster-group">我方 · {{ fog.team === "azure" ? "苍蓝" : "余烬" }}</div>
    <button
      v-for="u in allies"
      :key="u.id"
      :data-unit="u.id"
      :class="[
        'unit-row',
        u.team,
        { chosen: u.id === selected, dead: u.hp <= 0 },
      ]"
      @click="$emit('select', u.id)"
    >
      <span class="avatar">{{ u.name.slice(0, 1) }}</span
      ><span class="unit-name"
        ><b>{{ u.name }} <i v-if="u.id === active">行动中</i></b
        ><small
          >{{ professions[u.job].name }} ·
          {{ u.team === "azure" ? "苍蓝" : "余烬" }}</small
        ><span class="hp-track"
          ><i :style="{ width: (u.hp / u.maxHp) * 100 + '%' }" /></span></span
      ><span class="hp-value"
        >{{ u.hp }}<small>/{{ u.maxHp }}</small
        ><small>{{
          u.statuses.map((s) => statusNames[s.kind] + s.turns).join(" ") ||
          "状态正常"
        }}</small></span
      >
    </button>

    <div class="roster-group">敌方 · 仅当前可见</div>
    <p v-if="!visibleEnemies.length" class="roster-empty">
      视野内没有敌方角色，最后观测位置见地图虚影。
    </p>
    <button
      v-for="u in visibleEnemies"
      :key="u.id"
      :data-unit="u.id"
      :class="['unit-row', u.team, { chosen: u.id === selected }]"
      @click="$emit('select', u.id)"
    >
      <span class="avatar">{{ u.name.slice(0, 1) }}</span
      ><span class="unit-name"
        ><b>{{ u.name }} <i v-if="u.id === active">行动中</i></b
        ><small>{{ professions[u.job].name }}</small
        ><span class="hp-track"
          ><i :style="{ width: (u.hp / u.maxHp) * 100 + '%' }" /></span></span
      ><span class="hp-value"
        >{{ u.hp }}<small>/{{ u.maxHp }}</small
        ><small>{{
          u.statuses.map((s) => statusNames[s.kind] + s.turns).join(" ") ||
          "状态正常"
        }}</small></span
      >
    </button>

    <!-- 最后观测标记：只给位置与职业，不泄露实时生命 -->
    <div class="roster-group">最后观测 · 非实时</div>
    <p v-if="!ghosts.length" class="roster-empty">尚无敌方观测记录。</p>
    <div
      v-for="g in ghosts"
      :key="g.observation.unitId"
      class="unit-row ghost-row"
      :class="{ gone: !g.live || g.live.hp <= 0 }"
    >
      <span class="avatar">{{ g.observation.name.slice(0, 1) }}</span
      ><span class="unit-name"
        ><b>{{ g.observation.name }}</b
        ><small>{{ professions[g.observation.job].name }} · 最后坐标 {{
          g.observation.x + 1
        }}·{{ g.observation.y + 1 }}</small
        ></span
      ><span class="hp-value"
        ><small>第 {{ g.observation.eventId }} 步观测</small
        ><small>{{
          !g.live || g.live.hp <= 0 ? "观测时阵亡" : "当前位置未知"
        }}</small></span
      >
    </div>
  </section>
</template>
