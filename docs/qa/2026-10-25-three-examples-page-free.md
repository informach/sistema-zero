# Exemplos Jogo 3D sem blocos de página — 25/10/2026

Os 19 exemplos que dependiam de HTML/CSS foram convertidos na fonte canônica e regenerados. Os 21 itens do catálogo agora têm `html: []`, `css: []` e comportamento sem operações DOM, JavaScript cru ou referências a um canvas de página. Os construtores JavaScript que recebem `canvasId` continuam disponíveis para projetos existentes.

O motor ganhou cenas dos kits em tela cheia (`createFullscreenScene(cor, kit)`), com câmera e inicialização específicas de Travessia, Corrida, Empilhar e Plataforma. Um bloco próprio do degrau intermediário representa a opção. O clique na cena, o HUD central, o placar e as telas de fim pertencem ao motor; não são wrappers que escondem blocos HTML/CSS. Os controles de toque dos kits alimentam as mesmas transições de tecla que o teclado físico. Soltar um ponteiro não solta uma tecla física; cancelamento, perda de captura, troca de cena e Stop retiram os controles e suas entradas.

A revisão reproduziu e corrigiu um canvas/estilos remanescentes quando a criação do WebGL falha. Recomeçar usa a fábrica da partida para reconstruir estado, grupos e listeners. As regras, metas e mapas foram preservados. No Mundo de Blocos, as setas movem uma célula por toque, de forma explícita nas instruções.

## Evidência e limites

- RED transversal inicial: 19 falhas e dois exemplos já independentes de página. A guarda agora também recusa `canvasId` no comportamento.
- Parser, gerador e Blockly conferem fontes canônicas e round-trip; os quatro kits têm teste específico código → blocos → código e escolha da variante Plataforma.
- Suíte de 42 arquivos: 968 testes / 11.680 asserções, sem falhas, antes do último acréscimo dos controles de toque. Após esse acréscimo: 63 testes / 265 asserções nos três arquivos afetados, incluindo análise semântica TypeScript do runtime injetado, propriedade/descarte e entrada física simultânea. As seleções se sobrepõem e não devem ser somadas.
- A suíte executa os 20 exemplos sem Plataforma por 150 quadros nas variantes completa/enxuta, com Three real e renderer de teste. Isso não substitui WebGL real nem demonstra todas as condições finais de cada partida.
- Tipagem completa do Studio passou antes da conciliação posterior do Raylib 3D. A composição final ainda exige nova tipagem, navegador e CI.
- Índice dos exemplos para o tutor foi regenerado. Não houve alteração dos roteiros dos cursos.

## Navegador real

Na composição `4d5c1558a`, os 21 exemplos abriram, renderizaram em WebGL e receberam os controles da galeria tanto no Chromium quanto no Chrome. A execução inicial teve 48 testes aprovados e quatro falhas: as duas provas adicionais de fim/reinício da Torre Maluca, nos dois navegadores, falhavam ao fotografar o `body` sem altura, pois o canvas e o HUD do motor usam posicionamento fixo. O jogo já havia alcançado a tela final.

O teste foi corrigido para capturar o iframe visível, preservando a execução negativa. A repetição focada no Chrome aprovou os dois casos: erro de empilhamento com teclado e com botão de toque, tela final, reinício, placar zerado, exatamente um canvas e um conjunto de controles. O teste de botão exerce a ativação por ponteiro; não equivale a uma prova em dispositivo móvel físico. Não houve repetição da galeria nem retry oculto. A configuração final usa somente Chrome, um worker e retries zero.

Logs locais em `.cache/python-missions-20261024`: `three-full-native-r3.log`, `three-kit-touch-{red,green}-r1.log`, `three-kits-lifecycle-red-r1.log`, `three-closure-regression-r3.log`, `three-real-browser-{r1,r2}.log`; relatórios e capturas nos diretórios correspondentes. As seleções se sobrepõem: não são 50 cenários únicos. A prova não cobre todas as condições finais dos 21 jogos. Tipagem da composição final, CI e publicação permanecem gates da entrega integrada.
