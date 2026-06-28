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
    }
  ];

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
    activeBoosts: {},
    reviveCharges: 0,
    goldenSkin: false,
    legendaryWeapon: false,
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

  window.CryptoApex = window.CryptoApex || {};
  window.CryptoApex.economy = {
    state,
    rarityColors,
    storeCatalog,
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
    consumeRevive
  };
})();
