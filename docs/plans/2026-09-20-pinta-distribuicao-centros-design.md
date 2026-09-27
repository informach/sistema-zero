# Distribuição pelos centros no Pinta vetorial

## Decisão

Adicionar dois comandos à seleção do editor vetorial: **Distribuir centros na horizontal** e **Distribuir centros na vertical**. A autora confirmou que os objetos das duas pontas ficam onde estão e que os centros dos objetos intermediários devem ficar igualmente espaçados. A distribuição exige pelo menos três objetos independentes; um grupo conta como um objeto.

## Alternativas consideradas

- Espaçar os centros entre as duas pontas fixas: escolhido. Corresponde ao comando pedido e preserva a composição externa.
- Igualar os vãos entre as bordas: útil para objetos de tamanhos diferentes, mas não distribui os centros.
- Ocupar toda a largura ou altura do documento: deslocaria também as pontas e poderia surpreender a criança.

## Comportamento

Em cada eixo, ordenar os objetos selecionados pela coordenada do centro de sua caixa visível. Manter os centros extremos; posicionar os demais em intervalos iguais entre eles, alterando somente a coordenada desse eixo. Empates usam a ordem atual no documento para um resultado estável. O resultado é uma única edição desfeita ou refeita em um passo. Repetir o comando sobre objetos já distribuídos não cria uma edição vazia.

Cada grupo selecionado é medido pela união das caixas de seus membros e transladado inteiro. Objetos travados não se movem; se um membro de um grupo estiver travado, o grupo inteiro fica fora da distribuição. Os objetos livres restantes determinam as pontas e o espaçamento. Com menos de três objetos livres independentes, o comando não altera o desenho. A distribuição por centros pode deixar bordas sobrepostas quando os objetos têm tamanhos muito diferentes; isso é coerente com a opção escolhida, não um ajuste automático de vãos.

## Interface e fluxo

Os dois botões usam os botões e ícones existentes do Pinta e ficam ao lado das ações de alinhamento na faixa de seleção do desktop. No toque, aparecem na barra de seleção rolável quando há seleção; não acrescentam uma nova faixa ao palco. Rótulos acessíveis e dicas usam os nomes completos dos comandos. Os botões ficam indisponíveis até haver três objetos livres independentes. O formato persistido dos desenhos e a identidade visual não mudam.

## Verificação

Testes puros cobrem distribuição em ambos os eixos, caixas de tamanhos diferentes, ordem independente da seleção, grupos, formas não selecionadas, objetos travados, empates e comando sem mudança. Testes da interface cobrem disponibilidade dos dois botões, acionamento, resultado no desenho e desfazer/refazer. Rodar testes, tipos e checagem de estilo do Pinta antes do próximo push.
