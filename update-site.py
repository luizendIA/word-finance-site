#!/usr/bin/env python3
"""
Word Finance Site Update Script
Adiciona: Roadmap + Tradutor Multi-idioma + Link no Nav + Atualiza usuarios
Backup ja deve ter sido feito antes de rodar!
"""

import re

FILE = '/mnt/c/dev/word-finance-site/index.html'

with open(FILE, 'r', encoding='utf-8') as f:
    html = f.read()

# ============================================
# 1. ADICIONAR LINK DO ROADMAP NO NAV
# ============================================
old_nav = '<a href="#investidores">Investidores</a>'
new_nav = '<a href="#investidores">Investidores</a>\n        <a href="#roadmap">Roadmap</a>'
html = html.replace(old_nav, new_nav)
print("[OK] Link Roadmap adicionado no nav")

# ============================================
# 2. ADICIONAR BOTAO DE TRADUCAO NO NAV
# ============================================
old_close_nav = '    </div>\n</nav>'
new_close_nav = '''    </div>
    <div id="wf-lang-wrapper" style="position:relative;margin-left:12px;">
        <button id="wf-lang-btn" onclick="document.getElementById('wf-lang-dropdown').classList.toggle('wf-show')" style="background:var(--surface-2);border:1px solid var(--border);color:var(--text-dim);padding:6px 14px;border-radius:6px;font-size:0.82rem;font-family:'Outfit',sans-serif;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.2s;">
            &#127760; <span id="wf-lang-label">PT</span> <span style="font-size:0.6rem;">&#9660;</span>
        </button>
        <div id="wf-lang-dropdown" style="display:none;position:absolute;top:calc(100% + 8px);right:0;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:8px 0;min-width:180px;z-index:9999;box-shadow:0 12px 40px rgba(0,0,0,0.5);max-height:360px;overflow-y:auto;">
        </div>
    </div>
</nav>'''
html = html.replace(old_close_nav, new_close_nav)
print("[OK] Botao de traducao adicionado no nav")

# ============================================
# 3. ATUALIZAR NUMERO DE USUARIOS (22 -> 54)
# ============================================
html = html.replace('22 usu\u00e1rios reais', '54 usu\u00e1rios reais')
print("[OK] Usuarios atualizado de 22 para 54")

# ============================================
# 4. ADICIONAR SECAO ROADMAP (antes de investidores)
# ============================================
roadmap_section = '''
<!-- ========== ROADMAP ========== -->
<section id="roadmap" style="padding:100px 6%;position:relative;">
    <div style="text-align:center;margin-bottom:60px;">
        <p style="color:var(--btc);font-family:'JetBrains Mono',monospace;font-size:0.85rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">Roadmap</p>
        <h2 style="font-size:clamp(2rem,4vw,3rem);font-weight:700;margin-bottom:16px;">Construindo o futuro<br>das finan\u00e7as soberanas</h2>
        <p style="color:var(--text-dim);font-size:1.05rem;max-width:600px;margin:0 auto;">Cada feature entregue por um \u00fanico desenvolvedor. Imagine o que vem pela frente com o suporte certo.</p>
    </div>
    <div style="max-width:800px;margin:0 auto;position:relative;">
        <div style="position:absolute;left:28px;top:0;bottom:0;width:2px;background:linear-gradient(180deg,var(--btc),var(--sol),var(--blue));opacity:0.3;border-radius:2px;"></div>

        <div style="display:flex;gap:24px;margin-bottom:36px;align-items:flex-start;">
            <div style="min-width:56px;height:56px;border-radius:50%;background:rgba(16,185,129,0.12);border:2px solid var(--green);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;z-index:1;">&#9989;</div>
            <div style="background:var(--surface);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:20px 24px;flex:1;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                    <h3 style="font-size:1.1rem;font-weight:600;">Bitcoin Lightning Network</h3>
                    <span style="background:rgba(16,185,129,0.15);color:var(--green);padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:600;">LIVE</span>
                </div>
                <p style="color:var(--text-dim);font-size:0.9rem;line-height:1.6;">Pagamentos instant\u00e2neos via Lightning com canais pr\u00f3prios. Node brasileiro conectado \u00e0 rede global.</p>
            </div>
        </div>

        <div style="display:flex;gap:24px;margin-bottom:36px;align-items:flex-start;">
            <div style="min-width:56px;height:56px;border-radius:50%;background:rgba(16,185,129,0.12);border:2px solid var(--green);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;z-index:1;">&#9989;</div>
            <div style="background:var(--surface);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:20px 24px;flex:1;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                    <h3 style="font-size:1.1rem;font-weight:600;">Multi-Moeda Soberana</h3>
                    <span style="background:rgba(16,185,129,0.15);color:var(--green);padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:600;">LIVE</span>
                </div>
                <p style="color:var(--text-dim);font-size:0.9rem;line-height:1.6;">BTC, SOL, USDC, USDT, JUP, BONK e PIXC em uma \u00fanica carteira non-custodial. Swaps via Jupiter DEX.</p>
            </div>
        </div>

        <div style="display:flex;gap:24px;margin-bottom:36px;align-items:flex-start;">
            <div style="min-width:56px;height:56px;border-radius:50%;background:rgba(16,185,129,0.12);border:2px solid var(--green);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;z-index:1;">&#9989;</div>
            <div style="background:var(--surface);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:20px 24px;flex:1;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                    <h3 style="font-size:1.1rem;font-weight:600;">Gateway de Pagamentos</h3>
                    <span style="background:rgba(16,185,129,0.15);color:var(--green);padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:600;">LIVE</span>
                </div>
                <p style="color:var(--text-dim);font-size:0.9rem;line-height:1.6;">Aceite BTC e USDC no seu e-commerce. Split at\u00f4mico 99/1 e QR code instant\u00e2neo.</p>
            </div>
        </div>

        <div style="display:flex;gap:24px;margin-bottom:36px;align-items:flex-start;">
            <div style="min-width:56px;height:56px;border-radius:50%;background:rgba(16,185,129,0.12);border:2px solid var(--green);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;z-index:1;">&#9989;</div>
            <div style="background:var(--surface);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:20px 24px;flex:1;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                    <h3 style="font-size:1.1rem;font-weight:600;">Multi-Plataforma</h3>
                    <span style="background:rgba(16,185,129,0.15);color:var(--green);padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:600;">LIVE</span>
                </div>
                <p style="color:var(--text-dim);font-size:0.9rem;line-height:1.6;">Windows, Linux (Electron) e Android. Web app responsivo. Mesma seed, todas as plataformas.</p>
            </div>
        </div>

        <div style="display:flex;gap:24px;margin-bottom:36px;align-items:flex-start;">
            <div style="min-width:56px;height:56px;border-radius:50%;background:rgba(16,185,129,0.12);border:2px solid var(--green);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;z-index:1;">&#9989;</div>
            <div style="background:var(--surface);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:20px 24px;flex:1;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                    <h3 style="font-size:1.1rem;font-weight:600;">dApp Browser &amp; Mobile Wallet Adapter</h3>
                    <span style="background:rgba(16,185,129,0.15);color:var(--green);padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:600;">LIVE</span>
                </div>
                <p style="color:var(--text-dim);font-size:0.9rem;line-height:1.6;">Conecte-se a Jupiter, Raydium e Magic Eden direto pela Word Finance. MWA compat\u00edvel com Solana.</p>
            </div>
        </div>

        <div style="display:flex;gap:24px;margin-bottom:36px;align-items:flex-start;">
            <div style="min-width:56px;height:56px;border-radius:50%;background:rgba(247,147,26,0.12);border:2px solid var(--btc);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;z-index:1;">&#128284;</div>
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px 24px;flex:1;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                    <h3 style="font-size:1.1rem;font-weight:600;">Google Play Store</h3>
                    <span style="background:rgba(247,147,26,0.12);color:var(--btc);padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:600;">EM BREVE</span>
                </div>
                <p style="color:var(--text-dim);font-size:0.9rem;line-height:1.6;">Publica\u00e7\u00e3o oficial na Play Store. Instala\u00e7\u00e3o facilitada e atualiza\u00e7\u00f5es autom\u00e1ticas para Android.</p>
            </div>
        </div>

        <div style="display:flex;gap:24px;margin-bottom:36px;align-items:flex-start;">
            <div style="min-width:56px;height:56px;border-radius:50%;background:rgba(247,147,26,0.12);border:2px solid var(--btc);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;z-index:1;">&#128284;</div>
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px 24px;flex:1;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                    <h3 style="font-size:1.1rem;font-weight:600;">Integra\u00e7\u00e3o Nuvemshop</h3>
                    <span style="background:rgba(247,147,26,0.12);color:var(--btc);padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:600;">EM BREVE</span>
                </div>
                <p style="color:var(--text-dim);font-size:0.9rem;line-height:1.6;">Aceite Bitcoin e USDC na sua loja Nuvemshop com um clique. App parceiro oficial.</p>
            </div>
        </div>

        <div style="display:flex;gap:24px;margin-bottom:36px;align-items:flex-start;">
            <div style="min-width:56px;height:56px;border-radius:50%;background:rgba(59,130,246,0.12);border:2px solid var(--blue);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;z-index:1;">&#128284;</div>
            <div style="background:var(--surface);border:1px solid rgba(59,130,246,0.15);border-radius:12px;padding:20px 24px;flex:1;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                    <h3 style="font-size:1.1rem;font-weight:600;">PIX + Saldo em Reais</h3>
                    <span style="background:rgba(59,130,246,0.12);color:var(--blue);padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:600;">PLANEJADO</span>
                </div>
                <p style="color:var(--text-dim);font-size:0.9rem;line-height:1.6;">Dep\u00f3sitos via PIX, saldo em BRL e convers\u00e3o instant\u00e2nea Real para Crypto dentro da wallet.</p>
            </div>
        </div>

        <div style="display:flex;gap:24px;margin-bottom:36px;align-items:flex-start;">
            <div style="min-width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,rgba(247,147,26,0.25),rgba(153,69,255,0.25));border:2px solid var(--sol);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;z-index:1;animation:pulse-glow 2s ease-in-out infinite;">&#129504;</div>
            <div style="background:linear-gradient(135deg,var(--surface),rgba(153,69,255,0.08));border:1px solid rgba(153,69,255,0.3);border-radius:12px;padding:20px 24px;flex:1;position:relative;overflow:hidden;">
                <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;background:radial-gradient(circle,rgba(153,69,255,0.1),transparent);border-radius:50%;"></div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                    <h3 style="font-size:1.1rem;font-weight:600;">Assistente IA em Portugu\u00eas &#127463;&#127479;</h3>
                    <span style="background:linear-gradient(135deg,rgba(153,69,255,0.2),rgba(247,147,26,0.2));color:var(--sol);padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:600;border:1px solid rgba(153,69,255,0.3);">EM DESENVOLVIMENTO</span>
                </div>
                <p style="color:var(--text);font-size:0.95rem;line-height:1.7;position:relative;z-index:1;">
                    <strong style="color:var(--btc);">A primeira wallet brasileira com IA conversacional.</strong><br>
                    Fale ou digite: <em style="color:var(--text-dim);">"Manda 10 mil sats pro Fernando"</em> &mdash; a IA entende, confirma e executa. Comandos por voz em portugu\u00eas, integra\u00e7\u00e3o nativa com todas as moedas.
                </p>
                <div style="margin-top:14px;padding:10px 14px;background:rgba(0,0,0,0.3);border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:0.78rem;color:var(--text-dim);line-height:1.6;">
                    <span style="color:var(--green);">Voc\u00ea:</span> "Qual meu saldo em Bitcoin?"<br>
                    <span style="color:var(--sol);">IA:</span> "Seu saldo \u00e9 0.00154 BTC (R$ 1.247,30). Deseja enviar ou converter?"
                </div>
            </div>
        </div>

    </div>
</section>
<!-- ========== FIM ROADMAP ========== -->

'''

old_investidores = '<section id="investidores"'
html = html.replace(old_investidores, roadmap_section + '<section id="investidores"', 1)
print("[OK] Secao Roadmap inserida antes de Investidores")

# ============================================
# 5. ADICIONAR SCRIPTS DE TRADUCAO + ESTILOS (antes de </body>)
# ============================================
translate_code = '''
<!-- ========== TRADUCAO MULTI-IDIOMA ========== -->
<div id="google_translate_element" style="display:none;"></div>
<script>
var WF_LANGS=[
{code:'pt',flag:'\\ud83c\\udde7\\ud83c\\uddf7',name:'Portugu\\u00eas'},
{code:'en',flag:'\\ud83c\\uddfa\\ud83c\\uddf8',name:'English'},
{code:'es',flag:'\\ud83c\\uddea\\ud83c\\uddf8',name:'Espa\\u00f1ol'},
{code:'fr',flag:'\\ud83c\\uddeb\\ud83c\\uddf7',name:'Fran\\u00e7ais'},
{code:'de',flag:'\\ud83c\\udde9\\ud83c\\uddea',name:'Deutsch'},
{code:'it',flag:'\\ud83c\\uddee\\ud83c\\uddf9',name:'Italiano'},
{code:'ja',flag:'\\ud83c\\uddef\\ud83c\\uddf5',name:'\\u65e5\\u672c\\u8a9e'},
{code:'ko',flag:'\\ud83c\\uddf0\\ud83c\\uddf7',name:'\\ud55c\\uad6d\\uc5b4'},
{code:'zh-CN',flag:'\\ud83c\\udde8\\ud83c\\uddf3',name:'\\u4e2d\\u6587'},
{code:'ru',flag:'\\ud83c\\uddf7\\ud83c\\uddfa',name:'\\u0420\\u0443\\u0441\\u0441\\u043a\\u0438\\u0439'},
{code:'ar',flag:'\\ud83c\\uddf8\\ud83c\\udde6',name:'\\u0627\\u0644\\u0639\\u0631\\u0628\\u064a\\u0629'},
{code:'hi',flag:'\\ud83c\\uddee\\ud83c\\uddf3',name:'\\u0939\\u093f\\u0928\\u094d\\u0926\\u0940'},
{code:'tr',flag:'\\ud83c\\uddf9\\ud83c\\uddf7',name:'T\\u00fcrk\\u00e7e'},
{code:'nl',flag:'\\ud83c\\uddf3\\ud83c\\uddf1',name:'Nederlands'},
{code:'pl',flag:'\\ud83c\\uddf5\\ud83c\\uddf1',name:'Polski'},
{code:'sv',flag:'\\ud83c\\uddf8\\ud83c\\uddea',name:'Svenska'},
{code:'th',flag:'\\ud83c\\uddf9\\ud83c\\udded',name:'\\u0e44\\u0e17\\u0e22'},
{code:'vi',flag:'\\ud83c\\uddfb\\ud83c\\uddf3',name:'Ti\\u1ebfng Vi\\u1ec7t'},
{code:'id',flag:'\\ud83c\\uddee\\ud83c\\udde9',name:'Bahasa Indonesia'},
{code:'uk',flag:'\\ud83c\\uddfa\\ud83c\\udde6',name:'\\u0423\\u043a\\u0440\\u0430\\u0457\\u043d\\u0441\\u044c\\u043a\\u0430'}
];
(function(){
var dd=document.getElementById('wf-lang-dropdown');
if(!dd)return;
WF_LANGS.forEach(function(lang){
var b=document.createElement('button');
b.className='wf-lang-item';
b.innerHTML='<span style="font-size:1.2rem;">'+lang.flag+'</span> '+lang.name;
b.onclick=function(){
wfTranslateTo(lang.code);
document.getElementById('wf-lang-label').textContent=lang.code==='pt'?'PT':lang.code.toUpperCase().slice(0,2);
dd.classList.remove('wf-show');
};
dd.appendChild(b);
});
document.addEventListener('click',function(e){
if(!document.getElementById('wf-lang-wrapper').contains(e.target))dd.classList.remove('wf-show');
});
})();
function wfTranslateTo(c){
if(c==='pt'){
document.cookie='googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC';
document.cookie='googtrans=; path=/; domain=.'+location.hostname+'; expires=Thu, 01 Jan 1970 00:00:00 UTC';
location.reload();return;
}
document.cookie='googtrans=/pt/'+c+'; path=/';
document.cookie='googtrans=/pt/'+c+'; path=/; domain=.'+location.hostname;
location.reload();
}
function googleTranslateElementInit(){
new google.translate.TranslateElement({pageLanguage:'pt',autoDisplay:false,layout:google.translate.TranslateElement.InlineLayout.NONE},'google_translate_element');
}
</script>
<script src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"></script>
<style>
.wf-show{display:block!important;}
.wf-lang-item{display:flex;align-items:center;gap:10px;width:100%;padding:10px 16px;background:none;border:none;color:#e8ecf2;font-family:'Outfit',sans-serif;font-size:0.88rem;cursor:pointer;text-align:left;transition:background 0.15s;}
.wf-lang-item:hover{background:rgba(247,147,26,0.1);color:#f7931a;}
#wf-lang-btn:hover{border-color:rgba(247,147,26,0.4);color:#e8ecf2;}
.goog-te-banner-frame,.goog-te-balloon-frame,#goog-gt-tt,.goog-te-gadget,.goog-tooltip,.goog-tooltip:hover,.goog-text-highlight,.VIpgJd-ZVi9od-aZ2wEe-wOHMyf,.VIpgJd-ZVi9od-aZ2wEe-wOHMyf-hgDUwe,.VIpgJd-ZVi9od-ORHb-OEVmcd,.VIpgJd-suEOdc{display:none!important;visibility:hidden!important;height:0!important;overflow:hidden!important;}
body{top:0!important;}
html.translated-ltr,html.translated-rtl{margin-top:0!important;}
#wf-lang-dropdown::-webkit-scrollbar{width:4px;}
#wf-lang-dropdown::-webkit-scrollbar-track{background:transparent;}
#wf-lang-dropdown::-webkit-scrollbar-thumb{background:rgba(247,147,26,0.3);border-radius:4px;}
@keyframes pulse-glow{0%,100%{box-shadow:0 0 8px rgba(153,69,255,0.2);}50%{box-shadow:0 0 20px rgba(153,69,255,0.5);}}
@media(max-width:768px){#wf-lang-wrapper{margin-left:8px;}#wf-lang-dropdown{right:-20px;min-width:160px;}#wf-lang-btn{padding:5px 10px;font-size:0.78rem;}}
</style>
<!-- ========== FIM TRADUCAO ========== -->

'''

html = html.replace('</body>', translate_code + '</body>')
print("[OK] Scripts de traducao inseridos")

# ============================================
# SALVAR
# ============================================
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(html)

print("\n========================================")
print("SITE ATUALIZADO COM SUCESSO!")
print("========================================")
print("Adicionado:")
print("  - Link 'Roadmap' no nav")
print("  - Botao tradutor (20 idiomas) no nav")
print("  - Secao Roadmap completa (5 LIVE + 4 EM BREVE)")
print("  - Destaque IA conversacional com animacao")
print("  - Usuarios atualizado: 22 -> 54")
print("")
print("Proximo passo:")
print("  cd /mnt/c/dev/word-finance-site")
print("  git add -A")
print('  git commit -m "Roadmap + tradutor 20 idiomas + IA preview"')
print("  git push")
print("")
print("Soli Deo Gloria!")
