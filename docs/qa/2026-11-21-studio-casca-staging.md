# A casca isolada de volta ao staging: conferência logada (21/11/2026)

Lote 1 do plano pela missão original (seção 5, isolamento).

## Ambiente

- **Chrome:** o Chrome de mesa conectado, logado no staging com a conta da equipe.
- **Worker de staging:** implantado pela frente do Pinta em 21/11, às 09:02 UTC. Imagem
  qualificada 598, com os consertos da casca (`590c6ff48`, `c5417856d`, `ed8e08289`).
- **Apps:** community e community-kids implantados em `61ef65f2d`, com
  `STUDIO_CLASSIC_SHELL_ENABLED=1`. Members no mesmo SHA.
- **Projeto:** "Conferencia casca 20-11" no app adulto. O programa deixa o palco vermelho, fica verde
  ao receber uma tecla e escreve "tecla …" nas Mensagens do jogo.

## O que foi conferido no app adulto

| Conferência | Resultado |
|---|---|
| A prévia está na casca de outro site | sim. O iframe "Pré-visualização" aponta para `sistemazero-studio-runtime-staging.helena-bcc.workers.dev/v1/classic-shell/1.html`, sem `srcdoc` |
| Teclas depois de Rodar, **sem clicar no palco** (o defeito de 20/11) | **chegam**: depois de "Rodar de novo", a seta para cima e a tecla d deixam o palco verde, e as mensagens mostram "tecla ArrowUp" e "tecla d" |
| Laço de foco | não há: ao clicar no código e digitar, o texto entra no editor e nenhuma tecla nova chega ao jogo |
| Programa hostil (30 s de trabalho síncrono que não é laço) | maior atraso do relógio do editor: **50 ms** em 3 s de medição (critério: menos de 500 ms). O aviso "O preview parece travado" apareceu com Parar e Continuar esperando |
| Parar com o jogo preso | o botão voltou a "Rodar" em **846 ms** (critério: menos de 5 s) |
| Conserto depois do Parar | rodou na hora, e a seta para a esquerda chegou ao jogo sem clicar no palco |

## Aula com vídeo, com a casca ligada (app adulto)

Curso "Cadê Todo Mundo?" (adulto), aula 2. Em 20/11 esta conferência tinha ficado de fora.

| Conferência | Resultado |
|---|---|
| Vídeo da parte 1 | toca: a cena andou, o botão virou "Pausar" e o tempo passou de 00:06 |
| Experiência da parte 2 | carrega ao lado do vídeo |
| Estúdio da aula, parte 3 | a prévia "Pré-visualização" está na casca (sem `srcdoc`); na aba Jogo, "Rodando", com o jardim desenhado e "Achados: 0" |

## O que ficou para conferir

- **A casca no app Kids.** A área da criança pede um código de acesso do responsável para este
  navegador, porque a autorização de 20/11 venceu. Gerar um código novo é criar uma chave de acesso
  e depende da dona. A página da casca é a mesma do Worker nos dois apps; em 20/11 o Kids rodou nela
  o 3D da Ilha do Farol.
- **O Python novo com projeto novo** (ver abaixo): o que depende de quadros não deu para conferir
  neste Chrome.

## Python novo no staging (app adulto)

Projeto novo "QA paineis python 21-11", com o ponto de partida Pygame Zero e um jogo mínimo escrito
pela Ponte (um círculo que anda a cada quadro e imprime a tecla apertada).

| Conferência | Resultado |
|---|---|
| Distribuição usada pelo projeto novo | a nova: os quadros "Pré-visualização Python" e de análise carregam `/v1/runtimes/cf021c32…/` do Worker de staging (release `2026-11-20-pinta-cenarios-6`) |
| O jogo roda e a Ponte faz os blocos | sim |
| Investigar | abre, mostra "O programa está rodando", "Valores agora" com `pos` e "Mostrar o bloco" |
| Pausar e Avançar 1 quadro; Desempenho | **não verificável neste Chrome**: o Pausar não mudou o estado e a medida deu cerca de 1 quadro por segundo |

**Por que não verificável.** A própria página do editor recebia 4 a 5 `requestAnimationFrame` em 2
segundos, também com o jogo parado, embora `document.visibilityState` dissesse "visible" e a página
tivesse o foco. O Chrome conectado roda em outra máquina, e a janela provavelmente estava coberta ou
minimizada. Nesse estado, tudo o que depende de quadros sai errado: o jogo anda a cerca de 1 quadro
por segundo, e a pausa, que espera a resposta do próximo quadro, não chega. As conferências da casca
(teclas, foco, programa hostil, Parar) dependem de eventos e relógios e valem.

A pausa, o avanço de 1 quadro e a medida do Python passam no CI com a distribuição hermética
(lotes 6 e 11 dos painéis). No staging, faltam numa janela do Chrome visível na tela.
