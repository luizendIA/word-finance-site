(function () {
  const classes = {
    grunt: { label: "Inflator Raso", health: 42, speed: 2.2, damage: 6, cred: [6, 14], color: 0xb94b4b, scale: 1 },
    elite: { label: "Inflator Elite", health: 110, speed: 2.55, damage: 12, cred: [14, 30], color: 0xff9f1c, scale: 1.14 },
    heavy: { label: "Guarda da Impressora", health: 190, speed: 1.55, damage: 18, cred: [24, 46], color: 0x7b8cff, scale: 1.28 },
    boss: { label: "Tesoureiro Inflador", health: 700, speed: 1.55, damage: 28, cred: [120, 220], color: 0xff4d6d, scale: 1.72 },
    finalBoss: { label: "Senador da Impressora Infinita", health: 1300, speed: 1.7, damage: 34, cred: [1000, 1000], color: 0xffd166, scale: 2.05 }
  };

  function makeEnemyModel(def) {
    const group = new THREE.Group();
    const suit = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.5, metalness: 0.2 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x222126, roughness: 0.5 });
    const glow = new THREE.MeshStandardMaterial({ color: 0xfff2a8, emissive: 0xffd166, emissiveIntensity: 0.5 });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.46, 1.0, 10), suit);
    torso.position.y = 1.0;
    torso.castShadow = true;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), dark);
    head.position.y = 1.66;
    head.castShadow = true;
    group.add(head);

    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.18, 14), suit);
    hat.position.y = 1.94;
    group.add(hat);

    const printer = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.2), glow);
    printer.position.set(0, 1.12, -0.42);
    group.add(printer);

    [-0.42, 0.42].forEach((x) => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.78, 10), dark);
      arm.position.set(x, 1.0, 0);
      arm.rotation.z = x > 0 ? -0.25 : 0.25;
      arm.castShadow = true;
      group.add(arm);
    });

    [-0.18, 0.18].forEach((x) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.72, 10), dark);
      leg.position.set(x, 0.36, 0);
      leg.castShadow = true;
      group.add(leg);
    });

    group.scale.setScalar(def.scale);
    return group;
  }

  class Enemy {
    constructor(scene, classKey, position) {
      this.scene = scene;
      this.classKey = classKey;
      this.def = classes[classKey];
      this.group = makeEnemyModel(this.def);
      this.group.position.copy(position);
      this.health = this.def.health;
      this.maxHealth = this.def.health;
      this.attackCooldown = 0;
      this.scene.add(this.group);
    }

    update(dt, world) {
      this.attackCooldown = Math.max(0, this.attackCooldown - dt);
      const playerPos = world.player.group.position;
      const toPlayer = playerPos.clone().sub(this.group.position);
      const dist = toPlayer.length();
      if (dist > 1.55 + this.def.scale * 0.45) {
        toPlayer.normalize();
        this.group.position.addScaledVector(toPlayer, this.def.speed * dt * world.difficulty);
        this.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
      } else if (this.attackCooldown <= 0) {
        this.attackCooldown = this.classKey.includes("boss") ? 1.05 : 1.45;
        world.player.takeDamage(this.def.damage, world);
      }
      if (this.classKey === "boss" || this.classKey === "finalBoss") this.group.rotation.y += Math.sin(world.elapsed * 2) * dt * 0.18;
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
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.24, metalness: 0.25, roughness: 0.3 });
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.7), mat);
    crate.castShadow = true;
    group.add(crate);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.025, 8, 28), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 }));
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
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
      { type: "cred", name: "Cápsula CRED", rarity: "Comum", amount: 18 + Math.floor(Math.random() * 24), nft: false },
      { type: "fragment", name: "Fragmento de Rifle", rarity: "Comum", fragmentKey: "rifle", amount: 1, nft: false },
      { type: "knowledge", name: "Cápsula de Conhecimento", rarity: "Incomum", nft: true, lesson: "A inflação dilui seu poder de compra quando a oferta de dinheiro cresce sem lastro." }
    ];
    if (phaseKey === "mint" || classKey === "elite") table.push({ type: "fragment", name: "Fragmento SMG Lightning", rarity: "Raro", fragmentKey: "smg", amount: 1, nft: false });
    if (phaseKey === "mine") table.push({ type: "fragment", name: "Peça Escopeta Proof-of-Work", rarity: "Incomum", fragmentKey: "shotgun", amount: 1, nft: false });
    if (phaseKey === "congress") table.push({ type: "fragment", name: "Núcleo DeFi", rarity: "Lendario", fragmentKey: "defi", amount: 1, nft: false });
    if (boss && classKey === "boss") return { type: "weapon", weaponKey: "revolver", name: "Revólver Cold Wallet", rarity: "Raro", nft: true, lesson: "Autocustódia significa controlar suas próprias chaves." };
    if (boss && classKey === "finalBoss") return { type: "emblema", name: "Mestre da Inflação", rarity: "Lendario", nft: true, amount: 1000, lesson: "Dinheiro resistente à censura reduz o poder de quem imprime para se perpetuar." };
    return table[Math.floor(Math.random() * table.length)];
  }

  window.CryptoApex = window.CryptoApex || {};
  window.CryptoApex.enemies = { classes, Enemy, makeLoot, rollLoot };
})();
