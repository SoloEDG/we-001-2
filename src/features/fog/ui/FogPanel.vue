<script setup lang="ts">
import type { Team } from "../../../shared/types";
defineProps<{
  perspective: Team;
  followActive: boolean;
  exploredCount: number;
  visibleCount: number;
  knownEnemies: number;
}>();
defineEmits<{ team: [team: Team]; follow: [] }>();
</script>
<template>
  <section class="panel fog-panel">
    <div class="eyebrow">05 / FOG OF WAR</div>
    <h3>战争迷雾 <small>按阵营各自记忆</small></h3>
    <div class="fog-teams">
      <button
        :class="{ chosen: perspective === 'azure' }"
        @click="$emit('team', 'azure')"
      >
        苍蓝军视角
      </button>
      <button
        :class="{ chosen: perspective === 'ember' }"
        @click="$emit('team', 'ember')"
      >
        余烬军视角
      </button>
    </div>
    <button class="fog-follow" :class="{ chosen: followActive }" @click="$emit('follow')">
      跟随当前行动阵营{{ followActive ? " · 开启" : " · 关闭" }}
    </button>
    <ul class="fog-stats">
      <li><b>{{ visibleCount }}</b><span>当前可见格</span></li>
      <li><b>{{ exploredCount }}</b><span>已探索格</span></li>
      <li><b>{{ knownEnemies }}</b><span>可见敌人</span></li>
    </ul>
    <div class="fog-legend">
      <span><i class="swatch seen" />当前可见</span>
      <span><i class="swatch explored" />曾经探索</span>
      <span><i class="swatch unknown" />未知</span>
      <span><i class="swatch ghost" />最后观测标记</span>
    </div>
  </section>
</template>
