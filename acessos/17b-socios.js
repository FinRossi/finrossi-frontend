// acessos/17b-socios.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── SÓCIOS (acessos da equipe) — exclusivo do Master ───────────────────────
// Lista o Master (você) e todos os acessos de equipe criados: Sócio, Admin, Dev.
// Criar/alterar/desativar acessos é validado também no servidor (só o Master consegue).

const ACESSO_INFO = {
  master:  ['🔑','var(--accent)','Master', 'Acesso total + controla os acessos da equipe'],
  socio:   ['👑','var(--accent)','Sócio',  'Perfis Pessoal e FinRossi, clientes e preview — sem mexer em acessos'],
  admin:   ['👔','var(--purple)','Admin',  'Somente gestão de clientes'],
  dev:     ['💻','var(--blue)',  'Dev',    'Somente painel técnico / clientes'],
  cliente: ['👤','var(--muted)', 'Cliente','Sai da equipe e passa a usar o app conforme o plano'],
};

let _sociosCache = [];

function _escSocio(s){
  return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function renderSocios(){
  const tabela=document.getElementById('socios-tabela');
  if(!tabela) return;
  if(!isMaster()){ tabela.innerHTML='<p class="empty">Área exclusiva do Master</p>'; return; }

  const token=getAdminToken();
  if(!token){goTo('dashboard');return;}
  tabela.innerHTML='<p style="color:var(--muted);font-size:13px;padding:12px">Carregando acessos...</p>';

  try{
    const res=await fetch(`${BACKEND_URL}/admin/clientes`,{headers:await adminHeaders(token)});
    if(res.status===401){
      _adminToken='';
      localStorage.removeItem('fin_admin_token');
      goTo('dashboard');
      setTimeout(()=>alert('❌ Senha admin incorreta. Tente novamente.'),100);
      return;
    }
    const data=await res.json();
    const equipe=(data.clientes||[]).filter(c=>ROLES_EQUIPE.includes(c.role));

    // O dono é reconhecido pelo email no login — pode não ter cadastro no banco
    const eu=window._firebaseUser;
    equipe.forEach(c=>{ if(eu && c.email===eu.email){ c._dono=true; c.role='master'; } });
    if(eu && !equipe.some(c=>c._dono)){
      equipe.unshift({uid:eu.uid,nome:eu.displayName||'Você',email:eu.email,role:'master',status:'ativo',_dono:true});
    }
    equipe.sort((a,b)=>(b._dono?1:0)-(a._dono?1:0) || ROLES_EQUIPE.indexOf(a.role)-ROLES_EQUIPE.indexOf(b.role));
    _sociosCache=equipe;

    const conta=r=>equipe.filter(c=>c.role===r).length;
    document.getElementById('socios-metrics').innerHTML=`
      <div class="mc"><div class="mc-label">🔑 Master</div><div class="mc-val">${conta('master')}</div><div class="mc-sub">controla acessos</div></div>
      <div class="mc"><div class="mc-label">👑 Sócios</div><div class="mc-val">${conta('socio')}</div></div>
      <div class="mc"><div class="mc-label">👔 Admin</div><div class="mc-val">${conta('admin')}</div></div>
      <div class="mc"><div class="mc-label">💻 Dev</div><div class="mc-val">${conta('dev')}</div></div>
    `;

    const STATUS_CORES={ativo:'var(--green)',trial:'var(--amber)',inativo:'var(--red)',pendente:'var(--amber)'};
    const th='padding:8px 10px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px';
    tabela.innerHTML=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="border-bottom:1px solid var(--border)">
        <th style="text-align:left;${th}">Nome</th>
        <th style="text-align:left;${th}">Email</th>
        <th style="text-align:center;${th}">Acesso</th>
        <th style="text-align:center;${th}">Status</th>
        <th style="text-align:center;${th}">Cadastro</th>
        <th style="text-align:center;${th}">Ações</th>
      </tr></thead>
      <tbody>${equipe.map(c=>{
        const a=ACESSO_INFO[c.role]||ACESSO_INFO.cliente;
        const st=c.status||'ativo';
        return`<tr style="border-bottom:1px solid var(--border);${c._dono?'background:rgba(200,169,110,0.06)':''}">
          <td style="padding:10px;font-weight:500">${_escSocio(c.nome||'—')}${c._dono?' <span style="font-size:11px;color:var(--muted)">(você)</span>':''}</td>
          <td style="padding:10px;color:var(--muted);font-size:12px">${_escSocio(c.email)}</td>
          <td style="padding:10px;text-align:center"><span title="${_escSocio(a[3])}" style="font-size:11px;padding:2px 8px;border-radius:20px;background:${a[1]}18;color:${a[1]}">${a[0]} ${a[2]}</span></td>
          <td style="padding:10px;text-align:center"><span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${STATUS_CORES[st]||'var(--muted)'}18;color:${STATUS_CORES[st]||'var(--muted)'}">${_escSocio(st)}</span></td>
          <td style="padding:10px;text-align:center;font-size:12px;color:var(--muted)">${c.dataCadastro?c.dataCadastro.slice(0,10):'—'}</td>
          <td style="padding:10px;text-align:center">${c._dono?'<span style="font-size:11px;color:var(--muted)">Protegido</span>':`<div style="display:flex;gap:4px;justify-content:center">
            <button class="btn xs" onclick="abrirAlterarAcesso('${_escSocio(c.uid)}')" title="Alterar acesso">🔑</button>
            ${st==='inativo'
              ?`<button class="btn xs" onclick="reativarAcesso('${_escSocio(c.uid)}')" style="color:var(--green);border-color:var(--green)" title="Reativar">↺</button>`
              :`<button class="btn danger xs" onclick="desativarAcesso('${_escSocio(c.uid)}')" title="Desativar">✕</button>`}
          </div>`}</td>
        </tr>`;}).join('')}</tbody>
    </table></div>`;
  }catch(e){
    tabela.innerHTML=`<p style="color:var(--red);font-size:13px;padding:12px">Erro ao carregar acessos: ${_escSocio(e.message)}</p>`;
  }
}

// Novo acesso de equipe: reaproveita o cadastro, já com "Sócio" selecionado
function openNovoAcesso(){
  openModalNovoCliente();
  const roleEl=document.getElementById('nc-role');
  if(roleEl) roleEl.value='socio';
  toggleCamposRole();
}

function abrirAlterarAcesso(uid){
  const c=_sociosCache.find(x=>x.uid===uid);
  if(!c||c._dono) return;
  document.getElementById('aa-uid').value=uid;
  document.getElementById('aa-nome').textContent=c.nome||'—';
  document.getElementById('aa-email').textContent=c.email||'—';
  const sel=document.getElementById('aa-role');
  sel.value=c.role;
  atualizarDescAcesso();
  document.getElementById('msg-aa').textContent='';
  document.getElementById('modal-alterar-acesso').classList.add('open');
}

function atualizarDescAcesso(){
  const r=document.getElementById('aa-role')?.value;
  const el=document.getElementById('aa-desc');
  if(el) el.textContent=(ACESSO_INFO[r]||ACESSO_INFO.cliente)[3];
}

async function salvarAlterarAcesso(){
  const uid=document.getElementById('aa-uid').value;
  const role=document.getElementById('aa-role').value;
  const token=getAdminToken();
  if(!uid||!token) return;
  const msg=document.getElementById('msg-aa');
  msg.textContent='Salvando...'; msg.style.color='var(--muted)';
  try{
    const res=await fetch(`${BACKEND_URL}/admin/clientes/${encodeURIComponent(uid)}/role`,{
      method:'POST', headers:await adminHeaders(token,{'Content-Type':'application/json'}),
      body:JSON.stringify({role})
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok){ msg.textContent=data.erro||'Erro ao alterar acesso'; msg.style.color='var(--red)'; return; }
    msg.textContent='✓ Acesso alterado!'; msg.style.color='var(--green)';
    setTimeout(()=>{ closeModal('modal-alterar-acesso'); renderSocios(); },1000);
  }catch(e){
    msg.textContent='Erro de conexão com o backend'; msg.style.color='var(--red)';
  }
}

async function _mudarStatusAcesso(uid, acao, pergunta){
  if(!confirm(pergunta)) return;
  const token=getAdminToken();
  if(!token) return;
  try{
    const res=await fetch(`${BACKEND_URL}/admin/clientes/${encodeURIComponent(uid)}/${acao}`,{method:'POST',headers:await adminHeaders(token)});
    if(!res.ok){ const d=await res.json().catch(()=>({})); alert(d.erro||'Erro ao alterar acesso'); }
    renderSocios();
  }catch(e){ alert('Erro de conexão com o backend'); }
}
function desativarAcesso(uid){ return _mudarStatusAcesso(uid,'desativar','Desativar este acesso? A pessoa não conseguirá mais entrar.'); }
function reativarAcesso(uid){ return _mudarStatusAcesso(uid,'reativar','Reativar este acesso?'); }
