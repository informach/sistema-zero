# Composição de cena regional — 22/11/2026

Base `5a9c8cfe2`. O mesmo compositor `drawScene` passa a consumir as cenas 4
privadas, com o leitor regional existente. A visita segue a ordem global de
linhas/colunas das células armazenadas, sem converter a extensão vazia em vetor.
Metadados de grupos continuam usando `sceneLayerState`; sua generalização é
somente de tipos e conserva o JavaScript emitido byte a byte.

Objetos ficam em pixels globais. Ao desenhar uma instância de conjunto, a origem
da definição é descontada depois da escala; rotação e espelhamento continuam na
transformação existente. A imagem final desconta a origem do mapa. Mover os
limites lógicos não move silenciosamente o conteúdo autoral.

`scenePng` admite resolução regional antes de criar canvas ou carregar imagens:
8.192 pixels por lado e 16 Mi pixels, pelo orçamento compartilhado. Uma visão
geral de 512 pixels pode representar um mundo lógico 10.000² sem alocar sua
grade vazia. O comportamento e os limites anteriores da imagem densa foram
conservados. Não é carregamento sob demanda, viewport culling do runtime,
exportação de dados PNG 5 ou qualificação de desempenho da oficina.

## Revisão e evidências

- **2.741 testes completos do Pinta**, 35.584 asserções, 254 arquivos,
  207,95 s; **3.215 do Core**, 160.357 asserções e 200 arquivos. Sem falhas
  ou omissões, incluindo os três controles Pygame reais com SDL `dummy`.
  **13 focados**, 271 asserções. Tipos completos Core/Pinta/Estúdio e lint aprovados.
- **71 ensaios Chromium sem retry**: 59 da matriz de persistência e 12 da
  integração Pinta–Estúdio. Os novos PNGs foram inspecionados visualmente
  nesta máquina, sem atribuir essa prova a testes com crianças ou aparelhos adicionais.
- Reprodução antes da alteração: o compositor anterior lança `TypeError` ao
  receber células regionais. Era uma fronteira privada ainda não implementada,
  não uma alegação de defeito em jogos publicados.
- **192 comparações RGBA** denso/regional com padrões de arte: origens 0 e −32,
  16 combinações de giro/espelhos do conjunto, três tempos de animação e os
  passes de fundo/frente; todas as imagens têm conteúdo. Opacidade, grupos,
  propriedades e os oito flags quadrados fazem parte dos documentos usados.
- **96 comparações RGBA com o compositor do commit base**: render legado
  idêntico. O hash do JavaScript emitido do helper de grupos também coincide.
- O compositor abre um mundo lógico de 100 milhões de células mantendo só os
  chunks armazenados. Pedidos regionais grandes ou inválidos são recusados
  antes de DOM/imagens.
- Dois ensaios Chromium, desktop/CPU 4× nesta máquina, usam os encoders reais
  da Vila: sete comparações por perfil, incluindo PNG completo idêntico ao
  denso. A miniatura esparsa tem 512² pixels e o pedido de imagem integral
  é recusado. Os PNGs reais produzidos estão nos recibos.

Sem alteração visual da oficina, funcionalidade 3D, implantação ou novo aparelho
físico. O contrato cena 4 continua privado e ainda não é jogável nos motores.
Seguir para PNG 5 e leitores/consumidores; as etapas macro continuam abertas.
