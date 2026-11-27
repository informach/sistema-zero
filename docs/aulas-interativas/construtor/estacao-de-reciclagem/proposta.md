# A Estação de Reciclagem · o que cada etapa cobra

A missão aplica o repertório dos dois cursos da trilha num jogo novo. Esta tabela liga cada etapa
ao que a criança já aprendeu e ao que o Verificar projeto confere. A regra do currículo está em
`packages/members/src/infrastructure/config/creator-journey-curriculum.json` (posto Construtor,
`mission`).

## Aula 1 · 2D (Nave Contra Asteroides)

| Etapa | O jogo precisa fazer | Aprendeu em | O Verificar confere |
| --- | --- | --- | --- |
| esteira | A cada 1,6 s, duas recicláveis nas esteiras da borda; a cada 2,2 s, uma pilha na do meio; as peças descem e saem do grupo; nada antes do Enter | Aula 4 (grupo, relógio, queda, retirada) e Aula 8 (a guarda da partida) | No jogo: nada nasce antes do Enter, as duas nascem depois. Nos blocos: os dois intervalos |
| coleta | Reciclável: sai do grupo e soma 1. Pilha ou lâmpada: sai do grupo e tira 1 vida | Aula 7 (encontro com o grupo, vida) e Aula 6 (somar no placar) | No jogo: o placar sobe sem disparar; a pilha tira vida. Nos blocos: a peça sai do grupo e a conta muda uma vez |
| resultado | Vidas acabam: derrota. Placar na meta: vitória. A pergunta das vidas vem primeiro | Aula 9 (vitória, resultado único) | Nos blocos: a derrota pelas vidas e a vitória pela variável `meta` |
| meta-nova | O jogo começa com meta 15 e a vitória acompanha | Aula 9 (a meta e o progresso) | Nos blocos: `meta` criada com 15 e a vitória pela variável |

## Aula 2 · 3D (Patrulha Espacial)

| Etapa | O jogo precisa fazer | Aprendeu em | O Verificar confere |
| --- | --- | --- | --- |
| esteira | A cada 1,6 s, cópias da reciclável em x −4 e 4; a cada 2,2 s, da pilha em x 0; todas em z −34; nada antes do Enter | Aula 2 (cópias pelo relógio, faixa de entrada) | No jogo e nos blocos, como no 2D |
| coleta | Encontros com a guarda da partida: reciclável sai, soma e atualiza o texto Peças; proibida sai e tira vida | Aula 4 (encontro com grupo, vida) e Aula 3 (contagem e placar) | No jogo: ponto e vida. Nos blocos: a peça sai, a conta muda e o placar é escrito |
| resultado | Vida zero: estado derrota e Fim de jogo perdeu. Meta: estado vitória e Fim de jogo ganhou | Aula 5 (os dois finais) | Nos blocos: as duas condições |
| meta-nova | Meta 12, com a vitória acompanhando | Aula 5 (a condição de vitória) | Nos blocos: `meta` 12 e a vitória pela variável |

## Fora da cobrança

Preparado pela equipe, nas duas versões: telas, Enter e reinício, estado inicial, coletor andando
para os lados, grupos vazios e o desenho deles; no 3D, galpão, câmera e transporte da esteira.
Sem escudo, combo, inventário, reciclagem por receita, arrastar com o mouse ou sorteio novo. Nenhum
Poder entra nos critérios. A personalização é só de aparência (quatro variações de cada peça).

## Por que parte do Verificar é pelos blocos

O executor dá a cada parte oito objetivos que rodam o jogo, até 10 s por espera, 15 s por objetivo
e 40 s somados, e começa a contar o relógio da criança quando o jogo abre, não no Enter. Dez peças
levam mais de 15 s, e as três vidas só acabam depois de três pilhas. Por isso o jogo confere o que
acontece cedo (nada antes do Enter, as peças nascendo, o primeiro ponto e a primeira vida), e os
blocos conferem o resto, sempre com os nomes do projeto pronto e aceitando "maior ou igual" e
"igual" na vitória. As janelas foram medidas no executor de verdade, com mutações que cada
objetivo reprova (`qa/estacao-objetivos-navegador.ts`).
