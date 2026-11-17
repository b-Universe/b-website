import zlib from 'node:zlib';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

export function encodeRgbaPng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    const srcOffset = y * stride;
    for (let i = 0; i < stride; i++) {
      raw[rowStart + 1 + i] = rgba[srcOffset + i];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function parseCssColor(raw) {
  const str = String(raw || '#000000').trim();
  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16) || 0;
      const g = parseInt(hex.slice(2, 4), 16) || 0;
      const b = parseInt(hex.slice(4, 6), 16) || 0;
      const a = hex.length === 8 ? (parseInt(hex.slice(6, 8), 16) / 255) : 1;
      return [r, g, b, a];
    }
  }
  const rgbaMatch = /^rgba?\(([^)]+)\)$/i.exec(str);
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(',').map((s) => Number(s.trim()));
    return [
      Math.max(0, Math.min(255, Math.round(parts[0] || 0))),
      Math.max(0, Math.min(255, Math.round(parts[1] || 0))),
      Math.max(0, Math.min(255, Math.round(parts[2] || 0))),
      parts.length >= 4 && Number.isFinite(parts[3]) ? Math.max(0, Math.min(1, parts[3])) : 1
    ];
  }
  return [0, 0, 0, 1];
}

export class SoftwareCanvas {
  constructor(width = 256, height = 256) {
    this._width = width;
    this._height = height;
    this._buffer = new Uint8ClampedArray(width * height * 4);
    this._ctx = null;
    this._tx = 0;
    this._ty = 0;
    this._sx = 1;
    this._sy = 1;
    this._stack = [];
  }

  _resetTransform() {
    this._tx = 0;
    this._ty = 0;
    this._sx = 1;
    this._sy = 1;
    this._stack = [];
  }

  get width() {
    return this._width;
  }

  set width(val) {
    this._width = Math.max(1, Math.floor(Number(val) || 256));
    this._buffer = new Uint8ClampedArray(this._width * this._height * 4);
    this._resetTransform();
  }

  get height() {
    return this._height;
  }

  set height(val) {
    this._height = Math.max(1, Math.floor(Number(val) || 256));
    this._buffer = new Uint8ClampedArray(this._width * this._height * 4);
    this._resetTransform();
  }

  _blendPixel(px, py, r, g, b, alpha) {
    if (px < 0 || py < 0 || px >= this._width || py >= this._height || alpha <= 0) return;
    const idx = (py * this._width + px) * 4;
    if (alpha >= 0.999) {
      this._buffer[idx] = r;
      this._buffer[idx + 1] = g;
      this._buffer[idx + 2] = b;
      this._buffer[idx + 3] = 255;
      return;
    }
    const inv = 1 - alpha;
    const dstA = this._buffer[idx + 3] / 255;
    const outA = alpha + dstA * inv;
    if (outA <= 0) return;
    this._buffer[idx] = Math.round((r * alpha + this._buffer[idx] * dstA * inv) / outA);
    this._buffer[idx + 1] = Math.round((g * alpha + this._buffer[idx + 1] * dstA * inv) / outA);
    this._buffer[idx + 2] = Math.round((b * alpha + this._buffer[idx + 2] * dstA * inv) / outA);
    this._buffer[idx + 3] = Math.round(outA * 255);
  }

  getContext() {
    if (this._ctx) return this._ctx;
    const self = this;
    const path = [];
    let currentSub = [];

    this._ctx = {
      fillStyle: '#000000',
      strokeStyle: '#000000',
      globalAlpha: 1,
      lineWidth: 1,
      font: '12px sans-serif',
      textAlign: 'left',
      shadowColor: 'rgba(0,0,0,0)',
      shadowBlur: 0,

      clearRect(x, y, w, h) {
        const x0 = Math.max(0, Math.floor(x));
        const y0 = Math.max(0, Math.floor(y));
        const x1 = Math.min(self._width, Math.ceil(x + w));
        const y1 = Math.min(self._height, Math.ceil(y + h));
        for (let py = y0; py < y1; py++) {
          for (let px = x0; px < x1; px++) {
            const idx = (py * self._width + px) * 4;
            self._buffer[idx] = 0;
            self._buffer[idx + 1] = 0;
            self._buffer[idx + 2] = 0;
            self._buffer[idx + 3] = 0;
          }
        }
      },

      fillRect(x, y, w, h) {
        const [r, g, b, a] = parseCssColor(this.fillStyle);
        const alpha = a * (Number.isFinite(this.globalAlpha) ? this.globalAlpha : 1);
        const x0 = Math.max(0, Math.floor(x));
        const y0 = Math.max(0, Math.floor(y));
        const x1 = Math.min(self._width, Math.ceil(x + w));
        const y1 = Math.min(self._height, Math.ceil(y + h));
        for (let py = y0; py < y1; py++) {
          for (let px = x0; px < x1; px++) {
            self._blendPixel(px, py, r, g, b, alpha);
          }
        }
      },

      strokeRect(x, y, w, h) {
        const lw = Math.max(1, Number(this.lineWidth) || 1);
        const prevFill = this.fillStyle;
        this.fillStyle = this.strokeStyle;
        this.fillRect(x, y, w, lw);
        this.fillRect(x, y + h - lw, w, lw);
        this.fillRect(x, y, lw, h);
        this.fillRect(x + w - lw, y, lw, h);
        this.fillStyle = prevFill;
      },

      beginPath() {
        path.length = 0;
        currentSub = [];
      },

      moveTo(x, y) {
        currentSub = [{ type: 'move', x, y }];
        path.push(currentSub);
      },

      lineTo(x, y) {
        if (!currentSub.length) {
          this.moveTo(x, y);
        } else {
          currentSub.push({ type: 'line', x, y });
        }
      },

      arc(cx, cy, radius) {
        path.push([{ type: 'circle', cx, cy, radius }]);
      },

      stroke() {
        const [r, g, b, a] = parseCssColor(this.strokeStyle);
        const alpha = a * (Number.isFinite(this.globalAlpha) ? this.globalAlpha : 1);
        const lw = Math.max(1, Number(this.lineWidth) || 1);
        const half = Math.floor(lw * 0.5);

        for (const sub of path) {
          for (let i = 1; i < sub.length; i++) {
            const p0 = sub[i - 1];
            const p1 = sub[i];
            if (p0.x === undefined || p1.x === undefined) continue;
            const steps = Math.max(1, Math.ceil(Math.hypot(p1.x - p0.x, p1.y - p0.y)));
            for (let s = 0; s <= steps; s++) {
              const t = s / steps;
              const cx = Math.round(p0.x + (p1.x - p0.x) * t);
              const cy = Math.round(p0.y + (p1.y - p0.y) * t);
              for (let dy = -half; dy <= half; dy++) {
                for (let dx = -half; dx <= half; dx++) {
                  self._blendPixel(cx + dx, cy + dy, r, g, b, alpha);
                }
              }
            }
          }
        }
      },

      fill() {
        const [r, g, b, a] = parseCssColor(this.fillStyle);
        const alpha = a * (Number.isFinite(this.globalAlpha) ? this.globalAlpha : 1);
        for (const sub of path) {
          for (const cmd of sub) {
            if (cmd.type === 'circle') {
              const r2 = cmd.radius * cmd.radius;
              const minX = Math.floor(cmd.cx - cmd.radius);
              const maxX = Math.ceil(cmd.cx + cmd.radius);
              const minY = Math.floor(cmd.cy - cmd.radius);
              const maxY = Math.ceil(cmd.cy + cmd.radius);
              for (let py = minY; py <= maxY; py++) {
                for (let px = minX; px <= maxX; px++) {
                  const dx = px - cmd.cx;
                  const dy = py - cmd.cy;
                  if (dx * dx + dy * dy <= r2) {
                    self._blendPixel(px, py, r, g, b, alpha);
                  }
                }
              }
            }
          }
        }
      },

      measureText(txt) {
        return { width: String(txt || '').length * 10 };
      },

      fillText() {},

      save() {
        self._stack.push([self._tx, self._ty, self._sx, self._sy]);
      },

      restore() {
        const prev = self._stack.pop();
        if (prev) {
          [self._tx, self._ty, self._sx, self._sy] = prev;
        }
      },

      setTransform(a, b, c, d, e, f) {
        self._sx = Number.isFinite(a) ? a : 1;
        self._sy = Number.isFinite(d) ? d : 1;
        self._tx = Number.isFinite(e) ? e : 0;
        self._ty = Number.isFinite(f) ? f : 0;
      },

      translate(x, y) {
        self._tx += (Number(x) || 0) * self._sx;
        self._ty += (Number(y) || 0) * self._sy;
      },

      scale(sx, sy) {
        self._sx *= Number.isFinite(sx) ? sx : 1;
        self._sy *= Number.isFinite(sy) ? sy : 1;
      },

      putImageData(imgData, dx = 0, dy = 0) {
        if (!imgData || !imgData.data) return;
        const sw = imgData.width || 0;
        const sh = imgData.height || 0;
        const ox = Math.floor(dx);
        const oy = Math.floor(dy);
        for (let py = 0; py < sh; py++) {
          const ty = oy + py;
          if (ty < 0 || ty >= self._height) continue;
          for (let px = 0; px < sw; px++) {
            const tx = ox + px;
            if (tx < 0 || tx >= self._width) continue;
            const srcIdx = (py * sw + px) * 4;
            const dstIdx = (ty * self._width + tx) * 4;
            self._buffer[dstIdx] = imgData.data[srcIdx];
            self._buffer[dstIdx + 1] = imgData.data[srcIdx + 1];
            self._buffer[dstIdx + 2] = imgData.data[srcIdx + 2];
            self._buffer[dstIdx + 3] = imgData.data[srcIdx + 3];
          }
        }
      },

      drawImage(img, ...args) {
        if (!img || !img._buffer) return;
        const sw = img.width || 0;
        const sh = img.height || 0;
        if (!sw || !sh) return;
        let sx0 = 0;
        let sy0 = 0;
        let sW = sw;
        let sH = sh;
        let dx = 0;
        let dy = 0;
        let dW = sw;
        let dH = sh;
        if (args.length === 2) {
          [dx, dy] = args;
        } else if (args.length === 4) {
          [dx, dy, dW, dH] = args;
        } else if (args.length >= 8) {
          [sx0, sy0, sW, sH, dx, dy, dW, dH] = args;
        }
        if (!dW || !dH || !sW || !sH) return;

        const c0x = self._tx + self._sx * dx;
        const c1x = self._tx + self._sx * (dx + dW);
        const c0y = self._ty + self._sy * dy;
        const c1y = self._ty + self._sy * (dy + dH);
        const xStart = Math.max(0, Math.floor(Math.min(c0x, c1x)));
        const xEnd = Math.min(self._width, Math.ceil(Math.max(c0x, c1x)));
        const yStart = Math.max(0, Math.floor(Math.min(c0y, c1y)));
        const yEnd = Math.min(self._height, Math.ceil(Math.max(c0y, c1y)));
        const alphaScale = Number.isFinite(this.globalAlpha) ? this.globalAlpha : 1;

        for (let py = yStart; py < yEnd; py++) {
          const uy = (py + 0.5 - self._ty) / self._sy;
          const v = (uy - dy) / dH;
          if (v < 0 || v >= 1) continue;
          const imgY = Math.min(sh - 1, Math.max(0, Math.floor(sy0 + v * sH)));
          for (let px = xStart; px < xEnd; px++) {
            const ux = (px + 0.5 - self._tx) / self._sx;
            const u = (ux - dx) / dW;
            if (u < 0 || u >= 1) continue;
            const imgX = Math.min(sw - 1, Math.max(0, Math.floor(sx0 + u * sW)));
            const srcIdx = (imgY * sw + imgX) * 4;
            const a = (img._buffer[srcIdx + 3] / 255) * alphaScale;
            self._blendPixel(px, py, img._buffer[srcIdx], img._buffer[srcIdx + 1], img._buffer[srcIdx + 2], a);
          }
        }
      }
    };

    return this._ctx;
  }

  toPngBuffer() {
    return encodeRgbaPng(this._width, this._height, this._buffer);
  }

  toDataURL() {
    return 'data:image/png;base64,' + this.toPngBuffer().toString('base64');
  }

  toBlob(callback, type) {
    const pngBuf = this.toPngBuffer();
    callback(new Blob([pngBuf], { type: type || 'image/png' }));
  }
}
