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

// Favoritos personalizáveis em todos os planos (01/11/2026, como as cores do app); só entram as telas
// que o plano libera (_atalhoPermitido). Antes era só no Patrimônio.
function atalhosTemAcesso(){ return true; }
const ATALHOS_DOCK_QTD = 6;   // computador: os 4 da barra do celular + até 2 que aparecem só no dock
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

// Dock do computador: os 4 da barra do celular + as posições 5 e 6 que a pessoa escolheu
function getAtalhosDock(){
  const lista = getAtalhos();
  (_atalhosSalvos() || []).forEach(id => {
    if(lista.length < ATALHOS_DOCK_QTD && ATALHOS_NOME[id] && !lista.includes(id) && _atalhoPermitido(id)) lista.push(id);
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

  renderDockFavoritos();   // computador com o menu minimizado: os mesmos favoritos no dock

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

// ── Dock de favoritos (computador, menu lateral minimizado) ─────────────────────
// Minimizar o menu (setinha ‹) esconde o menu lateral e mostra este dock flutuante de vidro no rodapé:
// "Menu" (traz o menu lateral de volta) + os favoritos (os mesmos 4 atalhos da barra do celular).
// Visual em css/07-layout-finrossi.css (.dock-favoritos); a lente do ativo vem de 22-mobile-nav.js.
const ICO_MENU_DOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="14" y2="17"/></svg>';
function renderDockFavoritos(){
  let dock = document.getElementById('dock-favoritos');
  const app = document.getElementById('tela-app');
  if(!app) return;
  if(!dock){
    dock = document.createElement('nav');
    dock.id = 'dock-favoritos'; dock.className = 'dock-favoritos'; dock.setAttribute('aria-label', 'Favoritos');
    app.appendChild(dock);
  }
  const aberta = (document.querySelector('section:not(.section-hidden)')?.id || '').replace('sec-', '');
  const itens = getAtalhosDock().map(id => `<button type="button" class="dock-item${id === aberta ? ' active' : ''}" data-ir="${id}" onclick="goTo('${id}')" title="${ATALHOS_NOME_LONGO[id]}">${_icoNav(id)}<span>${ATALHOS_NOME[id]}</span></button>`).join('');
  const html = `<button type="button" class="dock-item dock-menu" onclick="toggleSidebar()" title="Mostrar o menu completo">${ICO_MENU_DOCK}<span>Menu</span></button><i class="dock-sep" aria-hidden="true"></i>${itens}`
    + `<i class="dock-sep" aria-hidden="true"></i><button type="button" class="dock-item dock-editar" onclick="abrirEditorFavoritos()" title="Escolher e organizar os favoritos">${ICO_EDITAR_FAV}<span>Editar</span></button>`;
  if(dock._html !== html){ dock._html = html; dock.querySelectorAll('.dock-item,.dock-sep').forEach(e => e.remove()); dock.insertAdjacentHTML('beforeend', html); }
  if(typeof vigiarLenteNav === 'function') vigiarLenteNav('dock-favoritos', '.dock-item[data-ir]');
}

// ── Celular: o 5º e o 6º favoritos (não cabem na barra) ficam no topo do "Mais" ──
function renderFavoritosMais(){
  const el = document.getElementById('mob-fav-mais'); if(!el) return;
  const extras = getAtalhosDock().slice(ATALHOS_QTD);
  el.innerHTML = `<div class="mob-fav-topo"><h4>Seus favoritos</h4>
      <button type="button" class="mob-fav-editar" onclick="abrirEditorFavoritos()">${ICO_EDITAR_FAV}Editar favoritos</button></div>
    ${extras.length ? `<div class="mob-fav-grade">${extras.map(id => `<button type="button" class="mob-fav-item" onclick="goTo('${id}');closeMobileMoreForce()">${_icoNav(id)}<span>${ATALHOS_NOME_LONGO[id]}</span></button>`).join('')}</div>`
      : `<p class="mob-fav-dica">Escolha até 6 favoritos: os 4 primeiros ficam na barra de baixo e os outros aparecem aqui.</p>`}`;
}

// ── Editor de favoritos (vidro) ──────────────────────────────────────────────
// Abre pelo lápis do dock (computador), segurando o dedo na barra de baixo (celular) ou em Configurações.
// Ordem importa: os 4 primeiros ficam na barra do celular e no dock; o 5º e o 6º só no dock do computador.
const ICO_EDITAR_FAV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';
let _favEdit = null;   // lista em edição
function abrirEditorFavoritos(){
  if(typeof closeMobileMoreForce === 'function') try{ closeMobileMoreForce(); }catch(e){}
  _favEdit = getAtalhosDock();
  let m = document.getElementById('fav-editor');
  if(!m){
    m = document.createElement('div');
    m.id = 'fav-editor'; m.className = 'modal-overlay';
    m.addEventListener('click', e => { if(e.target === m) fecharEditorFavoritos(); });
    document.body.appendChild(m);
  }
  m.innerHTML = `<div class="fav-vidro" role="dialog" aria-modal="true" aria-labelledby="fav-tit">
    <div class="fav-topo"><div><h3 id="fav-tit">Seus favoritos</h3>
      <p>Os 4 primeiros ficam na barra de baixo do celular; o 5º e o 6º, no topo do Mais. No computador, o dock mostra os 6.</p></div>
      <button type="button" class="fav-fechar" onclick="fecharEditorFavoritos()" aria-label="Fechar">✕</button></div>
    <ol class="fav-lista" id="fav-lista"></ol>
    <div class="fav-sub">Adicionar <span id="fav-cont"></span></div>
    <div class="fav-opcoes" id="fav-opcoes"></div>
    <div class="msg" id="msg-fav" style="margin:0;min-height:0"></div>
    <div class="fav-acoes"><button type="button" class="btn sm" onclick="favPadrao()">Voltar ao padrão</button>
      <span style="flex:1"></span><button type="button" class="btn sm" onclick="fecharEditorFavoritos()">Cancelar</button>
      <button type="button" class="btn primary sm" onclick="salvarEditorFavoritos()">Salvar</button></div>
  </div>`;
  _favPintar();
  m.classList.add('open');
}
function _favPintar(){
  const lista = document.getElementById('fav-lista'), opc = document.getElementById('fav-opcoes');
  if(!lista || !opc) return;
  const n = _favEdit.length;
  lista.innerHTML = _favEdit.map((id, i) => `<li class="fav-item" draggable="true" data-i="${i}">
      <span class="fav-pos">${i + 1}</span>${_icoNav(id)}<b>${ATALHOS_NOME_LONGO[id]}</b>
      <small>${i < ATALHOS_QTD ? 'barra do celular' : 'Mais do celular'}</small>
      <span class="fav-btns">
        <button type="button" onclick="favMover(${i},-1)" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
        <button type="button" onclick="favMover(${i},1)" ${i === n - 1 ? 'disabled' : ''} aria-label="Descer">↓</button>
        <button type="button" onclick="favTirar(${i})" aria-label="Tirar dos favoritos">✕</button>
      </span></li>`).join('') || '<li class="fav-vazio">Nenhum favorito. Toque numa tela abaixo para adicionar.</li>';
  const livres = Object.keys(ATALHOS_NOME).filter(id => _atalhoPermitido(id) && !_favEdit.includes(id));
  const cheio = n >= ATALHOS_DOCK_QTD;
  document.getElementById('fav-cont').textContent = cheio ? '(limite de 6 atingido)' : `(${n} de 6)`;
  // Telas que o plano ainda não libera: aparecem com cadeado e levam à escolha de plano
  const presas = Object.keys(ATALHOS_NOME).filter(id => !_atalhoPermitido(id) && !(typeof navOcultoNoPerfil === 'function' && navOcultoNoPerfil(id)));
  const ICO_CADEADO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>';
  opc.innerHTML = (livres.map(id => `<button type="button" class="fav-opcao" onclick="favAdicionar('${id}')" ${cheio ? 'disabled' : ''}>${_icoNav(id)}<span>${ATALHOS_NOME_LONGO[id]}</span></button>`).join('')
    || '<span class="fav-vazio">Todas as telas do seu plano já estão nos favoritos.</span>')
    + presas.map(id => `<button type="button" class="fav-opcao fav-presa" onclick="favPlano('${id}')" title="Disponível em outro plano">${ICO_CADEADO}<span>${ATALHOS_NOME_LONGO[id]}</span></button>`).join('');
  // Arrastar para reordenar (computador)
  lista.querySelectorAll('.fav-item').forEach(li => {
    li.addEventListener('dragstart', e => { li.classList.add('arrastando'); e.dataTransfer.setData('text/plain', li.dataset.i); e.dataTransfer.effectAllowed = 'move'; });
    li.addEventListener('dragend', () => li.classList.remove('arrastando'));
    li.addEventListener('dragover', e => { e.preventDefault(); li.classList.add('alvo'); });
    li.addEventListener('dragleave', () => li.classList.remove('alvo'));
    li.addEventListener('drop', e => {
      e.preventDefault(); li.classList.remove('alvo');
      const de = +e.dataTransfer.getData('text/plain'), para = +li.dataset.i;
      if(isNaN(de) || de === para) return;
      const [x] = _favEdit.splice(de, 1); _favEdit.splice(para, 0, x); _favPintar();
    });
  });
}
function favMover(i, d){ const j = i + d; if(i < 0 || i >= _favEdit.length || j < 0 || j >= _favEdit.length) return; [_favEdit[i], _favEdit[j]] = [_favEdit[j], _favEdit[i]]; _favPintar(); }
function favTirar(i){ _favEdit.splice(i, 1); _favPintar(); }
function favAdicionar(id){ if(_favEdit.length >= ATALHOS_DOCK_QTD || _favEdit.includes(id) || !ATALHOS_NOME[id] || !_atalhoPermitido(id)) return; _favEdit.push(id); _favPintar(); }
// Tela com cadeado: a mesma janela "disponível no plano X" das telas bloqueadas (35-planos-bloqueio.js)
function favPlano(id){
  fecharEditorFavoritos();
  if(typeof mostrarPlanoNecessario === 'function') mostrarPlanoNecessario(id);
}
function favPadrao(){ _favEdit = [...ATALHOS_PADRAO]; _favPintar(); }
function fecharEditorFavoritos(){ _favEdit = null; const m = document.getElementById('fav-editor'); if(m) m.classList.remove('open'); }
function salvarEditorFavoritos(){
  if(!_favEdit || !_favEdit.length){ showMsg('msg-fav', 'Escolha pelo menos um favorito.', 'err'); return; }
  const padrao = _favEdit.length === ATALHOS_PADRAO.length && _favEdit.every((id, i) => id === ATALHOS_PADRAO[i]);
  if(padrao) restaurarAtalhos(); else _gravarAtalhos([..._favEdit]);
  fecharEditorFavoritos();
}

// Celular: segurar o dedo na barra de baixo abre o editor (o toque curto continua abrindo a tela)
(function(){
  const nav = document.getElementById('mobile-nav'); if(!nav) return;
  let t = null, x0 = 0, y0 = 0, abriu = false;
  const cancelar = () => { clearTimeout(t); t = null; };
  nav.addEventListener('pointerdown', e => {
    abriu = false; x0 = e.clientX; y0 = e.clientY; cancelar();
    t = setTimeout(() => { abriu = true; try{ navigator.vibrate && navigator.vibrate(12); }catch(er){} abrirEditorFavoritos(); }, 550);
  });
  nav.addEventListener('pointermove', e => { if(Math.abs(e.clientX - x0) > 10 || Math.abs(e.clientY - y0) > 10) cancelar(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => nav.addEventListener(ev, cancelar));
  nav.addEventListener('click', e => { if(abriu){ e.stopPropagation(); e.preventDefault(); abriu = false; } }, true);   // não abre a tela depois de segurar
  nav.addEventListener('contextmenu', e => e.preventDefault());
})();

// ── Configurações → Itens do menu ────────────────────────────────────────────
function renderAtalhosConfig(){
  const el = document.getElementById('cfg-atalhos');
  if(!el) return;
  const secao = document.getElementById('cfg-atalhos-secao');
  if(secao) secao.style.display = '';
  const atual = getAtalhosDock();
  el.innerHTML = `
    <div class="fav-resumo">${atual.map((id, i) => `<span class="fav-chip${i >= ATALHOS_QTD ? ' so-pc' : ''}">${_icoNav(id)}${ATALHOS_NOME[id]}</span>`).join('')}</div>
    <div class="atalhos-acoes">
      <button class="btn primary sm" type="button" onclick="abrirEditorFavoritos()">Editar favoritos</button>
      <button class="btn sm" type="button" onclick="restaurarAtalhos()">Voltar ao padrão</button>
    </div>
    <div class="msg" id="msg-atalhos"></div>`;
}
function restaurarAtalhos(){
  try{ localStorage.removeItem(_atalhosChave()); }catch(e){}
  _atalhosNuvem = null;
  _gravarNuvem(null);
  aplicarAtalhos(); renderAtalhosConfig();
  if(document.getElementById('msg-atalhos')) showMsg('msg-atalhos', 'Favoritos voltaram ao padrão', 'ok');
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
  const interno = typeof _navegadorInterno === 'function' && _navegadorInterno();
  const iOS = typeof _ehIOS === 'function' ? _ehIOS() : /iphone|ipad|ipod/i.test(navigator.userAgent);
  if(iOS && !interno){ document.getElementById('ios-banner').style.display = 'block'; atualizarInstalarCelular(); return; }
  mostrarAjudaInstalar();
}
function mostrarAjudaInstalar(){
  const j = document.getElementById('pwa-ajuda'); if(!j) return;
  // Dentro do Instagram/WhatsApp: em vez dos passos do menu, explica como abrir no navegador
  const interno = typeof _navegadorInterno === 'function' && _navegadorInterno();
  const passos = document.getElementById('pwa-ajuda-passos');
  const avisoInterno = document.getElementById('pwa-ajuda-inapp');
  if(passos) passos.hidden = interno;
  if(avisoInterno) avisoInterno.hidden = !interno;
  const aviso = document.getElementById('pwa-ajuda-seguro');
  if(aviso) aviso.hidden = interno || window.isSecureContext !== false;
  j.style.display = 'block';
  atualizarInstalarCelular();
}
function fecharAjudaInstalar(){
  const j = document.getElementById('pwa-ajuda'); if(j) j.style.display = 'none';
  // Mesma regra dos outros avisos: só volta a aparecer sozinho daqui a 3 h
  localStorage.setItem('fin_pwa_ultimo_aviso', String(Date.now()));
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
