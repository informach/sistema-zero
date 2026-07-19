# Vila do Dragão — correção visual completa

## Contexto

O exemplo contém ferreiro, chave, porta, caverna e dragão no estado interno, mas
desenha apenas uma grade, os NPCs e o herói. A porta não aparece, vila e caverna
se parecem, e a fala automática não explica que uma segunda conversa entrega a
missão. O fluxo funciona para um teste que conhece as coordenadas, mas não para
uma pessoa que joga sem esse conhecimento.

## Abordagem escolhida

A correção ficará no exemplo `Vila do Dragão` e usará apenas formas e textos já
suportados pelo Estúdio. Não adicionaremos assets externos nem mudaremos a API
pública de `@sistemazero/studio`.

O exemplo passará a mostrar:

- uma vila com chão, caminhos, casas, ferraria, placa e limites visíveis;
- o ferreiro identificado pelo nome;
- uma entrada de pedra para a caverna, visível antes e depois de ser liberada;
- um HUD com mapa, controles e objetivo atual;
- uma caverna com pedras, lava e iluminação diferente da vila;
- um dragão maior, identificado e acompanhado de um prompt de interação;
- saída da caverna, vitória e reinício visualmente coerentes.

## Fluxo da aventura

1. O menu informa os controles e o objetivo inicial.
2. O ferreiro caminha até o herói. A conversa automática apresenta a missão e
   entrega a chave e a poção; o jogador não precisa descobrir uma segunda fala.
3. O HUD muda para “Entre na caverna” e aponta para a porta no canto inferior
   direito. A porta muda de trancada para aberta.
4. Ao pisar na porta, o jogador entra em uma caverna visualmente distinta.
5. O HUD pede que o jogador encontre o dragão. Perto dele, o jogo mostra
   “Espaço: enfrentar o Dragão”.
6. A batalha existente continua usando defesa, golpe especial e poção.
7. A vitória oferece um novo jogo que restaura vila, missão, chave, mapa e luta.

## Implementação

- Declarar o tamanho da vila e da caverna para impedir que o herói caminhe para
  um vazio sem limites.
- Manter as paredes lógicas alinhadas às construções desenhadas.
- Desenhar o cenário no `onDraw` antes de NPCs e herói, escolhendo a composição
  por `rpgCurrentMap()`.
- Desenhar porta, nomes, prompts e objetivo no HUD conforme mapa, flags e itens.
- Mover a concessão da missão, da chave e da poção para a cena inicial. A fala
  posterior do ferreiro apenas repete a direção da caverna.
- Preservar o mapa inicial explícito, o combate, a recompensa e o reinício.
- Atualizar a fonte canônica usada pelo teste de drift junto com a IR embutida.

## Testes e aceite

- Um teste de regressão deve falhar no exemplo atual ao exigir missão e chave ao
  fim da apresentação, mapas limitados e textos visuais de objetivo.
- O playthrough determinístico deve percorrer diálogo, porta, caverna, dragão,
  batalha, vitória e novo jogo sem conhecer estados secretos.
- O Chromium deve abrir o cartão real, concluir a apresentação, confirmar que a
  vila e a caverna produzem quadros diferentes, chegar ao dragão pelos controles
  publicados e terminar sem warnings ou exceções.
- A suíte do pacote, o typecheck e o Biome devem continuar verdes.

## Fora de escopo

- Novas fases, personagens ou ramificações narrativas.
- Assets baixados, sprites novos ou música adicional.
- Mudanças visuais nos demais exemplos de RPG.
