# FinRossi — Frontend

Site e app publicados em **finrossi.com.br** (GitHub Pages, sem etapa de build).

## Estrutura

```
index.html                  App (HTML das telas + tags que carregam CSS/JS)
landing.html                Página de vendas / planos
legal/                      Termos, privacidade, LGPD, cookies, contrato
css/                        Estilos do app (01 → 04, a ordem afeta a cascata)
js/firebase-init.js         Conexão com Firebase + login automático (module)
js/app/                     Código usado por todos os planos
planos/18-regras-planos.js  PLANOS_CONFIG — o que cada plano libera
planos/essencial/           Investimentos
planos/evolucao/            Metas, objetivos, recorrentes, calendário, notas, assinaturas, cartões
planos/patrimonio/          Renda passiva + patrimonio.js (score, insights, desafios, projeções, personalização)
sw.js / manifest.json       PWA
```

## Regras para não quebrar

1. **O número no nome do arquivo é a ordem de carregamento** (01 → 33), mesmo entre pastas diferentes.
   O `index.html` carrega na mesma ordem. Ao criar um arquivo novo, encaixe o número e a tag `<script>` na posição certa.
2. Todos os arquivos de `js/app/` e `planos/` são scripts comuns (não-module) e compartilham o mesmo escopo global —
   funções chamadas pelo HTML (`onclick="..."`) precisam continuar globais.
3. Código que roda **na hora** (fora de função ou evento) só pode usar o que foi declarado em arquivos de número **menor**.
   A inicialização fica em `js/app/33-pwa-init.js`, por isso ele é o último.
4. Separar por pasta é organização: quem bloqueia acesso é `PLANOS_CONFIG` + `verComoPlanoPermite()` (`js/app/27-ver-como.js`).
5. Ao alterar um CSS/JS, aumente o `?v=` da tag no `index.html` para os navegadores baixarem a versão nova.
