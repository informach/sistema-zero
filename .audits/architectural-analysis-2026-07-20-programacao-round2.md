# Full review round 2 — categoria Programação do `packages/studio`

Data: 2026-07-20  
Snapshot: `e75993d`, com alterações locais concorrentes preservadas  
Escopo: toolbox Programação, blocos, níveis, pickers, Blockly → IR → JavaScript → parser → Blockly, Ponte, preview, responsividade, acessibilidade, pedagogia e cobertura automatizada.  
Natureza: auditoria somente; nenhum código de produção foi alterado.

## Parecer executivo

A categoria está forte no desktop e no núcleo de compilação: os **149 blocos visíveis** têm inventário único, nível explícito, contrato de persistência e matriz ponta a ponta. Há **7 blocos legados ocultos** apenas para compatibilidade. A progressão atual é **25 iniciante, 73 intermediário e 51 avançado**, com um primeiro degrau bem mais controlado que o catálogo completo.

O parecer, porém, é **não aprovar a experiência em celular ainda**. Foram reproduzidos dois bugs abertos:

1. **P1 / alto:** ao expandir Programação em 375 × 812, o flyout é renderizado abaixo da viewport e fica recortado; a criança não alcança os blocos.
2. **P2 / médio:** largura/altura do canvas sugerem qualquer variável como pincel, mas a IR rejeita a opção sugerida se ela não veio de “Preparar tela de desenho”.

No desktop, a navegação, foco, contraste, preview e reabertura se comportaram bem. O maior risco de manutenção continua sendo estrutural: seis arquivos centrais somam **51.774 linhas** e distribuem o contrato de um bloco por milhares de ramos manuais. Essa contagem já incorpora a extração concorrente de codecs web observada durante a revisão.

## Resultado por área

| Área | Estado | Evidência |
|---|---|---|
| Inventário e níveis | Passou | 149 visíveis, 7 compatíveis; 25/73/51; sem tipo visível duplicado |
| Blockly → IR → JS → parser | Passou | matriz dos 149 tipos e matriz extra de 168 variantes de dropdown |
| Persistência e reabertura | Passou | serialização unitária e quatro fluxos E2E de reload/lista/layout |
| Segurança do preview | Passou | handlers instrumentados; scripts inline e externos dinâmicos bloqueados |
| Desktop e teclado | Passou | foco visível, contraste AA e flyout utilizável em 1280 × 720 |
| Celular | Falhou | flyout de Eventos em `y=957` numa viewport que termina em `y=812` |
| Sugestões semânticas | Falhou | picker oferece `pontos`; schema responde “pincel ainda não foi preparado” |
| Arquitetura | Atenção | contrato central bom, mas pipeline ainda monolítico e parser usa AST com `any` |
| Gates do pacote | Falhou | build e 4.611 testes passaram; check e typecheck globais estão vermelhos por mudanças concorrentes |

## Achados priorizados

### P1 — A categoria Programação fica sem blocos no celular

**Evidência**

- `packages/studio/src/components/blocks/BlocklyPanel.tsx:70-73` ativa o layout horizontal no modo compacto.
- `packages/studio/src/components/blocks/BlocklyPanel.tsx:876-880` decide esse modo apenas por largura.
- `packages/studio/src/blockly/toolbox.ts:294-414` monta a árvore aninhada de Programação.
- Em 375 × 812, a `.injectionDiv` tem 716 px e `overflow: hidden`; a toolbox expandida chega a 861 px; o flyout de Eventos começa em `y=957`, apesar de conter 18 blocos.
- Evidência visual: `packages/studio/.audits/programacao-full-review-round2/screenshots/programacao-mobile.png`.
- Reprodução automatizada: `packages/studio/.audits/programacao-full-review-round2/repro/mobile-toolbox.mjs`.

**Impacto**

A criança consegue selecionar uma subcategoria, mas não consegue escolher ou arrastar um bloco. É bloqueio do fluxo principal, não apenas problema visual.

**Recomendação**

Criar uma navegação compacta própria para subcategorias — drill-down com ação de voltar é a opção mais previsível — ou conter a árvore em uma área rolável que não desloque o flyout. Adicionar E2E em 375 × 812 que prove que o primeiro bloco do flyout está dentro da viewport e é interagível.

Issue completo: `packages/studio/.audits/programacao-full-review-round2/qa/issues/BUG-001-mobile-toolbox.md`.

### P2 — O picker do canvas contradiz a validação semântica

**Evidência**

- `packages/studio/src/blockly/blocks/values.ts:206-216` usa `kind: 'variable'` em largura e altura do canvas.
- `packages/studio/src/blockly/fields/FieldNamePicker.ts:1431-1434` traduz esse kind em todas as variáveis legíveis.
- `packages/studio/src/ir/programmingReferences.ts:312-314` aceita nesses comandos apenas símbolos registrados como contexto de canvas.
- A reprodução criou `pontos` e `pincel`; o picker ofereceu ambos. Selecionar `pontos` fez `SZIRV2Schema.safeParse` falhar com a mensagem “O pincel ‘pontos’ ainda não foi preparado”.
- Há 43 campos `CTX` com o mesmo kind no Studio; dois deles estão diretamente na categoria Programação.

**Impacto**

A interface orienta a criança para uma escolha que a própria aplicação considera inválida. A validação evita JavaScript quebrado, mas o erro nasce de uma sugestão oficial da UI.

**Recomendação**

Introduzir um `NameKind` escopado para contextos de canvas, alimentado somente por `sz_canvas_setup.CTX`, e aplicá-lo a todos os consumidores. Cobrir variável comum, contexto válido, declaração posterior e escopo.

Issue completo: `packages/studio/.audits/programacao-full-review-round2/qa/issues/BUG-002-canvas-context-picker.md`.

### P3 — O pipeline continua concentrado em seis módulos gigantes

| Arquivo | Linhas | Ramos `case` |
|---|---:|---:|
| `blockly/buildIR.ts` | 9.825 | 1.195 |
| `blockly/workspaceState.ts` | 8.260 | 1.137 |
| `blockly/fields/FieldNamePicker.ts` | 1.679 | 47 |
| `ir/schema.ts` | 11.286 | 7 |
| `generators/js.ts` | 8.050 | 1.996 |
| `parsers/js.ts` | 12.674 | 1.009 |

`programmingContract.ts` é uma boa fronteira para inventário, níveis e oferta. Ainda assim, adicionar um conceito exige coordenar definição, IR, reconstrução, geração, parsing e símbolos em módulos separados. `parsers/js.ts:103` ainda reduz toda a AST Babel a `type Node = any`, removendo uma barreira importante de compilação.

**Recomendação**

Migrar gradualmente por família para adapters registráveis que co-localizem metadados e transformações. Começar pelos contextos de canvas é uma fatia pequena que também resolve o P2. Não há justificativa para uma reescrita total.

### P3 — Pequenas pendências de higiene e formulário

- `packages/studio/src/blockly/fields/FieldNamePicker.ts:1631-1637` cria o input livre com `aria-label` e `spellcheck=false`, mas sem `name` e `autocomplete="off"`; isso diverge das [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines) e pode permitir autofill indevido no portal do Blockly.
- `packages/studio/src/ir/programmingExecution.ts:57` exporta `programmingBodyTiming`, embora o único uso encontrado esteja no próprio arquivo (`:219`). É API pública desnecessária, não código morto funcional.

## Pedagogia e conteúdo

O desenho pedagógico está coerente:

- o iniciante recebe um orçamento fixo de 25 peças para eventos, variáveis, condição, repetição, temporizador em segundos, valores e observação;
- conceitos com alta carga incidental — Promise, `await`, fetch, classes, reflexão sobre propriedades e APIs detalhadas do navegador — ficam fora do primeiro degrau;
- as subcategorias usam verbos e ícones consistentes, e tooltips são obrigatórios por contrato;
- `allowBlocks` permite que cada aula reduza o vocabulário sem duplicar oferta.

O ponto a validar com crianças reais é o salto de 25 para 73 blocos no intermediário. A arquitetura suporta curadoria por aula, mas testes automatizados só provam presença, nível e copy mínima; não provam compreensão, tempo para achar um bloco nem qualidade de transferência para JavaScript textual.

## Duplicação, compatibilidade e código morto

- Nenhum dos 149 tipos públicos aparece duplicado no inventário.
- Os 7 tipos ocultos são compatibilidade deliberada e têm teste de reabertura; não devem ser classificados como mortos.
- O contrato central eliminou duplicação de catálogo/nível na categoria, mas a lógica operacional ainda é repetida como ramos distribuídos no pipeline.
- Não foi encontrada duplicação exata de implementação que justificasse remoção imediata. A prioridade arquitetural é co-localização incremental, não deduplicação cosmética.

## Verificação executada

- `bun run typecheck`: falhou no snapshot final com 3 incompatibilidades `number | Timeout` em `src/extensions/projectRunContext.ts:131-143`, introduzidas por trabalho concorrente.
- `bun run --bun vite build --config playground/vite.config.ts`: passou; 1.464 módulos; warning global de chunks acima de 500 kB; maior chunk de aplicação com 4.790,50 kB, gzip 1.244,89 kB.
- `bun test src`: **4.611 passaram, 0 falharam**, 43.752 asserts em 299 arquivos.
- E2E de Programação/preview/smoke/lifecycle/reabertura: uma rodada anterior passou **27/27**; no snapshot final, **26/27** e o único timeout de preview passou **3/3** quando repetido isoladamente, caracterizando flake de teste e não regressão reproduzível.
- Matriz de 149 blocos visíveis: passou no pipeline completo.
- Matriz exploratória de 168 combinações de dropdown: passou em schema, round-trip, parser sem `rawJS` e ponto fixo canônico.
- Desktop 1280 × 720: passou visualmente e sem overflow horizontal.
- Mobile 375 × 812: falhou conforme BUG-001.
- `bun run check`: vermelho no worktree concorrente, com 10 erros no run final. Os artefatos desta auditoria passam `biome check` isoladamente; os erros restantes estão em mudanças externas já presentes/em andamento.

Relatório operacional completo: `packages/studio/.audits/programacao-full-review-round2/qa/verification-report.md`.

## Ordem recomendada

1. Corrigir o layout compacto e adicionar o E2E mobile bloqueante.
2. Criar o kind `canvas-context` e cobrir todos os 43 consumidores.
3. Depois de estabilizar o worktree paralelo, restaurar `bun run check` verde.
4. Usar o conserto do contexto de canvas como primeira extração para adapters por família.
5. Conduzir uma sessão curta com crianças para medir descoberta no nível intermediário.
