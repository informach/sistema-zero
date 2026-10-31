# Cinco quadros complementares do Pico

Provas locais em 30/10/2026 sobre `6461f19c0` e alterações L03 em andamento.
Nenhum desafio cadastrado, nenhuma escrita remota e nenhuma implantação nesta prova.

## Resultado

- Fonte, contrato e HTTP em memória: 30 testes, 3.348 asserções, sem falhas. Os dois públicos
  importam, exportam e reimportam sem revisões novas. Os quatro desafios Kids anteriores foram
  comparados integralmente com o JSON de HEAD e permanecem idênticos.
- Blockly: 36 projetos, 72 asserções, arquivos regenerados idênticos. O repertório dos cinco
  complementares é conferido contra as listas reais até Inventor, sem liberação manual.
- Executor oficial inicial: 5 testes, 165 asserções, 23 cenários, sem falhas em 119,21 s.
  A revisão acrescentou dois cenários causais e encontrou duas lacunas, descritas abaixo.
- Executor após correção dos dois quadros afetados: 2 testes, 82 asserções, 12 cenários, sem
  falhas em 60,62 s. Os demais três quadros conservaram suas regras. São 25 cenários distintos
  ao todo, não 35; iniciais, gabaritos, entradas inválidas e reinício foram executados de verdade.
- Navegador r2: 10 casos positivos, computador 1280 × 844 e celular emulado 390 × 844,
  teclado/toque CDP, ação e reinício reais. Sem rolagem lateral, erro de página/console ou recurso
  externo. Contextos e navegador encerrados. r1 foi preservado antes do ajuste visual do rodapé.

## Revisão causal

A força -6 produzia um pulo válido, mas uma exigência de altura rejeitava o objetivo. O teste
positivo reproduziu a rejeição; a regra agora observa subida e apoio, sem pedir a altura do
exemplo -10. Pular novamente no ar e marcar a contagem sem subir continuam reprovando.

O floco podia continuar visível após somar o ponto. O negativo reproduziu a aprovação indevida;
a regra agora também observa opacidade zero no contato. Contar antes de tocar e contar duas
vezes continuam reprovando. Os logs RED e GREEN ficam no cache local, sem apagar a tentativa.

O texto do extra foi deslocado acima da água do cenário para preservar a leitura no celular.
A conferência visual r2 usa esse desenho final. A velocidade, gravidade e recursos fornecidos
pelo cenário não viram autoria avaliada. Cores e desenhos não são comparados pelo objetivo.

## Capturas

| Quadro | Computador | Celular emulado |
| --- | --- | --- |
| Pulo com apoio | [Abrir](r2/quadro-1-computador.png) | [Abrir](r2/quadro-1-celular.png) |
| Freio no gelo | [Abrir](r2/quadro-2-computador.png) | [Abrir](r2/quadro-2-celular.png) |
| Floco recolhido | [Abrir](r2/quadro-3-computador.png) | [Abrir](r2/quadro-3-celular.png) |
| Mochila de neve | [Abrir](r2/quadro-4-computador.png) | [Abrir](r2/quadro-4-celular.png) |
| Passagem segura | [Abrir](r2/quadro-5-computador.png) | [Abrir](r2/quadro-5-celular.png) |

[Resultado visual](r2/resultado.json). Comandos no [README do pacote](../../desafios-do-jogo/pico/README.md).

Celular físico, GPU real, abertura autenticada pelo Quadro das Cores, importação/publicação e
implantação ainda não fazem parte deste aceite. Tipagem e lint são registrados no plano após
encerramento dos comandos; esta página não transfere a prova para o principal antigo ou outras ilhas.
