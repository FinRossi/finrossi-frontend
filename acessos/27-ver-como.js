// acessos/27-ver-como.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── VER COMO (sócio simula outro plano na própria tela) ─────────────────────
let _verComoPlano = null;

const NAV_TO_LIMITE = {
  investimentos:'investimentos', metas:'metas', objetivos:'metas',
  renda:'renda', cartoes:'cartoes', assinaturas:'assinaturas',
  recorrentes:'assinaturas', calendario:'calendario',   // Notas: liberadas em todos os planos (21/10/2026)
  score:'score', relatorios:'relatorios'
};

function verComoPlanoPermite(name){
  // Telas sem regra (Dashboard, Lançamentos, Histórico...) sempre abrem; as outras seguem o plano
  const key = NAV_TO_LIMITE[name];
  return !key || planoLibera(key);
}

// ativarVerComo / sairVerComo (o "Ver como" da equipe) chegam no pacote da equipe (interno/equipe no servidor)

// Minimizar o menu lateral (computador): o menu some e aparece o dock de vidro com os favoritos
// (js/app/34-barra-atalhos.js → renderDockFavoritos). A escolha fica salva no aparelho.
function _aplicarSidebarMinimizada(min){
  const sb=document.getElementById('sidebar'), btn=document.getElementById('sb-toggle');
  if(sb) sb.classList.toggle('collapsed', min);
  document.body.classList.toggle('sb-minimizado', min);
  if(btn){ btn.textContent=min?'›':'‹'; btn.title=min?'Mostrar o menu':'Minimizar o menu'; }
  if(typeof renderDockFavoritos==='function') renderDockFavoritos();
}
function toggleSidebar(){
  const min=!document.getElementById('sidebar').classList.contains('collapsed');
  _aplicarSidebarMinimizada(min);
  try{ localStorage.setItem('fin_sb_collapsed',min?'1':'0'); }catch(e){}
}
function initSidebar(){
  // (antes gravava "fin_sb_collapsed" e lia "fin_sidebar_collapsed": o menu sempre voltava aberto)
  let min=false;
  try{ min=localStorage.getItem('fin_sb_collapsed')==='1'; }catch(e){}
  _aplicarSidebarMinimizada(min);
  initNavGroups();
  aplicarNavConfig();
}

