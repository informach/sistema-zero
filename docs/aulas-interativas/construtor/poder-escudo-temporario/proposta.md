# Escudo temporário · o que cada etapa cobra

O Poder acrescenta um escudo com prazo ao jogo final da trilha. O critério do currículo
(`packages/members/src/infrastructure/config/creator-journey-curriculum.json`, posto Construtor,
Poder 1) é: a colisão não tira vida durante o escudo e volta a tirar depois.

| Etapa | O jogo precisa fazer | O Verificar confere |
| --- | --- | --- |
| item | A cada 4 s, só na partida, um item nasce no grupo `itensEscudo`, pelo meio, e cai | No jogo: nenhum item antes do Enter; na partida, o item aparece (com a nave fora do meio, ele continua no grupo). Nos blocos: o relógio de 4 s |
| liga | No encontro da nave com o item: o item sai do grupo e `tempoDoEscudo` vira 5 | No jogo: com a nave parada no meio, o escudo liga. Nos blocos: o item sai e o 5 é posto, não somado (no 3D, o texto do Escudo é escrito) |
| protege | Na batida da pedra, depois de tirar a pedra: Se `tempoDoEscudo > 0`, só um som; senão, a nave perde uma vida | Nos blocos: o Se com o dano no senão, e o dano num lugar só |
| acaba | A cada 1 s: Se `tempoDoEscudo > 0`, tira 1 e a nave pisca | No jogo: depois de ligado, com a nave fora do meio, o escudo chega a zero e para nele. Nos blocos: o relógio de 1 s com a guarda e o piscar |

## Por que estes números

O executor dá a cada parte oito objetivos que rodam o jogo, até 10 s por espera, 15 s por objetivo
e 40 s somados, e o relógio da criança começa quando a página abre, não no Enter. No 3D, o executor
ainda espera os modelos antes de apertar a primeira tecla, então o instante da partida em relação
aos relógios muda de uma vez para outra. Por isso:

- o item cai sempre pelo meio (a nave começa ali) e vive mais que o intervalo: com a nave fora do
  meio, há sempre um item no grupo depois do primeiro relógio;
- o escudo (5 s) dura mais que o intervalo do item (4 s): com a nave parada no meio, um escudo
  emenda no outro, e "o escudo está ligado" não depende da hora;
- para ver o escudo acabar, o objetivo tira a nave do meio e espera mais que 5 s;
- a batida com o escudo ligado não pode ser provocada (os asteroides nascem em lugares
  sorteados), então a proteção é conferida nos blocos.

Na partida de verdade, ficar no meio emenda escudos, mas quase nenhum asteroide passa por ali:
para acertar os 20, a nave precisa sair, e o escudo acaba. As janelas foram medidas no executor de
verdade, com mutações que cada objetivo reprova (`qa/poderes-objetivos-navegador.ts escudo`).

## Fora da cobrança

Preparado pela equipe: o jogo da trilha inteiro, o grupo e o desenho do item, o movimento e a
limpeza dos itens, a variável e o placar do Escudo. A personalização é só de aparência (quatro
molduras do item).
