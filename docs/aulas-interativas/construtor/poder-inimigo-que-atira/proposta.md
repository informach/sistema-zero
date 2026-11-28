# Inimigo que atira · o que cada etapa cobra

Critério do currículo (posto Construtor, Poder 3): o inimigo dispara; os tiros dele causam dano e
são limpos ao reiniciar.

| Etapa | O jogo precisa fazer | O Verificar confere |
| --- | --- | --- |
| tiro | A cada 1,5 s, só na partida, um tiro nasce no grupo `tirosInimigos` | No jogo: nenhum tiro antes do Enter; na partida, eles aparecem. Nos blocos: o relógio de 1,5 s com a criação no grupo |
| origem | O tiro nasce na posição da inimiga | Nos blocos: o x lê o centro x (2D) ou a posição x (3D) da inimiga |
| dano | No encontro com a nave, o tiro sai e a nave perde uma vida | Nos blocos: o tiro sai do grupo e a nave é machucada |
| limpeza | Quem sai da tela sai do grupo | No jogo: em 9 s o grupo não acumula os tiros. Nos blocos: a limpeza do grupo |

## Por que parte é pelos blocos

A vida que o tiro tira não pode ser conferida no jogo: as pedras também batem na nave, e uma vida
a menos não diz quem bateu. A origem também é dos blocos: a inimiga anda, e a posição em que cada
tiro nasce muda de uma vez para outra. O reinício que limpa os tiros vem pronto (o `restart` do 2D
e o "Voltar ao início" do 3D recomeçam o jogo inteiro). No 3D, o objetivo da limpeza encosta a nave
na borda: parada no meio, ela leva batidas até o fim de jogo, que congela a contagem. Medido no
executor de verdade com as mutações (`qa/poderes-objetivos-navegador.ts inimigo`).
