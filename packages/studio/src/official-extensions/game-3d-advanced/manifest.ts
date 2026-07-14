import type { ExtensionManifest } from '#extensions'
import { defesaDaTorreExample, saltoNasNuvensExample } from './examples'

export const gameKit3DManifest: ExtensionManifest = {
  id: 'game-3d-advanced',
  name: 'Jogo 3D Avançado',
  version: '0.2.0',
  description:
    'A base de um jogo 3D profissional, portada de um curso de engine — agora um SANDBOX 3D completo. Entidades com máquina de estados própria, física de verdade (gravidade, pulo, plataformas sólidas), formas/texturas por peça, luzes e névoa, clique/mira no mundo (raycast) e câmera em 1ª pessoa, partículas data-driven (explosões + fogo/fumaça contínuos + atratores), enxames com pool, vizinhança por grade espacial, combate, telas, HUD e som. O motor faz o que nunca muda; as regras são suas.',
  category: 'games',
  official: true,
  enabledByDefault: false,
  // mouse: botões das telas + câmera de órbita arrastável. audio: sons/efeitos.
  permissions: ['canvas', 'keyboard', 'mouse', 'audio'],
  docs: `## Jogo 3D Avançado

Esta extensão te dá a **base de um jogo 3D profissional de verdade** — a mesma
arquitetura que os cursos de engine ensinam — pelo \`window.SZGameKit3D\`.
Diferente do "Jogo 3D" (que traz kits prontos de gêneros), aqui o motor cuida
só do que **nunca muda** num jogo grande, e **as regras são suas**: você monta
a mecânica nos ganchos, com blocos de matemática, "se" e variáveis.

O que o motor já faz por você:

- **Mundo pronto** — céu em degradê, chão com sombra, luz de sol, câmera de
  órbita (arraste o mouse) e telas de UI (menu, pausa, carregando, fim,
  vitória). Um bloco: "Preparar o jogo 3D".
- **Máquina de estados POR ENTIDADE** — o coração dos jogos profissionais:
  cada torre e cada invasor vive num estado (\`parado\`, \`mirar\`,
  \`atirar\`…) com ganchos de entrar, de ficar (a cada quadro) e de sair.
  Um cérebro por MOLDE vale para o enxame inteiro.
- **Moldes de peças 3D** — a aparência é montada de caixas, bolas, cilindros
  e cones coloridos (como um brinquedo de montar). Nada de imagem: tudo
  procedural.
- **Enxames com pool** — nascer/recolher reaproveita as entidades (pooling).
  As fábricas ("A cada X s, nascer…") soltam inimigos sem parar.
- **Vizinhança rápida** — "para cada vizinho a até X" usa uma grade espacial
  por dentro: nunca compara todo mundo com todo mundo (a lição de otimização
  do curso).
- **Combate com invencibilidade** — machucar dá meio segundo de piscada
  invencível; vida no zero roda o "quando for derrotado" e recolhe sozinho.
- **Laço com delta-time (dt)** — o "A cada quadro" recebe quanto durou o
  último quadro, em segundos. O jogo anda igual em qualquer computador.

### Começando (a receita)

1. **Preparar o jogo 3D** — uma vez, no começo: resolução, tamanho do mundo,
   céu e chão.
2. **Criar o molde 3D** — um por tipo de coisa (herói, torre, invasor, tiro),
   com as peças dentro.
3. **Quando o jogo entrar no estado jogando** — monte a partida: nascer o
   herói ("chamando de"), espalhar enfeites, ligar as fábricas.
4. **A cada quadro (dt)** — a mecânica geral: mover pelas teclas, placar,
   condição de vitória.
5. **Os cérebros** — "Enquanto ela do molde X estiver no estado Y" para cada
   estado de cada molde.
6. **Começar o jogo** — uma vez, NO FIM.

### A máquina de estados (a lição do curso)

A torre profissional funciona assim, e você monta igual, em blocos:

- No estado **parado**: guardar em \`alvo\` quem do molde invasor está mais
  perto; se o alvo existe e encostou (a menos de 14) → mudar para **mirar**.
- No estado **mirar**: fazer mirar em \`alvo\` (suave); se "já está mirando?"
  → mudar para **atirar**.
- Ao entrar em **atirar**: nascer 1 tiro "no lugar dela (virado igual)",
  tocar o som laser, mudar para **recarregar**.
- No molde torre, depois de 1 s no estado **recarregar**, mudar para
  **parado** (transição automática por tempo).

Toda entidade NASCE no estado \`parado\`. Mudar para o estado em que já está
não faz nada (proteção dos jogos de verdade).

### Enxames, alvos e vizinhos

- O "Nascer 1… chamando de" dá um APELIDO (herói, cristal, chefão). Os
  anônimos do enxame são controlados pelo cérebro do MOLDE.
- "Guardar em alvo quem está mais perto" + "alvo ainda está no jogo?" é o
  padrão de mira: o alvo pode ter sido derrotado — pergunte antes de usar.
- "Para cada vizinho a até X" é a colisão em área: o tiro pergunta quem do
  molde invasor está a até 1 dele.

### Física & mundo sólido (🏃 Física)

O mesmo motor de entidade agora tem física de plataforma:

- **Fazer … cair com gravidade** liga a queda numa entidade — ela passa a cair
  e a POUSAR no chão e nas plataformas sólidas.
- **Fazer o molde … ser sólido** transforma as caixas daquele molde em
  paredes/chãos: quem cai não atravessa, para em cima e pode pular delas.
- **Fazer … pular** dá um impulso para cima, mas só quando está no chão (nada
  de voar segurando o pulo). **… está no chão?** conta o pulo.
- **Mover … como plataforma** é o controle pronto: WASD/setas no plano + pulo
  com espaço (liga a gravidade sozinho). Use dentro do "A cada quadro".

### Formas, texturas & luz (🧱 peças, 💡 Luz & céu)

- As **peças** dos moldes agora vêm em mais formas (caixa, bola, cilindro,
  cone, **plano, rosca, pirâmide**), com **material** (fosco, metal, vidro,
  brilho — o "brilho" acende o bloom) e uma **textura** (uma imagem do projeto
  estampada na peça).
- **Pôr uma luz** acende uma luz colorida num ponto (tocha, fogueira);
  **Luz do ambiente** deixa o mundo mais claro ou escuro (modo noturno/caverna);
  **Névoa** faz o longe sumir numa cor (mistério); **Trocar o céu** muda o
  degradê em runtime (dia → pôr do sol → noite).

### Mira, clique & 1ª pessoa (🖱️)

- **Guardar … a entidade do molde … sob o mouse** dispara um raio da câmera
  pelo ponteiro e devolve quem está embaixo do mouse — o coração do
  point-and-click, da estratégia e da torre-por-clique.
- **O mouse está sobre …?** e **o ponto do chão sob o mouse** (eixo x/y/z)
  completam a mira: brilhar ao passar o mouse, mover algo até o clique.
- **Câmera em 1ª pessoa em …** vê o mundo pelos olhos da entidade (clique para
  capturar o mouse e olhar em volta); **Mover … em 1ª pessoa** anda para onde
  a câmera olha (WASD relativo ao olhar).

### Faíscas 3D, emissores & efeitos de cinema (💥 🌊)

- **Faíscas** são o sistema de partículas dos jogos de verdade, feito só de
  DADOS: "Criar o efeito 3D" define a receita da EXPLOSÃO (quantas, cor do
  começo → cor do fim, espalhamento, tamanho, vida, gravidade) e "Soltar o
  efeito" estoura quantas quiser — o motor reaproveita tudo (nunca pesa).
- **Emissores contínuos** ("Criar o emissor 3D") jorram partículas SEM PARAR:
  fogo, fumaça, rastro de nave, aura mágica. Você escolhe a cor, o tamanho,
  quantos por segundo, a força, o cone (0° = raio reto, 180° = todas as
  direções), a gravidade e se BRILHA (ligado = fogo; desligado = fumaça
  transparente, ordenada por profundidade). "Ligar o jorro" prende num ponto
  ou **em cima de uma entidade** (ele acompanha); "Desligar" para de jorrar.
- **Atratores** ("Puxar as faíscas … para") criam um ímã que suga as
  partículas para um ponto — vórtice, buraco negro, vento. Pode pôr vários.
- **Efeitos de cinema** já vêm ligados: sombras, brilho (bloom — as coisas
  claras "vazam" luz, como o tiro amarelo) e vinheta (cantos escuros). Num
  computador fraco, desligue no bloco "Efeitos de cinema" (modo turbo).

### Dicas

- Unidades são METROS do mundo 3D: um boneco tem ~1–2 de altura, velocidades
  boas ficam entre 3 e 18 por segundo, o mundo padrão tem 80 de lado.
- O jogo pausa com Esc (troque com "Usar a tecla … para pausar").
- Entrar em "jogando" fora da pausa RECOMEÇA a arena (recolhe todo mundo) —
  por isso a partida se monta no "quando entrar no estado jogando".
- O placar fica nos cantos da tela com "Escrever no canto … da tela".

> ⚠️ Use APENAS UMA extensão de jogo por projeto (Jogo 2D, Jogo 2D Avançado,
> Jogo 3D ou esta) — cada uma cria a própria tela e elas brigam pelo canvas.
`,
  examples: [defesaDaTorreExample, saltoNasNuvensExample],
}
