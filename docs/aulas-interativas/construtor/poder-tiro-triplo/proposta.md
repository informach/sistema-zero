# Tiro triplo · o que cada etapa cobra

Critério do currículo (posto Construtor, Poder 2): os três projéteis partem da nave em direções
distintas e saem do grupo (a limpeza que a nave já tem tira quem sai da tela).

| Etapa | O jogo precisa fazer | O Verificar confere |
| --- | --- | --- |
| item | A cada 4 s, só na partida, um item nasce no grupo `itensTriplo`; no encontro, o item sai e `tempoTriplo` vira 5 | No jogo: nenhum item antes do Enter; o item aparece; na etapa do item, o triplo liga. Nos blocos: o relógio de 4 s e o 5 posto com o item saindo |
| tres | No Espaço, Se `tempoTriplo > 0`, três lasers; senão, o de sempre | No jogo: antes do item, um laser; com o triplo, três. Nos blocos: o Se com o laser de sempre no senão |
| direcoes | 2D: vx −2, 0 e 2. 3D: as cópias nos grupos `tirosEsquerda`, `tiros` e `tirosDireita` | Nos blocos: as três direções |
| volta | A cada 1 s: Se `tempoTriplo > 0`, tira 1 | No 2D, no jogo: o triplo acaba, para no zero e o Espaço volta a um laser. Nos blocos: a contagem com a guarda |

## Por que estes números

Os do [Escudo](../poder-escudo-temporario/proposta.md): o relógio da criança começa quando a página
abre, então o item vive mais que o intervalo e o triplo (5 s) dura mais que o intervalo (4 s). Sem
escudo, a nave parada leva batidas: no 3D, parada no meio, quase metade das pedras passa por ela, e
o fim de jogo para o relógio. Por isso, no 3D, o item vem pela esquerda (a nave espera na borda,
onde passa um quarto das pedras), nasce mais perto (z −20) e o fim do triplo fica só nos blocos
(quase 15 s de partida sem escudo terminavam em derrota muitas vezes). Medido no executor de verdade
com as mutações (`qa/poderes-objetivos-navegador.ts triplo`).
