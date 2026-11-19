# Pintar e navegar pelo teclado

Na camada de peças, pressione **Tab** até a grade ganhar o contorno azul. As
setas escolhem uma casa e **Enter** aplica a ferramenta atual. O lápis, a
borracha, o balde e os terrenos usam os mesmos algoritmos do mouse e do toque.
O conta-gotas escolhe a peça da casa atual.

Para linha, retângulo ou seleção, pressione **Enter** no começo, mova as setas
e pressione **Enter** no fim. **Esc** cancela a prévia. Sair da grade ou trocar
de ferramenta também cancela; a prévia não entra no salvamento. Uma aplicação
confirmada ocupa um único desfazer. A seleção mantém os controles existentes
para copiar, guardar conjunto e apagar.

**Home** e **End** vão ao começo e ao fim da linha. **Ctrl+Home** e **Ctrl+End**
vão aos extremos do mapa. A área rola para manter a casa à vista. Os
deslocamentos das camadas e de seus grupos são considerados uma única vez.
O botão **Atalhos** e a tecla **?** mostram a ajuda no diálogo existente.

O ponto escolhido também orienta **Pôr um marcador** e a inserção da biblioteca.
Camadas bloqueadas, ferramentas escondidas pela aula, janelas abertas e
recuperação de conflitos conservam as proteções das operações pelo ponteiro.
Uma recusa do host não cria edição nem desfazer.

## Arquitetura e revisão

`keyboardPainting.ts` calcula candidatos com `mapBrush.ts`. O hook mantém só
cursor e prévia transitória; o documento nativo e o store continuam sendo a
autoridade. A confirmação consulta ferramenta, peça e revisão atuais. Isso
evita usar o estado de uma renderização React anterior em teclas consecutivas.
A seleção consulta a revisão posterior ao carimbo antes de escolher seu destino.

O palco usa seus componentes, cores e controles atuais, com dois contornos
transitórios e descrição para leitor de tela. Não há um elemento por célula.
O cálculo da janela do canvas inclui a faixa final do papel: o padding da área
de rolagem não pode ser subtraído novamente das duas dimensões visíveis.

As provas ficam em `qa/pintura-por-teclado-2026-11-19/`. Desktop, toque emulado
e CPU 4× são perfis nesta máquina. Não equivalem a aparelhos físicos adicionais
nem a uma avaliação com crianças ou usuários de leitores de tela.
