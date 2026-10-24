// js/app/39-qr-code.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── QR CODE (só o Master) ───────────────────────────────────────────────────
// Tela para mostrar no celular e a pessoa escanear: "Conhecer o site" (landing) ou "Criar conta"
// (abre o cadastro do plano Gratuito na landing). A biblioteca de QR é carregada só ao abrir a tela,
// com a impressão digital (SRI) conferida — ver SRI_CDN em 01-base.js.
const QR_URL_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
const QR_DESTINOS = {
  site:     { url:'https://finrossi.com.br',                     rotulo:'finrossi.com.br',            dica:'Aponte a câmera para conhecer o FinRossi' },
  cadastro: { url:'https://finrossi.com.br/landing/?cadastro=1', rotulo:'finrossi.com.br · cadastro', dica:'Aponte a câmera para criar a conta grátis' },
};
let _qrModo = 'site';

function _qrCarregarLib(){
  if(typeof qrcode === 'function') return Promise.resolve();
  return new Promise((res, rej) => {
    const s = scriptComIntegridade(document.createElement('script'), QR_URL_LIB);
    s.onload = res; s.onerror = () => rej(new Error('Não deu para gerar o QR Code. Verifique a internet.'));
    document.head.appendChild(s);
  });
}

async function renderQrCode(){
  const el = document.getElementById('qr-conteudo'); if(!el) return;
  if(!(typeof isMaster === 'function' && isMaster())){ goTo('dashboard'); return; }   // só o Master
  const d = QR_DESTINOS[_qrModo];
  el.innerHTML = `<div class="qr-tela">
    <img class="qr-logo" src="img/icon-512.png" alt="FinRossi">
    <div class="qr-marca">Fin<b>Rossi</b></div>
    <div class="qr-slogan">Aplicativo para construir sua riqueza</div>
    <div class="qr-seg" role="tablist" aria-label="Para onde o QR Code leva">
      <button type="button" role="tab" aria-selected="${_qrModo==='site'}" class="${_qrModo==='site'?'on':''}" onclick="_qrModo='site';renderQrCode()">Conhecer o site</button>
      <button type="button" role="tab" aria-selected="${_qrModo==='cadastro'}" class="${_qrModo==='cadastro'?'on':''}" onclick="_qrModo='cadastro';renderQrCode()">Criar conta</button>
    </div>
    <div class="qr-cartao"><div id="qr-imagem" class="qr-imagem" aria-label="QR Code para ${d.rotulo}"></div><img class="qr-centro" src="img/icon-192.png?v=5" alt=""></div>
    <div class="qr-dica">${d.dica}</div>
    <div class="qr-url">${d.rotulo}</div>
    <div class="qr-acoes">
      <button class="btn" type="button" id="qr-copiar" onclick="qrCopiarLink()">Copiar link</button>
      <button class="btn primary" type="button" onclick="qrCompartilhar()">Compartilhar</button>
    </div>
  </div>`;
  try{
    await _qrCarregarLib();
    const q = qrcode(0, 'H');                  // correção máxima: a logo no meio não atrapalha a leitura
    q.addData(d.url); q.make();
    const alvo = document.getElementById('qr-imagem');
    if(alvo) alvo.innerHTML = q.createSvgTag({ cellSize:8, margin:2, scalable:true });
  }catch(e){
    const alvo = document.getElementById('qr-imagem');
    if(alvo) alvo.innerHTML = `<p style="color:#333;font-size:13px;padding:40px 10px">${escHTML(e.message)}</p>`;
  }
}

function qrCopiarLink(){
  const d = QR_DESTINOS[_qrModo], b = document.getElementById('qr-copiar');
  const ok = () => { if(b){ b.textContent = 'Copiado ✓'; setTimeout(() => { if(b) b.textContent = 'Copiar link'; }, 1800); } };
  if(navigator.clipboard) navigator.clipboard.writeText(d.url).then(ok).catch(() => {});
}
async function qrCompartilhar(){
  const d = QR_DESTINOS[_qrModo];
  const texto = _qrModo === 'cadastro' ? 'Crie sua conta grátis no FinRossi, o aplicativo para construir sua riqueza:' : 'Conheça o FinRossi, o aplicativo para construir sua riqueza:';
  if(navigator.share){ try{ await navigator.share({ title:'FinRossi', text:texto, url:d.url }); }catch(e){} return; }
  window.open('https://wa.me/?text=' + encodeURIComponent(texto + ' ' + d.url), '_blank', 'noopener');   // sem "compartilhar" no aparelho: WhatsApp
}
