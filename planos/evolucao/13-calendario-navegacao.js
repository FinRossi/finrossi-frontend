// planos/evolucao/13-calendario-navegacao.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── CALENDÁRIO FINANCEIRO ────────────────────────────────────────────────────
let calMesAtual = new Date();

function mudaMes(d){
  calMesAtual = new Date(calMesAtual.getFullYear(), calMesAtual.getMonth()+d, 1);
  renderCalendario();
}

