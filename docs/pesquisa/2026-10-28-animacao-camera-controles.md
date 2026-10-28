# Levantamentos da dona: animação, física, câmera e controles (28/10/2026)

Resumo de três mensagens que a dona enviou no mesmo dia, guardado para consulta. Os números são
hipóteses de partida dela ("valores sugeridos para experimentos", "não são valores oficiais dos
jogos analisados"); o que o jogo adota e por quê fica em `docs/arquipelago-regras.md`. O plano que
saiu daqui: `docs/plans/2026-10-28-arquipelago-controlador-universal.md`.

## 1. Como os jogos profissionais fazem animações e física

- Animação e física são sistemas separados que trabalham juntos: a física (uma cápsula invisível)
  decide onde o personagem pode estar; a animação decide como ele aparenta se mover.
- Personagem: malha + esqueleto (rig) + skinning; animações em clipes (parado, andar, correr,
  frear, começar o salto, subir, cair, aterrissar, nadar, escalar, sentar, interagir), misturados
  por blending/crossfade.
- Máquina de estados de animação pela velocidade horizontal, contato com o chão, velocidade
  vertical e modo; transições de 0,12 a 0,25 s para começar.
- Controlador cinemático do Rapier com cápsula para o avatar; corpos dinâmicos para caixas,
  pedras e objetos empurráveis. O cinemático não recebe gravidade sozinho: a componente vertical é
  calculada pelo jogo.
- Três detalhes: aceleração e desaceleração, coyote time (pular logo depois de sair da beirada) e
  jump buffer (o pulo apertado um instante antes de tocar o chão vale).
- Parâmetros sugeridos para testar (1 unidade = 1 m): caminhada 4,2 m/s, corrida 6,5 m/s, salto de
  1,15 m, gravidade 20 m/s².
- Animações in-place (o controlador desloca a cápsula); root motion só para ações coreografadas.
- Física por região: casa (chão, paredes, escadas), Bosque (rampas, troncos, saltos), pontes,
  Recife (nado e flutuação), Pico Gelado (atrito baixo), Vale dos Dinos (montaria), Ilha das
  Nuvens (gravidade modificada e planeio). Um motor central com modos e parâmetros por ilha;
  sensores do Rapier para água, pontos de controle e gatilhos.
- Passo fixo de 1/60 s com interpolação do desenho.
- Uma sala de testes antes do arquipélago inteiro, com o avatar real: andar e correr com
  transições, degraus e rampas, pular entre plataformas, entrar e sair da água, câmera estável no
  celular e no computador. Condição: continuar agradável mesmo sem missões nem prêmios.
- Referências: controlador de personagem do Rapier, sistema de animação do Three.js, integração
  React Three Fiber com Rapier, exportação de várias animações (NLA) do Blender para glTF.

## 2. A base tecnológica adotada

- React Three Fiber (renderização, cenários, câmera, luz), Rapier via `@react-three/rapier`
  (física, gravidade, colisões, saltos, objetos), Blender (modelos, rigging, animações), Three.js +
  Drei (tocar, misturar e trocar as animações) e GLB/glTF, para o Sistema Zero Kids e o Adultos.
- O Blender cria as animações; o Three.js as executa; o Rapier controla o deslocamento, que precisa
  ficar sincronizado com a animação.
- Começar por um controlador universal de personagens: aceleração e desaceleração suaves; parado,
  caminhada, corrida, salto, queda e aterrissagem; colisões com terreno, construções, rampas e
  escadas; câmera em terceira pessoa; modos para nadar, planar, escalar e montar.
- Depois, uma biblioteca de animações reutilizáveis no Blender.
- Movimentos e física independentes da aparência: trocar roupa, cabelo e acessório sem mexer no
  controlador, com modelos compatíveis com o esqueleto.
- Deixar a movimentação divertida antes de ampliar ilhas e mecânicas.

## 3. Câmeras e controles em jogos profissionais 3D

- A câmera faz parte da jogabilidade. Recomendação: câmera híbrida em terceira pessoa, livre na
  exploração, assistência discreta no movimento e enquadramentos próprios por atividade.
- Estilos de referência (decisões de design, não código): câmera livre (Zelda: Breath of the
  Wild), assistida para plataformas (Super Mario Odyssey), de construção (The Sims 4),
  semicontrolada (Animal Crossing).
- Sistemas consultados: Spring Arm da Unreal (braço com distância, suavização e colisão),
  Cinemachine do Unity (perfis, composição, transições), câmera do Roblox (Classic e Follow, zoom,
  Invisicam), Enhanced Input da Unreal (ações separadas dos dispositivos, contextos, zonas
  mortas, remapeamento).
- O braço segue um ponto estável do controlador, não a cabeça animada. Obstáculos: paredes e
  rochas aproximam a câmera; folhagem fica transparente; na casa, paredes cortadas; em pontes, um
  enquadramento estável.
- A câmera respeita a intenção de quem joga: recentralização suave e opcional, nunca puxando a
  visão sem necessidade.
- Mapeamento proposto: WASD/setas, analógico esquerdo, joystick virtual (mover); arrastar,
  analógico direito, arrastar à direita (câmera); espaço, botão de baixo, botão (pular); Shift,
  gatilho, botão (correr); E/clique, botão de ação, toque no objeto (interagir); rodinha, pinça
  (zoom); C, clique no analógico direito (recentralizar); M (mapa); Esc (pausa). Movimento
  relativo à câmera. Contextos de entrada (jogar, construir, programar, menus).
- Celular: joystick flutuante à esquerda, arrastar à direita para a câmera, botões de pular e
  interagir perto do polegar, botão contextual grande (Conversar, Colher, Abrir); áreas de toque
  de pelo menos 44 × 44 pontos (Apple); Pointer Events com um dedo por vez e `touch-action` só nas
  áreas do jogo.
- Conforto como requisito (diretrizes de acessibilidade do Xbox): sensibilidade, distância,
  recentralização automática (desligada), inverter o eixo vertical, tremor (desligado no Kids),
  menos animação de câmera, sensibilidade separada por eixo, remapeamento. Os mesmos ajustes para
  Kids e Adultos.
- Perfis por atividade: exploração, corrida e saltos, interior, construção, conversa, nado,
  planador, montaria, evento narrativo (com opção de pular).
- Parâmetros iniciais propostos: distância 4,5 m (zoom 2,2 a 7 m), ponto acompanhado a 1,35 m, FOV
  60°, suavização 0,15 s, transição exploração/construção 0,5 s, raio de colisão da câmera 0,25 m,
  zona morta 0,15, recentralização desligada.
- Implementação: gerenciador de entrada, controlador do personagem (Rapier), gerenciador de câmera
  (perfil, rotação, distância, foco), resolvedor de colisão da câmera com shape cast do Rapier.
  `OrbitControls` como referência, não como solução; `PointerLockControls` só como opção.
  Gamepad API para controles físicos.
- Ordem proposta: fundação (exploração, teclado, mouse, controle, toque, zoom, colisões, conforto
  básico); ambientes e criação (interiores, transparência, Construir, transições); expansão (nado,
  escalada, montaria, planeio, percursos, cinemáticas).
- Fontes citadas por ela: documentação do Cinemachine, Spring Arm da Unreal, câmera do Roblox,
  consultas físicas do Rapier, diretrizes de conforto visual do Xbox, Apple (controles de toque em
  jogos), MDN (Pointer Events, `touch-action`, Gamepad API).
