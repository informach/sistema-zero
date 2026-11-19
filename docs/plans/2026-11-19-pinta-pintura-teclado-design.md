# Pinta: navegar e pintar casas pelo teclado

Continuação da etapa 6, após o lote de marcadores. A auditoria encontrou uma
lacuna: a caixa de ferramentas e as peças são alcançáveis pelo teclado, mas
o palco de peças não recebe foco nem permite aplicar a ferramenta sem ponteiro.

## Decisão

Manter o palco e seus motores de edição. Tornar a grade focável, com instrução
curta acessível, cursor de casa e foco desenhado com os tokens existentes.
As setas escolhem a casa; Enter aplica a ferramenta. Linha, retângulo e seleção
usam dois pontos, com Esc cancelando o rascunho. O cursor só aparece enquanto
o palco recebe foco pelo teclado. Mouse, toque e tamanho do palco permanecem
com os mesmos gestos e layout.

Uma grade DOM com uma célula por casa foi descartada pelo custo em mapas grandes.
Um painel separado de autoria foi descartado por duplicar a oficina. O documento,
operações e histórico existentes continuam sendo a fonte única.

## Contratos da interação

- Coordenadas são locais à camada ativa. A marca visual aplica o offset herdado
  uma vez. A rolagem conserva a casa visível, inclusive com o canvas recortado.
- Reutilizar `applyMapBrush`, `fillWithBrush`, `lineCells`, `rectCells`, carimbo,
  terreno, sementes e operações de seleção existentes. Extrair somente a cola
  compartilhada necessária; não reimplementar algoritmos de terreno ou célula.
- Enter confirma uma edição atômica com o resultado do commit do store.
  Prévia não entra no autosave. Recusa, camada trancada ou documento recuperado
  não podem criar histórico, selecionar dados inexistentes nem restaurar a origem.
- Esc, perda de foco, ponteiro, mudança de camada/ferramenta/documento cancelam
  o rascunho. Campos e modais nunca acionam pintura no palco que está atrás.
- Setas não alteram células. Atalhos continuam obedecendo curadoria e nível.
  Objetos sem arte têm o botão de marcador; geometria e caminhos continuam nos
  campos autorais existentes. Não colocar programação no editor.

## Verificação

Núcleo puro com os mesmos resultados das operações de ponteiro; bloqueio,
orçamento, cancelamento e recuperação; fonte sem DOM proporcional ao mapa.
Navegador: Tab até a grade, setas, Enter, linha/retângulo, Esc, undo/redo,
camada deslocada, mapa rolado, terreno pronto, exportação e reabertura.
Repetir desktop, toque emulado com teclado e CPU 4× nesta máquina. Auditar
também foco e modais, sem declarar certificação ou ensaio com leitor de tela real.
