'use strict';
(function () {
  const directions = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  for (const delta of Object.values(directions)) Object.freeze(delta);
  const visible = (object, scene, beat) => Array.isArray(object.visibleAt) &&
    (!object.visibleAt.length || object.visibleAt.includes(scene + ':' + beat));
  const objects = (map, scene, beat) => (Array.isArray(map?.objects) ? map.objects : []).filter((o) => o && visible(o, scene, beat));
  function walkable(map, x, y, scene, beat) {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 &&
      x < map?.width && y < map?.height && map.walk?.[y]?.[x] === 1 &&
      !objects(map, scene, beat).some((o) => o.solid && o.x === x && o.y === y);
  }
  const adjacent = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  function move(map, cursor, facing, scene, beat) {
    const delta = directions[facing];
    if (!delta || !cursor || !walkable(map, cursor.x, cursor.y, scene, beat)) return null;
    const x = cursor.x + delta[0], y = cursor.y + delta[1];
    return walkable(map, x, y, scene, beat) ? { ...cursor, x, y, facing } : null;
  }
  function path(map, from, target, scene, beat, beside = true) {
    if (!from || !target || !walkable(map, from.x, from.y, scene, beat)) return null;
    const queue = [[{ x: from.x, y: from.y }]], seen = new Set([from.x + ',' + from.y]);
    for (let i = 0; i < queue.length; i++) {
      const route = queue[i], point = route[route.length - 1];
      if (beside ? adjacent(point, target) : point.x === target.x && point.y === target.y) return route;
      for (const [dx, dy] of Object.values(directions)) {
        const x = point.x + dx, y = point.y + dy, key = x + ',' + y;
        if (!seen.has(key) && walkable(map, x, y, scene, beat)) {
          seen.add(key); queue.push([...route, { x, y }]);
        }
      }
    }
    return null;
  }
  function stage(data, sceneId, beatId) {
    const experience = (Array.isArray(data.experiences) ? data.experiences : []).find((e) => e?.scene === sceneId);
    if (!experience || !Array.isArray(experience.beats) || experience.beats.some((b) => !b || typeof b !== 'object')) return null;
    const index = beatId == null ? experience.beats.length - 1 : experience.beats.findIndex((b) => b.id === beatId);
    if (index < 0) return null;
    let map = experience.map, spawn = experience.spawn, appearance = null;
    for (const beat of experience.beats.slice(0, index + 1)) {
      if (beat.map) map = beat.map;
      if (beat.spawn) spawn = beat.spawn;
      appearance = beat.appearance || null;
    }
    const found = (Array.isArray(data.maps) ? data.maps : []).find((m) => m?.id === map);
    return found ? { scene: sceneId, map: found, spawn: { ...spawn }, beat: beatId, actor: experience.actor, appearance } : null;
  }
  G.world = { directions: Object.freeze(directions), visible, objects, walkable, adjacent, move, path, stage };
})();
