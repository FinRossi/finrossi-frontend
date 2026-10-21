// js/app/28-nav-personalizacao.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── NAV PERSONALIZATION ─────────────────────────────────────────────────────
var NAV_ITEMS_DEF=[
  {id:'investimentos',label:'Investimentos',group:'menu',removable:true},
  {id:'historico',    label:'Histórico',    group:'menu',removable:true},
  {id:'metas',        label:'Metas',        group:'menu',removable:true},
  {id:'objetivos',    label:'Objetivos',    group:'menu',removable:true},
  {id:'renda',        label:'Renda Passiva',group:'menu',removable:true},
  {id:'score',        label:'Score de Saúde',group:'menu',removable:true},
  {id:'relatorios',   label:'Relatórios',   group:'menu',removable:true},
  {id:'cartoes',      label:'Cartões',      group:'controles',removable:true},
  {id:'assinaturas',  label:'Assinaturas',  group:'controles',removable:true},
  {id:'recorrentes',  label:'Recorrentes',  group:'controles',removable:true},
  {id:'calendario',   label:'Calendário',   group:'controles',removable:true},
  {id:'notas',        label:'Notas',        group:'controles',removable:true},
  {id:'manual',       label:'Manual',       group:'controles',removable:true},
];
function getNavConfig(){
  try{const s=localStorage.getItem('fin_nav_cfg_'+cp);if(s)return JSON.parse(s);}catch(e){}
  const def={};NAV_ITEMS_DEF.forEach(i=>def[i.id]=true);return def;
}
// Itens que não fazem sentido no perfil do negócio (FinRossi) — continuam no Pessoal e para clientes
const NAV_OCULTOS_FINROSSI=['renda','manual','relatorios'];
function navOcultoNoPerfil(id){ return cp==='finrossi' && NAV_OCULTOS_FINROSSI.includes(id); }

function aplicarNavConfig(){
  const cfg=getNavConfig();
  NAV_ITEMS_DEF.forEach(item=>{
    const usuarioQuer = cfg[item.id]!==false;
    const planoPermite = verComoPlanoPermite(item.id);
    // Telas que o plano não libera continuam no menu, com cadeado: tocar mostra o plano que libera
    const visivel = (usuarioQuer && !navOcultoNoPerfil(item.id)) ? '' : 'none';
    const bloqueado = !planoPermite;

    const el=document.getElementById('nav-'+item.id);
    if(el && item.removable){ el.style.display = visivel; el.classList.toggle('nav-bloqueado', bloqueado); }

    // Mesma regra vale pro item equivalente no menu mobile ("Mais")
    const elMobile=document.getElementById('mnav-item-'+item.id);
    if(elMobile){ elMobile.style.display = visivel; elMobile.classList.toggle('nav-bloqueado', bloqueado); }
  });

  // A barra fixa inferior do mobile só tem 5 espaços — "Metas" é plano-dependente,
  // então precisa da mesma checagem, senão fica um atalho que não leva a lugar nenhum
  const mnavMetas = document.getElementById('mnav-metas');
  if(mnavMetas) mnavMetas.style.display = verComoPlanoPermite('metas') ? '' : 'none';
}
function renderNavConfigCards(){
  const el=document.getElementById('cfg-nav-cards');
  if(!el)return;
  const cfg=getNavConfig();
  const groups={menu:'Menu',controles:'Controles'};
  let html='';
  Object.entries(groups).forEach(([g,label])=>{
    // Só as telas que o plano libera (as outras aparecem no menu com cadeado, sem interruptor)
    const items=NAV_ITEMS_DEF.filter(i=>i.group===g && !navOcultoNoPerfil(i.id) && verComoPlanoPermite(i.id));
    if(!items.length) return;
    html+=`<div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin:12px 0 6px">${label}</div>`;
    html+=items.map(item=>{
      const on=cfg[item.id]!==false;
      return`<label style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;gap:12px;margin-bottom:5px">
        <span style="font-size:13px">${item.label}</span>
        <div onclick="toggleNavItem('${item.id}')" id="nav-toggle-${item.id}" style="width:36px;height:20px;border-radius:10px;background:${on?'var(--accent)':'var(--surface3)'};border:1px solid ${on?'var(--accent)':'var(--border2)'};cursor:pointer;transition:all .2s;position:relative;flex-shrink:0">
          <div style="position:absolute;top:2px;left:${on?'17px':'2px'};width:14px;height:14px;border-radius:50%;background:#fff;transition:left .2s"></div>
        </div>
      </label>`;
    }).join('');
  });
  el.innerHTML=html;
}
function toggleNavItem(id){
  const cfg=getNavConfig();
  cfg[id]=cfg[id]===false;
  localStorage.setItem('fin_nav_cfg_'+cp,JSON.stringify(cfg));
  const toggle=document.getElementById('nav-toggle-'+id);
  const on=cfg[id]!==false;
  if(toggle){toggle.style.background=on?'var(--accent)':'var(--surface3)';toggle.style.borderColor=on?'var(--accent)':'var(--border2)';toggle.children[0].style.left=on?'17px':'2px';}
  const navEl=document.getElementById('nav-'+id);
  if(navEl) navEl.style.display=on?'':'none';
}

function atualizarTemaAtivo(){
  const tema = localStorage.getItem('finrossi_tema') || 'escuro';
  ['escuro','claro','azul'].forEach(t=>{
    const btn = document.getElementById('cfg-tema-'+t);
    if(btn) btn.style.borderColor = t===tema ? 'var(--accent)' : 'transparent';
  });
}

async function salvarNome(){
  const nome = document.getElementById('cfg-input-nome').value.trim();
  const msg = document.getElementById('cfg-msg-nome');
  if(!nome){ msg.textContent='Digite um nome válido.'; msg.style.color='var(--red)'; return; }

  // Salva localmente
  localStorage.setItem('fin_nome_display', nome);

  // Atualiza Firebase Auth displayName se disponível
  const f = window._firebase;
  if(f?.firebaseOk && window._firebaseUser){
    try{
      const { updateProfile } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      await updateProfile(window._firebaseUser, { displayName: nome });
    }catch(e){ console.warn('updateProfile:', e.message); }
  }

  // Atualiza UI
  if(typeof atualizarCabecalhoDash === 'function') atualizarCabecalhoDash();
  const inicial = nome[0].toUpperCase();
  document.getElementById('cfg-nome-display').textContent = nome;
  // Rodapé do menu: no perfil FinRossi continua mostrando a empresa
  if(typeof atualizarRodapePerfil === 'function') atualizarRodapePerfil(); else document.getElementById('user-nome').textContent = nome;
  // Só atualiza avatar com inicial se não tiver foto
  const fotoSalva = localStorage.getItem('fin_foto_'+cp);
  if(!fotoSalva){
    if(cp !== 'finrossi') document.getElementById('sb-avatar').textContent = inicial;
    document.getElementById('cfg-avatar')?.textContent && (document.getElementById('cfg-avatar').textContent = inicial);
  }
  // Atualiza preview no modal
  const preview = document.getElementById('cfg-foto-preview');
  if(preview && !fotoSalva) preview.textContent = inicial;

  msg.textContent = '✓ Nome atualizado!';
  msg.style.color = 'var(--green)';
  setTimeout(()=>{ msg.textContent=''; }, 2500);
}

// Fecha modal config com Escape ou clique fora
document.addEventListener('keydown', e=>{
  if(e.key==='Escape') fecharConfiguracoes();
});
document.getElementById('modal-config').addEventListener('click', e=>{
  if(e.target === document.getElementById('modal-config')) fecharConfiguracoes();
});

