# P07 — refação conforme copy, arte e produção atuais

Produzido em 13/10/2026. 7 slides.

Copy: revisão 4 de 13/10/2026, lida diretamente da ficha atual. Textos e legendas preservados integralmente. Paleta mantida, conforme esclarecimento da Helena: azul #194bd7, branco quente #fffcf4, amarelo #ffdb56 e texto #172a46. Tipografia Nunito 800/600, arquivos e licença em apoio.

Cada slide é um PNG 1080 × 1350 (4:5), exportado no Chrome com perfil de cor padrão sRGB. Montagem editável: ../../montagem.html. A copy está em copy-fonte.md, a checagem em verificacao-layout.json e os prompts em prompts.json. O registro completo dos scripts está em output/instagram/refacao-final-2026-10-13.

As ampliações dos contadores e barras usam recortes dos próprios pixels das capturas, sem redesenhar os valores. Os únicos desenhos sobre os jogos são destaques e setas editoriais. Fotografias geradas são cenas encenadas; telas demonstrativas e blocos isolados são capturas reais. Não há rodapé “Cena ilustrativa” nem “Demonstração da equipe”.

As versões anteriores dos PNGs e da montagem foram guardadas em output/instagram/refacao-final-2026-10-13/anterior; apoio/v2 conserva as fontes anteriores. Nenhuma publicação, agendamento ou ativação de automação foi executada.

## Pessoas

As quatro cenas de André e Júlio seguem as referências autorizadas da família e a direção atual. Capa e pausa no sofá preservam as fotos geradas aprovadas da v2. Investigação e descoberta foram editadas pela ferramenta integrada image_gen para mostrar no monitor a nova captura do jogo; rostos, expressões e composição foram preservados. Não são registros de uma dificuldade real do André.

## Captura real e adaptações comuns

Base: Salto nas Nuvens, Jogo 3D Avançado, runtime e exemplos oficiais. As duas variantes elevam igualmente plataformas, moedas e herói em 15 unidades, como na v2. Para a direção visual, ambas recebem o mesmo céu claro, luz ambiente 0.9, luz pontual acima das plataformas, vinheta desligada e três nuvens decorativas feitas com peças de esfera da própria ferramenta. Nuvens não têm colisão sólida, recompensa ou regra de jogo. As adaptações são código executado antes da captura, não pintura sobre o print.

A única diferença entre as variantes é o x da segunda plataforma: 12 ou 7. Pulo 11, velocidade 8, moeda e sequência de teclas são iguais. O recorte de bloco preserva a regra original. Entrada: 900 ms de acomodação, Left+Down+Space por 350 ms; soltar Down/Space, manter Left por 575 ms; aguardar 250 ms; Left por 90 ms, pausa de 80 ms; Up por 100 ms, pausa de 80 ms; câmera e 16 ms.

Resultados registrados: distante = {"x":7.203234764008435,"y":8.357279999999983,"z":-2.045646667291263,"coins":3}; próxima = {"x":7.334383852492529,"y":16.8,"z":-2.0640877817127232,"coins":2}. O contador alive cai de 3 para 2 apenas na próxima, correspondendo ao HUD de zero e uma moeda. Comparação fotografada no mesmo passo e com a mesma câmera. Slide 3 usa câmera lateral; slide 4 parte do estado inicial e de outro ângulo; slide 5 usa as duas variantes vistas por trás.

Arquivos executados: nuvens-antes.js e nuvens-depois.js. Fontes: packages/studio/src/official-extensions/game-3d-advanced. Scripts: capturar.mjs e verificacao-capturas.json na pasta de trabalho.
