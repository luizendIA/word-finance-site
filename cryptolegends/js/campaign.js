(function () {
  // ===== Crypto Legends - Campanha v4 =====
  // Diálogos cinematográficos, tutorial guiado e giveaway PIXC (100 primeiros).

  const GIVEAWAY = {
    email: "contato@wordfinance.org",
    limit: 100,
    rewardText: "PIXC de boas-vindas",
    storageKey: "cryptoLegends.giveaway.v1"
  };
  const TUTORIAL_KEY = "cryptoLegends.tutorial.v1";

  const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints || 0) > 1;

  // ---------- Retratos fotorrealistas (arte cinematográfica já usada no boot) ----------
  const portraits = {
    "Satoshi": "assets/concept-art/satoshi-cinematic.png",
    "Anatoly": "assets/concept-art/anatoly-cinematic.png",
    "Senador da Impressora": "assets/concept-art/senador-impressora-cinematic.png",
    "Tesoureiro Inflador": "assets/concept-art/tesoureiro-inflador-cinematic.png",
    "Inflatores": "assets/concept-art/inflator-squad-cinematic.png"
  };

  function heroPortrait() {
    const key = window.__CryptoApexWorld?.player?.heroKey || "satoshi";
    return key === "anatoly" ? portraits["Anatoly"] : portraits["Satoshi"];
  }

  function portraitFor(speaker) {
    if (portraits[speaker]) return portraits[speaker];
    if (speaker === "Herói" || speaker === "Instrutor") return heroPortrait();
    if (/senador/i.test(speaker)) return portraits["Senador da Impressora"];
    if (/tesoureiro/i.test(speaker)) return portraits["Tesoureiro Inflador"];
    if (/inflator/i.test(speaker)) return portraits["Inflatores"];
    return null;
  }

  // ---------- Fila de diálogos com efeito máquina de escrever ----------
  const dlg = {
    queue: [],
    active: false,
    typing: false,
    typeTimer: null,
    hideTimer: null,
    fullText: ""
  };

  function dialogueEls() {
    return {
      box: document.getElementById("dialogue"),
      speaker: document.getElementById("dialogue-speaker"),
      text: document.getElementById("dialogue-text"),
      portrait: document.getElementById("dialogue-portrait"),
      next: document.getElementById("dialogue-next")
    };
  }

  function dialogue(speaker, text) {
    dlg.queue.push({ speaker, text });
    if (!dlg.active) playNext();
  }

  function playNext() {
    const els = dialogueEls();
    if (!els.box) return;
    clearTimeout(dlg.hideTimer);
    clearInterval(dlg.typeTimer);
    const entry = dlg.queue.shift();
    if (!entry) {
      dlg.active = false;
      dlg.hideTimer = window.setTimeout(() => els.box.classList.add("hidden"), 900);
      return;
    }
    dlg.active = true;
    els.box.classList.remove("hidden");
    els.speaker.textContent = entry.speaker;
    const img = portraitFor(entry.speaker);
    if (els.portrait) {
      if (img) {
        els.portrait.src = img;
        els.portrait.classList.remove("hidden");
      } else {
        els.portrait.classList.add("hidden");
      }
    }
    dlg.fullText = entry.text;
    els.text.textContent = "";
    let i = 0;
    dlg.typing = true;
    dlg.typeTimer = window.setInterval(() => {
      i += 2;
      els.text.textContent = dlg.fullText.slice(0, i);
      if (i >= dlg.fullText.length) {
        clearInterval(dlg.typeTimer);
        dlg.typing = false;
        dlg.hideTimer = window.setTimeout(playNext, dlg.queue.length ? 3800 : 8200);
      }
    }, 18);
    if (els.next) els.next.textContent = dlg.queue.length ? "Toque para continuar ▸" : "Toque para fechar ▸";
  }

  function advanceDialogue() {
    const els = dialogueEls();
    if (!els.box || els.box.classList.contains("hidden")) return;
    if (dlg.typing) {
      clearInterval(dlg.typeTimer);
      dlg.typing = false;
      els.text.textContent = dlg.fullText;
      clearTimeout(dlg.hideTimer);
      dlg.hideTimer = window.setTimeout(playNext, dlg.queue.length ? 2600 : 6400);
      return;
    }
    playNext();
  }

  // ---------- Tutorial guiado ----------
  const tut = {
    running: false,
    stepIndex: -1,
    poll: null,
    snapshot: {}
  };

  function world() { return window.__CryptoApexWorld; }
  function eco() { return window.CryptoApex?.economy; }

  const steps = [
    {
      title: "Treinamento iniciado",
      goal: isMobile ? "Toque em ENTENDI para começar o treinamento de agente." : "Clique em ENTENDI para começar o treinamento de agente.",
      manual: true,
      say: ["Instrutor", "Bem-vindo à resistência, agente. Antes de enfrentar os Inflatores, vou te ensinar o básico. Siga as ordens no topo da tela."]
    },
    {
      title: "Movimento",
      goal: isMobile ? "Arraste o direcional (canto esquerdo) e ande pelo mapa." : "Use W, A, S, D para andar pelo mapa.",
      begin() {
        const p = world()?.player;
        tut.snapshot.pos = p ? p.group.position.clone() : null;
      },
      check() {
        const p = world()?.player;
        return p && tut.snapshot.pos && p.group.position.distanceTo(tut.snapshot.pos) > 4;
      },
      say: ["Instrutor", "Mobilidade é sobrevivência. Quem fica parado vira alvo — igual dinheiro parado na inflação."]
    },
    {
      title: "Mira",
      goal: isMobile ? "Arraste o dedo na metade direita da tela para mirar ao redor." : "Mova o mouse para mirar ao redor.",
      begin() { tut.snapshot.yaw = world()?.input?.yaw || 0; },
      check() { return Math.abs((world()?.input?.yaw || 0) - tut.snapshot.yaw) > 0.6; },
      say: ["Instrutor", "Boa. Olhe sempre ao redor: ameaças e oportunidades aparecem de todos os lados."]
    },
    {
      title: "Fogo",
      goal: isMobile ? "Toque no botão ● para atirar." : "Clique com o botão esquerdo para atirar.",
      begin() {
        const p = world()?.player;
        tut.snapshot.clip = p ? p.weaponAmmo[p.weapon.key].clip : 0;
      },
      check() {
        const p = world()?.player;
        return p && p.weaponAmmo[p.weapon.key].clip < tut.snapshot.clip;
      },
      say: ["Instrutor", "Seu rifle dispara verdade verificável. Cada Inflator abatido derruba um pouco da impressora."]
    },
    {
      title: "Recarga",
      goal: isMobile ? "Toque no botão R para recarregar." : "Pressione R para recarregar.",
      begin() { tut.snapshot.reloaded = false; },
      check() {
        const p = world()?.player;
        if (p && p.reloadTimer > 0) tut.snapshot.reloaded = true;
        return tut.snapshot.reloaded;
      },
      say: ["Instrutor", "Nunca fique sem munição. Prepare-se ANTES da crise — vale para pentes e para poupança."]
    },
    {
      title: "Colete CRED",
      goal: "Derrote Inflatores e colete 15 CRED (cubos verdes que eles derrubam).",
      begin() { tut.snapshot.cred = eco()?.state.cred || 0; },
      check() { return (eco()?.state.cred || 0) >= tut.snapshot.cred + 15; },
      say: ["Instrutor", "CRED é sua recompensa por trabalho, como sats por mineração. Ninguém pode imprimir CRED do nada."]
    },
    {
      title: "Loja PIXC",
      goal: "Conheça a LOJA (botão no painel à direita): itens comprados com PIXC dão vantagens reais — vida, escudo, turret e a Arma Lendária.",
      manual: true,
      say: ["Instrutor", "Com a carteira Word Finance ou Phantom conectada, você compra vantagens com PIXC, a stablecoin do Real. Itens viram patrimônio digital seu."]
    },
    {
      title: "Carteira + Giveaway",
      goal: "Conecte sua carteira (Word Finance no Android, Phantom no desktop) e toque em 🎁 GIVEAWAY para registrar sua carteira: os 100 primeiros ganham PIXC!",
      manual: true,
      say: ["Instrutor", "Os 100 primeiros agentes que completarem o treinamento e registrarem a carteira recebem PIXC de verdade, enviados pela tesouraria Word Finance."]
    }
  ];

  function startTutorial(force) {
    if (tut.running) return;
    if (!force && localStorage.getItem(TUTORIAL_KEY) === "done") return;
    tut.running = true;
    tut.stepIndex = -1;
    banner().classList.remove("hidden");
    nextStep();
    tut.poll = window.setInterval(() => {
      const step = steps[tut.stepIndex];
      if (!step || step.manual) return;
      if (step.check && step.check()) nextStep();
    }, 400);
  }

  function nextStep() {
    tut.stepIndex += 1;
    const step = steps[tut.stepIndex];
    if (!step) return finishTutorial(true);
    if (step.begin) step.begin();
    renderBanner(step);
    if (step.say) dialogue(step.say[0], step.say[1]);
  }

  function finishTutorial(completed) {
    clearInterval(tut.poll);
    tut.running = false;
    banner().classList.add("hidden");
    if (completed) {
      localStorage.setItem(TUTORIAL_KEY, "done");
      setGiveawayState({ eligible: true });
      eco()?.addCred(150, "treinamento completo");
      dialogue("Instrutor", "Treinamento concluído, agente! +150 CRED de bônus. Agora registre sua carteira no 🎁 GIVEAWAY: os 100 primeiros ganham PIXC. Boa caçada.");
      updateGiveawayButton();
    } else {
      localStorage.setItem(TUTORIAL_KEY, "done");
      window.CryptoApex?.ui?.toast?.("Tutorial pulado. Reative no botão ? do painel.");
    }
  }

  function banner() { return document.getElementById("tutorial-banner"); }

  function renderBanner(step) {
    const el = banner();
    if (!el) return;
    el.querySelector("#tutorial-step").textContent = `Treinamento ${tut.stepIndex + 1}/${steps.length} — ${step.title}`;
    el.querySelector("#tutorial-goal").textContent = step.goal;
    el.querySelector("#tutorial-ok").classList.toggle("hidden", !step.manual);
  }

  // ---------- Giveaway PIXC: 100 primeiros ----------
  function getGiveawayState() {
    try { return JSON.parse(localStorage.getItem(GIVEAWAY.storageKey)) || {}; } catch (e) { return {}; }
  }

  function setGiveawayState(patch) {
    const next = Object.assign(getGiveawayState(), patch);
    localStorage.setItem(GIVEAWAY.storageKey, JSON.stringify(next));
    return next;
  }

  function openGiveaway() {
    const panel = document.getElementById("giveaway-panel");
    if (!panel) return;
    panel.classList.remove("hidden");
    const st = getGiveawayState();
    const input = document.getElementById("giveaway-wallet");
    const connected = window.CryptoApex?.nft?.state?.publicKeyString;
    if (input && !input.value) input.value = st.wallet || connected || "";
    const status = document.getElementById("giveaway-status");
    if (status) {
      if (st.registered) {
        status.textContent = `✅ Registro enviado em ${st.date}. A tesouraria Word Finance confere manualmente e envia o PIXC para os 100 primeiros.`;
      } else if (!st.eligible) {
        status.textContent = "⚠️ Complete o treinamento (tutorial) para liberar o registro.";
      } else {
        status.textContent = "Você completou o treinamento. Registre sua carteira Solana para concorrer!";
      }
    }
  }

  function closeGiveaway() {
    document.getElementById("giveaway-panel")?.classList.add("hidden");
  }

  function submitGiveaway() {
    const st = getGiveawayState();
    if (!st.eligible) {
      window.CryptoApex?.ui?.toast?.("Complete o treinamento primeiro para liberar o giveaway.");
      return;
    }
    if (st.registered) {
      window.CryptoApex?.ui?.toast?.("Sua carteira já foi registrada.");
      return;
    }
    const wallet = (document.getElementById("giveaway-wallet")?.value || "").trim();
    const nick = (document.getElementById("giveaway-nick")?.value || "").trim();
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
      window.CryptoApex?.ui?.toast?.("Endereço Solana inválido. Cole o endereço da sua carteira Word Finance ou Phantom.");
      return;
    }
    const date = new Date().toISOString();
    const body = [
      "Registro Giveaway - Crypto Legends (100 primeiros)",
      `Carteira Solana: ${wallet}`,
      `Apelido: ${nick || "-"}`,
      `Data: ${date}`,
      `Plataforma: ${isMobile ? "mobile" : "desktop"}`
    ].join("\n");
    try { navigator.clipboard?.writeText(body); } catch (e) { /* silencioso */ }
    setGiveawayState({ registered: true, wallet, nick, date });
    const mailto = `mailto:${GIVEAWAY.email}?subject=${encodeURIComponent("Giveaway Crypto Legends - registro de carteira")}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank");
    const status = document.getElementById("giveaway-status");
    if (status) status.textContent = `✅ Registro pronto! Se o app de email não abriu, os dados foram copiados — cole e envie para ${GIVEAWAY.email}. Os 100 primeiros recebem PIXC da tesouraria Word Finance.`;
    window.CryptoApex?.ui?.toast?.("🎁 Registro do giveaway enviado!");
    updateGiveawayButton();
  }

  function updateGiveawayButton() {
    const btn = document.getElementById("giveaway-btn");
    if (!btn) return;
    const st = getGiveawayState();
    btn.textContent = st.registered ? "🎁 Registrado ✓" : "🎁 Giveaway PIXC";
  }

  // ---------- Ligações de UI ----------
  function bind() {
    document.getElementById("dialogue")?.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      advanceDialogue();
    });
    document.getElementById("tutorial-ok")?.addEventListener("click", () => {
      const step = steps[tut.stepIndex];
      if (step && step.manual) nextStep();
    });
    document.getElementById("tutorial-skip")?.addEventListener("click", () => finishTutorial(false));
    document.getElementById("giveaway-btn")?.addEventListener("click", openGiveaway);
    document.getElementById("giveaway-close")?.addEventListener("click", closeGiveaway);
    document.getElementById("giveaway-submit")?.addEventListener("click", submitGiveaway);
    document.getElementById("tutorial-replay")?.addEventListener("click", () => {
      localStorage.removeItem(TUTORIAL_KEY);
      startTutorial(true);
    });
    updateGiveawayButton();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();

  window.CryptoApex = window.CryptoApex || {};
  window.CryptoApex.campaign = {
    dialogue,
    advanceDialogue,
    startTutorial,
    openGiveaway,
    isMobile,
    giveaway: GIVEAWAY
  };
})();
