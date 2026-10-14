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
        preview.innerHTML=`<img src="${fotoSalva}" style="width:100%;height:100%;object-fit:cover">`;
        document.getElementById('sb-avatar').innerHTML=`<img src="${fotoSalva}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
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

function carregarFoto(event){
  const file = event.target.files[0];
  if(!file) return;
  // Comprime para max 200KB antes de salvar
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxSize = 200;
      let w = img.width, h = img.height;
      if(w > h){ h = Math.round(h*maxSize/w); w = maxSize; }
      else { w = Math.round(w*maxSize/h); h = maxSize; }
      canvas.width=w; canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      // Salva
      localStorage.setItem('fin_foto_'+cp, dataUrl);
      // Salva no Firebase também
      if(window._db && window._set && window._ref){
        try{ window._set(window._ref(window._db,`usuarios/${window._firebaseUser?.uid}/foto`), dataUrl); }catch(e){}
      }
      // Atualiza UI
      aplicarFotoAvatar(dataUrl);
      const preview = document.getElementById('cfg-foto-preview');
      if(preview) preview.innerHTML=`<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover">`;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function aplicarFotoAvatar(dataUrl){
  const avatar = document.getElementById('sb-avatar');
  if(avatar){
    if(dataUrl){
      avatar.innerHTML=`<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else {
      const user = window._firebaseUser;
      const nome = user?.displayName || localStorage.getItem('fin_nome_display') || 'U';
      avatar.innerHTML = '';
      avatar.textContent = nome[0].toUpperCase();
    }
  }
}

function initAvatar(){
  const foto = localStorage.getItem('fin_foto_'+cp);
  if(foto){
    aplicarFotoAvatar(foto);
  } else if(window._firebaseUser?.uid && window._db && window._ref && window._onValue){
    // Tenta carregar foto do Firebase
    try{
      window._onValue(window._ref(window._db,`usuarios/${window._firebaseUser.uid}/foto`), snap=>{
        const url = snap.val();
        if(url){
          localStorage.setItem('fin_foto_'+cp, url);
          aplicarFotoAvatar(url);
          const preview = document.getElementById('cfg-foto-preview');
          if(preview) preview.innerHTML=`<img src="${url}" style="width:100%;height:100%;object-fit:cover">`;
        }
      },{onlyOnce:true});
    }catch(e){}
  }
  // Atualiza nome na sidebar
  const user = window._firebaseUser;
  const nome = user?.displayName || localStorage.getItem('fin_nome_display') || user?.email?.split('@')[0] || '';
  const nomeEl = document.getElementById('user-nome');
  if(nomeEl && nome) nomeEl.textContent = nome;
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
  el.innerHTML = DASH_CARDS_DEF.map(card=>`
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

function isDashCardVisible(id){
  return getDashConfig()[id] !== false;
}

