const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  uniform vec2 u_scale;
  uniform float u_angle;
  uniform float u_viewAspect;
  varying vec2 v_texCoord;
  void main() {
    float c = cos(u_angle);
    float s = sin(u_angle);
    vec2 scaled = a_position * u_scale;
    // WebGL coordinates are square even when the canvas is not. Rotate in
    // aspect-corrected space so diagonal angles do not stretch the image.
    vec2 viewSpace = vec2(scaled.x * u_viewAspect, scaled.y);
    vec2 rotated = vec2(viewSpace.x * c - viewSpace.y * s, viewSpace.x * s + viewSpace.y * c);
    gl_Position = vec4(rotated.x / u_viewAspect, rotated.y, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  uniform sampler2D u_texture;
  uniform float u_brightness;
  uniform float u_contrast;
  uniform float u_saturation;
  uniform float u_hue;
  uniform float u_exposure;
  uniform float u_gamma;
  uniform float u_temperature;
  uniform float u_tint;
  uniform float u_opacity;
  uniform float u_grayscale;
  uniform float u_sepia;
  uniform float u_invert;
  varying vec2 v_texCoord;

  vec3 hueShift(vec3 color, float angle) {
    const mat3 toYiq = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
    const mat3 toRgb = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
    vec3 yiq = color * toYiq;
    float h = atan(yiq.z, yiq.y) + angle;
    float chroma = length(yiq.yz);
    return clamp(vec3(yiq.x, chroma * cos(h), chroma * sin(h)) * toRgb, 0.0, 1.0);
  }

  void main() {
    vec4 pixel = texture2D(u_texture, v_texCoord);
    vec3 color = pixel.rgb;
    color *= u_brightness;
    color *= exp2(u_exposure);
    color = (color - 0.5) * u_contrast + 0.5;
    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(vec3(luminance), color, u_saturation);
    color = hueShift(color, u_hue);
    color = pow(max(color, vec3(0.0)), vec3(1.0 / u_gamma));
    color.r += u_temperature * 0.12;
    color.b -= u_temperature * 0.12;
    color.g += u_tint * 0.1;
    color.r -= u_tint * 0.035;
    color.b -= u_tint * 0.035;
    luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(color, vec3(luminance), u_grayscale);
    vec3 sepia = vec3(
      dot(color, vec3(0.393, 0.769, 0.189)),
      dot(color, vec3(0.349, 0.686, 0.168)),
      dot(color, vec3(0.272, 0.534, 0.131))
    );
    color = mix(color, sepia, u_sepia);
    color = mix(color, vec3(1.0) - color, u_invert);
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), pixel.a * u_opacity);
  }
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || 'Unable to compile preview shader.');
  }
  return shader;
}

export class PreviewRenderer extends EventTarget {
  constructor(canvas) {
    super();
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
    if (!this.gl) throw new Error('WebGL is required for the live editor preview.');
    this.frames = [];
    this.frameIndex = 0;
    this.frameElapsed = 0;
    this.animationElapsed = 0;
    this.totalFrameDuration = 100;
    this.playing = true;
    this.lastTime = performance.now();
    this.rotationAngle = 0;
    this.dirty = true;
    this.sourceWidth = 1;
    this.sourceHeight = 1;
    this.state = null;
    this.textureSource = null;
    this.#setup();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.resize();
    this.raf = requestAnimationFrame(time => this.#tick(time));
  }

  #setup() {
    const gl = this.gl;
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    this.program = program;

    const vertices = new Float32Array([
      -1, -1, 0, 1,  1, -1, 1, 1,  -1, 1, 0, 0,
      -1, 1, 0, 0,   1, -1, 1, 1,   1, 1, 1, 0
    ]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
    const position = gl.getAttribLocation(program, 'a_position');
    const texCoord = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(texCoord);
    gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    this.uniforms = {};
    ['scale', 'angle', 'viewAspect', 'brightness', 'contrast', 'saturation', 'hue', 'exposure', 'gamma', 'temperature', 'tint', 'opacity', 'grayscale', 'sepia', 'invert']
      .forEach(name => { this.uniforms[name] = gl.getUniformLocation(program, `u_${name}`); });
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  setFrames(frames, width, height) {
    this.releaseFrames();
    this.frames = frames;
    this.sourceWidth = width;
    this.sourceHeight = height;
    this.frameIndex = 0;
    this.frameElapsed = 0;
    this.animationElapsed = 0;
    this.totalFrameDuration = frames.reduce((sum, frame) => sum + Math.max(20, frame.delay || 100), 0) || 100;
    this.rotationAngle = 0;
    this.textureSource = null;
    this.dirty = true;
    this.dispatchEvent(new CustomEvent('framechange', { detail: { index: 0, count: frames.length } }));
  }

  setState(state) {
    this.state = state;
    this.dirty = true;
  }

  setPlaying(playing) {
    this.playing = playing;
    this.lastTime = performance.now();
    this.dirty = true;
  }

  step(offset) {
    if (!this.frames.length) return;
    this.frameIndex = (this.frameIndex + offset + this.frames.length) % this.frames.length;
    this.frameElapsed = 0;
    this.animationElapsed = this.frames.slice(0, this.frameIndex)
      .reduce((sum, frame) => sum + Math.max(20, frame.delay || 100), 0);
    this.textureSource = null;
    this.dirty = true;
    this.dispatchEvent(new CustomEvent('framechange', { detail: { index: this.frameIndex, count: this.frames.length } }));
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.gl.viewport(0, 0, width, height);
      this.dirty = true;
    }
  }

  releaseFrames() {
    this.frames.forEach(frame => frame.source?.close?.());
    this.frames = [];
    this.textureSource = null;
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.releaseFrames();
  }

  #tick(time) {
    const delta = Math.min(100, time - this.lastTime);
    this.lastTime = time;
    if (this.playing && this.frames.length && this.state) {
      if (this.frames.length > 1) {
        const animationDelta = delta * this.state.animationSpeed;
        this.frameElapsed += animationDelta;
        this.animationElapsed = (this.animationElapsed + animationDelta) % this.totalFrameDuration;
        let changed = false;
        while (this.frameElapsed >= Math.max(20, this.frames[this.frameIndex].delay || 100)) {
          this.frameElapsed -= Math.max(20, this.frames[this.frameIndex].delay || 100);
          this.frameIndex = (this.frameIndex + 1) % this.frames.length;
          changed = true;
        }
        if (changed) {
          this.textureSource = null;
          this.dispatchEvent(new CustomEvent('framechange', { detail: { index: this.frameIndex, count: this.frames.length } }));
        }
      } else if (this.state.rotationEnabled || this.state.hueCycleEnabled) {
        const loopDuration = this.state.loopDuration * 1000;
        this.animationElapsed = (this.animationElapsed + delta) % loopDuration;
        this.rotationAngle = this.state.rotationDirection * this.animationElapsed / loopDuration * Math.PI * 2;
      }
      this.dirty = true;
    }
    if (this.dirty) this.#render();
    this.raf = requestAnimationFrame(next => this.#tick(next));
  }

  #render() {
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!this.frames.length || !this.state) { this.dirty = false; return; }

    const frame = this.frames[this.frameIndex];
    if (this.textureSource !== frame.source) {
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame.source);
      this.textureSource = frame.source;
    }

    const rotating = this.frames.length === 1 && this.state.rotationEnabled;
    const sourceW = frame.width || this.sourceWidth;
    const sourceH = frame.height || this.sourceHeight;
    const fitW = rotating ? Math.hypot(sourceW, sourceH) : sourceW;
    const fitH = rotating ? Math.hypot(sourceW, sourceH) : sourceH;
    const fit = 0.92 * Math.min(this.canvas.width / fitW, this.canvas.height / fitH);
    const scaleX = sourceW * fit / this.canvas.width;
    const scaleY = sourceH * fit / this.canvas.height;
    gl.uniform2f(this.uniforms.scale, scaleX, scaleY);
    gl.uniform1f(this.uniforms.angle, rotating ? this.rotationAngle : 0);
    gl.uniform1f(this.uniforms.viewAspect, this.canvas.width / this.canvas.height);

    const a = this.state.adjustments;
    gl.uniform1f(this.uniforms.brightness, 1 + a.brightness / 100);
    gl.uniform1f(this.uniforms.contrast, Math.max(0, 1 + a.contrast / 100));
    gl.uniform1f(this.uniforms.saturation, Math.max(0, 1 + a.saturation / 100));
    const hueCycleAngle = this.state.hueCycleEnabled
      ? this.animationElapsed / (this.frames.length > 1 ? this.totalFrameDuration : this.state.loopDuration * 1000) * Math.PI * 2
      : 0;
    gl.uniform1f(this.uniforms.hue, a.hue * Math.PI / 180 + hueCycleAngle);
    gl.uniform1f(this.uniforms.exposure, a.exposure);
    gl.uniform1f(this.uniforms.gamma, a.gamma);
    gl.uniform1f(this.uniforms.temperature, a.temperature / 100);
    gl.uniform1f(this.uniforms.tint, a.tint / 100);
    gl.uniform1f(this.uniforms.opacity, a.opacity / 100);
    gl.uniform1f(this.uniforms.grayscale, this.state.grayscale ? 1 : 0);
    gl.uniform1f(this.uniforms.sepia, this.state.sepia ? 1 : 0);
    gl.uniform1f(this.uniforms.invert, this.state.invert ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.dirty = false;
  }
}
