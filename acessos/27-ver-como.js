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

function toggleSidebar(){
  const sb=document.getElementById('sidebar');
  const btn=document.getElementById('sb-toggle');
  const collapsed=sb.classList.toggle('collapsed');
  btn.textContent=collapsed?'›':'‹';
  btn.title=collapsed?'Expandir sidebar':'Minimizar sidebar';
  localStorage.setItem('fin_sb_collapsed',collapsed?'1':'0');
}
function initSidebar(){
  const collapsed=localStorage.getItem('fin_sidebar_collapsed')==='1';
  const sb=document.getElementById('sidebar');
  const btn=document.getElementById('sb-toggle');
  if(collapsed){ sb.classList.add('collapsed'); if(btn)btn.textContent='›'; }
  initNavGroups();
  aplicarNavConfig();
}

