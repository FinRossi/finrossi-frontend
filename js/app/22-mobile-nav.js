// js/app/22-mobile-nav.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
function isMobile(){ return window.innerWidth <= 767; }

function setupMobile(){
  const mob = isMobile();
  const nav = document.getElementById('mobile-nav');
  if(nav) nav.style.display = mob ? 'flex' : 'none';
  // Topbars: só mostra no mobile
  document.querySelectorAll('.mobile-topbar').forEach(el => el.classList.remove('visible'));
  if(mob){
    const cur = document.querySelector('section:not(.section-hidden)');
    const sid = cur ? cur.id.replace('sec-','') : 'dashboard';
    const top = document.getElementById('mob-top-'+sid);
    if(top) top.classList.add('visible');
  }
}

// Lente de vidro da barra de baixo (css/07-layout-finrossi.css → .mnav-lente): segue o item ativo.
// Observa a barra em vez de ser chamada: o ativo muda aqui (updateMobileNav) e na barra de atalhos
// (34-barra-atalhos.js, que também recria os botões).
// Também serve ao dock de favoritos do computador (id 'dock-favoritos', itens .dock-item).
function posicionarLenteNav(navId = 'mobile-nav', itemSel = '.mobile-nav-item'){
  const nav = document.getElementById(navId); if(!nav) return;
  let lente = nav.querySelector('.mnav-lente');
  if(!lente){ lente = document.createElement('span'); lente.className = 'mnav-lente'; lente.setAttribute('aria-hidden', 'true'); nav.prepend(lente); }
  const ativo = nav.querySelector(itemSel + '.active');
  // (só mexe no que mudou: mudar a classe da própria lente dispararia o observador de novo)
  if(!ativo || !ativo.offsetWidth){ if(lente.classList.contains('on')) lente.classList.remove('on'); return; }
  const folga = 4, w = (ativo.offsetWidth - folga * 2) + 'px', x = `translateX(${ativo.offsetLeft + folga}px)`;
  if(lente.style.width !== w) lente.style.width = w;
  if(lente.style.transform !== x) lente.style.transform = x;
  if(!lente.classList.contains('on')) lente.classList.add('on');
}
function vigiarLenteNav(navId, itemSel){
  const nav = document.getElementById(navId); if(!nav || nav._lenteVigiada) return;
  nav._lenteVigiada = true;
  let pendente = false;
  const agendar = () => { if(pendente) return; pendente = true; requestAnimationFrame(() => { pendente = false; posicionarLenteNav(navId, itemSel); }); };
  new MutationObserver(agendar).observe(nav, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', agendar);
  agendar();
}
vigiarLenteNav('mobile-nav', '.mobile-nav-item');

// Selo "Sync / Local" do topo no celular: cópia do selo do menu lateral (#sync-badge).
// Acompanha na hora qualquer mudança dele (antes só copiava ao trocar de tela, e o celular mostrava
// "Local" depois de entrar mesmo com tudo sincronizado, até a primeira troca de tela).
function sincronizarSeloCelular(){
  const sb = document.getElementById('sync-badge');
  const msb = document.getElementById('mob-sync-badge');
  const mtxt = document.getElementById('mob-sync-txt');
  if(!sb || !msb) return;
  if(msb.className !== sb.className) msb.className = sb.className;
  const txt = sb.classList.contains('ok') ? 'Sync' : 'Local';
  if(mtxt && mtxt.textContent !== txt) mtxt.textContent = txt;
}
(function(){
  const sb = document.getElementById('sync-badge'); if(!sb) return;
  new MutationObserver(sincronizarSeloCelular).observe(sb, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
  sincronizarSeloCelular();
})();

function updateMobileNav(section){
  // todos os 6 itens são diretos agora
  document.querySelectorAll('.mobile-nav-item').forEach(b => {
    b.classList.toggle('active', b.id === 'mnav-'+section);
  });
  // Dock de favoritos (computador, menu minimizado): marca a tela que de fato abriu
  const aberta = (document.querySelector('section:not(.section-hidden)')?.id || '').replace('sec-', '');
  document.querySelectorAll('.dock-item[data-ir]').forEach(b => b.classList.toggle('active', b.dataset.ir === aberta));
  // Atualiza topbars
  document.querySelectorAll('.mobile-topbar').forEach(el => el.classList.remove('visible'));
  if(isMobile()){
    const top = document.getElementById('mob-top-'+section);
    if(top) top.classList.add('visible');
  }
  sincronizarSeloCelular();
  // Atualiza título mobile
  if(typeof atualizarCabecalhoDash === 'function') atualizarCabecalhoDash();
}

function openMobileMore(){
  const drawer = document.getElementById('mobile-more-drawer');
  drawer.classList.add('open');
  // Atualiza perfil ativo
  ['pessoal','finrossi'].forEach(p=>{
    const el = document.getElementById('mp-'+p);
    if(el) el.classList.toggle('active', p===cp);
  });
  // Mostra/esconde renda passiva (só no pessoal)
  const rOpt = document.getElementById('mnav-item-renda');   // (procurava 'mnav-renda-opt', que não existe)
  if(rOpt) rOpt.style.display = cp==='finrossi' ? 'none' : '';   // some só no FinRossi; fora dele vale a regra do plano
  // Área da equipe (Clientes, Sócios, Prévia): só no perfil FinRossi — as mesmas regras do menu do computador
  const noFR = cp === 'finrossi' && typeof isEquipe === 'function' && isEquipe();
  const vis = (id, mostrar) => { const el = document.getElementById(id); if(el) el.style.display = mostrar ? '' : 'none'; };
  vis('mob-equipe-section', noFR);
  vis('mnav-item-clientes', noFR);
  vis('mnav-item-negocio', noFR);
  vis('mnav-item-socios', noFR && typeof isMaster === 'function' && isMaster());
  vis('mnav-item-qr', noFR && typeof isMaster === 'function' && isMaster());   // QR Code: só o Master
  vis('mnav-item-preview', noFR && (_userRole === 'socio' || (typeof isMaster === 'function' && isMaster())));
  if(typeof _extrasAtualizarMenu === 'function') _extrasAtualizarMenu();   // ferramentas internas (só o Master)
  if(typeof renderFavoritosMais === 'function') renderFavoritosMais();     // 5º e 6º favoritos no topo do Mais
}
function closeMobileMore(e){
  if(e.target === document.getElementById('mobile-more-drawer')) closeMobileMoreForce();
}
function closeMobileMoreForce(){
  document.getElementById('mobile-more-drawer').classList.remove('open');
}

// Intercepta goTo para atualizar mobile
const _origGoTo = goTo;
window.goTo = function(name){
  _origGoTo(name);
  updateMobileNav(name);
};

// Intercepta setProfile para atualizar mobile
const _origSetProfile = setProfile;
window.setProfile = function(p){
  _origSetProfile(p);
  // Atualiza visual mobile depois (pode ter sido bloqueado pela senha)
  setTimeout(()=>{
    if(typeof atualizarCabecalhoDash === 'function') atualizarCabecalhoDash();
    ['pessoal','finrossi'].forEach(id=>{
      const el = document.getElementById('mp-'+id);
      if(el) el.classList.toggle('active', id===cp);
    });
  }, 100);
};

window.addEventListener('resize', setupMobile);
setupMobile();
updateMobileNav('dashboard');

