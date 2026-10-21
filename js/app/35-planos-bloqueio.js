// js/app/35-planos-bloqueio.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── O QUE CADA PLANO LIBERA, NA PRÁTICA ─────────────────────────────────────
// • Telas que o plano não libera aparecem no menu com cadeado (28-nav-personalizacao.js).
//   Tocar nelas abre a janela "disponível no plano X" em vez de abrir a tela.
// • Plano Gratuito: limite de lançamentos (PLANOS_CONFIG.gratuito.limites.lancamentos = 20).
//   Uma compra parcelada conta como um lançamento. Contador "15 de 20" em Lançamentos.
// A equipe (Master/Sócio/Admin/Dev) não tem limite, a não ser simulando um plano em "Ver como".

const PLANOS_ORDEM = ['gratuito','essencial','evolucao','patrimonio'];
const TELA_INFO = {
  investimentos:{ nome:'Investimentos', texto:'Registre aplicações em renda fixa e variável e acompanhe a carteira.' },
  metas:        { nome:'Metas', texto:'Defina quanto quer juntar e acompanhe quanto falta para cada objetivo.' },
  objetivos:    { nome:'Objetivos', texto:'Organize tarefas do dia, da semana e do mês.' },
  renda:        { nome:'Renda Passiva', texto:'Descubra quanto precisa investir para viver de renda e quanto já tem.' },
  score:        { nome:'Saúde do patrimônio', texto:'Score, insights, desafios e projeções sobre a sua vida financeira.' },
  relatorios:   { nome:'Relatórios', texto:'Análise semanal e mensal, pronta para salvar em PDF.' },
  cartoes:      { nome:'Cartões', texto:'Acompanhe fatura, limite e as compras de cada cartão.' },
  assinaturas:  { nome:'Assinaturas', texto:'Veja quanto streaming, música e outros serviços somam por mês.' },
  recorrentes:  { nome:'Contas recorrentes', texto:'Cadastre contas fixas e lance todas no mês com um toque.' },
  calendario:   { nome:'Calendário', texto:'Todos os vencimentos e pagamentos do mês num só lugar.' },
  notas:        { nome:'Notas', texto:'Guarde ideias, combinados e lembretes.' },
};

function _planoEmUso(){
  if(typeof _verComoPlano !== 'undefined' && _verComoPlano) return _verComoPlano;
  if(typeof isEquipe === 'function' && isEquipe()) return null;          // equipe: sem limites
  return (typeof _userPlano !== 'undefined' && _userPlano) || 'gratuito';
}
// Plano mais barato que libera a tela
function planoQueLibera(tela){
  const chave = (typeof NAV_TO_LIMITE !== 'undefined' && NAV_TO_LIMITE[tela]) || tela;
  return PLANOS_ORDEM.find(p => PLANOS_CONFIG[p] && PLANOS_CONFIG[p].limites && PLANOS_CONFIG[p].limites[chave]) || 'patrimonio';
}
function telaBloqueada(tela){
  return !!(TELA_INFO[tela] && typeof verComoPlanoPermite === 'function' && !verComoPlanoPermite(tela));
}

// ── Janela "disponível no plano X" ───────────────────────────────────────────
function _janelaPlano(titulo, texto, plano){
  let m = document.getElementById('modal-plano');
  if(!m){
    m = document.createElement('div');
    m.className = 'modal-overlay'; m.id = 'modal-plano';
    m.addEventListener('click', e => { if(e.target === m) closeModal('modal-plano'); });
    document.body.appendChild(m);
  }
  const cfg = PLANOS_CONFIG[plano] || {};
  m.innerHTML = `<div class="modal plano-modal" role="dialog" aria-modal="true" aria-labelledby="plano-modal-tit">
    <div class="plano-cadeado" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg></div>
    <h3 id="plano-modal-tit">${titulo}</h3>
    <p class="plano-texto">${texto}</p>
    <div class="plano-oferta"><span>Disponível a partir do plano</span><b>${cfg.label || plano}</b>${cfg.preco ? `<em>${cfg.preco}</em>` : ''}</div>
    <div class="btn-row">
      <button class="btn primary" type="button" onclick="closeModal('modal-plano');abrirEscolhaPlano('${escHTML(plano)}')">Assinar o ${escHTML(cfg.label || plano)}</button>
      <button class="btn" type="button" onclick="closeModal('modal-plano')">Agora não</button>
    </div>
  </div>`;
  m.classList.add('open');
}
function mostrarPlanoNecessario(tela){
  const info = TELA_INFO[tela] || { nome: tela, texto: '' };
  _janelaPlano(info.nome, info.texto, planoQueLibera(tela));
}

// Menu: tela bloqueada abre a janela em vez da tela; abrir Lançamentos atualiza o contador
// do Gratuito (um gancho só no goTo)
(function(){
  const _goToAntes = window.goTo;
  window.goTo = function(nome){
    if(telaBloqueada(nome)){ mostrarPlanoNecessario(nome); return; }
    const r = _goToAntes.apply(this, arguments);
    if(nome === 'lancamentos') atualizarContadorLimite();
    return r;
  };
})();

// Aba "Investimento" em Lançamentos segue a regra de Investimentos
(function(){
  if(typeof switchTab !== 'function') return;
  const _orig = switchTab;
  window.switchTab = switchTab = function(t){
    if(t === 'investimento' && telaBloqueada('investimentos')){ mostrarPlanoNecessario('investimentos'); return; }
    return _orig.apply(this, arguments);
  };
  if(typeof addInv === 'function'){
    const _addInv = addInv;
    window.addInv = addInv = function(){
      if(telaBloqueada('investimentos')){ mostrarPlanoNecessario('investimentos'); return; }
      return _addInv.apply(this, arguments);
    };
  }
})();

// ── Limite de lançamentos (Gratuito) ─────────────────────────────────────────
function limiteLancamentos(){
  const plano = _planoEmUso();
  if(!plano) return null;
  const lim = PLANOS_CONFIG[plano] && PLANOS_CONFIG[plano].limites && PLANOS_CONFIG[plano].limites.lancamentos;
  return typeof lim === 'number' ? lim : null;
}
// Parcelas de uma mesma compra contam como um lançamento
function lancamentosUsados(){
  const grupos = new Set(); let soltos = 0;
  (pd().lancs || []).forEach(l => { if(l.groupId) grupos.add(l.groupId); else soltos++; });
  return soltos + grupos.size;
}
function atualizarContadorLimite(){
  const abaInv = document.querySelector('.tab-btn[onclick*="investimento"]');
  if(abaInv) abaInv.classList.toggle('nav-bloqueado', telaBloqueada('investimentos'));
  const sec = document.getElementById('sec-lancamentos');
  if(!sec) return;
  let el = document.getElementById('limite-lanc');
  const lim = limiteLancamentos();
  if(lim === null){ if(el) el.remove(); return; }
  if(!el){
    el = document.createElement('div'); el.id = 'limite-lanc'; el.className = 'limite-lanc';
    const ref = sec.querySelector('.tabs') || sec.querySelector('.page-header');
    ref.parentNode.insertBefore(el, ref);
  }
  const usados = Math.min(lancamentosUsados(), lim), resta = lim - usados, pct = usados / lim;
  el.classList.toggle('alerta', resta <= Math.ceil(lim * 0.2));
  el.innerHTML = `
    <div class="limite-topo"><span>Plano Gratuito</span><b>${usados} de ${lim} lançamentos</b></div>
    <div class="prog-track"><div class="prog-fill" style="width:${(pct*100).toFixed(1)}%"></div></div>
    <div class="limite-pe">${resta > 0 ? `${resta === 1 ? 'Resta 1 lançamento' : `Restam ${resta} lançamentos`} no período de teste.` : 'Você usou todos os lançamentos do período de teste.'}
      <a href="#" onclick="event.preventDefault();abrirEscolhaPlano('essencial')">Ver planos</a></div>`;
}
(function(){
  if(typeof addLanc !== 'function') return;
  const _orig = addLanc;
  window.addLanc = addLanc = function(tipo){
    const lim = limiteLancamentos();
    if(lim !== null && lancamentosUsados() >= lim){
      const cfg = PLANOS_CONFIG[_planoEmUso()] || {};
      _janelaPlano('Limite de lançamentos atingido', `O ${cfg.label || 'plano atual'} permite até ${lim} lançamentos. Seus dados continuam salvos: escolha um plano para seguir lançando sem limite.`, 'essencial');
      return;
    }
    const r = _orig.apply(this, arguments);
    atualizarContadorLimite();
    return r;
  };
})();
// Ao abrir Lançamentos, ao trocar de plano ou de perfil
(function(){
  if(typeof aplicarNavConfig === 'function'){
    const _anc = aplicarNavConfig;
    window.aplicarNavConfig = aplicarNavConfig = function(){ const r = _anc.apply(this, arguments); atualizarContadorLimite(); return r; };
  }
})();
