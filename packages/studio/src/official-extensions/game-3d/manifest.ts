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
  version: '0.10.0',
  description:
    'Blocos e comandos para criar jogos 3D com Three.js: cena/câmera/luz (e cena em tela cheia responsiva), cubos/esferas/caixas, posição/rotação/escala, física (velocidade, gravidade, pulo, colisão), teclado, câmera que segue, genéricos de grade isométrica e de movimento (círculo, distância, cair girando, deslizar, girar) e Kits prontos: "Desvie", "Travessia", "Corrida" e "Empilhar". Three.js carrega de um CDN fixado.',
  category: 'games',
  official: true,
  enabledByDefault: false,
  // Só canvas/WebGL. NÃO declara 'network' de propósito: o Three.js é carregado
  // via importmap (script-src da CSP), não por fetch — e declarar 'network'
  // liberaria o fetch do aluno (o permissionGuard trata 'network' como rede livre).
  permissions: ['canvas'],
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

### Física & controles (dentro de "A cada frame 3D")

- **Mover com o teclado (WASD/setas)** — anda no plano.
- **Definir velocidade** / **Fazer pular** (só no chão) / **Mover com gravidade (chão)**.
- **A câmera segue o objeto** — acompanha mantendo o enquadramento.

### Perguntas (booleanos — caem num "se")

- **a tecla … está apertada?**
- **o objeto … está encostando em … ?** (colisão AABB).
- **o objeto … encostou em algum de … ?** (contra um grupo).

### Kit "Desvie"

- **Criar grupo de objetos** — lista p/ guardar os inimigos.
- **Soltar inimigos** — cria/movimenta inimigos que vêm de longe acelerando (limpa os que passam).
- **Fim de jogo: parar a cena**.

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
- Crie os objetos UMA vez (fora do "A cada frame 3D"); dentro do loop só mova/anime.
- Eixos: x = direita, y = cima, z = em direção à câmera. Rotação em radianos.
- É um nível **avançado**: aparece na paleta a partir do nível avançado.
- Comece pelos exemplos **"Torre maluca"**, **"Corrida maluca"**, **"Atravesse a rua"** ou **"Desvie dos blocos"**.
`,
  examples: [
    shapesExample,
    nightExample,
    swarmExample,
    stackExample,
    raceExample,
    crossingExample,
    dodgeExample,
    rotatingCubeExample,
  ],
}
