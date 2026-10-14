// js/app/36-preferencias.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── PREFERÊNCIAS NA NUVEM ───────────────────────────────────────────────────
// Tema, All Black, itens do menu, blocos do dashboard e a organização do dashboard ficavam
// só no navegador: limpar o cache ou trocar de aparelho apagava tudo. Agora também ficam em
// usuarios/<uid>/preferencias (só o próprio usuário grava). O aparelho continua sendo usado
// para aplicar na hora; a nuvem é a cópia que acompanha a pessoa.
//   preferencias/tema, preferencias/allBlack
//   preferencias/perfis/<perfil>/menu | blocos | layout   (perfil = pessoal, finrossi ou o uid do cliente)
// Não toca em dados financeiros.

let _prefCarregadasPara = null;
const _prefTimers = {};
const _setTemaBase = typeof setTema === 'function' ? setTema : null;   // original, sem os ganchos

function _prefPerfil(){ return String(cp).replace(/[.#$\[\]\/]/g, '_'); }
function _prefRef(caminho){
  const uid = window._firebaseUser?.uid;
  if(!uid || !window._db || !window._ref) return null;
  return window._ref(window._db, `usuarios/${uid}/preferencias${caminho ? '/' + caminho : ''}`);
}
// Grava na nuvem (espera o usuário parar de mexer, para não mandar a cada clique)
function prefSalvar(caminho, valor){
  clearTimeout(_prefTimers[caminho]);
  _prefTimers[caminho] = setTimeout(() => {
    const r = _prefRef(caminho);
    if(r && window._set) window._set(r, valor === undefined ? null : valor).catch(e => console.warn('[Preferências] não salvou na nuvem:', e && e.message));
  }, 400);
}
function _lerLocal(chave){ try{ return JSON.parse(localStorage.getItem(chave) || 'null'); }catch(e){ return null; } }

// ── Ganchos: toda mudança também vai para a nuvem ───────────────────────────
(function(){
  const envolver = (nome, depois) => {
    const f = window[nome]; if(typeof f !== 'function') return;
    window[nome] = function(){ const r = f.apply(this, arguments); try{ depois.apply(this, arguments); }catch(e){} return r; };
  };
  envolver('setTema', tema => prefSalvar('tema', tema));
  envolver('toggleAllBlack', () => prefSalvar('allBlack', localStorage.getItem('fin_all_black') === '1'));
  envolver('toggleNavItem', () => prefSalvar(`perfis/${_prefPerfil()}/menu`, _lerLocal('fin_nav_cfg_' + cp)));
  envolver('toggleDashCard', () => prefSalvar(`perfis/${_prefPerfil()}/blocos`, _lerLocal('fin_dash_cfg_' + cp)));
})();

// Organização do dashboard (Personalizar dashboard): por perfil
function prefSalvarLayout(config){ prefSalvar(`perfis/${_prefPerfil()}/layout`, config); }

// Primeira vez na nuvem: sobe o que já está no aparelho, para nada se perder
function _prefSubirLocais(){
  const perfis = {};
  ['pessoal', 'finrossi', window._firebaseUser?.uid].filter(Boolean).forEach(p => {
    const k = String(p).replace(/[.#$\[\]\/]/g, '_');
    const menu = _lerLocal('fin_nav_cfg_' + p), blocos = _lerLocal('fin_dash_cfg_' + p);
    const layout = _lerLocal('fin_dash_config_' + p) || (p === cp ? _lerLocal('fin_dash_config') : null);
    if(menu || blocos || layout) perfis[k] = { ...(menu ? { menu } : {}), ...(blocos ? { blocos } : {}), ...(layout ? { layout } : {}) };
  });
  const tudo = {
    tema: localStorage.getItem('finrossi_tema') || 'escuro',
    allBlack: localStorage.getItem('fin_all_black') === '1',
    ...(Object.keys(perfis).length ? { perfis } : {}),
  };
  const r = _prefRef('');
  if(r && window._set) window._set(r, tudo).catch(() => {});
}

// Traz da nuvem e aplica (a nuvem vale: é a última mudança feita em qualquer aparelho)
async function carregarPreferenciasNuvem(){
  const uid = window._firebaseUser?.uid;
  if(!uid || _prefCarregadasPara === uid || !window._onValue) return;
  const r = _prefRef(''); if(!r) return;
  _prefCarregadasPara = uid;
  const v = await new Promise(res => {
    const t = setTimeout(() => res(undefined), 6000);
    try{
      window._onValue(r, s => { clearTimeout(t); res(s.val()); }, () => { clearTimeout(t); res(undefined); }, { onlyOnce: true });
    }catch(e){ clearTimeout(t); res(undefined); }
  });
  if(v === undefined){ _prefCarregadasPara = null; return; }   // banco fora do ar: tenta de novo depois
  if(v === null){ _prefSubirLocais(); return; }

  if(v.tema){ localStorage.setItem('finrossi_tema', v.tema); if(_setTemaBase) _setTemaBase(v.tema); }
  if(typeof v.allBlack === 'boolean'){ localStorage.setItem('fin_all_black', v.allBlack ? '1' : '0'); if(typeof aplicarAllBlack === 'function') aplicarAllBlack(); }
  Object.entries(v.perfis || {}).forEach(([p, cfg]) => {
    if(cfg.menu) localStorage.setItem('fin_nav_cfg_' + p, JSON.stringify(cfg.menu));
    if(cfg.blocos) localStorage.setItem('fin_dash_cfg_' + p, JSON.stringify(cfg.blocos));
    if(cfg.layout) localStorage.setItem('fin_dash_config_' + p, JSON.stringify(cfg.layout));
  });
  if(typeof aplicarNavConfig === 'function') aplicarNavConfig();
  const atual = (v.perfis || {})[_prefPerfil()];
  if(atual && atual.layout && typeof aplicarConfigDashboard === 'function') aplicarConfigDashboard(atual.layout);
  if(typeof refreshDash === 'function') try{ refreshDash(); }catch(e){}
}

// Quando: na abertura (se já estiver logado) e logo depois de entrar
document.addEventListener('fbReady', () => setTimeout(carregarPreferenciasNuvem, 300));
(function(){
  if(typeof setupPerfilUI !== 'function') return;
  const _orig = setupPerfilUI;
  window.setupPerfilUI = setupPerfilUI = function(){ const r = _orig.apply(this, arguments); setTimeout(carregarPreferenciasNuvem, 300); return r; };
})();
