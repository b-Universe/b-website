(function() {
  const canvas = document.getElementById("starfield");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let width, height;
  let stars = [];
  const numStars = 200;
  
  // Theme State Flags
  let isEcstatic = false;
  let isLight = false;

  // Scrolling nebula images
  const nebulaOptions = [
    "/assets/img/bg/nebulae1.png",
    "/assets/img/bg/nebulae2.png",
    "/assets/img/bg/nebulae3.png",
    "/assets/img/bg/nebulae4.png",
    "/assets/img/bg/nebulae5.png",
    "/assets/img/bg/nebulae6.png",
    "/assets/img/bg/nebulae7.png",
    "/assets/img/bg/nebulae8.png",
    "/assets/img/bg/nebulae9.png",
    "/assets/img/bg/nebulae10.png"
  ];

  function pickTwoUnique(arr) {
    const copy = [...arr];
    const pick1 = copy.splice(Math.floor(Math.random() * copy.length), 1)[0];
    const pick2 = copy[Math.floor(Math.random() * copy.length)];
    return [pick1, pick2];
  }

  const pickedNebulas = pickTwoUnique(nebulaOptions);
  
  // Added 'baseSpeed' so we can multiply it for Ecstatic mode
  const nebulas = [
    { img: new Image(), baseSpeed: 0.1, speed: 0.1, offsetY: 0, offsetX: 0, opacity: 0.3, driftY: 0.02 },
    { img: new Image(), baseSpeed: 0.05, speed: 0.05, offsetY: 0, offsetX: 0, opacity: 0.4, driftY: -0.015 }
  ];
  
  nebulas[0].img.src = pickedNebulas[0];
  nebulas[1].img.src = pickedNebulas[1];

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    stars = [];
    initStars();
  }

  function initStars() {
    for (let i = 0; i < numStars; i++) {
      const layer = Math.floor(Math.random() * 3) + 1;
      let speed, size;
      
      // Define base speeds per layer
      if (layer === 1) { speed = 0.05; size = 1; }
      if (layer === 2) { speed = 0.1; size = 1.5; }
      if (layer === 3) { speed = 0.2; size = 2; }
      
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size,
        baseSpeed: speed, // Store base speed to restore after Ecstatic mode
        speed,
        twinkleSpeed: 0.002 + Math.random() * 0.003,
        twinklePhase: Math.random() * Math.PI * 2,
        baseT: Math.random(),
        hue: Math.random() * 360 // Pre-assign a hue for Ecstatic mode
      });
    }
  }

  // --- Theme Watcher ---
  function checkTheme() {
    const html = document.documentElement;
    isEcstatic = html.classList.contains('ecstatic');
    isLight = html.classList.contains('light');
  }

  // Listen for class changes on the <html> element
  const observer = new MutationObserver(checkTheme);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  
  // Initial check
  checkTheme();

  function update(time) {
    ctx.clearRect(0, 0, width, height);

    // Speed Multiplier for Ecstatic Mode
    const speedMult = isEcstatic ? 5 : 1;

    // 1. Draw Nebula Layers
    for (let n of nebulas) {
      if (!n.img.complete) continue;
      
      // Update Speed based on theme
      n.speed = n.baseSpeed * speedMult;

      n.offsetX -= n.speed;
      if (n.offsetX < -n.img.width) n.offsetX += n.img.width;

      n.offsetY += n.driftY * speedMult; // Also drift vertically faster
      if (n.offsetY > n.img.height) n.offsetY -= n.img.height;
      if (n.offsetY < -n.img.height) n.offsetY += n.img.height;

      // Fade out nebulas slightly in Light mode so text pops
      ctx.globalAlpha = isLight ? (n.opacity * 0.5) : n.opacity;
      
      const hCount = Math.ceil(width / n.img.width) + 1;
      const vCount = Math.ceil(height / n.img.height) + 1;

      for (let i = 0; i < hCount; i++) {
        for (let j = 0; j < vCount; j++) {
          const drawX = n.offsetX + i * n.img.width;
          const drawY = n.offsetY + (j - 1) * n.img.height;
          ctx.drawImage(n.img, drawX, drawY);
        }
      }
      ctx.globalAlpha = 1;
    }

    // 2. Draw Stars
    for (let s of stars) {
      // Update star speed
      s.speed = s.baseSpeed * speedMult;

      const twinkle = 0.5 + 0.5 * Math.sin(time * s.twinkleSpeed + s.twinklePhase);
      
      if (isEcstatic) {
        // Rainbow mode: Use HSL
        // We shift the hue over time based on the star's unique ID + global time
        const currentHue = (s.hue + time * 0.1) % 360;
        ctx.fillStyle = `hsla(${currentHue}, 80%, 70%, ${twinkle.toFixed(2)})`;
      } else if (isLight) {
        // Light mode: Dark gray stars, lower opacity
        ctx.fillStyle = `rgba(50, 50, 80, ${(twinkle * 0.5).toFixed(2)})`;
      } else {
        // Default Dark mode: Cyan/White glow
        const rBase = Math.round(255 * (1 - s.baseT)); // Cyan tint
        ctx.fillStyle = `rgba(${rBase}, 255, 255, ${twinkle.toFixed(2)})`;
      }

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();

      s.x -= s.speed;
      if (s.x < 0) { 
        s.x = width; 
        s.y = Math.random() * height; 
      }
    }

    requestAnimationFrame(update);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(update);
})();
