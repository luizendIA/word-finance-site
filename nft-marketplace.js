(function () {
  'use strict';

  var API = 'https://wordfinance-pixc-nft-marketplace-production.up.railway.app';
  var PROGRAMS = {
    token: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    ata: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    system: '11111111111111111111111111111111'
  };
  var alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  var config = null;
  var provider = null;
  var publicKey = '';
  var listingsById = new Map();
  var sellerFilter = new URLSearchParams(location.search).get('seller') || '';

  function el(id) { return document.getElementById(id); }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }
  function short(value) { var text = String(value || ''); return text.length > 18 ? text.slice(0, 8) + '…' + text.slice(-6) : text; }
  function stable(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    return '{' + Object.keys(value).sort().map(function (key) { return JSON.stringify(key) + ':' + stable(value[key]); }).join(',') + '}';
  }
  function bytesToHex(bytes) { return Array.from(bytes).map(function (byte) { return byte.toString(16).padStart(2, '0'); }).join(''); }
  async function digestText(value) { return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))); }
  async function digestBytes(bytes) { return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))); }
  function base58(bytes) {
    var digits = [0];
    for (var i = 0; i < bytes.length; i++) {
      var carry = bytes[i];
      for (var j = 0; j < digits.length; j++) { carry += digits[j] << 8; digits[j] = carry % 58; carry = (carry / 58) | 0; }
      while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0; }
    }
    var output = '';
    for (var zero = 0; zero < bytes.length - 1 && bytes[zero] === 0; zero++) output += '1';
    for (var index = digits.length - 1; index >= 0; index--) output += alphabet[digits[index]];
    return output;
  }
  function nonce() { var value = new Uint8Array(16); crypto.getRandomValues(value); return bytesToHex(value); }
  function normalizeUri(value) {
    var uri = String(value || '').trim();
    if (uri.indexOf('ipfs://') === 0) return 'https://ipfs.io/ipfs/' + uri.slice(7).replace(/^ipfs\//, '');
    if (uri.indexOf('ar://') === 0) return 'https://arweave.net/' + uri.slice(5);
    return /^https:\/\//i.test(uri) ? uri : '';
  }
  function decimalToRaw(value, decimals) {
    var text = String(value || '').trim().replace(',', '.');
    if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text)) throw new Error('Informe um preço válido');
    var parts = text.split('.');
    if ((parts[1] || '').length > decimals) throw new Error('Casas decimais demais para esta moeda');
    var raw = (parts[0] + (parts[1] || '').padEnd(decimals, '0')).replace(/^0+/, '') || '0';
    if (raw === '0') throw new Error('O preço precisa ser maior que zero');
    return raw;
  }
  function rawToText(raw, decimals) {
    var value = String(raw || '0').padStart(decimals + 1, '0');
    var whole = decimals ? value.slice(0, -decimals) : value;
    var fraction = decimals ? value.slice(-decimals).replace(/0+$/, '') : '';
    return whole + (fraction ? ',' + fraction : '');
  }
  function providerAddress(result) { return String((result && result.publicKey) || (provider && provider.publicKey) || ''); }
  function findProvider() { return window.wordFinance || (window.solana && window.solana.isWordFinance ? window.solana : null); }
  async function request(path, options) {
    var response = await fetch(API + path, options);
    var body = await response.json().catch(function () { return {}; });
    if (!response.ok || body.ok === false) throw new Error(body.error || 'Falha no serviço do marketplace');
    return body;
  }
  async function authorization(domain, route, payload) {
    if (!provider || !publicKey) throw new Error('Conecte e desbloqueie uma carteira WordFinance');
    var timestamp = Date.now();
    var unique = nonce();
    var message = [domain, 'POST', route, publicKey, await digestText(stable(payload)), String(timestamp), unique].join('\n');
    var result = await provider.signMessage(new TextEncoder().encode(message), 'utf8');
    var signature = result && result.signature ? result.signature : result;
    return { timestamp: timestamp, nonce: unique, signature: base58(new Uint8Array(signature)) };
  }
  async function connect() {
    provider = findProvider();
    if (!provider) throw new Error('A extensão WordFinance não foi detectada neste navegador');
    var result = await provider.connect();
    publicKey = providerAddress(result);
    if (!publicKey) throw new Error('A carteira não informou o endereço público');
    el('wallet-state').textContent = 'Carteira conectada: ' + short(publicKey);
    el('wallet-tools').hidden = false;
    await loadInventory();
  }
  async function ensureConnected() { if (!publicKey) await connect(); }
  async function loadConfig() {
    config = await request('/v2/config');
    var status = el('market-status');
    status.textContent = config.enabled ? 'MAINNET ATIVA · PIXC / USDC / SOL' : 'HOMOLOGAÇÃO · OPERAÇÕES DESLIGADAS';
    status.className = 'status ' + (config.enabled ? 'ok' : 'warn');
    el('fee-note').textContent = 'Taxa WordFinance: ' + (Number(config.feeBps) / 100).toLocaleString('pt-BR') + '% por venda concluída.';
  }
  async function fetchMetadata(asset) {
    var result = { title: asset.name || asset.symbol || 'NFT sem nome', imageUrl: '', metadataUrl: normalizeUri(asset.uri) };
    if (!result.metadataUrl) return result;
    try {
      var controller = new AbortController();
      var timer = setTimeout(function () { controller.abort(); }, 8000);
      var response = await fetch(result.metadataUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok) return result;
      var metadata = await response.json();
      result.title = String(metadata.name || result.title).slice(0, 120);
      result.imageUrl = normalizeUri(metadata.image);
    } catch (_) {}
    return result;
  }
  async function loadInventory() {
    if (!publicKey) return;
    var root = el('inventory');
    root.innerHTML = '<div class="empty">Consultando seus ativos únicos na Solana…</div>';
    var data = await request('/v2/wallets/' + encodeURIComponent(publicKey) + '/assets');
    var assets = await Promise.all((data.assets || []).map(async function (asset) { return Object.assign({}, asset, await fetchMetadata(asset)); }));
    if (!assets.length) {
      root.innerHTML = '<div class="empty">Nenhum NFT ou token único (supply 1) foi encontrado nesta carteira.</div>';
      return;
    }
    root.innerHTML = assets.map(function (asset, index) {
      var image = asset.imageUrl ? '<img src="' + escapeHtml(asset.imageUrl) + '" alt="">' : '<div class="asset-placeholder">NFT</div>';
      var listed = asset.listing ? '<p class="listed">Já listado · ' + escapeHtml(asset.listing.id) + '</p>' : '';
      return '<article class="asset-card" data-asset="' + index + '">' + image + '<h3>' + escapeHtml(asset.title) + '</h3>' +
        '<p class="wallet">Mint: ' + escapeHtml(short(asset.mint)) + '</p>' + listed +
        '<div class="price-inputs"><label>PIXC<input data-price="PIXC" inputmode="decimal" placeholder="Ex.: 500"></label>' +
        '<label>USDC<input data-price="USDC" inputmode="decimal" placeholder="Ex.: 25"></label>' +
        '<label>SOL<input data-price="SOL" inputmode="decimal" placeholder="Ex.: 0,10"></label></div>' +
        '<button data-list ' + (asset.listing ? 'disabled' : '') + '>Listar nas três moedas</button></article>';
    }).join('');
    Array.from(root.querySelectorAll('[data-list]')).forEach(function (button) {
      button.addEventListener('click', function () { listAsset(assets[Number(button.closest('[data-asset]').dataset.asset)], button.closest('[data-asset]')); });
    });
  }
  async function listAsset(asset, card) {
    try {
      if (!config || !config.enabled) throw new Error('O marketplace ainda não está liberado');
      await ensureConnected();
      var prices = {};
      ['PIXC', 'USDC', 'SOL'].forEach(function (currency) {
        prices[currency] = { raw: decimalToRaw(card.querySelector('[data-price="' + currency + '"]').value, config.decimals[currency]), decimals: config.decimals[currency] };
      });
      var payload = {
        assetMint: asset.mint,
        assetTokenAccount: asset.tokenAccount,
        prices: prices,
        title: asset.title,
        imageUrl: asset.imageUrl || '',
        metadataUrl: asset.metadataUrl || '',
        expiresAt: Date.now() + 30 * 86400000
      };
      if (!confirm('Listar este ativo pelos três preços informados? Nada será transferido agora.')) return;
      var route = '/v2/listings';
      await request(route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ seller: publicKey, auth: await authorization('WF_NFT_MARKET_LIST_V2', route, payload) }, payload)) });
      alert('Ativo listado. A venda só ocorre depois das assinaturas do comprador e do vendedor.');
      await Promise.all([loadInventory(), loadListings()]);
    } catch (error) { alert(error.message); }
  }
  async function loadListings() {
    var query = sellerFilter ? '?seller=' + encodeURIComponent(sellerFilter) : '';
    var data = await request('/v2/listings' + query);
    var listings = data.listings || [];
    listingsById = new Map(listings.map(function (item) { return [item.id, item]; }));
    var root = el('catalog');
    if (!listings.length) { root.innerHTML = '<div class="empty">Nenhuma oferta ativa nesta vitrine.</div>'; return; }
    root.innerHTML = listings.map(function (item) {
      var image = item.imageUrl ? '<img src="' + escapeHtml(item.imageUrl) + '" alt="">' : '<div class="asset-placeholder">NFT</div>';
      var prices = ['PIXC', 'USDC', 'SOL'].map(function (currency) { return '<span>' + escapeHtml(item.prices[currency].display) + '</span>'; }).join('');
      return '<article class="listing" data-listing="' + escapeHtml(item.id) + '">' + image + '<h3>' + escapeHtml(item.title) + '</h3>' +
        '<div class="prices">' + prices + '</div><p class="wallet">Mint: ' + escapeHtml(short(item.assetMint)) + '</p>' +
        '<label>Moeda para comprar<select data-currency><option>PIXC</option><option>USDC</option><option>SOL</option></select></label>' +
        '<button data-buy>Comprar</button></article>';
    }).join('');
    Array.from(root.querySelectorAll('[data-buy]')).forEach(function (button) {
      button.addEventListener('click', function () { var card = button.closest('[data-listing]'); buy(card.dataset.listing, card.querySelector('[data-currency]').value); });
    });
  }
  function instructionKey(instruction, index) { return instruction.keys[index] && instruction.keys[index].pubkey.toBase58(); }
  function readU64(data, offset) { return new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(offset, true).toString(); }
  function checkAta(instruction, payer, address, owner, mint) {
    return instruction.programId.toBase58() === PROGRAMS.ata && instruction.data.length === 1 && instruction.data[0] === 1 &&
      instructionKey(instruction, 0) === payer && instructionKey(instruction, 1) === address &&
      instructionKey(instruction, 2) === owner && instructionKey(instruction, 3) === mint;
  }
  function checkTokenTransfer(instruction, source, mint, destination, owner, raw, decimals) {
    return instruction.programId.toBase58() === PROGRAMS.token && instruction.data.length === 10 && instruction.data[0] === 12 &&
      readU64(instruction.data, 1) === String(raw) && instruction.data[9] === decimals &&
      instructionKey(instruction, 0) === source && instructionKey(instruction, 1) === mint &&
      instructionKey(instruction, 2) === destination && instructionKey(instruction, 3) === owner;
  }
  function checkSolTransfer(instruction, source, destination, raw) {
    return instruction.programId.toBase58() === PROGRAMS.system && instruction.data.length === 12 &&
      new DataView(instruction.data.buffer, instruction.data.byteOffset, instruction.data.byteLength).getUint32(0, true) === 2 &&
      readU64(instruction.data, 4) === String(raw) && instructionKey(instruction, 0) === source && instructionKey(instruction, 1) === destination;
  }
  function validatePrepared(prepared) {
    var tx = solanaWeb3.Transaction.from(Uint8Array.from(atob(prepared.transaction), function (char) { return char.charCodeAt(0); }));
    if (tx.feePayer.toBase58() !== prepared.buyer) throw new Error('Transação recusada: pagador inesperado');
    var instructions = tx.instructions;
    if (!checkAta(instructions[0], prepared.buyer, prepared.buyerAsset, prepared.buyer, prepared.assetMint)) throw new Error('Transação recusada: destino do ativo inválido');
    var valid = false;
    if (prepared.paymentKind === 'native' && instructions.length === 4) {
      valid = checkSolTransfer(instructions[1], prepared.buyer, prepared.seller, prepared.sellerRaw) &&
        checkSolTransfer(instructions[2], prepared.buyer, prepared.feeWallet, prepared.feeRaw) &&
        checkTokenTransfer(instructions[3], prepared.assetSource, prepared.assetMint, prepared.buyerAsset, prepared.seller, '1', 0);
    } else if (prepared.paymentKind === 'spl' && instructions.length === 6) {
      valid = checkAta(instructions[1], prepared.buyer, prepared.sellerPayment, prepared.seller, prepared.paymentMint) &&
        checkAta(instructions[2], prepared.buyer, prepared.feePayment, prepared.feeWallet, prepared.paymentMint) &&
        checkTokenTransfer(instructions[3], prepared.paymentSource, prepared.paymentMint, prepared.sellerPayment, prepared.buyer, prepared.sellerRaw, prepared.paymentDecimals) &&
        checkTokenTransfer(instructions[4], prepared.paymentSource, prepared.paymentMint, prepared.feePayment, prepared.buyer, prepared.feeRaw, prepared.paymentDecimals) &&
        checkTokenTransfer(instructions[5], prepared.assetSource, prepared.assetMint, prepared.buyerAsset, prepared.seller, '1', 0);
    }
    if (!valid) throw new Error('Transação recusada: instruções diferentes da oferta');
    return tx;
  }
  function validateSellerOffer(prepared, item) {
    var amount = BigInt(item.price.raw);
    var fee = amount * BigInt(config.feeBps) / 10000n;
    if (config.feeBps > 0 && fee === 0n) fee = 1n;
    var expectedMint = item.currency === 'SOL' ? null : config.paymentMints[item.currency];
    if (prepared.seller !== publicKey || prepared.currency !== item.currency || prepared.assetMint !== item.assetMint ||
        prepared.priceRaw !== amount.toString() || prepared.feeRaw !== fee.toString() ||
        prepared.sellerRaw !== (amount - fee).toString() || prepared.feeWallet !== config.feeWallet ||
        prepared.paymentMint !== expectedMint || prepared.feeBps !== config.feeBps) {
      throw new Error('Transação recusada: os dados não correspondem ao pedido aprovado');
    }
  }
  async function buy(listingId, currency) {
    try {
      await ensureConnected();
      var listing = listingsById.get(listingId);
      if (!listing) throw new Error('Oferta não encontrada');
      if (!confirm('Comprar por ' + listing.prices[currency].display + '? A operação final transfere o pagamento e o ativo juntos.')) return;
      var route = '/v2/listings/' + listingId + '/intents';
      var payload = { listingId: listingId, currency: currency };
      var data = await request(route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
        buyer: publicKey, currency: currency, auth: await authorization('WF_NFT_MARKET_BUY_INTENT_V2', route, payload)
      }) });
      localStorage.setItem('wf_nft_purchase_v2', JSON.stringify({ id: data.purchase.id, listing: listing, currency: currency }));
      alert('Pedido enviado. O vendedor precisa aprovar e permanecer com a carteira conectada.');
      await continuePurchase();
    } catch (error) { alert(error.message); }
  }
  async function continuePurchase() {
    await ensureConnected();
    var pending = JSON.parse(localStorage.getItem('wf_nft_purchase_v2') || 'null');
    if (!pending) throw new Error('Não há compra pendente');
    var state;
    for (var attempt = 0; attempt < 90; attempt++) {
      state = await request('/v2/purchases/' + pending.id + '/status');
      if (state.purchase.state === 'completed') { localStorage.removeItem('wf_nft_purchase_v2'); alert('Compra confirmada na Solana.'); return; }
      if (state.purchase.state === 'ready_for_buyer') break;
      if (['rejected', 'cancelled'].indexOf(state.purchase.state) >= 0) throw new Error(state.purchase.error || 'Pedido recusado');
      await new Promise(function (resolve) { setTimeout(resolve, 2000); });
    }
    if (!state || state.purchase.state !== 'ready_for_buyer') throw new Error('O vendedor ainda não aprovou. Use “Continuar compra” depois.');
    var route = '/v2/purchases/' + pending.id + '/transaction';
    var payload = { purchaseId: pending.id };
    var response = await request(route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      buyer: publicKey, auth: await authorization('WF_NFT_MARKET_BUY_FETCH_V2', route, payload)
    }) });
    var prepared = response.prepared;
    var expectedPrice = pending.listing.prices[pending.currency];
    var summary = buildBuyerSummary(prepared.transaction, pending.listing, pending.currency, expectedPrice);
    var tx = validatePrepared(summary);
    var signed = await provider.signTransaction(tx);
    var finalBytes = signed.serialize({ requireAllSignatures: true, verifySignatures: true });
    var base64 = btoa(String.fromCharCode.apply(null, Array.from(finalBytes)));
    route = '/v2/purchases/' + pending.id + '/submit';
    payload = { purchaseId: pending.id, transactionDigest: await digestBytes(finalBytes) };
    var result = await request(route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      buyer: publicKey, transaction: base64, auth: await authorization('WF_NFT_MARKET_BUY_SUBMIT_V2', route, payload)
    }) });
    localStorage.removeItem('wf_nft_purchase_v2');
    alert('Compra concluída na Solana: ' + short(result.purchase.chainSignature));
    await Promise.all([loadListings(), loadInventory()]);
  }
  function ata(owner, mint) {
    return solanaWeb3.PublicKey.findProgramAddressSync([
      new solanaWeb3.PublicKey(owner).toBuffer(), new solanaWeb3.PublicKey(PROGRAMS.token).toBuffer(), new solanaWeb3.PublicKey(mint).toBuffer()
    ], new solanaWeb3.PublicKey(PROGRAMS.ata))[0].toBase58();
  }
  function buildBuyerSummary(transactionBase64, listing, currency, price) {
    var tx = solanaWeb3.Transaction.from(Uint8Array.from(atob(transactionBase64), function (char) { return char.charCodeAt(0); }));
    var amount = BigInt(price.raw);
    var fee = amount * BigInt(config.feeBps) / 10000n;
    if (config.feeBps > 0 && fee === 0n) fee = 1n;
    var net = amount - fee;
    var paymentMint = currency === 'SOL' ? null : config.paymentMints[currency];
    var paymentSource = currency === 'SOL' ? publicKey : instructionKey(tx.instructions[3], 0);
    return {
      transaction: transactionBase64, buyer: publicKey, seller: listing.seller, feeWallet: config.feeWallet,
      assetMint: listing.assetMint, assetSource: listing.assetTokenAccount, buyerAsset: ata(publicKey, listing.assetMint),
      paymentKind: currency === 'SOL' ? 'native' : 'spl', paymentMint: paymentMint,
      paymentDecimals: config.decimals[currency], paymentSource: paymentSource,
      sellerPayment: currency === 'SOL' ? listing.seller : ata(listing.seller, paymentMint),
      feePayment: currency === 'SOL' ? config.feeWallet : ata(config.feeWallet, paymentMint),
      sellerRaw: net.toString(), feeRaw: fee.toString()
    };
  }
  async function loadSellerRequests(showErrors) {
    if (!publicKey) return;
    try {
      var route = '/v2/seller/requests';
      var payload = { purpose: 'seller-requests' };
      var data = await request(route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
        seller: publicKey, auth: await authorization('WF_NFT_MARKET_SELLER_REQUESTS_V2', route, payload)
      }) });
      var root = el('seller-requests');
      if (!data.requests.length) { root.innerHTML = '<div class="empty">Nenhum pedido de compra aguardando sua aprovação.</div>'; return; }
      root.innerHTML = data.requests.map(function (item) {
        return '<article class="request-card" data-request="' + escapeHtml(item.id) + '"><strong>' + escapeHtml(item.title) + '</strong>' +
          '<span>' + escapeHtml(item.price.display) + ' · comprador ' + escapeHtml(short(item.buyer)) + '</span><button data-approve>Aprovar e assinar venda</button></article>';
      }).join('');
      Array.from(root.querySelectorAll('[data-approve]')).forEach(function (button) {
        button.addEventListener('click', function () { approveSale(data.requests.find(function (item) { return item.id === button.closest('[data-request]').dataset.request; })); });
      });
    } catch (error) { if (showErrors) alert(error.message); }
  }
  async function approveSale(item) {
    try {
      if (!confirm('Aprovar esta venda por ' + item.price.display + '? Confira os detalhes na janela de assinatura.')) return;
      var route = '/v2/purchases/' + item.id + '/prepare';
      var payload = { purchaseId: item.id };
      var response = await request(route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
        seller: publicKey, auth: await authorization('WF_NFT_MARKET_PREPARE_V2', route, payload)
      }) });
      var prepared = response.prepared;
      validateSellerOffer(prepared, item);
      var tx = validatePrepared(prepared);
      var signed = await provider.signTransaction(tx);
      var signedBytes = signed.serialize({ requireAllSignatures: false, verifySignatures: false });
      var base64 = btoa(String.fromCharCode.apply(null, Array.from(signedBytes)));
      route = '/v2/purchases/' + item.id + '/seller-signature';
      payload = { purchaseId: item.id, transactionDigest: await digestBytes(signedBytes) };
      await request(route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
        seller: publicKey, transaction: base64, auth: await authorization('WF_NFT_MARKET_SELLER_SIGN_V2', route, payload)
      }) });
      alert('Venda aprovada. O comprador já pode concluir.');
      await Promise.all([loadSellerRequests(false), loadListings()]);
    } catch (error) { alert(error.message); }
  }
  function copyGallery() {
    if (!publicKey && !sellerFilter) return alert('Conecte a carteira primeiro.');
    var seller = publicKey || sellerFilter;
    navigator.clipboard.writeText(location.origin + location.pathname + '?seller=' + encodeURIComponent(seller))
      .then(function () { alert('Link público da sua vitrine copiado.'); });
  }

  el('connect-wallet').addEventListener('click', function () { connect().catch(function (error) { alert(error.message); }); });
  el('refresh').addEventListener('click', function () { Promise.all([loadConfig(), loadListings(), publicKey ? loadInventory() : Promise.resolve()]).catch(function (error) { alert(error.message); }); });
  el('share-gallery').addEventListener('click', copyGallery);
  el('continue-purchase').addEventListener('click', function () { continuePurchase().catch(function (error) { alert(error.message); }); });
  el('refresh-requests').addEventListener('click', function () { ensureConnected().then(function () { return loadSellerRequests(true); }).catch(function (error) { alert(error.message); }); });

  Promise.all([loadConfig(), loadListings()]).catch(function (error) { el('catalog').innerHTML = '<div class="empty">' + escapeHtml(error.message) + '</div>'; });
  if (localStorage.getItem('wf_nft_purchase_v2')) el('continue-purchase').hidden = false;
  if (sellerFilter) el('gallery-note').textContent = 'Vitrine compartilhada de ' + short(sellerFilter);
}());
