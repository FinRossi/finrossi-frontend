// acessos/17-clientes.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── CLIENTES ────────────────────────────────────────────────────────────────
// Site oficial (finrossi.com.br) usa o servidor do Railway; teste no computador
// (localhost ou IP da rede, via "npm run local" no backend) usa o backend local na porta 3000.
const BACKEND_URL = /(^|\.)finrossi\.com\.br$|\.github\.io$/.test(location.hostname)
  ? 'https://finrossi-backend-production.up.railway.app'
  : 'http://' + (location.hostname || 'localhost') + ':3000';
const ADMIN_TOKEN = ''; // Deixe em branco — será pedido se necessário

var _adminToken = localStorage.getItem('fin_admin_token')||'';

function getAdminToken(){
  // Master não precisa da senha: o login dele vai junto em adminHeaders() e o servidor aceita
  if(isMaster() && window._firebaseUser) return _adminToken || 'login-master';
  if(_adminToken) return _adminToken;
  // Tenta pegar do localStorage primeiro
  const saved=localStorage.getItem('fin_admin_token');
  if(saved){_adminToken=saved;return _adminToken;}
  const t = prompt('Senha de administrador (ADMIN_SECRET):');
  if(!t){goTo('dashboard');return null;}
  _adminToken = t;
  localStorage.setItem('fin_admin_token', t);
  return _adminToken;
}

// Cabeçalhos das chamadas admin: senha admin + login do Firebase de quem está usando.
// O servidor usa o login para saber se é o Master (único que mexe em acessos da equipe).
async function adminHeaders(token, extra){
  const h = {'x-admin-token':token, ...(extra||{})};
  try{
    const u = window._firebaseUser;
    if(u && u.getIdToken) h.Authorization = 'Bearer ' + await u.getIdToken();
  }catch(e){}
  return h;
}

const ROLES_EQUIPE = ['master','socio','admin','dev'];

// Só o Master pode escolher um acesso de equipe ao cadastrar
function limitarRolesNovoUsuario(){
  const sel=document.getElementById('nc-role');
  if(!sel) return;
  [...sel.options].forEach(o=>{
    const bloqueado = o.value!=='cliente' && !isMaster();
    o.disabled = bloqueado;
    o.hidden = bloqueado;
  });
}

function toggleCamposRole(){
  const role=document.getElementById('nc-role')?.value||'cliente';
  const clienteFields=document.getElementById('nc-campos-cliente');
  const equipeFields=document.getElementById('nc-campos-equipe');
  if(clienteFields) clienteFields.style.display=role==='cliente'?'block':'none';
  if(equipeFields) equipeFields.style.display=role!=='cliente'?'block':'none';
}

function openModalNovoCliente(){
  ['nc-nome','nc-email','nc-senha'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('msg-novo-cliente').textContent='';
  const roleEl=document.getElementById('nc-role');
  if(roleEl) roleEl.value='cliente';
  limitarRolesNovoUsuario();
  toggleCamposRole();
  document.getElementById('modal-novo-cliente').classList.add('open');
}

async function cadastrarNovoCliente(){
  const nome=document.getElementById('nc-nome').value.trim();
  const email=document.getElementById('nc-email').value.trim();
  const senha=document.getElementById('nc-senha').value;
  const role=document.getElementById('nc-role')?.value||'cliente';
  const plano=role==='cliente'?(document.getElementById('nc-plano')?.value||'gratuito'):'patrimonio';
  const origem=role==='cliente'?(document.getElementById('nc-origem')?.value||'teste'):'interno';
  const msg=document.getElementById('msg-novo-cliente');

  if(!nome||!email||!senha){showMsg('msg-novo-cliente','Preencha todos os campos','err');return}
  if(!validarEmail(email)){showMsg('msg-novo-cliente','Email inválido — verifique o formato','err');return}

  const token=getAdminToken();
  if(!token){showMsg('msg-novo-cliente','Token admin necessário','err');return}

  msg.textContent='Cadastrando...';
  msg.style.color='var(--muted)';

  try{
    const res=await fetch(`${BACKEND_URL}/admin/clientes/teste`,{
      method:'POST',
      headers:await adminHeaders(token,{'Content-Type':'application/json'}),
      body:JSON.stringify({nome,email,senha,plano,origem,role})
    });
    if(res.status===401){_adminToken='';showMsg('msg-novo-cliente','Senha admin incorreta','err');return;}
    const data=await res.json();
    if(data.ok){
      showMsg('msg-novo-cliente',ROLES_EQUIPE.includes(role)?'Acesso criado com sucesso!':'Cliente cadastrado com sucesso!','ok');
      // Atualiza a tela de onde o cadastro foi aberto (Sócios ou Clientes)
      const secSoc=document.getElementById('sec-socios');
      const naSocios=!!secSoc && !secSoc.classList.contains('section-hidden');
      setTimeout(()=>{closeModal('modal-novo-cliente');(naSocios?renderSocios:renderClientes)();},1500);
    } else {
      showMsg('msg-novo-cliente',data.erro||'Erro ao cadastrar','err');
    }
  }catch(e){
    showMsg('msg-novo-cliente','Erro de conexão com o backend','err');
  }
}

async function renderClientes(){
  const token=getAdminToken();
  if(!token){goTo('dashboard');return;}

  const tabela=document.getElementById('clientes-tabela');
  tabela.innerHTML='<p style="color:var(--muted);font-size:13px;padding:12px">Carregando clientes...</p>';

  try{
    const res=await fetch(`${BACKEND_URL}/admin/clientes`,{
      headers:await adminHeaders(token)
    });
    
    if(res.status===401){
      _adminToken='';
      localStorage.removeItem('fin_admin_token');
      goTo('dashboard');
      setTimeout(()=>alert('Senha de administrador incorreta. Tente novamente.'),100);
      return;
    }

    const data=await res.json();
    const clientes=data.clientes||[];

    // Separa equipe interna de clientes reais
    const ROLES_INTERNOS=ROLES_EQUIPE;
    const clientesReais=clientes.filter(c=>!ROLES_INTERNOS.includes(c.role));
    const equipeInterna=clientes.filter(c=>ROLES_INTERNOS.includes(c.role));

    // Filtros
    const filtroStatus=document.getElementById('cli-filtro-status')?.value||'';
    const filtroPlano=document.getElementById('cli-filtro-plano')?.value||'';
    const busca=(document.getElementById('cli-busca')?.value||'').toLowerCase();
    const filtroRole=document.getElementById('cli-filtro-role')?.value||'';

    let lista=[...clientesReais,...equipeInterna];
    if(filtroStatus) lista=lista.filter(c=>c.status===filtroStatus);
    if(filtroPlano) lista=lista.filter(c=>c.plano===filtroPlano);
    if(filtroRole==='equipe') lista=equipeInterna;
    else if(filtroRole==='clientes') lista=clientesReais;
    if(busca) lista=lista.filter(c=>(c.nome+c.email).toLowerCase().includes(busca));

    const pagantes=clientesReais.filter(c=>c.origem==='pagante'&&c.status==='ativo');
    const emTrial=clientesReais.filter(c=>c.origem==='trial'&&c.status!=='inativo');
    const inativos=clientesReais.filter(c=>c.status==='inativo');
    const mrr=pagantes.reduce((a,c)=>{ const p={essencial:9.90,evolucao:24.90,patrimonio:49.90}; return a+(p[c.plano]||0); },0);

    document.getElementById('clientes-metrics').innerHTML=`
      <div class="mc"><div class="mc-label">Pagantes ativos</div><div class="mc-val green">${pagantes.length}</div><div class="mc-sub">geram receita</div></div>
      <div class="mc"><div class="mc-label">Em trial</div><div class="mc-val amber">${emTrial.length}</div><div class="mc-sub">30 dias grátis</div></div>
      <div class="mc"><div class="mc-label">Inativos</div><div class="mc-val red">${inativos.length}</div></div>
      <div class="mc"><div class="mc-label">MRR</div><div class="mc-val green">${fmtR(mrr)}</div><div class="mc-sub">receita mensal</div></div>
      <div class="mc"><div class="mc-label">Equipe interna</div><div class="mc-val blue">${equipeInterna.length}</div><div class="mc-sub">fora das métricas</div></div>
    `;

    if(!lista.length){
      tabela.innerHTML='<p class="empty">Nenhum cliente encontrado</p>';
      return;
    }

    const PLANO_CORES={gratuito:'var(--muted)',essencial:'var(--blue)',evolucao:'var(--green)',patrimonio:'var(--accent)'};
    const STATUS_CORES={ativo:'var(--green)',trial:'var(--amber)',inativo:'var(--red)',pendente:'var(--amber)'};
    const ROLE_BADGE={master:['','var(--accent)','Master'],socio:['','var(--accent)','Sócio'],admin:['','var(--purple)','Admin'],dev:['','var(--blue)','Dev'],cliente:['','var(--muted)','Cliente']};
    const ROLES_INTERNOS_TBL=ROLES_EQUIPE;

    tabela.innerHTML=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="border-bottom:1px solid var(--border)">
        <th style="text-align:left;padding:8px 10px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Nome</th>
        <th style="text-align:left;padding:8px 10px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Email</th>
        <th style="text-align:center;padding:8px 10px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Role</th>
        <th style="text-align:center;padding:8px 10px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Plano</th>
        <th style="text-align:center;padding:8px 10px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Status</th>
        <th style="text-align:center;padding:8px 10px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Origem</th>
        <th style="text-align:center;padding:8px 10px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Cadastro</th>
        <th style="text-align:center;padding:8px 10px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Ações</th>
      </tr></thead>
      <tbody>${lista.map(c=>{
        const interno=ROLES_INTERNOS_TBL.includes(c.role);
        const rb=ROLE_BADGE[c.role]||ROLE_BADGE.cliente;
        return`<tr style="border-bottom:1px solid var(--border);${interno?'background:rgba(200,169,110,0.04)':''}">
          <td style="padding:10px;font-weight:${interno?500:400}">${c.nome||'—'}</td>
          <td style="padding:10px;color:var(--muted);font-size:12px">${c.email}</td>
          <td style="padding:10px;text-align:center"><span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${rb[1]}18;color:${rb[1]}">${rb[2]}</span></td>
          <td style="padding:10px;text-align:center">${interno?'<span style="font-size:11px;color:var(--muted)">—</span>':`<span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${PLANO_CORES[c.plano]||'var(--muted)'}18;color:${PLANO_CORES[c.plano]||'var(--muted)'}">${c.plano||'—'}</span>`}</td>
          <td style="padding:10px;text-align:center"><span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${STATUS_CORES[c.status]||'var(--muted)'}18;color:${STATUS_CORES[c.status]||'var(--muted)'}">${c.status||'—'}</span></td>
          <td style="padding:10px;text-align:center;font-size:12px;color:var(--muted)">${interno?'Interno':c.origem==='teste'?'Teste':c.origem==='trial'?'Trial':'Pagante'}</td>
          <td style="padding:10px;text-align:center;font-size:12px;color:var(--muted)">${c.dataCadastro?c.dataCadastro.slice(0,10):'—'}</td>
          <td style="padding:10px;text-align:center">${interno?'<span style="font-size:11px;color:var(--muted)">Equipe</span>':`<div style="display:flex;gap:4px;justify-content:center">
            <button class="btn xs" onclick="editarCliente('${c.uid}')" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>
            ${c.status==='inativo'
              ?`<button class="btn xs" onclick="reativarCliente('${c.uid}')" style="color:var(--green);border-color:var(--green)">↺</button>`
              :`<button class="btn danger xs" onclick="desativarCliente('${c.uid}')">✕</button>`}
          </div>`}</td>
        </tr>`;}).join('')}</tbody>
    </table></div>`;

  }catch(e){
    tabela.innerHTML=`<p style="color:var(--red);font-size:13px;padding:12px">Erro ao carregar clientes: ${e.message}</p>`;
  }
}

// ─── EDITAR CLIENTE ───────────────────────────────────────────────────────────
let _clienteEditando = null;

async function editarCliente(uid){
  const token = getAdminToken();
  if(!token) return;

  try{
    const res = await fetch(`${BACKEND_URL}/admin/clientes`, {headers:await adminHeaders(token)});
    const data = await res.json();
    const c = (data.clientes||[]).find(x=>x.uid===uid);
    if(!c){ alert('Cliente não encontrado'); return; }

    _clienteEditando = c;

    document.getElementById('ec-uid').value = uid;
    document.getElementById('ec-nome-display').textContent = c.nome || '—';
    document.getElementById('ec-email-display').textContent = c.email || '—';
    document.getElementById('ec-plano').value = c.plano || 'gratuito';
    document.getElementById('ec-status').value = c.status || 'trial';
    document.getElementById('ec-origem').value = c.origem || 'teste';
    document.getElementById('ec-obs').value = c.observacoes || '';
    document.getElementById('msg-ec').textContent = '';

    // Data de vencimento
    dpInit('ec-vencimento', c.vencimento || hoje());

    // Verifica alerta de pagamento
    verificarAlertaPagamento(c);

    // Histórico de pagamentos
    renderHistoricoPagamentos(c.pagamentos || []);

    dpInit('pag-data', hoje());

    document.getElementById('modal-editar-cliente').classList.add('open');
  }catch(e){ alert('Erro ao carregar cliente: '+e.message); }
}

function verificarAlertaPagamento(c){
  const alerta = document.getElementById('ec-alerta-pagamento');
  const alertaTxt = document.getElementById('ec-alerta-txt');
  if(!alerta) return;

  if(c.status === 'pendente'){
    const venc = c.vencimento ? new Date(c.vencimento) : null;
    const diasAtraso = venc ? Math.ceil((new Date()-venc)/86400000) : 0;
    alerta.style.display = 'block';
    alertaTxt.textContent = diasAtraso > 0
      ? `Venceu há ${diasAtraso} dia(s). Entre em contato com o cliente.`
      : `Aguardando confirmação de pagamento.`;
  } else if(c.plano !== 'gratuito' && c.plano && c.status === 'ativo'){
    const venc = c.vencimento ? new Date(c.vencimento) : null;
    const diasParaVencer = venc ? Math.ceil((venc-new Date())/86400000) : 99;
    if(diasParaVencer <= 5 && diasParaVencer >= 0){
      alerta.style.display = 'block';
      alertaTxt.textContent = `Vence em ${diasParaVencer} dia(s). Confirme o pagamento.`;
    } else {
      alerta.style.display = 'none';
    }
  } else {
    alerta.style.display = 'none';
  }
}

function renderHistoricoPagamentos(pagamentos){
  const el = document.getElementById('ec-historico-pag');
  if(!el) return;
  if(!pagamentos.length){
    el.innerHTML = '<div style="font-size:12px;color:var(--muted2);font-style:italic">Nenhum registro ainda</div>';
    return;
  }
  el.innerHTML = [...pagamentos].reverse().map(p=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:var(--surface2);border-radius:6px;font-size:12px">
      <div>
        <span style="color:var(--green);font-weight:500">${fmtR(p.valor)}</span>
        <span style="color:var(--muted);margin-left:8px">${p.forma||'—'}</span>
        ${p.obs?`<span style="color:var(--muted2);margin-left:6px">· ${p.obs}</span>`:''}
      </div>
      <span style="color:var(--muted2)">${p.data||'—'}</span>
    </div>`).join('');
}

async function salvarEdicaoCliente(){
  const uid = document.getElementById('ec-uid').value;
  const token = getAdminToken();
  if(!uid||!token) return;

  const plano   = document.getElementById('ec-plano').value;
  const status  = document.getElementById('ec-status').value;
  const origem  = document.getElementById('ec-origem').value;
  const vencimento = document.getElementById('ec-vencimento').value;
  const observacoes = document.getElementById('ec-obs').value.trim();

  const msg = document.getElementById('msg-ec');
  if(msg){ msg.textContent='Salvando...'; msg.style.color='var(--muted)'; }

  try{
    // Atualiza plano
    await fetch(`${BACKEND_URL}/admin/clientes/${uid}/plano`,{
      method:'POST', headers:await adminHeaders(token,{'Content-Type':'application/json'}),
      body: JSON.stringify({plano})
    });
    // Atualiza status
    const endpoint = status==='inativo' ? 'desativar' : 'reativar';
    if(status==='inativo'){
      await fetch(`${BACKEND_URL}/admin/clientes/${uid}/desativar`,{method:'POST',headers:await adminHeaders(token)});
    } else if(_clienteEditando?.status === 'inativo'){
      await fetch(`${BACKEND_URL}/admin/clientes/${uid}/reativar`,{method:'POST',headers:await adminHeaders(token)});
    }
    // Salva campos extras diretamente no Firebase
    if(window._db && window._ref && window._set){
      await window._set(window._ref(window._db,`usuarios/${uid}`),{
        ...(_clienteEditando||{}),
        plano, status, origem, vencimento, observacoes,
        uid, // garante que uid está salvo
      });
    }

    if(msg){ msg.textContent='✓ Salvo com sucesso!'; msg.style.color='var(--green)'; }
    setTimeout(()=>{ closeModal('modal-editar-cliente'); renderClientes(); }, 1200);
  }catch(e){
    if(msg){ msg.textContent='Erro: '+e.message; msg.style.color='var(--red)'; }
  }
}

function adicionarPagamento(){
  dpInit('pag-data', hoje());
  document.getElementById('pag-valor').value = '';
  document.getElementById('pag-obs').value = '';
  document.getElementById('modal-pag-cliente').classList.add('open');
}

async function confirmarPagamento(){
  const uid = document.getElementById('ec-uid').value;
  const valor = parseCurrency(document.getElementById('pag-valor'));
  const data = document.getElementById('pag-data').value || hoje();
  const forma = document.getElementById('pag-forma').value;
  const obs = document.getElementById('pag-obs').value.trim();

  if(!valor||valor<=0){ alert('Informe o valor'); return; }

  const novoPag = { valor, data, forma, obs, id: Date.now().toString() };

  // Adiciona ao histórico no Firebase
  const atual = _clienteEditando?.pagamentos || [];
  const novos = [...atual, novoPag];

  if(window._db && window._ref && window._set){
    try{
      await window._set(window._ref(window._db,`usuarios/${uid}/pagamentos`), novos);
      _clienteEditando = { ..._clienteEditando, pagamentos: novos };

      // Se status estava pendente, atualiza para ativo
      if(_clienteEditando?.status === 'pendente'){
        document.getElementById('ec-status').value = 'ativo';
      }

      renderHistoricoPagamentos(novos);
      verificarAlertaPagamento({..._clienteEditando, pagamentos: novos, status: document.getElementById('ec-status').value});
      closeModal('modal-pag-cliente');
    }catch(e){ alert('Erro ao salvar: '+e.message); }
  }
}

async function desativarCliente(uid){
  if(!confirm('Desativar este cliente?')) return;
  const token=getAdminToken();
  if(!token) return;
  try{
    await fetch(`${BACKEND_URL}/admin/clientes/${uid}/desativar`,{method:'POST',headers:await adminHeaders(token)});
    renderClientes();
  }catch(e){alert('Erro ao desativar');}
}

async function reativarCliente(uid){
  if(!confirm('Reativar este cliente?')) return;
  const token=getAdminToken();
  if(!token) return;
  try{
    await fetch(`${BACKEND_URL}/admin/clientes/${uid}/reativar`,{method:'POST',headers:await adminHeaders(token)});
    renderClientes();
  }catch(e){alert('Erro ao reativar');}
}

