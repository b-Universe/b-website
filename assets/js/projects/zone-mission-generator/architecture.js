export const SCALES = {
  compact: { bay: 7, depth: 8, hall: 3.4, cave: .8, height: 3.4 },
  standard: { bay: 11, depth: 13, hall: 5, cave: 1, height: 4.2 },
  expansive: { bay: 17, depth: 20, hall: 8, cave: 1.45, height: 5.6 },
  massive: { bay: 25, depth: 29, hall: 12, cave: 2.15, height: 7.5 },
};

export const LAYOUTS = ['auto', 'spine', 'cross', 'loop', 'campus'];
const profiles = {
  warehouse: {
    layout:'campus', main:'Forklift aisle',
    departments:[
      ['Receiving','Loading Hall',['Shipping Staging','Loading Docks','Intake']],
      ['Inventory','High-Bay Storage',['Rack Aisle','Bulk Storage','Cold Storage']],
      ['Dispatch','Distribution Hall',['Packing','Vehicle Service','Dispatch']],
    ],
  },
  office: {
    layout: 'loop', main: 'Office concourse',
    departments: [
      ['Reception and visitors', 'Atrium Reception', ['Reception', 'Conference Room', 'Meeting Room', 'Break Room']],
      ['Staff departments', 'Open Work Floor', ['Open Office', 'Cubicle Area', 'Copy Center', 'Private Office']],
      ['Operations and executive', 'Executive Conference Center', ['Executive Suite', 'Server Room', 'Operations Center', 'Records Archive']],
    ],
  },
  laboratory: {
    layout: 'cross', main: 'Research transfer spine',
    departments: [
      ['Intake and support', 'Equipment Hall', ['Research Office', 'Observation Room', 'Equipment Storage', 'Maintenance']],
      ['Experiments', 'Prototype Testing Bay', ['Chemistry Lab', 'Testing Chamber', 'Clean Room', 'Control Room']],
      ['Restricted research', 'Containment Gallery', ['Containment Bay', 'Decontamination', 'Specimen Archive', 'Power Room']],
    ],
  },
  precinct: {
    layout: 'spine', main: 'Public circulation',
    departments: [
      ['Public services', 'Public Intake Hall', ['Reception', 'Interview Room', 'Briefing Room', 'Records Archive']],
      ['Operations', 'Operations Floor', ['Detective Office', 'Dispatch', 'Staff Locker Room', 'Training Room']],
      ['Custody and evidence', 'Detention Processing', ['Holding Cell', 'Armory', 'Evidence Storage', 'Interrogation']],
    ],
  },
  hospital: {
    layout: 'campus', main: 'Hospital concourse',
    departments: [
      ['Emergency and intake', 'Emergency Treatment Hall', ['Emergency Triage', 'Reception', 'Examination Room', 'Waiting Area']],
      ['Inpatient care', 'Inpatient Ward', ['Patient Ward', 'Treatment Room', 'Nurses Station', 'Supply Room']],
      ['Diagnostics and procedures', 'Imaging Center', ['Imaging Room', 'Operating Room', 'Medical Laboratory', 'Isolation Room']],
    ],
  },
};

const point = (x, z) => ({ x, y: 0, z });
const bounds = (x0, x1, z0, z1) => ({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 });

export function departmentRoomName(archetype, department, landmark, variant) {
  const match = profiles[archetype]?.departments.find(([name]) => name === department);
  if (!match) return null;
  return landmark ? match[1] : match[2][Math.floor(variant * match[2].length)];
}

export function buildInterior(segment, cfg, random, makeRoom) {
  const scale = SCALES[cfg.scale];
  const profile = profiles[cfg.archetype];
  const layout = cfg.layout === 'auto' ? profile.layout : cfg.layout;
  const count = Math.max(4, Math.ceil(cfg.rooms * .57));
  const xs = [0];
  for (let i = 0; i < count; i++) {
    const variation = 1 + (random() - .5) * cfg.roomVariation / 160;
    xs.push(xs.at(-1) + Math.round((cfg.bayWidth || scale.bay) * variation));
  }
  const hall = cfg.corridorWidth || scale.hall;
  let width = xs.at(-1);
  const tiles = [];
  const corridor = (kind, label, x0, x1, z0, z1) => {
    const id = `${segment.id}-hall-${segment.corridors.length + 1}`;
    const area = { id, kind, label, bounds: bounds(x0, x1, z0, z1) };
    segment.corridors.push(area);
    tiles.push({ id, x0, x1, z0, z1, area });
    return area;
  };
  const main = corridor('main', profile.main, 0, width, -hall / 2, hall / 2);
  const room = (index, span, z0, z1, landmark, entryFrom = null) => {
    const departmentIndex = Math.min(2, Math.floor((index + span / 2) * 3 / count));
    const [department] = profile.departments[departmentIndex];
    const name = departmentRoomName(cfg.archetype, department, landmark, random());
    const x0 = xs[index], x1 = xs[index + span];
    const area = makeRoom(segment, { name, bounds: bounds(x0, x1, z0, z1), phase: landmark ? 'landmark' : 'standard' });
    area.department = department;
    area.regionType = landmark ? 'open_region' : 'enclosed_room';
    area.ceilingHeight = segment.architecturalHeight + (landmark && cfg.scale !== 'compact' ? 1.6 : 0);
    tiles.push({ id: area.id, x0, x1, z0, z1, area, room: true, entryFrom });
  };
  for (const sign of [-1, 1]) {
    const depth = Math.round((cfg.roomDepth || scale.depth) * (sign === 1 ? 1.12 : 1));
    const band = (a, b) => [Math.min(a * sign, b * sign), Math.max(a * sign, b * sign)];
    const inner = band(hall / 2, hall / 2 + depth);
    const wantsLoop = cfg.loops > 0 && (layout === 'campus' || sign > 0 && (layout === 'loop' || cfg.branches >= 2));
    const first = layout === 'campus' && count >= 7 ? 1 : 0;
    const last = count - 1;
    const connectorCount = wantsLoop ? Math.min(3, 2 + Number(cfg.loops > 1 && cfg.branches > 1)) :
      layout === 'cross' || layout === 'campus' ? Math.max(1, cfg.branches) : sign > 0 ? cfg.branches : 0;
    const connectors = new Set(wantsLoop ? [first, last] : []);
    for (let i = connectors.size; i < connectorCount; i++) connectors.add(Math.floor((i + 1) * count / (connectorCount + 1)));
    for (let i = 0; i < count;) {
      if (connectors.has(i)) {
        corridor('wing', 'Cross passage', xs[i], xs[i + 1], ...inner);
        if(!wantsLoop&&layout==='cross'&&i===Math.floor(count/2)){
          room(i,1,...band(hall/2+depth,hall/2+Math.round(depth*2.3)),true,'wing');
        }
        i++;
        continue;
      }
      const warehouseSpan = cfg.archetype==='warehouse' && i+2<count && !connectors.has(i+1) && !connectors.has(i+2) && i%3!==0;
      if(warehouseSpan){
        room(i,3,...inner,true);
        i+=3;
        continue;
      }
      const merge = i + 1 < count && !connectors.has(i + 1) && (i === 1 || random() < cfg.openness / 160);
      room(i, merge ? 2 : 1, ...inner, merge);
      i += merge ? 2 : 1;
    }
    if (wantsLoop) {
      const galleryStart = hall / 2 + depth;
      const galleryEnd = galleryStart + hall;
      corridor('loop', 'Outer gallery', xs[first], xs[last + 1], ...band(galleryStart, galleryEnd));
      const outer = band(galleryEnd, galleryEnd + Math.round(depth * .8));
      for (let i = first; i <= last;) {
        const span = i + 1 <= last && random() < .6 ? 2 : 1;
        room(i, span, ...outer, span === 2);
        i += span;
      }
    }
  }
  if(cfg.targetArea){
    const area = tiles.reduce((sum, tile) => sum + tile.area.bounds.w * tile.area.bounds.d, 0);
    const expansion = Math.max(.55, Math.min(3.2, cfg.targetArea / area));
    width *= expansion;
    for (const tile of tiles) {
      tile.x0 *= expansion;
      tile.x1 *= expansion;
      tile.area.bounds.x *= expansion;
      tile.area.bounds.w *= expansion;
      if(tile.room)tile.area.center.x = tile.area.bounds.x;
    }
  }
  segment.layout = layout;
  segment.anchors = { entry: point(Math.min(3, width / 4), 0), exit: point(width - Math.min(3, width / 4), 0), safeSpawn: point(Math.min(3, width / 4), 0) };
  segment.bounds = { minX: 0, maxX: width, minZ: Math.min(...tiles.map(t => t.z0)), maxZ: Math.max(...tiles.map(t => t.z1)) };
  segment.architecture = { entryRegionId: main.id, partitions: [] };
  const lines = new Map();
  const add = (axis, at, start, end, tile, side, positive) => {
    const key = `${axis}:${at}`;
    if (!lines.has(key)) lines.set(key, []);
    lines.get(key).push({ axis, at, start, end, tile, side, positive });
  };
  for (const tile of tiles) {
    const { x0, x1, z0, z1 } = tile;
    add('x', z0, x0, x1, tile, 'north', true);
    add('x', z1, x0, x1, tile, 'south', false);
    add('z', x0, z0, z1, tile, 'west', true);
    add('z', x1, z0, z1, tile, 'east', false);
  }
  // Split each collinear boundary at every adjoining tile endpoint. Each span has one owner.
  for (const edges of lines.values()) {
    const cuts = [...new Set(edges.flatMap(e => [e.start, e.end]))].sort((a, b) => a - b);
    for (let i = 1; i < cuts.length; i++) {
      const lo = cuts[i - 1], hi = cuts[i], mid = (lo + hi) / 2;
      const covering = edges.filter(e => e.start < mid && e.end > mid);
      if (!covering.length) continue;
      const first = covering.find(e => !e.positive), second = covering.find(e => e.positive);
      const { axis, at } = covering[0];
      const p = value => axis === 'x' ? point(value, at) : point(at, value);
      const wall = { id: `${segment.id}-wall-${segment.architecture.partitions.length + 1}`, a: p(lo), b: p(hi), regions: [first?.tile.id ?? null, second?.tile.id ?? null], opening: null };
      segment.architecture.partitions.push(wall);
      if (!first || !second) continue;
      const r = covering.find(e => e.tile.room);
      if (!r) {
        wall.opening = { type: 'open', position: p(mid), width: hi - lo, height: segment.architecturalHeight };
      } else if (!first.tile.room || !second.tile.room) {
        const adjacent = covering.find(e => !e.tile.room);
        const facingCirculation = ['main', 'loop', r.tile.entryFrom].includes(adjacent.tile.area.kind) && axis === 'x';
        if (!facingCirculation || r.tile.area.doorId) continue;
        const space = r.tile.area;
        const open = space.regionType === 'open_region' || random() * 100 < cfg.openness;
        const openingWidth = Math.min(hi - lo - .65, open ? Math.max(3, hall * .83) : 2.35);
        const door = {
          id: `${space.id}-door`, segmentId: segment.id, roomId: space.id, partitionId: wall.id,
          position: p(mid), side: r.side, width: openingWidth, height: open ? Math.min(4, segment.architecturalHeight) : 2.5,
          kind: 'standard', requires: [], state: open ? 'open' : 'closed', lockedInitially: false,
        };
        space.doorId = door.id;
        space.doorSide = r.side;
        wall.opening = { type: open ? 'open' : 'door', position: door.position, width: door.width, height: door.height, doorId: door.id };
        segment.doors.push(door);
      } else if (cfg.loops > 0 && covering.every(e => e.tile.area.regionType === 'open_region') && random() < .75) {
        wall.opening = { type: 'open', position: p(mid), width: Math.min(hi - lo - .65, hall), height: Math.min(4, segment.architecturalHeight) };
      }
    }
  }
  for (const space of segment.rooms) {
    const { x, z, w, d } = space.bounds;
    if (space.regionType !== 'open_region' || w < 22 || d < 15) continue;
    space.columns = [-1, 1].flatMap(dx => [-1, 1].map(dz => ({
      x: x + dx * w * .34, z: z + dz * d * .33, w: .85, d: .85,
    })));
  }
}

export function openingPassable(opening, door, opened) {
  return Boolean(opening && (!door || (door.state === 'open' && !door.requires.length) || opened.has(door.id)));
}

export function wallPieces(wall) {
  const { a, b, opening } = wall;
  if (!opening) return [[a, b]];
  const horizontal = a.z === b.z;
  const edge = offset => horizontal
    ? point(opening.position.x + offset, a.z)
    : point(a.x, opening.position.z + offset);
  return [[a, edge(-opening.width / 2)], [edge(opening.width / 2), b]]
    .filter(([p, q]) => Math.hypot(p.x - q.x, p.z - q.z) > .001);
}

export function moveThroughInterior(segment, from, to, opened) {
  const doors = new Map(segment.doors.map(door => [door.id, door]));
  for (const wall of segment.architecture.partitions) {
    const { a, b, opening } = wall;
    const horizontal = a.z === b.z;
    const normal = horizontal ? 'z' : 'x', tangent = horizontal ? 'x' : 'z';
    const delta = to[normal] - from[normal];
    if (delta === 0) continue;
    const t = (a[normal] - from[normal]) / delta;
    if (t < 0 || t > 1) continue;
    const at = from[tangent] + t * (to[tangent] - from[tangent]);
    if (at < a[tangent] - .001 || at > b[tangent] + .001) continue;
    const door = doors.get(opening?.doorId);
    const fullSpan = opening && !door && opening.width >= b[tangent] - a[tangent] - .001;
    if (!openingPassable(opening, door, opened) ||
        Math.abs(at - opening.position[tangent]) > opening.width / 2 - (fullSpan ? 0 : .23)) return false;
  }
  return true;
}
