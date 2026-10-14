# P07 — refação completa das mídias

Produzido em 13/10/2026. Copy vigente integral, com 7 slides e convite final separado. Sem entrada de ManyChat. PNGs 1080 × 1350 (4:5).

## Cenas e identidade

Todas as cenas com pessoas foram geradas novamente com a ferramenta integrada image_gen, usando os retratos autorizados para orientar a fisionomia. Não reutilizam o enquadramento dos vídeos ou das fotos originais. Não são registros históricos das situações narradas. As telas fotografadas foram orientadas por referências reais da plataforma. As comparações de jogo e os recortes dos blocos são capturas diretas do runtime e do Blockly oficiais.

As falas são da copy aprovada, sem criar um novo depoimento para acompanhar a cena. A origem das cenas está também no texto alternativo. Não se acrescentou o rodapé “Cena ilustrativa” nem “Demonstração da equipe”.

Arquivo de prompts e referências: [prompts.json](prompts.json). Imagens geradas: [p07-fechar.png](p07-fechar.png), [p07-pausa.png](p07-pausa.png), [p07-investigar.png](p07-investigar.png), [p07-descoberta.png](p07-descoberta.png).

## Capturas e verificação da demonstração

Base: Salto nas Nuvens, Jogo 3D Avançado, em packages/studio/src/official-extensions/game-3d-advanced/examples.ts. Runtime e física oficiais.

Adaptação comum às duas versões: todas as plataformas, moedas e o ponto de partida do herói foram elevados em 15 unidades, para mostrar a queda abaixo das plataformas acima do piso global do motor. As distâncias relativas, a gravidade, a velocidade 8 e a força do pulo 11 foram mantidas. Câmera final comum em órbita 20, ângulo 15/35, olhando o ponto 5,15,-1. Não houve teletransporte do herói nem alteração de placar.

Entre as duas versões muda somente o x da segunda plataforma: 12 (distante) e 7 (perto). A moeda fica em 7,18,-2 nas duas.

Entrada idêntica: após 900 ms para pousar, ArrowLeft + ArrowDown + Space por 350 ms; soltar Down/Space, manter Left por 575 ms; soltar e aguardar 250 ms; Left por 90 ms, pausa de 80 ms; Up por 100 ms, pausa de 80 ms; ajustar apenas a câmera e avançar 50 ms.

Resultado medido: ambas chegam ao mesmo x 7.3343838525 e z -2.0640877817. Na versão distante o herói está em y 7.71088, caindo, com três moedas vivas (zero coletadas). Na próxima, está apoiado em y 16.8, com duas moedas vivas (uma coletada). O HUD real mostra 0 e 1. O bloco capturado preserva pulo 11.

Arquivos: nuvens-antes.js, nuvens-depois.js, salto-antes-fim.png, salto-depois-fim.png e bloco-nuvens-depois.png. As fotos de investigação e descoberta usam essas telas como referências de monitor.

## Montagem e conferência

Layout nativo em HTML/CSS; Nunito 800/600, azul #194bd7, creme #fffcf4 e amarelo #ffdb56. A montagem editável está dois níveis acima. Os PNGs finais foram exportados no Chrome, sem copiar o texto sobre imagens antigas.

Verificações: contagem e dimensões dos PNGs; copy extraída da ficha comparada integralmente com os parágrafos da arte; legenda integral; carregamento das imagens/fontes; limites dos elementos; inspeção de prévias e slides de comparação. [Relatório de layout](verificacao-layout.json).

Scripts de produção e cópia das artes anteriores: output/instagram/refazer-3-2026-10-13 no workspace. O código da plataforma e os depoimentos originais não foram alterados.

Nenhuma publicação, agendamento ou automação foi executada.
