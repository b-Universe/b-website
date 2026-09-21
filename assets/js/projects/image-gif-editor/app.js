import { ADJUSTMENTS, DEFAULT_ADJUSTMENTS, LIMITS, baseName, estimateGifBytes, formatBytes } from './settings.js';
import { PreviewRenderer } from './preview-renderer.js';

const $ = selector => document.querySelector(selector);
const elements = {
  uploadZone: $('#upload-zone'), fileInput: $('#file-input'), status: $('#studio-status'), editor: $('#editor'),
  controls: $('#editor-controls'), canvas: $('#preview-canvas'), placeholder: $('#preview-placeholder'),
  previewBadge: $('#preview-badge'), fileInfo: $('#file-info-panel'), infoName: $('#info-name'),
  infoDimensions: $('#info-dimensions'), infoSize: $('#info-size'), infoType: $('#info-type'),
  infoFrames: $('#info-frames'), infoFramesRow: $('#info-frames-row'), play: $('#play-toggle'),
  stepBack: $('#step-back'), stepForward: $('#step-forward'), frameReadout: $('#frame-readout'),
  replace: $('#replace-image'), clear: $('#clear-image'), adjustments: $('#adjustment-controls'),
  resetAll: $('#reset-all'), grayscale: $('#effect-grayscale'), sepia: $('#effect-sepia'), invert: $('#effect-invert'),
  gifControls: $('#gif-animation-controls'), stillControls: $('#still-animation-controls'), animationKind: $('#animation-kind'),
  animationSpeed: $('#animation-speed'), animationSpeedValue: $('#animation-speed-value'), rainbowEnabled: $('#rainbow-enabled'),
  rotationEnabled: $('#rotation-enabled'), stillAnimationOptions: $('#still-animation-options'),
  rotationDirectionField: $('#rotation-direction-field'), rotationDirection: $('#rotation-direction'), loopDuration: $('#loop-duration'),
  rotationFps: $('#rotation-fps'), outputScale: $('#output-scale'), paletteSize: $('#palette-size'),
  dither: $('#dither-method'), estimatedSize: $('#estimated-size'), outputSummary: $('#output-summary'),
  exportButton: $('#export-button'), exportProgress: $('#export-progress'), progressBar: $('#progress-bar'),
  progressLabel: $('#progress-label'), exportResult: $('#export-result'), exportedSize: $('#exported-size'),
  downloadLink: $('#download-link')
};

const state = {
  adjustments: { ...DEFAULT_ADJUSTMENTS }, grayscale: false, sepia: false, invert: false,
  animationSpeed: 1, hueCycleEnabled: true, rotationEnabled: true, rotationDirection: 1, loopDuration: 2, rotationFps: 24,
  scale: .75, paletteSize: 128, dither: 'floyd-steinberg', isAnimatedSource: false
};

let renderer;
let current = null;
let loadToken = 0;
let exportWorker = null;
let exportUrl = null;
let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;

initialize();

function initialize() {
  buildAdjustmentControls();
  bindEvents();
  try {
    if (!window.modernGif) throw new Error('The GIF processing library did not load.');
    renderer = new PreviewRenderer(elements.canvas);
    renderer.setState(state);
    renderer.setPlaying(playing);
    renderer.addEventListener('framechange', event => updateFrameReadout(event.detail.index, event.detail.count));
  } catch (error) {
    showStatus(error.message, 'error', false);
    elements.uploadZone.setAttribute('aria-disabled', 'true');
  }
  updatePlayButton();
}

function buildAdjustmentControls() {
  const fragment = document.createDocumentFragment();
  ADJUSTMENTS.forEach(definition => {
    const row = document.createElement('div');
    row.className = 'control-row';
    row.innerHTML = `
      <div class="control-label">
        <label for="adjust-${definition.key}">${definition.label}</label>
        <span><output id="value-${definition.key}" for="adjust-${definition.key}">${displayValue(definition.value, definition)}</output>
        <button class="reset-control" type="button" data-reset="${definition.key}" aria-label="Reset ${definition.label}" title="Reset ${definition.label}"><i class="fas fa-rotate-left" aria-hidden="true"></i></button></span>
      </div>
      <input id="adjust-${definition.key}" data-adjustment="${definition.key}" type="range" min="${definition.min}" max="${definition.max}" step="${definition.step}" value="${definition.value}">
      <div class="range-ends"><span>${displayValue(definition.min, definition)}</span><span>${displayValue(definition.max, definition)}</span></div>`;
    fragment.appendChild(row);
  });
  elements.adjustments.appendChild(fragment);
}

function bindEvents() {
  elements.uploadZone.addEventListener('click', () => elements.fileInput.click());
  elements.uploadZone.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); elements.fileInput.click(); }
  });
  ['dragenter', 'dragover'].forEach(type => elements.uploadZone.addEventListener(type, event => {
    event.preventDefault(); elements.uploadZone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach(type => elements.uploadZone.addEventListener(type, event => {
    event.preventDefault(); elements.uploadZone.classList.remove('dragover');
  }));
  elements.uploadZone.addEventListener('drop', event => {
    const file = event.dataTransfer?.files?.[0];
    if (file) loadFile(file);
  });
  elements.fileInput.addEventListener('change', () => {
    const file = elements.fileInput.files?.[0];
    if (file) loadFile(file);
    elements.fileInput.value = '';
  });
  elements.replace.addEventListener('click', () => elements.fileInput.click());
  elements.clear.addEventListener('click', clearCurrent);

  elements.adjustments.addEventListener('input', event => {
    const input = event.target.closest('[data-adjustment]');
    if (!input) return;
    const key = input.dataset.adjustment;
    const definition = ADJUSTMENTS.find(item => item.key === key);
    state.adjustments[key] = Number(input.value);
    $(`#value-${key}`).value = displayValue(state.adjustments[key], definition);
    scheduleStateUpdate();
  });
  elements.adjustments.addEventListener('click', event => {
    const button = event.target.closest('[data-reset]');
    if (!button) return;
    resetAdjustment(button.dataset.reset);
  });
  elements.resetAll.addEventListener('click', resetAll);
  [elements.grayscale, elements.sepia, elements.invert].forEach(input => input.addEventListener('change', () => {
    state.grayscale = elements.grayscale.checked;
    state.sepia = elements.sepia.checked;
    state.invert = elements.invert.checked;
    applyState();
  }));

  elements.animationSpeed.addEventListener('input', () => {
    state.animationSpeed = Number(elements.animationSpeed.value);
    elements.animationSpeedValue.value = `${state.animationSpeed}×`;
    applyState();
  });
  elements.rainbowEnabled.addEventListener('change', () => {
    state.hueCycleEnabled = elements.rainbowEnabled.checked;
    updateAnimationControls();
    applyState();
  });
  elements.rotationEnabled.addEventListener('change', () => {
    state.rotationEnabled = elements.rotationEnabled.checked;
    updateAnimationControls();
    applyState();
  });
  elements.rotationDirection.addEventListener('change', () => { state.rotationDirection = Number(elements.rotationDirection.value); applyState(); });
  elements.loopDuration.addEventListener('change', () => { state.loopDuration = Number(elements.loopDuration.value); applyState(); });
  elements.rotationFps.addEventListener('change', () => { state.rotationFps = Number(elements.rotationFps.value); applyState(); });
  elements.outputScale.addEventListener('change', outputSettingsChanged);
  elements.paletteSize.addEventListener('change', outputSettingsChanged);
  elements.dither.addEventListener('change', outputSettingsChanged);
  document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => applyPreset(button.dataset.preset)));

  elements.play.addEventListener('click', () => { playing = !playing; renderer?.setPlaying(playing); updatePlayButton(); });
  elements.stepBack.addEventListener('click', () => stepFrame(-1));
  elements.stepForward.addEventListener('click', () => stepFrame(1));
  elements.exportButton.addEventListener('click', exportGif);
  window.addEventListener('beforeunload', releaseResources);
}

let stateFrame = 0;
function scheduleStateUpdate() {
  if (stateFrame) return;
  stateFrame = requestAnimationFrame(() => { stateFrame = 0; applyState(); });
}

function applyState() {
  renderer?.setState(state);
  updateEstimate();
  hideExportResult();
}

function displayValue(value, definition) {
  const prefix = value > 0 && !['gamma', 'opacity'].includes(definition.key) ? '+' : '';
  const formatted = Number.isInteger(Number(value)) ? value : Number(value).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return `${prefix}${formatted}${definition.suffix}`;
}

function resetAdjustment(key) {
  const definition = ADJUSTMENTS.find(item => item.key === key);
  state.adjustments[key] = definition.value;
  $(`#adjust-${key}`).value = definition.value;
  $(`#value-${key}`).value = displayValue(definition.value, definition);
  applyState();
}

function resetAll() {
  ADJUSTMENTS.forEach(({ key }) => resetAdjustment(key));
  state.grayscale = state.sepia = state.invert = false;
  elements.grayscale.checked = elements.sepia.checked = elements.invert.checked = false;
  applyState();
}

async function loadFile(file) {
  const token = ++loadToken;
  const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  if (!file.size) return showStatus('That file is empty. Choose a valid image.', 'error');
  if (!allowed.includes(file.type)) return showStatus('Unsupported format. Choose a PNG, JPEG, WebP, or GIF.', 'error');
  if (file.size > LIMITS.maxFileBytes) return showStatus(`This file is larger than the ${formatBytes(LIMITS.maxFileBytes, 0)} safety limit.`, 'error');
  cancelExport();
  elements.editor.setAttribute('aria-busy', 'true');
  showStatus('Reading image locally…', '', false);

  try {
    const buffer = await file.arrayBuffer();
    if (token !== loadToken) return;
    let metadata;
    let previewFrames;
    if (file.type === 'image/gif') {
      const gif = window.modernGif.decode(buffer);
      const decodedBytes = gif.width * gif.height * gif.frames.length * 4;
      validateDimensions(gif.width, gif.height);
      if (decodedBytes > LIMITS.maxDecodeBytes) {
        throw new Error(`This GIF would need about ${formatBytes(decodedBytes)} of decoded frame memory, above the ${formatBytes(LIMITS.maxDecodeBytes, 0)} browser safety limit.`);
      }
      showStatus(`Decoding ${gif.frames.length} GIF frame${gif.frames.length === 1 ? '' : 's'} in a background worker…`, '', false);
      const decoded = await window.modernGif.decodeFrames(buffer.slice(0), { workerUrl: '/assets/vendor/modern-gif/worker.js' });
      if (token !== loadToken) return;
      const duration = decoded.reduce((sum, frame) => sum + Math.max(20, frame.delay || 100), 0);
      previewFrames = await createPreviewFrames(decoded, LIMITS.previewEdge, token);
      metadata = { width: gif.width, height: gif.height, frameCount: gif.frames.length, duration, animated: gif.frames.length > 1 };
    } else {
      const bitmap = await createImageBitmap(file);
      validateDimensions(bitmap.width, bitmap.height);
      metadata = { width: bitmap.width, height: bitmap.height, frameCount: 1, duration: 0, animated: false };
      previewFrames = [await resizeBitmap(bitmap, LIMITS.previewEdge)];
      bitmap.close();
    }
    if (token !== loadToken) { previewFrames.forEach(frame => frame.source.close()); return; }

    releaseCurrentOnly();
    current = { file, buffer, ...metadata };
    state.isAnimatedSource = metadata.animated;
    renderer.setFrames(previewFrames, metadata.width, metadata.height);
    renderer.setState(state);
    renderer.setPlaying(playing);
    renderLoadedState();
    showStatus(`${metadata.animated ? 'Animated GIF' : 'Image'} ready. Preview changes stay on this device.`, 'success');
  } catch (error) {
    console.error(error);
    if (token === loadToken) showStatus(error?.message || 'This image could not be decoded.', 'error');
  } finally {
    if (token === loadToken) elements.editor.setAttribute('aria-busy', 'false');
  }
}

function validateDimensions(width, height) {
  if (!width || !height || width > LIMITS.maxDimension || height > LIMITS.maxDimension) {
    throw new Error(`Image dimensions must be between 1 and ${LIMITS.maxDimension.toLocaleString()} pixels per side.`);
  }
}

async function createPreviewFrames(decodedFrames, maxEdge, token) {
  const output = [];
  for (let index = 0; index < decodedFrames.length; index += 1) {
    if (token !== loadToken) break;
    const frame = decodedFrames[index];
    const fullBitmap = await createImageBitmap(new ImageData(frame.data, frame.width, frame.height));
    const resized = await resizeBitmap(fullBitmap, maxEdge);
    fullBitmap.close();
    resized.delay = Math.max(20, frame.delay || 100);
    output.push(resized);
    if (index % 10 === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }
  decodedFrames.length = 0;
  return output;
}

async function resizeBitmap(bitmap, maxEdge) {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
  return { source: await createImageBitmap(canvas), width, height, delay: 100 };
}

function renderLoadedState() {
  const { file, width, height, frameCount, duration, animated } = current;
  elements.controls.disabled = false;
  elements.exportButton.disabled = false;
  elements.replace.disabled = false;
  elements.play.disabled = false;
  elements.stepBack.disabled = frameCount <= 1;
  elements.stepForward.disabled = frameCount <= 1;
  elements.placeholder.hidden = true;
  elements.fileInfo.hidden = false;
  elements.previewBadge.textContent = animated ? 'Animated GIF' : file.type.split('/')[1].toUpperCase().replace('JPEG', 'JPG');
  elements.infoName.textContent = file.name;
  elements.infoDimensions.textContent = `${width.toLocaleString()} × ${height.toLocaleString()}`;
  elements.infoSize.textContent = formatBytes(file.size);
  elements.infoType.textContent = file.type.replace('image/', '').toUpperCase();
  elements.infoFramesRow.hidden = false;
  if (animated) {
    const fps = frameCount / (duration / 1000);
    elements.infoFrames.textContent = `${frameCount} frames · ${(duration / 1000).toFixed(2)}s · ${fps.toFixed(1)} FPS avg`;
    elements.gifControls.hidden = false;
    elements.stillControls.hidden = true;
  } else {
    elements.infoFrames.textContent = 'Static image';
    elements.gifControls.hidden = true;
    elements.stillControls.hidden = false;
  }
  updateAnimationControls();
  updateFrameReadout(0, frameCount);
  updateEstimate();
  hideExportResult();
}

function outputSettingsChanged() {
  state.scale = Number(elements.outputScale.value);
  state.paletteSize = Number(elements.paletteSize.value);
  state.dither = elements.dither.value;
  document.querySelectorAll('[data-preset]').forEach(button => button.classList.remove('active'));
  applyState();
}

function applyPreset(name) {
  const presets = {
    quality: { scale: 1, paletteSize: 256, dither: 'floyd-steinberg' },
    balanced: { scale: .75, paletteSize: 128, dither: 'floyd-steinberg' },
    small: { scale: .5, paletteSize: 64, dither: 'atkinson' }
  };
  Object.assign(state, presets[name]);
  elements.outputScale.value = state.scale;
  elements.paletteSize.value = state.paletteSize;
  elements.dither.value = state.dither;
  document.querySelectorAll('[data-preset]').forEach(button => button.classList.toggle('active', button.dataset.preset === name));
  applyState();
}

function outputPlan() {
  if (!current) return null;
  let width = Math.max(1, Math.round(current.width * state.scale));
  let height = Math.max(1, Math.round(current.height * state.scale));
  const animatingStill = state.rotationEnabled || state.hueCycleEnabled;
  let frames = current.animated ? current.frameCount : (animatingStill ? Math.round(state.loopDuration * state.rotationFps) : 1);
  if (!current.animated && state.rotationEnabled) width = height = Math.ceil(Math.hypot(width, height));
  return { width, height, frames };
}

function updateEstimate() {
  const plan = outputPlan();
  if (!plan) return;
  const estimated = estimateGifBytes({ ...plan, colors: state.paletteSize });
  elements.estimatedSize.textContent = `≈ ${formatBytes(estimated)}`;
  elements.outputSummary.textContent = `${plan.width.toLocaleString()} × ${plan.height.toLocaleString()} · ${plan.frames} frame${plan.frames === 1 ? '' : 's'} · ${state.paletteSize} colors`;
}

async function exportGif() {
  if (!current || exportWorker) return;
  const plan = outputPlan();
  if (plan.width * plan.height > LIMITS.maxExportPixelsPerFrame) {
    return showStatus('Those output dimensions are too large for a safe browser export. Reduce Output size.', 'error');
  }
  hideExportResult();
  elements.exportButton.disabled = true;
  elements.exportButton.querySelector('span').textContent = 'Exporting…';
  elements.exportProgress.hidden = false;
  elements.progressBar.style.width = '2%';
  elements.progressLabel.textContent = 'Starting background worker…';
  showStatus('Export is running locally in a background worker. You can keep adjusting the preview.', '', false);

  const settings = structuredClone(state);
  exportWorker = new Worker('/assets/js/projects/image-gif-editor/export-worker.js');
  exportWorker.onmessage = event => handleExportMessage(event.data, settings);
  exportWorker.onerror = event => finishExportError(event.message || 'The export worker stopped unexpectedly.');
  const copy = current.buffer.slice(0);
  exportWorker.postMessage({ buffer: copy, type: current.file.type, settings }, [copy]);
}

function handleExportMessage(message) {
  if (message.type === 'progress') {
    elements.progressBar.style.width = `${Math.round(message.value * 100)}%`;
    elements.progressLabel.textContent = message.label;
    return;
  }
  if (message.type === 'error') return finishExportError(message.message);
  if (message.type !== 'complete') return;
  let verified;
  try {
    verified = window.modernGif.decode(message.buffer);
    if (verified.width !== message.width || verified.height !== message.height || verified.frames.length !== message.frames) {
      throw new Error('The encoded GIF did not match the requested frame plan.');
    }
  } catch (error) {
    return finishExportError(`Export verification failed: ${error.message}`);
  }
  if (exportUrl) URL.revokeObjectURL(exportUrl);
  const blob = new Blob([message.buffer], { type: 'image/gif' });
  exportUrl = URL.createObjectURL(blob);
  elements.downloadLink.href = exportUrl;
  elements.downloadLink.download = `${baseName(current.file.name)}-edited.gif`;
  elements.exportedSize.textContent = formatBytes(blob.size);
  elements.progressBar.style.width = '100%';
  const verifiedDuration = verified.frames.reduce((sum, frame) => sum + (frame.delay || 0), 0);
  elements.progressLabel.textContent = `Verified ${message.frames} frame${message.frames === 1 ? '' : 's'}, ${(verifiedDuration / 1000).toFixed(2)}s at ${message.width} × ${message.height}.`;
  elements.exportResult.hidden = false;
  showStatus('GIF export finished. The exact size is shown below.', 'success');
  finishExportWorker();
}

function finishExportError(message) {
  showStatus(message || 'GIF export failed. Try a smaller output size or fewer colors.', 'error');
  elements.exportProgress.hidden = true;
  finishExportWorker();
}

function finishExportWorker() {
  exportWorker?.terminate();
  exportWorker = null;
  elements.exportButton.disabled = !current;
  elements.exportButton.querySelector('span').textContent = 'Export GIF';
}

function cancelExport() {
  if (exportWorker) {
    exportWorker.terminate();
    exportWorker = null;
  }
  elements.exportProgress.hidden = true;
  elements.exportButton.querySelector('span').textContent = 'Export GIF';
}

function hideExportResult() {
  elements.exportResult.hidden = true;
  if (exportUrl) { URL.revokeObjectURL(exportUrl); exportUrl = null; }
}

function stepFrame(offset) {
  if (!renderer) return;
  playing = false;
  renderer.setPlaying(false);
  renderer.step(offset);
  updatePlayButton();
}

function updatePlayButton() {
  const icon = elements.play.querySelector('i');
  icon.className = `fas fa-${playing ? 'pause' : 'play'}`;
  elements.play.setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
}

function updateFrameReadout(index, count) {
  if (!current) { elements.frameReadout.textContent = 'No image loaded'; return; }
  if (current.animated) {
    elements.frameReadout.textContent = `Frame ${index + 1} of ${count}${state.hueCycleEnabled ? ' · rainbow' : ''}`;
    return;
  }
  if (state.rotationEnabled && state.hueCycleEnabled) elements.frameReadout.textContent = 'Rainbow + rotation preview';
  else if (state.hueCycleEnabled) elements.frameReadout.textContent = 'Rainbow preview';
  else if (state.rotationEnabled) elements.frameReadout.textContent = 'Rotation preview';
  else elements.frameReadout.textContent = 'Still preview';
}

function updateAnimationControls() {
  const isAnimated = Boolean(current?.animated);
  elements.animationKind.textContent = isAnimated
    ? (state.hueCycleEnabled ? 'Source + rainbow' : 'Source animation')
    : (state.hueCycleEnabled || state.rotationEnabled ? 'Still to GIF' : 'Still image');
  elements.stillAnimationOptions.hidden = isAnimated || (!state.hueCycleEnabled && !state.rotationEnabled);
  elements.rotationDirectionField.hidden = !state.rotationEnabled;
  updateFrameReadout(renderer?.frameIndex || 0, current?.frameCount || 1);
}

function showStatus(message, type = '', autoHide = true) {
  elements.status.textContent = message;
  elements.status.className = `studio-status ${type}`.trim();
  elements.status.hidden = false;
  clearTimeout(showStatus.timeout);
  if (autoHide && type === 'success') showStatus.timeout = setTimeout(() => { elements.status.hidden = true; }, 5000);
}

function clearCurrent() {
  loadToken += 1;
  cancelExport();
  releaseCurrentOnly();
  current = null;
  state.isAnimatedSource = false;
  renderer?.setFrames([], 1, 1);
  elements.controls.disabled = true;
  elements.exportButton.disabled = true;
  elements.replace.disabled = true;
  elements.play.disabled = true;
  elements.stepBack.disabled = true;
  elements.stepForward.disabled = true;
  elements.placeholder.hidden = false;
  elements.fileInfo.hidden = true;
  elements.previewBadge.textContent = 'Waiting';
  elements.animationKind.textContent = 'Load an image';
  elements.frameReadout.textContent = 'No image loaded';
  elements.estimatedSize.textContent = '—';
  elements.outputSummary.textContent = 'Choose an image to calculate output settings.';
  elements.status.hidden = true;
  hideExportResult();
}

function releaseCurrentOnly() {
  renderer?.releaseFrames();
  if (current) current.buffer = null;
}

function releaseResources() {
  cancelExport();
  renderer?.destroy();
  hideExportResult();
}
