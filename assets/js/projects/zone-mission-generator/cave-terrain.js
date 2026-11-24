import { insidePolygon } from './cave-geometry.js';

const MAX_GRID_CELLS = 12000;
const cache = new WeakMap();
const limit = (value, low, high) => Math.max(low, Math.min(high, value));
const round = value => Math.round(value * 1e7) / 1e7;
const mix = (a, b, amount) => a + (b - a) * amount;
export const CAVE_STYLES = {
  limestone: { rock: '#817b70', floor: '#77776b', roof: '#6e655e', vault: .75 },
  basalt: { rock: '#424652', floor: '#515362', roof: '#363846', vault: .58 },
  granite: { rock: '#76696a', floor: '#826f67', roof: '#665a59', vault: .66 },
  crystal: { rock: '#4a6375', floor: '#4b6b78', roof: '#384a68', vault: .82 },
};

export function tunnelPath(tunnel) {
  return tunnel.path || [tunnel.fromPosition, tunnel.toPosition];
}

function pointSegmentDistance(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = limit(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
  return Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
}

function primitives(segment, padding) {
  const shapes = [];
  const add = (points, radius, distance) => shapes.push({
    minX: Math.min(...points.map(p => p.x)) - radius - padding,
    maxX: Math.max(...points.map(p => p.x)) + radius + padding,
    minZ: Math.min(...points.map(p => p.z)) - radius - padding,
    maxZ: Math.max(...points.map(p => p.z)) + radius + padding,
    distance,
  });
  for (const room of segment.rooms) {
    const points = room.polygon;
    add(points, 0, (x, z) => {
      let distance = Infinity;
      for (let i = 0; i < points.length; i++) distance = Math.min(distance, pointSegmentDistance(x, z, points[i], points[(i + 1) % points.length]));
      return insidePolygon({ x, z }, points) ? distance : -distance;
    });
  }
  for (const tunnel of segment.tunnels) {
    const path = tunnelPath(tunnel);
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], half = tunnel.width / 2;
      add([a, b], half, (x, z) => half - pointSegmentDistance(x, z, a, b));
    }
  }
  return shapes;
}

function extents(shapes) {
  const x = Math.min(...shapes.map(shape => shape.minX));
  const z = Math.min(...shapes.map(shape => shape.minZ));
  return { x, z, width: Math.max(...shapes.map(shape => shape.maxX)) - x,
    depth: Math.max(...shapes.map(shape => shape.maxZ)) - z };
}

export function generateCaveTerrain(segment, config, random) {
  const style = CAVE_STYLES[config.caveStyle];
  const variation = config.caveRoughness / 100;
  const phases = Array.from({ length: 7 }, () => random() * Math.PI * 2);
  const relief = config.caveElevation;
  const wavelength = Math.max(60, relief * 8 / config.caveMaxSlope);
  const wave = (x, z, frequency, index) => Math.sin(x * frequency + z * frequency * .58 + phases[index]);
  const baseFloor = (x, z) => relief * (
    .56 * wave(x, z, 2 * Math.PI / wavelength, 0) +
    .27 * wave(-z, x, 3 / wavelength, 1) +
    .10 * variation * wave(z, x, 9 / wavelength, 2)
  );
  const distortion = (x, z) => variation * (
    1.8 * wave(x, -z, .14, 3) + .75 * wave(z, x, .39, 4)
  );
  const initial = extents(primitives(segment, 4));
  const minWidth = Math.min(...segment.tunnels.map(tunnel => tunnel.width));
  const edgeAllowance = variation * 5.1;
  const preferredStep = Math.min(config.caveTriangleSize, Math.max(1, (minWidth - edgeAllowance) / 2.9));
  const step = Math.max(preferredStep, Math.sqrt(initial.width * initial.depth / (MAX_GRID_CELLS - 600)), initial.width / 440, initial.depth / 440);
  let widenedTunnels = 0;
  for (const tunnel of segment.tunnels) {
    const resolvedWidth = round(step * 2.9 + edgeAllowance);
    if (tunnel.width >= resolvedWidth - .001) continue;
    tunnel.requestedWidth = tunnel.width;
    tunnel.width = resolvedWidth;
    widenedTunnels++;
  }
  const bounds = primitives(segment, 4);
  const { x, z, width, depth } = extents(bounds);
  const columns = Math.ceil(width / step), rows = Math.ceil(depth / step), stride = columns + 1;
  const routes = routeSpans(segment);
  const landforms = [];
  for (const room of segment.rooms) {
    if (random() * 100 >= config.caveLandforms) continue;
    const chamber = room.radius || 9;
    const radius = chamber * (.16 + random() * .10);
    if (radius < step * 1.1) continue;
    const phase = random() * Math.PI * 2;
    for (let i = 0; i < 6; i++) {
      const angle = phase + i * Math.PI / 3;
      const p = { x: room.center.x + Math.cos(angle) * chamber * .61, z: room.center.z + Math.sin(angle) * chamber * .61 };
      if (!insidePolygon(p, room.polygon) || routes.some(path => pointSegmentDistance(p.x, p.z, path.a, path.b) < radius + Math.max(path.width * .28, step * 1.8)) ||
          segment.rooms.some(other => Math.hypot(p.x - other.center.x, p.z - other.center.z) < radius + step * 1.75) ||
          landforms.some(feature => Math.hypot(p.x - feature.x, p.z - feature.z) < radius + feature.radius)) continue;
      const basin = random() < .48;
      const amplitude = (basin ? -1 : 1) * radius * (.32 + variation * .6);
      landforms.push({ x: round(p.x), z: round(p.z), radius: round(radius), amplitude: round(amplitude), kind: basin ? 'basin' : 'ridge' });
      break;
    }
  }
  const descent = Math.min(config.caveDescent, width * config.caveMaxSlope * .55);
  const originX = x;
  const floor = (x, z) => {
    let height = baseFloor(x,z) * (descent ? .48 : 1) - descent * (x - originX) / width;
    for (const form of landforms) {
      const distance = Math.hypot(x - form.x, z - form.z) / form.radius;
      if (distance < 1) height += form.amplitude * (1 - distance * distance) ** 2;
    }
    return height;
  };
  const values = new Float64Array(stride * (rows + 1)).fill(-6);
  for (const shape of bounds) {
    const left = limit(Math.floor((shape.minX - x) / step), 0, columns);
    const right = limit(Math.ceil((shape.maxX - x) / step), 0, columns);
    const top = limit(Math.floor((shape.minZ - z) / step), 0, rows);
    const bottom = limit(Math.ceil((shape.maxZ - z) / step), 0, rows);
    for (let row = top; row <= bottom; row++) for (let col = left; col <= right; col++) {
      const index = row * stride + col;
      values[index] = Math.max(values[index], shape.distance(x + col * step, z + row * step));
    }
  }
  for (let index = 0; index < values.length; index++) {
    values[index] += distortion(x + index % stride * step, z + Math.floor(index / stride) * step);
    if (Math.abs(values[index]) < 1e-5) values[index] = values[index] < 0 ? -1e-5 : 1e-5;
  }

  const vertices = [], heights = [], indices = [], vertexIds = new Map();
  const edges = new Map();
  const ceilingAt = (x, z, inward) => {
    const vault = Math.max(0, inward) * style.vault;
    return config.caveClearance + Math.min(config.caveVault, vault + config.caveVault * (.13 + .09 * wave(z, -x, .071, 5)));
  };
  const vertex = (a, b = a) => {
    if (a > b) [a, b] = [b, a];
    const key = a * values.length + b;
    if (vertexIds.has(key)) return vertexIds.get(key);
    const t = a === b ? 0 : values[a] / (values[a] - values[b]);
    const wx = round(x + mix(a % stride, b % stride, t) * step);
    const wz = round(z + mix(Math.floor(a / stride), Math.floor(b / stride), t) * step);
    const y = round(floor(wx, wz)), id = vertices.length / 3;
    vertices.push(wx, y, wz);
    heights.push(round(y + ceilingAt(wx, wz, a === b ? values[a] : 0)));
    vertexIds.set(key, id);
    return id;
  };
  const triangle = (a, b, c) => {
    const polygon = [];
    for (const [u, v] of [[a, b], [b, c], [c, a]]) {
      if (values[u] > 0) polygon.push(vertex(u));
      if ((values[u] > 0) !== (values[v] > 0)) polygon.push(vertex(u, v));
    }
    for (let i = 1; i + 1 < polygon.length; i++) {
      const u = polygon[0], v = polygon[i], w = polygon[i + 1];
      indices.push(u, v, w);
      for (const [start, end] of [[u, v], [v, w], [w, u]]) {
        const key = Math.min(start, end) + ':' + Math.max(start, end);
        if (edges.has(key)) edges.delete(key);
        else edges.set(key, [start, end]);
      }
    }
  };
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const a = row * stride + col, b = a + 1, c = a + stride, d = c + 1;
    if ((row + col) % 2) {
      triangle(a, c, b);
      triangle(c, d, b);
    } else {
      triangle(a, c, d);
      triangle(a, d, b);
    }
  }
  const roof = vertices.map((value, index) => index % 3 === 1 ? heights[Math.floor(index / 3)] : value);
  const boundary = [...edges.values()];
  const normals = new Map();
  for (const [a, b] of boundary) {
    const dx = vertices[b * 3] - vertices[a * 3], dz = vertices[b * 3 + 2] - vertices[a * 3 + 2];
    const length = Math.hypot(dx, dz) || 1;
    for (const id of [a, b]) {
      if (!normals.has(id)) normals.set(id, [0, 0]);
      const normal = normals.get(id);
      normal[0] -= dz / length;
      normal[1] += dx / length;
    }
  }
  const walls = { vertices: [], indices: [] }, wallIds = new Map();
  for (const [id, [nx, nz]] of normals) {
    const start = walls.vertices.length / 3, offset = id * 3;
    const wx = vertices[offset], wy = vertices[offset + 1], wz = vertices[offset + 2];
    const magnitude = Math.hypot(nx, nz) || 1;
    wallIds.set(id, start);
    for (const fraction of [0, .31, .68, 1]) {
      const flare = fraction === 0 || fraction === 1 ? 0 :
        Math.max(-Math.min(1.65,(heights[id]-wy)*.16),config.caveOverhang * (.2 + .8 * wave(wx, wz, .21 + fraction * .12, 6)));
      walls.vertices.push(round(wx + nx / magnitude * flare), round(mix(wy, heights[id], fraction)), round(wz + nz / magnitude * flare));
    }
  }
  for (const [a, b] of boundary) {
    const u = wallIds.get(a), v = wallIds.get(b);
    for (let j = 0; j < 3; j++) walls.indices.push(u + j, u + j + 1, v + j, v + j, u + j + 1, v + j + 1);
  }
  const roofIndices = indices.slice();
  for (let i = 0; i < roofIndices.length; i += 3) [roofIndices[i + 1], roofIndices[i + 2]] = [roofIndices[i + 2], roofIndices[i + 1]];
  const terrain = {
    version: 1, style: config.caveStyle, grid: { x, z, step, columns, rows },
    floor: { vertices, indices }, walls, ceiling: { vertices: roof, indices: roofIndices }, boundary,
    navigation: { maxSlope: config.caveMaxSlope, minClearance: config.caveClearance, steepTriangles: [] },
    formations: [], landforms,
  };
  const elevations = heights.reduce((range, _, i) => {
    range.min = Math.min(range.min, vertices[i * 3 + 1]);
    range.max = Math.max(range.max, vertices[i * 3 + 1]);
    range.roof = Math.max(range.roof, heights[i]);
    return range;
  }, { min: Infinity, max: -Infinity, roof: -Infinity });
  terrain.stats = { elevationMin: elevations.min, elevationMax: elevations.max, roofMax: elevations.roof,
    triangles: (indices.length * 2 + walls.indices.length) / 3, widenedTunnels };
  let area = 0, walkableArea = 0, steepestGrade = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
    const dx = vertices[b]-vertices[a], dz = vertices[b+2]-vertices[a+2], dy = vertices[b+1]-vertices[a+1];
    const ex = vertices[c]-vertices[a], ez = vertices[c+2]-vertices[a+2], ey = vertices[c+1]-vertices[a+1];
    const det = Math.abs(dx*ez-ex*dz);
    const slope = det > 1e-10 ? Math.hypot(dy*ez-ey*dz,dx*ey-ex*dy)/det : 0;
    area += det/2;
    steepestGrade = Math.max(steepestGrade,slope);
    if (slope <= config.caveMaxSlope+.015) walkableArea += det/2;
    else terrain.navigation.steepTriangles.push(i / 3);
  }
  terrain.stats.area = round(area);
  terrain.stats.walkableArea = round(walkableArea);
  terrain.stats.steepestGrade = round(steepestGrade);
  if(config.cavePools)terrain.water = createBasinPools(terrain);
  placeFormations(segment, terrain, config, random);
  return terrain;
}

function createBasinPools(terrain) {
  const water = { vertices: [], indices: [] };
  const { vertices, indices } = terrain.floor;
  for (const basin of terrain.landforms) {
    if (basin.kind !== 'basin') continue;
    const center = sampleTerrain(terrain, basin);
    if (!center) continue;
    const rim = Array.from({ length: 20 }, (_, i) => {
      const angle = i * Math.PI / 10;
      return sampleTerrain(terrain, { x: basin.x + Math.cos(angle) * basin.radius, z: basin.z + Math.sin(angle) * basin.radius })?.y;
    });
    if (rim.some(y => y === undefined)) continue;
    const level = Math.min(center.y + Math.min(1.4, -basin.amplitude * .37), Math.min(...rim) - .15);
    if (level < center.y + .15) continue;
    let added = false;
    for (let i = 0; i < indices.length; i += 3) {
      const triangle = indices.slice(i, i + 3).map(id => ({ x: vertices[id * 3], y: vertices[id * 3 + 1], z: vertices[id * 3 + 2] }));
      if (triangle.every(point => Math.hypot(point.x - basin.x, point.z - basin.z) > basin.radius)) continue;
      const submerged = triangle.map(point => point.y < level && Math.hypot(point.x - basin.x, point.z - basin.z) <= basin.radius);
      const polygon = [];
      for (let j = 0; j < 3; j++) {
        const k = (j + 1) % 3, a = triangle[j], b = triangle[k];
        if (submerged[j]) polygon.push(a);
        if (submerged[j] !== submerged[k] && (a.y < level) !== (b.y < level)) {
          const amount = (level - a.y) / (b.y - a.y);
          const p = { x: mix(a.x, b.x, amount), z: mix(a.z, b.z, amount) };
          if (Math.hypot(p.x - basin.x, p.z - basin.z) <= basin.radius) polygon.push(p);
        }
      }
      if (polygon.length < 3) continue;
      const start = water.vertices.length / 3;
      for (const p of polygon) water.vertices.push(round(p.x), round(level), round(p.z));
      for (let j = 1; j + 1 < polygon.length; j++) water.indices.push(start, start + j, start + j + 1);
      added = true;
    }
    if(added)basin.waterLevel = round(level);
  }
  return water;
}

function routeSpans(segment) {
  return segment.tunnels.flatMap(tunnel => {
    const points = tunnelPath(tunnel);
    return points.slice(1).map((b, i) => ({ a: points[i], b, width: tunnel.width }));
  });
}

function placeFormations(segment, terrain, config, random) {
  const paths = routeSpans(segment);
  const kinds = config.caveStyle === 'crystal'
    ? ['crystal', 'pillar', 'crystal', 'stalactite']
    : ['boulder', 'pillar', 'stalagmite', 'stalactite'];
  for (const room of segment.rooms) {
    const roomRadius = room.radius || 12;
    const count = Math.round(config.caveFormations / 100 * Math.min(8, roomRadius / 3));
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2, distance = roomRadius * (.40 + random() * .30);
      const position = { x: round(room.center.x + Math.cos(angle) * distance), z: round(room.center.z + Math.sin(angle) * distance) };
      const radius = round(Math.max(.6, roomRadius * (.05 + random() * .09)));
      const center = sampleTerrain(terrain, position);
      if (!center || sampleTerrain(terrain, { x: position.x + radius, z: position.z }) === null ||
          paths.some(path => pointSegmentDistance(position.x, position.z, path.a, path.b) < path.width * .36 + radius + .8) ||
          terrain.formations.some(feature => Math.hypot(feature.position.x - position.x, feature.position.z - position.z) < feature.radius + radius + .8)) continue;
      const kind = kinds[Math.floor(random() * kinds.length)];
      const height = kind === 'pillar' ? center.clearance :
        Math.min(center.clearance * .42, radius * (kind === 'boulder' ? 1.25 : 2.8));
      terrain.formations.push({
        id: room.id + '-rock-' + i, roomId: room.id, kind, radius, height: round(height), phase: round(angle),
        position: { ...position, y: round(kind === 'stalactite' ? center.y + center.clearance : center.y) },
        collidable: kind !== 'stalactite',
      });
    }
  }
}

function terrainTiles(terrain) {
  if (cache.has(terrain)) return cache.get(terrain);
  const { grid, floor: { indices, vertices } } = terrain;
  const tiles = Array.from({ length: grid.columns * grid.rows }, () => []);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
    const col = Math.floor(((vertices[a] + vertices[b] + vertices[c]) / 3 - grid.x) / grid.step);
    const row = Math.floor(((vertices[a + 2] + vertices[b + 2] + vertices[c + 2]) / 3 - grid.z) / grid.step);
    tiles[row * grid.columns + col]?.push(i);
  }
  cache.set(terrain, tiles);
  return tiles;
}

export function sampleTerrain(terrain, point) {
  if (!terrain) return null;
  const { grid, floor: { indices, vertices }, ceiling } = terrain;
  const col = Math.floor((point.x - grid.x) / grid.step), row = Math.floor((point.z - grid.z) / grid.step);
  if (col < 0 || row < 0 || col >= grid.columns || row >= grid.rows) return null;
  const tiles = terrainTiles(terrain);
  for (const i of tiles[row * grid.columns + col]) {
    const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
    const dx = vertices[b] - vertices[a], dz = vertices[b + 2] - vertices[a + 2];
    const ex = vertices[c] - vertices[a], ez = vertices[c + 2] - vertices[a + 2];
    const x = point.x - vertices[a], z = point.z - vertices[a + 2], det = dx * ez - dz * ex;
    if (Math.abs(det) < 1e-10) continue;
    const v = (x * ez - z * ex) / det, w = (dx * z - dz * x) / det, u = 1 - v - w;
    if (Math.min(u, v, w) < -1e-6) continue;
    const y = u * vertices[a + 1] + v * vertices[b + 1] + w * vertices[c + 1];
    const roof = u * ceiling.vertices[a + 1] + v * ceiling.vertices[b + 1] + w * ceiling.vertices[c + 1];
    const dy = vertices[b + 1] - vertices[a + 1], ey = vertices[c + 1] - vertices[a + 1];
    const slope = Math.hypot(dy * ez - ey * dz, dx * ey - ex * dy) / Math.abs(det);
    return { y, clearance: roof - y, slope };
  }
  return null;
}

export function terrainPosition(segment, position) {
  const sample = sampleTerrain(segment.terrain, position);
  return sample ? { ...position, y: round(sample.y) } : { ...position };
}

export function terrainBoundary(terrain) {
  const data = terrain.floor.vertices;
  return terrain.boundary.map(edge => edge.map(index => ({
    x: data[index * 3], y: data[index * 3 + 1], z: data[index * 3 + 2],
  })));
}

export function canCrossTerrain(terrain, a, b) {
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  if (terrain.formations.some(feature => feature.collidable &&
      pointSegmentDistance(feature.position.x, feature.position.z, a, b) < feature.radius + .28)) return false;
  const samples = Math.max(1, Math.ceil(length / Math.min(1, terrain.grid.step / 3)));
  for (let i = 0; i <= samples; i++) {
    const point = { x: mix(a.x, b.x, i / samples), z: mix(a.z, b.z, i / samples) };
    const center = sampleTerrain(terrain, point);
    if (!center || center.slope > terrain.navigation.maxSlope + .015 || center.clearance < terrain.navigation.minClearance - .001) return false;
  }
  return true;
}

export function checkCaveTerrain(terrain) {
  const { grid, floor, walls, ceiling, navigation, boundary, formations, stats, water } = terrain;
  const validSurface = surface => {
    if (!Array.isArray(surface?.vertices) || !Array.isArray(surface?.indices) ||
        surface.vertices.length > 900000 || surface.indices.length > 1500000 || surface.vertices.length % 3 ||
        surface.indices.length % 3 || !surface.vertices.every(value => Number.isFinite(value) && Math.abs(value) < 100000)) return false;
    return surface.indices.every(index => Number.isInteger(index) && index >= 0 && index < surface.vertices.length / 3);
  };
  if (terrain.version !== 1 || !grid || ![grid.x,grid.z,grid.step].every(Number.isFinite) || grid.step <= 0 ||
      ![grid.columns,grid.rows].every(n => Number.isInteger(n) && n > 0 && n <= 512) ||
      !validSurface(floor) || !validSurface(walls) || !validSurface(ceiling) || (water && !validSurface(water)) ||
      floor.indices.length === 0 || floor.vertices.length !== ceiling.vertices.length ||
      !Array.isArray(boundary) || !Array.isArray(formations) || !stats || !navigation ||
      !Number.isFinite(navigation.maxSlope) || !Number.isFinite(navigation.minClearance)) return false;
  for (let i = 0; i < floor.vertices.length; i += 3) {
    if (floor.vertices[i] !== ceiling.vertices[i] || floor.vertices[i+2] !== ceiling.vertices[i+2] ||
        ceiling.vertices[i+1]<floor.vertices[i+1]) return false;
  }
  return boundary.every(edge => Array.isArray(edge) && edge.length === 2 &&
    edge.every(index => Number.isInteger(index) && index>=0 && index<floor.vertices.length/3)) &&
    formations.every(feature => Number.isFinite(feature?.radius) && feature.radius>0 &&
      Number.isFinite(feature.height) && ['x','y','z'].every(axis => Number.isFinite(feature.position?.[axis])));
}
