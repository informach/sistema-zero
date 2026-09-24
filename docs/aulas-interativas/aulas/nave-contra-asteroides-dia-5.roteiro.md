# Roteiro de gravação · Nave Contra Asteroides · Dia 5 · O jogo ganha começo e fim

**Como ler este roteiro:** só o texto entre aspas em **Narração** é falado no vídeo. **Na tela**
orienta a gravação; as **Notas de produção** são lembretes para a equipe, não falas para a criança.

## Especificações

- **Formato:** 11 clipes, exatamente um por seção com vídeo. Conceitos sem gesto de paleta,
  prática no Estúdio. O projeto de partida é o do fim do Dia 4.
- **Duração:** aferir após gravar. É a aula mais longa dos cinco dias; os clipes conceituais
  novos ficam em cerca de 35 a 45 segundos, e a entrega inclui o fecho no mesmo clipe.
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
**Duração alvo:** 35 a 45 segundos; recalibrar após gravar.

**Na tela:** o jogo pronto, aberto na tela de abertura com o nome. Apertar Enter e mostrar um trecho
curto de partida.

**Narração:**
> "Oi! Chegou o último dia de Nave Contra Asteroides. Hoje o seu jogo ganha começo e fim! Ele vai abrir numa
> tela com o nome que você escolher, e a partida só começa quando alguém apertar o Enter."

**Na tela:** deixar as vidas acabarem até a tela de derrota, depois cortar para uma partida que
chega na tela de vitória.

**Narração:**
> "A gente vai montar as telas e ensinar o jogo a esperar o Enter antes de começar a partida.
> Vamos fazer uma parte de cada vez. Se você quiser parar um pouco, seu projeto
> fica salvo para continuar depois."

---

## Seção 2. Os quatro momentos do jogo

### Clipe `video-telas` · Os quatro momentos do jogo
**Duração alvo:** 55 a 65 segundos; recalibrar após gravar.

**Na tela:** uma criança abre um jogo e encontra a tela com o nome dele. Depois aperta começar,
joga e chega a uma tela de vitória; em outra tentativa, chega a uma tela de derrota. Só então
aparecem quatro cartões, um de cada vez, escritos inicio, jogando, vitoria e fim.

**Narração:**
> "Antes de montar a abertura e os finais do nosso jogo, vamos entender por quais momentos uma
> partida passa. Pensa num jogo que você já jogou. Primeiro aparece o nome dele. Você aperta para começar,
> joga um pouco e, no final, pode ganhar ou perder. O nosso jogo também vai ter esse caminho.
> Vamos chamar essas partes de **inicio**, **jogando**, **vitoria** e **fim**. Esse último nome é para
> quando a gente perde. O jogo sabe em qual
> delas está, e por isso sabe o que deve fazer agora."

**Na tela:** uma seta do cartão inicio para o cartão jogando, com a palavra Enter escrita em cima
dela. Nenhuma outra seta na tela.

**Narração:**
> "Na abertura, o Enter leva para **jogando**. Até você apertar, a partida espera."

**Na tela:** a seta anterior apaga. Entra uma seta do cartão jogando para o cartão vitoria, com o
número 26 escrito em cima dela.

**Narração:**
> "Se os pontos chegarem à meta de **26**, o jogo vai para **vitoria**."

**Na tela:** a seta anterior apaga. Entra uma seta do cartão jogando para o cartão fim, com três
corações vazios desenhados em cima dela.

**Narração:**
> "Se as vidas acabarem, ele vai para **fim**. Hoje você vai montar esses caminhos no seu jogo."

## Seção 3. A meta e o primeiro momento

### Clipe `video-alvo` · A meta e o primeiro momento
**Duração alvo:** 50 a 60 segundos; recalibrar após gravar.

**Na tela:** a área Ao iniciar enquadrada, com o `Criar variável com valor` dos pontos e o `Dar ao
sprite de vida` à vista.

**Narração:**
> "Para saber quando alguém ganhou, o jogo precisa de uma meta. A nossa é destruir **26** pedras.
> Os pontos vão mudando durante a partida, mas a meta fica em 26. Imagina uma caixinha lacrada,
> com esse número guardado lá dentro. No Estúdio, a gente chama essa caixinha de **constante**."

**Na tela:** na categoria Programação, abrir 🏷️ Variáveis e arrastar `Criar constante com valor`
para dentro do Ao iniciar, encaixado por baixo do `Dar ao sprite de vida`.

**Narração:**
> "Na categoria **Programação**, abre **Variáveis**. Pega **Criar constante com valor** e encaixa
> dentro do Ao iniciar, logo abaixo do Dar ao sprite de vida."

**Na tela:** trocar PI por alvo no campo do nome da constante e clicar fora. Trocar 0 por 26
no campo do valor e clicar fora também.

**Narração:**
> "No nome da constante, troca **PI** por **alvo** e clica fora para confirmar. No valor, troca
> o **0** por **26** e clica fora também."

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

## Seção 4. O relógio pode agir agora?

### Clipe `video-estado-do-jogo` · A pergunta que abre a partida
**Duração alvo:** 35 a 45 segundos.

**Na tela:** quatro cartões de momento e uma porta esquemática marcada `jogando`. Uma pergunta
antes da porta decide se a ordem de criar pode passar, sem animar o relógio nem revelar os
contadores da experiência.

**Narração:**
> "Lembra do relógio que faz nascer uma pedra a cada 40 quadros? Ele continua contando o tempo,
> mesmo quando a tela de abertura está aparecendo. Mas a gente não quer pedras caindo no menu.
> Então, antes de criar uma pedra, o jogo pergunta se já estamos em **jogando**. Se sim, ela nasce.
> Se ainda estamos na abertura, ele espera. Na experiência, veja o que muda quando a partida
> começa."

---

## Seção 5. Embrulhe a partida numa pergunta

### Clipe `video-embrulhar` · Embrulhar no Se, do começo ao fim
**Duração alvo:** 95 a 115 s · **Palavras:** 220 (cerca de 96 s)

**Na tela:** a área Enquanto estiver rodando enquadrada inteira, com a cadeia do `A cada quadro do
jogo` rolando do `Limpar a tela` até o `Desenhar as vidas do sprite como em x y tamanho cor`.

**Narração:**
> "Até agora, os blocos da partida estão soltos dentro do motor. Por isso, eles funcionam desde
> que o jogo abre. Vamos colocar todos dentro de uma pergunta: o jogo já está em **jogando**?"

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
> é **arrastar**, não copiar: se copiar, ficam dois jogos rodando ao mesmo tempo."

**Na tela:** zoom e pausa no contorno do então. Rolar de cima para baixo dentro dele, parando no
`Limpar a tela` e depois no `Desenhar as vidas do sprite como em x y tamanho cor`.

**Narração:**
> "Agora confere o contorno do então. No começo da cadeia, dentro dele, o **Limpar a tela**. No fim,
> ainda dentro dele, o **Desenhar as vidas do sprite como em x y tamanho cor**. A partida inteira
> ficou lá dentro."

---

## Seção 6. O relógio e a barra de espaço também perguntam

### Clipe `video-relogio-e-tiro` · A mesma manobra em mais dois lugares
**Duração alvo:** 155 a 175 segundos; recalibrar após gravar.

**Na tela:** rolar até o `A cada quadros` de 40, com o `No grupo criar um asteroide em x y tamanho
cor com vx vy` dentro dele.

**Narração:**
> "A partida já ficou dentro da pergunta. Mas o relógio que cria as pedras e o evento que cria os
> tiros ainda estão fora dela. Vamos colocar uma pergunta em cada um desses lugares, para os dois
> só funcionarem quando o jogo estiver em **jogando**. Vou mostrar cada encaixe."

**Na tela:** na categoria Programação, abrir ❓ Lógica & Se e arrastar `Condição se, senão se e
senão` para dentro do `A cada quadros` de 40, encaixado por cima do `No grupo criar um asteroide`.
Tirar a comparação de fábrica e apagar.

**Narração:**
> "Primeiro, vai até o **A cada quadros** que está com **40**. Na categoria **Programação**, abre
> **Lógica e Se**. Pega **Condição se, senão se e senão** e encaixa dentro desse relógio, logo
> acima do **No grupo criar um asteroide**. A pergunta vem com uma comparação de fábrica: arrasta
> essa comparação para fora e apaga."

**Na tela:** na categoria Jogo 2D, abrir Jogo e telas, seção Telas e partida, e arrastar `o estado do
jogo é ?` para o buraco da pergunta, escolhendo jogando. Depois arrastar o bloco da pedra para
dentro do então.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Jogo e telas**, e dentro dela **Telas e partida**. Pega **o estado
> do jogo é ?**, encaixa no buraco vazio da pergunta do **Se** e escolhe **jogando** no menu.
> Agora pega o **No grupo criar um asteroide** pelo começo e arrasta para dentro do **então**.
> Assim, o relógio só cria pedras durante a partida."

**Na tela:** rolar até a área Quando acontecer e enquadrar o `Quando apertar a tecla` da barra de
espaço com os dois blocos dentro. Mostrar cada abertura de categoria e cada encaixe, sem acelerar
nem cortar o caminho.

**Narração:**
> "Agora vai até a área **Quando acontecer** e encontra o **Quando apertar a tecla** da barra de
> espaço. Dentro dele estão o tiro e o som. Na categoria **Programação**, abre **Lógica e Se**.
> Pega **Condição se, senão se e senão** e encaixa dentro desse **Quando apertar a tecla**, logo
> acima do **Criar tiro no grupo**. Arrasta a comparação de fábrica para fora da pergunta e apaga.
> Depois, na categoria **Jogo 2D**, abre **Jogo e telas** e **Telas e partida**. Pega **o estado do
> jogo é ?**, encaixa no buraco vazio da pergunta e escolhe **jogando** no menu."

**Na tela:** arrastar o `Criar tiro no grupo` para dentro do então, com o `Tocar efeito` vindo junto
por estar encaixado embaixo.

**Narração:**
> "Por último, pega o **Criar tiro no grupo** pelo começo da sequência e arrasta para dentro do
> **então**. O **Tocar efeito**, que está encaixado embaixo, vai junto. Confere que os dois ficaram
> dentro da pergunta, com o tiro antes do som."

**Na tela:** clicar num espaço vazio da área dos blocos, clicar na área do jogo e apertar a barra de
espaço várias vezes. Segurar alguns segundos com a tela preta parada.

**Narração:**
> "Clica na área do jogo e aperta a barra de espaço várias vezes. Nada sai, e nenhuma pedra nasce."

**Na tela:** depois do teste, enquadrar a etiqueta **Salvo** do Estúdio embutido. Mostrar a passagem
para a seção seguinte sem avançar a seção da criança no vídeo.

**Narração:**
> "Agora o jogo só pode criar pedras e tiros durante a partida. Por enquanto, ela ainda não
> começou, então a tela fica quietinha. Espera aparecer **Salvo** antes de continuar. Daqui a
> pouco vamos ensinar o jogo a perceber quando a partida acaba."

---

## Seção 7. O jogo decide quando acaba

### Clipe `video-finais` · A vitória pergunta primeiro
**Duração alvo:** 120 a 145 segundos; recalibrar após gravar.

**Na tela:** mostrar rapidamente os três lugares protegidos: motor, relógio e evento da barra de
espaço.

**Narração:**
> "Agora o motor, o relógio e o tiro só agem enquanto o jogo está em **jogando**. Faltam as
> perguntas que decidem como ele acaba."

**Na tela:** rolar até o fim do então de jogando, com o `Desenhar as vidas do sprite como em x y
tamanho cor` como último bloco de dentro. Na categoria Programação, abrir ❓ Lógica & Se e arrastar
`Condição se, senão se e senão` encaixado por baixo dele, ainda dentro do então.

**Narração:**
> "A primeira pergunta é a vitória. Vai até o fim do **então** de **jogando**, logo depois do
> **Desenhar as vidas do sprite**. Na categoria **Programação**, abre **Lógica e Se**. Pega
> **Condição se, senão se e senão** e encaixa abaixo desse bloco de vidas, ainda dentro do
> **então**. A comparação que já vem na pergunta serve; não precisa tirá-la."

**Na tela:** abrir o menu do `valor da variável` da esquerda e escolher pontos. Abrir o menu do sinal
e escolher o maior ou igual. Na categoria Programação, abrir 🔣 Valores e arrastar outro `valor da
variável` por cima do número da direita, escolhendo alvo. Zoom no encaixe.

**Narração:**
> "Na comparação da pergunta, abre o menu da variável do lado esquerdo e escolhe **pontos**.
> Abre o menu do sinal, no meio, e escolhe **maior ou igual**. Do lado direito, ainda há um número.
> Na categoria **Programação**, abre **Valores**, pega **valor da variável** e arrasta por cima
> desse número, até encaixar. Nesse novo bloco, abre o menu e escolhe **alvo**."

**Na tela:** na categoria Jogo 2D, abrir Jogo e telas, seção Telas e partida, e arrastar `Mudar o
estado do jogo para` para dentro do então dessa pergunta. Abrir o menu e escolher vitoria.

**Narração:**
> "Dentro do **então** dessa pergunta de vitória, na categoria **Jogo 2D**, abre **Jogo e telas**
> e depois **Telas e partida**. Pega **Mudar o estado do jogo para** e encaixa no primeiro lugar
> do **então**. Abre o menu do bloco e escolhe **vitoria**."

**Na tela:** na categoria Programação, abrir ❓ Lógica & Se e arrastar outro `Condição se, senão se e
senão` encaixado por baixo do primeiro. Tirar a comparação de fábrica e apagar.

**Narração:**
> "Agora a pergunta da derrota. Ainda dentro do **então** de **jogando**, na categoria
> **Programação**, abre **Lógica e Se**. Pega outro **Condição se, senão se e senão** e encaixa
> logo abaixo da pergunta de vitória. Arrasta a comparação de fábrica para fora e apaga."

**Na tela:** na categoria Jogo 2D, abrir Vida e placar, seção Vida, e arrastar `as vidas do sprite
acabaram?` para o buraco da pergunta, escolhendo nave. Depois arrastar `Mudar o estado do jogo para`
para dentro, escolhendo fim.

**Narração:**
> "Para preencher a pergunta vazia, na categoria **Jogo 2D**, abre **Vida e placar** e depois
> **Vida**. Pega **as vidas do sprite acabaram?** e encaixa no buraco da pergunta. No menu desse
> bloco, escolhe **nave**. Agora, ainda na categoria **Jogo 2D**, abre **Jogo e telas** e depois
> **Telas e partida**. Pega **Mudar o estado do jogo para** e encaixa dentro do **então** da
> pergunta de derrota. No menu, escolhe **fim**."

**Na tela:** afastar o enquadramento e dar uma volta lenta mostrando as duas perguntas encostadas,
uma em cima da outra, com o cursor passando primeiro pela de cima e depois pela de baixo.

**Narração:**
> "Repara na ordem: a vitória pergunta primeiro, e a derrota pergunta abaixo dela."

---

## Seção 8. Desenhe as três telas

### Clipe `video-mostrar-telas` · As três telas ganham texto
**Duração alvo:** 185 a 210 segundos; recalibrar após gravar.

**Na tela:** enquadrar a base do `Condição se, senão se e senão` grande, com o botão mais senão se à
vista. Clicar nele uma vez e mostrar o primeiro ramo novo. Os outros dois serão criados na hora
de montá-los.

**Narração:**
> "Até aqui, o **Se** grande mostra a partida quando o jogo está em **jogando**. Agora vamos
> montar as outras três telas: a de abertura, a de vitória e a de derrota. Embaixo desse **Se**
> tem o botão **mais senão se**. Clica nele uma vez para abrir o espaço da tela de abertura."

**Na tela:** no primeiro senão se, arrastar a comparação de fábrica para fora e apagar. Na categoria
Jogo 2D, abrir Jogo e telas, seção Telas e partida, e arrastar `o estado do jogo é ?` para o buraco
da pergunta. Conferir inicio, que já vem escolhido.

**Narração:**
> "No primeiro senão se, tira a comparação de fábrica e apaga. Na categoria **Jogo 2D**, abre **Jogo
> e telas**, e dentro dela **Telas e partida**. Pega **o estado do jogo é ?**, encaixa no buraco da
> pergunta e confere **inicio**, que já vem escolhido."

**Na tela:** na categoria Jogo 2D, abrir Jogo e telas, seção Telas e partida, e arrastar `Mostrar
tela com título subtítulo dica fundo` para dentro desse primeiro senão se.

**Narração:**
> "Dentro do **então** desse primeiro **senão se**, ainda na categoria **Jogo 2D**, abre **Jogo e
> telas** e depois **Telas e partida**. Pega **Mostrar tela com título subtítulo dica fundo** e
> encaixa no primeiro lugar do **então**."

**Na tela:** mostrar os três textos que já vêm no bloco: Nave contra Asteroides, Destrua os
asteroides! e Aperte Enter para começar. Se o título for personalizado, editá-lo e clicar fora.
Abrir o seletor de cor apenas se o fundo precisar mudar para manter contraste.

**Narração:**
> "O título já vem em **Nave contra Asteroides**. Se você deu outro nome ao seu jogo, pode
> escrever o seu aqui e clicar fora. O subtítulo **Destrua os asteroides!** e a dica **Aperte
> Enter para começar** também já vêm prontos. Confere os dois. Escolhe um fundo em que as
> letras apareçam bem."

**Na tela:** clicar mais uma vez em **mais senão se**. No segundo ramo, retirar a comparação de
fábrica, encaixar `o estado do jogo é ?` com vitoria e depois `Mostrar tela com título subtítulo
dica fundo`. Mostrar a categoria e a seção reabrindo para cada bloco. Preencher título, dica e
cor; mostrar que o subtítulo pode ficar vazio.

**Narração:**
> "Clica mais uma vez em **mais senão se** para criar o espaço da vitória. Nesse segundo
> **senão se**, arrasta a comparação de fábrica para fora da pergunta e apaga. Na categoria
> **Jogo 2D**, abre **Jogo e telas** e depois **Telas e partida**. Pega **o estado do jogo é ?**,
> encaixa no buraco da pergunta e escolhe **vitoria** no menu. Agora, ainda em **Jogo 2D**,
> **Jogo e telas**, **Telas e partida**, pega **Mostrar tela com título subtítulo dica fundo** e
> encaixa no **então** desse segundo ramo. No título, troca o nome do jogo por **Você Ganhou**
> e clica fora. No subtítulo, apaga o texto que veio e clica fora para deixar vazio. Na dica,
> escreve **Aperte Enter para voltar ao início** e confirma. Escolhe uma cor de
> fundo em que dê para ler as letras."

**Na tela:** clicar outra vez em **mais senão se**. No terceiro ramo, repetir a retirada da
comparação de fábrica e mostrar os dois encaixes completos, sem corte. Preencher título, dica e
cor; mostrar que o subtítulo pode ficar vazio.

**Narração:**
> "Clica em **mais senão se** pela terceira vez para abrir o espaço da derrota. No terceiro
> **senão se**, arrasta a comparação de fábrica para fora e apaga. Na categoria **Jogo 2D**,
> abre **Jogo e telas** e depois **Telas e partida**. Pega **o estado do jogo é ?**, encaixa no
> buraco da pergunta e escolhe **fim** no menu. Ainda em **Jogo 2D**, **Jogo e telas**,
> **Telas e partida**, pega **Mostrar tela com título subtítulo dica fundo** e encaixa no
> **então** desse terceiro ramo. No título, troca o nome do jogo por **Você Perdeu** e clica
> fora. Apaga o subtítulo que veio e clica fora. Na dica, escreve **Aperte Enter para voltar ao
> início** e confirma. Escolhe uma cor de
> fundo que deixe as letras fáceis de ler."

**Na tela:** zoom nos dois campos de dica, o da vitória e o da derrota, lado a lado.

**Narração:**
> "As dicas dessas telas falam para apertar Enter. Daqui a pouquinho, vamos programar essa tecla
> para voltar à abertura. Depois, vai ser preciso apertar de novo para jogar."

---

## Seção 9. Jogue outra vez

### Clipe `video-reiniciar` · Trocar a tela ou recomeçar de verdade?
**Duração alvo:** 35 a 45 segundos.

**Na tela:** dois cartões abstratos: mudar de momento vira uma página; reiniciar volta à primeira
etapa da preparação. Não mostrar pontos, vidas, pedras nem os resultados dos dois testes.

**Narração:**
> "As telas estão prontas, e agora vamos ensinar o Enter a começar e recomeçar a partida. Mas
> voltar para a abertura basta para preparar um jogo novo? Mudar o momento é como virar para
> outra parte de uma história: o que já estava guardado continua lá. **Reiniciar o jogo** faz
> outra coisa. Ele volta à preparação de **Ao iniciar** e a faz de novo. Na experiência, compare
> os dois jeitos de voltar à abertura."

---

## Seção 10. O Enter comanda o jogo

### Clipe `video-enter` · A mesma tecla, três respostas
**Duração alvo:** 170 a 195 segundos; recalibrar após gravar.

**Na tela:** rolar até a área Quando acontecer. Na categoria Jogo 2D, abrir Controles, seção Teclado,
ações e toque, e arrastar `Quando apertar a tecla` encaixado por baixo do `Quando apertar a tecla` da
barra de espaço.

**Narração:**
> "Você acabou de comparar trocar só a tela com reiniciar a partida. Agora vamos fazer a tecla
> **Enter** responder de acordo com a tela aberta: começar na abertura e reiniciar depois de
> cada final. Vamos
> montar essas três respostas no evento da tecla. Na categoria **Jogo 2D**, abre **Controles**, e dentro dela
> **Teclado, ações e toque**. Pega **Quando apertar a tecla** e encaixa dentro do Quando acontecer,
> logo abaixo do Quando apertar a tecla da barra de espaço."

**Na tela:** abrir o menu de teclas com a lista inteira à vista e escolher Enter.

**Narração:**
> "No menu de teclas, escolhe o **Enter**, que não vem escolhido."

**Na tela:** na categoria Programação, abrir ❓ Lógica & Se e arrastar `Condição se, senão se e
senão` para dentro do evento novo. Tirar a comparação de fábrica e apagar.

**Narração:**
> "Dentro do novo **Quando apertar a tecla**, na categoria **Programação**, abre **Lógica e Se**.
> Pega **Condição se, senão se e senão** e encaixa no primeiro lugar. A pergunta vem com uma
> comparação de fábrica: arrasta essa comparação para fora e apaga."

**Na tela:** montar o primeiro ramo: `o estado do jogo é ?` com inicio na pergunta, e `Mudar o estado
do jogo para` com jogando dentro dele.

**Narração:**
> "Na primeira pergunta desse **Se**, abre a categoria **Jogo 2D**, depois **Jogo e telas** e
> **Telas e partida**. Pega **o estado do jogo é ?**, encaixa no buraco vazio da pergunta e
> confere **inicio**, que já vem escolhido. Agora, ainda na categoria **Jogo 2D**, em **Jogo e telas**,
> **Telas e partida**, pega **Mudar o estado do jogo para** e encaixa no **então** dessa primeira
> pergunta. No menu dele, escolhe **jogando**."

**Na tela:** clicar no botão mais senão se uma vez. No primeiro ramo novo, retirar a comparação de
fábrica, montar a pergunta com fim e encaixar `Reiniciar o jogo` dentro.

**Narração:**
> "Clica em **mais senão se** uma vez para criar a pergunta da derrota. No primeiro **senão se**,
> arrasta a comparação de fábrica para fora da pergunta e apaga. Na categoria **Jogo 2D**, abre
> **Jogo e telas** e depois **Telas e partida**. Pega **o estado do jogo é ?**, encaixa no buraco
> dessa pergunta e escolhe **fim** no menu. Ainda em **Jogo 2D**, **Jogo e telas**,
> **Telas e partida**, pega **Reiniciar o jogo** e encaixa no **então** desse primeiro **senão
> se**."

**Na tela:** clicar outra vez em mais senão se. No segundo ramo novo, retirar a comparação de
fábrica, montar a pergunta com vitoria e encaixar outro `Reiniciar o jogo` dentro.

**Narração:**
> "Clica em **mais senão se** mais uma vez para criar a pergunta da vitória. Nesse segundo
> **senão se**, arrasta a comparação de fábrica para fora e apaga. Na categoria **Jogo 2D**,
> abre **Jogo e telas** e depois **Telas e partida**. Pega **o estado do jogo é ?**, encaixa no
> buraco da pergunta e escolhe **vitoria** no menu. Ainda em **Jogo 2D**, **Jogo e telas**,
> **Telas e partida**, pega outro **Reiniciar o jogo** e encaixa no **então** desse segundo
> **senão se**."

**Na tela:** zoom nos dois buracos de pergunta dos senão se, agora com as perguntas de fim e
vitoria encaixadas.

**Narração:**
> "Confere os dois **senão se**: um pergunta por **fim** e o outro por **vitoria**. Dentro de
> cada um está o **Reiniciar o jogo**."

**Na tela:** afastar o enquadramento e mostrar o evento inteiro, com os três ramos visíveis de uma
vez.

**Narração:**
> "A mesma tecla, três respostas diferentes, porque o jogo sabe em que momento está."

---

## Seção 11. Quiz do Dia 5

Sem vídeo. O Zappy faz uma ponte curta: "Hora de conferir o ciclo do seu jogo: começo,
partida e recomeço. Pense no que você observou antes de responder."

---

## Seção 12. Teste, entregue e mostre para o mundo

### Clipe `video-ciclo-completo` · Do menu ao recomeço
**Duração alvo:** 150 a 180 segundos, incluindo o fecho; recalibrar após gravar.

**Na tela:** o jogo do fim do Dia 5 com o Estúdio aberto, parado na tela de abertura. O cursor clica
dentro da área do jogo.

**Narração:**
> "O jogo já tem abertura, partida, vitória, derrota e a tecla de recomeçar. Vamos jogar esse
> caminho inteiro para conferir se cada momento funciona. Depois, vamos enviar o projeto e ver
> como compartilhá-lo, se você quiser. Primeiro, olha a tela de abertura."

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
> "Depois do envio, o botão **Compartilhar** fica disponível. Se você escolher publicar o jogo,
> ele ganha um link para você mostrar a quem quiser. Não precisa deixar seu perfil público para
> fazer isso."

**Na tela:** clicar no Compartilhar e deixar a janela abrir. Não percorrer campo nenhum, não
preencher nada e não concluir a publicação na gravação.

**Narração:**
> "Publicar é uma escolha, não um passo obrigatório da entrega. Clica no Compartilhar, confere o que a
> janela pedir e publica quando você quiser mostrar."

**Fecho no mesmo `video-ciclo-completo`, depois do teste e do envio.** Não abrir um segundo
clipe nesta seção. Cortar repetições de jogo para preservar a atenção.

**Na tela:** o jogo completo rodando desde o primeiro quadro do clipe, da abertura até um trecho de
partida.

**Narração:**
> "Você terminou o curso Nave Contra Asteroides! O que está rodando na sua tela foi você que
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
