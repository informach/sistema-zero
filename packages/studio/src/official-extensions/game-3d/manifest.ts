import type { ExtensionManifest } from '#extensions'
import { rotatingCubeExample } from './examples'

export const gameThreeDManifest: ExtensionManifest = {
  id: 'game-3d',
  name: 'Jogo 3D',
  version: '0.1.0',
  description:
    'Blocos e comandos para criar cenas 3D com Three.js: cena/câmera/luz, cubos e esferas, posição/rotação e loop de animação. Three.js carrega de um CDN fixado.',
  category: 'games',
  official: true,
  enabledByDefault: false,
  // Só canvas/WebGL. NÃO declara 'network' de propósito: o Three.js é carregado
  // via importmap (script-src da CSP), não por fetch — e declarar 'network'
  // liberaria o fetch do aluno (o permissionGuard trata 'network' como rede livre).
  permissions: ['canvas'],
  docs: `## Jogo 3D (Three.js)

Adiciona \`window.SZGame3D\`, um wrapper didático sobre **Three.js**, para montar
cenas 3D sobre WebGL. O Three.js é carregado de um CDN **fixado** (esm.sh) via
importmap — a CSP do preview libera SÓ essa origem em \`script-src\`.

### Blocos

- **Criar cena 3D** — cena + câmera + luz + renderizador num \`<canvas>\`.
- **Cor de fundo** / **Posicionar câmera**.
- **Criar cubo** / **Criar esfera** — malhas com cor.
- **Posição** / **Rotação** do objeto (x/y/z; rotação em radianos).
- **A cada frame 3D** — loop de animação (\`setAnimationLoop\`) que redesenha a cena.

### Observações

- Crie o \`<canvas>\` no HTML primeiro (mesmo padrão do Jogo 2D).
- Para girar um objeto, anime dentro de "A cada frame 3D" usando uma variável
  que aumenta a cada quadro.
- É um nível **avançado**: aparece na paleta a partir do nível avançado.
`,
  examples: [rotatingCubeExample],
}
