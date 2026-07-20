# Full review — categoria Programação do `packages/studio`

Data: 2026-07-20  
Escopo: categoria guarda-chuva **Programação** — Página e Eventos, Programação/JS, Valores, Matemática, Funções, Objetos e Classes — incluindo toolbox, Blockly, IR, gerador, parser, Ponte, preview, acessibilidade, progressão pedagógica e testes.  
Natureza: review seguido da correção integral dos achados no mesmo ciclo.

## Parecer executivo

A categoria está tecnicamente muito mais madura do que uma toolbox infantil comum: há catálogo central, progressão em três degraus 2D, contratos físicos de encaixe, IR validada, round-trip Blocos ↔ JavaScript, compatibilidade com projetos legados e uma suíte ampla. O núcleo oferece **149 blocos visíveis** e mantém **7 blocos legados ocultos**; após a correção, a distribuição é **25 iniciante-2D, 73 intermediário-2D e 51 avançado-2D**.

O review encontrou dois riscos de alta prioridade antes de considerar o fluxo “fechado”:

1. a proteção de disponibilidade do preview não cobre uma segunda unidade de código criada em tempo de execução pela Ponte;
2. os seletores de listas ainda oferecem nomes fora de escopo e o IR aceita a referência inválida, gerando JavaScript que quebra em runtime.

Também havia duas falhas de produto importantes para o público infantil: contraste insuficiente e ausência de foco visível na navegação da toolbox, além de um perfil iniciante ainda grande e com conceitos de navegador avançados. **Os seis achados abaixo foram corrigidos e verificados.**

## Correções aplicadas

| Achado | Resultado |
|---|---|
| Fronteira do preview | `script-src` deixou de autorizar `data:`/`blob:` genericamente. Cada script produzido pelo Studio usa SHA-256 exato; módulos `data:` também recebem SRI. ESM oficial autoriza somente o entrypoint e, no `esm.sh`, o prefixo do pacote com versão pinada, nunca a origem. |
| Símbolos léxicos | Pickers de listas, classes e funções passaram a respeitar escopo/ramo/ordem e não aceitam texto livre inexistente. A IR valida variáveis, listas, classes e funções antes da geração. |
| Acessibilidade | A categoria Programação ganhou foreground escuro AA sobre todos os tons laranja e foco visível de 3 px, cobertos por unidade e Chromium. |
| Progressão infantil | O vocabulário inicial caiu de 47 para 25 blocos, com orçamento e snapshot exatos. APIs detalhadas de navegador, storage e timers em milissegundos foram movidas ao intermediário. |
| Contrato arquitetural | Inventário, oferta e níveis de Programação ficaram no mesmo contrato exaustivo; a validação de símbolos saiu do schema gigante; níveis duplicados foram removidos dos sets genéricos; bloco visível sem adapter de IR agora falha cedo em vez de sumir. |
| Flake E2E | Abertura do menu e colagem foram centralizadas com espera por hit-test e visibilidade, sem espera arbitrária. |

As seções seguintes preservam a evidência do diagnóstico original. O estado resolvido e os números finais estão nas tabelas acima e em “Verificação executada”.

## Achados priorizados

### P1 — A fronteira de instrumentação do preview não cobre scripts secundários — corrigido

**Evidência**

- `packages/studio/src/preview/csp.ts:67-80` permite os esquemas usados pelos módulos gerados pelo Studio em `script-src`.
- `packages/studio/src/preview/bootstrap.ts:203-223` instrumenta somente o JS canônico antes de transformá-lo em `data:` URL.
- `packages/studio/src/preview/csp.ts:86-96` aplica restrições equivalentes a frames e workers, mas não cobre uma segunda unidade de código no documento principal.
- `packages/studio/e2e/preview-security.spec.ts:21-40` cobre somente um `<script>` dinâmico com `textContent`, que a CSP bloqueia por ser inline.

Uma verificação defensiva e inofensiva no Chromium, usando o `buildPreviewDoc` real, confirmou que essa segunda unidade executa sem atravessar `instrumentLoops`.

**Impacto**

A Ponte é parte do modo clássico usado pela criança. Código colado de uma resposta, tutorial ou colega pode executar fora da barreira criada para limitar trabalho síncrono excessivo. É uma quebra do invariante de disponibilidade do ambiente, mesmo dentro do sandbox de origem.

**Recomendação**

- Adicionar primeiro regressões de browser para cada entrada de execução secundária suportada pelo navegador.
- Tratar todas as entradas de execução como uma única fronteira: código canônico, scripts adicionados pelo DOM e módulos carregados em runtime precisam ser rejeitados ou instrumentados antes de executar.
- Não tratar a permissão por esquema como autorização específica dos módulos gerados pelo Studio.
- Projetar uma autorização específica para os módulos gerados pelo Studio ou um executor isolável/encerrável; apenas ampliar o monkeypatch de um caso tende a deixar outras entradas abertas.

### P1 — Seletores de listas ignoram escopo/ordem e a IR aceita referências inexistentes — corrigido

**Evidência**

- `packages/studio/src/blockly/fields/FieldNamePicker.ts:1229-1251` implementa `collectGroupsAndLists(workspace)` varrendo todos os blocos do workspace, sem receber o bloco consumidor.
- `packages/studio/src/blockly/fields/FieldNamePicker.ts:1387-1401` usa esse coletor global para `kind: 'group'`, enquanto variáveis comuns já usam `collectReadableVariables(block)` e `collectMutableVariables(block)` com contexto.
- `packages/studio/src/blockly/fields/FieldNamePicker.ts:106-108` permite texto livre para todo tipo exceto `mutable-variable`; portanto, um consumidor de lista também aceita um nome inexistente.
- `packages/studio/src/ir/schema.ts:10418-10427` valida apenas referências com `type: 'var'`. Campos `arrayVar` dos tipos de lista não são verificados.

Reprodução executada:

```js
function montarLista() {
  let listaInterna = []
}
listaInterna.push(1)
```

O picker ofereceu `listaInterna` fora da função e `SZIRV2Schema.safeParse(...)` retornou sucesso. O gerador produziu exatamente o código acima, que termina em `ReferenceError`. A mesma família merece auditoria para classes: `collectClassNames` também é global e o gerador aceita `new Heroi()` antes de `class Heroi {}`, que cai na TDZ.

**Impacto**

A criança pode escolher um nome sugerido pela própria interface e ainda assim receber um erro de runtime. Isso corrói a principal promessa pedagógica dos blocos: impedir estados estruturalmente inválidos e produzir feedback antes de executar.

**Recomendação**

- Trocar o coletor por `collectGroupsAndLists(consumerBlock)` e reutilizar o motor já criado para escopo léxico, ordem e ramos.
- Separar metadados de campo em **declaração** e **consumo**; consumidores como lista não devem cair no texto livre por padrão.
- Validar `arrayVar`, referências de classe e referências de função na fronteira da IR, com diagnóstico infantil amigável.
- Cobrir: lista declarada depois do uso, lista em outra função/ramo, nome digitado inexistente e instância antes da classe.

### P2 — Toolbox de Programação falha contraste e foco visível — corrigido

**Evidência**

- `packages/studio/src/styles/studio.css:98-102` remove o `outline` de categoria focada, inclusive `.blocklyActiveFocus`, sem substituição específica.
- `packages/studio/src/styles/studio.css:145-152` força todo rótulo selecionado para branco.
- `packages/studio/src/blockly/theme.ts:80-102` usa oito tons laranja/dourados na categoria. O contraste medido contra branco varia de **1,60:1 a 2,85:1**; o texto tem 15 px, abaixo do tamanho considerado “large text”.
- O WCAG 2.2 exige 4,5:1 para texto normal e um indicador visível para itens operáveis por teclado: [Contrast Minimum](https://www.w3.org/TR/WCAG22/#contrast-minimum) e [Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible).

**Impacto**

O rótulo selecionado pode ficar difícil de ler e um usuário que navega por teclado não consegue identificar com segurança onde está. Isso afeta a navegação primária por todas as subcategorias de Programação.

**Recomendação**

- Usar `:focus-visible` com perímetro sólido de pelo menos 2 px e contraste consistente.
- Para a paleta laranja, usar o foreground escuro já existente (`#1a1410`): os mesmos oito fundos passam a variar de 6,40:1 a 11,43:1.
- Adicionar E2E que percorra as categorias por teclado e teste estilos computados/contraste da seleção.

### P2 — O perfil iniciante ainda expõe vocabulário demais e mistura unidades — corrigido

**Evidência**

O nível `iniciante-2d` oferece 47 blocos da categoria:

- 19 de Página e Eventos;
- 16 de Programação/JS;
- 12 de Valores.

Entre eles estão `contextmenu`, `blur`, três operações de tela cheia, storage, timers em milissegundos e timers equivalentes em segundos. Também há três variantes de console e duas de alerta. A própria filosofia em `packages/studio/src/blockly/blockLevels.ts:8-14` descreve o primeiro degrau como facilitadores mais um kit **essencial** de lógica.

**Impacto**

As subcategorias evitam uma lista única de 47 itens, mas a criança iniciante ainda precisa decidir entre conceitos muito parecidos (`1000 ms` versus `1 segundo`) e eventos de navegador pouco úteis para começar jogos. Isso aumenta erro de escolha e carga cognitiva. `allowBlocks` resolve aulas curadas, mas não o perfil iniciante genérico.

**Recomendação**

- Manter no primeiro degrau clique/toque, teclado, variável, `se`, repetir, temporizador em segundos, comparação e valores básicos.
- Mover milissegundos, `contextmenu`, `blur`, storage e controles detalhados de fullscreen para intermediário.
- Definir um orçamento explícito por subcategoria iniciante e um teste de snapshot do vocabulário, não apenas do nível técnico.
- Fazer teste observacional curto com crianças para validar nomes e ordem; o teste atual garante tooltip presente, não compreensão.

### P3 — O contrato central não eliminou os cinco “god files” do pipeline — corrigido na fronteira de Programação

**Evidência**

Seis arquivos centrais somam **52.824 linhas**:

| Arquivo | Linhas |
|---|---:|
| `blockly/buildIR.ts` | 10.600 |
| `ir/schema.ts` | 11.509 |
| `generators/js.ts` | 8.054 |
| `parsers/js.ts` | 12.546 |
| `blockly/workspaceState.ts` | 8.480 |
| `blockly/fields/FieldNamePicker.ts` | 1.635 |

`programmingContract.ts` centralizou oferta/catálogo, o que é um avanço real. Entretanto, o comportamento de cada bloco ainda precisa ser sincronizado manualmente entre switches e schemas gigantes. `buildIR.ts:10595-10598` ainda degrada bloco desconhecido para warning + descarte, e os `default` de reconstrução podem retornar `null`.

Os testes atuais provam oferta única, instanciação, serialização e build de raízes. Eles não compõem automaticamente, para todos os 149 tipos, definição → Blockly → IR → JS → parser → workspace.

**Impacto**

O custo não é desempenho atual, e sim risco de evolução. O bug de lista é um exemplo: a semântica foi corrigida no coletor de variáveis, mas não atravessou o campo `arrayVar` e a validação da IR.

**Recomendação**

- Evoluir o catálogo para adapters por família: definição, construção de IR, serialização, compilação, parsing e metadados de símbolos no mesmo módulo registrável.
- Dividir `FieldNamePicker` em providers de símbolos por domínio/contexto.
- Criar um teste de matriz por capacidade e um round-trip exaustivo para os blocos representáveis.
- Falhar cedo em desenvolvimento para bloco visível sem adapter, em vez de apenas avisar e ignorar.

### P3 — Helper E2E de colagem é intermitente e reduz confiança na suíte — corrigido

**Evidência**

Na execução conjunta de `smoke`, `behavior-lifecycle` e `reopen-blocks`, 20/21 cenários passaram; o cenário do Composer falhou antes da asserção funcional com “Workspace do Blockly sem ponto vazio”. Repetido três vezes isoladamente, passou duas e falhou uma; uma execução fresca isolada passou.

O helper em `packages/studio/e2e/behavior-lifecycle.spec.ts:24-42` faz um único `elementFromPoint` logo após a troca de aba. A reprodução diagnóstica também mostrou que o menu pode existir no DOM sem estar estável para clique. Nenhum estado do projeto foi perdido.

**Impacto**

É dívida de teste, não evidência de bug de Programação. Ainda assim, flakes tornam regressões reais mais fáceis de ignorar.

**Recomendação**

- Centralizar o helper de contexto do workspace.
- Usar `expect.poll` para obter um ponto atingível e `expect(menu).toBeVisible()` antes do clique.
- Evitar duplicar a mesma rotina de hit-testing em vários specs.

## O que está bem resolvido

- Fonte única da oferta: 149 blocos visíveis sem duplicação e 7 legados ocultos.
- `allowBlocks` unitário oferece cada bloco exatamente uma vez, inclusive categorias dinâmicas.
- Todo bloco visível/legado instancia, serializa e reabre.
- Contratos físicos das cinco Áreas e validação de lifecycle impedem encaixes semanticamente errados.
- Escopo de variáveis comuns, parâmetros, `this`, construtores derivados e eventos está muito melhor coberto.
- Parser/gerador cobrem funções async, Promises, classes, listas, DOM seguro, loops, fetch, valores e source maps aninhados.
- DOM guiado reserva tags/atributos executáveis ao modo avançado e rebaixa importações inseguras para raw code.
- Não foram encontrados `case` duplicados dentro dos switches centrais auditados.
- A progressão 47/51/51 é explícita e o host pode restringir por aula com `allowBlocks`.

## Verificação executada

| Verificação | Resultado |
|---|---|
| `bun test src` | **4.320 passed, 0 failed**, 293 arquivos |
| Testes focados de contrato/nível/pickers/símbolos/pipeline | **250+ passed, 0 failed** nas rodadas focadas |
| `bun run typecheck` | passou (`tsc --noEmit`) |
| `bun run check` | **682 arquivos**, sem erros |
| E2E de segurança do preview | inline dinâmico e módulo externo não autorizado bloqueados |
| E2E de acessibilidade de Programação | foco de 3 px e foreground AA confirmados no Chromium |
| E2E de lifecycle/helper | **9/9** em três repetições consecutivas |
| E2E de Canvas/HTML que reutilizam o helper | **17/17** |
| E2E de preview/galeria 3D | **7/7**, incluindo Three.js, loaders avançados e Mundo 3D |

## Estado final

Os seis itens da ordem recomendada foram implementados. A decomposição física dos grandes módulos genéricos pode continuar incrementalmente, mas a categoria Programação já não duplica progressão, não descarta adapter ausente silenciosamente e possui contratos exaustivos para inventário, oferta, nível, persistência e símbolos.
