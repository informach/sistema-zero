# Reordenação acessível dentro de grupos no Pinta

## Objetivo

Corrigir os dois achados do review de 18/08/2026: oferecer por teclado a mesma reordenação fina do arrasto e alinhar rótulos, comentários e documentação ao comportamento real.

## Desenho aprovado

### Uma semântica para alça, ponteiro e teclado

A alça continuará ordenando uma linha por vez. Arrastar ou pressionar uma seta sobre uma forma irmã moverá apenas a forma acionada, permitindo reorganizar o empilhamento dentro do grupo. Ao alcançar uma forma externa, a operação voltará a mover o grupo inteiro. Os quatro botões da faixa de seleção continuarão movendo o grupo como uma peça.

As setas usarão `dropShapesOrder`, o mesmo domínio do arrasto. `ArrowUp` escolherá a linha imediatamente acima no painel; `ArrowDown`, a imediatamente abaixo. Como o painel mostra a pilha em ordem inversa, o componente converterá a direção visual para o vizinho correto no array do documento antes de chamar a operação pura.

### Texto acessível

O nome da alça deixará de prometer que toda interação move sempre o grupo. A copy explicará que a alça muda a ordem da forma ou do grupo, sem depender do dispositivo. O `aria-label` e o `title` continuarão compartilhando a mesma fonte centralizada.

### Documentação

Os comentários do `VectorLayerPanel` e as duas seções do `CLAUDE.md` descreverão a mesma regra: movimento fino sobre irmão, movimento do grupo ao cruzar para fora e botões da faixa sempre grossos.

## Testes

- Teste de integração: a primeira seta sobre um irmão reordena apenas a forma.
- Teste de integração: a seta seguinte, ao alcançar uma forma externa, move o grupo inteiro.
- Teste de integração: o nome acessível descreve a nova regra.
- Testes puros existentes continuam cobrindo os dois ramos de `dropShapesOrder`.
- Suíte completa do Pinta, typecheck, Biome e build do Kids fecham a verificação.
