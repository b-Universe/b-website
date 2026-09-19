(function () {
  const bubble = document.getElementById('demo-channel-bubble');
  const menu = document.getElementById('demo-channel-menu');
  const input = document.getElementById('demo-chat-input');
  const log = document.getElementById('demo-chat-log');
  const tabs = document.querySelectorAll('#demo-chat-tabs .chat-tab-btn');

  let activeTab = 'general';

  const mockTabsData = {
    general: [
      { discord: true, tag: '[General]', sender: 'purplefire180', text: 'has anyone successfully taught a mini-cyber-bear how to do a kickflip yet or am I pioneering science alone' },
      { tag: '[General]', sender: 'icecapade', reply: { target: 'purplefire180', snippet: 'has anyone successfully taught a mini-cyber-bear ...' }, text: 'I tried yesterday, it accidentally accelerated into low orbit around Lemon City.' },
      { discord: true, tag: '[General]', sender: 'mcmonkey', text: 'Hey <span class="chat-mention" data-chat-tooltip="Message icecapade">@icecapade</span> that is a feature not a bug. Tactical orbital bear surveillance is canon now.' },
      { tag: '[Local]', tagClass: 'tag-loc', sender: 'Breadcrumb', text: 'Can confirm, I looked up through the observatory telescope and waved at it.' },
      { discord: true, tag: '[General]', sender: 'Jumpsplat120', text: 'Wait, is the gravity generator in Sector 3 running on cheese wheels again?' },
      { tag: '[General]', sender: 'SourGhost', text: 'Gouda-grade torque delivers higher RPMs, don\'t question the engineering.' },
      { discord: true, tag: '[General]', sender: 'GrumpyOwl', text: 'Who left 4,000 rubber ducks in the Atlas fountain? The physics engine is wheezing.' },
      { tag: '[General]', sender: 'Tort', text: 'They are tactical ballast ducks. Critical for planetary buoyancy.' },
      { tag: '[General]', sender: 'Programming.Socks', text: 'If you drink 50 quantum battery fluids at once do you become a glowstick? Asking for science.' },
      { discord: true, tag: '[General]', sender: '0tickpulse', reply: { target: 'Programming.Socks', snippet: 'If you drink 50 quantum battery fluids at o...' }, text: 'Yes, for approximately 0.3 seconds before respawning at hospital hub.' },
      { tag: '[General]', sender: 'soupmannnn', text: 'Is anyone going to mention the giant laser pointer orbiting the moon or are we ignoring it' },
      { discord: true, tag: '[General]', sender: 'Aedia', text: 'Do not look directly at the moon cat.' }
    ],
    alliance: [
      { tag: '[Alliance]', tagClass: 'tag-alliance', sender: 'mwthorn', text: 'Heads up alliance, surveillance grid flagged ArZeR0 and Godlander gearing up near the subterranean tunnel.' },
      { tag: '[Alliance]', tagClass: 'tag-alliance', sender: 'fullwall', text: 'Wait, really? Did they get their hands on those heavy seismic charges from the black market vendor?' },
      { tag: '[Alliance]', tagClass: 'tag-alliance', sender: 'LG_Legacy', text: 'Yeah, Boothin spotted them loading plasma drills into an unmarked stealth hover-rig ten minutes ago.' },
      { tag: '[Alliance]', tagClass: 'tag-alliance', sender: 'Hyper', text: 'They\'re definitely hitting a vault tonight. Do we know which bank they\'re targeting?' },
      { tag: '[Alliance]', tagClass: 'tag-alliance', sender: 'Talfein', text: 'It\'s gotta be either the Sector 4 First Federal or the Lemon City Central Reserve.' },
      { tag: '[Alliance]', tagClass: 'tag-alliance', sender: 'greenleeuw', text: 'Central Reserve has double biometric airlocks though. Even with plasma drills, Godlander couldn\'t crack that without tripping district sirens.' },
      { tag: '[Alliance]', tagClass: 'tag-alliance', sender: 'Ikuria', text: 'Unless ArZeR0 EMP\'d the local sub-station first... wait! Did anyone check telemetry for District 4?' },
      { tag: '[Alliance]', tagClass: 'tag-alliance', sender: 'Darian', text: 'Checking telemetry now... power just dropped 40% on the sub-levels near First Federal on 5th Avenue!' },
      { tag: '[Alliance]', tagClass: 'tag-alliance', sender: 'Boothin', text: 'That\'s it! It\'s Sector 4 First Federal! They\'re cutting into the sub-vault from the drainage conduit!' },
      { tag: '[Alliance]', tagClass: 'tag-alliance', sender: 'mwthorn', text: 'Move move move! Form a perimeter on the rear service alley before they crack the safe doors!' },
      { tag: '[Alliance]', tagClass: 'tag-alliance', sender: 'fullwall', text: 'Talfein and I will seal the sewer escape route. Don\'t let them reach the hover-rig!' },
      { tag: '[Alliance]', tagClass: 'tag-alliance', sender: 'LG_Legacy', text: 'En route with heavy barrier shields. Let\'s catch them in the act!' }
    ],
    social: [
      { tag: '[Help]', tagClass: 'tag-help', sender: 'pobab', text: 'hey everyone, sorry for the newbie question! how do i recharge my suit battery? does it regenerate on its own or do i have to buy fuel cells somewhere?' },
      { tag: '[Help]', tagClass: 'tag-help', sender: 'mcmonkey', reply: { target: 'pobab', snippet: 'how do i recharge my suit battery? does it regenerate...' }, text: '<span class="chat-mention" data-chat-tooltip="Message pobab">@pobab</span> Passively recharges above 50% endurance out of combat, or pop battery cells. Guide: <a href="https://play.behr.dev/#/wiki/battery" class="chat-link" target="_blank">b.wiki/battery</a>' },
      { tag: '[Help]', tagClass: 'tag-help', sender: 'Bruh', reply: { target: 'pobab', snippet: 'how do i recharge my suit battery?' }, text: 'just sprint into the Lemon City electric perimeter fence, it charges you to 100% instantly (disclaimer: you will lose 95% of your HP and drop your dignity)' },
      { tag: '[Help]', tagClass: 'tag-help', sender: 'Orange Blue Hue', text: 'Real talk: switch to a pure kinetic melee build. Zero battery consumption, no recharge timers, you just punch problems until they stop being problems.' },
      { tag: '[Help]', tagClass: 'tag-help', sender: 'Nimsy', text: 'Also <span class="chat-mention" data-chat-tooltip="Message pobab">@pobab</span>, visit the technician in Sector 2, she gives you a free battery capacitor upgrade from an early quest!' },
      { tag: '[Help]', tagClass: 'tag-help', sender: 'acikek', text: 'Don\'t listen to Bruh\'s fence advice lmao, I lost my best boots to that fence last Tuesday.' },
      { tag: '[Help]', tagClass: 'tag-help', sender: 'Queueueue', text: 'Welcome to B, <span class="chat-mention" data-chat-tooltip="Message pobab">@pobab</span>! Let me know if you need help running the starter dungeon later.' },
      { tag: '[Help]', tagClass: 'tag-help', sender: 'Meka', text: 'Wait, is anyone down to form a music jam session by the plaza fountain after sunset?' },
      { tag: '[Help]', tagClass: 'tag-help', sender: 'MaltaDidNothingWrong', text: 'Only if someone brings the synth-accordions.' },
      { tag: '[Help]', tagClass: 'tag-help', sender: 'Champagne', text: 'I\'ll bring the holographic laser light show.' }
    ],
    combat: [
      { tag: '[Combat Warning]', tagClass: 'tag-warn', text: 'Overcharged Sentinel Core is charging Megawatt Discharge (2.5s)!' },
      { tag: '[Hit Rolls]', tagClass: 'tag-hit', text: 'Bear rolled 94 vs Defense 48 (Critical Hit!)' },
      { tag: '[Damage Inflicted]', tagClass: 'tag-dmg', text: 'Bear hits Void Sentinel with Kinetic Sledge for 540 physical damage!' },
      { tag: '[Pet Combat]', tagClass: 'tag-pet', text: 'Cyber-Bear inflicts 175 shred damage on Sentinel Drone.' },
      { tag: '[Damage Received]', tagClass: 'tag-taken', text: 'Sentinel Drone hits Bear for 82 energy damage (Shield absorbed 55).' },
      { tag: '[Hit Rolls]', tagClass: 'tag-hit', text: 'Sentinel Drone rolled 28 vs Defense 72 (Attack Missed!)' },
      { tag: '[Healing Delivered]', tagClass: 'tag-heal', text: 'Nano-Mend restores 240 health to Bear.' },
      { tag: '[Pet Combat]', tagClass: 'tag-pet', text: 'Cyber-Bear mauls Void Sentinel for 210 kinetic damage.' },
      { tag: '[Damage Inflicted]', tagClass: 'tag-dmg', text: 'Bear hits Void Sentinel with Plasma Arc for 380 thermal damage!' },
      { tag: '[Combat Warning]', tagClass: 'tag-warn', text: 'Void Sentinel barrier collapsed!' },
      { tag: '[Hit Rolls]', tagClass: 'tag-hit', text: 'Bear rolled 82 vs Defense 35 (Direct Hit!)' },
      { tag: '[Damage Inflicted]', tagClass: 'tag-dmg', text: 'Bear defeats Void Sentinel with Finish Strike for 710 damage!' },
      { tag: '[Rewards]', tagClass: 'tag-reward', text: 'Combat Victory! +1,850 EXP, +65 Nanite Cores, +1 Rare Data Chip.' },
      { tag: '[System]', tagClass: 'tag-sys', text: 'Sector 2 cleared. Threat level returned to Nominal.' }
    ]
  };

  function renderTab(tabKey) {
    if (!mockTabsData[tabKey] || !log) return;
    activeTab = tabKey;
    log.innerHTML = '';
    mockTabsData[tabKey].forEach((msg) => {
      const row = document.createElement('div');
      row.className = 'chat-msg';
      let content = '';
      if (msg.reply) {
        content += `<div class="chat-reply-quote"><span class="reply-spine"><svg width="13" height="11" viewBox="0 0 13 11" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 10.5V4.5C1.5 2.84315 2.84315 1.5 4.5 1.5H12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span><span class="reply-target">${msg.reply.target}:</span> <span class="reply-snippet">${msg.reply.snippet}</span></div>`;
      }
      if (msg.discord) {
        content += '<span class="chat-discord-badge" title="Relayed from Discord"><i class="fa-brands fa-discord"></i></span>';
      }
      const tagClass = msg.tagClass || (msg.sys ? 'tag-sys' : 'tag-gen');
      content += `<span class="chat-channel-tag ${tagClass}">${msg.tag}</span>`;
      if (msg.sender) {
        content += `<span class="chat-sender">${msg.sender}:</span>`;
      }
      content += `<span class="chat-text">${msg.text}</span>`;
      row.innerHTML = content;
      log.appendChild(row);
    });
    log.scrollTop = log.scrollHeight;
  }

  tabs.forEach((tab) => {
    if (!tab.classList.contains('tab-action')) {
      tab.addEventListener('click', () => {
        tabs.forEach((item) => item.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.getAttribute('data-tab');
        renderTab(target);
      });
    }
  });

  if (bubble && menu) {
    bubble.addEventListener('click', (event) => {
      event.stopPropagation();
      menu.classList.toggle('hidden');
      bubble.classList.toggle('menu-open', !menu.classList.contains('hidden'));
    });

    menu.querySelectorAll('.channel-option').forEach((option) => {
      option.addEventListener('click', (event) => {
        event.stopPropagation();
        const channel = option.getAttribute('data-channel') || option.textContent.trim();
        bubble.textContent = channel;
        menu.querySelectorAll('.channel-option').forEach((item) => item.classList.remove('active'));
        option.classList.add('active');
        menu.classList.add('hidden');
        bubble.classList.remove('menu-open');
        if (input) input.focus();
      });
    });

    document.addEventListener('click', (event) => {
      if (!menu.contains(event.target) && event.target !== bubble) {
        menu.classList.add('hidden');
        bubble.classList.remove('menu-open');
      }
    });
  }

  if (input && log) {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && input.value.trim()) {
        const text = input.value.trim();
        input.value = '';
        const channel = bubble ? bubble.textContent.trim() : 'General';
        let tagClass = 'tag-gen';
        if (channel === 'Alliance') tagClass = 'tag-alliance';
        else if (channel === 'Combat') tagClass = 'tag-combat';
        else if (channel === 'Local') tagClass = 'tag-loc';
        else if (channel === 'Social') tagClass = 'tag-social';

        const newMsg = {
          tag: `[${channel}]`,
          tagClass: tagClass,
          sender: 'Bear',
          text: text
        };

        if (mockTabsData[activeTab]) {
          mockTabsData[activeTab].push(newMsg);
        }

        const row = document.createElement('div');
        row.className = 'chat-msg';
        row.innerHTML = `<span class="chat-channel-tag ${tagClass}">[${channel}]</span><span class="chat-sender">Bear:</span><span class="chat-text">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`;
        log.appendChild(row);
        log.scrollTop = log.scrollHeight;
      }
    });
  }

  // Status Window Dynamic Telemetry Loop
  // Dynamically validates health points & percentage in lockstep with the bar fill
  const statusHpFill = document.getElementById('demo-status-hp-fill');
  const statusHpVal = document.getElementById('demo-status-hp-val');
  const statusEpFill = document.getElementById('demo-status-ep-fill');
  const statusEpVal = document.getElementById('demo-status-ep-val');
  const statusBpFill = document.getElementById('demo-status-bp-fill');
  const statusBpVal = document.getElementById('demo-status-bp-val');
  const statusXpFill = document.getElementById('demo-status-xp-fill');
  const statusXpVal = document.getElementById('demo-status-xp-val');
  const statusXpSegments = document.querySelectorAll('.mock-window .exp-segment');

  function getHealthGradient(pct) {
    const p = Math.max(0, Math.min(1, pct));
    const lerp = (a, b, t) => Math.round(a + (b - a) * t);
    const lerpCol = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];

    const greenStops = [[0, 176, 80], [0, 255, 136], [34, 197, 94], [0, 255, 136, 0.6]];
    const yellowStops = [[230, 126, 34], [241, 196, 15], [255, 235, 59], [241, 196, 15, 0.6]];
    const redStops = [[183, 28, 28], [255, 23, 68], [255, 82, 82], [255, 23, 68, 0.7]];

    let s1, s2, s3, glow;
    if (p >= 0.50) {
      s1 = greenStops[0];
      s2 = greenStops[1];
      s3 = greenStops[2];
      glow = greenStops[3];
    } else if (p >= 0.375) {
      const t = (0.50 - p) / (0.50 - 0.375);
      s1 = lerpCol(greenStops[0], yellowStops[0], t);
      s2 = lerpCol(greenStops[1], yellowStops[1], t);
      s3 = lerpCol(greenStops[2], yellowStops[2], t);
      glow = [lerp(greenStops[3][0], yellowStops[3][0], t), lerp(greenStops[3][1], yellowStops[3][1], t), lerp(greenStops[3][2], yellowStops[3][2], t), 0.6];
    } else if (p >= 0.25) {
      const t = (0.375 - p) / (0.375 - 0.25);
      s1 = lerpCol(yellowStops[0], redStops[0], t);
      s2 = lerpCol(yellowStops[1], redStops[1], t);
      s3 = lerpCol(yellowStops[2], redStops[2], t);
      glow = [lerp(yellowStops[3][0], redStops[3][0], t), lerp(yellowStops[3][1], redStops[3][1], t), lerp(yellowStops[3][2], redStops[3][2], t), Number((0.6 + 0.1 * t).toFixed(2))];
    } else {
      s1 = redStops[0];
      s2 = redStops[1];
      s3 = redStops[2];
      glow = redStops[3];
    }

    return {
      background: `linear-gradient(90deg, rgb(${s1[0]}, ${s1[1]}, ${s1[2]}), rgb(${s2[0]}, ${s2[1]}, ${s2[2]}), rgb(${s3[0]}, ${s3[1]}, ${s3[2]}))`,
      boxShadow: `0 0 8px rgba(${glow[0]}, ${glow[1]}, ${glow[2]}, ${glow[3]})`
    };
  }

  // Experience Telemetry Controller:
  // Large bar fills up to 10%, each segment next to it stores that full 10%.
  let currentXpPct = 0;
  let targetXpPct = 44;
  let isUserControlled = false;
  let userControlTimeout = null;
  let lastFrameTime = performance.now();
  let holdTimer = 0;
  let scriptStep = 0;

  const xpDemoSteps = [
    { target: 44, hold: 2.4 }, // 0% -> 44% (fills large bar 4 times rapidly, stores 4 segments, bar at 40%)
    { target: 76, hold: 2.0 }, // 44% -> 76% (adds: fills 3 more segments, bar at 60%)
    { target: 32, hold: 2.2 }, // 76% -> 32% (subtracts: drains bar, un-fills segments)
    { target: 90, hold: 2.0 }, // 32% -> 90% (adds up to 9 segments stored)
    { target: 0,  hold: 1.8 }  // 90% -> 0% (subtracts down to 0, then cycles back to 44%)
  ];

  function renderExperience(pct) {
    if (!statusXpFill || !statusXpVal) return;
    const clamped = Math.max(0, Math.min(100, pct));
    const fullSegments = Math.floor(clamped / 10);
    const remainder = clamped % 10;
    const barWidth = clamped >= 100 ? 100 : (remainder / 10) * 100;
    const points = Math.round(clamped * 10);

    statusXpFill.style.width = barWidth + '%';
    statusXpVal.textContent = `${Math.round(clamped)}% | ${points.toLocaleString()}`;

    if (statusXpSegments && statusXpSegments.length === 10) {
      statusXpSegments.forEach((seg, idx) => {
        if (idx < fullSegments) {
          if (!seg.classList.contains('filled')) {
            seg.classList.add('filled', 'pop');
            setTimeout(() => seg.classList.remove('pop'), 350);
          }
        } else {
          seg.classList.remove('filled', 'pop');
        }
      });
    }
  }

  // Party Window Elements
  const partyBearHpFill = document.getElementById('demo-party-bear-hp-fill');
  const partyBearHpVal = document.getElementById('demo-party-bear-hp-val');
  const partyBearEpFill = document.getElementById('demo-party-bear-ep-fill');
  const partyBearEpVal = document.getElementById('demo-party-bear-ep-val');
  const partyBearBpFill = document.getElementById('demo-party-bear-bp-fill');
  const partyBearBpVal = document.getElementById('demo-party-bear-bp-val');

  const partyHpFill = document.getElementById('demo-party-hp-fill');
  const partyHpVal = document.getElementById('demo-party-hp-val');
  const partyTlmEpFill = document.getElementById('demo-party-tlm-ep-fill');
  const partyTlmEpVal = document.getElementById('demo-party-tlm-ep-val');
  const partyBpFill = document.getElementById('demo-party-bp-fill');
  const partyBpVal = document.getElementById('demo-party-bp-val');

  // Target Window Elements
  const targetHpFill = document.getElementById('demo-target-hp-fill');
  const targetHpVal = document.getElementById('demo-target-hp-val');
  const targetEpFill = document.getElementById('demo-target-ep-fill');
  const targetEpVal = document.getElementById('demo-target-ep-val');
  const targetBpFill = document.getElementById('demo-target-bp-fill');
  const targetBpVal = document.getElementById('demo-target-bp-val');

  // Pet Window Elements
  const petBearHpFill = document.getElementById('demo-pet-bear-hp-fill');
  const petBearHpVal = document.getElementById('demo-pet-bear-hp-val');
  const petBearMpFill = document.getElementById('demo-pet-bear-mp-fill');
  const petBearMpVal = document.getElementById('demo-pet-bear-mp-val');
  const petBearBpFill = document.getElementById('demo-pet-bear-bp-fill');
  const petBearBpVal = document.getElementById('demo-pet-bear-bp-val');

  const petDroneHpFill = document.getElementById('demo-pet-drone-hp-fill');
  const petDroneHpVal = document.getElementById('demo-pet-drone-hp-val');
  const petDroneMpFill = document.getElementById('demo-pet-drone-mp-fill');
  const petDroneMpVal = document.getElementById('demo-pet-drone-mp-val');
  const petDroneBpFill = document.getElementById('demo-pet-drone-bp-fill');
  const petDroneBpVal = document.getElementById('demo-pet-drone-bp-val');

  // Navigator Compass & Zone Map Spinwheel State
  let playerHeading = 45; // in degrees
  let isNavDragging = false;
  let navSpinVelocity = 9.0; // degrees per second (initial automagical rotation)
  let navAutoSpinDirection = 1; // 1 = clockwise/eastward, -1 = counterclockwise/westward
  const NAV_BASE_AUTOSPIN_SPEED = 9.0; // Normal automagical rotating spin rate (deg/sec)

  const startTime = performance.now();
  function updateStatusHUD(now) {
    const t = (now - startTime) / 1000;

    // Status Window Health: oscillates between 20% (200) and 100% (1,000)
    // Demonstrates green above 50%, turning yellow around 50%, and red closer to 25%
    const hpPct = Math.round(60 + 40 * Math.sin(t * 0.8));
    const hpPoints = hpPct * 10;
    if (statusHpFill && statusHpVal) {
      statusHpFill.style.width = hpPct + '%';
      statusHpVal.textContent = `${hpPct}% | ${hpPoints.toLocaleString()}`;
      const hpVisual = getHealthGradient(hpPct / 100);
      statusHpFill.style.background = hpVisual.background;
      statusHpFill.style.boxShadow = hpVisual.boxShadow;
    }

    // Status Window Endurance: oscillates between 65% (650) and 100% (1,000)
    const epPct = Math.round(82.5 + 17.5 * Math.sin(t * 1.45 + 1.2));
    const epPoints = epPct * 10;
    if (statusEpFill && statusEpVal) {
      statusEpFill.style.width = epPct + '%';
      statusEpVal.textContent = `${epPct}% | ${epPoints.toLocaleString()}`;
    }

    // Status Window Battery: cycles between 78% (780) and 100% (1,000)
    const bpPct = Math.round(89 + 11 * Math.sin(t * 0.75 + 2.4));
    const bpPoints = bpPct * 10;
    if (statusBpFill && statusBpVal) {
      statusBpFill.style.width = bpPct + '%';
      statusBpVal.textContent = `${bpPct}% | ${bpPoints.toLocaleString()}`;
    }

    // Party Window: bear (Leader) Telemetry Loop
    const bearHpPct = Math.round(75 + 22 * Math.sin(t * 0.9 + 1.2));
    if (partyBearHpFill && partyBearHpVal) {
      partyBearHpFill.style.width = bearHpPct + '%';
      partyBearHpVal.textContent = bearHpPct + '%';
      const bearHpVisual = getHealthGradient(bearHpPct / 100);
      partyBearHpFill.style.background = bearHpVisual.background;
      partyBearHpFill.style.boxShadow = bearHpVisual.boxShadow;
    }
    const bearEpPct = Math.round(82 + 16 * Math.sin(t * 1.3 + 0.4));
    if (partyBearEpFill && partyBearEpVal) {
      partyBearEpFill.style.width = bearEpPct + '%';
      partyBearEpVal.textContent = bearEpPct + '%';
    }
    const bearBpPct = Math.round(88 + 11 * Math.sin(t * 0.7 + 2.1));
    if (partyBearBpFill && partyBearBpVal) {
      partyBearBpFill.style.width = bearBpPct + '%';
      partyBearBpVal.textContent = bearBpPct + '%';
    }

    // Party Window: Civilian Tlm Telemetry Loop (dips smoothly into red, yellow, and green)
    const tlmHpPct = Math.round(55 + 42 * Math.sin(t * 0.7 + 2.5));
    if (partyHpFill && partyHpVal) {
      partyHpFill.style.width = tlmHpPct + '%';
      partyHpVal.textContent = tlmHpPct + '%';
      const tlmHpVisual = getHealthGradient(tlmHpPct / 100);
      partyHpFill.style.background = tlmHpVisual.background;
      partyHpFill.style.boxShadow = tlmHpVisual.boxShadow;
    }
    const tlmEpPct = Math.round(72 + 25 * Math.sin(t * 1.1 + 1.7));
    if (partyTlmEpFill && partyTlmEpVal) {
      partyTlmEpFill.style.width = tlmEpPct + '%';
      partyTlmEpVal.textContent = tlmEpPct + '%';
    }
    const tlmBpPct = Math.round(79 + 19 * Math.sin(t * 0.65 + 3.0));
    if (partyBpFill && partyBpVal) {
      partyBpFill.style.width = tlmBpPct + '%';
      partyBpVal.textContent = tlmBpPct + '%';
    }

    // Target Window Telemetry Loop (Void Sentinel)
    const targetHpPct = Math.round(58 + 36 * Math.sin(t * 0.85 + 0.8));
    if (targetHpFill && targetHpVal) {
      targetHpFill.style.width = targetHpPct + '%';
      targetHpVal.textContent = targetHpPct + '%';
      const targetHpVisual = getHealthGradient(targetHpPct / 100);
      targetHpFill.style.background = targetHpVisual.background;
      targetHpFill.style.boxShadow = targetHpVisual.boxShadow;
    }
    const targetEpPct = Math.round(62 + 26 * Math.sin(t * 1.2 + 2.1));
    if (targetEpFill && targetEpVal) {
      targetEpFill.style.width = targetEpPct + '%';
      targetEpVal.textContent = targetEpPct + '%';
    }
    const targetBpPct = Math.round(84 + 14 * Math.sin(t * 0.5 + 1.5));
    if (targetBpFill && targetBpVal) {
      targetBpFill.style.width = targetBpPct + '%';
      targetBpVal.textContent = targetBpPct + '%';
    }

    // Pet Window Telemetry Loop: Cyber-Bear (Alpha) & Sentinel Drone
    const petBearHpPct = Math.round(58 + 38 * Math.sin(t * 0.75 + 1.9));
    if (petBearHpFill && petBearHpVal) {
      petBearHpFill.style.width = petBearHpPct + '%';
      petBearHpVal.textContent = petBearHpPct + '%';
      const petBearHpVisual = getHealthGradient(petBearHpPct / 100);
      petBearHpFill.style.background = petBearHpVisual.background;
      petBearHpFill.style.boxShadow = petBearHpVisual.boxShadow;
    }
    const petBearMpPct = Math.round(78 + 18 * Math.sin(t * 1.2 + 2.8));
    if (petBearMpFill && petBearMpVal) {
      petBearMpFill.style.width = petBearMpPct + '%';
      petBearMpVal.textContent = petBearMpPct + '%';
    }
    const petBearBpPct = Math.round(86 + 12 * Math.sin(t * 0.6 + 0.7));
    if (petBearBpFill && petBearBpVal) {
      petBearBpFill.style.width = petBearBpPct + '%';
      petBearBpVal.textContent = petBearBpPct + '%';
    }

    const petDroneHpPct = Math.round(75 + 23 * Math.sin(t * 0.65 + 3.2));
    if (petDroneHpFill && petDroneHpVal) {
      petDroneHpFill.style.width = petDroneHpPct + '%';
      petDroneHpVal.textContent = petDroneHpPct + '%';
      const petDroneHpVisual = getHealthGradient(petDroneHpPct / 100);
      petDroneHpFill.style.background = petDroneHpVisual.background;
      petDroneHpFill.style.boxShadow = petDroneHpVisual.boxShadow;
    }
    const petDroneMpPct = Math.round(85 + 12 * Math.sin(t * 1.0 + 1.1));
    if (petDroneMpFill && petDroneMpVal) {
      petDroneMpFill.style.width = petDroneMpPct + '%';
      petDroneMpVal.textContent = petDroneMpPct + '%';
    }
    const petDroneBpPct = Math.round(82 + 10 * Math.sin(t * 0.75 + 1.8));
    if (petDroneBpFill && petDroneBpVal) {
      petDroneBpFill.style.width = petDroneBpPct + '%';
      petDroneBpVal.textContent = petDroneBpPct + '%';
    }

    // Experience Telemetry: Sequentially fills large bar every 10% stored in segments
    const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    if (!isUserControlled) {
      if (Math.abs(currentXpPct - targetXpPct) < 0.1) {
        currentXpPct = targetXpPct;
        holdTimer += dt;
        if (holdTimer >= xpDemoSteps[scriptStep].hold) {
          holdTimer = 0;
          scriptStep = (scriptStep + 1) % xpDemoSteps.length;
          targetXpPct = xpDemoSteps[scriptStep].target;
        }
      }
    }

    if (currentXpPct !== targetXpPct) {
      const speed = 8.33; // Slowed by 3x (~1.2s per 10% bar fill)
      const diff = targetXpPct - currentXpPct;
      const step = Math.sign(diff) * Math.min(Math.abs(diff), speed * dt);
      currentXpPct += step;
      renderExperience(currentXpPct);
    } else {
      renderExperience(currentXpPct);
    }

    // Navigator Compass & Zone Map spinwheel physics & automagical rotation
    if (!isNavDragging) {
      const targetSpeed = navAutoSpinDirection * NAV_BASE_AUTOSPIN_SPEED;
      const diff = navSpinVelocity - targetSpeed;
      if (Math.abs(diff) > 0.05) {
        // Smooth spinwheel deceleration towards normal automagical rotation speed
        const friction = 0.965;
        navSpinVelocity = targetSpeed + diff * Math.pow(friction, dt * 60);
      } else {
        navSpinVelocity = targetSpeed;
      }

      playerHeading = (playerHeading + navSpinVelocity * dt + 360) % 360;
      if (typeof drawNavCompass === 'function') drawNavCompass();
      if (typeof drawZoneMap === 'function') drawZoneMap();
    }

    requestAnimationFrame(updateStatusHUD);
  }
  requestAnimationFrame(updateStatusHUD);

  // Experience Interactive Controls
  function setTargetExperience(val) {
    targetXpPct = Math.max(0, Math.min(100, val));
    isUserControlled = true;
    if (userControlTimeout) clearTimeout(userControlTimeout);
    userControlTimeout = setTimeout(() => {
      isUserControlled = false;
      holdTimer = 0;
    }, 6000);
  }

  const btnXp44 = document.getElementById('btn-demo-xp-44');
  const btnXp80 = document.getElementById('btn-demo-xp-80');
  const btnXp25 = document.getElementById('btn-demo-xp-25');
  const btnXp0 = document.getElementById('btn-demo-xp-0');

  if (btnXp44) btnXp44.onclick = () => setTargetExperience(44);
  if (btnXp80) btnXp80.onclick = () => setTargetExperience(80);
  if (btnXp25) btnXp25.onclick = () => setTargetExperience(25);
  if (btnXp0) btnXp0.onclick = () => setTargetExperience(0);

  // Friends Window Interactivity
  const friendsTabs = document.querySelectorAll('#demo-friends-tabs .friends-tab-btn');
  const friendItems = document.querySelectorAll('#demo-friends-list .friend-item-wrapper');
  const friendsSearch = document.getElementById('demo-friends-search');
  const friendsListBody = document.getElementById('demo-friends-list');
  const friendsPerksBody = document.getElementById('demo-friends-perks-body');
  const friendsToolbar = document.querySelector('#demo-friends-window .friends-toolbar');
  const friendsHeaderRow = document.querySelector('#demo-friends-window .friends-header-row');

  friendsTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      friendsTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const ftab = tab.getAttribute('data-ftab');
      if (ftab === 'perks') {
        if (friendsListBody) friendsListBody.style.display = 'none';
        if (friendsToolbar) friendsToolbar.style.display = 'none';
        if (friendsHeaderRow) friendsHeaderRow.style.display = 'none';
        if (friendsPerksBody) friendsPerksBody.style.display = 'flex';
      } else {
        if (friendsListBody) friendsListBody.style.display = 'flex';
        if (friendsToolbar) friendsToolbar.style.display = 'flex';
        if (friendsHeaderRow) friendsHeaderRow.style.display = 'grid';
        if (friendsPerksBody) friendsPerksBody.style.display = 'none';

        friendItems.forEach((item) => {
          const status = item.getAttribute('data-status');
          if (ftab === 'all') {
            item.style.display = '';
          } else if (ftab === 'online') {
            item.style.display = status === 'online' ? '' : 'none';
          } else if (ftab === 'pending') {
            item.style.display = status === 'pending' ? '' : 'none';
          } else if (ftab === 'blocked') {
            item.style.display = 'none';
          }
        });
      }
    });
  });

  friendItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      if (e.target.tagName.toLowerCase() === 'button') return;
      const wasSelected = item.classList.contains('selected');
      friendItems.forEach((f) => f.classList.remove('selected'));
      if (!wasSelected) item.classList.add('selected');
    });
  });

  if (friendsSearch) {
    friendsSearch.addEventListener('input', () => {
      const query = friendsSearch.value.trim().toLowerCase();
      friendItems.forEach((item) => {
        const name = (item.getAttribute('data-name') || '').toLowerCase();
        item.style.display = name.includes(query) ? '' : 'none';
      });
    });
  }

  // Friend Perks Interactivity
  const friendPerkSelect = document.getElementById('demo-friend-perk-partner-select');
  const friendPerkPartnerName = document.getElementById('demo-friend-perk-partner-name');
  const friendPerkPartnerTier = document.getElementById('demo-friend-perk-partner-tier');
  const btnPerkStudy = document.getElementById('demo-btn-perk-study');
  const btnPerkPrestige = document.getElementById('demo-btn-perk-prestige');
  const cardPerkStudy = document.getElementById('demo-friend-perk-study');
  const cardPerkPrestige = document.getElementById('demo-friend-perk-prestige');

  if (friendPerkSelect) {
    friendPerkSelect.addEventListener('change', () => {
      const partner = friendPerkSelect.value;
      if (friendPerkPartnerName) friendPerkPartnerName.textContent = partner;
      if (friendPerkPartnerTier) {
        if (partner === 'purplefire180') friendPerkPartnerTier.textContent = 'Tier 2: Trusted Allies';
        else if (partner === 'icecapade') friendPerkPartnerTier.textContent = 'Tier 1: Familiar Faces';
        else if (partner === 'mcmonkey') friendPerkPartnerTier.textContent = 'Tier 3: Kindred Spirits';
        else friendPerkPartnerTier.textContent = 'Tier 1: Familiar Faces';
      }
    });
  }

  if (btnPerkStudy && btnPerkPrestige && cardPerkStudy && cardPerkPrestige) {
    btnPerkStudy.addEventListener('click', () => {
      cardPerkStudy.classList.toggle('selected');
      const isSel = cardPerkStudy.classList.contains('selected');
      btnPerkStudy.textContent = isSel ? 'Active Together  -  Deselect' : 'Choose Focus';
      if (isSel) {
        cardPerkPrestige.classList.remove('selected');
        btnPerkPrestige.textContent = 'Choose Focus';
      }
    });
    btnPerkPrestige.addEventListener('click', () => {
      cardPerkPrestige.classList.toggle('selected');
      const isSel = cardPerkPrestige.classList.contains('selected');
      btnPerkPrestige.textContent = isSel ? 'Active Together  -  Deselect' : 'Choose Focus';
      if (isSel) {
        cardPerkStudy.classList.remove('selected');
        btnPerkStudy.textContent = 'Choose Focus';
      }
    });
  }

  // Alliance Window Interactivity
  const allianceTabs = document.querySelectorAll('#demo-alliance-tabs .alliance-tab-btn');
  const alliancePanels = {
    roster: document.getElementById('demo-alliance-panel-roster'),
    details: document.getElementById('demo-alliance-panel-details'),
    ranks: document.getElementById('demo-alliance-panel-ranks'),
    perks: document.getElementById('demo-alliance-panel-perks')
  };

  allianceTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      allianceTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const atab = tab.getAttribute('data-atab');
      Object.keys(alliancePanels).forEach((k) => {
        if (alliancePanels[k]) {
          alliancePanels[k].classList.toggle('hidden', k !== atab);
        }
      });
    });
  });

  // Alliance Roster Member Selection & Action Buttons
  const allianceRosterRows = document.querySelectorAll('#demo-alliance-roster-tbody .alliance-row');
  const btnAllianceWhisper = document.getElementById('demo-btn-alliance-whisper');
  const btnAlliancePromote = document.getElementById('demo-btn-alliance-promote');
  const btnAllianceDemote = document.getElementById('demo-btn-alliance-demote');
  const btnAllianceKick = document.getElementById('demo-btn-alliance-kick');

  allianceRosterRows.forEach((row) => {
    row.addEventListener('click', () => {
      const wasSelected = row.classList.contains('selected');
      allianceRosterRows.forEach((r) => r.classList.remove('selected'));
      if (!wasSelected) {
        row.classList.add('selected');
        const name = row.getAttribute('data-name');
        const tier = parseInt(row.getAttribute('data-tier') || '99', 10);
        const isSelf = name.toLowerCase() === 'bear';

        if (btnAllianceWhisper) btnAllianceWhisper.disabled = isSelf;
        if (btnAlliancePromote) btnAlliancePromote.disabled = isSelf || tier <= 2;
        if (btnAllianceDemote) btnAllianceDemote.disabled = isSelf || tier >= 6;
        if (btnAllianceKick) btnAllianceKick.disabled = isSelf || tier <= 1;
      } else {
        if (btnAllianceWhisper) btnAllianceWhisper.disabled = true;
        if (btnAlliancePromote) btnAlliancePromote.disabled = true;
        if (btnAllianceDemote) btnAllianceDemote.disabled = true;
        if (btnAllianceKick) btnAllianceKick.disabled = true;
      }
    });
  });

  // Alliance Roster Search Filtering
  const allianceSearch = document.getElementById('demo-alliance-roster-search');
  if (allianceSearch) {
    allianceSearch.addEventListener('input', () => {
      const q = allianceSearch.value.trim().toLowerCase();
      allianceRosterRows.forEach((row) => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
      });
    });
  }

  // Alliance Permission Matrix Interactive Bubble Toggles
  const permBubbles = document.querySelectorAll('#demo-alliance-perm-tbody .perm-bubble:not(.disabled)');
  permBubbles.forEach((bubble) => {
    bubble.addEventListener('click', (e) => {
      e.stopPropagation();
      bubble.classList.toggle('granted');
      const isGranted = bubble.classList.contains('granted');
      bubble.title = isGranted ? 'Granted' : 'Denied';
    });
  });

  // Alliance MotD Edit Toggling & Tram-Station Marquee Controller
  const btnMotdEdit = document.getElementById('demo-btn-motd-edit');
  const btnMotdSave = document.getElementById('demo-btn-motd-save');
  const btnMotdCancel = document.getElementById('demo-btn-motd-cancel');
  const motdInputBox = document.getElementById('demo-alliance-motd-input-box');
  const motdInput = document.getElementById('demo-alliance-motd-input');
  const motdText = document.getElementById('demo-alliance-motd-text');

  function updateAllianceMotdSpeed() {
    if (!motdText || !motdText.parentElement) return;
    const bannerWidth = motdText.parentElement.clientWidth || 800;
    const textWidth = motdText.scrollWidth || 600;
    const totalDistance = bannerWidth + textWidth;
    // Calibrate to comfortable ~65px/sec transit sign scrolling pace, clamped 10s-60s
    const duration = Math.max(10, Math.min(60, totalDistance / 65));
    motdText.style.setProperty('--motd-duration', `${duration.toFixed(1)}s`);
  }

  updateAllianceMotdSpeed();
  window.addEventListener('resize', updateAllianceMotdSpeed);

  if (btnMotdEdit && motdInputBox) {
    btnMotdEdit.addEventListener('click', () => {
      motdInputBox.style.display = 'flex';
      if (motdText) motdText.style.animationPlayState = 'paused';
      if (motdInput) motdInput.focus();
    });
  }

  if (btnMotdSave && motdInputBox && motdText && motdInput) {
    btnMotdSave.addEventListener('click', () => {
      const val = motdInput.value.trim() || 'No message of the day.';
      motdText.textContent = val;
      motdInputBox.style.display = 'none';
      // Reset animation playhead so updated message smoothly scrolls in from right
      motdText.style.animation = 'none';
      void motdText.offsetWidth; // trigger DOM reflow
      motdText.style.animation = '';
      motdText.style.animationPlayState = 'running';
      updateAllianceMotdSpeed();
    });
  }

  if (btnMotdCancel && motdInputBox && motdInput && motdText) {
    btnMotdCancel.addEventListener('click', () => {
      motdInput.value = motdText.textContent;
      motdInputBox.style.display = 'none';
      motdText.style.animationPlayState = 'running';
    });
  }

  if (motdInput) {
    motdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (btnMotdSave) btnMotdSave.click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (btnMotdCancel) btnMotdCancel.click();
      }
    });
  }

  // Email Window Interactivity
  const emailTabs = document.querySelectorAll('#demo-email-tabs .email-tab-btn');
  const emailRows = document.querySelectorAll('#demo-email-list .email-row');
  const emailPreviewText = document.getElementById('demo-email-preview-text');

  emailTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      emailTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const mtab = tab.getAttribute('data-mtab');
      emailRows.forEach((row) => {
        if (mtab === 'inbox') {
          row.style.display = '';
        } else if (mtab === 'sent') {
          row.style.display = row.getAttribute('data-mid') === 'm3' ? '' : 'none';
        } else {
          row.style.display = 'none';
        }
      });
    });
  });

  emailRows.forEach((row) => {
    row.addEventListener('click', () => {
      emailRows.forEach((r) => r.classList.remove('selected'));
      row.classList.add('selected');
      row.classList.remove('unread');
      row.classList.add('read');
      const sender = row.getAttribute('data-sender') || 'Unknown';
      const attach = row.getAttribute('data-attach') || 'None';
      if (emailPreviewText) {
        emailPreviewText.innerHTML = `From: <strong>${sender}</strong> | Attachments: ${attach}`;
      }
    });
  });

  // Pet Window Tactical Interactivity
  const stanceBtns = document.querySelectorAll('#demo-pet-stance-cluster .pet-cmd-btn');
  const orderBtns = document.querySelectorAll('#demo-pet-order-cluster .pet-cmd-btn');
  const petBearDirective = document.getElementById('demo-pet-bear-directive');
  const petDroneDirective = document.getElementById('demo-pet-drone-directive');
  const petBearOrder = document.getElementById('demo-pet-bear-order');
  const petDroneOrder = document.getElementById('demo-pet-drone-order');
  const petPill = document.getElementById('demo-pet-pill');
  const petAnchorToggle = document.getElementById('demo-pet-anchor-toggle');
  const petIndividualToggle = document.getElementById('demo-pet-individual-toggle');
  const petFeedBtn = document.getElementById('demo-pet-feed-btn');
  const petFocusBtn = document.getElementById('demo-pet-focus-btn');

  let isFormationAnchored = false;
  let currentStance = 'defensive';

  function updateDirectives() {
    if (isFormationAnchored) {
      if (petBearDirective) {
        petBearDirective.textContent = '[Choke Point Anchor]';
        petBearDirective.className = 'pet-chained-tag bodyguard';
      }
      if (petDroneDirective) {
        petDroneDirective.textContent = '[Perimeter Patrol]';
        petDroneDirective.className = 'pet-chained-tag screening';
      }
    } else {
      if (currentStance === 'passive') {
        if (petBearDirective) {
          petBearDirective.textContent = '[Heel / Passive Reserve]';
          petBearDirective.className = 'pet-chained-tag';
        }
        if (petDroneDirective) {
          petDroneDirective.textContent = '[Heel / Passive Reserve]';
          petDroneDirective.className = 'pet-chained-tag';
        }
      } else if (currentStance === 'defensive') {
        if (petBearDirective) {
          petBearDirective.textContent = '[Bodyguard Active]';
          petBearDirective.className = 'pet-chained-tag bodyguard';
        }
        if (petDroneDirective) {
          petDroneDirective.textContent = '[Perimeter Patrol]';
          petDroneDirective.className = 'pet-chained-tag bodyguard';
        }
      } else if (currentStance === 'aggressive') {
        if (petBearDirective) {
          petBearDirective.textContent = '[Screening / Outer Perimeter]';
          petBearDirective.className = 'pet-chained-tag screening';
        }
        if (petDroneDirective) {
          petDroneDirective.textContent = '[Forward Recon Pursuit]';
          petDroneDirective.className = 'pet-chained-tag screening';
        }
      }
    }
  }

  stanceBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      stanceBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentStance = btn.getAttribute('data-pcmd') || 'defensive';
      updateDirectives();
    });
  });

  orderBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      orderBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const orderVal = btn.textContent.trim();
      if (petBearOrder) petBearOrder.textContent = orderVal;
      if (petDroneOrder) petDroneOrder.textContent = orderVal;
    });
  });

  if (petAnchorToggle) {
    petAnchorToggle.addEventListener('click', () => {
      isFormationAnchored = !isFormationAnchored;
      petAnchorToggle.classList.toggle('active', isFormationAnchored);
      petAnchorToggle.textContent = `Anchor Formation: ${isFormationAnchored ? 'ON' : 'OFF'}`;
      if (petPill) {
        if (isFormationAnchored) {
          petPill.textContent = 'Anchored';
          petPill.className = 'pet-status-pill anchored';
        } else {
          petPill.textContent = 'Mobile';
          petPill.className = 'pet-status-pill mobile';
        }
      }
      updateDirectives();
    });
  }

  if (petIndividualToggle) {
    petIndividualToggle.addEventListener('click', () => {
      const isInd = petIndividualToggle.classList.toggle('active');
      petIndividualToggle.textContent = `Individual Controls: ${isInd ? 'ON' : 'OFF'}`;
      const actionClusters = document.querySelectorAll('#demo-pet-window .pet-card-actions');
      actionClusters.forEach(cluster => {
        cluster.style.display = isInd ? 'flex' : 'none';
      });
    });
  }

  if (petFeedBtn) {
    petFeedBtn.addEventListener('click', () => {
      const isActive = petFeedBtn.classList.toggle('active');
      petFeedBtn.textContent = `Auto-Feed: ${isActive ? 'ON' : 'OFF'}`;
    });
  }

  if (petFocusBtn) {
    petFocusBtn.addEventListener('click', () => {
      const isActive = petFocusBtn.classList.toggle('active');
      petFocusBtn.textContent = `Focus Fire: ${isActive ? 'ON' : 'OFF'}`;
    });
  }

  const petCards = document.querySelectorAll('#demo-pet-window .pet-card');
  petCards.forEach((card) => {
    const actionBtns = card.querySelectorAll('.pet-action-btn');
    actionBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        actionBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  // =====================================================================
  // Navigator & Zone Map Interactive Suites (#nav-window & #map-window)
  // =====================================================================

  // Shared Navigation State
  const sharedWaypoints = [
    { id: 'wp-rendezvous', x: 640, y: 150, label: 'Supergroup Rendezvous', icon: '📍', color: '#ff0055', desc: 'Custom tactical rally beacon for squad infiltration.' },
    { id: 'wp-mission', x: 780, y: 350, label: 'Syndicate Warehouse Door', icon: '🚪', color: '#ff7700', desc: 'Active Task: Infiltrate the Cyber Syndicate black site.' },
    { id: 'wp-trainer', x: 280, y: 140, label: 'Director Vale', icon: '⭐', color: '#00e0ff', desc: 'Veteran field coordinator offering training upgrades.' }
  ];

  // --- Navigator Compass Tape Canvas ---
  const navCanvas = document.getElementById('demo-nav-compass-canvas');
  const navContainer = document.getElementById('demo-nav-compass-container');
  const navBadge = document.getElementById('demo-nav-compass-badge');
  const navCtx = navCanvas ? navCanvas.getContext('2d') : null;

  function getCardinalDirection(deg) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round(deg / 22.5) % 16;
    return directions[idx];
  }

  function getWaypointBearing(wp) {
    if (wp.bearing !== undefined && wp.bearing !== null) return wp.bearing;
    const dx = wp.x - 480;
    const dy = wp.y - 240;
    return Math.round((Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360);
  }

  function drawNavCompass() {
    if (!navCtx || !navCanvas) return;
    const w = navCanvas.width;
    const h = navCanvas.height;
    const cx = w / 2;

    navCtx.clearRect(0, 0, w, h);

    const fov = 90; // 90 degree visible field of view
    const pixelsPerDegree = w / fov;
    const minDeg = playerHeading - fov / 2;
    const maxDeg = playerHeading + fov / 2;

    const startTick = Math.floor(minDeg / 5) * 5;
    const endTick = Math.ceil(maxDeg / 5) * 5;

    // Draw degree tick marks & labels
    for (let deg = startTick; deg <= endTick; deg += 5) {
      const normDeg = (deg % 360 + 360) % 360;
      const x = cx + (deg - playerHeading) * pixelsPerDegree;

      const isCardinal = (normDeg % 90 === 0);
      const isOrdinal = (normDeg % 45 === 0 && !isCardinal);
      const isMajor = (normDeg % 15 === 0);

      const distFromCenter = Math.abs(x - cx);
      const alpha = Math.max(0, 1 - distFromCenter / (w / 2));

      navCtx.save();
      navCtx.globalAlpha = alpha;

      if (isCardinal || isOrdinal) {
        const labels = {
          0: 'N', 45: 'NE', 90: 'E', 135: 'SE',
          180: 'S', 225: 'SW', 270: 'W', 315: 'NW'
        };
        const text = labels[normDeg] || '';
        const isNorth = (normDeg === 0);

        navCtx.strokeStyle = isNorth ? '#ff0055' : '#00e0ff';
        navCtx.lineWidth = isNorth ? 2.5 : 2;
        navCtx.beginPath();
        navCtx.moveTo(x, 4);
        navCtx.lineTo(x, 18);
        navCtx.stroke();

        navCtx.fillStyle = isNorth ? '#ff0055' : (isCardinal ? '#ffffff' : '#00e0ff');
        navCtx.font = 'bold 11px Consolas, monospace';
        navCtx.textAlign = 'center';
        navCtx.fillText(text, x, 30);
      } else if (isMajor) {
        navCtx.strokeStyle = 'rgba(0, 224, 255, 0.6)';
        navCtx.lineWidth = 1.5;
        navCtx.beginPath();
        navCtx.moveTo(x, 4);
        navCtx.lineTo(x, 14);
        navCtx.stroke();

        navCtx.fillStyle = 'rgba(200, 230, 255, 0.6)';
        navCtx.font = '9px Consolas, monospace';
        navCtx.textAlign = 'center';
        navCtx.fillText(String(normDeg), x, 26);
      } else {
        navCtx.strokeStyle = 'rgba(0, 224, 255, 0.3)';
        navCtx.lineWidth = 1;
        navCtx.beginPath();
        navCtx.moveTo(x, 4);
        navCtx.lineTo(x, 10);
        navCtx.stroke();
      }

      navCtx.restore();
    }

    // Render Waypoint blips along the compass ribbon
    sharedWaypoints.forEach((wp) => {
      const bearing = getWaypointBearing(wp);
      const diff = (bearing - playerHeading + 540) % 360 - 180;
      if (Math.abs(diff) <= fov / 2) {
        const x = cx + diff * pixelsPerDegree;
        const distFromCenter = Math.abs(x - cx);
        const alpha = Math.max(0, 1 - distFromCenter / (w / 2));
        const isSelected = (selectedWaypointForEdit && selectedWaypointForEdit.id === wp.id);
        const wpColor = wp.color || '#ff0055';

        navCtx.save();
        navCtx.globalAlpha = alpha;

        if (isSelected) {
          // Yellow edit bracket indicating active edit mode
          navCtx.strokeStyle = '#f1c40f';
          navCtx.lineWidth = 1.5;
          navCtx.strokeRect(x - 11, 2, 22, 25);

          // Real-time colored beacon pip below icon
          navCtx.fillStyle = wpColor;
          navCtx.shadowColor = wpColor;
          navCtx.shadowBlur = 6;
          navCtx.beginPath();
          navCtx.arc(x, 24, 2.5, 0, Math.PI * 2);
          navCtx.fill();
        } else {
          // Real-time colored beacon pip below icon
          navCtx.fillStyle = wpColor;
          navCtx.beginPath();
          navCtx.arc(x, 24, 1.8, 0, Math.PI * 2);
          navCtx.fill();
        }

        navCtx.font = '14px sans-serif';
        navCtx.textAlign = 'center';
        navCtx.fillText(wp.icon || '📍', x, 16);
        navCtx.restore();
      }
    });

    if (navBadge) {
      navBadge.textContent = `${Math.round(playerHeading)}° ${getCardinalDirection(playerHeading)}`;
    }
  }

  // =====================================================================
  // Compass Ribbon Interactive Drag & Spinwheel Fling Physics
  // =====================================================================
  if (navContainer) {
    let lastClientX = 0;
    let dragHistory = [];

    function handleNavDown(clientX) {
      isNavDragging = true;
      lastClientX = clientX;
      navSpinVelocity = 0;
      dragHistory = [{ x: clientX, time: performance.now() }];
    }

    function handleNavMove(clientX) {
      if (!isNavDragging) return;
      const now = performance.now();
      const dx = clientX - lastClientX;
      lastClientX = clientX;

      // Dragging tape to the right rotates heading westward/counterclockwise (-dx)
      const headingDelta = -dx * 0.4;
      playerHeading = (playerHeading + headingDelta + 360) % 360;

      dragHistory.push({ x: clientX, time: now });
      while (dragHistory.length > 1 && (now - dragHistory[0].time) > 120) {
        dragHistory.shift();
      }

      drawNavCompass();
      drawZoneMap();
    }

    function handleNavUp() {
      if (!isNavDragging) return;
      isNavDragging = false;
      const now = performance.now();
      while (dragHistory.length > 1 && (now - dragHistory[0].time) > 120) {
        dragHistory.shift();
      }

      if (dragHistory.length >= 2) {
        const oldest = dragHistory[0];
        const newest = dragHistory[dragHistory.length - 1];
        const dtSec = Math.max(0.016, (newest.time - oldest.time) / 1000);
        const totalDx = newest.x - oldest.x;

        if (Math.abs(totalDx) > 3) {
          // Fling detected: assign momentum velocity and update auto-spin direction
          let flingVelocity = -(totalDx * 0.4) / dtSec;
          flingVelocity = Math.max(-1200, Math.min(1200, flingVelocity));

          if (Math.abs(flingVelocity) > 20) {
            navSpinVelocity = flingVelocity;
            navAutoSpinDirection = Math.sign(flingVelocity) || 1;
          } else {
            navSpinVelocity = 0;
          }
        } else {
          navSpinVelocity = 0;
        }
      } else {
        navSpinVelocity = 0;
      }
    }

    // Mouse Drag & Fling
    navContainer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      handleNavDown(e.clientX);
    });

    window.addEventListener('mousemove', (e) => {
      if (isNavDragging) {
        handleNavMove(e.clientX);
      }
    });

    window.addEventListener('mouseup', () => {
      if (isNavDragging) {
        handleNavUp();
      }
    });

    // Touch Drag & Fling (Mobile & Touchscreen support)
    navContainer.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length > 0) {
        handleNavDown(e.touches[0].clientX);
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (isNavDragging && e.touches && e.touches.length > 0) {
        handleNavMove(e.touches[0].clientX);
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      if (isNavDragging) {
        handleNavUp();
      }
    });
    window.addEventListener('touchcancel', () => {
      if (isNavDragging) {
        handleNavUp();
      }
    });

    window.navDebug = {
      getHeading: () => playerHeading,
      getVelocity: () => navSpinVelocity,
      getDirection: () => navAutoSpinDirection
    };
  }

  // Navigator Hub Buttons Click Handlers
  const navHubBtns = document.querySelectorAll('#demo-nav-window .nav-hub-btn');
  function flashWindowHighlight(winEl) {
    if (!winEl) return;
    winEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    winEl.style.boxShadow = '0 0 35px #00e0ff';
    winEl.style.borderColor = '#00e0ff';
    setTimeout(() => {
      winEl.style.boxShadow = '';
    }, 1400);
  }

  navHubBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      navHubBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (target === 'map') {
        flashWindowHighlight(document.getElementById('demo-map-window'));
      } else if (target === 'contact') {
        flashWindowHighlight(document.getElementById('demo-contact-window'));
      } else if (target === 'mission') {
        flashWindowHighlight(document.getElementById('demo-mission-window'));
      } else if (target === 'clues') {
        flashWindowHighlight(document.getElementById('demo-clues-window'));
      } else if (target === 'badge') {
        flashWindowHighlight(document.getElementById('demo-badge-window'));
      }
    });
  });

  // --- Zone Map Canvas & Controls ---
  const mapCanvas = document.getElementById('demo-map-canvas');
  const mapViewport = document.getElementById('demo-map-viewport');
  const mapTooltip = document.getElementById('demo-map-tooltip');
  const tipTitle = document.getElementById('demo-tip-title');
  const tipCat = document.getElementById('demo-tip-cat');
  const tipDesc = document.getElementById('demo-tip-desc');
  const mapScaleTrack = document.getElementById('demo-map-scale-track');
  const mapScaleLabel = document.getElementById('demo-map-scale-label');
  const mapZoomLabel = document.getElementById('demo-map-zoom-label');
  const mapCoordsLabel = document.getElementById('demo-map-coords');
  const btnDropWp = document.getElementById('demo-map-drop-wp');
  const btnZoomIn = document.getElementById('demo-map-zoom-in');
  const btnZoomOut = document.getElementById('demo-map-zoom-out');
  const btnRecenter = document.getElementById('demo-map-recenter');
  const btnLabelToggle = document.getElementById('demo-map-label-toggle');
  const btnFiltersToggle = document.getElementById('demo-map-filters-toggle');
  const mapFiltersMenu = document.getElementById('demo-map-filters-menu');
  const filtersCount = document.getElementById('demo-map-filters-count');
  const btnFiltersAll = document.getElementById('demo-map-filters-all');
  const btnFiltersNone = document.getElementById('demo-map-filters-none');
  const filterCheckboxes = document.querySelectorAll('#demo-map-filters-menu input[type="checkbox"]');

  // Floating Waypoint Customizer Dialog Elements
  const wpDialog = document.getElementById('demo-map-waypoint-dialog');
  const wpDialogHeader = document.getElementById('demo-map-wp-dialog-header');
  const wpNameInput = document.getElementById('demo-map-edit-wp-name');
  const wpIconBtns = document.querySelectorAll('#demo-map-icon-selector .map-icon-btn');
  const wpColorChips = document.querySelectorAll('#demo-map-color-selector .map-color-chip');
  const wpSelectedColorBadge = document.getElementById('demo-map-selected-color-badge');
  const btnSaveWp = document.getElementById('demo-btn-save-waypoint');
  const btnDeleteWp = document.getElementById('demo-btn-delete-waypoint');
  const btnCloseWpDialog = document.getElementById('demo-btn-close-wp-dialog');

  const colorNameMap = {
    '#ff0055': 'Neon Crimson',
    '#00e0ff': 'Neon Cyan',
    '#f1c40f': 'Cyber Gold',
    '#39ff14': 'Acid Green',
    '#b026ff': 'Vivid Purple',
    '#ff7700': 'Electric Orange',
    '#ffffff': 'Crisp White'
  };

  function updateSelectedColorBadge(color) {
    if (!wpSelectedColorBadge) return;
    const name = colorNameMap[(color || '').toLowerCase()] || color;
    wpSelectedColorBadge.textContent = `● ${name}`;
    wpSelectedColorBadge.style.color = color;
    wpSelectedColorBadge.style.borderColor = color;
    wpSelectedColorBadge.style.background = `${color}22`;
    wpSelectedColorBadge.style.boxShadow = `0 0 8px ${color}55`;
    if (wpDialog) {
      wpDialog.style.boxShadow = `0 10px 35px rgba(0, 0, 0, 0.95), 0 0 16px ${color}44`;
    }
  }

  const mapCtx = mapCanvas ? mapCanvas.getContext('2d') : null;
  let mapZoom = 1.0;
  let mapPanX = 0;
  let mapPanY = 0;
  let isDroppingWp = false;
  let mapLabelAlways = false;
  let hoveredPoi = null;
  let hoveredWp = null;
  let selectedWaypointForEdit = null;
  let selectedWpIcon = '📍';
  let selectedWpColor = '#ff0055';
  let hoverGhostPos = null;
  const placementBursts = [];
  const playerPos = { x: 480, y: 240 };

  const mapPois = [
    { id: 'poi-director', name: 'Director Vale', x: 280, y: 140, type: 'trainer', icon: '⭐', category: 'Hero Trainer', desc: 'Veteran field coordinator offering training upgrades and tactical enhancements.' },
    { id: 'poi-argosy', name: 'Argosy Department Store', x: 650, y: 180, type: 'store', icon: '🛒', category: 'Stores & Enhancements', desc: 'Licensed vendor supplying combat inspirations, salvage containers, and weapon tech.' },
    { id: 'poi-monorail', name: 'Atlas Monorail Station', x: 740, y: 110, type: 'transit', icon: '🚆', category: 'Transit Network', desc: 'Rapid transit connection linking Atlas Downtown to Steel Canyon and Skyway City.' },
    { id: 'poi-mercy', name: 'Mercy Medical Center', x: 200, y: 310, type: 'hospital', icon: '🏥', category: 'Clinics & Med-Bays', desc: 'Emergency trauma facility equipped with accelerated nanite regeneration pods.' },
    { id: 'poi-patriot', name: 'Patriot Plaque', x: 480, y: 110, type: 'badge', icon: '🎖️', category: 'Exploration Monument', desc: 'Historic district monument granting the "Atlas Patriot" exploration achievement.' },
    { id: 'poi-syndicate', name: 'Syndicate Warehouse Door', x: 780, y: 350, type: 'mission', icon: '🚪', category: 'Active Task', desc: 'Active Storyline: Infiltrate the Cyber Syndicate subterranean storage depot.' },
    { id: 'poi-skyway-transit', name: 'Skyway Aerial Transit', x: 330, y: 380, type: 'transit', icon: '🚆', category: 'Transit Network', desc: 'High-speed maglev shuttle terminal servicing Skyway District and Kings Row.' },
    { id: 'poi-forge-armory', name: 'Vanguard Forge Armory', x: 570, y: 330, type: 'store', icon: '🛒', category: 'Stores & Enhancements', desc: 'Specialized quartermaster trading high-grade Vanguard prototype schematics.' }
  ];

  const activeMapFilters = {
    trainer: true,
    store: true,
    transit: true,
    hospital: true,
    badge: true,
    mission: true
  };

  function updateScaleRuler() {
    if (!mapScaleTrack || !mapScaleLabel) return;
    const rawFeet = 500 / mapZoom;
    let roundedFeet = 500;
    let trackW = 80;

    if (rawFeet >= 1500) {
      roundedFeet = 2000;
      trackW = Math.round((2000 / rawFeet) * 80);
    } else if (rawFeet >= 800) {
      roundedFeet = 1000;
      trackW = Math.round((1000 / rawFeet) * 80);
    } else if (rawFeet >= 350) {
      roundedFeet = 500;
      trackW = Math.round((500 / rawFeet) * 80);
    } else {
      roundedFeet = 250;
      trackW = Math.round((250 / rawFeet) * 80);
    }

    trackW = Math.max(45, Math.min(130, trackW));
    const meters = Math.round(roundedFeet * 0.3048);
    mapScaleTrack.style.width = `${trackW}px`;
    mapScaleLabel.textContent = `${roundedFeet} ft (${meters} m)`;
    if (mapZoomLabel) mapZoomLabel.textContent = `${Math.round(mapZoom * 100)}%`;
  }

  function openWaypointDialog(wp, clientX, clientY) {
    if (!wpDialog) return;
    selectedWaypointForEdit = wp;
    selectedWpIcon = wp.icon || '📍';
    selectedWpColor = wp.color || '#ff0055';

    if (wpNameInput) {
      wpNameInput.value = wp.label;
    }

    wpIconBtns.forEach((btn) => {
      btn.classList.toggle('selected', btn.getAttribute('data-icon') === selectedWpIcon);
    });

    wpColorChips.forEach((chip) => {
      chip.classList.toggle('selected', (chip.getAttribute('data-color') || '').toLowerCase() === selectedWpColor.toLowerCase());
    });

    updateSelectedColorBadge(selectedWpColor);

    wpDialog.classList.remove('hidden');
    wpDialog.style.transform = 'none';

    if (mapViewport) {
      const vpRect = mapViewport.getBoundingClientRect();
      const dW = 320;
      const dH = 260;
      let targetX = (clientX !== undefined) ? clientX + 15 : (vpRect.width - dW) / 2;
      let targetY = (clientY !== undefined) ? clientY - 40 : (vpRect.height - dH) / 2;

      targetX = Math.max(10, Math.min(vpRect.width - dW - 10, targetX));
      targetY = Math.max(10, Math.min(vpRect.height - dH - 10, targetY));

      wpDialog.style.left = `${targetX}px`;
      wpDialog.style.top = `${targetY}px`;
    }

    if (wpNameInput) {
      setTimeout(() => {
        wpNameInput.focus();
        wpNameInput.select();
      }, 50);
    }
    drawZoneMap();
    drawNavCompass();
  }

  function closeWaypointDialog() {
    if (wpDialog) wpDialog.classList.add('hidden');
    selectedWaypointForEdit = null;
    drawZoneMap();
  }

  // Hook Dialog Interactive Controls
  if (wpNameInput) {
    wpNameInput.addEventListener('input', () => {
      if (selectedWaypointForEdit) {
        selectedWaypointForEdit.label = wpNameInput.value.trim() || 'Waypoint';
        drawZoneMap();
        drawNavCompass();
      }
    });
    wpNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        closeWaypointDialog();
      }
    });
  }

  wpIconBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      wpIconBtns.forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedWpIcon = btn.getAttribute('data-icon');
      if (selectedWaypointForEdit) {
        selectedWaypointForEdit.icon = selectedWpIcon;
        drawZoneMap();
        drawNavCompass();
      }
    });
  });

  wpColorChips.forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      wpColorChips.forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      selectedWpColor = chip.getAttribute('data-color');
      updateSelectedColorBadge(selectedWpColor);
      if (selectedWaypointForEdit) {
        selectedWaypointForEdit.color = selectedWpColor;
        // Trigger instantaneous color ripple burst on the map canvas
        placementBursts.push({
          x: selectedWaypointForEdit.x,
          y: selectedWaypointForEdit.y,
          radius: 12,
          maxRadius: 38,
          alpha: 0.95,
          color: selectedWpColor
        });
        drawZoneMap();
        drawNavCompass();
      }
    });
  });

  if (btnSaveWp) btnSaveWp.addEventListener('click', closeWaypointDialog);
  if (btnCloseWpDialog) btnCloseWpDialog.addEventListener('click', closeWaypointDialog);

  if (btnDeleteWp) {
    btnDeleteWp.addEventListener('click', () => {
      if (selectedWaypointForEdit) {
        const idx = sharedWaypoints.indexOf(selectedWaypointForEdit);
        if (idx !== -1) {
          sharedWaypoints.splice(idx, 1);
        }
      }
      closeWaypointDialog();
      drawZoneMap();
      drawNavCompass();
    });
  }

  // Draggable Floating Dialog Header
  if (wpDialogHeader && wpDialog) {
    let isDraggingDialog = false;
    let dragOffX = 0, dragOffY = 0;

    wpDialogHeader.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('close-btn')) return;
      isDraggingDialog = true;
      const dRect = wpDialog.getBoundingClientRect();
      dragOffX = e.clientX - dRect.left;
      dragOffY = e.clientY - dRect.top;
    });

    window.addEventListener('mousemove', (e) => {
      if (isDraggingDialog && mapViewport) {
        const vpRect = mapViewport.getBoundingClientRect();
        let newX = e.clientX - vpRect.left - dragOffX;
        let newY = e.clientY - vpRect.top - dragOffY;
        newX = Math.max(5, Math.min(vpRect.width - wpDialog.offsetWidth - 5, newX));
        newY = Math.max(5, Math.min(vpRect.height - wpDialog.offsetHeight - 5, newY));
        wpDialog.style.left = `${newX}px`;
        wpDialog.style.top = `${newY}px`;
      }
    });

    window.addEventListener('mouseup', () => {
      isDraggingDialog = false;
    });
  }

  function drawZoneMap() {
    if (!mapCtx || !mapCanvas) return;
    const w = mapCanvas.width;
    const h = mapCanvas.height;

    mapCtx.clearRect(0, 0, w, h);

    mapCtx.save();
    mapCtx.translate(w / 2 + mapPanX, h / 2 + mapPanY);
    mapCtx.scale(mapZoom, mapZoom);
    mapCtx.translate(-w / 2, -h / 2);

    // Grid Lines
    mapCtx.strokeStyle = 'rgba(0, 224, 255, 0.08)';
    mapCtx.lineWidth = 1;
    for (let x = -w; x < w * 2; x += 40) {
      mapCtx.beginPath();
      mapCtx.moveTo(x, -h);
      mapCtx.lineTo(x, h * 2);
      mapCtx.stroke();
    }
    for (let y = -h; y < h * 2; y += 40) {
      mapCtx.beginPath();
      mapCtx.moveTo(-w, y);
      mapCtx.lineTo(w * 2, y);
      mapCtx.stroke();
    }

    // Coastal Water Feature (Promenade Bay in Southeast)
    mapCtx.fillStyle = 'rgba(0, 80, 160, 0.18)';
    mapCtx.beginPath();
    mapCtx.moveTo(680, 260);
    mapCtx.lineTo(920, 260);
    mapCtx.lineTo(920, 460);
    mapCtx.lineTo(680, 460);
    mapCtx.closePath();
    mapCtx.fill();

    mapCtx.strokeStyle = 'rgba(0, 224, 255, 0.25)';
    mapCtx.lineWidth = 1.5;
    mapCtx.beginPath();
    mapCtx.moveTo(680, 260);
    mapCtx.lineTo(680, 460);
    mapCtx.stroke();

    // Promenade Docks Piers
    for (let py = 290; py <= 430; py += 35) {
      mapCtx.strokeStyle = 'rgba(0, 224, 255, 0.35)';
      mapCtx.lineWidth = 2.5;
      mapCtx.beginPath();
      mapCtx.moveTo(680, py);
      mapCtx.lineTo(770, py);
      mapCtx.stroke();
    }

    // District Road Outlines & City Blocks
    mapCtx.strokeStyle = 'rgba(0, 224, 255, 0.35)';
    mapCtx.lineWidth = 3.5;
    mapCtx.strokeRect(100, 50, 740, 380);
    mapCtx.strokeRect(340, 150, 280, 180);

    // Sector Road Thoroughfares
    mapCtx.beginPath();
    mapCtx.moveTo(480, 50);
    mapCtx.lineTo(480, 430);
    mapCtx.moveTo(100, 240);
    mapCtx.lineTo(840, 240);
    mapCtx.moveTo(200, 310);
    mapCtx.lineTo(340, 240);
    mapCtx.moveTo(620, 240);
    mapCtx.lineTo(760, 350);
    mapCtx.stroke();

    // Sector Label Banners
    const sectors = [
      { text: 'Atlas Plaza', x: 480, y: 240 },
      { text: 'Sector 4 (Downtown)', x: 310, y: 95 },
      { text: 'Promenade Docks', x: 730, y: 290 },
      { text: 'Sector 9 (Industrial)', x: 740, y: 95 },
      { text: 'Skyway Concourse', x: 260, y: 390 }
    ];

    mapCtx.font = 'bold 11px Consolas, monospace';
    sectors.forEach((sec) => {
      const tw = mapCtx.measureText(sec.text).width;
      mapCtx.fillStyle = 'rgba(6, 12, 22, 0.92)';
      mapCtx.strokeStyle = 'rgba(0, 224, 255, 0.4)';
      mapCtx.lineWidth = 1;
      mapCtx.fillRect(sec.x - tw / 2 - 8, sec.y - 11, tw + 16, 22);
      mapCtx.strokeRect(sec.x - tw / 2 - 8, sec.y - 11, tw + 16, 22);

      mapCtx.fillStyle = '#ffffff';
      mapCtx.textAlign = 'center';
      mapCtx.textBaseline = 'middle';
      mapCtx.fillText(sec.text, sec.x, sec.y);
    });

    // Render POIs
    mapPois.forEach((poi) => {
      if (!activeMapFilters[poi.type]) return;
      const isHovered = (hoveredPoi && hoveredPoi.id === poi.id);

      // Icon Circular Ring
      mapCtx.fillStyle = isHovered ? 'rgba(0, 224, 255, 0.5)' : 'rgba(0, 224, 255, 0.18)';
      mapCtx.strokeStyle = isHovered ? '#ffffff' : '#00e0ff';
      mapCtx.lineWidth = isHovered ? 2.5 : 1.2;
      mapCtx.beginPath();
      mapCtx.arc(poi.x, poi.y, isHovered ? 15 : 13, 0, Math.PI * 2);
      mapCtx.fill();
      mapCtx.stroke();

      // Icon
      mapCtx.font = isHovered ? '15px sans-serif' : '13px sans-serif';
      mapCtx.textAlign = 'center';
      mapCtx.textBaseline = 'middle';
      mapCtx.fillText(poi.icon, poi.x, poi.y);

      // Text Label
      if (mapLabelAlways || isHovered) {
        mapCtx.font = 'bold 9.5px Consolas, monospace';
        const textW = mapCtx.measureText(poi.name).width;
        mapCtx.fillStyle = 'rgba(6, 12, 22, 0.94)';
        mapCtx.strokeStyle = isHovered ? '#ffffff' : 'rgba(0, 224, 255, 0.45)';
        mapCtx.lineWidth = 1;
        mapCtx.fillRect(poi.x - textW / 2 - 5, poi.y + 16, textW + 10, 16);
        mapCtx.strokeRect(poi.x - textW / 2 - 5, poi.y + 16, textW + 10, 16);

        mapCtx.fillStyle = isHovered ? '#ffffff' : '#eaf6fc';
        mapCtx.fillText(poi.name, poi.x, poi.y + 24);
      }
    });

    // Render Waypoints with Dynamic Pulse Ring
    const pulse = 1 + 0.25 * Math.sin(performance.now() / 180);
    sharedWaypoints.forEach((wp) => {
      const isSelected = (selectedWaypointForEdit && selectedWaypointForEdit.id === wp.id);
      const isHovered = (hoveredWp && hoveredWp.id === wp.id);
      const wpColor = wp.color || '#ff0055';

      if (isSelected) {
        // Active Editing Reticle: Yellow Outer Frame (#f1c40f) + Real-Time Waypoint Color Core
        mapCtx.save();

        // 1. Yellow Outer Edit Selection Ring with 4 Reticle Ticks
        mapCtx.strokeStyle = '#f1c40f';
        mapCtx.lineWidth = 2;
        mapCtx.setLineDash([5, 3]);
        mapCtx.beginPath();
        mapCtx.arc(wp.x, wp.y, 22, 0, Math.PI * 2);
        mapCtx.stroke();
        mapCtx.setLineDash([]);

        // Reticle corner ticks
        const tickDist = 27;
        const tickLen = 5;
        mapCtx.strokeStyle = '#f1c40f';
        mapCtx.lineWidth = 2;
        [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => {
          mapCtx.beginPath();
          mapCtx.moveTo(wp.x + dx * (tickDist - tickLen), wp.y + dy * (tickDist - tickLen));
          mapCtx.lineTo(wp.x + dx * tickDist, wp.y + dy * tickDist);
          mapCtx.stroke();
        });

        // 2. Real-Time Waypoint Color Inner Reticle Ring & Glowing Halo
        mapCtx.strokeStyle = wpColor;
        mapCtx.lineWidth = 2.5;
        mapCtx.shadowColor = wpColor;
        mapCtx.shadowBlur = 12;
        mapCtx.beginPath();
        mapCtx.arc(wp.x, wp.y, 16, 0, Math.PI * 2);
        mapCtx.stroke();

        // Translucent colored backdrop halo
        mapCtx.fillStyle = wpColor;
        mapCtx.globalAlpha = 0.32;
        mapCtx.beginPath();
        mapCtx.arc(wp.x, wp.y, 16, 0, Math.PI * 2);
        mapCtx.fill();
        mapCtx.restore();

      } else if (isHovered) {
        mapCtx.save();
        mapCtx.strokeStyle = '#ffffff';
        mapCtx.lineWidth = 2.5;
        mapCtx.beginPath();
        mapCtx.arc(wp.x, wp.y, 18, 0, Math.PI * 2);
        mapCtx.stroke();

        mapCtx.fillStyle = 'rgba(0, 224, 255, 0.25)';
        mapCtx.beginPath();
        mapCtx.arc(wp.x, wp.y, 18, 0, Math.PI * 2);
        mapCtx.fill();
        mapCtx.restore();
      }

      // Real-Time Outer Dynamic Beacon Pulse Ring (Always pulses in wpColor!)
      mapCtx.save();
      mapCtx.strokeStyle = wpColor;
      mapCtx.shadowColor = wpColor;
      mapCtx.shadowBlur = isSelected ? 14 : 6;
      mapCtx.lineWidth = isSelected ? 2.5 : 2;
      mapCtx.beginPath();
      mapCtx.arc(wp.x, wp.y, (isSelected ? 15 : 13) * pulse, 0, Math.PI * 2);
      mapCtx.stroke();
      mapCtx.restore();

      // Real-time Colored Beacon Base Pip
      mapCtx.save();
      mapCtx.fillStyle = wpColor;
      mapCtx.shadowColor = wpColor;
      mapCtx.shadowBlur = 8;
      mapCtx.beginPath();
      mapCtx.arc(wp.x, wp.y + 7, isSelected ? 4 : 3, 0, Math.PI * 2);
      mapCtx.fill();
      mapCtx.restore();

      // Waypoint Icon
      mapCtx.font = (isSelected || isHovered) ? '18px sans-serif' : '15px sans-serif';
      mapCtx.textAlign = 'center';
      mapCtx.textBaseline = 'middle';
      mapCtx.fillText(wp.icon || '📍', wp.x, wp.y - 3);

      // Label pill
      if (mapLabelAlways || isHovered || isSelected) {
        mapCtx.save();
        mapCtx.font = 'bold 9.5px Consolas, monospace';
        const tw = mapCtx.measureText(wp.label).width;
        const pillW = tw + (isSelected ? 24 : 14);
        const pillH = 17;
        const pillX = wp.x - pillW / 2;
        const pillY = wp.y - 30;

        // Pill background
        mapCtx.fillStyle = 'rgba(6, 12, 22, 0.94)';
        mapCtx.fillRect(pillX, pillY, pillW, pillH);

        // Pill Border: Yellow when editing (#f1c40f) to signify edit state, or white/wpColor
        mapCtx.strokeStyle = isSelected ? '#f1c40f' : (isHovered ? '#ffffff' : wpColor);
        mapCtx.lineWidth = isSelected ? 1.5 : 1;
        mapCtx.strokeRect(pillX, pillY, pillW, pillH);

        if (isSelected) {
          // Real-time colored accent bar at bottom of pill
          mapCtx.fillStyle = wpColor;
          mapCtx.shadowColor = wpColor;
          mapCtx.shadowBlur = 6;
          mapCtx.fillRect(pillX, pillY + pillH - 2.5, pillW, 2.5);

          // Real-time colored indicator pip inside pill
          mapCtx.beginPath();
          mapCtx.arc(pillX + 8, pillY + pillH / 2 - 0.5, 3.5, 0, Math.PI * 2);
          mapCtx.fill();

          // Text in edit yellow
          mapCtx.shadowBlur = 0;
          mapCtx.fillStyle = '#f1c40f';
          mapCtx.fillText(wp.label, pillX + 16 + tw / 2, pillY + pillH / 2);
        } else {
          mapCtx.fillStyle = isHovered ? '#ffffff' : wpColor;
          mapCtx.fillText(wp.label, wp.x, pillY + pillH / 2);
        }
        mapCtx.restore();
      }
    });

    // Render Placement Burst Animations
    for (let i = placementBursts.length - 1; i >= 0; i--) {
      const b = placementBursts[i];
      b.radius += 1.8;
      b.alpha -= 0.04;
      if (b.alpha <= 0 || b.radius >= b.maxRadius) {
        placementBursts.splice(i, 1);
      } else {
        mapCtx.save();
        mapCtx.strokeStyle = b.color || '#00e0ff';
        mapCtx.globalAlpha = Math.max(0, b.alpha);
        mapCtx.lineWidth = 2.5;
        mapCtx.beginPath();
        mapCtx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        mapCtx.stroke();
        mapCtx.restore();
      }
    }

    // Render Player Marker (Triangle Arrow Cone)
    const px = playerPos.x;
    const py = playerPos.y;
    const rad = (playerHeading * Math.PI) / 180;

    // Field of view radar sweep
    mapCtx.save();
    mapCtx.translate(px, py);
    mapCtx.rotate(rad);

    mapCtx.fillStyle = 'rgba(0, 224, 255, 0.15)';
    mapCtx.beginPath();
    mapCtx.moveTo(0, 0);
    mapCtx.arc(0, 0, 55, -Math.PI / 4, Math.PI / 4);
    mapCtx.closePath();
    mapCtx.fill();

    // Player Triangle
    mapCtx.fillStyle = '#00e0ff';
    mapCtx.strokeStyle = '#ffffff';
    mapCtx.lineWidth = 1.8;
    mapCtx.beginPath();
    mapCtx.moveTo(0, -11);
    mapCtx.lineTo(7, 8);
    mapCtx.lineTo(0, 4);
    mapCtx.lineTo(-7, 8);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.stroke();

    mapCtx.restore();

    // Render Interactive Hover Ghost Waypoint when Drop Waypoint is Active
    if (isDroppingWp && hoverGhostPos) {
      const hx = hoverGhostPos.worldX;
      const hy = hoverGhostPos.worldY;
      const ghostPulse = 14 + Math.sin(performance.now() / 120) * 4;
      const ghostColor = selectedWpColor || '#ff0055';

      mapCtx.save();
      mapCtx.strokeStyle = ghostColor;
      mapCtx.lineWidth = 2;
      mapCtx.beginPath();
      mapCtx.arc(hx, hy, ghostPulse, 0, Math.PI * 2);
      mapCtx.stroke();

      // Crosshair reticle ticks
      mapCtx.strokeStyle = 'rgba(0, 224, 255, 0.6)';
      mapCtx.lineWidth = 1.5;
      mapCtx.beginPath();
      mapCtx.moveTo(hx - 22, hy);
      mapCtx.lineTo(hx - 6, hy);
      mapCtx.moveTo(hx + 6, hy);
      mapCtx.lineTo(hx + 22, hy);
      mapCtx.moveTo(hx, hy - 22);
      mapCtx.lineTo(hx, hy - 6);
      mapCtx.moveTo(hx, hy + 6);
      mapCtx.lineTo(hx, hy + 22);
      mapCtx.stroke();

      // Ghost icon
      mapCtx.font = '16px sans-serif';
      mapCtx.textAlign = 'center';
      mapCtx.textBaseline = 'middle';
      mapCtx.fillText(selectedWpIcon || '📍', hx, hy - 12);

      // Coordinate pill tag
      const tag = `Drop: (${Math.round(hx)}, ${Math.round(hy)})`;
      mapCtx.font = 'bold 10px Consolas, monospace';
      const tagW = mapCtx.measureText(tag).width + 12;
      mapCtx.fillStyle = 'rgba(6, 12, 22, 0.95)';
      mapCtx.strokeStyle = ghostColor;
      mapCtx.lineWidth = 1;
      mapCtx.fillRect(hx - tagW / 2, hy + 12, tagW, 18);
      mapCtx.strokeRect(hx - tagW / 2, hy + 12, tagW, 18);

      mapCtx.fillStyle = '#ffffff';
      mapCtx.fillText(tag, hx, hy + 22);
      mapCtx.restore();
    }

    mapCtx.restore();
  }

  // Zone Map Mouse Controls & Waypoint Dropping
  if (mapViewport) {
    let isMapDragging = false;
    let mapStartX = 0;
    let mapStartY = 0;

    // ResizeObserver to ensure canvas matches viewport dimensions perfectly
    if (window.ResizeObserver && mapCanvas) {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const cr = entry.contentRect;
          if (cr.width > 0 && cr.height > 0) {
            mapCanvas.width = Math.round(cr.width);
            mapCanvas.height = Math.round(cr.height);
            drawZoneMap();
          }
        }
      });
      ro.observe(mapViewport);
    }

    mapViewport.addEventListener('mousedown', (e) => {
      if (wpDialog && !wpDialog.classList.contains('hidden') && wpDialog.contains(e.target)) return;

      const rect = mapCanvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const w = mapCanvas.width;
      const h = mapCanvas.height;
      const unprojX = (clickX - w / 2 - mapPanX) / mapZoom + w / 2;
      const unprojY = (clickY - h / 2 - mapPanY) / mapZoom + h / 2;

      if (isDroppingWp) {
        const dx = unprojX - playerPos.x;
        const dy = unprojY - playerPos.y;
        const bearing = Math.round((Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360);

        const newWp = {
          id: 'wp-' + Date.now(),
          x: Math.round(unprojX),
          y: Math.round(unprojY),
          label: `Waypoint #${sharedWaypoints.length + 1}`,
          icon: selectedWpIcon || '📍',
          color: selectedWpColor || '#ff0055',
          bearing: bearing,
          desc: `Custom user tactical beacon placed at (${Math.round(unprojX)}, ${Math.round(unprojY)}).`
        };

        sharedWaypoints.push(newWp);
        placementBursts.push({
          x: Math.round(unprojX),
          y: Math.round(unprojY),
          radius: 8,
          maxRadius: 46,
          alpha: 1.0,
          color: newWp.color
        });

        isDroppingWp = false;
        if (btnDropWp) btnDropWp.classList.remove('active');
        mapViewport.classList.remove('dropping-waypoint-active');
        hoverGhostPos = null;

        openWaypointDialog(newWp, clickX, clickY);
        return;
      }

      // If clicked on an existing waypoint:
      if (hoveredWp) {
        openWaypointDialog(hoveredWp, clickX, clickY);
        return;
      }

      isMapDragging = true;
      mapStartX = e.clientX;
      mapStartY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (isMapDragging) {
        const dx = e.clientX - mapStartX;
        const dy = e.clientY - mapStartY;
        mapStartX = e.clientX;
        mapStartY = e.clientY;
        mapPanX += dx;
        mapPanY += dy;
        drawZoneMap();
      } else if (mapViewport) {
        const rect = mapCanvas.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          const w = mapCanvas.width;
          const h = mapCanvas.height;
          const unprojX = (mouseX - w / 2 - mapPanX) / mapZoom + w / 2;
          const unprojY = (mouseY - h / 2 - mapPanY) / mapZoom + h / 2;

          if (mapCoordsLabel) {
            mapCoordsLabel.textContent = `X: ${unprojX.toFixed(1)} | Y: ${unprojY.toFixed(1)} | Z: -12.4`;
          }

          if (isDroppingWp) {
            hoverGhostPos = { clientX: mouseX, clientY: mouseY, worldX: unprojX, worldY: unprojY };
            hoveredPoi = null;
            hoveredWp = null;
            drawZoneMap();
          } else {
            hoverGhostPos = null;
            // Check hover on waypoints first
            let foundWp = null;
            for (const wp of sharedWaypoints) {
              if (Math.hypot(unprojX - wp.x, unprojY - wp.y) <= 18 / mapZoom) {
                foundWp = wp;
                break;
              }
            }

            // Check hover on POIs
            let foundPoi = null;
            if (!foundWp) {
              for (const poi of mapPois) {
                if (activeMapFilters[poi.type] && Math.hypot(unprojX - poi.x, unprojY - poi.y) <= 18 / mapZoom) {
                  foundPoi = poi;
                  break;
                }
              }
            }

            if (foundWp !== hoveredWp || foundPoi !== hoveredPoi) {
              hoveredWp = foundWp;
              hoveredPoi = foundPoi;
              drawZoneMap();

              if (hoveredWp && mapTooltip) {
                mapTooltip.classList.remove('hidden');
                if (tipTitle) tipTitle.textContent = hoveredWp.label;
                if (tipCat) tipCat.textContent = 'Custom Waypoint [Click to Edit]';
                if (tipDesc) tipDesc.textContent = hoveredWp.desc || `Custom navigation beacon located at (${hoveredWp.x}, ${hoveredWp.y}).`;
              } else if (hoveredPoi && mapTooltip) {
                mapTooltip.classList.remove('hidden');
                if (tipTitle) tipTitle.textContent = hoveredPoi.name;
                if (tipCat) tipCat.textContent = hoveredPoi.category;
                if (tipDesc) tipDesc.textContent = hoveredPoi.desc;
              } else if (mapTooltip) {
                mapTooltip.classList.add('hidden');
              }
            }
          }
        } else if (hoveredPoi || hoveredWp || hoverGhostPos) {
          hoveredPoi = null;
          hoveredWp = null;
          hoverGhostPos = null;
          drawZoneMap();
          if (mapTooltip) mapTooltip.classList.add('hidden');
        }
      }
    });

    window.addEventListener('mouseup', () => {
      isMapDragging = false;
    });

    mapViewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      mapZoom = Math.max(0.5, Math.min(2.5, mapZoom + delta));
      updateScaleRuler();
      drawZoneMap();
    }, { passive: false });
  }

  // Drop Waypoint button toggle
  if (btnDropWp) {
    btnDropWp.addEventListener('click', () => {
      isDroppingWp = !isDroppingWp;
      btnDropWp.classList.toggle('active', isDroppingWp);
      if (mapViewport) mapViewport.classList.toggle('dropping-waypoint-active', isDroppingWp);
      if (!isDroppingWp) hoverGhostPos = null;
      drawZoneMap();
    });
  }

  // Zoom & Recenter controls
  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
      mapZoom = Math.min(2.5, mapZoom + 0.25);
      updateScaleRuler();
      drawZoneMap();
    });
  }

  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
      mapZoom = Math.max(0.5, mapZoom - 0.25);
      updateScaleRuler();
      drawZoneMap();
    });
  }

  if (btnRecenter) {
    btnRecenter.addEventListener('click', () => {
      mapZoom = 1.0;
      mapPanX = 0;
      mapPanY = 0;
      updateScaleRuler();
      drawZoneMap();
    });
  }

  // Label Mode toggle
  if (btnLabelToggle) {
    btnLabelToggle.addEventListener('click', () => {
      mapLabelAlways = !mapLabelAlways;
      btnLabelToggle.classList.toggle('active', mapLabelAlways);
      btnLabelToggle.textContent = mapLabelAlways ? '🏷️ Labels: Always On' : '🏷️ Labels: Hover Only';
      drawZoneMap();
    });
  }

  // Layers Dropdown & Filter toggles
  if (btnFiltersToggle && mapFiltersMenu) {
    btnFiltersToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      mapFiltersMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!mapFiltersMenu.contains(e.target) && e.target !== btnFiltersToggle) {
        mapFiltersMenu.classList.add('hidden');
      }
    });
  }

  function updateFilterCount() {
    const activeCount = Object.values(activeMapFilters).filter(Boolean).length;
    if (filtersCount) filtersCount.textContent = activeCount;
    drawZoneMap();
  }

  filterCheckboxes.forEach((cb) => {
    cb.addEventListener('change', () => {
      const key = cb.getAttribute('data-mfilter');
      if (key) {
        activeMapFilters[key] = cb.checked;
        updateFilterCount();
      }
    });
  });

  if (btnFiltersAll) {
    btnFiltersAll.addEventListener('click', () => {
      filterCheckboxes.forEach(cb => {
        cb.checked = true;
        const key = cb.getAttribute('data-mfilter');
        if (key) activeMapFilters[key] = true;
      });
      updateFilterCount();
    });
  }

  if (btnFiltersNone) {
    btnFiltersNone.addEventListener('click', () => {
      filterCheckboxes.forEach(cb => {
        cb.checked = false;
        const key = cb.getAttribute('data-mfilter');
        if (key) activeMapFilters[key] = false;
      });
      updateFilterCount();
    });
  }

  window.mapDebug = {
    openWaypointDialog: (wp) => openWaypointDialog(wp || sharedWaypoints[0]),
    closeWaypointDialog,
    getSelectedWaypoint: () => selectedWaypointForEdit,
    getWaypoints: () => sharedWaypoints,
    getColorBadgeText: () => wpSelectedColorBadge ? wpSelectedColorBadge.textContent : '',
    getColorBadgeColor: () => wpSelectedColorBadge ? wpSelectedColorBadge.style.color : ''
  };

  // ==========================================================================
  // Row 11: Field Operative Suite (3-Column Layout: Contacts, Missions, Clues)
  // ==========================================================================
  function switchMissionSystemTab(targetTab) {
    if (targetTab === 'contacts') flashWindowHighlight(document.getElementById('demo-contact-window'));
    else if (targetTab === 'mission') flashWindowHighlight(document.getElementById('demo-mission-window'));
    else if (targetTab === 'clues') flashWindowHighlight(document.getElementById('demo-clues-window'));
  }

  // --- Contacts Subsystem ---
  const contactsData = {
    c1: {
      name: 'Detective Wright',
      sub: 'Metro Public Safety Liaison | Clearance: Level 1-10',
      zone: 'Atlas City',
      bio: 'Senior precinct investigator tracking rogue syndicate cyber-thieves and voxel racketeers in Sector 9. Coordinates federal task force leads across municipal borders.',
      task: 'Active Task: Infiltrate Cyber Syndicate',
      phoneAvailable: true,
      dialogue: "Detective Wright: 'Good to hear from you, Agent. I have eyes on Sector 9. Advance cautiously and check your Mission dossier for live updates.'"
    },
    c2: {
      name: 'Agent Higgins',
      sub: 'F.B.I. Field Operative | Clearance: Level 10-20',
      zone: 'Kings Row',
      bio: 'Federal intelligence operative investigating black-market cybernetics distribution and illegal augmentations across industrial shipping docks.',
      task: 'No active mission assigned currently.',
      phoneAvailable: true,
      dialogue: "Agent Higgins: 'Transmission secured. We are compiling intercepts on Skulls weapons shipments. Stand by for task force commissioning.'"
    },
    c3: {
      name: 'Dr. Velez',
      sub: 'Voxel Bio-Tech Specialist | Clearance: Level 20-35',
      zone: 'Steel Canyon',
      bio: 'Research scientist at Bio-Core Labs specializing in cybernetic neural interfaces and nano-regeneration. Synthesizing countermeasures against synthetic viral strains.',
      task: 'No active mission assigned currently.',
      phoneAvailable: false,
      dialogue: "Dr. Velez: 'Encrypted relay online. Bio-Core synthesis is at 84%. Meet me at the lab for direct clearance briefing.'"
    },
    c4: {
      name: 'The Oracle',
      sub: 'Psionic Informant | Clearance: Level 35-50',
      zone: 'Shadow Realm',
      bio: 'Enigmatic clairvoyant monitoring temporal anomalies and cosmic dimensional rifts across the city. Tracks trans-dimensional incursions before they manifest.',
      task: 'No active mission assigned currently.',
      phoneAvailable: false,
      dialogue: "The Oracle: 'The threads vibrate, traveler. The syndicate\'s neural core is only the herald of a deeper convergence. Heed the clues.'"
    }
  };

  const contactSubtabActive = document.getElementById('demo-contact-subtab-active');
  const contactSubtabIntro = document.getElementById('demo-contact-subtab-introduced');
  const contactCards = document.querySelectorAll('#demo-contact-list-pane .contact-card');
  const cDetailName = document.getElementById('demo-c-detail-name');
  const cDetailSub = document.getElementById('demo-c-detail-sub');
  const cDetailZone = document.getElementById('demo-c-detail-zone');
  const cDetailBio = document.getElementById('demo-c-detail-bio');
  const cDetailTask = document.getElementById('demo-c-detail-task');
  const cCallBox = document.getElementById('demo-contact-call-box');
  const cCallDialogue = document.getElementById('demo-contact-call-dialogue');
  const btnContactCall = document.getElementById('demo-btn-contact-call');
  const btnContactLocate = document.getElementById('demo-btn-contact-locate');

  let isCallingContact = false;

  function setContactFilter(status) {
    if (contactSubtabActive) contactSubtabActive.classList.toggle('active', status === 'active');
    if (contactSubtabIntro) contactSubtabIntro.classList.toggle('active', status === 'introduced');
    contactCards.forEach(c => {
      const matches = c.getAttribute('data-cstatus') === status;
      c.style.display = matches ? 'flex' : 'none';
    });
  }

  if (contactSubtabActive) {
    contactSubtabActive.addEventListener('click', () => setContactFilter('active'));
  }
  if (contactSubtabIntro) {
    contactSubtabIntro.addEventListener('click', () => setContactFilter('introduced'));
  }

  function selectContact(cid) {
    const data = contactsData[cid];
    if (!data) return;
    contactCards.forEach(c => c.classList.toggle('selected', c.getAttribute('data-cid') === cid));

    if (cDetailName) cDetailName.textContent = data.name;
    if (cDetailSub) cDetailSub.textContent = data.sub;
    if (cDetailZone) cDetailZone.textContent = data.zone;
    if (cDetailBio) cDetailBio.textContent = data.bio;
    if (cDetailTask) {
      cDetailTask.innerHTML = data.task.startsWith('Active') ? `Active Task: <b>${data.task.replace('Active Task: ', '')}</b>` : data.task;
      cDetailTask.style.color = data.task.startsWith('Active') ? '#39ff14' : '#8899aa';
      cDetailTask.style.borderColor = data.task.startsWith('Active') ? 'rgba(57, 255, 20, 0.3)' : '#334455';
    }
    if (cCallDialogue) cCallDialogue.textContent = `"${data.dialogue}"`;

    // Reset call box
    isCallingContact = false;
    if (cCallBox) cCallBox.style.display = 'none';
    if (btnContactCall) {
      btnContactCall.disabled = !data.phoneAvailable;
      btnContactCall.textContent = '📞 Call Contact';
      btnContactCall.classList.remove('danger');
      btnContactCall.title = data.phoneAvailable ? 'Dial secure transceiver frequency' : 'Remote calling is not unlocked for this contact';
    }
  }

  contactCards.forEach(c => {
    c.addEventListener('click', () => {
      const cid = c.getAttribute('data-cid');
      if (cid) selectContact(cid);
    });
  });

  if (btnContactCall) {
    btnContactCall.addEventListener('click', () => {
      isCallingContact = !isCallingContact;
      if (cCallBox) cCallBox.style.display = isCallingContact ? 'flex' : 'none';
      btnContactCall.textContent = isCallingContact ? 'End Call' : '📞 Call Contact';
      btnContactCall.classList.toggle('danger', isCallingContact);
    });
  }

  if (btnContactLocate) {
    btnContactLocate.addEventListener('click', () => {
      flashWindowHighlight(document.getElementById('demo-map-window'));
    });
  }

  // --- Mission Dossier & Notoriety & Police Band Subsystem ---
  const missionSubtabDossier = document.getElementById('demo-mission-subtab-dossier');
  const missionSubtabNotoriety = document.getElementById('demo-mission-subtab-notoriety');
  const missionSubtabPolice = document.getElementById('demo-mission-subtab-police');
  const missionViewDossier = document.getElementById('demo-mission-view-dossier');
  const missionViewNotoriety = document.getElementById('demo-mission-view-notoriety');
  const missionViewPolice = document.getElementById('demo-mission-view-police');

  function setMissionSubtab(tab) {
    if (missionSubtabDossier) missionSubtabDossier.classList.toggle('active', tab === 'dossier');
    if (missionSubtabNotoriety) missionSubtabNotoriety.classList.toggle('active', tab === 'notoriety');
    if (missionSubtabPolice) missionSubtabPolice.classList.toggle('active', tab === 'police');

    if (missionViewDossier) missionViewDossier.style.display = tab === 'dossier' ? 'block' : 'none';
    if (missionViewNotoriety) missionViewNotoriety.style.display = tab === 'notoriety' ? 'block' : 'none';
    if (missionViewPolice) missionViewPolice.style.display = tab === 'police' ? 'flex' : 'none';
  }

  if (missionSubtabDossier) missionSubtabDossier.addEventListener('click', () => setMissionSubtab('dossier'));
  if (missionSubtabNotoriety) missionSubtabNotoriety.addEventListener('click', () => setMissionSubtab('notoriety'));
  if (missionSubtabPolice) missionSubtabPolice.addEventListener('click', () => setMissionSubtab('police'));

  // Checklist Objective Toggles
  const checklistItems = document.querySelectorAll('#demo-mission-checklist .mission-task-item');
  checklistItems.forEach(item => {
    item.addEventListener('click', () => {
      const isCompleted = item.classList.toggle('completed');
      const checkSpan = item.querySelector('.mission-task-check');
      if (checkSpan) checkSpan.textContent = isCompleted ? '☑' : '☐';
    });
  });

  // Track on map & drop mission
  const btnTrackMission = document.getElementById('demo-btn-mission-track-map');
  if (btnTrackMission) {
    btnTrackMission.addEventListener('click', () => {
      flashWindowHighlight(document.getElementById('demo-map-window'));
    });
  }
  const btnDropMission = document.getElementById('demo-btn-mission-drop');
  if (btnDropMission) {
    btnDropMission.addEventListener('click', () => {
      btnDropMission.textContent = 'Resetting Objectives...';
      setTimeout(() => {
        checklistItems.forEach((item, idx) => {
          const isCompleted = idx === 0;
          item.classList.toggle('completed', isCompleted);
          const checkSpan = item.querySelector('.mission-task-check');
          if (checkSpan) checkSpan.textContent = isCompleted ? '☑' : '☐';
        });
        btnDropMission.textContent = 'Drop Mission';
      }, 600);
    });
  }

  // Notoriety sliders
  const sliderTeamScale = document.getElementById('demo-slider-team-scale');
  const labelTeamScale = document.getElementById('demo-label-team-scale');
  if (sliderTeamScale && labelTeamScale) {
    sliderTeamScale.addEventListener('input', () => {
      labelTeamScale.textContent = `${sliderTeamScale.value} Players`;
    });
  }
  const sliderLevelOffset = document.getElementById('demo-slider-level-offset');
  const labelLevelOffset = document.getElementById('demo-label-level-offset');
  if (sliderLevelOffset && labelLevelOffset) {
    sliderLevelOffset.addEventListener('input', () => {
      const v = parseInt(sliderLevelOffset.value, 10);
      labelLevelOffset.textContent = (v >= 0 ? '+' : '') + v;
    });
  }

  // Police Band actions
  const pbAcceptBtns = document.querySelectorAll('.demo-btn-pb-accept');
  pbAcceptBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.textContent = '✓ Dispatched to GPS!';
      btn.disabled = true;
      btn.style.borderColor = '#00e0ff';
      btn.style.color = '#00e0ff';
      btn.style.background = 'rgba(0, 224, 255, 0.2)';
    });
  });
  const pbDismissBtns = document.querySelectorAll('.demo-btn-pb-dismiss');
  pbDismissBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.police-band-call-card');
      if (card) {
        card.style.opacity = '0';
        card.style.transform = 'translateX(20px)';
        setTimeout(() => card.style.display = 'none', 250);
      }
    });
  });

  // --- Clues & Souvenirs Subsystem ---
  const cluesData = {
    'clue-1': {
      title: '📱 Encrypted Syndicate Datapad',
      arc: 'Story Arc: The Cyber Plot',
      date: 'Today 08:30',
      isSouvenir: false,
      transcript: 'A hardened military datapad containing routing coordinates to an underground lab in Sector 9. Decryption reveals high-level communications signed by Commander Vex detailing an imminent neural grid takeover.'
    },
    'clue-2': {
      title: '📜 Neural Core Blueprints',
      arc: 'Story Arc: The Cyber Plot',
      date: 'Yesterday',
      isSouvenir: false,
      transcript: 'Partial schematics detailing a synthetic cybernetic core capable of interfacing directly with human cerebral cortexes. Annotations suggest the prototype is being assembled at the Bio-Core Facility.'
    },
    'clue-3': {
      title: '📝 Smuggler Passcode Memo',
      arc: 'Story Arc: Black Market Syndicate',
      date: 'Aug 26',
      isSouvenir: false,
      transcript: 'A handwritten note containing daily security gate access codes for the dockside warehouse: "LASAGNA-774". Cross-referencing reveals ties to contraband weapon shipments and illicit tech.'
    },
    'souv-1': {
      title: '🎖️ Hero of Atlas Park Plaque',
      arc: 'Origins of Valor (Completed)',
      date: 'Aug 20, 2026',
      isSouvenir: true,
      transcript: 'A gleaming commemorative medal presented by Mayor Waters for defending City Hall against the initial Voxel swarm invasion. Whenever you hold this plaque, you are reminded of the day you first stepped forward to protect the citizens of Atlas City.'
    },
    'souv-2': {
      title: '🔮 Commander Vex Damaged Core',
      arc: 'The Neon Strike (Completed)',
      date: 'Aug 24, 2026',
      isSouvenir: true,
      transcript: 'The shattered, smoldering power cell recovered after defeating Commander Vex atop the Paragon Transmit Tower. Its fading pulse stands as a permanent reminder of your triumph over the Syndicate strike force.'
    }
  };

  const clueSubtabEvidence = document.getElementById('demo-clues-subtab-evidence');
  const clueSubtabSouvenirs = document.getElementById('demo-clues-subtab-souvenirs');
  const clueCards = document.querySelectorAll('#demo-clues-list-pane .clue-item-card');
  const clueSearchInput = document.getElementById('demo-clues-search');
  const clueDetailTitle = document.getElementById('demo-clue-title');
  const clueDetailArc = document.getElementById('demo-clue-arc');
  const clueDetailDate = document.getElementById('demo-clue-date');
  const clueDetailTranscript = document.getElementById('demo-clue-transcript');
  const clueSouvenirRibbon = document.getElementById('demo-clue-souvenir-ribbon');
  const btnPlayAudio = document.getElementById('demo-btn-play-audio');
  const audioVisualizer = document.getElementById('demo-audio-visualizer');

  let isSouvenirCluesTab = false;
  let isPlayingAudioLog = false;

  function setCluesFilter(isSouvenir) {
    isSouvenirCluesTab = isSouvenir;
    if (clueSubtabEvidence) clueSubtabEvidence.classList.toggle('active', !isSouvenir);
    if (clueSubtabSouvenirs) clueSubtabSouvenirs.classList.toggle('active', isSouvenir);

    const q = clueSearchInput ? clueSearchInput.value.toLowerCase().trim() : '';
    let firstMatchId = null;

    clueCards.forEach(c => {
      const isSouv = c.getAttribute('data-clsouv') === 'true';
      const textMatch = !q || c.textContent.toLowerCase().includes(q);
      const visible = (isSouv === isSouvenir) && textMatch;
      c.style.display = visible ? 'flex' : 'none';
      if (visible && !firstMatchId) firstMatchId = c.getAttribute('data-clid');
    });

    if (firstMatchId) selectClue(firstMatchId);
  }

  if (clueSubtabEvidence) clueSubtabEvidence.addEventListener('click', () => setCluesFilter(false));
  if (clueSubtabSouvenirs) clueSubtabSouvenirs.addEventListener('click', () => setCluesFilter(true));

  if (clueSearchInput) {
    clueSearchInput.addEventListener('input', () => setCluesFilter(isSouvenirCluesTab));
  }

  function selectClue(clid) {
    const data = cluesData[clid];
    if (!data) return;
    clueCards.forEach(c => c.classList.toggle('selected', c.getAttribute('data-clid') === clid));

    if (clueDetailTitle) clueDetailTitle.textContent = data.title;
    if (clueDetailArc) clueDetailArc.textContent = data.arc;
    if (clueDetailDate) clueDetailDate.textContent = data.date;
    if (clueDetailTranscript) clueDetailTranscript.textContent = data.transcript;
    if (clueSouvenirRibbon) clueSouvenirRibbon.style.display = data.isSouvenir ? 'block' : 'none';

    isPlayingAudioLog = false;
    if (audioVisualizer) audioVisualizer.style.display = 'none';
    if (btnPlayAudio) {
      btnPlayAudio.textContent = '🔊 Play Audio Log (0:24)';
      btnPlayAudio.classList.remove('active');
    }
  }

  clueCards.forEach(c => {
    c.addEventListener('click', () => {
      const clid = c.getAttribute('data-clid');
      if (clid) selectClue(clid);
    });
  });

  if (btnPlayAudio) {
    btnPlayAudio.addEventListener('click', () => {
      isPlayingAudioLog = !isPlayingAudioLog;
      if (audioVisualizer) audioVisualizer.style.display = isPlayingAudioLog ? 'flex' : 'none';
      btnPlayAudio.textContent = isPlayingAudioLog ? '⏸ Pause Audio Log' : '🔊 Play Audio Log (0:24)';
      btnPlayAudio.classList.toggle('active', isPlayingAudioLog);
    });
  }

  // ==========================================================================
  // Row 13: Badges Window Subsystem (Title Selector, Category Filtering)
  // ==========================================================================
  const badgeTitleSelect = document.getElementById('demo-badge-title-select');
  const badgePlayerPreview = document.getElementById('demo-badge-player-preview');
  const badgeCatBtns = document.querySelectorAll('#demo-badge-cat-bar .badge-cat-btn');
  const badgeCards = document.querySelectorAll('#demo-badge-grid .badge-card');

  if (badgeTitleSelect && badgePlayerPreview) {
    badgeTitleSelect.addEventListener('change', () => {
      badgePlayerPreview.textContent = `Display: [ Bear ] < ${badgeTitleSelect.value} >`;
    });
  }

  badgeCatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-bcat');
      badgeCatBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      badgeCards.forEach(card => {
        const cardCat = card.getAttribute('data-bcat');
        const visible = (cat === 'all' || cardCat === cat);
        card.style.display = visible ? 'flex' : 'none';
      });
    });
  });

  badgeCards.forEach(card => {
    card.addEventListener('click', () => {
      const titleSpan = card.querySelector('.badge-card-name');
      if (titleSpan && badgeTitleSelect) {
        const name = titleSpan.textContent.trim();
        for (let i = 0; i < badgeTitleSelect.options.length; i++) {
          if (badgeTitleSelect.options[i].value === name || name.includes(badgeTitleSelect.options[i].value)) {
            badgeTitleSelect.selectedIndex = i;
            badgeTitleSelect.dispatchEvent(new Event('change'));
            break;
          }
        }
      }
      card.style.transform = 'scale(0.98)';
      setTimeout(() => card.style.transform = '', 150);
    });
  });

  // ==========================================================================
  // Row 3: Settings Panel Subsystem (Tabs, Theming Engine, Keybind Rebinding)
  // ==========================================================================
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  const settingsPrimaryColorInput = document.getElementById('demo-settings-primary-color');
  const settingsPrimarySwatch = document.getElementById('demo-settings-primary-swatch');
  const btnResetPrimary = document.getElementById('demo-settings-btn-reset-primary');

  const settingsSecondaryColorInput = document.getElementById('demo-settings-secondary-color');
  const settingsSecondarySwatch = document.getElementById('demo-settings-secondary-swatch');
  const btnResetSecondary = document.getElementById('demo-settings-btn-reset-secondary');

  const presetDots = document.querySelectorAll('.settings-preset-dot');

  function setGuiPrimaryAccent(hex) {
    if (!hex) return;
    const rgb = hexToRgb(hex);
    document.documentElement.style.setProperty('--accent-gui-picked', hex);
    document.documentElement.style.setProperty('--accent-gui-picked-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    if (settingsPrimarySwatch) {
      settingsPrimarySwatch.style.backgroundColor = hex;
    }
    if (settingsPrimaryColorInput && settingsPrimaryColorInput.value !== hex) {
      settingsPrimaryColorInput.value = hex;
    }
  }

  function setGuiSecondaryAccent(hex) {
    if (!hex) return;
    const rgb = hexToRgb(hex);
    document.documentElement.style.setProperty('--accent-gui-secondary', hex);
    document.documentElement.style.setProperty('--accent-gui-secondary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    document.documentElement.style.setProperty('--accent-2', hex);
    document.documentElement.style.setProperty('--accent-2-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    if (settingsSecondarySwatch) {
      settingsSecondarySwatch.style.backgroundColor = hex;
    }
    if (settingsSecondaryColorInput && settingsSecondaryColorInput.value !== hex) {
      settingsSecondaryColorInput.value = hex;
    }
  }

  if (settingsPrimaryColorInput) {
    settingsPrimaryColorInput.addEventListener('input', (e) => setGuiPrimaryAccent(e.target.value));
    settingsPrimaryColorInput.addEventListener('change', (e) => setGuiPrimaryAccent(e.target.value));
  }

  if (settingsSecondaryColorInput) {
    settingsSecondaryColorInput.addEventListener('input', (e) => setGuiSecondaryAccent(e.target.value));
    settingsSecondaryColorInput.addEventListener('change', (e) => setGuiSecondaryAccent(e.target.value));
  }

  if (btnResetPrimary) {
    btnResetPrimary.addEventListener('click', () => setGuiPrimaryAccent('#00e0ff'));
  }

  if (btnResetSecondary) {
    btnResetSecondary.addEventListener('click', () => setGuiSecondaryAccent('#00c8c9'));
  }

  presetDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const color = dot.getAttribute('data-color');
      if (color) {
        setGuiPrimaryAccent(color);
        dot.style.transform = 'scale(1.4)';
        setTimeout(() => { dot.style.transform = ''; }, 150);
      }
    });
  });

  const secondaryPresetDots = document.querySelectorAll('.settings-preset-dot-secondary');
  secondaryPresetDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const color = dot.getAttribute('data-color');
      if (color) {
        setGuiSecondaryAccent(color);
        dot.style.transform = 'scale(1.4)';
        setTimeout(() => { dot.style.transform = ''; }, 150);
      }
    });
  });

  const settingsTabBtns = document.querySelectorAll('.settings-tab-btn');
  const settingsPanels = {
    general: document.getElementById('demo-settings-panel-general'),
    interface: document.getElementById('demo-settings-panel-interface'),
    keybinds: document.getElementById('demo-settings-panel-keybinds')
  };

  function switchSettingsTab(targetTab) {
    settingsTabBtns.forEach(btn => {
      const isTarget = btn.getAttribute('data-tab') === targetTab;
      btn.classList.toggle('active', isTarget);
    });
    Object.keys(settingsPanels).forEach(tabKey => {
      const panel = settingsPanels[tabKey];
      if (panel) {
        panel.classList.toggle('hidden', tabKey !== targetTab);
      }
    });
  }

  settingsTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) switchSettingsTab(tab);
    });
  });

  // Keybind Rebinding
  const keybindChips = document.querySelectorAll('.keybind-chip');
  const btnResetKeybinds = document.getElementById('demo-settings-btn-reset-keybinds');
  let activeListeningChip = null;

  function clearListeningState() {
    if (activeListeningChip) {
      activeListeningChip.classList.remove('listening');
      activeListeningChip = null;
    }
  }

  keybindChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activeListeningChip === chip) {
        clearListeningState();
        return;
      }
      clearListeningState();
      activeListeningChip = chip;
      chip.classList.add('listening');
      chip.setAttribute('data-prev-val', chip.textContent.trim());
      chip.textContent = '...';
    });
  });

  document.addEventListener('keydown', (e) => {
    if (!activeListeningChip) return;

    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      activeListeningChip.textContent = activeListeningChip.getAttribute('data-prev-val') || activeListeningChip.getAttribute('data-default');
      clearListeningState();
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      activeListeningChip.textContent = 'None';
      clearListeningState();
      return;
    }

    if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
      return;
    }

    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');

    let keyName = e.key;
    if (e.code && e.code.startsWith('Numpad')) {
      keyName = 'Num ' + e.code.replace('Numpad', '');
    } else if (keyName === ' ') {
      keyName = 'Space';
    } else if (keyName.length === 1) {
      keyName = keyName.toUpperCase();
    }

    parts.push(keyName);
    activeListeningChip.textContent = parts.join(' + ');
    clearListeningState();
  });

  document.addEventListener('click', (e) => {
    if (activeListeningChip && !activeListeningChip.contains(e.target)) {
      activeListeningChip.textContent = activeListeningChip.getAttribute('data-prev-val') || activeListeningChip.getAttribute('data-default');
      clearListeningState();
    }
  });

  if (btnResetKeybinds) {
    btnResetKeybinds.addEventListener('click', () => {
      keybindChips.forEach(chip => {
        const def = chip.getAttribute('data-default');
        if (def) chip.textContent = def;
      });
      clearListeningState();
    });
  }

  const settingsPartySelect = document.getElementById('demo-settings-party-vitals-select');
  if (settingsPartySelect) {
    settingsPartySelect.addEventListener('change', () => {
      const val = settingsPartySelect.value;
      const partyVitals = document.querySelectorAll('.party-vital-text, .pv-val-text');
      partyVitals.forEach(el => {
        if (val === 'percentage') {
          el.style.display = '';
          el.textContent = '100%';
        } else if (val === 'raw') {
          el.style.display = '';
          el.textContent = '850 / 850';
        } else {
          el.style.display = 'none';
        }
      });
    });
  }

  const btnResetLayout = document.getElementById('demo-settings-btn-reset-layout');
  if (btnResetLayout) {
    btnResetLayout.addEventListener('click', () => {
      const orig = btnResetLayout.textContent;
      btnResetLayout.textContent = 'Layout Restored!';
      setTimeout(() => { btnResetLayout.textContent = orig; }, 1200);
    });
  }

  // Window Controls
  const btnCollapseSettings = document.getElementById('demo-settings-btn-collapse');
  const settingsBody = document.getElementById('demo-settings-body');
  const settingsTabsRow = document.querySelector('.mock-settings-card .settings-tabs-row');
  if (btnCollapseSettings && settingsBody) {
    let isSettingsCollapsed = false;
    btnCollapseSettings.addEventListener('click', () => {
      isSettingsCollapsed = !isSettingsCollapsed;
      settingsBody.style.display = isSettingsCollapsed ? 'none' : 'flex';
      if (settingsTabsRow) settingsTabsRow.style.display = isSettingsCollapsed ? 'none' : 'flex';
      btnCollapseSettings.textContent = isSettingsCollapsed ? '□' : '_';
    });
  }

  const btnCloseSettings = document.getElementById('demo-settings-btn-close');
  const demoSettingsWindow = document.getElementById('demo-settings-window');
  if (btnCloseSettings && demoSettingsWindow) {
    btnCloseSettings.addEventListener('click', () => {
      demoSettingsWindow.style.opacity = '0.3';
      demoSettingsWindow.style.filter = 'grayscale(1)';
      setTimeout(() => {
        demoSettingsWindow.style.opacity = '1';
        demoSettingsWindow.style.filter = '';
      }, 1000);
    });
  }

  // Expose debug interface for automated verification
  window.settingsDebug = {
    setPrimaryAccent: setGuiPrimaryAccent,
    getPrimaryAccent: () => getComputedStyle(document.documentElement).getPropertyValue('--accent-gui-picked').trim(),
    setSecondaryAccent: setGuiSecondaryAccent,
    getSecondaryAccent: () => getComputedStyle(document.documentElement).getPropertyValue('--accent-gui-secondary').trim(),
    switchTab: switchSettingsTab,
    getActiveTab: () => {
      const activeBtn = document.querySelector('.settings-tab-btn.active');
      return activeBtn ? activeBtn.getAttribute('data-tab') : null;
    }
  };

  // Initial draws
  drawNavCompass();
  drawZoneMap();
  updateScaleRuler();

  renderTab('general');
})();
