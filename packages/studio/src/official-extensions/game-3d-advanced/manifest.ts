import type { ExtensionManifest } from '#extensions'

export const gameKit3DManifest: ExtensionManifest = {
  id: 'game-3d-advanced',
  name: 'Jogo 3D Avançado',
  version: '0.23.0',
  description:
    'O motor dos jogos 3D grandes. Cada objeto tem o próprio estado (parado, mirar, atacar), os moldes viram exércitos que nascem e somem sem pesar, e a física tem bola que quica, rampa e plataforma. Tem modelos animados do Molda, câmera que segue ou em 1ª pessoa, faíscas, placar, vida e som. O Jogo 3D começa de uma cena vazia e o Mundo 3D traz um mundo pronto para passear; aqui você programa as regras de um jogo inteiro.',
  category: 'games',
  official: true,
  enabledByDefault: false,
  // mouse: botões das telas + câmera de órbita arrastável. Audio: sons/efeitos.
  // storage: "Guardar … neste computador" (recorde, fase destravada).
  permissions: ['canvas', 'keyboard', 'mouse', 'audio', 'storage'],
  docs: `## Jogo 3D Avançado

Esta extensão é a **base de um jogo 3D grande**, com a mesma arquitetura das
engines de verdade. Ela usa \`window.SZGameKit3D\`. O motor cuida do que nunca
muda (mundo, luz, câmera, telas, física, quem nasce e quem sai do jogo) e **as
regras são suas**: você monta a mecânica nos "Quando…", com matemática, "se" e
variáveis. As telas e o placar usam Baloo 2, uma fonte arredondada que vem junto
e funciona mesmo sem internet.

Ela é o degrau de cima das extensões 3D. O **Jogo 3D** começa de uma cena vazia,
um objeto por vez; o **Mundo 3D** traz um mundo aberto pronto para passear; o
**Jogo 3D Avançado** dá os moldes, os estados de cada objeto e a física para um
jogo inteiro. O placar, as telas de início e fim, a contagem, o sorteio e o
tremor da câmera têm a MESMA cara nas três.

Duas palavras que aparecem em todo lugar:

- **Molde**: a receita de um tipo de coisa (herói, torre, invasor, tiro). Você
  cria uma vez e faz nascer quantos quiser.
- **Objeto**: cada um que nasceu de um molde. Cada objeto tem a própria vida, o
  próprio estado e os próprios dados.

### Começando (a receita)

1. Em **⚙️ Ao iniciar**, use **Criar o mundo 3D** uma vez: tamanho da tela,
   lado do chão em metros, céu e chão.
2. Em **🧩 Meus moldes**, use **Criar o molde 3D** uma vez por tipo de coisa
   (herói, torre, invasor, tiro), com as peças dentro.
3. Em **⚡ Quando acontecer**, use **Quando o jogo entrar no estado jogando**
   para montar a partida: nascer o herói ("chamando de"), espalhar enfeites e
   começar a nascer inimigos.
4. Em **🔁 Enquanto estiver rodando**, use **A cada quadro** para a mecânica
   geral: mover pelas teclas, placar e a condição de vitória.
5. Ainda em **🔁 Enquanto estiver rodando**, monte o comportamento de cada molde
   com **Enquanto ela do molde X estiver no estado Y**.
6. Pronto: o jogo **começa sozinho**, uma vez só, depois que os moldes, os
   avisos e as telas foram registrados.

Os exemplos vêm em ordem, do mais simples ao mais completo. Comece por **"Tiro
ao Alvo"**, **"Quadra Maluca"** e **"Guardião do Portal"**; depois pule com
**"Salto nas Nuvens"** e **"Parkour do Vulcão"**, enfrente **"O Chefão das
Sombras"** e veja um jogo inteiro e curto na **"Arena dos Cristais"** (patrulha,
mochila, duas fases e recorde). O **"Herói do Molda"** mostra um modelo animado, e a
**"Noite das Fogueiras"** usa os arquivos do projeto: céu 360° de foto, música e som.
Os "Profissional" são os jogos grandes, para estudar por partes.

### 🌍 Mundo, telas e estados

**Preparar**. "Criar o mundo 3D" monta céu em degradê, chão com sombra, luz de
sol, câmera de órbita (arraste o mouse) e as telas prontas. "Espalhar enfeites"
põe pedras e cristais no chão. "Efeitos de cinema" liga ou desliga as sombras,
o brilho nas coisas claras e as bordas escuras (desligue num computador fraco).
O jogo pausa com Esc; troque com "Usar a tecla … para pausar".

**Telas**. As telas prontas são o menu (a de início), a pausa, a de carregando,
a de fim e a de vitória. "Na tela de início/fim/vitória" troca o título, o texto
e o botão (a mesma cara do Jogo 3D e do Mundo 3D). "Criar a tela" faz uma tela
sua (loja, instruções), "Botão … na tela" diz o que o clique faz, e "Mostrar a
tela" e "Esconder todas as telas" abrem e fecham.

**Estados**. O jogo vive em UM estado por vez: menu, jogando, pausado, fim,
vitoria ou um que você inventar. As telas prontas aparecem sozinhas. Entrar em
"jogando" fora da pausa RECOMEÇA a partida (todo mundo sai do jogo, e placar,
contagem e textos dos cantos voltam do zero). Por isso a partida se monta no
"Quando o jogo entrar no estado jogando". Voltar da pausa não repete esse
"Quando…". "Fim de jogo: você perdeu" vai para o estado fim; "você ganhou" vai
para a vitória. As duas telas têm "Jogar de novo" e "Sair para o menu".

**Fases**. "Quando começar uma fase" roda no começo da partida (a fase 1,
logo depois do "Quando o jogo entrar no estado jogando") e a cada "Ir para a
próxima fase". Monte a fase ali: nascer o herói, os inimigos, a contagem; com
"o número da fase" cada fase fica diferente. Ao trocar de fase, todos saem do
jogo, o nascer sem parar e a contagem param, e as luzes e os jorros acesos
durante a fase apagam (os acesos no Ao iniciar e no "Quando o jogo entrar no
estado jogando" ficam a partida toda). Os pontos e a mochila continuam. Voltar
ao menu ou jogar de novo volta para a fase 1.

**Guardar o progresso**. "Guardar … com o nome recorde neste computador" fica
guardado mesmo fechando o jogo; "o valor guardado recorde (ou 0)" lê de volta
(o "ou" vale enquanto nada foi guardado). Guarde números e textos.

**Avisos**. "Avisar todo mundo: invasor:caiu" faz rodar todos os "Quando chegar
o aviso invasor:caiu". Quem avisa não precisa conhecer quem escuta: é o jeito de
ligar as partes de um jogo grande.

### 🧩 Moldes

**Desenhar o molde**. O desenho é montado de PEÇAS (como um brinquedo de
montar): caixa, bola, cilindro, cone, plano, rosca, pirâmide e rampa, cada uma
com acabamento (normal, metal, vidro ou brilho), cor, tamanho, lugar e uma
textura opcional (uma imagem do projeto). O y 0.5 põe um cubo de altura 1 no
chão. Sem peça nenhuma, o molde vira um cubinho.

⭐ **Modelo importado (do Molda ou de um site)**: escolha a forma "modelo
importado" e um arquivo **.glb** do projeto. O modelo **cabe inteiro na caixa
da peça, sem esticar**: um boneco de 6 metros numa caixa 1 × 1 × 1 vira um
boneco de 1 de altura, e com y 0.5 ele pisa no chão. A colisão fica do tamanho
do que se vê. Enquanto o arquivo abre, a peça mostra um cubo de reserva.

**Corpo do molde**. "Ter física de" é o atalho: 🏀 bola quica e rola, 📦 caixa
quase não quica e freia, 🧍 personagem não quica nem engancha em quina, 🧊 gelo
escorrega e 🪶 flutuante não cai. Depois dá para afinar: "colidir como" (caixa,
bola ou pílula, a melhor para gente e bicho), "ser sólido" (parede, chão ou
plataforma: ninguém atravessa), "ser uma zona" (não empurra, mas avisa quem
entrou), "quicar" e "atrito". Quique: o maior dos dois manda (a bola quica em
qualquer chão; o trampolim joga até o personagem). Atrito: o mais escorregadio
manda. Uma rampa é uma forma de peça, e uma plataforma que anda é um molde
sólido com velocidade: ela carrega quem está em cima.

**Animação do modelo**. Um .glb traz as animações que fizeram nele (andar,
pular, atacar). "No molde …, no estado …, tocar a animação …" amarra uma
animação a um estado: quando o objeto muda de estado, a animação troca junto.
Escolha *repetindo* (andar, parado) ou *uma vez* (pulo, golpe: toca até o fim e
para). "Quando um … terminar a animação …" roda quando uma animação de *uma vez*
chega ao fim (ex.: acabou o golpe, voltar a andar). "Velocidade da animação"
deixa em câmera lenta (0.5) ou mais rápido (2). O nome da animação é o que vem
dentro do arquivo (Idle, Run, Walk…); nome que não existe dá um aviso e o jogo
não quebra.

### 👾 Nascer e sumir

**Nascer**. "Nascer 1 do molde" põe um objeto no mundo, e "… chamando de" dá um
apelido (herói, cristal, chefão) para usar nos outros blocos. "No lugar de …
(virado igual)" é como o tiro da torre já nasce mirado. "Disparar um anel" é o
ataque de chefão. "A cada … s, nascer 1 do molde" solta inimigos sem parar, e
"Parar de nascer do molde" desliga.

**Quem está no jogo**. "Para cada … do molde … que está no jogo" repete uma
regra para todos; "quantos … estão no jogo" conta; "ainda está no jogo?"
protege um alvo guardado, que pode já ter sido derrotado; "é do molde …?"
descobre quem é quem (na zona, quem encostou pode ser um tiro perdido).

**Sumir**. "Tirar … do jogo" tira um objeto; "Tirar do jogo todos do molde"
limpa a arena; "Tirar do jogo quem passar de … do centro" some com os tiros que
erraram, para o jogo ficar leve. O motor reaproveita o desenho de quem saiu,
mas quem saiu não volta: os blocos que ainda chamarem por ele não fazem nada.

### 🏃 Movimento

**Teclado**. "Mover … pelas teclas" anda no chão com WASD e setas; "como
plataforma" anda e pula com o espaço; "em 1ª pessoa" anda para onde a câmera
olha. ⭐ Andar com as teclas é SEMPRE relativo à câmera: o W entra na tela, em
qualquer câmera.

**Posição e direção**. "Colocar … em x y z" leva na hora; "Girar … para …
graus" vira (0 = frente); "Virar … de uma vez para …" encara outro objeto;
"Virar … para onde anda" acompanha o movimento. A frente de tudo é o lado +Z do
molde: ponha o nariz e o cano das peças em z positivo, como os .glb já vêm.

**Velocidade e freio**. "Dar a … a velocidade x y z" em metros por segundo (o
motor move sozinho); "Frear … aos poucos" faz a velocidade morrer sozinha;
"Mover … para frente" empurra para onde ele está virado (é o motor do tiro).

**Pular e cair**. "Fazer … cair com gravidade" liga a queda; "pular" só sai do
chão; "está no chão?" conta o pulo; "atravessar as paredes" vira fantasma. Um
tiro rápido não atravessa parede fina: o motor varre o caminho do quadro. Quem
cai para no chão do mundo (a altura 0): para perder ao cair, faça a derrota ser
pisar lá embaixo ("está no chão?" com a altura perto de 0), como no "Salto nas
Nuvens" e no "Parkour do Vulcão".

**Perseguir e mirar**. "Perseguir" aponta para o alvo com a velocidade do
molde; "andar rumo ao ponto" leva até um lugar e para (com "um número de … a …"
vira passeio); "patrulhar de … até …" vai e volta entre dois pontos, virado
para onde anda (use a cada quadro ou no estado de patrulha); "mirar em" gira
aos poucos, como uma torre, e "já está mirando?" diz a hora de atirar.

### 🎮 Controles

"a tecla … está apertada?" e "a tecla … acabou de ser apertada?" usam a MESMA
lista de teclas do Jogo 3D e do Mundo 3D (W, A, S, D, setas, espaço, Enter, E,
Q, F, R, P, shift). O segundo vale só no quadro do aperto: um aperto, uma ação.
"o mouse foi clicado agora?" e "o mouse está apertado?" são o gatilho do
apontar e clicar; "Guardar em … quem do molde … está sob o mouse" escolhe pelo
clique; "o mouse está sobre …?" e "o ponto do chão sob o mouse" completam a
mira (mover até o clique, construir onde você apontar).

### 💥 Encostar

"Quando alguém encostar em … do molde …" roda quando alguém ENTRA numa zona,
uma vez por entrada (não a cada quadro), até para dois ao mesmo tempo. ⭐
Pergunte "… é do molde …?" antes de contar o ponto. "… está encostando em … (a
menos de …)?" responde sim ou não; "Para cada … do molde … a até … de …" olha só
quem está perto (por dentro usa uma grade e nunca compara todo mundo com todo
mundo); "Guardar em … quem está mais perto" é como a torre escolhe o alvo.

### 🧠 Comportamento

**Estados de cada um**. O coração do motor: cada objeto vive num estado
(\`parado\`, \`mirar\`, \`atirar\`…) com "Quando … entrar no estado", "Enquanto …
estiver no estado …, a cada quadro" e "Quando … sair do estado". Todo objeto
NASCE no estado \`parado\`. A torre profissional, em blocos:

- no **parado**: guardar em \`alvo\` o invasor mais perto; se ele existe e está a
  menos de 14, mudar para **mirar**;
- no **mirar**: mirar no alvo; se "já está mirando?", mudar para **atirar**;
- ao entrar em **atirar**: nascer 1 tiro no lugar dela, tocar o laser e mudar
  para **recarregar**;
- "No molde torre, depois de 1 s no estado recarregar, mudar para parado".

Mudar para o estado em que ele já está não faz nada. Se um "Quando entrar/sair"
pedir outra mudança, o motor termina a atual e faz a nova em seguida, na ordem.

**Dados de cada um**. "guardar … em … do objeto …" e "… do objeto …" (a mesma
cara do Jogo 3D) dão a cada objeto os próprios dados: um cronômetro, quantos
tiros deu, o alvo que escolheu. Tudo zera quando ele nasce.

### 🏆 Placar, vida e telas

**Vida**. A vida é de CADA objeto, e nasce com a vida do molde. "Machucar …
tirando … de vida" (a mesma cara do Jogo 3D) deixa o objeto piscando e meio
segundo sem se machucar de novo; vida no zero roda o "Quando … for derrotado" e
ele sai do jogo sozinho. "Quando … levar dano" é o chefão em várias fases (leia
"a vida de …" e "a vida máxima de …" ali dentro). "Curar" devolve vida sem passar
da vida com que ele nasceu, e "Mostrar a barra de vida do molde" pendura uma
barrinha sobre a cabeça de cada um. Quer uma morte com queda antes de sumir?
Guarde a vida nos dados do objeto e use um estado "morrendo".

**Placar e falas**. "Escrever na tela …" (a mesma lista de cantos das
outras extensões 3D; texto vazio apaga) e "Somar … aos pontos" (os pontos
aparecem sozinhos em cima, à direita). "… diz … por … s" põe um balão de fala
que acompanha o objeto e some sozinho.

**Mochila 🎒**. "Pôr 1 chave na mochila", "Tirar 1 chave da mochila",
"quantas chave tem na mochila", "a mochila tem chave?" e "Esvaziar a mochila".
Ela aparece sozinha embaixo, à esquerda, continua de uma fase para a outra e
esvazia quando a partida recomeça (no Mundo 3D ela fica salva; aqui não).

### 🎥 Câmera

Escolha a câmera: **seguir** alguém, **girar em volta** do mundo (arrastando o
mouse), **ver de cima** ou **1ª pessoa** (clique para olhar em volta com o
mouse; trocar de câmera ou pausar devolve o cursor). Depois ajuste: "girar para
… ° e inclinar … °" mexe na órbita sem o mouse; "afastar" aproxima ou afasta;
"olhar para …" gira em volta de um objeto ou de um ponto; "lente de … °" é o
zoom (60 é o normal, 30 é luneta); "suavidade do seguir" vai de preguiçosa (1)
a colada (10); "Tremer a câmera" é o impacto da explosão, que some sozinho.

### ✨ Luz, céu e faíscas

**Luz e céu**. "Pôr uma luz" acende uma tocha ou fogueira (até 8 a mais); "Luz
do ambiente" escurece para noite ou caverna; "Névoa" esconde o longe numa cor;
"Trocar o céu" muda o degradê a qualquer hora; "Usar o céu 360°" troca o céu
por uma foto (.hdr do projeto) que também ilumina o mundo e faz o metal
refletir. Luz, ambiente e névoa: use no começo ou numa reação que acontece uma
vez, nunca a cada quadro.

**Faíscas**. "Criar o efeito 3D" é a receita de uma explosão (quantas, cores,
quanto espalham, tamanho, duração, gravidade) e "Soltar o efeito" estoura num
ponto ou em cima de um objeto.

**Jorro de faíscas**. "Criar o jorro de faíscas" é a receita de um fogo, fumaça,
rastro ou magia que não para: cores, tamanho, quantas por segundo, força,
abertura (0° reto, 180° para todo lado), gravidade e brilho (ligado = fogo;
desligado = fumaça). "Ligar o jorro" prende num ponto ou em cima de um objeto
(ele vai junto); "Desligar o jorro" apaga. Vários jorros da mesma receita
convivem (até 8). "Puxar as faíscas" cria um ímã, como um redemoinho (até 16).
O jeito "fogo" nasce luz e morre fumaça.

### ⏱️ Tempo, sorteio e som

**Tempo e sorteio**. "A cada quadro" roda só no estado jogando e guarda quanto
durou o quadro, em segundos: multiplique a velocidade por ele e o jogo anda
igual em qualquer computador. "Começar a contagem de … segundos" mostra o tempo
em cima, no meio; "o tempo que falta", "Parar a contagem" e "Quando a contagem
acabar" completam. A contagem só anda no estado jogando: na pausa ela congela.
"um número de … a …" sorteia um número inteiro (como um dado) e "tem chance de
…%?" acontece de vez em quando. ⭐ "Deixar o sorteio repetível com o código …"
faz o sorteio sair igual toda vez: mesmos enfeites, mesma ordem de inimigos. Bom
para testar e para dar o mesmo desafio a todos (o código 0 volta ao sorteio de
verdade). O sorteio deste kit obedece ao código; o "número aleatório" comum não.

**Som**. "Carregar o som … do arquivo …" prepara um som importado (em "Sons", no
menu ⋯) com um nome; "Tocar o som" toca; "Tocar a música … sem parar" é a
música de fundo (uma por vez) e "Parar a música" silencia. "Tocar o som pronto"
tem moeda, batida, explosão e outros, sem arquivo, e "Tocar uma nota de … Hz"
faz um bipe (de 20 a 20000 Hz, até 10 segundos).

### Dicas

- Unidades são METROS: um boneco tem de 1 a 2 de altura, boas velocidades
  ficam entre 3 e 18 por segundo e o mundo padrão tem 80 de lado.
- A tela mantém a proporção escolhida e diminui sozinha se passar do limite
  seguro (1920 × 1080).
- O motor mede cada .glb (malhas, ossos, materiais) e usa a forma de reserva se
  passar dos limites seguros. Tirar um objeto do jogo devolve o custo dele.

> ⚠️ Use APENAS UMA extensão de jogo por projeto (Jogo 2D, Jogo 2D Avançado,
> Jogo 3D, Mundo 3D ou esta). Cada uma cria a própria tela e elas brigam pelo canvas.
`,
}
