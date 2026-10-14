// js/app/23-tema.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── TEMA ─────────────────────────────────────────────────────────────────────
// Só aplica o tema na tela (sem os ganchos de "o cliente escolheu um tema")
function aplicarTemaSalvo(tema){
  document.documentElement.setAttribute('data-theme', tema === 'escuro' ? '' : tema);
  ['escuro','claro','azul'].forEach(t=>{
    const btn=document.getElementById('tema-'+t);
    if(btn) btn.style.borderColor = t===tema ? 'var(--accent)' : 'transparent';
  });
}
// O cliente escolheu um tema (outros arquivos ligam ganchos aqui: tirar a cor
// personalizada, salvar na nuvem)
function setTema(tema){
  aplicarTemaSalvo(tema);
  localStorage.setItem('finrossi_tema', tema);
}

function initTema(){
  // Abertura: reaplica o tema salvo sem passar pelos ganchos (não pode apagar a cor
  // personalizada nem regravar na nuvem a cada abertura)
  const tema = localStorage.getItem('finrossi_tema') || 'escuro';
  aplicarTemaSalvo(tema);
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

