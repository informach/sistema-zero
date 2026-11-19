import type { ExtensionManifest } from '#extensions'

export const gameKit3DManifest: ExtensionManifest = {
  id: 'game-3d-advanced',
  name: 'Jogo 3D Avançado',
  version: '0.24.0',
  description:
    'O motor dos jogos 3D grandes. Cada objeto tem o próprio estado (parado, mirar, atacar), os moldes viram exércitos que nascem e somem sem pesar, e a física tem bola que quica, rampa e plataforma. Tem modelos animados do Molda, câmera que segue ou em 1ª pessoa, faíscas, placar, vida e som. O Jogo 3D começa de uma cena vazia e o Mundo 3D traz um mundo pronto para passear; aqui você programa as regras de um jogo inteiro.',
  category: 'games',
  official: true,
  enabledByDefault: false,
  // mouse: botões das telas + câmera de órbita arrastável. Audio: sons/efeitos.
  // storage: "Guardar … neste computador" (recorde, fase destravada).
  permissions: ['canvas', 'keyboard', 'mouse', 'audio', 'storage'],
  docs: `## Jogo 3D Avançado

Crie jogos com moldes, objetos que nascem e saem, estados, animações e física.
O motor mantém a tela, a câmera, a pausa e o recomeço; as regras são suas.

- **🧩 Meus moldes**: defina cada tipo de objeto e suas peças.
- **⚙️ Ao iniciar**: prepare o mundo, o cenário do Molda e as receitas uma vez.
- **⚡ Quando acontecer**: monte a partida ao entrar em jogando e registre eventos.
- **🔁 Enquanto estiver rodando**: programe controles, estados e regras por quadro.

Use **Usar o cenário** para trazer terreno, caminhos, água, ambiente e colisores
juntos. **Começar no início do cenário** posiciona o objeto ativo no início salvo.
Os recortes ficam vazios; não acrescente outro piso. Os seus moldes e controles
continuam responsáveis pelo jogo. A água visual não acrescenta nado.

Abra o manual completo para consultar famílias, chips, assinaturas, exemplos,
animações do Molda, plataformas, limites e cuidados de desempenho.
`,
}
