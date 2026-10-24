# Execução de objetivos Python — Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task. Não iniciar agentes de sessões antigas. Este trabalho tem checkout próprio.

**Goal:** Corrigir projetos Python executando a revisão salva no sandbox, com critérios privados no servidor e observações reais de programa e motor gráfico.

**Architecture:** Reutilizar `project-execution.ts` para julgar observações; não criar uma segunda régua de comparação. A autorização e as respostas esperadas pertencem ao Members. O worker Python recebe apenas sondas limitadas. O host gráfico observa o que o renderer efetivamente apresentou. Compilação/AST continuam complementares.

**Tech stack:** TypeScript, Zod 4, Pyodide/CPython já fixados pelo projeto, worker protegido, Playwright no sandbox existente. Não trocar executor nem executar código do aluno no Members.

**Base congelada desta frente:** `7bb81487f34e6824956a17f2eb7d2cd962e275e3`, branch `feat/python-mission-server-execution`. A entrega financeira `c7190ce86` continua independente. Nada deste plano declara homologação de execução já existente.

## 1. Contrato e julgamento confiável

Arquivos: `core/src/learning/project-execution.ts`, novo `python-project-execution.ts`, `core/tests/python-project-execution.test.ts`.

- [x] Compartilhar validação/julgamento preservando o padrão JavaScript; caminhos de módulos Python terminam em `.py` e nomes admitem identificadores Python.
- [x] Separar plano privado de sondas: nunca enviar comparações ou respostas esperadas ao contexto do aluno.
- [x] Vincular evidência a projeto, revisão, runtime, tentativa e impressão das regras; copiar antes do primeiro await e congelar critérios.
- [x] Recusar falta/duplicação/troca de objetivos, casos incompletos, valores ausentes e vereditos fornecidos como se fossem observações.
- [x] Provar a régua com velocidades diferentes coerentes, direção errada, erros e regressão JavaScript.
- [ ] Review final do contrato junto ao protocolo de execução antes de exportá-lo para consumidores.

Esta etapa testa contratos e comparações. Seus dados de observação são fixtures: NÃO comprovam que Python foi executado.

## 2. Observação dentro da execução protegida

Arquivos existentes: `studio/src/runtime/python/{interpreter.py,interpreter.ts,protocol.ts,worker.ts,workerSupervisor.ts,frameProtocol.ts,frame.ts,session.ts}`. Novos módulos focados: `mission-observer.py` e `missionObservation.ts`.

- [ ] Escrever RED com programa que define função mas retorna errado e programa com instrução correta em ramo não executado.
- [ ] Capturar valores por lookup de identificadores e módulos da revisão, sem interpolar expressões do aluno em código do host. Normalização NFKC deve acompanhar CPython.
- [ ] Executar funções com cópias dos argumentos e devolver JSON limitado; expectativas ficam fora. Tratar exceção, coroutine, saída excessiva e timeout.
- [ ] Entregar observações com sequência/identidade da geração. Recusar respostas atrasadas depois de Stop/dispose/revisão nova.
- [ ] Uma geração limpa por cenário; não reaproveitar globais de um caso entre objetivos. Casos de função seguem a semântica explicitamente autorada.

## 3. Gráficos e controles reais

Arquivos: renderers `turtle/renderer.ts`, `pgzero/renderer.ts`, respectivos protocolos e adaptadores oficiais Python; coletor dedicado `missionCollector.ts`.

- [ ] Criar vínculo explícito entre objeto oficial e identidade do item gráfico. Não aceitar um objeto forjado com propriedades x/y como prova de movimento na tela.
- [ ] Ler primitivas do estado aplicado pelo renderer, com frame/generation/errors/paused; baseline sem tecla e ação com keydown/keyup real, clique e espera limitada.
- [ ] Respeitar coordenadas: Turtle tem y positivo para cima; tela/Actor podem ter y positivo para baixo. O critério deve expressar a direção correta no ambiente, sem impor a velocidade do roteiro.
- [ ] Não enviar alvos adaptativos de grupos JavaScript, DOM/texto ou script JavaScript como se fossem critérios Python. Publicação só oferece operações realmente suportadas pelo perfil.
- [ ] Cobrir tecla sem movimento, movimento espontâneo, colisão/pontuação, desenho alternativo, atraso entre modelo e frame e troca de geração.

## 4. Serviço isolado e transporte

Arquivos: `studio-runtime/src/{python-playtest.ts,python-requests.ts,python-inspection-job.ts}`, `core/studio/{python-validation-input.ts,python-validation.ts,python-runtime-client.ts}`, runner dedicado em `studio-runtime/runtime/python-mission.mjs`.

- [ ] Reutilizar materialização verificada e dono do sandbox existente; não duplicar upload ou introduzir servidor Python fora do isolamento.
- [ ] Acrescentar operação e relatório de objetivos ao contrato do job. O runner confiável dirige cada cenário, recolhe evidência e encerra browser/worker/container.
- [ ] Critérios privados não entram em payload.json/worker/frame. Só a resposta autenticada S2S pode chegar ao julgador.
- [ ] Definir orçamento único compatível entre Members/gateway/BFF/runtime antes de ativar; teto de espera não é o prazo total de cold start. Cache/in-flight incluem revisão, critérios, perfil e runtime.
- [ ] Recusa estrutural, erro do programa, indisponibilidade e timeout têm resultados distintos. Executor indisponível nunca vira aprovação por AST nem progresso salvo.
- [ ] Provar cancelamento, limites de CPU/tempo/saída, limpeza e tentativa de rede/escape usando o executor real.

## 5. Objetivos, Admin e progressão

Arquivos: `core/learning/python-project-checks.ts`, `members/application/studio/python-activity-inspection.service.ts`, `members/application/learning/section-progression.service.ts`, autoria de objetivos no Admin e `inspect-python-section-project.ts`.

- [ ] Substituir a conversão exclusivamente estrutural por objetivos Python de estrutura + execução. Não reaproveitar feedback formativo `verifiedBy: client` como autoridade do servidor.
- [ ] Revalidar posse, lease, política de executar, revisão da aula/projeto e curação antes/depois e imediatamente antes de persistir evidência/XP.
- [ ] Admin edita ação/observação/comparação por perfil, configura gabarito e testa pelo mesmo caminho autoritativo usado pelo aluno. Publicação recusa cenário não suportado.
- [ ] Clássico/Pro e blocos/Ponte/fonte usam a mesma revisão e critérios. Não criar compatibilidade para um Python que nunca foi ativado; remover o caminho estrutural substituído quando todos os consumidores forem migrados.
- [ ] Não alterar falas, exemplos, valores ou sequência dos roteiros. Flexibilidade é do verificador.

## 6. Qualificação e integração

- [ ] Rodar testes causais reais: programas com a mesma estrutura e comportamentos opostos; função errada; ramo morto; controles, colisões, score, exceção, loop infinito, excesso de saída e relatório adulterado.
- [ ] Medir cold/warm, memória, custo de transferência e limpeza. Agrupar materialização imutável sem compartilhar estado executável entre cenários. Não declarar meta de desempenho cumprida sem medição.
- [ ] Admin/aluno reais, publicação/ensaio/conclusão, permissões revogadas, stale, Clássico/Pro e regressão JavaScript.
- [ ] Gerar distribuição e fingerprint pelo pipeline canônico; revisar artefatos, full review, corrigir achados, commit/integrar staging, CI e implantação. Não alterar a onda financeira em andamento para incluir trabalho incompleto.

## Comandos leves desta etapa

```powershell
bun test packages/core/tests/python-project-execution.test.ts packages/core/tests/project-execution.test.ts
bunx biome check packages/core/src/learning/python-project-execution.ts packages/core/src/learning/project-execution.ts packages/core/tests/python-project-execution.test.ts
node --max-old-space-size=768 node_modules/.bun/typescript@5.9.3/node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target es2022 --module esnext --moduleResolution bundler --types bun packages/core/tests/python-project-execution.test.ts
```

Esses comandos qualificam só o contrato novo e sua dependência compartilhada. A suíte integrada e a execução de Python da etapa 6 continuam obrigatórias.
