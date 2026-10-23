# P35 · Fontes e produção

Produzido em 14/10/2026. Sete PNGs, 1080 × 1350, com a [copy e a direção aprovadas](../../../../postagens/09-p31-a-p40.md#p35). Os textos dos slides e a legenda foram preservados. Calendário comum, semana 9, segundo post; desejo W05, série Por trás do jogo.

## Cenas e ilustrações

Quatro imagens novas, geradas com a ferramenta nativa `image_gen.imagegen`. [Prompts integrais](prompts.json) e [origens das imagens](imagens-geradas.json).

- Slides 1 e 7: mãe e menino fictícios, com continuidade de rostos, roupas e ambiente. Na capa, ele conta sua história mostrando um mapa; no encerramento, desenha enquanto a mãe participa. Não são alunos reais, depoimentos ou registros de aprendizagem.
- Slide 2: mapa desenhado com campo, praia, bosque, vila, caminhos, rio e ponte. É uma ilustração editorial de uma ideia, sem atribuição a uma criança real.
- Slide 3: viajante conversa com um morador diante de uma ponte quebrada. O morador indica outro caminho. É um exemplo visual de uma história em que o jogador pode agir, não uma tela do Reino Aberto.

## Capturas da plataforma

Fonte: `packages/studio/src/official-extensions/game-2d-advanced/examples/reinoAbertoExample.ts`, exportação `reinoAbertoExample`. O gerador e o runtime atuais da plataforma foram usados. [Código gerado original](reino-original.js). Não houve alteração de regras, cenários, falas ou personagens.

O exemplo representa os mapas por fundos coloridos com grade, o herói por um quadrado azul e o pescador por um quadrado roxo. Essa aparência original foi preservada nas capturas. O desenho dos slides 2 e 3 não foi apresentado como imagem produzida pelo exemplo.

A captura foi feita com Playwright no runtime local, viewport 960 × 640, fator de escala 2. O percurso ocorreu pelo teclado, do campo à praia, da praia à vila e da vila ao bosque. O relógio foi controlado para registrar estados reproduzíveis. Um observador de `fillText` registrou as falas efetivamente desenhadas sem mudar a renderização. `rpgSave()` permitiu conferir os mapas e as posições alcançadas. Nenhuma posição, regra ou fala foi injetada.

- Slide 4: quatro capturas reais organizadas como campo/praia em cima e bosque/vila embaixo. Os títulos e as setas são editoriais. As conexões de ida e volta correspondem às regras nativas: campo–praia, campo–bosque, praia–vila e bosque–vila.
- Slide 5: campo na posição horizontal 14, vertical 2; depois, chegada à praia na posição horizontal 1, vertical 2. O título nativo de cada mapa foi ampliado em uma faixa acima do recorte. A seta entre imagens indica a travessia. O comando “Ligar a borda leste (direita) deste mapa ao mapa praia” foi capturado no Blockly a partir do IR original, dentro da regra de entrada no campo. Apenas o comando relevante é exibido.
- Slide 6: herói junto ao pescador, na praia. A tecla de espaço abre a fala nativa: “O mar termina aqui, mas o reino continua pro sul!”. O enquadramento dos personagens e o balão são dois recortes ampliados da mesma captura. A legenda de cores Herói/Pescador é editorial e serve para identificar as formas simples.

Registros: [estados e falas capturados](capturas-verificadas.json), [comando e regra de origem](blocos-capturados.json), [copy utilizada](copy.json), [verificação da montagem](verificacao.json) e [verificação final](entrega-verificada.json).

## Montagem e entrega

Azul, creme e amarelo, fonte Nunito 600/800 local. Textos aplicados em HTML; fotos e ilustrações novas; capturas reais recortadas e ampliadas. Inspeção visual das sete artes, com atenção especial aos nomes dos mapas, ao bloco e ao diálogo. Legenda e textos alternativos completos acompanham os PNGs.

Scripts de preparação, captura, montagem e verificação: `output/instagram/p35-2026-10-14/`. A entrega é local. Não houve publicação, agendamento ou alteração das regras dos jogos.
