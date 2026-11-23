import { infraVec3Add, infraVec3Cross, infraVec3Lerp, infraVec3Scale } from '../utils.js';
import { geoPrimAddBeamBetween, geoPrimAddTrussPanel, geoPrimGuardCollisionBox } from './primitives.js';

export const INFRA_STATION_ARCHITECTURE = {
  industrial_open: { width: 3.55, cover: 0.72, roof: 'corrugated', glass: 0, stairs: 'open', seating: 2 },
  neighborhood_commuter: { width: 3.85, cover: 0.82, roof: 'pitched', glass: 0.55, stairs: 'covered', seating: 3 },
  metropolitan_enclosed: { width: 4.15, cover: 0.96, roof: 'glazed', glass: 1, stairs: 'enclosed', seating: 4 }
};

const STATION_UP = [0, 1, 0];

export function geoStationFrameAt(frames, distance) {
  const next = frames.findIndex((frame) => frame.s >= distance);
  if (next <= 0) return next === 0 ? frames[0] : frames.at(-1);
  const a = frames[next - 1];
  const b = frames[next];
  const t = (distance - a.s) / (b.s - a.s);
  return { ...b, s: distance, position: infraVec3Lerp(a.position, b.position, t) };
}

export function geoStationPoint(frame, x, y, along = 0) {
  return infraVec3Add(infraVec3Add(frame.position, infraVec3Scale(frame.right, x)),
    infraVec3Add([0, y, 0], infraVec3Scale(frame.tangent, along)));
}

function stationBox(batcher, frame, x, y, along, width, height, depth, materialKey, surfaceStratum = 'station_detail') {
  const horizontal = [frame.tangent[0], 0, frame.tangent[2]];
  batcher.addBoxOriented(geoStationPoint(frame, x, y, along), horizontal, infraVec3Cross(STATION_UP, horizontal),
    STATION_UP, width, height, depth, { materialKey, surfaceStratum });
}

function stationMember(batcher, a, b, width, height, materialKey = 'steel_structure') {
  geoPrimAddBeamBetween(batcher, a, b, width, height, { materialKey, surfaceStratum: 'station_frame' });
}

function stationGlass(batcher, a, b, c, d) {
  batcher.addQuad(a, b, c, d, { materialKey: 'glass_station', surfaceStratum: 'station_enclosure' });
}

export function geoBuildStationPlatformArchitecture(batcher, frames, options) {
  const { side, inner, outer, deck, from, to, openings, style, cover, glass, roof, seating, lighting, detail } = options;
  const frameAt = (s) => geoStationFrameAt(frames, s);
  const at = (s, x, h) => geoStationPoint(frameAt(s), x, deck + h);
  const guards = [];
  const surfaces = [];
  const signs = [];
  const guard = (a, b) => {
    guards.push(geoPrimGuardCollisionBox(a, b, 1.12));
    for (const [height, size] of [[0.48, 0.045], [1.08, 0.075]]) {
      stationMember(batcher, infraVec3Add(a, [0, height, 0]), infraVec3Add(b, [0, height, 0]), size, size,
        height > 1 ? 'steel_accent' : 'steel_structure');
    }
    for (const fraction of [0.03, 0.52, 0.97]) {
      const post = infraVec3Lerp(a, b, fraction);
      stationMember(batcher, post, infraVec3Add(post, [0, 1.1, 0]), 0.075, 0.075);
    }
  };
  for (const s of [from, to]) guard(at(s, inner + side * 0.42, 0), at(s, outer, 0));
  const cuts = [...new Set([from, to, ...frames.filter((f) => f.s > from && f.s < to).map((f) => f.s),
    ...openings.flatMap(([a, b]) => [Math.max(from, a), Math.min(to, b)])])].sort((a, b) => a - b);
  const roofStart = from + (to - from) * (1 - cover) / 2;
  const roofEnd = to - (to - from) * (1 - cover) / 2;
  const back = outer - side * 0.08;
  for (let i = 0; i + 1 < cuts.length; i++) {
    const a = cuts[i], b = cuts[i + 1], middle = (a + b) / 2;
    if (b - a < 0.04 || middle < from || middle > to) continue;
    stationMember(batcher, at(a, outer - side * 0.1, -0.36), at(b, outer - side * 0.1, -0.36), 0.19, 0.39);
    stationMember(batcher, at(a, inner + side * 0.12, -0.31), at(b, inner + side * 0.12, -0.31), 0.14, 0.26);
    if (openings.some(([lo, hi]) => middle > lo && middle < hi)) continue;
    guard(at(a, back, 0), at(b, back, 0));
    if (middle > roofStart && middle < roofEnd && glass > 0 && (i % 5 < Math.ceil(glass * 5))) {
      stationGlass(batcher, at(a, back, 0.67), at(b, back, 0.67), at(b, back, 2.93), at(a, back, 2.93));
      guards.push(geoPrimGuardCollisionBox(at(a, back, 0), at(b, back, 0), 2.93));
    }
  }

  const pass = Math.abs(outer - inner);
  const canopyInner = inner + side * 0.32;
  const cathedral = style === 'metropolitan_enclosed';
  const outerHeight = cathedral ? 4.25 : 3.20;
  const ridge = outerHeight + (roof === 'pitched' || roof === 'glazed' ? 0.68 : 0.15);
  const roofCuts = [roofStart, ...frames.filter((f) => f.s > roofStart && f.s < roofEnd).map((f) => f.s), roofEnd];
  for (let i = 0; i + 1 < roofCuts.length; i++) {
    const a = roofCuts[i], b = roofCuts[i + 1];
    const middle = (canopyInner + outer) / 2;
    const elevation = (x) => ridge - Math.abs((x - middle) / (outer - middle)) * (ridge - outerHeight);
    // Detailed stepped roof-slope colliders following the actual canopy pitch & ridge
    const roofColliderSlices = (roof === 'pitched' || roof === 'glazed') ? 6 : 4;
    for (let sIdx = 0; sIdx < roofColliderSlices; sIdx++) {
      const sx0 = canopyInner + (outer - canopyInner) * (sIdx / roofColliderSlices);
      const sx1 = canopyInner + (outer - canopyInner) * ((sIdx + 1) / roofColliderSlices);
      const sy0 = elevation(sx0);
      const sy1 = elevation(sx1);
      const slicePts = [at(a, sx0, sy0), at(a, sx1, sy1), at(b, sx0, sy0), at(b, sx1, sy1)];
      surfaces.push([
        Math.min(...slicePts.map((p) => p[0])),
        Math.min(...slicePts.map((p) => p[1])) - 0.11,
        Math.min(...slicePts.map((p) => p[2])),
        Math.max(...slicePts.map((p) => p[0])),
        Math.max(...slicePts.map((p) => p[1])) + 0.03,
        Math.max(...slicePts.map((p) => p[2]))
      ]);
    }
    const panels = roof === 'corrugated' ? 8 : 2;
    for (let j = 0; j < panels; j++) {
      const x0 = canopyInner + (outer - canopyInner) * j / panels;
      const x1 = canopyInner + (outer - canopyInner) * (j + 1) / panels;
      const y0 = elevation(x0) + (roof === 'corrugated' && j % 2 ? 0.09 : 0);
      const y1 = elevation(x1);
      const corners = [at(a, x0, y0), at(a, x1, y1), at(b, x1, y1), at(b, x0, y0)];
      const ordered = side > 0 ? corners : corners.slice().reverse();
      const glazed = roof === 'glazed' && i % 4 !== 0;
      batcher.addQuad(...ordered, { materialKey: glazed ? 'glass_station' : 'steel_structure',
        surfaceStratum: 'station_roof', expectUpwardNormals: true });
      if (!glazed) {
        const soffit = ordered.slice().reverse().map((p) => infraVec3Add(p, [0, -0.085, 0]));
        batcher.addQuad(...soffit, { materialKey: 'steel_grating', surfaceStratum: 'station_soffit' });
      }
    }
    stationMember(batcher, at(a, outer + side * 0.03, outerHeight - 0.07),
      at(b, outer + side * 0.03, outerHeight - 0.07), 0.18, 0.13, 'steel_grating');
    if (i % 2 === 0 && !openings.some(([lo, hi]) => a > lo - 0.4 && a < hi + 0.4)) {
      const column = outer - side * 0.20;
      stationMember(batcher, at(a, column, -0.35), at(a, column, outerHeight), 0.19, 0.25);
      stationBox(batcher, frameAt(a), column, deck + 0.025, 0, 0.33, 0.05, 0.36, 'rail_steel');
      guards.push(geoPrimGuardCollisionBox(at(a - 0.10, column, 0), at(a + 0.10, column, 0), outerHeight));
      geoPrimAddTrussPanel(batcher, at(a, column, outerHeight - 0.38), at(a, column, outerHeight),
        at(a, canopyInner, outerHeight), at(a, canopyInner, outerHeight - 0.38), 0.095);
      stationMember(batcher, at(a, outer - side * pass * 0.3, outerHeight - 0.42),
        at(a, outer - side * pass * 0.73, outerHeight - 0.42), 0.12, 0.09, 'station_lamp');
      if (lighting > 1) stationBox(batcher, frameAt(a), column, deck + 1.9, 0.12, 0.12, 0.22, 0.3, 'station_lamp');
    }
  }
  for (const s of [roofStart, roofEnd]) {
    if (openings.some(([a, b]) => s > a - 0.25 && s < b + 0.25)) continue;
    stationMember(batcher, at(s, back, -0.42), at(s, back, outerHeight), 0.23, 0.27);
    stationMember(batcher, at(s, back, -0.8), at(s, inner + side * 0.3, -0.29), 0.20, 0.24);
    stationMember(batcher, at(s, back, 0), at(s, back, outerHeight - 0.1), 0.095, 0.08, 'rail_steel');
  }

  const slots = frames.filter((f) => f.s > roofStart + 0.8 && f.s < roofEnd - 0.8 &&
    !openings.some(([a, b]) => f.s > a - 1.35 && f.s < b + 1.35));
  const assetWall = outer - side * 0.40;
  for (let i = 0; i < seating && slots.length; i++) {
    const frame = slots[Math.floor((i + 0.5) * slots.length / seating)];
    stationBox(batcher, frame, assetWall, deck + 0.45, 0, 0.54, 0.10, 1.56, style === 'industrial_open' ? 'steel_grating' : 'sleeper_wood');
    stationBox(batcher, frame, assetWall + side * 0.19, deck + 0.72, 0, 0.10, 0.40, 1.56, 'steel_structure');
    for (const end of [-0.54, 0.54]) stationBox(batcher, frame, assetWall, deck + 0.21, end, 0.26, 0.41, 0.12, 'steel_structure');
    guards.push(geoPrimGuardCollisionBox(geoStationPoint(frame, assetWall, deck, -0.78),
      geoStationPoint(frame, assetWall, deck, 0.78), 0.94));
    if (detail > 0) {
      stationBox(batcher, frame, assetWall, deck + 1.45, 0, 0.14, 0.53, 1.23, 'steel_structure');
      signs.push({ position: geoStationPoint(frame, assetWall - side * 0.086, deck + 1.45), along: frame.tangent, text: i % 2 ? ' departures ' : ' route map ', width: 1.16, height: 0.44 });
    }
  }
  const furnishingSlots = slots.filter((_, i) => i % 3 === 0 &&
    Array.from({ length: seating }, (_, seat) => slots[Math.floor((seat + 0.5) * slots.length / seating)])
      .every((seat) => Math.abs(seat.s - slots[i].s) > 1.35));
  for (const [i, frame] of furnishingSlots.slice(0, detail + 1).entries()) {
    if (!detail) break;
    const ticket = i === 0;
    const height = ticket ? 1.48 : 0.75;
    const material = ticket ? 'steel_structure' : i % 2 ? 'glass_station' : 'steel_grating';
    stationBox(batcher, frame, assetWall, deck + height / 2, 0, 0.48, height, 0.43, material);
    stationBox(batcher, frame, assetWall - side * 0.25, deck + height * 0.82, 0, 0.035, 0.15, 0.27, ticket ? 'station_lamp' : 'steel_accent');
    guards.push(geoPrimGuardCollisionBox(geoStationPoint(frame, assetWall, deck, -0.25),
      geoStationPoint(frame, assetWall, deck, 0.25), height));
    if (ticket) signs.push({ position: geoStationPoint(frame, assetWall - side * 0.29, deck + 1.06),
      along: frame.tangent, text: 'TICKETS', width: 0.34, height: 0.15 });
  }
  const entry = frameAt((from + to) / 2);
  stationBox(batcher, entry, (outer + inner) / 2, deck + 2.51, 0, 2.15, 0.45, 0.14, 'steel_structure');
  signs.push({ position: geoStationPoint(entry, (outer + inner) / 2, deck + 2.51, -0.082),
    along: entry.right, text: `PLATFORM ${side < 0 ? '1' : '2'}`, width: 2.0, height: 0.40 });
  if (detail) {
    stationBox(batcher, entry, back, deck + 2.35, 0.50, 0.23, 0.31, 0.24, 'steel_grating');
    stationBox(batcher, entry, back - side * 0.21, deck + 2.57, -0.48, 0.32, 0.10, 0.16, 'rail_steel');
    stationMember(batcher, at(roofStart, back, 2.64), at(roofEnd, back, 2.64), 0.045, 0.095, 'rail_steel');
  }
  return { guards, surfaces, signs };
}

export function geoBuildStationLift(batcher, frame, side, outside, platformEdge, deck, style) {
  const rise = frame.position[1] + deck;
  const landingY = 0.095;
  const half = 0.79;
  const inside = outside - side * half;
  const edge = outside + side * half;
  const point = (x, height, s = 0) => geoStationPoint(frame, x, height - frame.position[1], s);
  const walk = [];
  const guards = [];
  for (const h of [landingY, rise]) {
    const inner = h === rise ? platformEdge : inside;
    const width = Math.abs(inner - edge);
    stationBox(batcher, frame, (inner + edge) / 2, h - frame.position[1] - 0.1, 0, width, 0.2, 2 * half, 'steel_grating');
    const corners = [point(inner, h, -half), point(edge, h, -half), point(inner, h, half), point(edge, h, half)];
    walk.push([Math.min(...corners.map(p => p[0])), h - 0.2, Math.min(...corners.map(p => p[2])),
      Math.max(...corners.map(p => p[0])), h, Math.max(...corners.map(p => p[2]))]);
    for (const z of [-half, half]) {
      if (h === rise) {
        stationMember(batcher, point(inner, h + 1.05, z), point(edge, h + 1.05, z), 0.055, 0.075, 'steel_accent');
        guards.push(geoPrimGuardCollisionBox(point(inner, h, z), point(edge, h, z)));
      }
      stationBox(batcher, frame, outside, h - frame.position[1] + 1.05, z, 0.10, 0.27, 0.10, 'station_lamp');
    }
  }
  const top = rise + 2.85;
  for (const x of [inside, edge]) for (const z of [-half, half]) {
    stationMember(batcher, point(x, 0, z), point(x, top, z), 0.14, 0.17);
  }
  for (const z of [-half, half]) {
    const panel = [point(inside, 0.18, z), point(edge, 0.18, z), point(edge, top, z), point(inside, top, z)];
    if (style === 'industrial_open') stationBox(batcher, frame, outside, top / 2 - frame.position[1], z, 2 * half, top, 0.10, 'steel_structure');
    else stationGlass(batcher, ...panel);
    guards.push(geoPrimGuardCollisionBox(point(inside, 0.12, z), point(edge, 0.12, z), top));
  }
  // Keep the street-side entrance and platform-side landing physically open at their levels.
  for (const [x, low, high] of [[inside, 0, rise - 0.2], [edge, 2.35, top]]) {
    stationBox(batcher, frame, x, (low + high) / 2 - frame.position[1], 0, 0.10, high - low, 2 * half, 'steel_structure');
    guards.push(geoPrimGuardCollisionBox(point(x, low, -half), point(x, low, half), high - low));
  }
  stationBox(batcher, frame, outside, top - frame.position[1], 0, 1.85, 0.24, 1.82, 'steel_structure');
  const liftRoofPts = [
    point(outside - 0.925, top, -0.91),
    point(outside + 0.925, top, -0.91),
    point(outside - 0.925, top, 0.91),
    point(outside + 0.925, top, 0.91)
  ];
  walk.push([
    Math.min(...liftRoofPts.map((pt) => pt[0])),
    top - 0.12,
    Math.min(...liftRoofPts.map((pt) => pt[2])),
    Math.max(...liftRoofPts.map((pt) => pt[0])),
    top + 0.12,
    Math.max(...liftRoofPts.map((pt) => pt[2]))
  ]);
  return { walk, guards, entrance: point(outside, landingY, 0), landing: point(outside, rise, 0),
    signs: [
      { position: point(edge + side * 0.10, 2.16), along: frame.tangent, text: 'LIFT • PLATFORM', width: 1.52, height: 0.32 },
      { position: point(inside - side * 0.10, rise + 2.30), along: frame.tangent, text: 'LIFT • STREET', width: 1.52, height: 0.32 }
    ] };
}

export function geoBuildStationStairCover(batcher, frame, outside, side, flightDepth, rise, style, lamps, title) {
  const p = (x, y, z) => geoStationPoint(frame, side * x + outside, y - frame.position[1], z);
  const guards = [];
  const signs = [{ position: p(0, 2.69, -1.52), along: frame.right, text: title, width: 2.85, height: 0.40 }];
  stationBox(batcher, frame, outside, 2.70 - frame.position[1], -1.47, 3.03, 0.55, 0.11, 'steel_structure');
  const top = style === 'open' ? 3.09 : rise + 2.70;
  const start = -1.44, end = style === 'open' ? 0.25 : flightDepth + 1.36;
  for (const dx of [-1.43, 1.43]) {
    for (const z of [start, end]) {
      stationMember(batcher, p(dx, 0, z), p(dx, top, z), 0.12, 0.12);
      // The street entry opens across the end of the tower.
    }
    if (style === 'enclosed' && dx > 0) {
      const levels = Math.max(1, Math.ceil(rise / 3));
      for (let i = 0; i < levels; i++) {
        const low = i * rise / levels + 0.14;
        const high = low + rise / levels - 0.2;
        stationGlass(batcher, p(dx, low, start), p(dx, low, end), p(dx, high, end), p(dx, high, start));
        guards.push(geoPrimGuardCollisionBox(p(dx, low, start), p(dx, low, end), high - low));
        stationMember(batcher, p(dx, high, start), p(dx, high, end), 0.1, 0.14);
      }
    }
  }
  stationBox(batcher, frame, outside, top - frame.position[1], (start + end) / 2, 3.25, 0.20, end - start, 'steel_structure');
  const roofPts = [
    p(-1.625, top, start),
    p(1.625, top, start),
    p(-1.625, top, end),
    p(1.625, top, end)
  ];
  const walk = [[
    Math.min(...roofPts.map((pt) => pt[0])),
    top - 0.10,
    Math.min(...roofPts.map((pt) => pt[2])),
    Math.max(...roofPts.map((pt) => pt[0])),
    top + 0.10,
    Math.max(...roofPts.map((pt) => pt[2]))
  ]];
  for (let h = 2.58; h < rise + 2; h += lamps > 1 ? 2.7 : 5.4) {
    stationBox(batcher, frame, outside + side * 1.38, h - frame.position[1], end - 0.3, 0.16, 0.16, 0.34, 'station_lamp');
  }
  return { walk, guards, signs };
}

export function geoBuildStationPreviewSigns(signs) {
  if (!signs.length || typeof window === 'undefined' || typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const cols = 4, cellW = 256, cellH = 72;
  canvas.width = cols * cellW;
  canvas.height = Math.max(128, 2 ** Math.ceil(Math.log2(Math.ceil(signs.length / cols) * cellH)));
  const ctx = canvas.getContext('2d');
  const positions = [], uvs = [], indices = [];
  for (const [i, sign] of signs.entries()) {
    const x = i % cols * cellW, y = Math.floor(i / cols) * cellH;
    ctx.fillStyle = '#162b40';
    ctx.fillRect(x, y, cellW, cellH);
    ctx.fillStyle = '#e5b34c';
    ctx.fillRect(x + 4, y + 60, cellW - 8, 5);
    ctx.fillStyle = '#f5f7f0';
    ctx.font = 'bold 25px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sign.text.trim().toUpperCase(), x + cellW / 2, y + 31, cellW - 12);
    const u0 = (x + 2) / canvas.width, u1 = (x + cellW - 2) / canvas.width;
    const v0 = 1 - (y + cellH - 2) / canvas.height, v1 = 1 - (y + 2) / canvas.height;
    for (const direction of [1, -1]) {
      const base = positions.length / 3;
      for (const [side, rise] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        positions.push(...infraVec3Add(infraVec3Add(sign.position, infraVec3Scale(sign.along, direction * side * sign.width / 2)),
          [0, rise * sign.height / 2, 0]));
      }
      uvs.push(u0, v0, u1, v0, u1, v1, u0, v1);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  const map = new THREE.CanvasTexture(canvas);
  map.encoding = THREE.sRGBEncoding;
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map }));
}
