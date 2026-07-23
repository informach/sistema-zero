# Auditoria arquitetural: Jogo 3D

Data: 23 de julho de 2026

## Escopo

Revisão completa da extensão oficial `game-3d` e das suas integrações:

- definição, manifesto, prompt de IA, blocos, toolbox, runtime e oito exemplos;
- contrato semântico compartilhado em `src/three/game3dContract.ts`;
- schema/normalização de IR, construção a partir de Blockly, geração JavaScript,
  parser Ponte e reconstrução de workspace;
- ciclo de vida do preview, permissões e import ESM fixado do Three.js;
- testes unitários, de integração e de navegador.

## Resultado

Não encontrei defeito funcional, quebra de contrato, código morto isolado ou
divergência de documentação no Jogo 3D no estado auditado.

O inventário contém 118 blocos: 94 comandos e 24 reporters. Todos têm caminho
completo bloco -> IR -> JavaScript -> parser Ponte -> bloco, com cobertura
automatizada. As categorias da toolbox também cobrem todos os blocos uma única
vez, sem categoria residual.

## Pontos conferidos

### Contratos e arquitetura

- `GAME3D_*` centraliza declarações, referências semânticas, dropdowns,
  aridades e regras de contexto. Schema, builder, gerador, parser e
  `workspaceState` reconhecem os 118 tipos de IR.
- As regras de posicionamento estão alinhadas: montagem em `Ao iniciar`, ações
  contínuas em loop, áudio em gesto ou loop, e `stackDrop` apenas em ação,
  função ou método.
- A extensão continua sendo a porta de entrada `iniciante-3d`; usa o import
  `three` central, ciclo `GAME_3D_LIFECYCLE` e conflito de tela cheia da
  plataforma.
- Não há `eval`, `new Function`, script remoto adicional ou `fetch` no runtime.
  O manifesto não libera `network`; recursos de imagem vêm do mapa de assets
  injetado pelo projeto.

### Runtime e recursos

- Cada mundo limita pixel ratio, objetos, luzes, enxames, linhas, camadas e
  vozes de áudio.
- Reinício/descarte limpa loops, listeners por mundo, `ResizeObserver`, áudio,
  geometria, materiais, texturas, canvas próprio e contexto WebGL.
- Modelos, enxames, remoção, raycast, câmeras e os quatro kits preservam a
  autoria do mundo e rejeitam combinações entre cenas.
- O runtime é um template grande por necessidade de injeção, mas a cobertura de
  tipo do corpo injetado e os testes de ciclo de vida reduzem o risco dessa
  fronteira.

### Exemplos, IA e documentação

- Os oito exemplos são IR válido e percorrem as famílias de recurso: básico,
  formas, atmosfera, enxame, Desvie, Travessia, Corrida e Empilhar.
- Prompt resumido, contexto detalhado, manifesto e tooltips descrevem APIs
  existentes e as áreas corretas do projeto.
- Os exemplos com canvas fixo têm layout responsivo validado em viewport estreito.

## Verificações executadas

| Comando | Resultado |
| --- | --- |
| `bun test src/official-extensions/game-3d/__tests__` | 325 passou, 0 falhou |
| `bun run e2e examples-gallery.spec.ts --grep "game-3d:"` | 10 passou, 0 falhou no Chromium |
| `bun run typecheck` | bloqueado fora do escopo, antes de validar o projeto completo |

O bloqueio global de tipos está em
`src/official-extensions/game-3d-advanced/__tests__/runtime.test.ts:231`:
`KitApi` não declara `endGame`. Esse arquivo pertence ao trabalho paralelo da
extensão Jogo 3D Avançado e não é causado pelo Jogo 3D auditado.

## Restrições conhecidas e decisões

- O repositório está com alterações locais em arquivos do Jogo 3D e em outras
  áreas. Esta revisão examinou o estado atual dessas alterações e não as
  modificou.
- Não há achado corretivo a aplicar nesta rodada. A correção do tipo em
  `game-3d-advanced` deve ser feita no trabalho daquela extensão para restabelecer
  o `typecheck` global.
