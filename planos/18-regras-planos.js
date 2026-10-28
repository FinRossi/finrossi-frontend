// planos/18-regras-planos.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── PREVIEW DE PLANOS ────────────────────────────────────────────────────────
const PLANOS_CONFIG = {
  gratuito: {
    label: 'Gratuito', get preco(){ return precoTexto('gratuito'); }, cor: 'var(--muted)', dias: 30,
    limites: { lancamentos: 20, investimentos: false, metas: false, cartoes: false, assinaturas: false, recorrentes: false, calendario: false, notas: true, renda: false, score: false, personalizacao: false, foto: false, relatorios: false, 'minha-assinatura': true },
    desc: 'Acesso por 30 dias com até 20 lançamentos. Sem investimentos, metas ou controles avançados.'
  },
  essencial: {
    label: 'Essencial', get preco(){ return precoTexto('essencial'); }, cor: 'var(--blue)', dias: null,
    limites: { lancamentos: true, investimentos: true, metas: false, cartoes: false, assinaturas: false, recorrentes: false, calendario: false, notas: true, renda: false, score: false, personalizacao: false, foto: false, relatorios: false, 'minha-assinatura': true },
    desc: 'O básico não deveria ser limitado: lançamentos ilimitados, gráficos e investimentos simples.'
  },
  evolucao: {
    label: 'Evolução', get preco(){ return precoTexto('evolucao'); }, cor: 'var(--green)', dias: null,
    limites: { lancamentos: true, investimentos: true, metas: true, cartoes: true, assinaturas: true, recorrentes: true, calendario: true, notas: true, renda: true, score: false, personalizacao: false, foto: true, relatorios: false, 'minha-assinatura': true },
    desc: 'Tudo do Essencial + metas, objetivos, cartões, assinaturas, contas recorrentes, calendário, notas, calculadora de renda passiva e lançar por foto.'
  },
  patrimonio: {
    label: 'Patrimônio', get preco(){ return precoTexto('patrimonio'); }, cor: 'var(--accent)', dias: null,
    limites: { lancamentos: true, investimentos: true, metas: true, cartoes: true, assinaturas: true, recorrentes: true, calendario: true, notas: true, renda: true, score: true, personalizacao: true, foto: true, relatorios: true, 'minha-assinatura': true },
    desc: 'Tudo do Evolução + saúde do patrimônio, relatórios em PDF, app personalizável e atendimento prioritário.'
  }
};

// Regra única: o plano em uso libera este recurso? (chave de PLANOS_CONFIG.limites)
// "Ver como" vale o plano simulado; a equipe sem simular tem tudo; cliente vale o plano dele.
function planoLibera(chave){
  if(typeof _verComoPlano!=='undefined' && _verComoPlano){
    const cfg = PLANOS_CONFIG[_verComoPlano];
    return !!(cfg && cfg.limites && cfg.limites[chave]);
  }
  if(typeof isEquipe==='function' && isEquipe()) return true;
  // Pagamento pendente ou conta inativa: limites do Gratuito até pagar — igual às regras do banco
  // (antes o app liberava e o banco recusava as gravações, que sumiam ao recarregar)
  const semPagar = ['pendente','inativo'].includes(window._userStatus);
  const plano = semPagar ? 'gratuito' : ((typeof _userPlano!=='undefined' && _userPlano) || 'gratuito');
  const cfg = PLANOS_CONFIG[plano];
  return !!(cfg && cfg.limites && cfg.limites[chave]);
}
