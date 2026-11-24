# Referências de peças — 21/11/2026

O lápis, o lote e o balde aceitavam índices acima de 255, embora o leitor nativo
do Pinta recusasse esses mapas. A conversão interna para regiões também podia
transportar essas referências inválidas. O novo teste reproduziu a diferença:
três casos falharam antes da correção.

As operações densas e por regiões agora recusam referências fora do formato.
Um lote heterogêneo inválido é recusado inteiro, sem modificar o mapa anterior.
A peça 255 conserva todos os giros/espelhamentos no ciclo JSON do codec interno.
A representação genérica compartilhada continua aceitando 4095: o orçamento
de autoria pertence ao formato/editor, não ao empacotamento dos bits.

A primeira suíte completa expôs quatro fixtures inconsistentes: três testes
de terreno usavam a peça 300 como material externo, e o comparador denso/regiões
gerava índices até 4095 para um editor de 256 peças. O material externo passou
a ser a peça válida 0, distinta de vazio (-1) e das regras que começam em 1.
O gerador manteve coordenadas/semente/transformações e passou a usar 0–255.
Um teste separado comprova que o armazenamento genérico conserva 4095 e flags.
Os resultados intermediários estão preservados; não foram ignoradas falhas.

Na rodada final passaram 68 testes focados, 2.325 do Pinta, tipos completos de
Pinta/Estúdio, lint e 12 fluxos locais de navegador. Os três casos Pygame que
dependem do executável foram reexecutados e aprovados com pygame-ce real.
Cem documentos sintéticos conservaram JSON, recursos e snapshots anteriores.

Este lote cobre as operações listadas e a preparação para regiões. Seleção,
carimbos e demais escritores continuam na revisão da etapa 8; não se declara
uma auditoria completa de todas as mutações. O schema público permanece em 7.
Não há nova ativação de nuvem, interface expansível ou prova de desempenho,
crianças e dispositivos físicos adicionais nesta entrega.
