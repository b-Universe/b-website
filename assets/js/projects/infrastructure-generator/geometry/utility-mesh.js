import { infraClamp, infraVec3Add, infraVec3Scale } from '../utils.js';
import { geoPrimAddBeamBetween, geoPrimAddSagWire } from './primitives.js';

function geoUtilPt(f, latX, elevY) {
  const p = infraVec3Add(f.position, infraVec3Scale(f.right, latX));
  return infraVec3Add(p, infraVec3Scale(f.up, elevY));
}

function geoUtilSampleAtS(frames, targetS) {
  if (!frames?.length) return null;
  if (targetS <= frames[0].s) return frames[0];
  if (targetS >= frames[frames.length - 1].s) return frames[frames.length - 1];
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    if (targetS >= a.s && targetS <= b.s) {
      const span = Math.max(1e-4, b.s - a.s);
      const t = (targetS - a.s) / span;
      return {
        s: targetS,
        position: [
          a.position[0] + (b.position[0] - a.position[0]) * t,
          a.position[1] + (b.position[1] - a.position[1]) * t,
          a.position[2] + (b.position[2] - a.position[2]) * t
        ],
        tangent: a.tangent,
        right: a.right,
        up: a.up
      };
    }
  }
  return frames[frames.length - 1];
}

export function geoBuildUtilityEdge(batcher, edge, samp, prof) {
  if (!samp || !samp.frames || samp.frames.length < 2 || !prof) return;
  const frames = samp.frames;
  const p = edge.params || {};
  const uType = p.utilityType || 'power_transmission';
  const poleSpacing = infraClamp(p.poleSpacingMeters || 24, 10, 48);
  const towerH = infraClamp(p.towerHeightMeters || 14.5, 5.5, 28);

  const stationFrames = [];
  const totalLen = frames[frames.length - 1].s - frames[0].s;
  const count = Math.max(1, Math.round(totalLen / poleSpacing));
  for (let k = 0; k <= count; k++) {
    const s = frames[0].s + (totalLen * k) / count;
    const fr = geoUtilSampleAtS(frames, s);
    if (fr) stationFrames.push(fr);
  }

  // 1. High-Voltage Lattice Steel Transmission Line
  if (uType === 'power_transmission') {
    const baseHalf = 1.65;
    const waistHalf = 0.55;
    const waistY = towerH * 0.68;
    let prevConductors = [];

    for (const f of stationFrames) {
      const legs = [
        [-baseHalf, -baseHalf * 0.7],
        [baseHalf, -baseHalf * 0.7],
        [baseHalf, baseHalf * 0.7],
        [-baseHalf, baseHalf * 0.7]
      ];
      const waistPts = [
        [-waistHalf, -waistHalf * 0.7],
        [waistHalf, -waistHalf * 0.7],
        [waistHalf, waistHalf * 0.7],
        [-waistHalf, waistHalf * 0.7]
      ];

      for (let i = 0; i < 4; i++) {
        const bp = infraVec3Add(geoUtilPt(f, legs[i][0], -0.25), infraVec3Scale(f.tangent, legs[i][1]));
        const wp = infraVec3Add(geoUtilPt(f, waistPts[i][0], waistY), infraVec3Scale(f.tangent, waistPts[i][1]));
        const tp = geoUtilPt(f, i === 0 || i === 3 ? -0.32 : 0.32, towerH);
        geoPrimAddBeamBetween(batcher, bp, wp, 0.16, 0.16, { layer: 'LayerB_StructuralSupports', materialKey: 'steel_structure', surfaceStratum: 'tower_leg' });
        geoPrimAddBeamBetween(batcher, wp, tp, 0.13, 0.13, { layer: 'LayerB_StructuralSupports', materialKey: 'steel_structure', surfaceStratum: 'tower_leg' });
        batcher.addBoxOriented([bp[0], 0.12, bp[2]], f.tangent, f.right, [0, 1, 0], 0.65, 0.5, 0.65, { layer: 'LayerB_StructuralSupports', materialKey: 'pier_concrete', surfaceStratum: 'structural_support' });
      }
      // Horizontal lattice tiers
      for (const frac of [0.35, 0.68]) {
        const yT = towerH * frac;
        const hw = baseHalf + (waistHalf - baseHalf) * Math.min(1, frac / 0.68);
        geoPrimAddBeamBetween(batcher, geoUtilPt(f, -hw, yT), geoUtilPt(f, hw, yT), 0.12, 0.12, { materialKey: 'steel_structure', surfaceStratum: 'tower_brace' });
      }

      // Two tiered cross-arms carrying ceramic insulators & sagging conductors
      const armSpecs = [
        { y: towerH * 0.78, halfW: 3.6 },
        { y: towerH * 0.94, halfW: 2.8 }
      ];
      const wirePts = [];
      for (const arm of armSpecs) {
        const aL = geoUtilPt(f, -arm.halfW, arm.y);
        const aR = geoUtilPt(f, arm.halfW, arm.y);
        geoPrimAddBeamBetween(batcher, aL, aR, 0.18, 0.22, { materialKey: 'steel_structure', surfaceStratum: 'cross_arm' });
        for (const sSide of [-1, 1]) {
          const tip = geoUtilPt(f, sSide * (arm.halfW - 0.15), arm.y);
          const insBot = [tip[0], tip[1] - 0.55, tip[2]];
          geoPrimAddBeamBetween(batcher, tip, insBot, 0.12, 0.12, { materialKey: 'glass_station', surfaceStratum: 'insulator' });
          wirePts.push(insBot);
        }
      }

      if (prevConductors.length === wirePts.length) {
        for (let w = 0; w < wirePts.length; w++) {
          geoPrimAddSagWire(batcher, prevConductors[w], wirePts[w], 1.45, 0.04, 8, { materialKey: 'wire_copper' });
        }
      }
      prevConductors = wirePts;
    }
    return;
  }

  // 2. Street Timber Power Poles / Overhead Telecom Trunk Lines
  if (uType === 'street_power_poles' || uType === 'telecom_trunk') {
    const wireCount = Math.round(infraClamp(p.wireCount || 3, 2, 4));
    const isPower = uType === 'street_power_poles';
    let prevWires = [];

    for (let k = 0; k < stationFrames.length; k++) {
      const f = stationFrames[k];
      const base = geoUtilPt(f, 0, -0.25);
      batcher.addCylinderY(base[0], base[1], base[2], 0.18, 0.12, towerH + 0.25, 8, {
        layer: 'LayerB_StructuralSupports',
        materialKey: 'sleeper_wood',
        surfaceStratum: 'utility_pole'
      });
      const armY = towerH - 0.45;
      const armHalf = isPower ? 1.55 : 0.95;
      geoPrimAddBeamBetween(batcher, geoUtilPt(f, -armHalf, armY), geoUtilPt(f, armHalf, armY), 0.14, 0.14, { materialKey: 'sleeper_wood', surfaceStratum: 'cross_arm' });
      // Diagonal arm V-braces
      geoPrimAddBeamBetween(batcher, geoUtilPt(f, 0, armY - 0.65), geoUtilPt(f, -armHalf * 0.65, armY), 0.05, 0.05, { materialKey: 'steel_structure', surfaceStratum: 'cross_arm' });
      geoPrimAddBeamBetween(batcher, geoUtilPt(f, 0, armY - 0.65), geoUtilPt(f, armHalf * 0.65, armY), 0.05, 0.05, { materialKey: 'steel_structure', surfaceStratum: 'cross_arm' });

      if (isPower && k % 2 === 0) {
        // Cylindrical pole-mounted distribution transformer can
        batcher.addCylinderY(f.position[0] + f.right[0] * 0.38, towerH - 1.65, f.position[2] + f.right[2] * 0.38, 0.26, 0.26, 0.85, 10, {
          layer: 'LayerA_PrimaryStructure',
          materialKey: 'steel_structure',
          surfaceStratum: 'transformer'
        });
      }

      const wires = [];
      for (let w = 0; w < wireCount; w++) {
        const frac = wireCount === 1 ? 0 : (w / (wireCount - 1)) * 2 - 1;
        wires.push(geoUtilPt(f, frac * (armHalf - 0.15), armY + 0.12));
      }
      if (prevWires.length === wires.length) {
        for (let w = 0; w < wires.length; w++) {
          geoPrimAddSagWire(batcher, prevWires[w], wires[w], 0.55, 0.03, 6, { materialKey: 'wire_copper' });
        }
      }
      prevWires = wires;
    }
    return;
  }

  // 3. Elevated Industrial Pipe Rack OR Grounded Saddle Pipeline
  const isElevatedRack = uType === 'pipe_rack_elevated';
  const pipeElevY = isElevatedRack ? Math.max(5.4, towerH - 0.8) : 0.62;
  const pipeDiam = infraClamp(p.pipeDiameterMeters || 0.45, 0.22, 0.9);
  const pipeMats = ['pipe_yellow', 'pipe_blue', 'pipe_red'];
  const pipeCount = Math.round(infraClamp(p.pipeCount || 3, 1, 3));
  const pipeOffsets = pipeCount === 1 ? [0] : pipeCount === 2 ? [-0.65, 0.65] : [-1.05, 0, 1.05];

  // Supporting bents / concrete cradles
  const bentPitch = isElevatedRack ? 12.0 : 8.0;
  let nextBentS = frames[0].s;
  for (const f of frames) {
    if (f.s < nextBentS && f !== frames[frames.length - 1]) continue;
    nextBentS = f.s + bentPitch;
    if (isElevatedRack) {
      const bw = 1.65;
      for (const sSide of [-1, 1]) {
        const bot = geoUtilPt(f, sSide * bw, -0.25);
        const top = geoUtilPt(f, sSide * bw, pipeElevY + 0.6);
        geoPrimAddBeamBetween(batcher, bot, top, 0.28, 0.28, { layer: 'LayerB_StructuralSupports', materialKey: 'steel_structure', surfaceStratum: 'structural_support' });
      }
      geoPrimAddBeamBetween(batcher, geoUtilPt(f, -bw, pipeElevY - pipeDiam * 0.5 - 0.15), geoUtilPt(f, bw, pipeElevY - pipeDiam * 0.5 - 0.15), 0.3, 0.28, { materialKey: 'steel_structure', surfaceStratum: 'pipe_rack_beam' });
    } else {
      batcher.addBoxOriented(
        geoUtilPt(f, 0, 0.22),
        f.tangent,
        f.right,
        [0, 1, 0],
        2.8,
        0.52,
        0.48,
        { layer: 'LayerB_StructuralSupports', materialKey: 'pier_concrete', surfaceStratum: 'structural_support' }
      );
    }
  }

  // Continuous flanged color-coded pipelines
  for (let pi = 0; pi < pipeOffsets.length; pi++) {
    const px = pipeOffsets[pi];
    const pMat = pipeMats[pi % pipeMats.length];
    for (let i = 0; i < frames.length - 1; i++) {
      const f0 = frames[i];
      const f1 = frames[i + 1];
      geoPrimAddBeamBetween(
        batcher,
        geoUtilPt(f0, px, pipeElevY),
        geoUtilPt(f1, px, pipeElevY),
        pipeDiam,
        pipeDiam,
        { layer: 'LayerA_PrimaryStructure', materialKey: pMat, surfaceStratum: 'utility_pipe' }
      );
      if (i % 3 === 1) {
        batcher.addBoxOriented(
          geoUtilPt(f0, px, pipeElevY),
          f0.tangent,
          f0.right,
          f0.up,
          pipeDiam + 0.14,
          pipeDiam + 0.14,
          0.14,
          { layer: 'LayerA_PrimaryStructure', materialKey: 'steel_structure', surfaceStratum: 'pipe_flange' }
        );
      }
    }
  }
}
