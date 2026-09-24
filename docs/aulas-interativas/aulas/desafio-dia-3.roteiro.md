# Roteiro de gravação · Desafio do Primeiro Jogo · Dia 3 · A chuva de pedras

**Como ler este roteiro:** só o texto entre aspas em **Narração** é falado no vídeo. **Na tela**
orienta a gravação; as **Notas de produção** são lembretes para a equipe, não falas para a criança.

## Especificações

- **Formato:** nove clipes, um por seção com vídeo. Os clipes conceituais mostram a relação antes
  da experiência; os práticos mostram o gesto no Estúdio. O projeto de partida é o fim do Dia 2.
- **Duração:** aferir após a gravação. Os três clipes conceituais novos foram planejados para
  aproximadamente 30 a 45 segundos cada, sem duplicar a instrução da cena.
- **Calibração:** ela já traz grupo, relógio do motor, evento de tecla, sprite, velocidade com
  sinal e o trio mover, faxina e desenhar. É novo de verdade nesta aula: o relógio vizinho do motor,
  o sorteio de posição, o nascimento fora da tela e a colisão entre dois grupos com apelido.
- **Conceitos nomeados:** relógio · sorteio · apelido · colisão · retorno pro jogador.
- **Dor desta aula:** o tiro atravessa a pedra como se ela não estivesse ali. Reproduz sempre, e
  está no jogo dela, não em cena. Ela sente a falta no fecho da seção `ciclo-asteroides`, e a
  ferramenta só chega na seção seguinte.
- **Vitória do dia:** pedras caindo do alto em lugares sorteados, e o tiro que acerta uma delas faz
  a pedra explodir com barulho.
- **Valores:** intervalo do relógio **40** quadros · y de nascimento **menos 30** · tamanho base
  **40** · vx **0** · vy **3** · grupos `tiros` e `asteroides` · apelidos `tiro` e `asteroide` ·
  apelido da faxina `sprite`, que já vem escrito, com o fazer vazio.
- **Campos livres:** cor da pedra e cor da explosão. Nenhuma aula posterior cita essas cores como
  fato, então a narração convida e não crava.
- **Nota de produção:** zoom obrigatório em dois pontos. Primeiro no encaixe do `A cada quadros`,
  para dar para ver que ele fica por fora do `A cada quadro do jogo`. Segundo no campo do x do
  bloco da pedra, no instante em que o bloco do sorteio cobre o número que estava ali. No
  `video-fecho`, o enquadramento precisa segurar a pedra que explode e as outras pedras ao mesmo
  tempo, para dar para ver que só uma sumiu.
- **O que NÃO entra, e por quê:**
  - A enumeração dos seis passos, na abertura e no fecho. A aula não é mais contada em passos.
  - A explicação longa do sorteio e do menos de y no clipe prático. O conceito fica no vídeo da
    seção 4; a montagem apenas lembra os valores.
  - A frase "cada vez, o jogo sorteia um lugar novo". O sorteio não garante isso, e a cena mostra
    dois lugares repetindo.
  - A promessa de trocar o 40 por 20 ou 80 no fim da aula. Os dois números continuam assim no Dia 4,
    e a comparação de ritmo já acontece dentro da cena.
  - Qualquer fala que prometa que toda pedra sai com a mesma largura. O kit varia o formato e o
    tamanho real ao redor da base 40.
  - O endereço antigo da explosão, "Kit espaço". Hoje ela está em Jogo 2D › Desenho e efeitos ›
    Partículas.
  - O rótulo `Tocar som de explosão`, que não existe mais. Hoje é `Tocar efeito` com a opção
    explosão.

---

## Seção 1. O que a gente vai fazer hoje

### Clipe `video-abertura` · A chuva de pedras chega
**Duração alvo:** 25 a 35 s · **Palavras:** 62 (cerca de 27 s)

**Na tela:** gravar o jogo do fim do Dia 3 rodando, sem tocar em nenhum bloco. Pedras caindo do alto
em lugares diferentes e a nave se movendo embaixo. Sem placar e sem menu.

**Narração:**
> "Ontem a sua nave aprendeu a atirar, e o tiro subia até sumir sem encontrar nada. Hoje os seus
> tiros vão ter o que **acertar**!"

**Na tela:** mirar numa pedra e apertar a barra de espaço. O tiro acerta, os dois somem, a explosão
aparece com o som. Segurar mais dois segundos com outras pedras descendo.

**Narração:**
> "As pedras vão começar a chegar do alto, uma de cada vez, e o jogo vai aprender a **perceber**
> quando um tiro encontra uma pedra. Quando isso acontece, os dois somem e a pedra explode com
> barulho."

---

## Seção 2. Uma pedra de cada vez

### Clipe `video-intervalo` · Um relógio para as pedras
**Duração alvo:** 40 a 50 segundos; recalibrar após gravar.

**Na tela:** dois relógios esquemáticos, um marcando muitos instantes próximos e outro deixando
espaço entre os sinais. Não animar a chuva de pedras nem mostrar os contadores dos testes da
experiência.

**Narração:**
> "Ontem você usou o motor para mover os tiros a cada quadro. Se ele também criar uma pedra a
> cada quadro, o céu fica cheio delas de uma vez. Parece uma avalanche! Para fazer uma chuva que
> dá tempo de jogar, precisamos de outro relógio, mais lento. Ele espera entre um nascimento e
> outro. Quem faz a pedra cair é o motor que você já conhece. Agora teste essa diferença na
> experiência."

---

## Seção 3. O grupo e o relógio da chuva

### Clipe `video-grupo-e-relogio` · O saquinho das pedras e o relógio vizinho
**Duração alvo:** 55 a 65 s · **Palavras:** 143 (cerca de 63 s)

**Na tela:** Estúdio aberto no projeto do fim do Dia 2, com a área Ao iniciar enquadrada e o `Criar
grupo de sprites` dos tiros à vista como último bloco da pilha.

**Narração:**
> "Ontem você criou um saquinho para guardar os tiros. As pedras também vêm em bando, então hoje entra um
> **segundo** saquinho."

**Na tela:** na categoria Jogo 2D, abrir Grupos, seção Criar e percorrer, e arrastar `Criar grupo de
sprites` até o fim do Ao iniciar, encaixado por baixo do `Criar grupo de sprites` dos tiros.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Grupos**, e dentro dela **Criar e percorrer**. Pega o bloco
> **Criar grupo de sprites** e encaixa no fim do Ao iniciar, logo abaixo do Criar grupo de sprites dos
> tiros."

**Na tela:** zoom no campo que dá nome ao grupo novo, mostrando a palavra asteroides já escrita.

**Narração:**
> "O nome desse grupo já vem escrito **asteroides**, é só deixar."

**Na tela:** na categoria Jogo 2D, abrir Tempo, seção Quadros e intervalos, e arrastar `A cada
quadros` para dentro de Enquanto estiver rodando, encostando a base do `A cada quadro do jogo`.

**Narração:**
> "Agora o relógio. Na categoria **Jogo 2D**, abre **Tempo**, e dentro dela **Quadros e intervalos**.
> Pega o bloco **A cada quadros** e solta dentro do Enquanto estiver rodando, encostado por baixo do A
> cada quadro do jogo."

**Na tela:** zoom no ponto de encaixe, com os dois relógios inteiros no quadro, um embaixo do outro,
nenhum dentro do outro.

**Narração:**
> "Repara no encaixe: ele fica por **fora** do A cada quadro do jogo. Os dois são vizinhos, e um
> relógio não entra dentro do outro."

**Na tela:** clicar no campo do número do `A cada quadros` e escrever 40. Clicar num espaço vazio da
área dos blocos para confirmar.

**Narração:**
> "No número dele, escreve **40**. A cada 40 quadros, o jogo faz o que estiver dentro dele."

---

## Seção 4. De onde vem a próxima pedra

### Clipe `video-sorteio` · Um lugar surpresa, dentro dos limites
**Duração alvo:** 40 a 50 segundos; recalibrar após gravar.

**Na tela:** cartões com lugares possíveis sobre uma régua horizontal; retirar um cartão de um
saquinho para explicar o sorteio, sem mostrar a sequência de pedras ou as marcas produzidas na
experiência. Destacar y −30 como lugar de partida acima da borda, não como velocidade.

**Narração:**
> "Se toda pedra nascer no mesmo lugar, fica fácil saber por onde ela virá. Para trazer surpresa,
> o jogo **sorteia** um x dentro da largura da tela quando cria cada pedra. Um sorteio pode até
> repetir o lugar anterior. Já o y menos 30 marca o lugar onde ela nasce, um pouco acima da tela.
> Depois, a velocidade positiva faz a pedra descer. Experimente esses nascimentos."

---

## Seção 5. A pedra que nasce fora da tela

### Clipe `video-asteroide` · A pedra que nasce fora da tela
**Duração alvo:** 75 a 90 segundos; recalibrar após gravar.

**Na tela:** na categoria Jogo 2D, abrir Kits prontos, seção Espaço, e arrastar `No grupo criar um
asteroide em x y tamanho cor com vx vy` para dentro do `A cada quadros` de 40, que está vazio.

**Narração:**
> "Você já viu por que vale sortear a posição da pedra e fazê-la começar acima da tela. Agora
> vamos montar essa regra no relógio de 40 quadros: cada vez que ele tocar, nascerá uma pedra.
> Na categoria **Jogo 2D**, abre **Kits prontos**, e dentro dela **Espaço**. Pega o bloco **No grupo
> criar um asteroide em x y tamanho cor com vx vy** e encaixa dentro do A cada quadros de 40."

**Na tela:** zoom no primeiro campo do bloco, o do grupo, mostrando asteroides escolhido.

**Narração:**
> "No campo do grupo, confere que está escolhido **asteroides**."

**Na tela:** na categoria Jogo 2D, abrir Sorteios, seção Números e posições, e arrastar `um x
aleatório na tela` por cima do número que já está no campo do x, até o encaixe acontecer. Zoom no
instante em que o bloco cobre o número.

**Narração:**
> "Agora o x. Na categoria **Jogo 2D**, abre **Sorteios**, e dentro dela **Números e posições**. Pega
> o bloco **um x aleatório na tela** e arrasta por cima do número que já está no x, até encaixar."

**Na tela:** trocar y por menos 30 e clicar fora. Conferir tamanho 40 e vx 0, que já vêm no
bloco, sem redigitar. Trocar vy por 3 e clicar fora. Abrir o seletor de cor e escolher uma cor
de pedra.

**Narração:**
> "No y, escreve menos **30** e clica fora para confirmar. O tamanho já vem em **40** e o vx
> em **0**; deixa os dois assim, porque a pedra não vai para os lados. No vy, troca o número
> que veio por **3**, sem o menos, e clica fora. Assim ela desce. E a cor é sua."

**Na tela:** clicar num espaço vazio da área dos blocos, depois enquadrar o relógio e a tela do
jogo. O bloco de nascimento está no lugar, mas nenhuma pedra aparece ainda: o motor ainda não
recebeu os blocos que movem e desenham o grupo.

**Narração:**
> "A regra de nascimento está pronta. Ainda não apareceu pedra na tela, e está tudo bem. Daqui
> a pouquinho, vamos ensinar o motor a mover e desenhar esse grupo."

---

## Seção 6. As pedras caem, e o tiro passa reto

### Clipe `video-ciclo-asteroides` · O mesmo padrão, agora com as pedras
**Duração alvo:** 100 a 120 segundos; recalibrar após gravar.

**Na tela:** na categoria Jogo 2D, abrir Grupos, seção Movimento, e arrastar `Mover os sprites do
grupo usando suas velocidades` para dentro do `A cada quadro do jogo`, encaixado por baixo do
`Desenhar o grupo` dos tiros.

**Narração:**
> "O relógio já cria as pedras, mas o motor ainda não as move nem desenha. Vamos dar a elas o
> mesmo cuidado que os tiros já têm: mover, retirar quando saírem da tela e desenhar. Na
> categoria **Jogo 2D**, abre **Grupos**, e dentro dela **Movimento**. Pega **Mover os sprites do
> grupo usando suas velocidades** e encaixa dentro do A cada quadro do jogo, logo abaixo do Desenhar o
> grupo dos tiros."

**Na tela:** na categoria Jogo 2D, abrir Grupos, seção Participação e limpeza, e arrastar `Tirar do
grupo quem sair da tela, para cada um (chamado )` encaixado por baixo do bloco anterior. Manter o
fazer vazio no quadro.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Grupos**, e dentro dela **Participação e limpeza**. Pega **Tirar
> do grupo quem sair da tela, para cada um** e encaixa logo abaixo do Mover os sprites do grupo. O
> apelido já vem escrito sprite, e o fazer fica vazio."

**Na tela:** na categoria Jogo 2D, abrir Grupos, seção Desenho e ordem, e arrastar `Desenhar o
grupo` encaixado por baixo do bloco da limpeza.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Grupos**, e dentro dela **Desenho e ordem**. Pega **Desenhar o
> grupo** e encaixa logo abaixo do Tirar do grupo quem sair da tela."

**Na tela:** abrir os três menus de grupo em sequência e escolher asteroides em cada um. Terminar
com os três blocos enquadrados juntos, com a palavra asteroides visível nos três.

**Narração:**
> "Agora abre o menu de grupo de cada um dos três blocos que acabamos de encaixar. No **Mover
> os sprites do grupo**, escolhe **asteroides**. No **Tirar do grupo quem sair da tela**, escolhe
> **asteroides**. No **Desenhar o grupo**, escolhe **asteroides** também. A gente já fez isso com
> os tiros; agora a mesma sequência cuida das pedras."

**Na tela:** clicar na área do jogo. Deixar as pedras entrarem por cima e caírem. Mirar em uma e
apertar a barra de espaço; o tiro atravessa a pedra, sem explosão. Não corrigir o jogo neste clipe.

**Narração:**
> "Agora as pedras aparecem e caem. Tenta acertar uma com um tiro. Ele atravessa a pedra! Criar,
> mover e desenhar os dois grupos não ensina o jogo a perceber quando eles se encontram. É essa
> peça que falta."

---

## Seção 7. Quem some na trombada?

### Clipe `video-apelidos` · Só os dois desta colisão
**Duração alvo:** 40 a 50 segundos; recalibrar após gravar.

**Na tela:** três tiros e três pedras. Um par se toca e recebe destaque visual, sem desaparecer;
o restante continua visível. Não demonstrar o resultado da experiência antes da criança agir.

**Narração:**
> "Você viu o tiro atravessar a pedra. Falta ensinar ao jogo o que fazer quando os dois se
> encontram. O jogo guarda todos os tiros num grupo e todas as pedras em outro. Quando um tiro encosta
> numa pedra, a gente chama esse encontro de **colisão**. Olha aqui. Tem vários tiros e várias
> pedras, mas só **este tiro** e **esta pedra** se encostaram. O bloco de colisão dá um apelido
> para cada um deles. Assim a ordem pode agir só nos dois, sem tirar os grupos inteiros. Teste
> as duas escolhas na experiência."

---

## Seção 8. Faça o acerto acontecer

### Clipe `video-colisao` · Os dois que se bateram
**Duração alvo:** 85 a 105 segundos; recalibrar após gravar.

**Na tela:** o jogo rodando, com vários tiros subindo e várias pedras caindo ao mesmo tempo. Segurar
o enquadramento na tela cheia, sem zoom.

**Narração:**
> "Você já viu por que usamos os apelidos. Agora vamos montar a colisão no seu jogo."

**Na tela:** na categoria Jogo 2D, abrir Colisões, seção Encostar e bloquear, e arrastar `Para cada
colisão entre os grupos e` para o fim do `A cada quadro do jogo`, encaixado por baixo do `Desenhar o
grupo` dos asteroides.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Colisões**, e dentro dela **Encostar e bloquear**. Pega **Para
> cada colisão entre os grupos e** e encaixa dentro do A cada quadro do jogo, abaixo do Desenhar o
> grupo dos asteroides."

**Na tela:** aproximar nos dois menus de grupo, que já mostram tiros e asteroides. Conferir sem
trocar. Zoom nos dois campos de apelido, com tiro e asteroide já escritos.

**Narração:**
> "O primeiro grupo já está em **tiros**, e o segundo, em **asteroides**. Confere e deixa assim.
> Os apelidos **tiro** e **asteroide** também já vêm escritos para os dois que se encostarem."

**Na tela:** montar os dois primeiros blocos dentro do fazer da colisão, um encaixado por baixo do
outro, preenchendo os menus na hora.

**Narração:**
> "Dentro do **fazer** da colisão vão quatro blocos, um embaixo do outro. Primeiro, na categoria
> **Jogo 2D**, abre **Grupos** e depois **Participação e limpeza**. Pega **Tirar o sprite do grupo**
> e encaixa no primeiro lugar do **fazer**. Nele, escolhe o sprite **tiro** e o grupo **tiros**.
> Agora, ainda em **Jogo 2D**, **Grupos**, **Participação e limpeza**, pega outro **Tirar o sprite
> do grupo**. Encaixa logo abaixo do primeiro. Nesse segundo bloco, escolhe o sprite
> **asteroide** e o grupo **asteroides**."

**Na tela:** montar os dois últimos blocos por baixo dos dois primeiros. Abrir o menu do efeito com
a lista à vista antes de escolher explosão.

**Narração:**
> "Terceiro bloco: na categoria **Jogo 2D**, abre **Desenho e efeitos** e depois **Partículas**.
> Pega **Soltar explosão no sprite cor** e encaixa abaixo do segundo bloco. Escolhe o sprite
> **asteroide** e uma cor para a explosão. Quarto bloco: ainda na categoria **Jogo 2D**, abre
> **Som** e depois **Efeitos prontos**. Pega **Tocar efeito** e encaixa abaixo da explosão. Abre
> o menu do efeito e escolhe **explosão**, que não vem escolhida."
---

## Seção 9. Quiz do Dia 3

Sem vídeo. O Zappy faz uma única ponte curta: "Hora de conferir o que você descobriu sobre o
relógio e as colisões. Pense no que viu nas experiências antes de escolher." O quiz fica sozinho,
antes da entrega.

---

## Seção 10. Teste, envie e fecha

### Clipe `video-fecho` · A sua chuva de pedras está pronta
**Duração alvo:** 75 a 90 segundos; recalibrar após gravar.

**Na tela:** o jogo do fim do Dia 3 com o Estúdio aberto. O cursor clica dentro da área do jogo, e a
borda de foco aparece.

**Narração:**
> "A colisão já está montada. Vamos testar um tiro que acerta a pedra e outro que passa pelo
> vazio, para conferir o que o jogo faz. Depois, vamos enviar o projeto. Primeiro, clica dentro
> da área do jogo. Esse clique avisa que o teclado agora é dele."

**Na tela:** mirar numa pedra e apertar a barra de espaço. O tiro encontra a pedra, os dois somem
juntos, a explosão aparece e o som toca.

**Narração:**
> "Agora mira numa pedra e aperta a barra de espaço. Os dois somem juntos, e a pedra explode!"

**Na tela:** apertar a barra de espaço com a mira no vazio. O tiro sobe inteiro e sai pela borda de
cima, sem encontrar nada.

**Narração:**
> "Atira de novo, agora no vazio. Esse tiro sobe até sair pela borda de cima, e ninguém explode."

**Na tela:** segurar alguns segundos parados. As outras pedras continuam descendo e saem pela borda
de baixo, inteiras. Enquadramento largo, mostrando a tela toda.

**Narração:**
> "E olha as outras pedras: elas continuam caindo. Só sumiu a que foi **atingida**."

**Na tela:** enquadrar o campo do número do `A cada quadros`, mostrando 40. Depois enquadrar o campo
do vy do bloco da pedra, mostrando 3. Não abrir nem editar nenhum dos dois.

**Narração:**
> "Antes de enviar, confere dois números: o relógio está em **40** e o vy da pedra está em **3**. Os
> dois continuam assim amanhã."

**Na tela:** esperar a etiqueta Salvo aparecer e então apertar Enviar para o professor.
Mostrar a confirmação do envio.

**Narração:**
> "Espera aparecer a etiqueta Salvo e aperta o Enviar para o professor."

**Na tela:** o jogo rodando alguns segundos, com uma pedra explodindo no meio da fala.

**Narração:**
> "A chuva de pedras já funciona e os tiros conseguem destruir! Você usou um relógio para decidir
> quando uma pedra nasce e uma colisão para responder ao encontro de dois objetos. Amanhã cada acerto
> vai valer ponto, e a sua nave vai ganhar vidas."
