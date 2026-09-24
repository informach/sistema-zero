# Roteiro de gravação · Nave Contra Asteroides · Dia 4 · O jogo passa a contar

**Como ler este roteiro:** só o texto entre aspas em **Narração** é falado no vídeo. **Na tela**
orienta a gravação; as **Notas de produção** são lembretes para a equipe, não falas para a criança.

## Especificações

- **Formato:** sete clipes, um por seção com vídeo. Três clipes conceituais não têm gesto de
  paleta; os práticos mostram o projeto que veio do Dia 3.
- **Duração:** aferir após a gravação. Os três clipes novos foram planejados para cerca de
  30 a 45 segundos cada; não acelerar a demonstração prática para caber numa conta antiga.
- **Calibração:** ela já traz grupo, relógio, colisão entre dois grupos, apelido, explosão e som.
  É novo de verdade nesta aula: a variável, a leitura da variável dentro de outro bloco, a colisão
  de um grupo contra um sprite, a vida do sprite e os quadros de invencibilidade. Também é a
  primeira vez que ela sai da categoria Jogo 2D.
- **Conceitos nomeados:** variável · HUD · quadros de invencibilidade · retorno pro jogador.
- **Dor desta aula:** não existe dor provocada no projeto. A confusão do dia, desenhar contra somar,
  é resolvida na cena da seção `caixa-de-pontos`, e o contrafactual das vidas no lugar errado é
  resolvido na cena da seção `vidas-uma-vez`, que vem depois da montagem.
- **Vitória do dia:** um placar que sobe a cada acerto e três corações que apagam quando uma pedra
  encosta na nave.
- **Valores:** `pontos` começa em **0** · soma de **1** por acerto · rótulo do placar **Pontos:** ·
  placar em x **12**, y **30**, tamanho **24** · **3** vidas na nave · dano **1** · proteção **45**
  quadros · tremida de intensidade **8** · corações em x **12**, y **48**, tamanho **22** · apelido
  `inimigo`, que já vem escrito.
- **Campos livres:** cor do placar, cor dos corações e cor da explosão da batida. A narração pede só
  contraste com o fundo escuro e nunca crava um valor.
- **Nota de produção:** reservar **165 a 185 segundos** para `video-batida-e-coracoes`.
  O clipe reúne sete blocos e precisa mostrar o caminho completo de cada um. Zoom obrigatório em
  dois pontos: no campo do valor do `Mostrar
  placar`, no instante em que o `valor da variável` cobre o número que estava ali, e no campo dos
  45 quadros do `Machucar o sprite`. No `video-fecho`, o enquadramento segura o placar e os
  corações juntos do começo ao fim, porque a aula inteira depende de dar para ver que um mudou e o
  outro não.
- **O que NÃO entra, e por quê:**
  - A enumeração dos seis passos, na abertura e no fecho.
  - A frase "todo jogo começa com zero ponto". Vira "este jogo começa com zero ponto", porque muitos
    jogos começam com outro número.
  - A explicação de que sem a invencibilidade "uma batida só podia tirar as 3 vidas de uma vez,
    porque a colisão acontece em vários quadros seguidos". É falso: a pedra que bateu já saiu do
    grupo na linha de cima. A correção obrigatória está no clipe.
  - A contagem errada do teste. Depois da segunda perda sobra **um** coração, não dois.
  - Os endereços antigos: "Placar e HUD" hoje é Vida e placar › Indicadores e texto na tela, "Vida"
    hoje é Vida e placar › Vida, e `Tremer a tela com intensidade` saiu de "Aparência" para Desenho
    e efeitos › Efeitos.
  - Qualquer promessa de que a partida acaba quando os corações somem. Isso só passa a ser verdade
    no Dia 5.

---

## Seção 1. O que a gente vai fazer hoje

### Clipe `video-abertura` · O jogo começa a contar
**Duração alvo:** 25 a 35 s · **Palavras:** 59 (cerca de 26 s)

**Na tela:** o jogo do fim do Dia 4 rodando, com o placar no canto de cima e os três corações logo
abaixo dele. Um tiro acerta uma pedra e o número do placar sobe.

**Narração:**
> "O seu jogo já explode pedras, mas ainda não conta quantas você destruiu. Hoje ele começa
> a **contar**, e o número fica na tela para o jogador ver."

**Na tela:** uma pedra encosta na nave. A explosão aparece, a tela treme, um coração apaga e a nave
fica piscando. Segurar o placar e os corações no mesmo enquadramento.

**Narração:**
> "Cada pedra que você explodir vale um ponto, a nave ganha três vidas, e você vai descobrir por que
> ela precisa de um **respiro** depois de levar uma batida."

---

## Seção 2. A caixa que guarda o seu placar

### Clipe `video-variavel` · Uma caixa que guarda um número
**Duração alvo:** 40 a 50 segundos; recalibrar após gravar.

**Na tela:** uma caixa de papel chamada `pontos` recebe marcas por acertos em um desenho simples.
Ao lado, uma placa vazia representa o placar. Não mostrar a cena, os controles nem a sequência de
resultados da experiência.

**Narração:**
> "Se você acertou duas pedras, como o jogo vai lembrar disso? Ele precisa de um lugar para
> guardar os pontos. Imagina uma caixinha com o nome **pontos** escrito nela. Ela começa com zero
> e ganha mais um a cada acerto. No Estúdio, essa caixinha se chama **variável**, porque o número
> guardado pode mudar. Mas guardar não é mostrar. O jogo já pode saber que você tem dois pontos
> sem que o jogador veja o placar. Na experiência, veja como uma coisa se liga à outra."

---

## Seção 3. O acerto vira número na tela

### Clipe `video-pontos-e-placar` · A caixa, a soma e o placar
**Duração alvo:** 110 a 130 segundos; recalibrar após gravar.

**Na tela:** na categoria Programação, abrir 🏷️ Variáveis e arrastar `Criar variável com valor` até
o fim do Ao iniciar, encaixado por baixo do `Criar grupo de sprites` dos asteroides.

**Narração:**
> "Você viu que o jogo precisa guardar a contagem dos acertos. Agora vamos criar esse número,
> somar um ponto quando um tiro acertar uma pedra e mostrar o placar na tela. Vamos montar uma
> parte de cada vez. Na categoria **Programação**, abre **Variáveis**. Pega **Criar variável com
> valor** e encaixa no
> fim do Ao iniciar, logo abaixo do Criar grupo de sprites dos asteroides."

**Na tela:** enquadrar o bloco novo ao lado dos blocos vizinhos, para a diferença de cor ficar
visível no mesmo quadro.

**Narração:**
> "Repara na cor: os de Programação são **laranjas**, e os de Jogo 2D são rosas."

**Na tela:** clicar no campo do nome da variável, trocar contador por pontos e clicar fora.
Zoom no campo do valor, mostrando o 0 que já está lá.

**Narração:**
> "No nome da variável, troca **contador** por **pontos** e clica fora para confirmar. O valor
> já vem em **0**; deixa assim, porque este jogo começa com zero ponto."

**Na tela:** rolar até o `Para cada colisão entre os grupos e` no motor. Na categoria Programação,
abrir 🏷️ Variáveis e arrastar `Somar em variável` para dentro do fazer da colisão, encaixado por
baixo do `Tocar efeito`.

**Narração:**
> "Agora a soma. Na categoria **Programação**, abre **Variáveis**. Pega **Somar em variável** e
> encaixa dentro do Para cada colisão entre os grupos e, no finalzinho, logo depois do Tocar
> efeito."

**Na tela:** abrir o menu da variável, escolher pontos, e enquadrar o número 1 que já está no campo.

**Narração:**
> "Escolhe **pontos** e deixa o número em **1**. A soma mora dentro da colisão, que é onde o acerto
> acontece."

**Na tela:** na categoria Jogo 2D, abrir Vida e placar, seção Indicadores e texto na tela, e
arrastar `Mostrar placar valor em x y cor tamanho` para dentro do `A cada quadro do jogo`,
encaixado por baixo do `Para cada colisão entre os grupos e`.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Vida e placar**, e dentro dela **Indicadores e texto na tela**.
> Pega **Mostrar placar valor em x y cor tamanho** e encaixa dentro do A cada quadro do jogo, abaixo
> do Para cada colisão entre os grupos e."

**Na tela:** o jogo rodando com o placar já desenhado por cima da cena, com as pedras passando por
trás dele.

**Narração:**
> "Esse painel por cima do jogo tem nome de criador: **HUD**, e esse é o seu primeiro!"

**Na tela:** conferir Pontos: no rótulo, sem redigitar. Depois, na categoria Programação, abrir 🔣 Valores e
arrastar `valor da variável` por cima do número que está no campo do valor, até o encaixe
acontecer. Zoom nesse instante. Abrir o menu e escolher pontos.

**Narração:**
> "O rótulo já vem em **Pontos:**; pode deixar. No campo do valor tem um número fixo. Na categoria
> **Programação**, abre **Valores**. Pega **valor da variável** e arrasta por cima desse número, até
> encaixar. Escolhe **pontos**."

**Na tela:** aproximar nos campos x 12, y 30 e tamanho 24, que já vêm preenchidos. Conferir sem
redigitar. Abrir o seletor de cor apenas se a cor precisar de mais contraste com o fundo.

**Narração:**
> "O placar já vem em x **12**, y **30** e tamanho **24**. Confere os três sem mudar. A cor
> precisa aparecer bem no fundo que você escolheu; se precisar, escolhe uma cor mais clara."

---

## Seção 4. O respiro depois da batida

### Clipe `video-protecao` · O respiro entre duas batidas
**Duração alvo:** 35 a 45 segundos.

**Na tela:** uma pedra encosta na nave, sai do grupo e a nave pisca; outras pedras se
aproximam. Marcar uma janela de tempo sem revelar a contagem final de cada teste.

**Narração:**
> "Vamos fazer a pedra sair do jogo quando bater na nave. Só que outras pedras podem vir logo atrás.
> A nave precisa de um respiro. Por alguns quadros, ela pisca e não perde outra vida. Quando
> esse tempo acaba, uma próxima pedra pode machucar de novo. É para isso que serve a proteção.
> Na experiência, compare tempos diferentes e veja o que acontece com os corações."

---

## Seção 5. A batida machuca

### Clipe `video-batida-e-coracoes` · A batida custa um coração
**Duração alvo:** 165 a 185 segundos; recalibrar após gravar.

**Na tela:** o jogo como está no fim da seção anterior. As pedras ainda atravessam a nave sem
tirar vida. Mostrar três corações vazios como representação do que vamos construir, antes de
abrir a paleta.

**Narração:**
> "Até aqui, as pedras passam pela nave e nada acontece. Vamos dar a ela três vidas, como nos
> jogos que mostram corações. Depois vamos dizer o que acontece quando uma pedra bate."

**Na tela:** na categoria Jogo 2D, abrir Vida e placar, seção Vida, e arrastar `Dar ao sprite de
vida` para dentro do Ao iniciar, encaixado por baixo do `Criar variável com valor` dos pontos.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Vida e placar**, e dentro dela **Vida**. Pega **Dar ao sprite de
> vida** e encaixa dentro do Ao iniciar, logo abaixo do Criar variável com valor dos pontos."

**Na tela:** zoom no campo de sprite, que vem em jogador. Se houver aviso, abri-lo antes de
alterar o campo. Abrir o seletor e escolher nave. Mostrar o número 3, que já vem escrito, e
manter a área Ao iniciar inteira no quadro.

**Narração:**
> "Esse bloco veio apontando para **jogador**, mas a sua nave se chama **nave**. Se apareceu
> um aviso, clica nele para entender o que falta. Depois, no campo do sprite, escolhe
> **nave**. O número já vem em **3**; deixa assim. Esse bloco fica em **Ao iniciar**, para dar
> as vidas uma vez no começo."

**Na tela:** na categoria Jogo 2D, abrir Colisões, seção Encostar e bloquear, e arrastar `Para cada
sprite do grupo que colidir com o sprite` para dentro do `A cada quadro do jogo`, encaixado por
baixo do `Mostrar placar valor em x y cor tamanho`.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Colisões**, e dentro dela **Encostar e bloquear**. Pega **Para
> cada sprite do grupo que colidir com o sprite** e encaixa dentro do A cada quadro do jogo, abaixo
> do Mostrar placar."

**Na tela:** aproximar nos campos do grupo e do sprite, que já vêm em asteroides e nave. Conferir
sem trocar. Zoom no campo do apelido, com a palavra inimigo já escrita.

**Narração:**
> "O grupo já vem em **asteroides**, o sprite em **nave** e o apelido em **inimigo**. Confere
> os três; não precisa escrever de novo."

**Na tela:** montar os dois primeiros blocos dentro do fazer da colisão, um encaixado por baixo do
outro, com os menus preenchidos na hora.

**Narração:**
> "Um: em **Jogo 2D**, abre **Grupos**, depois **Participação e limpeza**. Pega **Tirar o
> sprite do grupo** e encaixa no fazer da colisão, que está vazio, no primeiro lugar. Sprite
> **inimigo**, grupo **asteroides**. Dois: em **Jogo 2D**, abre **Desenho e efeitos**, depois
> **Partículas**. Pega **Soltar explosão no sprite cor** e encaixa logo abaixo do **Tirar o sprite
> do grupo**. Sprite **inimigo**; a cor da explosão é sua."

**Na tela:** montar os dois últimos blocos por baixo dos dois primeiros. No bloco Machucar,
mostrar o campo de sprite que veio em jogador e escolher nave; aproximar nos valores padrão
1 e 45 sem redigitar. No bloco Tremer, conferir a intensidade padrão 8.

**Narração:**
> "Três: em **Jogo 2D**, abre **Vida e placar**, depois **Vida**. Pega **Machucar o sprite em
> e deixá-lo invencível por quadros** e encaixa logo abaixo do **Soltar explosão no sprite cor**.
> No campo do sprite, escolhe **nave**. Os números já vêm em **1** de dano e **45** quadros de
> proteção; deixa os dois assim. Quatro: em **Jogo 2D**, abre **Desenho e efeitos**, depois
> **Efeitos**. Pega **Tremer a tela com intensidade** e encaixa logo abaixo do **Machucar o
> sprite**. A intensidade já vem em **8**; pode deixar."

**Na tela:** enquadrar a linha do `Tirar o sprite do grupo` e a linha do `Machucar o sprite` juntas,
com o cursor apontando primeiro para uma e depois para a outra.

**Narração:**
> "A pedra que bateu já saiu do grupo na linha de cima. O respiro protege a nave das outras
> pedras que chegam logo atrás."

**Na tela:** na categoria Jogo 2D, abrir Vida e placar, seção Vida, e arrastar `Desenhar as vidas do
sprite como em x y tamanho cor` até o fim do `A cada quadro do jogo`, encaixado por baixo do bloco
da colisão e do lado de fora dele. Zoom no ponto de encaixe.

**Narração:**
> "Falta um bloco, e ele fica fora da colisão. Na categoria **Jogo 2D**, abre **Vida e placar**, e
> dentro dela **Vida**. Pega **Desenhar as vidas do sprite como em x y tamanho cor** e encaixa no fim
> do A cada quadro do jogo, abaixo do Para cada sprite do grupo que colidir com o sprite."

**Na tela:** no campo de sprite, trocar jogador por nave. Conferir que o jeito de mostrar já
vem em corações. Aproximar nos campos padrão x 12, y 48 e tamanho 22 sem redigitar. Se quiser,
escolher uma cor no seletor.

**Narração:**
> "No campo do sprite, escolhe **nave**. O jeito já vem em **corações**, e os lugares também
> estão prontos: x **12**, y **48**, tamanho **22**. Confere e deixa. Se quiser, escolhe a cor
> dos corações."

---

## Seção 6. As vidas são dadas uma vez

### Clipe `video-vidas-uma-vez` · Vidas no começo ou durante o jogo?
**Duração alvo:** 25 a 35 segundos; recalibrar após gravar.

**Na tela:** as duas áreas do projeto que a criança já conhece e um desenho de três corações,
sem colocar a ficha nelas, simular batidas ou revelar as duas contagens da experiência.

**Narração:**
> "A gente deu três vidas à nave em **Ao iniciar** porque isso prepara a partida uma vez. O motor,
> em **Enquanto estiver rodando**, faz de novo o que estiver dentro dele a cada quadro. Será que
> dar vidas de novo o tempo todo combina com um jogo em que elas precisam diminuir depois das
> batidas? Vamos deixar a nave mostrar essa diferença na experiência."

---

## Seção 7. Quiz do Dia 4

Sem vídeo. O Zappy faz uma ponte curta: "Agora confira o que você descobriu sobre os pontos
e as vidas. Pense nas duas contagens antes de responder." O quiz não divide seção com
Estúdio ou vídeo.

---

## Seção 8. Teste, envie e fecha

### Clipe `video-fecho` · Duas contagens, cada uma com o seu motivo
**Duração alvo:** 80 a 95 segundos; recalibrar após gravar.

**Na tela:** o jogo do fim do Dia 4 com o Estúdio aberto. O cursor clica dentro da área do jogo. O
placar e os três corações inteiros dentro do enquadramento.

**Narração:**
> "O jogo agora mostra duas contagens: os pontos pelos acertos e os corações pelas vidas da
> nave. Vamos testar as duas, conferir o que muda em cada situação e depois enviar o projeto.
> Primeiro, clica dentro da área do jogo."

**Na tela:** explodir duas pedras, uma de cada vez, com o placar à vista. O número vai de 0 para 1 e
de 1 para 2.

**Narração:**
> "Explode duas pedras, uma de cada vez. O placar sai de zero, passa por um e para em **dois**!"

**Na tela:** parar de atirar e deixar uma pedra descer em cima da nave, sem desviar.

**Narração:**
> "Um aviso: o próximo passo é deixar uma pedra bater na nave **de propósito**."

**Na tela:** a batida acontece. Explosão, tela tremendo, um coração apaga. Zoom curto no placar,
que continua em 2.

**Narração:**
> "Um coração apagou, sobraram dois, e o placar continuou em **dois**. Apanhar não tira ponto."

**Na tela:** a nave piscando. Segurar até o piscar terminar, sem mexer em nada.

**Narração:**
> "A nave está piscando. Espera ela parar antes da próxima pedra chegar."

**Na tela:** deixar a segunda pedra bater. Um coração apaga, sobra um. O placar continua em 2.

**Narração:**
> "Segunda batida, também de propósito. Agora sobra **um** coração, e o placar continua em dois."

**Na tela:** enquadramento parado no canto de cima, com o placar e o coração que restou juntos. O
cursor aponta para um e depois para o outro.

**Narração:**
> "Olha as duas contagens: o placar só mudou nos acertos, e os corações só mudaram nas batidas."

**Na tela:** esperar a etiqueta Salvo aparecer e apertar Enviar para o professor.
Mostrar a confirmação.

**Narração:**
> "Espera aparecer a etiqueta Salvo e aperta o Enviar para o professor."

**Na tela:** o jogo rodando alguns segundos, com o placar subindo numa explosão e um coração
apagando numa batida.

**Narração:**
> "Agora os seus acertos ficam guardados nos pontos, e as batidas mudam as vidas. São duas contagens
> separadas, cada uma mudando pelo seu próprio motivo. Só falta uma coisa: quando os corações acabam,
> nada acontece ainda. Amanhã o seu jogo ganha começo, vitória e derrota!"
