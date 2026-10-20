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

Estado: inventário, variante e primeiro recorte nativo registrados; execução integral pendente. Esta matriz amplia os testes de L3/L5/L7/L8 e não transforma a leitura estática em prova de compatibilidade. Programas avançados preservam fonte Pro; não há promessa de converter o jogo inteiro em blocos.

Em 20/10, o exportador canônico gerou o ZIP da variante 1.1.0 com 42 arquivos, incluindo 23 arquivos Python, quatro GIFs e cinco WAVs, sem aumentar cotas. O projeto foi vinculado à distribuição local de QA a8a6 e à sua release verificada; não se tratou de ativação hospedada. O preflight compilou os 23 arquivos e conferiu todo o inventário. Os nove recursos têm exatamente os hashes da prova nativa anterior de GIF/PCM; essa evidência foi reaproveitada pelos bytes, sem alegar nova decodificação. Recibos `space-arena-canonical-r2/{receipt,preflight}.json`, SHA `df6d6812…` e `bc5ddb73…`. Uma primeira preparação recusou corretamente a identidade de runtime cujo lock de dependências ainda apontava para a fixture; esse negativo permanece em `space-arena-canonical-r1/`, sem alteração do guard produtivo.

O primeiro smoke nativo Q01 terminou antes da partida pelo deadline de QA de 12 s. A fonte desenha o splash com animação padrão antes de chamar tracer(0). O negativo foi preservado e repetido no orçamento de 30 s previsto no plano desse recorte, sem mudar o código, os timers, a renderização ou os sons. A repetição observou 15,156 s até o update explícito anterior à criação dos objetos do jogo, splash e três frames reais em playing; terminou naturalmente em 15,774 s, sem deadline externo ou sinal. Pools completos: 25 inimigos, 30 mísseis, 20 estrelas, cinco powerups e 30/20 partículas. O início usou a chamada QA do callback autoral registrado para S, sem alegar teclado físico. Turtle/Tk oficial e sz_audio instalado no venv já existente, com sete arquivos e dependências conferidos, backend WASAPI. Map0, Destroy1, áudio liberado, árvore inalterada e temporários removidos. Recibo `space-arena-canonical-r3/native-smoke.json`, SHA `b0b1124a…`; supervisor `4ae57921…`. O runner passou review independente antes da execução inicial; o adendo observou o custo da inicialização e usou o orçamento já previsto. Isso não aprova performance, instalação fresca, navegador, controles completos, os outros cenários Q02–Q10, partida de dez minutos ou 30 reinícios.
