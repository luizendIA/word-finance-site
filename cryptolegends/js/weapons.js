(function () {
  const defs = [
    { key: "rifle", name: "Rifle da Descentralizacao", type: "Rifle Precisao", damage: 48, pellets: 1, fireRate: 4.5, ammoSize: 30, reserve: 120, reload: 1.45, spread: 0.012, range: 95, rarity: "Comum", fragmentKey: "rifle", fragmentsNeeded: 4, color: 0x14f195 },
    { key: "shotgun", name: "Escopeta Proof-of-Work", type: "Escopeta", damage: 18, pellets: 5, fireRate: 0.8, ammoSize: 8, reserve: 48, reload: 1.85, spread: 0.09, range: 42, rarity: "Incomum", fragmentKey: "shotgun", fragmentsNeeded: 5, color: 0xffd166 },
    { key: "smg", name: "SMG Lightning Network", type: "Submetralhadora", damage: 10, pellets: 1, fireRate: 8, ammoSize: 42, reserve: 180, reload: 1.2, spread: 0.035, range: 58, rarity: "Raro", fragmentKey: "smg", fragmentsNeeded: 6, color: 0x5df2ff },
    { key: "revolver", name: "Revolver Cold Wallet", type: "Revolver", damage: 60, pellets: 1, fireRate: 1.2, ammoSize: 6, reserve: 42, reload: 1.7, spread: 0.008, range: 110, rarity: "Raro", fragmentKey: "revolver", fragmentsNeeded: 5, color: 0x7b8cff },
    { key: "defi", name: "Lanca-chamas DeFi", type: "Especial", damage: 15, pellets: 1, fireRate: 12, ammoSize: 80, reserve: 220, reload: 2.2, spread: 0.08, range: 26, rarity: "Lendario", fragmentKey: "defi", fragmentsNeeded: 8, color: 0xff6a3d, flame: true }
  ];

  function material(color, emission, intensity, metalness) {
    return new THREE.MeshStandardMaterial({
      color,
      emissive: emission || 0x000000,
      emissiveIntensity: intensity || 0,
      metalness: metalness == null ? 0.48 : metalness,
      roughness: 0.28
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

  function energyNode(group, color, position, size) {
    const node = add(group, new THREE.OctahedronGeometry(size || 0.1, 0), material(color, color, 0.72, 0.18), position);
    group.userData.energyParts.push(node);
    return node;
  }

  function barrel(group, mat, position, length, radius) {
    const body = add(group, new THREE.CylinderGeometry(radius || 0.055, (radius || 0.055) * 0.82, length, 12), mat, position, [Math.PI / 2, 0, 0]);
    const muzzle = add(group, new THREE.TorusGeometry((radius || 0.055) * 1.35, 0.018, 8, 16), mat, [position[0], position[1], position[2] - length * 0.5], [Math.PI / 2, 0, 0]);
    return { body, muzzle };
  }

  function makeWeaponModel(def) {
    const group = new THREE.Group();
    group.userData.energyParts = [];
    group.userData.weaponKey = def.key;
    const dark = material(0x15202a, 0x051018, 0.08, 0.72);
    const black = material(0x080c12, 0x000000, 0, 0.55);
    const accent = material(def.color, def.color, 0.35, 0.35);
    const white = material(0xdffcff, 0x5df2ff, 0.5, 0.22);

    const grip = add(group, new THREE.BoxGeometry(0.16, 0.46, 0.18), black, [-0.08, -0.33, 0.18], [-0.35, 0, 0]);
    add(group, new THREE.BoxGeometry(0.38, 0.26, 0.54), dark, [0, -0.02, 0.08]);
    add(group, new THREE.BoxGeometry(0.22, 0.07, 0.72), black, [0.02, 0.16, -0.22]);
    energyNode(group, def.color, [0, 0.04, -0.12], 0.12);

    if (def.key === "rifle") {
      add(group, new THREE.BoxGeometry(0.24, 0.18, 0.76), dark, [-0.23, -0.06, 0.48]);
      barrel(group, dark, [0.08, 0.03, -0.78], 1.65, 0.065);
      add(group, new THREE.BoxGeometry(0.11, 0.07, 1.32), accent, [0.08, 0.2, -0.74]);
      add(group, new THREE.BoxGeometry(0.34, 0.18, 0.48), black, [0.02, -0.16, -0.46]);
      const sight = add(group, new THREE.TorusGeometry(0.09, 0.017, 8, 18), white, [0.08, 0.28, -0.48], [Math.PI / 2, 0, 0]);
      group.userData.energyParts.push(sight);
      [-0.4, -0.66, -0.92].forEach((z) => {
        const coil = add(group, new THREE.TorusGeometry(0.085, 0.016, 8, 14), accent, [0.08, 0.03, z], [Math.PI / 2, 0, 0]);
        group.userData.energyParts.push(coil);
      });
    } else if (def.key === "shotgun") {
      [-0.09, 0.09].forEach((x) => barrel(group, dark, [x, 0.02, -0.72], 1.32, 0.075));
      add(group, new THREE.CylinderGeometry(0.085, 0.085, 0.9, 12), accent, [0, -0.1, -0.45], [Math.PI / 2, 0, 0]);
      add(group, new THREE.BoxGeometry(0.34, 0.2, 0.5), dark, [0, -0.12, -0.52]);
      add(group, new THREE.BoxGeometry(0.36, 0.11, 0.58), black, [-0.13, -0.08, 0.5], [0, 0, -0.12]);
      [-0.18, 0.18].forEach((x) => energyNode(group, def.color, [x, 0.16, -0.4], 0.07));
    } else if (def.key === "smg") {
      barrel(group, black, [0.08, 0.05, -0.62], 1.12, 0.05);
      add(group, new THREE.BoxGeometry(0.42, 0.32, 0.6), dark, [-0.02, -0.02, -0.25]);
      add(group, new THREE.BoxGeometry(0.18, 0.38, 0.22), accent, [-0.05, -0.36, -0.14], [-0.18, 0, 0]);
      [-0.16, -0.06, 0.04, 0.14].forEach((x) => add(group, new THREE.BoxGeometry(0.045, 0.14, 0.42), black, [x, 0.18, -0.34]));
      const battery = add(group, new THREE.CylinderGeometry(0.095, 0.095, 0.54, 12), accent, [0.22, -0.03, 0.04], [Math.PI / 2, 0, 0]);
      group.userData.energyParts.push(battery);
    } else if (def.key === "revolver") {
      barrel(group, dark, [0.1, 0.04, -0.56], 1.02, 0.07);
      const cylinder = add(group, new THREE.CylinderGeometry(0.2, 0.2, 0.3, 12), accent, [0.02, 0.04, -0.08], [0, 0, Math.PI / 2]);
      group.userData.energyParts.push(cylinder);
      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * Math.PI * 2;
        add(group, new THREE.CylinderGeometry(0.035, 0.035, 0.315, 8), black, [0.02, 0.04 + Math.sin(angle) * 0.12, -0.08 + Math.cos(angle) * 0.12], [0, 0, Math.PI / 2]);
      }
      add(group, new THREE.BoxGeometry(0.34, 0.14, 0.38), dark, [-0.16, -0.03, 0.28]);
      const target = add(group, new THREE.TorusGeometry(0.075, 0.014, 8, 16), white, [0.1, 0.22, -0.55], [Math.PI / 2, 0, 0]);
      group.userData.energyParts.push(target);
    } else if (def.key === "defi") {
      [-0.18, 0.18].forEach((x) => {
        const tank = add(group, new THREE.CylinderGeometry(0.13, 0.13, 0.58, 14), accent, [x, -0.12, 0.26], [Math.PI / 2, 0, 0]);
        group.userData.energyParts.push(tank);
      });
      add(group, new THREE.CylinderGeometry(0.16, 0.075, 0.98, 14), dark, [0.05, 0.02, -0.65], [Math.PI / 2, 0, 0]);
      add(group, new THREE.ConeGeometry(0.2, 0.34, 14), accent, [0.05, 0.02, -1.25], [Math.PI / 2, 0, 0]);
      [-0.24, 0.24].forEach((x) => {
        const tube = add(group, new THREE.TorusGeometry(0.22, 0.024, 8, 18), accent, [x, -0.06, -0.22], [Math.PI / 2, 0, 0]);
        group.userData.energyParts.push(tube);
      });
      add(group, new THREE.BoxGeometry(0.42, 0.14, 0.72), black, [-0.12, -0.18, -0.36]);
    }

    group.scale.setScalar(0.78);
    return group;
  }

  function updateWeaponModel(model, elapsed, dt) {
    if (!model) return;
    const pulse = 0.45 + Math.sin(elapsed * 7) * 0.2;
    (model.userData.energyParts || []).forEach((part, index) => {
      if (part.material && "emissiveIntensity" in part.material) part.material.emissiveIntensity = pulse + index * 0.02;
      part.rotation.z += dt * (0.22 + index * 0.018);
    });
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
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.006, len, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.86 }));
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
  window.CryptoApex.weapons = { defs, byKey: Object.fromEntries(defs.map((def) => [def.key, def])), makeWeaponModel, updateWeaponModel, createTracer, randomSpread };
})();
