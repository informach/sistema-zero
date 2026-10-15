# Auditoria do JS Game Starter Kit P27 e encaixe no Studio Pro

Data: 15/10/2026. Escopo: análise técnica e reproduções locais; nenhuma alteração no produto ou no P27. Preferência confirmada pelo usuário: criar um kit próprio do Studio, aproveitando as mecânicas e modernizando a estrutura. “Canvas” significa HTML Canvas 2D.

## 1. Conclusão

O P27 é uma referência didática útil para um kit Pro de sobrevivência em arena. Sua organização por dados, entidades, comportamentos e sistemas é aproveitável. Copiar seu runtime inteiro introduziria problemas de ciclo de vida, controles, carregamento e estado que o Studio já trata em outros caminhos.

A descoberta mais importante é a genealogia: o runtime clássico do Studio já declara origem no P9 e seu pooling referencia o P24. O produto já tem um exemplo de sobrevivência. A contribuição desta integração é tornar essa família de mecânicas disponível em **fontes Pro modulares, editáveis, tipadas, conectadas ao Pinta e verificáveis**.

Proposta executável: [Adendo 6A.2 — kit Canvas próprio](studio-pro-canvas-p27-proposta-2026-10-15.md).

## 2. Método, evidências e limites

- Leitura integral dos 28 módulos JavaScript, HTML e CSS do P27, distribuída entre análise principal e exploração especializada; arquivos centrais verificados diretamente na análise principal.
- Inventário dos 50 arquivos, tamanho e SHA-256; cabeçalhos PNG e referências de spritesheets/áudio verificados.
- Leitura da proposta v2, matriz GameDev, acompanhamento de implementação e caminhos relevantes de catálogo, factories, helpers, assets, runtime, exportação, storage, tutor e motor clássico. Não se trata de auditoria integral de todo o monorepo.
- Microverificações em Node dos módulos originais e execução em Chromium headless com servidor HTTP efêmero em loopback. Para observar o jogo, apenas a resposta de `js/main.js` do servidor de auditoria expôs a instância em `window`; o arquivo original não foi alterado. Um wrapper contou callbacks de RAF. Escape repetido e blur foram eventos sintéticos dirigidos.
- Capturas desktop e viewport estreita inspecionadas. Viewport estreita em Chromium desktop não equivale a teste em dispositivo móvel real.
- O script encerra navegador e servidor e verifica que os hashes do P27 continuam iguais. Não executa configuração de build do material externo.
- Não houve playtest integral de vitória/derrota por inputs reais, medição de FPS/performance de produção, soak ou validação de acessibilidade com tecnologia assistiva. As reproduções não certificam o jogo como pronto.
- O Studio está sendo modificado por outra sessão. O commit observado foi `7981caf7a4fb6773ebb804405bf7ad6f6551814f`, com muitas mudanças locais; o commit sozinho não identifica o estado analisado. O JSON inclui hashes dos principais arquivos de integração.

Na verificação final, os hashes de `games.ts` e `shared.ts` mudaram. Ambos foram relidos: a sessão ativa acrescentou `GameController`/`GameSnapshot`, `controller` no manifesto e perfis/controle de qualidade. A proposta foi ajustada para reusar esses contratos. Os dois gaps de dispatch Canvas e caminho de manifesto descritos abaixo permaneceram presentes nessa releitura. O snapshot inicial das evidências foi preservado, e a revisão final foi registrada separadamente.

Artefatos:

- [Script reproduzível](studio-pro-canvas-p27-repro-2026-10-15.mjs).
- [Inventário, hashes e resultados](studio-pro-canvas-p27-evidencias-2026-10-15/evidence.json).
- [Captura desktop](studio-pro-canvas-p27-evidencias-2026-10-15/p27-desktop.png).
- [Captura de viewport 390 × 844](studio-pro-canvas-p27-evidencias-2026-10-15/p27-mobile-viewport.png).

Reprodução a partir da raiz do monorepo: `node .audits/studio-pro-canvas-p27-repro-2026-10-15.mjs`. Requer Node e o Chromium do Playwright disponível nesta máquina. O aviso Node sobre módulos sem `package.json` pertence ao kit; não foi criado um manifesto na pasta do usuário para suprimi-lo.

## 3. Inventário e capacidade real

Raiz: `C:/Users/tocha/Downloads/162_source_code/JS Game Starter Kit P27/JS Game Starter Kit P27`.

| Categoria | Arquivos | Bytes |
|---|---:|---:|
| JavaScript | 28 | 52.133 |
| HTML | 1 | 1.987 |
| CSS | 1 | 2.881 |
| PNG | 9 | 509.372 |
| MP3 | 11 | 260.149 |
| Total | 50 | 826.522 |

São aproximadamente 1,7 mil linhas de código/HTML/CSS; a contagem por arquivo, incluindo linha final vazia quando presente, está no inventário. Não há README, LICENSE, manifesto npm, testes, build ou CI no diretório.

O jogo tem resolução lógica 1280 × 720, movimento WASD/setas com diagonal normalizada, vida, invulnerabilidade, empurrão, dois comportamentos de inimigos, spawn nas bordas, colisão circular, animações, partículas, som e telas de menu/pausa/fim. A vitória acontece ao sobreviver 60 segundos **ou** derrotar dez inimigos. O combate original é por contato; não há botão de ataque ou projétil.

Não oferece câmera, plataformas, mapas, inventário, fases, multiplayer, persistência, toque ou gamepad. Um menu que cabe em tela pequena não torna o jogo controlável por toque.

### Mapa dos módulos examinados

| Arquivos | Papel |
|---|---|
| `index.html`, `css/styles.css`, `js/main.js` | Página completa, estilos globais e criação imediata de `Game` |
| `js/core/Game.js` | Composição, estado, loading, relógio, input, resize e missão |
| `js/core/constants.js`, `EventEmitter.js` | Configurações e pub/sub síncrono |
| `js/data/playerData.js`, `enemyData.js`, `particleData.js`, `audioData.js` | Dados de personagens, animações, efeitos e sons |
| `js/entities/Player.js`, `Enemy.js`, `Particle.js` | Estado e atualização das entidades |
| `js/entities/behaviours/enemy/SeekBehaviour.js`, `DriftBehaviour.js`, `EnemyBehaviourFactory.js` | Comportamentos de inimigo |
| `js/entities/behaviours/particle/RadialBehaviour.js`, `ImplosionBehaviour.js`, `ParticleBehaviourFactory.js` | Comportamentos de partículas |
| `js/managers/UIManager.js`, `ImageManager.js`, `AudioManager.js` | Interface e carregamento/reprodução |
| `js/managers/EnemyManager.js`, `EnemySpawner.js`, `ParticleManager.js` | Pools, spawn e efeitos |
| `js/managers/CollisionManager.js`, `js/systems/CollisionSystem.js` | Regras de contato e geometria |
| `js/systems/RenderSystem.js` | Canvas, sprites, HUD de inimigos e debug |
| `js/utils/ObjectPooler.js`, `AnimatorController.js` | Reciclagem e animação por estados |

## 4. Achados confirmados

Todos os caminhos desta seção são relativos à raiz P27. “Alta” indica prioridade para incorporar no produto, não uma alegação de vulnerabilidade explorável.

| Prioridade | Achado e evidência | Consequência / tratamento |
|---|---|---|
| Alta | `Game.js:39,70,75,90,108`: init assíncrono no construtor, listeners anônimos e RAF sem ownership; não existe dispose | Substituir a infraestrutura pelo lifecycle Pro; abortar trabalho tardio e cancelar listeners/RAF/áudio |
| Alta | `Game.js:81–85,196–201`: missão verificada antes da atualização/morte e sem guarda de HP | Reprodução: HP=0, `isDead=true`, tempo=60 emite `mission:complete`. Resolver resultado uma vez depois da simulação, com precedência explícita |
| Alta | `Game.js:107–135`: teclado global como único input | Não há jogabilidade móvel. Reusar ações semânticas do Pro e controles de toque acessíveis |
| Alta | `Game.js:17`, `UIManager.js:8–26`, CSS global | Integração direta no DOM do editor é inadequada; executar no preview isolado existente e limitar DOM ao container do jogo |
| Média | `Game.js:87–90`: redraw contínuo mesmo pausado | Chromium registrou 22 callbacks em aproximadamente 350 ms de pausa; relógio do jogo não avançou. O defeito é trabalho gráfico desnecessário, não simulação rodando |
| Média | `Game.js:112–117`: Escape ignora `repeat` | Primeiro evento pausa; evento repetido retoma. Consumir borda da ação, ignorar repetição |
| Média | `Game.js:132–134`: blur só limpa teclas | Estado continuou `playing` após blur. Pausa automática e retomada explícita |
| Média | `Player.js:74–88`, `Enemy.js:74–88`: integração variável do empurrão | Distância com force=520/decay=800: 171,17 px a 120 Hz; 173,33 a 60; 177,78 a 30; 196 a 10. Definir passo fixo limitado |
| Média | `AnimatorController.js:49–64`: avança no máximo um quadro por atualização | A 50 fps, dt=0,1 avança 1 em vez de 5. É limitação ao configurar animações mais rápidas; presets originais têm intervalos ≥0,1 s |
| Média | `RenderSystem.js:15` e `Game.js:189–190`: smoothing configurado antes de redimensionar | Chromium observou `imageSmoothingEnabled=true` após boot. Reaplicar estado do contexto após resize |
| Média | Loaders aguardam eventos sem timeout/cancelamento; `ImageManager.js:42–44` acrescenta atraso de 1.000 ms | Loading pode permanecer pendente; fallback não produz diagnóstico estruturado. Diferenciar erro fatal de recurso opcional |
| Média | `ObjectPooler.js:14–20`: pool cresce sem teto | Microcheck: tamanho inicial 1 aceita três ativos. Pré-alocação não é limite. Definir saturação e reset completos |
| Média | Canvas dimensionado pela janela; HUD ancorado na viewport | Captura estreita: arena de 360 × 202,5 em y=320,75; vida/tempo no topo, longe da arena. Usar container comum, área segura e layout móvel |
| Média | `AudioManager.js:37–40`: uma instância por som, replay reinicia `currentTime` | Sem vozes simultâneas do mesmo efeito, mute/canais/cleanup. Reusar som opt-in e acrescentar mixer limitado apenas quando necessário |

O reset de estado do Canvas ao atribuir width é comportamento documentado da plataforma. RAF também acompanha a taxa de atualização e costuma ser suspenso em abas ocultas; nenhum dos dois substitui uma política explícita de jogo. [MDN: canvas.width](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/width), [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).

### Acoplamento, duplicação e código sem uso

- Jogador e inimigo repetem empurrão, invulnerabilidade e parte do dano. São candidatos a funções puras pequenas; uma hierarquia extensa de entidades não é necessária.
- Morte depende do nome da animação (`Player.js:117`, `Enemy.js:113`). Alterar arte pode alterar uma regra. HP/estado lógico deve ser autoridade; animação apresenta o estado.
- Colisão acontece depois de mover o jogador e antes de mover inimigos (`Game.js:95,103–104`). Definir ordem única de integração/contatos/resultados.
- `EnemyManager.getActiveEnemies` aloca lista por frame; `release` usa `indexOf/splice`; partículas alocam novos comportamentos. São pontos de profiling, não prova de gargalo no demo atual.
- RNG visual e de gameplay usa `Math.random`; reset do jogador sorteia duas vezes. Seeds separadas evitam que efeitos decorativos alterem a partida.
- `player.png`, `enemy_seeker.png`, `enemy_drifter.png` não são consumidos pelo loader/render atual: 3.357 bytes de mídia excedente. O campo `enemyData.seeker.image` também não é lido pela renderização atual.
- Não há arquivos JS inteiros demonstrados como mortos. Separar CollisionSystem de CollisionManager é geometria versus regra, não duplicação só por nomes parecidos.
- Não há tipos estáticos ou validação de configuração. Isso é uma lacuna de contrato, não uma contagem artificial de usos de `any` em JavaScript.

## 5. Assets, dimensões e procedência

| Spritesheet usada | Dimensão | PNG (bytes) |
|---|---:|---:|
| `player_sheet.png` | 832 × 3456 | 330.325 |
| `player_sheet2.png` | 832 × 3456 | 125.357 |
| `enemy_drifter_sheet.png` | 512 × 192 | 13.593 |
| `enemy_drifter_sheet2.png` | 512 × 192 | 17.532 |
| `enemy_seeker_sheet.png` | 704 × 192 | 8.499 |
| `enemy_seeker_sheet2.png` | 704 × 192 | 10.709 |
| Total | — | 506.015 |

As seis sheets representam 24.870.912 bytes em RGBA de quatro bytes por pixel, aproximadamente 23,72 MiB. Isso é cálculo pelas dimensões, **não medição de heap/GPU**; decoders, cópias e áudio acrescentam custos. Os dois atlas do jogador dominam essa conta, com muitas linhas não usadas pelos estados configurados.

As 28 combinações entre sheet e estado têm recortes dentro dos arquivos. As onze referências MP3 existem. No navegador, as seis sheets e os onze sons chegaram ao estado carregado. Não houve exceção de página no ensaio curto.

Não foi encontrada declaração de licença/autoria no pacote local. A referência a Franks Laboratory no código clássico não comprova a licença de cada arquivo P27. A proposta recomenda implementação e pack próprios; qualquer incorporação textual ou artística futura precisa registrar origem, termos e créditos por item. Não se conclui que o material é proibido ou liberado a partir dessa ausência.

## 6. Relação com o Studio existente

| Preocupação | P27 | Studio clássico | Pro em implementação |
|---|---|---|---|
| Motor Canvas | Jogo vanilla de página inteira | `SZGameKit` declara base P9; pools P24 | Puzzle Canvas + contrato de kits |
| Sobrevivência | Arena, contato e missão simples | Exemplo Sobrevivente Profissional com câmera, tiros e progressão | Ainda não há template Pro dessa família |
| Lifecycle/input | Sem dispose; só teclado | Runtime próprio dos blocos | Helpers de UI/input/RAF/dispose compartilhados |
| Arte | Caminhos fixos e dados próprios | Contratos de Pinta/sprites | `Project.assets` → manifesto com hash e metadados |
| Recorde | Ausente | APIs clássicas existentes | Bridge de storage por projeto/perfil; recorde local |
| IA | Ausente | Tutor por blocos | Zappy por arquivos; construtor por revisões em andamento |

Evidências centrais:

- [Genealogia P9](../packages/studio/src/official-extensions/game-2d-advanced/runtime.ts), comentário inicial; [pools P24](../packages/studio/src/official-extensions/game-2d-advanced/runtime/pools.ts).
- [Sobrevivente Profissional existente](../packages/studio/src/official-extensions/game-2d-advanced/__gen_sobreviventeProfissional.ts).
- [Catálogo canônico Pro](../packages/core/src/studio/pro-templates.ts), [helpers compartilhados](../packages/studio/src/components/code/pro-templates/games/shared.ts).
- [Contrato de sprite/Pinta](../packages/studio/src/core/project.ts), [materialização de assets](../packages/studio/src/core/proAssets.ts).

Dois pontos concretos devem entrar no adendo:

1. [games.ts](../packages/studio/src/components/code/pro-templates/games.ts) despacha qualquer engine Canvas para `canvasSources()` sem ID. Apenas cadastrar outro card geraria o puzzle.
2. O mesmo arquivo anuncia `public/assets/manifest.json`, enquanto [proAssetPaths.ts](../packages/studio/src/core/proAssetPaths.ts) define `public/studio-assets/manifest.json`. O caminho servido não contém `public/`. A documentação/template deve derivar da constante canônica.

## 7. Disposição recomendada

Preservar como referência: arquitetura por dados, comportamentos `seek/drift`, animações por estado, geometria circular, efeitos e missão. Reutilizar do Studio: catálogo, projeto, input, UI, lifecycle, progresso, materiais, editor, runtime e Zappy. Implementar no novo kit: modelo puro de arena, ordem determinística de atualização, adaptador de sprites Pinta, renderer e configurações didáticas.

Não importar o IIFE/string global clássico como se fosse SDK ESM; não condicionar este kit à reescrita de todo o motor clássico. Extrair algoritmos pequenos quando a fronteira e a regressão estiverem demonstradas. Não ampliar limites nem adicionar engine externa para reproduzir essas mecânicas.
