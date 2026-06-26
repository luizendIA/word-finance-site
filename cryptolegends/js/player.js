(function () {
  function mat(color, emissive, intensity) {
    return new THREE.MeshStandardMaterial({
      color,
      emissive: emissive || 0x000000,
      emissiveIntensity: intensity || 0,
      metalness: 0.18,
      roughness: 0.48
    });
  }

  function capsule(radius, length) {
    if (THREE.CapsuleGeometry) return new THREE.CapsuleGeometry(radius, length, 8, 14);
    return new THREE.CylinderGeometry(radius, radius, length + radius * 2, 14);
  }

  function limb(radius, height, color) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.9, height, 12), mat(color));
    mesh.castShadow = true;
    return mesh;
  }

  function ellipsoid(width, height, depth, material) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 18), material);
    mesh.scale.set(width, height, depth);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function armorBox(width, height, depth, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function addCape(group, color, accent) {
    const capeMat = new THREE.MeshStandardMaterial({
      color,
      emissive: accent,
      emissiveIntensity: 0.06,
      roughness: 0.78,
      metalness: 0.02,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.42
    });
    [-0.18, 0.05, 0.28].forEach((x, i) => {
      const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 1.16 - i * 0.1, 4, 8), capeMat);
      cape.position.set(x * 0.7, 0.82, 0.39 + i * 0.02);
      cape.rotation.y = -0.12 + i * 0.11;
      cape.rotation.z = 0.08 - i * 0.04;
      cape.castShadow = true;
      group.add(cape);
    });
  }

  function createSatoshi() {
    const group = new THREE.Group();
    const black = mat(0x111820);
    const cloth = mat(0x18252d, 0x070b0e, 0.06);
    const skin = mat(0xd3a27d);
    const leather = mat(0x0b0f13);
    const metal = mat(0x2a3238);
    const orange = mat(0xf7931a, 0xf7931a, 0.18);
    const eye = mat(0x7df9ff, 0x7df9ff, 1);

    const pelvis = ellipsoid(0.55, 0.34, 0.34, leather);
    pelvis.position.y = 0.7;
    group.add(pelvis);

    const torso = ellipsoid(0.72, 0.98, 0.42, cloth);
    torso.position.y = 1.18;
    group.add(torso);

    const chestPlate = armorBox(0.52, 0.42, 0.06, metal);
    chestPlate.position.set(0, 1.28, -0.23);
    group.add(chestPlate);

    const hood = ellipsoid(0.56, 0.58, 0.44, black);
    hood.position.y = 1.95;
    group.add(hood);

    const hoodRim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 10, 24), black);
    hoodRim.position.set(0, 1.86, -0.22);
    hoodRim.rotation.x = Math.PI / 2;
    hoodRim.scale.x = 1.25;
    hoodRim.castShadow = true;
    group.add(hoodRim);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.2, 14), skin);
    neck.position.y = 1.68;
    neck.castShadow = true;
    group.add(neck);

    const head = ellipsoid(0.38, 0.45, 0.34, skin);
    head.position.y = 1.86;
    group.add(head);

    const mask = armorBox(0.34, 0.2, 0.08, black);
    mask.position.set(0, 1.8, -0.31);
    group.add(mask);

    [-0.09, 0.09].forEach((x) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), eye);
      e.position.set(x, 1.83, -0.35);
      group.add(e);
    });

    const chest = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 24), orange);
    chest.position.set(0, 1.24, -0.39);
    chest.rotation.x = Math.PI / 2;
    group.add(chest);

    const slash = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.34, 0.03), orange);
    slash.position.set(0.02, 1.24, -0.42);
    slash.rotation.z = -0.45;
    group.add(slash);

    [-1, 1].forEach((side) => {
      const shoulder = ellipsoid(0.26, 0.2, 0.22, metal);
      shoulder.position.set(side * 0.48, 1.48, -0.02);
      group.add(shoulder);
      const upper = limb(0.09, 0.55, 0x151e25);
      upper.position.set(side * 0.55, 1.18, -0.02);
      upper.rotation.z = side * 0.26;
      group.add(upper);
      const fore = limb(0.082, 0.52, 0x101820);
      fore.position.set(side * 0.62, 0.86, -0.08);
      fore.rotation.z = side * 0.12;
      group.add(fore);
      const wrist = armorBox(0.16, 0.12, 0.18, orange);
      wrist.position.set(side * 0.62, 0.6, -0.12);
      group.add(wrist);
      const hand = ellipsoid(0.16, 0.13, 0.12, leather);
      hand.position.set(side * 0.62, 0.48, -0.12);
      group.add(hand);

      const thigh = limb(0.13, 0.58, 0x101820);
      thigh.position.set(side * 0.18, 0.42, 0);
      thigh.rotation.z = -side * 0.05;
      group.add(thigh);
      const shin = limb(0.105, 0.58, 0x0f171d);
      shin.position.set(side * 0.18, 0.08, -0.02);
      group.add(shin);
      const boot = armorBox(0.22, 0.14, 0.36, leather);
      boot.position.set(side * 0.18, -0.22, -0.08);
      group.add(boot);
    });

    const belt = armorBox(0.62, 0.09, 0.45, leather);
    belt.position.set(0, 0.84, -0.01);
    group.add(belt);
    addCape(group, 0x090d12, 0xf7931a);

    group.userData.weaponSocket = new THREE.Group();
    group.userData.weaponSocket.position.set(0.56, 1.1, -0.5);
    group.add(group.userData.weaponSocket);
    return group;
  }

  function createAnatoly() {
    const group = new THREE.Group();
    const armor = mat(0x2c254d, 0x23114f, 0.18);
    const skin = mat(0xc88f7a);
    const black = mat(0x101019);
    const green = mat(0x14f195, 0x14f195, 0.26);
    const violet = mat(0x9945ff, 0x9945ff, 0.22);
    const visorMat = mat(0x83fff0, 0x83fff0, 0.85);

    const torso = ellipsoid(0.7, 1.0, 0.4, armor);
    torso.position.y = 1.16;
    group.add(torso);

    const pelvis = ellipsoid(0.55, 0.32, 0.34, black);
    pelvis.position.y = 0.68;
    group.add(pelvis);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.22, 14), skin);
    neck.position.y = 1.7;
    neck.castShadow = true;
    group.add(neck);

    const head = ellipsoid(0.38, 0.45, 0.34, skin);
    head.position.y = 1.9;
    group.add(head);

    const hair = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.22, 14), mat(0x211611));
    hair.position.set(0.04, 2.12, -0.03);
    hair.rotation.z = -0.55;
    hair.castShadow = true;
    group.add(hair);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.04), visorMat);
    visor.position.set(0, 1.84, -0.24);
    group.add(visor);

    [-0.48, 0.48].forEach((x) => {
      const shoulder = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 10, 18), violet);
      shoulder.position.set(x, 1.46, 0);
      shoulder.rotation.y = Math.PI / 2;
      group.add(shoulder);
    });

    const chestLine = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.04), green);
    chestLine.position.set(0, 1.2, -0.39);
    group.add(chestLine);

    [-1, 1].forEach((side) => {
      const upper = limb(0.085, 0.55, 0x332866);
      upper.position.set(side * 0.52, 1.16, -0.03);
      upper.rotation.z = side * 0.24;
      group.add(upper);
      const fore = limb(0.075, 0.5, 0x19172b);
      fore.position.set(side * 0.6, 0.85, -0.08);
      fore.rotation.z = side * 0.12;
      group.add(fore);
      const wrist = armorBox(0.16, 0.12, 0.18, green);
      wrist.position.set(side * 0.6, 0.6, -0.12);
      group.add(wrist);
      const hand = ellipsoid(0.15, 0.12, 0.11, black);
      hand.position.set(side * 0.6, 0.47, -0.12);
      group.add(hand);

      const thigh = limb(0.105, 0.68, 0x231e42);
      thigh.position.set(side * 0.18, 0.43, 0);
      thigh.rotation.z = -side * 0.06;
      group.add(thigh);
      const shin = limb(0.085, 0.66, 0x151431);
      shin.position.set(side * 0.2, 0.04, -0.02);
      group.add(shin);
      const calfBlade = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 10), green);
      calfBlade.position.set(side * 0.2, 0.18, -0.11);
      calfBlade.rotation.x = Math.PI;
      group.add(calfBlade);
      const boot = armorBox(0.22, 0.14, 0.36, black);
      boot.position.set(side * 0.2, -0.28, -0.08);
      group.add(boot);
    });

    [-0.18, 0.18].forEach((x) => {
      const shin = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 10), green);
      shin.position.set(x, 0.18, -0.08);
      shin.rotation.x = Math.PI;
      group.add(shin);
    });

    group.userData.weaponSocket = new THREE.Group();
    group.userData.weaponSocket.position.set(0.56, 1.1, -0.5);
    group.add(group.userData.weaponSocket);
    return group;
  }

  function createShield(scene, parent) {
    const shield = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x5df2ff, transparent: true, opacity: 0.5, wireframe: true });
    for (let i = 0; i < 3; i += 1) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0 + i * 0.18, 0.015, 6, 6), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.rotation.z = i * 0.55;
      shield.add(ring);
    }
    shield.position.copy(parent.position);
    shield.position.y += 1.05;
    shield.userData.life = 4;
    scene.add(shield);
    return shield;
  }

  function createTurret(scene, position) {
    const group = new THREE.Group();
    const baseMat = mat(0x28343d);
    const laserMat = mat(0xffd166, 0xffd166, 0.6);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.24, 0.7), baseMat);
    base.castShadow = true;
    group.add(base);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.42), laserMat);
    head.position.y = 0.32;
    head.castShadow = true;
    group.add(head);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.68, 10), laserMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.32, -0.48);
    group.add(barrel);
    group.position.copy(position);
    group.position.y = 0.16;
    group.userData.life = 8;
    group.userData.cooldown = 0;
    scene.add(group);
    return group;
  }

  function createTrap(scene, position, direction) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.045, 8, 18),
      mat(0x9945ff, 0x9945ff, 0.8)
    );
    mesh.position.copy(position);
    mesh.position.y += 0.7;
    mesh.userData.velocity = direction.clone().multiplyScalar(14);
    mesh.userData.life = 2;
    scene.add(mesh);
    return mesh;
  }

  class Player {
    constructor(scene, heroKey) {
      this.scene = scene;
      this.heroKey = heroKey || "satoshi";
      this.group = this.heroKey === "anatoly" ? createAnatoly() : createSatoshi();
      this.group.position.set(0, 0, 8);
      this.scene.add(this.group);
      this.velocity = new THREE.Vector3();
      this.grounded = true;
      this.jumpCount = 0;
      this.doubleJump = false;
      this.maxHealth = 100;
      this.health = 100;
      this.maxShield = 70;
      this.shield = 50;
      this.stamina = 100;
      this.speedBuff = 0;
      this.cooldowns = { q: 0, e: 0 };
      this.weaponIndex = 0;
      this.unlockedWeapons = ["rifle"];
      this.weaponAmmo = {};
      this.reloadTimer = 0;
      this.fireCooldown = 0;
      this.aiming = false;
      this.weaponModel = null;
      this.setWeapon(0);
    }

    get weapon() {
      return window.CryptoApex.weapons.byKey[this.unlockedWeapons[this.weaponIndex]];
    }

    setWeapon(index) {
      if (index < 0 || index >= this.unlockedWeapons.length) return;
      this.weaponIndex = index;
      const def = this.weapon;
      if (!this.weaponAmmo[def.key]) this.weaponAmmo[def.key] = { clip: def.ammoSize, reserve: def.reserve };
      const socket = this.group.userData.weaponSocket;
      if (this.weaponModel) socket.remove(this.weaponModel);
      this.weaponModel = window.CryptoApex.weapons.makeWeaponModel(def);
      socket.add(this.weaponModel);
    }

    unlockWeapon(key) {
      if (!this.unlockedWeapons.includes(key)) {
        this.unlockedWeapons.push(key);
        this.setWeapon(this.unlockedWeapons.length - 1);
        return true;
      }
      return false;
    }

    update(dt, input, world) {
      this.fireCooldown = Math.max(0, this.fireCooldown - dt);
      this.reloadTimer = Math.max(0, this.reloadTimer - dt);
      this.cooldowns.q = Math.max(0, this.cooldowns.q - dt);
      this.cooldowns.e = Math.max(0, this.cooldowns.e - dt);
      this.speedBuff = Math.max(0, this.speedBuff - dt);

      const forward = world.cameraForward.clone();
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3(-forward.z, 0, forward.x);
      const move = new THREE.Vector3();
      if (input.keys.w) move.add(forward);
      if (input.keys.s) move.sub(forward);
      if (input.keys.d) move.add(right);
      if (input.keys.a) move.sub(right);
      if (input.mobileMove && input.mobileMove.lengthSq() > 0.0001) {
        move.addScaledVector(right, input.mobileMove.x);
        move.addScaledVector(forward, -input.mobileMove.y);
      }

      const wantsSprint = input.keys.shift && this.stamina > 4 && move.lengthSq() > 0;
      const speed = (wantsSprint ? 9.2 : 5.4) * (this.speedBuff > 0 ? 1.15 : 1);
      if (wantsSprint) this.stamina = Math.max(0, this.stamina - dt * 28);
      else this.stamina = Math.min(100, this.stamina + dt * 18);

      if (move.lengthSq() > 0) {
        move.normalize();
        this.group.position.addScaledVector(move, speed * dt);
        this.group.rotation.y = Math.atan2(-move.x, -move.z);
        world.audio.step(dt, wantsSprint);
      } else if (input.mouseDown || input.rightMouse) {
        this.group.rotation.y = Math.atan2(-forward.x, -forward.z);
      }

      if (input.consume(" ") && (this.grounded || (this.doubleJump && this.jumpCount < 2))) {
        this.velocity.y = 7.5;
        this.grounded = false;
        this.jumpCount += 1;
        world.audio.play("jump");
      }

      this.velocity.y -= 18 * dt;
      this.group.position.y += this.velocity.y * dt;
      if (this.group.position.y <= 0) {
        this.group.position.y = 0;
        this.velocity.y = 0;
        this.grounded = true;
        this.jumpCount = 0;
      }

      const limit = world.phase?.bounds || 38;
      this.group.position.x = THREE.MathUtils.clamp(this.group.position.x, -limit, limit);
      this.group.position.z = THREE.MathUtils.clamp(this.group.position.z, -limit, limit);

      for (let i = 1; i <= 5; i += 1) if (input.consume(String(i))) this.setWeapon(i - 1);
      if (input.consume("r")) this.reload(world);
      if (input.mouseDown) this.fire(world);
      if (input.consume("q")) this.useQ(world);
      if (input.consume("e")) this.useE(world);
      if (this.weaponModel) this.weaponModel.position.z = THREE.MathUtils.lerp(this.weaponModel.position.z, 0, 0.18);
    }

    reload(world) {
      const def = this.weapon;
      const ammo = this.weaponAmmo[def.key];
      if (this.reloadTimer > 0 || ammo.clip >= def.ammoSize || ammo.reserve <= 0) return;
      this.reloadTimer = def.reload;
      world.audio.play("reload");
      window.setTimeout(() => {
        const need = def.ammoSize - ammo.clip;
        const take = Math.min(need, ammo.reserve);
        ammo.clip += take;
        ammo.reserve -= take;
      }, def.reload * 1000);
    }

    fire(world) {
      const def = this.weapon;
      const ammo = this.weaponAmmo[def.key];
      if (this.reloadTimer > 0 || this.fireCooldown > 0) return;
      if (ammo.clip <= 0) {
        this.reload(world);
        return;
      }
      ammo.clip -= 1;
      this.fireCooldown = 1 / def.fireRate;
      if (this.weaponModel) this.weaponModel.position.z = 0.12;
      world.audio.play(def.flame ? "flame" : "shot");
      const origin = new THREE.Vector3();
      if (this.group.userData.weaponSocket) this.group.userData.weaponSocket.getWorldPosition(origin);
      else origin.copy(this.group.position).add(new THREE.Vector3(0, 1.28, 0));
      const target = world.getAimTarget ? world.getAimTarget(def.range) : origin.clone().addScaledVector(world.aimDirection, def.range);
      const baseDir = target.clone().sub(origin).normalize();
      if (world.spawnMuzzleFlash) world.spawnMuzzleFlash(origin, def.color, def.flame);
      if (world.addCameraShake) world.addCameraShake(def.flame ? 0.05 : 0.12);
      for (let p = 0; p < def.pellets; p += 1) {
        const dir = window.CryptoApex.weapons.randomSpread(baseDir, this.aiming ? def.spread * 0.45 : def.spread);
        const end = origin.clone().addScaledVector(dir, def.range);
        window.CryptoApex.weapons.createTracer(world.scene, origin, end, def.color);
        world.hitScan(origin, dir, def);
      }
    }

    useQ(world) {
      if (this.cooldowns.q > 0) return;
      if (this.heroKey === "satoshi") {
        world.turrets.push(createTurret(world.scene, this.group.position.clone().add(world.cameraForward.clone().multiplyScalar(1.8))));
        window.CryptoApex.missions.showLesson("miningNode");
        this.cooldowns.q = 16;
      } else {
        world.traps.push(createTrap(world.scene, this.group.position.clone(), world.aimDirection.clone()));
        this.cooldowns.q = 12;
      }
      world.audio.play("ability");
    }

    useE(world) {
      if (this.cooldowns.e > 0) return;
      if (this.heroKey === "satoshi") {
        world.shields.push(createShield(world.scene, this.group));
        window.CryptoApex.missions.showLesson("genesis");
        world.audio.play("shield");
        this.cooldowns.e = 18;
      } else {
        for (let i = -2; i <= 2; i += 1) {
          const dir = world.aimDirection.clone();
          dir.x += i * 0.035;
          const origin = this.group.position.clone().add(new THREE.Vector3(0, 1.28, 0));
          window.CryptoApex.weapons.createTracer(world.scene, origin, origin.clone().addScaledVector(dir.normalize(), 62), 0x14f195);
          world.hitScan(origin, dir.normalize(), { ...this.weapon, damage: 14, range: 62 });
        }
        world.audio.play("ability");
        this.cooldowns.e = 10;
      }
    }

    takeDamage(amount, world) {
      if (world.shields.length) amount *= 0.25;
      let remaining = amount;
      if (this.shield > 0) {
        const blocked = Math.min(this.shield, remaining);
        this.shield -= blocked;
        remaining -= blocked;
      }
      if (remaining > 0) this.health = Math.max(0, this.health - remaining);
      world.audio.play("hurt");
      window.CryptoApex.ui.flashDamage();
      if (this.health <= 0) world.respawn();
    }

    onKill() {
      if (this.heroKey === "anatoly") this.speedBuff = 3;
    }
  }

  window.CryptoApex = window.CryptoApex || {};
  window.CryptoApex.Player = Player;
})();
