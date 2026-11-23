import { infraVec3Add, infraVec3Cross, infraVec3Dist, infraVec3Lerp, infraVec3Norm, infraVec3Scale } from '../utils.js';
import { geoPrimAddBeamBetween } from './primitives.js';

const SUPP_OPTS_STEEL = {
  layer: 'LayerB_StructuralSupports',
  materialKey: 'steel_structure',
  surfaceStratum: 'structural_support'
};

const SUPP_OPTS_WEB = {
  layer: 'LayerB_StructuralSupports',
  materialKey: 'steel_grating',
  surfaceStratum: 'structural_support'
};

const SUPP_OPTS_ACCENT = {
  layer: 'LayerB_StructuralSupports',
  materialKey: 'steel_accent',
  surfaceStratum: 'structural_support'
};

const SUPP_OPTS_RAIL = {
  layer: 'LayerB_StructuralSupports',
  materialKey: 'rail_steel',
  surfaceStratum: 'structural_support'
};

function geoSuppPt(cx, cz, right, tangent, latX, elevY, longZ = 0) {
  return [
    cx + right[0] * latX + tangent[0] * longZ,
    elevY,
    cz + right[2] * latX + tangent[2] * longZ
  ];
}

// Stepped chamfered concrete pedestal with steel anchor plate & optional pin-hinge shoe
function geoSuppAddSteppedPlinth(batcher, cx, cz, baseY, tangent, right, up, w = 1.45, d = 1.55, withPinShoe = true) {
  batcher.addBoxOriented([cx, baseY + 0.19, cz], tangent, right, up, w, 0.38, d, {
    layer: 'LayerB_StructuralSupports',
    materialKey: 'pier_concrete',
    surfaceStratum: 'structural_support'
  });
  batcher.addBoxOriented([cx, baseY + 0.51, cz], tangent, right, up, w * 0.78, 0.26, d * 0.78, {
    layer: 'LayerB_StructuralSupports',
    materialKey: 'barrier_concrete',
    surfaceStratum: 'structural_support'
  });
  batcher.addBoxOriented([cx, baseY + 0.67, cz], tangent, right, up, w * 0.62, 0.06, d * 0.64, SUPP_OPTS_WEB);
  if (withPinShoe) {
    batcher.addBoxOriented([cx, baseY + 0.79, cz], tangent, right, up, w * 0.42, 0.18, d * 0.56, SUPP_OPTS_STEEL);
    batcher.addBoxOriented([cx, baseY + 0.82, cz], tangent, right, up, w * 0.48, 0.07, d * 0.14, SUPP_OPTS_RAIL);
  }
}

// True 3-piece flanged steel I-beam (recessed dark web + projecting top/bottom flanges + optional web stiffeners)
function geoSuppAddIBeamBetween(batcher, p0, p1, flangeW, depthH, options = {}) {
  const len = infraVec3Dist(p0, p1);
  if (len < 1e-4) return;
  const dir = infraVec3Norm([p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], [0, 0, 1]);
  const upHint = Math.abs(dir[1]) < 0.92 ? [0, 1, 0] : [0, 0, 1];
  const side = infraVec3Norm(infraVec3Cross(dir, upHint), [1, 0, 0]);
  const normal = infraVec3Norm(infraVec3Cross(side, dir), [0, 1, 0]);

  const flangeH = Math.max(0.06, depthH * 0.18);
  const webH = Math.max(0.08, depthH - flangeH * 2 - 0.01);
  const webW = Math.max(0.08, flangeW * 0.36);
  const flangeOff = (webH + flangeH) * 0.5 + 0.004;
  const mid = [(p0[0] + p1[0]) * 0.5, (p0[1] + p1[1]) * 0.5, (p0[2] + p1[2]) * 0.5];

  // Recessed dark web plate
  batcher.addBoxOriented(mid, dir, side, normal, webW, webH, len, options.webOpts || SUPP_OPTS_WEB);
  // Top & bottom projecting steel flanges
  for (const sgn of [-1, 1]) {
    const fCenter = infraVec3Add(mid, infraVec3Scale(normal, sgn * flangeOff));
    batcher.addBoxOriented(fCenter, dir, side, normal, flangeW, flangeH, len + 0.02, options.flangeOpts || SUPP_OPTS_STEEL);
  }
  // Optional vertical web stiffener ribs along girder span
  const stiffeners = options.stiffeners || 0;
  if (stiffeners > 0) {
    for (let i = 1; i <= stiffeners; i++) {
      const t = i / (stiffeners + 1);
      const sp = infraVec3Lerp(p0, p1, t);
      batcher.addBoxOriented(sp, dir, side, normal, flangeW * 0.88, webH * 0.96, 0.075, SUPP_OPTS_STEEL);
    }
  }
}

// Open Warren-laced twin-chord steel column/leg (slim chords + diagonal X/Warren bracing + tie battens)
function geoSuppAddLacedLeg(batcher, botA, botB, topA, topB, chordSize = 0.17, bays = 4, options = {}) {
  const chordOpts = options.chordOpts || SUPP_OPTS_STEEL;
  const braceOpts = options.braceOpts || SUPP_OPTS_WEB;
  const braceT = chordSize * 0.56;

  // Twin primary chords
  geoPrimAddBeamBetween(batcher, botA, topA, chordSize, chordSize, chordOpts);
  geoPrimAddBeamBetween(batcher, botB, topB, chordSize, chordSize, chordOpts);

  // Diagonal Warren lacing + horizontal batten rungs across bays
  const count = Math.max(2, bays);
  for (let i = 0; i < count; i++) {
    const t0 = i / count;
    const t1 = (i + 1) / count;
    const a0 = infraVec3Lerp(botA, topA, t0);
    const b0 = infraVec3Lerp(botB, topB, t0);
    const a1 = infraVec3Lerp(botA, topA, t1);
    const b1 = infraVec3Lerp(botB, topB, t1);

    if (i > 0) {
      geoPrimAddBeamBetween(batcher, a0, b0, braceT * 1.15, braceT * 1.15, chordOpts);
    }
    const diagStart = i % 2 === 0 ? a0 : b0;
    const diagEnd = i % 2 === 0 ? b1 : a1;
    geoPrimAddBeamBetween(batcher, diagStart, diagEnd, braceT, braceT, braceOpts);
  }
}

// Open-web overhead Warren truss cross-girder (top flanged chord, bottom chord, vertical posts & diagonal web struts)
function geoSuppAddPortalTrussGirder(batcher, cx, cz, right, tangent, leftX, rightX, botY, topY, bays = 5, chordW = 0.38) {
  const depth = Math.max(0.45, topY - botY);
  const chordH = Math.min(0.16, depth * 0.24);
  const postT = 0.12;
  const diagT = 0.1;

  // Top & bottom flanged steel chords
  geoPrimAddBeamBetween(
    batcher,
    geoSuppPt(cx, cz, right, tangent, leftX - 0.16, topY),
    geoSuppPt(cx, cz, right, tangent, rightX + 0.16, topY),
    chordW,
    chordH,
    SUPP_OPTS_STEEL
  );
  geoPrimAddBeamBetween(
    batcher,
    geoSuppPt(cx, cz, right, tangent, leftX - 0.1, botY),
    geoSuppPt(cx, cz, right, tangent, rightX + 0.1, botY),
    chordW * 0.88,
    chordH * 0.9,
    SUPP_OPTS_STEEL
  );
  // Crisp accent top cap strip along truss crown
  geoPrimAddBeamBetween(
    batcher,
    geoSuppPt(cx, cz, right, tangent, leftX, topY + chordH * 0.56),
    geoSuppPt(cx, cz, right, tangent, rightX, topY + chordH * 0.56),
    chordW * 0.42,
    0.045,
    SUPP_OPTS_ACCENT
  );

  // Twin-plane vertical posts & alternating Warren diagonals (slight longitudinal Z offset so zero coplanar faces)
  const count = Math.max(3, bays);
  for (let i = 0; i <= count; i++) {
    const x = leftX + ((rightX - leftX) * i) / count;
    for (const lz of [-chordW * 0.3, chordW * 0.3]) {
      geoPrimAddBeamBetween(
        batcher,
        geoSuppPt(cx, cz, right, tangent, x, botY + chordH * 0.4, lz),
        geoSuppPt(cx, cz, right, tangent, x, topY - chordH * 0.4, lz),
        postT,
        postT,
        SUPP_OPTS_STEEL
      );
    }
    if (i < count) {
      const xNext = leftX + ((rightX - leftX) * (i + 1)) / count;
      const flip = i % 2 === 1;
      for (const lz of [-chordW * 0.28, chordW * 0.28]) {
        const pStart = geoSuppPt(cx, cz, right, tangent, x, flip ? topY - chordH * 0.42 : botY + chordH * 0.42, lz);
        const pEnd = geoSuppPt(cx, cz, right, tangent, xNext, flip ? botY + chordH * 0.42 : topY - chordH * 0.42, lz);
        geoPrimAddBeamBetween(batcher, pStart, pEnd, diagT, diagT, SUPP_OPTS_WEB);
      }
    }
  }
}

function pushSupportBox(collectors, pA, pB, padXZ = 0.28, padY = 0.14) {
  if (!collectors?.supportBoxes) return;
  collectors.supportBoxes.push([
    Math.min(pA[0], pB[0]) - padXZ,
    Math.min(pA[1], pB[1]) - padY,
    Math.min(pA[2], pB[2]) - padXZ,
    Math.max(pA[0], pB[0]) + padXZ,
    Math.max(pA[1], pB[1]) + padY,
    Math.max(pA[2], pB[2]) + padXZ
  ]);
}

function pushSlopedSupportBoxes(collectors, pA, pB, steps = 4, padXZ = 0.24, padY = 0.18) {
  if (!collectors?.supportBoxes) return;
  for (let i = 0; i < steps; i++) {
    const a = infraVec3Lerp(pA, pB, i / steps);
    const b = infraVec3Lerp(pA, pB, (i + 1) / steps);
    pushSupportBox(collectors, a, b, padXZ, padY);
  }
}

export function geoBuildSupport(batcher, supp, collectors = null) {
  if (!supp || supp.topY <= supp.groundY + 0.1) return;

  const baseY = supp.groundY - 0.25; // Embedded concrete footing
  const h = supp.topY - baseY;
  const cx = supp.position[0];
  const cz = supp.position[2];
  const right = supp.right || [1, 0, 0];
  const tangent = supp.tangent || [0, 0, 1];
  const up = [0, 1, 0];
  const spanW = supp.spanWidthMeters || 8.0;

  if (supp.kind === 'abutment') {
    const center = [cx, baseY + h * 0.5, cz];
    batcher.addBoxOriented(center, tangent, right, up, spanW, h, 1.4, {
      layer: 'LayerB_StructuralSupports',
      materialKey: 'pier_concrete',
      surfaceStratum: 'structural_support'
    });
    batcher.addBoxOriented([cx, supp.topY - 0.12, cz], tangent, right, up, spanW + 0.24, 0.24, 1.64, {
      layer: 'LayerB_StructuralSupports',
      materialKey: 'barrier_concrete',
      surfaceStratum: 'structural_support'
    });
    return;
  }

  // Wuppertal A-Frame Arch Portal (open Warren-laced angled steel legs + overhead truss portal & curved-feel haunches)
  if (supp.style === 'a_frame_wuppertal') {
    const footHalf = Math.max(4.4, spanW * 0.48);
    const topHalf = Math.max(2.6, Math.min(footHalf - 1.2, spanW * 0.32));
    const capY = supp.topY;
    const gCenterY = supp.guidewayCenterY || (capY - 1.1);
    const tieY = Math.max(baseY + h * 0.58, gCenterY - 0.55);

    for (const sign of [-1, 1]) {
      const fPos = geoSuppPt(cx, cz, right, tangent, sign * footHalf, baseY);
      geoSuppAddSteppedPlinth(batcher, fPos[0], fPos[2], baseY, tangent, right, up, 1.45, 1.55, true);

      const footBase = [fPos[0], baseY + 0.82, fPos[2]];
      const topCradle = geoSuppPt(cx, cz, right, tangent, sign * topHalf, capY + 0.18);
      const botA = infraVec3Add(footBase, infraVec3Scale(tangent, -0.36));
      const botB = infraVec3Add(footBase, infraVec3Scale(tangent, 0.36));
      const topA = infraVec3Add(topCradle, infraVec3Scale(tangent, -0.22));
      const topB = infraVec3Add(topCradle, infraVec3Scale(tangent, 0.22));

      geoSuppAddLacedLeg(batcher, botA, botB, topA, topB, 0.17, 4);

      // Gusset collar band at midpoint & top shoulder haunch plate
      const midPt = infraVec3Lerp(footBase, topCradle, 0.5);
      batcher.addBoxOriented(midPt, tangent, right, up, 0.32, 0.22, 0.78, SUPP_OPTS_ACCENT);
      batcher.addBoxOriented(topCradle, tangent, right, up, 0.48, 0.48, 0.64, SUPP_OPTS_STEEL);
    }

    // Open-web Warren truss overhead portal cross-girder
    geoSuppAddPortalTrussGirder(batcher, cx, cz, right, tangent, -topHalf, topHalf, capY - 0.32, capY + 0.36, 5, 0.42);

    // Twin gusseted diagonal knee haunches bracing legs to lower truss chord
    for (const sign of [-1, 1]) {
      const kneeFoot = geoSuppPt(cx, cz, right, tangent, sign * (topHalf + (footHalf - topHalf) * 0.26), tieY);
      const kneeHead = geoSuppPt(cx, cz, right, tangent, sign * (topHalf * 0.42), capY - 0.3);
      geoSuppAddIBeamBetween(batcher, kneeFoot, kneeHead, 0.24, 0.24);
      // Secondary inner web strut tying knee to shoulder
      const kneeMid = infraVec3Lerp(kneeFoot, kneeHead, 0.5);
      const shoulderPt = geoSuppPt(cx, cz, right, tangent, sign * (topHalf * 0.88), capY - 0.28);
      geoPrimAddBeamBetween(batcher, kneeMid, shoulderPt, 0.11, 0.11, SUPP_OPTS_WEB);
    }
    return;
  }

  // Heavy Braced Steel Lattice Portal (twin diagonal-laced tower columns + open-web Warren truss cross-girder)
  if (supp.style === 'steel_lattice_portal') {
    const footHalf = Math.max(4.4, spanW * 0.48);
    const capY = supp.topY;
    for (const sign of [-1, 1]) {
      const fPos = geoSuppPt(cx, cz, right, tangent, sign * footHalf, baseY);
      geoSuppAddSteppedPlinth(batcher, fPos[0], fPos[2], baseY, tangent, right, up, 1.45, 1.55, true);

      const botA = geoSuppPt(cx, cz, right, tangent, sign * footHalf, baseY + 0.8, -0.38);
      const botB = geoSuppPt(cx, cz, right, tangent, sign * footHalf, baseY + 0.8, 0.38);
      const topA = geoSuppPt(cx, cz, right, tangent, sign * footHalf, capY + 0.18, -0.34);
      const topB = geoSuppPt(cx, cz, right, tangent, sign * footHalf, capY + 0.18, 0.34);
      geoSuppAddLacedLeg(batcher, botA, botB, topA, topB, 0.17, 5);

      // Tower cap collar & diagonal corner knee brace
      batcher.addBoxOriented(geoSuppPt(cx, cz, right, tangent, sign * footHalf, capY + 0.16), tangent, right, up, 0.48, 0.32, 0.84, SUPP_OPTS_STEEL);
      const braceBot = geoSuppPt(cx, cz, right, tangent, sign * footHalf, capY - 2.25);
      const braceTop = geoSuppPt(cx, cz, right, tangent, sign * (footHalf - 1.55), capY - 0.96);
      geoPrimAddBeamBetween(batcher, braceBot, braceTop, 0.16, 0.16, SUPP_OPTS_STEEL);
      pushSupportBox(collectors, [fPos[0], 0, fPos[2]], [fPos[0], capY + 0.28, fPos[2]], 0.42, 0.04);
      pushSlopedSupportBoxes(collectors, braceBot, braceTop, 3, 0.18, 0.16);
    }
    geoSuppAddPortalTrussGirder(batcher, cx, cz, right, tangent, -footHalf, footHalf, capY - 0.96, capY + 0.12, 6, 0.44);
    pushSupportBox(
      collectors,
      geoSuppPt(cx, cz, right, tangent, -footHalf, capY - 0.96),
      geoSuppPt(cx, cz, right, tangent, footHalf, capY + 0.18),
      0.26,
      0.06
    );
    return;
  }

  // Offset Roadside Cantilever L-Mast (flanged H-column + tapered open-web cantilevered truss arm & knee brace)
  if (supp.style === 'cantilever_l') {
    const colLat = -Math.max(2.6, spanW * 0.46);
    const armTipLat = Math.max(2.2, spanW * 0.42);
    const colBase = geoSuppPt(cx, cz, right, tangent, colLat, baseY);
    geoSuppAddSteppedPlinth(batcher, colBase[0], colBase[2], baseY, tangent, right, up, 1.55, 1.55, true);

    // Flanged steel H-column mast with horizontal collar ribs
    geoSuppAddIBeamBetween(
      batcher,
      [colBase[0], baseY + 0.78, colBase[2]],
      [colBase[0], supp.topY + 0.56, colBase[2]],
      0.52,
      0.54,
      { stiffeners: 4 }
    );
    batcher.addBoxOriented([colBase[0], supp.topY + 0.58, colBase[2]], tangent, right, up, 0.62, 0.12, 0.62, SUPP_OPTS_ACCENT);

    // Tapered open-web cantilevered truss arm (sloped upper chord + flanged lower chord + Warren struts)
    const armBotY = supp.topY - 0.14;
    const armRootTopY = supp.topY + 0.5;
    const armTipTopY = supp.topY + 0.14;
    geoSuppAddIBeamBetween(
      batcher,
      geoSuppPt(cx, cz, right, tangent, colLat - 0.14, armBotY),
      geoSuppPt(cx, cz, right, tangent, armTipLat + 0.14, armBotY),
      0.44,
      0.26
    );
    geoPrimAddBeamBetween(
      batcher,
      geoSuppPt(cx, cz, right, tangent, colLat - 0.1, armRootTopY),
      geoSuppPt(cx, cz, right, tangent, armTipLat + 0.1, armTipTopY),
      0.34,
      0.16,
      SUPP_OPTS_STEEL
    );
    const armBays = 4;
    for (let i = 1; i <= armBays; i++) {
      const t0 = (i - 1) / armBays;
      const t1 = i / armBays;
      const x0 = colLat + (armTipLat - colLat) * t0;
      const x1 = colLat + (armTipLat - colLat) * t1;
      const yTop0 = armRootTopY + (armTipTopY - armRootTopY) * t0;
      const yTop1 = armRootTopY + (armTipTopY - armRootTopY) * t1;
      geoPrimAddBeamBetween(
        batcher,
        geoSuppPt(cx, cz, right, tangent, x1, armBotY + 0.1),
        geoSuppPt(cx, cz, right, tangent, x1, yTop1 - 0.06),
        0.13,
        0.13,
        SUPP_OPTS_STEEL
      );
      geoPrimAddBeamBetween(
        batcher,
        geoSuppPt(cx, cz, right, tangent, x0, i % 2 === 0 ? armBotY + 0.1 : yTop0 - 0.06),
        geoSuppPt(cx, cz, right, tangent, x1, i % 2 === 0 ? yTop1 - 0.06 : armBotY + 0.1),
        0.11,
        0.11,
        SUPP_OPTS_WEB
      );
    }
    // Diagonal flanged knee strut & collar
    const braceStart = geoSuppPt(cx, cz, right, tangent, colLat + 0.12, Math.max(baseY + 2.4, supp.topY - 2.65));
    const braceEnd = geoSuppPt(cx, cz, right, tangent, armTipLat * 0.42, armBotY - 0.08);
    geoSuppAddIBeamBetween(batcher, braceStart, braceEnd, 0.24, 0.24);
    batcher.addBoxOriented(geoSuppPt(cx, cz, right, tangent, armTipLat + 0.16, (armBotY + armTipTopY) * 0.5), tangent, right, up, 0.12, 0.34, 0.48, SUPP_OPTS_ACCENT);
    return;
  }

  // Central Tapered Y-Pylon (stepped plinth + ribbed stem + flanged V-arms + I-beam cap)
  if (supp.style === 'y_pylon') {
    const armHalf = spanW <= 3.2 ? Math.max(0.95, spanW * 0.44) : Math.max(2.3, spanW * 0.42);
    const splitY = baseY + Math.max(1.9, h * 0.56);
    geoSuppAddSteppedPlinth(batcher, cx, cz, baseY, tangent, right, up, 1.85, 1.85, false);

    batcher.addCylinderY(cx, baseY + 0.68, cz, 0.66, 0.52, Math.max(0.5, splitY - baseY - 0.6), 10, SUPP_OPTS_STEEL);
    // Heavy Y-fork saddle collar with accent ring
    batcher.addBoxOriented([cx, splitY, cz], tangent, right, up, 1.08, 0.34, 0.92, SUPP_OPTS_WEB);
    batcher.addBoxOriented([cx, splitY - 0.22, cz], tangent, right, up, 1.14, 0.08, 0.98, SUPP_OPTS_ACCENT);

    for (const sign of [-1, 1]) {
      const armStart = [cx, splitY + 0.08, cz];
      const armEnd = geoSuppPt(cx, cz, right, tangent, sign * armHalf, supp.topY - 0.12);
      geoSuppAddIBeamBetween(
        batcher,
        armStart,
        armEnd,
        0.38,
        0.42,
        { stiffeners: 2 }
      );
      pushSlopedSupportBoxes(collectors, armStart, armEnd, 4, 0.24, 0.22);
    }
    // Overhead flanged I-beam cross-cap with bearing pads
    const capA = geoSuppPt(cx, cz, right, tangent, -armHalf - 0.26, supp.topY);
    const capB = geoSuppPt(cx, cz, right, tangent, armHalf + 0.26, supp.topY);
    geoSuppAddIBeamBetween(
      batcher,
      capA,
      capB,
      0.52,
      0.5,
      { stiffeners: 4 }
    );
    pushSupportBox(collectors, [cx, 0, cz], [cx, splitY + 0.2, cz], 0.68, 0.04);
    pushSupportBox(collectors, [cx, 0, cz], [cx, 0.65, cz], 0.94, 0.04);
    pushSupportBox(collectors, [capA[0], supp.topY - 0.26, capA[2]], [capB[0], supp.topY + 0.3, capB[2]], 0.28, 0.04);
    for (const sign of [-1, 1]) {
      batcher.addBoxOriented(geoSuppPt(cx, cz, right, tangent, sign * armHalf, supp.topY + 0.26), tangent, right, up, 0.54, 0.08, 0.58, SUPP_OPTS_ACCENT);
    }
    return;
  }

  // Central Tapered T-Pylon (stepped plinth + collared stem + flanged hammerhead I-girder + gusseted struts)
  if (supp.style === 't_pylon') {
    const r = supp.columnRadius || 0.65;
    geoSuppAddSteppedPlinth(batcher, cx, cz, baseY, tangent, right, up, r * 3.1, r * 3.1, false);
    batcher.addCylinderY(cx, baseY + 0.68, cz, r * 1.04, r * 0.82, Math.max(0.4, h - 0.85), 10, SUPP_OPTS_STEEL);
    // Mid-height & capital collar rings
    batcher.addCylinderY(cx, baseY + h * 0.52, cz, r * 0.98, r * 0.98, 0.14, 10, SUPP_OPTS_ACCENT);
    batcher.addBoxOriented([cx, supp.topY - 0.34, cz], tangent, right, up, r * 2.15, 0.24, r * 1.9, SUPP_OPTS_WEB);

    const armHalf = spanW <= 3.2 ? Math.max(0.95, spanW * 0.44) : Math.max(2.4, spanW * 0.44);
    const capA = geoSuppPt(cx, cz, right, tangent, -armHalf - 0.16, supp.topY);
    const capB = geoSuppPt(cx, cz, right, tangent, armHalf + 0.16, supp.topY);
    geoSuppAddIBeamBetween(
      batcher,
      capA,
      capB,
      0.58,
      0.56,
      { stiffeners: 4 }
    );
    pushSupportBox(collectors, [cx, 0, cz], [cx, supp.topY, cz], r * 1.02, 0.04);
    pushSupportBox(collectors, [capA[0], supp.topY - 0.28, capA[2]], [capB[0], supp.topY + 0.3, capB[2]], 0.3, 0.04);
    for (const sign of [-1, 1]) {
      const sStart = [cx, Math.max(baseY + 2.0, supp.topY - 2.1), cz];
      const sEnd = geoSuppPt(cx, cz, right, tangent, sign * armHalf * 0.78, supp.topY - 0.22);
      geoSuppAddIBeamBetween(
        batcher,
        sStart,
        sEnd,
        0.24,
        0.24
      );
      pushSlopedSupportBoxes(collectors, sStart, sEnd, 3, 0.18, 0.18);
      batcher.addBoxOriented(geoSuppPt(cx, cz, right, tangent, sign * armHalf * 0.72, supp.topY + 0.3), tangent, right, up, 0.52, 0.07, 0.56, SUPP_OPTS_ACCENT);
    }
    return;
  }

  if (supp.style === 'single_pier') {
    const r = supp.columnRadius || 0.65;
    geoSuppAddSteppedPlinth(batcher, cx, cz, baseY, tangent, right, up, r * 3.2, r * 3.2, false);
    batcher.addCylinderY(cx, baseY + 0.66, cz, r * 1.08, r * 0.9, Math.max(0.2, h - 1.1), 10, {
      layer: 'LayerB_StructuralSupports',
      materialKey: 'pier_concrete',
      surfaceStratum: 'structural_support'
    });
    // Flared capital & stepped hammerhead cap beam
    batcher.addCylinderY(cx, supp.topY - 0.78, cz, r * 0.92, r * 1.24, 0.28, 10, {
      layer: 'LayerB_StructuralSupports',
      materialKey: 'barrier_concrete',
      surfaceStratum: 'structural_support'
    });
    const capSpan = (supp.spanWidthMeters || 8) * 0.78;
    batcher.addBoxOriented([cx, supp.topY - 0.28, cz], tangent, right, up, capSpan, 0.54, 1.22, {
      layer: 'LayerB_StructuralSupports',
      materialKey: 'deck_concrete',
      surfaceStratum: 'structural_support'
    });
    batcher.addBoxOriented([cx, supp.topY - 0.56, cz], tangent, right, up, capSpan * 0.84, 0.14, 1.02, {
      layer: 'LayerB_StructuralSupports',
      materialKey: 'pier_concrete',
      surfaceStratum: 'structural_support'
    });
    return;
  }

  // Double pier or straddle portal spanning outside lower roadway
  const offset = supp.style === 'straddle_portal'
    ? Math.max(4.5, (supp.spanWidthMeters || 14) * 0.44)
    : Math.max(2.0, (supp.spanWidthMeters || 8) * 0.34);
  const colR = supp.columnRadius || 0.45;
  const colH = Math.max(0.2, h - 0.92);

  for (const sign of [-1, 1]) {
    const colPos = infraVec3Add([cx, 0, cz], infraVec3Scale(right, sign * offset));
    geoSuppAddSteppedPlinth(batcher, colPos[0], colPos[2], baseY, tangent, right, up, colR * 3.1, colR * 3.1, false);
    batcher.addCylinderY(colPos[0], baseY + 0.66, colPos[2], colR * 1.05, colR * 0.9, colH, 10, {
      layer: 'LayerB_StructuralSupports',
      materialKey: 'pier_concrete',
      surfaceStratum: 'structural_support'
    });
    batcher.addCylinderY(colPos[0], supp.topY - 0.76, colPos[2], colR * 0.92, colR * 1.18, 0.22, 10, {
      layer: 'LayerB_StructuralSupports',
      materialKey: 'barrier_concrete',
      surfaceStratum: 'structural_support'
    });
  }

  // Stepped cross cap beam & elastomeric bearing pads linking both columns cleanly under soffit
  const capW = offset * 2 + colR * 2.5;
  batcher.addBoxOriented([cx, supp.topY - 0.26, cz], tangent, right, up, capW, 0.56, 1.16, {
    layer: 'LayerB_StructuralSupports',
    materialKey: 'deck_concrete',
    surfaceStratum: 'structural_support'
  });
  batcher.addBoxOriented([cx, supp.topY - 0.56, cz], tangent, right, up, capW * 0.92, 0.12, 0.96, {
    layer: 'LayerB_StructuralSupports',
    materialKey: 'pier_concrete',
    surfaceStratum: 'structural_support'
  });
}
