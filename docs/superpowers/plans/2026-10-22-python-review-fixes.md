# Correções da revisão Python — Implementation Plan

> **For agentic workers:** Use `executing-plans` task-by-task, with review between lots. The user authorized correction of the reviewed findings and parallel coordination; continue without another approval gate.

**Goal:** Corrigir as falhas demonstradas na revisão e tornar reproduzíveis e honestos os gates de qualificação.

**Architecture:** Preservar runtime e releases imutáveis. Corrigir isolamento nos executores locais, causalidade e critérios nos instrumentos de QA, mensagem no componente Admin e fronteiras nos documentos. Recibos históricos indisponíveis não serão recriados como se fossem execuções novas.

**Tech Stack:** TypeScript, Bun 1.3.11, Playwright, Next, Python/Turtle e builder canônico da distribuição.

**Spec:** `docs/superpowers/plans/2026-10-22-review-continuacao-python.md` (causas e correções aprovadas pelo usuário).

## Global Constraints

- JavaScript continua padrão; preservar os percursos existentes e o seletor Python apenas para administradores.
- Não ler valores de dotenv, mover arquivos ambientais ou alterar chaves/provedores: outra sessão cuida do Railway.
- Testes leves serializados; nenhum serviço, navegador, Docker ou TSC completo durante estes lotes sem admissão de recursos.
- Não alterar bytes de runtime para consertar apenas um instrumento de QA.
- F1: pelo menos 30 amostras por fase, p95 frio ≤ 12.000 ms, cache ≤ 3.000 ms, editado ≤ 1.500 ms.
- F3: 20 turtles, entradas e imagens durante 600.000 ms; frames conforme decisão de dois quadros, pintura p95 ≤ 8 ms, resposta causal p95 ≤ 100 ms.
- Preservar resultados negativos e distinguir diagnóstico, teste focado e aceite integrado.

## Lote 1 — Isolamento e portabilidade da pilha local

**Files:** `scripts/local-studio-stack/{lib,up,setup,python-local}.ts`, entrypoints relacionados, testes e README na mesma pasta.

**Interface:** Uma guarda de preflight compartilhada recusa arquivos dotenv descobertos pelo Bun/Next antes de qualquer escrita ou spawn. O erro contém caminhos, nunca valores. A distribuição padrão deriva de `ROOT` e continua aceitando `--distribution` explícito.

- [x] Criar fixtures temporárias com `.env` sintético e testes que demonstram descoberta pelo Bun e por `@next/env`, sem iniciar servidor.
- [x] Exigir recusa antes de gerar segredos/configuração e antes de executar comandos; cobrir root e cwd de todos os serviços e variantes `.env.*` reconhecidas, sem recusar `.env.example`.
- [x] Desabilitar autoload do Bun nos comandos, manter ambiente filho filtrado e documentar invocação `bun --no-env-file`.
- [x] Remover caminho pessoal fixo; verificar descritor e arquivos antes de escrever configuração local, com erro acionável.
- [x] Executar testes focados, revisar falhas/efeitos, formatar e conferir diff.

## Lote 2 — Medição causal e gates de desempenho

**Files:** `packages/studio/e2e-runtime/gamePerformance.ts`, `python-f3-performance.spec.ts`, spec Space Arena, fixtures/observers de QA e `e2e-python-editor/live-performance.spec.ts`; helpers/testes adjacentes.

**Interfaces:** Métrica causal correlaciona entrada real, tratamento e efeito apresentado correspondente. Cadência de frames permanece separada. Agregador F1 recebe série e identidade da execução e devolve resultado estatístico/razões; aceita somente séries homogêneas com quantidade mínima.

- [x] Testar causalmente que repaints contínuos não aprovam entrada ignorada ou efeito atrasado 500 ms; recusar testemunho ausente, fora de ordem ou de outra entrada.
- [x] Instrumentar apenas fixtures/observers/harness de QA, delegando callbacks originais; conservar algoritmos e pools dos jogos.
- [x] Registrar o efeito efetivamente apresentado antes de medir latência; remover o gate enganoso de segundo repaint arbitrário.
- [x] Testar agregação F1 com 30 amostras, p95 excedido, série curta, identidade misturada e duplicação. Anexar evidência antes de reprovar; diagnóstico não equivale a aceite.
- [x] Tornar 600.000 ms o padrão de aceite F3 e Space, validar overrides e identificar explicitamente janelas menores como diagnóstico.
- [x] Executar testes unitários e descoberta/sintaxe dos specs sem browser; registrar aceite gráfico ainda pendente.

## Lote 3 — Continuidade verificável dos artefatos

**Files:** builder canônico `packages/studio/scripts/build-python-runtime.ts`, scripts/runbook de reprodução e documentos de continuidade.

**Interface:** Reprodução usa fonte versionada e inputs pinados; o resultado só recebe identidade `65c9bffd…` se bytes/descritor corresponderem. Nunca alterar plano histórico para fingir equivalência de caminhos.

- [x] Inventariar inputs e descritor esperado sem executar runtime ou consultar credenciais.
- [x] Preparar comando determinístico em clone novo, reutilizando apenas bytes verificados dos inputs disponíveis.
- [x] Reproduzir serialmente se viável; comparar todos os hashes e disponibilizar comando/artefato remoto verificado conforme autorização existente.
- [x] Se recibos históricos não estiverem disponíveis, registrar essa lacuna e exigir nova execução; não fabricar recibos.

## Lote 4 — Aviso Admin e estado documental

**Files:** `packages/admin/src/components/editor/lesson-manifest-import.tsx`, `packages/admin/tests/lesson-manifest-import.test.ts`, documentos de lacunas/retomada/desempenho pertinentes.

**Interface:** O aviso após vincular reflete o modo atualmente selecionado; seleção e confirmação de substituição continuam explícitas.

- [x] Criar regressão: selecionar substituir, vincular destino, conferir aviso verdadeiro e confirmação ainda exigida; preservar teste do modo padrão.
- [x] Corrigir somente mensagem condicional, sem mudar silenciosamente o modo.
- [x] Atualizar quadro de estado atual: CI no SHA revisado, correções integradas e fronteiras reais ainda abertas de Auth/perfis, banco, mídia, gravação/pausa e Admin→aluno.
- [x] Conciliar contrato de dois quadros e dez minutos com os novos instrumentos sem reclassificar execuções históricas.
- [x] Rodar teste Admin e revisão documental; preservar roteiros/falas pedagógicos.

## Lote 5 — Revisão e integração

- [x] Revisar cada lote contra a reprodução original, procurando bypass, falso positivo e regressão JavaScript.
- [x] Rodar testes focados novos e regressões afetadas, em processos pequenos e seriais; registrar comandos/resultados reais.
- [x] Fazer full review do diff, corrigir achados e conferir formatter/diff/lockfile.
- [ ] Conferir avanço remoto e integrar sem alterações nas chaves da sessão paralela. Commitar lotes revisáveis e atualizar staging de forma consistente, sem disparar tentativas repetidas de implantação.
- [ ] Relatar alterações, evidências e limites restantes de homologação com precisão.
