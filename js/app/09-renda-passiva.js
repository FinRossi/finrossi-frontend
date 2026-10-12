// js/app/09-renda-passiva.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── RENDA PASSIVA (dois cenários) ───────────────────────────────────────────
// ─── Funcionalidades do plano Patrimônio (Score, Insights, etc.) ────────────
// Vivem em planos/patrimonio.js, carregado no <head>. Ficam disponíveis aqui
// porque são funções globais, mesmo estando em outro arquivo.

function renderRP(){
  const cdi=(parseFloat(document.getElementById('rp-cdi').value)||0.8)/100;
  const custom=(parseFloat(document.getElementById('rp-custom').value)||1.0)/100;
  const ir=(parseFloat(document.getElementById('rp-ir').value)||15)/100;
  const atual=parseFloat(document.getElementById('rp-atual').value)||0;
  const aporte=parseFloat(document.getElementById('rp-aporte').value)||300;

  document.getElementById('rp-label-cdi').textContent=(cdi*100).toFixed(2).replace('.',',')+"%";
  document.getElementById('rp-label-custom').textContent=(custom*100).toFixed(2).replace('.',',')+"%";

  const rendas=[5000,10000,120000];
  const labels=['R$ 5.000/mês','R$ 10.000/mês','R$ 120.000/mês'];
  const itemClass=['','item-amber','item-purple'];

  function buildScenario(taxa, containerId){
    const taxaLiq=taxa*(1-ir);
    document.getElementById(containerId).innerHTML=rendas.map((renda,i)=>{
      const patrim=renda/taxaLiq, falta=Math.max(0,patrim-atual);
      return`<div class="rp-item ${itemClass[i]}">
        <div class="rp-renda-label">Renda de ${labels[i]}</div>
        <div class="rp-patrimonio">${fmtR0(patrim)}</div>
        <div class="rp-falta">Falta acumular: ${fmtR0(falta)}</div>
      </div>`;
    }).join('');
  }
  buildScenario(cdi,'rp-res-cdi');
  buildScenario(custom,'rp-res-custom');

  // Tabela de prazo comparando os dois cenários
  const prazoRows=rendas.map((renda,i)=>{
    const taxaLiqCDI=cdi*(1-ir), taxaLiqCustom=custom*(1-ir);
    const patriCDI=renda/taxaLiqCDI, patriCustom=renda/taxaLiqCustom;

    function calcPrazo(taxa, patri){
      if(atual>=patri)return'✓ Já possível';
      let s=atual,mes=0;while(s<patri&&mes<1200){s=s*(1+taxa)+aporte;mes++}
      if(mes>=1200)return'> 100 anos';
      const a=Math.floor(mes/12),m=mes%12;return a>0?`${a}a ${m}m`:`${mes} meses`;
    }
    const p1=calcPrazo(cdi,patriCDI), p2=calcPrazo(custom,patriCustom);
    const c1=p1.startsWith('✓')?'color:var(--green)':'color:var(--amber)';
    const c2=p2.startsWith('✓')?'color:var(--green)':'color:var(--purple)';
    return`<tr>
      <td style="font-weight:500">${labels[i]}</td>
      <td style="${c1}">${p1}</td>
      <td style="${c2}">${p2}</td>
      <td style="color:var(--muted);font-size:12px">${fmtR0(patriCDI)} / ${fmtR0(patriCustom)}</td>
    </tr>`;
  }).join('');
  document.getElementById('rp-prazo').innerHTML=`
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="border-bottom:1px solid var(--border)">
        <th style="text-align:left;padding:5px 8px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Renda alvo</th>
        <th style="text-align:left;padding:5px 8px;font-size:11px;color:var(--blue);text-transform:uppercase;letter-spacing:.5px">CDI atual</th>
        <th style="text-align:left;padding:5px 8px;font-size:11px;color:var(--purple);text-transform:uppercase;letter-spacing:.5px">Taxa custom</th>
        <th style="text-align:left;padding:5px 8px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Patrimônio necessário</th>
      </tr></thead><tbody>${prazoRows}</tbody>
    </table>`;
}

