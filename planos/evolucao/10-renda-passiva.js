// planos/evolucao/10-renda-passiva.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── RENDA PASSIVA (dois cenários) ───────────────────────────────────────────
// O cliente salva as rendas mensais que quer alcançar (e os parâmetros). Fica em
// DATA[perfil].rendaPassiva: no aparelho (localStorage) e na nuvem (financeiro/<perfil>/rendaPassiva).
// "Total já investido" usa a carteira real, a menos que o cliente digite outro valor.

const RP_PADRAO = { rendas:[5000,10000,20000], cdi:0.8, custom:1.0, ir:15, aporte:300, atualManual:null };
const RP_MAX_RENDAS = 6;
let _rpCarregadoPara = null, _rpTimer = null;

function rpConfig(){
  const p = pd();
  if(!p.rendaPassiva){
    try{ const v = localStorage.getItem(`fin3_${cp}_rendaPassiva`); if(v) p.rendaPassiva = JSON.parse(v); }catch(e){}
  }
  if(!p.rendaPassiva) p.rendaPassiva = JSON.parse(JSON.stringify(RP_PADRAO));
  const c = p.rendaPassiva;
  if(!Array.isArray(c.rendas)) c.rendas = Object.values(c.rendas||{});   // a nuvem pode devolver como objeto
  return c;
}
function rpSalvar(){
  lsSave(cp, 'rendaPassiva');
  fbSave(cp, 'rendaPassiva');
}
function rpTotalCarteira(){ return (pd().invs||[]).reduce((a,b)=>a+(+b.val||0),0); }

// Leva a configuração salva para os campos (uma vez por perfil, ou quando a nuvem atualizar)
function rpPreencherCampos(){
  const c = rpConfig();
  document.getElementById('rp-cdi').value = c.cdi;
  document.getElementById('rp-custom').value = c.custom;
  document.getElementById('rp-ir').value = c.ir;
  document.getElementById('rp-aporte').value = c.aporte;
  _rpCarregadoPara = cp + '|' + JSON.stringify(c);
}

function rpCampoMudou(campo){
  const c = rpConfig();
  const num = id => parseFloat(document.getElementById(id).value);
  if(!isNaN(num('rp-cdi'))) c.cdi = num('rp-cdi');
  if(!isNaN(num('rp-custom'))) c.custom = num('rp-custom');
  if(!isNaN(num('rp-ir'))) c.ir = num('rp-ir');
  if(!isNaN(num('rp-aporte'))) c.aporte = num('rp-aporte');
  if(campo === 'atual'){ const v = num('rp-atual'); c.atualManual = isNaN(v) ? null : v; }
  _rpCarregadoPara = cp + '|' + JSON.stringify(c);
  clearTimeout(_rpTimer); _rpTimer = setTimeout(rpSalvar, 600);   // salva quando parar de digitar
  renderRP();
}
function rpUsarCarteira(){
  const c = rpConfig(); c.atualManual = null; rpSalvar(); renderRP();
}

function _rpLerValor(txt){
  // aceita "8.000", "8000", "8.000,50" e "8000.5"
  let s = String(txt||'').replace(/[^\d.,]/g,'');
  if(s.includes(',')) s = s.replace(/\./g,'').replace(',', '.');
  else if(/\.\d{3}(\.|$)/.test(s)) s = s.replace(/\./g,'');
  return parseFloat(s);
}
function addRendaAlvo(){
  const inp = document.getElementById('rp-nova');
  const v = _rpLerValor(inp.value);
  const c = rpConfig();
  if(!v || v <= 0){ showMsg('msg-rp', 'Digite a renda mensal que você quer, por exemplo 8.000', 'err'); return; }
  if(c.rendas.some(r => Math.abs(r - v) < 0.01)){ showMsg('msg-rp', 'Essa renda já está salva', 'err'); return; }
  if(c.rendas.length >= RP_MAX_RENDAS){ showMsg('msg-rp', `Você pode salvar até ${RP_MAX_RENDAS} rendas. Remova uma para incluir outra.`, 'err'); return; }
  c.rendas.push(Math.round(v*100)/100);
  c.rendas.sort((a,b)=>a-b);
  inp.value = '';
  rpSalvar(); renderRP();
  showMsg('msg-rp', 'Renda salva', 'ok');
}
function remRendaAlvo(i){
  const c = rpConfig();
  c.rendas.splice(i, 1);
  rpSalvar(); renderRP();
}

function renderRP(){
  const cfg = rpConfig();
  if(_rpCarregadoPara !== cp + '|' + JSON.stringify(cfg)) rpPreencherCampos();

  // Total já investido: carteira real, ou o valor que o cliente digitou
  const campoAtual = document.getElementById('rp-atual');
  const carteira = rpTotalCarteira();
  if(cfg.atualManual === null || cfg.atualManual === undefined){
    if(document.activeElement !== campoAtual) campoAtual.value = Math.round(carteira*100)/100;
  } else if(document.activeElement !== campoAtual) campoAtual.value = cfg.atualManual;
  const btnCarteira = document.getElementById('rp-usar-carteira');
  if(btnCarteira) btnCarteira.hidden = cfg.atualManual === null || cfg.atualManual === undefined;

  const cdi=(parseFloat(cfg.cdi)||0.8)/100;
  const custom=(parseFloat(cfg.custom)||1.0)/100;
  const ir=(isNaN(parseFloat(cfg.ir))?15:parseFloat(cfg.ir))/100;
  const atual=parseFloat(campoAtual.value)||0;
  const aporte=parseFloat(cfg.aporte)||300;

  document.getElementById('rp-label-cdi').textContent=(cdi*100).toFixed(2).replace('.',',')+"%";
  document.getElementById('rp-label-custom').textContent=(custom*100).toFixed(2).replace('.',',')+"%";

  const rendas=cfg.rendas.slice();
  const labels=rendas.map(r=>`${fmtR0(r)} por mês`);

  // Rendas salvas (com o quanto já tem, no cenário da sua taxa)
  const alvosEl = document.getElementById('rp-alvos');
  if(alvosEl){
    alvosEl.innerHTML = rendas.length ? rendas.map((renda,i)=>{
      const patrim = renda/(custom*(1-ir));
      const pct = patrim>0 ? Math.min(1, atual/patrim) : 0;
      return `<div class="rp-alvo">
        <div class="rp-alvo-top">
          <span class="rp-alvo-valor">${fmtR0(renda)}<small> por mês</small></span>
          <button class="btn xs danger" type="button" onclick="remRendaAlvo(${i})" title="Remover" aria-label="Remover renda de ${fmtR0(renda)}">✕</button>
        </div>
        <div class="prog-track"><div class="prog-fill" style="width:${(pct*100).toFixed(1)}%;background:var(--accent)"></div></div>
        <div class="rp-alvo-sub">${pct>=1?'Você já chegou lá':`Você tem ${_rpPct(pct)} do necessário`}</div>
      </div>`;
    }).join('') : '<p class="empty" style="padding:4px 0;text-align:left">Nenhuma renda salva. Digite abaixo a renda mensal que você quer alcançar.</p>';
  }

  function buildScenario(taxa, containerId){
    const taxaLiq=taxa*(1-ir);
    document.getElementById(containerId).innerHTML=rendas.length?rendas.map((renda,i)=>{
      const patrim=renda/taxaLiq, falta=Math.max(0,patrim-atual), pct=patrim>0?Math.min(1,atual/patrim):0;
      return`<div class="rp-item">
        <div class="rp-renda-label">Renda de ${labels[i]}</div>
        <div class="rp-patrimonio">${fmtR0(patrim)}</div>
        <div class="prog-track" style="margin:6px 0"><div class="prog-fill" style="width:${(pct*100).toFixed(1)}%;background:var(--accent)"></div></div>
        <div class="rp-falta">${falta>0?`Falta acumular ${fmtR0(falta)}, você tem ${_rpPct(pct)}`:'Seu patrimônio já cobre essa renda'}</div>
      </div>`;
    }).join(''):'<p class="empty" style="padding:8px 0;text-align:left">Salve uma renda acima para ver o cálculo.</p>';
  }
  buildScenario(cdi,'rp-res-cdi');
  buildScenario(custom,'rp-res-custom');

  // Tabela de prazo comparando os dois cenários
  const prazoRows=rendas.map((renda,i)=>{
    const taxaLiqCDI=cdi*(1-ir), taxaLiqCustom=custom*(1-ir);
    const patriCDI=renda/taxaLiqCDI, patriCustom=renda/taxaLiqCustom;

    function calcPrazo(taxa, patri){
      if(atual>=patri)return'Já possível';
      let s=atual,mes=0;while(s<patri&&mes<1200){s=s*(1+taxa)+aporte;mes++}
      if(mes>=1200)return'Mais de 100 anos';
      const a=Math.floor(mes/12),m=mes%12;return a>0?`${a}a ${m}m`:`${mes} meses`;
    }
    const p1=calcPrazo(cdi,patriCDI), p2=calcPrazo(custom,patriCustom);
    const cel=p=>`<td style="font-family:var(--ced-serif);font-size:16px;color:${p==='Já possível'?'var(--green)':'var(--accent)'}">${p}</td>`;
    return`<tr>
      <td style="font-weight:500">${labels[i]}</td>
      ${cel(p1)}${cel(p2)}
      <td style="color:var(--muted);font-size:12px">${fmtR0(patriCDI)} / ${fmtR0(patriCustom)}</td>
    </tr>`;
  }).join('');
  document.getElementById('rp-prazo').innerHTML=`
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr>
        <th>Renda desejada</th>
        <th>Cenário 1 (CDI)</th>
        <th>Cenário 2 (sua taxa)</th>
        <th>Patrimônio necessário</th>
      </tr></thead><tbody>${prazoRows||'<tr><td colspan="4" style="color:var(--muted)">Salve uma renda para ver o prazo.</td></tr>'}</tbody>
    </table>`;
}

function _rpPct(v){ const p = v*100; return (p>0 && p<1 ? p.toFixed(1) : Math.floor(p)).toString().replace('.',',')+'%'; }

