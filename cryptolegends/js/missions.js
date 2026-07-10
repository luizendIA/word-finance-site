(function () {
  const phases = [
    {
      key: "city",
      name: "Fase 1 - Cidade Fiat",
      duration: 8 * 60,
      bounds: 82,
      enemyMix: ["grunt", "liquidator"],
      spawnEvery: 5.2,
      maxEnemies: 6,
      target: "Colete 50 CRED e sobreviva as ondas de Inflatores.",
      lesson: "Assim como seu arsenal nasce de fragmentos, o Bitcoin nasce de blocos. A diferenca e que ninguem pode decidir imprimir mais de 21 milhoes para salvar um projeto politico."
    },
    {
      key: "mint",
      name: "Fase 2 - Casa da Moeda",
      duration: 7 * 60,
      bounds: 78,
      enemyMix: ["grunt", "elite", "heavy", "censor"],
      spawnEvery: 3.1,
      maxEnemies: 13,
      bossAt: 0.58,
      target: "Derrote elites, venca o Tesoureiro Inflador e abra a Cidadela.",
      lesson: "Oferta monetaria e poder. Quando poucos controlam a emissao, todos os outros pagam a conta em precos maiores."
    },
    {
      key: "citadel",
      name: "Fase 3 - Cidadela Descentralizada",
      duration: 5 * 60,
      bounds: 54,
      enemyMix: [],
      spawnEvery: 99,
      safe: true,
      target: "Use a loja, personalize a casa NFT e prepare a proxima missao.",
      lesson: "Um hub descentralizado permite posse, troca e evolucao de itens sem depender de uma autoridade unica dentro do jogo."
    },
    {
      key: "mine",
      name: "Fase 4 - Mina de Bitcoin",
      duration: 7 * 60,
      bounds: 74,
      enemyMix: ["elite", "heavy", "miner"],
      spawnEvery: 2.6,
      maxEnemies: 15,
      lessonKey: "mine",
      target: "Defenda os mineradores e colete pecas da Escopeta Proof-of-Work.",
      lesson: "Mineracao transforma energia e trabalho em seguranca. A dificuldade ajusta o ritmo para preservar a escassez."
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
      lesson: "Imprimir trilhoes parece solucao curta, mas destroi o poder de compra. Redes abertas criam uma saida verificavel."
    },
    {
      key: "lightning",
      name: "Fase 6 - Rodovia Lightning",
      duration: 6 * 60,
      bounds: 80,
      enemyMix: ["grunt", "elite", "liquidator"],
      spawnEvery: 2.2,
      maxEnemies: 16,
      killTarget: 25,
      lessonKey: "lightning",
      target: "Proteja os canais de pagamento: derrote 25 Inflatores antes do tempo acabar.",
      lesson: "A Lightning Network liquida pagamentos de Bitcoin em segundos, com taxas de centavos. Canais abertos entre pessoas substituem a fila e a taxa do banco."
    },
    {
      key: "defi",
      name: "Fase 7 - Distrito DeFi",
      duration: 7 * 60,
      bounds: 76,
      enemyMix: ["elite", "heavy", "oracle"],
      spawnEvery: 2.4,
      maxEnemies: 16,
      bossAt: 0.55,
      lessonKey: "defi",
      target: "Defenda o DEX dos sabotadores e derrote o Tesoureiro que voltou por vinganca.",
      lesson: "Numa exchange descentralizada voce troca ativos direto da sua carteira, sem entregar custodia. Chave privada sua, dinheiro seu: not your keys, not your coins."
    },
    {
      key: "halving",
      name: "Fase 8 - Protocolo Halving",
      duration: 8 * 60,
      bounds: 82,
      enemyMix: ["grunt", "elite", "heavy", "censor"],
      spawnEvery: 2.0,
      maxEnemies: 20,
      bossAt: 0.5,
      mega: true,
      lessonKey: "halving",
      target: "Sobreviva as ondas do Halving e derrote o Banqueiro Central das Sombras.",
      lesson: "A cada 4 anos o halving corta pela metade a emissao de novos bitcoins. Escassez programada e previsivel: o oposto exato da impressora infinita."
    },
    {
      key: "solana",
      name: "Fase 9 - Ponte Solana PIXC",
      duration: 6 * 60,
      bounds: 86,
      enemyMix: ["grunt", "elite", "bridge", "liquidator"],
      spawnEvery: 1.95,
      maxEnemies: 18,
      killTarget: 30,
      lessonKey: "solana",
      target: "Defenda a ponte PIXC: derrote 30 phishers e mantenha as confirmacoes fluindo.",
      lesson: "Solana move tokens SPL como PIXC em segundos. Velocidade sem autocustodia vira risco; velocidade com chave sua vira ferramenta."
    },
    {
      key: "custody",
      name: "Fase 10 - Fortaleza da Autocustodia",
      duration: 6 * 60,
      bounds: 72,
      enemyMix: ["custody", "heavy", "elite", "censor"],
      spawnEvery: 2.05,
      maxEnemies: 18,
      bossAt: 0.55,
      requiresBoss: true,
      lessonKey: "custody",
      target: "Proteja as seeds da fortaleza e derrote o Tesoureiro invasor.",
      lesson: "Uma seed perdida pode significar fundos perdidos. Liberdade financeira exige backup, cuidado e responsabilidade."
    },
    {
      key: "merchant",
      name: "Fase 11 - Bazar WordFinance Pay",
      duration: 7 * 60,
      bounds: 84,
      enemyMix: ["merchant", "bridge", "grunt", "elite", "liquidator"],
      spawnEvery: 1.82,
      maxEnemies: 22,
      killTarget: 38,
      lessonKey: "merchant",
      target: "Defenda lojistas livres: derrote 38 sabotadores de checkout.",
      lesson: "Um gateway nao custodial deixa o lojista receber USDC, BTC ou PIXC direto na propria carteira. Menos friccao, mais escolha."
    },
    {
      key: "ark",
      name: "Fase 12 - Arca da Soberania",
      duration: 8 * 60,
      bounds: 90,
      enemyMix: ["custody", "merchant", "heavy", "elite", "oracle", "censor"],
      spawnEvery: 1.7,
      maxEnemies: 24,
      bossAt: 0.5,
      killTarget: 45,
      requiresBoss: true,
      lessonKey: "sovereignty",
      target: "Conclua a temporada: venca o boss, derrote 45 inimigos e proteja a Arca.",
      lesson: "Soberania financeira e uma soma de escolhas: conhecimento, autocustodia, pagamentos livres e responsabilidade."
    }
  ];

  const lessons = {
    firstWeapon: {
      speaker: "Arquivo Bitcoin",
      text: "Assim como voce constroi seu arsenal aos poucos, o Bitcoin e construido bloco a bloco. A oferta limitada protege contra decisoes politicas de impressao infinita."
    },
    genesis: {
      speaker: "Campo Genesis",
      text: "Este campo representa confianca descentralizada: regras publicas, validacao distribuida e resistencia a manipulacao."
    },
    miningNode: {
      speaker: "No de Mineracao",
      text: "Nos independentes verificam regras. A rede nao pede permissao a um ministro para dizer qual saldo e verdadeiro."
    },
    mine: {
      speaker: "Mina de Bitcoin",
      text: "Hash + energia + dificuldade = seguranca. A prova de trabalho torna caro atacar a rede e simples verificar a verdade."
    },
    boss: {
      speaker: "Senador da Impressora",
      text: "Imprimirei trilhoes para me reeleger!"
    },
    heroBoss: {
      speaker: "Heroi",
      text: "Voce so destroi o poder de compra do povo. A blockchain e a saida."
    },
    lightning: {
      speaker: "Rede",
      text: "Estes pilares sao canais Lightning: dois participantes travam fundos e trocam milhares de pagamentos fora da fila principal. Rapido, barato e sem pedir licenca."
    },
    defi: {
      speaker: "Rede",
      text: "No Distrito DeFi, os livros de ofertas sao contratos publicos. Qualquer um audita, ninguem congela sua conta. Liberdade exige responsabilidade: guarde bem sua seed."
    },
    halving: {
      speaker: "Rede",
      text: "Alerta de Halving! A emissao caiu pela metade. Quando a oferta nova encolhe, a regra continua publica e previsivel. Matematica, nao promessa."
    },
    megaBoss: {
      speaker: "Banqueiro das Sombras",
      text: "Eu controlo o preco do dinheiro do mundo inteiro. Acha que um agente com um rifle muda isso?"
    },
    heroMegaBoss: {
      speaker: "Heroi",
      text: "Nao sou so eu. Somos milhoes de nos validando cada bloco. Seu monopolio acabou."
    },
    solana: {
      speaker: "Ponte Solana",
      text: "PIXC via SPL precisa de carteira conectada e confirmacao on-chain. No jogo, gastar PIXC abre vantagens; na vida real, confirme sempre o destino antes de assinar."
    },
    custody: {
      speaker: "Guardiao da Seed",
      text: "Autocustodia nao e decoracao. Seed offline, backup seguro e nenhuma captura de tela: liberdade sem cuidado vira perda."
    },
    merchant: {
      speaker: "Rede WordFinance Pay",
      text: "Pagamentos livres ajudam lojistas a receber no proprio endereco. O cliente escolhe o trilho, o lojista recebe sem entregar a carteira."
    },
    sovereignty: {
      speaker: "Arca da Soberania",
      text: "Conhecimento, carteira, pagamentos e comunidade formam a defesa final. Esse e o mapa da WordFinance: aprender jogando, usar com responsabilidade."
    }
  };

  const state = {
    phaseIndex: 0,
    phaseTime: 0,
    totalTime: 0,
    bossSpawned: false,
    phaseBossDefeated: false,
    finalBossDefeated: false,
    megaBossDefeated: false,
    phaseKills: 0,
    seasonCompletions: 0,
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
      state.phaseBossDefeated = false;
      if (phase.mega) {
        showLesson("megaBoss");
        window.setTimeout(() => showLesson("heroMegaBoss"), 3600);
        world.spawnBoss("megaBoss");
      } else if (phase.final) {
        showLesson("boss");
        window.setTimeout(() => showLesson("heroBoss"), 3600);
        world.spawnBoss("finalBoss");
      } else {
        world.spawnBoss(phase.bossClass || "boss");
      }
    }

    if (phase.lessonKey && !state.lessonSeen[phase.lessonKey] && progress() > 0.08) showLesson(phase.lessonKey);

    const bossGate = (phase.final && !state.finalBossDefeated) ||
      (phase.mega && !state.megaBossDefeated) ||
      (phase.requiresBoss && !state.phaseBossDefeated);

    if (phase.killTarget && state.phaseKills >= phase.killTarget && !bossGate) {
      advance(world);
      return;
    }
    if (state.phaseTime >= phase.duration && !bossGate) advance(world);
  }

  function advance(world) {
    const old = currentPhase();
    if (state.phaseIndex >= phases.length - 1) {
      completeSeason(world, old);
      return;
    }
    state.phaseIndex += 1;
    state.phaseTime = 0;
    state.bossSpawned = false;
    state.phaseBossDefeated = false;
    state.phaseKills = 0;
    const phase = currentPhase();
    world.transitionPhase(old, phase);
    showDialogue("Rede", phase.lesson);
    grantPhaseReward(phase);
  }

  function grantPhaseReward(phase) {
    if (phase.key === "citadel") {
      window.CryptoApex.economy.addItem({
        type: "casa",
        name: "Casa NFT da Cidadela",
        rarity: "Raro",
        nft: true,
        lesson: "Sua base persistente pode evoluir e carregar itens decorativos tokenizados."
      });
    } else if (phase.key === "solana") {
      window.CryptoApex.economy.addCred(450, "rota Solana desbloqueada");
      window.CryptoApex.economy.addItem({ type: "mapa", name: "Mapa da Ponte Solana", rarity: "Raro", nft: true, lesson: "Rotas rapidas exigem verificacao de destino antes da assinatura." });
    } else if (phase.key === "custody") {
      window.CryptoApex.economy.addCred(600, "fortaleza liberada");
      window.CryptoApex.economy.addItem({ type: "selo", name: "Selo Seed Guardada", rarity: "Epico", nft: true, lesson: "Backup seguro transforma autocustodia em poder pratico." });
    } else if (phase.key === "merchant") {
      window.CryptoApex.economy.addCred(700, "bazar liberado");
      window.CryptoApex.economy.addItem({ type: "licenca", name: "Licenca de Lojista Livre", rarity: "Epico", nft: true, lesson: "Receber direto na carteira reduz dependencia de intermediarios." });
    }
  }

  function completeSeason(world, old) {
    state.seasonCompletions += 1;
    state.phaseTime = 0;
    state.phaseKills = 0;
    state.bossSpawned = false;
    state.phaseBossDefeated = false;
    window.CryptoApex.economy.addCred(3000, "temporada soberania completa");
    window.CryptoApex.economy.addItem({
      type: "emblema",
      name: `Arca da Soberania ${state.seasonCompletions}`,
      rarity: "Lendario",
      nft: true,
      lesson: "Temporadas recorrentes mantem aprendizado e progressao sem prometer retorno financeiro."
    });
    window.CryptoApex?.ui?.showPhaseComplete?.(old, null);
    world.audio?.play?.("levelup");
    showDialogue("Rede", "TEMPORADA COMPLETA! +3000 CRED. A Arca foi protegida; agora o endgame reinicia ondas mais fortes para farmar itens, craftar e gastar PIXC com escolhas conscientes.");
    window.CryptoApex.economy.saveGame(world);
  }

  function onEnemyKilled(classKey) {
    state.phaseKills += 1;
    if (classKey === "boss") {
      state.phaseBossDefeated = true;
      window.CryptoApex.economy.addBossVoucher("boss");
      window.CryptoApex.economy.addItem({
        type: "chave",
        name: "Chave da Cidadela",
        rarity: "Raro",
        nft: true,
        lesson: "A chave abre a area segura onde sua propriedade digital ganha forma fisica."
      });
    }
    if (classKey === "megaBoss") {
      state.megaBossDefeated = true;
      window.CryptoApex.economy.addCred(2000, "ato halving concluido");
      window.CryptoApex.economy.addBossVoucher("finalBoss");
      window.CryptoApex.economy.addItem({
        type: "emblema",
        name: "Coroa do Protocolo Halving",
        rarity: "Lendario",
        nft: true,
        lesson: "Voce concluiu o arco do Halving. Escassez verificavel abriu caminho para pagamentos, autocustodia e comercio livre."
      });
      showDialogue("Rede", "O Banqueiro das Sombras caiu. +2000 CRED. Novas frentes abriram: Ponte Solana PIXC, Fortaleza da Autocustodia, Bazar WordFinance Pay e Arca da Soberania.");
    }
    if (classKey === "finalBoss") {
      state.finalBossDefeated = true;
      window.CryptoApex.economy.addCred(1000, "vitoria final");
      window.CryptoApex.economy.addBossVoucher("finalBoss");
      window.CryptoApex.economy.addItem({
        type: "emblema",
        name: "Emblema Lendario da Liberdade",
        rarity: "Lendario",
        nft: true,
        lesson: "Vitoria contra inflacao politica: regras verificaveis importam."
      });
      showDialogue("Rede", "Senador derrotado! Mas a luta nao acabou: novas fases desbloqueadas - Rodovia Lightning, Distrito DeFi e o Protocolo Halving.");
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
