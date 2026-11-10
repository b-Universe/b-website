import { clamp, randBetween, pick } from '../utils.js';
import { solid, glassMaterial, textureMaterial } from './materials.js';
import { box, line, worldRoot } from './primitives.js';
import { subtractIntervals, getFireEscapeWallAnchor } from '../core/layouts.js';
import { computeCornerEntranceLayout } from '../core/entrances.js';
import { addBalcony } from './details.js';

export function overrideColor(cfg, floor, side, base) {
  let value = base;
  for (const item of cfg.floorOverrides || []) {
    if (item.floor === floor && (item.side === side || item.side === 'all')) value = item.color;
  }
  return value;
}

export function pickWindowDamageMode(cfg, r, forceBroken = false) {
  const isDamaged = forceBroken || (cfg.damage > 0 && r() < cfg.damage * 0.72);
  if (!isDamaged) return 'none';
  const style = cfg.windowDamageStyle || 'mixed';
  if (style === 'boarded') return 'boarded';
  if (style === 'partial') return 'partial';
  if (style === 'broken') return 'broken';
  const roll = r();
  if (roll < 0.36) return 'boarded';
  if (roll < 0.7) return 'partial';
  return 'broken';
}

export function addWindow(parent, side, baseX, baseY, baseZ, cfg, r, width, height, options = {}) {
  const group = worldRoot(parent, baseX, baseY, baseZ);
  const rotMap = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2, corner: Math.PI / 4 };
  group.rotation.y = rotMap[side] || 0;

  const damageMode = options.damageMode || 'none';
  const frame = solid(cfg.windowFrameColor);
  const lit = damageMode === 'none' && cfg.windowLighting > 0 && (cfg.windowLighting >= 0.99 || r() < cfg.windowLighting);
  const glass = glassMaterial(cfg.glassColor, lit);
  const dark = solid('#151a1d');
  const trim = solid(cfg.trimColor);

  let w = Math.min(width, options.maxW || width);
  let h = Math.min(height, cfg.floorHeight * 0.76);
  if (cfg.windowStyle === 'square') h = Math.min(h, w * 1.02);
  if (cfg.windowStyle === 'tall') h = Math.min(cfg.floorHeight * 0.78, h * 1.14);
  if (cfg.windowStyle === 'modern') w = Math.min(w * 1.06, options.maxW || w);

  const showShutters = cfg.shutters && !options.noShutters;
  const shutterW = showShutters ? clamp(w * 0.22, 0.16, 0.28) : 0;
  if (showShutters && options.maxW && w + shutterW * 2 + 0.22 > options.maxW) {
    w = Math.max(0.48, options.maxW - shutterW * 2 - 0.22);
  }

  const isArched = cfg.windowStyle === 'arched';
  const archRadius = isArched ? w * 0.5 : 0;
  const rectH = isArched ? Math.max(0.45, h - archRadius * 0.7) : h;
  const rectY = isArched ? -archRadius * 0.35 : 0;

  // Recess plate behind glass
  box(group, 0, rectY, 0.007, w + 0.04, rectH + 0.04, 0.014, dark, { cast: false });

  // Window frame
  const frameT = 0.085;
  const frameD = 0.095;
  const frameZ = frameD * 0.5;
  box(group, -w * 0.5 - frameT * 0.5, rectY, frameZ, frameT, rectH + frameT * 2, frameD, frame);
  box(group, w * 0.5 + frameT * 0.5, rectY, frameZ, frameT, rectH + frameT * 2, frameD, frame);
  box(group, 0, rectY - rectH * 0.5 - frameT * 0.5, frameZ, w + frameT * 2, frameT, frameD, frame);

  if (isArched) {
    const archY = rectY + rectH * 0.5;
    const archShape = new THREE.Shape();
    archShape.absarc(0, 0, archRadius + 0.01, 0, Math.PI, false);
    archShape.closePath();

    // Arch glass
    const archGlassGeo = new THREE.ExtrudeGeometry(archShape, { depth: 0.044, bevelEnabled: false, curveSegments: 16 });
    const archMat = (damageMode === 'broken' || damageMode === 'partial') ? dark : glass;
    const archGlass = new THREE.Mesh(archGlassGeo, archMat);
    archGlass.position.set(0, archY, 0.012);
    group.add(archGlass);

    // Arch muntins
    box(group, 0, archY, 0.068, w, 0.05, 0.036, frame);
    box(group, 0, archY + archRadius * 0.5, 0.068, 0.05, archRadius, 0.036, frame);

    const archFrame = new THREE.Mesh(new THREE.TorusGeometry(archRadius + frameT * 0.45, frameT * 0.55, 8, 18, Math.PI), frame);
    archFrame.position.set(0, archY, frameZ);
    group.add(archFrame);

    if (cfg.trimAmount > 0.05) {
      const archTrim = new THREE.Mesh(new THREE.TorusGeometry(archRadius + frameT + 0.03, 0.045, 8, 18, Math.PI), trim);
      archTrim.position.set(0, archY, frameZ + 0.015);
      group.add(archTrim);
    }
  } else {
    box(group, 0, rectY + rectH * 0.5 + frameT * 0.5, frameZ, w + frameT * 2, frameT, frameD, frame);
    if (cfg.trimAmount > 0.12) {
      box(group, 0, rectY + rectH * 0.5 + frameT + 0.055, frameZ + 0.02, w + frameT * 2 + 0.14, 0.1, 0.13, trim);
    }
  }

  // Glass pane or damaged cavity
  if (damageMode === 'broken' || damageMode === 'partial') {
    box(group, 0, rectY, 0.025, w, rectH, 0.028, dark, { cast: false });
    const shardMat = glassMaterial(cfg.glassColor, false);
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        if (r() < 0.78) {
          const sw = w * randBetween(r, 0.18, 0.34);
          const sh = rectH * randBetween(r, 0.16, 0.32);
          const shard = box(group, sx * (w * 0.5 - sw * 0.45), rectY + sy * (rectH * 0.5 - sh * 0.45), 0.045, sw, sh, 0.025, shardMat, { cast: false });
          if (shard) shard.rotation.z = sx * sy * randBetween(r, 0.15, 0.42);
        }
      }
    }
    line(group, [-w * 0.38, rectY - rectH * 0.34, 0.052], [w * 0.32, rectY + rectH * 0.32, 0.052], 0.012, frame);
  } else {
    box(group, 0, rectY, 0.034, w, rectH, 0.044, glass, { cast: false });
  }

  // Curtains
  if (cfg.curtains && !options.noCurtains && damageMode !== 'boarded') {
    const curtainTone = lit ? '#ebd8b7' : (r() > 0.5 ? '#a39788' : '#7f8c96');
    const curtainMat = solid(curtainTone);
    const panelW = w * 0.25;
    box(group, 0, rectY + rectH * 0.5 - 0.05, 0.058, w * 0.96, 0.09, 0.012, curtainMat, { cast: false });
    for (const dir of [-1, 1]) {
      if (damageMode !== 'none' && r() < 0.35) continue;
      const cGroup = worldRoot(group, dir * (w * 0.5 - panelW * 0.54), rectY, 0.058);
      if (damageMode !== 'none') cGroup.rotation.z = dir * randBetween(r, -0.14, 0.18);
      box(cGroup, 0, rectH * 0.04, 0, panelW, rectH * 0.88, 0.012, curtainMat, { cast: false });
      box(cGroup, -dir * panelW * 0.16, -rectH * 0.18, 0.004, panelW * 0.62, rectH * 0.46, 0.012, curtainMat, { cast: false });
    }
  }

  // Muntins
  if (cfg.windowStyle === 'sash' || cfg.windowStyle === 'arched') {
    if (damageMode === 'none' || r() < 0.5) box(group, 0, rectY, 0.068, 0.052, rectH, 0.036, frame);
    box(group, 0, rectY, 0.068, w, 0.052, 0.036, frame);
  } else if (cfg.windowStyle === 'modern') {
    box(group, 0, rectY, 0.068, 0.048, rectH, 0.036, frame);
  } else if (cfg.windowStyle === 'tall') {
    box(group, 0, rectY - rectH * 0.18, 0.068, w, 0.052, 0.036, frame);
    box(group, 0, rectY + rectH * 0.22, 0.068, w, 0.045, 0.036, frame);
  }

  // Sill
  box(group, 0, rectY - rectH * 0.5 - frameT - 0.035, 0.065, w + frameT * 2 + 0.16, 0.095, 0.18, trim);

  // Shutters
  if (showShutters) {
    const shutterMat = solid(cfg.doorColor);
    const sx = w * 0.5 + frameT + 0.02 + shutterW * 0.5;
    const wearAmount = Math.max(cfg.damage, cfg.age > 0.35 ? (cfg.age - 0.35) * 0.85 : 0);
    for (const dir of [-1, 1]) {
      if (cfg.damage > 0.45 && r() < cfg.damage * 0.22) continue;
      const shGroup = worldRoot(group, dir * sx, rectY, 0.042);
      if (wearAmount > 0.06 && r() < 0.78) {
        shGroup.rotation.z = dir * randBetween(r, -0.24, 0.28) * wearAmount;
        shGroup.rotation.y = -dir * randBetween(r, 0, 0.26) * wearAmount;
      }
      box(shGroup, 0, 0, 0, shutterW, rectH + 0.04, 0.055, shutterMat);
      box(shGroup, 0, 0, 0.03, shutterW * 0.76, 0.05, 0.02, frame);
      box(shGroup, 0, rectH * 0.26, 0.03, shutterW * 0.76, 0.04, 0.02, frame);
      box(shGroup, 0, -rectH * 0.26, 0.03, shutterW * 0.76, 0.04, 0.02, frame);
    }
  }

  // Boarded planks
  if (damageMode === 'boarded') {
    const planks = Math.max(3, Math.min(5, Math.round(rectH / 0.38)));
    const plankColors = ['#69503c', '#5b4331', '#755a43', '#4f3a2b'];
    for (const dir of [-1, 1]) {
      box(group, dir * (w * 0.38), rectY, 0.095, 0.11, rectH * 0.94, 0.03, solid('#4e392a'));
    }
    for (let p = 0; p < planks; p++) {
      const py = rectY - rectH * 0.4 + (p / (planks - 1)) * (rectH * 0.8);
      const plank = box(group, 0, py, 0.115, w + 0.22, (rectH / planks) * 0.82, 0.038, solid(pick(r, plankColors)));
      if (plank) plank.rotation.z = randBetween(r, -0.06, 0.06);
    }
  } else if (damageMode === 'partial') {
    const plankColors = ['#69503c', '#5b4331', '#755a43'];
    const p1 = box(group, 0, rectY + rectH * 0.14, 0.105, w + 0.18, 0.17, 0.038, solid(pick(r, plankColors)));
    if (p1) p1.rotation.z = randBetween(r, 0.08, 0.24);
    if (r() < 0.78) {
      const p2 = box(group, 0, rectY - rectH * 0.18, 0.112, w + 0.16, 0.16, 0.038, solid(pick(r, plankColors)));
      if (p2) p2.rotation.z = randBetween(r, -0.22, -0.06);
    }
  }

  // AC unit
  if (options.hasAC && damageMode !== 'boarded') {
    const acW = clamp(w * 0.58, 0.52, 0.82);
    const acH = clamp(rectH * 0.28, 0.34, 0.48);
    const acD = 0.46;
    const acY = rectY - rectH * 0.5 + acH * 0.5 + 0.02;
    const acGroup = worldRoot(group, 0, acY, acD * 0.42);
    if (cfg.age > 0.3 || cfg.damage > 0.15) {
      acGroup.rotation.x = 0.065;
      acGroup.rotation.z = randBetween(r, -0.04, 0.04);
    }
    box(acGroup, 0, 0, 0, acW, acH, acD, solid(cfg.age > 0.45 ? '#787d7a' : '#8e9699'));
    box(acGroup, 0, 0, acD * 0.5 + 0.01, acW * 0.9, acH * 0.84, 0.03, solid('#343a3e'));
    box(acGroup, -acW * 0.18, 0, acD * 0.5 + 0.025, acW * 0.44, acH * 0.68, 0.02, solid('#1d2225'));
    box(acGroup, acW * 0.24, 0, acD * 0.5 + 0.025, acW * 0.28, acH * 0.68, 0.02, solid('#495156'));
    for (const sx of [-1, 1]) {
      line(acGroup, [sx * acW * 0.36, -acH * 0.5 - 0.18, -acD * 0.28], [sx * acW * 0.36, -acH * 0.5, acD * 0.35], 0.022, solid('#454b4e'));
    }
  }

  return group;
}

export function addDoor(parent, side, x, y, z, cfg, wide = false) {
  const group = worldRoot(parent, x, y, z);
  const rotMap = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2, corner: Math.PI / 4 };
  group.rotation.y = rotMap[side] || 0;

  const w = wide ? 2.5 : 1.55;
  const h = cfg.floorHeight * 0.68;
  const trim = solid(cfg.trimColor);
  const doorMat = wide ? glassMaterial(cfg.glassColor, cfg.windowLighting > 0.25) : solid(cfg.doorColor);

  // Door frame and trim
  const jambT = 0.17;
  box(group, -w * 0.5 - jambT * 0.5, h * 0.5, 0.06, jambT, h + jambT, 0.14, trim);
  box(group, w * 0.5 + jambT * 0.5, h * 0.5, 0.06, jambT, h + jambT, 0.14, trim);
  box(group, 0, h + jambT * 0.5, 0.06, w + jambT * 2, jambT, 0.14, trim);
  box(group, 0, h * 0.5, 0.038, w, h, 0.065, doorMat);
  if (wide) {
    box(group, 0, h * 0.5, 0.075, 0.06, h, 0.04, trim);
  }
  box(group, wide ? 0.16 : w * 0.32, h * 0.46, 0.088, 0.08, 0.16, 0.06, solid('#d5b66c'));
  box(group, 0, h + jambT + 0.08, 0.09, w + 0.56, 0.18, 0.22, trim);

  if (cfg.doorStyle === 'stoop') {
    for (const dir of [-1, 1]) {
      box(group, dir * (w * 0.5 + 0.24), h * 0.5, 0.14, 0.18, h + 0.16, 0.26, trim);
    }
    box(group, 0, h + 0.26, 0.22, w + 0.82, 0.22, 0.48, trim);
  }
  return group;
}

export function wallForSide(group, seg, index, side, cfg, r, cutaway, seed, firePlacement = null) {
  if (cutaway && side === 'front') return;
  if (seg.skipWalls && seg.skipWalls[side]) return;

  const floorNum = index + 1;
  const y = index * cfg.floorHeight + cfg.floorHeight * 0.5;
  const main = index === 0 ? cfg.groundFloorColor : cfg.wallColor;
  const kind = index === 0 ? cfg.groundFloorMaterial : cfg.wallMaterial;
  const override = overrideColor(cfg, floorNum, side, main);
  const long = side === 'front' || side === 'back';
  const cut = seg.cornerCut || 0;
  const t = cfg.wallThickness;

  const spanStart = long ? seg.x - seg.w * 0.5 : seg.z - seg.d * 0.5;
  const spanEnd = long
    ? seg.x + seg.w * 0.5 - (side === 'front' ? cut : 0)
    : seg.z + seg.d * 0.5 - (side === 'right' ? cut : 0);
  if (spanEnd - spanStart <= 0.2) return;

  const blocked = [...(seg.occlusions?.[side] || [])];
  const exposedSpans = subtractIntervals(spanStart, spanEnd, blocked);

  for (const [s, e] of exposedSpans) {
    let ws = s;
    let we = e;
    if (!long) {
      if (Math.abs(ws - (seg.z - seg.d * 0.5)) < 0.02 && !seg.skipWalls?.back) ws += t;
      if (Math.abs(we - (seg.z + seg.d * 0.5)) < 0.02 && !seg.skipWalls?.front && (side !== 'right' || cut <= 0.01)) we -= t;
    }
    const len = we - ws;
    if (len <= 0.05) continue;
    const mid = (ws + we) * 0.5;
    const mat = textureMaterial(kind, override, cfg.secondaryWallColor, cfg.mortarColor, cfg, seed, len, cfg.floorHeight);

    if (side === 'front') {
      box(group, mid, y, seg.z + seg.d * 0.5 - t * 0.5, len, cfg.floorHeight, t, mat);
    } else if (side === 'back') {
      box(group, mid, y, seg.z - seg.d * 0.5 + t * 0.5, len, cfg.floorHeight, t, mat);
    } else if (side === 'left') {
      box(group, seg.x - seg.w * 0.5 + t * 0.5, y, mid, t, cfg.floorHeight, len, mat);
    } else if (side === 'right') {
      box(group, seg.x + seg.w * 0.5 - t * 0.5, y, mid, t, cfg.floorHeight, len, mat);
    }
  }

  const trim = solid(cfg.trimColor);

  if (index === 0 && cfg.age > 0.05) {
    const grimeMat = solid(cfg.grimeColor);
    const grimeH = 0.22 + cfg.age * 0.35;
    for (const [s, e] of exposedSpans) {
      const len = e - s;
      const mid = (s + e) * 0.5;
      if (long) {
        const zOut = side === 'front' ? seg.z + seg.d * 0.5 + 0.015 : seg.z - seg.d * 0.5 - 0.015;
        box(group, mid, grimeH * 0.5, zOut, len, grimeH, 0.03, grimeMat, { cast: false });
      } else {
        const xOut = side === 'left' ? seg.x - seg.w * 0.5 - 0.015 : seg.x + seg.w * 0.5 + 0.015;
        box(group, xOut, grimeH * 0.5, mid, 0.03, grimeH, len, grimeMat, { cast: false });
      }
    }
  }

  if (index === cfg.floors - 1 && (cfg.roofPuddles || cfg.age > 0.45)) {
    const stainMat = solid(cfg.grimeColor);
    const topY = (index + 1) * cfg.floorHeight;
    for (const [s, e] of exposedSpans) {
      const drips = Math.max(1, Math.floor((e - s) / 3.2));
      for (let dIdx = 0; dIdx < drips; dIdx++) {
        const pos = randBetween(r, s + 0.35, e - 0.35);
        const dripH = randBetween(r, 0.45, 1.25);
        const dripW = randBetween(r, 0.25, 0.65);
        if (long) {
          const zOut = side === 'front' ? seg.z + seg.d * 0.5 + 0.014 : seg.z - seg.d * 0.5 - 0.014;
          box(group, pos, topY - dripH * 0.5 - 0.14, zOut, dripW, dripH, 0.02, stainMat, { cast: false });
        } else {
          const xOut = side === 'left' ? seg.x - seg.w * 0.5 - 0.014 : seg.x + seg.w * 0.5 + 0.014;
          box(group, xOut, topY - dripH * 0.5 - 0.14, pos, 0.02, dripH, dripW, stainMat, { cast: false });
        }
      }
    }
  }

  if (cfg.damage > 0.15) {
    const spallMat = solid(cfg.secondaryWallColor);
    const darkCore = solid('#322926');
    for (const [s, e] of exposedSpans) {
      if (e - s > 2.2 && r() < cfg.damage * 0.6) {
        const pos = randBetween(r, s + 0.6, e - 0.6);
        const sy = index * cfg.floorHeight + randBetween(r, 0.35, cfg.floorHeight - 0.35);
        const pw = randBetween(r, 0.45, 1.1);
        const ph = randBetween(r, 0.28, 0.62);
        if (long) {
          const zOut = side === 'front' ? seg.z + seg.d * 0.5 + 0.012 : seg.z - seg.d * 0.5 - 0.012;
          box(group, pos, sy, zOut, pw, ph, 0.025, spallMat, { cast: false });
          box(group, pos, sy, zOut + (side === 'front' ? 0.006 : -0.006), pw * 0.6, ph * 0.55, 0.02, darkCore, { cast: false });
        } else {
          const xOut = side === 'left' ? seg.x - seg.w * 0.5 - 0.012 : seg.x + seg.w * 0.5 + 0.012;
          box(group, xOut, sy, pos, 0.025, ph, pw, spallMat, { cast: false });
          box(group, xOut + (side === 'left' ? -0.006 : 0.006), sy, pos, 0.02, ph * 0.55, pw * 0.6, darkCore, { cast: false });
        }
      }
    }
  }

  if (cfg.trimAmount > 0.04) {
    const trimH = 0.11 + cfg.trimAmount * 0.11;
    const topTrimH = 0.13 + cfg.trimAmount * 0.16;
    for (const [s, e] of exposedSpans) {
      const len = e - s;
      const mid = (s + e) * 0.5;
      if (long) {
        const zOut = side === 'front' ? seg.z + seg.d * 0.5 + 0.04 : seg.z - seg.d * 0.5 - 0.04;
        box(group, mid, index * cfg.floorHeight + trimH * 0.5 + 0.005, zOut, len + 0.04, trimH, 0.12, trim);
        if (cfg.trimAmount > 0.55 && (index === 0 || index === cfg.floors - 1)) {
          box(group, mid, (index + 1) * cfg.floorHeight - topTrimH * 0.5 - 0.005, zOut, len + 0.08, topTrimH, 0.18, trim);
        }
      } else {
        const xOut = side === 'left' ? seg.x - seg.w * 0.5 - 0.04 : seg.x + seg.w * 0.5 + 0.04;
        box(group, xOut, index * cfg.floorHeight + trimH * 0.5 + 0.005, mid, 0.12, trimH, len + 0.04, trim);
        if (cfg.trimAmount > 0.55 && (index === 0 || index === cfg.floors - 1)) {
          box(group, xOut, (index + 1) * cfg.floorHeight - topTrimH * 0.5 - 0.005, mid, 0.18, topTrimH, len + 0.08, trim);
        }
      }
    }
  }

  if (index === 0 && side === 'front' && seg.hasEntrance && cfg.groundUse === 'shop') return;
  const windowBlocked = [...blocked];
  if (index === 0 && side === 'front' && seg.hasEntrance) {
    const doorCenter = seg.x - cut * 0.5;
    windowBlocked.push([doorCenter - 1.95, doorCenter + 1.95]);
  }

  const windowSpans = subtractIntervals(spanStart + 0.45, spanEnd - 0.45, windowBlocked);
  const totalLength = long ? seg.w : seg.d;
  const desiredCols = long ? cfg.windowsX : cfg.windowsSide;
  const shutterPad = cfg.shutters ? 0.62 : 0.34;
  const wh = Math.min(cfg.windowHeight, cfg.floorHeight * 0.66);
  const wy = index * cfg.floorHeight + cfg.floorHeight * 0.51;

  const fireCoordOnFloor = firePlacement && firePlacement.side === side
    ? getFireEscapeWallAnchor(seg, side, firePlacement.coord, firePlacement.deckW).coord
    : null;

  for (const [s, e] of windowSpans) {
    const avail = e - s;
    if (avail < Math.min(0.85, cfg.windowWidth * 0.7)) continue;
    const proportional = Math.max(1, Math.round(desiredCols * (avail / Math.max(1, totalLength - 0.9))));
    const maxFit = Math.max(1, Math.floor(avail / (cfg.windowWidth + shutterPad)));
    const windowCount = Math.max(1, Math.min(proportional, maxFit));
    const spacing = avail / windowCount;
    const ww = Math.min(cfg.windowWidth, spacing * (cfg.shutters ? 0.58 : 0.74), avail - 0.16);

    for (let j = 0; j < windowCount; j++) {
      const pos = s + (j + 0.5) * spacing;
      const x = long ? pos : (side === 'left' ? seg.x - seg.w * 0.5 : seg.x + seg.w * 0.5);
      const z = long ? (side === 'front' ? seg.z + seg.d * 0.5 : seg.z - seg.d * 0.5) : pos;

      const hasFireHere = fireCoordOnFloor !== null && Math.abs(pos - fireCoordOnFloor) < firePlacement.deckW * 0.58;
      const forceFirstDamage = cfg.damage >= 0.05 && index === Math.min(1, cfg.floors - 1) && j === 0 && side === 'front';
      const damageMode = pickWindowDamageMode(cfg, r, forceFirstDamage);

      let hasBalcony = false;
      if (!hasFireHere && cfg.balconies > 0 && (index > 0 || cfg.floors === 1)) {
        const guaranteedFront = side === 'front' && index === Math.min(1, cfg.floors - 1) && j === 0;
        const sideChance = side === 'front' ? cfg.balconies * 0.85 : cfg.balconies * 0.72;
        if (guaranteedFront || r() < sideChance) {
          addBalcony(group, side, x, wy, z, ww + 0.75, cfg);
          hasBalcony = true;
        }
      }

      const hasAC = !hasBalcony && !hasFireHere && cfg.acUnits && (index > 0 || cfg.groundUse === 'residential') && (r() < 0.38 || (index === 1 && j === windowCount - 1));
      addWindow(group, side, x, wy, z, cfg, r, ww, wh, {
        maxW: spacing * 0.88,
        damageMode,
        hasAC
      });
    }
  }
}

export function addCornerChamfer(group, seg, index, cfg, r, cutaway, seed) {
  const cut = seg.cornerCut || 0;
  if (cut <= 0.05 || cutaway) return;

  const floorNum = index + 1;
  const y = index * cfg.floorHeight + cfg.floorHeight * 0.5;
  const main = index === 0 ? cfg.groundFloorColor : cfg.wallColor;
  const kind = index === 0 ? cfg.groundFloorMaterial : cfg.wallMaterial;
  const override = overrideColor(cfg, floorNum, 'front', main);
  const diagLen = cut * Math.SQRT2;
  const t = cfg.wallThickness;
  const mat = textureMaterial(kind, override, cfg.secondaryWallColor, cfg.mortarColor, cfg, seed + 503, diagLen, cfg.floorHeight);

  const cx = seg.x + seg.w * 0.5 - cut * 0.5;
  const cz = seg.z + seg.d * 0.5 - cut * 0.5;
  const wedge = worldRoot(group, cx, 0, cz);
  wedge.rotation.y = Math.PI / 4;

  box(wedge, 0, y, -t * 0.5, diagLen + t * 0.5, cfg.floorHeight, t, mat);

  if (cfg.trimAmount > 0.04) {
    const trimH = 0.11 + cfg.trimAmount * 0.11;
    box(wedge, 0, index * cfg.floorHeight + trimH * 0.5 + 0.005, 0.04, diagLen + 0.12, trimH, 0.14, solid(cfg.trimColor));
    if (index === cfg.floors - 1 && cfg.trimAmount > 0.2) {
      box(wedge, 0, (index + 1) * cfg.floorHeight - 0.13, 0.1, diagLen + 0.28, 0.24, 0.3, solid(cfg.trimColor));
    }
  }

  if (index === 0 && cfg.groundUse === 'shop') {
    const cornerLayout = computeCornerEntranceLayout(seg, cfg);
    addDoor(group, 'corner', cornerLayout.cx, cornerLayout.totalRise, cornerLayout.wallZ, cfg, cornerLayout.wideDoor);
  } else if (diagLen >= 1.05) {
    const ww = Math.min(cfg.windowWidth, diagLen * 0.62);
    const wh = Math.min(cfg.windowHeight, cfg.floorHeight * 0.66);
    const damageMode = pickWindowDamageMode(cfg, r, false);
    addWindow(group, 'corner', cx, index * cfg.floorHeight + cfg.floorHeight * 0.51, cz, cfg, r, ww, wh, {
      maxW: diagLen * 0.7,
      noShutters: true,
      damageMode
    });
  }
}
