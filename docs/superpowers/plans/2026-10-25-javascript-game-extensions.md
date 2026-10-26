# Revisão das extensões JavaScript de jogos — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar a proposta aprovada de revisão 2D, incluindo Cadê Todo Mundo? e A Chave do Farol no núcleo inicial, e garantir que jogos com extensões usem somente os recursos visuais das extensões.

**Architecture:** Preservar os motores e documentos existentes. Organizar a oferta por árvores editoriais puras; acrescentar recursos nativos de extensão onde os exemplos ainda usam Canvas. O catálogo, os cursos e o índice server-safe devem provar a progressão com os mesmos contratos do editor.

**Tech Stack:** TypeScript, Bun, Blockly, IR e codecs internos, Canvas encapsulado nos runtimes, Playwright.

**Spec:** Proposta apresentada na conversa e aprovada pelo usuário em 25/10/2026, com dois ajustes: núcleo inicial cobre os quatro exemplos e os jogos Cadê Todo Mundo?/A Chave do Farol; nenhum jogo/exemplo com extensão usa blocos HTML, CSS ou Canvas (2D ou 3D). Programação, com variáveis, condições e laços, continua sendo a linguagem das regras do jogo. A etapa de HTML/CSS/Canvas diretamente não usa extensões.

## Global Constraints

- Preservar alterações Python já presentes no workspace e qualquer trabalho concorrente.
- Preservar IDs de blocos, assinaturas e semântica dos jogos salvos; mudanças editoriais não precisam converter documentos.
- Não apagar desenho, interação, objetivo ou reinício para eliminar dependências proibidas.
- Não esconder nós HTML/CSS/Canvas em rawJS, wrappers ou processamento tardio do catálogo.
- Usar primitivas visuais nativas da extensão; Canvas interno ao motor continua necessário e permitido.
- Dicas de blocos novas/revisadas têm até 220 caracteres; manuais guardam explicações extensas.
- Testar blocos ⇄ IR ⇄ JavaScript, execução e contexto de encaixe; callbacks não perdem async/generator.
- Exemplos são fontes autorais; arquivos gerados devem ser regerados pelos scripts canônicos.
- Não publicar/deployar nem alterar dados remotos como parte desta implementação local.

## Task 1 — Progressão 2D e jogos dos cursos

**Files:** `packages/studio/src/blockly/blockLevels.ts`, testes de níveis, `src/official-extensions/game-2d/{initialCore,pedagogy}.ts`, `docs/aulas-interativas-tecnico/qa/{cade-todo-mundo,desafio-farol}-projeto.ts`, testes de progressão e `docs/orientacao-cursos-jogos.md`.

**Interfaces:** Consome `buildWorkspaceStateFromIR(ir)` e `resolveBlockLevel(type)`. Produz uma definição pura do núcleo inicial e uma matriz de requisitos dos seis projetos, sem importar cursos/Blockly no caminho server-safe.

- [x] Inventariar tipos dos quatro exemplos iniciais e das construções/personalizações dos dois cursos com o workspace real.
- [x] Adicionar teste que exige todos esses blocos em Iniciante 2D e nenhum HTML/CSS/Canvas nos projetos.
- [x] Corrigir a classificação: ferramentas Jogo 2D pertencem à etapa 2D; núcleo inicial é uma curadoria explícita de entrada, não o limite total do produto.
- [x] Conferir os blocos de Programação necessários e os grants/allowlists das aulas locais sem ampliar acesso a outras linguagens.
- [x] Rodar `bun test src/blockly/__tests__/blockLevels.test.ts` e testes de cursos e progressão.

## Task 2 — Exemplos básicos sem página

**Files:** `packages/studio/src/official-extensions/game-2d/examples/**`, catálogo e testes relacionados.

**Interfaces:** Preserva exports e nomes dos 36 exemplos. Fontes declaram `html: [], css: []`; `g2d:setupStage`, borda, fonte, desenho e telas substituem a apresentação de página.

- [x] Adicionar teste contra catálogos reais, usando `buildWorkspaceStateFromIR`, que recusa HTML/CSS/Canvas em exemplos com extensão.
- [x] Converter as fontes, preservando tamanho do palco, fundo, aparência e mecânicas; remover dependência do wrapper que extrai tamanho do HTML.
- [x] Organizar metadados de demonstrações → jogos simples → jogos maiores → kits e incluir jogo completo pequeno de entrada.
- [x] Criar receitas executáveis para famílias de blocos sem exemplo, especialmente Pinta, som e animação; exigir cobertura dos tipos visíveis.
- [x] Executar testes dos exemplos e contrato de documento.

## Task 3 — Desenho nativo no Avançado

**Files:** `packages/studio/src/official-extensions/game-2d-advanced/{drawingIR,drawingCodec,drawingBlocks,drawingRuntime}.ts`, ganchos mínimos em fachadas IR/Blockly/parser/generator/runtime, fontes dos exemplos Avançados.

**Interfaces:** Declara comandos da extensão para as intenções visuais realmente usadas: texto, retângulo, círculo e figura vetorial. Recebe valores/expressões da IR e contexto de desenho interno, sem blocos Canvas nem código cru.

- [x] Inventariar os nós Canvas dos 26 exemplos afetados e preservar cada desenho por intenção.
- [x] Acrescentar blocos nativos somente onde recursos existentes da extensão não atendem; cada bloco novo tem codec bidirecional e teste de runtime.
- [x] Converter as fontes dos exemplos e geradores associados, preservando os caminhos de vitória/derrota e os desenhos.
- [x] Validar ausência de HTML/CSS/Canvas nos cinco catálogos de extensões, inclusive dependências indiretas e exemplos core que declarem extensão.
- [x] Rodar auditoria de blocos, testes dos exemplos, codecs e geração.

## Task 4 — Paleta e vocabulário do Avançado

**Files:** `packages/studio/src/official-extensions/game-2d-advanced/{palette,blocks,docs,ai,aiSummary}.ts`, testes, `campaignParserCodec.ts` e testes do parser.

**Interfaces:** Produz `GAME_KIT_PALETTE` como `ExtensionPaletteTree`, consumida por `buildExtensionPalette`. Preserva IDs e valores de campos existentes.

- [x] Mover categorias planas para árvore pura de famílias/seções, agrupando kits no fim e preservando todos os blocos visíveis.
- [x] Unificar nomes de famílias, dicas e termos públicos entre básico e Avançado; documentar unidades sem converter valores existentes.
- [x] Atualizar manual, busca/tutor e testes de drift para a árvore real.
- [x] Reproduzir perda de async/generator no campaign parser e preservar código que não tem representação fiel na IR.
- [x] Rodar testes de paleta/docDrift/blockAudit e parser.

## Task 5 — Integração, desempenho e verificação

**Files:** testes transversais `packages/studio/src/examples/`, scripts de geração, orçamentos e runtimes, catálogos/receitas Pinta e relatório final.

**Interfaces:** Índice `SERVER_EXAMPLES_INDEX` gerado a partir das fontes finais; todos os exemplos com extensão têm somente blocos visuais da extensão e todos os blocos oferecidos têm demonstração executável.

- [x] Medir payload bruto/gzip antes/depois; avaliar módulos independentes de kits e implementar seleção por uso quando houver ganho verificável com o mecanismo existente de variantes.
- [x] Executar geradores: `gen:server-examples`, `check:game-3d-examples`, `check:world-3d-examples`, `check:snow-descent` e atualizar só artefatos afetados.
- [x] Rodar suites isoladas do Studio, typechecks dos consumidores e Biome nos arquivos alterados; corrigir regressões sem ampliar budgets.
- [x] Exercitar galeria, seis jogos de entrada, reinício, entrada por toque/teclado, Pinta, exportação e persistência no navegador conforme comandos do repositório.
- [x] Reexaminar o diff por fonte canônica, compatibilidade e integridade do trabalho concorrente.
- [x] Registrar verificações executadas, limites reais e qualquer pendência sem afirmar conclusão não demonstrada.

## Estado da integração

- Tasks 1–4 implementadas e verificadas por contratos, round-trip e execução.
- Núcleo inicial: 100 blocos; quatro exemplos e 14 montagens de Cadê/Farol.
- Catálogos: 45 básicos + 48 avançados; cobertura 307/307 e 388/388.
- Os cinco catálogos com extensão e os 31 projetos iniciais dos 37 manifestos atuais não usam ferramentas visuais manuais.
- Typechecks Studio, Members e Member Shell aprovados. Dependência já declarada `payment-token-efi` foi materializada com instalação frozen, sem mudar manifests/lock.
- Registros de fonte gerada usam substituição atômica, preservando leitores abertos no Windows.
- Compactação reduz os motores para 415.166/408.593 caracteres; contexto da partida fica fora da transformação.
- E2E específicos: Cadê/Farol 2/2, replay/saves/pista 2/2.
- Rodada canônica da implementação inicial: 10.959 testes, zero falhas, em 147 grupos isolados.
- Galeria/cursos/receitas: 209 casos exercitados, 208 aprovados na rodada completa e a checagem numérica de acessibilidade corrigida e aprovada na complementar.
- Complementar de navegador: 13/13, incluindo exportações 2D/3D e persistência. Regressão da exportação de CSS vazio: 43/43 testes.
- Manifestos dos cursos: 39/39 testes. Detalhes e limites registrados no relatório `packages/studio/docs/2d-extensions-review-2026-10-25.md`.
- Após corrigir R1–R4: 10.969 testes aprovados, zero falhas e quatro skips de configuração; seis E2Es aprovados com prova visual da tecla I; typechecks dos três consumidores aprovados.

## Correções do full review e integração local

Autorização: pedido de 25/10/2026 para corrigir todos os achados, commitar e fazer
merge em `staging` local. O desenho das correções está no relatório
`.audits/architectural-analysis-2026-10-25-javascript-games.md`.

- [x] R1: testar a extensão instalada com categoria escondida por nível; enviar IDs
  instalados do `BlocklyPanel` ao construtor da paleta e manter a política visual.
- [x] R2: reproduzir a tecla I com o motor real; representar os modos automático,
  animação de uma vez e imagem fixa na fonte autoral. Provar persistência da imagem,
  retorno pelo Espaço e reinício; regenerar receitas e índice.
- [x] R3: executar callbacks nomeados reconstruídos para os dois hooks da campanha;
  recusar conversão que perderia seu nome local, preservando a chamada inteira.
- [x] R4: testar o provider detalhado, retirar sua receita manual de Canvas e incluir
  a política visual compartilhada no contexto.
- [x] Validar regressões, suíte canônica, typechecks, geradores, Biome e navegador;
  atualizar os relatórios com resultados e achados resolvidos.
Entrega autorizada após validação: conferir o escopo do índice Git, commitar a
implementação completa na branch de correção e integrar por merge explícito em
`staging` local. Os hashes são informados na entrega.

## Comandos de verificação

```powershell
Set-Location packages/studio
bun test src/blockly/__tests__/blockLevels.test.ts src/examples/exampleProgression.test.ts
bun test src/official-extensions/game-2d/__tests__/blockAudit.test.ts src/official-extensions/game-2d-advanced/__tests__/blockAudit.test.ts
bun run gen:server-examples
bun run check:game-3d-examples
bun run check:world-3d-examples
bun run check:snow-descent
bun run test
bunx tsc --noEmit
bun run e2e:gallery
git diff --check
```
