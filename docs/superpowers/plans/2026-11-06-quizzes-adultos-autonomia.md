# Quizzes adultos de autonomia: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implementar os dois quizzes adultos aprovados, com dez perguntas, resultados personalizados e administração coerente de dados atuais e históricos.

**Architecture:** Um módulo puro `adulto-autonomia` fornece perguntas contextualizadas, validação, redução de respostas e narrativa aos dois funis. A ilha adulta mantém a sessão existente e passa a confirmar escolhas simples e múltiplas. Snapshots e eventos continuam usando a infraestrutura atual; variantes têm chaves próprias e compartilham a posição e o evento da pergunta.

**Tech Stack:** Astro 6, React 19, TypeScript, Zod 4, Bun, PostgreSQL e Playwright, sem dependências novas.

**Spec:** Proposta v2 aprovada em `C:/Users/tocha/Downloads/Proposta Quizzes Adultos/Raciocinio.md`; fontes em `.cache/proposta-quizzes-adultos-20261106/`. Direção permanente: `docs/marketing/pro/posicionamento.md`.

## Global Constraints

- Mote: autonomia para criar e realizar suas ideias. Produto somente no resultado.
- Dez perguntas; Q6 é seleção múltipla, com “nenhuma” exclusiva. Revisão preserva respostas independentes.
- Versões novas: `desafio-autonomia-v2` e `comunidade-autonomia-v2`. Não reescrever leads antigos.
- Manter cookie HttpOnly, revisão otimista, token, validação autoritativa, atribuição, campanha e cupom existentes.
- Manter os quizzes Kids. Sem migração de banco, alteração de preço ou checkout.
- Preservar alterações locais das ofertas adultas aprovadas na etapa anterior.
- Verificação obrigatória: testes, typecheck, Biome, build e navegador com banco local isolado.
- Implementação autorizada; deploy não faz parte deste pedido.

## Task 1: Motor versionado e narrativa fiel

**Files:** criar `src/funnels/adulto-autonomia/{types.ts,questions.json,engine.ts,narrative.ts,entry.ts,index.ts}`; atualizar os dois `quiz/index.ts` e rótulos nos `index.ts` dos funis. Criar `tests/helpers/adulto-autonomia.ts`, `tests/unit/adulto-autonomia.test.ts` e fixtures aprovadas.

**Interfaces:** `ADULT_ENGINES[mode]` expõe `version`, `steps`, `activeSteps(answers)`, `normalize(answers)`, `applyAnswer(answers,key,value)`, `isComplete(answers)` e `computePerfil(answers)`. `createAdultQuiz(mode,legacySteps)` retorna `FunnelQuiz`. `buildNarrative(mode,completeAnswers)` retorna a copy aprovada.

- [x] Extrair a copy e as 32 amostras aprovadas, com variantes próprias por experiência, efeito e conquista. Preservar a redação e não copiar o HTML de demonstração como aplicação.
- [x] Escrever testes para percurso, escolhas múltiplas, versão, invalidação e fidelidade. Casos mínimos:

```ts
expect(engine.applyAnswer(answers, conditionKey, ['nenhuma', 'tempo'])).toBeNull()
expect(engine.applyAnswer(answers, conditionKey, ['ao_vivo', 'livre'])).not.toBeNull()
expect(engine.computePerfil(complete)).toBe('autonomia-compreender')
expect(engine.isComplete({ ...complete, _quiz_version: 'adulto-v1' })).toBe(false)
```

- [x] Implementar resolução contextual com chaves estáveis. Q4/Q5/Q7 dependem de experiência; Q8 também depende do efeito; Q10 tem chave por conquista, inclusive quando o texto coincide. Não aceitar resposta fora do percurso ou antes de perguntas anteriores obrigatórias.
- [x] Rodar `bun test tests/unit/adulto-autonomia.test.ts`, corrigir falhas e atualizar o registro desta tarefa.

## Task 2: Ilha e resultado em produção

**Files:** atualizar `islands/spin-quiz/AdultoConversaQuiz.tsx`, as duas ilhas finas e `styles/quiz-spin.css`; criar configuração compartilhada `islands/spin-quiz/adulto-autonomia-config.ts`; estender `content/resultado-conversa.ts`, criar `components/funnel/resultado/ResultadoAutonomia.astro` e CSS com tokens adultos; atualizar o renderer compartilhado e o layout do quiz para rodapé único.

**Interfaces:** Configuração fornece `defaultTotal: 10`; opções usam `QuizAnswerValue`, `validChoice` e confirmação explícita. Resultado usa um bloco tipado `autonomia`, com CTA pelo caminho existente e `OfferImage`/`OfferImageZoom`.

- [x] Substituir avanço por toque por rádios/checkboxes nativos e botão Continuar. A alternativa neutra desmarca as demais, com mensagem acessível. Não enviar nada até confirmação.
- [x] Preservar retorno, retomada, revisão, conflito entre abas, atualização de versão e estado de erro. Mostrar 1–10 mesmo com variantes ainda não resolvidas.
- [x] Renderizar a narrativa aprovada com destaque, mecanismo, exemplos, imagens reais, condições antecipadas e um rodapé. O CTA mantém atribuição/cupom via SSR.
- [x] Conferir com testes de renderização e `bun run typecheck`.

## Task 3: Admin, snapshots e contrato de API

**Files:** atualizar `analytics/quiz-definition.ts`; testar `server/leads.ts`, `server/admin.ts`, `lib/admin-quiz-answers.ts` e os rótulos registrados; criar `tests/integration/api-adulto-autonomia.test.ts` e ampliar testes de snapshots/admin.

**Interfaces:** Snapshots preservam título e opções integrais de cada variante; `displayPosition` é 1–10 no adulto, com posição analítica correspondente. O Kids mantém sua entrada de posição 0. Perfis novos são `autonomia-*`, antigos em `legacyPerfilLabels`.

- [x] Testar PATCH com revisão correta, revisão obsoleta, chave inativa, array vazio/duplicado/desconhecido e alteração de contexto. Resposta inválida não altera lead nem eventos.
- [x] Testar que uma pergunta com variantes gera um marco na Performance e rótulos distintos em Respostas/Métricas.
- [x] Testar leitura de leads antigos com e sem snapshot. Lista de opções múltiplas deve mostrar todos os rótulos, sem `[object Object]` nem IDs internos.
- [x] Conferir filtros de versão e perfil e rodar os testes do contrato.

## Task 4: Navegador, revisão final e documentação

**Files:** criar `tests/browser/adulto-autonomia.ts`, espelho de copy e relatório em `docs/operations/`; atualizar `packages/funnel/CLAUDE.md` e documentação de marketing.

- [x] Usar PostgreSQL local isolado, app construído e autenticação administrativa sintética local, nos mesmos moldes de `tests/browser/kids-vida.ts`.
- [x] Percorrer os dois quizzes, confirmar exclusividade e combinação de condições, editar respostas independentes/dependentes, recarregar sessão e abrir os 32 resultados.
- [x] Conferir quatro abas do admin (Respostas, Performance, Perfis e Métricas), versão atual/histórica, snapshots e eventos de pergunta.
- [x] Conferir 320/390/768/1440 px, ampliação a 200%, teclado, foco, zoom centralizado, rodapé e atribuição do CTA.
- [x] Executar `bun test`, `bun run typecheck`, `bun run check`, `bun run build`; corrigir achados pertinentes e registrar limites verificáveis.
- [x] Atualizar espelhos e documentação, revisar diff e entregar estado real da implementação sem declarar deploy.

## Registro de conclusão

Implementação local verificada em 06/11/2026. Relatório: `docs/operations/review-quizzes-adultos-2026-11-06.md`.
631 testes aprovados; dois testes opcionais de banco ignorados; typecheck e build aprovados.
Biome executado diretamente pelo entrypoint Node porque o shim local não foi encontrado pelo `bun run check`.
QA adultos: 4 jornadas, 32 resultados, 128 verificações de largura e quatro abas do admin.
Regressão Kids: 6 jornadas, 58 resultados, 232 verificações de largura e quatro abas do admin.
Sem deploy nesta tarefa; alterações anteriores de ofertas adultas preservadas.
