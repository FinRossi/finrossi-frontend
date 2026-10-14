// js/app/37-primeiros-passos.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── TOPO DO DASHBOARD: PERÍODO DE TESTE E PRIMEIROS PASSOS ──────────────────
// • Gratuito: nos últimos 7 dias do teste, aviso com os dias que faltam; depois do fim,
//   aviso de que terminou e novos lançamentos abrem a janela de planos (dados continuam visíveis).
// • Todos os planos: "Primeiros passos" para quem está começando — 3 passos que se marcam
//   sozinhos; some ao concluir ou ao dispensar (salvo no aparelho e nas preferências da nuvem).

const TESTE_AVISO_DIAS = 7;

// Data de fim do teste: a do cadastro; em "Ver como Gratuito", um exemplo para a equipe ver o aviso
function fimDoTeste(){
  if(typeof _verComoPlano !== 'undefined' && _verComoPlano === 'gratuito') return new Date(Date.now() + 5 * 86400000).toISOString();
  return window._userTrialFim || null;
}
function diasDeTeste(){
  const fim = fimDoTeste(); if(!fim) return null;
  return Math.ceil((new Date(fim) - new Date()) / 86400000);
}
function testeTerminou(){
  const plano = typeof _planoEmUso === 'function' ? _planoEmUso() : null;
  if(plano !== 'gratuito') return false;
  const d = diasDeTeste();
  return d !== null && d <= 0;
}

function _avisoTesteHTML(){
  const plano = typeof _planoEmUso === 'function' ? _planoEmUso() : null;
  if(plano !== 'gratuito') return '';
  const d = diasDeTeste();
  if(d === null || d > TESTE_AVISO_DIAS) return '';
  const link = '<a class="btn primary sm" href="https://finrossi.com.br/landing/#planos" target="_blank" rel="noopener" style="text-decoration:none">Ver planos</a>';
  if(d <= 0) return `<div class="aviso-teste fim"><div><b>Seu período de teste terminou</b><span>Seus lançamentos continuam salvos e visíveis. Escolha um plano para voltar a lançar.</span></div>${link}</div>`;
  return `<div class="aviso-teste"><div><b>${d === 1 ? 'Falta 1 dia' : `Faltam ${d} dias`} do seu período de teste</b><span>Escolha um plano para continuar lançando sem interrupção.</span></div>${link}</div>`;
}

// ── Primeiros passos ─────────────────────────────────────────────────────────
function _passosDispensados(){ try{ return localStorage.getItem('fin_passos_ok_' + cp) === '1'; }catch(e){ return false; } }
function dispensarPrimeirosPassos(){
  try{ localStorage.setItem('fin_passos_ok_' + cp, '1'); }catch(e){}
  if(typeof prefSalvar === 'function') prefSalvar(`perfis/${String(cp).replace(/[.#$\[\]\/]/g, '_')}/passosDispensados`, true);
  renderTopoDashboard();
}
function _passos(){
  const lancs = pd().lancs || [];
  const libera = k => typeof planoLibera === 'function' ? planoLibera(k) : true;
  const terceiro = libera('metas')
    ? { feito: (pd().metas || []).length > 0, titulo: 'Crie uma meta', texto: 'Defina quanto quer juntar, como a reserva de emergência.', ir: "goTo('metas');setTimeout(()=>openModalMeta(),300)" }
    : libera('investimentos')
      ? { feito: (pd().invs || []).length > 0, titulo: 'Registre um investimento', texto: 'Acompanhe quanto já está aplicado.', ir: "goTo('lancamentos');switchTab('investimento')" }
      : { feito: !!localStorage.getItem('fin_passo_historico_' + cp), titulo: 'Veja seu histórico', texto: 'Todos os lançamentos do mês, como um extrato.', ir: "localStorage.setItem('fin_passo_historico_'+cp,'1');goTo('historico')" };
  return [
    { feito: lancs.some(l => l.tipo === 'receita'), titulo: 'Registre sua primeira receita', texto: 'Salário, freela ou qualquer entrada.', ir: "goTo('lancamentos');switchTab('receita')" },
    { feito: lancs.some(l => l.tipo === 'despesa'), titulo: 'Registre sua primeira despesa', texto: 'Mercado, aluguel, transporte…', ir: "goTo('lancamentos');switchTab('despesa')" },
    terceiro,
  ];
}
function _primeirosPassosHTML(){
  if(_passosDispensados()) return '';
  const passos = _passos();
  const feitos = passos.filter(p => p.feito).length;
  if(feitos === passos.length) return '';
  const ICO_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  return `<div class="card passos">
    <div class="passos-topo">
      <div><h3>Primeiros passos</h3><p class="fr-card-sub" style="margin:-8px 0 0">${feitos} de ${passos.length} concluídos</p></div>
      <button class="btn sm" type="button" onclick="dispensarPrimeirosPassos()">Dispensar</button>
    </div>
    <div class="prog-track" style="margin:12px 0 4px"><div class="prog-fill" style="width:${(feitos / passos.length * 100).toFixed(0)}%;background:var(--accent)"></div></div>
    <ol class="passos-lista">
      ${passos.map((p, i) => `<li class="${p.feito ? 'feito' : ''}">
        <span class="passo-num">${p.feito ? ICO_OK : i + 1}</span>
        <div><b>${p.titulo}</b><span>${p.texto}</span></div>
        ${p.feito ? '' : `<button class="btn sm" type="button" onclick="${p.ir}">Fazer agora</button>`}
      </li>`).join('')}
    </ol>
  </div>`;
}

function renderTopoDashboard(){
  const el = document.getElementById('dash-topo-avisos');
  if(!el) return;
  const html = _avisoTesteHTML() + _primeirosPassosHTML();
  if(el.innerHTML !== html) el.innerHTML = html;
}

// Redesenha junto com o dashboard
(function(){
  if(typeof refreshDash !== 'function') return;
  const _orig = refreshDash;
  window.refreshDash = refreshDash = function(){ const r = _orig.apply(this, arguments); try{ renderTopoDashboard(); }catch(e){} return r; };
})();

// Teste encerrado: novos lançamentos abrem a janela de planos (os dados continuam visíveis)
(function(){
  ['addLanc', 'addInv'].forEach(nome => {
    const f = window[nome]; if(typeof f !== 'function') return;
    window[nome] = function(){
      if(testeTerminou() && typeof _janelaPlano === 'function'){
        _janelaPlano('Seu período de teste terminou', 'Seus lançamentos continuam salvos e você pode consultá-los. Para voltar a lançar, escolha um plano.', 'essencial');
        return;
      }
      return f.apply(this, arguments);
    };
  });
})();
