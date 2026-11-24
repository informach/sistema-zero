# Terrenos prontos para começar

Decisão de implementação da etapa 3: acrescentar **Bosque com terrenos** ao catálogo
de modelos existente. Os modelos anteriores, a paleta Arcade e os componentes da
oficina são preservados. A criança escolhe o terreno e uma cor da paleta; as regras
de encaixe continuam disponíveis nos detalhes.

O modelo tem três camadas com suas próprias folhas: grama/terra, água/areia e
pedra/terra. Cada folha cobre todas as 81 combinações de quatro cantos entre dois
materiais e vazio, com quatro variações adicionais de centros: 85 peças, abaixo do
teto de 256. A separação em camadas permite sobrepor terrenos sem exigir que uma
única folha contenha todas as combinações de cinco materiais.

O algoritmo de pintura existente continua sendo a única implementação de seleção
de peças, vizinhos, semente e apagamento. O modelo fornece arte e regras autorais;
não insere programação ou comportamento de jogo. Os dados usam o contrato atual
de terrenos, sem introduzir propriedades que leitores antigos descartariam.

Aceite: criar pela galeria sem configurar regras, escolher materiais no modo
Começar, pintar nas três camadas, desfazer/refazer e reabrir sem perda. Conferir
mouse, toque, CPU reduzida, orçamento, cópias independentes e conservação no backup.
As cores ficam disponíveis no próprio painel de terrenos, usando os botões da
paleta do Pinta. Escolher uma cor retoma o lápis depois da borracha ou do
conta-gotas, preservando linha e retângulo. Cada centro tem três artes distintas;
as variações mantêm a semente determinística do algoritmo existente.

O ensaio de reabertura aguarda a galeria aparecer depois de **Voltar**: o editor
fecha somente após concluir a gravação. Recarregar antes dessa confirmação
interrompia o próprio ensaio. A correção fica no teste, mantendo a gravação real.

[Provas locais, condições e limites](qa/terrenos-prontos-2026-11-19/README.md).
