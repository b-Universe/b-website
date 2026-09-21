/* global modernGif, OffscreenCanvas, createImageBitmap */
importScripts('/assets/vendor/modern-gif/index.js');

self.onmessage = async event => {
  const { buffer, type, settings } = event.data;
  try {
    self.postMessage({ type: 'progress', value: 0.04, label: 'Decoding source…' });
    const sourceFrames = type === 'image/gif'
      ? modernGif.decodeFrames(buffer)
      : [await decodeStill(buffer, type)];

    const plan = createPlan(sourceFrames, settings);
    const encodedFrames = [];
    for (let index = 0; index < plan.frames.length; index += 1) {
      encodedFrames.push(await renderFrame(plan.frames[index], index, plan, settings));
      if (index % Math.max(1, Math.floor(plan.frames.length / 20)) === 0) {
        self.postMessage({
          type: 'progress',
          value: 0.08 + (index / plan.frames.length) * 0.62,
          label: `Processing frame ${index + 1} of ${plan.frames.length}…`
        });
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    self.postMessage({ type: 'progress', value: 0.74, label: 'Building palette and encoding GIF…' });
    const options = {
      width: plan.width,
      height: plan.height,
      frames: encodedFrames,
      maxColors: settings.paletteSize,
      premultipliedAlpha: false,
      format: 'arrayBuffer'
    };
    if (settings.dither) options.dither = settings.dither;
    const result = await modernGif.encode(options);
    self.postMessage({ type: 'complete', buffer: result, width: plan.width, height: plan.height, frames: encodedFrames.length }, [result]);
  } catch (error) {
    self.postMessage({ type: 'error', message: error?.message || 'GIF export failed.' });
  }
};

async function decodeStill(buffer, type) {
  const bitmap = await createImageBitmap(new Blob([buffer], { type }));
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0);
  const data = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
  bitmap.close();
  return { width: canvas.width, height: canvas.height, delay: 100, data };
}

function createPlan(sourceFrames, settings) {
  const sourceWidth = sourceFrames[0].width;
  const sourceHeight = sourceFrames[0].height;
  const scaledWidth = Math.max(1, Math.round(sourceWidth * settings.scale));
  const scaledHeight = Math.max(1, Math.round(sourceHeight * settings.scale));

  if (settings.isAnimatedSource) {
    const totalDuration = sourceFrames.reduce((sum, frame) => sum + Math.max(20, frame.delay || 100), 0);
    let elapsed = 0;
    const hueProgress = sourceFrames.map(frame => {
      const progress = elapsed / totalDuration;
      elapsed += Math.max(20, frame.delay || 100);
      return progress;
    });
    return { width: scaledWidth, height: scaledHeight, drawWidth: scaledWidth, drawHeight: scaledHeight, frames: sourceFrames, rotating: false, hueProgress };
  }

  const animating = settings.rotationEnabled || settings.hueCycleEnabled;
  if (!animating) {
    return { width: scaledWidth, height: scaledHeight, drawWidth: scaledWidth, drawHeight: scaledHeight, frames: sourceFrames, rotating: false, hueProgress: [0] };
  }

  const width = settings.rotationEnabled ? Math.max(1, Math.ceil(Math.hypot(scaledWidth, scaledHeight))) : scaledWidth;
  const height = settings.rotationEnabled ? width : scaledHeight;
  const frameCount = Math.max(2, Math.round(settings.loopDuration * settings.rotationFps));
  return {
    width,
    height,
    drawWidth: scaledWidth,
    drawHeight: scaledHeight,
    frames: Array.from({ length: frameCount }, () => sourceFrames[0]),
    rotating: settings.rotationEnabled,
    hueProgress: Array.from({ length: frameCount }, (_, index) => index / frameCount)
  };
}

async function renderFrame(frame, index, plan, settings) {
  const sourceImage = new ImageData(new Uint8ClampedArray(frame.data), frame.width, frame.height);
  const bitmap = await createImageBitmap(sourceImage);
  const canvas = new OffscreenCanvas(plan.width, plan.height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.clearRect(0, 0, plan.width, plan.height);
  context.save();
  context.translate(plan.width / 2, plan.height / 2);
  if (plan.rotating) {
    const angle = settings.rotationDirection * Math.PI * 2 * index / plan.frames.length;
    context.rotate(angle);
  }
  context.drawImage(bitmap, -plan.drawWidth / 2, -plan.drawHeight / 2, plan.drawWidth, plan.drawHeight);
  context.restore();
  bitmap.close();
  const image = context.getImageData(0, 0, plan.width, plan.height);
  applyAdjustments(image.data, settings, plan.hueProgress[index] || 0);
  const generatedStillAnimation = !settings.isAnimatedSource && plan.frames.length > 1;
  const baseDelay = generatedStillAnimation
    ? settings.loopDuration * 1000 / plan.frames.length
    : (frame.delay || 100) / settings.animationSpeed;
  return {
    data: image.data,
    delay: Math.max(20, Math.round(baseDelay / 10) * 10),
    width: plan.width,
    height: plan.height
  };
}

function clamp(value) {
  return Math.max(0, Math.min(255, value));
}

function applyAdjustments(data, settings, hueProgress) {
  const a = settings.adjustments;
  const brightness = 1 + a.brightness / 100;
  const contrast = Math.max(0, 1 + a.contrast / 100);
  const saturation = Math.max(0, 1 + a.saturation / 100);
  const exposure = 2 ** a.exposure;
  const inverseGamma = 1 / a.gamma;
  const animatedHue = settings.hueCycleEnabled ? hueProgress * Math.PI * 2 : 0;
  const hue = a.hue * Math.PI / 180 + animatedHue;
  const cosHue = Math.cos(hue);
  const sinHue = Math.sin(hue);
  const temperature = a.temperature / 100;
  const tint = a.tint / 100;
  const opacity = a.opacity / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] / 255 * brightness * exposure;
    let g = data[i + 1] / 255 * brightness * exposure;
    let b = data[i + 2] / 255 * brightness * exposure;
    r = (r - .5) * contrast + .5;
    g = (g - .5) * contrast + .5;
    b = (b - .5) * contrast + .5;
    let luminance = .2126 * r + .7152 * g + .0722 * b;
    r = luminance + (r - luminance) * saturation;
    g = luminance + (g - luminance) * saturation;
    b = luminance + (b - luminance) * saturation;

    const y = .299 * r + .587 * g + .114 * b;
    const iq = .596 * r - .274 * g - .322 * b;
    const qq = .211 * r - .523 * g + .312 * b;
    const rotatedI = iq * cosHue - qq * sinHue;
    const rotatedQ = iq * sinHue + qq * cosHue;
    r = y + .956 * rotatedI + .621 * rotatedQ;
    g = y - .272 * rotatedI - .647 * rotatedQ;
    b = y - 1.106 * rotatedI + 1.703 * rotatedQ;

    r = Math.max(0, r) ** inverseGamma + temperature * .12 - tint * .035;
    g = Math.max(0, g) ** inverseGamma + tint * .1;
    b = Math.max(0, b) ** inverseGamma - temperature * .12 - tint * .035;
    if (settings.grayscale) {
      luminance = .2126 * r + .7152 * g + .0722 * b;
      r = g = b = luminance;
    }
    if (settings.sepia) {
      const oldR = r, oldG = g, oldB = b;
      r = .393 * oldR + .769 * oldG + .189 * oldB;
      g = .349 * oldR + .686 * oldG + .168 * oldB;
      b = .272 * oldR + .534 * oldG + .131 * oldB;
    }
    if (settings.invert) { r = 1 - r; g = 1 - g; b = 1 - b; }
    data[i] = clamp(r * 255);
    data[i + 1] = clamp(g * 255);
    data[i + 2] = clamp(b * 255);
    data[i + 3] = clamp(data[i + 3] * opacity);
  }
}
