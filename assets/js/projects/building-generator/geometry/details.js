import { clamp, randBetween, pick } from '../utils.js';
import { solid, puddleMaterial, glassMaterial, registerTexture } from './materials.js';
import { box, slabBox, cylinder, line, sagCable, signboard, worldRoot } from './primitives.js';
import { subtractIntervals, segmentsForFloor, getFireEscapeWallAnchor } from '../core/layouts.js';
import { computePrimaryEntranceLayout } from '../core/entrances.js';
import { addDoor, addWindow, pickWindowDamageMode } from './facades.js';

let awningCounter = 0;

export function resetDetailCounters() {
  awningCounter = 0;
}

export function addBalcony(parent, side, x, y, z, w, cfg) {
  const group = worldRoot(parent, x, y, z);
  const rotMap = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };
  group.rotation.y = rotMap[side] || 0;

  const steel = solid(cfg.windowFrameColor);
  const deck = solid('#525452');
  const depth = 1.15;
  const baseY = -cfg.floorHeight * 0.36;

  box(group, 0, baseY, depth * 0.5, w, 0.12, depth, deck);
  box(group, 0, baseY + 0.86, depth - 0.04, w + 0.04, 0.06, 0.06, steel);
  box(group, -w * 0.5 + 0.03, baseY + 0.86, depth * 0.5, 0.06, 0.06, depth, steel);
  box(group, w * 0.5 - 0.03, baseY + 0.86, depth * 0.5, 0.06, 0.06, depth, steel);

  const posts = Math.max(4, Math.round(w * 2.5));
  for (let j = 0; j <= posts; j++) {
    const px = -w * 0.5 + 0.03 + (j / posts) * (w - 0.06);
    box(group, px, baseY + 0.44, depth - 0.04, 0.04, 0.8, 0.04, steel);
  }
  for (const sx of [-w * 0.5 + 0.03, w * 0.5 - 0.03]) {
    box(group, sx, baseY + 0.44, depth * 0.5, 0.04, 0.8, 0.04, steel);
  }
}

export function addFireEscape(parent, seg, placement, cfg) {
  if (!placement || cfg.floors < 2) return;
  const { side, coord, deckW, extIndex = -1 } = placement;
  const steel = solid('#3a4347');
  const deckD = 1.22;
  const rotMap = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };

  const segForFloor = (flIdx) => {
    const flSegs = segmentsForFloor(cfg, flIdx);
    if (extIndex >= 0) {
      const ext = flSegs.find((s) => s.isExtension && s.extIndex === extIndex);
      if (ext) return ext;
    }
    return flSegs[0] || seg;
  };

  const wallAnchorForFloor = (flIdx) => getFireEscapeWallAnchor(segForFloor(flIdx), side, coord, deckW);

  // Convert world (wx, wz) to local (lx, lz)
  const toLocalXZ = (anchor, wx, wz) => {
    const dx = wx - anchor.x;
    const dz = wz - anchor.z;
    if (side === 'front') return { x: dx, z: dz };
    if (side === 'back') return { x: -dx, z: -dz };
    if (side === 'left') return { x: dz, z: -dx };
    return { x: -dz, z: dx };
  };

  const zInner = 0.44;
  const zOuter = 0.86;
  const stairHW = 0.18; // Half-width of stair in Z (0.36m width)
  const stairTreadD = 0.36;

  const xSpan = deckW * 0.34;
  const halfDeckW = deckW * 0.5;
  const deckT = 0.08;

  const anchors = [];
  for (let f = 0; f < cfg.floors; f++) {
    anchors.push(wallAnchorForFloor(f));
  }

  const flightLanes = [];
  for (let i = 1; i < cfg.floors - 1; i++) {
    const anchorBelow = anchors[i - 1];
    const anchorAbove = anchors[i];
    const stepOffset = toLocalXZ(anchorAbove, anchorBelow.x, anchorBelow.z);
    const stepBackZ = Math.max(0, stepOffset.z);

    let lane = i % 2 === 1 ? zOuter : zInner;
    if (i > 1) {
      const prevArriveZ = stepBackZ + flightLanes[i - 1];
      if (Math.abs(lane - prevArriveZ) < stairHW * 2 + 0.06) {
        const altLane = lane === zOuter ? zInner : zOuter;
        if (Math.abs(altLane - prevArriveZ) >= Math.abs(lane - prevArriveZ)) {
          lane = altLane;
        }
      }
    }
    flightLanes[i] = lane;
  }

  for (let i = 1; i < cfg.floors; i++) {
    const y = i * cfg.floorHeight + 0.12;
    const anchorBelow = anchors[i - 1];
    const anchorAbove = anchors[i];
    const stepOffset = toLocalXZ(anchorAbove, anchorBelow.x, anchorBelow.z);
    const stepBackZ = Math.max(0, stepOffset.z);
    const shiftX = stepOffset.x;

    const group = worldRoot(parent, anchorAbove.x, 0, anchorAbove.z);
    group.rotation.y = rotMap[side] || 0;

    const totalDeckD = stepBackZ + deckD;
    const zCenter = totalDeckD * 0.5;
    const minDeckX = Math.min(-halfDeckW, shiftX - halfDeckW);
    const maxDeckX = Math.max(halfDeckW, shiftX + halfDeckW);
    const fullDeckW = maxDeckX - minDeckX;
    const centerDeckX = (minDeckX + maxDeckX) * 0.5;

    if (i === 1) {
      // Lowest landing
      box(group, centerDeckX, y, zCenter, fullDeckW, deckT, totalDeckD, steel);
    } else {
      const prevDir = (i - 1) % 2 === 1 ? 1 : -1;
      const prevLaneZ = stepBackZ + flightLanes[i - 1];
      const xArrive = shiftX + prevDir * xSpan;

      const openLen = Math.min(xSpan * 1.6, 1.25);
      const xOpen1 = Math.min(xArrive, xArrive - prevDir * openLen);
      const xOpen2 = Math.max(xArrive, xArrive - prevDir * openLen);

      const zOpenMin = prevLaneZ - stairHW - 0.03;
      const zOpenMax = prevLaneZ + stairHW + 0.03;

      if (zOpenMin > 0.04) {
        box(group, centerDeckX, y, zOpenMin * 0.5, fullDeckW, deckT, zOpenMin, steel);
      }

      const outerD = totalDeckD - zOpenMax;
      if (outerD > 0.03) {
        box(group, centerDeckX, y, zOpenMax + outerD * 0.5, fullDeckW, deckT, outerD, steel);
      }

      const openSpanD = zOpenMax - zOpenMin;
      if (maxDeckX - xOpen2 > 0.03) {
        const wRight = maxDeckX - xOpen2;
        box(group, xOpen2 + wRight * 0.5, y, zOpenMin + openSpanD * 0.5, wRight, deckT, openSpanD, steel);
      }
      if (xOpen1 - minDeckX > 0.03) {
        const wLeft = xOpen1 - minDeckX;
        box(group, minDeckX + wLeft * 0.5, y, zOpenMin + openSpanD * 0.5, wLeft, deckT, openSpanD, steel);
      }

      const frameT = 0.035;
      box(group, (xOpen1 + xOpen2) * 0.5, y, zOpenMin, xOpen2 - xOpen1, deckT + 0.02, frameT, steel);
      box(group, (xOpen1 + xOpen2) * 0.5, y, zOpenMax, xOpen2 - xOpen1, deckT + 0.02, frameT, steel);
      const backX = prevDir === 1 ? xOpen1 : xOpen2;
      box(group, backX, y, (zOpenMin + zOpenMax) * 0.5, frameT, deckT + 0.02, openSpanD, steel);

      const departLaneZ = i < cfg.floors - 1 ? flightLanes[i] : -1;
      const railClearOfDepart = departLaneZ < 0 || Math.abs(zOpenMin - departLaneZ) > stairHW + 0.06;
      if (railClearOfDepart) {
        const openRailY = y + 0.88;
        const openRailZ = zOpenMin;
        line(group, [xOpen1, openRailY, openRailZ], [xOpen2, openRailY, openRailZ], 0.03, steel);
        line(group, [backX, openRailY, zOpenMin], [backX, openRailY, zOpenMax], 0.03, steel);
        const railPosts = 4;
        for (let p = 0; p <= railPosts; p++) {
          const rx = xOpen1 + (p / railPosts) * (xOpen2 - xOpen1);
          line(group, [rx, y + 0.04, openRailZ], [rx, openRailY, openRailZ], 0.024, steel);
        }
      }
    }

    for (const dx of [shiftX - deckW * 0.42, shiftX + deckW * 0.42]) {
      line(group, [dx, y - 0.58, stepBackZ + 0.02], [dx, y - 0.03, totalDeckD - 0.12], 0.04, steel);
    }

    const railY = y + 0.88;
    box(group, centerDeckX, railY, totalDeckD - 0.04, fullDeckW, 0.06, 0.06, steel);
    box(group, minDeckX + 0.03, railY, zCenter, 0.06, 0.06, totalDeckD, steel);
    box(group, maxDeckX - 0.03, railY, zCenter, 0.06, 0.06, totalDeckD, steel);

    const frontBalusters = Math.max(6, Math.round(fullDeckW * 2.5));
    for (let j = 0; j < frontBalusters; j++) {
      const bx = minDeckX + 0.04 + (j / (frontBalusters - 1)) * (fullDeckW - 0.08);
      box(group, bx, y + 0.46, totalDeckD - 0.04, 0.04, 0.82, 0.04, steel);
    }
    const sideBalusters = Math.max(2, Math.round(totalDeckD * 1.8));
    for (const sx of [minDeckX + 0.03, maxDeckX - 0.03]) {
      for (let k = 1; k <= sideBalusters; k++) {
        box(group, sx, y + 0.46, (k / (sideBalusters + 1)) * totalDeckD, 0.04, 0.82, 0.04, steel);
      }
    }

    if (i < cfg.floors - 1) {
      const nextY = (i + 1) * cfg.floorHeight + 0.12;
      const dir = i % 2 === 1 ? 1 : -1;
      const laneZ = flightLanes[i];
      const xStart = -dir * xSpan;
      const xEnd = dir * xSpan;

      for (const dz of [-stairHW, stairHW]) {
        line(group, [xStart, y, laneZ + dz], [xEnd, nextY, laneZ + dz], 0.042, steel);
        line(group, [xStart, y + 0.82, laneZ + dz], [xEnd, nextY + 0.82, laneZ + dz], 0.032, steel);
      }

      const steps = 9;
      for (let s = 1; s <= steps; s++) {
        const frac = s / steps;
        const sx = xStart + (xEnd - xStart) * frac;
        const sy = y + cfg.floorHeight * frac;
        box(group, sx, sy, laneZ, 0.24, 0.045, stairTreadD, steel);
      }
    }

    if (i === 1) {
      const lx = maxDeckX + 0.18;
      const lz = stepBackZ + deckD * 0.55;
      const botY = 0.45;
      const topY = y + 1.05;
      box(group, maxDeckX + 0.09, y, lz, 0.18, 0.06, 0.38, steel);
      for (const dz of [-0.16, 0.16]) {
        line(group, [lx, botY, lz + dz], [lx, topY, lz + dz], 0.03, steel);
      }
      const rungs = Math.max(4, Math.floor((topY - botY) / 0.32));
      for (let rIdx = 0; rIdx <= rungs; rIdx++) {
        const ry = botY + (rIdx / rungs) * (topY - botY - 0.15);
        box(group, lx, ry, lz, 0.04, 0.035, 0.32, steel);
      }
    }
  }
}

export function addAwning(parent, cx, wallZ, spanW, h, cfg, isDoorCanopy = false) {
  if (!cfg.awning || spanW < 1.4) return;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = cfg.awningColor;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#e5d5bb';
  for (let i = 0; i < 128; i += 32) ctx.fillRect(i, 0, 14, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(isDoorCanopy ? 2 : 4, 1);
  awningCounter++;
  registerTexture('awning-' + awningCounter, tex);

  const depth = isDoorCanopy ? 1.25 : 1.45;
  const mountY = isDoorCanopy ? Math.min(h * 0.84, h - 0.35) : h * 0.74;
  const mesh = box(parent, cx, mountY, wallZ + depth * 0.5, spanW, 0.09, depth, new THREE.MeshLambertMaterial({ map: tex }));
  if (mesh) mesh.rotation.x = 0.22;
  box(parent, cx, mountY - 0.16, wallZ + depth - 0.04, spanW, 0.16, 0.06, solid(cfg.awningColor));
  for (const dx of [-spanW * 0.48, spanW * 0.48]) {
    line(parent, [cx + dx, mountY - 0.32, wallZ + 0.02], [cx + dx, mountY - 0.16, wallZ + depth - 0.06], 0.03, solid('#343a3d'));
  }
}

export function addEntrance(parent, seg, cfg, r) {
  const layout = computePrimaryEntranceLayout(seg, cfg);
  const { usableW, cx, wallZ, wideDoor, steps, stepH, stepD, landingD, totalRise, stoopW } = layout;

  addDoor(parent, 'front', cx, totalRise, wallZ, cfg, wideDoor);

  if (steps > 0) {
    const stairMat = solid('#888882');
    const railMat = solid('#424749');
    for (let i = 0; i < steps; i++) {
      const levelH = (i + 1) * stepH;
      const depth = landingD + (steps - 1 - i) * stepD;
      box(parent, cx, levelH * 0.5, wallZ + depth * 0.5, stoopW, levelH, depth, stairMat);
    }
    const totalDepth = layout.totalStepDepth;
    const railH = 0.78;
    for (const dx of [-stoopW * 0.5 + 0.09, stoopW * 0.5 - 0.09]) {
      const rx = cx + dx;
      box(parent, rx, (totalRise + railH) * 0.5, wallZ + landingD * 0.5, 0.14, totalRise + railH, landingD, stairMat);
      box(parent, rx, (stepH + railH) * 0.5, wallZ + totalDepth - 0.1, 0.16, stepH + railH, 0.2, stairMat);
      line(parent, [rx, totalRise + railH, wallZ + landingD - 0.06], [rx, stepH + railH, wallZ + totalDepth - 0.1], 0.045, railMat);
    }
  }

  if (cfg.groundUse === 'shop') {
    const doorHalfW = (wideDoor ? 2.5 : 1.55) * 0.5 + 0.45;
    const sideSpace = usableW * 0.5 - doorHalfW - 0.45;
    if (sideSpace >= 1.1) {
      const bayW = Math.min(3.4, sideSpace * 0.88);
      const bayOffset = doorHalfW + sideSpace * 0.5;
      const shopCfg = { ...cfg, windowStyle: 'modern', windowLighting: Math.max(0.75, cfg.windowLighting) };
      const shopDmgL = cfg.damage > 0.35 && r() < cfg.damage * 0.45 ? pickWindowDamageMode(cfg, r, true) : 'none';
      const shopDmgR = cfg.damage > 0.35 && r() < cfg.damage * 0.45 ? pickWindowDamageMode(cfg, r, true) : 'none';
      addWindow(parent, 'front', cx - bayOffset, cfg.floorHeight * 0.48, wallZ, shopCfg, r, bayW, cfg.floorHeight * 0.62, { maxW: bayW, noShutters: true, noCurtains: true, damageMode: shopDmgL });
      addWindow(parent, 'front', cx + bayOffset, cfg.floorHeight * 0.48, wallZ, shopCfg, r, bayW, cfg.floorHeight * 0.62, { maxW: bayW, noShutters: true, noCurtains: true, damageMode: shopDmgR });
    }
    addAwning(parent, cx, wallZ, usableW * 0.82, cfg.floorHeight, cfg, false);
  } else if (cfg.awning) {
    const canopyW = Math.min(usableW * 0.55, wideDoor ? 3.8 : 2.9);
    addAwning(parent, cx, wallZ, canopyW, cfg.floorHeight + totalRise * 0.6, cfg, true);
  }

  if (cfg.signage !== 'none') {
    const signY = cfg.awning ? cfg.floorHeight * 0.94 : cfg.floorHeight * 0.86;
    const sign = worldRoot(parent, cx, signY, wallZ + 0.08);
    signboard(sign, cfg.signText, Math.min(usableW * 0.68, 9.5), 0.62, cfg.signage === 'marquee' ? '#302b2b' : '#40322d', cfg.signColor);
  }

  if (cfg.groundUse !== 'shop') {
    const doorHalf = (wideDoor ? 2.5 : 1.55) * 0.5;
    const plaque = worldRoot(parent, cx - doorHalf - 0.55, totalRise + 1.45, wallZ + 0.06);
    signboard(plaque, String((cfg.seed % 900) + 100), 0.54, 0.32, '#323437', '#ead6ac');
    for (const s of [-1, 1]) {
      box(parent, cx + s * (doorHalf + 0.28), totalRise + 1.65, wallZ + 0.08, 0.1, 0.36, 0.12, solid('#d8ad70'));
    }
  }
}

export function addSurfaceWeathering(group, cx, surfaceY, cz, spanW, spanD, cfg, r) {
  if (spanW < 0.8 || spanD < 0.45) return;

  if (cfg.tarPatches || cfg.damage > 0.25 || cfg.age > 0.55) {
    const tarMat = solid('#1b1e20');
    const seamMat = solid('#282c2f');
    const metalPatchMat = solid('#6b6358');
    const count = Math.max(2, Math.ceil((spanW * spanD) / 18) + (cfg.tarPatches ? 3 : 0));
    for (let i = 0; i < count; i++) {
      const pw = randBetween(r, 0.55, Math.min(2.4, spanW * 0.45));
      const pd = randBetween(r, 0.38, Math.min(1.9, spanD * 0.45));
      const px = cx + randBetween(r, -spanW * 0.45 + pw * 0.5, spanW * 0.45 - pw * 0.5);
      const pz = cz + randBetween(r, -spanD * 0.45 + pd * 0.5, spanD * 0.45 - pd * 0.5);
      const patch = box(group, px, surfaceY + 0.008 + i * 0.001, pz, pw, 0.014, pd, i % 3 === 0 && cfg.damage > 0.15 ? metalPatchMat : (i % 2 === 0 ? tarMat : seamMat), { cast: false });
      if (patch) patch.rotation.y = randBetween(r, -0.35, 0.35);
    }
  }

  if (cfg.roofPuddles || cfg.age > 0.5) {
    const stainMat = solid(cfg.grimeColor);
    const waterMat = puddleMaterial();
    const puddleCount = Math.max(1, Math.min(4, Math.ceil((spanW * spanD) / 28) + (cfg.roofPuddles ? 2 : 0)));
    for (let i = 0; i < puddleCount; i++) {
      const rad = randBetween(r, 0.35, Math.min(1.35, Math.min(spanW, spanD) * 0.32));
      const px = cx + randBetween(r, -spanW * 0.42 + rad, spanW * 0.42 - rad);
      const pz = cz + randBetween(r, -spanD * 0.42 + rad, spanD * 0.42 - rad);
      const scaleZ = randBetween(r, 0.65, 1.25);

      const stain = cylinder(group, px, surfaceY + 0.006 + i * 0.001, pz, rad * 1.28, rad * 1.28, 0.008, stainMat, 14);
      stain.scale.z = scaleZ;
      stain.castShadow = false;

      const water = cylinder(group, px, surfaceY + 0.012 + i * 0.001, pz, rad, rad, 0.01, waterMat, 14);
      water.scale.z = scaleZ;
      water.castShadow = false;
    }
  }
}

export function addSetbackTerrace(group, lowerSeg, upperSeg, y, cfg, r, segIdx = 0, firePlacement = null) {
  const roofMat = solid(cfg.roofColor);
  const trimMat = solid(cfg.trimColor);
  const wallMat = solid(cfg.wallColor);
  const yLift = segIdx * 0.003;
  const slabH = 0.14;
  const slabTopY = y + 0.004 + yLift;
  const slabY = slabTopY - slabH * 0.5;
  const overlap = Math.min(0.08, cfg.wallThickness * 0.45);
  const wallInset = 0.02;

  const lX1 = lowerSeg.x - lowerSeg.w * 0.5;
  const lX2 = lowerSeg.x + lowerSeg.w * 0.5;
  const lZ1 = lowerSeg.z - lowerSeg.d * 0.5;
  const lZ2 = lowerSeg.z + lowerSeg.d * 0.5;
  const lCut = Math.max(0, Math.min(lowerSeg.cornerCut || 0, lowerSeg.w * 0.45, lowerSeg.d * 0.45));

  const oX1 = lX1 + (lowerSeg.skipWalls?.left ? 0.01 : wallInset);
  const oX2 = lX2 - (lowerSeg.skipWalls?.right ? 0.01 : wallInset);
  const oZ1 = lZ1 + (lowerSeg.skipWalls?.back ? 0.01 : wallInset);
  const oZ2 = lZ2 - (lowerSeg.skipWalls?.front ? 0.01 : wallInset);
  const oCut = lCut > 0.015 ? Math.max(0, lCut - wallInset * 0.5) : 0;

  const uX1 = upperSeg.x - upperSeg.w * 0.5;
  const uX2 = upperSeg.x + upperSeg.w * 0.5;
  const uZ1 = upperSeg.z - upperSeg.d * 0.5;
  const uZ2 = upperSeg.z + upperSeg.d * 0.5;
  const uCutRaw = Math.max(0, Math.min(upperSeg.cornerCut || 0, upperSeg.w * 0.45, upperSeg.d * 0.45));

  const in_uX1 = uX1 + (uX1 > lX1 + 0.04 ? overlap : 0);
  const in_uX2 = uX2 - (uX2 < lX2 - 0.04 ? overlap : 0);
  const in_uZ1 = uZ1 + (uZ1 > lZ1 + 0.04 ? overlap : 0);
  const in_uZ2 = uZ2 - (uZ2 < lZ2 - 0.04 ? overlap : 0);
  const in_uCut = uCutRaw > 0.02 ? Math.max(0, uCutRaw - overlap * 0.5) : 0;

  const hasBack = in_uZ1 - oZ1 > 0.04;
  const hasFront = oZ2 - in_uZ2 > 0.04;
  const hasLeft = in_uX1 - oX1 > 0.04;
  const hasRight = oX2 - in_uX2 > 0.04;

  const zL1 = hasBack ? in_uZ1 : oZ1;
  const zL2 = hasFront ? in_uZ2 : oZ2;

  if (hasBack && oX2 - oX1 > 0.04) {
    box(group, (oX1 + oX2) * 0.5, slabY, (oZ1 + in_uZ1) * 0.5, oX2 - oX1, slabH, in_uZ1 - oZ1, roofMat);
  }

  if (hasLeft && zL2 - zL1 > 0.04) {
    box(group, (oX1 + in_uX1) * 0.5, slabY, (zL1 + zL2) * 0.5, in_uX1 - oX1, slabH, zL2 - zL1, roofMat);
  }

  if (oCut <= 0.02 && in_uCut <= 0.02) {
    if (hasFront && oX2 - oX1 > 0.04) {
      box(group, (oX1 + oX2) * 0.5, slabY, (in_uZ2 + oZ2) * 0.5, oX2 - oX1, slabH, oZ2 - in_uZ2, roofMat);
    }
    if (hasRight && zL2 - zL1 > 0.04) {
      box(group, (in_uX2 + oX2) * 0.5, slabY, (zL1 + zL2) * 0.5, oX2 - in_uX2, slabH, zL2 - zL1, roofMat);
    }
  } else {
    const xCorner = Math.min(oX2 - oCut, in_uX2 - in_uCut);
    const zCorner = Math.min(oZ2 - oCut, in_uZ2 - in_uCut);

    if (hasFront && xCorner - oX1 > 0.04) {
      box(group, (oX1 + xCorner) * 0.5, slabY, (in_uZ2 + oZ2) * 0.5, xCorner - oX1, slabH, oZ2 - in_uZ2, roofMat);
    }

    if (hasRight && zCorner - zL1 > 0.04) {
      box(group, (in_uX2 + oX2) * 0.5, slabY, (zL1 + zCorner) * 0.5, oX2 - in_uX2, slabH, zCorner - zL1, roofMat);
    }

    const pts = [];
    const addPt = (px, pz) => {
      if (!pts.length) { pts.push({ x: px, z: pz }); return; }
      const prev = pts[pts.length - 1];
      if (Math.hypot(px - prev.x, pz - prev.z) > 0.015) pts.push({ x: px, z: pz });
    };

    addPt(in_uX2, zCorner);
    addPt(oX2, zCorner);
    if (oZ2 - oCut > zCorner + 0.015) addPt(oX2, oZ2 - oCut);
    addPt(oX2 - oCut, oZ2);
    if (xCorner < oX2 - oCut - 0.015) addPt(xCorner, oZ2);
    addPt(xCorner, in_uZ2);
    addPt(in_uX2 - in_uCut, in_uZ2);
    addPt(in_uX2, in_uZ2 - in_uCut);

    if (pts.length >= 3) {
      const shape = new THREE.Shape();
      shape.moveTo(pts[0].x, pts[0].z);
      for (let k = 1; k < pts.length; k++) shape.lineTo(pts[k].x, pts[k].z);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: slabH, bevelEnabled: false });
      geo.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(geo, roofMat);
      mesh.position.set(0, slabTopY, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }

  const ledgeH = cfg.parapet ? Math.min(0.55, Math.max(0.24, cfg.parapetHeight || 0.4)) : 0.16;
  const ledgeT = Math.max(0.18, Math.min(0.25, cfg.wallThickness));
  const ledgeMat = cfg.parapet ? wallMat : trimMat;
  const py = slabTopY + ledgeH * 0.5;
  const capY = slabTopY + ledgeH + 0.03;

  const getBlockedForSide = (side) => {
    const list = [...(lowerSeg.occlusions?.[side] || [])];
    if (firePlacement && firePlacement.side === side) {
      const fa = getFireEscapeWallAnchor(lowerSeg, side, firePlacement.coord, firePlacement.deckW);
      const ua = getFireEscapeWallAnchor(upperSeg, side, firePlacement.coord, firePlacement.deckW);
      const fMin = Math.min(fa.coord, ua.coord, firePlacement.coord) - firePlacement.deckW * 0.54;
      const fMax = Math.max(fa.coord, ua.coord, firePlacement.coord) + firePlacement.deckW * 0.54;
      list.push([fMin, fMax]);
    }
    return list;
  };

  const hasBackParapet = hasBack && !lowerSeg.skipWalls?.back;
  const hasFrontParapet = hasFront && !lowerSeg.skipWalls?.front;

  if (hasBackParapet) {
    const spans = subtractIntervals(lX1, lX2, getBlockedForSide('back'));
    for (const [s, e] of spans) {
      box(group, (s + e) * 0.5, py, lZ1 + ledgeT * 0.5, e - s, ledgeH, ledgeT, ledgeMat);
      if (cfg.trimAmount > 0.15) {
        box(group, (s + e) * 0.5, capY, lZ1 + ledgeT * 0.5, e - s + 0.04, 0.06, ledgeT + 0.04, trimMat);
      }
    }
  }
  if (hasFrontParapet) {
    const fEnd = lCut > 0.015 ? lX2 - lCut : lX2;
    const spans = subtractIntervals(lX1, fEnd, getBlockedForSide('front'));
    for (const [s, e] of spans) {
      box(group, (s + e) * 0.5, py, lZ2 - ledgeT * 0.5, e - s, ledgeH, ledgeT, ledgeMat);
      if (cfg.trimAmount > 0.15) {
        box(group, (s + e) * 0.5, capY, lZ2 - ledgeT * 0.5, e - s + 0.04, 0.06, ledgeT + 0.04, trimMat);
      }
    }
  }
  if (hasLeft && !lowerSeg.skipWalls?.left) {
    const zStart = lZ1 + (hasBackParapet ? ledgeT : 0);
    const zEnd = lZ2 - (hasFrontParapet ? ledgeT : 0);
    const spans = subtractIntervals(zStart, zEnd, getBlockedForSide('left'));
    for (const [s, e] of spans) {
      box(group, lX1 + ledgeT * 0.5, py, (s + e) * 0.5, ledgeT, ledgeH, e - s, ledgeMat);
      if (cfg.trimAmount > 0.15) {
        box(group, lX1 + ledgeT * 0.5, capY, (s + e) * 0.5, ledgeT + 0.04, 0.06, Math.max(0.08, e - s - 0.04), trimMat);
      }
    }
  }
  if (hasRight && !lowerSeg.skipWalls?.right) {
    const zStart = lZ1 + (hasBackParapet ? ledgeT : 0);
    const zEnd = lCut > 0.015 ? lZ2 - lCut : lZ2 - (hasFrontParapet ? ledgeT : 0);
    const spans = subtractIntervals(zStart, zEnd, getBlockedForSide('right'));
    for (const [s, e] of spans) {
      box(group, lX2 - ledgeT * 0.5, py, (s + e) * 0.5, ledgeT, ledgeH, e - s, ledgeMat);
      if (cfg.trimAmount > 0.15) {
        box(group, lX2 - ledgeT * 0.5, capY, (s + e) * 0.5, ledgeT + 0.04, 0.06, Math.max(0.08, e - s - 0.04), trimMat);
      }
    }
  }

  if (lCut > 0.015 && (hasFront || hasRight)) {
    const cx = lowerSeg.x + lowerSeg.w * 0.5 - lCut * 0.5;
    const cz = lowerSeg.z + lowerSeg.d * 0.5 - lCut * 0.5;
    const diagLen = lCut * Math.SQRT2;
    const wedge = worldRoot(group, cx, slabTopY, cz);
    wedge.rotation.y = Math.PI / 4;
    box(wedge, 0, ledgeH * 0.5, -ledgeT * 0.5, diagLen + ledgeT * 0.2, ledgeH, ledgeT, ledgeMat);
    if (cfg.trimAmount > 0.15) {
      box(wedge, 0, ledgeH + 0.03, -ledgeT * 0.5, diagLen + ledgeT * 0.3, 0.06, ledgeT + 0.04, trimMat);
    }
  }

  const frontD = oZ2 - in_uZ2;
  if (frontD > 0.65 && (cfg.tarPatches || cfg.roofPuddles || cfg.age > 0.45)) {
    const weathW = Math.max(1, (oX2 - oCut) - oX1 - 0.6);
    addSurfaceWeathering(group, (oX1 + (oX2 - oCut)) * 0.5, slabTopY, in_uZ2 + frontD * 0.5, weathW, frontD - 0.35, cfg, r);
  }
}

export function addVerticalDetails(group, seg, sectionHeight, cfg) {
  if (cfg.facadeAccent === 'none' || cfg.trimAmount <= 0.02) return;
  const trim = solid(cfg.trimColor);
  const cut = seg.cornerCut || 0;
  const usableH = sectionHeight - 0.18;

  for (const side of ['front', 'back', 'left', 'right']) {
    if (seg.skipWalls?.[side]) continue;
    const long = side === 'front' || side === 'back';
    const sideCut = (side === 'front' || side === 'right') ? cut : 0;
    const spanStart = long ? seg.x - seg.w * 0.5 : seg.z - seg.d * 0.5;
    const spanEnd = (long ? seg.x + seg.w * 0.5 : seg.z + seg.d * 0.5) - sideCut;
    const exposed = subtractIntervals(spanStart, spanEnd, seg.occlusions?.[side] || []);
    if (!exposed.length) continue;

    if (cfg.facadeAccent === 'vertical' && (side === 'front' || side === 'left' || side === 'right')) {
      const spanLen = spanEnd - spanStart;
      const col = Math.max(2, Math.floor(spanLen / 3.2));
      for (let i = 0; i <= col; i++) {
        const p = spanStart + (spanLen * i) / col;
        if (exposed.some(([s, e]) => p >= s - 0.05 && p <= e + 0.05)) {
          if (long) {
            const zOut = side === 'front' ? seg.z + seg.d * 0.5 + 0.025 : seg.z - seg.d * 0.5 - 0.025;
            box(group, p, usableH * 0.5, zOut, 0.15, usableH, 0.06, trim);
          } else {
            const xOut = side === 'left' ? seg.x - seg.w * 0.5 - 0.025 : seg.x + seg.w * 0.5 + 0.025;
            box(group, xOut, usableH * 0.5, p, 0.06, usableH, 0.15, trim);
          }
        }
      }
    } else if (cfg.facadeAccent === 'ornate' && side === 'front') {
      for (const px of [spanStart + 0.32, spanEnd - 0.32]) {
        if (exposed.some(([s, e]) => px >= s - 0.1 && px <= e + 0.1)) {
          box(group, px, usableH * 0.5, seg.z + seg.d * 0.5 + 0.08, 0.3, usableH, 0.16, trim);
        }
      }
    }

    if (cfg.trimAmount > 0.2) {
      const depth = cfg.facadeAccent === 'cornice' ? 0.34 : 0.22;
      const corniceH = 0.22 + cfg.trimAmount * 0.16;
      const corniceY = sectionHeight - corniceH * 0.5 - 0.14;
      for (const [s, e] of exposed) {
        const len = e - s;
        const mid = (s + e) * 0.5;
        if (long) {
          const zOut = side === 'front' ? seg.z + seg.d * 0.5 + depth * 0.42 : seg.z - seg.d * 0.5 - depth * 0.42;
          box(group, mid, corniceY, zOut, len + 0.18, corniceH, depth, trim);
        } else {
          const xOut = side === 'left' ? seg.x - seg.w * 0.5 - depth * 0.42 : seg.x + seg.w * 0.5 + depth * 0.42;
          box(group, xOut, corniceY, mid, depth, corniceH, len + 0.18, trim);
        }
      }
    }
  }
}

export function addInteriors(group, seg, index, cfg) {
  const inspectActive = cfg.cutaway || (cfg.inspectedFloor > 0 && cfg.inspectedFloor <= cfg.floors);
  if (cfg.interiorMode === 'none' && !inspectActive) return;

  const baseY = index * cfg.floorHeight;
  const tWall = cfg.wallThickness;
  const floorMat = solid(index % 2 ? '#746d60' : '#8c7d68');
  const yMicro = (seg.extIndex >= 0 ? (seg.extIndex + 1) : 0) * 0.002;
  slabBox(group, seg, baseY + 0.08 + yMicro, 0.15, tWall * 0.95, floorMat);

  const h = cfg.floorHeight * 0.82;
  const t = 0.09;
  const wall = solid('#c8c0ac');
  const innerW = seg.w - tWall * 2 - 0.12;
  const innerD = seg.d - tWall * 2 - 0.12;
  if (innerW <= 1.5 || innerD <= 1.5) return;

  const hasStairBay = seg.isMain && cfg.stairwell && innerW >= 4.2 && innerD >= 3.2;
  const stairBayW = hasStairBay ? Math.min(2.6, innerW * 0.32) : 0;
  const roomStartX = seg.x - innerW * 0.5 + stairBayW;
  const roomSpanW = innerW - stairBayW;

  if (cfg.interiorMode === 'apartments' && roomSpanW >= 2.2) {
    const rooms = clamp(cfg.roomsPerFloor, 1, Math.max(1, Math.floor(roomSpanW / 1.6)));
    box(group, roomStartX + roomSpanW * 0.5, baseY + h * 0.5 + 0.16, seg.z, roomSpanW, h, t, wall);
    if (hasStairBay) {
      box(group, roomStartX, baseY + h * 0.5 + 0.16, seg.z - innerD * 0.22, t, h, innerD * 0.52, wall);
    }
    for (let i = 1; i < rooms; i++) {
      const xx = roomStartX + (roomSpanW * i) / rooms;
      box(group, xx, baseY + h * 0.5 + 0.16, seg.z - innerD * 0.25, t, h, innerD * 0.48, wall);
      box(group, xx, baseY + h * 0.5 + 0.16, seg.z + innerD * 0.25, t, h, innerD * 0.48, wall);
    }
    for (let i = 0; i < Math.min(rooms * 2, 12); i++) {
      const xx = roomStartX + (i % rooms + 0.5) * (roomSpanW / rooms);
      const zz = seg.z + (i < rooms ? -0.26 : 0.26) * innerD;
      box(group, xx, baseY + 0.3, zz, Math.min(0.64, (roomSpanW / rooms) * 0.5), 0.28, 0.8, solid(i % 3 === 0 ? '#8e5855' : '#576b79'));
    }
  } else if (cfg.interiorMode === 'basic' && roomSpanW >= 2.0) {
    box(group, roomStartX + roomSpanW * 0.5, baseY + h * 0.5 + 0.16, seg.z, roomSpanW - 0.3, h, t, wall);
    box(group, roomStartX + roomSpanW * 0.5, baseY + h * 0.5 + 0.16, seg.z - innerD * 0.24, t, h, innerD * 0.44, wall);
  }

  if (hasStairBay) {
    const stairMat = solid('#77766d');
    const railMat = solid('#454a4d');
    const bayCenterX = seg.x - innerW * 0.5 + stairBayW * 0.5;
    const bayZ = seg.z - innerD * 0.24;
    const runW = Math.max(1.2, stairBayW - 0.55);
    const halfH = cfg.floorHeight * 0.5;
    const midY = baseY + halfH;

    box(group, seg.x - innerW * 0.5 + 0.32, midY, bayZ, 0.62, 0.12, 1.45, stairMat);

    const stepsPerFlight = 6;
    const stepW = runW / stepsPerFlight;
    for (let i = 0; i < stepsPerFlight; i++) {
      const tFrac = (i + 0.5) / stepsPerFlight;
      const x1 = bayCenterX + runW * 0.45 - tFrac * runW;
      const y1 = baseY + 0.16 + ((i + 1) / stepsPerFlight) * (halfH - 0.16);
      box(group, x1, y1, bayZ - 0.34, stepW + 0.04, 0.11, 0.62, stairMat);

      const x2 = bayCenterX - runW * 0.45 + tFrac * runW;
      const y2 = midY + ((i + 1) / stepsPerFlight) * halfH;
      box(group, x2, y2, bayZ + 0.34, stepW + 0.04, 0.11, 0.62, stairMat);
    }

    const topLandingY = baseY + cfg.floorHeight - 0.08;
    const topRailEndY = (index === cfg.floors - 1 || (cfg.setback > 0 && index + 1 >= Math.floor(cfg.floors * 0.6)))
      ? baseY + cfg.floorHeight - 0.1
      : baseY + cfg.floorHeight + 0.7;
    line(group, [bayCenterX + runW * 0.45, baseY + 0.16, bayZ - 0.34], [bayCenterX - runW * 0.45, midY, bayZ - 0.34], 0.05, stairMat);
    line(group, [bayCenterX - runW * 0.45, midY, bayZ + 0.34], [bayCenterX + runW * 0.45, topLandingY, bayZ + 0.34], 0.05, stairMat);
    line(group, [bayCenterX + runW * 0.45, baseY + 0.85, bayZ], [bayCenterX - runW * 0.45, midY + 0.7, bayZ], 0.03, railMat);
    line(group, [bayCenterX - runW * 0.45, midY + 0.7, bayZ], [bayCenterX + runW * 0.45, topRailEndY, bayZ], 0.03, railMat);
  }

  if (seg.isMain && cfg.elevator && innerW >= 3.5) {
    const cut = seg.cornerCut || 0;
    const elevH = cfg.floorHeight - 0.12;
    const x = seg.x + innerW * 0.5 - cut - 0.72;
    const z = seg.z - innerD * 0.5 + 0.72;
    box(group, x, baseY + elevH * 0.5 + 0.04, z, 1.24, elevH, 1.2, solid('#8b9194'));
    box(group, x, baseY + cfg.floorHeight * 0.42, z + 0.62, 0.9, Math.min(2.1, cfg.floorHeight * 0.68), 0.06, glassMaterial('#28383d'));
  }
}

export function addVines(group, seg, totalHeight, cfg, r) {
  if (cfg.overgrowth <= 0) return;
  const ivy = solid('#415f37');
  const cut = seg.cornerCut || 0;
  const sides = ['front', 'left', 'right', 'back'];

  for (const side of sides) {
    if (seg.skipWalls?.[side]) continue;
    const long = side === 'front' || side === 'back';
    const sideCut = (side === 'front' || side === 'right') ? cut : 0;
    const spanStart = (long ? seg.x - seg.w * 0.5 : seg.z - seg.d * 0.5) + 0.3;
    const spanEnd = (long ? seg.x + seg.w * 0.5 : seg.z + seg.d * 0.5) - sideCut - 0.3;
    const exposed = subtractIntervals(spanStart, spanEnd, seg.occlusions?.[side] || []);
    if (!exposed.length) continue;

    const clusters = Math.max(1, Math.ceil(cfg.overgrowth * (side === 'front' ? 16 : 9)));
    for (let i = 0; i < clusters; i++) {
      const span = pick(r, exposed);
      const pos = randBetween(r, span[0], span[1]);
      const pos2 = clamp(pos + randBetween(r, -0.55, 0.55), span[0], span[1]);
      const y = randBetween(r, 0.4, totalHeight * 0.88);
      const y2 = Math.min(totalHeight - 0.2, y + randBetween(r, 0.4, 1.5));

      if (long) {
        const zOut = side === 'front' ? seg.z + seg.d * 0.5 + 0.06 : seg.z - seg.d * 0.5 - 0.06;
        line(group, [pos, y, zOut], [pos2, y2, zOut], 0.028, ivy);
        for (let j = 0; j < 3; j++) {
          const leaf = new THREE.Mesh(
            new THREE.IcosahedronGeometry(randBetween(r, 0.1, 0.23), 0),
            solid(pick(r, ['#425c30', '#677a45', '#394a2c']))
          );
          leaf.position.set(clamp(pos + randBetween(r, -0.25, 0.25), span[0], span[1]), y + j * 0.25, zOut + (side === 'front' ? 0.04 : -0.04));
          group.add(leaf);
        }
      } else {
        const xOut = side === 'left' ? seg.x - seg.w * 0.5 - 0.06 : seg.x + seg.w * 0.5 + 0.06;
        line(group, [xOut, y, pos], [xOut, y2, pos2], 0.028, ivy);
        for (let j = 0; j < 3; j++) {
          const leaf = new THREE.Mesh(
            new THREE.IcosahedronGeometry(randBetween(r, 0.1, 0.23), 0),
            solid(pick(r, ['#425c30', '#677a45', '#394a2c']))
          );
          leaf.position.set(xOut + (side === 'left' ? -0.04 : 0.04), y + j * 0.25, clamp(pos + randBetween(r, -0.25, 0.25), span[0], span[1]));
          group.add(leaf);
        }
      }
    }
  }
}

export function addRoof(group, seg, y, cfg, r, segIdx = 0) {
  const roof = solid(cfg.roofColor);
  const trim = solid(cfg.trimColor);
  const wallMat = solid(cfg.wallColor);
  const cut = seg.cornerCut || 0;
  const yLift = segIdx * 0.003;

  slabBox(group, seg, y - 0.07 + yLift, 0.14, 0.01, roof);

  let deckTopY = y + yLift;
  const pitchedW = seg.w - cut;
  const pitchedX = seg.x - cut * 0.5;
  const ridgeH = Math.min(2.6, Math.max(1.4, Math.min(pitchedW, seg.d) * 0.26));

  if (cfg.roofType === 'pitched') {
    const overW = pitchedW + 0.24;
    const overD = seg.d + (seg.skipWalls?.back ? -0.04 : 0.24);
    const shape = new THREE.Shape();
    shape.moveTo(-overW * 0.5, 0);
    shape.lineTo(0, ridgeH);
    shape.lineTo(overW * 0.5, 0);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: overD, bevelEnabled: false });
    const mesh = new THREE.Mesh(geo, roof);
    mesh.position.set(pitchedX, y + yLift, seg.z - overD * 0.5);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    if (cfg.tarPatches || cfg.damage > 0.3) {
      const slopeAngle = Math.atan2(ridgeH, overW * 0.5);
      for (const s of [-1, 1]) {
        const patch = box(group, pitchedX + s * (pitchedW * 0.24), y + ridgeH * 0.48, seg.z + randBetween(r, -seg.d * 0.22, seg.d * 0.22), pitchedW * 0.22, 0.04, seg.d * 0.28, solid(s < 0 ? '#1d2022' : '#6c6256'));
        if (patch) patch.rotation.z = -s * slopeAngle;
      }
    }
  } else if (cfg.roofType === 'mansard') {
    slabBox(group, seg, y + 0.28 + yLift, 0.56, seg.w * 0.05, roof);
    slabBox(group, seg, y + 0.70 + yLift, 0.28, seg.w * 0.12, solid(cfg.secondaryWallColor));
    deckTopY = y + 0.84 + yLift;
  } else if (cfg.roofType === 'stepped') {
    slabBox(group, seg, y + 0.22 + yLift, 0.44, seg.w * 0.06, wallMat);
    slabBox(group, seg, y + 0.57 + yLift, 0.26, seg.w * 0.16, trim);
    deckTopY = y + 0.7 + yLift;
  }

  if (cfg.roofType !== 'pitched') {
    const insetFactor = cfg.roofType === 'flat' ? 0.82 : 0.62;
    addSurfaceWeathering(group, seg.x - cut * 0.35, deckTopY, seg.z, (seg.w - cut) * insetFactor, seg.d * insetFactor, cfg, r);
  }

  if (cfg.skylights && seg.w >= 4.5 && seg.d >= 4.5) {
    if (cfg.roofType === 'pitched') {
      const slopeAngle = Math.atan2(ridgeH, pitchedW * 0.5);
      for (const s of [-1, 1]) {
        const sx = pitchedX + s * (pitchedW * 0.22);
        const sy = y + ridgeH * 0.52;
        const sky = box(group, sx, sy, seg.z, pitchedW * 0.22, 0.12, seg.d * 0.32, glassMaterial('#577d90', cfg.windowLighting > 0.3));
        if (sky) sky.rotation.z = -s * slopeAngle;
      }
    } else {
      const insetScale = cfg.roofType === 'flat' ? 1 : 0.72;
      for (const s of [-1, 1]) {
        const sx = seg.x - cut * 0.25 + s * (seg.w - cut) * 0.18 * insetScale;
        box(group, sx, deckTopY + 0.05, seg.z, seg.w * 0.19 * insetScale, 0.1, seg.d * 0.22 * insetScale, trim);
        const sky = box(group, sx, deckTopY + 0.14, seg.z, seg.w * 0.18 * insetScale, 0.14, seg.d * 0.2 * insetScale, glassMaterial('#577d90', cfg.windowLighting > 0.3));
        if (sky) sky.rotation.x = -0.08;
      }
    }
  }

  if (cfg.parapet) {
    const ph = cfg.parapetHeight;
    const pt = Math.max(0.2, cfg.wallThickness);
    const frontExposed = subtractIntervals(seg.x - seg.w * 0.5, seg.x + seg.w * 0.5 - cut, seg.occlusions?.front || []);
    const backExposed = subtractIntervals(seg.x - seg.w * 0.5, seg.x + seg.w * 0.5, seg.occlusions?.back || []);
    const leftExposed = subtractIntervals(seg.z - seg.d * 0.5, seg.z + seg.d * 0.5, seg.occlusions?.left || []);
    const rightExposed = subtractIntervals(seg.z - seg.d * 0.5, seg.z + seg.d * 0.5 - cut, seg.occlusions?.right || []);

    if (!seg.skipWalls?.front && cfg.roofType !== 'pitched') {
      for (const [s, e] of frontExposed) {
        box(group, (s + e) * 0.5, y + ph * 0.5, seg.z + seg.d * 0.5 - pt * 0.5, e - s + 0.04, ph, pt, wallMat);
        if (cfg.trimAmount > 0.15) box(group, (s + e) * 0.5, y + ph + 0.05, seg.z + seg.d * 0.5 - pt * 0.3, e - s + 0.16, 0.1, pt + 0.12, trim);
      }
    }
    if (!seg.skipWalls?.back && cfg.roofType !== 'pitched') {
      for (const [s, e] of backExposed) {
        box(group, (s + e) * 0.5, y + ph * 0.5, seg.z - seg.d * 0.5 + pt * 0.5, e - s + 0.04, ph, pt, wallMat);
        if (cfg.trimAmount > 0.15) box(group, (s + e) * 0.5, y + ph + 0.05, seg.z - seg.d * 0.5 + pt * 0.3, e - s + 0.16, 0.1, pt + 0.12, trim);
      }
    }
    if (!seg.skipWalls?.left) {
      for (const [s, e] of leftExposed) {
        box(group, seg.x - seg.w * 0.5 + pt * 0.5, y + ph * 0.5, (s + e) * 0.5, pt, ph, Math.max(0.1, e - s - pt * 2), wallMat);
      }
    }
    if (!seg.skipWalls?.right) {
      for (const [s, e] of rightExposed) {
        box(group, seg.x + seg.w * 0.5 - pt * 0.5, y + ph * 0.5, (s + e) * 0.5, pt, ph, Math.max(0.1, e - s - pt * 2), wallMat);
      }
    }
    if (cut > 0.05) {
      const cx = seg.x + seg.w * 0.5 - cut * 0.5;
      const cz = seg.z + seg.d * 0.5 - cut * 0.5;
      const wedge = worldRoot(group, cx, y, cz);
      wedge.rotation.y = Math.PI / 4;
      box(wedge, 0, ph * 0.5, -pt * 0.5, cut * Math.SQRT2 + pt * 0.4, ph, pt, wallMat);
    }
  }
}

export function addRooftopProps(group, topSegments, groundMain, cfg, r, baseHeight) {
  if (!topSegments.length) return;
  const roof = solid('#697277');
  const roofDark = solid('#363d40');
  const metal = solid('#858d8e');
  const pipeMat = solid('#5b6468');
  const cableMat = solid('#1d2225');
  const mainSeg = topSegments[0];
  const cut = mainSeg.cornerCut || 0;
  const isPitched = cfg.roofType === 'pitched';
  const pitchedW = mainSeg.w - cut;
  const ridgeH = isPitched ? Math.min(2.6, Math.max(1.4, Math.min(pitchedW, mainSeg.d) * 0.26)) : 0;
  const roofLift = cfg.roofType === 'mansard' ? 0.84 : cfg.roofType === 'stepped' ? 0.7 : (isPitched ? ridgeH * 0.55 : 0);
  const height = baseHeight + roofLift;

  const insetMargin = (cfg.roofType === 'mansard' || cfg.roofType === 'stepped') ? 1.8 : 1.4;
  const safeBounds = (seg, margin) => ({
    minX: seg.x - seg.w * 0.5 + margin,
    maxX: seg.x + seg.w * 0.5 - (seg.cornerCut || 0) - margin,
    minZ: seg.z - seg.d * 0.5 + margin,
    maxZ: seg.z + seg.d * 0.5 - (seg.cornerCut || 0) - margin
  });

  const b0 = safeBounds(mainSeg, insetMargin);
  const cableAnchors = [];

  if (cfg.rooftopWaterTank && b0.maxX > b0.minX && b0.maxZ > b0.minZ) {
    const x = clamp(mainSeg.x + (mainSeg.w - cut) * 0.2, b0.minX, b0.maxX);
    const z = clamp(mainSeg.z - mainSeg.d * 0.18, b0.minZ, b0.maxZ);
    const legBaseH = isPitched ? 2.4 : 1.8;
    for (const dx of [-0.66, 0.66]) {
      for (const dz of [-0.66, 0.66]) {
        box(group, x + dx, height + 0.58, z + dz, 0.12, legBaseH, 0.12, roofDark);
      }
    }
    cylinder(group, x, height + 2.22, z, 1.15, 1.12, 1.35, solid('#655449'), 10);
    cylinder(group, x, height + 2.98, z, 1.22, 1.0, 0.25, roofDark, 10);
    for (let i = 0; i < 3; i++) {
      cylinder(group, x, height + 1.8 + i * 0.4, z, 1.16, 1.16, 0.07, metal, 10);
    }
    cableAnchors.push([x, height + 2.5, z]);
  }

  for (let i = 0; i < cfg.chimneys; i++) {
    const seg = pick(r, topSegments);
    const b = safeBounds(seg, 0.9);
    if (b.maxX <= b.minX || b.maxZ <= b.minZ) continue;
    const x = randBetween(r, b.minX, b.maxX);
    const z = randBetween(r, b.minZ, b.maxZ);
    const chimH = isPitched ? 2.2 : 1.4;
    box(group, x, baseHeight + chimH * 0.5, z, 0.62, chimH, 0.55, solid('#676663'));
    box(group, x, baseHeight + chimH + 0.07, z, 0.81, 0.15, 0.74, roofDark);
    cableAnchors.push([x, baseHeight + chimH * 0.85, z]);
  }

  const hvacPositions = [];
  const units = Math.round(cfg.rooftopProps * 8);
  for (let i = 0; i < units; i++) {
    const seg = pick(r, topSegments);
    const b = safeBounds(seg, insetMargin);
    if (b.maxX <= b.minX || b.maxZ <= b.minZ) continue;
    const x = isPitched ? seg.x - (seg.cornerCut || 0) * 0.5 : randBetween(r, b.minX, b.maxX);
    const z = randBetween(r, b.minZ, b.maxZ);
    const propBaseY = isPitched ? baseHeight + ridgeH - 0.15 : height;
    if (r() < 0.67) {
      const uw = randBetween(r, 0.7, 1.4);
      const ud = randBetween(r, 0.7, 1.2);
      box(group, x, propBaseY + 0.4, z, uw, 0.8, ud, roof);
      for (let j = 0; j < 3; j++) {
        box(group, x + (j - 1) * (uw * 0.24), propBaseY + 0.4, z + ud * 0.5 + 0.02, 0.08, 0.42, 0.04, roofDark);
      }
      hvacPositions.push([x, propBaseY, z]);
      cableAnchors.push([x, propBaseY + 0.76, z]);
    } else {
      cylinder(group, x, propBaseY + 0.13, z, 0.45, 0.45, 0.26, metal, 8);
      cylinder(group, x, propBaseY + 0.38, z, 0.18, 0.18, 0.32, roofDark, 8);
    }
  }

  if (cfg.antennas && b0.maxX > b0.minX && b0.maxZ > b0.minZ) {
    const x = isPitched ? mainSeg.x - cut * 0.5 : clamp(mainSeg.x - mainSeg.w * 0.28, b0.minX, b0.maxX);
    const z = clamp(mainSeg.z - mainSeg.d * 0.18, b0.minZ, b0.maxZ);
    const antBaseY = isPitched ? baseHeight + ridgeH : height;
    line(group, [x, antBaseY, z], [x, antBaseY + 3, z], 0.055, roof);
    line(group, [x - 0.8, antBaseY + 2.15, z], [x + 0.8, antBaseY + 2.15, z], 0.045, metal);
    line(group, [x - 0.43, antBaseY + 2.55, z], [x + 0.43, antBaseY + 2.55, z], 0.045, metal);
    cableAnchors.push([x, antBaseY + 2.1, z]);
  }

  if (cfg.rooftopPipes) {
    const pipeY = height + 0.09;
    if (!isPitched && b0.maxX > b0.minX && b0.maxZ > b0.minZ) {
      const backRunZ = mainSeg.z - mainSeg.d * 0.5 + 0.42;
      const leftRunX = mainSeg.x - mainSeg.w * 0.5 + 0.42;
      const rightRunX = mainSeg.x + mainSeg.w * 0.5 - cut - 0.42;

      line(group, [leftRunX, pipeY, backRunZ], [rightRunX, pipeY, backRunZ], 0.055, pipeMat);
      line(group, [leftRunX, pipeY, backRunZ], [leftRunX, pipeY, mainSeg.z + mainSeg.d * 0.32], 0.05, pipeMat);
      if (cfg.parapet) {
        line(group, [leftRunX, pipeY, backRunZ], [leftRunX, baseHeight + cfg.parapetHeight + 0.12, backRunZ], 0.05, pipeMat);
      }

      for (let i = 0; i < Math.min(3, hvacPositions.length); i++) {
        const [hx, , hz] = hvacPositions[i];
        line(group, [hx, pipeY, hz], [hx, pipeY, backRunZ], 0.04, metal);
      }

      const postA = [leftRunX + 0.15, baseHeight + (cfg.parapet ? cfg.parapetHeight : 0) + 1.15, mainSeg.z + mainSeg.d * 0.38];
      const postB = [rightRunX - 0.15, baseHeight + (cfg.parapet ? cfg.parapetHeight : 0) + 1.15, backRunZ + 0.15];
      line(group, [postA[0], height, postA[2]], postA, 0.04, roofDark);
      line(group, [postB[0], height, postB[2]], postB, 0.04, roofDark);
      cableAnchors.push(postA, postB);
    }

    for (let i = 0; i < cableAnchors.length - 1; i++) {
      sagCable(group, cableAnchors[i], cableAnchors[i + 1], randBetween(r, 0.22, 0.48), 0.018, cableMat, 6);
    }

    if (groundMain && !cfg.cutaway) {
      const mainH = cfg.setback > 0 ? Math.floor(cfg.floors * 0.6) * cfg.floorHeight : baseHeight;
      const spoutX = groundMain.x - groundMain.w * 0.5 + 0.32;
      const spoutZ = groundMain.z - groundMain.d * 0.5 - 0.06;
      line(group, [spoutX, 0.1, spoutZ], [spoutX, mainH - 0.1, spoutZ], 0.048, pipeMat);
      const sideSpoutX = groundMain.x - groundMain.w * 0.5 - 0.06;
      const sideSpoutZ = groundMain.z + groundMain.d * 0.32;
      line(group, [sideSpoutX, 0.1, sideSpoutZ], [sideSpoutX, mainH - 0.1, sideSpoutZ], 0.045, pipeMat);
      box(group, sideSpoutX - 0.04, 1.35, sideSpoutZ - 0.45, 0.12, 0.42, 0.32, roofDark);
      line(group, [sideSpoutX, 1.56, sideSpoutZ - 0.45], [sideSpoutX, mainH * 0.65, sideSpoutZ - 0.45], 0.025, metal);
    }
  }
}
