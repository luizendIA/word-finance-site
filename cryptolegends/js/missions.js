(function () {
  const phases = [
    {
      key: "city",
      name: "Fase 1 - Cidade Fiat",
      duration: 8 * 60,
      bounds: 82,
      enemyMix: ["grunt"],
      spawnEvery: 5.2,
      maxEnemies: 6,
      target: "Colete 50 CRED e sobreviva às ondas de Inflatores.",
      lesson: "Assim como seu arsenal nasce de fragmentos, o Bitcoin nasce de blocos. A diferença é que ninguém pode decidir imprimir mais de 21 milhões para salvar um projeto político."
    },
    {
      key: "mint",
      name: "Fase 2 - Casa da Moeda",
      duration: 7 * 60,
      bounds: 78,
      enemyMix: ["grunt", "elite", "heavy"],
      spawnEvery: 3.1,
      maxEnemies: 13,
      bossAt: 0.58,
      target: "Derrote elites, vença o Tesoureiro Inflador e abra a Cidadela.",
      lesson: "Oferta monetária é poder. Quando poucos controlam a emissão, todos os outros pagam a conta em preços maiores."
    },
    {
      key: "citadel",
      name: "Fase 3 - Cidadela Descentralizada",
      duration: 5 * 60,
      bounds: 54,
      enemyMix: [],
      spawnEvery: 99,
      safe: true,
      target: "Use a loja, personalize a casa NFT e prepare a próxima missão.",
      lesson: "Um hub descentralizado permite posse, troca e evolução de itens sem depender de uma autoridade única dentro do jogo."
    },
    {
      key: "mine",
      name: "Fase 4 - Mina de Bitcoin",
      duration: 7 * 60,
      bounds: 74,
      enemyMix: ["elite", "heavy"],
      spawnEvery: 2.6,
      maxEnemies: 15,
      target: "Defenda os mineradores e colete peças da Escopeta Proof-of-Work.",
      lesson: "Mineração transforma energia e trabalho em segurança. A dificuldade ajusta o ritmo para preservar a escassez."
    },
    {
      key: "congress",
      name: "Fase 5 - Congresso Corrupto",
      duration: 3 * 60,
      bounds: 78,
      enemyMix: ["grunt", "elite", "heavy"],
      spawnEvery: 2.25,
      maxEnemies: 18,
      bossAt: 0.35,
      final: true,
      target: "Derrube o Senador da Impressora Infinita.",
      lesson: "Imprimir trilhões parece solução curta, mas destrói o poder de compra. Redes abertas criam uma saída verificável."
    }
  ];

  const lessons = {
    firstWeapon: {
      speaker: "Arquivo Bitcoin",
      text: "Assim como você constrói seu arsenal aos poucos, o Bitcoin é construído bloco a bloco. A oferta limitada protege contra decisões políticas de impressão infinita."
    },
    genesis: {
      speaker: "Campo Genesis",
      text: "Este campo representa confiança descentralizada: regras públicas, validação distribuída e resistência à manipulação."
    },
    miningNode: {
      speaker: "Nó de Mineração",
      text: "Nós independentes verificam regras. A rede não pede permissão a um ministro para dizer qual saldo é verdadeiro."
    },
    mine: {
      speaker: "Mina de Bitcoin",
      text: "Hash + energia + dificuldade = segurança. A prova de trabalho torna caro atacar a rede e simples verificar a verdade."
    },
    boss: {
      speaker: "Senador da Impressora",
      text: "Imprimirei trilhões para me reeleger!"
    },
    heroBoss: {
      speaker: "Herói",
      text: "Você só destrói o poder de compra do povo. A blockchain é a saída."
    }
  };

  const state = {
    phaseIndex: 0,
    phaseTime: 0,
    totalTime: 0,
    bossSpawned: false,
    finalBossDefeated: false,
    lessonSeen: {}
  };

  function currentPhase() {
    return phases[state.phaseIndex] || phases[phases.length - 1];
  }

  function progress() {
    return Math.min(1, state.phaseTime / currentPhase().duration);
  }

  function update(dt, world) {
    const phase = currentPhase();
    state.phaseTime += dt;
    state.totalTime += dt;

    if (phase.key === "city" && window.CryptoApex.economy.state.cred >= 50 && state.phaseTime > 80) {
      advance(world);
      return;
    }

    if (phase.bossAt && !state.bossSpawned && progress() >= phase.bossAt) {
      state.bossSpawned = true;
      if (phase.final) {
        showLesson("boss");
        window.setTimeout(() => showLesson("heroBoss"), 3600);
        world.spawnBoss("finalBoss");
      } else {
        world.spawnBoss("boss");
      }
    }

    if (phase.key === "mine" && !state.lessonSeen.mine && progress() > 0.1) showLesson("mine");
    if (state.phaseTime >= phase.duration && (!phase.final || state.finalBossDefeated)) advance(world);
  }

  function advance(world) {
    const old = currentPhase();
    state.phaseIndex = Math.min(state.phaseIndex + 1, phases.length - 1);
    state.phaseTime = 0;
    state.bossSpawned = false;
    const phase = currentPhase();
    world.transitionPhase(old, phase);
    showDialogue("Rede", phase.lesson);
    if (phase.key === "citadel") {
      window.CryptoApex.economy.addItem({
        type: "casa",
        name: "Casa NFT da Cidadela",
        rarity: "Raro",
        nft: true,
        lesson: "Sua base persistente pode evoluir e carregar itens decorativos tokenizados."
      });
    }
  }

  function onEnemyKilled(classKey) {
    if (classKey === "finalBoss") {
      state.finalBossDefeated = true;
      window.CryptoApex.economy.addCred(1000, "vitória final");
      window.CryptoApex.economy.addItem({
        type: "emblema",
        name: "Emblema Lendário da Liberdade",
        rarity: "Lendario",
        nft: true,
        lesson: "Vitória contra inflação política: regras verificáveis importam."
      });
      showDialogue("Rede", "Boss final derrotado. O endgame continua com ondas infinitas para farmar CRED, fragmentos e NFTs.");
    }
    if (classKey === "boss") {
      window.CryptoApex.economy.addItem({
        type: "chave",
        name: "Chave da Cidadela",
        rarity: "Raro",
        nft: true,
        lesson: "A chave abre a área segura onde sua propriedade digital ganha forma física."
      });
    }
  }

  function showLesson(key) {
    if (state.lessonSeen[key]) return;
    state.lessonSeen[key] = true;
    const entry = lessons[key];
    if (entry) showDialogue(entry.speaker, entry.text);
  }

  function showDialogue(speaker, text) {
    window.CryptoApex?.ui?.dialogue?.(speaker, text);
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  window.CryptoApex = window.CryptoApex || {};
  window.CryptoApex.missions = {
    phases,
    state,
    currentPhase,
    progress,
    update,
    advance,
    onEnemyKilled,
    showLesson,
    showDialogue,
    formatTime
  };
})();
