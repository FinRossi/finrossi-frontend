// acessos/27-ver-como.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── VER COMO (sócio simula outro plano na própria tela) ─────────────────────
let _verComoPlano = null;

const NAV_TO_LIMITE = {
  investimentos:'investimentos', metas:'metas', objetivos:'metas',
  renda:'renda', cartoes:'cartoes', assinaturas:'assinaturas',
  recorrentes:'assinaturas', calendario:'calendario', notas:'calendario',
  score:'score', relatorios:'relatorios'
};

function verComoPlanoPermite(name){
  // Sócio simulando um plano (Ver como) — vale a simulação
  if(_verComoPlano){
    const key = NAV_TO_LIMITE[name];
    if(!key) return true;
    const cfg = PLANOS_CONFIG[_verComoPlano];
    return !!(cfg && cfg.limites && cfg.limites[key]);
  }
  // Sócio/admin/dev sem simular nada — acesso total, sempre
  if(isEquipe()) return true;
  // Cliente de verdade — vale o plano real dele
  const key = NAV_TO_LIMITE[name];
  if(!key) return true;
  const planoReal = _userPlano || 'gratuito';
  const cfg = PLANOS_CONFIG[planoReal];
  return !!(cfg && cfg.limites && cfg.limites[key]);
}

function ativarVerComo(plano){
  _verComoPlano = plano;
  aplicarNavConfig();

  // Esconde tudo que é exclusivo de admin/sócio — o cliente não vê nada disso
  ['sb-perfis-admin','nav-clientes-item','nav-socios-item','nav-preview','sb-perfil-equipe'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.display='none';
  });

  // Mostra o que um cliente de verdade vê: "Minha conta" e "Minha Assinatura"
  const perfilCliente=document.getElementById('sb-perfil-cliente');
  if(perfilCliente) perfilCliente.style.display='block';
  const cliExtra=document.getElementById('sb-nav-cliente-extra');
  if(cliExtra) cliExtra.style.display='block';
  const navAssinatura=document.getElementById('nav-minha-assinatura');
  if(navAssinatura) navAssinatura.style.display='';

  mostrarBannerVerComo();
  goTo('dashboard');
}

function sairVerComo(){
  _verComoPlano = null;
  aplicarNavConfig();
  setupPerfilUI(); // restaura sb-perfis-admin, sb-perfil-cliente, sb-perfil-equipe e nav-preview

  // setupPerfilUI não cobre esses dois — dependem do perfil (Pessoal/FinRossi), não só do role
  const navClientes=document.getElementById('nav-clientes-item');
  if(navClientes) navClientes.style.display = cp==='finrossi' ? 'flex' : 'none';
  const navSocios=document.getElementById('nav-socios-item');
  if(navSocios) navSocios.style.display = (cp==='finrossi' && isMaster()) ? 'flex' : 'none';
  const cliExtra=document.getElementById('sb-nav-cliente-extra');
  if(cliExtra) cliExtra.style.display='none';

  const banner = document.getElementById('vercomo-banner');
  if(banner) banner.style.display = 'none';
}

function mostrarBannerVerComo(){
  let banner = document.getElementById('vercomo-banner');
  const cfg = PLANOS_CONFIG[_verComoPlano];
  if(!banner){
    banner = document.createElement('div');
    banner.id = 'vercomo-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99998;background:var(--accent);color:#0f0f0f;padding:10px 16px;display:flex;align-items:center;justify-content:center;gap:12px;font-size:13px;font-weight:600;font-family:\'DM Sans\',sans-serif;box-shadow:0 2px 12px rgba(0,0,0,.3)';
    document.body.appendChild(banner);
  }
  banner.innerHTML = `👁 Visualizando como: ${cfg?cfg.label:_verComoPlano} <button onclick="sairVerComo()" style="background:#0f0f0f;color:var(--accent);border:none;padding:5px 14px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;font-family:'DM Sans',sans-serif;margin-left:8px">Sair da visualização</button>`;
  banner.style.display = 'flex';
}

function toggleSidebar(){
  const sb=document.getElementById('sidebar');
  const btn=document.getElementById('sb-toggle');
  const collapsed=sb.classList.toggle('collapsed');
  btn.textContent=collapsed?'›':'‹';
  btn.title=collapsed?'Expandir sidebar':'Minimizar sidebar';
  localStorage.setItem('fin_sb_collapsed',collapsed?'1':'0');
}
function initSidebar(){
  const collapsed=localStorage.getItem('fin_sidebar_collapsed')==='1';
  const sb=document.getElementById('sidebar');
  const btn=document.getElementById('sb-toggle');
  if(collapsed){ sb.classList.add('collapsed'); if(btn)btn.textContent='›'; }
  initNavGroups();
  aplicarNavConfig();
}

