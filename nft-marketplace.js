(function () {
  'use strict';
  var API = 'https://wordfinance-pixc-nft-marketplace-production.up.railway.app';
  var config = null;
  var provider = null;
  var publicKey = '';
  var sellerFilter = new URLSearchParams(location.search).get('seller') || '';
  var alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function stable(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    return '{' + Object.keys(value).sort().map(function (k) { return JSON.stringify(k) + ':' + stable(value[k]); }).join(',') + '}';
  }
  function toHex(bytes) { return Array.from(bytes).map(function (b) { return b.toString(16).padStart(2, '0'); }).join(''); }
  async function digest(value) { return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))); }
  async function digestBytes(value) { return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', value))); }
  function base58(bytes) {
    var digits = [0];
    for (var i = 0; i < bytes.length; i++) {
      var carry = bytes[i];
      for (var j = 0; j < digits.length; j++) { carry += digits[j] << 8; digits[j] = carry % 58; carry = (carry / 58) | 0; }
      while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0; }
    }
    var out = ''; for (var z = 0; z < bytes.length - 1 && bytes[z] === 0; z++) out += '1';
    for (var q = digits.length - 1; q >= 0; q--) out += alphabet[digits[q]];
    return out;
  }
  function nonce() { var b = new Uint8Array(16); crypto.getRandomValues(b); return toHex(b); }
  async function authorization(domain, route, payload) {
    if (!provider || !publicKey) throw new Error('Conecte a extensão WordFinance primeiro');
    var timestamp = Date.now(), n = nonce();
    var message = [domain, 'POST', route, publicKey, await digest(stable(payload)), String(timestamp), n].join('\n');
    var signed = await provider.signMessage(new TextEncoder().encode(message), 'utf8');
    var signature = signed && signed.signature ? signed.signature : signed;
    return { timestamp: timestamp, nonce: n, signature: base58(new Uint8Array(signature)) };
  }
  async function json(url, options) {
    var response = await fetch(url, options); var data = await response.json().catch(function () { return {}; });
    if (!response.ok || data.ok === false) throw new Error(data.error || 'Falha no serviço'); return data;
  }
  function findProvider() {
    return window.wordFinance || (window.solana && window.solana.isWordFinance ? window.solana : null);
  }
  async function connect() {
    provider = findProvider();
    if (!provider) throw new Error('Instale ou desbloqueie a extensão WordFinance');
    var result = await provider.connect();
    publicKey = String((result && result.publicKey) || provider.publicKey || '');
    if (!publicKey) throw new Error('A carteira não informou o endereço');
    document.getElementById('wallet-state').textContent = 'Conectada: ' + publicKey;
  }
  async function loadConfig() {
    config = await json(API + '/v1/config');
    var el = document.getElementById('market-status');
    el.textContent = config.enabled ? 'PILOTO ATIVO · ' + config.network : 'HOMOLOGAÇÃO · COMPRAS DESLIGADAS';
    el.style.background = config.enabled ? '#063d30' : '#3c2d0b'; el.style.color = config.enabled ? '#18e7a5' : '#f7c948';
  }
  async function loadListings() {
    var data = await json(API + '/v1/listings'); var root = document.getElementById('catalog');
    var listings = data.listings || [];
    if (sellerFilter) listings = listings.filter(function (item) { return item.seller === sellerFilter; });
    if (!listings.length) { root.innerHTML = '<div class="empty">Nenhum NFT está listado nesta vitrine.</div>'; return; }
    root.innerHTML = listings.map(function (item) {
      var image = item.imageUrl ? '<img src="' + escapeHtml(item.imageUrl) + '" alt="">' : '<div style="aspect-ratio:1;background:#080b13;border-radius:12px"></div>';
      return '<article class="listing" id="listing-' + escapeHtml(item.id) + '">' + image + '<h3>' + escapeHtml(item.title) + '</h3><div class="price">' + escapeHtml(item.priceDisplay) + '</div><p class="wallet">Mint: ' + escapeHtml(item.nftMint) + '</p><button ' + (config && config.enabled ? '' : 'disabled ') + 'data-buy="' + escapeHtml(item.id) + '">Comprar com PIXC</button></article>';
    }).join('');
    Array.from(root.querySelectorAll('[data-buy]')).forEach(function (button) { button.addEventListener('click', function () { buy(button.dataset.buy); }); });
  }
  async function buy(listingId) {
    try {
      if (!config || !config.enabled) throw new Error('O piloto ainda está bloqueado para compras');
      if (!publicKey) await connect();
      if (!confirm('Solicitar esta compra? O PIXC só será movimentado na confirmação final.')) return;
      var route = '/v1/listings/' + listingId + '/intents', payload = { listingId: listingId };
      var data = await json(API + route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ buyer: publicKey, auth: await authorization('WF_PIXC_NFT_BUY_INTENT_V1', route, payload) }) });
      localStorage.setItem('wf_pixc_nft_purchase', data.purchase.id);
      alert('Pedido enviado ao vendedor. Deixe esta página aberta e clique em “Continuar compra” quando ele aprovar.');
      await continuePurchase(data.purchase.id);
    } catch (e) { alert(e.message); }
  }
  async function continuePurchase(id) {
    for (var attempt = 0; attempt < 90; attempt++) {
      var state = await json(API + '/v1/purchases/' + id + '/status');
      if (state.purchase.state === 'completed') { alert('Compra confirmada na Solana: ' + state.purchase.chainSignature); localStorage.removeItem('wf_pixc_nft_purchase'); return; }
      if (state.purchase.state === 'ready_for_buyer') break;
      await new Promise(function (resolve) { setTimeout(resolve, 2000); });
    }
    var route = '/v1/purchases/' + id + '/transaction', payload = { purchaseId: id };
    var prepared = await json(API + route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ buyer: publicKey, auth: await authorization('WF_PIXC_NFT_BUY_FETCH_V1', route, payload) }) });
    var raw = Uint8Array.from(atob(prepared.prepared.transaction), function (c) { return c.charCodeAt(0); });
    var tx = solanaWeb3.Transaction.from(raw);
    var signed = await provider.signTransaction(tx);
    var finalBytes = signed.serialize({ requireAllSignatures: true, verifySignatures: true });
    var b64 = btoa(String.fromCharCode.apply(null, Array.from(finalBytes)));
    route = '/v1/purchases/' + id + '/submit'; payload = { purchaseId: id, transactionDigest: await digestBytes(finalBytes) };
    var result = await json(API + route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ buyer: publicKey, transaction: b64, auth: await authorization('WF_PIXC_NFT_BUY_SUBMIT_V1', route, payload) }) });
    alert('Compra concluída: ' + result.purchase.chainSignature); localStorage.removeItem('wf_pixc_nft_purchase'); await loadListings();
  }
  document.getElementById('connect-wallet').addEventListener('click', function () { connect().catch(function (e) { alert(e.message); }); });
  document.getElementById('continue-purchase').addEventListener('click', function () {
    var pending = localStorage.getItem('wf_pixc_nft_purchase');
    (async function () { if (!publicKey) await connect(); await continuePurchase(pending); }()).catch(function (e) { alert(e.message); });
  });
  document.getElementById('share-gallery').addEventListener('click', function () {
    navigator.clipboard.writeText(location.origin + location.pathname + '?seller=' + encodeURIComponent(sellerFilter)).then(function () { alert('Link da vitrine copiado.'); });
  });
  document.getElementById('refresh').addEventListener('click', function () { Promise.all([loadConfig(), loadListings()]).catch(function (e) { alert(e.message); }); });
  loadConfig().then(loadListings).catch(function (e) { document.getElementById('catalog').innerHTML = '<div class="empty">' + escapeHtml(e.message) + '</div>'; });
  var pending = localStorage.getItem('wf_pixc_nft_purchase');
  if (pending) { document.getElementById('wallet-state').textContent = 'Há uma compra pendente. Conecte a carteira para continuar.'; document.getElementById('continue-purchase').hidden = false; }
  if (sellerFilter) document.getElementById('share-gallery').hidden = false;
}());
