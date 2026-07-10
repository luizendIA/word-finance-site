(function () {
  const classes = {
    grunt: { label: "Inflator Raso", health: 42, speed: 2.2, damage: 6, cred: [6, 14], color: 0xb94b4b, scale: 1 },
    elite: { label: "Inflator Elite", health: 110, speed: 2.55, damage: 12, cred: [14, 30], color: 0xff9f1c, scale: 1.14 },
    heavy: { label: "Guarda da Impressora", health: 190, speed: 1.55, damage: 18, cred: [24, 46], color: 0x7b8cff, scale: 1.28 },
    bridge: { label: "Phisher de Ponte", health: 135, speed: 2.85, damage: 14, cred: [26, 52], color: 0x5df2ff, scale: 1.12 },
    custody: { label: "Ladrao de Seed", health: 165, speed: 2.35, damage: 20, cred: [32, 62], color: 0x9945ff, scale: 1.18 },
    merchant: { label: "Sabotador de Checkout", health: 150, speed: 2.65, damage: 16, cred: [30, 58], color: 0x14f195, scale: 1.1 },
    oracle: { label: "Oraculo da Alavancagem", health: 155, speed: 2.5, damage: 17, cred: [34, 66], color: 0xff6ac1, scale: 1.16 },
    liquidator: { label: "Bot de Liquidacao", health: 102, speed: 3.35, damage: 15, cred: [24, 48], color: 0xff4d6d, scale: 1.02 },
    miner: { label: "Minerador Capturado", health: 225, speed: 1.38, damage: 22, cred: [42, 78], color: 0xf7931a, scale: 1.32 },
    censor: { label: "Censor de Nos", health: 178, speed: 2.1, damage: 21, cred: [38, 72], color: 0x5df2ff, scale: 1.2 },
    boss: { label: "Tesoureiro Inflador", health: 700, speed: 1.55, damage: 28, cred: [120, 220], color: 0xff4d6d, scale: 1.72 },
    finalBoss: { label: "Senador da Impressora Infinita", health: 1300, speed: 1.7, damage: 34, cred: [1000, 1000], color: 0xffd166, scale: 2.05 },
    megaBoss: { label: "Banqueiro Central das Sombras", health: 2400, speed: 1.85, damage: 42, cred: [2000, 2000], color: 0x8c54ff, scale: 2.35 }
  };

  function material(color, emission, intensity, metalness) {
    return new THREE.MeshStandardMaterial({
      color,
      emissive: emission || 0x000000,
      emissiveIntensity: intensity || 0,
      metalness: metalness == null ? 0.35 : metalness,
      roughness: 0.38
    });
  }

  function add(group, geometry, mat, position, rotation) {
    const mesh = new THREE.Mesh(geometry, mat);
    if (position) mesh.position.set(position[0], position[1], position[2]);
    if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  }

  function addEnergy(group, color, position, size) {
    const mesh = add(group, new THREE.OctahedronGeometry(size || 0.08, 0), material(color, color, 0.72, 0.2), position);
    group.userData.energyParts.push(mesh);
    return mesh;
  }

  function addLimb(group, dark, x, y, height, role, side) {
    const part = add(group, new THREE.CylinderGeometry(role === "leg" ? 0.11 : 0.085, role === "leg" ? 0.095 : 0.075, height, 10), dark, [x, y, 0]);
    part.rotation.z = role === "arm" ? (side > 0 ? -0.3 : 0.3) : side * 0.06;
    part.userData.animRole = role;
    part.userData.animSide = side;
    group.userData.animatedLimbs.push(part);
    return part;
  }

  function addBaseBody(group, def) {
    const suit = material(def.color, def.color, 0.1, 0.42);
    const dark = material(0x111820, 0x000000, 0, 0.5);
    const black = material(0x060a0f, 0x000000, 0, 0.32);
    const glow = material(0xffe07a, 0xffb52e, 0.46, 0.22);
    const visor = material(0x8cfaff, 0x5df2ff, 0.78, 0.18);
    group.userData.materials = { suit, dark, black, glow, visor };

    add(group, new THREE.CylinderGeometry(0.34, 0.46, 0.98, 12), suit, [0, 1.02, 0]);
    add(group, new THREE.BoxGeometry(0.52, 0.18, 0.09), glow, [0, 1.18, -0.41]);
    add(group, new THREE.SphereGeometry(0.28, 16, 12), black, [0, 1.68, 0]);
    add(group, new THREE.BoxGeometry(0.3, 0.07, 0.05), visor, [0, 1.69, -0.25]);
    add(group, new THREE.CylinderGeometry(0.34, 0.26, 0.16, 14), suit, [0, 1.95, 0]);
    add(group, new THREE.BoxGeometry(0.62, 0.42, 0.2), glow, [0, 1.11, -0.42]);
    addEnergy(group, def.color, [0, 1.1, -0.56], 0.085);

    [-1, 1].forEach((side) => {
      addLimb(group, dark, side * 0.42, 1.0, 0.78, "arm", side);
      add(group, new THREE.TorusGeometry(0.085, 0.015, 8, 14), glow, [side * 0.42, 0.64, -0.02], [Math.PI / 2, 0, 0]);
      addLimb(group, dark, side * 0.18, 0.37, 0.72, "leg", side);
      add(group, new THREE.BoxGeometry(0.24, 0.12, 0.34), black, [side * 0.18, -0.02, -0.09]);
    });
  }

  function addArchetype(group, def, classKey) {
    const mats = group.userData.materials;
    const accent = material(def.color, def.color, 0.42, 0.26);
    const warning = material(0xff4d6d, 0xff4d6d, 0.56, 0.18);
    const gold = material(0xffd166, 0xffb52e, 0.4, 0.28);

    if (classKey === "grunt") {
      [-0.14, 0, 0.14].forEach((x) => add(group, new THREE.BoxGeometry(0.1, 0.24, 0.025), mats.glow, [x, 1.0, -0.54]));
      add(group, new THREE.BoxGeometry(0.08, 0.42, 0.045), warning, [0, 1.45, -0.29], [0, 0, -0.18]);
    } else if (classKey === "elite") {
      [-1, 1].forEach((side) => add(group, new THREE.SphereGeometry(0.18, 12, 8), accent, [side * 0.46, 1.42, 0]));
      const halo = add(group, new THREE.TorusGeometry(0.38, 0.026, 8, 28), accent, [0, 1.88, 0], [Math.PI / 2, 0, 0]);
      group.userData.energyParts.push(halo);
    } else if (classKey === "heavy") {
      add(group, new THREE.BoxGeometry(0.86, 0.74, 0.25), mats.dark, [0, 1.08, -0.18]);
      add(group, new THREE.CylinderGeometry(0.33, 0.33, 0.42, 16), accent, [0, 1.1, -0.42], [Math.PI / 2, 0, 0]);
      [-1, 1].forEach((side) => add(group, new THREE.CylinderGeometry(0.1, 0.14, 0.5, 10), warning, [side * 0.46, 0.66, 0.1], [Math.PI / 2, 0, 0]));
    } else if (classKey === "bridge") {
      const portal = add(group, new THREE.TorusGeometry(0.64, 0.045, 10, 32), accent, [0, 1.18, 0.3], [Math.PI / 2, 0, 0]);
      group.userData.energyParts.push(portal);
      [-1, 1].forEach((side) => add(group, new THREE.ConeGeometry(0.12, 0.55, 6), accent, [side * 0.43, 1.35, 0.14], [0, 0, side * 0.52]));
      add(group, new THREE.SphereGeometry(0.1, 12, 8), mats.visor, [0, 2.16, 0]);
    } else if (classKey === "custody") {
      add(group, new THREE.ConeGeometry(0.48, 0.78, 18), mats.black, [0, 1.86, 0]);
      add(group, new THREE.BoxGeometry(0.25, 0.46, 0.04), accent, [0, 1.73, -0.34]);
      const keyRing = add(group, new THREE.TorusGeometry(0.12, 0.028, 8, 18), gold, [0.46, 0.76, -0.22], [Math.PI / 2, 0, 0]);
      group.userData.energyParts.push(keyRing);
      add(group, new THREE.BoxGeometry(0.07, 0.3, 0.06), gold, [0.46, 0.58, -0.22]);
    } else if (classKey === "merchant") {
      add(group, new THREE.BoxGeometry(0.48, 0.34, 0.08), mats.black, [0.34, 1.04, -0.28]);
      add(group, new THREE.BoxGeometry(0.32, 0.18, 0.02), warning, [0.34, 1.04, -0.33]);
      [-0.1, 0.1].forEach((x) => add(group, new THREE.BoxGeometry(0.045, 0.31, 0.025), warning, [0.34 + x, 1.04, -0.35], [0, 0, x > 0 ? 0.7 : -0.7]));
      const scan = add(group, new THREE.TorusGeometry(0.42, 0.025, 8, 28), accent, [0, 0.15, 0], [Math.PI / 2, 0, 0]);
      group.userData.energyParts.push(scan);
    } else if (classKey === "oracle") {
      const orb = add(group, new THREE.IcosahedronGeometry(0.26, 1), accent, [0, 2.23, 0]);
      group.userData.energyParts.push(orb);
      [-1, 1].forEach((side) => {
        const arm = add(group, new THREE.TorusGeometry(0.28, 0.024, 8, 22), accent, [side * 0.34, 1.95, 0], [Math.PI / 2, 0, side * 0.35]);
        group.userData.energyParts.push(arm);
      });
    } else if (classKey === "liquidator") {
      [-1, 1].forEach((side) => {
        add(group, new THREE.ConeGeometry(0.11, 0.6, 6), warning, [side * 0.55, 1.08, -0.08], [0, 0, side * 1.02]);
        add(group, new THREE.BoxGeometry(0.1, 0.24, 0.38), accent, [side * 0.28, 0.5, 0.08]);
      });
      const eye = add(group, new THREE.TorusGeometry(0.16, 0.024, 8, 22), warning, [0, 1.7, -0.28], [Math.PI / 2, 0, 0]);
      group.userData.energyParts.push(eye);
    } else if (classKey === "miner") {
      add(group, new THREE.CylinderGeometry(0.38, 0.34, 0.15, 16), gold, [0, 2.02, 0]);
      add(group, new THREE.SphereGeometry(0.08, 10, 8), mats.visor, [0, 2.02, -0.34]);
      const handle = add(group, new THREE.CylinderGeometry(0.04, 0.04, 0.82, 8), mats.dark, [-0.55, 1.02, -0.08], [0.25, 0, 0.55]);
      handle.userData.animRole = "arm";
      handle.userData.animSide = -1;
      group.userData.animatedLimbs.push(handle);
      add(group, new THREE.BoxGeometry(0.54, 0.1, 0.1), gold, [-0.73, 1.38, -0.08], [0, 0, -0.55]);
    } else if (classKey === "censor") {
      const wall = add(group, new THREE.BoxGeometry(0.78, 0.92, 0.04), mats.black, [0, 1.13, -0.43]);
      add(group, new THREE.BoxGeometry(0.56, 0.07, 0.025), warning, [0, 1.13, -0.47]);
      [-0.18, 0.18].forEach((x) => add(group, new THREE.BoxGeometry(0.05, 0.48, 0.025), warning, [x, 1.13, -0.47], [0, 0, x > 0 ? 0.7 : -0.7]));
      group.userData.energyParts.push(wall);
    } else if (classKey === "boss") {
      add(group, new THREE.CylinderGeometry(0.52, 0.48, 0.2, 18), gold, [0, 2.15, 0]);
      [-0.34, 0, 0.34].forEach((x) => add(group, new THREE.ConeGeometry(0.1, 0.32, 6), gold, [x, 2.39, 0]));
      const vault = add(group, new THREE.TorusGeometry(0.56, 0.055, 10, 28), accent, [0, 1.1, -0.48], [Math.PI / 2, 0, 0]);
      group.userData.energyParts.push(vault);
    } else if (classKey === "finalBoss") {
      add(group, new THREE.BoxGeometry(0.95, 0.56, 0.36), mats.black, [0, 1.2, -0.32]);
      [-0.25, 0, 0.25].forEach((x) => add(group, new THREE.BoxGeometry(0.14, 0.28, 0.04), warning, [x, 1.2, -0.53]));
      add(group, new THREE.CylinderGeometry(0.48, 0.42, 0.2, 18), gold, [0, 2.18, 0]);
      const coin = add(group, new THREE.CylinderGeometry(0.24, 0.24, 0.06, 18), gold, [0, 2.46, -0.06], [Math.PI / 2, 0, 0]);
      group.userData.energyParts.push(coin);
    } else if (classKey === "megaBoss") {
      add(group, new THREE.SphereGeometry(0.68, 22, 16), mats.black, [0, 1.44, 0]);
      for (let i = 0; i < 3; i += 1) {
        const ring = add(group, new THREE.TorusGeometry(0.88 + i * 0.16, 0.03, 8, 42), accent, [0, 1.45, 0], [Math.PI / 2 + i * 0.35, 0, i * 0.6]);
        group.userData.energyParts.push(ring);
      }
      [-1, 1].forEach((side) => {
        for (let step = 0; step < 3; step += 1) add(group, new THREE.ConeGeometry(0.1, 0.45, 7), warning, [side * (0.48 + step * 0.17), 0.72 - step * 0.08, 0.12 + step * 0.08], [0.25, 0, side * 0.55]);
      });
      const crown = add(group, new THREE.IcosahedronGeometry(0.3, 1), gold, [0, 2.52, 0]);
      group.userData.energyParts.push(crown);
    }
  }

  function addHealthBar(group) {
    const barGroup = new THREE.Group();
    const barBack = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.08, 0.035), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    const barFill = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.045, 0.04), new THREE.MeshBasicMaterial({ color: 0x14f195 }));
    barFill.position.z = -0.004;
    barGroup.add(barBack);
    barGroup.add(barFill);
    barGroup.position.y = 2.42;
    group.add(barGroup);
    group.userData.healthFill = barFill;
    group.userData.healthBar = barGroup;
  }

  function makeEnemyModel(def, classKey) {
    const group = new THREE.Group();
    group.userData.animatedLimbs = [];
    group.userData.energyParts = [];
    addBaseBody(group, def);
    addArchetype(group, def, classKey);
    addHealthBar(group);
    group.scale.setScalar(def.scale);
    return group;
  }

  class Enemy {
    constructor(scene, classKey, position) {
      this.scene = scene;
      this.classKey = classKey;
      this.def = classes[classKey] || classes.grunt;
      this.group = makeEnemyModel(this.def, classKey);
      this.group.position.copy(position);
      this.health = this.def.health;
      this.maxHealth = this.def.health;
      this.attackCooldown = 0;
      this.animTime = Math.random() * 20;
      this.scene.add(this.group);
    }

    isBoss() { return this.classKey === "boss" || this.classKey === "finalBoss" || this.classKey === "megaBoss"; }

    update(dt, world) {
      this.attackCooldown = Math.max(0, this.attackCooldown - dt);
      const playerPos = world.player.group.position;
      const toPlayer = playerPos.clone().sub(this.group.position);
      const dist = toPlayer.length();
      if (dist > 1.55 + this.def.scale * 0.45) {
        toPlayer.normalize();
        this.group.position.addScaledVector(toPlayer, this.def.speed * dt * world.difficulty);
        this.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
        this.animate(dt, true, world);
      } else if (this.attackCooldown <= 0) {
        this.attackCooldown = this.isBoss() ? 1.05 : 1.45;
        world.player.takeDamage(this.def.damage, world);
        this.animate(dt, false, world);
      } else {
        this.animate(dt, false, world);
      }
      if (this.isBoss()) this.group.rotation.y += Math.sin(world.elapsed * 2) * dt * 0.18;
    }

    animate(dt, moving, world) {
      this.animTime += dt * (moving ? 8.5 : 2.2);
      const stride = Math.sin(this.animTime);
      const energy = moving ? 1 : 0.18;
      (this.group.userData.animatedLimbs || []).forEach((part) => {
        if (!part.userData.baseRotation) part.userData.baseRotation = part.rotation.clone();
        const side = part.userData.animSide || 1;
        const base = part.userData.baseRotation;
        part.rotation.copy(base);
        if (part.userData.animRole === "arm") part.rotation.x += stride * side * 0.42 * energy;
        if (part.userData.animRole === "leg") part.rotation.x -= stride * side * 0.5 * energy;
      });
      (this.group.userData.energyParts || []).forEach((part, index) => {
        if (part.material && "emissiveIntensity" in part.material) part.material.emissiveIntensity = 0.4 + Math.sin(this.animTime * 2 + index) * 0.24;
        part.rotation.z += dt * (0.08 + index * 0.01);
      });
      const fill = this.group.userData.healthFill;
      if (fill) {
        const amount = Math.max(0.02, this.health / this.maxHealth);
        fill.scale.x = amount;
        fill.position.x = -0.41 * (1 - amount);
      }
      const bar = this.group.userData.healthBar;
      if (bar && world?.camera) bar.lookAt(world.camera.position);
      const pulse = 1 + Math.sin(this.animTime * 0.7) * 0.01;
      this.group.scale.set(this.def.scale, this.def.scale * pulse, this.def.scale);
    }

    takeDamage(amount, world) {
      this.health -= amount;
      if (this.health <= 0) {
        this.die(world);
        return true;
      }
      return false;
    }

    die(world) {
      this.scene.remove(this.group);
      world.removeEnemy(this);
      world.player.onKill();
      world.kills += 1;
      const roll = this.def.cred[0] + Math.floor(Math.random() * (this.def.cred[1] - this.def.cred[0] + 1));
      window.CryptoApex.economy.addCred(roll, this.def.label);
      world.spawnLoot(this.group.position.clone(), this.classKey);
      world.audio.play("coin");
      window.CryptoApex.missions.onEnemyKilled(this.classKey, world);
    }
  }

  function makeLoot(scene, position, loot) {
    const group = new THREE.Group();
    const color = window.CryptoApex.economy.rarityColors[loot.rarity] || 0x5df2ff;
    const glow = material(color, color, 0.38, 0.3);
    const dark = material(0x111b24, 0x000000, 0, 0.46);
    group.userData.energyParts = [];
    if (loot.type === "cred") {
      add(group, new THREE.CylinderGeometry(0.22, 0.22, 0.48, 14), dark, [0, 0.12, 0]);
      const core = add(group, new THREE.CylinderGeometry(0.13, 0.13, 0.5, 12), glow, [0, 0.12, 0]);
      group.userData.energyParts.push(core);
      add(group, new THREE.TorusGeometry(0.26, 0.02, 8, 22), glow, [0, 0.12, 0], [Math.PI / 2, 0, 0]);
    } else if (loot.type === "fragment") {
      const shard = add(group, new THREE.ConeGeometry(0.2, 0.7, 5), glow, [0, 0.3, 0], [0.08, 0.2, 0]);
      group.userData.energyParts.push(shard);
      [-0.14, 0.14].forEach((x) => add(group, new THREE.ConeGeometry(0.1, 0.36, 5), dark, [x, 0.22, 0.06], [0.1, 0, x]));
    } else if (loot.type === "weapon") {
      const model = window.CryptoApex.weapons.makeWeaponModel(window.CryptoApex.weapons.byKey[loot.weaponKey] || window.CryptoApex.weapons.byKey.revolver);
      model.scale.setScalar(0.46);
      model.rotation.y = Math.PI;
      model.position.y = 0.2;
      group.add(model);
      group.userData.energyParts = model.userData.energyParts || [];
    } else if (loot.type === "emblema" || loot.type === "voucher") {
      const coin = add(group, new THREE.CylinderGeometry(0.33, 0.33, 0.08, 20), glow, [0, 0.32, 0], [Math.PI / 2, 0, 0]);
      group.userData.energyParts.push(coin);
      add(group, new THREE.TorusGeometry(0.38, 0.025, 8, 28), dark, [0, 0.32, 0], [Math.PI / 2, 0, 0]);
    } else {
      const crystal = add(group, new THREE.OctahedronGeometry(0.32, 1), glow, [0, 0.34, 0]);
      group.userData.energyParts.push(crystal);
      const orbit = add(group, new THREE.TorusGeometry(0.38, 0.022, 8, 30), dark, [0, 0.34, 0], [Math.PI / 2, 0, 0]);
      group.userData.energyParts.push(orbit);
    }
    const ring = add(group, new THREE.TorusGeometry(0.53, 0.025, 8, 28), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.76 }), [0, 0.03, 0], [Math.PI / 2, 0, 0]);
    group.userData.energyParts.push(ring);
    group.position.copy(position);
    group.position.y = 0.55;
    group.userData.loot = loot;
    group.userData.baseY = 0.55;
    scene.add(group);
    return group;
  }

  function rollLoot(classKey, phaseKey) {
    const boss = classKey === "boss" || classKey === "finalBoss";
    const table = [
      { type: "cred", name: "Capsula CRED", rarity: "Comum", amount: 18 + Math.floor(Math.random() * 24), nft: false },
      { type: "fragment", name: "Fragmento de Rifle", rarity: "Comum", fragmentKey: "rifle", amount: 1, nft: false },
      { type: "knowledge", name: "Capsula de Conhecimento", rarity: "Incomum", nft: true, lesson: "A inflacao dilui seu poder de compra quando a oferta de dinheiro cresce sem lastro." }
    ];
    if (phaseKey === "mint" || classKey === "elite" || classKey === "liquidator") table.push({ type: "fragment", name: "Fragmento SMG Lightning", rarity: "Raro", fragmentKey: "smg", amount: 1, nft: false });
    if (phaseKey === "mine" || classKey === "miner") table.push({ type: "fragment", name: "Peca Escopeta Proof-of-Work", rarity: "Incomum", fragmentKey: "shotgun", amount: 1, nft: false });
    if (phaseKey === "congress" || classKey === "censor") table.push({ type: "fragment", name: "Nucleo DeFi", rarity: "Lendario", fragmentKey: "defi", amount: 1, nft: false });
    if (phaseKey === "solana" || classKey === "bridge") table.push({ type: "fragment", name: "Fragmento Ponte Solana", rarity: "Raro", fragmentKey: "smg", amount: 1, nft: false });
    if (phaseKey === "custody" || classKey === "custody") table.push({ type: "knowledge", name: "Pergaminho da Seed", rarity: "Epico", nft: true, lesson: "Seed e chave privada nunca devem ser enviadas, fotografadas ou coladas em sites desconhecidos." });
    if (phaseKey === "merchant" || classKey === "merchant") table.push({ type: "fragment", name: "Voucher WordFinance Pay", rarity: "Epico", fragmentKey: "defi", amount: 1, nft: false });
    if (phaseKey === "ark" || classKey === "oracle") table.push({ type: "knowledge", name: "Cristal de Soberania", rarity: "Lendario", nft: true, lesson: "Soberania financeira combina conhecimento, carteira propria e responsabilidade no uso de pagamentos livres." });
    if (boss && classKey === "boss") return { type: "weapon", weaponKey: "revolver", name: "Revolver Cold Wallet", rarity: "Raro", nft: true, lesson: "Autocustodia significa controlar suas proprias chaves." };
    if (boss && classKey === "finalBoss") return { type: "emblema", name: "Mestre da Inflacao", rarity: "Lendario", nft: true, amount: 1000, lesson: "Dinheiro resistente a censura reduz o poder de quem imprime para se perpetuar." };
    return table[Math.floor(Math.random() * table.length)];
  }

  window.CryptoApex = window.CryptoApex || {};
  window.CryptoApex.enemies = { classes, Enemy, makeLoot, rollLoot };
})();
