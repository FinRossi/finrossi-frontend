// js/app/34-barra-atalhos.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── BARRA DE ATALHOS (personalizável no plano Patrimônio) ───────────────────
// • Celular: a barra de baixo tem 4 atalhos + "Mais" (fixo). O cliente Patrimônio escolhe os 4.
// • Computador: se o cliente personalizou, os mesmos atalhos sobem para o topo do menu lateral,
//   na ordem escolhida. Sem personalização, tudo fica como sempre foi.
// • Só entram telas que o plano libera. Salvo no aparelho e, para clientes, na nuvem.
// Também cuida do "Instalar o app" no celular (item no menu Mais + botão flutuante).

const ATALHOS_PADRAO = ['dashboard','lancamentos','historico','metas'];
const ATALHOS_QTD = 4;
const ATALHOS_NOME = {
  dashboard:'Início', lancamentos:'Lançar', historico:'Histórico', investimentos:'Investir', metas:'Metas',
  objetivos:'Objetivos', renda:'Renda', score:'Saúde', relatorios:'Relatórios', cartoes:'Cartões',
  assinaturas:'Assinaturas', recorrentes:'Contas', calendario:'Agenda', notas:'Notas',
};
const ATALHOS_NOME_LONGO = {
  dashboard:'Dashboard', lancamentos:'Lançamentos', historico:'Histórico', investimentos:'Investimentos', metas:'Metas',
  objetivos:'Objetivos', renda:'Renda Passiva', score:'Saúde do patrimônio', relatorios:'Relatórios', cartoes:'Cartões',
  assinaturas:'Assinaturas', recorrentes:'Contas recorrentes', calendario:'Calendário', notas:'Notas',
};
let _atalhosNuvem = null;          // configuração vinda da nuvem (clientes)
let _ordemOriginalMenu = null;     // ordem do menu lateral antes de qualquer mudança

function atalhosTemAcesso(){
  if(typeof patrimonioTemAcesso === 'function') return patrimonioTemAcesso();
  return false;
}
function _atalhoPermitido(id){
  if(id === 'dashboard' || id === 'lancamentos' || id === 'historico') return true;
  if(typeof navOcultoNoPerfil === 'function' && navOcultoNoPerfil(id)) return false;
  return typeof verComoPlanoPermite !== 'function' || verComoPlanoPermite(id);
}
function _atalhosChave(){ return 'fin_atalhos_' + cp; }
function _atalhosSalvos(){
  if(_atalhosNuvem && Array.isArray(_atalhosNuvem)) return _atalhosNuvem;
  try{ const v = JSON.parse(localStorage.getItem(_atalhosChave()) || 'null'); if(Array.isArray(v)) return v; }catch(e){}
  return null;
}
// Lista final de 4 atalhos válidos (completa com os padrões se faltar algum)
function getAtalhos(){
  const salvos = atalhosTemAcesso() ? (_atalhosSalvos() || ATALHOS_PADRAO) : ATALHOS_PADRAO;
  const lista = [];
  [...salvos, ...ATALHOS_PADRAO, ...Object.keys(ATALHOS_NOME)].forEach(id => {
    if(lista.length < ATALHOS_QTD && ATALHOS_NOME[id] && !lista.includes(id) && _atalhoPermitido(id)) lista.push(id);
  });
  return lista;
}

function _icoNav(id){
  const svg = document.querySelector(`#nav-${id} svg`);
  return svg ? svg.outerHTML : '';
}

function aplicarAtalhos(){
  const atalhos = getAtalhos();

  // Celular: reconstrói os 4 botões antes do "Mais"
  const nav = document.getElementById('mobile-nav'), mais = document.getElementById('mnav-mais');
  if(nav && mais){
    nav.querySelectorAll('.mobile-nav-item:not(#mnav-mais)').forEach(b => b.remove());
    atalhos.forEach(id => {
      const b = document.createElement('button');
      b.className = 'mobile-nav-item'; b.id = 'mnav-' + id;
      b.setAttribute('onclick', `goTo('${id}')`);
      b.innerHTML = `${_icoNav(id)}${ATALHOS_NOME[id]}`;
      nav.insertBefore(b, mais);
    });
    const atual = document.querySelector('section:not(.section-hidden)');
    if(atual) nav.querySelectorAll('.mobile-nav-item').forEach(b => b.classList.toggle('active', b.id === 'mnav-' + atual.id.replace('sec-','')));
  }

  // Computador: atalhos no topo do menu lateral só quando o cliente personalizou
  const menu = document.getElementById('sb-group-menu'), ctrl = document.getElementById('sb-group-controles');
  if(!menu || !ctrl) return;
  if(!_ordemOriginalMenu){
    _ordemOriginalMenu = { menu: [...menu.children], controles: [...ctrl.children] };
  }
  const personalizado = atalhosTemAcesso() && !!_atalhosSalvos();
  const topo = personalizado ? atalhos.map(id => document.getElementById('nav-' + id)).filter(Boolean) : [];
  [..._ordemOriginalMenu.menu].forEach(el => { if(!topo.includes(el)) menu.appendChild(el); });
  topo.slice().reverse().forEach(el => menu.insertBefore(el, menu.firstChild));
  _ordemOriginalMenu.controles.forEach(el => { if(!topo.includes(el)) ctrl.appendChild(el); });
}

// ── Configurações → Dashboard ────────────────────────────────────────────────
function renderAtalhosConfig(){
  const el = document.getElementById('cfg-atalhos');
  if(!el) return;
  // Seção inteira só aparece no plano que permite personalizar
  const secao = document.getElementById('cfg-atalhos-secao');
  if(secao) secao.style.display = atalhosTemAcesso() ? '' : 'none';
  if(!atalhosTemAcesso()){ el.innerHTML = ''; return; }
  const atual = getAtalhos();
  const opcoes = Object.keys(ATALHOS_NOME).filter(_atalhoPermitido);
  el.innerHTML = `
    <div class="atalhos-grade">
      ${atual.map((id, i) => `
        <label class="atalhos-pos"><span>Posição ${i+1}</span>
          <select id="atalho-${i}">${opcoes.map(o => `<option value="${o}"${o===id?' selected':''}>${ATALHOS_NOME_LONGO[o]}</option>`).join('')}</select>
        </label>`).join('')}
      <div class="atalhos-pos fixo"><span>Posição 5</span><b>Mais</b></div>
    </div>
    <div class="atalhos-acoes">
      <button class="btn primary sm" type="button" onclick="salvarAtalhos()">Salvar atalhos</button>
      <button class="btn sm" type="button" onclick="restaurarAtalhos()">Voltar ao padrão</button>
    </div>
    <div class="msg" id="msg-atalhos"></div>`;
}

function salvarAtalhos(){
  const escolhidos = [...Array(ATALHOS_QTD)].map((_, i) => document.getElementById('atalho-' + i)?.value).filter(Boolean);
  if(new Set(escolhidos).size !== escolhidos.length){ showMsg('msg-atalhos', 'Cada posição precisa de uma tela diferente', 'err'); return; }
  _gravarAtalhos(escolhidos);
  showMsg('msg-atalhos', 'Atalhos salvos', 'ok');
}
function restaurarAtalhos(){
  try{ localStorage.removeItem(_atalhosChave()); }catch(e){}
  _atalhosNuvem = null;
  _gravarNuvem(null);
  aplicarAtalhos(); renderAtalhosConfig();
  showMsg('msg-atalhos', 'Atalhos voltaram ao padrão', 'ok');
}
function _gravarAtalhos(lista){
  try{ localStorage.setItem(_atalhosChave(), JSON.stringify(lista)); }catch(e){}
  _atalhosNuvem = null;
  _gravarNuvem(lista);
  aplicarAtalhos(); renderAtalhosConfig();
}
function _gravarNuvem(lista){
  const role = window._userRole || (typeof _userRole !== 'undefined' ? _userRole : '');
  const uid = window._firebaseUser?.uid;
  if(role !== 'cliente' || !uid || !window._db || !window._ref || !window._set) return;
  window._set(window._ref(window._db, `usuarios/${uid}/barraAtalhos`), lista).catch(()=>{});
}
// Clientes: traz da nuvem quando o Firebase estiver pronto
document.addEventListener('fbReady', () => {
  const uid = window._firebaseUser?.uid;
  const role = window._userRole || (typeof _userRole !== 'undefined' ? _userRole : '');
  if(role !== 'cliente' || !uid || !window._onValue) return;
  try{
    window._onValue(window._ref(window._db, `usuarios/${uid}/barraAtalhos`), s => {
      const v = s.val(); _atalhosNuvem = Array.isArray(v) ? v : (v ? Object.values(v) : null);
      aplicarAtalhos();
    }, { onlyOnce: true });
  }catch(e){}
});

// Plano, perfil ou "Ver como" mudaram → a barra acompanha
(function(){
  if(typeof aplicarNavConfig !== 'function') return;
  const _orig = aplicarNavConfig;
  window.aplicarNavConfig = aplicarNavConfig = function(){ _orig.apply(this, arguments); aplicarAtalhos(); atualizarInstalarCelular(); };
})();

// ── Instalar o app no celular ────────────────────────────────────────────────
function _appInstalado(){
  return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true || localStorage.getItem('fin_pwa_instalado') === '1';
}
function atualizarInstalarCelular(){
  const opt = document.getElementById('mnav-instalar-opt');
  const instalado = _appInstalado();
  if(opt) opt.style.display = instalado ? 'none' : 'flex';
  const fab = document.getElementById('pwa-fab');
  const celular = typeof isMobile === 'function' ? isMobile() : innerWidth <= 767;
  if(fab && celular){
    const janelaAberta = ['pwa-banner','ios-banner','pwa-ajuda'].some(id => { const e = document.getElementById(id); return e && e.style.display === 'block'; });
    fab.style.display = (!instalado && !janelaAberta) ? 'flex' : 'none';
  }
}
function instalarPeloMenu(){
  if(typeof closeMobileMoreForce === 'function') closeMobileMoreForce();
  if(typeof _pwaPrompt !== 'undefined' && _pwaPrompt){ document.getElementById('pwa-banner').style.display = 'block'; atualizarInstalarCelular(); return; }
  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if(iOS){ document.getElementById('ios-banner').style.display = 'block'; atualizarInstalarCelular(); return; }
  mostrarAjudaInstalar();
}
function mostrarAjudaInstalar(){
  const j = document.getElementById('pwa-ajuda'); if(!j) return;
  const aviso = document.getElementById('pwa-ajuda-seguro');
  if(aviso) aviso.hidden = window.isSecureContext !== false;
  j.style.display = 'block';
  atualizarInstalarCelular();
}
function fecharAjudaInstalar(){
  const j = document.getElementById('pwa-ajuda'); if(j) j.style.display = 'none';
  atualizarInstalarCelular();
}
// O botão flutuante e o "Ver como" usam o mesmo caminho (antes, sem o aviso automático do
// navegador — iPhone e Android sem HTTPS — o botão não fazia nada)
if(typeof abrirPWAManual === 'function'){
  window.abrirPWAManual = abrirPWAManual = async function(){
    if(typeof _pwaJaInstalou === 'function' && await _pwaJaInstalou()) return;
    instalarPeloMenu();
  };
}
['fecharPWABanner','fecharIOSBanner'].forEach(nome => {
  const f = window[nome]; if(typeof f !== 'function') return;
  window[nome] = function(){ const r = f.apply(this, arguments); atualizarInstalarCelular(); return r; };
});
window.addEventListener('resize', atualizarInstalarCelular);
setTimeout(atualizarInstalarCelular, 4500);

aplicarAtalhos();

// No celular, a janela "Instalar o FinRossi" não abre mais sozinha dentro do app: ela ficava
// por cima do botão "Adicionar" de Lançamentos e o toque caía nela (o lançamento não era feito).
// Quem quiser instalar usa o botão flutuante ou "Instalar o app" no menu Mais.
if(typeof mostrarPWABanner === 'function'){
  const _mostrarPWABannerOrig = mostrarPWABanner;
  window.mostrarPWABanner = mostrarPWABanner = async function(){
    const celular = typeof isMobile === 'function' ? isMobile() : innerWidth <= 767;
    // no celular nunca abre sozinha (a tela de login já tem o próprio cartão de instalar)
    if(celular){ atualizarInstalarCelular(); return; }
    return _mostrarPWABannerOrig.apply(this, arguments);
  };
}
