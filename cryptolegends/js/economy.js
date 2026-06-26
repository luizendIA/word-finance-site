(function () {
  const rarityColors = {
    Comum: 0x98f5d4,
    Incomum: 0x5df2ff,
    Raro: 0x7b8cff,
    Epico: 0xff6ac1,
    Lendario: 0xffd166
  };

  const state = {
    cred: 0,
    lifetimeCred: 0,
    inventory: [],
    fragments: {},
    decorations: [],
    badges: [],
    pendingMints: [],
    minted: [],
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

  window.CryptoApex = window.CryptoApex || {};
  window.CryptoApex.economy = {
    state,
    rarityColors,
    addCred,
    spendCred,
    addFragment,
    addItem,
    queueMint,
    markMinted,
    buyDecoration,
    expandHouse
  };
})();
