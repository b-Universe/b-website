import { clamp, copy, rng32 } from '../utils.js';
import { getStyle } from '../config.js';
import { segmentsForFloor, chooseFireEscapePlacement } from '../core/layouts.js';
import { generateBuildingBlueprint } from '../core/blueprints.js';
import { solid } from './materials.js';
import { slabBox } from './primitives.js';
import { wallForSide, addCornerChamfer } from './facades.js';
import {
  addInteriors,
  addRoof,
  addSetbackTerrace,
  addEntrance,
  addFireEscape,
  addRooftopProps,
  addVerticalDetails,
  addVines
} from './details.js';

export function createBuilding(cfg, options = {}) {
  const root = new THREE.Group();
  root.name = 'B Building ' + getStyle(cfg.style).label;
  const r = rng32((cfg.seed + (options.seedOffset || 0) * 9119) >>> 0);
  const count = cfg.floors;
  const fh = cfg.floorHeight;
  const cutaway = !!cfg.cutaway;
  const selectedFloor = clamp(cfg.inspectedFloor || 0, 0, count);
  const visibleFloors = selectedFloor > 0 ? selectedFloor : count;
  const roofOn = !cutaway && selectedFloor === 0;

  const groundSegments = segmentsForFloor(cfg, 0);
  const primary = groundSegments[0];
  const firePlacement = chooseFireEscapePlacement(groundSegments, cfg, rng32(cfg.seed + 313));

  for (let floor = 0; floor < visibleFloors; floor++) {
    const segments = segmentsForFloor(cfg, floor);
    const nextSegments = floor < visibleFloors - 1 ? segmentsForFloor(cfg, floor + 1) : null;
    const hasFireExtOnFloor = firePlacement && firePlacement.extIndex >= 0
      && segments.some((s) => s.isExtension && s.extIndex === firePlacement.extIndex);

    for (let j = 0; j < segments.length; j++) {
      const seg = segments[j];
      const isFireTarget = firePlacement && (
        hasFireExtOnFloor
          ? (seg.isExtension && seg.extIndex === firePlacement.extIndex)
          : (j === 0)
      );
      const segFire = isFireTarget ? firePlacement : null;
      for (const side of ['front', 'back', 'left', 'right']) {
        wallForSide(root, seg, floor, side, cfg, r, cutaway, cfg.seed + j * 97 + floor * 17, segFire);
      }
      addCornerChamfer(root, seg, floor, cfg, r, cutaway, cfg.seed + j * 97 + floor * 17);
      addInteriors(root, seg, floor, cfg);

      if (floor === 0) {
        slabBox(root, seg, -0.08 - j * 0.002, 0.15, 0.01, solid('#716f67'));
      }
      if (floor === visibleFloors - 1 && selectedFloor === 0 && cfg.interiorMode !== 'none') {
        slabBox(root, seg, (floor + 1) * fh - 0.08 - j * 0.002, 0.12, cfg.wallThickness * 0.8, solid('#817b6d'));
      }

      if (nextSegments && !cutaway) {
        if (seg.isExtension) {
          const hasAbove = nextSegments.some((ns) => ns.isExtension && ns.extIndex === seg.extIndex);
          if (!hasAbove) {
            const roofSeg = segFire
              ? {
                  ...seg,
                  occlusions: {
                    ...seg.occlusions,
                    [segFire.side]: [
                      ...(seg.occlusions?.[segFire.side] || []),
                      [segFire.coord - segFire.deckW * 0.54, segFire.coord + segFire.deckW * 0.54]
                    ]
                  }
                }
              : seg;
            addRoof(root, roofSeg, (floor + 1) * fh, { ...cfg, roofType: 'flat', skylights: false, parapetHeight: Math.min(0.32, cfg.parapetHeight) }, r, j + 1);
          }
        } else if (nextSegments[j] && (nextSegments[j].w < seg.w - 0.05 || nextSegments[j].d < seg.d - 0.05)) {
          addSetbackTerrace(root, seg, nextSegments[j], (floor + 1) * fh, cfg, r, j, j === 0 ? firePlacement : segFire);
        }
      }
    }
  }

  if (!cutaway) {
    addEntrance(root, primary, cfg, r);
  }
  if (firePlacement) {
    addFireEscape(root, primary, firePlacement, cfg);
  }

  if (roofOn) {
    const topSegments = segmentsForFloor(cfg, count - 1).filter((s) => !s.isExtension);
    for (let j = 0; j < topSegments.length; j++) {
      addRoof(root, topSegments[j], count * fh, cfg, r, j);
    }
    addRooftopProps(root, topSegments, primary, cfg, r, count * fh);
  }

  if (!cutaway) {
    const setbackFloor = Math.floor(count * 0.6);
    const mainH = cfg.setback > 0 && setbackFloor > 0 ? setbackFloor * fh : count * fh;
    for (const seg of groundSegments.filter((s) => !s.isExtension)) {
      addVerticalDetails(root, seg, mainH, cfg);
      addVines(root, seg, mainH, cfg, r);
    }
  }

  const blueprint = generateBuildingBlueprint(cfg, { name: options.name });
  root.userData = {
    preset: cfg.style,
    seed: cfg.seed,
    floors: cfg.floors,
    settings: copy(cfg),
    blueprint,
    entrances: blueprint.entrances
  };
  return root;
}
