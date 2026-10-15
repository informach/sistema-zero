# GameDev — análise aprofundada e matriz de aproveitamento no Pro

Complemento da [proposta consolidada v2](studio-pro-proposta-v2-2026-10-15.md). Raiz examinada: `C:/Users/tocha/Downloads/06 - Game Dev (MakeCode Arcade)/GameDev`. Os caminhos de origem abaixo são relativos a essa raiz. Conteúdo externo foi tratado como material de análise; nenhum script/skill baixado ganhou autoridade sobre o projeto.

## 1. O que existe de fato na coleção

O inventário abrange 3.067 arquivos, aproximadamente 189,7 MB decimais, em 14 diretórios. São 373 SKILL.md, com 359 conteúdos distintos. Não são 373 kits de jogo: há duplicações entre ferramentas, instruções conceituais, material de motores nativos, exemplos executáveis, mídia de apresentação e referências de assets.

| Diretório | Arquivos | SKILL.md | Natureza e decisão |
|---|---:|---:|---|
| AlterLab_GameForge-main | 115 | 34 | Processo de design/arte/áudio/testes. Converter papéis em etapas curtas e verificadores |
| Claude-Code-Game-Studios-main | 412 | 72 | Especificações, produção, revisão, performance, playtest. Adaptar contratos; evitar cerimônia e organização extensa de agentes |
| ai-game-spritesheets-main | 35 | 0 | Prompts, exemplos PNG/GIF, direção e revisão de sprites. Não contém toda a automação comercial mencionada |
| awesome-agent-skills-main | 4 | 0 | Catálogo de links para descoberta/proveniência; não representa milhares de skills instaladas |
| cc-skills-main | 24 | 5 | Práticas selecionadas de UI/frontend. Reuso pontual, sem importar conteúdo alheio ao jogo |
| everything-game-dev-code-main | 657 | 87 | Conhecimento amplo, scripts e três implementações de exemplos em samples; alto valor para 2D |
| godogen-master | 60 | 4 | Pipeline para gerar, executar, capturar e revisar jogos Godot/Bevy. Reaproveitar o ciclo e artefatos, não os runtimes nativos |
| love2d-pocket-bomber-game-main | 47 | 2 | Jogo Lua/LÖVE modular com regras e controles; portar regras para motor web |
| phaserjs-oakwoods-main | 39 | 4 | Plataforma Phaser, parallax e animações; assets não acompanham integralmente o código |
| skills-main | 1.209 | 140 | Coleção geral; filtrar engenharia, acessibilidade, testes e interfaces úteis ao Studio |
| threejs-capacitor-ios-game-main | 24 | 3 | Documentação, referências e mídia; útil para câmera/input/empacotamento como referência, não um kit web completo pronto |
| threejs-tactics-game-main | 33 | 3 | Referências de jogo tático, modelos/instruções e mídia; exige implementação/adaptação para virar template |
| vibe-isometric-sprites-main | 100 | 3 | Assets, scripts de geração e referências de perspectiva isométrica; adaptar pipeline ao Pinta e biblioteca |
| vibejam-starter-pack-main | 308 | 16 | Maior concentração de jogos web, assets Three, TinySwords, Oakwoods e referências reutilizáveis |

Inventários verificáveis: [todos os arquivos e hashes](studio-gamedev-file-inventory-2026-10-15.csv), [skills](studio-gamedev-skills-inventory-2026-10-15.csv), [glTF e estrutura](studio-gamedev-structure-evidence-2026-10-15.json).

A pasta não é um pacote MakeCode pronto para embutir. O rótulo da pasta não deve determinar a arquitetura. O contexto de destino é o Pro web com arquivos, npm, assets, preview e IA.

## 2. Jogos 2D: código concreto que vale adaptar

### PirateInvaders e PirateInvadersImagesGen

Origens: `everything-game-dev-code-main/samples/PirateInvaders` e `samples/PirateInvadersImagesGen`. Phaser 3 com Vite, entidades e cenas separadas. Há Bullet, Enemy, Player, PowerUp, Boot/Menu/Game/Pause/GameOver, gerenciadores de áudio/pontuação/ondas/save, touch e geração procedural de assets.

O valor é um jogo de referência com começo, progressão, fim e reinício, além de módulos úteis ao construtor. A variante ImagesGen acrescenta imagens e manifesto; deve ser uma variante visual do mesmo kit, não dois produtos duplicados.

Adaptações obrigatórias:

- Instalação npm e lock compatíveis com o Studio; eliminar dependência da configuração antiga do repositório.
- Assets no manifesto compartilhado, com dimensions, hitbox e escala separados do tamanho bruto da imagem.
- Áudio com desbloqueio por gesto, mute e lifecycle; controles equivalentes em teclado/touch.
- Revisar limites de pools: há caminhos de criação adicional quando não se encontra objeto morto. A existência de `maxSize` no grupo não prova, sozinha, um teto de alocação para todo o código.
- `LeaderboardClient` usa endpoint próprio `/pirate-invaders/api`, que não é automaticamente oferecido pelo Studio. Adaptar como capacidade opcional; o kit básico funciona sem ranking online. Se houver ranking público, validação no servidor é um requisito separado.
- Usar fixtures com ondas, pontuação, colisão, pausa e reinício; screenshot sozinho não prova a regra.

### Tetris2DMutation

Origem: `everything-game-dev-code-main/samples/Tetris2DMutation`. Canvas 2D em módulos ES, com tabuleiro, peça, mutações, render, input, áudio, storage, pontuação, partículas e estados.

É a melhor primeira referência para um kit 2D pequeno sem motor externo. Extrair regras puras do tabuleiro e fixtures determinísticas; separar estado de desenho; acrescentar start/pause/dispose e cancelamento de requestAnimationFrame. O main registra click e touchstart: unificar a entrada para evitar eventual ativação duplicada por click sintetizado, comportamento a confirmar no playtest.

O aproveitamento inclui puzzle de grid, prévia de peça, progressão, feedback, estados e temas. O nome do exemplo não obriga o produto a usar a mesma marca/apresentação; a mecânica pode gerar desafios originais adequados ao Studio.

### Oakwoods

Origens: `phaserjs-oakwoods-main` e a cópia no VibeJam. Phaser Canvas/Arcade, cenário base 320×180, tiles de 24 px, parallax em três camadas, personagem de sprite maior que a hitbox e ações ligadas a estados de animação.

O código de boot detecta assets ausentes e interrompe com mensagem. Logo, não é um pacote imediatamente funcional com toda a arte no download. O mapa examinado tem grade finita de 500 colunas por 8 linhas; não descrever o exemplo como geração infinita já implementada.

Reaproveitar pulo/movimento, follow camera, parallax, colisão e ações orientadas a eventos de animação. Completar arte autorizada, organizar manifestos, medir colisão/escala e usar mapas menores para o primeiro carregamento. Evitar carregar as duas cópias do kit.

### PocketBomber

Origem: `love2d-pocket-bomber-game-main`, com 23 arquivos Lua, estados, grade, player, bombas, explosões, inimigos, partículas, câmera, UI, save e touch. Há cinco fases e três tipos de inimigo.

Portar o modelo de regras, não instalar uma VM Lua: ocupação da grade, bloqueio de movimento, temporização, propagação da explosão, reação em cadeia e condição de fim. O código já usa dt para o pavio e feedback visual; transformar a aleatoriedade de teste em seed controlável. Consultas de bombas/inimigos podem aproveitar estruturas por célula conforme escala.

Correção de precisão em relação à primeira leitura: o README declara MIT. Ausência de LICENSE avulso não é prova de ausência de licença. Ainda é preciso registrar a origem de conteúdo de terceiros eventualmente associado.

### TinySwords

Origem: VibeJam, jogo Phaser 3.70 via CDN em HTML extenso, com tiles, seleção, turnos, guerreiros/arqueiros, recrutamento e UI. A coleção contém cerca de 50 PNG nesse conjunto.

A skill de tilemap é valiosa: grid de 64 px, sprites/sombras que podem ocupar 128 px, deslocamentos de desenho, camadas de água/espuma/terreno/objetos, âncoras e UI nine-slice. Separar tamanho do sprite, área ocupada na grade e posição de colisão resolve muitos erros comuns da IA.

Adaptar CDN para pacote npm fixado, dividir HTML monolítico em módulos, levar assets/save ao contrato Pro, garantir seleção por touch e uma ordem de camadas determinística. Efeitos de água/espuma não devem consumir o mesmo orçamento em todos os dispositivos.

## 3. Jogos 3D: o que aproveitar e o que precisa de engenharia

### Forest Census

Origem: `vibejam-starter-pack-main/projects/forest-census/public/forest/index.html`, com documentos PRD/TDD e catálogo de assets. É uma base de exploração/observação/coleta com personagem, câmera, NPCs, animação, colisores e objetivo.

O loader usa cache e clones de esqueletos, úteis como referência. O cache é preenchido depois do await; pedidos concorrentes pelo mesmo asset podem iniciar trabalho duplicado. Adaptar para cache de promises com tratamento de falha e descarte por ownership. Normalizar altura/chão, orientação e mapeamento de animações a partir de metadados.

Há alocações de vetores e consultas lineares por frame, e verificações de visão/raycast sobre NPCs/oclusores. A proposta é medir, reaproveitar o grid espacial já presente no Studio e escalonar consultas de percepção de NPCs fora da câmera. Isso é uma hipótese de otimização baseada no código, não medição de FPS do jogo externo.

### Toonshooter

Origem: `vibejam-starter-pack-main/projects/toonshooter/public/toonshooter/index.html`. Base extensa de ação, movimentação, câmera, animação, alvos, efeitos e HUD, com assets glTF.

Fragmentar em módulos, estabelecer limites de inimigos/projéteis/partículas e adaptar a temática para o público, por exemplo alvos lúdicos/robôs e feedback sem conteúdo gráfico. Não basta trocar o texto do prompt mantendo interfaces de armas/efeitos inadequadas.

Há criação de geometrias/materiais em efeitos transitórios. O código **também faz dispose** de partículas, fumaça e tracers. Portanto, o problema potencial é churn/alocação, não uma conclusão de vazamento permanente. Pooling e compartilhamento devem ser verificados com profiler e regras claras de ownership.

### Threejs Builder, Tactics e Capacitor

Há versões repetidas de `threejs-builder` nas pastas `.claude`, `.codex` e `.agents`. Reutilizar contratos de personagem, animação, câmera, escala, luz e inspeção visual, escolhendo uma versão canônica adaptada.

Não copiar uma orientação universal de “frente = -Z”: modelos e exemplos podem usar +Z. A frente do asset é metadado normalizado, e a câmera/controle usa essa convenção. Mapeamento de clips por primeira correspondência parcial pode ligar a animação errada; preferir tabela explícita validada, com estado fallback conhecido.

Threejs Tactics tem material útil para estética/organização de jogo tático, mas não deve ser contado como aplicação pronta equivalente a Forest/Toonshooter. A pasta Capacitor traz referências para touch/terceira pessoa e distribuição nativa; aproveitar controles/câmera no Pro web. Publicar aplicativo iOS não é dependência para criar jogos 3D no Studio.

### Custos dos modelos medidos em metadados

Foram lidos os metadados dos **93 arquivos glTF** do inventário. Números abaixo são por asset; não representam automaticamente o total de uma cena ou de cada frame.

| Asset | Arquivo | Triângulos indexados | Meshes / materiais | Animações |
|---|---:|---:|---:|---:|
| Character_Soldier | 2.343.513 B | 20.725 | 18 / 11 | 17 |
| Character_Hazmat | 2.325.520 B | 20.359 | 16 / 9 | 17 |
| Character_Enemy | 2.274.104 B | 19.491 | 16 / 10 | 17 |
| Forest Female2 | 922.785 B | 4.928 | 1 / 1 | 18 |
| Forest Female1 | 868.447 B | 3.596 | 1 / 1 | 18 |

Os três personagens Toon somam aproximadamente 6,94 MB de glTF antes de considerar o resto do jogo. Selecionar assets e clips, avaliar GLB otimizado, compressão/decoders, LOD e texturas. Não importar automaticamente todos os 93 modelos em cada template. A decisão entre formatos deve considerar tempo de decodificação e memória, não só bytes de download.

## 4. Pipeline de arte que pode melhorar muito a IA

As pastas de sprites e as skills de assets oferecem mais valor quando viram um processo verificável integrado ao Pinta/Molda:

1. **Direção visual curta:** paleta, perspectiva, escala relativa, outline, sombra e referências autorizadas.
2. **Especificação por asset:** função no jogo, tamanho de exibição, limites de arquivo/textura, frames/clips necessários, pivô/orientação e hitbox.
3. **Reuso antes de geração:** buscar biblioteca existente pelo manifesto; evitar gerar o mesmo personagem ou ícone em cada execução.
4. **Geração como job:** ID, orçamento, provider suportado, cancelamento, idempotência e artefatos rastreáveis. Scripts fal/RetroDiffusion baixados são referência de integração, não backend pronto da plataforma.
5. **Normalização 2D:** alpha real, canvas/frame constante, base/pivô alinhados, escala consistente e recorte seguro. Transparência aparente em fundo quadriculado não substitui canal alpha.
6. **Normalização 3D:** bounds, escala, orientação, materiais/texturas, nomes/duração de clips, colisores e custo estimado.
7. **Revisão:** contact sheet, animação em movimento, teste no kit e screenshot contextual.
8. **Publicação na biblioteca:** versão, hash, origem/licença, parâmetros usados e relação com o projeto. O jogo usa a versão aceita, não um resultado parcialmente gerado.

`everything-game-dev-code-main/scripts/validate-generated-assets.js` implementa validações reais de PNG/alpha/cantos/dimensões, mas usa decoder próprio e inflate síncrono, com suporte limitado a formatos PNG. Reaproveitar **o contrato e os casos**, não copiar esse decoder como processamento geral de upload. Usar biblioteca apropriada e impor limites antes de descompressão, em worker/serviço isolado.

`scripts/hooks/performance-budget-warning.js` procura palavras relacionadas a performance. É um lembrete, **não um profiler**. Já `/perf-profile` de Claude-Code-Game-Studios organiza análise e estimativas; não mede sozinho frame time/GPU. No Studio, toda conclusão de desempenho precisa anexar cenário e dados reais.

O pipeline Godogen contribui com alvo visual, decomposição, priorização de risco, estado durável e captura de evidência. Adaptar sua sequência à educação: a primeira mecânica jogável pode usar assets provisórios consistentes, em vez de impor geração paga de toda a arte antes de testar o jogo. Critério é resultado verificável e aprendizado, não reproduzir as regras organizacionais do repositório original.

## 5. Matriz completa de capacidades reaproveitáveis

Legenda: **direto adaptado** = código/asset exige integração e verificação; **conceito** = portar contrato/conhecimento; **referência** = não é recurso executável pronto. Lotes são os da proposta principal. Todos os itens permanecem no escopo ou têm destinação explícita; o objetivo não é instalar toda a coleção.

| Capacidade | Origem principal | Forma de aproveitamento no Studio | Lote |
|---|---|---|---|
| Puzzle e regras de grid | Tetris2DMutation | Direto adaptado; lógica pura + Canvas + testes de regras | 6A |
| Ondas e arcade | PirateInvaders | Direto adaptado; Phaser e catálogo de mecânicas | 6A |
| Variante visual consistente | PirateInvadersImagesGen | Fixture de arte/escala/colisão do mesmo kit | 6A, 8 |
| Cenas/menu/pausa/gameover | Pirate/Tetris/PocketBomber | Contratos lifecycle e estado, por engine | 6A |
| Plataforma/parallax | Oakwoods | Direto adaptado com assets autorizados e manifestos | 6A |
| Hitbox independente do sprite | Oakwoods/TinySwords | Metadados e visualizador de colisão/pivô | 4, 6A |
| Bombas/propagação em grade | PocketBomber | Conceito/regras portadas de Lua para TS | 8 |
| Inimigos simples e dificuldade | PocketBomber/Pirate | Regras parametrizadas e seeds de teste | 8 |
| Turnos/seleção/recrutamento | TinySwords | Direto adaptado; sem CDN ou backend particular obrigatório | 8 |
| Tilemap em camadas | tinyswords-tilemap | Regras explícitas de grid, offsets, água, espuma e sombra | 4, 8 |
| Exploração/coleta 3D | Forest Census | Direto adaptado para módulos Three e objetivos | 6B |
| Personagem/câmera 3D | Forest/Toon/threejs-builder | Helpers pequenos tipados com convenções de asset | 6B |
| Ação, projéteis e alvos | Toonshooter | Direto adaptado, limites e temática adequada | 6B |
| Tático 3D | Threejs Tactics | Referência de arte/design e implementação própria verificável | 8 |
| Controles touch | PocketBomber/Phaser/Capacitor | Ações semânticas, gestos, deadzone e resize | 6A, 6B, 8 |
| Animação por estado | skills de animação/Oakwoods/Three | Mapeamento explícito de clips/frames e transições | 6A, 6B |
| Clonagem de esqueletos | Forest Census | Loader com promise cache e ownership de recursos | 6B |
| Normalização de modelos | threejs-builder + catálogo glTF | Escala/chão/frente/bounds; inspeção na biblioteca | 4, 6B |
| Pós-processamento/shaders | Referências Three + runtime atual | Efeitos opcionais por perfil e orçamento | 6B, 8 |
| Spritesheets/alpha | ai-game-spritesheets | Especificação, normalização e inspeção de animação | 4, 8 |
| Sprites isométricos | vibe-isometric-sprites | Perspectiva consistente, âncoras, sombra e biblioteca | 8 |
| Geração raster | generated-raster-asset-pipeline | Contrato provider-agnostic no Pinta; jobs limitados | 4, 8 |
| Validação PNG/manifesto | validate-generated-assets.js | Reusar critérios/testes com decoder e limites adequados | 4 |
| Art bible e asset spec | Claude Studios/AlterLab | Direção visual compacta e specs estruturadas | 7, 8 |
| Áudio e mixagem | audio-implementation/Pirate | Canais, volume/mute, gesto inicial, preload e cleanup | 6A, 8 |
| HUD/ícones/nine-slice | TinySwords/UI skills | Componentes de jogo por engine, área segura e escala | 6A, 8 |
| Feedback/animação de UI | ui-animation/vfx skills | Tempos/transições, opção de movimento reduzido | 8 |
| Partículas e pooling | Toon/Pirate + performance skills | Pools limitados quando profiler justificar | 6A, 6B |
| Save e versão de save | save-system-patterns + jogos | Adaptar storage bridge existente, migrations e escopo | 4, 8 |
| Input abstraction | engineering-common | Ações de jogo; teclado/touch/gamepad quando suportado | 6A, 6B |
| FSM/eventos | engineering-common | Estados/eventos claros; sem framework obrigatório extra | 6A, 6B |
| Física/colisão | physics-gameplay-patterns | Adaptar por engine; timestep e orçamento de consultas | 6A, 6B |
| Core loop/objetivo | core-loop/quick-design | Contrato Pensa→tarefa→kit→critério de vitória | 7 |
| Level design | level-design/level docs | Layout parametrizado e teste de caminho/objetivo | 8 |
| Progressão/balanceamento | progression/economy/combat | Curvas de dificuldade e recompensas do próprio jogo | 8 |
| Narrativa/quests/diálogo | narrative/quest/dialogue | Missões curtas, conteúdo adequado e localization | 8 |
| Onboarding/acessibilidade | onboarding/accessibility | Controles visíveis, contraste, pistas além de cor, mute | 6A, 6B, 8 |
| Arte provisória | placeholder-asset-pipeline | Prototipar regras com shapes/arte coerente antes do refinamento | 6A, 7 |
| Orçamento de memória/render | memory/performance-budgeting | Metas por kit/dispositivo + telemetria real | 0–9 |
| Testes de regras | tdd/verification-loop | Fixtures determinísticas para mecânicas de risco | 6A–9 |
| Playtest/avaliação visual | playwright-testing/Godogen | Inputs, resultados e frames isolados por revisão | 7, 9 |
| Soak/regressão | Claude Studios QA | Sessões prolongadas, ciclos e limites com baseline | 6A–9 |
| Plano retomável | Godogen/orchestration/milestones | Jobs persistidos, checkpoints e revisão; sem arquivos de agente expostos à criança | 7 |
| Risco/escopo | risk-register/vertical-slice | Priorizar risco e tarefa pequena sem perder backlog completo | 0–9 |
| Telemetria | telemetry-instrumentation | Tempo/custo/erros/desempenho sem enviar código privado por padrão | 5, 7, 9 |
| UI e engenharia geral | cc-skills/skills-main | Reuso seletivo em ferramentas do editor, a11y e testes | Conforme componente |
| Descoberta de outras fontes | awesome-agent-skills | Proveniência para pesquisa futura; nenhum carregamento no runtime | Catálogo interno |

## 6. O que não transportar literalmente

- Scripts de instalação/hooks, permissões de shell, alterações de configuração de agente ou organização de equipes dos repositórios.
- Documentação/API específica de motores nativos em prompts de projetos Phaser/Three.
- Listas enormes de skills genéricas no contexto de toda pergunta.
- Dependências CDN e versões antigas acopladas aos exemplos; no Pro, usar npm e lock compatíveis com o ambiente.
- Endpoints de leaderboard, credenciais e chamadas pagas particulares sem adapter de produto.
- Empacotamento nativo iOS/Android, multiplayer competitivo e live operations como requisitos de todo kit. Seus conceitos úteis de input, estado e testes podem ser reaproveitados; os serviços completos são produtos distintos.
- Monetização de jogos dirigida à criança ou sistemas comerciais encontrados nas skills. Balanceamento de moedas internas fictícias pode ter uso pedagógico; vendas/ads não são parte do jogo padrão.
- Regras universais incorretas de orientação do modelo, limites fixos de sprites ou geração de arte obrigatória sem considerar o contexto do Studio.
- Assets sem proveniência/licença identificada. Aproveitar uma técnica não autoriza redistribuir automaticamente toda a mídia da pasta.

Essas exclusões são adaptações ao contexto solicitado, não perda do material: cada fonte útil permanece catalogada, e o catálogo pode crescer por versões sem aumentar a carga inicial do editor.

## 7. Incorporação e licenças

Registrar por item incorporado: caminho/hash de origem, versão adaptada, licença declarada, créditos de terceiros, modificações e kit/skill de destino. Há declarações MIT em diferentes pacotes e READMEs, mas não assumir que cobrem cada asset externo. Quaternius/PixelFrog e outros autores citados precisam ser associados aos arquivos efetivamente usados e às condições da fonte correspondente.

Priorizar fontes completas e autorizadas para os primeiros kits; onde faltam assets, substituir por arte própria/autorizada ou geração suportada. Isso permite avançar na implementação sem tratar uma ausência de arte como bloqueio de toda a arquitetura.

Para cada kit, encerrar a integração somente quando houver: fonte modular, dependências fixadas, metadados/assets válidos, início/fim/reinício, input, save quando aplicável, teardown, teste funcional, evidência visual, orçamento de desempenho e export/publicação compatíveis. O catálogo da IA só apresenta como pronta a capacidade que passou por esse processo.
