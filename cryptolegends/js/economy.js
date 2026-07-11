(function () {
  const rarityColors = {
    Comum: 0x98f5d4,
    Incomum: 0x5df2ff,
    Raro: 0x7b8cff,
    Epico: 0xff6ac1,
    Lendario: 0xffd166
  };

  const storeCatalog = [
    {
      key: "health-kit",
      name: "Kit de Vida",
      pricePixc: 2,
      rarity: "Comum",
      effect: "Restaura 100% da vida."
    },
    {
      key: "reinforced-shield",
      name: "Escudo Reforçado",
      pricePixc: 5,
      rarity: "Incomum",
      effect: "+50 escudo por 3 minutos."
    },
    {
      key: "infinite-ammo",
      name: "Munição Infinita",
      pricePixc: 3,
      rarity: "Raro",
      effect: "Munição ilimitada por 2 minutos."
    },
    {
      key: "speed-boost",
      name: "Velocidade Boost",
      pricePixc: 1.5,
      rarity: "Comum",
      effect: "+50% velocidade por 1 minuto."
    },
    {
      key: "instant-revive",
      name: "Reviver Instantâneo",
      pricePixc: 10,
      rarity: "Epico",
      effect: "Evita perda de CRED ao morrer. 1 uso."
    },
    {
      key: "portable-turret",
      name: "Turret Portátil",
      pricePixc: 8,
      rarity: "Raro",
      effect: "Deploy imediato de uma turret extra."
    },
    {
      key: "regenerative-heal",
      name: "Cura Regenerativa",
      pricePixc: 4,
      rarity: "Incomum",
      effect: "+2 vida por segundo por 5 minutos."
    },
    {
      key: "golden-skin",
      name: "Skin Dourada",
      pricePixc: 20,
      rarity: "Lendario",
      effect: "Skin permanente para o personagem."
    },
    {
      key: "legendary-weapon",
      name: "Arma Lendária",
      pricePixc: 50,
      rarity: "Lendario",
      effect: "Desbloqueia arma especial permanente."
    },
    {
      key: "validator-drone",
      name: "Drone Validador Solana",
      pricePixc: 6.5,
      rarity: "Raro",
      effect: "+2 minutos de velocidade e item NFT de rota Solana."
    },
    {
      key: "seed-vault-pass",
      name: "Passe Cofre de Seed",
      pricePixc: 9,
      rarity: "Epico",
      effect: "+70 escudo permanente e item NFT de autocustódia."
    },
    {
      key: "merchant-kit",
      name: "Kit Lojista WordFinance Pay",
      pricePixc: 12,
      rarity: "Epico",
      effect: "+500 CRED, 1 reviver e licença NFT de lojista."
    },
    {
      key: "season-pass-ark",
      name: "Passe Arca da Soberania",
      pricePixc: 25,
      rarity: "Lendario",
      effect: "Bônus de temporada: regen, munição infinita e item raro NFT."
    }
  ];

  const craftRecipes = [
    {
      key: "epic-shield",
      name: "Escudo Épico",
      rarity: "Epico",
      fragmentKey: "rifle",
      fragmentLabel: "fragmentos comuns",
      fragmentCost: 5,
      pricePixc: 3,
      effect: "Cria um módulo NFT de escudo e libera +35 escudo permanente."
    },
    {
      key: "pow-shotgun-core",
      name: "Núcleo Proof-of-Work",
      rarity: "Raro",
      fragmentKey: "shotgun",
      fragmentLabel: "peças de escopeta",
      fragmentCost: 4,
      pricePixc: 4,
      effect: "Funde peças para desbloquear a Escopeta Proof-of-Work."
    },
    {
      key: "lightning-accelerator",
      name: "Acelerador Lightning",
      rarity: "Raro",
      fragmentKey: "smg",
      fragmentLabel: "fragmentos Lightning",
      fragmentCost: 4,
      pricePixc: 2.5,
      effect: "Libera a SMG Lightning Network e melhora mobilidade."
    },
    {
      key: "sovereign-vault",
      name: "Cofre Soberano",
      rarity: "Lendario",
      fragmentKey: "revolver",
      fragmentLabel: "fragmentos Cold Wallet",
      fragmentCost: 3,
      pricePixc: 6,
      effect: "Cria item NFT pendente que representa autocustódia."
    }
  ];

  const MARKET_KEY = "cryptoLegends.market.v3";
  const SAVE_PREFIX = "cryptoLegends.save.v3.";
  const LEADERBOARD_KEY = "cryptoLegends.leaderboard.v3";

  const state = {
    cred: 0,
    lifetimeCred: 0,
    inventory: [],
    fragments: {},
    decorations: [],
    badges: [],
    pendingMints: [],
    minted: [],
    storePurchases: [],
    crafted: [],
    marketSales: [],
    bossVouchers: [],
    activeBoosts: {},
    reviveCharges: 0,
    goldenSkin: false,
    legendaryWeapon: false,
    permanentShieldBonus: 0,
    house: { rooms: 1, items: [] }
  };

  function addCred(amount, source, quiet) {
    state.cred += amount;
    state.lifetimeCred += amount;
    if (!quiet) window.CryptoApex?.ui?.toast?.(`+${amount} CRED${source ? " - " + source : ""}`);
    checkBadges();
  }

  function spendCred(amount) {
    if (state.cred < amount) return false;
    state.cred -= amount;
    return true;
  }

  function addFragment(key, amount) {
    state.fragments[key] = (state.fragments[key] || 0) + amount;
    return state.fragments[key];
  }

  function addItem(item) {
    const full = {
      id: `${item.type || "item"}-${Date.now()}-${Math.floor(Math.random() * 99999)}`,
      minted: false,
      queued: false,
      acquiredAt: new Date().toISOString(),
      ...item
    };
    state.inventory.unshift(full);
    if (full.nft) queueMint(full);
    window.CryptoApex?.ui?.renderInventory?.();
    return full;
  }

  function queueMint(item) {
    if (item.queued || item.minted) return;
    item.queued = true;
    state.pendingMints.unshift(item);
    window.CryptoApex?.ui?.toast?.(`NFT pendente: ${item.name}`);
    if (window.CryptoApex?.nft?.autoMintEnabled()) {
      window.CryptoApex.nft.mintNextPending().catch(() => {});
    }
  }

  function markMinted(itemId, signature, mintAddress) {
    const item = state.inventory.find((entry) => entry.id === itemId) ||
      state.pendingMints.find((entry) => entry.id === itemId);
    if (item) {
      item.minted = true;
      item.signature = signature;
      item.mintAddress = mintAddress || null;
      item.queued = false;
      state.minted.unshift(item);
    }
    state.pendingMints = state.pendingMints.filter((entry) => entry.id !== itemId);
    window.CryptoApex?.ui?.renderInventory?.();
  }

  function checkBadges() {
    if (state.lifetimeCred >= 10000 && !state.badges.includes("Primeiro Milhão de Satoshis")) {
      state.badges.push("Primeiro Milhão de Satoshis");
      addItem({
        type: "emblema",
        name: "Primeiro Milhão de Satoshis",
        rarity: "Epico",
        nft: true,
        lesson: "Acumular valor exige tempo, escassez e disciplina."
      });
    }
  }

  function buyDecoration(kind) {
    const catalog = {
      miningDesk: { name: "Mesa de Mineração", cost: 120, rarity: "Incomum" },
      holoSofa: { name: "Sofá Holográfico", cost: 160, rarity: "Raro" },
      bitcoinVault: { name: "Cofre Bitcoin", cost: 260, rarity: "Epico" }
    };
    const entry = catalog[kind];
    if (!entry || !spendCred(entry.cost)) return false;
    state.house.items.push(kind);
    state.decorations.push(entry.name);
    addItem({
      type: "decoracao",
      name: entry.name,
      rarity: entry.rarity,
      nft: true,
      lesson: "Propriedade digital pode representar itens úteis em um mundo persistente."
    });
    return true;
  }

  function expandHouse() {
    const cost = state.house.rooms * 250;
    if (!spendCred(cost)) return false;
    state.house.rooms += 1;
    addItem({
      type: "casa",
      name: `Cômodo NFT ${state.house.rooms}`,
      rarity: state.house.rooms >= 4 ? "Epico" : "Raro",
      nft: true,
      lesson: "Cada expansão da casa é registrada como evolução da propriedade."
    });
    return true;
  }

  function nowSeconds() {
    return Date.now() / 1000;
  }

  function setBoost(key, seconds) {
    const until = nowSeconds() + seconds;
    state.activeBoosts[key] = Math.max(state.activeBoosts[key] || 0, until);
    return state.activeBoosts[key];
  }

  function isBoostActive(key) {
    return (state.activeBoosts[key] || 0) > nowSeconds();
  }

  function boostRemaining(key) {
    return Math.max(0, Math.ceil((state.activeBoosts[key] || 0) - nowSeconds()));
  }

  function hasInfiniteAmmo() {
    return isBoostActive("infiniteAmmo");
  }

  function speedMultiplier() {
    return isBoostActive("speed") ? 1.5 : 1;
  }

  function consumeRevive() {
    if (state.reviveCharges <= 0) return false;
    state.reviveCharges -= 1;
    window.CryptoApex?.ui?.renderStore?.();
    return true;
  }

  function applyGoldenSkin(player) {
    if (!player || player.group.userData.goldApplied) return;
    player.group.userData.goldApplied = true;
    player.group.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      obj.material = obj.material.clone();
      if (obj.material.color) obj.material.color.lerp(new THREE.Color(0xffd166), 0.42);
      if ("emissive" in obj.material) {
        obj.material.emissive = new THREE.Color(0x8a5a00);
        obj.material.emissiveIntensity = Math.max(obj.material.emissiveIntensity || 0, 0.16);
      }
      obj.material.metalness = Math.max(obj.material.metalness || 0, 0.28);
    });
  }

  function deployPortableTurret(world) {
    if (!world?.player || !window.THREE) return false;
    const group = new THREE.Group();
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x22313a, metalness: 0.36, roughness: 0.34 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffd166, emissiveIntensity: 0.56 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.62, 0.24, 18), baseMat);
    base.castShadow = true;
    group.add(base);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 12), glowMat);
    core.position.y = 0.4;
    core.castShadow = true;
    group.add(core);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, 0.9, 10), glowMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.42, -0.58);
    group.add(barrel);
    group.position.copy(world.player.group.position).add(world.cameraForward.clone().multiplyScalar(2.2));
    group.position.y = 0.16;
    group.userData.life = 22;
    group.userData.cooldown = 0;
    world.scene.add(group);
    world.turrets.push(group);
    return true;
  }

  function addPurchasedInventory(item, receipt) {
    state.storePurchases.unshift({
      key: item.key,
      name: item.name,
      pricePixc: item.pricePixc,
      signature: receipt?.signature || null,
      acquiredAt: new Date().toISOString()
    });
    if (item.key === "golden-skin" || item.key === "legendary-weapon") {
      addItem({
        type: item.key === "golden-skin" ? "skin" : "arma",
        weaponKey: item.key === "legendary-weapon" ? "defi" : undefined,
        name: item.name,
        rarity: item.rarity,
        nft: true,
        lesson: "Itens comprados com PIXC ficam pendentes para mint manual, preservando a escolha do jogador."
      });
    }
  }

  function applyStorePurchase(itemKey, receipt) {
    const item = storeCatalog.find((entry) => entry.key === itemKey);
    const world = window.__CryptoApexWorld;
    const player = world?.player;
    if (!item || !player) return false;

    if (item.key === "health-kit") {
      player.health = player.maxHealth;
    } else if (item.key === "reinforced-shield") {
      setBoost("shield", 180);
      player.maxShield = Math.max(player.maxShield, player.baseMaxShield + 50);
      player.shield = player.maxShield;
    } else if (item.key === "infinite-ammo") {
      setBoost("infiniteAmmo", 120);
    } else if (item.key === "speed-boost") {
      setBoost("speed", 60);
    } else if (item.key === "instant-revive") {
      state.reviveCharges += 1;
    } else if (item.key === "portable-turret") {
      deployPortableTurret(world);
    } else if (item.key === "regenerative-heal") {
      setBoost("regen", 300);
    } else if (item.key === "golden-skin") {
      state.goldenSkin = true;
      applyGoldenSkin(player);
    } else if (item.key === "legendary-weapon") {
      state.legendaryWeapon = true;
      player.unlockWeapon?.("defi");
    } else if (item.key === "validator-drone") {
      setBoost("speed", 120);
      addItem({
        type: "drone",
        name: item.name,
        rarity: item.rarity,
        nft: true,
        pixcSignature: receipt?.signature || null,
        lesson: "Validadores independentes mantêm a rede sincronizada. Velocidade só vale quando a regra é verificável."
      });
    } else if (item.key === "seed-vault-pass") {
      state.permanentShieldBonus = Math.max(state.permanentShieldBonus, 70);
      player.baseMaxShield = Math.max(player.baseMaxShield, 90 + state.permanentShieldBonus);
      player.maxShield = Math.max(player.maxShield, player.baseMaxShield);
      player.shield = player.maxShield;
      addItem({
        type: "cofre",
        name: item.name,
        rarity: item.rarity,
        nft: true,
        pixcSignature: receipt?.signature || null,
        lesson: "Autocustódia começa na seed. Quem protege a chave protege a própria liberdade financeira."
      });
    } else if (item.key === "merchant-kit") {
      state.reviveCharges += 1;
      addCred(500, "kit lojista WordFinance Pay");
      addItem({
        type: "licenca",
        name: item.name,
        rarity: item.rarity,
        nft: true,
        pixcSignature: receipt?.signature || null,
        lesson: "WordFinance Pay permite ao lojista receber cripto direto na carteira, com menos intermediários e mais controle."
      });
    } else if (item.key === "season-pass-ark") {
      setBoost("regen", 420);
      setBoost("infiniteAmmo", 180);
      addItem({
        type: "passe",
        name: item.name,
        rarity: item.rarity,
        nft: true,
        pixcSignature: receipt?.signature || null,
        lesson: "Passe de temporada cria progressão recorrente: missões, coleções e recompensas cosméticas sem prometer rendimento."
      });
    }

    addPurchasedInventory(item, receipt);
    window.CryptoApex?.ui?.renderStore?.();
    window.CryptoApex?.ui?.updateHUD?.();
    return true;
  }

  function updateStoreEffects(dt, world) {
    const player = world?.player;
    if (!player) return;
    if (state.goldenSkin) applyGoldenSkin(player);
    if (state.permanentShieldBonus > 0) {
      player.baseMaxShield = Math.max(player.baseMaxShield, 90 + state.permanentShieldBonus);
      player.maxShield = Math.max(player.maxShield, player.baseMaxShield);
    }
    if (isBoostActive("shield")) {
      player.maxShield = Math.max(player.maxShield, player.baseMaxShield + 50);
    } else if (player.maxShield > player.baseMaxShield) {
      player.maxShield = player.baseMaxShield;
      player.shield = Math.min(player.shield, player.maxShield);
    }
    if (isBoostActive("regen")) {
      player.health = Math.min(player.maxHealth, player.health + dt * 2);
    }
  }

  function canCraft(recipeKey) {
    const recipe = craftRecipes.find((entry) => entry.key === recipeKey);
    if (!recipe) return { ok: false, reason: "Receita não encontrada." };
    const owned = state.fragments[recipe.fragmentKey] || 0;
    if (owned < recipe.fragmentCost) {
      return { ok: false, reason: `Faltam ${recipe.fragmentCost - owned} fragmentos.` };
    }
    return { ok: true, recipe };
  }

  function applyCraftRecipe(recipeKey, receipt) {
    const check = canCraft(recipeKey);
    if (!check.ok) {
      window.CryptoApex?.ui?.toast?.(check.reason);
      return false;
    }
    const recipe = check.recipe;
    state.fragments[recipe.fragmentKey] -= recipe.fragmentCost;
    state.crafted.unshift({
      key: recipe.key,
      name: recipe.name,
      signature: receipt?.signature || null,
      pricePixc: recipe.pricePixc,
      at: new Date().toISOString()
    });
    if (recipe.key === "epic-shield") {
      state.permanentShieldBonus = Math.max(state.permanentShieldBonus, 35);
      if (window.__CryptoApexWorld?.player) {
        const player = window.__CryptoApexWorld.player;
        player.baseMaxShield = Math.max(player.baseMaxShield, 90 + state.permanentShieldBonus);
        player.maxShield = Math.max(player.maxShield, player.baseMaxShield);
        player.shield = player.maxShield;
      }
    } else if (recipe.key === "pow-shotgun-core") {
      window.__CryptoApexWorld?.player?.unlockWeapon?.("shotgun");
    } else if (recipe.key === "lightning-accelerator") {
      window.__CryptoApexWorld?.player?.unlockWeapon?.("smg");
      setBoost("speed", 60);
    }
    addItem({
      type: "craft",
      weaponKey: recipe.key === "pow-shotgun-core" ? "shotgun" : recipe.key === "lightning-accelerator" ? "smg" : undefined,
      name: recipe.name,
      rarity: recipe.rarity,
      nft: true,
      pixcSignature: receipt?.signature || null,
      pixcReceipt: receipt || null,
      lesson: "Crafting une trabalho coletado no jogo com PIXC on-chain, criando um item escasso e rastreável."
    });
    window.CryptoApex?.ui?.toast?.(`Craft concluído: ${recipe.name}`);
    window.CryptoApex?.ui?.renderCrafting?.();
    window.CryptoApex?.ui?.renderInventory?.();
    window.CryptoApex?.ui?.flashGold?.();
    window.__CryptoApexWorld?.audio?.play?.("buy");
    return true;
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function walletId() {
    return window.CryptoApex?.nft?.state?.publicKeyString ||
      window.CryptoApex?.nft?.state?.publicKey?.toString?.() ||
      "local-player";
  }

  function saveKeyForWallet(id) {
    return `${SAVE_PREFIX}${id || walletId()}`;
  }

  function saveScore(data) {
    return Number(data?.economy?.lifetimeCred || 0) +
      Number(data?.missions?.phaseIndex || 0) * 10000 +
      Number(data?.economy?.inventory?.length || 0) * 10;
  }

  function getMarketplaceListings() {
    return readJson(MARKET_KEY, []).filter((entry) => !entry.sold);
  }

  function saveMarketplaceListings(listings) {
    writeJson(MARKET_KEY, listings);
    window.CryptoApex?.ui?.renderMarketplace?.();
  }

  function listMarketItem(itemId, pricePixc) {
    const seller = walletId();
    if (!window.CryptoApex?.nft?.state?.connected || seller === "local-player") {
      window.CryptoApex?.ui?.toast?.("Conecte uma carteira para listar no mercado P2P.");
      return false;
    }
    const item = state.inventory.find((entry) => entry.id === itemId);
    const price = Number(pricePixc);
    if (!item || !Number.isFinite(price) || price <= 0) {
      window.CryptoApex?.ui?.toast?.("Item ou preço inválido.");
      return false;
    }
    const listings = getMarketplaceListings();
    const listing = {
      id: `listing-${Date.now()}-${Math.floor(Math.random() * 99999)}`,
      seller,
      sellerShort: `${seller.slice(0, 4)}...${seller.slice(-4)}`,
      pricePixc: Math.round(price * 100) / 100,
      item: {
        id: item.id,
        type: item.type,
        name: item.name,
        rarity: item.rarity || "Comum",
        weaponKey: item.weaponKey || null,
        nft: Boolean(item.nft)
      },
      createdAt: new Date().toISOString()
    };
    listings.unshift(listing);
    saveMarketplaceListings(listings);
    window.CryptoApex?.ui?.toast?.(`Listado: ${item.name}`);
    return listing;
  }

  function completeMarketPurchase(listingId, receipt) {
    const listings = readJson(MARKET_KEY, []);
    const listing = listings.find((entry) => entry.id === listingId && !entry.sold);
    if (!listing) return null;
    listing.sold = true;
    listing.buyer = walletId();
    listing.signature = receipt?.signature || null;
    listing.soldAt = new Date().toISOString();
    writeJson(MARKET_KEY, listings);
    state.marketSales.unshift(listing);
    const boughtItem = { ...listing.item };
    delete boughtItem.id;
    addItem({
      ...boughtItem,
      nft: true,
      marketSignature: receipt?.signature || null,
      marketReceipt: receipt || null,
      lesson: "Mercados P2P permitem que jogadores negociem propriedade digital sem loja centralizada."
    });
    window.CryptoApex?.ui?.toast?.(`Compra P2P confirmada: ${listing.item.name}`);
    window.CryptoApex?.ui?.renderMarketplace?.();
    window.CryptoApex?.ui?.renderInventory?.();
    window.CryptoApex?.ui?.flashGold?.();
    window.__CryptoApexWorld?.audio?.play?.("buy");
    return listing;
  }

  function addBossVoucher(classKey) {
    const label = classKey === "finalBoss" ? "Senador" : "Tesoureiro";
    const voucher = addItem({
      type: "voucher",
      name: `Vale 0.50 PIXC - ${label}`,
      rarity: classKey === "finalBoss" ? "Lendario" : "Epico",
      nft: true,
      amountPixc: 0.5,
      redeemStatus: "backend-pendente",
      lesson: "O escrow não assina no navegador. Este vale registra a recompensa para validação futura via backend."
    });
    state.bossVouchers.unshift(voucher);
    window.CryptoApex?.ui?.toast?.("Voucher PIXC pendente: 0.50 PIXC");
    return voucher;
  }

  function updateLeaderboard(world) {
    const id = walletId();
    const hero = world?.player?.heroKey || "satoshi";
    const rows = readJson(LEADERBOARD_KEY, []);
    const existing = rows.find((entry) => entry.id === id);
    const score = state.lifetimeCred;
    if (existing) {
      existing.score = Math.max(existing.score || 0, score);
      existing.hero = hero;
      existing.updatedAt = new Date().toISOString();
    } else {
      rows.push({
        id,
        name: id === "local-player" ? "Jogador Local" : `${id.slice(0, 4)}...${id.slice(-4)}`,
        hero,
        score,
        updatedAt: new Date().toISOString()
      });
    }
    rows.sort((a, b) => b.score - a.score);
    writeJson(LEADERBOARD_KEY, rows.slice(0, 20));
    window.CryptoApex?.ui?.renderLeaderboard?.();
  }

  function getLeaderboard() {
    const rows = readJson(LEADERBOARD_KEY, []);
    rows.sort((a, b) => b.score - a.score);
    return rows.slice(0, 10);
  }

  function makeSavePayload(world) {
    const player = world?.player;
    return {
      version: 3,
      wallet: walletId(),
      savedAt: new Date().toISOString(),
      missions: {
        phaseIndex: window.CryptoApex?.missions?.state?.phaseIndex || 0,
        phaseTime: window.CryptoApex?.missions?.state?.phaseTime || 0,
        totalTime: window.CryptoApex?.missions?.state?.totalTime || 0,
        bossSpawned: Boolean(window.CryptoApex?.missions?.state?.bossSpawned),
        phaseBossDefeated: Boolean(window.CryptoApex?.missions?.state?.phaseBossDefeated),
        finalBossDefeated: Boolean(window.CryptoApex?.missions?.state?.finalBossDefeated),
        megaBossDefeated: Boolean(window.CryptoApex?.missions?.state?.megaBossDefeated),
        phaseKills: window.CryptoApex?.missions?.state?.phaseKills || 0,
        seasonCompletions: window.CryptoApex?.missions?.state?.seasonCompletions || 0,
        lessonSeen: window.CryptoApex?.missions?.state?.lessonSeen || {}
      },
      economy: {
        cred: state.cred,
        lifetimeCred: state.lifetimeCred,
        inventory: state.inventory.slice(0, 60),
        fragments: state.fragments,
        pendingMints: state.pendingMints.slice(0, 60),
        minted: state.minted.slice(0, 30),
        house: state.house,
        goldenSkin: state.goldenSkin,
        legendaryWeapon: state.legendaryWeapon,
        permanentShieldBonus: state.permanentShieldBonus,
        reviveCharges: state.reviveCharges,
        crafted: state.crafted.slice(0, 30),
        bossVouchers: state.bossVouchers.slice(0, 20)
      },
      player: player ? {
        heroKey: player.heroKey,
        unlockedWeapons: player.unlockedWeapons,
        weaponIndex: player.weaponIndex,
        doubleJump: player.doubleJump
      } : null
    };
  }

  function saveGame(world) {
    const payload = makeSavePayload(world);
    writeJson(saveKeyForWallet(payload.wallet), payload);
    updateLeaderboard(world);
    return payload;
  }

  function loadGameData(id) {
    return readJson(saveKeyForWallet(id), null);
  }

  function migrateLocalSaveToWallet(id = walletId()) {
    if (!id || id === "local-player") return false;
    const walletData = loadGameData(id);
    const localData = loadGameData("local-player");
    if (!localData || localData.version !== 3) return false;
    if (walletData && walletData.version === 3 && saveScore(walletData) >= saveScore(localData)) return false;
    const migrated = { ...localData, wallet: id, migratedFrom: "local-player", migratedAt: new Date().toISOString() };
    writeJson(saveKeyForWallet(id), migrated);
    return true;
  }

  function restoreGame(world, id) {
    const targetId = id || walletId();
    migrateLocalSaveToWallet(targetId);
    const data = loadGameData(targetId);
    if (!data || data.version !== 3) return false;
    const eco = data.economy || {};
    state.cred = Number(eco.cred || 0);
    state.lifetimeCred = Number(eco.lifetimeCred || 0);
    state.inventory = Array.isArray(eco.inventory) ? eco.inventory : [];
    state.fragments = eco.fragments || {};
    state.pendingMints = Array.isArray(eco.pendingMints) ? eco.pendingMints : [];
    state.minted = Array.isArray(eco.minted) ? eco.minted : [];
    state.house = eco.house || { rooms: 1, items: [] };
    state.goldenSkin = Boolean(eco.goldenSkin);
    state.legendaryWeapon = Boolean(eco.legendaryWeapon);
    state.permanentShieldBonus = Number(eco.permanentShieldBonus || 0);
    state.reviveCharges = Number(eco.reviveCharges || 0);
    state.crafted = Array.isArray(eco.crafted) ? eco.crafted : [];
    state.bossVouchers = Array.isArray(eco.bossVouchers) ? eco.bossVouchers : [];
    if (window.CryptoApex?.missions && data.missions) {
      Object.assign(window.CryptoApex.missions.state, data.missions);
    }
    const playerData = data.player;
    if (world?.player && playerData) {
      playerData.unlockedWeapons?.forEach((key) => world.player.unlockWeapon?.(key));
      world.player.weaponIndex = Math.min(playerData.weaponIndex || 0, world.player.unlockedWeapons.length - 1);
      world.player.doubleJump = Boolean(playerData.doubleJump);
      world.player.setWeapon?.(world.player.weaponIndex);
      if (state.goldenSkin) applyGoldenSkin(world.player);
    }
    window.CryptoApex?.ui?.renderInventory?.();
    window.CryptoApex?.ui?.renderCrafting?.();
    window.CryptoApex?.ui?.renderMarketplace?.();
    window.CryptoApex?.ui?.renderLeaderboard?.();
    window.CryptoApex?.ui?.updateHUD?.();
    return true;
  }

  window.CryptoApex = window.CryptoApex || {};
  window.CryptoApex.economy = {
    state,
    rarityColors,
    storeCatalog,
    craftRecipes,
    addCred,
    spendCred,
    addFragment,
    addItem,
    queueMint,
    markMinted,
    buyDecoration,
    expandHouse,
    applyStorePurchase,
    updateStoreEffects,
    isBoostActive,
    boostRemaining,
    hasInfiniteAmmo,
    speedMultiplier,
    consumeRevive,
    canCraft,
    applyCraftRecipe,
    getMarketplaceListings,
    listMarketItem,
    completeMarketPurchase,
    addBossVoucher,
    updateLeaderboard,
    getLeaderboard,
    saveGame,
    loadGameData,
    migrateLocalSaveToWallet,
    restoreGame,
    walletId
  };
})();
