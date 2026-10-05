export function probe(profile = 'world-opening') {
  const ids = profile === 'world-opening' ? ['c1-bridge', 'c1-cell', 'c3-awake'] : ['e04-exam', 'e08-wonsu'];
  const map = (id) => ({ id, width: 5, height: 5, tile: 32, art: 'placeholder',
    walk: Array.from({ length: 5 }, () => [1, 1, 1, 1, 1]), objects: [
      { id: 'person', x: 2, y: 1, kind: 'npc', solid: true, label: '대상', visibleAt: [], action: 'talk' },
      { id: 'door', x: 4, y: 2, kind: 'exit', solid: false, label: '출구', visibleAt: [], action: 'leave' },
    ] });
  return { people: {}, bonds: [], wishes: [], scenes: ids.map((id) => ({ id, ch: id.startsWith('e') ? '2' : id === 'c3-awake' ? '3' : '1',
    kind: id.startsWith('e') ? 'event' : 'scene', lines: ['대상과 이야기를 나눈다.', '문을 지난다.'], items: [] })),
    maps: profile === 'world-opening' ? [map('map-cell'), map('map-road')] : [map('map-road')], experiences: ids.map((scene) => ({ scene,
      map: ['c1-cell', 'c3-awake'].includes(scene) ? 'map-cell' : 'map-road', actor: scene.startsWith('e') ? 'yang' : 'seongjin',
      spawn: { x: 1, y: 1, facing: 'right' }, beats: [
        { id: 'talk', trigger: { kind: 'talk', target: 'person' }, lines: [0], effects: [{ kind: 'none', id: null }] },
        { id: 'leave', trigger: { kind: 'exit', target: 'door' }, lines: [1], effects: [] },
      ], optional: [] })) };
}
