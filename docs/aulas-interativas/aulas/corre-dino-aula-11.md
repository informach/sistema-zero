# Corre, Dino! · Aula 11 · A caixinha que conta a sua partida

## Resumo

- **Estado de entrada:** o jogo da aula 10, com a colisão justa. No `Ao iniciar` há seis blocos, e o
  último é o `Usar área de colisão de 80 % do tamanho para o sprite dino`. Dentro do
  `Se o estado do jogo é jogando ?`, o último bloco é o `Tirar do grupo cactos quem sair da tela`,
  porque o raio-X saiu ontem. O `Enquanto estiver rodando` tem duas raízes: o `A cada quadro do jogo`
  e o `A cada 1.4 segundos`. O jogo ainda não tem nenhuma variável.
- **Vitória do dia:** o número sobe no canto da tela enquanto ela corre, e a tela de fim diz quantos
  pontos ela fez naquela partida.
- **Seções hoje:** 11 · **Seções propostas:** 8
- **Clipes hoje:** 8 · **Clipes propostos:** 6. A contagem não muda com o redesenho da entrega:
  nenhum clipe entrou nem saiu, o `video-teste-e-envio` é que cresceu.
- **Fecho da entrega:** os quatro testes, as três ideias do dia e a explicação do zero saíram do
  balão e foram para o roteiro do `video-teste-e-envio`, e a seção ficou sem balão nenhum. Balão
  depois da ferramenta não existe para quem faz a aula, porque o Estúdio fica sozinho na coluna da
  direita e todo o resto na esquerda.
- **Cenas:** 2, as duas construídas no catálogo e as duas com os ajustes aplicados. A `variable` já
  existia pronta e nenhuma aula a usava, apesar de ser o eixo exato desta. É esta aula que a liga.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| Variável: um lugar com nome que guarda um número que muda | Sim. É a primeira memória do jogo, e ela não tem imagem na tela | **Sim** | Experimentação (`variable`) | Depois de montar, quando a tela não muda | Criar a caixinha e não ver nada acontecer é o momento em que ela acha que errou. O conceito é a resposta para uma pergunta que ela acabou de fazer |
| Guardar, alterar e mostrar são três trabalhos separados | Sim. É o conceito mais denso do dia, e os três parecem um só | **Sim**, e é o eixo da cena | Experimentação (`variable`), nas três metas | Mesma seção do conceito acima | É o que organiza a aula inteira: ela guarda na seção 2, mostra na 4 e altera na 6. Sem separar antes, as três montagens viram três gestos sem ligação |
| A caixinha não é a caixa de colisão de ontem | Não. É desambiguação de vocabulário | Não | Uma frase, no instante em que a palavra nasce | Dentro do clipe de montagem | Duas "caixas" em aulas seguidas é a maior confusão previsível do curso, e ela se resolve dizendo o que cada uma faz, lado a lado |
| Memória zero: toda partida começa do zero | Sim. A causa (o `Reiniciar o jogo` roda as três áreas de novo) é invisível | **Sim**, no jogo dela | Teste nomeado na entrega: perde com um número, reinicia, lê zero | No fechamento | Ela confere em dez segundos no próprio jogo. Gastar cena com o que o projeto prova sozinho é o que inchou o desenho antigo |
| `valor da variável` lê a caixinha, em vez de um número fixo | Sim. Um zero digitado e um zero lido parecem iguais na tela | **Sim** | Coberto pela meta `shown` de `variable`, e provado no jogo quando o número começa a subir | Cena antes, jogo depois | A diferença entre os dois só aparece quando o valor muda, e é isso que a cena adianta |
| HUD | Não. É vocabulário | Não | Dito no lugar em que o bloco mora | Dentro da montagem do placar | Nomear uma coisa que já está na tela não precisa de cena |
| O placar branco no céu azul claro (a dor do contraste) | Não. O sintoma acontece sozinho, porque o bloco nasce branco | **Sim**, no jogo dela | Ela monta, olha, não consegue ler, troca a cor | Dentro da mesma seção da montagem | Acontece com os valores de fábrica, na tela dela, em cinco segundos. Hoje isso ocupa uma seção de demonstração com clipe próprio |
| O placar mora dentro do Se de jogando, e não aparece no menu | Sim. Depende de estado, que é invisível | **Sim** | Experimentação (`score`), e visível no jogo dela no menu | Cena antes de montar o relógio | É a mesma pergunta que decide onde o `Somar 1` vai morar, então as duas andam juntas |
| Com que frequência somar: no quadro seriam 60 por segundo | Sim. Sessenta vezes por segundo não se vê acontecendo | **Sim** | Experimentação (`score`), com o controle de frequência novo | Antes de montar o relógio | Hoje isso é contado ("ia ganhar 60 pontos por segundo") e a aula ainda pede que ela adivinhe. Com o controle, ela põe a peça no quadro e vê o placar disparar |
| Em quais telas somar | Sim. Estado é invisível | **Sim** | Experimentação (`score`), nas metas de início, jogando e fim | Mesma cena | Duas perguntas diferentes decidem o mesmo encaixe, e a cena responde as duas no mesmo palco |
| Relógios irmãos: o novo fica ao lado, não dentro | Não. Ela fez isso na aula 5 | Não | Âncora explícita e uma frase, com remissão à aula 5 | Dentro da montagem | Remissão para trás e dentro do curso é construção de confiança, e o gesto já é conhecido |
| Se novo com conteúdo novo: três etapas, não quatro | Não é conceito, é operação | Não | Instrução conduzida, com o nome certo | Dentro da montagem | Aqui não existe bloco montado para envolver. Chamar de "embrulhar no Se" manda ela procurar o que não tem |
| `juntar texto`: uma frase feita de pedaços, e um deles muda | Sim, na medida em que um número entra num texto | **Sim**, no jogo dela | Duas partidas com resultados diferentes, na mesma frase | Dentro do clipe de montagem | Ela vê a frase mudar sozinha entre uma partida e outra. A demonstração de hoje mostra cartões parados, que é menos do que isso |
| Os espaços antes e depois do número | Não é conceito, é operação com sintoma imediato | Não | Uma linha, e o sintoma na tela se faltar | Dentro da montagem | Se faltar o espaço, ela lê "Você fez12 pontos" e conserta sozinha |
| O `+` que abre espaços no `juntar texto` | Não. É o mesmo `+` da aula 8 | Não | Remissão à aula 8 e o gesto no clipe | Dentro da montagem | Já é gesto conhecido dela |
| Uma vez contra sempre (cena `once-vs-always`) | Não, **nesta aula** | Não | | | Considerada e recusada. O `Criar variável` no `Ao iniciar` e o `Somar 1` no relógio são de fato um caso de uma vez contra sempre, mas as áreas do projeto são conteúdo das aulas 1 e 2, e o elenco da cena é de outro jogo |

Dezesseis coisas, quatro concretizações, todas em duas cenas que já existem. É a triagem que tira a
aula de 11 para 8 seções e ainda assim aprofunda o conceito central.

## Diagnóstico do desenho atual

**A cena que explica o conceito do dia existia e a aula não a usava.** `variable`, "Guardar, mudar e
mostrar", está no catálogo com três metas (`stored`, `changed-hidden`, `shown`), fala de uma caixa
chamada pontos, de um `Somar 1 em pontos` e de um `Mostrar placar`. É o eixo exato desta aula, escrito
com o vocabulário dela. A seção 2, *Crie a memória dos pontos*, justifica a ausência dizendo que "a
analogia da caixa já está no vídeo" e que basta "montar e reconhecer que ela ainda não aparece", e a
nota de montagem manda "não acrescentar um laboratório que repita criar versus desenhar da aula 1". A
cena não repete a aula 1. A aula 1 separa duas coisas (criar e mostrar) sobre um objeto. Esta separa
três coisas sobre um número, e a do meio, alterar sem mostrar, não existe na aula 1 e é justamente a
que ela não tem como enxergar sozinha.

**Duas seções dividem o mesmo clipe, palavra por palavra.** *Conecte o placar à memória* (seção 3) e
*Veja como deixar o número legível* (seção 4) trazem o mesmo trecho original inteiro, do "E agora um
reencontro" até "Agora o terceiro, e nesse quem vai pensar é você". A segunda existe para observar o
contraste, que a primeira já mostra acontecendo no jogo dela, com o placar branco sumindo no céu.

**A aula manda resolver sozinha, e isso está banido desde 01/08/2026.** A seção 6, *Conte um ponto por
segundo*, abre com "Agora eu vou fazer diferente. Em vez de eu te mostrar, você vai me dizer" e
termina em "A pergunta é: onde esse bloco tem que ir?". O curso não tem exercício, e nenhuma aula faz
pergunta que precise ser respondida para continuar. Pior: a consequência que justificaria a pergunta
(60 pontos por segundo) é contada de boca, sem nada na tela.

**A cena `score` cobrava metade do que o roteiro descreve, e agora cobra tudo.** O roteiro lista
cinco descobertas. O catálogo do v6 tinha duas metas, `score-idle-wrong` e `score-playing`. As que
faltavam são exatamente "o início esperou" e "no fim, o placar parou no valor", e essa última é a
resposta da pergunta final da própria cena. Elas existem, com os ids `score-start` e `score-end`,
junto com a `score-runaway` da frequência.

**A âncora do primeiro bloco se apoia num fato que a aula 10 desfez.** A fala diz: "Lá na Aula 7 eu te
falei que o Ir para a tela inicio é o último bloco do Ao iniciar. Ele continua sendo o último." Não
continua. A aula 10 encaixou o `Usar área de colisão de 80 % do tamanho para o sprite dino` embaixo
dele, e esse é o último bloco do `Ao iniciar` desde ontem. A instrução ainda funciona, porque ela
manda encaixar acima, mas a afirmação que a sustenta está errada, e a criança que conferir vai ver
outra coisa na tela.

**A manobra do Se é chamada pelo nome errado.** A fala diz que é "aquela manobra que a gente batizou
lá na Aula 7 de embrulhar no Se, e são sempre os mesmos quatro movimentos". Aqui não existe bloco
montado para envolver: o `Se` nasce junto com o conteúdo. São três movimentos (pegar o `Se`, tirar a
comparação de fábrica, encaixar a pergunta), e a quarta etapa não acontece. Chamar de embrulhar manda
ela procurar o que não tem.

**A referência histórica ao medidor está errada.** A fala diz que o `Mostrar placar` emprestado foi
"aposentado no comecinho da Aula 7". Ele sai no passo 4 da própria aula 6, e o fecho da aula 6 já
promete a volta dele aqui. A aula 7 só cita o medidor como conferência ("se o seu tiver sete blocos,
é porque o medidor ainda está aí").

**Uma promessa para a aula seguinte.** "É pra isso que ele existe separado do bloco de conta, que você
vai conhecer na próxima aula." O bloco de conta não existe no vocabulário dela hoje, então a frase
explica uma diferença entre uma coisa conhecida e uma desconhecida. O curso não promete peça para
depois. Sai a frase inteira.

**A demonstração da frase é um clipe para uma estrutura parada.** *Veja o número entrar na frase*
mostra três cartões alinhados e troca o 3 por 7. Não é um processo no tempo, é o desenho de uma
montagem, e cabe dentro do clipe que monta. O que vale conceito ali é outra coisa: a mesma frase com
dois resultados diferentes em duas partidas.

**Rótulos desatualizados em cinco pontos.** Na paleta 1.0: `Mudar o estado do jogo para __` (e não "Ir
para a tela"), `o estado do jogo é __ ?` (e não "a tela atual é"),
`Jogo 2D › Vida e placar › Indicadores e texto na tela` (e não "Placar e HUD"),
`Jogo 2D › Tempo › Quadros e intervalos` (e não "Tempo e repetição") e
`Jogo 2D › Jogo e telas › Telas e partida` (e não "Telas e cenas"). Os nomes antigos continuam
achando os blocos na busca, então a troca é só de fala.

**O `Criar variável` nasce escrito e a fala não diz.** O campo do nome vem com a palavra `contador`, e
o roteiro só manda "no nome escreve pontos". Pela regra de que todo campo recebe uma fala, a instrução
precisa dizer que ela apaga o que veio e escreve pontos. O valor, esse sim, já vem 0.

## Proposta final

### Seção 1. O que a gente vai fazer hoje

- **Intenção:** apresentação
- **Por que existe:** o resultado do dia é um número e uma frase, e os dois são pequenos na tela. Ver
  antes é o que dá destino ao que ela vai montar.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`): o jogo do fim do dia rodando. O dino corre, o número sobe sozinho no
     canto de cima, e quando a partida acaba a tela de fim diz "Você fez 14 pontos. Tente bater essa
     marca!". Fala: "Hoje o seu jogo começa a contar. Um ponto por segundo que você aguentar, o
     número aparecendo no canto enquanto você corre, e no fim a tela contando quanto você fez.
     Para isso o jogo precisa de uma coisa que ele ainda não tem: um lugar para guardar um número."
     Duração alvo: 20 a 30 segundos.

### Seção 2. A caixinha dos pontos

- **Intenção:** construção e conceito
- **Por que existe:** é a primeira memória do jogo dela, e o que ela faz não aparece na tela. Montar
  sem entender os três trabalhos faz a criança achar que o bloco não funcionou, e ainda deixa as duas
  montagens seguintes sem ligação entre si.
- **Conclui quando:** o `Criar variável pontos com valor 0` está no `Ao iniciar`, entre o
  `Criar grupo de sprites cactos` e o `Mudar o estado do jogo para inicio`
- **Blocos:**
  1. `dialogue`: "Em Programação, Variáveis, pega o bloco Criar variável com valor. Arrasta para
     dentro do Ao iniciar e encaixa entre o Criar grupo de sprites cactos e o Mudar o estado do jogo
     para inicio. O Ao iniciar tem seis blocos hoje, e o último é o Usar área de colisão, que você
     colocou ontem. Esse bloco novo tem dois campos. No nome vem escrito contador: apaga e escreve
     pontos. No valor já vem 0, e é isso que a gente quer, porque toda partida começa do zero."
  2. `video` (`video-caixinha`): o gesto e a palavra. Nomeia variável ("uma caixinha com um nome e um
     número guardado dentro, e o nome vem de variar, que quer dizer mudar"), desambigua na mesma
     frase ("essa caixinha não tem nada a ver com a caixa de colisão de ontem: aquela era um contorno
     em volta do dino, esta guarda um número"), e termina olhando a área do jogo, onde
     nada mudou. Duração alvo: 50 a 60 segundos.
  3. `studio`: conferência do bloco, do nome e do valor.

### Seção 3. Guardar, mudar e mostrar

- **Intenção:** exploração
- **Por que existe:** montar a caixinha e não ver nada acontecer é o instante em que a criança acha
  que errou. Os três trabalhos separados são a resposta para uma pergunta que ela acabou de fazer.
- **Conclui quando:** as três metas de `variable` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue`: a ponte a partir da tela que não mudou. "Você montou o bloco e a tela continua
     igualzinha. Isso é esperado, e vale entender por quê antes de seguir. Guardar um número, mudar
     esse número e mostrar esse número são três trabalhos diferentes. Aqui do lado dá para ligar e
     desligar cada um deles separado."
  2. `interactive`: cena `variable`, "Guardar, mudar e mostrar". Cenário: `corre-dino`. Metas
     cobradas: `stored`, `changed-hidden`, `shown`. Com o palpite antes de abrir: depois de três
     somas com o mostrar desligado, o que aparece quando ele liga.

**Dividida pela regra das duas colunas.** A montagem e a cena estavam na mesma seção, e a
conferência do Estúdio e a cena disputam a coluna da direita. Separadas, cada uma fica sozinha na
bancada. A ordem não muda: monta primeiro, e a cena responde logo depois.

**Por que a cena vem depois da montagem.** A pergunta que ela responde ("eu criei e não apareceu
nada, cadê?") só existe depois de a caixinha estar no projeto. É o mesmo desenho da aula 1, quando o
dino é criado e não aparece, e a cena `world` entra logo em seguida. Aqui o efeito é mais forte,
porque a caixinha não aparece nunca, nem depois de tudo pronto: quem aparece é o placar.

**Por que a cena não repete a aula 1.** Lá são dois trabalhos sobre um objeto, criar e mostrar. Aqui
são três sobre um número, e o do meio é o que a criança não tem como ver: o valor muda enquanto nada
na tela muda. Na cena ela soma três vezes com o mostrar desligado, liga o mostrar e encontra 3. É
exatamente o que vai acontecer no jogo dela quando o relógio começar a somar no menu, se ela esquecer
o `Se`.

**A cena entrega a próxima seção de graça.** A meta `shown` termina com o mostrar ligado, e a seção 4
é justamente ligar o mostrar no jogo dela.

### Seção 4. Ponha o número na tela

- **Intenção:** construção
- **Por que existe:** é o "mostrar" dos três trabalhos, feito no jogo dela, e traz junto uma dor que
  acontece sozinha, com os valores de fábrica: o bloco nasce branco e o céu do jogo é azul claro.
- **Conclui quando:** dentro do `Se o estado do jogo é jogando ?`, no fim, está o `Mostrar placar`
  com `valor da variável pontos` no valor, o rótulo `Pontos:`, x 12, y 30, tamanho 24, e uma cor
  escura no lugar do branco
- **Blocos:**
  1. `dialogue`: "Em Jogo 2D, Vida e placar, Indicadores e texto na tela, pega o bloco Mostrar
     placar. É o mesmo bloco que você pegou emprestado na aula 6 para ser o medidor de cactos, e que
     você aposentou no fim daquela aula. Agora ele volta para ficar. Arrasta para dentro do Se o
     estado do jogo é jogando e solta no fim de tudo, logo abaixo do Tirar do grupo cactos quem sair
     da tela. Ele vai aí dentro porque o placar é coisa de quem está jogando, e não precisa aparecer
     no menu. Ele tem seis campos. No primeiro já vem escrito Pontos:, que é o que a gente quer. No
     segundo, que é o valor, vai o que está dentro da caixinha: em Programação, Valores, pega o
     bloco valor da variável e arrasta por cima do número que já está ali, porque campo de valor
     nunca está vazio. Depois escolhe pontos nele. O x já vem 12, o y já vem 30 e o tamanho já vem
     24: confere os três e deixa como estão. O sexto é a cor, e é nele que a gente mexe daqui a
     pouco."
  2. `video` (`video-placar-e-contraste`): o gesto e a dor na mesma tomada. Roda com o placar branco,
     de propósito, e tenta ler o Pontos: 0 no céu claro. Depois troca a cor por um azul bem escuro e
     lê de longe. Fecha com a regra e com o nome: "fundo claro pede letra escura, fundo escuro pede
     letra clara" e "tudo que fica desenhado por cima do jogo para te informar tem um nome entre quem
     cria jogos: HUD. O placar é o HUD do seu jogo." Duração alvo: 70 a 80 segundos.
  3. `studio`: conferência do placar dentro do Se de jogando, com o `valor da variável pontos`
     encaixado no valor.

**Absorve a seção 4 de hoje.** A demonstração do contraste deixa de existir como seção, porque ela é o
segundo tempo desta montagem, no jogo dela, com o mesmo clipe.

**A cor é campo de gosto com critério dito.** A fala diz o critério (o céu é claro, então a letra
precisa ser escura), diz a escolha de quem grava ("o meu vai num azul quase preto") e devolve a
escolha. A conferência automática não testa cor, e não deve passar a testar.

**O `valor da variável` é a peça que a cena adiantou.** Vale dizer em uma frase: "esse bloco vai lá na
caixinha, olha o que tem dentro e traz o número. Se você deixasse o número solto que estava ali, o
placar ia mostrar aquele número para sempre, mesmo com a caixinha mudando."

### Seção 5. Quando o placar cresce

- **Intenção:** conceito
- **Por que existe:** o `Somar 1` vai morar dentro de dois encaixes, e cada um está lá por um motivo
  diferente. Um decide com que frequência somar, o outro decide em que telas somar. Montar os dois de
  uma vez sem ver os dois motivos é copiar gesto. É também aqui que a aula de hoje manda a criança
  adivinhar, e essa pergunta some.
- **Conclui quando:** as cinco metas de `score` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue`: "O bloco que soma é um só. O que muda tudo é onde ele mora. Aqui você põe ele em
     lugares diferentes e olha o placar em cada tela do jogo."
  2. `interactive`: cena `score`, "Quando o placar cresce?", com o controle de frequência novo.
     Elenco: personagem Dino, obstáculo cacto. Cenário: `corre-dino`. Metas cobradas:
     `score-runaway`, `score-idle-wrong`, `score-start`, `score-playing`, `score-end`.

**Sem vídeo, de propósito.** A cena mostra o placar, as três telas e o lugar da peça ao mesmo tempo.
Narrar por cima seria descrever o que já está na tela.

**Por que a frequência entra aqui e não numa montagem errada de propósito.** A alternativa seria
encaixar o `Somar 1` dentro do `A cada quadro do jogo` no jogo dela, ver o placar disparar e depois
mover para o relógio. A dor seria ótima, mas custa um desvio de montagem e ainda obriga a arrastar um
bloco para fora do laço, que é a operação em que ela mais se perde. Ela já levou essa mesma armadilha
na cara na aula 5, com a avalanche de cactos. Na cena, ela vê os três lugares lado a lado sem tocar
num jogo que hoje está grande.

### Seção 6. O relógio dos pontos

- **Intenção:** construção
- **Por que existe:** é o "alterar" dos três trabalhos, e é a vitória do dia: o número sobe sozinho
  enquanto ela corre.
- **Conclui quando:** dentro do `Enquanto estiver rodando`, ao lado do `A cada quadro do jogo` e do
  `A cada 1.4 segundos`, existe um `A cada 1 segundos` com um `Se` dentro, com a pergunta
  `o estado do jogo é jogando ?` na condição e o `Somar 1 em variável pontos` no então
- **Blocos:**
  1. `dialogue`: "Em Jogo 2D, Tempo, Quadros e intervalos, pega o bloco A cada segundos. Arrasta para
     dentro do Enquanto estiver rodando e solta ao lado do A cada quadro do jogo e do A cada 1.4
     segundos, do mesmo jeito que você fez na aula 5. Ao lado, e não dentro deles. Agora o seu motor
     tem três relógios vizinhos, cada um com o seu ritmo. Nesse novo, põe 1. Agora o Se, e aqui são
     três movimentos, não quatro: hoje não tem bloco montado para envolver. Primeiro, em Programação,
     Lógica e Se, pega o bloco Se. Segundo, tira a comparação que veio de fábrica dentro dele e joga
     na lixeira. Terceiro, em Jogo 2D, Jogo e telas, Telas e partida, pega a pergunta o estado do
     jogo é, encaixa no lugar que ficou vazio e escolhe jogando. Solta esse Se dentro do relógio
     novo. Por último, em Programação, Variáveis, pega o Somar em variável e encaixa dentro do Se. O
     número já vem 1, deixa. Na listinha da variável escolhe pontos."
  2. `video` (`video-relogio-pontos`): o gesto inteiro, com a câmera mostrando os três relógios lado a
     lado depois do encaixe, e a partida com o placar subindo de um em um. Fecha reconhecendo o
     tamanho do que ela fez: "você usou uma peça que aprendeu seis aulas atrás numa situação
     diferente, e é isso que quem cria jogo faz o dia inteiro." Duração alvo: 70 a 80 segundos.
  3. `studio`: conferência do relógio, do `Se` e do incremento, com a exigência de um único
     incremento de pontos no projeto.

**O intervalo é campo de gosto.** A fala diz "o meu fica em 1 segundo", e diz que 0.5 conta mais
rápido e 3 conta mais devagar. Isso é dito no campo, sem virar tarefa de testar, e sem prejudicar
nada: nenhuma aula posterior cita esse número.

**Correção de critério, registrada.** O critério `relogio-pontos` do v6 cravava `SECS: 1`, e o
mesmo número reaparecia cravado no critério herdado da Aula 13. Campo declarado livre não pode virar
critério exato: quem aceitasse o convite do vídeo e escolhesse 0,5 ou 3 reprovava na entrega. A
conferência passa a exigir a estrutura inteira (relógio próprio, `Se` do estado em jogando, `Somar 1`
em pontos) e deixa o intervalo sem critério, com a faixa de 0,5 a 3 escrita no rótulo. A correção vale
nesta aula e na entrega da Aula 13, que revalida o mesmo relógio.

**Nome certo para a manobra.** Não é embrulhar no Se. Chamar assim manda ela procurar blocos para
envolver, e o `Se` desta aula nasce junto com o conteúdo. A fala diz "três movimentos" e cita a aula 7
como a aula em que o `Se` foi aprendido, não como a manobra que está sendo repetida.

### Seção 7. A tela de fim conta a sua partida

- **Intenção:** construção
- **Por que existe:** é o capricho que fecha o ciclo do número. Ele foi guardado, foi mudado, foi
  mostrado durante a partida, e agora ele volta dentro de uma frase, depois que a partida acabou.
- **Conclui quando:** no andar de fim do `Se`, o subtítulo do `Mostrar tela` é um `juntar texto` com
  três pedaços, nesta ordem: texto, `valor da variável pontos`, texto
- **Blocos:**
  1. `dialogue`: "Vai no Mostrar tela do andar de fim, no subtítulo. Lá na aula 8 você viu que o
     título, o subtítulo e a dica não são campos: cada um é uma pecinha texto encaixada num espaço.
     Como é uma pecinha, dá para tirar ela e pôr outra coisa no lugar. Em Programação, Valores, pega
     o bloco juntar texto e arrasta por cima do subtítulo. Ele nasce vazio, sem espaço nenhum, porque
     quem decide quantos pedaços vai ter é você. Na beirada dele tem um mais, o mesmo que você usou
     na aula 8. Clica três vezes, um para cada pedaço. Cada espaço nasce com um zero de sombra, que
     some quando você arrasta alguma coisa por cima. No primeiro, um bloco texto com: Você fez, e um
     espaço depois da palavra fez. No segundo, o valor da variável, escolhendo pontos. No terceiro,
     outro bloco texto, com um espaço no começo e depois: pontos. Tente bater essa marca!"
  2. `video` (`video-frase-de-fim`): o gesto inteiro, com zoom no bloco vazio e nos espaços nascendo,
     e com os três pedaços lado a lado na ordem em que aparecem na tela. Depois, duas partidas
     seguidas, perdendo de propósito nas duas, com números diferentes na mesma frase. Fala: "a frase
     é a mesma, e o número no meio dela é o que você fez naquela partida." Fecha com a peça de
     conserto: se sobrar um espaço com o zero dentro, o menos ao lado do mais fecha o último; se
     aparecer o alerta no bloco, é espaço vazio, e clicar nele diz onde. Duração alvo: 80 a 90
     segundos.
  3. `studio`: conferência dos três pedaços na ordem.

**Absorve a demonstração de hoje.** Os três cartões alinhados e a troca de um número por outro viram
os dois primeiros tempos deste clipe, com a vantagem de o número novo vir de uma partida de verdade
em vez de uma troca manual.

**Sai a frase sobre o bloco de conta.** Ela compara o `juntar texto` com uma peça que a criança ainda
não conhece, e promete essa peça para a aula seguinte. O que fica no lugar é o que o nome do bloco já
diz: ele junta pedaços e escreve.

### Seção 8. Teste, envie e fecha

- **Intenção:** entrega e fechamento
- **Por que existe:** fecha o ciclo com o jogo rodando e guarda as ideias do dia, incluindo a que só
  aparece no teste: a memória volta a zero a cada partida.
- **Conclui quando:** a entrega é enviada e as três perguntas são respondidas
- **Blocos:**
  1. `video` (`video-teste-e-envio`): os quatro testes um de cada vez, com o canto do placar
     enquadrado nos testes 2 e 4, os objetivos conferidos e o gesto de enviar na tela. O clipe
     **passou a fechar com as três ideias do dia**, que eram balão: o jogo ganhou memória, e
     guardar, mudar e mostrar são três trabalhos diferentes, montados um de cada vez, a caixinha no
     `Ao iniciar`, o placar dentro do `Se` de jogando e o `Somar` dentro do relógio. **E fecha com a
     explicação do zero**, que também era balão e só faz sentido depois do teste: toda partida
     começa do zero porque o `Reiniciar o jogo` roda as três áreas do projeto de novo, e o
     `Criar variável pontos com valor 0` mora dentro do `Ao iniciar`. O zero não é sorte, é o lugar
     onde o bloco mora. **Entrou pela regra de que toda seção com o Estúdio embarcado tem um vídeo
     mostrando como se faz.** Duração alvo: 70 a 85 segundos.
  2. `quiz`: as três perguntas atuais, mantidas, com os rótulos corrigidos.
  3. `studio`: entrega, com os cinco critérios atuais mantidos. Criar pontos com zero no `Ao iniciar`,
     placar dentro do Se de jogando lendo a variável, somar 1 a cada 1 segundo só com o estado do
     jogo em jogando, o subtítulo do fim com os três pedaços na ordem, e um único incremento de
     pontos no projeto inteiro. É o último item de `blockKeys`.

**Junta três seções de hoje.** A entrega, o fecho e o quiz viram uma seção só. O clipe que fica na
seção é o de teste e envio, e ele leva o dia todo: os quatro testes acontecendo, o envio, e o fecho.

**Por que os quatro balões saíram.** Balão depois da ferramenta não existe para quem faz a aula: o
Estúdio fica sozinho na coluna da direita e todo o resto na esquerda, então "depois do Estúdio" não
é um lugar. E o roteiro de teste era o caso mais cru de passo a passo do curso, numerado de primeiro
a quarto em dois balões seguidos, que é exatamente o que a tela faz melhor. Nada foi apagado. Os
quatro testes, as três ideias e a explicação do zero foram para o roteiro do `video-teste-e-envio`.
Esta aula não tem gancho para a seguinte, então nenhum balão ficou.

**Quiz, com os rótulos atualizados:**

1. Qual peça faz o placar acompanhar a memória? *valor da variável pontos* (correta) · um número zero
   digitado no placar.
2. Quando o relógio deve somar pontos? *Somente enquanto o estado do jogo é jogando* (correta) ·
   também no menu e no fim.
3. Para que serve o juntar texto? *Para formar uma mensagem com os pedaços em ordem* (correta) · para
   somar todas as palavras.

## Experiências e demonstrações desta aula

### 1. `variable` · Guardar, mudar e mostrar · **CONSTRUÍDA, SERVE COMO ESTÁ**

- **Situação:** a cena existe no catálogo, com três metas, pergunta final, pistas e roteiro de
  demonstração, e **nenhuma aula do Corre Dino a usava**. Ela foi escrita com o vocabulário desta
  aula: a caixa se chama pontos, o botão se chama `Somar 1 em pontos` e a chave se chama
  `Mostrar placar`. Serve como está, e esta aula é quem a liga.
- **Tipo:** experimentação. A relação tem botão, e o botão é o que ela liga e desliga: guardar, somar
  e mostrar são três controles separados, e a criança escolhe a ordem em que aciona cada um.
- **Elenco/cenário:** cenário `corre-dino`. A cena não precisa de personagem nem de obstáculo, mas o
  fundo e o placar seguem o visual do jogo dela, para o `Mostrar placar` da cena ser reconhecível
  como o mesmo bloco que ela vai montar em seguida.
- **Metas cobradas nesta aula:** `stored`, `changed-hidden`, `shown`, que são as três da missão de
  fábrica. O bloco **não declara `setup.goals`** de propósito: a cena não tem meta só de caso, e sem
  lista ela cobra exatamente estas três.

**Ajuste 1, a fala do roteiro de demonstração: não foi feito, e o código vence.** O passo 2 continua
dizendo "Três acertos: a caixa vai para 3", e o palpite de fábrica da cena fala de um acerto que soma
1. A cena é compartilhada com o Dia 4 do Desafio, onde o ponto vem mesmo de acertar, e ela foi
escrita com aqueles números. No Corre Dino o ponto vem do tempo que o jogador aguenta, então a fala
que abre a seção é quem faz a ponte: ela diz que naquele modelo cada ponto vem de um acerto e que no
jogo dela vem de um segundo. **Fechado pela dona em 20/09/2026: nada a fazer.** A frase "Três
acertos: a caixa vai para 3" vive no roteiro de demonstração da cena, e esta aula usa a cena em
**experimentação**, então a frase nunca aparece na tela de quem assiste. O `goalCopy` também não
serviria, porque ele só alcança o rótulo e o pedido da meta.

**Ajuste 2, a pergunta extra.** "E se você mostrar primeiro e mudar depois?" continua boa e vale
manter, porque é exatamente o que acontece no jogo dela na ordem em que ela monta: o placar entra na
seção 3 e o `Somar` só na seção 5.

**Ajuste 3, a instrução de abertura.** Mantida: "Guarde um número na caixa. Mude o número sem mostrar.
Só depois ligue o mostrar." Ela já descreve a ordem certa das três metas.

**Onde mais serve:** toda aula da trilha em que a primeira variável nasce. No Corre Dino, ela é
cobrada de novo, sem repetir, na aula 13, quando a segunda variável (`velocidade`) é criada e faz uma
coisa que esta não faz: comanda o jogo em vez de contar. A cena `lives` do catálogo é a irmã dela, com
duas contagens separadas, e serve ao curso 3 e ao curso 6.

### 2. `score` · Quando o placar cresce? · **CONSTRUÍDA, AJUSTES APLICADOS**

- **Situação:** o palco (três telas, placar, peça que se move de lugar) é o certo, e a cena cobrava
  duas metas onde o roteiro descreve cinco. Agora ela cobra cinco, e a pergunta de frequência, que a
  aula transformava num exercício proibido, virou meta.
- **Elenco:** personagem Dino, obstáculo cacto. **Cenário:** `corre-dino`.
- **Metas cobradas nesta aula:** `score-runaway`, `score-idle-wrong`, `score-start`,
  `score-playing`, `score-end`, que são as cinco da missão de fábrica. O bloco **não declara
  `setup.goals`** de propósito: sem lista, a cena cobra as cinco e deixa de fora as duas metas só de
  caso, `score-waiting` e `score-kept`.

**Ajuste 1, as duas metas que faltavam: feito, com ids diferentes dos propostos.** As duas
descobertas existem, com estes ids e estes pedidos:

| id | rótulo ao cair | pedido na faixa |
|---|---|---|
| `score-start` | "Dentro de Se jogando, o início esperou" | "Com a peça solta, deixe o tempo passar no início. Depois leve Somar ponto para Se jogando e espere de novo." |
| `score-end` | "No fim, o placar parou no valor" | "Depois de ver os pontos crescerem jogando, aperte Próxima tela até Fim e deixe o tempo passar." |

Sem a segunda, a cena ficaria sem a resposta da própria pergunta final, que é "por que o placar parou
no fim?".

**Divergência registrada, e o código vence.** Esta análise propôs os ids `score-waiting` e
`score-kept`. Os dois existem no catálogo, como metas só de caso, e o que entrou na missão de fábrica
foram `score-start` e `score-end`. A diferença não é só de nome: as duas de fábrica são
**comparações**, e o motor só as concede depois do contraste. A `score-start` exige que a peça solta
tenha somado no início antes, e a `score-end` exige que os pontos tenham crescido jogando antes,
senão dois toques em "Próxima tela" levariam ao Fim com o placar em 0 e a meta afirmaria que ele
"parou". A aula cobra `score-start` e `score-end`.

**Ajuste 2, o controle de frequência: feito.** Era o ajuste grande. A peça `Somar ponto` tem três
lugares possíveis em vez de dois: **solta**, dentro do **`A cada quadro do jogo`** e dentro do
**`A cada 1 segundos`**, as duas últimas podendo estar dentro ou fora do `Se`. Com isso entrou a
meta:

| id | rótulo ao cair | pedido na faixa |
|---|---|---|
| `score-runaway` | "No quadro, o placar disparou: 60 por segundo" | "Ponha Somar ponto dentro do A cada quadro do jogo e deixe passar um segundo inteiro." |

Essa meta é a que substitui a pergunta banida. Hoje a aula conta que seriam 60 pontos por segundo e
pede que a criança deduza sozinha onde o bloco vai. Com o controle, ela põe no quadro, o placar sai de
0 e vai para 60 num segundo, e a conclusão chega pelos olhos. É a mesma armadilha da avalanche da aula
5, agora com um número em vez de uma parede de cactos, e a cena diz isso na explicação.

**Ajuste 3, a instrução de abertura.** De "Deixe o tempo passar em cada tela (início, jogando e fim) e
olhe o placar. Depois mude o Somar ponto de lugar e compare." para "Ponha o Somar ponto em cada lugar
e olhe o placar. Depois passe pelas três telas: início, jogando e fim."

**Ajuste 4, a frase de sucesso.** De "Os pontos crescem jogando e ficam guardados fora da partida!"
para "Onde a peça mora decide duas coisas: quantas vezes por segundo, e em quais telas."

**Ajuste 5, os rótulos.** A cena fala em "Se jogando" e em "tela". Passa a usar
`o estado do jogo é jogando ?`, que é o rótulo da paleta 1.0, mantendo a palavra tela só para o que a
criança vê (início, jogando, fim), que é como o curso já fala.

**Ajuste 6, a pergunta final.** Mantida ("Por que o placar parou no fim?"), com a explicação ganhando
a metade nova: "O número continua guardado no fim. Quem decide **quando** somar são duas coisas
juntas: o relógio, que decide de quanto em quanto tempo, e o Se, que decide em que telas."

**Onde mais serve:** qualquer curso da trilha com pontuação por tempo ou por evento, e é a cena
natural da aula 13 daqui também, quando o relógio de 5 segundos entra com o mesmo desenho (relógio
irmão mais `Se` do estado). Curso 5 e curso 6 a reaproveitam inteira.

### 3. `once-vs-always` · **CONSIDERADA E RECUSADA NESTA AULA**

O caso existe: o `Criar variável pontos com valor 0` roda uma vez, no `Ao iniciar`, e o
`Somar 1 em variável pontos` roda de novo a cada segundo. Se a criação estivesse no motor, o número
voltaria a zero sem parar. Mesmo assim a cena não entra. As áreas do projeto são conteúdo das aulas 1
e 2 deste curso, e ela usa as duas há nove aulas. O elenco da cena é a nave do Desafio, e vocabulário
de outro jogo é proibido aqui. E a consequência específica ("se a caixinha fosse criada no motor, o
número nunca subiria") é dita em uma frase dentro do fecho, junto com a explicação da memória zero,
onde ela faz mais sentido porque a criança acabou de ver o zero voltar no teste.

## Vídeos

| Chave | Título do clipe | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-abertura` | Hoje o seu jogo começa a contar | o jogo do fim do dia: o número subindo e a frase de fim | `video-abertura-editorial` | 20 a 30 s | fala sim, tela regravada |
| `video-caixinha` | A caixinha que guarda um número | o gesto do `Criar variável`, a palavra variável, a desambiguação e a tela que não muda | `video-guardar-pontos` | 50 a 60 s | fala sim, com a correção da âncora e do campo do nome |
| `video-placar-e-contraste` | O placar que some no céu | o gesto do placar, o branco sumindo no céu e a troca de cor | `video-mostrar-pontos` + `video-contraste` | 70 a 80 s | funde os dois clipes, que hoje trazem o mesmo trecho |
| `video-relogio-pontos` | O terceiro relógio | o terceiro relógio, o `Se` novo de três movimentos e o número subindo | `video-relogio-pontos` | 70 a 80 s | fala parcial: sai a pergunta ao aluno, entra a condução, e some a palavra embrulhar |
| `video-frase-de-fim` | A frase que muda de partida para partida | os três pedaços, os espaços, e duas partidas com números diferentes | `video-frase-dinamica` + `video-montar-frase` | 80 a 90 s | funde dois clipes; sai a frase sobre o bloco de conta |
| `video-teste-e-envio` | Quatro testes no placar e o envio | o menu sem número, o placar em zero e subindo, as duas frases de fim com números diferentes, o gesto de enviar, as três ideias do dia e a explicação do zero | novo | 70 a 85 s | não, gravação nova |

**Saldo:** de 8 clipes para 6. Duas fusões de pares, o clipe de fecho antigo sai e o fecho passa a
ser o fim do clipe da entrega, e a entrega ganha clipe pela regra de que toda seção com o Estúdio
embarcado tem um vídeo mostrando como se faz. A explicação do conceito central saiu da narração e foi
para uma cena que já existia e estava parada no catálogo.

## Continuidade

- **O que esta aula assume da anterior:** o jogo com a colisão justa da aula 10. O `Ao iniciar` tem
  seis blocos e o último é o `Usar área de colisão de 80 % do tamanho para o sprite dino`, e **não** o
  `Mudar o estado do jogo para inicio`, como a fala de hoje afirma. Dentro do
  `Se o estado do jogo é jogando ?`, o último bloco é o `Tirar do grupo cactos quem sair da tela`, e
  isso só é verdade porque o raio-X foi retirado ontem. Se ele ficar, a âncora do placar cai no lugar
  errado.
- **O que esta aula entrega para a seguinte:** o `Ao iniciar` com sete blocos, incluindo o
  `Criar variável pontos com valor 0` entre o `Criar grupo de sprites cactos` e o
  `Mudar o estado do jogo para inicio`. O `Enquanto estiver rodando` com três raízes irmãs: o
  `A cada quadro do jogo`, o `A cada 1.4 segundos` e o `A cada 1 segundos`. O placar dentro do Se de
  jogando, no fim. O subtítulo do andar de fim montado com `juntar texto`. A aula 12 não mexe em nada
  disso: ela trabalha no `A cada 1.4 segundos`, no x e no vx do cacto.
- **O que a aula 13 reaproveita daqui:** o desenho inteiro do relógio dos pontos. Ela cria a segunda
  variável (`velocidade`, com menos 5) logo abaixo do `Criar variável pontos`, e monta um quarto
  relógio (`A cada 5 segundos`) com o mesmo `Se` de três movimentos. Quando chegar lá, a remissão para
  trás é para hoje.
- **Valores canônicos que saem daqui:** variável `pontos` com valor inicial 0 · placar com rótulo
  `Pontos:`, x 12, y 30 e tamanho 24, os três de fábrica · relógio do ponto em 1 segundo, com 0.5 e 3
  oferecidos como gosto · incremento de 1 · subtítulo do fim com "Você fez ", o valor de pontos, e
  " pontos. Tente bater essa marca!".
- **Campos livres:** a cor do placar, com o critério dito (escura, porque o céu é claro), e o intervalo
  do relógio do ponto. Nenhuma aula posterior cita esses dois por valor.
- **Critérios afrouxados para honrar os campos livres:** `relogio-pontos` perdeu o `SECS` cravado e a
  cor do placar continua sem critério, como sempre esteve. A estrutura segue exigida por inteiro.
