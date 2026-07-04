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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.outputEncoding = THREE.sRGBEncoding;

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
    playerAura: null,
    skyObjects: [],
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
  let saveTimer = 0;
  let loadedSaveKey = null;

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
    CryptoApex.ui = {
      toast,
      dialogue,
      renderInventory,
      renderChainItems,
      renderStore,
      renderCrafting,
      renderMarketplace,
      renderLeaderboard,
      openStore,
      openCrafting,
      openMarketplace,
      openLeaderboard,
      closeStore,
      updateWallet,
      flashDamage,
      flashGold,
      showPhaseComplete,
      updateHUD
    };
    createStoreUI();
    createV3Panels();
    createRadarUI();
    createGoldFlashUI();
    createPhaseCompleteUI();
    setupPixcBalanceTimer();
    setupMobileControls();
    renderInventory();
    renderChainItems();
    renderStore();
    renderCrafting();
    renderMarketplace();
    renderLeaderboard();
    updateWallet();
    window.addEventListener("beforeunload", () => CryptoApex.economy.saveGame(world));
  }

  function createStoreUI() {
    if (document.getElementById("store-panel")) return;
    const walletPanel = document.getElementById("wallet-panel");
    const toggle = document.createElement("button");
    toggle.id = "store-toggle";
    toggle.type = "button";
    toggle.textContent = "Loja PIXC";
    toggle.addEventListener("click", openStore);
    walletPanel.appendChild(toggle);

    const panel = document.createElement("section");
    panel.id = "store-panel";
    panel.className = "hidden";
    panel.innerHTML = `
      <div class="store-head">
        <div>
          <div class="panel-title">Loja PIXC</div>
          <div id="store-balance">Saldo: -- PIXC</div>
        </div>
        <button id="store-close" type="button" aria-label="Fechar loja">×</button>
      </div>
      <div class="store-note">Compras usam PIXC real na Solana mainnet e creditam o item depois da confirmação.</div>
      <div id="store-list"></div>
    `;
    document.getElementById("game-shell").appendChild(panel);
    document.getElementById("store-close").addEventListener("click", closeStore);
    panel.addEventListener("click", (event) => {
      const button = event.target.closest("[data-buy-store]");
      if (!button) return;
      CryptoApex.nft.buyStoreItem(button.dataset.buyStore);
    });
  }

  function createV3Panels() {
    const walletPanel = document.getElementById("wallet-panel");
    [
      ["craft-toggle", "Crafting", openCrafting],
      ["market-toggle", "Mercado", openMarketplace],
      ["leaderboard-toggle", "Ranking", openLeaderboard]
    ].forEach(([id, label, handler]) => {
      if (document.getElementById(id)) return;
      const btn = document.createElement("button");
      btn.id = id;
      btn.type = "button";
      btn.textContent = label;
      btn.addEventListener("click", handler);
      walletPanel.appendChild(btn);
    });

    const shell = document.getElementById("game-shell");
    if (!document.getElementById("craft-panel")) {
      const craft = document.createElement("section");
      craft.id = "craft-panel";
      craft.className = "economy-panel hidden";
      craft.innerHTML = `
        <div class="store-head">
          <div>
            <div class="panel-title">Estação de Crafting</div>
            <div class="store-note">Combine fragmentos coletados + PIXC real na mainnet.</div>
          </div>
          <button class="panel-close" type="button" data-close-panel="craft-panel">×</button>
        </div>
        <div id="craft-list"></div>
      `;
      shell.appendChild(craft);
    }
    if (!document.getElementById("market-panel")) {
      const market = document.createElement("section");
      market.id = "market-panel";
      market.className = "economy-panel hidden";
      market.innerHTML = `
        <div class="store-head">
          <div>
            <div class="panel-title">Mercado P2P</div>
            <div class="store-note">Listagens locais simulam o mercado; compras enviam PIXC direto ao vendedor + 1% taxa.</div>
          </div>
          <button class="panel-close" type="button" data-close-panel="market-panel">×</button>
        </div>
        <div class="market-columns">
          <div>
            <b class="subpanel-title">Meus Itens</b>
            <div id="market-owned-list"></div>
          </div>
          <div>
            <b class="subpanel-title">À Venda</b>
            <div id="market-listings"></div>
          </div>
        </div>
      `;
      shell.appendChild(market);
    }
    if (!document.getElementById("leaderboard-panel")) {
      const leaderboard = document.createElement("section");
      leaderboard.id = "leaderboard-panel";
      leaderboard.className = "economy-panel hidden";
      leaderboard.innerHTML = `
        <div class="store-head">
          <div>
            <div class="panel-title">Ranking CRED</div>
            <div class="store-note">Top 10 local por CRED acumulado.</div>
          </div>
          <button class="panel-close" type="button" data-close-panel="leaderboard-panel">×</button>
        </div>
        <div id="leaderboard-list"></div>
      `;
      shell.appendChild(leaderboard);
    }

    document.body.addEventListener("click", (event) => {
      const close = event.target.closest("[data-close-panel]");
      if (close) document.getElementById(close.dataset.closePanel)?.classList.add("hidden");

      const craft = event.target.closest("[data-craft-recipe]");
      if (craft) CryptoApex.nft.craftRecipe(craft.dataset.craftRecipe);

      const list = event.target.closest("[data-list-market]");
      if (list) {
        const input = document.querySelector(`[data-market-price="${list.dataset.listMarket}"]`);
        CryptoApex.economy.listMarketItem(list.dataset.listMarket, input?.value || 1);
      }

      const buy = event.target.closest("[data-buy-listing]");
      if (buy) CryptoApex.nft.buyMarketplaceListing(buy.dataset.buyListing);
    });
  }

  function hideEconomyPanels(exceptId) {
    ["store-panel", "craft-panel", "market-panel", "leaderboard-panel"].forEach((id) => {
      if (id !== exceptId) document.getElementById(id)?.classList.add("hidden");
    });
  }

  function openStore() {
    const panel = document.getElementById("store-panel");
    if (!panel) return;
    hideEconomyPanels("store-panel");
    panel.classList.remove("hidden");
    renderStore();
    CryptoApex.nft.refreshPixcBalance(true).catch(() => {});
  }

  function closeStore() {
    document.getElementById("store-panel")?.classList.add("hidden");
  }

  function openCrafting() {
    hideEconomyPanels("craft-panel");
    document.getElementById("craft-panel")?.classList.remove("hidden");
    renderCrafting();
    CryptoApex.nft.refreshPixcBalance(true).catch(() => {});
  }

  function openMarketplace() {
    hideEconomyPanels("market-panel");
    document.getElementById("market-panel")?.classList.remove("hidden");
    renderMarketplace();
    CryptoApex.nft.refreshPixcBalance(true).catch(() => {});
  }

  function openLeaderboard() {
    hideEconomyPanels("leaderboard-panel");
    document.getElementById("leaderboard-panel")?.classList.remove("hidden");
    CryptoApex.economy.updateLeaderboard(world);
    renderLeaderboard();
  }

  function renderStore() {
    const list = document.getElementById("store-list");
    const balance = document.getElementById("store-balance");
    if (!list || !balance) return;
    balance.textContent = `Saldo: ${CryptoApex.nft.formatPixcBalance()} PIXC`;
    list.innerHTML = "";
    CryptoApex.economy.storeCatalog.forEach((item) => {
      const card = document.createElement("article");
      card.className = `store-item rarity-${item.rarity}`;
      const busy = CryptoApex.nft.state.storeBusy;
      card.innerHTML = `
        <div>
          <b>${item.name}</b>
          <span>${item.effect}</span>
        </div>
        <div class="store-buy">
          <strong>${Number(item.pricePixc).toFixed(2)} PIXC</strong>
          <button type="button" data-buy-store="${item.key}" ${busy ? "disabled" : ""}>Comprar</button>
        </div>
      `;
      list.appendChild(card);
    });
  }

  function renderCrafting() {
    const list = document.getElementById("craft-list");
    if (!list) return;
    list.innerHTML = "";
    CryptoApex.economy.craftRecipes.forEach((recipe) => {
      const owned = CryptoApex.economy.state.fragments[recipe.fragmentKey] || 0;
      const canCraft = owned >= recipe.fragmentCost && !CryptoApex.nft.state.storeBusy;
      const card = document.createElement("article");
      card.className = `store-item rarity-${recipe.rarity}`;
      card.innerHTML = `
        <div>
          <b>${recipe.name}</b>
          <span>${recipe.effect}</span>
          <span>${owned}/${recipe.fragmentCost} ${recipe.fragmentLabel}</span>
        </div>
        <div class="store-buy">
          <strong>${Number(recipe.pricePixc).toFixed(2)} PIXC</strong>
          <button type="button" data-craft-recipe="${recipe.key}" ${canCraft ? "" : "disabled"}>Craftar</button>
        </div>
      `;
      list.appendChild(card);
    });
  }

  function renderMarketplace() {
    const owned = document.getElementById("market-owned-list");
    const listings = document.getElementById("market-listings");
    if (!owned || !listings) return;
    const inventory = CryptoApex.economy.state.inventory.slice(0, 10);
    owned.innerHTML = inventory.length ? "" : "<div class='inv-item'><span>Nenhum item para listar.</span></div>";
    inventory.forEach((item) => {
      const row = document.createElement("div");
      row.className = "market-row";
      row.innerHTML = `
        <div>
          <b>${item.name}</b>
          <span>${item.rarity || "Comum"} ${item.nft ? "| NFT" : "| local"}</span>
        </div>
        <div class="market-actions">
          <input data-market-price="${item.id}" type="number" min="0.01" step="0.01" value="5.00" aria-label="Preço PIXC">
          <button type="button" data-list-market="${item.id}">Listar</button>
        </div>
      `;
      owned.appendChild(row);
    });

    const market = CryptoApex.economy.getMarketplaceListings();
    listings.innerHTML = market.length ? "" : "<div class='inv-item'><span>Nenhuma listagem local.</span></div>";
    market.slice(0, 14).forEach((listing) => {
      const row = document.createElement("div");
      row.className = "market-row";
      row.innerHTML = `
        <div>
          <b>${listing.item.name}</b>
          <span>${listing.item.rarity || "Comum"} | vendedor ${listing.sellerShort}</span>
        </div>
        <div class="market-actions">
          <strong>${Number(listing.pricePixc).toFixed(2)} PIXC</strong>
          <button type="button" data-buy-listing="${listing.id}" ${CryptoApex.nft.state.storeBusy ? "disabled" : ""}>Comprar</button>
        </div>
      `;
      listings.appendChild(row);
    });
  }

  function renderLeaderboard() {
    const list = document.getElementById("leaderboard-list");
    if (!list) return;
    const rows = CryptoApex.economy.getLeaderboard();
    list.innerHTML = rows.length ? "" : "<div class='inv-item'><span>Sem pontuação salva ainda.</span></div>";
    rows.forEach((row, index) => {
      const div = document.createElement("div");
      div.className = "leader-row";
      div.innerHTML = `<b>#${index + 1} ${row.name}</b><span>${row.score} CRED | ${row.hero}</span>`;
      list.appendChild(div);
    });
  }

  function setupPixcBalanceTimer() {
    window.setInterval(() => {
      if (CryptoApex.nft.state.connected) CryptoApex.nft.refreshPixcBalance().catch(() => {});
    }, 10000);
  }

  function createRadarUI() {
    if (document.getElementById("radar-panel")) return;
    const radar = document.createElement("section");
    radar.id = "radar-panel";
    radar.innerHTML = `
      <div class="radar-title">MAPA</div>
      <div id="radar-disc">
        <i class="radar-player"></i>
      </div>
    `;
    document.getElementById("game-shell").appendChild(radar);
  }

  function createGoldFlashUI() {
    if (document.getElementById("gold-flash")) return;
    const flash = document.createElement("div");
    flash.id = "gold-flash";
    document.getElementById("game-shell").appendChild(flash);
  }

  function createPhaseCompleteUI() {
    if (document.getElementById("phase-complete")) return;
    const overlay = document.createElement("section");
    overlay.id = "phase-complete";
    overlay.className = "hidden";
    overlay.innerHTML = `
      <div class="phase-complete-inner">
        <span>FASE COMPLETA</span>
        <b id="phase-complete-name">Crypto Legends</b>
        <small id="phase-complete-next">Próxima operação sincronizada</small>
      </div>
    `;
    document.getElementById("game-shell").appendChild(overlay);
  }

  function flashGold() {
    const flash = document.getElementById("gold-flash");
    if (!flash) return;
    flash.classList.remove("pulse");
    void flash.offsetWidth;
    flash.classList.add("pulse");
  }

  function showPhaseComplete(oldPhase, nextPhase) {
    const overlay = document.getElementById("phase-complete");
    if (!overlay) return;
    document.getElementById("phase-complete-name").textContent = oldPhase?.name || "Fase completa";
    document.getElementById("phase-complete-next").textContent = nextPhase ? `Próximo: ${nextPhase.name}` : "Operação concluída";
    overlay.classList.remove("hidden");
    overlay.classList.remove("show");
    void overlay.offsetWidth;
    overlay.classList.add("show");
    window.setTimeout(() => overlay.classList.add("hidden"), 2500);
  }

  function startGame() {
    document.getElementById("boot-screen").classList.add("hidden");
    started = true;
    audio.unlock();
    world.player = new CryptoApex.Player(scene, selectedHero);
    CryptoApex.missions.showDialogue("Rede", CryptoApex.missions.currentPhase().lesson);
    const restored = restoreCurrentSave(true);
    if (!restored) {
      CryptoApex.economy.addItem({
        type: "arma",
        weaponKey: "rifle",
        name: "Rifle da Descentralização",
        rarity: "Comum",
        nft: true,
        lesson: "Primeira arma construída para resistir à inflação."
      });
      CryptoApex.missions.showLesson("firstWeapon");
    } else {
      toast("Progresso restaurado.");
    }
    window.setTimeout(() => CryptoApex.campaign?.startTutorial?.(), 1200);
  }

  function restoreCurrentSave(force) {
    const key = CryptoApex.economy.walletId();
    if (!force && loadedSaveKey === key) return false;
    if (!world.player) return false;
    const restored = CryptoApex.economy.restoreGame(world, key);
    if (restored) {
      loadedSaveKey = key;
      world.phase = CryptoApex.missions.currentPhase();
      createArena(world.phase.key);
      world.player.group.position.set(0, 0, 8);
      renderInventory();
      renderCrafting();
      renderMarketplace();
      renderLeaderboard();
      updateHUD();
    }
    return restored;
  }

  function createLighting() {
    scene.add(new THREE.AmbientLight(0x99c9ff, 0.34));
    const hemi = new THREE.HemisphereLight(0xbfe8ff, 0x1a2a1f, 0.5);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2dd, 1.22);
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
    const magenta = new THREE.PointLight(0xff6ac1, 0.9, 70);
    magenta.position.set(28, 12, -34);
    scene.add(magenta);
    const gold = new THREE.PointLight(0xffd166, 0.75, 58);
    gold.position.set(-30, 9, 24);
    scene.add(gold);
    createSkylineAtmosphere();
  }

  function createSkylineAtmosphere() {
    const starGeo = new THREE.BufferGeometry();
    const positions = [];
    for (let i = 0; i < 520; i += 1) {
      const radius = 80 + Math.random() * 180;
      const angle = Math.random() * Math.PI * 2;
      positions.push(Math.cos(angle) * radius, 22 + Math.random() * 80, Math.sin(angle) * radius);
    }
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x9ffaff, size: 0.5, transparent: true, opacity: 0.65 }));
    scene.add(stars);
    world.skyObjects.push(stars);

    for (let i = 0; i < 7; i += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(28 + i * 10, 0.018, 6, 96),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x14f195 : 0x5df2ff, transparent: true, opacity: 0.08 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.04 + i * 0.012;
      scene.add(ring);
      world.skyObjects.push(ring);
    }
  }

  function clearArena() {
    world.buildings.forEach((obj) => scene.remove(obj));
    world.buildings = [];
  }

  function getArenaThemes() {
    return {
    city: { sky: 0x071217, fog: 0x071217, floor: 0x10242a, grid: 0x14f195 },
    mint: { sky: 0x120d14, fog: 0x150f18, floor: 0x1c1420, grid: 0xff6ac1 },
    citadel: { sky: 0x061410, fog: 0x08160f, floor: 0x0f231c, grid: 0x14f195 },
    mine: { sky: 0x100d06, fog: 0x140f07, floor: 0x1d160c, grid: 0xf7931a },
    congress: { sky: 0x0d0a12, fog: 0x0f0c15, floor: 0x171225, grid: 0xffd166 },
    lightning: { sky: 0x050c16, fog: 0x060e1a, floor: 0x0b1a2c, grid: 0xffe45e },
    defi: { sky: 0x081016, fog: 0x0a1218, floor: 0x0f2028, grid: 0x5df2ff },
    halving: { sky: 0x0c0806, fog: 0x0f0a07, floor: 0x1a120a, grid: 0xf7931a }
    };
  }

  function createArena(key) {
    clearArena();
    const themes = getArenaThemes();
    const theme = themes[key] || themes.city;
    scene.background = new THREE.Color(theme.sky);
    scene.fog = new THREE.Fog(theme.fog, 48, 190);
    const arenaSize = 220;
    const floorMat = new THREE.MeshStandardMaterial({ color: theme.floor, roughness: 0.68, metalness: 0.08 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(arenaSize, arenaSize, 28, 28), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    world.buildings.push(floor);

    const grid = new THREE.GridHelper(arenaSize, 96, theme.grid, 0x25444b);
    grid.position.y = 0.012;
    scene.add(grid);
    world.buildings.push(grid);

    if (key === "citadel") createCitadel();
    else if (key === "mine") createMine();
    else if (key === "congress") createCongress();
    else if (key === "lightning") createLightningHighway();
    else if (key === "defi") createDefiDistrict();
    else if (key === "halving") createHalvingVault();
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
    for (let i = 0; i < 14; i += 1) {
      const sign = new THREE.Group();
      const color = i % 3 === 0 ? 0xffd166 : i % 3 === 1 ? 0x14f195 : 0x5df2ff;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.1, 0.08), new THREE.MeshStandardMaterial({
        color: 0x101a20,
        metalness: 0.35,
        roughness: 0.28,
        emissive: color,
        emissiveIntensity: 0.12
      }));
      frame.castShadow = true;
      sign.add(frame);
      const stripe = createNeonStrip(3.1, 0.08, color);
      stripe.position.z = -0.07;
      sign.add(stripe);
      const ring = 46 + Math.random() * 54;
      const ang = Math.random() * Math.PI * 2;
      sign.position.set(Math.cos(ang) * ring, 4 + Math.random() * 7, Math.sin(ang) * ring);
      sign.lookAt(0, sign.position.y, 0);
      scene.add(sign);
      world.buildings.push(sign);
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

    const crafting = new THREE.Group();
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x263b44, metalness: 0.24, roughness: 0.36 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffd166, emissiveIntensity: 0.48 });
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.55, 1.2), benchMat);
    bench.position.y = 0.42;
    bench.castShadow = true;
    crafting.add(bench);
    const holo = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 1), glowMat);
    holo.position.set(0, 1.18, 0);
    crafting.add(holo);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.03, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.72 }));
    ring.position.y = 1.18;
    ring.rotation.x = Math.PI / 2;
    crafting.add(ring);
    crafting.position.set(-4, 0, -6);
    scene.add(crafting);
    world.buildings.push(crafting);

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

  function createLightningHighway() {
    for (let i = 0; i < 26; i += 1) {
      const pylon = new THREE.Group();
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.4, 9 + Math.random() * 5, 8),
        new THREE.MeshStandardMaterial({ color: 0x18242f, metalness: 0.55, roughness: 0.32 })
      );
      post.position.y = 5;
      post.castShadow = true;
      pylon.add(post);
      const bolt = createNeonStrip(0.16, 7.5, 0xffe45e);
      bolt.rotation.z = Math.PI / 2;
      bolt.rotation.y = Math.PI / 2;
      bolt.position.y = 7 + Math.random() * 2;
      pylon.add(bolt);
      const side = i % 2 === 0 ? -1 : 1;
      pylon.position.set(side * (10 + Math.random() * 4), 0, -70 + (i >> 1) * 11);
      scene.add(pylon);
      world.buildings.push(pylon);
    }
    for (let i = 0; i < 9; i += 1) {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(11, 0.14, 8, 40, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0x0e1a28, emissive: 0xffe45e, emissiveIntensity: 0.55, metalness: 0.4 })
      );
      arc.position.set(0, 0.2, -62 + i * 15);
      scene.add(arc);
      world.buildings.push(arc);
    }
    for (let i = 0; i < 30; i += 1) {
      const tower = createFuturisticTower(i + 300, false);
      const ring = 44 + Math.random() * 62;
      const ang = Math.random() * Math.PI * 2;
      tower.position.set(Math.cos(ang) * ring, 0, Math.sin(ang) * ring);
      scene.add(tower);
      world.buildings.push(tower);
    }
  }

  function createDefiDistrict() {
    for (let i = 0; i < 34; i += 1) {
      const tower = createFuturisticTower(i + 500, false);
      const ring = 36 + Math.random() * 66;
      const ang = Math.random() * Math.PI * 2;
      tower.position.set(Math.cos(ang) * ring, 0, Math.sin(ang) * ring);
      scene.add(tower);
      world.buildings.push(tower);
    }
    for (let i = 0; i < 22; i += 1) {
      const up = Math.random() > 0.42;
      const h = 1.5 + Math.random() * 6.5;
      const candle = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, h, 0.9),
        new THREE.MeshStandardMaterial({
          color: up ? 0x0f2f1f : 0x2f0f16,
          emissive: up ? 0x14f195 : 0xff4d6d,
          emissiveIntensity: 0.45,
          transparent: true,
          opacity: 0.85
        })
      );
      candle.position.set(-21 + i * 2, h / 2 + 0.05, -26);
      candle.castShadow = true;
      scene.add(candle);
      world.buildings.push(candle);
    }
    const dexDome = new THREE.Mesh(
      new THREE.SphereGeometry(7, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x0d2530, emissive: 0x5df2ff, emissiveIntensity: 0.22, metalness: 0.3, roughness: 0.25 })
    );
    dexDome.position.set(0, 0.06, 0);
    dexDome.castShadow = true;
    scene.add(dexDome);
    world.buildings.push(dexDome);
    const dexRing = new THREE.Mesh(
      new THREE.TorusGeometry(9.5, 0.12, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x5df2ff, transparent: true, opacity: 0.6 })
    );
    dexRing.rotation.x = Math.PI / 2;
    dexRing.position.y = 3.4;
    scene.add(dexRing);
    world.buildings.push(dexRing);
  }

  function createHalvingVault() {
    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(6.5, 6.5, 0.9, 48),
      new THREE.MeshStandardMaterial({ color: 0xf7931a, emissive: 0xf7931a, emissiveIntensity: 0.28, metalness: 0.85, roughness: 0.22 })
    );
    coin.rotation.z = Math.PI / 2;
    coin.position.set(0, 7.5, -30);
    coin.castShadow = true;
    scene.add(coin);
    world.buildings.push(coin);

    for (let ringIdx = 0; ringIdx < 3; ringIdx += 1) {
      const radius = 20 + ringIdx * 16;
      const segments = 10 + ringIdx * 4;
      for (let i = 0; i < segments; i += 1) {
        const ang = (i / segments) * Math.PI * 2;
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(6, 3 + ringIdx, 1),
          new THREE.MeshStandardMaterial({ color: 0x241a10, metalness: 0.5, roughness: 0.4, emissive: 0xf7931a, emissiveIntensity: 0.08 })
        );
        wall.position.set(Math.cos(ang) * radius, 1.6, Math.sin(ang) * radius);
        wall.rotation.y = -ang + Math.PI / 2;
        wall.castShadow = true;
        scene.add(wall);
        world.buildings.push(wall);
      }
    }
    for (let i = 0; i < 16; i += 1) {
      const crystal = new THREE.Mesh(
        new THREE.ConeGeometry(0.6 + Math.random() * 0.8, 2.5 + Math.random() * 3.5, 6),
        new THREE.MeshStandardMaterial({ color: 0xf7931a, emissive: 0xffb347, emissiveIntensity: 0.35 })
      );
      crystal.position.set((Math.random() - 0.5) * 70, 1.2, (Math.random() - 0.5) * 70);
      crystal.castShadow = true;
      scene.add(crystal);
      world.buildings.push(crystal);
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
        explosion: () => tone(70, 0.3, "sawtooth", 0.055, 35),
        buy: () => {
          tone(660, 0.08, "sine", 0.035, 990);
          window.setTimeout(() => tone(880, 0.08, "sine", 0.03, 1320), 70);
          window.setTimeout(() => tone(1170, 0.1, "triangle", 0.026, 1560), 140);
        },
        levelup: () => {
          tone(392, 0.16, "triangle", 0.035, 784);
          window.setTimeout(() => tone(523, 0.16, "triangle", 0.032, 1046), 110);
          window.setTimeout(() => tone(784, 0.22, "sine", 0.038, 1568), 220);
        },
        boss: () => {
          tone(92, 0.38, "sawtooth", 0.05, 46);
          window.setTimeout(() => tone(138, 0.28, "square", 0.035, 69), 180);
        },
        pickup: () => {
          tone(1040, 0.07, "sine", 0.03, 1560);
          window.setTimeout(() => tone(1320, 0.08, "sine", 0.026, 1760), 60);
        }
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
    audio.play("boss");
    addCameraShake(0.3);
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
      createPickupBurst(lootObj.position, 0xffd166, 18);
      audio.play("pickup");
    } else if (loot.type === "fragment") {
      const total = CryptoApex.economy.addFragment(loot.fragmentKey, loot.amount);
      toast(`${loot.name}: ${total}`);
      tryFuseWeapon(loot.fragmentKey);
      createPickupBurst(lootObj.position, CryptoApex.economy.rarityColors[loot.rarity] || 0x5df2ff, loot.rarity === "Raro" || loot.rarity === "Lendario" ? 28 : 16);
      audio.play(loot.rarity === "Raro" || loot.rarity === "Lendario" ? "pickup" : "coin");
    } else if (loot.type === "weapon") {
      world.player.unlockWeapon(loot.weaponKey);
      CryptoApex.economy.addItem(loot);
      createPickupBurst(lootObj.position, 0x7b8cff, 26);
    } else if (loot.type === "emblema") {
      CryptoApex.economy.addCred(loot.amount || 0, "boss final");
      CryptoApex.economy.addItem(loot);
      createPickupBurst(lootObj.position, 0xffd166, 32);
    } else {
      CryptoApex.economy.addItem(loot);
      createPickupBurst(lootObj.position, 0x5df2ff, 18);
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
    updateSkyObjects(dt);
    world.phase = CryptoApex.missions.currentPhase();
    world.difficulty = 1 + CryptoApex.missions.state.totalTime / 1200;
    CryptoApex.missions.update(dt, world);
    CryptoApex.economy.updateStoreEffects(dt, world);
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
    updatePlayerAura(dt);
    updateTransient(dt);
    handleInteraction();
    updateRadar();
    updateHUD();
    saveTimer += dt;
    if (saveTimer >= 3) {
      saveTimer = 0;
      CryptoApex.economy.saveGame(world);
    }
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

  function ensurePlayerAura() {
    if (world.playerAura) return world.playerAura;
    const aura = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x14f195, transparent: true, opacity: 0.42, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.025, 10, 48), ringMat);
    ring.rotation.x = Math.PI / 2;
    aura.add(ring);
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.16, 24, 14),
      new THREE.MeshBasicMaterial({ color: 0x5df2ff, transparent: true, opacity: 0.08, wireframe: true })
    );
    aura.add(halo);
    aura.visible = false;
    scene.add(aura);
    world.playerAura = aura;
    return aura;
  }

  function updatePlayerAura(dt) {
    if (!world.player) return;
    const active = CryptoApex.economy.isBoostActive("shield") ||
      CryptoApex.economy.isBoostActive("speed") ||
      CryptoApex.economy.isBoostActive("regen") ||
      CryptoApex.economy.isBoostActive("infiniteAmmo");
    const aura = ensurePlayerAura();
    aura.visible = active;
    if (!active) return;
    aura.position.copy(world.player.group.position).add(new THREE.Vector3(0, 1.02, 0));
    aura.rotation.y += dt * 1.8;
    aura.rotation.z += dt * 0.8;
    const speed = CryptoApex.economy.isBoostActive("speed");
    const shield = CryptoApex.economy.isBoostActive("shield");
    aura.children.forEach((child) => {
      if (child.material) {
        child.material.color.setHex(speed ? 0xffd166 : shield ? 0x5df2ff : 0x14f195);
        child.material.opacity = child.geometry.type === "SphereGeometry" ? 0.08 : 0.36 + Math.sin(world.elapsed * 5) * 0.08;
      }
    });
  }

  function updateSkyObjects(dt) {
    world.skyObjects.forEach((obj, index) => {
      obj.rotation.y += dt * (0.01 + index * 0.0008);
      if (obj.material && "opacity" in obj.material && obj.type === "Points") {
        obj.material.opacity = 0.48 + Math.sin(world.elapsed * 0.5) * 0.12;
      }
    });
  }

  function createPickupBurst(position, color, count) {
    for (let i = 0; i < count; i += 1) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.045 + Math.random() * 0.045, 8, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
      );
      particle.position.copy(position).add(new THREE.Vector3(0, 0.55, 0));
      particle.userData.life = 0.65 + Math.random() * 0.35;
      particle.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3.6,
        1.4 + Math.random() * 2.2,
        (Math.random() - 0.5) * 3.6
      );
      scene.add(particle);
    }
  }

  function updateTransient(dt) {
    scene.children.slice().forEach((obj) => {
      if (obj.userData && typeof obj.userData.life === "number" && !world.turrets.includes(obj) && !world.traps.includes(obj) && !world.shields.includes(obj)) {
        obj.userData.life -= dt;
        if (obj.userData.velocity) obj.position.addScaledVector(obj.userData.velocity, dt);
        if (obj.material && "opacity" in obj.material) obj.material.opacity = Math.max(0, obj.userData.life * 7);
        if (obj.userData.life <= 0) scene.remove(obj);
      }
    });
  }

  function updateRadar() {
    const disc = document.getElementById("radar-disc");
    if (!disc || !world.player) return;
    const playerPos = world.player.group.position;
    const rotation = world.player.group.rotation.y;
    disc.style.setProperty("--radar-rotation", `${-rotation}rad`);
    disc.querySelectorAll(".radar-blip").forEach((node) => node.remove());
    world.enemies.slice(0, 16).forEach((enemy) => {
      const rel = enemy.group.position.clone().sub(playerPos);
      const cos = Math.cos(-rotation);
      const sin = Math.sin(-rotation);
      const x = THREE.MathUtils.clamp((rel.x * cos - rel.z * sin) * 0.72, -42, 42);
      const y = THREE.MathUtils.clamp((rel.x * sin + rel.z * cos) * 0.72, -42, 42);
      const blip = document.createElement("i");
      blip.className = enemy.classKey.includes("boss") ? "radar-blip boss" : "radar-blip";
      blip.style.transform = `translate(${x}px, ${y}px)`;
      disc.appendChild(blip);
    });
    world.loots.slice(0, 8).forEach((loot) => {
      const rel = loot.position.clone().sub(playerPos);
      const cos = Math.cos(-rotation);
      const sin = Math.sin(-rotation);
      const x = THREE.MathUtils.clamp((rel.x * cos - rel.z * sin) * 0.72, -42, 42);
      const y = THREE.MathUtils.clamp((rel.x * sin + rel.z * cos) * 0.72, -42, 42);
      const blip = document.createElement("i");
      blip.className = "radar-blip loot";
      blip.style.transform = `translate(${x}px, ${y}px)`;
      disc.appendChild(blip);
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
      } else if (pos.distanceTo(new THREE.Vector3(-4, 0, -6)) < 4) {
        openCrafting();
        toast("Estação de crafting aberta.");
      } else if (pos.distanceTo(new THREE.Vector3(11, 0, 4)) < 4) {
        openStore();
        toast("Loja PIXC aberta.");
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
    audio.play("levelup");
    showPhaseComplete(oldPhase, phase);
    CryptoApex.economy.saveGame(world);
    toast(phase.name);
  }

  function respawn() {
    world.player.health = world.player.maxHealth;
    world.player.shield = 35;
    world.player.group.position.set(0, 0, 8);
    if (CryptoApex.economy.consumeRevive()) {
      toast("Reviver Instantâneo usado. CRED protegido.");
    } else {
      CryptoApex.economy.spendCred(Math.min(50, CryptoApex.economy.state.cred));
      toast("Você foi reimplantado. Parte do CRED foi queimada.");
    }
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
    document.getElementById("cred").textContent = `${CryptoApex.economy.state.cred} | ${CryptoApex.nft.formatPixcBalance()} PIXC`;
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
    if (CryptoApex.nft.state.connected) CryptoApex.nft.refreshPixcBalance().catch(() => {});
    renderStore();
    renderCrafting();
    renderMarketplace();
    renderLeaderboard();
    if (started && CryptoApex.nft.state.connected) restoreCurrentSave(false);
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
    if (CryptoApex.campaign?.dialogue) {
      CryptoApex.campaign.dialogue(speaker, text);
      return;
    }
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
