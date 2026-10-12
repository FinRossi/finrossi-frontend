// planos/18-regras-planos.js — carregado pelo index.html em ordem numérica. Não mude a ordem sem revisar.
// ─── PREVIEW DE PLANOS ────────────────────────────────────────────────────────
const PLANOS_CONFIG = {
  gratuito: {
    label: 'Gratuito', preco: 'R$ 0', cor: 'var(--muted)', dias: 30,
    limites: { lancamentos: 20, investimentos: false, metas: false, cartoes: false, assinaturas: false, recorrentes: false, calendario: false, notas: false, renda: false, score: false, personalizacao: false, 'minha-assinatura': true },
    edicao: 'nenhuma',
    desc: 'Acesso por 30 dias com até 20 lançamentos. Sem investimentos, metas ou controles avançados.'
  },
  essencial: {
    label: 'Essencial', preco: 'R$ 9,90/mês', cor: 'var(--blue)', dias: null,
    limites: { lancamentos: true, investimentos: true, metas: false, cartoes: false, assinaturas: false, recorrentes: false, calendario: false, notas: false, renda: false, score: false, personalizacao: false, 'minha-assinatura': true },
    edicao: 'visualizacao',
    desc: 'O básico não deveria ser limitado: lançamentos ilimitados, gráficos e investimentos simples.'
  },
  evolucao: {
    label: 'Evolução', preco: 'R$ 24,90/mês', cor: 'var(--green)', dias: null,
    limites: { lancamentos: true, investimentos: true, metas: true, cartoes: true, assinaturas: true, recorrentes: true, calendario: true, notas: true, renda: false, score: false, personalizacao: false, 'minha-assinatura': true },
    edicao: 'observacao',
    desc: 'Tudo do Essencial + personalização: dashboard editável, temas, cores e categorias personalizadas.'
  },
  patrimonio: {
    label: 'Patrimônio', preco: 'R$ 49,90/mês', cor: 'var(--accent)', dias: null,
    limites: { lancamentos: true, investimentos: true, metas: true, cartoes: true, assinaturas: true, recorrentes: true, calendario: true, notas: true, renda: true, score: true, personalizacao: true, 'minha-assinatura': true },
    edicao: 'completa',
    desc: 'Tudo do Evolução + inteligência financeira: score de saúde, insights e projeções futuras.'
  }
};

