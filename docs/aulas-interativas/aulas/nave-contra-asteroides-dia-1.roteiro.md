# Roteiro de gravação · Nave Contra Asteroides · Dia 1 · A nave ganha vida

**Como ler este roteiro:** só o texto entre aspas em **Narração** é falado no vídeo. **Na tela**
orienta a gravação; as **Notas de produção** são lembretes para a equipe, não falas para a criança.

## Especificações

- **Formato:** gravação da tela do Estúdio com narração por cima. Os clipes de gesto mostram a
  paleta abrindo gaveta por gaveta; os de conceito usam exemplos e representações sem ensinar a
  montagem dos blocos.
- **Duração:** 14 clipes, com cerca de 13 minutos de narração a **137 palavras por minuto**.
  Somar pausas visuais, experimentações, montagens, quiz e envio após a gravação; não usar a
  estimativa antiga de 15 a 25 minutos para prometer a duração final.
- **Calibração:** esta é a primeira aula de Estúdio da vida de quem assiste, e nada pode ser
  pressuposto da introdução do Desafio do Primeiro Jogo. Mostrar os gestos de testar, confirmar
  campos, conferir o salvamento e pedir ajuda quando forem necessários. É novo de verdade: a paleta e as gavetas, as áreas do projeto, o x
  e o y, o sprite, o quadro, o motor, a limpeza antes do desenho e a ordem de desenho.
- **Conceitos nomeados:** **áreas do projeto**, **Ao iniciar**, **Enquanto estiver rodando**,
  **sprite**, **quadro**, **motor**, **camadas** (dita como ordem de desenho).
- **Dor desta aula:** ela coloca **Criar nave**, confirma os padrões, escolhe posição e cores, e
  a nave não aparece na tela. Essa dor reproduz sempre, com todo mundo, porque o bloco que desenha
  só entra depois dos conceitos de criar e desenhar e de quadro. É dor de verdade e o clipe não a
  esconde, nem diz que houve erro. Depois, mover sem limpar produz um rastro visível sobre o
  fundo liso; Limpar a tela resolve esse segundo problema antes de o céu estrelado ser adicionado.
  Por fim, desenhar o céu depois da nave esconde a nave; mudar a ordem traz ela de volta.
- **Vitória do dia:** a nave dela aparece num espaço com estrelas e obedece às setas, sem sair da
  tela e sem deixar rastro.
- **Valores:**
  - **Saem daqui como canônicos:** tela 800 por 480 · sprite chamado `nave` · x 400, y 410 ·
    largura 54, altura 62 · estrelas com velocidade 1 · setas com velocidade 7.
  - **Padrões de fábrica que ficam:** **Criar nave** já vem com o nome `nave`, largura 54 e
    altura 62. A velocidade 1 do fundo de estrelas já vem escrita. **Mover o sprite com as
    setas** já vem com o nome `nave`; a fala confere esses campos sem redigitar.
  - **Padrões de fábrica que mudam:** o campo que escolhe o sprite em **Desenhar o sprite** vem com
    `jogador`, e em **Manter o sprite dentro da tela** vem com `heroi`. Nesses dois blocos a criança lê o aviso antes de escolher
    `nave`.
- **Campos livres:** a cor do fundo do jogo, a cor do corpo e a cor das asas da nave. Nenhuma aula
  posterior cita essas cores como fato.
- **Nota de produção:**
  - **Conferência para a gravação:** não reaproveitar da versão de 2026 a frase que diz que x 400
    centraliza a nave. O x 400 marca o lado esquerdo de uma caixa de largura 54; o centro dela fica
    em 427. O `video-coordenadas` mostra a marca de x e y no canto superior esquerdo da caixa.
  - **O bloco se chama `Desenhar o sprite`**, e não "Desenhar o sprite por último". O "por último"
    é a posição dele no motor, que é o conceito, e não o nome da peça. Nada nesta aula pode afirmar
    que ele é para sempre o último bloco do motor, porque o Dia 2 encaixa três blocos depois dele.
  - Zoom obrigatório em: os campos de largura e altura do **Preparar o jogo em tela cheia**; o
    ícone de alerta aberto, com a mensagem em português; o clique num espaço vazio fora do bloco,
    toda vez que ele aparecer; e a pilha inteira do motor no `video-fundo-estrelado`.
  - O `video-livrinho` é a única imagem fora do Estúdio: um livrinho de folhear de verdade, filmado
    em cima da mesa.
  - Em nenhum clipe a fala diz onde a ferramenta fica na tela. A ferramenta muda de lugar conforme
    a largura, e posição dentro do Estúdio pode ser dita ("na coluna da esquerda, onde ficam os
    bloquinhos"), posição da ferramenta na página não.
- **O que NÃO entra, e por quê:**
  - **A enumeração dos seis passos**, que abria a gravação de 2026. O redesenho tem quinze seções e a
    lista viraria um cartório. A abertura diz o que vai estar na tela no fim do dia, e emenda.
  - **Explicação conceitual dentro de clipe de gesto.** Uma vez contra sempre, para onde o y cresce,
    criar contra mostrar, quadros e camadas têm clipes conceituais próprios. Os clipes de montagem
    não repetem essas ideias.
  - **A frase solta "as estrelas iam tampar ela"**, do fecho do quinto passo. Na seção 12 o céu
    realmente cobre a nave por um instante; na seção 13 a criança entende por que a ordem importa.
  - **O convite a brincar com a velocidade 7 e trocar por 12.** A velocidade 7 é canônica e o Dia 2
    conta com ela.
  - **A instrução de mandar rodar o jogo, e qualquer botão de play.** Nenhum dos dois existe.
    Ensinar aqui cada gesto de teste quando ele for usado pela primeira vez.

---

## Seção 1. O que a gente vai fazer hoje

### Clipe `video-abertura` · A sua nave no espaço
**Duração alvo:** 25 a 35 segundos; recalibrar após gravar.

**Na tela:** o jogo do fim do Dia 1 rodando, ocupando o quadro inteiro, sem nenhuma parte do
Estúdio à vista: a nave num espaço cheio de estrelas, indo para a esquerda e para a direita com as
setas.

**Narração:**
> "Oi! Olha o que vai estar na sua tela no fim da aula de hoje: a sua nave, num espaço cheio de
> estrelas, obedecendo às setas."

**Na tela:** o jogo continua rodando, com a nave entre as estrelas.

**Narração:**
> "Hoje a gente vai preparar o jogo, descobrir onde a nave fica na tela e montar um pedacinho
> de cada vez. Vem comigo."

---

## Seção 2. O que acontece uma vez e o que acontece sempre

### Clipe `video-duas-areas` · A mesma ação em dois momentos
**Duração alvo:** 65 a 80 segundos; recalibrar após gravar.

**Na tela:** papel e lápis separados para começar um desenho; depois, a mão continua desenhando
sem precisar pegar o material de novo. Corte para o Estúdio ainda vazio. Abrir a categoria **Áreas
do projeto** e destacar **Ao iniciar** e **Enquanto estiver rodando**, sem arrastar nenhum deles.

**Narração:**
> "Antes de montar o jogo, vamos descobrir por que algumas ações acontecem só no começo e outras
> se repetem. Imagina que você quer fazer um desenho no papel. Primeiro, você pega o papel e os lápis. Você
> faz isso apenas uma vez. Depois, você começa a desenhar, fazendo um traço atrás do outro. No
> jogo que vamos criar, também tem coisas que acontecem só no começo, como preparar a tela, e
> outras que continuam acontecendo enquanto a gente joga, como mover a nave. Para separar esses
> dois momentos, a gente usa as **áreas do projeto** do Estúdio. Elas são espaços grandes onde a
> gente encaixa os blocos. Vamos conhecer duas delas."

**Na tela:** aproximar nas duas áreas da categoria, sem montagem. Destacar **Ao iniciar** quando a
fala nomeá-la e **Enquanto estiver rodando** em seguida. Mostrar um ventilador ligado girando e,
depois, desligado e parado.

**Narração:**
> "**Ao iniciar** guarda a preparação. O que estiver lá acontece uma vez, quando o jogo começa.
> **Enquanto estiver rodando** guarda o trabalho que se repete enquanto o jogo está ligado. Pensa
> num ventilador. Quando está ligado, ele gira. Quando a gente desliga, ele para."

**Na tela:** encerrar com as duas áreas vazias lado a lado. Não mostrar a ação, o contador nem o
resultado da comparação; a criança fará esse teste na experiência ao lado.

---

## Seção 3. Monte as áreas e prepare a tela

### Clipe `video-montar-areas-tela` · As áreas do projeto e a tela do jogo
**Duração alvo:** 100 a 115 segundos; recalibrar após gravar.

**Na tela:** mostrar o projeto como ficou depois da seção anterior: as duas áreas ainda não estão
na área de montagem e a tela do jogo ainda não foi preparada. Apontar onde elas vão ficar, sem
antecipar o resultado. Abrir a categoria **Áreas do projeto** na coluna dos bloquinhos. Arrastar
**Ao iniciar** para a área de montagem, no meio do Estúdio, e soltar.

**Narração:**
> "Agora vamos montar a base do nosso jogo. Primeiro, vamos colocar no projeto as duas áreas que
> você acabou de conhecer. Depois, vamos preparar a tela onde a nave vai aparecer. Vamos por
> partes. Abre a categoria **Áreas do projeto** e pega o bloco **Ao iniciar**. Arrasta para a área
> de montagem, no meio do Estúdio, e solta."

**Na tela:** ainda na categoria **Áreas do projeto**, arrastar **Enquanto estiver rodando** para a
área de montagem e soltar ao lado do **Ao iniciar**, com um espaço visível entre as duas áreas.

**Narração:**
> "Agora, ainda na categoria **Áreas do projeto**, pega o bloco **Enquanto estiver rodando**.
> Arrasta para a área de montagem e solta ao lado do **Ao iniciar**, deixando um espacinho entre
> as duas áreas."

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Jogo e telas**, e dentro dela a seção
**Preparar a área do jogo**. Arrastar **Preparar o jogo em tela cheia** para dentro do Ao iniciar,
com o clique de encaixe à vista.

**Narração:**
> "Com as duas áreas no lugar, vamos preparar a tela. Abre a categoria **Jogo 2D**. Depois, abre
> **Jogo e telas** e procura a seção **Preparar a área do jogo**. Pega o bloco **Preparar o jogo em
> tela cheia**, arrasta até o **Ao iniciar** e encaixa dentro dele."

**Na tela:** aproximar nos campos de largura e altura do bloco. Os campos já mostram 800 e 480.
Não apagar nem redigitar. Marcar com uma seta horizontal a largura e com uma seta vertical a altura.

**Narração:**
> "Esse bloco já vem com os dois números de que a gente precisa. A largura já vem em 800. Ela mede
> a área do jogo de um lado ao outro. A altura já vem em 480. Ela mede de cima até embaixo. Hoje é
> só conferir os dois e deixar como estão."

**Na tela:** clicar no quadradinho de cor do fim do bloco e escolher um tom escuro. A área do jogo
aparecendo com o fundo escolhido.

**Narração:**
> "No fim do bloco **Preparar o jogo em tela cheia**, clica no quadradinho de cor. Ele escolhe a
> cor do fundo do jogo. Escolhe uma cor escura de que você goste."

---

## Seção 4. Onde a nave fica na tela

### Clipe `video-coordenadas` · O endereço da nave na tela
**Duração alvo:** 40 a 50 segundos; recalibrar após gravar.

**Na tela:** a tela do jogo já preparada na seção anterior, ainda sem nave. Destacar a pergunta
"Onde a nave vai aparecer?" sem mostrar números ou controles da experiência.

**Narração:**
> "A tela do jogo já está pronta. Agora falta dizer ao jogo onde a nave vai aparecer. Para marcar
> esse lugar, a gente usa dois números, como se fosse o endereço da nave. Eles se chamam **x** e
> **y**."

**Na tela:** marcar primeiro o canto de cima, à esquerda, com x 0 e y 0. Depois, uma seta
horizontal partindo desse canto para a direita, identificada como x; só então uma seta vertical
para baixo, identificada como y. Não mover a nave nem reproduzir o teste da experiência.

**Narração:**
> "Os dois começam em zero, no canto de cima, à esquerda da tela. Quando o **x** aumenta, o lugar
> vai para a direita. Quando o **y** aumenta, o lugar vai para baixo."

**Na tela:** a caixa da nave desenhada na tela, com a marca do x e do y presa no canto de cima, à
esquerda da caixa.

**Narração:**
> "Quando a nave aparecer, esse endereço vai marcar o canto de cima, à esquerda da caixa dela.
> Não é o meio da nave."

---

## Seção 5. Crie a sua nave

### Clipe `video-criar-nave` · A nave com as suas cores
**Duração alvo:** 65 a 75 segundos; recalibrar após gravar.

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Kits prontos**, e dentro dela a seção
**Espaço**. Arrastar **Criar nave** para dentro do Ao iniciar, logo abaixo do Preparar o jogo em
tela cheia.

**Narração:**
> "Você já sabe onde a nave pode ficar na tela. Agora vamos criar a sua nave nesse lugar e
> escolher as cores dela. Na categoria **Jogo 2D**, abre **Kits prontos**, e dentro dela
> **Espaço**. Pega o bloco **Criar nave**. Encaixa dentro do **Ao iniciar**, logo abaixo do
> **Preparar o jogo em tela cheia**."

**Na tela:** aproximar no campo do nome, que já mostra **nave**. Não apagar nem redigitar.

**Narração:**
> "O primeiro campo é o nome da nave no jogo. Já veio **nave**, tudo minúsculo. Confere e
> deixa assim."

**Na tela:** preencher x 400 e y 410, um de cada vez, clicando fora depois de cada um.

**Narração:**
> "No x, escreve 400 e clica fora para confirmar. No y, escreve 410 e clica fora também. Esse
> segundo número deixa a nave perto da beirada de baixo da tela."

**Na tela:** aproximar nos campos de largura e altura, que já mostram 54 e 62. Não apagar nem
redigitar. Marcar largura de um lado ao outro e altura de cima a baixo na prévia do bloco.

**Narração:**
> "A largura já vem em **54**, de um lado ao outro da nave. A altura já vem em **62**, de cima
> até embaixo. Esses dois números dizem o tamanho dela. Hoje, deixa os dois como estão."

**Na tela:** clicar nos dois quadradinhos de cor do bloco, o do corpo e o das asas, escolhendo uma
cor em cada.

**Narração:**
> "E agora a parte boa. Esse bloco deixa você escolher a cor do corpo e a cor das asas. Capricha, que
> essa nave vai ser só sua!"

**Na tela:** a área do jogo, com o fundo escuro e nenhuma nave à vista. Segurar o enquadramento
alguns segundos.

**Narração:**
> "Pronto. E repara na tela do jogo: a nave ainda não está lá. Guarda essa pergunta, que a gente
> resolve agora."

> **Nota de produção.** Manter a surpresa. O clipe não diz que houve erro, não corrige nada e não
> antecipa a resposta.

---

## Seção 6. Criar e mostrar são duas coisas diferentes

### Clipe `video-criar-e-mostrar` · Criar não é mostrar
**Duração alvo:** 25 a 35 segundos; recalibrar após gravar.

**Na tela:** uma peça de teatro atrás da cortina; depois, a cortina abre e a peça aparece no palco.
Não mostrar os controles nem a cena da experiência.

**Narração:**
> "Você criou a nave, mas ela ainda não apareceu no jogo. Por quê? Imagina uma peça de teatro.
> Primeiro, os atores se preparam atrás da cortina. Eles já estão
> lá, mas o público ainda não vê. Quando a cortina abre, eles aparecem no palco. No jogo, criar a
> nave é preparar o objeto nos bastidores. Desenhar a nave é mostrar esse objeto na tela. São
> duas ações diferentes."

---

## Seção 7. O que é um quadro

### Clipe `video-livrinho` · O livrinho de folhear
**Duração alvo:** 50 a 60 segundos; recalibrar após gravar.

**Na tela:** um livrinho de folhear de verdade, em cima da mesa, com uma página aberta por vez,
mostrando que cada desenho é um pouquinho diferente do anterior.

**Narração:**
> "A nave já foi criada. Para ela aparecer se mexendo, o jogo vai desenhar a tela muitas vezes.
> Você já viu aqueles livrinhos de folhear? Cada página é um desenho um pouquinho diferente da
> página de antes."

**Na tela:** o mesmo livrinho sendo folheado rápido, com o bonequinho parecendo se mexer.

**Narração:**
> "E quando as páginas passam rápido, o seu olho enxerga movimento. Um jogo funciona igualzinho a
> isso."

**Na tela:** congelar numa página só, com um rótulo curto aparecendo por cima dela.

**Narração:**
> "Cada página dessas tem um nome: **quadro**. O jogo desenha um quadro, depois outro, depois outro,
> muito rápido, e é isso que faz tudo parecer que se mexe."

**Na tela:** o livrinho e a tela do jogo lado a lado, os dois em movimento, com um contador de
quadros subindo ao lado do jogo.

**Narração:**
> "O seu jogo faz a mesma coisa, e faz muito rápido, várias vezes por segundo. Quando alguma coisa se
> mexe na tela, é porque um quadro novo acabou de ser desenhado."

---

## Seção 8. Faça a nave aparecer

### Clipe `video-motor-e-nave` · O motor mostra a nave
**Duração alvo:** 85 a 100 segundos; recalibrar após gravar.

**Na tela:** enquadrar a tela do jogo com a cor de fundo escolhida na seção 3, ainda sem a nave.
Abrir a categoria **Jogo 2D**, a subcategoria **Tempo** e a seção **Quadros e intervalos**.
Arrastar **A cada quadro do jogo** para dentro do **Enquanto estiver rodando**, no primeiro lugar.

**Narração:**
> "Você já viu que o jogo desenha um quadro depois do outro. Agora vamos usar esse trabalho
> repetido para fazer a nave aparecer no seu próprio jogo. Na categoria **Jogo 2D**, abre **Tempo** e depois
> **Quadros e intervalos**. Pega **A cada quadro do jogo** e encaixa dentro do **Enquanto
> estiver rodando**, no primeiro lugar."

**Na tela:** destacar o espaço vazio dentro de **A cada quadro do jogo** e apontar para o bloco
**Criar nave** que a criança já montou. A nave ainda não aparece na área do jogo.

**Narração:**
> "O espaço dentro desse bloco recebe as ordens que vão acontecer a cada quadro. A nave que
> você criou é um **sprite**. Sprite é como o Estúdio chama um personagem ou objeto do jogo."

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Sprites** e a seção **Criar e trocar
aparência**. Arrastar **Desenhar o sprite** para dentro do **A cada quadro do jogo**, no primeiro
lugar. Segurar o enquadramento no campo que escolhe o sprite, ainda em `jogador`, e no aviso que
aparece.

**Narração:**
> "Agora, na categoria **Jogo 2D**, abre **Sprites** e depois **Criar e trocar aparência**. Pega
> **Desenhar o sprite** e encaixa no primeiro lugar dentro do **A cada quadro do jogo**."

**Na tela:** clicar no aviso, manter a mensagem legível e só depois abrir o seletor de sprite.
Escolher **nave** e mostrar o aviso sumindo antes de enquadrar a nave no jogo.

**Narração:**
> "Apareceu um aviso. Clica nele antes de mudar qualquer coisa. Ele ajuda a descobrir por que
> o bloco ainda não encontrou a sua nave. Agora abre o campo que escolhe qual sprite será
> desenhado. Ele está em **jogador**. Escolhe **nave**, que é o nome que você deu à sua nave."

**Na tela:** mostrar a nave parada sobre o fundo liso. Não colocar movimento, limpeza nem
estrelas ainda.

**Narração:**
> "Olha só: agora a nave aparece. Ela ainda está parada. Daqui a pouquinho, vamos fazer ela
> andar com as setas."

---

## Seção 9. Faça a nave andar com as setas

### Clipe `video-setas-e-rastro` · As setas põem a nave em movimento
**Duração alvo:** 65 a 80 segundos; recalibrar após gravar.

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Movimento**, e dentro dela a seção
**Movimentos prontos**. Arrastar **Mover o sprite com as setas** para dentro do A cada quadro do
jogo, encaixando acima do **Desenhar o sprite**.

**Narração:**
> "A nave já aparece, mas ainda não responde às suas teclas. Agora vamos fazer ela
> andar com as setas. Na categoria **Jogo 2D**, abre **Movimento** e depois
> **Movimentos prontos**. Pega **Mover o sprite com as setas** e encaixa dentro do **A cada
> quadro do jogo**, logo acima do **Desenhar o sprite**."

**Na tela:** aproximar no campo do sprite, que já vem em **nave** no bloco de movimento. Não trocar
esse campo nem simular um aviso aqui.

**Narração:**
> "No campo que diz qual sprite vai se mover, **nave** já está selecionada. Pode deixar assim."

**Na tela:** aproximar no campo de velocidade. Mostrar a nave e o número no mesmo enquadramento.
Depois escrever 7 e clicar num espaço vazio fora do bloco.

**Narração:**
> "Velocidade é o quanto a nave anda quando você segura a seta. Quanto maior esse número, mais
> depressa ela vai. Vamos usar **7**. Escreve o 7 e clica fora do bloco para confirmar."

**Na tela:** clicar dentro da área do jogo e segurar a seta por alguns segundos, sem chegar à
borda. Os desenhos anteriores permanecem visíveis sobre o fundo liso. Parar com o rastro à vista.
Não colocar limpeza, limite nem estrelas neste clipe.

**Narração:**
> "Vamos testar. Clica dentro do jogo e segura uma das setas. A nave anda, mas olha o que
> ficou no caminho dela: os desenhos antigos continuam na tela. Vamos cuidar desse rastro
> agora."

---

## Seção 10. Apague o rastro da nave

### Clipe `video-limpar-rastro` · A borracha antes do desenho
**Duração alvo:** 65 a 80 segundos; recalibrar após gravar.

**Na tela:** começar com o rastro produzido no fim da seção anterior. Enquadrar os dois blocos
do motor: **Mover o sprite com as setas** e **Desenhar o sprite**. Abrir **Jogo 2D › Desenho e
efeitos › Efeitos** e arrastar **Limpar a tela** para o primeiro lugar de dentro do **A cada
quadro do jogo**, acima desses dois blocos.

**Narração:**
> "Quando a nave anda, o jogo desenha ela em um lugar novo. Só que o desenho do lugar anterior
> continua na tela. Foi assim que apareceu o rastro. Para ver só a nave de agora, precisamos
> apagar os desenhos antigos. É como numa lousa mágica: antes de fazer o próximo desenho, você
> apaga o anterior. No jogo, vamos colocar essa borracha no começo do motor. Na categoria
> **Jogo 2D**, abre
> **Desenho e efeitos** e depois **Efeitos**. Pega **Limpar a tela** e encaixa no primeiro
> lugar dentro do **A cada quadro do jogo**, acima do **Mover o sprite com as setas**."

**Na tela:** enquadrar a ordem completa até aqui: limpar, mover, desenhar nave.
Deixar visível a cor lisa de fundo escolhida pela criança.

**Narração:**
> "A ordem ficou assim: primeiro limpar a tela, depois mover a nave e desenhar a posição nova.
> Limpar apaga a imagem antiga; não apaga a nave que você criou."

**Na tela:** deixar o próximo quadro limpar o rastro do teste anterior. Clicar dentro do jogo e
mover a nave novamente com a mesma seta. Mostrar a nave sobre o fundo liso, agora sem rastro.
Não usar estrelas para cobrir os desenhos antigos.

**Narração:**
> "Agora testa de novo com a mesma seta. A nave continua andando, mas o caminho atrás dela
> volta a ficar limpo."

---

## Seção 11. Não deixe a nave escapar

### Clipe `video-limite-da-nave` · A borda segura a nave
**Duração alvo:** 85 a 105 segundos; recalibrar após gravar.

**Na tela:** mostrar a nave andando sem rastro. Clicar dentro do jogo e segurar a seta para a
direita até a nave sair pela borda. Deixar a tela sem a nave por um momento. Não colocar ainda o
bloco de borda.

**Narração:**
> "A nave agora anda sem deixar rastro. Mas será que ela sabe parar na beirada? Clica dentro do
> jogo e segura a seta para a direita. Olha só: ela saiu da tela. Vamos colocar um limite para
> ela continuar à vista."

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Movimento** e a seção **Bordas e
rebatidas**. Arrastar **Manter o sprite dentro da tela** para dentro do **A cada quadro do jogo**,
entre **Mover o sprite com as setas** e **Desenhar o sprite**.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Movimento** e depois **Bordas e rebatidas**. Pega **Manter o
> sprite dentro da tela** e encaixa dentro do **A cada quadro do jogo**, logo abaixo do **Mover
> o sprite com as setas**, antes do **Desenhar o sprite**."

**Na tela:** aproximar no campo que escolhe o sprite, ainda em `heroi`, e no aviso do bloco de
borda. Abrir o aviso e
deixar a mensagem legível. Só depois abrir o seletor, escolher **nave** e mostrar o aviso sumindo.

**Narração:**
> "Apareceu um aviso. Clica nele antes de mudar o campo. Esse bloco está tentando cuidar do
> sprite **heroi**, mas a sua nave se chama **nave**. Abre o campo do sprite e escolhe
> **nave**. Pronto, o aviso sumiu."

**Na tela:** depois que o jogo atualizar, clicar dentro dele e segurar a seta para a direita até
a nave parar na borda. Testar a esquerda também. A nave continua visível, sem rastro.

**Narração:**
> "Agora testa de novo. Clica dentro do jogo e segura a seta até a beirada. A nave parou na
> tela! Testa o outro lado também."

---

## Seção 12. Coloque o céu estrelado

### Clipe `video-fundo-estrelado` · As estrelas entram no jogo
**Duração alvo:** 65 a 80 segundos; recalibrar após gravar.

**Na tela:** mostrar a nave em movimento, sem rastro, sobre a cor lisa. Abrir a categoria
**Jogo 2D**, a subcategoria **Cenários** e a seção **Fundos**. Arrastar **Desenhar fundo de
estrelas** para o fim do **A cada quadro do jogo**, logo abaixo de **Desenhar o sprite**.

**Narração:**
> "Agora a nave anda, para nas beiradas e não deixa rastro. Para o jogo ficar mais parecido com uma aventura
> no espaço, vamos colocar um céu de estrelas. Na categoria **Jogo 2D**, abre **Cenários** e depois **Fundos**.
> Pega **Desenhar fundo de estrelas** e encaixa dentro do **A cada quadro do jogo**, logo
> abaixo do **Desenhar o sprite**, no fim da sequência."

**Na tela:** mostrar o próximo quadro do jogo: o céu estrelado cobre a nave inteira. Segurar a
imagem por um instante e apontar para o bloco da nave ainda presente no projeto.

**Narração:**
> "Ué, cadê a nave? O bloco dela continua aqui, mas o céu entrou por cima do desenho. Vamos
> mudar a ordem para ver o que acontece."

**Na tela:** arrastar **Desenhar fundo de estrelas** para logo abaixo de **Limpar a tela**, antes
de **Mover o sprite com as setas**. Mostrar a nave reaparecendo no jogo. Aproximar no campo de
velocidade das estrelas, já em 1, sem redigitar. Enquadrar a pilha inteira: limpar, estrelas,
mover, manter na tela e desenhar a nave.

**Narração:**
> "Arrasta **Desenhar fundo de estrelas** para logo abaixo de **Limpar a tela**, antes de
> **Mover o sprite com as setas**. Olha, a nave voltou! A velocidade das estrelas já vem em
> **1**; deixa assim. Daqui a pouquinho vamos entender por que essa troca funcionou."

---

## Seção 13. Quem é desenhado depois fica por cima

### Clipe `video-camadas` · Quem é desenhado depois fica na frente
**Duração alvo:** 40 a 50 segundos; recalibrar após gravar.

**Na tela:** duas folhas coloridas sobre a mesa. Colocar a folha azul e depois a amarela por cima.

**Narração:**
> "Você viu a nave sumir e voltar quando a gente trocou a ordem dos blocos. Por que isso
> aconteceu? Olha estas duas folhas. Quando dois desenhos ocupam o mesmo lugar, a ordem
> decide quem fica na frente. A folha que chega
> depois cobre uma parte da que já estava ali."

**Na tela:** inverter as folhas, sem retirar nenhuma delas.

**Narração:**
> "Se eu troco a ordem, a outra aparece na frente. Nenhuma folha sumiu; só a pilha mudou."

**Na tela:** encerrar com as duas folhas lado a lado, sem reproduzir a ordem de desenho da nave e
do fundo da experiência.

**Narração:**
> "A tela do jogo funciona do mesmo jeito. O que é desenhado depois fica por cima e pode cobrir o
> que veio antes."

---

## Seção 14. Quiz do Dia 1

Sem vídeo. O Zappy faz uma ponte curta antes das perguntas sobre o que acontece ao iniciar, o
que se repete e por que criar a nave não basta para ela aparecer. O quiz fica sozinho.

---

## Seção 15. Teste, envie e feche

### Clipe `video-teste-e-envio` · A nave nas duas bordas e o envio
**Duração alvo:** 80 a 95 segundos; recalibrar após gravar.

**Narração:**
> "A nave está pronta: ela aparece, tem um céu de estrelas e responde às setas. Vamos testar se
> ela chega às duas beiradas sem sair da tela; depois vamos enviar o jogo."

**Na tela:** o ponteiro clicando dentro da área do jogo.

**Narração:**
> "E clica dentro da área do jogo, que passa o teclado para ele."

**Na tela:** a seta para a esquerda segurada até a nave encostar na beirada esquerda e parar ali.

**Narração:**
> "Segura a seta para a esquerda. A nave anda, chega na beirada e para."

**Na tela:** a seta para a direita segurada até a nave encostar na beirada direita e parar ali.

**Narração:**
> "Agora a seta para a direita, até a outra beirada. Para de novo."

**Na tela:** a tela do jogo inteira, com a nave se movendo na frente do espaço com estrelas, sem
nenhum rastro atrás dela.

**Narração:**
> "Confere comigo: anda para os dois lados, não passa das beiradas, fica na frente do espaço, e não
> deixa rastro."

**Na tela:** enquadrar a sequência dentro do **A cada quadro do jogo** no Estúdio, de cima
para baixo, antes de enviar.

**Narração:**
> "E confere a ordem no motor: limpar a tela, desenhar as estrelas, mover a nave, manter ela
> dentro da tela e desenhar a nave. Limpar vem primeiro para apagar o desenho antigo antes
> dos desenhos novos."

**Na tela:** a barra do Estúdio com a etiqueta **Salvo**. Depois o botão **Enviar para
o professor** sendo apertado, com a confirmação.

**Narração:**
> "Espera aparecer **Salvo** e aperta o **Enviar para o professor**."

**Na tela:** manter a confirmação do envio visível por um instante.

**Narração:**
> "Pronto! A nave vai de uma beirada à outra e não escapa. Amanhã ela vai aprender a atirar!"

> **Nota de produção.** Nenhuma montagem de bloco neste clipe: ele é teste e envio. O teste
> didático do rastro aconteceu antes das estrelas, sobre o fundo liso. O céu estrelado cobre a
> tela inteira e pode esconder um erro de limpeza; por isso a conferência final inclui a ordem
> dos blocos no Estúdio, não apenas a aparência do jogo. A fala do Zappy abaixo do vídeo convida
> a criança a fazer a conferência no próprio projeto; o clipe não celebra antes dessa ação real.
