# Auditoria dos 63 exemplos do Estúdio — 2026-07-18

## Resultado

Os 63 cartões reais da `KitGallery` foram auditados. O catálogo final contém
46 jogos, 9 demonstrações e 8 explorações. Todos passam pelo caminho real de
criação da galeria, schema, geração, assets, registro de extensões e round-trip
Blockly sem warnings. No Chromium, cada cartão abriu em contexto limpo, exibiu
o badge correto, produziu primeiro frame não vazio, recebeu as interações do seu
contrato e permaneceu sem exceção, page error ou warning de aplicação.

O gate `showExamples` não foi alterado: a galeria continua restrita aos hosts e
perfis que já a habilitavam.

Baseline observado antes das mudanças: 3.524 testes passando em 243 arquivos.
O número diverge dos 315 citados no plano antigo porque a suíte cresceu desde
aquele levantamento.

## Defeitos encontrados e corrigidos

1. **Mapa inicial de RPG implícito.** Foi criado
   `gk:rpgSetStartMap` / `SZGameKit.rpgSetStartMap(name)`, com fallback legado
   para o primeiro mapa válido. Destino inexistente agora diagnostica e cai no
   primeiro mapa sem desmontar o mundo atual. Os seis exemplos com `rpgOnMap`
   declaram o início.
2. **Cenas personalizadas fechadas em dropdown.** Os campos de `Ir para a tela`
   e `a tela atual é…?` agora aceitam nomes livres. `ganhou1` e `ganhou2`
   fazem round-trip em Guerra de Gorilas e Guerra de Gorilas vs Robô sem warnings.
3. **Assets ausentes.** Herói que anda agora embute o herói e sua folha de quatro
   quadros; Sala com paredes embute herói e tileset.
4. **Autoplay inválido.** O Jogo 2D adia a criação/retomada do `AudioContext`
   até o primeiro gesto, preservando música e efeitos sem warning do Chromium.
5. **Ordem inválida no Kit Luta.** Golpes passaram a ser definições persistentes
   do personagem e podem ser declarados antes de `Luta de`, como já fazia o
   exemplo Duelo dos Bonecos.
6. **Cobertura incompleta do catálogo.** Um contrato independente lista as 63
   chaves, promessa, classificação, cenário e interações. A suíte falha por
   ausência, excesso, mudança de classe, cenário vazio, raw block, asset inválido,
   warning de serialização ou projeto malformado.

## Inventário e aceite

`Aprovado` em Chromium significa: criação pelo cartão real, badge, primeiro
frame, interações declaradas e console limpo. Conclusões e reinícios são
exercitados nos harnesses determinísticos dos motores; a Vila do Dragão tem
playthrough do fixture exato (vila → ferreiro → chave → porta → caverna →
defesa/especial/poção → vitória → novo jogo).

| Família | Exemplo | Classe | Promessa auditada | Defeito / correção | Chromium |
|---|---|---|---|---|---|
| Jogo 2D | Pong simples | Jogo | Rebater a bola com a raquete pelas setas. | Nenhum isolado. | Aprovado |
| Jogo 2D | Herói que anda | Demonstração | Sprite, spritesheet e movimento em quatro direções. | Assets ausentes → imagem e folha de 4 quadros embutidas. | Aprovado |
| Jogo 2D | Mini plataforma | Demonstração | Movimento, pulo, gravidade e limite da tela. | Nenhum isolado. | Aprovado |
| Jogo 2D | Plataforma com inimigos | Jogo | Combater patrulha, saltador e atirador com vida e pontos. | Nenhum isolado. | Aprovado |
| Jogo 2D | Jogo desenhado por código | Demonstração | Herói e moeda apenas com formas, sem imagens. | Nenhum isolado. | Aprovado |
| Jogo 2D | Sala com paredes | Demonstração | Tilemap com paredes realmente sólidas. | Assets ausentes → herói e tileset embutidos. | Aprovado |
| Jogo 2D | Nave contra Asteroides | Jogo | Mover, atirar, pontuar, vencer/perder e reiniciar. | Nenhum isolado. | Aprovado |
| Jogo 2D | Asteroides clássico | Jogo | Girar, impulsionar e atirar no estilo Asteroids. | Nenhum isolado. | Aprovado |
| Jogo 2D | Dino Run | Jogo | Pular, abaixar, coletar bônus, perder e manter recorde. | Nenhum isolado. | Aprovado |
| Jogo 2D | Guerra de Gorilas | Jogo | Mira por arrasto, vento, gravidade, crateras e dois jogadores. | `ganhou1/2` inválidos no dropdown → nomes livres. | Aprovado |
| Jogo 2D | Guerra de Gorilas vs Robô | Jogo | Jogada humana e resposta autônoma do robô. | `ganhou1/2` inválidos no dropdown → nomes livres. | Aprovado |
| Jogo 2D | Equilibrista | Jogo | Esticar bastão, atravessar, falhar e recomeçar. | Nenhum isolado. | Aprovado |
| Jogo 2D | Balão | Jogo | Subir com combustível e evitar árvores. | Nenhum isolado. | Aprovado |
| Jogo 2D | Aventura com câmera | Exploração | Mundo largo, câmera, moedas, música e efeitos. | AudioContext antes de gesto → desbloqueio compartilhado por gesto. | Aprovado |
| Jogo 2D Avançado | Meu primeiro jogo | Demonstração | Base mínima: botão Jogar e movimento pelas setas. | Nenhum isolado. | Aprovado |
| Jogo 2D Avançado | Caça-moedas profissional | Jogo | Menu, pausa, estados e vitória ao pegar 5 moedas. | Nenhum isolado. | Aprovado |
| Jogo 2D Avançado | Arena dos Goblins | Jogo | Spawner, combate, dano e missão de 10 goblins. | Nenhum isolado. | Aprovado |
| Jogo 2D Avançado | Vila do Dragão | Jogo | Missão, chave, poção, caverna, batalha rica e vitória. | Início implícito → `vila`; playthrough exato e reset completo. | Aprovado |
| Jogo 2D Avançado | Floresta Ninja | Jogo | Ataque direcional e vitória sobre dois ninjas. | Nenhum isolado. | Aprovado |
| Jogo 2D Avançado | Salto na Floresta | Jogo | Pulo tolerante, plataformas especiais, pisão e 5 frutas. | Nenhum isolado. | Aprovado |
| Jogo 2D Avançado | Bichinhos do Quintal | Jogo | Encontrar, batalhar e capturar três criaturas. | Início implícito → `quintal`. | Aprovado |
| Jogo 2D Avançado | Invasão dos Óvnis | Jogo | Formação, tiros, power-up, ondas e derrota. | Nenhum isolado. | Aprovado |
| Jogo 2D Avançado | Duelo dos Bonecos | Jogo | Melhor de 3 contra IA com defesa, golpes e agarrão. | Golpes antes da partida eram descartados → definições persistentes. | Aprovado |
| Jogo 2D Avançado | Defesa do Reino | Jogo | Comprar torres, defender ondas e cinco vidas. | Nenhum isolado. | Aprovado |
| Jogo 2D Avançado | Reino Aberto | Exploração | Quatro mapas conectados, câmera e dois NPCs. | Início implícito → `campo`. | Aprovado |
| Jogo 2D Avançado | Batalha em Equipe | Jogo | Aliado, cura, inspeção e dois inimigos por turnos. | Início implícito → `praca`. | Aprovado |
| Jogo 2D Avançado | O Chefao | Jogo | Chefe com golpes e segunda fase em área. | Início implícito → `caverna`. | Aprovado |
| Jogo 2D Avançado | O Chefao da Ficha | Jogo | Chefe definido por ficha, tela própria e batalha. | Início implícito → `caverna`. | Aprovado |
| Jogo 2D Avançado | Corrida de Tabuleiro | Jogo | Dado, trilha, pontuação e alternância de dois turnos. | Nenhum isolado. | Aprovado |
| Jogo 2D Avançado | Jogo da Memoria | Jogo | Virar cartas, comparar e encontrar 3 pares. | Nenhum isolado. | Aprovado |
| Jogo 2D Avançado | Duelo de Cartas | Jogo | Deck, mão, energia, ataque, defesa e intenção inimiga. | Nenhum isolado. | Aprovado |
| Jogo 2D Avançado | Cobrinha | Jogo | Grade, crescimento, parede, corpo e reinício. | Nenhum isolado. | Aprovado |
| Jogo 2D Avançado | Quebra-blocos | Jogo | Raquete, ângulo de rebatida e limpeza dos blocos. | Nenhum isolado. | Aprovado |
| Jogo 3D | Boneco de formas | Demonstração | Modelo composto por formas, materiais e rotação. | Nenhum isolado. | Aprovado |
| Jogo 3D | Noite enevoada | Demonstração | Céu noturno, neblina, sombras e luz pontual. | Nenhum isolado. | Aprovado |
| Jogo 3D | Enxame que gira | Demonstração | Molde, cinco cópias e iteração sobre o enxame. | Nenhum isolado. | Aprovado |
| Jogo 3D | Torre maluca | Jogo | Soltar andares, pontuar, falhar e reiniciar. | Nenhum isolado. | Aprovado |
| Jogo 3D | Corrida maluca | Jogo | Acelerar, frear, desviar e completar voltas. | Nenhum isolado. | Aprovado |
| Jogo 3D | Atravesse a rua | Jogo | Grade isométrica, trânsito, pontos e fim de jogo. | Nenhum isolado. | Aprovado |
| Jogo 3D | Desvie dos blocos | Jogo | WASD, pulo, obstáculos acelerados e derrota. | Nenhum isolado. | Aprovado |
| Jogo 3D | Cubo girando | Demonstração | Cubo Three.js em rotação contínua. | Nenhum isolado. | Aprovado |
| Jogo 3D Avançado | Defesa da Torre | Jogo | Torres autônomas com estados defendem o cristal. | Nenhum isolado. | Aprovado |
| Jogo 3D Avançado | Salto nas Nuvens | Jogo | Física, plataformas, moedas e câmera seguidora. | Nenhum isolado. | Aprovado |
| Jogo 3D Avançado | Parkour do Vulcão | Jogo | Rampa, elevador, trampolim, zonas e 3 gemas. | Nenhum isolado. | Aprovado |
| Jogo 3D Avançado | Quadra Maluca | Jogo | Câmera por arrasto e objetos com físicas distintas. | Nenhum isolado. | Aprovado |
| Jogo 3D Avançado | Guardião do Portal | Jogo | Defender por 30 s com partida determinística. | Nenhum isolado. | Aprovado |
| Jogo 3D Avançado | Tiro ao Alvo | Jogo | Point-and-click, alvo dourado e 12 pontos em 25 s. | Nenhum isolado. | Aprovado |
| Mundo 3D | Meu Mundo | Exploração | Floresta, carro, turbo, buzina, segredo e ciclo diário. | Nenhum isolado. | Aprovado |
| Mundo 3D | Corrida do Por do Sol | Jogo | Cinco checkpoints ordenados, volta, tempo e recorde. | Nenhum isolado. | Aprovado |
| Mundo 3D | Boliche na Praca | Jogo | Jipe, 10 pinos, strike e objetos destrutíveis. | Nenhum isolado. | Aprovado |
| Mundo 3D | Inverno Magico | Exploração | Neve, vento, gelo escorregadio e totens. | Nenhum isolado. | Aprovado |
| Mundo 3D | Ilha dos Criadores | Jogo | A pé, carro, barco, diálogo, 15 moedas e conquista. | Nenhum isolado. | Aprovado |
| Mundo 3D | Parque dos Brinquedos | Exploração | Letras, boliche, TNT, tornado, buzina e recado. | Nenhum isolado. | Aprovado |
| Mundo 3D | Vila das Vocacoes | Exploração | Trânsito, Guia, escolha, portas, moedas e minimapa. | Nenhum isolado. | Aprovado |
| Mundo 3D | Base da Lua | Jogo | Baixa gravidade, jetpack, cratera, 12 moedas e conquista. | Nenhum isolado. | Aprovado |
| Mundo 3D | Fazendinha | Exploração | Plantações, animais, moinho e escolha de colheita. | Nenhum isolado. | Aprovado |
| Núcleo | Cidade & Moinho (na mão) | Jogo | Mini-Gorillas só com HTML, CSS, SVG e Canvas genéricos. | Nenhum isolado. | Aprovado |
| Núcleo | Invasores do Espaço (na mão) | Jogo | Classes, pool, ondas, colisão e teclado só no núcleo. | Nenhum isolado. | Aprovado |
| Núcleo | Plataforma Vertical (na mão) | Jogo | Plataforma, física e câmera feitas só no núcleo. | Nenhum isolado. | Aprovado |
| Núcleo | Portas do Castelo (na mão) | Jogo | Plataforma, porta, troca de fase e fade manual. | Nenhum isolado. | Aprovado |
| Núcleo | Defesa da Torre (na mão) | Jogo | Compra, mira, ondas, moedas e vidas só no núcleo. | Nenhum isolado. | Aprovado |
| Núcleo | Duelo (na mão) | Jogo | Luta local de dois jogadores e limite de tempo. | Nenhum isolado. | Aprovado |
| Núcleo | Passeio 3D (na mão) | Exploração | Three.js, carro, câmera, névoa, ciclo diário e áudio. | Nenhum isolado. | Aprovado |

## Evidência automatizada

- `bun run test`: 3.591 testes aprovados em 244 arquivos, com 26.497 asserções.
- `bun run typecheck`: `tsc --noEmit` aprovado.
- `bun run check`: 554 arquivos aprovados pelo Biome, sem correções pendentes.
- `bun run e2e`: 90 testes aprovados no Chromium em 6,3 minutos.
- `src/examples/qaContracts.test.ts`: cobertura exata das 63 chaves,
  classificação, mapa inicial, schema, IR, blocos, geração, assets, extensões,
  projeto da KitGallery e round-trip sem warning.
- `e2e/examples-gallery.spec.ts`: 63 cartões no Chromium e seis repetições em
  390×844 (uma por família).
- Harnesses de `game-2d`, `game-2d-advanced`, `game-3d-advanced` e
  `world-3d`: controles, objetivos, vitória/derrota e reinício por mecânica.
- Regressões dedicadas: mapa inicial explícito/legado/inválido/reinício, Vila do
  Dragão completa, cenas `ganhou1/ganhou2`, assets embutidos, áudio após gesto e
  golpes definidos antes da luta.
