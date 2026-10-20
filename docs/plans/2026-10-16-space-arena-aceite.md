# Space Arena: corpus adicional de compatibilidade

Pedido adicional do usuário, registrado em 16/10/2026. Fonte: [Space Arena no commit fixado](https://github.com/wynand1004/Projects/tree/7f4ea8e0bcb6105ecb5699eae0a793e2d4db92f8/Space%20Arena). [Manifesto de arquivos](../../experiments/studio-python-l0/corpus/space-arena.json). O repositório declara GPLv3, e a procedência dos sons exige avaliação individual antes de distribuição. Código e assets ficam no cache de testes, sem inclusão nos templates do produto.

## Original e variante

O entrypoint final `space_arena.py` usa quatro GIFs e cinco WAVs; `bgm.wav` tem aproximadamente 23,47 MB. A contagem foi conferida em 19/10 no manifesto pinado e nos arquivos reais: `bgm`, `explosion`, `missile_fire`, `powerup` e `thruster`. A referência anterior a seis WAVs era um erro de inventário, não um recurso removido. Não substituir a mídia por placeholders nem aumentar silenciosamente a cota geral JS. A compatibilidade requer materialização/importação com limites explícitos, diagnóstico de tamanho e exportação que preserve bytes.

O áudio original depende de winsound/aplay/afplay e usa timer para repetir a música. A variante browser deve usar o módulo portátil de áudio já exigido pelo Pac-Man, com implementação desktop e dependências declaradas. Não fingir suporte a comandos de shell. `os.system("clear")` no diagnóstico FPS recebe substituição explícita, preservando tempo e lógica do jogo.

Quatro chamadas `random.randint` recebem limites float integrais. CPython 3.14 rejeita esses argumentos; a variante converte somente esses limites para inteiros, sem alterar distribuição aleatória. Original, diff e versões são preservados.

A variante `portable-audio-1.1.0` também processa eventos por `wn.update()` enquanto pausada, sem avançar a simulação. A prova nativa `space-arena-pause-reference-r1/receipt.json` isolou o corpo original do loop pinado, limitando-o a mil iterações com o estado pausado: um timer real do Turtle/Tk não foi atendido até um update explícito. Com o ramo de pausa proposto, o timer foi atendido e o contador de quadros permaneceu zero. Tela oculta, sem mocks de eventos e sem carregar mídia. Isso confirma a omissão de processamento nesse corpo, mas não equivale a executar o jogo completo nem testar teclado físico. A variante1.0 e os recibos anteriores permanecem históricos no cache. O adapter do estúdio não foi alterado para esconder o defeito do jogo.

## Matriz R22

| Caso | Comportamento a comprovar |
|---|---|
| S01 | Splash, início por S/s, tela 1020×620, painel lateral, legendas e tipografia desenhada |
| S02 | Nave, impulso/freio/rotação, keypress/keyrelease, tiros por espaço, foco e repetição |
| S03 | 25 inimigos, 30 mísseis, 20 estrelas, 5 powerups, radar e câmera; não reduzir carga para aprovação |
| S04 | Quatro GIFs, formas/cores/escala, carimbos e clear por quadro, círculos e painel de saúde |
| S05 | Movimento, colisões, dano, limites da arena, pickups e morte/reinício conforme referência |
| S06 | Explosões com 30 partículas e exaustão com 20; ordem e vida útil preservadas |
| S07 | Cinco WAVs reais, música agendada e efeitos; gesto de ativação, mistura, Stop e restart definidos |
| S08 | Pausa P/p, visibilidade C/c, transições de estado e timers; separar defeito original de incompatibilidade |
| S09 | Pro: importar, salvar/reabrir, publicar/jogar e exportar com fontes/recursos íntegros |
| S10 | Partida de 10 minutos e 30 reinícios: entrada, frames, memória e ausência de atividade após Stop |

Estado: inventário e hashes registrados; variante e execução integral pendentes. Esta matriz amplia os testes de L3/L5/L7/L8 e não transforma a leitura estática em prova de compatibilidade. Programas avançados preservam fonte Pro; não há promessa de converter o jogo inteiro em blocos.
