import type { Battle, Point, Profession, Team, Unit } from "../../../shared/types";
import { key } from "../../../shared/document";

/** 职业基础视距：游侠目力最好，秘术师次之，卫士与医师较短 */
export const sightRange: Record<Profession, number> = {
  guard: 3,
  ranger: 6,
  mage: 4,
  medic: 3,
};

/** 占据高地（ridge）时视野 +1 */
export function effectiveSight(b: Battle, u: Unit): number {
  const tile = b.tiles.find((t) => t.x === u.x && t.y === u.y);
  return sightRange[u.job] + (tile?.terrain === "ridge" ? 1 : 0);
}

/** Bresenham 整数直线，返回两点之间（不含两个端点）经过的格子 */
function lineCells(a: Point, t: Point): Point[] {
  const cells: Point[] = [];
  let x0 = a.x,
    y0 = a.y;
  const dx = Math.abs(t.x - x0),
    dy = Math.abs(t.y - y0);
  const sx = x0 < t.x ? 1 : -1,
    sy = y0 < t.y ? 1 : -1;
  let err = dx - dy;
  while (x0 !== t.x || y0 !== t.y) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
    if (x0 !== t.x || y0 !== t.y) cells.push({ x: x0, y: y0 });
  }
  return cells;
}

/**
 * 视线是否畅通。wall（断崖/山崖）阻挡传播，
 * 阻挡格本身仍可见（看得见崖面），只是崖后不可见。
 */
export function lineClear(b: Battle, a: Point, t: Point): boolean {
  return lineCells(a, t).every((p) => {
    const tile = b.tiles.find((v) => v.x === p.x && v.y === p.y);
    return !tile || tile.terrain !== "wall";
  });
}

/** 计算某阵营当前所有存活角色的可见格并集（切比雪夫距离 + 山崖遮挡） */
export function computeVisible(b: Battle, team: Team): Set<string> {
  const seen = new Set<string>();
  for (const u of b.units.filter((u) => u.hp > 0 && u.team === team)) {
    const range = effectiveSight(b, u);
    for (const tile of b.tiles) {
      const d = Math.max(Math.abs(tile.x - u.x), Math.abs(tile.y - u.y));
      if (d <= range && lineClear(b, u, tile)) seen.add(key(tile));
    }
  }
  return seen;
}
