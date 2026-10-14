# P01 — refação completa das mídias

Produzido em 13/10/2026. Copy vigente integral, com 7 slides e convite final separado. Sem entrada de ManyChat. PNGs 1080 × 1350 (4:5).

## Cenas e identidade

Todas as cenas com pessoas foram geradas novamente com a ferramenta integrada image_gen, usando os retratos autorizados para orientar a fisionomia. Não reutilizam o enquadramento dos vídeos ou das fotos originais. Não são registros históricos das situações narradas. As telas fotografadas foram orientadas por referências reais da plataforma. As comparações de jogo e os recortes dos blocos são capturas diretas do runtime e do Blockly oficiais.

As falas são da copy aprovada, sem criar um novo depoimento para acompanhar a cena. A origem das cenas está também no texto alternativo. Não se acrescentou o rodapé “Cena ilustrativa” nem “Demonstração da equipe”.

Arquivo de prompts e referências: [prompts.json](prompts.json). Imagens geradas: [p01-conversa.png](p01-conversa.png), [p01-jogando.png](p01-jogando.png), [p01-ideia.png](p01-ideia.png).

## Capturas e verificação da demonstração

Base: Meu Mundo, extensão Mundo 3D, em packages/studio/src/official-extensions/world-3d/examples.ts. Runtime oficial da mesma pasta.

Para deixar o percurso legível, a montagem de demonstração usa terreno plano, roadGrid orgânica de 50 com largura 4, área livre de 27, sem grama alta, câmera de acompanhamento, luz fixa e motor sem som. Essas escolhas são iguais nas duas versões. Árvores, carrinho, água e objetos vêm do exemplo e do runtime oficial; nenhuma moeda foi acrescentada.

Só a força de carBoost muda entre as duas versões: 1.5 e 3. Mesma semente 314159, mesma posição inicial, mesma sequência ArrowUp + Shift por 700 ms, sem mover o carro por código. Resultado medido: z 10.1376 e velocidade 28.16 na primeira; z 16.22016 e velocidade 45.056 na segunda. O HUD arredonda para 28 e 45. A comparação mostra avanço e velocidade; não fabrica derrapagem nem colisão.

O panorama do slide 6 usa o exemplo original com relevo 4, câmera cinema e a atmosfera oficial no entardecer (setTime). A grama alta e o som foram retirados, e a área livre foi ajustada para 20; os demais elementos vêm do exemplo. O arquivo world-ambiente.js registra essa composição. Abaixo dele entram os blocos reais de terreno, água e ciclo de dia/noite, em vez do print inteiro do editor. A captura mostra a floresta e o relevo; não se desenhou um rio inexistente sobre ela. A captura da interface completa, usada também como referência de monitor, vem do playground real do Estúdio com o exemplo original. A tela do jogo nas cenas fotográficas foi recriada usando essa captura como referência; as comparações isoladas são capturas reais, sem geração de pixels.

Arquivos: world-antes.js, world-depois.js, turbo-antes.png, turbo-depois.png, bloco-world-antes.png e bloco-world-depois.png.

## Última versão do P01

A ficha foi atualizada durante a produção para a capa “Ele sabe o nome de todos os youtubers de jogo”, série “Por trás do jogo”. O texto final foi lido novamente da ficha. A cena do slide 2 foi gerada mais uma vez para mostrar André assistindo a uma partida, com as mãos fora dos controles: [p01-assistindo.png](p01-assistindo.png). O arquivo p01-ideia.png permanece apenas como alternativa de produção, sem uso nos PNGs finais.

## Montagem e conferência

Layout nativo em HTML/CSS; Nunito 800/600, azul #194bd7, creme #fffcf4 e amarelo #ffdb56. A montagem editável está dois níveis acima. Os PNGs finais foram exportados no Chrome, sem copiar o texto sobre imagens antigas.

Verificações: contagem e dimensões dos PNGs; copy extraída da ficha comparada integralmente com os parágrafos da arte; legenda integral; carregamento das imagens/fontes; limites dos elementos; inspeção de prévias e slides de comparação. [Relatório de layout](verificacao-layout.json).

Scripts de produção e cópia das artes anteriores: output/instagram/refazer-3-2026-10-13 no workspace. O código da plataforma e os depoimentos originais não foram alterados.

Nenhuma publicação, agendamento ou automação foi executada.
