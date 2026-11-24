# Colocar desenhos e conjuntos no cenário

Na camada de objetos, abra **Desenhos da biblioteca**. Toque numa miniatura para
colocar a arte no último ponto usado do palco. Também é possível arrastar a
miniatura: a prévia mostra a arte no tamanho final, e soltar dentro do palco
coloca o objeto. Isso funciona com pixel art, arte vetorial e conjuntos.

**Encaixar objetos na grade** continua opcional. A posição respeita o deslocamento
da camada e dos seus grupos. Camadas trancadas e camadas sem espaço para outro
objeto recusam a inserção com uma mensagem.

Durante o arrasto, **Esc** cancela. Soltar fora da área visível, perder a captura
do ponteiro ou sair da janela também cancela. A prévia não altera o documento;
uma soltura válida cria uma única entrada em **Desfazer**. Ao arrastar um conjunto,
ele continua vinculado à definição da biblioteca. **Soltar o conjunto** continua
sendo a operação explícita que cria elementos independentes.

O clique mantém seu comportamento anterior. Os botões continuam acessíveis por
Tab, Enter e Espaço. A mesma biblioteca e os componentes do Pinta são usados em
todos os níveis; não há novo editor nem novo formato de documento.

## Implementação

`tiles/libraryPlacement.ts` concentra tamanho, posição e criação, compartilhados
entre clique e arrasto. `useLibraryPlacement.ts` mantém o gesto fora do documento,
confere a área visível e revalida a origem antes de gravar. `MapObjectArtwork`
desenha a mesma arte na prévia e no objeto colocado. Se uma recuperação adota
outra revisão durante a prévia, eventos atrasados não sobrescrevem essa revisão.

A coluna lateral é filha direta do flex no desktop; só o layout estreito usa
`details`. O conteúdo nativo de `details` impedia a coluna de se limitar à altura
do editor: rolar até a biblioteca empurrava o palco para fora da janela. A
correção conserva o painel recolhível móvel e o visual da oficina.

[Evidências e limites desta entrega](qa/biblioteca-arrasto-2026-11-19/README.md).
