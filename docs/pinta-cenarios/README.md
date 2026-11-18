# Pinta: cenários 2D

Registro vivo da evolução do editor de mapas do Pinta para um editor de cenários 2D: diagnóstico,
arquitetura, plano por incrementos e o estado de cada um. Atualizado a cada incremento fechado.

## Estado em 17/11/2026

A continuação implementa os incrementos 4b a 14 sobre os incrementos 1 a 4a já presentes
na `staging` remota. A ordem de execução segue a tabela do plano. A identidade visual usa os
mesmos tokens, tipografia, botões, painéis e barras do Pinta.
Entrega isolada na branch `pinta-cenarios-finalizar`; a proteção completa declara versão de
nuvem 3 para também barrar o cliente intermediário que declarava 2.

| # | Entrega | Implementação |
|---|---|---|
| 1–2 | Trava de leitura e declaração por tipo | Já incorporadas à base remota; testes de frota mista preservados |
| 3 | Células e histórico por buffers únicos | Preservado e integrado aos novos caminhos |
| 4 | Documento v3 completo | Camadas, objetos tipados, metadados de peças e conjuntos |
| 5 | Contrato e conversor de cena | PintaScene validado e dependências resolvidas |
| 6 | Área visível e cache | Canvas recortado, blocos 32 × 32 e cache LRU |
| 7 | Separar editor | Controlador de seleção e módulos/painéis extraídos |
| 8 | Ferramentas, na sequência prevista | Camadas → transformações → objetos → propriedades → seleção → biblioteca → terrenos → espalhar → conjuntos → animação → níveis → teste → minimapa |
| 9 | Python | PNG v2, leitor 1/2 e PyDew unificado em 16 camadas |
| 10 | Assets e biblioteca do Studio | Cena e frente persistidas, sincronizadas e enviadas ao preview |
| 11 | map-2d nos dois motores | 12 blocos, carga opcional e orçamento separado |
| 12 | Jogar meu mapa v2 | Início, frente, colisão, portas e vínculos de biblioteca |
| 13 | Destinos externos | Tiled JSON/TMX/TSX, Phaser offline, Pygame portátil e Godot nativo |
| 14 | Referência e documentação | Vila e Floresta, exemplos dos dois motores, guias e evidências |

A validação local, os ensaios em navegador e os limites de comprovação são registrados em
[homologação](homologacao.md). Não há merge ou deploy nesta entrega. Aparelhos físicos e
staging real precisam de ensaio no ambiente correspondente; não são apresentados como testes
realizados. Mapas infinitos/isométricos/hexagonais estão fora do escopo declarado do plano.

- [Diagnóstico e arquitetura](diagnostico-e-arquitetura.md)
- [Guia de uso](guia-de-uso.md)
- [Exportação para desenvolvedores](exportacao.md)
- [Compatibilidade com Tiled](compatibilidade-tiled.md)
- [Homologação e evidências](homologacao.md)
- [Registro histórico dos primeiros incrementos](historico-inicial.md)

---

## Diagnóstico inicial

O Pinta já tem mapas (tilesets, camadas de peças e de objetos, colisão por peça), mas a auditoria do código real mostrou quatro problemas que impedem chamá-lo de ferramenta de level design:

1. **Perda silenciosa de dados.** O Pinta nunca declara `formatVersion` ao salvar na nuvem, então a trava `CREATION_CLIENT_OUTDATED` do servidor (que Estúdio, Molda e Cenários usam) está desligada para ele. Um cliente antigo baixa um mapa novo, o `sanitizePintaAsset` dele descarta o que não conhece (camadas de objetos, camadas 5 a 8) e a versão cortada sobe. É o risco "M3" registrado em `packages/pinta/CLAUDE.md` L2236-2248, sem conserto até hoje.
2. **O mapa chega pela metade ao Estúdio.** Nos caminhos JavaScript (Jogo 2D, Jogo 2D Avançado, Pro, "Jogar meu mapa") só passa um tileset e uma grade achatada. Objetos, propriedades, camadas e demais tilesets ficam para trás; o Jogo 2D ignora até a grade de frente. Só o `pinta.py` recebe o mapa inteiro.
3. **Modelo curto.** Tetos de 64 peças, 128 × 128 células e 8 camadas. Sem grupos, bloqueio, opacidade, reordenar camadas, espelhar/girar peças, animação, terrenos automáticos, conjuntos, formas além de ponto e retângulo, seleção múltipla ou copiar/colar de objetos.
4. **Nenhuma saída para fora.** Não existe leitor nem exportador de Tiled, Phaser ou Godot no repositório.

Resultado pretendido: a criança monta um cenário pintando terrenos e pondo objetos, testa, leva ao Estúdio sem perder nada, programa lá, e também exporta para outros motores. Um desenvolvedor experiente encontra camadas, objetos tipados, colisões, terrenos inteligentes e exportação estruturada.

## Fluxo de entrega previsto

- Branch `pinta-cenarios-2d`, criada da `staging` atualizada, em worktree próprio. Nada em `packages/molda-cenarios*`, `members/.../cenarios` ou nos documentos do plano de Cenários 3D. Sem merge nem deploy.
- **Dois PRs para a `staging`, sem merge:**
  - **PR A (pequeno, só segurança de dados):** incrementos 1 e 2 abaixo. Precisa ir ao ar antes do resto, porque o servidor nunca rebaixa versão: se o leitor e o gravador saírem juntos e houver rollback, todo mapa fica travado com 409.
  - **PR B (a evolução):** incrementos 3 a 14, empilhado sobre o A.
- Um incremento só fecha com núcleo + interface + testes + ensaio no navegador + commit. Uma verificação pesada por vez (regra do repositório).
- A solicitação desta continuação exige todos os incrementos, na ordem do plano. O relatório discrimina implementação, validação local e validação que depende de ambiente externo.

## Decisões de arquitetura

**Três eixos de versão, documentados separadamente**
- Servidor (`creations.format_version`): declarado **por tipo de desenho**, nunca pelo conteúdo (evita o mapa "se rebaixar" ao apagar uma camada). Mapas, tilesets e conjuntos sobem; paleta e demais ficam em 1.
- Envelope `.pinta.json`: versão 3 **só quando o desenho precisa** (padrão do `tilemapNeedsV2`). Um dígito, como o medidor de tamanho exige.
- Registro: campo opcional `schema` em mapa, tileset e conjunto, para um cliente futuro não ser regravado por este.

**Documento: estender `TilemapAsset` no lugar**, mesmo `kind`, chaves opcionais omitidas no padrão, para mapas antigos continuarem byte a byte iguais. Migração preguiçosa só pelo `sanitizePintaAsset`.
- Camadas em lista plana com `parentId` e novo `kind: 'group'`. O sanitizador valida pai (existe, é grupo, sem ciclo, vem antes) e realoja órfãos.
- Por camada: `locked`, `opacity`, `offset`, `parallax`, `properties`.
- **Espelho e giro empacotados na própria célula** (`peça | flags << 12` no `Int16Array`), não num vetor paralelo: assim histórico, clone, wire, redimensionar, seleção, carimbo e área de transferência carregam os flags sem mudança. Acesso só por `tiles/cell.ts`, com teste de arquitetura.
- Objetos: `shape` (ponto, retângulo, elipse, polígono, polilinha, referência a sprite/peça, instância de conjunto), `points`, `rotation`, espelho, referência de arte, `role` e propriedades tipadas (inteiro, decimal, cor, objeto, arte).
- `role` é o vocabulário infantil: onde o jogador começa, lugar perigoso, porta para outro lugar, caminho do inimigo, área que ativa alguma coisa, inimigo, região. O Pinta só registra; quem executa é o motor.
- Tilesets: `animations`, `terrains` (conjuntos Wang de canto, borda e mistos), propriedades por peça.
- Novo tipo de desenho **conjunto** (pedaço de peças + objetos). Instância vinculada é um objeto que aponta para o conjunto; "Soltar" vira cópias independentes. Template de objeto é um conjunto de um objeto só.

**Tamanho com orçamento explícito**
- Primeira entrega: 256 × 256 células, 32 camadas, 256 peças por tileset, total de cerca de 2 M de células. Só sobe depois de medir o autosave no IndexedDB.
- Codificação por dimensão: mapas até 128 × 128 mantêm `cells: number[]` (não muda impressão digital nem reenvia partes); maiores usam `cellsPacked` (RLE em base64).
- Limites por adaptador: o bloco de aula mantém os tetos antigos (teto de 1,8 M caracteres em `lesson-block.ts`).
- Histórico: os ops já são copy-on-write por camada; corrigir o estimador para contar buffers únicos, em vez de reescrever para patches.
- Renderização com recorte pela área visível e cache de blocos de 32 × 32 células.
- Mapa infinito e projeções isométrica/hexagonal ficam fora deste escopo.

**Um contrato de cena para todos os destinos**
- `packages/core/src/studio/pinta-scene.ts` (zod, no molde de `pinta-image.ts`). O Pinta converte documento → cena em `pinta/src/export/scene.ts`; ninguém mais converte.
- Consumidores: Estúdio JS (`ProjectAsset.scene`, ao lado do `tilemap` legado), `pinta.py` (`PintaImageMapData` versão 2), Tiled, Phaser, zip Pygame, Godot.
- O `tilemap` legado só é emitido quando o mapa cabe no envelope antigo; senão, só `scene`, com recusa explícita apontando para os blocos novos.

**Estúdio: fragmento compartilhado `official-extensions/map-2d/`**, no padrão de `scene-2d/` (contrato sem DOM, host por motor), usado por Jogo 2D e Jogo 2D Avançado.
- Colisão sem física nova: o fragmento funde as camadas de colisão numa grade e chama o `createTileMap`/`collideTileMap` que já existem.
- Carga por `bootstrapVariant` (precedente `game-3d/platformKitVariant.ts`): jogos sem mapa novo não pagam um byte; o teto atual fica intocado para essa variante e a variante completa ganha teto próprio, escrito e justificado.
- Blocos novos, antigos intocados: criar cenário do meu desenho, desenhar fundo e frente, colidir, objetos por tipo e nome, propriedade de objeto, entrar em área, porta.

## Incrementos, em ordem

| # | Entrega | Arquivos principais |
|---|---|---|
| 1 | **Trava de formato, só leitura.** Constante e regra por tipo; `maxFormatVersion` nos clientes; os **três** caminhos que baixam e sanitizam (reconcile, `resolveStale`, `resolveStaleRemove`) ignoram item de formato futuro, no padrão do filtro do Molda; cartão bloqueado "atualize a página". Ainda envia 1 | novo `core/src/creations/pinta-format.ts`; `member-shell/src/lib/pinta-cloud-persistence.ts`; `components/creator/pinta-client.tsx`, `molda-client.tsx`; `components/pinta/lesson-pinta-draft.ts` |
| 2 | **Declarar por tipo.** Envios de mapa e tileset passam a declarar a versão atual. Atualizar a nota M3 | os mesmos + `pinta/CLAUDE.md` |
| 3 | Auxiliares de célula e estimador do histórico por buffer único. Sem mudança de comportamento | novo `pinta/src/tiles/cell.ts`; `core/history.ts`, `state/editorStore.ts` |
| 4 | **Documento v3 e sanitizador, sem interface.** Tudo o que está em "Documento" acima, limites por adaptador, um só serializador de camada | `pinta/src/core/project.ts`, `projectConfig.ts`, `assets/wire.ts`, `export/projectJson.ts`, `assetJson.ts` |
| 5 | Contrato `PintaScene` e conversor, com fixtures de referência | novo `core/src/studio/pinta-scene.ts`, `pinta/src/export/scene.ts` |
| 6 | Renderizador com recorte e cache por bloco | `pinta/src/tiles/renderTilemap.ts`, novo `tiles/chunks.ts` |
| 7 | Dividir `TilemapEditor.tsx` (1248 linhas) em controlador e módulos de ferramenta, sem mudar comportamento | `pinta/src/components/editor/*` |
| 8 | **Ferramentas, um commit cada:** árvore de camadas (grupos, ordem, nome, cadeado, opacidade) → espelhar/girar → formas e papéis de objeto → propriedades tipadas → seleção múltipla, copiar/colar, alinhar/distribuir → objetos da biblioteca com miniatura real → terreno inteligente (pincel, borracha, balde, retângulo, linha, prévia, vizinhos, semente) → espalhar → conjuntos vinculados e soltos → peças animadas → níveis Começar / Criar mais / Avançado sobre o `allowTools` → teste com personagem dentro do Pinta → minimapa e indicador de orçamento | novos puros em `pinta/src/tiles/` (`terrain.ts`, `scatter.ts`, `objectGeometry.ts`, `sets.ts`); painéis e `core/copy.ts` |
| 9 | **Python.** `PintaImageMapData` v2; `pinta.py` lê 1 e 2 (grupos, opacidade, deslocamento, espelho, animação, formas, mais de 8 camadas). PyDew Valley reunido num mapa só de 16 camadas como regressão | `pinta/src/export/portableImageData.ts`; `studio/src/runtime/python/pygame/py/pinta.py`; `scripts/python/test-pinta-module.py` |
| 10 | **Assets do Estúdio.** `ProjectAsset.scene`, sanitizador, metadados da prévia, biblioteca pessoal (que hoje descarta `tilemapFront`) e sincronização | `studio/src/core/projectAssets.ts`, `preview/assetsBridge.ts`, `asset-library/personal.ts`, `personalSync.ts` |
| 11 | **Fragmento `map-2d` e blocos novos** nos dois motores, variante de carga, dois tetos, lista de blocos permitidos, contadores do `docDrift` | `studio/src/official-extensions/map-2d/*`, `game-2d/*`, `game-2d-advanced/*` |
| 12 | **"Jogar meu mapa" v2:** nasce no ponto de início, usa frente e objetos, guarda `libId` para o jogo atualizar quando o mapa muda, sem tocar na programação | `studio/src/projects/tilemapGame.ts`; `pinta-client.tsx` |
| 13 | **Exportação e importação.** Tiled JSON e TMX/TSX (gids com flags, camadas, objetos, propriedades, terrenos, animações) com importação de mapas ortogonais e relatório do que não foi convertido; pacote Phaser com exemplo executável (Phaser embutido no zip); projeto Pygame portátil; Godot por último | novos `pinta/src/export/tiled/*`, `export/phaser/*`, `export/pygameProject.ts`; `components/export/ExportDialog.tsx` |
| 14 | **Homologação "A Vila e a Floresta"** (16+ camadas, vários tilesets, terrenos, água, objetos com propriedades, porta entre dois mapas, peça animada, conjunto), os dez passos do ciclo, guias e relatórios | `pinta/scripts/homologacao/*`; `docs/pinta-cenarios/*` |

## Reaproveitar, não reescrever

- Atlas e geometria: `mapAtlasSelection` (`export/portableImageData.ts`), `tiles/packGeometry.ts`, `tiles/mapTilesets.ts`.
- Camadas: `flattenLayers`, `usesMapTileset`, `tileLayersOf`, `remapTilemapTilesetIds` (`tiles/tilemapOps.ts`, `core/project.ts`).
- Propriedades: estender `sanitizeObjectProperties`; fundir com o `filterProperties` duplicado.
- Carimbo, seleção, construtores: `tiles/stamp.ts`, `tiles/mapSelection.ts`, `templates/builders.ts` (`buildTilemap`).
- Zip e PNG: `export/zip.ts`, `export/pngText.ts`, `studio/src/export/pygameDesktop.ts`.
- Estúdio: `createTileMap`, `collideTileMap`, `tileAt` (`game-2d/runtime/worldTiles.ts`); padrão de `scene-2d/*`.
- Nuvem: `reconcileCreations` e o filtro de formato futuro do Molda (`molda-cloud-persistence.ts` ~L609).
- Duplicações a fundir no caminho: os quatro serializadores de células, `pixelSheetCanvas`/`sheetCanvas`, `indicesOf`, e os tetos `STUDIO_MAX_*` × `MAX_*` (hoje sincronizados por comentário) movidos para `core/src/studio/`.

## Limites que o plano assume, por regra do repositório

- **Blocos publicados não mudam.** Fidelidade total só existe pelos blocos novos; projetos antigos seguem com a visão achatada.
- **Cenas muito grandes não entram no Estúdio JS.** Teto por asset (cerca de 2 M caracteres de dados de camada) com recusa explícita na interface; o editor e os exportadores externos aceitam mais.
- **Ordem de deploy:** Members e Admin embutem o sanitizador do Pinta e a lista de blocos, então vão antes; depois o leitor, depois o gravador. Depois do deploy de blocos, "Sincronizar base" no Admin.
- **Envio de aula** não tem trava de formato: uma aba antiga ainda pode enviar mapa cortado numa lição. Mapas já são excluídos das opções de aula; registro como risco residual depois de conferir a rota.
- **Proteção local** só vale contra clientes futuros; um bundle anterior no mesmo aparelho não pode ser barrado localmente (a nuvem barra).

## Verificação

- **Por incremento:** `bun test src`, `bun run typecheck` e `bun run check` em `packages/pinta`; `bun run test` e typecheck em `packages/studio`; suítes de `member-shell`, `community-kids` e `members` nos incrementos que os tocam. Testes de ida e volta com `structuredClone`, wire, envelope, redimensionar e o sanitizador de envios do Members.
- **Frota mista:** rodar o sanitizador anterior (do histórico do git) contra documentos novos e provar que a nuvem recusa a regravação.
- **Navegador:** Playwright no playground do Pinta (porta 5199) para cada ferramenta, em desktop, notebook e celular emulado, claro e escuro; e2e do Estúdio para o cenário rodando com camadas, colisão, frente e objetos.
- **Motores externos:** Phaser carregando o pacote em Chromium sem janela; pygame-ce real rodando o projeto exportado e `test-pinta-module.py`; Godot só se um binário headless importar a cena.
- **Tiled:** tentar obter o Tiled e usar a exportação por linha de comando para ida e volta. Se não for possível no ambiente, validar com três leitores independentes (carregador do Phaser, `pytmx`, nosso importador) e relatar como "validado por leitores, não aberto no Tiled".
- **Não verificável aqui:** aparelhos físicos e desempenho em máquina fraca. Só emulação de toque e CPU reduzida, e o relatório dirá isso.
- **Homologação:** os dez passos do ciclo de "A Vila e a Floresta", com evidências versionadas.

## Entregáveis de documentação

Em `docs/pinta-cenarios/`: diagnóstico e arquitetura, guia de uso, guia de exportação para desenvolvedores, relatório de compatibilidade com o Tiled, e a lista de recursos implementados, parciais e pendentes, separando teste local, navegador, motor externo e aparelho físico.
