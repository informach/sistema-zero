# Espalhar desenhos e conjuntos

Na mesma oficina do mapa, escolha **Criar mais** ou **Avançado**. Abra uma camada
de objetos, coloque um desenho da biblioteca e escolha esse objeto. A ferramenta
**Espalhar desenhos** também tem o atalho **S** quando esse nível está disponível.

Escolha o tamanho do pincel, a densidade e a distância entre os centros dos
desenhos, em casas do mapa. O número da variação mantém a composição previsível:
o mesmo caminho, modelo, opções e número produzem a mesma distribuição. Ative
**Variar o giro** para quartos de volta e **Variar o lado** para espelhamentos.

Arraste no palco para conferir a prévia. Solte para colocar tudo de uma vez.
**Esc**, cancelamento do toque ou soltura fora do palco cancelam a operação.
Desfazer retira o gesto inteiro; refazer devolve os mesmos objetos e IDs.

Artes comuns são cópias independentes dos dados do objeto, mantendo a referência
à arte e à animação escolhidas. Uma instância de conjunto continua vinculada à
definição do conjunto; espalhá-la não equivale a soltar suas peças. As propriedades
são conservadas e referências do objeto a si mesmo passam a apontar para sua cópia.

O afastamento considera os objetos de arte e conjuntos existentes na camada.
As caixas transformadas ficam dentro do mapa. Camadas trancadas não são alteradas.
Se o gesto exceder o teto existente de 512 objetos na camada, ele é recusado por
inteiro e o editor avisa. O orçamento do host, inclusive nas aulas, também precisa
aceitar a operação antes de anunciar sucesso.

## Dados e arquitetura

`tiles/objectScatter.ts` é um algoritmo puro que recebe posições de células,
modelo e opções. Ordenação, amostragem por semente, índice espacial de centros,
transformação e clipping independem da interface. A clonagem de objetos e a
inserção transacional em lote compartilham as operações existentes.

O hook `useObjectScatter` mantém a prévia fora do documento e do autosave.
Interpola o caminho e confirma uma única edição ao soltar. Alterar documento,
camada, modelo, opções, ferramenta ou zoom cancela o gesto; uma cópia recuperada
após conflito não pode ser substituída por eventos atrasados. O mesmo conversor
de coordenadas e recorte visível serve ao arrasto da biblioteca.

As opções do pincel ficam na sessão. O mapa guarda somente os objetos finais no
contrato nativo existente; não há novo formato, dependência ou lógica de eventos.
Cada exportador recebe objetos comuns, incluindo propriedades e conjuntos.
O desempenho de gestos extremos será medido na etapa de mapas grandes; os ensaios
atuais não demonstram fluidez em aparelhos físicos de entrada.
