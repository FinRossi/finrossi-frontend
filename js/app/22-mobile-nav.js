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

function updateMobileNav(section){
  // todos os 6 itens são diretos agora
  document.querySelectorAll('.mobile-nav-item').forEach(b => {
    b.classList.toggle('active', b.id === 'mnav-'+section);
  });
  // Atualiza topbars
  document.querySelectorAll('.mobile-topbar').forEach(el => el.classList.remove('visible'));
  if(isMobile()){
    const top = document.getElementById('mob-top-'+section);
    if(top) top.classList.add('visible');
  }
  // Atualiza sync badge mobile
  const sb = document.getElementById('sync-badge');
  const msb = document.getElementById('mob-sync-badge');
  const mtxt = document.getElementById('mob-sync-txt');
  if(sb && msb){
    msb.className = sb.className;
    if(mtxt) mtxt.textContent = sb.classList.contains('ok') ? 'Sync' : 'Local';
  }
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
  if(rOpt) rOpt.style.display = cp==='finrossi' ? 'none' : 'flex';   // some só no FinRossi (clientes e Pessoal continuam vendo)
  // Área da equipe (Clientes, Sócios, Prévia): só no perfil FinRossi — as mesmas regras do menu do computador
  const noFR = cp === 'finrossi' && typeof isEquipe === 'function' && isEquipe();
  const vis = (id, mostrar) => { const el = document.getElementById(id); if(el) el.style.display = mostrar ? '' : 'none'; };
  vis('mob-equipe-section', noFR);
  vis('mnav-item-clientes', noFR);
  vis('mnav-item-socios', noFR && typeof isMaster === 'function' && isMaster());
  vis('mnav-item-preview', noFR && (_userRole === 'socio' || (typeof isMaster === 'function' && isMaster())));
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
    // Empresas no drawer mobile
    const empOpt = document.getElementById('emp-drawer-opt');
    if(empOpt) empOpt.style.display='none';
  }, 100);
};

window.addEventListener('resize', setupMobile);
setupMobile();
updateMobileNav('dashboard');

