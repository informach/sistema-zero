# Blocos usados · Nave Contra Asteroides

Inventário conferido com as definições oficiais e com todas as etapas do projeto. Os nomes abaixo mostram **exemplos preenchidos reais**; o bloco que sai da paleta pode começar com outros valores. Os roteiros ensinam essas trocas e os destinos dos encaixes.

## Como ler

Há **48 tipos liberados**, dos quais **21 já aparecem no projeto inicial**. A autoria aponta explicitamente **36 tipos** nas montagens. Isso não é uma contagem de conceitos novos: áreas, valores e um mesmo bloco reutilizado em vários lugares têm papéis diferentes.

As telas, o estado inicial e o retorno ficam preparados. Um tipo usado nesse apoio pode reaparecer no que a criança constrói, por exemplo para conferir `jogando` ou decidir o resultado. Leia o papel e a parte indicada, em vez de interpretar a lista como uma tarefa de refazer toda a infraestrutura.

## Montagens e valores usados pela criança

| Bloco (exemplo preenchido) | Onde encontrar | Papel no curso | Primeira montagem |
|---|---|---|---|
| Pôr o cenário cenario-aurora atrás de tudo<br>`sz_g2d_set_backdrop` | Jogo 2D > Cenários > Fundos | Retomado ou aplicado na montagem | [Aula 1, parte 3](nave-contra-asteroides-primeira-nave.md) |
| Para cada colisão entre os grupos tiros e asteroides<br>`sz_g2d_on_group_overlap` | Jogo 2D > Colisões > Encostar e bloquear | Construído no curso | [Aula 5, parte 2](nave-contra-asteroides-dia-3.md) |
| Para cada sprite do grupo asteroides que colidir com o sprite nave<br>`sz_g2d_on_sprite_group_overlap` | Jogo 2D > Colisões > Encostar e bloquear | Construído no curso | [Aula 7, parte 3](nave-contra-asteroides-dia-4.md) |
| Quando apertar a tecla barra de espaço<br>`sz_g2d_on_key` | Jogo 2D > Controles > Teclado, ações e toque | Retomado ou aplicado na montagem | [Aula 2, parte 2](nave-contra-asteroides-dia-1.md) |
| Soltar explosão no sprite asteroide cor #ffce69<br>`sz_g2d_explode` | Jogo 2D > Desenho e efeitos > Partículas | Construído no curso | [Aula 5, parte 3](nave-contra-asteroides-dia-3.md) |
| Criar grupo de sprites tiros<br>`sz_g2d_create_group` | Jogo 2D > Grupos > Criar e percorrer | Construído no curso | [Aula 2, parte 4](nave-contra-asteroides-dia-1.md) |
| No grupo tiros criar um sprite chamado em x 395 y 372 largura 10 altura 28 com imagem laser-ciano vx 0 vy 0<br>`sz_g2d_spawn_image_in_group` | Jogo 2D > Grupos > Criar e percorrer | Construído no curso | [Aula 2, parte 4](nave-contra-asteroides-dia-1.md) |
| Desenhar o grupo tiros<br>`sz_g2d_draw_group` | Jogo 2D > Grupos > Desenho e ordem | Construído no curso | [Aula 2, parte 4](nave-contra-asteroides-dia-1.md) |
| Mover os sprites do grupo tiros usando suas velocidades<br>`sz_g2d_update_group` | Jogo 2D > Grupos > Movimento | Construído no curso | [Aula 3, parte 2](nave-contra-asteroides-dia-2.md) |
| Tirar do grupo tiros quem sair da tela, para cada um (chamado foraDaTela)<br>`sz_g2d_prune_offscreen` | Jogo 2D > Grupos > Participação e limpeza | Construído no curso | [Aula 3, parte 3](nave-contra-asteroides-dia-2.md) |
| Tirar o sprite tiro do grupo tiros<br>`sz_g2d_remove_from_group` | Jogo 2D > Grupos > Participação e limpeza | Construído no curso | [Aula 5, parte 2](nave-contra-asteroides-dia-3.md) |
| o estado do jogo é jogando ?<br>`sz_g2d_scene_is` | Jogo 2D > Jogo e telas > Telas e partida | Retomado ou aplicado na montagem | [Aula 2, parte 2](nave-contra-asteroides-dia-1.md) |
| Mudar o estado do jogo para vitoria<br>`sz_g2d_set_scene` | Jogo 2D > Jogo e telas > Telas e partida | Retomado ou aplicado na montagem | [Aula 9, parte 3](nave-contra-asteroides-dia-5.md) |
| Descrever o jogo para leitor de tela Nave Contra Asteroides. Enter começa. Setas esquerda e direita movem a nave. Cada aperto de Espaço dispara um laser. Acerte 20 asteroides antes de perder as três vidas. Asteroides que passam sem bater não tiram vida. Enter, depois do resultado, volta ao início.<br>`sz_g2d_set_stage_description` | Jogo 2D > Jogo e telas > Telas e partida | Retomado ou aplicado na montagem | [Aula 9, parte 7](nave-contra-asteroides-dia-5.md) |
| Manter o sprite nave dentro da tela<br>`sz_g2d_clamp_to_screen` | Jogo 2D > Movimento > Bordas e rebatidas | Construído no curso | [Aula 1, parte 7](nave-contra-asteroides-primeira-nave.md) |
| Mover o sprite nave com as setas <- -> (velocidade 5)<br>`sz_g2d_arrows_x` | Jogo 2D > Movimento > Movimentos prontos | Construído no curso | [Aula 1, parte 5](nave-contra-asteroides-primeira-nave.md) |
| o centro x do sprite nave<br>`sz_g2d_center_x` | Jogo 2D > Movimento > Posição e tamanho | Construído no curso | [Aula 2, parte 6](nave-contra-asteroides-dia-1.md) |
| a posição y do sprite nave<br>`sz_g2d_sprite_y` | Jogo 2D > Movimento > Posição e tamanho | Construído no curso | [Aula 2, parte 6](nave-contra-asteroides-dia-1.md) |
| Tocar efeito tiro grande<br>`sz_g2d_play_fx` | Jogo 2D > Som > Efeitos prontos | Construído no curso | [Aula 2, parte 2](nave-contra-asteroides-dia-1.md) |
| Criar sprite nave em x 372 y 396 largura 56 altura 64 com imagem nave-falcao-azul<br>`sz_g2d_create_image_sprite` | Jogo 2D > Sprites > Criar e trocar aparência | Retomado ou aplicado na montagem | [Aula 1, parte 3](nave-contra-asteroides-primeira-nave.md) |
| A cada 1.5 segundos<br>`sz_g2d_every_seconds` | Jogo 2D > Tempo > Quadros e intervalos | Construído no curso | [Aula 4, parte 2](nave-contra-asteroides-chuva-de-asteroides.md) |
| Barra de valor da variável pontos / valor da variável meta em x 280 y 23 largura 240 altura 11 cor #65dfcf<br>`sz_g2d_draw_bar` | Jogo 2D > Vida e placar > Indicadores e texto na tela | Construído no curso | [Aula 9, parte 2](nave-contra-asteroides-dia-5.md) |
| Escrever texto SETAS: mover · ESPAÇO: disparar em x 780 y 462 cor #d8e6f8 tamanho 15 alinhado à direita<br>`sz_g2d_draw_label` | Jogo 2D > Vida e placar > Indicadores e texto na tela | Retomado ou aplicado na montagem | [Aula 1, parte 8](nave-contra-asteroides-primeira-nave.md) |
| Mostrar placar Acertos: valor valor da variável pontos em x 22 y 32 cor #f3f8ff tamanho 23<br>`sz_g2d_draw_score` | Jogo 2D > Vida e placar > Indicadores e texto na tela | Construído no curso | [Aula 6, parte 2](nave-contra-asteroides-pontos.md) |
| Machucar o sprite nave em 1 e deixá-lo invencível por 60 quadros<br>`sz_g2d_damage_sprite` | Jogo 2D > Vida e placar > Vida | Construído no curso | [Aula 7, parte 5](nave-contra-asteroides-dia-4.md) |
| Desenhar as vidas do sprite nave como corações em x 22 y 52 tamanho 21 cor #ff9bae<br>`sz_g2d_draw_sprite_health` | Jogo 2D > Vida e placar > Vida | Construído no curso | [Aula 7, parte 2](nave-contra-asteroides-dia-4.md) |
| as vidas do sprite nave acabaram?<br>`sz_g2d_health_depleted` | Jogo 2D > Vida e placar > Vida | Construído no curso | [Aula 9, parte 4](nave-contra-asteroides-dia-5.md) |
| Dar ao sprite nave 3 de vida<br>`sz_g2d_set_health` | Jogo 2D > Vida e placar > Vida | Construído no curso | [Aula 7, parte 2](nave-contra-asteroides-dia-4.md) |
| Se o estado do jogo é jogando ?<br>`sz_js_if_else` | Programação > Lógica & Se | Retomado ou aplicado na montagem | [Aula 2, parte 2](nave-contra-asteroides-dia-1.md) |
| o centro x do sprite nave − 5<br>`sz_math_arithmetic` | Programação > Matemática | Construído no curso | [Aula 2, parte 6](nave-contra-asteroides-dia-1.md) |
| valor da variável pontos ≥ valor da variável meta<br>`sz_val_compare` | Programação > Valores | Construído no curso | [Aula 9, parte 3](nave-contra-asteroides-dia-5.md) |
| número aleatório de 24 até 728<br>`sz_val_random` | Programação > Valores | Construído no curso | [Aula 4, parte 4](nave-contra-asteroides-chuva-de-asteroides.md) |
| texto SETAS: mover · ESPAÇO: disparar<br>`sz_val_text` | Programação > Valores | Retomado ou aplicado na montagem | [Aula 1, parte 8](nave-contra-asteroides-primeira-nave.md) |
| valor da variável pontos<br>`sz_val_variable` | Programação > Valores | Construído no curso | [Aula 6, parte 2](nave-contra-asteroides-pontos.md) |
| Criar variável pontos com valor 0<br>`sz_js_var_create` | Programação > Variáveis | Construído no curso | [Aula 6, parte 2](nave-contra-asteroides-pontos.md) |
| Somar 1 em variável pontos<br>`sz_js_var_increment` | Programação > Variáveis | Construído no curso | [Aula 6, parte 3](nave-contra-asteroides-pontos.md) |

## Apoio que já vem no projeto

| Bloco (exemplo preenchido) | Onde encontrar | Papel no curso | Primeira montagem |
|---|---|---|---|
| ⚡ Quando acontecer · espera acontecer<br>`sz_frame_events` | Áreas do projeto | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| 🔁 Enquanto estiver rodando · repete sem parar<br>`sz_frame_loops` | Áreas do projeto | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| ⚙️ Ao iniciar · roda uma vez<br>`sz_frame_start` | Áreas do projeto | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| Usar área de colisão de 75 % do tamanho para o sprite nave<br>`sz_g2d_set_hitbox_scale` | Jogo 2D > Colisões > Área de contato | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| Limpar a tela<br>`sz_g2d_clear` | Jogo 2D > Desenho e efeitos > Efeitos | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| Fazer a tela preencher 100% da janela (mantendo a proporção)<br>`sz_g2d_fit_screen` | Jogo 2D > Jogo e telas > Preparar a área do jogo | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| Preparar o jogo em tela cheia, tela 800 × 480, fundo #07152b<br>`sz_g2d_setup_stage` | Jogo 2D > Jogo e telas > Preparar a área do jogo | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| Reiniciar o jogo<br>`sz_g2d_restart` | Jogo 2D > Jogo e telas > Telas e partida | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| Criar sprite painelMensagem em x 48 y 140 largura 704 altura 176 cor #0c1a34<br>`sz_g2d_create_sprite` | Jogo 2D > Sprites > Criar e trocar aparência | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| Desenhar o sprite painelMensagem<br>`sz_g2d_draw_sprite` | Jogo 2D > Sprites > Criar e trocar aparência | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| A cada quadro do jogo<br>`sz_g2d_update_each_frame` | Jogo 2D > Tempo > Quadros e intervalos | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| 1.5<br>`sz_val_number` | Programação > Valores | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |

## Arquivos e reprodução

- [Lista técnica de liberação](blocos.json): IDs aceitos nas aulas.
- [Inventário detalhado](blocos-usados.json): contagens, primeira etapa e todas as partes que citam cada tipo.
- [Mapa das aulas](mapa-de-aulas.md): sequência de construção.
- [Projeto inicial](projeto-inicial.szproject.json) e [projeto final](projeto-final.szproject.json): exemplos usados neste inventário.

As contagens técnicas incluem valores e sombras de encaixe; não são o número de ações que o aluno executa. Para regenerar, execute `bun docs/aulas-interativas-tecnico/recursos/construtor-base/gerar-inventario-blocos.ts` depois do gerador dos cursos.
