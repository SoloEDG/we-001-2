export { default as FogPanel } from "./ui/FogPanel.vue";
export {
  sightRange,
  effectiveSight,
  lineClear,
  computeVisible,
} from "./lib/vision";
export {
  emptyFogMemory,
  emptyFogMemoryData,
  toFogMemory,
  toFogMemoryData,
  updateMemory,
  snapshot,
} from "./model/memory";
export { rebuildFog, ensureSessionFog } from "./model/rebuild";
export { fogView } from "./lib/view";
export type { FogInput } from "./lib/view";
