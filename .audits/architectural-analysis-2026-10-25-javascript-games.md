# Full review — extensões JavaScript de jogos

Data: 25/10/2026. Base da revisão inicial: `c1026e6687bb4aabe5cc187b1123c8920307949c`
contra o workspace da implementação aprovada.
Escopo: **183 arquivos**, sendo 147 modificados e 36 novos, antes deste relatório.
Os exemplos do catálogo também somam 183, mas são uma contagem independente.

## Correções posteriores à revisão

Solicitadas em 25/10/2026, incluindo commit e merge em `staging` local.

- [x] R1: `BlocklyPanel` transmite os IDs instalados à toolbox. Os cinco motores
  mantêm a política visual mesmo sem categoria visível; a inferência por categoria
  permanece compatível com os chamadores anteriores.
- [x] R2: a fonte autoral usa os modos `automatico`, `uma-vez` e `imagem`. I mantém
  a imagem ao andar; Espaço retorna à animação e R restaura a partida. Receitas e
  índice foram regenerados. O E2E de exportação confere pixels da imagem fixa
  após I e após quadros adicionais, além do teste com o runtime real.
- [x] R3: callbacks com nome local ficam preservados pelo parser geral. Os testes
  executam os callbacks reconstruídos e conferem sua identidade nos dois hooks.
- [x] R4: o provider detalhado recebe a política compartilhada no início. A receita
  de Canvas manual foi removida e sua ausência é protegida por regressão.

Os nove casos novos falharam antes das mudanças e os 48 testes direcionados
passaram depois. Os seis E2Es passaram com a conferência visual reforçada.
A suíte completa após as correções aprovou **10.969 testes**, sem falhas, em
147 grupos; permanecem quatro skips de configuração do executor de objetivos.
Os manifestos tiveram 39/39 aprovações, os seis E2Es passaram em 27,2 segundos
e o Biome conferiu 178 arquivos sem erros. A guarda do texto longo foi mantida:
a política compartilhada é composta fora do literal, sem ampliar sua allowlist.
Os typechecks de Studio, Members e Member Shell também passaram nesta rodada.
Os logs finais estão em `packages/studio/.cache/game-review-fixes-*`.

## Resultado da revisão inicial

Dois defeitos novos de comportamento precisam de correção: o filtro de ferramentas
visuais depende da categoria estar visível, e a troca de imagem da receita do Pinta
é desfeita pelo próprio loop. Não identifiquei achados P0/P1 nas alterações.

Também confirmei uma falha anterior da Ponte que o relatório da implementação
afirma ter resolvido, e uma orientação residual de Canvas no contexto detalhado.
A revisão não alterou código de produção, fontes de exemplos ou testes permanentes.
As reproduções adicionais estão em `.cache`, separadas da suíte oficial.

## R1 — P2: esconder a categoria reabre ferramentas visuais manuais

**Referência:** `packages/studio/src/blockly/toolbox.ts:343–349`.
**Integração:** `packages/studio/src/components/blocks/BlocklyPanel.tsx:437–451`.
**Confiança:** alta. **Origem:** lógica nova desta implementação.

`extensionVisuals` é calculado pelos blocos de `extraCategories`. O chamador já
filtrou essas categorias por nível. Portanto, a ausência de uma categoria na
paleta é interpretada como ausência da extensão no projeto.

Reprodução: projeto vazio com Jogo 2D Avançado instalado, perfil `iniciante-2d`,
`currentBlockTypes: []`, sem allowlist. Aplicar o filtro real de `BlocklyPanel`
produz zero categorias extras. `buildCoreToolbox` volta a oferecer
`sz_html_h1`, `sz_html_p`, `sz_html_div`, `sz_html_image` e ferramentas CSS.
Isso pode ocorrer depois de instalar a extensão com o avançado revelado e voltar
ao perfil inferior, antes de criar blocos. A instalação não insere blocos por si
só (`projectStore.ts:1138`). A mesma dependência existe para as extensões 3D.

O contrato pedido é por extensão **instalada**, independentemente da curadoria
de nível. A extensão continua no documento e seu runtime continua instalado.

**Correção recomendada:** transmitir os IDs instalados, ou uma política visual
derivada deles, ao construtor da toolbox. Usar categorias somente para decidir
o que mostrar. Cobrir a transição de perfil e o projeto vazio com uma extensão
instalada cuja categoria esteja escondida. Os testes novos atuais sempre passam
a categoria completa, por isso não alcançam esse caminho do chamador.

## R2 — P2: a tecla I da receita do Pinta não mantém a imagem escolhida

**Referência:** `packages/studio/src/official-extensions/game-2d/recipeSources.ts:129–138`.
**Confiança:** alta. **Origem:** receita nova desta implementação.

O evento I executa `setImage` e define `animando = false`. No quadro seguinte,
o ramo `else` chama `autoAnimate`. Os estados `parado` e `andando` ainda estão
registrados; `setImage` zerou `_animState`, então `autoAnimate` aplica novamente
a folha `folha-receita`. O desenho da imagem fixa não permanece no quadro.

Reprodução com o runtime real e o `exampleHarness` existente:

```text
primeiro quadro: animação por estado ativa
pressionar i: animationCancelled = true
próximo quadro: animationCancelled = false; sheet = folha-receita
esperado: a imagem escolhida por I permanece em uso
```

A reprodução adicional falhou de forma determinística: `0 pass / 1 fail`.
O problema pertence à composição da receita: o motor faz o que os dois comandos
pedem. Mudar a semântica geral de `autoAnimate` seria corrigir o lugar errado.

**Correção recomendada:** representar explicitamente o modo de imagem fixa e
não reaplicar a animação automática enquanto esse modo estiver ativo. Definir
como Espaço e R retornam à animação e à partida inicial. Regenerar a IR e o índice.

O teste de receita atual verifica setas, Espaço e R, mas não I
(`__tests__/recipes.test.ts:123`). O E2E de exportação pressiona I e logo R, sem
verificar um quadro intermediário (`e2e/export-2d-extensions.spec.ts:96`).

## R3 — P2: callbacks nomeados ainda perdem o vínculo local na Ponte

**Referência:** `packages/studio/src/official-extensions/game-2d-advanced/campaignParserCodec.ts:24–32,193–199`.
**Afirmação incorreta:** `packages/studio/docs/2d-extensions-review-2026-10-25.md:65`.
**Confiança:** alta. **Origem:** falha pré-existente; não é uma regressão introduzida
pelo diff. A declaração de que ela foi corrigida é nova.

A nova proteção recusa `async` e geradores, mas aceita `FunctionExpression` com
`id`. `onFixedUpdate` e `onCampaignEvent` guardam somente parâmetros/corpo e o
gerador devolve uma arrow sem o nome local da função.

```javascript
// Antes da Ponte: imprime "function".
SZGameKit.onFixedUpdate(function volta(dt, passo) {
  console.log(typeof volta);
});

// Depois da Ponte: imprime "undefined".
SZGameKit.onFixedUpdate((dt, passo) => {
  console.log(typeof volta);
});
```

Uma autorreferência real pode lançar `ReferenceError` ou alcançar um global
homônimo. Conferi o mesmo caminho no `HEAD`: o defeito já existia.

**Correção recomendada:** preservar a chamada inteira quando o callback tem um
nome local que a IR não representa, como a proteção já feita no `defineShape`
básico. Acrescentar testes de execução com autorreferência para os dois hooks.
Até isso acontecer, o relatório precisa limitar sua afirmação à proteção de
`async`/geradores efetivamente implementada.

## R4 — P3: o contexto detalhado ainda recomenda Canvas direto

**Referência:** `packages/studio/src/official-extensions/game-2d/ai.ts:465`.
**Confiança:** alta. **Origem:** orientação antiga que ficou na fonte revisada.

O contexto detalhado do Jogo 2D mantém uma seção “CANVAS NA MÃO”, recomendando
`ctx.rect`, `ctx.clip`, `ctx.isPointInPath` e um traçado manual de crateras.
Ela não é delimitada como uma etapa posterior sem extensões.

Conferi a saída real de `gameTwoDExtension.ai.loadPromptContext()`:
64.343 caracteres, contendo essa seção e a recomendação `ctx.clip()`.
O resumo e os documentos server-safe atuais recebem a política correta; não
encontrei consumidor de produção interno chamando esse provider detalhado.
Por isso o risco atual é menor e não o classifico como falha demonstrada do
fluxo principal do tutor. Ainda é uma contradição na interface pública oferecida.

**Correção recomendada:** retirar essa receita manual do contexto da extensão
ou transferi-la explicitamente para o material da etapa sem extensão. Conferir
também o provider detalhado nas guardas de vocabulário/política visual.

## O que foi conferido sem novos achados

- Progressão: núcleo de 100 blocos e seis projetos; classificação dos 307 blocos
  básicos; compatibilidade com grants/allowlists e a distinção entre nível e oferta.
- Conversão dos 35 exemplos básicos: comparei o comportamento contra `HEAD`,
  descontando preparo explícito, descrição, bordas e IDs. Em 34 casos, as regras
  são idênticas. Em “Pegue a moeda”, os setters de x/y viraram `setPosition`
  equivalente e um `const` local virou declaração editável, sem nova alteração
  da mecânica encontrada.
- Conversão visual dos 26 exemplos avançados: executei callbacks de aparência,
  mapa e desenho em um registrador de operações, comparando as fontes antigas
  e atuais. Em 24 casos as operações comparadas são idênticas; dois diferem por
  círculo com `2π` em vez de `6.28` e fechamento explícito de triângulos, que o
  preenchimento anterior já fechava implicitamente. Essa comparação não é uma
  prova pixel a pixel nem executa todos os ramos dos jogos; exclui diferenças
  intencionais de família da fonte e não simula todas as APIs do motor.
- Desenho nativo: IR, schema, codecs, geração, reconstrução, identificação de
  variáveis, contextos de encaixe e API do runtime. O uso de `import type` evita
  que a dependência de tipos de IR crie um ciclo de execução com os codecs.
- Paleta avançada: 12 famílias, sete kits no fim, cobertura dos blocos visíveis,
  sombras e contratos de restauração. A extração usa o construtor compartilhado.
- Receitas: fontes, IR gerada, assets, comandos usados, índice server-safe e
  descoberta preguiçosa. Os módulos autorais não entram no caminho de abertura
  do catálogo gerado.
- Replay: proteção de checksum zero e regressão de reprodução determinística.
- Compactação: composição do contexto fora da transformação, equivalência de
  tokens/quebras e tetos reduzidos, além dos testes de sintaxe/runtime existentes.
- Exportação: folha vazia quando referenciada, preservação do estilo inline,
  pacote/PWA e execução fora do preview com minificadores reais.
- CI: as receitas entram nos novos checks; o guarda de manifestos é descoberto
  pelo passo existente de testes dos cursos. Os E2Es novos entram na seleção
  geral do Chromium com shards. Não estão limitados aos comandos locais citados
  no relatório anterior.
- Não identifiquei remoção de API pública antiga, migração destrutiva de
  documentos ou código morto novo que justifique exclusão nesta revisão.

## Evidências desta rodada

| Verificação | Resultado |
|---|---|
| `bun run test`, seleção canônica completa do Studio | **10.960 pass / 0 fail / 4 skip**, 147 grupos |
| Seleção direcionada de 13 arquivos alterados/novos | **320 pass / 0 fail**, 1.734 asserções |
| Guarda dos manifestos dos cursos | **39 pass / 0 fail**, 235 asserções |
| Chromium: cursos, replay/pista e exportações 2D | **6/6 pass**, 26,6 segundos |
| Reprodução adicional da troca de imagem do Pinta | **1 fail**, confirmando R2 fora da suíte oficial |
| Probes da paleta e do callback nomeado | Confirmações determinísticas de R1/R3 |
| Provider detalhado de IA | Confirmação direta de R4 |
| `git diff --check` | Saída zero |

Os quatro skips vêm do contrato do executor de objetivos, que procura por um
caminho Linux de Chromium não configurado nesta máquina Windows. O Chromium
local foi usado nos seis E2Es desta revisão. Não mudei limites, retentativas,
expectativas dos testes permanentes ou configuração do produto para obter verde.

Os seis E2Es novos servem documentos reais em origens isoladas. Nesta revisão,
eles rodaram com configuração temporária sem `webServer`, pois não acessam o
host Vite do editor. A galeria completa e os outros cenários de exportação/recarga
tinham sido executados na implementação anterior; não repeti os 209 casos aqui.
Os typechecks dos três consumidores pertencem à evidência da implementação
anterior, não a uma nova execução desta revisão.

Logs/reproduções locais (ignorados pelo Git):

- `packages/studio/.cache/game-full-review-suite.log`
- `packages/studio/.cache/game-full-review-targeted.log`
- `packages/studio/.cache/game-full-review-courses.log`
- `packages/studio/.cache/game-full-review-browser.log`
- `packages/studio/.cache/game-full-review-probes.ts` e `.log`
- `packages/studio/.cache/game-full-review-recipes.test.ts` e `.log`

## Prioridade sugerida na revisão inicial

Corrigir R1 e R2 antes de considerar a implementação encerrada. Tratar R3 sem
apresentá-lo como regressão nova; ao menos corrigir a afirmação do relatório.
Eliminar R4 na mesma revisão de coerência dos materiais da extensão.

## Inventário dos arquivos revisados

Lista congelada do diff da implementação, excluindo este relatório e os probes
temporários. Fontes e artefatos gerados foram distinguidos na revisão; os
geradores `__gen_*` autorais foram lidos como fontes, não como saída descartável.

- [x] `.github/workflows/ci.yml` — geração / CI
- [x] `docs/aulas-interativas-tecnico/qa/jogos-extensoes-visuais.test.ts` — contrato / regressão
- [x] `docs/orientacao-cursos-jogos.md` — documentação
- [x] `docs/superpowers/plans/2026-10-25-javascript-game-extensions.md` — documentação
- [x] `packages/studio/CLAUDE.md` — documentação
- [x] `packages/studio/docs/2d-extensions-review-2026-10-25.md` — documentação
- [x] `packages/studio/docs/game-2d-audit-2026-07-20.md` — documentação
- [x] `packages/studio/e2e/advanced-recipes.spec.ts` — execução no navegador
- [x] `packages/studio/e2e/course-game-extensions.spec.ts` — execução no navegador
- [x] `packages/studio/e2e/examples-gallery.spec.ts` — execução no navegador
- [x] `packages/studio/e2e/export-2d-extensions.spec.ts` — execução no navegador
- [x] `packages/studio/package.json` — paleta / integração
- [x] `packages/studio/scripts/gen-game-2d-advanced-recipes.ts` — geração / CI
- [x] `packages/studio/scripts/gen-game-2d-recipes.ts` — geração / CI
- [x] `packages/studio/scripts/gen-server-examples.ts` — geração / CI
- [x] `packages/studio/scripts/gen-text-games.ts` — geração / CI
- [x] `packages/studio/scripts/writeGeneratedSource.ts` — geração / CI
- [x] `packages/studio/src/blockly/__tests__/blockLevels.test.ts` — contrato / regressão
- [x] `packages/studio/src/blockly/__tests__/gameExtensionVisualPolicy.test.ts` — contrato / regressão
- [x] `packages/studio/src/blockly/__tests__/moldsArea.test.ts` — contrato / regressão
- [x] `packages/studio/src/blockly/__tests__/toolboxLevels.test.ts` — contrato / regressão
- [x] `packages/studio/src/blockly/blockLevels.ts` — paleta / integração
- [x] `packages/studio/src/blockly/fields/__tests__/FieldAnimationPicker.test.ts` — contrato / regressão
- [x] `packages/studio/src/blockly/paletteMap.test.ts` — contrato / regressão
- [x] `packages/studio/src/blockly/toolbox.ts` — paleta / integração
- [x] `packages/studio/src/blockly/workspaceState.ts` — IR / Ponte
- [x] `packages/studio/src/examples/__gen_serverExamplesIndex.ts` — artefato gerado
- [x] `packages/studio/src/examples/extensionOnlyExamples.test.ts` — contrato / regressão
- [x] `packages/studio/src/examples/qaContracts.test.ts` — contrato / regressão
- [x] `packages/studio/src/examples/qaContracts.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/examples/serverExamples.test.ts` — contrato / regressão
- [x] `packages/studio/src/examples/twoDExampleCoverage.test.ts` — contrato / regressão
- [x] `packages/studio/src/export/__tests__/fileMap.test.ts` — contrato / regressão
- [x] `packages/studio/src/export/fileMap.ts` — paleta / integração
- [x] `packages/studio/src/export/productionHtml.ts` — paleta / integração
- [x] `packages/studio/src/extensions/aiContext.test.ts` — contrato / regressão
- [x] `packages/studio/src/extensions/aiContext.ts` — paleta / integração
- [x] `packages/studio/src/generators/js.ts` — IR / Ponte
- [x] `packages/studio/src/ir/lifecycle.ts` — IR / Ponte
- [x] `packages/studio/src/ir/schema.ts` — IR / Ponte
- [x] `packages/studio/src/official-extensions/examplesLoading.test.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__gen_aventuraProfissional.ts` — fonte autoral / gerador
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__gen_batalhaProfissional.ts` — fonte autoral / gerador
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__gen_chuvaProfissional.ts` — fonte autoral / gerador
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__gen_dinoProfissional.ts` — fonte autoral / gerador
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__gen_dueloDeHeroisProfissional.ts` — fonte autoral / gerador
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__gen_escaladaProfissional.ts` — fonte autoral / gerador
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__gen_fazendaFelizProfissional.ts` — fonte autoral / gerador
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__gen_heroiQueEvoluiProfissional.ts` — fonte autoral / gerador
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__gen_mundoPirataProfissional.ts` — fonte autoral / gerador
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__gen_muralhaProfissional.ts` — fonte autoral / gerador
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__gen_pongProfissional.ts` — fonte autoral / gerador
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__gen_portasDoCasteloProfissional.ts` — fonte autoral / gerador
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__gen_safariDeMonstrosProfissional.ts` — fonte autoral / gerador
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__gen_sobreviventeProfissional.ts` — fonte autoral / gerador
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__gen_treinadorDeCriaturas.ts` — fonte autoral / gerador
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__gen_valeEnsolarado.ts` — fonte autoral / gerador
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__gen_vilaNinja.ts` — fonte autoral / gerador
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__tests__/blockAudit.test.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__tests__/campaignParserCodec.test.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__tests__/drawing.test.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__tests__/examples.test.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__tests__/palette.test.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__tests__/recipeReplay.test.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__tests__/recipes.test.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__tests__/runtimePayload.test.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__tests__/runtimeTypecheck.test.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d-advanced/__tests__/templateGuard.test.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d-advanced/ai.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d-advanced/aiSummary.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d-advanced/blocks.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d-advanced/blocks/definitions01.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d-advanced/blocks/definitions02.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d-advanced/blocks/definitions03.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d-advanced/blocks/definitions04.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d-advanced/blocks/definitions05.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d-advanced/blocks/definitions06.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d-advanced/blocks/definitions07.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d-advanced/campaignBlockCodec.ts` — IR / Ponte
- [x] `packages/studio/src/official-extensions/game-2d-advanced/campaignParserCodec.ts` — IR / Ponte
- [x] `packages/studio/src/official-extensions/game-2d-advanced/docs.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d-advanced/drawingBlocks.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d-advanced/drawingCodec.ts` — IR / Ponte
- [x] `packages/studio/src/official-extensions/game-2d-advanced/drawingIR.ts` — IR / Ponte
- [x] `packages/studio/src/official-extensions/game-2d-advanced/drawingRuntime.ts` — runtime / API
- [x] `packages/studio/src/official-extensions/game-2d-advanced/exampleCatalog.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/arenaGoblinsExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/aventuraProfissionalExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/batalhaProfissionalExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/bichinhosDoQuintalExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/cacaMoedasExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/chuvaProfissionalExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/cobrinhaExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/defesaDoReinoExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/dinoProfissionalExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/dueloDeHeroisProfissionalExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/escaladaProfissionalExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/fazendaFelizProfissionalExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/heroiQueEvoluiProfissionalExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/invasaoDosOvnisExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/mundoPirataProfissionalExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/muralhaProfissionalExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/pongProfissionalExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/portasDoCasteloProfissionalExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/recipes/assets.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/recipes/gameplaySources.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/recipes/generated.ts` — artefato gerado
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/recipes/moreSources.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/recipes/sources.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/reinoAbertoExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/safariDeMonstrosProfissionalExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/saltoNaFlorestaExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/sobreviventeProfissionalExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/treinadorDeCriaturasExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/valeEnsolaradoExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/vilaDoDragaoExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/examples/vilaNinjaExample.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d-advanced/index.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d-advanced/manifest.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d-advanced/palette.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d-advanced/runtime.ts` — runtime / API
- [x] `packages/studio/src/official-extensions/game-2d-advanced/runtime/campaignPersistence.ts` — runtime / API
- [x] `packages/studio/src/official-extensions/game-2d-advanced/runtimeContract.ts` — runtime / API
- [x] `packages/studio/src/official-extensions/game-2d/__tests__/blockAudit.test.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d/__tests__/bundle.test.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d/__tests__/docDrift.test.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d/__tests__/enemies.test.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d/__tests__/exampleContractHarness.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d/__tests__/examplePlaythroughHarness.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d/__tests__/exampleProgression.test.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d/__tests__/examples.test.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d/__tests__/initialCore.test.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d/__tests__/recipes.test.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d/__tests__/shapeCallbackIntegrity.test.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d/__tests__/templateGuard.test.ts` — contrato / regressão
- [x] `packages/studio/src/official-extensions/game-2d/ai.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d/aiSummary.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d/blockCatalogActions.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d/blockCatalogClassic.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d/blockCatalogFundamentals.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d/blockCatalogGroups.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d/blockCatalogInteraction.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d/blockCatalogKits.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d/blockCatalogShared.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d/blockCatalogText.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d/docs.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d/exampleCatalog.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d/examples/adventure.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/arcade.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/clearcode/aventuraHeroi.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/clearcode/batalhaMonstrinhos.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/clearcode/chuvaDeMeteoros.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/clearcode/dinoCorredor.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/clearcode/fazendaFeliz.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/clearcode/heroiQueEvolui.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/clearcode/mundoPirata.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/clearcode/pong.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/clearcode/safariDeMonstros.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/clearcode/sobrevivente.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/foundations.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/gamesTwoD/dueloDeHerois.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/gamesTwoD/escaladaDoGuerreiro.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/gamesTwoD/muralhaDoReino.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/gamesTwoD/portasDoCastelo.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/gamesTwoD/reinoZero.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/gamesTwoD/treinadorDeCriaturas.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/gamesTwoD/valeEnsolarado.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/gamesTwoD/vilaNinja.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/shared.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/examples/textGames.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/index.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d/initialCore.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d/manifest.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d/pedagogy.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/game-2d/recipes.generated.ts` — artefato gerado
- [x] `packages/studio/src/official-extensions/game-2d/recipeSources.ts` — fonte de exemplo / catálogo
- [x] `packages/studio/src/official-extensions/game-2d/runtime.ts` — runtime / API
- [x] `packages/studio/src/official-extensions/game-2d/runtime/physics.ts` — runtime / API
- [x] `packages/studio/src/official-extensions/game-2d/runtime/stage.ts` — runtime / API
- [x] `packages/studio/src/official-extensions/gameVisualPolicy.ts` — paleta / integração
- [x] `packages/studio/src/official-extensions/serverKnowledge.ts` — paleta / integração
- [x] `packages/studio/src/parsers/js.ts` — IR / Ponte
- [x] `packages/studio/src/projects/KitGallery.discovery.test.ts` — contrato / regressão
