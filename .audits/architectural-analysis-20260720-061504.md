# Full review — divisão de Comportamento em três áreas

> **Registro histórico.** Este arquivo preserva o diagnóstico levantado no
> início da revisão. Os achados foram corrigidos e a situação vigente está em
> [behavior-lifecycle-review/fixes-report.md](behavior-lifecycle-review/fixes-report.md),
> incluindo a revisão de consistência de 20/07/2026.

Data: 20/07/2026  
Escopo: `packages/studio`, todas as categorias do núcleo, as cinco extensões oficiais, IR, Blockly, Bridge, runtime, migração, IA, exemplos e documentação.

## Resumo executivo

A divisão funcional está correta no catálogo atual. Não foi encontrado bloco oficial visível encaminhado para uma área incompatível. Os 67 exemplos oficiais já usam IR v2, os blocos antigos continuam disponíveis somente para migração, e geração, round-trip, runtime e E2E passaram.

O principal achado é arquitetural: o registro único de posicionamento descrito no design ainda não é realmente a fonte única. A maioria dos blocos executáveis não declara `placement`; Blockly, toolbox e IR mantêm classificadores paralelos. Isso não quebrou o catálogo atual, mas permite que um bloco futuro seja classificado de forma semanticamente errada e ainda passe nos testes se todos os fallbacks concordarem no mesmo default.

### Inventário auditado

| Catálogo | Definições | Raízes `start` | Raízes `events` | Raízes `loops` |
| --- | ---: | ---: | ---: | ---: |
| Núcleo | 383 | 170 | 19 | 3 |
| Jogo 2D | 190 | 139 | 4 | 3 |
| Jogo 2D Avançado | 337 | 235 | 13 | 4 |
| Jogo 3D | 118 | 91 | 0 | 1 |
| Jogo 3D Avançado | 130 | 94 | 7 | 2 |
| Mundo 3D | 137 | 103 | 15 | 1 |
| **Total** | **1.295** | **832** | **58** | **14** |

Entre 920 definições executáveis, apenas 208 possuem `definition.placement` explícito; 712 (77,4%) dependem de inferência, conjuntos manuais ou defaults. Há ainda 16 blocos executáveis válidos apenas em corpos aninhados, por isso a soma das raízes é 904.

## Achados

### F1 — Alto — O contrato central não é a fonte única prometida

**Evidência**

- O design exige que todo bloco executável declare posicionamento e que o registro alimente Blockly, toolbox, schema, migração e compilação (`docs/plans/2026-07-19-project-behavior-lifecycle-design.md:96-138`).
- `placement` continua opcional em `packages/studio/src/blockly/blocks/types.ts:67`.
- `blockContracts.ts` infere eventos por nome/regex e mantém listas próprias de loops, boots e declarações (`packages/studio/src/blockly/blockContracts.ts:118-169`, `204-225`, `313-337`). Um statement genérico sem metadado cai por default em `start` e em todos os corpos (`333-336`).
- A toolbox mantém sua própria lista `EVENT_LISTENER_TYPES` e sua própria ordem (`packages/studio/src/blockly/toolbox.ts:40-97`), precisamente a lista que o design dizia substituir.
- A IR repete listas independentes de loops, preparações exclusivas e eventos (`packages/studio/src/ir/lifecycle.ts:8-34`, `36-237`, `245-273`).
- O teste de cobertura confirma que um contrato pode ser inferido, mas não exige `definition.placement` explícito (`packages/studio/src/blockly/__tests__/blockContracts.test.ts:37-45`).

**Impacto**

Um novo evento com nome fora das regexes pode cair silenciosamente em `Ao iniciar`. Um novo criador de recurso sem entrada nas duas listas de “start-only” pode ser aceito dentro de evento/loop. Se Blockly e IR adotarem o mesmo default errado, a prova atual definição → Blockly → IR → área continua verde. Para um produto infantil, isso vira uma regra invisível e difícil de explicar.

**Recomendação**

1. Tornar `placement` obrigatório para toda definição executável, com tipo discriminado para statement, reporter, HTML e CSS.
2. Guardar no mesmo registro a relação bloco Blockly ↔ tipo IR, área, contextos, papel, fase, migração e seção da toolbox.
3. Derivar desse registro `EVENT_LISTENER_TYPES`, raízes de loop, restrições start-only e tabelas de migração; remover os classificadores paralelos.
4. Fazer o teste falhar quando um executável não possui metadado declarado, em vez de aceitar inferência.

### F2 — Médio — Projetos novos ainda nascem e são persistidos no IR legado

**Evidência**

- O contrato da IR afirma que projetos novos usam somente `version: 2` + `behavior` (`packages/studio/src/ir/schema.ts:9948-9959`).
- `createEmptyProject` cria `{ html, css, js, extensions }`, sem `version` e sem as três áreas (`packages/studio/src/core/project.ts:645-666`). A execução direta confirmou esse valor.
- `createProject` persiste esse snapshot imediatamente (`packages/studio/src/state/projectStore.ts:2914-2917`).
- A sanitização aceita a união e devolve o formato recebido sem normalizar (`packages/studio/src/state/projectStore.ts:1822-1840`, `1876-1881`). A migração do snapshot só normaliza projetos antigos que possuam `sz_frame_behavior`, portanto o projeto vazio não entra nela (`packages/studio/src/projects/compatibility.ts:19-25`).

**Impacto**

Não há diferença visual enquanto o projeto está vazio, e os consumidores críticos chamam `normalizeSZIR`. Mesmo assim, a API pública, o IndexedDB e callbacks do host podem observar um projeto recém-criado com `js`, contrariando a representação canônica e prolongando indefinidamente o caminho legado para dados novos.

**Recomendação**

Criar o projeto vazio diretamente como `SZIRV2`, adicionar teste explícito em `createEmptyProject`/`createProject` e normalizar snapshots legados na fronteira de persistência, preservando a exceção deliberada da Ponte quando os arquivos são a fonte de verdade.

### F3 — Médio — A orientação da IA do núcleo não ensina as três áreas

**Evidência**

- O prompt-base explica modos e tecnologias, mas não cita nenhuma das três áreas nem sua regra pedagógica (`packages/studio/src/ai/prompts.ts:52-58`, `78-89`). Uma execução de `buildSystemPrompt({ mode: 'blocks' })` confirmou a ausência dos três rótulos canônicos.
- A guarda existente verifica somente documentação e contexto de IA das extensões (`packages/studio/src/blockly/__tests__/blockContracts.test.ts:25-35`). Todas as cinco extensões passam; projetos apenas com o núcleo não recebem a mesma orientação.
- O contrato dormente `convertIdeaToBlocks` ainda promete `SZIR` legado e os dois providers retornam `js: []` (`packages/studio/src/ai/contracts.ts:61`, `src/ai/mockProvider.ts:70-72`, `src/ai/providers/openRouterProvider.ts:415-422`). Não há consumidor atual desse método, o que limita o impacto presente, mas deixa a futura ativação no formato errado.

**Impacto**

Em projetos sem extensão, o assistente pode sugerir o bloco certo sem explicar em qual área ele deve entrar — justamente o conceito novo que a criança precisa aprender. A futura conversão de ideia para blocos também reintroduziria a estrutura antiga.

**Recomendação**

Adicionar ao prompt-base uma explicação curta e infantil das três áreas, exigir os rótulos no teste do prompt do núcleo e mudar `convertIdeaToBlocks` para `SZIRV2` antes de torná-lo utilizável.

### F4 — Baixo — A documentação corrente ainda contém terminologia e números antigos

**Evidência**

- `packages/studio/CLAUDE.md:338` diz que `Áreas do projeto` contém “os 3 blocos-container”; hoje são cinco.
- Comentários ativos ainda falam em uma única área ou em três frames: `src/core/project.ts:661-663`, `src/state/projectStore.ts:384-390`, `src/components/blocks/BlocklyPanel.tsx:806-809`, `src/generators/js.ts:378-381` e `src/modes/BridgeMode.tsx:355`.
- O documento de design permanece apenas como “aprovado” e apresenta o estado anterior como “Estado atual” (`docs/plans/2026-07-19-project-behavior-lifecycle-design.md:3-25`), sem marcar a implementação concluída ou os itens ainda pendentes.
- `CLAUDE.md` usa “HOJE” para versões antigas de Jogo 2D e Jogo 2D Avançado (`454`, `502`); os manifests atuais são, respectivamente, `0.30.0` e `0.43.0` (`src/official-extensions/game-2d/manifest.ts:22`, `game-2d-advanced/manifest.ts:8`).

**Impacto**

Não altera o runtime, mas aumenta a chance de uma manutenção futura restaurar conceitos antigos ou interpretar o plano como ainda não implementado.

**Recomendação**

Atualizar os comentários e o guia corrente, marcar claramente no design o que é contexto histórico e o que foi implementado, e substituir referências “hoje” por versões datadas ou remover versões voláteis da documentação arquitetural.

## O que está correto

- As cinco áreas existem, são opcionais e únicas; eventos e loops possuem bocas físicas incompatíveis entre si.
- Todos os 58 eventos-raiz e 14 loops-raiz visíveis foram materializados e convertidos para a área esperada.
- Comandos de preparação start-only são recusados em corpos de eventos/loops, inclusive recursos do Canvas 3D.
- Os blocos legados de início, boot e comportamento continuam registrados para migração, mas não aparecem nas paletas.
- As cinco extensões oficiais possuem adapter de lifecycle e documentação/AI com os três rótulos canônicos.
- Os 67 exemplos oficiais estão em IR v2 e passam schema, workspace e round-trip.
- A pesquisa histórica `packages/studio/docs/blocos-pesquisa-makecode-scratch.md` contém termos antigos, mas os identifica explicitamente como históricos e aponta para o design novo; não foi tratada como drift acidental.

## Verificação executada

- Suíte direcionada de contratos/lifecycle/extensões: **1.167 testes, 0 falhas**.
- Suíte completa de `packages/studio`: **4.218 testes, 0 falhas**.
- `bun run typecheck`: passou.
- `bun run check`: 665 arquivos verificados, sem alterações.
- `playwright test e2e/behavior-lifecycle.spec.ts`: **3 testes Chromium, 0 falhas**.

## Ordem sugerida de correção

1. F1 — tornar o contrato de placement realmente declarativo e único.
2. F2 — fazer projetos novos nascerem em IR v2.
3. F3 — atualizar prompt e contrato de IA do núcleo.
4. F4 — limpar documentação e comentários legados.
