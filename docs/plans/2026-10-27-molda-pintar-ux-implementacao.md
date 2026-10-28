# Molda: aba Pintar, plano de implementação (27/10/2026)

Executa o desenho de [`2026-10-27-molda-pintar-ux-design.md`](./2026-10-27-molda-pintar-ux-design.md).
Pacote: `packages/molda`. Caminhos abaixo relativos a `src/components/editor/scene/` salvo indicação.

Regra geral: nomes acessíveis de cores e ferramentas NÃO mudam (os e2e acham por eles); textos
novos moram em `core/scenePaintCopy.ts`, sem travessão.

## Tarefa 1: ladrilho sem letra, com pingo de tinta

- `SceneTile.tsx`: tirar o desenho de `keyHint` (o `span.mld-tile-key`); acrescentar `dot?: string`
  (cor CSS) que desenha um pingo redondo no mesmo canto, `aria-hidden`.
- Chamadores de `keyHint` passam a só manter `title` e `aria-keyshortcuts`:
  `SceneCanvas.tsx:508`, `SceneModelColumn.tsx:44,56`, `SceneWorkshop.tsx:781`, `ScenePaintToolbox.tsx`.
  Remover a prop `keyHint` quando não sobrar uso.
- `styles/molda.css`: apagar `.mld-tile-key`; criar `.mld-tile-dot` (anel branco fino, sombra).
- Testes: o ladrilho não tem texto de tecla; o `aria-keyshortcuts` continua.

## Tarefa 2: coluna da esquerda (`ScenePaintToolbox.tsx`)

- Bloco **Jeito** contextual:
  - tamanho: três `<button>` com bolinha 6/10/16 px pintada com `paint.ink`, mesmos
    `aria-label`/`aria-pressed`/atalhos; apagar a legenda `aria-live` "1 px" (o `aria-pressed`
    anuncia);
  - Borracha: "Apagar tinta" / "Deixar vazado" (trazer de `ScenePaintPalette.tsx`, mesma
    condição `imageKind === 'color'`);
  - Balde: "Só esta área" / "Fundo da peça" (mesmo `RequiresTool family="model.finish"`);
  - Pegar cor / Pintar de perto / Girar: as dicas que já existem.
- Bloco **Ajudas**: Espelhar + novo ladrilho alternância "Só nesta peça" (`data-toggle`,
  `pressed = scope.mode === 'selected'`, chama o mesmo `onPaintScopeChange`).
- Pingo de tinta (`dot`) no Pincel e no Balde.

## Tarefa 3: tirar o "Pintar em" do palco

- `SceneCanvas.tsx`: apagar `paintScopeControl` e o `place(slots?.paintScope, …)`; a escolha do
  escopo passa a vir só da coluna (o estado continua onde está, em `useSceneWorkshop`).
- `SceneWorkshop.tsx`: apagar `paintScopeSlot` (linhas 147, 419, 841) e o slot do tipo.
- `molda.css`: apagar `.mld-paint-scope`.

## Tarefa 4: a barra de cores (componente novo `ScenePaintColorBar.tsx`)

- Extrair de `ScenePaintPalette.tsx`: cálculo de `colors` (paleta + favoritas, sem repetir),
  `NAMES`, potinho, amostras, "Usadas agora", "Criar outra cor" + "Guardar cor favorita",
  avisos de favoritas (`favoritesUnavailable`, `favoritesFull`).
- Estrutura: `<section aria-label="Cores">` → potinho (48 px, nome) → fila rolável
  (`overflow-x-auto`, esmaecido na ponta) com as amostras 40 px → separador → favoritas → "+".
- "+" abre popover no tema do Molda (reusar `SceneToolbarMenu` se servir; senão `<details>` com a
  receita `.mld-disclosure`) com `SceneColorPicker`, "Guardar cor favorita" e "Usadas agora".
- Montagem: em `SceneWorkshop.tsx`, no pé da coluna central (irmã DEPOIS do palco e da folha,
  dentro do mesmo contêiner flex vertical), só com `mode === 'paint'` e `RequiresTool
  family="paint.brush"`. Telas estreitas: a mesma barra, fila rolando.
- `molda.css`: `.mld-color-bar`, `.mld-color-pot` (salto de 160 ms, `prefers-reduced-motion`),
  estados da amostra (escolhida sobe 2 px + anel duplo; claras com borda interna; hover). Apagar
  `.mld-paint-swatches`/`.mld-paint-swatch` quando sem uso. Tokens do tema escuro.

## Tarefa 5: painel da direita enxuto (`ScenePaintPalette.tsx` → cartão da peça)

- Manter: título do estado (novo texto sem peça: `SCENE_PAINT_COPY.choosePieceAll`), ajuda,
  "Peça pronta para pintar", preparação das faces tortas, "Mais opções da peça".
- Trazer de `ScenePaintKid.tsx` (`ScenePaintColumn`): `ScenePaintTextureActions` (como botões do
  painel, não ladrilhos; "Importar textura" → "Usar imagem"), "Vestir com textura" e a prévia
  `SceneFlipbookPreview`, só com peça escolhida. Os avisos de espelho/busy/erro ficam na coluna.
- "Paletas: Arcade" (`ScenePaletteLibrary`) dentro de um `<details className="mld-disclosure">`
  "Paleta do modelo".
- Tirar: bloco de cores (foi para a barra) e "Ajustes da ferramenta" (foi para a coluna).
- `SceneWorkshop.tsx:1203`: tirar `<SceneUpcomingTools tabs={['paint']} />`.

## Tarefa 6: toast acima da dica

- `ui/Toast.tsx` usa `fixed bottom-6`: passar a ler `bottom: var(--mld-toast-bottom, 1.5rem)`;
  a oficina define a variável no root quando a barra de cores e a pílula estão montadas (altura
  da barra + pílula + folga). Teste: com toast e dica visíveis, as caixas não se cruzam.

## Tarefa 7: textos (`core/scenePaintCopy.ts`)

`choosePieceAll`, `onlyThisPiece`, `onlyThisPieceHint`, `moreColors`, `eraseModes`
(`paint`/`cutout`), `fillScopes` (`area`/`base`), `useImage`, `modelPalette`. Rodar
`bun test tests/copy-vocabulario.test.ts` em `packages/community-kids`.

## Tarefa 8: testes e verificação

- Componentes: atualizar `SceneWorkshop.paint.test.tsx`, `SceneWorkshop.toolAccess.test.tsx`,
  `SceneWorkspaceAreas.test.tsx`, `SceneWorkshop.test.tsx`; novos: barra (potinho, favoritas,
  popover, nomes acessíveis), "Só nesta peça" alterna o escopo, Jeito por ferramenta, texturas só
  com peça escolhida.
- e2e: `paint-simple`, `palette-panel-layout`, `scene-workshop-layout`, `paint-texture-creation`,
  `simple-uv` e os do Modelar que liam a letra; novo caso de barra × palco × toast.
- Capturas antes/depois 1440/1024/768, claro/escuro, `?nivel=explorer|architect|god`.
- `bun run typecheck && bun run test && bun run check && bun run e2e`.
- `packages/molda/CLAUDE.md`: seção nova "Pintar: três zonas (27/10/2026)" e corrigir a nota do
  `keyHint` na "Direção de arte da oficina".

Ordem: 1 → 3 → 2 → 4 → 5 → 6 → 7 (junto de cada tarefa) → 8. Um commit por tarefa.
