# Crypto Legends: A Era da Liberdade

Jogo TPS educacional em Three.js com assets procedurais, fases de 30 minutos, loot, CRED local, loja PIXC mainnet, NFTs pendentes, controles desktop/mobile e integração Word Finance/Phantom.

## Como rodar

Abra `index.html` diretamente no navegador.

O jogo usa CDNs para carregar Three.js, fontes e `@solana/web3.js`. Se estiver offline, essas bibliotecas externas não carregam.

## Controles

- WASD: mover
- Mouse: mirar
- Botão esquerdo: atirar
- Botão direito: zoom
- Shift: correr
- Espaço: pular
- R: recarregar
- 1-5: trocar arma
- Q/E: habilidades
- F: coletar/interagir

## Solana devnet

A tesouraria oficial configurada é:

`BMLCCnhkwCAW9e2Y3hot5Ti7QMu5hdFKbTML4iaMcVWB`

O jogo detecta a carteira Word Finance no dApp browser Android e Phantom no desktop. A loja PIXC usa Solana mainnet pelo RPC Helius configurado no código. O mint PIXC é:

`AJAb19vFHfZg1Bs4eYkL2NXjHeuRXNPG8wry8p1f26fq`

Na loja in-game, o jogador pode comprar kits de vida, escudo, munição infinita, boost de velocidade, revive, turret, cura regenerativa, skin dourada e arma lendária. Cada compra monta no browser uma transação SPL Token TransferChecked do PIXC para a tesouraria/escrow:

`BMLCCnhkwCAW9e2Y3hot5Ti7QMu5hdFKbTML4iaMcVWB`

Como a chave privada da tesouraria não foi fornecida, o jogo não consegue assinar mint/transfer real de CRED ou uma Metaplex Certified Collection com `updateAuthority` da tesouraria diretamente no navegador. Por isso:

- CRED funciona localmente para gameplay.
- Recompensas NFT ficam pendentes até a Word Finance ou Phantom conectar.
- Compras PIXC da loja são mainnet e exigem saldo PIXC + SOL mainnet para taxa.
- O botão de mint cria um collectible SPL devnet assinado pelo jogador e registra a tesouraria no memo/metadado do jogo.
- Em produção, um backend/faucet precisa coassinar com a chave privada da tesouraria para mint real de CRED e NFTs certificados.

## Estrutura

- `index.html`: entrada do jogo.
- `style.css`: interface e HUD.
- `js/main.js`: cena, loop, câmera, arenas e interação.
- `js/player.js`: heróis, movimento, habilidades.
- `js/enemies.js`: IA, inimigos e drops.
- `js/weapons.js`: armas e projéteis.
- `js/economy.js`: CRED, inventário, fragmentos, casas e NFTs pendentes.
- `js/missions.js`: fases, missões e diálogos.
- `js/nft.js`: Word Finance, Phantom, devnet, memo e collectible SPL.
- `assets/concept-art/`: artes cinematográficas geradas para Satoshi, Anatoly, Inflatores, Tesoureiro Inflador e Senador da Impressora Infinita.
- `assets/README.md`: nota de assets; os modelos 3D em gameplay seguem procedurais.
