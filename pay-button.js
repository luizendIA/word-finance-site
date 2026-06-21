/**
 * wordfinance-pay-button.js — Word Finance Pay Embed v1.0
 * 
 * Aceite Bitcoin e USDC em qualquer site com uma linha de codigo.
 * 
 * USO SIMPLES:
 *   <script src="https://wordfinance.org/pay-button.js"
 *     data-wallet="SUA_CARTEIRA_SOLANA"
 *     data-amount="49.90"
 *     data-description="Produto XYZ">
 *   </script>
 * 
 * USO AVANCADO (JavaScript):
 *   WordFinancePay.create({
 *     wallet: 'SUA_CARTEIRA_SOLANA',
 *     amount: 149.90,
 *     description: 'Assinatura Mensal',
 *     onSuccess: function(data) { alert('Pago! TX: ' + data.txHash); },
 *     onError: function(err) { alert('Erro: ' + err); }
 *   });
 * 
 * Soli Deo Gloria
 */

(function() {
  'use strict';

  var GATEWAY_URL = 'https://webhook.wordfinance.org';
  var MERCHANT_CACHE_KEY = 'wfpay_merchant_id';

  // ── Estilos do botao e modal ──
  var CSS = '\
    .wfpay-btn { \
      display:inline-flex; align-items:center; gap:8px; \
      background:linear-gradient(135deg,#f7931a,#e8850f); color:#000; \
      padding:12px 24px; border-radius:8px; border:none; \
      font-weight:700; font-size:0.95rem; cursor:pointer; \
      font-family:-apple-system,BlinkMacSystemFont,sans-serif; \
      transition:all 0.2s; box-shadow:0 4px 15px rgba(247,147,26,0.3); \
    } \
    .wfpay-btn:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(247,147,26,0.4); } \
    .wfpay-btn svg { width:20px; height:20px; } \
    .wfpay-modal-overlay { \
      position:fixed; top:0; left:0; width:100%; height:100%; \
      background:rgba(0,0,0,0.7); z-index:99999; \
      display:flex; align-items:center; justify-content:center; padding:20px; \
    } \
    .wfpay-modal { \
      background:#1a1a2e; border-radius:16px; padding:0; \
      max-width:440px; width:100%; box-shadow:0 20px 60px rgba(0,0,0,0.5); \
      overflow:hidden; \
    } \
    .wfpay-modal iframe { width:100%; height:600px; border:none; } \
    .wfpay-modal-close { \
      position:absolute; top:12px; right:16px; background:none; border:none; \
      color:#888; font-size:1.5rem; cursor:pointer; z-index:100000; \
    } \
  ';

  // ── Injetar CSS ──
  function injectCSS() {
    if (document.getElementById('wfpay-styles')) return;
    var style = document.createElement('style');
    style.id = 'wfpay-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // ── Registrar merchant (se necessario) ──
  function ensureMerchant(wallet, callback) {
    var cached = localStorage.getItem(MERCHANT_CACHE_KEY + '_' + wallet);
    if (cached) return callback(null, cached);

    var xhr = new XMLHttpRequest();
    xhr.open('POST', GATEWAY_URL + '/api/gateway/merchant/register');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
      if (xhr.status === 200) {
        var data = JSON.parse(xhr.responseText);
        if (data.merchantId) {
          localStorage.setItem(MERCHANT_CACHE_KEY + '_' + wallet, data.merchantId);
          callback(null, data.merchantId);
        } else {
          callback('Erro ao registrar merchant');
        }
      } else {
        // Tenta extrair merchantId de erro "ja existe"
        try {
          var err = JSON.parse(xhr.responseText);
          if (err.merchantId) {
            localStorage.setItem(MERCHANT_CACHE_KEY + '_' + wallet, err.merchantId);
            callback(null, err.merchantId);
          } else {
            callback(err.error || 'Erro no registro');
          }
        } catch(e) {
          callback('Erro no registro');
        }
      }
    };
    xhr.onerror = function() { callback('Sem conexao com gateway'); };
    xhr.send(JSON.stringify({
      name: document.title || location.hostname,
      solanaWallet: wallet,
      platform: 'embed',
      siteUrl: location.origin
    }));
  }

  // ── Criar charge ──
  function createCharge(merchantId, opts, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', GATEWAY_URL + '/api/gateway/charge');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
      if (xhr.status === 200) {
        callback(null, JSON.parse(xhr.responseText));
      } else {
        try { callback(JSON.parse(xhr.responseText).error); }
        catch(e) { callback('Erro ao criar cobranca'); }
      }
    };
    xhr.onerror = function() { callback('Sem conexao'); };
    xhr.send(JSON.stringify({
      merchantId: merchantId,
      amountBRL: opts.amount,
      description: opts.description || 'Pagamento via Word Finance',
      orderId: opts.orderId || 'embed_' + Date.now(),
      customerEmail: opts.email || '',
      platform: 'embed'
    }));
  }

  // ── Abrir modal de pagamento ──
  function openPaymentModal(chargeId, opts) {
    var overlay = document.createElement('div');
    overlay.className = 'wfpay-modal-overlay';

    var modal = document.createElement('div');
    modal.className = 'wfpay-modal';
    modal.style.position = 'relative';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'wfpay-modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = function() { overlay.remove(); };

    var iframe = document.createElement('iframe');
    iframe.src = GATEWAY_URL + '/pay/' + chargeId;

    modal.appendChild(closeBtn);
    modal.appendChild(iframe);
    overlay.appendChild(modal);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);

    // Poll status
    var pollInterval = setInterval(function() {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', GATEWAY_URL + '/api/gateway/charge/' + chargeId);
      xhr.onload = function() {
        if (xhr.status === 200) {
          var data = JSON.parse(xhr.responseText);
          if (data.status === 'paid' || data.status === 'confirmed') {
            clearInterval(pollInterval);
            overlay.remove();
            if (opts.onSuccess) opts.onSuccess(data);
          } else if (data.status === 'expired') {
            clearInterval(pollInterval);
            overlay.remove();
            if (opts.onError) opts.onError('Pagamento expirado');
          }
        }
      };
      xhr.send();
    }, 3000);
  }

  // ── API Publica ──
  window.WordFinancePay = {
    create: function(opts) {
      if (!opts.wallet) return console.error('[WFPay] wallet obrigatorio');
      if (!opts.amount) return console.error('[WFPay] amount obrigatorio');

      injectCSS();

      ensureMerchant(opts.wallet, function(err, merchantId) {
        if (err) {
          if (opts.onError) opts.onError(err);
          else console.error('[WFPay]', err);
          return;
        }

        createCharge(merchantId, opts, function(err, charge) {
          if (err) {
            if (opts.onError) opts.onError(err);
            else console.error('[WFPay]', err);
            return;
          }

          openPaymentModal(charge.chargeId, opts);
        });
      });
    },

    button: function(container, opts) {
      injectCSS();

      var btn = document.createElement('button');
      btn.className = 'wfpay-btn';
      btn.innerHTML = '\
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-1v-1h1v1zm3.17-5.24l-.95.95c-.38.38-.62.76-.62 1.29v.5H10.5v-.75c0-.71.38-1.36.81-1.79l1.31-1.33c.2-.21.33-.49.33-.81 0-.67-.54-1.21-1.21-1.21-.67 0-1.21.54-1.21 1.21H8.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5c0 .55-.22 1.05-.58 1.41l-.25.25z"/></svg>\
        Pagar R$ ' + (opts.amount || '0').toFixed ? opts.amount.toFixed(2) : opts.amount + ' com Crypto';
      
      btn.onclick = function() {
        window.WordFinancePay.create(opts);
      };

      if (typeof container === 'string') container = document.querySelector(container);
      if (container) container.appendChild(btn);
      return btn;
    }
  };

  // ── Auto-init via data attributes ──
  document.addEventListener('DOMContentLoaded', function() {
    var scripts = document.querySelectorAll('script[data-wallet]');
    scripts.forEach(function(script) {
      var wallet = script.getAttribute('data-wallet');
      var amount = parseFloat(script.getAttribute('data-amount') || '0');
      var desc = script.getAttribute('data-description') || '';
      var target = script.getAttribute('data-target');
      var label = script.getAttribute('data-label');

      if (!wallet || !amount) return;

      var btn = document.createElement('button');
      btn.className = 'wfpay-btn';
      btn.textContent = (label || 'Pagar R$ ' + amount.toFixed(2) + ' com Crypto');
      btn.onclick = function() {
        window.WordFinancePay.create({
          wallet: wallet,
          amount: amount,
          description: desc
        });
      };

      if (target) {
        var el = document.querySelector(target);
        if (el) el.appendChild(btn);
      } else {
        script.parentNode.insertBefore(btn, script.nextSibling);
      }
    });
  });

})();
