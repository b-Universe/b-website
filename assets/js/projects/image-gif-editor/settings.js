export const ADJUSTMENTS = [
  { key: 'brightness', label: 'Brightness', min: -100, max: 100, step: 1, value: 0, suffix: '' },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100, step: 1, value: 0, suffix: '' },
  { key: 'saturation', label: 'Saturation', min: -100, max: 200, step: 1, value: 0, suffix: '' },
  { key: 'hue', label: 'Hue', min: -180, max: 180, step: 1, value: 0, suffix: '°' },
  { key: 'exposure', label: 'Exposure', min: -2, max: 2, step: 0.05, value: 0, suffix: ' EV' },
  { key: 'gamma', label: 'Gamma', min: 0.25, max: 3, step: 0.05, value: 1, suffix: '' },
  { key: 'temperature', label: 'Temperature', min: -100, max: 100, step: 1, value: 0, suffix: '' },
  { key: 'tint', label: 'Tint', min: -100, max: 100, step: 1, value: 0, suffix: '' },
  { key: 'opacity', label: 'Opacity', min: 0, max: 100, step: 1, value: 100, suffix: '%' }
];

export const DEFAULT_ADJUSTMENTS = Object.freeze(
  Object.fromEntries(ADJUSTMENTS.map(({ key, value }) => [key, value]))
);

export const LIMITS = Object.freeze({
  maxFileBytes: 80 * 1024 * 1024,
  maxDecodeBytes: 256 * 1024 * 1024,
  maxDimension: 12000,
  maxExportPixelsPerFrame: 18_000_000,
  previewEdge: 900
});

export function formatBytes(bytes, decimals = 1) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toFixed(index === 0 ? 0 : decimals)} ${units[index]}`;
}

export function baseName(filename) {
  return (filename.replace(/\.[^.]+$/, '') || 'image')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'image';
}

export function estimateGifBytes({ width, height, frames, colors }) {
  const paletteFactor = Math.max(0.28, Math.log2(colors) / 8);
  const motionFactor = frames > 1 ? 0.12 : 0.18;
  return Math.max(1024, Math.round(width * height * Math.max(frames, 1) * paletteFactor * motionFactor));
}
