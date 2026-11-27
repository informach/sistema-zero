# Blocos usados · Patrulha Espacial

Inventário conferido com as definições oficiais e com todas as etapas do projeto. Os nomes abaixo mostram **exemplos preenchidos reais**; o bloco que sai da paleta pode começar com outros valores. Os roteiros ensinam essas trocas e os destinos dos encaixes.

## Como ler

Há **46 tipos liberados**, dos quais **31 já aparecem no projeto inicial**. A autoria aponta explicitamente **25 tipos** nas montagens. Isso não é uma contagem de conceitos novos: áreas, valores e um mesmo bloco reutilizado em vários lugares têm papéis diferentes.

As telas, o estado inicial e o retorno ficam preparados. Um tipo usado nesse apoio pode reaparecer no que a criança constrói, por exemplo para conferir `jogando` ou decidir o resultado. Leia o papel e a parte indicada, em vez de interpretar a lista como uma tarefa de refazer toda a infraestrutura.

## Montagens e valores usados pela criança

| Bloco (exemplo preenchido) | Onde encontrar | Papel no curso | Primeira montagem |
|---|---|---|---|
| Quando apertar a tecla espaço (pular)<br>`sz_g3d_on_key` | Jogo 3D > Controles | Retomado ou aplicado na montagem | [Aula 1, parte 4](patrulha-espacial-aula-1.md) |
| o objeto tiro está encostando em asteroide ?<br>`sz_g3d_collides` | Jogo 3D > Encostar > Encostar | Construído no curso | [Aula 3, parte 2](patrulha-espacial-aula-3.md) |
| Quando nave encostar em algum do grupo asteroides, chamando de asteroideQueBateu<br>`sz_g3d_on_touch_group` | Jogo 3D > Encostar > Encostar | Construído no curso | [Aula 4, parte 3](patrulha-espacial-aula-4.md) |
| No grupo tiros, tirar quem saiu de -36 a 3 no eixo ↗ Z<br>`sz_g3d_prune_area` | Jogo 3D > Grupos | Construído no curso | [Aula 1, parte 7](patrulha-espacial-aula-1.md) |
| Tirar o objeto asteroide do grupo asteroides<br>`sz_g3d_remove_from_group` | Jogo 3D > Grupos | Construído no curso | [Aula 3, parte 2](patrulha-espacial-aula-3.md) |
| Criar uma cópia de moldeTiro no grupo tiros em x 0 y 1 z -1.6<br>`sz_g3d_spawn_copy` | Jogo 3D > Grupos | Construído no curso | [Aula 1, parte 4](patrulha-espacial-aula-1.md) |
| posição x do objeto nave<br>`sz_g3d_get_pos` | Jogo 3D > Objetos > Posição, giro e tamanho | Construído no curso | [Aula 1, parte 5](patrulha-espacial-aula-1.md) |
| Escrever na tela ↗ em cima, à direita: texto Acertos: 0 / 20<br>`sz_g3d_hud_text` | Jogo 3D > Placar, vida e telas > Na tela | Retomado ou aplicado na montagem | [Aula 3, parte 5](patrulha-espacial-aula-3.md) |
| Fim de jogo: você perdeu<br>`sz_g3d_end_game` | Jogo 3D > Placar, vida e telas > Telas e fim | Construído no curso | [Aula 5, parte 1](patrulha-espacial-aula-5.md) |
| Machucar nave tirando 1 de vida<br>`sz_g3d_hurt` | Jogo 3D > Placar, vida e telas > Vida | Construído no curso | [Aula 4, parte 3](patrulha-espacial-aula-4.md) |
| a vida de nave<br>`sz_g3d_life_of` | Jogo 3D > Placar, vida e telas > Vida | Construído no curso | [Aula 5, parte 1](patrulha-espacial-aula-5.md) |
| Dar 3 de vida a nave<br>`sz_g3d_set_life` | Jogo 3D > Placar, vida e telas > Vida | Construído no curso | [Aula 4, parte 1](patrulha-espacial-aula-4.md) |
| Tocar o som pronto moeda<br>`sz_g3d_play_effect` | Jogo 3D > Som | Construído no curso | [Aula 3, parte 2](patrulha-espacial-aula-3.md) |
| Tocar nota 880 Hz por 60 ms<br>`sz_g3d_play_note` | Jogo 3D > Som | Construído no curso | [Aula 1, parte 4](patrulha-espacial-aula-1.md) |
| A cada 1.5 segundos<br>`sz_g3d_every_seconds` | Jogo 3D > Tempo e sorteio > Tempo | Construído no curso | [Aula 2, parte 2](patrulha-espacial-aula-2.md) |
| Se valor da variável estado = texto jogando<br>`sz_js_if_else` | Programação > Lógica & Se | Retomado ou aplicado na montagem | [Aula 1, parte 4](patrulha-espacial-aula-1.md) |
| número aleatório (0 a 1) × 10.4 − 5.2<br>`sz_math_arithmetic` | Programação > Matemática | Retomado ou aplicado na montagem | [Aula 2, parte 3](patrulha-espacial-aula-2.md) |
| falso<br>`sz_val_bool` | Programação > Valores | Retomado ou aplicado na montagem | [Aula 3, parte 2](patrulha-espacial-aula-3.md) |
| valor da variável estado = texto jogando<br>`sz_val_compare` | Programação > Valores | Retomado ou aplicado na montagem | [Aula 1, parte 4](patrulha-espacial-aula-1.md) |
| número aleatório (0 a 1)<br>`sz_val_random_float` | Programação > Valores | Construído no curso | [Aula 2, parte 3](patrulha-espacial-aula-2.md) |
| texto jogando<br>`sz_val_text` | Programação > Valores | Retomado ou aplicado na montagem | [Aula 1, parte 4](patrulha-espacial-aula-1.md) |
| valor da variável estado<br>`sz_val_variable` | Programação > Valores | Retomado ou aplicado na montagem | [Aula 1, parte 4](patrulha-espacial-aula-1.md) |
| Alterar variável alvoAtivo para falso<br>`sz_js_var_assign` | Programação > Variáveis | Retomado ou aplicado na montagem | [Aula 3, parte 2](patrulha-espacial-aula-3.md) |
| Criar variável velocidadeTiros com valor -22<br>`sz_js_var_create` | Programação > Variáveis | Retomado ou aplicado na montagem | [Aula 1, parte 6](patrulha-espacial-aula-1.md) |
| Somar 1 em variável pontos<br>`sz_js_var_increment` | Programação > Variáveis | Construído no curso | [Aula 3, parte 4](patrulha-espacial-aula-3.md) |

## Apoio que já vem no projeto

| Bloco (exemplo preenchido) | Onde encontrar | Papel no curso | Primeira montagem |
|---|---|---|---|
| ⚡ Quando acontecer · espera acontecer<br>`sz_frame_events` | Áreas do projeto | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| 🔁 Enquanto estiver rodando · repete sem parar<br>`sz_frame_loops` | Áreas do projeto | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| ⚙️ Ao iniciar · roda uma vez<br>`sz_frame_start` | Áreas do projeto | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| Câmera da cena cena: olhar para alvoCamera<br>`sz_g3d_camera_look_at` | Jogo 3D > Cena, céu e câmera > Câmera | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| Posicionar câmera da cena cena em x 0 y 8 z 12<br>`sz_g3d_set_camera` | Jogo 3D > Cena, céu e câmera > Câmera | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| Neblina na cena cena (cor #0b1030, perto 30, longe 75)<br>`sz_g3d_set_fog` | Jogo 3D > Cena, céu e câmera > Céu e luz | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| Céu degradê na cena cena (topo #020617, horizonte #312e81)<br>`sz_g3d_set_sky` | Jogo 3D > Cena, céu e câmera > Céu e luz | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| A cada quadro da cena cena<br>`sz_g3d_animate` | Jogo 3D > Cena, céu e câmera > Começar | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| Criar cena 3D em tela cheia e guardar em cena, fundo #020617<br>`sz_g3d_create_fullscreen_scene` | Jogo 3D > Cena, céu e câmera > Começar | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| a tecla → seta direita está apertada?<br>`sz_g3d_key_down` | Jogo 3D > Controles | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| Criar grupo de objetos asteroides<br>`sz_g3d_create_group` | Jogo 3D > Grupos | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| Para cada objeto tiro do grupo tiros<br>`sz_g3d_for_each_in_group` | Jogo 3D > Grupos | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| Mover o grupo asteroides<br>`sz_g3d_update_group_no_gravity` | Jogo 3D > Grupos | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| Velocidade do objeto asteroide em x 0 y 0 z valor da variável velocidadeAsteroides (por segundo)<br>`sz_g3d_set_velocity` | Jogo 3D > Movimento > Velocidade | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| Esconder o objeto moldeTiro<br>`sz_g3d_set_visible` | Jogo 3D > Objetos > Aparência | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| Criar o objeto moldeTiro com o modelo laser-ciano na cena cena tamanho 0.9<br>`sz_g3d_create_model_file` | Jogo 3D > Objetos > Criar | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| Criar modelo alvoCamera na cena cena<br>`sz_g3d_create_model` | Jogo 3D > Objetos > Montar um modelo | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| Colocar o objeto nave em x valor da variável naveX y 1 z 0<br>`sz_g3d_set_position` | Jogo 3D > Objetos > Posição, giro e tamanho | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| Na tela de vitória: título Rota liberada! texto Você abriu passagem por 20 asteroides. A patrulha pode continuar! botão Voltar ao início<br>`sz_g3d_set_screen_text` | Jogo 3D > Placar, vida e telas > Telas e fim | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| o tempo deste quadro (em segundos) na cena cena<br>`sz_g3d_dt` | Jogo 3D > Tempo e sorteio > Tempo | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |
| 1.5<br>`sz_val_number` | Programação > Valores | Apoio fornecido no projeto inicial | Já vem pronto; não é uma tarefa de reconstrução. |

## Arquivos e reprodução

- [Lista técnica de liberação](blocos.json): IDs aceitos nas aulas.
- [Inventário detalhado](blocos-usados.json): contagens, primeira etapa e todas as partes que citam cada tipo.
- [Mapa das aulas](mapa-de-aulas.md): sequência de construção.
- [Projeto inicial](projeto-inicial.szproject.json) e [projeto final](projeto-final.szproject.json): exemplos usados neste inventário.

As contagens técnicas incluem valores e sombras de encaixe; não são o número de ações que o aluno executa. Para regenerar, execute `bun docs/aulas-interativas-tecnico/recursos/construtor-base/gerar-inventario-blocos.ts` depois do gerador dos cursos.
