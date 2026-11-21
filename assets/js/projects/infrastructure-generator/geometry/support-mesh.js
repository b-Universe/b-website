import { infraVec3Add, infraVec3Scale } from '../utils.js';
import { geoPrimAddBeamBetween } from './primitives.js';

function geoSuppPt(cx, cz, right, tangent, latX, elevY, longZ = 0) {
  return [
    cx + right[0] * latX + tangent[0] * longZ,
    elevY,
    cz + right[2] * latX + tangent[2] * longZ
  ];
}

export function geoBuildSupport(batcher, supp) {
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
    return;
  }

  // Wuppertal A-Frame Arch Portal (angled steel legs clear of lower roadway)
  if (supp.style === 'a_frame_wuppertal') {
    const footHalf = Math.max(4.4, spanW * 0.48);
    const topHalf = Math.max(2.6, Math.min(footHalf - 1.2, spanW * 0.32));
    const capY = supp.topY;
    const gCenterY = supp.guidewayCenterY || (capY - 1.1);
    const tieY = Math.max(baseY + h * 0.56, gCenterY - 0.65);

    for (const sign of [-1, 1]) {
      const fPos = geoSuppPt(cx, cz, right, tangent, sign * footHalf, baseY);
      batcher.addBoxOriented([fPos[0], baseY + 0.35, fPos[2]], tangent, right, up, 1.35, 0.7, 1.45, {
        layer: 'LayerB_StructuralSupports',
        materialKey: 'pier_concrete',
        surfaceStratum: 'structural_support'
      });
      const footBase = [fPos[0], baseY + 0.55, fPos[2]];
      const topCradle = geoSuppPt(cx, cz, right, tangent, sign * topHalf, capY);
      for (const lz of [-0.36, 0.36]) {
        const legBot = infraVec3Add(footBase, infraVec3Scale(tangent, lz));
        const legTop = infraVec3Add(topCradle, infraVec3Scale(tangent, lz * 0.7));
        geoPrimAddBeamBetween(batcher, legBot, legTop, 0.34, 0.34, {
          layer: 'LayerB_StructuralSupports',
          materialKey: 'steel_structure',
          surfaceStratum: 'structural_support'
        });
      }
      // Lacing horizontal collar tying leg pair
      const midPt = [
        (footBase[0] + topCradle[0]) * 0.5,
        (footBase[1] + topCradle[1]) * 0.5,
        (footBase[2] + topCradle[2]) * 0.5
      ];
      batcher.addBoxOriented(midPt, tangent, right, up, 0.42, 0.28, 0.92, {
        layer: 'LayerB_StructuralSupports',
        materialKey: 'steel_structure',
        surfaceStratum: 'structural_support'
      });
    }

    // Overhead portal cross-girder + diagonal knee struts holding suspended guideway spine
    geoPrimAddBeamBetween(
      batcher,
      geoSuppPt(cx, cz, right, tangent, -topHalf - 0.35, capY),
      geoSuppPt(cx, cz, right, tangent, topHalf + 0.35, capY),
      0.55,
      0.72,
      { layer: 'LayerB_StructuralSupports', materialKey: 'steel_structure', surfaceStratum: 'structural_support' }
    );
    for (const sign of [-1, 1]) {
      const kneeFoot = geoSuppPt(cx, cz, right, tangent, sign * (topHalf + (footHalf - topHalf) * 0.25), tieY);
      const kneeHead = geoSuppPt(cx, cz, right, tangent, sign * (topHalf * 0.4), capY - 0.12);
      geoPrimAddBeamBetween(batcher, kneeFoot, kneeHead, 0.22, 0.24, {
        layer: 'LayerB_StructuralSupports',
        materialKey: 'steel_structure',
        surfaceStratum: 'structural_support'
      });
    }
    return;
  }

  // Heavy Braced Steel Lattice Portal (twin vertical column towers + overhead truss girder)
  if (supp.style === 'steel_lattice_portal') {
    const footHalf = Math.max(4.4, spanW * 0.48);
    const capY = supp.topY;
    for (const sign of [-1, 1]) {
      const fPos = geoSuppPt(cx, cz, right, tangent, sign * footHalf, baseY);
      batcher.addBoxOriented([fPos[0], baseY + 0.35, fPos[2]], tangent, right, up, 1.35, 0.7, 1.45, {
        layer: 'LayerB_StructuralSupports',
        materialKey: 'pier_concrete',
        surfaceStratum: 'structural_support'
      });
      for (const lz of [-0.38, 0.38]) {
        geoPrimAddBeamBetween(
          batcher,
          geoSuppPt(cx, cz, right, tangent, sign * footHalf, baseY + 0.5, lz),
          geoSuppPt(cx, cz, right, tangent, sign * footHalf, capY, lz),
          0.24,
          0.24,
          { layer: 'LayerB_StructuralSupports', materialKey: 'steel_structure', surfaceStratum: 'structural_support' }
        );
      }
      // Horizontal tower lacing tiers
      const tiers = 4;
      for (let t = 1; t < tiers; t++) {
        const ty = baseY + 0.6 + ((capY - baseY - 0.8) * t) / tiers;
        geoPrimAddBeamBetween(
          batcher,
          geoSuppPt(cx, cz, right, tangent, sign * footHalf, ty, -0.38),
          geoSuppPt(cx, cz, right, tangent, sign * footHalf, ty, 0.38),
          0.14,
          0.14,
          { layer: 'LayerB_StructuralSupports', materialKey: 'steel_structure', surfaceStratum: 'structural_support' }
        );
      }
    }
    // Twin-chord portal cross truss overhead
    geoPrimAddBeamBetween(
      batcher,
      geoSuppPt(cx, cz, right, tangent, -footHalf, capY),
      geoSuppPt(cx, cz, right, tangent, footHalf, capY),
      0.56,
      0.5,
      { layer: 'LayerB_StructuralSupports', materialKey: 'steel_structure', surfaceStratum: 'structural_support' }
    );
    geoPrimAddBeamBetween(
      batcher,
      geoSuppPt(cx, cz, right, tangent, -footHalf, capY - 0.95),
      geoSuppPt(cx, cz, right, tangent, footHalf, capY - 0.95),
      0.42,
      0.24,
      { layer: 'LayerB_StructuralSupports', materialKey: 'steel_structure', surfaceStratum: 'structural_support' }
    );
    return;
  }

  // Offset Roadside Cantilever L-Mast with Diagonal Knee Brace
  if (supp.style === 'cantilever_l') {
    const colLat = -Math.max(2.6, spanW * 0.46);
    const armTipLat = Math.max(2.2, spanW * 0.42);
    const colBase = geoSuppPt(cx, cz, right, tangent, colLat, baseY);
    batcher.addBoxOriented([colBase[0], baseY + 0.35, colBase[2]], tangent, right, up, 1.35, 0.7, 1.35, {
      layer: 'LayerB_StructuralSupports',
      materialKey: 'pier_concrete',
      surfaceStratum: 'structural_support'
    });
    geoPrimAddBeamBetween(batcher, [colBase[0], baseY + 0.5, colBase[2]], [colBase[0], supp.topY + 0.25, colBase[2]], 0.52, 0.52, {
      layer: 'LayerB_StructuralSupports',
      materialKey: 'steel_structure',
      surfaceStratum: 'structural_support'
    });
    geoPrimAddBeamBetween(
      batcher,
      geoSuppPt(cx, cz, right, tangent, colLat - 0.15, supp.topY),
      geoSuppPt(cx, cz, right, tangent, armTipLat, supp.topY),
      0.56,
      0.58,
      { layer: 'LayerB_StructuralSupports', materialKey: 'steel_structure', surfaceStratum: 'structural_support' }
    );
    const braceStart = geoSuppPt(cx, cz, right, tangent, colLat, Math.max(baseY + 2.5, supp.topY - 2.6));
    const braceEnd = geoSuppPt(cx, cz, right, tangent, armTipLat * 0.45, supp.topY - 0.15);
    geoPrimAddBeamBetween(batcher, braceStart, braceEnd, 0.26, 0.26, {
      layer: 'LayerB_StructuralSupports',
      materialKey: 'steel_structure',
      surfaceStratum: 'structural_support'
    });
    return;
  }

  // Central Tapered Y-Pylon splitting into V-arms
  if (supp.style === 'y_pylon') {
    const armHalf = Math.max(2.3, spanW * 0.42);
    const splitY = baseY + Math.max(1.8, h * 0.46);
    batcher.addBoxOriented([cx, baseY + 0.25, cz], tangent, right, up, 1.7, 0.5, 1.7, {
      layer: 'LayerB_StructuralSupports',
      materialKey: 'pier_concrete',
      surfaceStratum: 'structural_support'
    });
    batcher.addCylinderY(cx, baseY + 0.4, cz, 0.68, 0.54, Math.max(0.5, splitY - baseY - 0.3), 10, {
      layer: 'LayerB_StructuralSupports',
      materialKey: 'steel_structure',
      surfaceStratum: 'structural_support'
    });
    for (const sign of [-1, 1]) {
      geoPrimAddBeamBetween(
        batcher,
        [cx, splitY, cz],
        geoSuppPt(cx, cz, right, tangent, sign * armHalf, supp.topY),
        0.44,
        0.44,
        { layer: 'LayerB_StructuralSupports', materialKey: 'steel_structure', surfaceStratum: 'structural_support' }
      );
    }
    geoPrimAddBeamBetween(
      batcher,
      geoSuppPt(cx, cz, right, tangent, -armHalf - 0.2, supp.topY),
      geoSuppPt(cx, cz, right, tangent, armHalf + 0.2, supp.topY),
      0.5,
      0.52,
      { layer: 'LayerB_StructuralSupports', materialKey: 'steel_structure', surfaceStratum: 'structural_support' }
    );
    return;
  }

  // Central Tapered T-Pylon
  if (supp.style === 't_pylon') {
    const r = supp.columnRadius || 0.65;
    batcher.addBoxOriented([cx, baseY + 0.25, cz], tangent, right, up, r * 3.0, 0.5, r * 3.0, {
      layer: 'LayerB_StructuralSupports',
      materialKey: 'pier_concrete',
      surfaceStratum: 'structural_support'
    });
    batcher.addCylinderY(cx, baseY + 0.4, cz, r * 1.05, r * 0.85, Math.max(0.4, h - 0.6), 10, {
      layer: 'LayerB_StructuralSupports',
      materialKey: 'steel_structure',
      surfaceStratum: 'structural_support'
    });
    const armHalf = Math.max(2.4, spanW * 0.44);
    geoPrimAddBeamBetween(
      batcher,
      geoSuppPt(cx, cz, right, tangent, -armHalf, supp.topY),
      geoSuppPt(cx, cz, right, tangent, armHalf, supp.topY),
      0.62,
      0.58,
      { layer: 'LayerB_StructuralSupports', materialKey: 'steel_structure', surfaceStratum: 'structural_support' }
    );
    for (const sign of [-1, 1]) {
      geoPrimAddBeamBetween(
        batcher,
        [cx, Math.max(baseY + 2.0, supp.topY - 2.0), cz],
        geoSuppPt(cx, cz, right, tangent, sign * armHalf * 0.78, supp.topY - 0.1),
        0.24,
        0.24,
        { layer: 'LayerB_StructuralSupports', materialKey: 'steel_structure', surfaceStratum: 'structural_support' }
      );
    }
    return;
  }

  if (supp.style === 'single_pier') {
    const r = supp.columnRadius || 0.65;
    // Footing pad
    batcher.addBoxOriented([cx, baseY + 0.2, cz], tangent, right, up, r * 3.2, 0.4, r * 3.2, {
      layer: 'LayerB_StructuralSupports',
      materialKey: 'pier_concrete',
      surfaceStratum: 'structural_support'
    });
    // Tapered central column
    batcher.addCylinderY(cx, baseY + 0.35, cz, r * 1.1, r * 0.92, Math.max(0.2, h - 0.75), 8, {
      layer: 'LayerB_StructuralSupports',
      materialKey: 'pier_concrete',
      surfaceStratum: 'structural_support'
    });
    // Hammerhead cap beam
    batcher.addBoxOriented([cx, supp.topY - 0.28, cz], tangent, right, up, (supp.spanWidthMeters || 8) * 0.78, 0.6, 1.25, {
      layer: 'LayerB_StructuralSupports',
      materialKey: 'deck_concrete',
      surfaceStratum: 'structural_support'
    });
    return;
  }

  // Double pier or straddle portal spanning outside lower roadway
  const offset = supp.style === 'straddle_portal'
    ? Math.max(4.5, (supp.spanWidthMeters || 14) * 0.44)
    : Math.max(2.0, (supp.spanWidthMeters || 8) * 0.34);
  const colR = supp.columnRadius || 0.45;
  const colH = Math.max(0.2, h - 0.55);

  for (const sign of [-1, 1]) {
    const colPos = infraVec3Add([cx, 0, cz], infraVec3Scale(right, sign * offset));
    batcher.addBoxOriented([colPos[0], baseY + 0.18, colPos[2]], tangent, right, up, colR * 3.0, 0.36, colR * 3.0, {
      layer: 'LayerB_StructuralSupports',
      materialKey: 'pier_concrete',
      surfaceStratum: 'structural_support'
    });
    batcher.addCylinderY(colPos[0], baseY + 0.3, colPos[2], colR * 1.05, colR * 0.92, colH, 8, {
      layer: 'LayerB_StructuralSupports',
      materialKey: 'pier_concrete',
      surfaceStratum: 'structural_support'
    });
  }

  // Cross cap beam linking both columns cleanly under bridge soffit
  const capW = offset * 2 + colR * 2.4;
  batcher.addBoxOriented([cx, supp.topY - 0.25, cz], tangent, right, up, capW, 0.62, 1.15, {
    layer: 'LayerB_StructuralSupports',
    materialKey: 'deck_concrete',
    surfaceStratum: 'structural_support'
  });
}
