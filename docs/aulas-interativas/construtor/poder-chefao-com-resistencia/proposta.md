# Chefão com resistência · o que cada etapa cobra

Critério do currículo (posto Construtor, Poder 4): um tiro não derrota; a quantidade certa derrota
uma vez só.

| Etapa | O jogo precisa fazer | O Verificar confere |
| --- | --- | --- |
| vida | O chefão começa com 5 de vida, à vista | No jogo: `vidaDoChefao` é 5 na partida. Nos blocos: a barra (2D) ou o texto (3D) com a vida |
| acerto | Cada laser que acerta sai e tira 1 | No jogo: dois lasers deixam a vida em 4 ou menos, e o primeiro não tira tudo. Nos blocos: o encontro tira o laser do grupo e soma −1 |
| fim | No zero, o chefão sai e dá o prêmio | No jogo: depois de uma rajada, o chefão está fora da tela. Nos blocos: o Se `vidaDoChefao ≤ 0` no quadro |
| uma-vez | O prêmio vale uma vez só | No jogo: o placar não dispara e `chefaoDerrotado` vira verdadeiro. Nos blocos: a guarda muda `chefaoDerrotado` |

## Como o jogo é conferido

O chefão fica parado no meio, onde a nave começa: com a nave parada, todo laser acerta, e o
executor conta os acertos apertando Espaço. São oito disparos para cinco acertos, porque uma pedra
que cruza a faixa do meio pode engolir alguns lasers. No 3D, sem a guarda, o placar chega à meta e
a vitória recomeça o jogo na hora: o chefão volta ao lugar, e os dois objetivos reprovam. No 3D o
encontro só dispara na entrada do contato: um laser que não sai atravessa e tira 1, então quem
reprova o laser que fica é o objetivo de blocos. Medido no executor de verdade com as mutações
(`qa/poderes-objetivos-navegador.ts chefao`).
