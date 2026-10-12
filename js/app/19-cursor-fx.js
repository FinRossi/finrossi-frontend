// js/app/19-cursor-fx.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── CURSOR FX (neon) ─────────────────────────────────────────────────────
var _cursorFxOn=false, _cursorFxRAF=null;
var _cfxMouseX=0, _cfxMouseY=0, _cfxRingX=0, _cfxRingY=0, _cfxEase=0.15;
var CFX_INTERATIVOS='a,button,.btn,input,select,textarea,[onclick],.nav-item,.profile-btn,.mc,.card';
function _cfxEnsureEls(){
  if(!document.getElementById('cursor-fx-dot')){
    const dot=document.createElement('div'); dot.id='cursor-fx-dot';
    const ring=document.createElement('div'); ring.id='cursor-fx-ring';
    document.body.appendChild(dot); document.body.appendChild(ring);
  }
}
function _cfxMove(e){
  _cfxMouseX=e.clientX; _cfxMouseY=e.clientY;
  const dot=document.getElementById('cursor-fx-dot');
  if(dot){ dot.style.left=_cfxMouseX+'px'; dot.style.top=_cfxMouseY+'px'; dot.classList.add('on'); }
  const ring=document.getElementById('cursor-fx-ring');
  if(ring) ring.classList.add('on');
}
function _cfxLeave(){
  const dot=document.getElementById('cursor-fx-dot'); if(dot) dot.classList.remove('on');
  const ring=document.getElementById('cursor-fx-ring'); if(ring) ring.classList.remove('on');
}
function _cfxOver(e){
  if(!e.target.closest(CFX_INTERATIVOS)) return;
  _cfxEase=0.35;
  const dot=document.getElementById('cursor-fx-dot'); if(dot) dot.classList.add('cfx-hover');
  const ring=document.getElementById('cursor-fx-ring'); if(ring) ring.classList.add('cfx-hover');
}
function _cfxOut(e){
  if(!e.target.closest(CFX_INTERATIVOS)) return;
  _cfxEase=0.15;
  const dot=document.getElementById('cursor-fx-dot'); if(dot) dot.classList.remove('cfx-hover');
  const ring=document.getElementById('cursor-fx-ring'); if(ring) ring.classList.remove('cfx-hover');
}
function _cfxClick(e){
  const r=document.createElement('div');
  r.className='cursor-fx-ripple';
  r.style.left=e.clientX+'px'; r.style.top=e.clientY+'px';
  document.body.appendChild(r);
  setTimeout(()=>r.remove(),500);
}
function _cfxLoop(){
  _cfxRingX+=(_cfxMouseX-_cfxRingX)*_cfxEase;
  _cfxRingY+=(_cfxMouseY-_cfxRingY)*_cfxEase;
  const ring=document.getElementById('cursor-fx-ring');
  if(ring){ ring.style.left=_cfxRingX+'px'; ring.style.top=_cfxRingY+'px'; }
  _cursorFxRAF=requestAnimationFrame(_cfxLoop);
}
function startCursorFx(){
  if(_cursorFxOn) return;
  if(!window.matchMedia('(pointer:fine)').matches) return;
  _cfxEnsureEls();
  _cursorFxOn=true;
  document.addEventListener('mousemove', _cfxMove);
  document.addEventListener('mouseleave', _cfxLeave);
  document.addEventListener('mouseover', _cfxOver);
  document.addEventListener('mouseout', _cfxOut);
  document.addEventListener('click', _cfxClick);
  _cfxLoop();
}
function stopCursorFx(){
  _cursorFxOn=false;
  document.removeEventListener('mousemove', _cfxMove);
  document.removeEventListener('mouseleave', _cfxLeave);
  document.removeEventListener('mouseover', _cfxOver);
  document.removeEventListener('mouseout', _cfxOut);
  document.removeEventListener('click', _cfxClick);
  if(_cursorFxRAF) cancelAnimationFrame(_cursorFxRAF);
  const dot=document.getElementById('cursor-fx-dot'); if(dot) dot.remove();
  const ring=document.getElementById('cursor-fx-ring'); if(ring) ring.remove();
}
function toggleCursorFx(){
  const enabled=localStorage.getItem('fin_cursor_fx')==='1';
  localStorage.setItem('fin_cursor_fx', enabled?'0':'1');
  _updateCursorFxToggleUI(!enabled);
  if(enabled) stopCursorFx(); else startCursorFx();
}
function _updateCursorFxToggleUI(on){
  const t=document.getElementById('cursor-fx-toggle');
  if(!t) return;
  t.style.background=on?'var(--accent)':'var(--surface3)';
  t.style.borderColor=on?'var(--accent)':'var(--border2)';
  t.children[0].style.left=on?'17px':'2px';
}
function initCursorFx(){
  const enabled=localStorage.getItem('fin_cursor_fx')==='1';
  _updateCursorFxToggleUI(enabled);
  if(enabled) startCursorFx();
}

function toggleCatSlice(idx){
  const chart=charts['cat'];
  if(!chart) return;
  const meta=chart.getDatasetMeta(0);
  const item=meta.data[idx];
  item.hidden=!item.hidden;
  chart.update();
  const row=document.querySelector(`#cat-legend [data-cat-idx="${idx}"]`);
  if(row) row.style.opacity=item.hidden?'.4':'1';
}

