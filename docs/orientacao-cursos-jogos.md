# Orientação dos cursos de programação de jogos — princípios, escada e metodologia

> Fonte da verdade da **pedagogia dos cursos de jogos** do Sistema Zero (Estúdio, aulas e
> exemplos). Destilada do estudo (26/07/2026) do curso profissional do Clear Code
> ("Python Game Development Full Course – Build 2D & 3D Games with Raylib") e do código
> dos 6 jogos dele, cruzado com o que o `@sistemazero/studio` já oferece. Cobre o "como
> ensinar" (modelo mental, ordem dos conceitos, metodologia de aula) e o "com o quê"
> (bloco/extensão exatos para cada conceito).
>
> Convenção deste doc: cada conceito cita o **bloco real** (tipo `sz_*` + texto pt-BR) e,
> quando importa, o arquivo do runtime. Quem escreve aula ou exemplo novo deve seguir o
> vocabulário e a ordem daqui — a seção 7 é o dicionário canônico que evita drift.

---

## 1. Visão geral — para quem é e como usar

Este documento é para quem **autora aulas, exemplos e kits** dos cursos de jogos. Ele
responde três perguntas:

1. **Em que ordem ensinar** cada conceito de programação de jogos (seção 3 — a escada).
2. **Que princípios de motor** os jogos devem demonstrar, mesmo nos níveis básicos
   (seção 4) — para o ensino ser "de verdade", não de brinquedo.
3. **Como estruturar a aula em si** (seção 6 — a metodologia dor→solução).

A régua de qualidade: um curso profissional de game dev (Raylib/Python, 4,6h) constrói
jogos completos com ~10 padrões nomeáveis que se repetem do 2D ao 3D. Nossos cursos devem
ensinar **os mesmos padrões, com os mesmos nomes, na mesma ordem** — só que em blocos,
com a Ponte mostrando o código real por baixo.

As camadas do Estúdio e o papel pedagógico de cada uma:

| Camada | Extensão | Papel no ensino |
|---|---|---|
| **Jogo 2D** (básico) | `game-2d` | Porta de entrada. Loop explícito, sprites, colisão, timers — cada conceito é UM bloco visível. |
| **Jogo 2D Avançado** | `game-2d-advanced` (SZGameKit) | O "motor de verdade": moldes (classes), spawner+pool, FSM por entidade, telas, tilemap rico. |
| **Núcleo "na mão"** | sem extensão | JavaScript + canvas puro com OOP. O aluno vê que o motor não é mágica. |
| **Jogo 3D** (básico) | `game-3d` | Porta do 3D: mesma lógica do 2D com câmera e eixo Z. |
| **Jogo 3D Avançado** | `game-3d-advanced` (SZGameKit3D) | FSM, pool, física, moldes — o SZGameKit do 3D. |
| **Canvas 3D "na mão"** | `canvas-3d` (núcleo) | three.js cru, fiel na Ponte. O topo da escada. |

---

## 2. O modelo mental: jogo = quadros + estado

Tudo nos cursos deriva de UMA ideia, que deve ser dita explicitamente na primeira aula de
jogos e repetida sempre:

> **Um jogo é um filme cujos quadros são calculados na hora.** Um filme tem os quadros
> prontos; o jogo olha o estado (posições, teclas, colisões, timers) e **desenha um quadro
> novo, ~60 vezes por segundo**. Movimento é ilusão: é a mesma figura desenhada um
> pouquinho mais para lá a cada quadro.

Desse modelo saem três consequências que o aluno precisa internalizar:

1. **O loop**: todo jogo é "coletar dados → atualizar → desenhar", repetido para sempre.
   No Estúdio isso é visível: a área **🔁 Enquanto estiver rodando** com o bloco
   `sz_g2d_update_each_frame` ("A cada quadro do jogo") É o loop. As áreas ⚙️ **Ao
   iniciar** (roda uma vez) e ⚡ **Quando acontecer** (eventos) completam o padrão
   input→update→draw.
2. **Nada persiste na tela**: cada quadro começa limpo ("Limpar a tela") e TUDO é
   redesenhado. Quem esquece o clear vê o rastro — e deve ver (seção 6).
3. **Ordem de desenho = camadas**: o que é desenhado depois fica por cima. Fundo →
   jogo → HUD, sempre nessa ordem.

**Sobre o tempo (importante para autores):** o runtime do `game-2d` roda em **passo fixo
de 60 simulações por segundo** (`FIXED_FRAME_MS` em
`packages/studio/src/official-extensions/game-2d/runtime/lifecycle.ts`), com acumulador e
catch-up. Isso é o padrão profissional "fix your timestep" — melhor que o delta time
ingênuo. Consequência pedagógica: no 2D a criança pensa em **pixels por quadro** e
**quadros**, nunca em segundos por pixel, e isso está CERTO. O conceito de delta time
(dt) entra só no degrau avançado-3D, onde o three.js real usa `getDelta()` — lá o
mutator do loop de animação do `canvas-3d` já expõe "tempo do quadro" (t/dt). A regra de
ouro do mundo com dt, para quando o aluno chegar lá: *"todo `+=` de movimento multiplica
por dt; atribuição direta (o impulso do pulo) não"*.

---

## 3. A escada de conceitos

Ordem canônica de introdução dos conceitos, com o bloco-âncora de cada degrau. Uma aula
nova deve assumir SÓ os degraus anteriores (curadoria via `allowBlocks` e nível do
aluno).

| # | Conceito | O que o aluno aprende | Blocos-âncora (game-2d, salvo indicado) |
|---|---|---|---|
| 1 | **Loop e desenho** | limpar → desenhar, todo quadro; camadas | `update_each_frame`, "Limpar a tela", `draw_sprite` |
| 2 | **Sprite e movimento** | posição é estado; mudar posição = mover | `create_sprite`, `set_position`, `set_velocity`, `apply_velocity` |
| 3 | **Input** | evento (apertar UMA vez) ≠ estado (segurando) | `on_key` (evento) vs `key_down` (pergunta) — a distinção ataque × andar |
| 4 | **Gravidade e pulo** | velocity acumula gravidade; pulo = impulso único; chão = limite | `set_gravity`, `jump_on_ground`, `platformer` |
| 5 | **Timers** | agir no ritmo do relógio, não "sempre" | `every_seconds`, `every_frames`, `after_seconds` (one-shot), `cooldown_ready` |
| 6 | **Colisão** | pergunta contínua ≠ evento de borda; hitbox é um dial | `touches`, `on_overlap`, `circle_collides`, `set_hitbox_scale`, `draw_hitbox` |
| 7 | **Grupos e spawn** | muitos iguais = um grupo; nascer fora da tela; limpar quem saiu | `create_group`, `spawn_in_group`, `for_each_in_group`, `prune_offscreen`, `count_group` |
| 8 | **Dados do jogo** | vida, placar, telas; regras viram números em tabelas | `set_health`/`change_health`/`health_depleted`, `score`, `show_screen`, `game_over`, `restart` |
| 9 | **Inimigos como TIPO** | definir uma vez, nascer muitos = a semente de "classe" | `define_enemy_type`, `spawn_enemy`, `on_enemy_defeated` |
| 10 | **Mundo e câmera** | o mundo é maior que a tela; a tela é uma janela | `create_tilemap`, `tilemap_collide`, `camera_follow`, `draw_group_by_y` |
| 11 | **Motor avançado 2D** | moldes (classes), spawner+pool, FSM por entidade, telas ricas | gk: `define_mold`, `start_spawner`+`recycle`, `set_entity_state`, `draw_by_depth` |
| 12 | **Porta do 3D** | tudo igual, MAIS: eixo Z, câmera, Y para cima | g3d: `create_scene`, `sz_g3d_animate` ("A cada quadro 3D"), `sz_g3d_dt` |
| 13 | **Motor avançado 3D** | FSM/pool/física no espaço | g3k: `define_mold`+`part`, `camera_fps`/`move_fps`, `pick`, `cull_far` |
| 14 | **Na mão (topo)** | OOP de verdade; three.js cru; dt real | núcleo: classes + canvas; canvas-3d: `THREE.*` + "tempo do quadro" |

Regras da escada:

- **Nunca pule o degrau 5 (timers) antes do 7 (spawn)**: spawn É "timer + criar no
  grupo". O curso profissional prova que o timer com callback é a peça mais reutilizada
  de todo game dev (spawn, cooldown, invencibilidade, turnos, autodestruição).
- **O degrau 9 é a ponte para OOP**: "definir tipo de inimigo uma vez, nascer vários" é
  exatamente classe→instâncias. A aula deve DIZER isso quando o aluno chega no avançado.
- **2D antes de 3D, sempre**: o 3D reaproveita ~80% do vocabulário (seção 5).

---

## 4. Princípios de motor (Clear Code aplicado ao Estúdio)

Cada princípio abaixo aparece nos jogos profissionais e tem ferramenta correspondente no
Estúdio. Aulas e exemplos devem demonstrá-los — cada um com a sua "dor" (seção 6).

### 4.1 Timer com callback — a peça universal

**A dor:** sem timer, o aluno faz "spawnar todo quadro" (avalanche de inimigos) ou conta
quadros com variável solta (quebra quando quiser mudar o ritmo).

**A ferramenta:** `every_seconds` (repetido), `after_seconds` (uma vez), `every_frames`
(ritmo em quadros), `cooldown_ready` (recarga por sprite). O curso profissional constrói
UMA classe Timer (duração/callback/repetir/auto-iniciar) e a carrega **idêntica pelos 6
jogos** — inclusive a máquina de turnos do jogo de batalha é só 2 timers encadeados.
Ensine timers como "a peça que você leva para todo jogo".

### 4.2 Colisão perdoadora — o dial de dificuldade

**A dor:** hitbox = retângulo cheio do sprite pune o jogador pelos cantos vazios do
desenho. O jogo parece "roubado".

**A ferramenta:** `set_hitbox_scale` ("Usar área de colisão de N% do tamanho") + o
raio-X `draw_hitbox` ("Mostrar a caixa de colisão"). Regra de design vinda do curso:
**menor que 100% para DANO** (colisão justa, jogo divertido), **maior para COLETA**
(moeda fácil de pegar). É literalmente um dial de dificuldade — mude o número, mude o
jogo. Importante: a **física de empurrar** (`collide_group`, `collide_sprite`, colisão
com tilemap) usa sempre a caixa CHEIA — o dial é sobre justiça de dano/coleta, não sobre
atravessar parede.

### 4.3 Hitbox ≠ visual — torne o invisível visível

Todo exemplo/aula que mexe com colisão deve, em algum momento, ligar `draw_hitbox` (2D)
ou o wireframe/grade (3D: `sz_t3d_set_wireframe`, `sz_t3d_debug_grid`,
`sz_t3d_debug_axes`). O aluno PRECISA ver a forma de colisão descolada do desenho — é
assim que "colisão traiçoeira" vira conceito em vez de frustração.

### 4.4 Data-driven — o jogo mora nos dados

**A dor:** balancear um jogo com números espalhados pelos blocos é caçar agulha.

**A ferramenta:** `define_enemy_type` (2D básico), moldes (`define_mold`, gk/g3k),
fichas de monstrinhos (`pkm_creature`/`pkm_move`/`pkm_type_chart` no gk). O princípio a
verbalizar na aula: **"mudar o jogo sem mudar a lógica"** — a força do golpe, a
velocidade do inimigo e a vantagem fogo>planta são DADOS; a regra que os lê é uma só. No
curso profissional, adicionar uma arma nova = uma linha na tabela, zero código.

### 4.5 Spawn fora da tela + culling — higiene de entidades

**A dor:** inimigos "pipocam" na frente do jogador; e o jogo acumula sprites invisíveis
até engasgar.

**A ferramenta:** nascer FORA da borda (posição além da tela) e limpar quem saiu:
`prune_offscreen` (2D), `cull_offscreen`/`cull_far`+`recycle` (gk/g3k). Regra: **todo
exemplo com spawn contínuo TEM culling** — sem exceção.

### 4.6 "Meça antes de otimizar"

**A dor:** "o jogo está lento" sem saber por quê.

**A ferramenta:** `show_fps` + `count_group` (2D), `count_alive` (g3k),
`sz_t3d_object_count` ("quantos objetos tem na cena", canvas-3d). A técnica didática do
curso: **mostrar o contador SUBINDO** (40… 100… 300…) antes de ensinar a limpeza — o
vazamento vira número na tela, não sermão.

### 4.7 Estados de jogo — telas são a máquina de estados da criança

Menu → jogando → game over → reiniciar: `show_screen`, `set_scene`/`scene_is`,
`game_over`, `restart`, `pause`/`resume`. Aqui o Estúdio está À FRENTE do curso
profissional (que encerra com `exit()` seco) — usar isso a favor: todo exemplo termina
com tela de fim + reiniciar, nunca com o jogo simplesmente parando.

### 4.8 Feedback barato ("juice")

Muito game feel por pouco bloco: `blink` (i-frames piscando), `flash`, `shake`,
`emit_particles`, som no evento (`play_fx` no pulo/acerto). O padrão profissional dos
i-frames: dano liga invencibilidade temporária + piscada — o Estúdio já faz
(`damage_sprite` + `is_invincible` + `blink`); a aula deve nomear o conceito ("quadros
de invencibilidade").

---

## 5. A ponte de invariantes 2D→3D

Técnica central do curso profissional para a transição 2D→3D, adotada como padrão nosso:
**antes de mostrar qualquer 3D, listar o que NÃO muda**. A aula de abertura do 3D deve
ter literalmente dois quadros:

**O que NÃO muda (você já sabe):**

- O loop: gerar quadros, atualizar → desenhar (`sz_g3d_animate` = o `update_each_frame`
  do 3D).
- Timers: `every_seconds`/`every_frames`/cooldown — mesmos nomes, mesmo uso.
- Grupos e spawn: criar no grupo, nascer fora da vista, limpar quem passou
  (`prune_offscreen` → `cull_far`).
- A LÓGICA de colisão: pergunta contínua vs evento; hitbox menor = jogo mais justo.
- Vida, placar, telas.

**O que muda (só 3 coisas novas):**

| 2D | 3D | Observação |
|---|---|---|
| eixos X,Y (Y cresce para BAIXO) | eixos X,Y,Z (**Y cresce para CIMA**) | dizer explicitamente: "agora subir é +Y, muito mais gostoso" |
| imagem/retângulo | **modelo** (pontos ligados + textura) | wireframe (`set_wireframe`) mostra os pontos |
| sem câmera | **câmera** (posição + para onde olha) | a câmera é objeto explorável — mexa nela sem medo |
| círculo | esfera | mesma pergunta, primitiva irmã |
| retângulo | caixa (bounding box) | idem |
| quadros de imagem (flip-book) | quadros de esqueleto | "ainda são quadros" |

Frases-ponte que funcionam (usar nas aulas): *"inimigo é um obstáculo chique"*, *"a
esfera é o círculo que cresceu"*, *"o 3D é o 2D com uma câmera e um eixo a mais"*.

Ferramentas de orientação espacial do canvas-3d, na ordem de uso didático:
`sz_t3d_debug_grid` (chão quadriculado = âncora espacial — remove quando o cenário real
chegar), `sz_t3d_debug_axes` (setas dos eixos), `sz_t3d_set_wireframe` (raio-X da
forma), `sz_t3d_object_count` (medidor de vazamento).

---

## 6. Metodologia de aula

### 6.1 Dor → solução (a regra número 1)

**Sempre mostrar o problema rodando ANTES de apresentar a ferramenta.** O erro não é
acidente da aula; é o conteúdo. Sequências validadas pelo curso profissional, adaptadas
ao Estúdio:

| A dor (mostrar primeiro) | A solução (só depois) |
|---|---|
| Sprite deixa RASTRO na tela | "Limpar a tela" no início do quadro |
| Spawnar dentro do `update_each_frame` sem timer → avalanche | `every_seconds` |
| `count_group` subindo sem parar (40… 100… 300…) | `prune_offscreen` |
| Colisão "roubada" nos cantos vazios do sprite (ligue `draw_hitbox`!) | `circle_collides` / `set_hitbox_scale` |
| Inimigo pipocando na frente do jogador | nascer FORA da borda |
| Segurar espaço = metralhadora de tiros | `on_key` vs `key_down` + `cooldown_ready` |
| Objeto 3D "invisível" | `debug_grid` + `debug_axes` para se localizar |

### 6.2 Jogo feio primeiro, bonito depois

O curso profissional constrói o jogo INTEIRO numa versão mínima e desorganizada
(~60 linhas), e SÓ ENTÃO refatora com classes e módulos — a organização chega como
alívio de uma dor sentida, não como burocracia. Nossa versão: a aula monta o jogo
completo mínimo com poucos blocos ("funciona! comemora!"), e a aula seguinte
reorganiza (grupos, tipos de inimigo, telas). Marco motivador antes de arquitetura.

### 6.3 Exercício-pausa com gabarito narrado

A cada conceito novo, um exercício de escopo FECHADO ("pause e tente"), seguido da
resolução narrada passo a passo — o exercício nunca fica sem gabarito. Escopo cresce ao
longo do curso: (1) mexer num número; (2) montar um bloco novo lendo a paleta; (3)
recriar uma mecânica ensinada; (4) o jogo-base inteiro. Dica calibrada quando o
exercício pede algo ainda não mostrado ("você vai precisar do bloco X, procure na
categoria Y").

### 6.4 Scaffolding: dar pronto SÓ o que já foi ensinado

Regra do curso profissional para projetos-início: o starter entrega pronto **apenas o
que o aluno já construiu em aula anterior** (o Timer que ele fez no 2D vem dado no 3D), e
NUNCA o conteúdo novo. No Estúdio: a aula usa `allowBlocks` para expor só os blocos do
degrau + os já dominados; exemplos "Profissional"/"na mão" assumem os degraus anteriores
por inteiro.

### 6.5 Exemplos em 3 níveis (a régua da vitrine)

Todo jogo-modelo dos cursos existe em três degraus, com o MESMO nome-base:

1. **Nome base** (extensão básica) — a receita mínima do gênero, blocos do degrau.
2. **"… Profissional"** (extensão avançada) — moldes, spawner+pool, FSM, telas ricas.
3. **"… (na mão)"** (núcleo/canvas-3d) — OOP/three.js cru, fidelidade máxima, Ponte fiel.

A criança pode jogar os três e VER que é o mesmo jogo — o que muda é o quanto do motor
ela mesma constrói. (Vitrine atual: famílias Dino Corredor, Corrida Infinita, Batalha de
Monstrinhos, Aventura do Herói, Labirinto dos Robôs, Mundo de Blocos.)

### 6.6 Nomear os padrões

Sempre que a aula usa um padrão da seção 4, ela o NOMEIA ("isso se chama cooldown",
"esses são os quadros de invencibilidade", "isso é culling: limpar quem saiu"). O
vocabulário profissional é parte do conteúdo — a criança que sobe a escada reencontra as
mesmas palavras até chegar no three.js cru.

---

## 7. Vocabulário canônico 2D↔3D

Dicionário travado (alinhado em 26/07/2026). Blocos novos e aulas DEVEM usar estes
termos; divergência é bug de conformidade.

| Conceito | Termo canônico | Onde já vale |
|---|---|---|
| Colisão (pergunta contínua) | **"está encostando"** | `sz_g2d_touches`, `sz_g3d_collides`, `sz_g3d_touches_box`, `sz_g3k_touches` |
| Colisão (evento de borda) | **"começar a encostar"** / "Quando … encostar" | `sz_g2d_on_overlap`, `sz_g3k_on_overlap` |
| Colisão contra grupo | **"encostou em algum de"** | `sz_g2d_on_group_overlap`, `sz_g3d_hit_any` |
| Trombada de veículo (crash) | **"bater forte"** — exceção proposital | kits de corrida g3d, world-3d |
| Recarga de ação | **"recarga"** ("pode agir? recarga de N quadros") | `sz_g2d_cooldown_ready` |
| Fim de vida | **"as vidas … acabaram?"** | `sz_g2d_health_depleted`; g3k usa "derrotado" para o EVENTO (`on_entity_death`) |
| Dano | **"levar dano"** | `sz_g2d_hurt_by_enemy`, `sz_g3k_hurt`/`on_hurt` |
| Repetição no tempo | **"a cada N segundos / N quadros"** | `every_seconds`/`every_frames` (g2d, g3d, gk, g3k) |
| Ação única no tempo | **"depois de N segundos"** | `sz_g2d_after_seconds` |
| Loop do jogo | **"A cada quadro"** | `sz_g2d_update_each_frame`, `sz_g3d_animate` ("A cada quadro 3D") |
| Nascer entidade | **"Nascer"** | `spawn_in_group`, `spawn_enemy`, `sz_g3k_spawn` |
| Limpeza fora da tela | **"limpar/descartar quem saiu"** | `prune_offscreen`, `cull_offscreen`, `cull_far` |
| Forma de colisão visível | **"caixa de colisão"** | `draw_hitbox` (2D), wireframe/esfera de debug (3D) |
| Dial de dificuldade | **"área de colisão de N%"** | `sz_g2d_set_hitbox_scale` |

Notas de manutenção:

- Renomeações de texto de bloco são seguras (projetos salvos guardam o `type`, não o
  texto), mas exigem atualizar `manifest.ts`/`ai.ts` do pacote **no mesmo commit** — os
  testes de docDrift comparam literalmente.
- Ao criar bloco novo em QUALQUER extensão de jogo, conferir esta tabela antes de
  escrever o `message0`. Se o conceito não está aqui, adicioná-lo aqui no mesmo PR.
