(function () {
  if (!window.THREE) {
    document.body.innerHTML = "<div style='padding:24px;font-family:sans-serif;color:white;background:#061116;height:100vh'>Three.js não carregou. Verifique a conexão com a internet para a CDN inicial.</div>";
    return;
  }

  const CryptoApex = window.CryptoApex;
  const canvas = document.getElementById("game-canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071217);
  scene.fog = new THREE.Fog(0x071217, 48, 190);

  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 520);
  camera.position.set(0, 4.8, 13);

  const clock = new THREE.Clock();
  const input = createInput();
  const audio = createAudio();
  const world = {
    scene,
    camera,
    player: null,
    input,
    audio,
    enemies: [],
    loots: [],
    turrets: [],
    traps: [],
    shields: [],
    buildings: [],
    elapsed: 0,
    kills: 0,
    spawnTimer: 0,
    difficulty: 1,
    phase: CryptoApex.missions.currentPhase(),
    shake: 0,
    aimOrigin: new THREE.Vector3(),
    cameraForward: new THREE.Vector3(0, 0, -1),
    aimDirection: new THREE.Vector3(0, 0, -1),
    getAimTarget,
    spawnMuzzleFlash,
    addCameraShake,
    hitScan,
    removeEnemy,
    spawnLoot,
    spawnBoss,
    transitionPhase,
    respawn
  };
  window.__CryptoApexWorld = world;

  let selectedHero = "satoshi";
  let started = false;

  setupUI();
  createLighting();
  createArena("city");
  render();

  function setupUI() {
    document.querySelectorAll(".hero-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".hero-card").forEach((entry) => entry.classList.remove("selected"));
        btn.classList.add("selected");
        selectedHero = btn.dataset.hero;
      });
    });
    document.getElementById("start-game").addEventListener("click", startGame);
    document.getElementById("wallet-btn").addEventListener("click", CryptoApex.nft.connectPhantom);
    document.getElementById("word-wallet-btn").addEventListener("click", CryptoApex.nft.connectWordFinance);
    document.getElementById("airdrop-sol").addEventListener("click", CryptoApex.nft.requestDevnetSol);
    document.getElementById("mint-selected").addEventListener("click", CryptoApex.nft.mintNextPending);
    CryptoApex.ui = { toast, dialogue, renderInventory, renderChainItems, updateWallet, flashDamage, updateHUD };
    setupMobileControls();
    renderInventory();
    renderChainItems();
    updateWallet();
  }

  function startGame() {
    document.getElementById("boot-screen").classList.add("hidden");
    started = true;
    audio.unlock();
    world.player = new CryptoApex.Player(scene, selectedHero);
    CryptoApex.missions.showDialogue("Rede", CryptoApex.missions.currentPhase().lesson);
    CryptoApex.economy.addItem({
      type: "arma",
      weaponKey: "rifle",
      name: "Rifle da Descentralização",
      rarity: "Comum",
      nft: true,
      lesson: "Primeira arma construída para resistir à inflação."
    });
    CryptoApex.missions.showLesson("firstWeapon");
  }

  function createLighting() {
    scene.add(new THREE.AmbientLight(0x99c9ff, 0.42));
    const sun = new THREE.DirectionalLight(0xffffff, 1.16);
    sun.position.set(18, 28, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    scene.add(sun);
    const rim = new THREE.PointLight(0x14f195, 1.2, 50);
    rim.position.set(-18, 8, -18);
    scene.add(rim);
  }

  function clearArena() {
    world.buildings.forEach((obj) => scene.remove(obj));
    world.buildings = [];
  }

  function createArena(key) {
    clearArena();
    const arenaSize = 220;
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x10242a, roughness: 0.68, metalness: 0.08 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(arenaSize, arenaSize, 28, 28), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    world.buildings.push(floor);

    const grid = new THREE.GridHelper(arenaSize, 96, 0x14f195, 0x25444b);
    grid.position.y = 0.012;
    scene.add(grid);
    world.buildings.push(grid);

    if (key === "citadel") createCitadel();
    else if (key === "mine") createMine();
    else if (key === "congress") createCongress();
    else createCity(key === "mint");
  }

  function createNeonStrip(width, height, color) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, 0.035),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.78 })
    );
    return strip;
  }

  function createFuturisticTower(seed, mint) {
    const rng = Math.sin(seed * 917.37) * 43758.5453;
    const pick = (offset) => Math.abs(Math.sin(rng + offset));
    const group = new THREE.Group();
    const baseColor = mint ? 0x2b2633 : 0x18323a;
    const glassColor = mint ? 0x3d314b : 0x163a43;
    const neon = mint ? 0xffd166 : (pick(4) > 0.5 ? 0x14f195 : 0x5df2ff);
    const h = 9 + pick(1) * (mint ? 25 : 19);
    const w = 3.2 + pick(2) * 5.2;
    const d = 3.2 + pick(3) * 5.2;
    const levels = 2 + Math.floor(pick(5) * 4);

    for (let i = 0; i < levels; i += 1) {
      const levelH = h / levels * (0.82 + pick(i + 7) * 0.28);
      const levelW = w * (1 - i * 0.08);
      const levelD = d * (1 - i * 0.07);
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(levelW, levelH, levelD),
        new THREE.MeshStandardMaterial({
          color: i % 2 ? glassColor : baseColor,
          roughness: 0.34,
          metalness: 0.22,
          emissive: glassColor,
          emissiveIntensity: 0.035
        })
      );
      body.position.y = (h / levels) * i + levelH / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      const frontStrip = createNeonStrip(levelW * 0.72, 0.08, neon);
      frontStrip.position.set(0, body.position.y + levelH * 0.25, -levelD / 2 - 0.024);
      group.add(frontStrip);
      const sideStrip = createNeonStrip(levelD * 0.55, 0.06, neon);
      sideStrip.rotation.y = Math.PI / 2;
      sideStrip.position.set(levelW / 2 + 0.024, body.position.y - levelH * 0.18, 0);
      group.add(sideStrip);

      const windows = 4 + Math.floor(levelH / 2);
      for (let r = 0; r < windows; r += 1) {
        const y = body.position.y - levelH * 0.38 + r * (levelH * 0.76 / Math.max(1, windows - 1));
        [-0.28, 0.28].forEach((xMul) => {
          const win = createNeonStrip(levelW * 0.18, 0.055, r % 2 ? 0x5df2ff : 0x14f195);
          win.position.set(xMul * levelW, y, -levelD / 2 - 0.028);
          win.material.opacity = 0.38;
          group.add(win);
        });
      }
    }

    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 2 + pick(11) * 3, 8),
      new THREE.MeshBasicMaterial({ color: neon })
    );
    antenna.position.y = h + antenna.geometry.parameters.height / 2;
    group.add(antenna);

    const crown = new THREE.Mesh(
      new THREE.TorusGeometry(Math.max(w, d) * 0.32, 0.035, 8, 28),
      new THREE.MeshBasicMaterial({ color: neon, transparent: true, opacity: 0.78 })
    );
    crown.position.y = h + 0.3;
    crown.rotation.x = Math.PI / 2;
    group.add(crown);
    return group;
  }

  function createCity(mint) {
    for (let i = 0; i < 58; i += 1) {
      const tower = createFuturisticTower(i + (mint ? 100 : 0), mint);
      const ring = 32 + Math.random() * 74;
      const ang = Math.random() * Math.PI * 2;
      tower.position.set(Math.cos(ang) * ring, 0, Math.sin(ang) * ring);
      tower.rotation.y = Math.random() * Math.PI * 2;
      scene.add(tower);
      world.buildings.push(tower);
    }
    if (mint) {
      const printer = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 5), new THREE.MeshStandardMaterial({ color: 0x4a3940, metalness: 0.2 }));
      printer.position.set(0, 2.5, -22);
      printer.castShadow = true;
      scene.add(printer);
      world.buildings.push(printer);
    }
  }

  function createCitadel() {
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x17353d, emissive: 0x0b2930, emissiveIntensity: 0.24 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), hubMat);
    dome.position.set(0, 0.08, -14);
    dome.castShadow = true;
    scene.add(dome);
    world.buildings.push(dome);

    const house = new THREE.Group();
    const room = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 6), new THREE.MeshStandardMaterial({ color: 0x203b45, roughness: 0.42 }));
    room.position.y = 1.6;
    room.castShadow = true;
    house.add(room);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.08), new THREE.MeshStandardMaterial({ color: 0x14f195, emissive: 0x14f195, emissiveIntensity: 0.25 }));
    door.position.set(0, 0.9, -3.05);
    house.add(door);
    addHouseDecor(house);
    house.position.set(-13, 0, 5);
    scene.add(house);
    world.buildings.push(house);

    const terminal = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.45), new THREE.MeshStandardMaterial({ color: 0x5df2ff, emissive: 0x5df2ff, emissiveIntensity: 0.35 }));
    terminal.position.set(4, 0.7, -6);
    scene.add(terminal);
    world.buildings.push(terminal);

    const shop = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.3, 1.2), new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0x553900, emissiveIntensity: 0.2 }));
    shop.position.set(11, 1.15, 4);
    scene.add(shop);
    world.buildings.push(shop);
  }

  function addHouseDecor(house) {
    CryptoApex.economy.state.house.items.forEach((kind, i) => {
      const color = kind === "holoSofa" ? 0x5df2ff : kind === "bitcoinVault" ? 0xffd166 : 0x14f195;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.55, 0.8), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.16 }));
      mesh.position.set(-2 + i * 1.3, 0.38, 0.7);
      mesh.castShadow = true;
      house.add(mesh);
    });
  }

  function createMine() {
    for (let i = 0; i < 18; i += 1) {
      const crystal = new THREE.Mesh(
        new THREE.ConeGeometry(0.7 + Math.random() * 0.7, 2 + Math.random() * 3, 6),
        new THREE.MeshStandardMaterial({ color: 0xf7931a, emissive: 0xf7931a, emissiveIntensity: 0.2 })
      );
      crystal.position.set((Math.random() - 0.5) * 62, 1, (Math.random() - 0.5) * 62);
      crystal.castShadow = true;
      scene.add(crystal);
      world.buildings.push(crystal);
    }
    for (let i = 0; i < 5; i += 1) {
      const miner = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.8), new THREE.MeshStandardMaterial({ color: 0x44545c, emissive: 0x111111 }));
      miner.position.set(-10 + i * 5, 0.4, -6);
      scene.add(miner);
      world.buildings.push(miner);
    }
  }

  function createCongress() {
    const hall = new THREE.Mesh(new THREE.BoxGeometry(22, 7, 8), new THREE.MeshStandardMaterial({ color: 0x3d3241, roughness: 0.46 }));
    hall.position.set(0, 3.5, -28);
    hall.castShadow = true;
    scene.add(hall);
    world.buildings.push(hall);
    for (let i = -4; i <= 4; i += 2) {
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 7, 18), new THREE.MeshStandardMaterial({ color: 0xd7d1bd }));
      column.position.set(i * 2, 3.5, -23.5);
      column.castShadow = true;
      scene.add(column);
      world.buildings.push(column);
    }
  }

  function createInput() {
    const data = {
      keys: {},
      pressed: {},
      mouseDown: false,
      rightMouse: false,
      mobileMove: new THREE.Vector2(),
      draggingLook: false,
      lookPointerId: null,
      lastLookX: 0,
      lastLookY: 0,
      yaw: 0,
      pitch: -0.12,
      consume(key) {
        if (this.pressed[key]) {
          this.pressed[key] = false;
          return true;
        }
        return false;
      }
    };
    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      data.keys[key] = true;
      data.pressed[key] = true;
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key)) e.preventDefault();
    });
    window.addEventListener("keyup", (e) => { data.keys[e.key.toLowerCase()] = false; });
    window.addEventListener("mousedown", (e) => {
      if (!started) return;
      if (e.button === 0) data.mouseDown = true;
      if (e.button === 2) data.rightMouse = true;
      canvas.requestPointerLock?.();
      data.draggingLook = true;
      data.lastLookX = e.clientX;
      data.lastLookY = e.clientY;
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) data.mouseDown = false;
      if (e.button === 2) data.rightMouse = false;
      data.draggingLook = false;
    });
    window.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("mousemove", (e) => {
      if (document.pointerLockElement === canvas) {
        data.yaw += e.movementX * 0.0024;
        data.pitch -= e.movementY * 0.0018;
      } else if (data.draggingLook) {
        data.yaw += (e.clientX - data.lastLookX) * 0.004;
        data.pitch -= (e.clientY - data.lastLookY) * 0.003;
        data.lastLookX = e.clientX;
        data.lastLookY = e.clientY;
      } else {
        data.yaw += e.movementX * 0.0014;
        data.pitch -= e.movementY * 0.001;
      }
      data.pitch = THREE.MathUtils.clamp(data.pitch, -0.58, 0.36);
    });
    canvas.addEventListener("pointerdown", (e) => {
      if (!started || e.pointerType !== "touch") return;
      if (e.clientX > window.innerWidth * 0.42) {
        data.lookPointerId = e.pointerId;
        data.lastLookX = e.clientX;
        data.lastLookY = e.clientY;
        canvas.setPointerCapture?.(e.pointerId);
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (e.pointerId !== data.lookPointerId) return;
      data.yaw += (e.clientX - data.lastLookX) * 0.007;
      data.pitch -= (e.clientY - data.lastLookY) * 0.005;
      data.lastLookX = e.clientX;
      data.lastLookY = e.clientY;
      data.pitch = THREE.MathUtils.clamp(data.pitch, -0.58, 0.36);
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener("pointerup", (e) => {
      if (e.pointerId === data.lookPointerId) data.lookPointerId = null;
    });
    canvas.addEventListener("pointercancel", (e) => {
      if (e.pointerId === data.lookPointerId) data.lookPointerId = null;
    });
    return data;
  }

  function setupMobileControls() {
    const stick = document.getElementById("move-stick");
    const knob = stick?.querySelector("i");
    let stickId = null;
    let origin = { x: 0, y: 0 };
    const max = 44;
    function resetStick() {
      stickId = null;
      input.mobileMove.set(0, 0);
      if (knob) knob.style.transform = "translate(-50%, -50%)";
    }
    function updateStick(e) {
      const dx = THREE.MathUtils.clamp(e.clientX - origin.x, -max, max);
      const dy = THREE.MathUtils.clamp(e.clientY - origin.y, -max, max);
      input.mobileMove.set(dx / max, dy / max);
      if (knob) knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      e.preventDefault();
    }
    if (stick) {
      stick.addEventListener("pointerdown", (e) => {
        stickId = e.pointerId;
        origin = { x: e.clientX, y: e.clientY };
        stick.setPointerCapture?.(e.pointerId);
        updateStick(e);
      }, { passive: false });
      stick.addEventListener("pointermove", (e) => {
        if (e.pointerId === stickId) updateStick(e);
      }, { passive: false });
      stick.addEventListener("pointerup", resetStick);
      stick.addEventListener("pointercancel", resetStick);
    }

    const bindHold = (id, down, up) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("pointerdown", (e) => {
        down();
        e.preventDefault();
      }, { passive: false });
      ["pointerup", "pointercancel", "pointerleave"].forEach((name) => {
        el.addEventListener(name, (e) => {
          up?.();
          e.preventDefault();
        }, { passive: false });
      });
    };
    bindHold("touch-fire", () => { input.mouseDown = true; }, () => { input.mouseDown = false; });
    bindHold("touch-jump", () => { input.pressed[" "] = true; });
    bindHold("touch-reload", () => { input.pressed.r = true; });
    bindHold("touch-q", () => { input.pressed.q = true; });
    bindHold("touch-e", () => { input.pressed.e = true; });
  }

  function createAudio() {
    let ctx = null;
    let stepAccum = 0;
    function unlock() {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
    }
    function tone(freq, dur, type, gain, slide) {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = type || "square";
      osc.frequency.value = freq;
      if (slide) osc.frequency.exponentialRampToValueAtTime(slide, ctx.currentTime + dur);
      amp.gain.setValueAtTime(gain || 0.03, ctx.currentTime);
      amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(amp).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    }
    function play(name) {
      unlock();
      const map = {
        shot: () => tone(220, 0.08, "sawtooth", 0.035, 90),
        flame: () => tone(90, 0.06, "sawtooth", 0.025, 60),
        reload: () => tone(420, 0.12, "triangle", 0.02, 210),
        coin: () => tone(880, 0.12, "sine", 0.035, 1320),
        hurt: () => tone(120, 0.18, "sawtooth", 0.04, 70),
        jump: () => tone(260, 0.12, "sine", 0.025, 540),
        ability: () => tone(520, 0.2, "triangle", 0.04, 1040),
        shield: () => tone(320, 0.35, "sine", 0.035, 680),
        explosion: () => tone(70, 0.3, "sawtooth", 0.055, 35)
      };
      map[name]?.();
    }
    function step(dt, sprint) {
      stepAccum += dt;
      if (stepAccum > (sprint ? 0.23 : 0.34)) {
        stepAccum = 0;
        tone(sprint ? 150 : 120, 0.035, "triangle", 0.012, 80);
      }
    }
    return { unlock, play, step };
  }

  function updateCamera(dt) {
    const player = world.player;
    const yaw = input.yaw;
    const pitch = input.pitch;
    const forward = new THREE.Vector3(Math.sin(yaw), Math.sin(pitch), -Math.cos(yaw)).normalize();
    const flatForward = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
    world.cameraForward.copy(flatForward);
    player.aiming = input.rightMouse;
    const distance = input.rightMouse ? 4.2 : 7.2;
    const height = input.rightMouse ? 2.35 : 3.15;
    const side = input.rightMouse ? 1.15 : 0.65;
    const right = new THREE.Vector3(-flatForward.z, 0, flatForward.x);
    const desired = player.group.position.clone().addScaledVector(flatForward, -distance).addScaledVector(right, side).add(new THREE.Vector3(0, height, 0));
    camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
    camera.lookAt(player.group.position.clone().add(new THREE.Vector3(0, 1.55, 0)).addScaledVector(forward, 9));
    camera.getWorldDirection(world.aimDirection);
    world.aimOrigin.copy(camera.position);
    if (world.shake > 0) {
      const s = world.shake;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
      world.shake = Math.max(0, world.shake - dt * 1.8);
    }
    camera.fov = THREE.MathUtils.lerp(camera.fov, input.rightMouse ? 48 : 65, 0.15);
    camera.updateProjectionMatrix();
  }

  function addCameraShake(amount) {
    world.shake = Math.min(0.42, world.shake + amount);
  }

  function getAimTarget(range) {
    const camOrigin = world.aimOrigin.clone();
    const dir = world.aimDirection.clone().normalize();
    let best = null;
    let bestProjection = Infinity;
    world.enemies.forEach((enemy) => {
      const center = enemy.group.position.clone().add(new THREE.Vector3(0, 1.05 * enemy.def.scale, 0));
      const toCenter = center.clone().sub(camOrigin);
      const projection = toCenter.dot(dir);
      if (projection < 0 || projection > range + 30) return;
      const closest = camOrigin.clone().addScaledVector(dir, projection);
      const rayDistance = closest.distanceTo(center);
      const aimAssistRadius = 1.25 * enemy.def.scale;
      if (rayDistance < aimAssistRadius && projection < bestProjection) {
        best = center;
        bestProjection = projection;
      }
    });
    if (best) return best;
    return camOrigin.addScaledVector(dir, range);
  }

  function spawnEnemy() {
    const phase = CryptoApex.missions.currentPhase();
    if (phase.safe || phase.enemyMix.length === 0 || !world.player) return;
    if (world.enemies.length >= (phase.maxEnemies || 14)) return;
    const key = phase.enemyMix[Math.floor(Math.random() * phase.enemyMix.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = 42 + Math.random() * 34;
    const pos = world.player.group.position.clone().add(new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist));
    const limit = (phase.bounds || 78) - 4;
    pos.x = THREE.MathUtils.clamp(pos.x, -limit, limit);
    pos.z = THREE.MathUtils.clamp(pos.z, -limit, limit);
    const enemy = new CryptoApex.enemies.Enemy(scene, key, pos);
    world.enemies.push(enemy);
  }

  function spawnBoss(key) {
    const pos = world.player.group.position.clone().add(world.cameraForward.clone().multiplyScalar(25));
    const enemy = new CryptoApex.enemies.Enemy(scene, key, pos);
    world.enemies.push(enemy);
    toast(`${enemy.def.label} entrou na arena.`);
  }

  function hitScan(origin, direction, def) {
    let best = null;
    let bestDist = Infinity;
    world.enemies.forEach((enemy) => {
      const center = enemy.group.position.clone().add(new THREE.Vector3(0, 1.05 * enemy.def.scale, 0));
      const toCenter = center.clone().sub(origin);
      const projection = toCenter.dot(direction);
      if (projection < 0 || projection > def.range) return;
      const closest = origin.clone().addScaledVector(direction, projection);
      const dist = closest.distanceTo(center);
      if (dist < 1.08 * enemy.def.scale && projection < bestDist) {
        best = enemy;
        bestDist = projection;
      }
    });
    if (best) {
      const dead = best.takeDamage(def.damage, world);
      const hitPos = best.group.position.clone().add(new THREE.Vector3(0, 1.2 * best.def.scale, 0));
      createImpact(hitPos, def.color);
      floatingText(hitPos, dead ? `+${best.def.cred[0]} CRED` : `-${Math.round(def.damage)}`, dead ? "#ffd166" : "#ffffff");
      document.getElementById("crosshair").classList.add("hit");
      window.setTimeout(() => document.getElementById("crosshair").classList.remove("hit"), 95);
      if (!dead) CryptoApex.economy.addCred(best.classKey.includes("boss") ? 2 : 1, "acerto", true);
    }
  }

  function createImpact(position, color) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 }));
    mesh.position.copy(position);
    mesh.userData.life = 0.24;
    scene.add(mesh);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.02, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.86 }));
    ring.position.copy(position);
    ring.lookAt(camera.position);
    ring.userData.life = 0.18;
    scene.add(ring);
  }

  function spawnMuzzleFlash(origin, color, flame) {
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(flame ? 0.36 : 0.22, 14, 10),
      new THREE.MeshBasicMaterial({ color: flame ? 0xff6a3d : color, transparent: true, opacity: 0.94 })
    );
    flash.position.copy(origin).addScaledVector(world.aimDirection, 0.22);
    flash.userData.life = flame ? 0.12 : 0.08;
    scene.add(flash);
    const light = new THREE.PointLight(flame ? 0xff6a3d : color, 1.8, flame ? 8 : 5);
    light.position.copy(flash.position);
    light.userData.life = 0.06;
    scene.add(light);
  }

  function floatingText(position, text, color) {
    const div = document.createElement("div");
    div.className = "float-combat";
    div.textContent = text;
    div.style.color = color;
    document.body.appendChild(div);
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / 650);
      const p = position.clone();
      p.y += 0.8 * t;
      p.project(camera);
      div.style.left = `${(p.x * 0.5 + 0.5) * window.innerWidth}px`;
      div.style.top = `${(-p.y * 0.5 + 0.5) * window.innerHeight}px`;
      div.style.opacity = String(1 - t);
      if (t < 1) requestAnimationFrame(tick);
      else div.remove();
    }
    requestAnimationFrame(tick);
  }

  function removeEnemy(enemy) {
    world.enemies = world.enemies.filter((entry) => entry !== enemy);
  }

  function spawnLoot(position, classKey) {
    const loot = CryptoApex.enemies.rollLoot(classKey, CryptoApex.missions.currentPhase().key);
    world.loots.push(CryptoApex.enemies.makeLoot(scene, position, loot));
  }

  function collectLoot(lootObj) {
    const loot = lootObj.userData.loot;
    scene.remove(lootObj);
    world.loots = world.loots.filter((entry) => entry !== lootObj);
    if (loot.type === "cred") {
      CryptoApex.economy.addCred(loot.amount, "loot");
    } else if (loot.type === "fragment") {
      const total = CryptoApex.economy.addFragment(loot.fragmentKey, loot.amount);
      toast(`${loot.name}: ${total}`);
      tryFuseWeapon(loot.fragmentKey);
    } else if (loot.type === "weapon") {
      world.player.unlockWeapon(loot.weaponKey);
      CryptoApex.economy.addItem(loot);
    } else if (loot.type === "emblema") {
      CryptoApex.economy.addCred(loot.amount || 0, "boss final");
      CryptoApex.economy.addItem(loot);
    } else {
      CryptoApex.economy.addItem(loot);
    }
    if (loot.lesson) dialogue("Rede", loot.lesson);
    audio.play("coin");
  }

  function tryFuseWeapon(fragmentKey) {
    const def = CryptoApex.weapons.defs.find((entry) => entry.fragmentKey === fragmentKey);
    if (!def || world.player.unlockedWeapons.includes(def.key)) return;
    const count = CryptoApex.economy.state.fragments[fragmentKey] || 0;
    if (count >= def.fragmentsNeeded) {
      CryptoApex.economy.state.fragments[fragmentKey] -= def.fragmentsNeeded;
      world.player.unlockWeapon(def.key);
      if (def.key === "shotgun") world.player.doubleJump = true;
      CryptoApex.economy.addItem({
        type: "arma",
        weaponKey: def.key,
        name: def.name,
        rarity: def.rarity,
        nft: true,
        lesson: `${def.name} fundida com fragmentos. Evoluir armas atualiza a propriedade do item no fluxo NFT.`
      });
      toast(`Arma fundida: ${def.name}`);
    }
  }

  function updateWorld(dt) {
    world.elapsed += dt;
    world.phase = CryptoApex.missions.currentPhase();
    world.difficulty = 1 + CryptoApex.missions.state.totalTime / 1200;
    CryptoApex.missions.update(dt, world);
    updateCamera(dt);
    world.player.update(dt, input, world);
    updateCamera(dt);

    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      spawnEnemy();
      world.spawnTimer = Math.max(0.55, world.phase.spawnEvery / world.difficulty);
    }

    world.enemies.slice().forEach((enemy) => enemy.update(dt, world));
    updateLoot(dt);
    updateTurrets(dt);
    updateTraps(dt);
    updateShields(dt);
    updateTransient(dt);
    handleInteraction();
    updateHUD();
  }

  function updateLoot(dt) {
    world.loots.slice().forEach((loot) => {
      loot.rotation.y += dt * 1.6;
      loot.position.y = loot.userData.baseY + Math.sin(world.elapsed * 3 + loot.position.x) * 0.16;
      const dist = loot.position.distanceTo(world.player.group.position);
      loot.scale.setScalar(dist < 1.9 ? 1.1 + Math.sin(world.elapsed * 8) * 0.06 : 1);
      if (dist < 1.45 && loot.userData.loot?.type === "cred") collectLoot(loot);
    });
  }

  function updateTurrets(dt) {
    world.turrets.slice().forEach((turret) => {
      turret.userData.life -= dt;
      turret.userData.cooldown -= dt;
      if (turret.userData.life <= 0) {
        scene.remove(turret);
        world.turrets = world.turrets.filter((entry) => entry !== turret);
        return;
      }
      const target = nearestEnemy(turret.position);
      if (target) {
        const dir = target.group.position.clone().sub(turret.position).normalize();
        turret.rotation.y = Math.atan2(dir.x, dir.z);
        if (turret.userData.cooldown <= 0) {
          turret.userData.cooldown = 0.36;
          CryptoApex.weapons.createTracer(scene, turret.position.clone().add(new THREE.Vector3(0, 0.4, 0)), target.group.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xffd166);
          target.takeDamage(12, world);
          audio.play("shot");
        }
      }
    });
  }

  function updateTraps(dt) {
    world.traps.slice().forEach((trap) => {
      trap.userData.life -= dt;
      trap.position.addScaledVector(trap.userData.velocity, dt);
      trap.rotation.y += dt * 8;
      const target = nearestEnemy(trap.position, 1.4);
      if (target || trap.userData.life <= 0) {
        explode(trap.position, 95, 4.2);
        scene.remove(trap);
        world.traps = world.traps.filter((entry) => entry !== trap);
      }
    });
  }

  function updateShields(dt) {
    world.shields.slice().forEach((shield) => {
      shield.userData.life -= dt;
      shield.position.copy(world.player.group.position).add(new THREE.Vector3(0, 1.05, 0));
      shield.rotation.y += dt;
      if (shield.userData.life <= 0) {
        scene.remove(shield);
        world.shields = world.shields.filter((entry) => entry !== shield);
      }
    });
  }

  function updateTransient(dt) {
    scene.children.slice().forEach((obj) => {
      if (obj.userData && typeof obj.userData.life === "number" && !world.turrets.includes(obj) && !world.traps.includes(obj) && !world.shields.includes(obj)) {
        obj.userData.life -= dt;
        if (obj.material && "opacity" in obj.material) obj.material.opacity = Math.max(0, obj.userData.life * 7);
        if (obj.userData.life <= 0) scene.remove(obj);
      }
    });
  }

  function nearestEnemy(position, maxDist) {
    let best = null;
    let dist = maxDist || Infinity;
    world.enemies.forEach((enemy) => {
      const d = enemy.group.position.distanceTo(position);
      if (d < dist) {
        best = enemy;
        dist = d;
      }
    });
    return best;
  }

  function explode(position, damage, radius) {
    audio.play("explosion");
    const boom = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), new THREE.MeshBasicMaterial({ color: 0xff6ac1, transparent: true, opacity: 0.22, wireframe: true }));
    boom.position.copy(position);
    boom.userData.life = 0.25;
    scene.add(boom);
    world.enemies.slice().forEach((enemy) => {
      const d = enemy.group.position.distanceTo(position);
      if (d <= radius) enemy.takeDamage(damage * (1 - d / radius), world);
    });
  }

  function handleInteraction() {
    if (!input.consume("f")) return;
    const closeLoot = world.loots.find((loot) => loot.position.distanceTo(world.player.group.position) < 2.4);
    if (closeLoot) {
      collectLoot(closeLoot);
      return;
    }
    if (world.phase.key === "citadel") {
      const pos = world.player.group.position;
      if (pos.distanceTo(new THREE.Vector3(4, 0, -6)) < 4) {
        document.getElementById("codex-panel").classList.toggle("hidden");
        renderChainItems();
        toast("Terminal da Cidadela aberto.");
      } else if (pos.distanceTo(new THREE.Vector3(11, 0, 4)) < 4) {
        if (CryptoApex.economy.buyDecoration("miningDesk")) {
          toast("Decoração comprada.");
          createArena("citadel");
        } else {
          toast("CRED insuficiente para decoração.");
        }
      } else if (pos.distanceTo(new THREE.Vector3(-13, 0, 5)) < 5) {
        if (CryptoApex.economy.expandHouse()) {
          world.player.doubleJump = true;
          toast("Casa NFT expandida. Duplo pulo liberado.");
          createArena("citadel");
        } else {
          toast("CRED insuficiente para expandir a casa.");
        }
      }
    }
  }

  function transitionPhase(oldPhase, phase) {
    createArena(phase.key);
    world.enemies.forEach((enemy) => scene.remove(enemy.group));
    world.enemies = [];
    world.loots.forEach((loot) => scene.remove(loot));
    world.loots = [];
    if (world.player) world.player.group.position.set(0, 0, 8);
    toast(phase.name);
  }

  function respawn() {
    world.player.health = world.player.maxHealth;
    world.player.shield = 35;
    world.player.group.position.set(0, 0, 8);
    CryptoApex.economy.spendCred(Math.min(50, CryptoApex.economy.state.cred));
    toast("Você foi reimplantado. Parte do CRED foi queimada.");
  }

  function updateHUD() {
    if (!world.player) return;
    const p = world.player;
    const weapon = p.weapon;
    const ammo = p.weaponAmmo[weapon.key];
    document.getElementById("health").textContent = Math.ceil(p.health);
    document.getElementById("shield").textContent = Math.ceil(p.shield);
    document.getElementById("stamina").textContent = Math.ceil(p.stamina);
    document.getElementById("health-bar").style.width = `${Math.max(0, p.health / p.maxHealth) * 100}%`;
    document.getElementById("shield-bar").style.width = `${Math.max(0, p.shield / p.maxShield) * 100}%`;
    document.getElementById("stamina-bar").style.width = `${p.stamina}%`;
    document.getElementById("weapon").textContent = weapon.name;
    document.getElementById("ammo").textContent = `${ammo.clip}/${ammo.reserve}${p.reloadTimer > 0 ? " recarregando" : ""}`;
    document.getElementById("cred").textContent = CryptoApex.economy.state.cred;
    document.getElementById("timer").textContent = CryptoApex.missions.formatTime(CryptoApex.missions.state.totalTime);
    document.getElementById("phase-name").textContent = world.phase.name;
    document.getElementById("mission-text").textContent = world.phase.target;
    document.getElementById("mission-progress").style.width = `${CryptoApex.missions.progress() * 100}%`;
  }

  function updateWallet() {
    const wallet = CryptoApex.nft.state.publicKey;
    const type = CryptoApex.nft.state.walletType;
    const hasWord = Boolean(CryptoApex.nft.getWallet?.("wordfinance"));
    document.getElementById("wallet-address").textContent = `Carteira: ${type ? type + " " : ""}${CryptoApex.nft.truncate(wallet)}`;
    document.getElementById("wallet-btn").textContent = type === "phantom" ? "Phantom conectada" : "Phantom";
    document.getElementById("word-wallet-btn").textContent = type === "wordfinance" ? "Word conectada" : (hasWord ? "Word padrão" : "Word Finance");
    document.getElementById("word-wallet-btn").classList.toggle("recommended", hasWord && type !== "phantom");
  }

  function renderInventory() {
    const list = document.getElementById("inventory-list");
    if (!list) return;
    const items = CryptoApex.economy.state.inventory.slice(0, 9);
    list.innerHTML = items.length ? "" : "<div class='inv-item'><span>Nenhum item ainda.</span></div>";
    items.forEach((item) => {
      const div = document.createElement("div");
      div.className = "inv-item";
      div.innerHTML = `<b>${item.name}</b><span>${item.rarity || "Comum"} | ${item.nft ? (item.minted ? "mintado" : "NFT pendente") : "local"}</span>`;
      list.appendChild(div);
    });
  }

  function renderChainItems() {
    const list = document.getElementById("codex-list");
    if (!list) return;
    const chainItems = CryptoApex.nft.state.chainItems;
    const pending = CryptoApex.economy.state.pendingMints;
    list.innerHTML = "";
    const note = document.createElement("div");
    note.className = "chain-item";
    note.innerHTML = `<b>Tesouraria oficial</b><span>${CryptoApex.nft.TREASURY_PUBLIC_KEY}</span><span>Sem chave privada da tesouraria, coleção certificada fica em modo jogador-assinado/devnet.</span>`;
    list.appendChild(note);
    pending.slice(0, 6).forEach((item) => {
      const div = document.createElement("div");
      div.className = "chain-item";
      div.innerHTML = `<b>${item.name}</b><span>Pendente para mint devnet</span>`;
      list.appendChild(div);
    });
    chainItems.slice(0, 8).forEach((item) => {
      const div = document.createElement("div");
      div.className = "chain-item";
      div.innerHTML = `<b>${item.name}</b><span>Mint: ${item.mintAddress ? item.mintAddress.slice(0, 8) + "..." : "memo"}</span><span>Tx: ${item.signature.slice(0, 10)}...</span>`;
      list.appendChild(div);
    });
  }

  function toast(message) {
    const stack = document.getElementById("toast-stack");
    const div = document.createElement("div");
    div.className = "toast";
    div.textContent = message;
    stack.prepend(div);
    window.setTimeout(() => div.remove(), 4200);
  }

  function dialogue(speaker, text) {
    const box = document.getElementById("dialogue");
    document.getElementById("dialogue-speaker").textContent = speaker;
    document.getElementById("dialogue-text").textContent = text;
    box.classList.remove("hidden");
    clearTimeout(dialogue.timer);
    dialogue.timer = window.setTimeout(() => box.classList.add("hidden"), 7600);
  }

  function flashDamage() {
    const v = document.getElementById("damage-vignette");
    v.classList.add("hit");
    window.setTimeout(() => v.classList.remove("hit"), 160);
  }

  function render() {
    const dt = Math.min(clock.getDelta(), 0.045);
    if (started && world.player) updateWorld(dt);
    else {
      camera.position.lerp(new THREE.Vector3(0, 4.4, 10), 0.02);
      camera.lookAt(0, 1.2, 0);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
