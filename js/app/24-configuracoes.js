// js/app/24-configuracoes.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── CONFIGURAÇÕES ───────────────────────────────────────────────────────────
function abrirConfiguracoes(){
  try{
    const user = window._firebaseUser;
    const email = user?.email || '';
    const nome = user?.displayName || localStorage.getItem('fin_nome_display') || (user?.email?.split('@')[0]) || 'Usuário';
    const inicial = nome.charAt(0).toUpperCase();

    // Avatar
    const fotoSalva = localStorage.getItem('fin_foto_'+cp);
    const preview = document.getElementById('cfg-foto-preview');
    if(preview){
      if(fotoSalva){
        preview.innerHTML=imgFoto(fotoSalva, false);
        document.getElementById('sb-avatar').innerHTML=imgFoto(fotoSalva, true);
      } else {
        preview.textContent = inicial;
      }
    }

    const el = (id)=>document.getElementById(id);
    if(el('cfg-avatar')) el('cfg-avatar').textContent = inicial;
    if(el('cfg-nome-display')) el('cfg-nome-display').textContent = nome;
    if(el('cfg-nome-display2')) el('cfg-nome-display2').textContent = nome;
    if(el('cfg-email-display')) el('cfg-email-display').textContent = email;
    if(el('cfg-email-display2')) el('cfg-email-display2').textContent = email;
    if(el('cfg-email-readonly')) el('cfg-email-readonly').textContent = email;
    if(el('cfg-input-nome')) el('cfg-input-nome').value = nome;
    if(el('cfg-msg-nome')) el('cfg-msg-nome').textContent = '';

    renderDashConfigCards();
    renderNavConfigCards();
    if(typeof renderAtalhosConfig==='function') renderAtalhosConfig();

    const badge = el('cfg-nav-perfil-badge');
    if(badge) badge.textContent = cp==='finrossi' ? 'FinRossi' : 'Pessoal';

    const dCount = el('cfg-cats-desp-count');
    const rCount = el('cfg-cats-rec-count');
    if(dCount){
      const extras=(pd().categorias?.despesa||[]).length;
      dCount.textContent=`${CATS_DEFAULT.despesa.length} padrão${extras?` + ${extras} suas`:''}`;
    }
    if(rCount){
      const extras=(pd().categorias?.receita||[]).length;
      rCount.textContent=`${CATS_DEFAULT.receita.length} padrão${extras?` + ${extras} suas`:''}`;
    }

    atualizarTemaAtivo();
    cfgTab('conta');
    // Atualiza status das notificações
    const nStatus = document.getElementById('cfg-notif-status');
    const nBtn = document.getElementById('cfg-notif-btn');
    atualizarStatusNotificacoesConfig(nStatus, nBtn);
    // Seletor de cores — exclusivo Patrimônio
    if(typeof initPatrimonioCores==='function') initPatrimonioCores();
    el('modal-config').style.display='flex';
  }catch(err){
    console.error('[Config] Erro:',err);
    const m=document.getElementById('modal-config');
    if(m) m.style.display='flex';
  }
}

function atualizarStatusNotificacoesConfig(nStatus, nBtn){
  nStatus = nStatus || document.getElementById('cfg-notif-status');
  nBtn = nBtn || document.getElementById('cfg-notif-btn');
  if(!nStatus || !nBtn) return;
  if(!('Notification' in window)){
    nStatus.textContent='Não suportado';
    nStatus.style.background='rgba(248,113,113,.1)';
    nStatus.style.color='var(--red)';
    nBtn.style.display='none';
  } else if(Notification.permission==='granted'){
    const ativo = localStorage.getItem('fin_notif_ok') !== '0';
    if(ativo){
      nStatus.textContent='Ativo';
      nStatus.style.background='rgba(74,222,128,.1)';
      nStatus.style.color='var(--green)';
      nBtn.textContent='Desativar notificações';
      nBtn.style.background='var(--surface3)';
      nBtn.style.color='var(--text)';
    } else {
      nStatus.textContent='Desativado';
      nStatus.style.background='var(--surface3)';
      nStatus.style.color='var(--muted)';
      nBtn.textContent='Reativar notificações';
      nBtn.style.background='var(--accent)';
      nBtn.style.color='#0f0f0f';
    }
  } else if(Notification.permission==='denied'){
    nStatus.textContent='Bloqueado';
    nStatus.style.background='rgba(248,113,113,.1)';
    nStatus.style.color='var(--red)';
    nBtn.textContent='Habilitar nas configurações do navegador';
    nBtn.style.background='var(--surface3)';
    nBtn.style.color='var(--muted)';
  } else {
    nStatus.textContent='Desativado';
    nBtn.textContent='Ativar notificações';
    nBtn.style.background='var(--accent)';
    nBtn.style.color='#0f0f0f';
  }
}

function fecharConfiguracoes(){
  document.getElementById('modal-config').style.display = 'none';
}

function cfgTab(tab){
  ['conta','aparencia','config'].forEach(t=>{
    document.getElementById('cfg-pane-'+t).style.display = t===tab ? 'block' : 'none';
    const btn = document.getElementById('cfg-tab-'+t);
    if(btn){
      btn.style.borderBottomColor = t===tab ? 'var(--accent)' : 'transparent';
      btn.style.color = t===tab ? 'var(--accent)' : 'var(--muted)';
    }
  });
  if(tab==='aparencia') atualizarStatusPWAConfig();
}

// ─── Foto de perfil: escolher, ajustar (arrastar + zoom) e salvar ───────────
// Cada perfil tem a sua foto: o cliente na conta dele; o Master uma para o Pessoal e outra para o
// FinRossi (antes as duas dividiam a mesma foto na nuvem e a troca de perfil não trocava a foto).
function caminhoFotoNuvem(perfil){
  const uid = window._firebaseUser?.uid; if(!uid) return null;
  const p = perfil || cp;
  return (p === 'pessoal' || p === 'finrossi') ? `usuarios/${uid}/fotosPerfil/${p}` : `usuarios/${uid}/foto`;
}
function carregarFoto(event){
  const file = event.target.files[0];
  event.target.value = '';                       // permite escolher a mesma foto de novo
  if(!file) return;
  if(!/^image\//.test(file.type)){ alert('Escolha um arquivo de imagem.'); return; }
  const reader = new FileReader();
  reader.onload = e => abrirAjusteFoto(e.target.result);
  reader.readAsDataURL(file);
}

const _ajuste = { img:null, zoom:1, x:0, y:0, arrastando:null };
const AJ_LADO = 260;                             // tamanho da área de ajuste na tela
function abrirAjusteFoto(dataUrl){
  const img = new Image();
  img.onload = () => {
    _ajuste.img = img; _ajuste.zoom = 1; _ajuste.x = 0; _ajuste.y = 0;
    let m = document.getElementById('modal-ajuste-foto');
    if(!m){
      m = document.createElement('div');
      m.className = 'modal-overlay'; m.id = 'modal-ajuste-foto';
      m.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="aj-tit" style="max-width:340px;display:flex;flex-direction:column;align-items:center;gap:14px">
        <h3 id="aj-tit" style="margin:0">Ajustar foto</h3>
        <p style="margin:0;font-size:12.5px;color:var(--muted);text-align:center">Arraste para posicionar e use o zoom. O que está dentro do círculo é o que vai aparecer.</p>
        <canvas id="aj-canvas" width="${AJ_LADO*2}" height="${AJ_LADO*2}" style="width:${AJ_LADO}px;height:${AJ_LADO}px;max-width:100%;border-radius:14px;touch-action:none;cursor:grab;background:#000"></canvas>
        <label style="display:flex;align-items:center;gap:10px;width:100%;font-size:12px;color:var(--muted)">Zoom
          <input id="aj-zoom" type="range" min="1" max="4" step="0.01" value="1" style="flex:1;accent-color:var(--accent)" oninput="_ajuste.zoom=parseFloat(this.value);ajusteLimitar();desenharAjuste()">
        </label>
        <div class="btn-row" style="width:100%"><button class="btn primary" type="button" onclick="salvarAjusteFoto()">Salvar foto</button><button class="btn" type="button" onclick="closeModal('modal-ajuste-foto')">Cancelar</button></div>
      </div>`;
      m.addEventListener('click', e => { if(e.target === m) closeModal('modal-ajuste-foto'); });
      document.body.appendChild(m);
      const cv = m.querySelector('#aj-canvas');
      // Arrastar com o dedo ou o mouse (a distância na tela é convertida para a escala do desenho)
      const fator = () => AJ_LADO / cv.getBoundingClientRect().width;
      cv.addEventListener('pointerdown', e => { _ajuste.arrastando = { px:e.clientX, py:e.clientY, x:_ajuste.x, y:_ajuste.y }; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; });
      cv.addEventListener('pointermove', e => {
        const a = _ajuste.arrastando; if(!a) return;
        _ajuste.x = a.x + (e.clientX - a.px) * fator(); _ajuste.y = a.y + (e.clientY - a.py) * fator();
        ajusteLimitar(); desenharAjuste();
      });
      const soltar = () => { _ajuste.arrastando = null; cv.style.cursor = 'grab'; };
      cv.addEventListener('pointerup', soltar); cv.addEventListener('pointercancel', soltar);
      cv.addEventListener('wheel', e => {
        e.preventDefault();
        _ajuste.zoom = Math.min(4, Math.max(1, _ajuste.zoom - e.deltaY * 0.002));
        document.getElementById('aj-zoom').value = _ajuste.zoom; ajusteLimitar(); desenharAjuste();
      }, { passive:false });
    }
    document.getElementById('aj-zoom').value = 1;
    desenharAjuste();
    m.classList.add('open');
  };
  img.onerror = () => alert('Não deu para abrir esta imagem. Tente outra (JPG ou PNG).');
  img.src = dataUrl;
}
// Escala para a foto cobrir o quadrado inteiro (zoom 1 = o lado menor encosta na borda)
function ajusteEscala(){ const i = _ajuste.img; return Math.max(AJ_LADO / i.width, AJ_LADO / i.height) * _ajuste.zoom; }
// Não deixa aparecer área vazia: a foto sempre cobre o círculo
function ajusteLimitar(){
  const i = _ajuste.img, e = ajusteEscala();
  const folgaX = Math.max(0, (i.width * e - AJ_LADO) / 2), folgaY = Math.max(0, (i.height * e - AJ_LADO) / 2);
  _ajuste.x = Math.min(folgaX, Math.max(-folgaX, _ajuste.x));
  _ajuste.y = Math.min(folgaY, Math.max(-folgaY, _ajuste.y));
}
function desenharFotoEm(ctx, lado){
  const i = _ajuste.img, k = lado / AJ_LADO, e = ajusteEscala() * k;
  const w = i.width * e, h = i.height * e;
  ctx.drawImage(i, (lado - w) / 2 + _ajuste.x * k, (lado - h) / 2 + _ajuste.y * k, w, h);
}
function desenharAjuste(){
  const cv = document.getElementById('aj-canvas'); if(!cv || !_ajuste.img) return;
  const ctx = cv.getContext('2d'), L = cv.width;
  ctx.clearRect(0, 0, L, L);
  desenharFotoEm(ctx, L);
  // Escurece o que fica fora do círculo (é cortado) e desenha a borda dourada
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.beginPath(); ctx.rect(0, 0, L, L); ctx.arc(L/2, L/2, L/2 - 6, 0, Math.PI * 2, true); ctx.fill('evenodd'); ctx.restore();
  ctx.beginPath(); ctx.arc(L/2, L/2, L/2 - 6, 0, Math.PI * 2); ctx.lineWidth = 3; ctx.strokeStyle = '#C8A96E'; ctx.stroke();
}
function salvarAjusteFoto(){
  const out = document.createElement('canvas'); out.width = out.height = 256;
  const ctx = out.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 256, 256);
  desenharFotoEm(ctx, 256);
  const dataUrl = out.toDataURL('image/jpeg', 0.86);
  try{ localStorage.setItem('fin_foto_' + cp, dataUrl); }catch(e){}
  const caminho = caminhoFotoNuvem();
  if(caminho && window._db && window._set && window._ref){
    window._set(window._ref(window._db, caminho), dataUrl).catch(e => console.warn('[Foto] Não salvou na nuvem:', e && e.message));
  }
  aplicarFotoAvatar(dataUrl);
  const preview = document.getElementById('cfg-foto-preview');
  if(preview) preview.innerHTML = imgFoto(dataUrl, false);
  closeModal('modal-ajuste-foto');
}

// Foto de perfil: só aceita imagem embutida (data:image/...;base64). Antes o valor entrava direto
// no HTML — uma "foto" adulterada no aparelho ou no banco podia carregar código na página.
const FOTO_OK = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;
function imgFoto(url, redonda){
  if(!FOTO_OK.test(String(url||''))) return '';
  return `<img src="${url}" alt="" style="width:100%;height:100%;object-fit:cover${redonda?';border-radius:50%':''}">`;
}

// Quem aparece no rodapé do menu: no perfil FinRossi, a empresa; nos outros, a pessoa
function identidadePerfil(){
  if(cp === 'finrossi') return { nome:'FinRossi', sub:'Perfil da empresa', inicial:'F' };
  const user = window._firebaseUser;
  const nome = user?.displayName || localStorage.getItem('fin_nome_display') || user?.email?.split('@')[0] || 'Usuário';
  return { nome, sub:'Minha conta', inicial:nome[0].toUpperCase() };
}
function atualizarRodapePerfil(){
  const id = identidadePerfil();
  const nomeEl = document.getElementById('user-nome');
  if(nomeEl) nomeEl.textContent = id.nome;
  const sub = document.querySelector('.sb-user-sub');
  if(sub) sub.textContent = id.sub;
}

function aplicarFotoAvatar(dataUrl){
  const avatar = document.getElementById('sb-avatar');
  if(avatar){
    if(dataUrl){
      avatar.innerHTML=imgFoto(dataUrl, true);
    } else {
      avatar.innerHTML = '';
      avatar.textContent = identidadePerfil().inicial;
    }
  }
}

// Foto do perfil em uso (chamada ao entrar e a cada troca de perfil)
function initAvatar(){
  const perfil = cp;
  const foto = localStorage.getItem('fin_foto_'+perfil);
  aplicarFotoAvatar(FOTO_OK.test(foto || '') ? foto : null);   // sem foto: volta à inicial do nome
  if(!foto && window._firebaseUser?.uid && window._db && window._ref && window._onValue){
    // Busca na nuvem. O Pessoal do Master usava a foto antiga da conta (usuarios/<uid>/foto).
    const caminhos = [caminhoFotoNuvem(perfil)];
    if(perfil === 'pessoal') caminhos.push(`usuarios/${window._firebaseUser.uid}/foto`);
    const tentar = i => {
      if(i >= caminhos.length || !caminhos[i]) return;
      try{
        window._onValue(window._ref(window._db, caminhos[i]), snap=>{
          const url = snap.val();
          if(!FOTO_OK.test(url || '')) return tentar(i + 1);
          try{ localStorage.setItem('fin_foto_'+perfil, url); }catch(e){}
          if(cp !== perfil) return;               // trocou de perfil enquanto buscava
          aplicarFotoAvatar(url);
          const preview = document.getElementById('cfg-foto-preview');
          if(preview) preview.innerHTML=imgFoto(url, false);
        }, () => tentar(i + 1), {onlyOnce:true});
      }catch(e){}
    };
    tentar(0);
  }
  // Nome no rodapé do menu: a empresa no perfil FinRossi, a pessoa nos outros
  atualizarRodapePerfil();
}

// ─── Dashboard Config ─────────────────────────────────────────────────────────
const DASH_CARDS_DEF = [
  {id:'metrics',   label:'Cards de métricas',         desc:'Receitas, Despesas, Saldo, Investido', default:true},
  {id:'tabela',    label:'Tabela de meses',            desc:'Histórico mensal clicável',             default:true},
  {id:'chart_bar', label:'Gráfico Receitas vs Despesas', desc:'Barras do mês atual',               default:true},
  {id:'chart_cat', label:'Despesas por categoria',    desc:'Gráfico de pizza',                      default:true},
  {id:'chart_ev',  label:'Evolução mensal',            desc:'Linha dos últimos meses',              default:true},
  {id:'meta',      label:'Meta em destaque',           desc:'Progresso da meta selecionada',         default:true},
  {id:'parcelas',  label:'Parcelas em andamento',      desc:'Compras parceladas ativas',            default:true},
];

function getDashConfig(){
  try{
    const saved = localStorage.getItem('fin_dash_cfg_'+cp);
    if(saved) return JSON.parse(saved);
  }catch(e){}
  const def = {};
  DASH_CARDS_DEF.forEach(c=>def[c.id]=c.default);
  return def;
}

function renderDashConfigCards(){
  const el = document.getElementById('cfg-dash-cards');
  if(!el) return;
  const cfg = getDashConfig();
  // Só blocos que existem no plano do cliente
  const PRECISA = { meta: 'metas' };
  const cards = DASH_CARDS_DEF.filter(c => !PRECISA[c.id] || typeof verComoPlanoPermite !== 'function' || verComoPlanoPermite(PRECISA[c.id]));
  el.innerHTML = cards.map(card=>`
    <label style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;gap:12px">
      <div>
        <div style="font-size:13px;font-weight:500">${card.label}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">${card.desc}</div>
      </div>
      <div style="position:relative;flex-shrink:0">
        <input type="checkbox" id="dash-cfg-${card.id}" ${cfg[card.id]!==false?'checked':''} style="display:none">
        <div onclick="toggleDashCard('${card.id}')" id="dash-toggle-${card.id}" style="width:40px;height:22px;border-radius:11px;background:${cfg[card.id]!==false?'var(--accent)':'var(--surface3)'};border:1px solid ${cfg[card.id]!==false?'var(--accent)':'var(--border2)'};cursor:pointer;transition:all .2s;position:relative">
          <div style="position:absolute;top:2px;left:${cfg[card.id]!==false?'19px':'2px'};width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s"></div>
        </div>
      </div>
    </label>`).join('');
}

function toggleDashCard(id){
  const cfg = getDashConfig();
  cfg[id] = cfg[id]===false ? true : false;
  localStorage.setItem('fin_dash_cfg_'+cp, JSON.stringify(cfg));
  // Update toggle visual
  const toggle = document.getElementById('dash-toggle-'+id);
  const on = cfg[id]!==false;
  if(toggle){
    toggle.style.background = on?'var(--accent)':'var(--surface3)';
    toggle.style.borderColor = on?'var(--accent)':'var(--border2)';
    toggle.children[0].style.left = on?'19px':'2px';
  }
}

function salvarDashConfig(){
  refreshDash();
  aplicarNavConfig();
  const msg=document.getElementById('cfg-msg-dash');
  if(msg){msg.textContent='✓ Preferências salvas!';msg.style.color='var(--green)';setTimeout(()=>msg.textContent='',2000);}
}


// Fechar Configurações tocando fora da janela ou com Esc (antes só pelo ✕ do topo)
(function(){
  const m = document.getElementById('modal-config');
  if(!m) return;
  m.addEventListener('click', e => { if(e.target === m) fecharConfiguracoes(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && m.style.display !== 'none') fecharConfiguracoes(); });
})();
