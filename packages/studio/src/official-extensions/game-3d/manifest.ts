import type { ExtensionManifest } from '#extensions'
import {
  aLendaDoHeroiBasicoExample,
  cacaEstelarBasicoExample,
  cercoNaBaseBasicoExample,
  corridaInfinitaExample,
  crossingExample,
  defesaDaTorreBasicoExample,
  dodgeExample,
  labirintoRobosExample,
  mundoBlocosExample,
  nightExample,
  patrulhaEspacialExample,
  raceExample,
  reunirRebanhoBasicoExample,
  rotatingCubeExample,
  shapesExample,
  stackExample,
  swarmExample,
} from './examples'

export const gameThreeDManifest: ExtensionManifest = {
  id: 'game-3d',
  name: 'Jogo 3D',
  version: '0.26.0',
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
(esm.sh) via importmap. A CSP do preview libera SÓ essa origem em \`script-src\`.

### Áreas do projeto

- Em **⚙️ Ao iniciar**, crie a cena, objetos, modelos, luzes e enxames uma vez.
- Em **⚡ Quando acontecer**, coloque chapéus de tecla e clique.
- Em **🔁 Enquanto estiver rodando**, coloque **A cada quadro 3D** e
  atualizações periódicas. Dentro do quadro, mova, anime, aplique física, teste
  colisões e crie somente itens temporários que tenham poda ou remoção definida.
- Notas e efeitos sonoros podem responder diretamente a clique/tecla ou a
  condições do quadro, mas não são iniciados diretamente em **Ao iniciar**.

Comandos que representam um passo contínuo cabem no corpo desses loops ou em
funções/métodos chamados por eles. Eles não entram diretamente em **Ao iniciar**,
em um evento ou em um construtor.

### Cena & objetos

- **Criar cena 3D**. Cena + câmera + luz + renderizador num \`<canvas>\`.
- **Criar cena 3D em tela cheia**. Atalho para começar rápido: cria o canvas ocupando a janela inteira (responsivo, redimensiona sozinho) + cena/câmera/luz, com uma **cor de fundo** (o que aparece atrás dos objetos da cena), sem precisar de \`<canvas>\` no HTML. Os blocos individuais continuam disponíveis para montar na mão.
- **Cor de fundo** / **Posicionar câmera**.
- **Criar cubo** / **Criar esfera** / **Criar caixa** (largura/altura/profundidade. Ótima p/ o chão).
- **Posição** / **Rotação** (radianos) / **Tamanho (escala)** do objeto.
- **A cada quadro 3D**. Laço de animação que redesenha a cena. Se o projeto usar
  mais de um bloco de quadro na mesma cena, os corpos rodam juntos na ordem em
  que foram registrados e a cena é desenhada uma vez. Se um corpo falhar, apenas
  ele é pausado; os outros continuam e a cena permanece responsiva.

### Formas, modelos & aparência

- Cilindro, cone, plano e anel completam as primitivas; os exemplos não dependem de assets externos.
- **Criar modelo** agrupa peças da mesma cena: cor, opacidade, material e visibilidade funcionam no grupo inteiro.
- Texturas são opcionais e usam um asset escolhido no projeto; remover um objeto também libera seus recursos de GPU.
- Remover um modelo desregistra também suas peças. Objetos que terminam uma queda deixam de ocupar o limite da cena e chamadas posteriores não descartam os mesmos recursos de novo.
- Luz ambiente, sol, luz pontual, neblina, céu em degradê e sombras montam a atmosfera.

### Física & controles (dentro de "A cada quadro 3D")

- **Mover com o teclado (WASD/setas)**. Anda no plano.
- **Definir velocidade** / **Fazer pular** (só no chão) / **Mover com gravidade (chão)**.
- **A câmera segue o objeto**. Acompanha mantendo o enquadramento.
- Movimento relativo, olhar/mira e câmeras em primeira pessoa, terceira pessoa e orbital. Com a câmera em primeira pessoa no objeto, **andar para frente** segue para onde o jogador olha (no plano do chão) e **objeto que está mirando** mira o que o jogador vê, inclusive olhando para cima ou para baixo. O último modo de câmera escolhido substitui o anterior sem manter a câmera presa ao objeto do modo FPS. Entrar em primeira pessoa sempre ativa uma câmera em perspectiva, mesmo depois de uma câmera isométrica ou aérea.
- **Corpo + sólido + atualizar corpo**. Física AABB leve da própria plataforma, sem biblioteca externa pesada.

### Perguntas (booleanos. Caem num "se")

- **a tecla … está apertada?**
- **o objeto … está encostando em … ?** (colisão AABB).
- **o objeto … encostou em algum de … ?** (contra um grupo).

### ⏱️ Tempo e repetição (genéricos. Dentro de "A cada quadro 3D")

- **A cada N quadros** / **A cada N segundos**. Rodam o "fazer" de tempos em tempos. É o jeito de soltar inimigos sem encher a tela (sem avalanche).

### 📦 Grupos (genéricos. Uma lista de objetos; a criança monta a lógica)

- **Criar grupo de objetos**. Lista vazia p/ guardar vários objetos (ex.: os inimigos).
- **Atualizar (mover) o grupo com gravidade** / **Mover o grupo sem gravidade**. Movem cada objeto do grupo pela sua velocidade.
- **Tirar do grupo quem saiu da tela**. Some com quem saiu e roda um "fazer" p/ cada um (higiene de GPU).
- **Para cada objeto do grupo** / **quantos objetos tem no grupo**.
- **Tirar o objeto do grupo** / **Esvaziar o grupo**. Tiram da lista e somem da cena.

### Kit "Desvie" (a mecânica difícil pronta)

- **Soltar 1 inimigo**. Cria 1 inimigo (cubo vermelho) que vem de longe na velocidade escolhida. Ponha dentro de **A cada N quadros** p/ soltar de tempos em tempos; mova com **Atualizar o grupo** e limpe com **Tirar quem saiu da tela**.
- **Fim de jogo: parar a cena**. Use durante um quadro, evento ou função que roda durante a partida. O bloco não pode ficar solto em **Ao iniciar**.

### Enxames & som

- **Grupo de objetos** e **enxame** são recursos diferentes e aparecem em seletores separados. O grupo (📦 Grupos) guarda vários objetos que você mesmo cria; o enxame administra cópias de um molde ligadas a uma cena.
- O enxame compartilha a geometria do molde com segurança. Remover o molde não invalida cópias que ainda estão na cena; o recurso é liberado depois da última cópia.
- Cópias visíveis do enxame participam de **objeto sob o mouse**, **mouse sobre o objeto** e das consultas de mira.
- Toque notas e efeitos curtos depois da primeira interação do jogador. O runtime limita a 32 sons simultâneos e descarta as conexões no reinício.

### Câmera & grade 3D (genéricos. Para jogos de grade/isométrico)

- **Câmera isométrica** (vista de cima em ângulo, opcionalmente seguindo um objeto).
- Câmeras isométrica e aérea são configurações de montagem. Chamadas repetidas reutilizam a câmera, e o enquadramento acompanha o tamanho do canvas.
- **Colocar na linha/coluna** / **Mover em grade com as setas** / **Dar um passo** (botões).
- **Mover objetos de um grupo (esteira, dando a volta)**.
- **está encostando em algum de … (caixa real)?**. Colisão que funciona com modelos compostos.

### Kit "Travessia" (atravessar a rua)

- **Criar mundo Travessia** + **Criar personagem** que pula de casa em casa e pode ser consultado pelos blocos de ponteiro.
- **Criar faixa** (grama/floresta/carros/caminhões) / **Gerar linhas aleatórias**.
- **Atualizar o personagem** (setas + grade) / **Mover os veículos**.
- **bateu num veículo?** / **pontuação (linha)** / **Recomeçar**. Depois da batida, personagem e trânsito ficam congelados até recomeçar.

### Kit "Corrida" (correr numa pista) + genéricos top-down

- **Câmera aérea** (de cima) e **Mover em círculo** (movimento circular genérico).
- **a distância entre … / está perto de … ?**. Proximidade (p/ colisão de qualquer jogo).
- **Criar mundo de corrida** + **Criar a pista** (oval) + **Criar carro do jogador**, também disponível para consultas de ponteiro.
- **Dirigir o carro** (↑ acelera / ↓ freia, dá voltas) / **Soltar e mover rivais** / **marcha** (botões).
- **bateu num rival?** / **voltas (pontuação)** / **Recomeçar**. Depois da batida, carro e rivais ficam congelados até recomeçar.

### Kit "Empilhar" (torre de blocos) + genéricos de movimento

- **fazer … cair girando** / **Mover … de um lado a outro** / **Girar …**. Genéricos de queda, plataforma e rotação (física na mão, SEM lib).
- **Criar mundo de empilhar** + **montar a base da torre**. Câmera isométrica que sobe com a torre.
- **Soltar o bloco**. Use dentro de um evento de clique/tecla ou de uma função. Ele não fica solto em **Ao iniciar** nem dentro do loop da torre. / **Atualizar a torre** (a cada quadro).
- **pontuação (andares)** / **a torre caiu (fim de jogo)?** / **Recomeçar**.

### Observações

- Para começar rápido, use **Criar cena 3D em tela cheia** (cria o canvas sozinho). Para mais controle (HUD próprio, layout), crie o \`<canvas>\` no HTML primeiro e use **Criar cena 3D no canvas** (mesmo padrão do Jogo 2D).
- O runtime torna o canvas focalizável e adiciona nome, instruções para tecnologias assistivas e contorno de foco.
- Crie cena, objetos, modelos, luzes e enxames UMA vez em **⚙️ Ao iniciar**; dentro
  de **A cada quadro 3D** ou de uma função/método chamado pelo loop, mova,
  anime, aplique física e teste colisões. Cópias temporárias de enxame podem ser
  criadas ali quando também forem removidas ou podadas. O
  projeto é validado antes de executar para impedir construções persistentes no loop.
- Eixos genéricos: x = direita, y = cima, z = profundidade; distância, círculo e grade usam o chão X-Z. Os kits Travessia/Corrida mantêm sua convenção interna sem mudar os blocos genéricos. Rotação em radianos.
- Movimento e física usam o tempo real do quadro, mantendo a velocidade em telas de 60/120/144 Hz.
- Os seletores separam o mundo completo do Jogo 3D de uma cena Three.js crua do Canvas 3D e só oferecem recursos já declarados naquele ponto. Transformações genéricas aceitam objetos das duas camadas; comandos que usam um mundo do jogo oferecem somente objetos ligados ao Jogo 3D. Resultados de **objeto sob o mouse** e **objeto que está mirando** guardados numa variável também aparecem nesses seletores. Objetos, modelos, grupos e enxames não podem misturar cenas diferentes; o runtime ignora a operação incompatível e mostra um aviso.
- Há limites didáticos de segurança para objetos, luzes, enxames, linhas e andares; remova ou faça a poda de itens temporários. Ao reiniciar o preview, o runtime também encerra WebGL, listeners e áudio.
- Todos os blocos desta categoria são **iniciante-3d**. A aula usa \`allowBlocks\` para revelar somente os necessários, sem retirar capacidade da extensão.
- Comece por **"Cubo girando"**; depois avance para **"Desvie dos blocos"**, **"Atravesse a Rua"**, **"Corrida Maluca"** e **"Torre maluca"**. Os exemplos **"Labirinto dos Robôs"** (primeira pessoa com mira) e **"Mundo de Blocos"** (construtor em grade isométrica) mostram a física de corpo/sólidos e a grade com o mouse livre. **"Patrulha Espacial"** (nave vista de trás atirando em meteoros) mostra modelo composto, enxames de dois tamanhos e placar por tempo. **"Defesa da Torre"** (uma torre no centro que zapeia sozinha os invasores que vêm da beirada) mostra enxame, proximidade e placar num jogo de defender. **"Reunir o Rebanho"** (guie os bichinhos que vagam até o curral) mostra dois enxames, estado por-entidade (vagar e seguir) e um relógio num jogo de pastoreio.
`,
  examples: [
    rotatingCubeExample,
    shapesExample,
    nightExample,
    swarmExample,
    dodgeExample,
    corridaInfinitaExample,
    labirintoRobosExample,
    mundoBlocosExample,
    patrulhaEspacialExample,
    crossingExample,
    raceExample,
    defesaDaTorreBasicoExample,
    reunirRebanhoBasicoExample,
    aLendaDoHeroiBasicoExample,
    cacaEstelarBasicoExample,
    cercoNaBaseBasicoExample,
    stackExample,
  ],
}
