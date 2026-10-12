// js/app/30-date-picker.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── DATE PICKER CUSTOMIZADO ─────────────────────────────────────────────────
const DP_STATE = {}; // { id: { year, month, value } }
const DP_MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DP_DIAS  = ['D','S','T','Q','Q','S','S'];

function dpInit(id, value){
  const d = value ? new Date(value+'T12:00:00') : new Date();
  DP_STATE[id] = { year: d.getFullYear(), month: d.getMonth(), value: value||'' };
  dpSetValue(id, value||hoje());
}

function dpSetValue(id, value){
  if(!value) return;
  const [y,m,day] = value.split('-').map(Number);
  DP_STATE[id] = DP_STATE[id] || {};
  DP_STATE[id].value = value;
  DP_STATE[id].year  = y;
  DP_STATE[id].month = m-1;
  const btn = document.getElementById('dp-btn-'+id);
  const inp = document.getElementById(id);
  if(btn) btn.textContent = `${String(day).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
  if(inp) inp.value = value;
}

function dpToggle(id){
  const popup = document.getElementById('dp-popup-'+id);
  const btn   = document.getElementById('dp-btn-'+id);
  if(!popup) return;
  const isOpen = popup.classList.contains('open');
  // Fecha todos os outros
  document.querySelectorAll('.dp-popup.open').forEach(p=>{ p.classList.remove('open'); });
  document.querySelectorAll('.dp-input.open').forEach(b=>{ b.classList.remove('open'); });
  if(!isOpen){
    if(!DP_STATE[id]) dpInit(id, hoje());
    dpRender(id);
    popup.classList.add('open');
    btn.classList.add('open');
  }
}

function dpRender(id){
  const state = DP_STATE[id];
  if(!state) return;
  const popup = document.getElementById('dp-popup-'+id);
  if(!popup) return;
  const { year, month, value } = state;
  const hoje_d = new Date();
  const primeiro = new Date(year, month, 1);
  const ultimo   = new Date(year, month+1, 0);
  const startDow = primeiro.getDay();

  let cells = '';
  // Dias do mês anterior
  for(let i=0; i<startDow; i++){
    const d = new Date(year, month, -startDow+i+1);
    cells += `<button class="dp-day other-month" onclick="dpSelect('${id}','${year}',${month+1},${d.getDate()})">${d.getDate()}</button>`;
  }
  // Dias do mês atual
  for(let d=1; d<=ultimo.getDate(); d++){
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = d===hoje_d.getDate() && month===hoje_d.getMonth() && year===hoje_d.getFullYear();
    const isSel   = dateStr === value;
    cells += `<button class="dp-day${isToday?' today':''}${isSel?' selected':''}" onclick="dpSelect('${id}','${year}',${month+1},${d})">${d}</button>`;
  }
  // Dias do próximo mês
  const remaining = 42 - startDow - ultimo.getDate();
  for(let d=1; d<=remaining; d++){
    cells += `<button class="dp-day other-month" onclick="dpSelect('${id}','${year}',${month+2},${d})">${d}</button>`;
  }

  popup.innerHTML = `
    <div class="dp-header">
      <span class="dp-month-label">${DP_MESES[month]} de ${year}</span>
      <div class="dp-nav">
        <button onclick="dpNav('${id}',-1)">‹</button>
        <button onclick="dpNav('${id}',1)">›</button>
      </div>
    </div>
    <div class="dp-grid">
      ${DP_DIAS.map(d=>`<div class="dp-day-name">${d}</div>`).join('')}
      ${cells}
    </div>
    <div class="dp-footer">
      <button class="dp-clear" onclick="dpClear('${id}')">Limpar</button>
      <button class="dp-today-btn" onclick="dpGoToday('${id}')">Hoje</button>
    </div>`;
}

function dpNav(id, dir){
  const s = DP_STATE[id];
  s.month += dir;
  if(s.month > 11){ s.month=0; s.year++; }
  if(s.month < 0 ){ s.month=11; s.year--; }
  dpRender(id);
}

function dpSelect(id, year, month, day){
  const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  // Se clicar em dia de outro mês, navega para ele
  const s = DP_STATE[id];
  const m = parseInt(month)-1;
  if(m !== s.month){ s.month=m; s.year=parseInt(year); }
  dpSetValue(id, dateStr);
  // Fecha popup
  document.getElementById('dp-popup-'+id)?.classList.remove('open');
  document.getElementById('dp-btn-'+id)?.classList.remove('open');
}

function dpClear(id){
  DP_STATE[id].value = '';
  const btn = document.getElementById('dp-btn-'+id);
  const inp = document.getElementById(id);
  if(btn) btn.textContent = 'Selecionar data';
  if(inp) inp.value = '';
  document.getElementById('dp-popup-'+id)?.classList.remove('open');
  document.getElementById('dp-btn-'+id)?.classList.remove('open');
}

function dpGoToday(id){
  dpSelect(id, new Date().getFullYear(), new Date().getMonth()+1, new Date().getDate());
}

// Fecha ao clicar fora
document.addEventListener('click', e=>{
  if(!e.target.closest('.dp-wrap')){
    document.querySelectorAll('.dp-popup.open').forEach(p=>p.classList.remove('open'));
    document.querySelectorAll('.dp-input.open').forEach(b=>b.classList.remove('open'));
  }
});

// Init dos pickers na inicialização
function initDatePickers(){
  ['r-data','d-data','i-data','obj-data'].forEach(id=>{
    dpInit(id, hoje());
  });
}

