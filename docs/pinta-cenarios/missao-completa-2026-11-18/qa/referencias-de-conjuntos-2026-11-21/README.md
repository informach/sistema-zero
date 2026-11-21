# Vínculos de objetos e versões de arte nos conjuntos

Capturar um conjunto e depois soltá-lo em outro mapa agora copia os IDs dos
objetos junto com as propriedades tipadas que os referenciam, inclusive nas
peças das versões de arte incorporadas. Uma versão alterada recebe outro ID;
arte imutável sem referências a religar continua compartilhada. Referências
externas ao recorte e textos comuns conservam seu significado.

O clonador antes privado da importação foi extraído para o núcleo e serve aos
dois fluxos. Camadas e objetos têm tabelas de IDs separadas, pois documentos
legados podem usar a mesma string nos dois tipos. Os buffers continuam imutáveis
e mantêm sua representação: clonar metadados não materializa um mundo esparso.

A revisão corrigiu também a perda do bloqueio herdado de grupos ao soltar um
conjunto e acrescentou admissão de recortes antes da alocação. O remapeamento de
folhas preserva vínculos explícitos no modelo interno 8. A canonicalização dos
mapas densos mantém o comportamento publicado, comparado em 200 casos com a
função extraída do commit de base.

## Verificação

- 30 testes direcionados, 141 asserções; zero falhas.
- Suíte do Pinta: 2.358 passaram, três controles nativos ignorados por padrão,
  zero falhas e 28.498 asserções. Após uma correção exclusivamente na tipagem da
  fixture, os 30 testes direcionados foram repetidos.
- Os três controles nativos passaram separadamente com Pygame real e SDL dummy,
  com 4.372 asserções. Isso não constitui nova homologação gráfica dos quatro motores.
- Quinze ensaios de navegador passaram: conjuntos vinculados e girados, histórico,
  reabertura, geometria e portas, animação fixada e recursos privados autocontidos,
  em desktop, toque emulado e CPU 4×. Sem retries.
- Checagens completas de tipos do Pinta e Estúdio e Biome dos sete arquivos passaram.

O índice conserva as reproduções vermelhas e a primeira falha de tipos da
fixture. Nenhum estilo ou componente visual foi alterado. Somente esta máquina
foi utilizada, sem sessões com crianças.

## Escopo ainda aberto

Este lote prepara o grafo compartilhado e corrige os conjuntos densos atuais.
Ainda não implementa conjuntos nativos por regiões, protocolo físico 3, render
expansível ou os novos adaptadores. O formato 8 continua fora da união pública.
O rollback publicado B → A → B permanece uma validação separada, em andamento.
