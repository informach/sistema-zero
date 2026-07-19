# Vila do Dragão — correção visual completa

## Contexto

O exemplo contém ferreiro, chave, porta, caverna e dragão no estado interno, mas
desenha apenas uma grade, os NPCs e o herói. A porta não aparece, vila e caverna
se parecem, e a fala automática não explica que uma segunda conversa entrega a
missão. O fluxo funciona para um teste que conhece as coordenadas, mas não para
uma pessoa que joga sem esse conhecimento.

## Abordagem escolhida

A correção separa a criação visual do mapa dos acontecimentos de entrada. A
extensão Jogo 2D Avançado ainda está em testes e não possui usuários; portanto,
substituiremos a API interna atual em vez de manter aliases ou compatibilidade
com um modelo confuso. A API pública de `@sistemazero/studio` não muda.

O bloco `Criar o mapa` declara nome, largura, altura e desenho:

```text
Criar o mapa [vila] com [15] × [10] células
  desenhar com [ctx]:
    formas vetoriais, mapa do Pinta ou imagem importada
```

O bloco `Quando entrar no mapa` declara apenas comportamento:

```text
Quando entrar no mapa [vila]
  fazer:
    posicionar herói, criar NPCs, paredes, portas e diálogos
```

O motor executa o corpo de desenho do mapa ativo antes dos personagens. Ele não
inventa grade, chão ou cenário. Um mapa sem corpo de desenho permanece vazio e
gera um diagnóstico de autoria.

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

- Adicionar o pipeline interno completo de `gk:rpgCreateMap` /
  `SZGameKit.rpgCreateMap(name, cols, rows, draw)`.
- Substituir `gk:rpgOnMap` por `gk:rpgOnEnterMap` /
  `SZGameKit.rpgOnEnterMap(name, handler)` em schema, blocos, parser, gerador,
  workspace, runtime, allowlist, documentação e exemplos oficiais.
- Remover `rpgOnMap` e o bloco separado `rpgMapSize`; o tamanho pertence à
  criação do mapa. Não manter aliases legados.
- Fazer os seletores listarem somente nomes declarados por `Criar o mapa`.
- Diagnosticar mapa inicial, porta ou evento de entrada que referencie um mapa
  não criado, sem abrir um mundo vazio.
- Manter as paredes lógicas alinhadas às construções desenhadas.
- Desenhar porta, nomes, prompts e objetivo no HUD conforme mapa, flags e itens.
- Mover a concessão da missão, da chave e da poção para a cena inicial. A fala
  posterior do ferreiro apenas repete a direção da caverna.
- Preservar o mapa inicial explícito, o combate, a recompensa e o reinício.
- Migrar todos os exemplos oficiais da extensão para o novo contrato e atualizar
  a fonte canônica da Vila junto com a IR embutida.

## Testes e aceite

- Testes de contrato devem cobrir os dois blocos, seus round-trips e a ausência
  dos tipos e APIs removidos.
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
- Mudanças narrativas nos demais exemplos de RPG; eles serão apenas migrados para
  os dois blocos novos.
