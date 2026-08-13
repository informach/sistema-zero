# Full review arquitetural — Reino Zero e extensão Jogo 2D

**Data:** 2026-08-12 (America/Sao_Paulo)
**Estado analisado:** worktree local, com alterações não commitadas e edição concorrente
**Escopo:** `packages/studio/src/official-extensions/game-2d`, integrações necessárias em `src/ir`, Blockly, gerador, parser e E2E

## Resumo executivo

O Reino Zero já é um bom jogo de plataforma autoral inspirado no Super Mario Bros.: tem 8 mundos × 4 fases, corrida, pulo variável, inimigos pisáveis, casco, mastro, power-up, estrela, chefes, dois jogadores alternados e segunda jornada. Porém, pela régua explícita do produto — “mesmas fases e mecânicas, aparência autoral” — ele ainda não pode ser chamado de réplica fiel.

Há três bloqueadores altos confirmados no estado revisado:

1. 18 das 32 fases não têm cano, mas recebem um gatilho invisível de atalho em uma coordenada padrão; agachar no chão de 1-3 salta de 1-3 para 2-3.
2. A escolha da física aquática aponta para 3-2, enquanto os mapas aquáticos são 2-2 e 7-2. Em execução, 2-2 cai com gravidade normal e 3-2 nada.
3. O contrato tipado central não recebeu os valores `contact` e `inside` que a extensão já usa. `bun run typecheck` falha, junto com erros nos novos testes de playthrough.

O runtime e os testes unitários são fortes: 2.593 testes no recorte Jogo 2D/Jogo 2D Avançado passaram e o E2E focado passou 2/2 em servidor limpo. Isso não torna a árvore publicável: o typecheck segue falhando. A única falha inicialmente encontrada na suíte completa, no texto visível do novo bloco de tela por imagem, foi corrigida por uma edição concorrente durante a revisão; a repetição terminou com 7.573/7.573 aprovados.

## Inventário

- 145 arquivos TypeScript/TSX no diretório da extensão.
- 66.315 linhas no recorte.
- 57 arquivos de teste.
- 24 fragmentos de runtime.
- 26 arquivos de exemplos.
- 280 definições de bloco: 273 visíveis e 7 legadas ocultas.
- 277 membros públicos documentados de `window.SZGame2D`.
- 33 exemplos da extensão; o Reino Zero sozinho tem aproximadamente 2.400 linhas.

## Achados funcionais do Reino Zero

### Alto — atalho invisível em 18 fases sem cano

**Evidência:** `levelSpawnPoints` usa `xAtalho = 23 * TILE` e `yAtalho = SURFACE_Y - ATALHO_H` quando `pipeShortcut` não encontra cano (`reinoZero.ts:1504-1515`). O sprite invisível continua ativo e o laço sempre testa `touches(lumi, atalho) + down` (`reinoZero.ts:1873-1885`).

Uma varredura das 32 grades encontrou somente 14 com tile de cano e 18 sem cano: 1-3, 1-4, 2-2, 2-3, 2-4, 3-3, 3-4, 4-3, 4-4, 5-3, 5-4, 6-3, 6-4, 7-2, 7-3, 7-4, 8-3 e 8-4. A simulação real reproduziu `1-3 -> 2-3` ao apertar para baixo sobre chão comum em x=368.

**Impacto:** quebra a progressão e pode pular quatro fases sem qualquer pista visual.

### Alto — mapa aquático e física de natação estão desencontrados

**Evidência:** `levelKind` declara 2-2 e 7-2 como água (`reinoZero.ts:28-30`), mas `swimmingLevel` compara mundo 3 e etapa 2 (`reinoZero.ts:1702`).

Simulação do runtime:

- 2-2, seta para cima no ar: `y 100 -> 100,42`, `vy 0,42` (plataforma com gravidade).
- 3-2, seta para cima no ar: `y 100 -> 99,3796`, `vy -0,6204` (natação).

**Impacto:** as duas fases aquáticas não têm o controle prometido e uma fase subterrânea recebe física incompatível.

### Médio — o casco parado acumula gravidade sem mover

O Reino Zero chama `applyGravityToGroup(cascos)` antes de `updateEnemyType` e `updateEnemyShells` (`reinoZero.ts:1748,1766`). O atualizador normal pula qualquer casco vivo (`runtime/enemies.ts:1342`) e o atualizador de casco pula os estacionários (`runtime/classicPlatformer.ts:448-452`). Assim, a gravidade aumenta `vy`, mas ninguém integra a posição.

Reprodução: depois de pisar no casco e deixá-lo parado por 60 quadros, `y` ficou em 198 enquanto `vy` passou de 0 para 16,8. Quando o casco for lançado, o próximo integrador herda essa velocidade acumulada; quando já está andando, há ainda gravidade no grupo e gravidade dentro de `updateEnemyShells` (`classicPlatformer.ts:460-462`).

### Alto de produto — fidelidade ainda é parcial

Pela intenção registrada em `packages/studio/CLAUDE.md:1284-1288`, a régua é uma réplica mecânica/fases com arte autoral. O estado atual cumpre a espinha dorsal, mas não a equivalência:

| Área | Estado | Observação |
|---|---|---|
| 8 mundos × 4 fases | Presente | 32 grades escritas à mão e testadas |
| Corrida, pulo variável e momentum | Presente | Boa cobertura determinística |
| Mastro, estrela, casco, planta e chefes | Presente | Casco e planta têm defeitos de integração descritos acima |
| Água | Quebrado | Física aplicada às fases erradas |
| Atalhos por cano | Quebrado | 18 gatilhos invisíveis fora de canos |
| Geometria das fases | Aproximação | Todas têm 72 × 15 tiles; não há comprimentos/estruturas equivalentes por fase |
| Power-ups | Parcial | Broto e estrela aparecem parados; forma forte muda desenho/vida, não tamanho |
| Moedas e vidas | Parcial | Moedas pontuam, mas 100 moedas não concedem vida |
| Tijolos e forma grande | Parcial | Não há quebra de tijolo pela forma forte |
| Fogo e obstáculos rotativos | Ausente, documentado | Bola/flor de fogo e barra de fogo foram deixadas fora deliberadamente |
| Castelos | Aproximação | Mesmo arquétipo de chefe; não há labirintos/rotas especiais equivalentes |
| Segunda jornada | Parcial | Aumenta velocidade e adiciona um inimigo; variação pequena |

Conclusão de produto: hoje é uma campanha autoral “inspirada em”, não ainda “as mesmas fases e mecânicas”.

## Achados da extensão Jogo 2D

### Alto — duplicação de contrato tipado já divergiu

`classicIR.ts` aceita corretamente `role: contact` e `side: inside` (`classicIR.ts:83,97`), mas a união manual `JSStatement` em `src/ir/schema.ts` ainda limita os mesmos campos a `decor|solid|platform` e `any|head|feet|left|right` (`schema.ts:2601,2613`). O resultado é falha de compilação em produção, no schema, no Reino Zero e nos testes.

Essa é duplicação de tipo com impacto real, não apenas estética. A fonte canônica deve ser única ou derivada; manter schema de extensão e união central em paralelo já produziu drift.

### Resolvido durante a revisão — codec de fonte passou a preservar código manual inválido

O codec avançado já validava o id contra `GAME_UI_FONT_IDS` justamente para impedir que o `FieldDropdown` coaja um valor desconhecido para a primeira opção (`game-2d-advanced/uiFontCodec.ts:19-56`). No começo da revisão, o codec básico aceitava `SZGame2D.useFont("banana")` como IR tipada. Uma edição concorrente passou a consultar o mesmo catálogo em `classicCodec.ts:611-617`.

**Verificação atual:** o parser devolve `memberCall` para a fonte desconhecida, preservando o trecho como código manual em vez de criar o dropdown.

### Resolvido durante a revisão — contrato de texto visível

O tooltip de `sz_g2d_show_image_screen` inicialmente continha travessão (`blockCatalogGroups.ts:392-393`). Uma edição concorrente o substituiu por pontuação simples. O teste central passou 26/26 depois da mudança.

### Risco arquitetural — runtime em strings concatenadas

Os 24 fragmentos são separados por domínio, o que é positivo, mas são concatenados numa única string/IIFE (`runtime.ts:24-114`). Qualquer crase ou interpolação acidental num comentário impede o parse do runtime inteiro. `templateGuard` e `runtimeTypecheck` mitigam bem o risco, mas a unidade de falha continua sendo toda a extensão.

### Risco arquitetural — exemplo carro-chefe monolítico

`reinoZero.ts` concentra definição de formas, 32 plantas, geração de mapas, pontos de spawn, estados, eventos e laço do jogo em aproximadamente 2.400 linhas. Funções puras como `levelRows`, `levelSpawnPoints` e `LEVEL_PLANS` ajudam, porém defeitos como física 3-2/2-2 e fallback de atalho atravessam dados e execução no mesmo arquivo sem um contrato de fase único.

**Recomendação:** derivar, para cada fase, um descritor único `{kind, grid, spawnPoints, mechanics}` e fazer mapa, movimento, inimigos e testes consumirem esse objeto.

## Código morto e duplicação

- **Arquivos mortos com alta confiança:** 0. O catálogo, codecs, schemas e fragmentos de runtime são alcançados por registradores/geradores; os 7 blocos ocultos são compatibilidade legada intencional.
- **Duplicação de tipo confirmada:** 1 grupo (`classicIR.ts` versus `src/ir/schema.ts`) e já causou falha.
- **Duplicação funcional divergente observada e corrigida durante a revisão:** 1 grupo (validação de fonte no codec avançado versus básico).
- **Possivelmente morto:** nenhum candidato seguro para remoção. Funções dentro das strings do runtime são expostas por inventário gerado; busca por import não é prova de desuso.

## Pontos fortes

- Boa separação dos domínios do runtime em 24 módulos locais à extensão.
- Inventário público e contrato do runtime são derivados e testados.
- Auditoria de pipeline atravessa definição → Blockly → IR → gerador → parser para todos os blocos.
- 32 grades têm auditoria geométrica e agora existe playthrough quadro a quadro.
- Arte vetorial, sem assets de terceiros, preserva a autoria visual.
- Física de corrida/pulo, acessibilidade do touch pad e HUD têm testes de comportamento.
- E2E focado passou em Chromium numa viewport touch de 370 × 844 usando servidor recém-construído.

## Priorização recomendada

1. **P1:** desativar o atalho quando não houver cano e testar todas as 32 fases.
2. **P1:** derivar a física de `levelKind`; cobrir 2-2, 7-2 e um subterrâneo por playthrough.
3. **P1:** eliminar a duplicação do contrato `contact/inside` e devolver o typecheck a verde.
4. **P2:** definir um único dono para gravidade/integração de cascos.
5. **P2 de produto:** fechar uma matriz de fidelidade por fase/mecânica antes de chamar a campanha de réplica.
6. **P3 preventivo:** manter fonte e texto visível cobertos pelos testes que passaram a verde durante esta revisão.

## Verificação observada

- `bun install --frozen-lockfile`: aprovado.
- `bun test src/official-extensions/game-2d`: 2.593 aprovados, 0 falhas.
- `bun test src`: 7.573 aprovados, 0 falhas.
- `bun run typecheck`: falhou, incluindo deriva `contact/inside` e erros nos testes novos.
- Biome do escopo: 146 arquivos aprovados. O `bun run check` global foi reprovado somente por formatação de `src/__scratch/bytes.ts`, arquivo concorrente fora do escopo.
- Playwright focado em servidor limpo: 2 aprovados, 0 falhas.

Relatório de execução detalhado: `./reino-zero-game-2d-full-review-2026-08-12/qa/verification-report.md`.

---

## Remediação — 2026-08-13

**Estado:** todos os achados deste review foram corrigidos; o relatório de verificação passou de FAIL para PASS.

### Bloqueadores funcionais

- O atalho agora é uma capacidade explícita do descritor de fase e só responde quando existe cano. Uma regressão percorre as 32 fases e prova a ausência do warp nas 18 grades sem cano.
- A física aquática deriva do mesmo descritor usado por mapa e tema; 2-2 e 7-2 nadam, 3-2 não.
- Papéis, lados e filtros de tile foram centralizados em `classicContracts.ts` e são compartilhados por IR, runtime e `src/ir/schema.ts`. O typecheck completo voltou a passar.
- O atualizador especializado virou o único dono da física do casco. Parado por 60 quadros, ele mantém posição e `vy = 0`.

### Fidelidade mecânica autoral

A remediação preserva as 32 plantas e a linguagem visual próprias do Reino Zero, sem copiar conteúdo da Nintendo, e fecha as lacunas listadas na matriz original:

| Área | Estado após a remediação |
|---|---|
| Geometria das fases | As 32 grades passaram a ter comprimentos autorais variados entre 72 e 78 tiles; mapa, câmera, portal e spawns usam a largura declarada |
| Power-ups | Broto e estrela percorrem o cenário; a estrela quica |
| Moedas e vidas | A centésima moeda concede vida e reinicia o contador |
| Estados do herói | Pequeno, grande e fogo têm progressão própria; o tamanho físico muda entre pequeno e grande |
| Tijolos | A forma grande ou de fogo quebra tijolos por baixo |
| Fogo | Flor de fogo, projétil móvel e derrota de inimigos implementados |
| Castelos | Barras de fogo com posições variadas e chefes extras nos mundos tardios |
| Segunda jornada | Menos tempo, maior velocidade e composição adicional de cascos, espinhos e voadores |
| Arquitetura do exemplo | Identidade, grade, dimensões, tipo e capacidades reunidos num `LevelDescriptor`; modelo e mecânicas puras extraídos do arquivo principal |

### Evidência final

- `bun run check`: PASS, 1.196 arquivos.
- `bun run typecheck`: PASS.
- Jogo 2D: 2.603 testes aprovados, 0 falhas.
- `src`: 7.583 testes aprovados, 0 falhas.
- Playthrough do Reino Zero: 28 testes aprovados, 0 falhas.
- Playwright focado em servidor limpo: 2 testes aprovados, 0 falhas.

Relatório final: `./reino-zero-game-2d-full-review-2026-08-12/qa/verification-report.md`.
