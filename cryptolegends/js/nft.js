(function () {
  const TREASURY_PUBLIC_KEY = "BMLCCnhkwCAW9e2Y3hot5Ti7QMu5hdFKbTML4iaMcVWB";
  const SOLANA_NETWORK = "devnet";
  const RPC_ENDPOINT = "https://api.devnet.solana.com";
  const MAINNET_RPC_ENDPOINT = "https://webhook.wordfinance.org/api/solana/rpc";
  const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  const ASSOCIATED_TOKEN_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
  const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
  const PIXC_MINT_ADDRESS = "AJAb19vFHfZg1Bs4eYkL2NXjHeuRXNPG8wry8p1f26fq";
  const PIXC_DECIMALS = 2;
  const USDC_MINT_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const FEE_WALLET_PUBLIC_KEY = "BLPZSYEmU1gvESB1jKRE4e8LbMvNxFN9GFyhu38VzAbe";

  const state = {
    connected: false,
    publicKey: null,
    publicKeyString: null,
    walletType: null,
    wallet: null,
    connection: null,
    pixcConnection: null,
    mode: "off-chain",
    autoMint: false,
    chainItems: [],
    pixcBalanceBaseUnits: null,
    pixcBalanceText: "--",
    pixcLastUpdated: 0,
    storeBusy: false,
    storePurchases: []
  };

  function hasWeb3() {
    return Boolean(window.solanaWeb3);
  }

  function connection() {
    if (!hasWeb3()) return null;
    if (!state.connection) state.connection = new solanaWeb3.Connection(RPC_ENDPOINT, "confirmed");
    return state.connection;
  }

  function pixcConnection() {
    if (!hasWeb3()) return null;
    if (!state.pixcConnection) state.pixcConnection = new solanaWeb3.Connection(MAINNET_RPC_ENDPOINT, "confirmed");
    return state.pixcConnection;
  }

  function isWordFinanceProvider(wallet) {
    return Boolean(wallet && (wallet.isWordFinance || wallet.isWordFinanceWallet || wallet.name === "Word Finance"));
  }

  function getWallet(preferred) {
    if (!preferred || preferred === "wordfinance") {
      const wordWallet = window.wordFinance || window.wordfinance || (isWordFinanceProvider(window.solana) ? window.solana : null);
      if (wordWallet) return { type: "wordfinance", wallet: wordWallet };
    }
    if ((!preferred || preferred === "phantom") && window.phantom?.solana) {
      return { type: "phantom", wallet: window.phantom.solana };
    }
    if ((!preferred || preferred === "phantom") && window.solana?.isPhantom && !isWordFinanceProvider(window.solana)) {
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

  function publicKeyToString(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (value.publicKey) return publicKeyToString(value.publicKey);
    if (typeof value.toBase58 === "function") return value.toBase58();
    if (typeof value.toString === "function") return value.toString();
    return "";
  }

  function extractSignature(result) {
    const sig = result?.signature || result?.txid || result;
    if (typeof sig === "string") return sig;
    if (sig instanceof Uint8Array) return base58Encode(sig);
    if (Array.isArray(sig)) return base58Encode(new Uint8Array(sig));
    if (sig && typeof sig === "object" && typeof sig[0] === "number") {
      return base58Encode(new Uint8Array(Object.values(sig)));
    }
    return "";
  }

  function serializeTransactionBase64(tx) {
    const bytes = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    return uint8ToBase64(bytes);
  }

  function signedTransactionToBytes(signed) {
    const value = signed?.signedTransaction || signed;
    if (value instanceof Uint8Array) return value;
    if (Array.isArray(value)) return new Uint8Array(value);
    if (value && typeof value.serialize === "function") return value.serialize();
    if (typeof value === "string") {
      const binary = atob(value);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
    return null;
  }

  async function signAndSendTransaction(tx, conn, latest) {
    if (!state.connected || !state.wallet) throw new Error("Conecte uma carteira primeiro.");
    let sig = "";
    if (state.walletType === "wordfinance") {
      const serializedTransaction = serializeTransactionBase64(tx);
      try {
        const result = await state.wallet.signAndSendTransaction({ serializedTransaction });
        sig = extractSignature(result);
      } catch (err) {
        if (!state.wallet?.signTransaction) throw err;
        const signed = await state.wallet.signTransaction(tx);
        const bytes = signedTransactionToBytes(signed);
        if (!bytes) throw err;
        sig = await conn.sendRawTransaction(bytes, { skipPreflight: false });
      }
    } else if (state.wallet?.signAndSendTransaction) {
      const result = await state.wallet.signAndSendTransaction(tx);
      sig = extractSignature(result);
    } else if (state.wallet?.signTransaction) {
      const signed = await state.wallet.signTransaction(tx);
      sig = await conn.sendRawTransaction(signed.serialize(), { skipPreflight: false });
    }
    if (!sig) throw new Error("Carteira nao retornou assinatura.");
    const confirmation = latest
      ? await conn.confirmTransaction({
        signature: sig,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight
      }, "confirmed")
      : await conn.confirmTransaction(sig, "confirmed");
    if (confirmation.value?.err) throw new Error("Transacao rejeitada pela rede.");
    return sig;
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
        if (typeof selected.wallet.connect === "function") {
          const resp = await selected.wallet.connect();
          publicKeyString = publicKeyToString(resp) || publicKeyToString(selected.wallet.publicKey);
        }
        if (!publicKeyString && typeof selected.wallet.getPublicKey === "function") {
          publicKeyString = publicKeyToString(await selected.wallet.getPublicKey());
        }
        if (!publicKeyString) publicKeyString = publicKeyToString(selected.wallet.publicKey);
      } else {
        const resp = await selected.wallet.connect();
        publicKeyString = publicKeyToString(resp);
      }
      if (!publicKeyString) throw new Error("Carteira nao retornou endereco publico.");
      state.connected = true;
      state.walletType = selected.type;
      state.wallet = selected.wallet;
      state.publicKeyString = publicKeyString;
      state.publicKey = hasWeb3() ? new solanaWeb3.PublicKey(publicKeyString) : { toString: () => publicKeyString };
      state.mode = selected.type === "wordfinance" ? "wordfinance-dapp-devnet" : "phantom-devnet";
      window.CryptoApex.economy.saveGame?.(window.__CryptoApexWorld);
      window.CryptoApex.economy.migrateLocalSaveToWallet?.(publicKeyString);
      window.CryptoApex.economy.restoreGame?.(window.__CryptoApexWorld, publicKeyString);
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
    return signAndSendTransaction(tx, connection());
  }

  async function signAuthMessage(text) {
    if (!state.connected || !state.wallet) return null;
    const messageBytes = new TextEncoder().encode(text || `Crypto Legends auth ${Date.now()}`);
    if (state.walletType === "wordfinance") {
      const raw = await state.wallet.signMessage(messageBytes);
      const sig = raw?.signature || raw;
      return typeof sig === "string" ? sig : base58Encode(normalizeWordSignature(sig));
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

  function transferCheckedInstruction(source, mint, destination, owner, amount, decimals) {
    const data = new Uint8Array(10);
    data[0] = 12;
    data.set(u64(amount), 1);
    data[9] = decimals;
    return new solanaWeb3.TransactionInstruction({
      programId: new solanaWeb3.PublicKey(TOKEN_PROGRAM_ID),
      keys: [
        { pubkey: source, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: destination, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false }
      ],
      data
    });
  }

  async function getAssociatedTokenAddress(owner, mint) {
    const tokenProgram = new solanaWeb3.PublicKey(TOKEN_PROGRAM_ID);
    const ataProgram = new solanaWeb3.PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID);
    const [ata] = await solanaWeb3.PublicKey.findProgramAddress(
      [owner.toBuffer(), tokenProgram.toBuffer(), mint.toBuffer()],
      ataProgram
    );
    return ata;
  }

  function readTokenAccountAmount(accountInfo) {
    if (!accountInfo?.data || accountInfo.data.length < 72) return 0n;
    let value = 0n;
    for (let i = 0; i < 8; i += 1) {
      value += BigInt(accountInfo.data[64 + i]) << (8n * BigInt(i));
    }
    return value;
  }

  function pixcBaseUnits(pricePixc) {
    return BigInt(Math.round(Number(pricePixc) * (10 ** PIXC_DECIMALS)));
  }

  function formatPixcBaseUnits(baseUnits) {
    if (baseUnits === null || typeof baseUnits === "undefined") return "--";
    const value = BigInt(baseUnits);
    const divisor = 10n ** BigInt(PIXC_DECIMALS);
    const whole = value / divisor;
    const fraction = String(value % divisor).padStart(PIXC_DECIMALS, "0");
    return `${whole}.${fraction}`;
  }

  function formatPixcBalance() {
    return state.pixcBalanceText || "--";
  }

  async function refreshPixcBalance(force) {
    if (!state.connected || !state.publicKey || !pixcConnection()) {
      state.pixcBalanceBaseUnits = null;
      state.pixcBalanceText = "--";
      window.CryptoApex?.ui?.updateHUD?.();
      window.CryptoApex?.ui?.renderStore?.();
      return null;
    }
    const now = Date.now();
    if (!force && state.pixcLastUpdated && now - state.pixcLastUpdated < 9500) {
      return state.pixcBalanceBaseUnits;
    }
    try {
      const mint = new solanaWeb3.PublicKey(PIXC_MINT_ADDRESS);
      const accounts = await pixcConnection().getTokenAccountsByOwner(state.publicKey, { mint }, "confirmed");
      let total = 0n;
      accounts.value.forEach((entry) => {
        total += readTokenAccountAmount(entry.account);
      });
      state.pixcBalanceBaseUnits = total;
      state.pixcBalanceText = formatPixcBaseUnits(total);
      state.pixcLastUpdated = now;
      window.CryptoApex?.ui?.updateHUD?.();
      window.CryptoApex?.ui?.renderStore?.();
      return total;
    } catch (err) {
      state.pixcBalanceText = "--";
      window.CryptoApex?.ui?.renderStore?.();
      return null;
    }
  }

  async function buildPixcTransferTransaction(baseUnits) {
    const conn = pixcConnection();
    if (!conn || !state.connected || !state.publicKey || !state.wallet) {
      throw new Error("Conecte uma carteira primeiro.");
    }
    const payer = state.publicKey;
    const mint = new solanaWeb3.PublicKey(PIXC_MINT_ADDRESS);
    const escrow = new solanaWeb3.PublicKey(TREASURY_PUBLIC_KEY);
    const sourceAta = await getAssociatedTokenAddress(payer, mint);
    const destinationAta = await getAssociatedTokenAddress(escrow, mint);
    const sourceInfo = await conn.getAccountInfo(sourceAta, "confirmed");
    if (!sourceInfo) throw new Error("Sua carteira ainda nao tem uma conta PIXC.");
    if (readTokenAccountAmount(sourceInfo) < BigInt(baseUnits)) {
      throw new Error("Saldo PIXC insuficiente na conta associada.");
    }

    const tx = new solanaWeb3.Transaction();
    const destinationInfo = await conn.getAccountInfo(destinationAta, "confirmed");
    if (!destinationInfo) {
      tx.add(createAtaInstruction(payer, destinationAta, escrow, mint));
    }
    tx.add(transferCheckedInstruction(sourceAta, mint, destinationAta, payer, baseUnits, PIXC_DECIMALS));
    const latest = await conn.getLatestBlockhash("confirmed");
    tx.feePayer = payer;
    tx.recentBlockhash = latest.blockhash;
    tx.lastValidBlockHeight = latest.lastValidBlockHeight;
    return { tx, latest };
  }

  async function buyStoreItem(itemKey) {
    if (state.storeBusy) {
      window.CryptoApex?.ui?.toast?.("Compra PIXC em andamento.");
      return null;
    }
    const item = window.CryptoApex?.economy?.storeCatalog?.find((entry) => entry.key === itemKey);
    if (!item) {
      window.CryptoApex?.ui?.toast?.("Item da loja nao encontrado.");
      return null;
    }
    if (!state.connected || !state.publicKey || !state.wallet) {
      window.CryptoApex?.ui?.toast?.("Conecte Word Finance ou Phantom para comprar com PIXC.");
      return null;
    }
    state.storeBusy = true;
    window.CryptoApex?.ui?.renderStore?.();
    try {
      const amount = pixcBaseUnits(item.pricePixc);
      const balance = await refreshPixcBalance(true);
      if (balance !== null && BigInt(balance) < amount) {
        window.CryptoApex?.ui?.toast?.("Saldo PIXC insuficiente.");
        return null;
      }
      const { tx, latest } = await buildPixcTransferTransaction(amount);
      window.CryptoApex?.ui?.toast?.(`Confirme a compra: ${item.name}`);
      const sig = await signAndSendTransaction(tx, pixcConnection(), latest);
      const applied = window.CryptoApex.economy.applyStorePurchase(itemKey, {
        signature: sig,
        amount: amount.toString(),
        pricePixc: item.pricePixc,
        mint: PIXC_MINT_ADDRESS,
        escrow: TREASURY_PUBLIC_KEY
      });
      if (applied) {
        state.storePurchases.unshift({ ...item, signature: sig, at: new Date().toISOString() });
        state.chainItems.unshift({ type: "pixc-shop", name: item.name, signature: sig, mintAddress: PIXC_MINT_ADDRESS });
        window.CryptoApex?.ui?.toast?.(`Compra confirmada: ${item.name}`);
        window.CryptoApex?.ui?.renderInventory?.();
        window.CryptoApex?.ui?.renderChainItems?.();
        window.__CryptoApexWorld?.audio?.play?.("coin");
      }
      await refreshPixcBalance(true);
      return sig;
    } catch (err) {
      window.CryptoApex?.ui?.toast?.(err.message || "Compra PIXC cancelada ou falhou.");
      return null;
    } finally {
      state.storeBusy = false;
      window.CryptoApex?.ui?.renderStore?.();
    }
  }

  async function sendPixcTransaction(tx, latest) {
    return signAndSendTransaction(tx, pixcConnection(), latest);
  }

  async function addPixcTransfer(tx, payer, mint, destinationOwner, amountBaseUnits) {
    const sourceAta = await getAssociatedTokenAddress(payer, mint);
    const destinationAta = await getAssociatedTokenAddress(destinationOwner, mint);
    const sourceInfo = await pixcConnection().getAccountInfo(sourceAta, "confirmed");
    if (!sourceInfo) throw new Error("Sua carteira ainda nao tem uma conta PIXC.");
    if (readTokenAccountAmount(sourceInfo) < BigInt(amountBaseUnits)) {
      throw new Error("Saldo PIXC insuficiente na conta associada.");
    }
    const destinationInfo = await pixcConnection().getAccountInfo(destinationAta, "confirmed");
    if (!destinationInfo) {
      tx.add(createAtaInstruction(payer, destinationAta, destinationOwner, mint));
    }
    tx.add(transferCheckedInstruction(sourceAta, mint, destinationAta, payer, amountBaseUnits, PIXC_DECIMALS));
  }

  async function buildPixcPaymentTransaction(payments) {
    const conn = pixcConnection();
    if (!conn || !state.connected || !state.publicKey || !state.wallet) {
      throw new Error("Conecte uma carteira primeiro.");
    }
    const payer = state.publicKey;
    const mint = new solanaWeb3.PublicKey(PIXC_MINT_ADDRESS);
    const total = payments.reduce((sum, entry) => sum + BigInt(entry.amountBaseUnits), 0n);
    const sourceAta = await getAssociatedTokenAddress(payer, mint);
    const sourceInfo = await conn.getAccountInfo(sourceAta, "confirmed");
    if (!sourceInfo) throw new Error("Sua carteira ainda nao tem uma conta PIXC.");
    if (readTokenAccountAmount(sourceInfo) < total) throw new Error("Saldo PIXC insuficiente.");
    const tx = new solanaWeb3.Transaction();
    for (const payment of payments) {
      const destinationOwner = new solanaWeb3.PublicKey(payment.destination);
      await addPixcTransfer(tx, payer, mint, destinationOwner, BigInt(payment.amountBaseUnits));
    }
    const latest = await conn.getLatestBlockhash("confirmed");
    tx.feePayer = payer;
    tx.recentBlockhash = latest.blockhash;
    tx.lastValidBlockHeight = latest.lastValidBlockHeight;
    return { tx, latest };
  }

  async function craftRecipe(recipeKey) {
    if (state.storeBusy) {
      window.CryptoApex?.ui?.toast?.("Transação PIXC em andamento.");
      return null;
    }
    const check = window.CryptoApex?.economy?.canCraft?.(recipeKey);
    if (!check?.ok) {
      window.CryptoApex?.ui?.toast?.(check?.reason || "Receita indisponível.");
      return null;
    }
    if (!state.connected || !state.publicKey || !state.wallet) {
      window.CryptoApex?.ui?.toast?.("Conecte Word Finance ou Phantom para craftar com PIXC.");
      return null;
    }
    state.storeBusy = true;
    window.CryptoApex?.ui?.renderCrafting?.();
    try {
      const amount = pixcBaseUnits(check.recipe.pricePixc);
      const { tx, latest } = await buildPixcPaymentTransaction([
        { destination: TREASURY_PUBLIC_KEY, amountBaseUnits: amount }
      ]);
      window.CryptoApex?.ui?.toast?.(`Confirme o crafting: ${check.recipe.name}`);
      const sig = await sendPixcTransaction(tx, latest);
      window.CryptoApex.economy.applyCraftRecipe(recipeKey, {
        signature: sig,
        amount: amount.toString(),
        pricePixc: check.recipe.pricePixc,
        mint: PIXC_MINT_ADDRESS,
        escrow: TREASURY_PUBLIC_KEY
      });
      state.chainItems.unshift({ type: "pixc-craft", name: check.recipe.name, signature: sig, mintAddress: PIXC_MINT_ADDRESS });
      await refreshPixcBalance(true);
      return sig;
    } catch (err) {
      window.CryptoApex?.ui?.toast?.(err.message || "Crafting PIXC cancelado ou falhou.");
      return null;
    } finally {
      state.storeBusy = false;
      window.CryptoApex?.ui?.renderCrafting?.();
      window.CryptoApex?.ui?.renderChainItems?.();
    }
  }

  async function buyMarketplaceListing(listingId) {
    if (state.storeBusy) {
      window.CryptoApex?.ui?.toast?.("Transação PIXC em andamento.");
      return null;
    }
    const listing = window.CryptoApex?.economy?.getMarketplaceListings?.().find((entry) => entry.id === listingId);
    if (!listing) {
      window.CryptoApex?.ui?.toast?.("Anúncio não encontrado.");
      return null;
    }
    if (!state.connected || !state.publicKey || !state.wallet) {
      window.CryptoApex?.ui?.toast?.("Conecte Word Finance ou Phantom para comprar no mercado.");
      return null;
    }
    state.storeBusy = true;
    window.CryptoApex?.ui?.renderMarketplace?.();
    try {
      const price = pixcBaseUnits(listing.pricePixc);
      const fee = price >= 100n ? price / 100n : 1n;
      const sellerAmount = price - fee;
      const { tx, latest } = await buildPixcPaymentTransaction([
        { destination: listing.seller, amountBaseUnits: sellerAmount },
        { destination: TREASURY_PUBLIC_KEY, amountBaseUnits: fee }
      ]);
      window.CryptoApex?.ui?.toast?.(`Confirme compra P2P: ${listing.item.name}`);
      const sig = await sendPixcTransaction(tx, latest);
      window.CryptoApex.economy.completeMarketPurchase(listingId, {
        signature: sig,
        pricePixc: listing.pricePixc,
        sellerAmount: sellerAmount.toString(),
        feeAmount: fee.toString(),
        mint: PIXC_MINT_ADDRESS
      });
      state.chainItems.unshift({ type: "pixc-market", name: listing.item.name, signature: sig, mintAddress: PIXC_MINT_ADDRESS });
      await refreshPixcBalance(true);
      return sig;
    } catch (err) {
      window.CryptoApex?.ui?.toast?.(err.message || "Compra P2P cancelada ou falhou.");
      return null;
    } finally {
      state.storeBusy = false;
      window.CryptoApex?.ui?.renderMarketplace?.();
      window.CryptoApex?.ui?.renderChainItems?.();
    }
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
    const latest = await connection().getLatestBlockhash("confirmed");
    tx.recentBlockhash = latest.blockhash;
    tx.lastValidBlockHeight = latest.lastValidBlockHeight;
    tx.partialSign(mint);
    const sig = await signAndSendTransaction(tx, connection(), latest);
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
    USDC_MINT_ADDRESS,
    FEE_WALLET_PUBLIC_KEY,
    SOLANA_NETWORK,
    MAINNET_RPC_ENDPOINT,
    state,
    getWallet,
    connectWallet,
    connectPhantom,
    connectWordFinance,
    pixcConnection,
    refreshPixcBalance,
    formatPixcBalance,
    formatPixcBaseUnits,
    pixcBaseUnits,
    buyStoreItem,
    craftRecipe,
    buyMarketplaceListing,
    requestDevnetSol,
    writeRewardMemo,
    signAuthMessage,
    mintNextPending,
    mintPlayerSignedCollectible,
    autoMintEnabled,
    truncate
  };
})();
