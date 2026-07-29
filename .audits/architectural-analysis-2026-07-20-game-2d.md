# Full review — extensão Jogo 2D

**Data:** 2026-07-20  
**Escopo:** `packages/studio/src/official-extensions/game-2d` e integrações diretas no Blockly, IR, gerador, parser e preview  
**Inventário:** 42 arquivos (24 de implementação e 18 de teste), 20.452 linhas (13.054 de implementação e 7.398 de teste)  
**Superfície:** 196 definições de bloco, 194 visíveis, 2 legadas ocultas, 194 membros públicos de runtime, 24 subcategorias e 14 exemplos

## Resumo executivo

A extensão tem uma base incomumente forte para uma ferramenta educacional: o runtime é dividido por domínio, reinícios possuem hooks de limpeza, os exemplos são executados ponta a ponta, o contrato público é auditado e o pipeline IR → Blockly → IR → JavaScript → IR tem cobertura ampla. Não encontrei arquivo ou export morto com alta confiança; os dois blocos ocultos são compatibilidade intencional (`sz_g2d_on_start` e `sz_g2d_draw_hearts`).

O review encontrou um vazamento de recursos de alta gravidade no preview compartilhado por Jogo 2D e Jogo 2D Avançado. Listeners nomeados, timers e RAFs avulsos sobreviviam ao restart e multiplicavam callbacks. A causa foi corrigida na infraestrutura da execução, não mascarada no runtime do jogo.

O projeto de asteroides fornecido para reprodução expôs um segundo defeito, independente do vazamento: sua raiz `g2d:everyFrames` criava asteroides fora da condição `sceneIs("jogando")`. Enquanto a tela de derrota/início ficava aberta, o grupo crescia sem ser atualizado nem podado. O exemplo oficial já preservava essa condição; o arquivo baixado foi produzido por uma sequência de conteúdo da aula que envolvia apenas `A cada quadro` depois que a raiz periódica já havia sido separada. Os dois roteiros dessa aula agora protegem também o gerador periódico, com regressão no package isolado `studio-aulas`.

## Correções realizadas neste review

### Alta — recursos duplicados depois do restart

**Causa:** somente eventos inline recebiam `AbortSignal`; eventos nomeados, `setTimeout`, `setInterval` e RAFs avulsos usavam os globais do iframe sem proprietário de ciclo de vida.

**Correção:** `ProjectRunContext` passou a possuir e descartar listeners, timeouts, intervalos e RAFs de cada factory. O gerador usa o contexto apenas nos targets com lifecycle gerenciado; a geração core permanece inalterada. O parser reconhece a infraestrutura gerada e reconstrói a mesma IR, preservando o round-trip.

**Prova de regressão:** o cenário executa duas factories no mesmo documento para Jogo 2D e Jogo 2D Avançado e verifica um único listener, cinco timers e três RAFs ativos, inclusive callback nomeado e RAF recursivo.

### Alta — asteroides acumulados fora da partida

**Diagnóstico do arquivo:** `g2d:updateEachFrame` protege atualização, desenho e poda com a cena `jogando`, mas `g2d:everyFrames` é uma raiz irmã cujo corpo contém `spawnAsteroid` sem guarda de cena. Não há `setInterval` genérico nesse projeto; portanto, o vazamento de recursos poderia agravar outros projetos, mas não é a causa direta desta reprodução.

**Correção no escopo da extensão:**

- o exemplo oficial exige raiz periódica independente com `if sceneIs("jogando")` no corpo;
- o playthrough espera 80 quadros antes da primeira partida e depois do restart e prova que o grupo continua vazio;
- tooltips, documentação e contexto da IA avisam que raízes periódicas rodam em todas as telas.

**Correção no conteúdo isolado:** `dia-3-tela-sincronizada` e `dia-3-jogo-completo` agora envolvem também `sz_g2d_every_frames` em `se a tela atual é jogando?`. Um teste carrega os roteiros reais e exige a guarda e sua condição.

### Média — consulta de invencibilidade ausente

Foi adicionada a expressão booleana `o sprite está invencível?` em **❤️ Vida**. Ela usa a mesma condição de `damageSprite` (`blinkFrames > 0`), então efeitos podem ser protegidos com `não` sem duplicar a regra de dano. O bloco participa de catálogo, toolbox, allowlist, schema, Blockly ↔ IR, gerador, parser, runtime, contrato, docs e prompts.

### Média — barras de rolagem durante o tremor

O preparo do palco agora trava `overflow: hidden` em `html` e `body`. Um teste no navegador força um tremor determinístico, confirma o transform ativo e prova que não surge diferença entre dimensões de scroll e viewport.

### Média — sombras ausentes em Placar e HUD

Todos os soquetes de valor visíveis da categoria agora nascem preenchidos. Foram acrescentadas sombras para `drawScore.VALUE` e `drawBar.VALUE/MAX`; o bloco legado de corações também recebeu `COUNT`. A tabela de migração foi sincronizada para que as sombras sobrevivam à Ponte e à reabertura do projeto.

### Baixa — colisão genérica dentro do Kit espaço

`sz_g2d_on_sprite_group_overlap` foi movido de **🚀 Kit espaço** para **💥 Colisões**. O bloco já era genérico e é usado por jogos espaciais, plataforma, coleta de moedas e Dino Run; a nova posição corresponde ao conceito, não ao tema de um exemplo.

## Pontos fortes confirmados

- **Cobertura executável dos 14 exemplos.** Há validação de schema, ausência de `rawJS`, round-trip por blocos, parser da Ponte e playthroughs reais do runtime.
- **Contrato público auditável.** `runtimeContract.ts` e `GAME_TWO_D_API_KEYS` travam a superfície exposta e detectam drift entre documentação e runtime.
- **Restart por domínio.** Palco, entrada, mundo, áudio e kits registram hooks próprios, reduzindo o risco de um reset central esquecer estado novo.
- **Scheduler único a 60 Hz lógico.** Pausa, cadências e callbacks de quadro compartilham o mesmo dono e não criam um RAF por bloco de atualização.
- **Defesas adequadas para crianças.** Limites de grupo, fallbacks visuais de assets, avisos `warnOnce`, limpeza de input em `blur` e erros isolados por raiz evitam que um erro pequeno derrube toda a partida.
- **Acessibilidade inicial do canvas.** O palco recebe descrição, `aria-label`/`aria-describedby` e região viva para telas/cenas.
- **Sem abuso de tipos na implementação da extensão.** Não há `any`, `@ts-ignore` ou `@ts-expect-error` nos arquivos de produção do diretório. As asserções `as unknown` encontradas estão concentradas nos harnesses de teste que simulam DOM/runtime dinâmico.

## Fechamento dos achados complementares

### Média — tilemap desenha o mapa inteiro a cada quadro

`runtime/world.ts::drawTileMap` percorre todas as linhas e colunas e chama `drawFrame` para cada célula não vazia, mesmo fora da viewport. O import aceita mapas de até 128 × 128, portanto um mapa cheio pode chegar a 16.384 desenhos por quadro.

**Correção:** `drawTileMap` calcula o intervalo visível a partir de câmera, `ox/oy`, tamanho do tile e viewport, limita os índices e respeita linhas irregulares. A regressão reduz um mapa cheio de 128 × 128 de 16.384 para 240 desenhos na viewport testada.

### Média — HUD dinâmico não é anunciado ao leitor de tela

`showScreen` e a descrição do palco alimentam a região acessível, mas `drawScore`, `drawSpriteHealth` e `drawBar` desenham apenas no canvas.

**Correção:** placar, barra e vidas alimentam uma região viva separada dos anúncios de cena. Valores iguais não geram trabalho; mudanças próximas são agrupadas e publicadas no máximo a cada 500 ms do relógio da partida. Restart limpa o canal pelo domínio do palco.

### Média — `moveToward` ultrapassa o alvo e oscila

`runtime/utilities.ts::moveToward` sempre soma exatamente `speed`, mesmo quando a distância restante é menor, e altera posição sem atualizar `vx/vy`. No probe, um alvo a 3 px com velocidade 6 alterna entre os dois lados.

**Correção:** o passo é limitado à distância restante, a posição fecha exatamente sobre o alvo e `vx/vy` registram o deslocamento real do quadro; distância zero produz velocidade zero.

### Média — adicionar um bloco exige shotgun surgery

Uma expressão simples atravessa catálogo, categoria, allowlist, união TypeScript, schema Zod, Blockly → IR, IR → Blockly, gerador, coletor de identificadores, parser, runtime, contrato, docs e prompts. `blockCatalog.ts` tem 2.804 linhas e `runtimeContract.ts`, 762.

**Correção incremental:** a allowlist de sanitização é derivada de `OFFICIAL_CATALOG[].blockly.blocks`, eliminando mais de mil linhas de listas duplicadas no store. O inventário tipado da API também monta `window.SZGame2D`, inclusive os wrappers de câmera. Gerador, parser e schema continuam explícitos porque representam comportamento, não cópia mecânica.

### Média — runtime em strings escapa da checagem TypeScript

Os módulos de runtime são template strings concatenadas. O contrato público é manual e bem testado, mas a implementação JavaScript injetada não é typechecked como código-fonte.

**Correção:** a suíte cria um programa TypeScript sobre o JavaScript final concatenado, com DOM e contrato explícito das propriedades fornecidas pelo host. Referências e propriedades inexistentes falham semanticamente no CI; o primeiro ciclo vermelho encontrou e corrigiu o estreitamento incorreto de `EventTarget` no ponteiro.

### Baixa — `arrowsX` altera o eixo vertical

Apesar do nome e tooltip “só na horizontal”, `runtime/world.ts::arrowsX` executa `sprite.vy = 0`.

**Correção:** `arrowsX` não altera mais `vy`; a regressão começa com velocidade vertical 7 e exige sua preservação.

### Baixa — WASD depende de letras minúsculas

Os listeners comparam `e.key` a `a/d/w/s`; com Caps Lock ou alguns layouts, `e.key` pode ser maiúsculo. As setas continuam funcionando.

**Correção:** eventos e consultas compartilham uma normalização de `e.key`/`e.code`; letras viram minúsculas e `KeyA`–`KeyZ` são reconhecidos mesmo com Caps Lock.

### Decisão de produto — progressão pertence à aula

A extensão entra em `iniciante-2d` e todos os 194 blocos visíveis chegam juntos. A boa divisão em 24 assuntos reduz a busca, mas não existe liberação gradual por nível/conceito.

**Decisão:** não alterar. Todos os blocos permanecem disponíveis em `iniciante-2d`; o professor controla a progressão e a seleção dentro da aula. Este item deixa de ser tratado como defeito da extensão.

### Baixa — controles virtuais dependem do host do player

O iframe aceita mensagens `sz:gamepad` e `StudioProjectPlayer` expõe `ref` para o host, mas o preview do editor não inclui um gamepad virtual próprio.

**Correção:** o preview detecta touch/ponteiro grosseiro e nós de teclado na IR, então mostra automaticamente direcional, Espaço e Enter. `pointerdown/up/cancel` enviam o par de eventos pela ponte existente; o aluno pode ocultar e restaurar o overlay.

## Código morto, duplicação e tipos

- **Arquivos mortos:** 0 confirmados.
- **Exports mortos:** 0 confirmados; callbacks e funções do runtime são alcançados por composição em string e pela superfície global, por isso busca textual isolada geraria falsos positivos.
- **Compatibilidade intencional:** 2 blocos ocultos, ambos cobertos por teste e migração; não remover.
- **Duplicação exata removível:** nenhuma confirmada.
- **Duplicação estrutural:** o contrato de runtime e os vários registries repetem informação por necessidade atual; os testes de drift reduzem o risco, mas não eliminam o custo de atualização em muitos arquivos.
- **Ciclos de importação no diretório:** nenhum ciclo relevante identificado na composição da extensão.
- **Supressões TypeScript em produção:** 0.

## Situação final

Todos os achados acionáveis foram corrigidos. A liberação gradual foi reclassificada como decisão intencional de produto após esclarecimento do responsável pedagógico.

## Verificação executada

- `bun test src/official-extensions/game-2d/__tests__`: **635 passaram, 0 falharam**.
- `bun test src/official-extensions/game-2d`: **1.296 passaram, 0 falharam** nos dois motores alcançados pelo prefixo.
- lifecycle + gerador + parser: **220 passaram, 0 falharam**, inclusive descarte e round-trip dos recursos.
- `bun run typecheck`: **exit 0**.
- Biome no conjunto isolado de 51 arquivos: **limpo**. A varredura maior de 55 arquivos também encontrou seis diferenças de formatação em imports de quatro arquivos com mudanças paralelas de codecs (`buildIR.ts`, `workspaceState.ts`, `generators/expr.ts` e `generators/js.ts`); elas não foram reescritas para não interferir naquele trabalho.
- Playwright/Chromium: **24/24** cenários `game-2d:` passaram; a bateria complementar passou **10/10**, incluindo tremor sem scrollbar e DPR 1×/2×/3×. São 25 cenários únicos da extensão.

### Verificação final dos achados complementares

- `bun test src/official-extensions/game-2d/__tests__`: **641 passaram, 0 falharam**, 3.593 asserções em 19 arquivos;
- suíte completa `bun test src`: **4.642 passaram, 0 falharam**, 45.140 asserções em 302 arquivos;
- preview, gamepad, ponte de entrada, importação e lifecycle: **61 passaram, 0 falharam** no gate focado;
- `studio-aulas`: **6 passaram, 0 falharam**; `typecheck` e Biome aprovados;
- Biome nos 18 arquivos TypeScript/TSX centrais desta rodada: limpo;
- checagem semântica do runtime injetado: aprovada.

Dois gates globais ficaram bloqueados por mudanças paralelas fora deste review:

- `bun run typecheck` aponta erros apenas em `src/parsers/js.ts`, na migração em andamento para tipos Babel;
- os 25 cenários Chromium não chegam à galeria porque o Vite lança `process is not defined` dentro de `@babel/types`, dependência adicionada pela mesma migração. Todos falham no mesmo seletor inicial, antes de executar código do Jogo 2D.
