import type { ExtensionManifest } from '#extensions'
import { defesaDaTorreExample } from './examples'

export const gameKit3DManifest: ExtensionManifest = {
  id: 'game-3d-advanced',
  name: 'Jogo 3D Avançado',
  version: '0.1.0',
  description:
    'A base de um jogo 3D profissional, portada de um curso de engine de verdade. Entidades com máquina de estados própria (cada torre e cada invasor tem o próprio cérebro: parado → mirar → atirar → recarregar), moldes montados de peças 3D, enxames com pool, fábricas de inimigos, busca de vizinhos rápida (grade espacial), mira suave, combate com invencibilidade, telas, estados, HUD e som. O motor faz o que nunca muda; as regras são suas, nos ganchos.',
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

### Faíscas 3D e efeitos de cinema

- **Faíscas** são o sistema de partículas dos jogos de verdade, feito só de
  DADOS: "Criar o efeito 3D" define a receita (quantas, cor do começo → cor do
  fim, espalhamento, tamanho, vida, gravidade) e "Soltar o efeito" estoura
  quantas explosões quiser — o motor reaproveita tudo (nunca pesa).
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
  examples: [defesaDaTorreExample],
}
