import { clamp, copy, roundNum } from '../utils.js';
import { createSectionTemplate, sanitiseSection } from '../config.js';
import { generateFootprintPolygon, validateSectionTransition } from './footprints.js';

export function resolveStackedSections(cfg, towerOverrides = {}) {
  const rawList = Array.isArray(cfg.sections) && cfg.sections.length > 0 ? cfg.sections : [createSectionTemplate()];
  const heightScale = clamp(Number(towerOverrides.heightRatio) || 1.0, 0.35, 1.5);
  const widthScale = clamp((Number(cfg.slenderness) > 0 ? 1 / Math.sqrt(cfg.slenderness) : 1.0) * (Number(towerOverrides.widthScale) || 1.0), 0.5, 1.5);
  const depthScale = clamp((Number(cfg.slenderness) > 0 ? 1 / Math.sqrt(cfg.slenderness) : 1.0) * (Number(towerOverrides.depthScale) || 1.0), 0.5, 1.5);
  const setbackScale = Number.isFinite(Number(cfg.steppedSetbackScale)) ? Number(cfg.steppedSetbackScale) : 1.0;
  const globalTaper = clamp(Number(cfg.globalTaper) || 0, -0.35, 0.6);
  const globalTwist = Number(cfg.globalTwistDeg) || 0;
  const symmetryMode = cfg.symmetryMode || 'symmetric';

  const resolved = [];
  let cursorY = cfg.raisedPodium ? clamp(Number(cfg.podiumElevation) || 0, 0, 4) : 0;
  let cumulativeTwist = 0;
  let cumulativeSetback = 0;
  let prevSection = null;
  let totalFloors = 0;

  for (let i = 0; i < rawList.length; i++) {
    const clean = sanitiseSection(rawList[i], i);
    const floors = clamp(Math.round(clean.floors * (i === 0 && clean.role === 'podium' ? 1 : heightScale)), 1, 80);
    const floorHeight = clamp(clean.floorHeight || cfg.floorHeight || 3.8, 2.8, 6.5);
    const sectionHeight = roundNum(floors * floorHeight, 3);

    cumulativeSetback += (clean.setback || 0) * setbackScale;
    const effOverhang = clean.overhang || 0;
    const rawW = Math.max(8, (clean.width * widthScale) - cumulativeSetback * 0.7 + effOverhang * 2);
    const rawD = Math.max(8, (clean.depth * depthScale) - cumulativeSetback * 0.7 + effOverhang * 2);

    const asymBoostX = symmetryMode === 'asymmetrical' ? ((i % 2 === 0 ? 1.5 : -1.5)) : 0;
    const candidate = {
      ...clean,
      index: i,
      floors,
      startFloor: totalFloors,
      endFloor: totalFloors + floors,
      floorHeight: roundNum(floorHeight, 3),
      height: sectionHeight,
      baseElevation: roundNum(cursorY, 3),
      topElevation: roundNum(cursorY + sectionHeight, 3),
      width: roundNum(rawW, 3),
      depth: roundNum(rawD, 3),
      offsetX: roundNum((clean.offsetX || 0) + asymBoostX, 3),
      offsetZ: roundNum(clean.offsetZ || 0, 3),
      taperX: roundNum(clamp(clean.taperX * (1 - globalTaper * 0.35), 0.45, 1.35), 3),
      taperZ: roundNum(clamp(clean.taperZ * (1 - globalTaper * 0.35), 0.45, 1.35), 3),
      baseRotationDeg: roundNum(clean.rotationDeg + cumulativeTwist, 3),
      twistDeg: roundNum(clean.twistDeg + (globalTwist / Math.max(1, rawList.length)), 3)
    };

    const effectiveFootprint = (i > 0 || clean.role !== 'podium') && cfg.footprintOverride
      ? cfg.footprintOverride
      : candidate.footprint;
    candidate.footprint = effectiveFootprint;
    candidate.isTopSection = i === rawList.length - 1;

    const validated = validateSectionTransition(prevSection, candidate, cfg);

    const poly = generateFootprintPolygon(validated.footprint, validated.width, validated.depth, {
      cornerSize: validated.cornerSize || cfg.cornerRadius || 2.0,
      cornerTreatment: validated.cornerTreatment
    });

    validated.footprint = poly.type;
    validated.polygon = poly;
    resolved.push(validated);

    cursorY += sectionHeight;
    cumulativeTwist += validated.twistDeg;
    totalFloors += floors;
    prevSection = validated;
  }

  let verticalGapCount = 0;
  let maxHullProtrusion = 0;
  const warnings = [];
  for (let i = 0; i < resolved.length; i++) {
    const s = resolved[i];
    if (i > 0) {
      const gap = Math.abs(s.baseElevation - resolved[i - 1].topElevation);
      if (gap > 0.02) verticalGapCount++;
    }
    if (s.transitionDiagnostics) {
      maxHullProtrusion = Math.max(maxHullProtrusion, s.transitionDiagnostics.maxHullProtrusion || 0);
      for (const w of s.transitionDiagnostics.warnings || []) {
        warnings.push(w);
      }
    }
  }

  return {
    sections: resolved,
    totalFloors,
    baseElevation: resolved[0]?.baseElevation || 0,
    totalHeight: roundNum(cursorY, 3),
    diagnostics: {
      valid: verticalGapCount === 0,
      verticalGapCount,
      maxHullProtrusion: roundNum(maxHullProtrusion, 3),
      warnings
    }
  };
}

export function addSectionToState(state, templateOverrides = {}) {
  const sections = Array.isArray(state.sections) ? copy(state.sections) : [];
  if (sections.length >= 12) return false;
  const last = sections[sections.length - 1];
  const nextSec = createSectionTemplate({
    role: 'upper_tower',
    label: 'Upper Tier ' + (sections.length + 1),
    floors: 10,
    floorHeight: last ? last.floorHeight : state.floorHeight,
    width: last ? Math.max(10, roundNum(last.width - 2.5, 1)) : 20,
    depth: last ? Math.max(10, roundNum(last.depth - 2.5, 1)) : 18,
    setback: 1.25,
    footprint: last ? last.footprint : state.footprint,
    cornerTreatment: last ? last.cornerTreatment : 'chamfered',
    ...templateOverrides
  });
  sections.push(nextSec);
  state.sections = sections;
  return nextSec;
}

export function removeSectionFromState(state, index) {
  if (!Array.isArray(state.sections) || state.sections.length <= 1) return false;
  if (index < 0 || index >= state.sections.length) return false;
  state.sections = state.sections.filter((_, i) => i !== index);
  return true;
}

export function moveSectionInState(state, index, direction) {
  if (!Array.isArray(state.sections)) return false;
  const target = index + direction;
  if (index < 0 || index >= state.sections.length || target < 0 || target >= state.sections.length) {
    return false;
  }
  const next = [...state.sections];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  state.sections = next;
  return true;
}

export function duplicateSectionInState(state, index) {
  if (!Array.isArray(state.sections) || state.sections.length >= 12) return false;
  if (index < 0 || index >= state.sections.length) return false;
  const src = state.sections[index];
  const dup = createSectionTemplate({
    ...copy(src),
    id: 'sec_dup_' + Math.random().toString(36).slice(2, 8),
    label: src.label + ' Copy',
    locked: false
  });
  const next = [...state.sections];
  next.splice(index + 1, 0, dup);
  state.sections = next;
  return dup;
}

export function updateSectionPropertyInState(state, index, prop, value) {
  if (!Array.isArray(state.sections) || !state.sections[index]) return false;
  const next = copy(state.sections);
  next[index] = sanitiseSection({ ...next[index], [prop]: value }, index);
  state.sections = next;
  return true;
}
