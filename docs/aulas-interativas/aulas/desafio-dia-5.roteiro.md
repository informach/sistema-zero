# Roteiro de gravação · Desafio do Primeiro Jogo · Dia 5 · O jogo ganha começo e fim

## Especificações

- **Formato:** gravação da tela do Estúdio com narração por cima. Dez clipes, um ou dois por seção
  com vídeo. O projeto de partida é o do fim do Dia 4.
- **Duração:** 700 a 840 segundos de clipe somados, narração pura de 1.710 palavras a **137
  palavras por minuto**, que é o ritmo real medido em gravação. É a aula mais longa das cinco.
- **Calibração:** ela já traz variável, leitura de variável dentro de outro bloco, evento de tecla,
  relógio, duas colisões, vida do sprite e HUD. É novo de verdade nesta aula: a constante, o estado
  do jogo, embrulhar no Se, o senão se, o desenho de tela e o reinício.
- **Conceitos nomeados:** constante · estados do jogo · embrulhar no Se · senão se · reiniciar.
- **Dor desta aula:** a tela fica preta assim que a partida entra na pergunta. Reproduz sempre, é do
  jogo dela, e fecha a seção `embrulhar`. A ferramenta que resolve, o `Mostrar tela com título
  subtítulo dica fundo`, só chega na seção `telas`, três seções depois.
- **Vitória do dia:** uma tela de abertura com o nome do jogo, uma partida que só começa no Enter, e
  dois finais de verdade.
- **Valores:** `alvo` **26** · momentos `inicio`, `jogando`, `vitoria` e `fim` · dica da abertura
  **Aperte Enter para começar** · dica dos dois finais **Aperte Enter para voltar ao início** ·
  título da vitória **Você Ganhou** · título da derrota **Você Perdeu** · sinal da comparação
  **maior ou igual**.
- **Campos livres:** título, subtítulo e cor de fundo de cada uma das três telas. A narração diz o
  título que ela usou como exemplo, **Nave contra Asteroides**, e deixa claro que é escolha de quem
  faz. As duas dicas não são livres: elas dizem o que o Enter faz de verdade.
- **Nota de produção:** o `video-embrulhar` é o único clipe do curso que mostra a manobra inteira,
  então ele não pode ter corte entre as quatro etapas. Zoom e pausa obrigatórios no contorno do
  então, com o começo e o fim da cadeia conferidos. No `video-ciclo-completo`, o enquadramento do
  passo do primeiro Enter precisa segurar o placar em zero e os três corações inteiros, porque é a
  correção mais importante do clipe. O mesmo clipe mostra o botão Compartilhar liberando **depois**
  do envio, nunca antes.
- **O que NÃO entra, e por quê:**
  - A enumeração dos sete passos, na abertura e no fecho.
  - Os rótulos vencidos. `Ir para a tela` hoje é `Mudar o estado do jogo para`, `a tela atual é` hoje
    é `o estado do jogo é ?`, e a subcategoria "Telas e cenas" hoje é Jogo e telas › Telas e
    partida. Chamar o estado de tela desfaz justamente a distinção que a aula ensina.
  - A frase que diz que o Enter recomeça a partida zeradinha. Ele volta para a abertura, e é preciso
    apertar de novo.
  - As dicas "Aperte Enter para jogar novamente" e "Aperte Enter para tentar novamente". As duas
    prometem o que o Enter não faz ali.
  - Qualquer promessa de prioridade da vitória. Se os dois finais valerem no mesmo quadro, a
    pergunta de baixo é a última respondida e o jogo termina em `fim`.
  - Qualquer descrição, promessa ou antecipação dos campos da janela de publicação, inclusive a
    geração de capa. O que a janela pede é configuração do professor e pode mudar.
  - Qualquer afirmação de que a publicação já aconteceu. Ela é uma escolha, e vem depois do envio.

---

## Seção 1. O que a gente vai fazer hoje

### Clipe `video-abertura` · O jogo ganha começo e fim
**Duração alvo:** 30 a 40 s · **Palavras:** 69 (cerca de 30 s)

**Na tela:** o jogo pronto, aberto na tela de abertura com o nome. Apertar Enter e mostrar um trecho
curto de partida.

**Narração:**
> "Hoje o seu jogo ganha começo e fim! Ele vai abrir numa tela com o nome que você escolher, e a
> partida só começa quando alguém apertar o Enter."

**Na tela:** deixar as vidas acabarem até a tela de derrota, depois cortar para uma partida que
chega na tela de vitória.

**Narração:**
> "A gente vai guardar a partida inteira atrás de uma pergunta, montar as telas, e ensinar o Enter a
> comandar tudo. É a aula mais longa das cinco, e o seu projeto fica guardado se você precisar parar
> no meio."

---

## Seção 2. Os quatro momentos do jogo

### Clipe `video-telas` · Os quatro momentos do jogo
**Duração alvo:** 40 a 50 s · **Palavras:** 92 (cerca de 40 s)

**Na tela:** quatro cartões entrando um de cada vez, escritos inicio, jogando, vitoria e fim. Nenhuma
seta ainda.

**Narração:**
> "O seu jogo vai ter quatro momentos: **inicio**, **jogando**, **vitoria** e **fim**. Ele guarda um
> de cada vez, e o momento que está guardado é que decide o que o jogo faz agora."

**Na tela:** uma seta do cartão inicio para o cartão jogando, com a palavra Enter escrita em cima
dela. Nenhuma outra seta na tela.

**Narração:**
> "Do **inicio** para o **jogando**, quem leva é o Enter. Enquanto o momento guardado for inicio, a
> partida não anda."

**Na tela:** a seta anterior apaga. Entra uma seta do cartão jogando para o cartão vitoria, com o
número 26 escrito em cima dela.

**Narração:**
> "Do **jogando** para o **vitoria**, quem leva são os pontos chegando na meta, que vai ser **26**."

**Na tela:** a seta anterior apaga. Entra uma seta do cartão jogando para o cartão fim, com três
corações vazios desenhados em cima dela.

**Narração:**
> "E do **jogando** para o **fim**, quem leva são as vidas acabando. Esses três caminhos são o que
> você vai montar hoje."

### Clipe `video-alvo` · A meta e o primeiro momento
**Duração alvo:** 45 a 55 s · **Palavras:** 121 (cerca de 53 s)

**Na tela:** a área Ao iniciar enquadrada, com o `Criar variável com valor` dos pontos e o `Dar ao
sprite de vida` à vista.

**Narração:**
> "Para saber quando alguém ganhou, o jogo precisa de uma meta: **26** pedras destruídas. A caixa dos
> pontos muda o tempo todo, e essa aqui não muda nunca. Caixa que não muda tem nome próprio:
> **constante**. É uma caixinha lacrada."

**Na tela:** na categoria Programação, abrir 🏷️ Variáveis e arrastar `Criar constante com valor`
para dentro do Ao iniciar, encaixado por baixo do `Dar ao sprite de vida`.

**Narração:**
> "Na categoria **Programação**, abre **Variáveis**. Pega **Criar constante com valor** e encaixa
> dentro do Ao iniciar, logo abaixo do Dar ao sprite de vida."

**Na tela:** escrever alvo no campo do nome e 26 no campo do valor, parando o cursor em cada um.

**Narração:**
> "No nome, escreve **alvo**. No valor, **26**."

**Na tela:** na categoria Jogo 2D, abrir Jogo e telas, seção Telas e partida, e arrastar `Mudar o
estado do jogo para` até o fim do Ao iniciar, encaixado por baixo do `Criar constante com valor`.

**Narração:**
> "Agora o primeiro momento. Na categoria **Jogo 2D**, abre **Jogo e telas**, e dentro dela **Telas e
> partida**. Pega **Mudar o estado do jogo para** e encaixa como último bloco do Ao iniciar, logo
> abaixo do Criar constante com valor."

**Na tela:** zoom no menu do bloco, mostrando inicio já escolhido. Abrir a lista para os quatro
momentos aparecerem e fechar sem trocar.

**Narração:**
> "No menu dele já vem **inicio** escolhido, é só deixar."

---

## Seção 4. Embrulhe a partida numa pergunta

### Clipe `video-embrulhar` · Embrulhar no Se, do começo ao fim
**Duração alvo:** 95 a 115 s · **Palavras:** 220 (cerca de 96 s)

**Na tela:** a área Enquanto estiver rodando enquadrada inteira, com a cadeia do `A cada quadro do
jogo` rolando do `Limpar a tela` até o `Desenhar as vidas do sprite como em x y tamanho cor`.

**Narração:**
> "Hoje a partida inteira mora solta dentro do motor, e roda desde o instante em que a página abre. A
> gente vai trancar ela atrás de uma pergunta."

**Na tela:** na categoria Programação, abrir ❓ Lógica & Se e arrastar `Condição se, senão se e
senão` para o topo do `A cada quadro do jogo`, encaixado por cima do `Limpar a tela`. Gravar sem
corte a partir daqui.

**Narração:**
> "Isso que a gente vai fazer agora tem nome: **embrulhar no Se**. São sempre quatro etapas. Uma: na
> categoria **Programação**, abre **Lógica e Se**. Pega **Condição se, senão se e senão** e encaixa no
> topo do A cada quadro do jogo, logo acima do Limpar a tela."

**Na tela:** arrastar a comparação de fábrica para fora do buraco da pergunta e apagar, com o buraco
vazio à vista.

**Narração:**
> "Duas: o Se já vem com uma comparação de fábrica na pergunta. Arrasta ela para fora e apaga."

**Na tela:** na categoria Jogo 2D, abrir Jogo e telas, seção Telas e partida, e arrastar `o estado do
jogo é ?` para o buraco vazio da pergunta. Abrir o menu, mostrar a lista e escolher jogando.

**Narração:**
> "Três: na categoria **Jogo 2D**, abre **Jogo e telas**, e dentro dela **Telas e partida**. Pega **o
> estado do jogo é ?** e encaixa no buraco da pergunta, onde estava a comparação. No menu dele,
> escolhe **jogando**, porque ele vem em inicio."

**Na tela:** pegar a cadeia pelo `Limpar a tela` e arrastar, com todos os blocos de baixo
acompanhando, para dentro do então. Mostrar o arraste inteiro, sem atalho de teclado e sem cópia.

**Narração:**
> "Quatro: pega a sequência que já existia pelo primeiro bloco dela, o **Limpar a tela**, e solta
> dentro do então. Quando você arrasta o primeiro, todos os que estão encaixados embaixo vêm junto. E
> é **arrastar**, nunca copiar: se copiar, ficam dois jogos rodando ao mesmo tempo."

**Na tela:** zoom e pausa no contorno do então. Rolar de cima para baixo dentro dele, parando no
`Limpar a tela` e depois no `Desenhar as vidas do sprite como em x y tamanho cor`.

**Narração:**
> "Agora confere o contorno do então. No começo da cadeia, dentro dele, o **Limpar a tela**. No fim,
> ainda dentro dele, o **Desenhar as vidas do sprite como em x y tamanho cor**. A partida inteira
> ficou de dentro."

---

## Seção 5. O relógio e a barra de espaço também perguntam

### Clipe `video-relogio-e-tiro` · A mesma manobra em mais dois lugares
**Duração alvo:** 95 a 110 s · **Palavras:** 225

**Na tela:** rolar até o `A cada quadros` de 40, com o `No grupo criar um asteroide em x y tamanho
cor com vx vy` dentro dele.

**Narração:**
> "Agora é embrulhar no Se outra vez, em dois lugares, com as mesmas quatro etapas."

**Na tela:** na categoria Programação, abrir ❓ Lógica & Se e arrastar `Condição se, senão se e
senão` para dentro do `A cada quadros` de 40, encaixado por cima do `No grupo criar um asteroide`.
Tirar a comparação de fábrica e apagar.

**Narração:**
> "Na categoria **Programação**, abre **Lógica e Se**. Pega **Condição se, senão se e senão** e
> encaixa dentro do A cada quadros de 40, logo acima do No grupo criar um asteroide. Tira a comparação
> de fábrica e apaga."

**Na tela:** na categoria Jogo 2D, abrir Jogo e telas, seção Telas e partida, e arrastar `o estado do
jogo é ?` para o buraco da pergunta, escolhendo jogando. Depois arrastar o bloco da pedra para
dentro do então.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Jogo e telas**, e dentro dela **Telas e partida**. Pega **o estado
> do jogo é ?**, encaixa no buraco da pergunta e escolhe **jogando** no menu. Depois arrasta o No
> grupo criar um asteroide para dentro do então."

**Na tela:** rolar até a área Quando acontecer e enquadrar o `Quando apertar a tecla` da barra de
espaço com os dois blocos dentro. Repetir as três primeiras etapas, mais rápido.

**Narração:**
> "Agora o evento, com as mesmas quatro etapas dentro do Quando apertar a tecla da barra de espaço.
> Uma: em **Programação**, **Lógica e Se**, o **Condição se, senão se e senão**. Duas: a comparação de
> fábrica para fora. Três: em **Jogo 2D**, **Jogo e telas**, **Telas e partida**, o **o estado do jogo
> é ?** com **jogando**."

**Na tela:** arrastar o `Criar tiro no grupo` para dentro do então, com o `Tocar efeito` vindo junto
por estar encaixado embaixo.

**Narração:**
> "Quatro: arrasta os dois blocos que já estavam lá, o **Criar tiro no grupo** e o **Tocar efeito**,
> para dentro do então, nessa ordem."

**Na tela:** clicar num espaço vazio da área dos blocos, clicar na área do jogo e apertar a barra de
espaço várias vezes. Segurar alguns segundos com a tela preta parada.

**Narração:**
> "Clica na área do jogo e aperta a barra de espaço várias vezes. Nada sai, e nenhuma pedra nasce."

**Na tela:** depois do teste, enquadrar a etiqueta **Salvo** do Estúdio embutido. Mostrar a passagem
para a seção seguinte sem avançar a seção da criança no vídeo.

**Narração:**
> "Quando você terminar estes dois encaixes e a seção estiver concluída, este é um bom lugar para
> parar. Espere aparecer **Salvo**. Depois, volte pelo mesmo aparelho e continue na próxima seção."

---

## Seção 6. O jogo decide quando acaba

### Clipe `video-finais` · A vitória pergunta primeiro
**Duração alvo:** 95 a 110 s · **Palavras:** 229

**Na tela:** mostrar rapidamente os três lugares protegidos: motor, relógio e evento da barra de
espaço.

**Narração:**
> "Agora o motor, o relógio e o tiro só agem enquanto o jogo está em **jogando**. Faltam as
> perguntas que decidem como ele acaba."

**Na tela:** rolar até o fim do então de jogando, com o `Desenhar as vidas do sprite como em x y
tamanho cor` como último bloco de dentro. Na categoria Programação, abrir ❓ Lógica & Se e arrastar
`Condição se, senão se e senão` encaixado por baixo dele, ainda dentro do então.

**Narração:**
> "A primeira é a vitória. As duas moram no finalzinho do então de jogando, depois do Desenhar as
> vidas do sprite. Na categoria **Programação**, abre **Lógica e Se**. Pega **Condição se, senão se e
> senão** e encaixa ali. A comparação de fábrica serve, e você não tira nada."

**Na tela:** abrir o menu do `valor da variável` da esquerda e escolher pontos. Abrir o menu do sinal
e escolher o maior ou igual. Na categoria Programação, abrir 🔣 Valores e arrastar outro `valor da
variável` por cima do número da direita, escolhendo alvo. Zoom no encaixe.

**Narração:**
> "Do lado esquerdo já tem um valor da variável: escolhe **pontos**. No sinal do meio, o **maior ou
> igual**. Do lado direito tem um número, e por cima dele, da categoria **Programação**, **Valores**,
> arrasta outro **valor da variável**, com **alvo**."

**Na tela:** na categoria Jogo 2D, abrir Jogo e telas, seção Telas e partida, e arrastar `Mudar o
estado do jogo para` para dentro do então dessa pergunta. Abrir o menu e escolher vitoria.

**Narração:**
> "Dentro dessa pergunta: na categoria **Jogo 2D**, abre **Jogo e telas**, e dentro dela **Telas e
> partida**. Pega **Mudar o estado do jogo para**, com **vitoria** no menu."

**Na tela:** na categoria Programação, abrir ❓ Lógica & Se e arrastar outro `Condição se, senão se e
senão` encaixado por baixo do primeiro. Tirar a comparação de fábrica e apagar.

**Narração:**
> "Agora a derrota. Na categoria **Programação**, abre **Lógica e Se**. Pega outro **Condição se,
> senão se e senão** e encaixa abaixo do primeiro. Tira a comparação de fábrica e apaga."

**Na tela:** na categoria Jogo 2D, abrir Vida e placar, seção Vida, e arrastar `as vidas do sprite
acabaram?` para o buraco da pergunta, escolhendo nave. Depois arrastar `Mudar o estado do jogo para`
para dentro, escolhendo fim.

**Narração:**
> "No lugar dela, na categoria **Jogo 2D**, abre **Vida e placar**, e dentro dela **Vida**. Pega **as
> vidas do sprite acabaram?**, com a **nave**. Dentro dessa pergunta, mais um **Mudar o estado do jogo
> para**, de **Jogo 2D**, **Jogo e telas**, **Telas e partida**, com **fim**."

**Na tela:** afastar o enquadramento e dar uma volta lenta mostrando as duas perguntas encostadas,
uma em cima da outra, com o cursor passando primeiro pela de cima e depois pela de baixo.

**Narração:**
> "Repara na ordem: a vitória pergunta primeiro, e a derrota pergunta abaixo dela."

---

## Seção 7. Desenhe as três telas

### Clipe `video-mostrar-telas` · As três telas ganham texto
**Duração alvo:** 85 a 100 s · **Palavras:** 222 (cerca de 97 s)

**Na tela:** enquadrar a base do `Condição se, senão se e senão` grande, com o botão mais senão se à
vista. Clicar nele três vezes, mostrando os três ramos novos aparecendo.

**Narração:**
> "O seu Se grande pode ganhar irmãos. Embaixo dele tem um botãozinho escrito **mais senão se**. Clica
> nele três vezes, uma para cada momento que falta."

**Na tela:** no primeiro senão se, arrastar a comparação de fábrica para fora e apagar. Na categoria
Jogo 2D, abrir Jogo e telas, seção Telas e partida, e arrastar `o estado do jogo é ?` para o buraco
da pergunta. Abrir o menu e escolher inicio.

**Narração:**
> "No primeiro senão se, tira a comparação de fábrica e apaga. Na categoria **Jogo 2D**, abre **Jogo
> e telas**, e dentro dela **Telas e partida**. Pega **o estado do jogo é ?**, encaixa no buraco da
> pergunta e escolhe **inicio** no menu."

**Na tela:** na categoria Jogo 2D, abrir Jogo e telas, seção Telas e partida, e arrastar `Mostrar
tela com título subtítulo dica fundo` para dentro desse primeiro senão se.

**Narração:**
> "Dentro dele, na categoria **Jogo 2D**, abre **Jogo e telas**, e dentro dela **Telas e partida**.
> Pega **Mostrar tela com título subtítulo dica fundo** e encaixa."

**Na tela:** preencher os quatro campos, um de cada vez, com o cursor parando em cada um: título,
subtítulo, dica e o seletor de cor do fundo.

**Narração:**
> "No título, escreve o nome do seu jogo. O meu é **Nave contra Asteroides**. No subtítulo, **Destrua
> os asteroides**. Na dica, **Aperte Enter para começar**. E no fundo, uma cor que deixe as letras
> aparecerem."

**Na tela:** montar o segundo senão se inteiro, em ritmo mais rápido, e parar com os campos
preenchidos à vista.

**Narração:**
> "No segundo senão se, a receita é a mesma, com o **o estado do jogo é ?** e o **Mostrar tela com
> título subtítulo dica fundo**, os dois de **Jogo 2D**, **Jogo e telas**, **Telas e partida**. A
> pergunta é **vitoria**, o título é **Você Ganhou**, e a dica é **Aperte Enter para voltar ao
> início**."

**Na tela:** montar o terceiro senão se do mesmo jeito e parar com os campos preenchidos à vista.

**Narração:**
> "No terceiro, a pergunta é **fim**, o título é **Você Perdeu**, e a dica é a mesma: **Aperte Enter
> para voltar ao início**."

**Na tela:** zoom nos dois campos de dica, o da vitória e o da derrota, lado a lado.

**Narração:**
> "Nesses dois, o Enter volta para a abertura, e é preciso apertar de novo para jogar."

---

## Seção 8. O Enter comanda o jogo

### Clipe `video-enter` · A mesma tecla, três respostas
**Duração alvo:** 80 a 95 s · **Palavras:** 214 (cerca de 94 s)

**Na tela:** rolar até a área Quando acontecer. Na categoria Jogo 2D, abrir Controles, seção Teclado,
ações e toque, e arrastar `Quando apertar a tecla` encaixado por baixo do `Quando apertar a tecla` da
barra de espaço.

**Narração:**
> "Falta a última peça: o Enter. Na categoria **Jogo 2D**, abre **Controles**, e dentro dela
> **Teclado, ações e toque**. Pega **Quando apertar a tecla** e encaixa dentro do Quando acontecer,
> logo abaixo do Quando apertar a tecla da barra de espaço."

**Na tela:** abrir o menu de teclas com a lista inteira à vista e escolher Enter.

**Narração:**
> "No menu de teclas, escolhe o **Enter**, que não vem escolhido."

**Na tela:** na categoria Programação, abrir ❓ Lógica & Se e arrastar `Condição se, senão se e
senão` para dentro do evento novo. Tirar a comparação de fábrica e apagar.

**Narração:**
> "Dentro dele, na categoria **Programação**, abre **Lógica e Se**. Pega **Condição se, senão se e
> senão**, tira a comparação de fábrica e apaga."

**Na tela:** montar o primeiro ramo: `o estado do jogo é ?` com inicio na pergunta, e `Mudar o estado
do jogo para` com jogando dentro dele.

**Narração:**
> "Na pergunta de cima, na categoria **Jogo 2D**, abre **Jogo e telas**, e dentro dela **Telas e
> partida**. Pega **o estado do jogo é ?** e escolhe **inicio**. Dentro dela, do mesmo **Jogo 2D**,
> **Jogo e telas**, **Telas e partida**, o **Mudar o estado do jogo para**, com **jogando**."

**Na tela:** clicar no botão mais senão se duas vezes. No primeiro ramo novo, montar a pergunta com
fim e encaixar `Reiniciar o jogo` dentro.

**Narração:**
> "Clica no **mais senão se** duas vezes. No primeiro, a pergunta é **fim**, e dentro vai um bloco
> novo: de **Jogo 2D**, **Jogo e telas**, **Telas e partida**, o **Reiniciar o jogo**."

**Na tela:** no segundo ramo novo, montar a pergunta com vitoria e encaixar outro `Reiniciar o jogo`
dentro.

**Narração:**
> "No segundo senão se, a pergunta é **vitoria**, e dentro vai outro **Reiniciar o jogo**, do mesmo
> **Jogo 2D**, **Jogo e telas**, **Telas e partida**."

**Na tela:** zoom nos dois buracos de pergunta dos senão se, mostrando a comparação de fábrica sendo
retirada antes do encaixe em cada um.

**Narração:**
> "Nos dois senão se, a pergunta vem do **o estado do jogo é ?**, e a comparação de fábrica sai
> antes."

**Na tela:** afastar o enquadramento e mostrar o evento inteiro, com os três ramos visíveis de uma
vez.

**Narração:**
> "A mesma tecla, três respostas diferentes, porque o jogo sabe em que momento está."

---

## Seção 10. Teste, entregue e mostre para o mundo

### Clipe `video-ciclo-completo` · Do menu ao recomeço
**Duração alvo:** 100 a 120 s · **Palavras:** 228 (cerca de 101 s)

**Na tela:** o jogo do fim do Dia 5 com o Estúdio aberto, parado na tela de abertura. O cursor clica
dentro da área do jogo.

**Narração:**
> "Agora o percurso inteiro, do menu ao recomeço, uma vez só."

**Na tela:** apertar a barra de espaço algumas vezes com o enquadramento na tela inteira do jogo,
para dar para ver que nenhum tiro sai e nenhuma pedra nasce.

**Narração:**
> "Clica dentro da área do jogo. A tela de abertura está lá, com o nome do seu jogo."

**Na tela:** continuar apertando a barra de espaço, segurando a tela parada por alguns segundos.

**Narração:**
> "Aperta a barra de espaço algumas vezes. Nenhum tiro sai, e nenhuma pedra nasce: o relógio continua
> batendo, mas o momento guardado ainda é inicio."

**Na tela:** apertar Enter. A partida começa: a nave anda, as pedras nascem, o tiro sai.

**Narração:**
> "Agora aperta o **Enter**. A partida começou: a nave anda, as pedras nascem e o tiro sai."

**Na tela:** deixar as três pedras baterem, com os corações apagando um a um, até a tela de Você
Perdeu. Acelerar o tempo repetido de jogo.

**Narração:**
> "Deixa as três vidas acabarem, sem desviar das pedras. Quando o último coração apaga, a tela de
> **Você Perdeu** aparece, e a partida para."

**Na tela:** apertar Enter uma vez. A tela de abertura volta. Segurar o enquadramento no canto de
cima, com o placar em zero e os três corações inteiros.

**Narração:**
> "Aperta o Enter. Repara bem: ele **não** começa a partida. Ele te devolve para a tela de abertura,
> com o placar em zero e os três corações inteiros."

**Na tela:** apertar Enter de novo e jogar a partida seguinte, acelerada, até o placar chegar em 26
e a tela de vitória aparecer.

**Narração:**
> "É o **segundo** Enter que começa a partida nova. Aperta de novo e joga até os pontos chegarem em
> 26."

**Na tela:** a tela de Você Ganhou parada por alguns segundos.

**Narração:**
> "A tela de **Você Ganhou** apareceu. O seu jogo tem começo, meio, fim e recomeço!"

**Na tela:** esperar a etiqueta Salvo aparecer e apertar Enviar para o professor.
Mostrar a confirmação do envio.

**Narração:**
> "Espera aparecer a etiqueta Salvo e aperta o Enviar para o professor."

**Na tela:** o botão Compartilhar saindo do estado travado depois do envio. Enquadrar o botão antes
e depois.

**Narração:**
> "Depois do envio, o botão **Compartilhar** libera. Ele dá ao seu jogo um link só dele, e quem abrir
> esse link consegue jogar. Você não precisa deixar o seu perfil público para isso."

**Na tela:** clicar no Compartilhar e deixar a janela abrir. Não percorrer campo nenhum, não
preencher nada e não concluir a publicação na gravação.

**Narração:**
> "Publicar é uma escolha, não um passo obrigatório da entrega. Clica no Compartilhar, confere o que a
> janela pedir e publica quando você quiser mostrar."

### Clipe `video-fecho` · O seu primeiro jogo está pronto
**Duração alvo:** 35 a 45 s · **Palavras:** 90 (cerca de 39 s)

**Na tela:** o jogo completo rodando desde o primeiro quadro do clipe, da abertura até um trecho de
partida.

**Narração:**
> "Você terminou o Desafio do Primeiro Jogo! O que está rodando na sua tela agora foi você que
> montou, bloquinho por bloquinho, em cinco dias."

**Na tela:** cortes curtos das peças do projeto: o Ao iniciar, a colisão, o Se grande com os quatro
ramos e o evento do Enter.

**Narração:**
> "E o que você sabe fazer agora vale para qualquer jogo: guardar um valor numa caixa, responder ao
> encontro de dois objetos, decidir uma coisa com uma pergunta, e dar começo e fim a um jogo."

**Na tela:** voltar para o jogo rodando, na tela de vitória, e segurar até o fim do clipe.

**Narração:**
> "São as mesmas peças que os criadores de jogos usam todo dia. Quando você quiser, é só apertar o
> Compartilhar e mostrar o seu jogo para quem você escolher."
