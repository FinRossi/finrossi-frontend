// acessos/19-preview-planos.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
const NAV_PREVIEW = [
  {id:'dashboard',         icon:'▦', label:'Dashboard'},
  {id:'lancamentos',       icon:'+', label:'Lançamentos'},
  {id:'investimentos',     icon:'⚡',label:'Investimentos'},
  {id:'historico',         icon:'⏱', label:'Histórico'},
  {id:'metas',             icon:'◎', label:'Metas'},
  {id:'objetivos',         icon:'✓', label:'Objetivos'},
  {id:'renda',             icon:'$', label:'Renda Passiva'},
  {id:'score',             icon:'♥', label:'Score de Saúde'},
  {id:'cartoes',           icon:'▭', label:'Cartões'},
  {id:'assinaturas',       icon:'◇', label:'Assinaturas'},
  {id:'recorrentes',       icon:'↻', label:'Recorrentes'},
  {id:'calendario',        icon:'▦', label:'Calendário'},
  {id:'notas',             icon:'▤', label:'Notas'},
  {id:'minha-assinatura',  icon:'💳', label:'Minha Assinatura'},
];

const PERMS_TABLE = [
  {label:'Lançamentos ilimitados',   g:true,   s:true,  e:true,  c:true},
  {label:'Gráficos no Dashboard',    g:'20 lanç',s:true, e:true,  c:true},
  {label:'Investimentos',            g:false,  s:true,  e:true,  c:true},
  {label:'Metas financeiras',        g:false,  s:false, e:true,  c:true},
  {label:'Objetivos',                g:false,  s:false, e:true,  c:true},
  {label:'Renda Passiva',            g:false,  s:false, e:false, c:true},
  {label:'Cartões de crédito',       g:false,  s:false, e:true,  c:true},
  {label:'Assinaturas',              g:false,  s:false, e:true,  c:true},
  {label:'Contas recorrentes',       g:false,  s:false, e:true,  c:true},
  {label:'Calendário financeiro',    g:false,  s:false, e:true,  c:true},
  {label:'Notas',                    g:false,  s:false, e:true,  c:true},
  {label:'Score de saúde financeira',g:false,  s:false, e:false, c:true},
  {label:'Adicionar observação',     g:false,  s:false, e:true,  c:true},
  {label:'Edição pelo consultor',    g:false,  s:false, e:false, c:true},
  {label:'Reunião mensal',           g:false,  s:false, e:false, c:true},
  {label:'Relatório mensal',         g:false,  s:false, e:false, c:true},
  {label:'WhatsApp direto',          g:false,  s:false, e:false, c:true},
  {label:'Acesso a "Minha Assinatura"', g:true,  s:true,  e:true,  c:true},
  {label:'Período gratuito (dias)',  g:'30d',  s:false, e:false, c:false},
];

let _previewPlano = 'patrimonio';

function setPreviewPlano(plano){
  _previewPlano = plano;
  renderPreview();
  // Atualiza botões
  ['gratuito','essencial','evolucao','patrimonio'].forEach(p=>{
    const btn = document.getElementById('prev-btn-'+p);
    if(btn) btn.className = 'btn' + (p===plano?' primary':'');
  });
}

function renderPreview(){
  const plano = _previewPlano;
  const cfg = PLANOS_CONFIG[plano];
  if(!cfg) return;

  // Badge
  const badge = document.getElementById('preview-plano-badge');
  if(badge){ badge.textContent=cfg.label+' — '+cfg.preco; badge.style.color=cfg.cor; badge.style.background=cfg.cor+'18'; badge.style.borderColor=cfg.cor+'44'; }

  // Descrição
  const desc = document.getElementById('preview-plano-desc');
  if(desc) desc.innerHTML=`<div class="card" style="border-left:3px solid ${cfg.cor};padding:14px 18px;display:flex;align-items:center;gap:12px">
    <div style="font-size:24px">${plano==='gratuito'?'🆓':plano==='essencial'?'⚡':plano==='evolucao'?'✨':'👑'}</div>
    <div><div style="font-size:14px;font-weight:500;color:${cfg.cor};margin-bottom:3px">Plano ${cfg.label} — ${cfg.preco}</div>
    <div style="font-size:13px;color:var(--muted)">${cfg.desc}</div>
    ${cfg.dias?`<div style="font-size:12px;margin-top:4px;color:var(--amber)">⏱ Expira em ${cfg.dias} dias após o cadastro</div>`:''}</div>
  </div>`;

  // Sidebar simulada
  const sb = document.getElementById('preview-sidebar');
  if(sb){
    sb.innerHTML = NAV_PREVIEW.map(item=>{
      const visivel = cfg.limites[item.id] !== false;
      return`<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;margin-bottom:2px;opacity:${visivel?1:.3};${visivel?'':'text-decoration:line-through'}">
        <span style="font-size:12px;width:16px;text-align:center;color:var(--muted)">${item.icon}</span>
        <span style="font-size:13px;color:${visivel?'var(--text)':'var(--muted2)'}">${item.label}</span>
        ${!visivel?`<span style="margin-left:auto;font-size:9px;background:var(--red-s);color:var(--red);padding:1px 5px;border-radius:10px">bloqueado</span>`:''}
      </div>`;
    }).join('');
  }

  // Permissões
  const perms = document.getElementById('preview-permissions');
  if(perms){
    const edicaoLabel = {nenhuma:'❌ Somente visualização',visualizacao:'👁 Somente visualização',observacao:'📝 Pode adicionar observações',completa:'✏️ Edição completa pelo consultor'};
    const items = [
      {label:'Lançamentos', ok: cfg.limites.lancamentos, detail: cfg.limites.lancamentos===20?'limite de 20':'ilimitados'},
      {label:'Investimentos', ok: cfg.limites.investimentos},
      {label:'Metas e Objetivos', ok: cfg.limites.metas},
      {label:'Cartões de crédito', ok: cfg.limites.cartoes},
      {label:'Assinaturas e Recorrentes', ok: cfg.limites.assinaturas},
      {label:'Calendário e Notas', ok: cfg.limites.calendario},
      {label:'Renda Passiva', ok: cfg.limites.renda},
      {label:'Score de Saúde Financeira', ok: cfg.limites.score},
    ];
    perms.innerHTML = items.map(i=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--surface2);border-radius:6px">
        <span style="font-size:13px">${i.label}${i.detail?` <span style="font-size:11px;color:var(--muted)">(${i.detail})</span>`:''}</span>
        <span style="font-size:13px">${i.ok?'✅':'❌'}</span>
      </div>`).join('')+
      `<div style="margin-top:10px;padding:10px;background:var(--accent-s);border:1px solid var(--accent);border-radius:8px;font-size:12px;color:var(--text)">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Nível de edição</div>
        ${edicaoLabel[cfg.edicao]}
      </div>`;
  }

  // Tabela comparativa
  const tbody = document.getElementById('preview-comparativo');
  if(tbody){
    const cell = (v,active)=>{
      if(v===true) return`<td style="text-align:center;padding:9px;${active?'font-weight:600':''}">✅</td>`;
      if(v===false) return`<td style="text-align:center;padding:9px;color:var(--muted2)">—</td>`;
      return`<td style="text-align:center;padding:9px;font-size:12px;color:var(--amber)">${v}</td>`;
    };
    tbody.innerHTML = PERMS_TABLE.map(row=>`<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:9px 10px;font-size:13px">${row.label}</td>
      ${cell(row.g, plano==='gratuito')}
      ${cell(row.s, plano==='essencial')}
      ${cell(row.e, plano==='evolucao')}
      ${cell(row.c, plano==='patrimonio')}
    </tr>`).join('');
  }
}

function goToPreview(){ goTo('preview'); }

