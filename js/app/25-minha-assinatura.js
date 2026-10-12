// js/app/25-minha-assinatura.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── MINHA ASSINATURA (cliente) ───────────────────────────────────────────────
async function renderMinhaAssinatura(){
  const el = document.getElementById('assinatura-content');
  if(!el) return;

  el.innerHTML=`<div style="text-align:center;padding:60px 0;color:var(--muted)"><div style="font-size:32px;margin-bottom:12px">⏳</div><div>Carregando...</div></div>`;

  const uid = window._firebaseUser?.uid;
  if(!uid){ el.innerHTML='<p class="empty">Usuário não autenticado.</p>'; return; }

  // Busca dados do usuário no Firebase — com timeout de segurança,
  // pra nunca travar em "Carregando..." caso o Firebase não responda
  let dadosUsuario = null;
  try{
    if(window._db && window._ref && window._onValue){
      dadosUsuario = await new Promise((res,rej)=>{
        const timeoutId = setTimeout(()=>rej(new Error('timeout')), 5000);
        window._onValue(window._ref(window._db,`usuarios/${uid}`), snap=>{
          clearTimeout(timeoutId);
          res(snap.val());
        }, {onlyOnce:true});
      });
    }
  }catch(e){ console.warn('renderMinhaAssinatura:', e); }

  const PLANO_INFO = {
    gratuito:    {label:'Gratuito',    cor:'var(--muted)',   icone:'🆓', preco:'R$ 0,00',    desc:'Acesso por 30 dias, até 20 lançamentos'},
    essencial:     {label:'Essencial',     cor:'var(--blue)',    icone:'⚡', preco:'R$ 9,90/mês',desc:'Lançamentos ilimitados + investimentos'},
    evolucao:   {label:'Evolução',   cor:'var(--green)',   icone:'⭐', preco:'R$ 24,90/mês',desc:'Acesso completo ao app'},
    patrimonio: {label:'Patrimônio', cor:'var(--accent)',  icone:'💎', preco:'R$ 49,90/mês',desc:'Tudo + suporte prioritário'},
  };

  const STATUS_INFO = {
    ativo:   {label:'Ativo',    cor:'var(--green)',  bg:'var(--green-s)',  icone:'✅'},
    trial:   {label:'Trial',   cor:'var(--amber)',  bg:'var(--amber-s)',  icone:'⏱'},
    inativo: {label:'Inativo', cor:'var(--red)',    bg:'var(--red-s)',    icone:'❌'},
  };

  const plano   = dadosUsuario?.plano  || _userPlano || 'gratuito';
  const status  = dadosUsuario?.status || 'trial';
  const origem  = dadosUsuario?.origem || 'trial';
  const dataCad = dadosUsuario?.dataCadastro?.slice(0,10) || '—';
  const trialFim = dadosUsuario?.trialFim?.slice(0,10);

  const pi = PLANO_INFO[plano]  || PLANO_INFO.gratuito;
  const si = STATUS_INFO[status] || STATUS_INFO.inativo;

  // Calcula dias restantes no trial
  let trialInfo = '';
  if(status==='trial' && trialFim){
    const dias = Math.ceil((new Date(trialFim)-new Date()) / 86400000);
    trialInfo = dias > 0
      ? `<div style="margin-top:8px;font-size:13px;color:var(--amber)">⏱ ${dias} dia${dias!==1?'s':''} restante${dias!==1?'s':''} no período gratuito</div>`
      : `<div style="margin-top:8px;font-size:13px;color:var(--red)">⚠ Período gratuito encerrado — escolha um plano abaixo</div>`;
  }

  el.innerHTML = `
    <!-- Card principal do plano -->
    <div class="card card-full" style="margin-bottom:20px;border-color:${pi.cor}44;background:linear-gradient(135deg,${pi.cor}08,transparent)">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div style="display:flex;align-items:center;gap:16px">
          <div style="font-size:40px">${pi.icone}</div>
          <div>
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">Plano atual</div>
            <div style="font-size:22px;font-family:'DM Serif Display',serif;color:${pi.cor}">${pi.label}</div>
            <div style="font-size:13px;color:var(--muted);margin-top:2px">${pi.desc}</div>
            ${trialInfo}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:600;color:${pi.cor}">${pi.preco}</div>
          <div style="margin-top:8px;display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;background:${si.bg};color:${si.cor};font-size:12px;font-weight:500">
            ${si.icone} ${si.label}
          </div>
        </div>
      </div>
    </div>

    <!-- Informações da conta -->
    <div class="grid2" style="margin-bottom:20px">
      <div class="card">
        <h3><span class="dot" style="background:var(--blue)"></span>Informações da conta</h3>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:4px">
          <div style="display:flex;justify-content:space-between;font-size:13px;padding:8px 0;border-bottom:1px solid var(--border)">
            <span style="color:var(--muted)">Nome</span>
            <span>${window._firebaseUser?.displayName || localStorage.getItem('fin_nome_display') || '—'}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;padding:8px 0;border-bottom:1px solid var(--border)">
            <span style="color:var(--muted)">Email</span>
            <span>${window._firebaseUser?.email || '—'}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;padding:8px 0;border-bottom:1px solid var(--border)">
            <span style="color:var(--muted)">Cadastro</span>
            <span>${dataCad}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;padding:8px 0">
            <span style="color:var(--muted)">Origem</span>
            <span>${origem==='pagante'?'💳 Pagante':origem==='trial'?'⏱ Trial':'🎁 Teste gratuito'}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <h3><span class="dot" style="background:var(--green)"></span>O que está incluído</h3>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
          ${[
            ['Lançamentos', plano==='gratuito'?'Até 20':'Ilimitados', true],
            ['Investimentos', plano==='gratuito'?false:true, plano!=='gratuito'],
            ['Metas e Objetivos', ['evolucao','patrimonio'].includes(plano), ['evolucao','patrimonio'].includes(plano)],
            ['Cartões e Assinaturas', ['evolucao','patrimonio'].includes(plano), ['evolucao','patrimonio'].includes(plano)],
            ['Calendário e Notas', ['evolucao','patrimonio'].includes(plano), ['evolucao','patrimonio'].includes(plano)],
            ['Suporte prioritário', plano==='patrimonio', plano==='patrimonio'],
            ['Suporte WhatsApp', plano==='patrimonio', plano==='patrimonio'],
          ].map(([label, detalhe, ok])=>`
            <div style="display:flex;align-items:center;justify-content:space-between;font-size:13px">
              <span style="color:${ok?'var(--text)':'var(--muted2)'}">${label}</span>
              <span>${ok?(typeof detalhe==='string'?`<span style="color:var(--muted);font-size:12px">${detalhe}</span>`:'✅'):'—'}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- Upgrade / Suporte -->
    ${plano!=='patrimonio'?`
    <div class="card card-full" style="margin-bottom:20px;border-color:rgba(200,169,110,0.2);background:rgba(200,169,110,0.04)">
      <h3><span class="dot" style="background:var(--accent)"></span>Quer mais recursos?</h3>
      <p style="font-size:13px;color:var(--muted);margin:8px 0 16px;line-height:1.7">
        Faça upgrade do seu plano para desbloquear metas, cartões, calendário financeiro, 
        suporte prioritário e muito mais.
      </p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${plano==='gratuito'||plano==='essencial'?`<a href="https://finrossi.com.br/landing.html#planos" target="_blank" class="btn primary" style="text-decoration:none">⚡ Ver planos disponíveis</a>`:''}
        <a href="mailto:finrossiapp@gmail.com?subject=Upgrade de plano FinRossi" class="btn" style="text-decoration:none">✉ Falar com suporte</a>
      </div>
    </div>`:''}

    <!-- Suporte -->
    <div class="card card-full">
      <h3><span class="dot" style="background:var(--purple)"></span>Precisa de ajuda?</h3>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">
        <a href="mailto:finrossiapp@gmail.com?subject=Suporte FinRossi" class="btn" style="text-decoration:none;font-size:13px">✉ Enviar e-mail</a>
        <a href="https://finrossi.com.br/legal/termos.html" target="_blank" class="btn" style="text-decoration:none;font-size:13px">📄 Termos de Uso</a>
        <a href="https://finrossi.com.br/legal/privacidade.html" target="_blank" class="btn" style="text-decoration:none;font-size:13px">🔒 Privacidade</a>
        ${plano==='patrimonio'?`<a href="mailto:finrossiapp@gmail.com?subject=Agendamento sessão FinRossi" class="btn primary" style="text-decoration:none;font-size:13px">📅 Agendar sessão</a>`:''}
      </div>
    </div>
  `;
}


function toggleNavGroup(group){
  const items = document.getElementById('sb-group-'+group);
  const arrow = document.getElementById('sb-arrow-'+group);
  if(!items) return;

  const isOpen = items.dataset.open !== 'false';

  if(isOpen){
    // Fechar: fixa a altura atual, depois anima para 0
    items.style.maxHeight = items.scrollHeight+'px';
    items.dataset.open = 'false';
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{ items.style.maxHeight='0px'; });
    });
    if(arrow) arrow.style.transform='rotate(0deg)';
    localStorage.setItem('fin_navgroup_'+group,'0');
  } else {
    // Abrir: anima para a altura real
    items.dataset.open = 'true';
    items.style.maxHeight = items.scrollHeight+'px';
    setTimeout(()=>{ if(items.dataset.open==='true') items.style.maxHeight='none'; }, 260);
    if(arrow) arrow.style.transform='rotate(90deg)';
    localStorage.setItem('fin_navgroup_'+group,'1');
  }
}

function initNavGroups(){
  ['menu','controles'].forEach(group=>{
    const items = document.getElementById('sb-group-'+group);
    const arrow = document.getElementById('sb-arrow-'+group);
    const collapsed = localStorage.getItem('fin_navgroup_'+group) === '0';
    if(items){
      items.dataset.open = collapsed ? 'false' : 'true';
      items.style.maxHeight = collapsed ? '0px' : 'none';
      if(arrow) arrow.style.transform = collapsed ? 'rotate(0deg)' : 'rotate(90deg)';
    }
  });
}


