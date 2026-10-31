// js/app/40-painel-negocio.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── PAINEL DO NEGÓCIO (perfil FinRossi, só a equipe) ─────────────────────────
// Só VISUALIZA: nada aqui muda planos, preços ou cobrança. Usa a mesma lista da tela Clientes
// (GET /admin/clientes, só equipe) e as receitas de assinatura lançadas no perfil FinRossi.
// Quatro blocos: Resumo do negócio · Receita · Quem precisa de atenção · Funil de clientes.

// Menu do perfil FinRossi em duas áreas: "Gestão" (este painel, Clientes, Sócios, QR, IA, Prévia) e
// "Finanças da empresa" (o menu de sempre). O grupo Gestão segue a visibilidade do item Clientes,
// que o resto do app já liga/desliga certo (perfil FinRossi + equipe, "ver como", troca de perfil).
function atualizarMenuGestao(){
  const cli = document.getElementById('nav-clientes-item');
  const naGestao = !!cli && cli.style.display !== 'none';
  const sec = document.getElementById('sb-nav-gestao');
  if(sec) sec.style.display = naGestao ? '' : 'none';
  const neg = document.getElementById('nav-negocio');
  if(neg) neg.style.display = naGestao ? 'flex' : 'none';
  const rot = document.querySelector('#sb-nav-menu .sb-group-label span');
  if(rot) rot.textContent = naGestao ? 'Finanças da empresa' : 'Menu';
  if(!naGestao && !document.getElementById('sec-negocio')?.classList.contains('section-hidden')) goTo('dashboard');
}
(function(){
  const cli = document.getElementById('nav-clientes-item');
  if(cli) new MutationObserver(atualizarMenuGestao).observe(cli, { attributes: true, attributeFilter: ['style'] });
  atualizarMenuGestao();
})();

const NEG_PRECO = () => (typeof PRECOS_PLANO !== 'undefined' ? PRECOS_PLANO.BRL : { mensal:{ essencial:9.90, evolucao:24.90, patrimonio:49.90 }, anual:{ essencial:95.04, evolucao:239.04, patrimonio:479.04 } });
const NEG_NOME_PLANO = { gratuito:'Gratuito', essencial:'Essencial', evolucao:'Evolução', patrimonio:'Patrimônio' };
const _negDia = s => String(s || '').slice(0, 10);
const _negMes = s => String(s || '').slice(0, 7);
// Receita mensal recorrente de um pagante: mensal = preço do mês; anual = preço do ano ÷ 12
function _negMRRCliente(c){
  const p = NEG_PRECO();
  return c.periodo === 'anual' ? (p.anual[c.plano] || 0) / 12 : (p.mensal[c.plano] || 0);
}

async function renderNegocio(){
  const box = document.getElementById('negocio-conteudo');
  if(!box) return;
  if(typeof getAdminToken === 'function' && !getAdminToken()) return;
  box.innerHTML = '<p class="empty">Carregando o painel…</p>';
  let clientes = [];
  try{
    const res = await fetchBackend(`${BACKEND_URL}/admin/clientes`, { headers: await adminHeaders('login') });
    if(res.status === 401){ goTo('dashboard'); return; }
    clientes = (await res.json()).clientes || [];
    window._clientesCache = clientes;
  }catch(e){
    box.innerHTML = erroServidorHTML(e.message, 'renderNegocio()');
    return;
  }

  const reais = clientes.filter(c => !ROLES_EQUIPE.includes(c.role) && c.origem !== 'teste');
  const hojeS = hoje(), mesAtual = curMes();
  const mesPassado = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
  const pagantes = reais.filter(c => c.origem === 'pagante' && c.status === 'ativo');
  const emTeste  = reais.filter(c => c.origem === 'trial' && c.status !== 'inativo');
  const cancelMes = reais.filter(c => _negMes(c.canceladoEm) === mesAtual);
  const novosMes  = reais.filter(c => _negMes(c.dataCadastro) === mesAtual);
  const novosAnt  = reais.filter(c => _negMes(c.dataCadastro) === mesPassado);
  const mrr = pagantes.reduce((s, c) => s + _negMRRCliente(c), 0);

  // Receita de assinaturas por mês (últimos 6), lançada no perfil FinRossi pelo pagamento confirmado
  const receitas = (pd().lancs || []).filter(l => l.tipo === 'receita' && (l.cat === 'Assinaturas FinRossi' || l.origem === 'asaas-webhook'));
  const meses = [];
  for(let i = 5; i >= 0; i--){ const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); }
  const porMes = meses.map(m => receitas.filter(l => _negMes(l.data) === m).reduce((s, l) => s + (Number(l.val) || 0), 0));
  const recMes = porMes[5], recAnt = porMes[4];
  const variacao = recAnt > 0 ? Math.round((recMes - recAnt) / recAnt * 100) : null;

  // Quem precisa de atenção (mais urgente primeiro)
  const atencao = [];
  reais.forEach(c => {
    if(c.pagamentoAtrasado) atencao.push({ c, peso: 0, tipo: 'Pagamento atrasado', cor: 'red', det: c.pagamentoAtrasado.desde ? 'desde ' + new Date(c.pagamentoAtrasado.desde).toLocaleDateString('pt-BR') : '' });
    else if(c.status === 'pendente') atencao.push({ c, peso: 1, tipo: 'Pagamento pendente', cor: 'amber', det: c.dataCadastro ? 'assinou em ' + new Date(c.dataCadastro).toLocaleDateString('pt-BR') : '' });
    if(c.origem === 'trial' && c.status !== 'inativo' && c.trialFim){
      const dias = Math.ceil((new Date(c.trialFim) - new Date()) / 864e5);
      if(dias <= 5 && dias >= -2) atencao.push({ c, peso: 2, tipo: dias < 0 ? 'Teste grátis acabou' : 'Teste grátis acabando', cor: 'amber', det: dias < 0 ? 'há ' + (-dias) + ' dia(s)' : dias === 0 ? 'termina hoje' : 'faltam ' + dias + ' dia(s)' });
    }
    const whats = Object.entries(c.reguaWhats || {}).filter(([, t]) => t && !t.feito);
    if(whats.length) atencao.push({ c, peso: 3, tipo: 'WhatsApp para hoje', cor: 'green', det: whats.length + ' mensagem(ns)' });
  });
  atencao.sort((a, b) => a.peso - b.peso);

  // Funil: cadastros → teste grátis → pagantes (e quem cancelou)
  const cadastros = reais.length;
  const fizeramTeste = reais.filter(c => c.trialInicio || c.origem === 'trial' || c.trialFim).length;
  const viraramPagantes = reais.filter(c => c.ativadoEm || (c.origem === 'pagante' && c.status === 'ativo')).length;   // pagamento confirmado (pendente não conta)
  const cancelaram = reais.filter(c => c.origem === 'cancelado' || c.canceladoEm).length;
  const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';

  // Pagantes por plano (receita recorrente de cada um)
  const porPlano = ['essencial', 'evolucao', 'patrimonio'].map(p => {
    const lista = pagantes.filter(c => c.plano === p);
    return { p, n: lista.length, mrr: lista.reduce((s, c) => s + _negMRRCliente(c), 0) };
  });

  const card = (rot, val, sub, cls) => `<div class="mc"><div class="mc-label">${rot}</div><div class="mc-val ${cls || ''}">${val}</div>${sub ? `<div class="mc-sub">${sub}</div>` : ''}</div>`;
  const selo = (txt, cor) => `<span class="neg-selo ${cor}">${escHTML(txt)}</span>`;

  box.innerHTML = `
    <div class="neg-bloco">
      <div class="neg-tit"><h3>Resumo do negócio</h3><span>${(t => t.charAt(0).toUpperCase() + t.slice(1))(new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))}</span></div>
      <div class="metrics neg-metrics">
        ${card('Receita recorrente mensal', fmtR(mrr), 'assinaturas ativas (anual ÷ 12)', 'green')}
        ${card('Clientes pagantes', pagantes.length, `${porPlano.map(x => x.n + ' ' + NEG_NOME_PLANO[x.p]).join(' · ')}`)}
        ${card('Em teste grátis', emTeste.length, '30 dias grátis', 'amber')}
        ${card('Novos cadastros', novosMes.length, `mês passado: ${novosAnt.length}`, 'blue')}
        ${card('Cancelamentos', cancelMes.length, 'neste mês', cancelMes.length ? 'red' : '')}
      </div>
    </div>

    <div class="neg-grade">
      <div class="card neg-bloco">
        <div class="neg-tit"><h3>Receita</h3>${variacao == null ? '' : selo((variacao >= 0 ? '↑ ' : '↓ ') + Math.abs(variacao) + '% vs. mês passado', variacao >= 0 ? 'green' : 'red')}</div>
        <div class="neg-receita-topo"><div><span>Este mês</span><b>${fmtR(recMes)}</b></div><div><span>Mês passado</span><b>${fmtR(recAnt)}</b></div><div><span>Últimos 6 meses</span><b>${fmtR(porMes.reduce((a, b) => a + b, 0))}</b></div></div>
        <div class="chart-wrap" style="height:190px"><canvas id="c-negocio-receita"></canvas></div>
        <div class="neg-planos">
          ${porPlano.map(x => `<div class="neg-plano"><span>${NEG_NOME_PLANO[x.p]}</span><b>${fmtR(x.mrr)}<small>/mês</small></b><small>${x.n} pagante(s)</small></div>`).join('')}
        </div>
      </div>

      <div class="card neg-bloco">
        <div class="neg-tit"><h3>Quem precisa de atenção</h3>${selo(String(atencao.length), atencao.length ? 'amber' : 'green')}</div>
        ${atencao.length ? `<div class="neg-lista">${atencao.slice(0, 12).map(a => {
          const w = typeof linkWhats === 'function' ? linkWhats(a.c, 'geral') : '';
          return `<div class="neg-item">
            <div class="neg-item-txt"><b>${escHTML(a.c.nome || a.c.email)}</b><small>${selo(a.tipo, a.cor)} ${escHTML(a.det)} · ${escHTML(NEG_NOME_PLANO[a.c.plano] || a.c.plano || '')}</small></div>
            <div class="neg-item-acoes">${w ? `<a class="btn xs" href="${escHTML(w)}" target="_blank" rel="noopener" style="text-decoration:none;color:#4fbf7f;border-color:#4fbf7f">WhatsApp</a>` : ''}<button class="btn xs" type="button" onclick="editarCliente('${escHTML(a.c.uid)}')">Ver</button></div>
          </div>`; }).join('')}</div>
          ${atencao.length > 12 ? `<p class="neg-mais">+ ${atencao.length - 12} na tela Clientes</p>` : ''}`
        : '<p class="empty" style="padding:30px 0">Ninguém precisa de atenção agora.</p>'}
        <div class="btn-row" style="margin-top:10px"><button class="btn sm" type="button" onclick="goTo('clientes')">Abrir Clientes</button></div>
      </div>
    </div>

    <div class="card neg-bloco">
      <div class="neg-tit"><h3>Funil de clientes</h3><span>desde o início</span></div>
      <div class="neg-funil">
        ${[['Cadastros', cadastros, 'pessoas que criaram conta', ''],
           ['Fizeram o teste grátis', fizeramTeste, pct(fizeramTeste, cadastros) + ' dos cadastros', ''],
           ['Viraram pagantes', viraramPagantes, pct(viraramPagantes, cadastros) + ' dos cadastros', 'ouro'],
           ['Pagantes hoje', pagantes.length, pct(pagantes.length, viraramPagantes) + ' de quem já pagou', 'ouro'],
           ['Cancelaram', cancelaram, pct(cancelaram, viraramPagantes || cadastros) + (viraramPagantes ? ' de quem já pagou' : ' dos cadastros'), 'red']]
          .map(([rot, n, sub, cls], i, arr) => `<div class="neg-etapa ${cls}"><div class="neg-barra" style="width:${Math.max(6, cadastros ? n / cadastros * 100 : 0)}%"></div><div class="neg-etapa-txt"><span>${rot}</span><b>${n}</b><small>${sub}</small></div></div>`).join('')}
      </div>
    </div>`;

  // Gráfico de receita (o tema "cédula" do app se aplica sozinho)
  if(typeof destroyChart === 'function') destroyChart('negocio');
  const ctx = document.getElementById('c-negocio-receita');
  if(ctx && typeof Chart !== 'undefined'){
    charts['negocio'] = new Chart(ctx, {
      type: 'bar',
      data: { labels: meses.map(m => mesLbl(m + '-01')), datasets: [{ label: 'Receita', data: porMes, backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#C8A96E' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + fmtR(c.parsed.y) } } }, scales: { x: { grid: { display: false } }, y: { grid: { display: true } } } },
    });
  }
}
