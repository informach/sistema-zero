# Relevo do baú e posicionamento adaptativo da arte da trilha

## Contexto

O baú liberado usa a mesma sombra genérica dos nós de aula, mas o fundo dourado e o degrau pouco contrastante se fundem. O resultado parece um círculo plano. A arte Rive de cada módulo também escolhe o lado pelo índice da unidade antes de procurar uma altura livre. Em trechos assimétricos da senoide, ela pode ocupar o lado apertado mesmo quando existe mais espaço no lado oposto.

## Objetivos

- Tornar o relevo do baú liberado visível em repouso, hover e pressão.
- Escolher lado e altura da arte Rive pela área livre da unidade.
- Preservar o Server Component, a posição responsiva e a ausência de saltos de layout.
- Manter a alternância somente como desempate determinístico.

## Baú liberado

O círculo dourado terá uma regra específica depois da receita 3D genérica. A base terá 8 px em repouso, 9 px no hover e 2 px durante a pressão. O degrau misturará o ouro com a tinta escura da interface, criando contraste suficiente em todos os temas. Um realce interno na borda superior separará a face da base.

Somente o baú liberado receberá esse relevo reforçado. Os estados fechado e aberto continuarão planos porque não são ações disponíveis. `prefers-reduced-motion` continuará removendo o deslocamento, mas preservará a informação visual de profundidade.

## Arte Rive adaptativa

Uma função pura receberá os offsets dos nós e do baú. Para cada par de linhas vizinhas, ela calculará dois candidatos:

- arte à esquerda: a soma dos offsets mede quanto os nós se afastam para a direita;
- arte à direita: o inverso da soma mede quanto os nós se afastam para a esquerda.

O candidato com maior pontuação define simultaneamente `side` e `row`. Em empate, a função usa o lado preferido pelo índice da unidade; se lado e pontuação também coincidirem, preserva a primeira linha. Esse critério evita oscilação entre renders.

O cálculo continuará no servidor. A página não ganhará observadores, medições de DOM, hidratação extra ou reposicionamento depois da pintura. As variáveis responsivas existentes manterão a arte e os nós dentro da largura disponível.

## Testes

- Testes puros cobrirão unidades com espaço predominante à esquerda, à direita e empates.
- O teste do componente confirmará que módulos consecutivos podem escolher o mesmo lado quando esse lado oferece mais espaço.
- Um contrato de CSS confirmará profundidade, contraste, realce e curso de pressão do baú.
- A suíte completa, typecheck e build do Community Kids validarão a integração.

