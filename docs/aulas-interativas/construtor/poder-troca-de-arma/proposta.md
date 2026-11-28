# Troca de arma · o que cada etapa cobra

Critério do currículo (posto Construtor, Poder 5): trocar muda o tiro; nova partida volta ao estado
inicial.

| Etapa | O jogo precisa fazer | O Verificar confere |
| --- | --- | --- |
| item | A cada 4 s, só na partida, um item cai; pegá-lo libera o plasma | No jogo: nenhum item antes do Enter; na partida, ele aparece; e, nesta etapa, pegar o item deixa `plasmaLiberado` verdadeiro. Nos blocos: o relógio e o encontro que tira o item e muda `plasmaLiberado` |
| troca | A tecla E só troca com o plasma liberado | No jogo: o E antes do item não troca; depois dele, troca para o plasma e volta ao laser. Nos blocos: o Se `plasmaLiberado` com a troca dentro |
| placar | A arma à vista | Nos blocos: "Arma: " + arma no fim do quadro (2D) ou no texto escrito logo depois da troca (3D) |
| disparo | O Espaço segue a arma | No jogo: com o laser sai o laser; depois de trocar, sai o plasma. Nos blocos: o Se arma = "plasma" com o plasma em `tirosPlasma` e o laser no senão |

## Como o jogo é conferido

No 3D o item vem pela esquerda e a nave espera na borda (parada no meio, ela leva batidas até o
fim de jogo, que congela a contagem; o motivo está no Tiro triplo). Depois da etapa do item, a
própria troca prova que o plasma foi liberado: os quatro objetivos de jogo não cabem nos 40 s da
parte. A volta ao laser numa partida nova vem pronta: o `restart` do 2D e o "Voltar ao início" do
3D recomeçam o jogo, e as variáveis nascem de novo em Ao iniciar. Medido no executor de verdade com
as mutações (`qa/poderes-objetivos-navegador.ts arma`).
