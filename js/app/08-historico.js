// js/app/08-historico.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── HISTÓRICO ────────────────────────────────────────────────────────────────
// Mostrado como extrato (identidade "Cédula"): agrupado por mês, com totais do mês,
// dia em destaque e valor no numeral de cédula. Filtros, editar e excluir como antes.

const ICO_EDITAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>';
const METODO_NOME = {pix:'Pix',debito:'débito',credito:'crédito',dinheiro:'dinheiro',boleto:'boleto',transferencia:'transferência',deposito:'depósito',outro:'outro'};
const MESES_CURTOS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

function renderHistorico(){
  const lancs=pd().lancs;
  const filtroMes=document.getElementById('h-mes').value, filtroTipo=document.getElementById('h-tipo').value, filtroCat=document.getElementById('h-cat').value;
  const mesUniq=[...new Set(lancs.map(l=>l.data.slice(0,7)))].sort().reverse();
  const selMes=document.getElementById('h-mes'),cM=selMes.value;
  selMes.innerHTML='<option value="">Todos os meses</option>'+mesUniq.map(m=>`<option value="${m}" ${m===cM?'selected':''}>${mesLbl(m+'-01')}</option>`).join('');
  const cats=[...new Set(lancs.map(l=>l.cat))].sort();
  const selCat=document.getElementById('h-cat'),cC=selCat.value;
  selCat.innerHTML='<option value="">Todas as categorias</option>'+cats.map(c=>`<option value="${c}" ${c===cC?'selected':''}>${c}</option>`).join('');
  let lista=[...lancs].sort((a,b)=>b.data.localeCompare(a.data));
  if(filtroMes)lista=lista.filter(l=>l.data.startsWith(filtroMes));
  if(filtroTipo)lista=lista.filter(l=>l.tipo===filtroTipo);
  if(filtroCat)lista=lista.filter(l=>l.cat===filtroCat);

  const cont=document.getElementById('h-extrato');
  if(!lista.length){cont.innerHTML='<p class="empty">Nenhum lançamento encontrado. Ajuste os filtros ou registre um lançamento.</p>';return}

  // Agrupa por mês, mantendo a ordem (mais recente primeiro)
  const grupos=[];
  lista.forEach(l=>{
    const m=l.data.slice(0,7);
    if(!grupos.length||grupos[grupos.length-1].mes!==m) grupos.push({mes:m,itens:[]});
    grupos[grupos.length-1].itens.push(l);
  });

  const valorFmt=v=>fmtR(v).replace(/^R\$\s?/,'');
  cont.innerHTML=grupos.map(g=>{
    const [yr,mo]=g.mes.split('-');
    const ent=g.itens.filter(l=>l.tipo==='receita').reduce((a,b)=>a+b.val,0);
    const sai=g.itens.filter(l=>l.tipo==='despesa').reduce((a,b)=>a+b.val,0);
    const saldo=ent-sai;
    return`<div class="ext-mes">
      <div class="ext-mes-cab">
        <div class="ext-mes-nome">${MONTHS[+mo-1]} de ${yr}</div>
        <div class="ext-mes-tot">
          <span>Entradas <b style="color:var(--green)">${fmtR(ent)}</b></span>
          <span>Saídas <b style="color:var(--text)">${fmtR(sai)}</b></span>
          <span>Saldo <b style="color:${saldo>=0?'var(--green)':'var(--red)'}">${fmtR(saldo)}</b></span>
        </div>
      </div>
      ${g.itens.map(l=>{
        const dia=l.data.slice(8,10);
        const detalhes=[l.cat, l.metodo?(METODO_NOME[l.metodo]||l.metodo):''].filter(Boolean).join(', ');
        const parc=l.parcelado?` <span class="ext-parc">parcela ${l.parcela}/${l.totalParcelas}</span>`:'';
        const obs=l.obs?`<div class="ext-meta">${l.obs}</div>`:'';
        const sinal=l.tipo==='receita'?'+':'−';
        return`<div class="ext-linha">
          <div class="ext-dia"><b>${dia}</b><span>${MESES_CURTOS[+mo-1]}</span></div>
          <div style="min-width:0">
            <div class="ext-tit">${l.desc}</div>
            <div class="ext-meta">${detalhes}${parc}</div>${obs}
          </div>
          <div class="ext-valor ${l.tipo}">${sinal} ${valorFmt(l.val)}</div>
          <div class="ext-acoes">
            ${l.anexo?`<button class="btn xs" onclick="verAnexo('${l.anexo.id}','${l.anexo.criadoEm||''}')" title="Ver anexo" aria-label="Ver anexo">${typeof ICO_ANEXO!=='undefined'?ICO_ANEXO:'Anexo'}</button>`:''}
            <button class="btn xs" onclick="editarLanc('${l.id}')" title="Editar" aria-label="Editar lançamento">${ICO_EDITAR}</button>
            <button class="btn danger xs" onclick="remLanc('${l.id}')" title="Excluir" aria-label="Excluir lançamento">✕</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }).join('');
}
