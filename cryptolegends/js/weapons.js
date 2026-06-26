(function () {
  const defs = [
    {
      key: "rifle",
      name: "Rifle da Descentralização",
      type: "Rifle Precisão",
      damage: 48,
      pellets: 1,
      fireRate: 4.5,
      ammoSize: 30,
      reserve: 120,
      reload: 1.45,
      spread: 0.012,
      range: 95,
      rarity: "Comum",
      fragmentKey: "rifle",
      fragmentsNeeded: 4,
      color: 0x14f195
    },
    {
      key: "shotgun",
      name: "Escopeta Proof-of-Work",
      type: "Escopeta",
      damage: 18,
      pellets: 5,
      fireRate: 0.8,
      ammoSize: 8,
      reserve: 48,
      reload: 1.85,
      spread: 0.09,
      range: 42,
      rarity: "Incomum",
      fragmentKey: "shotgun",
      fragmentsNeeded: 5,
      color: 0xffd166
    },
    {
      key: "smg",
      name: "SMG Lightning Network",
      type: "Submetralhadora",
      damage: 10,
      pellets: 1,
      fireRate: 8,
      ammoSize: 42,
      reserve: 180,
      reload: 1.2,
      spread: 0.035,
      range: 58,
      rarity: "Raro",
      fragmentKey: "smg",
      fragmentsNeeded: 6,
      color: 0x5df2ff
    },
    {
      key: "revolver",
      name: "Revólver Cold Wallet",
      type: "Revólver",
      damage: 60,
      pellets: 1,
      fireRate: 1.2,
      ammoSize: 6,
      reserve: 42,
      reload: 1.7,
      spread: 0.008,
      range: 110,
      rarity: "Raro",
      fragmentKey: "revolver",
      fragmentsNeeded: 5,
      color: 0x7b8cff
    },
    {
      key: "defi",
      name: "Lança-chamas DeFi",
      type: "Especial",
      damage: 15,
      pellets: 1,
      fireRate: 12,
      ammoSize: 80,
      reserve: 220,
      reload: 2.2,
      spread: 0.08,
      range: 26,
      rarity: "Lendario",
      fragmentKey: "defi",
      fragmentsNeeded: 8,
      color: 0xff6a3d,
      flame: true
    }
  ];

  function makeWeaponModel(def) {
    const group = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0x202a31, metalness: 0.55, roughness: 0.32 });
    const accent = new THREE.MeshStandardMaterial({
      color: def.color,
      emissive: def.color,
      emissiveIntensity: 0.22,
      metalness: 0.28,
      roughness: 0.26
    });
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, def.key === "shotgun" ? 1.15 : 1.45), metal);
    barrel.position.set(0.16, 0, -0.55);
    barrel.castShadow = true;
    group.add(barrel);

    const core = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.56), accent);
    core.position.set(0, -0.02, 0.08);
    core.castShadow = true;
    group.add(core);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.16), metal);
    grip.rotation.x = -0.36;
    grip.position.set(-0.04, -0.32, 0.2);
    grip.castShadow = true;
    group.add(grip);

    if (def.key === "shotgun") {
      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.48), accent);
      pump.position.set(0.16, -0.08, -0.48);
      group.add(pump);
    }

    if (def.key === "revolver") {
      const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.22, 16), accent);
      cylinder.rotation.z = Math.PI / 2;
      cylinder.position.set(0.05, 0.02, -0.08);
      group.add(cylinder);
    }

    if (def.key === "defi") {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.56, 14), accent);
      tank.rotation.x = Math.PI / 2;
      tank.position.set(-0.22, -0.08, 0.1);
      group.add(tank);
    }

    group.scale.setScalar(0.82);
    return group;
  }

  function createTracer(scene, origin, end, color) {
    const dir = end.clone().sub(origin);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(0.035, 0.012, len, 10);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origin.clone().add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.userData.life = 0.12;
    scene.add(mesh);

    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.006, len, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.86 })
    );
    core.position.copy(mesh.position);
    core.quaternion.copy(mesh.quaternion);
    core.userData.life = 0.08;
    scene.add(core);
    return mesh;
  }

  function randomSpread(direction, spread) {
    const d = direction.clone();
    d.x += (Math.random() - 0.5) * spread;
    d.y += (Math.random() - 0.5) * spread;
    d.z += (Math.random() - 0.5) * spread;
    return d.normalize();
  }

  window.CryptoApex = window.CryptoApex || {};
  window.CryptoApex.weapons = {
    defs,
    byKey: Object.fromEntries(defs.map((def) => [def.key, def])),
    makeWeaponModel,
    createTracer,
    randomSpread
  };
})();
