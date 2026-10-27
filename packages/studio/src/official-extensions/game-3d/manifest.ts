import type { ExtensionManifest } from '#extensions'

export const gameThreeDManifest: ExtensionManifest = {
  id: 'game-3d',
  name: 'Jogo 3D',
  version: '0.32.0',
  description:
    'Blocos para criar jogos 3D com Three.js: cena, céu e câmera (um bloco com seis modos), objetos e modelos do Molda, movimento em "por segundo" e em graus, teclado e mouse, encostar, grupos que multiplicam um molde, placar, vida e telas de início e fim, tempo, sorteio e som. No fim, Kits prontos: "Desvie", "Travessia", "Corrida", "Empilhar" e "Plataforma". Three.js carrega de um CDN fixado.',
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

A paleta tem dez famílias, na ordem em que um jogo é montado: 🎬 Cena, céu e câmera ·
🧊 Objetos · 🏃 Movimento · 🎮 Controles · 💥 Encostar · 📦 Grupos · 🏆 Placar, vida e telas ·
⏱️ Tempo e sorteio · 🔊 Som · 🧰 Kits prontos.

### Primeiros jogos, sem listas nem propriedades de objetos

- **Andar com … usando WASD/setas** (\`topDown\`) lê as teclas, move no chão e vira o personagem, dentro de **A cada quadro**. Não somar **Mover o grupo**: este comando já aplica o movimento.
- **Permitir … andar em x … e z …** (\`walkArea\`), em **Ao iniciar**, define uma área permitida. Várias áreas formam um caminho unido. O personagem não salta intervalos entre áreas. Sem áreas, o movimento é livre.
- **Animações de …: parado …, andando …** (\`walkAnimations\`) prepara os clipes que esse movimento usa, em **Ao iniciar**.
- **Quando … encostar em …** (\`onTouch\`) escolhe diretamente dois elementos da cena. Dispara uma vez por entrada no contato, sem grupo ou nome de item.
- **Enquadrar a cena** (\`frameScene\`) mantém uma área centrada em x/z zero, acima do chão, visível ao redimensionar a prévia. Largura, altura e profundidade descrevem a área de jogo, sem incluir o céu.

**Mover … com o teclado** (\`controlWithKeys\`) conserva o comportamento anterior: define velocidade para física/grupos aplicarem depois. Os comandos novos não alteram projetos existentes. Objetos da categoria visual são os elementos 3D; estruturas de dados de Programação continuam nos níveis posteriores.

### Unidades

- **Velocidades são por segundo**: andar 3, pulo 5, gravidade 36 (o normal de um corpo físico).
- **Ângulos são em graus**: 90 é um quarto de volta; o giro contínuo é em graus por segundo (120 é um terço de volta por segundo).
- **Mover de uma vez** e **Girar de uma vez** agem uma vez só, a partir de onde o objeto está. Para andar sem parar, use a velocidade; para girar sem parar, use **Girar … sem parar**.

### Áreas do projeto

- Em **🧩 Meus moldes**, deixe o que só define uma receita e não faz nada sozinho (funções, por exemplo).
- Em **⚙️ Ao iniciar**, crie a cena, objetos, modelos, luzes e grupos uma vez.
- Em **⚡ Quando acontecer**, coloque chapéus de tecla e clique.
- Em **🔁 Enquanto estiver rodando**, coloque **A cada quadro da cena** e **A cada N
  segundos** (lado a lado, nunca um dentro do outro). Dentro do quadro, mova, anime,
  aplique física e teste se encostou.
- Notas e efeitos sonoros respondem a clique/tecla ou a condições do quadro, mas não
  começam diretamente em **Ao iniciar**.

Comandos que representam um passo contínuo cabem no corpo desses laços ou em
funções/métodos chamados por eles. Eles não entram diretamente em **Ao iniciar**,
em um evento ou em um construtor.

### 🎬 Cena, céu e câmera

- **Criar cena 3D em tela cheia**: cria o canvas ocupando a janela inteira (responsivo) + cena, câmera e luz, com uma cor de fundo. **Criar cena 3D no canvas** usa um \`<canvas>\` do HTML.
- **A cada quadro da cena**: o laço que redesenha a cena. Vários na mesma cena rodam juntos, em ordem; se um corpo falhar, só ele pausa.
- **Usar o céu 360°** troca o fundo por um céu de foto (\`.hdr\` do Molda ou enviado) que também ilumina e dá reflexo. Céu degradê, cor de fundo, luz ambiente, sol, luz pontual, neblina e sombras montam a atmosfera.
- **Câmera da cena: ⟨modo⟩ ⟨objeto⟩** é a câmera inteira num bloco: **segue de trás**, **segue de longe** (guarda o enquadramento da hora em que ligou), **vê de cima**, **isométrica**, **1ª pessoa** (olhos do objeto; mire com o mouse, o clique trava o ponteiro) e **gira em volta** (arraste; a roda dá zoom). É um MODO: escolha uma vez, em **Ao iniciar** ou num evento, e o jogo atualiza a câmera a cada quadro. De cima, isométrica e em volta podem ficar sem objeto (olham o centro). O último modo escolhido vale.
- **Distância da câmera** ajusta quão longe e quão alto fica a câmera que segue (e a distância da que gira em volta). **Posicionar a câmera**, **olhar para** e **Lente** completam.

### 🧊 Objetos

- **Criar o cubo**, **Criar a esfera** e **Criar a caixa** (medidas livres, boa para chão e paredes). Cilindro, cone, plano e anel completam as formas.
- **Criar o objeto … com o modelo** põe na cena um modelo 3D de verdade (\`.glb\` montado no **Molda** e trazido em "Modelos 3D", ou enviado). Ele nasce como um cubo e ganha a forma do arquivo assim que carrega; o tamanho é o lado maior, em blocos (até 200), com o centro no lugar do cubo (posição, gravidade e encostar valem igual). Um cenário inteiro, maior que 64, não mostra o cubo enquanto carrega.
- **🎬 Animação do modelo**: modelos do Molda com **animação** (ossos) e com **pintura que se mexe** funcionam no Jogo 3D. **Tocar a animação ⟨nome⟩ em ⟨objeto⟩ repetindo/uma vez** usa o nome do clipe criado no Molda (um nome que não existe avisa quais existem); dentro do **A cada quadro**, pedir a mesma animação de novo só a deixa continuar, e trocar o nome troca suavemente. **Parar a animação** e **⟨objeto⟩ terminou a animação?** (depois de "uma vez") completam. Cada cópia de grupo anima no seu tempo; a pintura animada anda sozinha, para na tela de pausa e volta ao começo no **Recomeçar**.
- **Montar um modelo**: junte peças da mesma cena; mover o modelo move tudo.
- **Aparência**: pintar, quanto aparece (opacidade), imagem (**repetindo N vezes** deixa o desenho lado a lado, bom para chão e parede), material, **estampa** (tijolo, pedra, grama, água, lava, moeda, xadrez… desenhadas na hora, sem arquivo), sem sombra e mostrar/esconder.
- **Posição, giro e tamanho**: o giro é em graus. Os valores **posição**, **giro** e **tamanho** leem o objeto.
- **Dados do objeto**: **guardar … em … do objeto** e **… do objeto** guardam e leem um número com nome no próprio objeto (a direção que ele anda, quantas vidas tem).
- **Remover** tira o objeto da cena de vez e libera a memória.

### 🏃 Movimento

- **Andar com o teclado**: **Mover com o teclado** (por segundo), **Fazer pular** (só no chão) e **Mover com gravidade (chão)**, dentro de **A cada quadro**.
- **Movimentos prontos**: **Girar … sem parar** (graus por segundo), ir e voltar num eixo, andar em círculo e **cair girando**.
- **Velocidade**: **Velocidade do objeto** (por segundo) e as leituras de velocidade.
- **De uma vez**: **Mover de uma vez**, **Girar … graus**, **Aproximar … (rapidez)** (chega freando; 5 é suave) e **Andar para a frente** (por segundo, na direção que olha; com a câmera em 1ª pessoa, para onde o jogador olha).
- **Olhar e apontar**: virar para um objeto ou ponto, virar para onde anda, o ângulo (graus) e a distância entre dois objetos.
- **Andar em grade**: colocar na linha/coluna, andar em grade com as setas e dar um passo (botões).
- **1ª pessoa**: o controle que anda na direção que o jogador olha (combine com a câmera em 1ª pessoa).

### 🎮 Controles

- **Quando apertar a tecla …** (uma vez por aperto; segurar não repete) e **Quando clicar ou tocar em …** ficam em **⚡ Quando acontecer**.
- **a tecla … está apertada?** e **a tecla … foi apertada agora?** (só no quadro do toque).
- **objeto sob o mouse**, **o mouse está sobre o objeto?** e **objeto que … está mirando** (com a câmera em 1ª pessoa, mira o que o jogador vê, inclusive para cima e para baixo). Guarde o resultado numa variável para usá-lo nos outros blocos.

### 💥 Encostar

- **Quando … encostar em algum do grupo …, chamando de …**: roda uma vez na ENTRADA do contato (quem continua encostado não repete) e dá um nome a quem foi encostado (ex.: tirar a estrela do grupo).
- **o objeto … está encostando em …?** e **… está encostando em algum do grupo …?** (mede a caixa real de cada objeto: vale para modelos e peças giradas) e **está perto de … (menos de …)?**.
- **Física de plataforma**: **Dar corpo físico** (gravidade positiva puxa para baixo; 36 é o normal), sólido, **mover com física**, empurrar para fora, **Para cada batida de … com …** (pés, cabeça, lados, frente, costas) e **a batida foi contra …?**, plataformas que carregam ou que se atravessam por baixo, chão sob o objeto, e os controles prontos de plataforma (andar e pular) e de **plataforma clássica** (só para os lados, com peso: acelera, derrapa, corre no dobro com Shift e pula mais alto segurando o botão).

### 📦 Grupos

- **Criar grupo de objetos**: um grupo vazio para os inimigos, as moedas, as cópias de um molde.
- **Criar uma cópia de ⟨molde⟩ no grupo**: copia um objeto (esconda o molde para ele servir só de modelo) e põe a cópia no grupo. A cópia de um modelo do Molda ganha os próprios ossos. As cópias compartilham a forma do molde com segurança; remover o molde não estraga as cópias que seguem na cena.
- **Mover o grupo** (sem gravidade) e **Atualizar o grupo com gravidade (chão)**.
- **Tirar do grupo quem saiu da tela** e **No grupo, tirar quem saiu de … a …** deixam o jogo leve.
- **Para cada objeto do grupo**, **quantos objetos tem no grupo**, **Tirar o objeto do grupo**, **Esvaziar o grupo** e a esteira que dá a volta.

### 🏆 Placar, vida e telas

- **Escrever no canto … da tela**: um texto por canto ou no centro (↖ ↑ ↗ ↙ ↓ ↘ ⊕), por cima do jogo; no **A cada quadro** ele se atualiza. Os pontos, os corações e a contagem aparecem sozinhos, empilhados nos cantos.
- **Somar … aos pontos** e **os pontos** (aparecem no canto ↗).
- **Dar … de vida a …**, **Machucar**, **Curar**, **a vida de …** e **Quando a vida de … acabar**. O primeiro a ganhar vida é o herói: os corações dele ficam no canto ↖. Machucado, ele pisca e fica 1 segundo sem se machucar.
- **Na tela de início/fim/vitória: título, texto, botão** (só em **Ao iniciar**): com a tela de início, o jogo espera o botão.
- **Fim de jogo: você perdeu/você ganhou** para os laços e mostra a tela, com **Jogar de novo**; **Recomeçar o jogo** zera tudo e roda o **Ao iniciar** outra vez. Os dois só cabem durante um quadro, evento ou função da partida.

### ⏱️ Tempo e sorteio

- **A cada N segundos**: raiz própria em 🔁, ao lado do **A cada quadro**. É o jeito de soltar inimigos sem encher a tela.
- **o tempo deste quadro (em segundos)**: para contas manuais (velocidade por segundo × tempo do quadro).
- **Depois de N segundos**: roda UMA vez; mora em 🔁 ou dentro de um "Quando…" (nunca no "A cada quadro").
- **Começar a contagem de … segundos** (aparece em cima, no meio), **o tempo que falta**, **Parar a contagem** e **Quando a contagem acabar**.
- **um número de … a …** (sorteio inteiro, como um dado) e **tem chance de … %?**.

### 🔊 Som

- **Tocar o som pronto** (moeda, pulo, explosão, acerto) e **Tocar nota** são inventados na hora, sem arquivo. **Tocar o som** e **Tocar a música** tocam um arquivo enviado em "Sons", no menu ⋯: primeiro **carregue** em **Ao iniciar** com um apelido.
- Só toca uma música por vez; **o volume vai de 0 a 10** e vale para todos os sons. Um som pedido antes do primeiro clique espera o clique e toca em seguida.

### 🧰 Kits prontos

- **Criar mundo em tela cheia**: escolha Travessia, Corrida, Empilhar ou Plataforma. O motor cria a tela responsiva, a câmera e as luzes do kit. Não precisa de blocos HTML/CSS.
- Os exemplos usam o HUD, o placar, os eventos de teclado/clique e as telas de fim do próprio Jogo 3D. **Jogar de novo** inicia uma partida limpa.

#### Kit "Desvie"

- **Soltar 1 inimigo** (por segundo) cria um cubo vermelho que vem de longe. Ponha dentro de **A cada N segundos**; mova com **Atualizar o grupo** e limpe com **Tirar quem saiu da tela**.

#### Kit "Travessia" (atravessar a rua)

- **Criar mundo Travessia** + **Criar personagem** que pula de casa em casa.
- **Criar faixa** (grama/floresta/carros/caminhões) / **Gerar linhas aleatórias**.
- **Atualizar o personagem** / **Mover os veículos** / **bateu num veículo?** / **pontuação** / **Recomeçar**. Depois da batida, tudo fica congelado até recomeçar.

#### Kit "Corrida"

- **Criar mundo de corrida** + **Criar a pista** + **Criar carro do jogador**.
- **Dirigir o carro** (↑ acelera / ↓ freia) / **Soltar e mover rivais** / **marcha** (botões) / **bateu num rival?** / **voltas** / **Recomeçar**.

#### Kit "Empilhar"

- **Criar mundo de empilhar** + **montar a base da torre**; **Atualizar a torre** a cada quadro.
- **Soltar o bloco** num evento de clique/tecla ou numa função (nunca solto em **Ao iniciar** nem no laço da torre) / **pontuação** / **a torre caiu?** / **Recomeçar**.

### Kit "Plataforma" (fase lateral completa)

- **Criar cena de plataforma** e **Criar o herói** preparam o corredor 2,5D, as luzes, a câmera lateral, o corpo e a colisão. Use **Criar mundo Plataforma em tela cheia** para uma tela do motor. O construtor no canvas continua disponível para projetos que já têm uma página HTML.
- **Montar a fase** recebe um mapa de texto. Separe assuntos por ponto e vírgula ou linha: \`chao=0-20\`, \`tijolo=6:4\`, \`surpresa=8:4:cogumelo\`, \`inimigo=12:goomba\`, \`checkpoint=15\`, \`tempo=300\` e \`tema=noite\`.
- **Usar o cenário** troca céu, neblina e cores do chão. Um tema escrito no mapa tem prioridade.
- Dentro de **A cada quadro**, combine **plataforma clássica**, **Atualizar a fase** e **Câmera de lado**. **Soltar bola de fogo** funciona depois de pegar a flor e deve responder a **tecla apertada agora**.
- **Quando na fase acontecer …** avisa moeda, poderes, tijolo, inimigos, dano, bandeira, chefe e fim do tempo. Perguntas expõem pontos, moedas, vidas, tempo, mundo/fase e os estados do herói e da partida.
- **Recomeçar a fase** restaura inimigos, moedas e blocos e usa o checkpoint alcançado; **Limpar a fase** remove suas peças.

### Observações

- O runtime torna o canvas focalizável e adiciona nome, instruções para tecnologias assistivas e contorno de foco.
- Eixos: x = direita, y = cima, z = profundidade; distância, círculo e grade usam o chão X-Z. Os kits Travessia/Corrida mantêm sua convenção interna.
- Movimento e física usam o tempo real do quadro: a mesma velocidade em telas de 60, 120 ou 144 Hz.
- Os seletores separam o mundo do Jogo 3D de uma cena Three.js crua do Canvas 3D e só oferecem o que já foi criado naquele ponto. Objetos, modelos e grupos não misturam cenas diferentes; o runtime ignora a operação e avisa.
- Há limites de segurança para objetos, cópias, luzes, linhas e andares; tire do grupo o que sair da área. Ao reiniciar o preview, o runtime encerra WebGL, listeners e áudio.
- O núcleo desta categoria (criar a cena e os objetos, a câmera, mover, encostar, grupos, tempo e som) é **iniciante-3d**; os demais blocos são **intermediario-3d**. A lista \`allowBlocks\` revela somente os necessários.
- Os exemplos vêm em ordem de progressão. Comece pelas demos **"Cubo girando"**, **"Boneco de formas"** e **"Noite enevoada"**; o primeiro jogo completo é **"Pega-Estrelas"** (só com os blocos do núcleo: início, pontos, 30 segundos, fim e jogar de novo). Depois vêm **"Desvie dos blocos"** (corações), **"Enxame que gira"** (grupo de cópias) e **"Corrida Infinita 3D"**. Os jogos maiores começam em **"Labirinto dos Robôs"**, **"Mundo de Blocos"** e **"Patrulha Espacial"**; **"Meu herói do Molda"** mostra um personagem do Molda animado; **"Defesa da Torre"**, **"Reunir o Rebanho"**, **"A Lenda do Herói"**, **"Caça Estelar"**, **"Cerco na Base"** e **"Mina de Cristais"** aprofundam gêneros completos. Por último, os kits prontos: **"Atravesse a Rua"**, **"Corrida Maluca"**, **"Torre maluca"** e **"Reino Cogumelo"** (o Kit Plataforma numa campanha de 32 fases).
`,
}
