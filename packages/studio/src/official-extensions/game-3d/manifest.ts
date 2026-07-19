import type { ExtensionManifest } from '#extensions'
import {
  crossingExample,
  dodgeExample,
  nightExample,
  raceExample,
  rotatingCubeExample,
  shapesExample,
  stackExample,
  swarmExample,
} from './examples'

export const gameThreeDManifest: ExtensionManifest = {
  id: 'game-3d',
  name: 'Jogo 3D',
  version: '0.12.0',
  description:
    'Blocos e comandos para criar jogos 3D com Three.js: cena/câmera/luz (e cena em tela cheia responsiva), cubos/esferas/caixas, posição/rotação/escala, física (velocidade, gravidade, pulo, colisão), teclado, câmera que segue, genéricos de grade isométrica e de movimento (círculo, distância, cair girando, deslizar, girar) e Kits prontos: "Desvie", "Travessia", "Corrida" e "Empilhar". Three.js carrega de um CDN fixado.',
  category: 'games',
  official: true,
  enabledByDefault: false,
  // `network` continua fechado: o Three.js pinado entra pelo importmap/CSP e não
  // deve liberar `fetch` arbitrário no código do aluno.
  permissions: ['canvas', 'keyboard', 'mouse', 'audio'],
  docs: `## Jogo 3D (Three.js)

Adiciona \`window.SZGame3D\`, um wrapper didático sobre **Three.js**, para montar
cenas e **jogos** 3D sobre WebGL. O Three.js é carregado de um CDN **fixado**
(esm.sh) via importmap — a CSP do preview libera SÓ essa origem em \`script-src\`.

### Cena & objetos

- **Criar cena 3D** — cena + câmera + luz + renderizador num \`<canvas>\`.
- **Criar cena 3D em tela cheia** — atalho para começar rápido: cria o canvas ocupando a janela inteira (responsivo, redimensiona sozinho) + cena/câmera/luz, com uma **cor de fundo** (o que aparece atrás dos objetos da cena), sem precisar de \`<canvas>\` no HTML. Os blocos individuais continuam disponíveis para montar na mão.
- **Cor de fundo** / **Posicionar câmera**.
- **Criar cubo** / **Criar esfera** / **Criar caixa** (largura/altura/profundidade — ótima p/ o chão).
- **Posição** / **Rotação** (radianos) / **Tamanho (escala)** do objeto.
- **A cada frame 3D** — loop de animação (\`setAnimationLoop\`) que redesenha a cena.

### Formas, modelos & aparência

- Cilindro, cone, plano e anel completam as primitivas; os exemplos não dependem de assets externos.
- **Criar modelo** agrupa peças: cor, opacidade, material e visibilidade funcionam no grupo inteiro.
- Texturas são opcionais e usam um asset escolhido no projeto; remover um objeto também libera seus recursos de GPU.
- Luz ambiente, sol, luz pontual, neblina, céu em degradê e sombras montam a atmosfera.

### Física & controles (dentro de "A cada frame 3D")

- **Mover com o teclado (WASD/setas)** — anda no plano.
- **Definir velocidade** / **Fazer pular** (só no chão) / **Mover com gravidade (chão)**.
- **A câmera segue o objeto** — acompanha mantendo o enquadramento.
- Movimento relativo, olhar/mira e câmeras em primeira pessoa, terceira pessoa e orbital.
- **Corpo + sólido + atualizar corpo** — física AABB leve da própria plataforma, sem biblioteca externa pesada.

### Perguntas (booleanos — caem num "se")

- **a tecla … está apertada?**
- **o objeto … está encostando em … ?** (colisão AABB).
- **o objeto … encostou em algum de … ?** (contra um grupo).

### Kit "Desvie"

- **Criar grupo de objetos** — lista p/ guardar os inimigos.
- **Soltar inimigos** — cria/movimenta inimigos que vêm de longe acelerando (limpa os que passam).
- **Fim de jogo: parar a cena**.

### Enxames & som

- Crie um enxame, solte cópias de uma primitiva, percorra, conte e remova as que saíram da área.
- Toque notas e efeitos curtos depois da primeira interação do jogador.

### Câmera & grade 3D (genéricos — para jogos de grade/isométrico)

- **Câmera isométrica** (vista de cima em ângulo, opcionalmente seguindo um objeto).
- **Colocar na linha/coluna** / **Mover em grade com as setas** / **Dar um passo** (botões).
- **Mover objetos de um grupo (esteira, dando a volta)**.
- **encosta em algum de … (caixa real)?** — colisão que funciona com modelos compostos.

### Kit "Travessia" (atravessar a rua)

- **Criar mundo Travessia** + **Criar personagem** que pula de casa em casa.
- **Criar faixa** (grama/floresta/carros/caminhões) / **Gerar linhas aleatórias**.
- **Atualizar o personagem** (setas + grade) / **Mover os veículos**.
- **bateu num veículo?** / **pontuação (linha)** / **Recomeçar**.

### Kit "Corrida" (correr numa pista) + genéricos top-down

- **Câmera aérea** (de cima) e **Mover em círculo** (movimento circular genérico).
- **a distância entre … / está perto de … ?** — proximidade (p/ colisão de qualquer jogo).
- **Criar mundo de corrida** + **Criar a pista** (oval) + **Criar carro do jogador**.
- **Dirigir o carro** (↑ acelera / ↓ freia, dá voltas) / **Soltar e mover rivais** / **marcha** (botões).
- **bateu num rival?** / **voltas (pontuação)** / **Recomeçar**.

### Kit "Empilhar" (torre de blocos) + genéricos de movimento

- **fazer … cair girando** / **Mover … de um lado a outro** / **Girar …** — genéricos de queda, plataforma e rotação (física na mão, SEM lib).
- **Criar mundo de empilhar** + **montar a base da torre** — câmera isométrica que sobe com a torre.
- **Soltar o bloco** (ligue ao clique/à tecla) / **Atualizar a torre** (a cada frame).
- **pontuação (andares)** / **a torre caiu (fim de jogo)?** / **Recomeçar**.

### Observações

- Para começar rápido, use **Criar cena 3D em tela cheia** (cria o canvas sozinho). Para mais controle (HUD próprio, layout), crie o \`<canvas>\` no HTML primeiro e use **Criar cena 3D no canvas** (mesmo padrão do Jogo 2D).
- Crie cena, objetos, modelos, luzes e enxames UMA vez (fora do "A cada frame 3D"); dentro do loop só mova, anime, aplique física e teste colisões. O projeto é validado antes de executar para impedir criação acidental no loop.
- Eixos genéricos: x = direita, y = cima, z = profundidade; distância, círculo e grade usam o chão X-Z. Os kits Travessia/Corrida mantêm sua convenção interna sem mudar os blocos genéricos. Rotação em radianos.
- Movimento e física usam o tempo real do quadro, mantendo a velocidade em telas de 60/120/144 Hz.
- Há limites didáticos de segurança para objetos, luzes, enxames, linhas e andares; remova ou faça a poda de itens temporários.
- Todos os blocos desta categoria são **iniciante-3d**. A aula usa \`allowBlocks\` para revelar somente os necessários, sem retirar capacidade da extensão.
- Comece por **"Cubo girando"**; depois avance para **"Desvie dos blocos"**, **"Atravesse a rua"**, **"Corrida maluca"** e **"Torre maluca"**.
`,
  examples: [
    rotatingCubeExample,
    shapesExample,
    nightExample,
    swarmExample,
    dodgeExample,
    crossingExample,
    raceExample,
    stackExample,
  ],
}
