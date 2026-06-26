(function () {
  const TREASURY_PUBLIC_KEY = "BMLCCnhkwCAW9e2Y3hot5Ti7QMu5hdFKbTML4iaMcVWB";
  const SOLANA_NETWORK = "devnet";
  const RPC_ENDPOINT = "https://api.devnet.solana.com";
  const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  const ASSOCIATED_TOKEN_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
  const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
  const PIXC_MINT_ADDRESS = "AJAb19vFHfZg1Bs4eYkL2NXjHeuRXNPG8wry8p1f26fq";
  const PIXC_DECIMALS = 2;

  const state = {
    connected: false,
    publicKey: null,
    publicKeyString: null,
    walletType: null,
    wallet: null,
    connection: null,
    mode: "off-chain",
    autoMint: true,
    chainItems: []
  };

  function hasWeb3() {
    return Boolean(window.solanaWeb3);
  }

  function connection() {
    if (!hasWeb3()) return null;
    if (!state.connection) state.connection = new solanaWeb3.Connection(RPC_ENDPOINT, "confirmed");
    return state.connection;
  }

  function getWallet(preferred) {
    if ((!preferred || preferred === "wordfinance") && window.wordfinance) {
      return { type: "wordfinance", wallet: window.wordfinance };
    }
    if ((!preferred || preferred === "phantom") && window.phantom?.solana) {
      return { type: "phantom", wallet: window.phantom.solana };
    }
    if ((!preferred || preferred === "phantom") && window.solana?.isPhantom) {
      return { type: "phantom", wallet: window.solana };
    }
    return null;
  }

  function uint8ToBase64(bytes) {
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }

  function base58Encode(bytes) {
    const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let digits = [0];
    for (let i = 0; i < bytes.length; i += 1) {
      let carry = bytes[i];
      for (let j = 0; j < digits.length; j += 1) {
        carry += digits[j] << 8;
        digits[j] = carry % 58;
        carry = (carry / 58) | 0;
      }
      while (carry) {
        digits.push(carry % 58);
        carry = (carry / 58) | 0;
      }
    }
    for (let k = 0; k < bytes.length && bytes[k] === 0; k += 1) digits.push(0);
    return digits.reverse().map((digit) => alphabet[digit]).join("");
  }

  function normalizeWordSignature(signature) {
    if (signature instanceof Uint8Array) return signature;
    if (signature && typeof signature === "object" && typeof signature[0] === "number") {
      const bytes = new Uint8Array(64);
      for (let i = 0; i < 64; i += 1) bytes[i] = signature[i] || 0;
      return bytes;
    }
    return new Uint8Array();
  }

  async function connectWallet(preferred) {
    const selected = getWallet(typeof preferred === "string" ? preferred : null);
    if (!selected) {
      window.CryptoApex.ui.toast("Carteira não encontrada. O jogo continua em modo local.");
      return false;
    }
    try {
      let publicKeyString;
      if (selected.type === "wordfinance") {
        publicKeyString = await selected.wallet.getPublicKey();
      } else {
        const resp = await selected.wallet.connect();
        publicKeyString = resp.publicKey.toString();
      }
      state.connected = true;
      state.walletType = selected.type;
      state.wallet = selected.wallet;
      state.publicKeyString = publicKeyString;
      state.publicKey = hasWeb3() ? new solanaWeb3.PublicKey(publicKeyString) : { toString: () => publicKeyString };
      state.mode = selected.type === "wordfinance" ? "wordfinance-dapp-devnet" : "phantom-devnet";
      window.CryptoApex.economy.addCred(100, `${selected.type === "wordfinance" ? "Word Finance" : "Phantom"} CRED`);
      await writeRewardMemo("claim-airdrop", {
        amount: 100,
        token: "CRED",
        pixcMint: PIXC_MINT_ADDRESS,
        pixcDecimals: PIXC_DECIMALS,
        note: "Crédito local. Mint real de CRED com autoridade da tesouraria exige backend ou chave privada da tesouraria."
      }).catch(() => null);
      window.CryptoApex.ui.toast(`${selected.type === "wordfinance" ? "Word Finance" : "Phantom"} conectada. +100 CRED no jogo.`);
      window.CryptoApex.ui.updateWallet();
      return true;
    } catch (err) {
      window.CryptoApex.ui.toast("Conexão cancelada.");
      return false;
    }
  }

  function connectPhantom() {
    return connectWallet("phantom");
  }

  function connectWordFinance() {
    return connectWallet("wordfinance");
  }

  async function requestDevnetSol() {
    if (!state.connected || !state.publicKey || !connection()) {
      window.CryptoApex.ui.toast("Conecte uma carteira primeiro.");
      return null;
    }
    try {
      const sig = await connection().requestAirdrop(state.publicKey, solanaWeb3.LAMPORTS_PER_SOL);
      await connection().confirmTransaction(sig, "confirmed");
      window.CryptoApex.ui.toast("1 SOL devnet recebido para taxas.");
      return sig;
    } catch (err) {
      window.CryptoApex.ui.toast("Airdrop devnet indisponível agora.");
      return null;
    }
  }

  async function writeRewardMemo(kind, payload) {
    if (!state.connected || !state.publicKey || !connection()) return null;
    const tx = new solanaWeb3.Transaction();
    const memo = JSON.stringify({
      game: "Crypto Legends: A Era da Liberdade",
      kind,
      treasury: TREASURY_PUBLIC_KEY,
      player: state.publicKey.toString(),
      network: SOLANA_NETWORK,
      payload,
      at: new Date().toISOString()
    }).slice(0, 920);
    tx.add(new solanaWeb3.TransactionInstruction({
      keys: [{ pubkey: state.publicKey, isSigner: true, isWritable: true }],
      programId: new solanaWeb3.PublicKey(MEMO_PROGRAM_ID),
      data: new TextEncoder().encode(memo)
    }));
    tx.feePayer = state.publicKey;
    tx.recentBlockhash = (await connection().getLatestBlockhash()).blockhash;
    let sig;
    if (state.walletType === "wordfinance") {
      const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
      const result = await state.wallet.signAndSendTransaction(uint8ToBase64(serialized));
      sig = typeof result === "string" ? result : result.signature;
    } else {
      const signed = await state.wallet.signTransaction(tx);
      sig = await connection().sendRawTransaction(signed.serialize(), { skipPreflight: false });
    }
    await connection().confirmTransaction(sig, "confirmed");
    return sig;
  }

  async function signAuthMessage(text) {
    if (!state.connected || !state.wallet) return null;
    const messageBytes = new TextEncoder().encode(text || `Crypto Legends auth ${Date.now()}`);
    if (state.walletType === "wordfinance") {
      const raw = await state.wallet.signMessage(messageBytes);
      return base58Encode(normalizeWordSignature(raw));
    }
    const raw = await state.wallet.signMessage(messageBytes);
    const bytes = raw?.signature || raw;
    return base58Encode(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  }

  function u64(amount) {
    let value = BigInt(amount);
    const out = new Uint8Array(8);
    for (let i = 0; i < 8; i += 1) {
      out[i] = Number(value & 0xffn);
      value >>= 8n;
    }
    return out;
  }

  function initializeMintInstruction(mint, decimals, mintAuthority, freezeAuthority) {
    const data = new Uint8Array(70);
    data[0] = 0;
    data[1] = decimals;
    data.set(mintAuthority.toBytes(), 2);
    if (freezeAuthority) {
      data[34] = 1;
      data.set(freezeAuthority.toBytes(), 38);
    }
    return new solanaWeb3.TransactionInstruction({
      programId: new solanaWeb3.PublicKey(TOKEN_PROGRAM_ID),
      keys: [
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: solanaWeb3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
      ],
      data
    });
  }

  function createAtaInstruction(payer, ata, owner, mint) {
    return new solanaWeb3.TransactionInstruction({
      programId: new solanaWeb3.PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID),
      keys: [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: ata, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: new solanaWeb3.PublicKey(TOKEN_PROGRAM_ID), isSigner: false, isWritable: false },
        { pubkey: solanaWeb3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
      ],
      data: new Uint8Array()
    });
  }

  function mintToInstruction(mint, destination, authority, amount) {
    const data = new Uint8Array(9);
    data[0] = 7;
    data.set(u64(amount), 1);
    return new solanaWeb3.TransactionInstruction({
      programId: new solanaWeb3.PublicKey(TOKEN_PROGRAM_ID),
      keys: [
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: destination, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: false }
      ],
      data
    });
  }

  async function mintPlayerSignedCollectible(item) {
    if (!state.connected || !state.publicKey || !connection()) {
      window.CryptoApex.ui.toast("Conecte uma carteira para mintar.");
      return null;
    }
    const payer = state.publicKey;
    const mint = solanaWeb3.Keypair.generate();
    const tokenProgram = new solanaWeb3.PublicKey(TOKEN_PROGRAM_ID);
    const ataProgram = new solanaWeb3.PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID);
    const [ata] = await solanaWeb3.PublicKey.findProgramAddress(
      [payer.toBuffer(), tokenProgram.toBuffer(), mint.publicKey.toBuffer()],
      ataProgram
    );
    const lamports = await connection().getMinimumBalanceForRentExemption(82);
    const tx = new solanaWeb3.Transaction();
    tx.add(solanaWeb3.SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint.publicKey,
      space: 82,
      lamports,
      programId: tokenProgram
    }));
    tx.add(initializeMintInstruction(mint.publicKey, 0, payer, payer));
    tx.add(createAtaInstruction(payer, ata, payer, mint.publicKey));
    tx.add(mintToInstruction(mint.publicKey, ata, payer, 1));
    tx.add(new solanaWeb3.TransactionInstruction({
      keys: [{ pubkey: payer, isSigner: true, isWritable: true }],
      programId: new solanaWeb3.PublicKey(MEMO_PROGRAM_ID),
      data: new TextEncoder().encode(JSON.stringify({
        name: item.name,
        type: item.type,
        rarity: item.rarity,
        treasury: TREASURY_PUBLIC_KEY,
        collection: "Crypto Legends Rewards",
        productionNote: "Metaplex Certified Collection com updateAuthority da tesouraria requer backend coassinando com a chave privada da tesouraria."
      }).slice(0, 900))
    }));
    tx.feePayer = payer;
    tx.recentBlockhash = (await connection().getLatestBlockhash()).blockhash;
    tx.partialSign(mint);
    let sig;
    if (state.walletType === "wordfinance") {
      const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
      const result = await state.wallet.signAndSendTransaction(uint8ToBase64(serialized));
      sig = typeof result === "string" ? result : result.signature;
    } else {
      const signed = await state.wallet.signTransaction(tx);
      sig = await connection().sendRawTransaction(signed.serialize(), { skipPreflight: false });
    }
    await connection().confirmTransaction(sig, "confirmed");
    state.chainItems.unshift({ ...item, signature: sig, mintAddress: mint.publicKey.toString() });
    return { signature: sig, mintAddress: mint.publicKey.toString() };
  }

  async function mintNextPending() {
    const item = window.CryptoApex.economy.state.pendingMints[0];
    if (!item) {
      window.CryptoApex.ui.toast("Nenhum prêmio pendente.");
      return null;
    }
    if (!state.connected) {
      window.CryptoApex.ui.toast("NFT pendente salvo. Conecte Word Finance ou Phantom para assinar.");
      return null;
    }
    try {
      window.CryptoApex.ui.toast(`Assinando NFT devnet: ${item.name}`);
      const result = await mintPlayerSignedCollectible(item);
      if (result) {
        window.CryptoApex.economy.markMinted(item.id, result.signature, result.mintAddress);
        window.CryptoApex.ui.toast("Collectible SPL criado na devnet.");
        window.CryptoApex.ui.renderChainItems();
      }
      return result;
    } catch (err) {
      window.CryptoApex.ui.toast("Mint cancelado ou falhou. O item continua pendente.");
      return null;
    }
  }

  function truncate(pk) {
    if (!pk) return "desconectada";
    const s = pk.toString();
    return `${s.slice(0, 4)}...${s.slice(-4)}`;
  }

  function autoMintEnabled() {
    return state.autoMint;
  }

  window.CryptoApex = window.CryptoApex || {};
  window.CryptoApex.nft = {
    TREASURY_PUBLIC_KEY,
    PIXC_MINT_ADDRESS,
    PIXC_DECIMALS,
    SOLANA_NETWORK,
    state,
    getWallet,
    connectWallet,
    connectPhantom,
    connectWordFinance,
    requestDevnetSol,
    writeRewardMemo,
    signAuthMessage,
    mintNextPending,
    mintPlayerSignedCollectible,
    autoMintEnabled,
    truncate
  };
})();
