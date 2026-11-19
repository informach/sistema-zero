import type { ExtensionManifest } from '#extensions'

export const world3DManifest: ExtensionManifest = {
  id: 'world-3d',
  name: 'Mundo 3D',
  version: '4.4.0',
  description:
    'Monte um mundo 3D aberto e passeie nele a pé, de carrinho ou de barco. São 7 cenários (floresta, praia, neve, deserto, primavera, lua e fazenda), com cidade, ilhas, amigos que conversam, missões, moedas, clima e brincadeiras de empurrar e correr. Vira jogo com pontos, vida, cronômetro, coletáveis e telas de início e fim, e aceita os modelos do Molda. Cada bloco faz um pedaço grande do mundo, sem internet.',
  category: 'games',
  official: true,
  enabledByDefault: false,
  // mouse: entra já na v0.1 pelo botão da telinha inicial (e o joystick mobile e
  // a câmera de cinema arrastável vêm nas próximas versões). Audio: o som do
  // motor e os sons do mundo (próximas versões). Storage: o recorde da corrida
  // (Kit Corrida), as conquistas e a mochila persistem por projeto no shim de localStorage.
  permissions: ['canvas', 'keyboard', 'mouse', 'audio', 'storage'],
  docs: `## Mundo 3D

Monte um mundo aberto e explore a pé, de carrinho ou de barco. Os blocos
preparam natureza, construções, moradores, desafios e regras de jogo.
O jogador é quem você controla agora; câmera, telas e controles já vêm no motor.

- **⚙️ Ao iniciar**: escolha a base, o céu, modelos, personagem e receitas uma vez.
- **⚡ Quando acontecer**: registre teclas, encontros e os acontecimentos do mundo.
- **🔁 Enquanto estiver rodando**: programe movimento e as regras contínuas.
- **🧩 Meus moldes** não é usada pelo Mundo 3D: as receitas vão em Ao iniciar.

Um cenário completo trazido do Molda conserva o terreno, recortes, caminhos,
água, objetos, início e ambiente. Use a receita de carregar cenário existente;
não acrescente um piso plano cobrindo os recortes nem outro controlador.
Os seus amigos, atividades, missões e regras continuam sendo programados nos
blocos do Mundo 3D.

O manual completo reúne as famílias e chips, APIs, modelos e animações do Molda,
câmeras, veículos, som, clima, modos de jogo, mochila e cuidados de desempenho.
Ele permanece disponível nos detalhes da extensão.
`,
}
