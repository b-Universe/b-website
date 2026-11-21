import { infraClamp, infraCopy, infraForkRng, infraPick, infraRandBetween, infraRandInt } from '../utils.js';

export function infraCreateRngStreams(seed = 2026) {
  const base = (Number(seed) || 2026) >>> 0;
  return {
    topology: infraForkRng(base, 'topology'),
    profile: infraForkRng(base, 'profile'),
    curvature: infraForkRng(base, 'curvature'),
    elevation: infraForkRng(base, 'elevation'),
    materials: infraForkRng(base, 'materials'),
    details: infraForkRng(base, 'details')
  };
}

export function infraApplyPresetWithLocks(currentParams = {}, presetParams = {}, locks = new Set()) {
  const lockSet = locks instanceof Set ? locks : new Set(Array.isArray(locks) ? locks : []);
  const next = infraCopy(currentParams);
  for (const [key, val] of Object.entries(presetParams || {})) {
    if (lockSet.has(key)) continue;
    next[key] = infraCopy(val);
  }
  return next;
}

export function infraRandomizeParams(schemaFields = [], currentParams = {}, seed = 2026, locks = new Set(), options = {}) {
  const lockSet = locks instanceof Set ? locks : new Set(Array.isArray(locks) ? locks : []);
  const streams = infraCreateRngStreams(seed);
  const next = infraCopy(currentParams);
  const targetGroup = options.group || null;

  for (const field of schemaFields) {
    if (!field || !field.key) continue;
    if (field.randomizable === false) continue;
    if (targetGroup && field.group !== targetGroup) continue;
    if (lockSet.has(field.key)) continue;

    const r = streams[field.rngStream || 'profile'] || streams.profile;

    if (field.type === 'boolean') {
      next[field.key] = r() > (field.falseBias ?? 0.35);
    } else if (field.type === 'range') {
      const min = Number(field.min ?? 0);
      const max = Number(field.max ?? 1);
      const step = Number(field.step ?? 0.1);
      const safeMin = field.safeMin !== undefined ? Number(field.safeMin) : min;
      const safeMax = field.safeMax !== undefined ? Number(field.safeMax) : max;
      if (step >= 1) {
        const steps = Math.max(0, Math.round((safeMax - safeMin) / step));
        next[field.key] = infraClamp(safeMin + infraRandInt(r, 0, steps) * step, min, max);
      } else {
        const raw = infraRandBetween(r, safeMin, safeMax);
        const snapped = Math.round(raw / step) * step;
        next[field.key] = Number(infraClamp(snapped, min, max).toFixed(3));
      }
    } else if (field.type === 'select' && Array.isArray(field.options) && field.options.length) {
      const picked = infraPick(r, field.options);
      next[field.key] = Array.isArray(picked) ? picked[0] : (picked?.value ?? picked);
    }
  }

  return next;
}
