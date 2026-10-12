// js/app/16-tema.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── TEMA ─────────────────────────────────────────────────────────────────────
function setTema(tema){
  document.documentElement.setAttribute('data-theme', tema === 'escuro' ? '' : tema);
  localStorage.setItem('finrossi_tema', tema);
  ['escuro','claro','azul'].forEach(t=>{
    const btn=document.getElementById('tema-'+t);
    if(btn) btn.style.borderColor = t===tema ? 'var(--accent)' : 'transparent';
  });
}

function initTema(){
  const tema = localStorage.getItem('finrossi_tema') || 'escuro';
  setTema(tema);
  aplicarAllBlack();
}

function toggleAllBlack(){
  const on = localStorage.getItem('fin_all_black')==='1';
  localStorage.setItem('fin_all_black', on?'0':'1');
  aplicarAllBlack();
}

function aplicarAllBlack(){
  const on = localStorage.getItem('fin_all_black')==='1';
  document.documentElement.setAttribute('data-allblack', on?'1':'0');
  const t = document.getElementById('allblack-toggle');
  if(t){
    t.style.background = on?'var(--accent)':'var(--surface3)';
    t.style.borderColor = on?'var(--accent)':'var(--border2)';
    t.children[0].style.left = on?'11px':'2px';
  }
}

