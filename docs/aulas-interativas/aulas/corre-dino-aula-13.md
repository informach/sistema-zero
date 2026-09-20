# Corre, Dino! · Aula 13 · O jogo aperta, e sabe onde parar

> Última aula do curso. Além do conteúdo do dia, esta aula carrega o fecho de treze aulas, e o fecho
> é responsabilidade dela.

## Resumo

- **Estado de entrada:** o jogo da Aula 12, completo e imprevisível. Cactos nascendo a cada 1,4 s num
  x sorteado entre 500 e 560, com vx de `-5 - (um número de 0 a 1)`, faxina, três estados do jogo,
  colisão com área de 80%, placar, tela de início e tela de fim com a marca.
- **Vitória do dia:** o jogo fica mais difícil quanto mais ela sobrevive, e para de apertar num
  limite que ela escolheu. Ao fim da seção 7, ela vê o código de verdade que os blocos dela viraram.
- **Seções hoje:** 11 · **Seções propostas:** 8
- **Clipes hoje:** 8 · **Clipes propostos:** 6, sendo 1 fusão de par e 1 recorte de um clipe só
- **Cenas:** 2, as duas construídas no catálogo: a `number-line`, que estreia aqui e nasceu desta
  análise, e a `acceleration`, com a meta que faltava criada

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| A dor: depois de vinte segundos o jogo está idêntico | Não. Ela joga e sente | Não | | | Roda na tela dela, na abertura, e a seção fecha sozinha antes de a ferramenta aparecer |
| Um número num lugar só comanda o jogo inteiro | Sim. A troca não muda nada na tela, e é justamente isso que precisa ser entendido | **Sim, mas não na mesma seção** | Experimentação (`acceleration`) | Depois de montar o acelerador | O nome se diz na montagem, e a prova exige uma base que ande. A base só anda depois do relógio de 5 s existir |
| Base contra velocidade recebida ao nascer | Sim. É a expectativa errada mais provável: mexer na caixinha e achar que os cactos que já estão na tela mudam junto | **Sim** | Experimentação (`acceleration`, meta `old-speed`) | Depois de montar | Hoje é uma seção de vídeo colocada três seções antes da cena que prova a mesma coisa |
| -5 é maior que -9 | Sim, e contraria a intuição de quem acabou de aprender que 9 é maior que 5 | **Sim** | Experimentação (`number-line`) | Antes de montar | Sem isso, `velocidade > -9` é um desenho sem significado, e ela monta copiando gesto |
| O erro silencioso do sinal igual | Sim. É o único erro do curso que não tem sintoma nenhum na tela | **Sim**, na mesma cena | Experimentação (`number-line`, meta `silent`) | Antes de montar | Erro sem sintoma não se ensina olhando o jogo. Só se ensina num lugar onde a resposta da pergunta é legível a cada passo |
| Somar -1 é tirar 1 | Sim, um pouco | **Sim**, na mesma cena | `number-line`, no botão que anda o marcador | Antes de montar | Cabe no mesmo palco, com o mesmo gesto, e é literalmente o que o relógio vai fazer |
| O limite segura a base, e o sorteio vem depois dela | Sim. É a correção registrada do curso | **Sim** | Experimentação (`acceleration`, meta `variation-limit`) | Depois de montar | Antes disso, o -10 só existia na frase de sucesso da cena, sem nenhuma meta que o produzisse |
| O terceiro relógio é irmão dos outros dois, não filho | Não. É âncora de encaixe | Não | | Na fala de montagem | Eixo do Estúdio: a narração conduz do primeiro ao último gesto |
| Um `Se` dentro de outro `Se`, e a comparação de fábrica que desta vez fica | Não. É montagem, e as peças estão à vista | Não | | Na fala de montagem, citando a Aula 7 | É a única vez do curso em que a comparação de fábrica é aproveitada em vez de descartada. Isso merece uma fala explícita, não uma cena |
| Balanceamento | Não. Ela troca o número e joga | Não | | Demonstração por extremos conduzida pela narração | O efeito aparece na partida dela, e os dois campos ficam sendo dela |
| A Ponte: os blocos viram código de verdade | Sim, e é o fecho do curso | **Sim, e não por cena** | Painel real do Estúdio, aberto no projeto dela, com vídeo do caminho | No fechamento | Uma simulação seria mais fraca do que a coisa real. É o código dela, com o nome do sprite que ela escolheu |
| Carreira de Criador, troféus e Mural | Não. É informação da plataforma | Não | | No fechamento | E sem certificado, porque o curso não tem |
| Publicar e compartilhar | Não | Não | | No fechamento, como convite | Não é requisito de conclusão, e não pode ser escrito como se fosse |

Treze coisas, cinco concretizações em duas cenas. Oito não ganham nada, e as duas maiores (a Ponte e
o balanceamento) não ganham porque a coisa real é melhor do que qualquer simulação.

## Diagnóstico do desenho atual

**O conceito e a cena que o prova estão a três seções de distância.** A seção *Quem lê a nova
velocidade?* existe para ensinar que o cacto antigo guarda a velocidade que recebeu e o próximo lê a
base nova. É um vídeo, sozinho. Três seções depois, *Teste a base, o limite e os próximos cactos*
abre a cena `acceleration`, cuja terceira descoberta é, com estas palavras, "Os cactos velhos não
mudaram de número". A ideia é partida ao meio, e no meio dela a criança monta duas coisas e assiste a
outro vídeo.

**A cena prometia na frase de sucesso o que nenhuma meta produzia, e agora produz.** A frase de
sucesso de `acceleration` é "A base parou em −9, e mesmo assim um cacto saiu com −10. O sorteio vem
depois da base!". O palpite da aula também é sobre o -10. As metas do catálogo do v6 eram três,
`base-limit`, `old-speed` e `past-limit`, e nenhuma delas era o -10. A segunda descoberta do roteiro,
"Mesmo parada em −9, saiu um cacto −10", virou a meta `variation-limit`, e ela é a segunda da missão,
logo depois de `base-limit`.

**O conceito mais difícil da aula está inteiro dentro de um clipe.** A seção *Veja quando a base
chega ao limite* carrega, de uma vez: a régua dos negativos, a analogia da temperatura, a troca do
sinal igual pelo maior, e o aviso de que o igual não dá erro nenhum. A nota **Na tela** pede "régua
com -9, -8, -7, -6, -5, percorrer uma marca por vez, mostrar a comparação verdadeira/falsa por texto
e ícone". Isso é a descrição de uma cena, escrita como instrução de arte para um vídeo.

**O erro silencioso do curso estava sendo ensinado por aviso, e agora tem lugar próprio.** A fala
gravada diz "se você esquecer o sinal no igual o jogo não vai dar erro nenhum. Nenhum iconezinho,
nenhum aviso. Ele só nunca vai acelerar". Um erro que não tem sintoma não se aprende sendo avisado
sobre ele: ele se aprende sendo visto acontecer num lugar onde a consequência é legível. Esse lugar é
a cena `number-line`, na meta `silent`, onde a resposta da pergunta fica escrita embaixo da régua a
cada passo.

**Decisão de produto de 20/09/2026. A revisita de acessibilidade saiu desta aula.** A seção *Conte
todos os controles ao jogador* carregava três assuntos: um clipe de balanceamento (trocar o limite
para -7 e -14, o relógio para 2 e 10), três partidas comparadas com as da Aula 9, e a revisita do
bloco de acessibilidade encaixado na Aula 1. A dona tirou o tema do curso inteiro: ele é complexo
demais para o primeiro curso da trilha e não muda nada na tela de quem está aprendendo, e pode virar
um curso bônus depois. Como a Aula 1 não encaixa mais esse bloco, não há o que revisitar aqui.

**O que saiu daqui, em 20/09/2026:** a seção de exploração com a cena de acessibilidade, a seção que
levava a correção ao projeto, o clipe do gesto e o critério de entrega que comparava a frase letra
por letra. O balanceamento, que estava de carona nessa parte da aula, **não se perdeu**: ele já
tinha virado clipe próprio na abertura da entrega, e é lá que continua. Para quem for auditar isto
daqui a três meses: a ausência **não é defeito**, é escolha, e não deve ser "consertada" de volta.

**Os critérios de entrega brigam com a tabela de campos livres.** O critério
`acelerar-com-limite` exige, literalmente, "A cada 5 s, se jogando e velocidade > -9, some -1 em
velocidade", com o 5 e o -9 fixos. A tabela de campos livres da referência do curso lista o limite da
aceleração (faixa -7, -9, -14) e o relógio da aceleração (faixa 2, 5, 10) como os **dois últimos
campos livres do curso**. Quem seguir o convite do vídeo e deixar -14 reprova na entrega. Este é o
conflito mais grave da aula, e **a recomendação é manter os dois campos livres**, com o critério
final passando a aceitar a faixa: não existe Aula 14 para quebrar, e o argumento da referência (é o
último lugar do curso em que o jogo vira dela) é bom demais para ser perdido por causa de um número
cravado num critério.

**Uma âncora de encaixe afirma um fato que não é mais verdade.** A fala de *Crie a memória da
velocidade* diz: "solta logo acima do Ir para a tela inicio. Aquele Ir para a tela continua sendo o
último bloco do Ao iniciar, igual desde a Aula 7". Desde a decisão de 2026-08-03, registrada na
montagem final da referência, o último bloco do `⚙️ Ao iniciar` é o
`Usar área de colisão de % do tamanho para o sprite`, encaixado na Aula 10 **depois** da mudança de
estado. A criança olha a tela dela e vê outra coisa, exatamente no primeiro passo da última aula.

**Os endereços da paleta que a aula cita não existem mais.** A fala manda "Jogo 2D, subcategoria
Tempo e repetição", e na edição atual o bloco `A cada segundos` mora em **Jogo 2D › Tempo › Quadros e
intervalos**. A fala chama a pergunta do estado de "a tela atual é", e hoje o rótulo literal é
`o estado do jogo é ?`, em **Jogo 2D › Jogo e telas › Telas e partida**. A fala chama o bloco de
mudar de tela de "Ir para a tela", e hoje o rótulo é `Mudar o estado do jogo para`, no mesmo lugar.

**O fecho do curso está inteiro num clipe só, e ele carrega quatro coisas incompatíveis.** O
`video-fecho-editorial` tem o resumo da conquista, a Ponte, o passo a passo de publicar e a promessa
de XP. As decisões registradas mandam tirar duas: publicar e compartilhar não podem ser requisito de
conclusão, e números de XP não conferidos não podem ser prometidos. Sobram duas, e elas são de
naturezas diferentes: a Ponte é uma descoberta, e o resumo é uma despedida. Num clipe só, a
descoberta vira item de lista.

**A aula não tem apresentação de verdade.** *O que vamos fazer hoje* é, na gravação, a dor sendo
mostrada: ela joga, sobrevive, e o jogo está igual. É boa, e é a dor. A seção seguinte já é
construção. Então a apresentação da última aula do curso é uma seção que não apresenta nada.

## Proposta final

### Seção 1. O seu jogo não aperta

- **Intenção:** dor (absorve a apresentação)
- **Por que existe:** a última dor do curso é a mais sutil de todas, porque o jogo não quebra: ele
  fica bom demais para quem está indo bem. A criança precisa jogar e sentir o vazio de vinte segundos
  idênticos antes de ouvir a palavra dificuldade.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-jogo-nao-aperta`): o jogo dela rodando, com alguém sobrevivendo bastante. No
     começo é gostoso. Vinte segundos depois, é exatamente igual: mesma velocidade, mesmo esforço.
     A fala nomeia o problema sem inventar nada: quem está indo bem merecia um desafio maior, e não
     mais do mesmo. Em seguida, a comparação marcada com os jogos que ela conhece, que vão ficando
     mais difíceis conforme ela avança. Fecha com a promessa do dia em uma frase: hoje o jogo dela
     aprende a apertar sozinho, e aprende também onde parar. Duração alvo: 40 a 55 segundos.

**Junta duas seções de hoje.** *O que vamos fazer hoje* e a dor eram a mesma gravação. A dor fecha
sozinha, e a ferramenta só aparece na seção seguinte.

### Seção 2. Um número que manda em todos os cactos

- **Intenção:** construção
- **Por que existe:** os dois gestos (criar a caixinha e fazer o cacto ler ela) produzem uma coisa só:
  a velocidade passa a morar num lugar em vez de estar escrita dentro do bloco. Separar os dois é
  partir um movimento ao meio, e o segundo sozinho não tem resultado nenhum na tela.
- **Conclui quando:** existe um `Criar variável com valor` com nome velocidade e valor -5 dentro do
  `⚙️ Ao iniciar`, e o lado esquerdo da `Conta matemática` do campo vx é um
  `valor da variável velocidade`, com o `um número de a` de 0 a 1 preservado do lado direito
- **Blocos:**
  1. `dialogue`: a conferência primeiro, porque tudo depende dela. "Antes de mais nada, abre o seu
     bloco `No grupo criar obstáculo em x tamanho com vx` e olha o campo vx. Do lado esquerdo da
     conta tem que estar -5. Se estiver outro número, põe -5 agora." Depois o primeiro gesto, com a
     âncora nomeando os dois vizinhos: "em Programação, Variáveis, pega o `Criar variável com valor`
     e encaixa dentro do `⚙️ Ao iniciar`, **entre** o `Criar variável pontos com valor 0` e o
     `Mudar o estado do jogo para inicio`. No nome escreve velocidade. No valor escreve -5, que é o
     mesmo número que os seus cactos já usam." E o segundo gesto: "agora em Programação, Valores,
     pega o `valor da variável` e arrasta ele **por cima** do -5, que é o pedaço da esquerda da
     conta. Nele escolhe a velocidade."
  2. `video` (`video-memoria-e-leitura`): os dois gestos seguidos, e depois a partida rodando. A fala
     guarda o melhor do trecho gravado, que é a honestidade sobre o resultado: está igualzinho, e
     está certo, porque a caixinha guarda -5, que é exatamente o número que estava ali antes. O que
     mudou não está na tela: mudou **de onde vem** a velocidade. Antes ela estava escrita dentro do
     bloco. Agora ela mora numa caixinha, e o bloco vai lá olhar toda vez que cria um cacto. É aqui
     que o padrão ganha nome: **mudar o jogo sem mudar a lógica**. A regra continua a mesma, e o que
     muda é o número que ela lê. Duração alvo: 70 a 85 segundos.
  3. `studio`: conferência dos dois critérios acima, mais o sorteio do x continuando ligado.

**Junta três seções de hoje.** *Crie a memória da velocidade*, *Quem lê a nova velocidade?* e *Faça
os novos cactos lerem a base* viram uma. A do meio era um vídeo sobre a diferença entre a base e a
velocidade recebida ao nascer, e essa diferença passa para a cena da Seção 5, onde ela é provada em
vez de afirmada.

**A âncora precisa ser corrigida na gravação.** Nomear os dois vizinhos, `Criar variável pontos com
valor 0` e `Mudar o estado do jogo para inicio`, e **não** afirmar que o `Mudar o estado do jogo
para` é o último bloco do `⚙️ Ao iniciar`. Desde a Aula 10, o último é o
`Usar área de colisão de 80% do tamanho para o sprite dino`.

### Seção 3. A régua dos números negativos

- **Intenção:** conceito
- **Por que existe:** na próxima seção ela vai montar a pergunta `velocidade > -9` e escolher um
  sinal numa lista. Se ela não sentir antes que -5 é maior que -9, monta copiando gesto. E se ela
  não vir o sinal errado acontecendo, não tem como reconhecer o único erro do curso que não dá
  sintoma.
- **Conclui quando:** as quatro metas de `number-line` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue`: abertura curta, com a comparação marcada e canônica. "Número negativo confunde
     todo mundo no começo, e tem um jeito de desconfundir: é pensar numa régua deitada, parecida com
     um termômetro. Faz -5 graus lá fora, está frio. Faz -9 graus, está mais frio ainda. Então o -5 é
     mais quente que o -9, e é isso que quer dizer ser maior. Com a velocidade é igual: -5 é mais
     devagar, -9 é mais rápido."
  2. `interactive`: cena `number-line`, "A régua dos números negativos" (conferida abaixo contra o
     que foi construído). Elenco: nenhum personagem, só a régua e a pergunta. Cenário: `corre-dino`,
     pelas cores.

**Sem vídeo do Estúdio.** Não há nada para montar aqui. A nota **Na tela** da seção de hoje já pedia
uma régua animada com verdadeiro e falso, e a cena entrega a régua com a criança segurando o
marcador, que é mais forte do que a mesma régua sendo narrada.

### Seção 4. O acelerador, e o freio dele

- **Intenção:** construção
- **Por que existe:** é a montagem mais difícil do dia e a última do curso: um relógio novo, um `Se`
  do estado, um `Se` de comparação dentro dele, e a soma. Ela chega aqui sabendo ler a pergunta que
  vai montar.
- **Conclui quando:** existe um `A cada segundos` com 5, dentro do `🔁 Enquanto estiver rodando` e ao
  lado dos outros dois relógios; dentro dele, um `Condição se, senão se e senão` com
  `o estado do jogo é jogando`; dentro do então, um segundo `Condição se, senão se e senão` com
  `valor da variável velocidade` no lado esquerdo, o sinal `>` no meio e -9 no lado direito; e dentro
  do então de dentro, um `Somar em variável` com -1 e velocidade. Existe um único incremento da
  variável velocidade no projeto
- **Blocos:**
  1. `dialogue`: a montagem inteira, em quatro movimentos com âncora em cada um.
     - "Em Jogo 2D, Tempo, Quadros e intervalos, pega mais um `A cada segundos` e solta dentro do
       `🔁 Enquanto estiver rodando`, **ao lado** dos outros dois relógios, o de 1,4 dos cactos e o de
       1 dos pontos. Ao lado, e não dentro deles, e não dentro do `A cada quadro do jogo`. Agora são
       três relógios vizinhos, cada um com o seu trabalho. Nesse novo, põe 5."
     - "Dentro do fazer desse relógio vai um `Se`, igual você fez na Aula 11. Em Programação, Lógica
       e Se, pega o `Condição se, senão se e senão`. Ele vem com uma comparação de fábrica dentro, e
       essa não serve: arrasta ela pra fora e joga na lixeira. No lugar dela encaixa o
       `o estado do jogo é ?`, em Jogo 2D, Jogo e telas, Telas e partida, e escolhe jogando."
     - "Agora vem outro `Se`, dentro do então desse primeiro. E esse é diferente: **desta vez a
       comparação de fábrica fica**. É a única vez no curso inteiro em que ela serve, porque a nossa
       pergunta é justamente uma comparação. Ela tem três pedaços. No da esquerda, arrasta o
       `valor da variável` por cima do número e escolhe a velocidade. No do meio, abre a listinha dos
       sinais e escolhe o maior, que é o quinto da lista, o biquinho apontando para a direita.
       Confere na tela se ficou o biquinho e não o igual. No pedaço da direita, escreve -9. Lê comigo:
       se o valor da variável velocidade for maior que -9."
     - "E dentro do então desse `Se` de dentro, em Programação, Variáveis, põe o `Somar em variável`.
       No número escreve -1, e na variável escolhe a velocidade."
  2. `video` (`video-acelerador`): os quatro movimentos, com o cursor mostrando cada âncora. Dois
     momentos que a gravação precisa ter: o instante em que a listinha dos sinais abre e o `>` é
     escolhido, e o instante em que a partida longa mostra o jogo apertando. A fala mantém o aviso do
     sinal, agora curto, porque ela já viu acontecer: "se você deixar no igual, o jogo não mostra
     erro nenhum, e a base nunca muda. Foi o que você viu na régua". E mantém o motivo do freio, que
     é a ideia da aula: sem o -9 o jogo aceleraria para sempre, e depois de dois minutos ninguém
     conseguiria nada. Todo acelerador precisa de um freio. Duração alvo: 125 a 145 segundos.
  3. `studio`: conferência dos critérios acima.

**Sem cena antes.** A régua da Seção 3 é o preparo, e a cena que examina o resultado vem depois, na
Seção 5, porque só existe o que examinar depois que a base começa a andar.

### Seção 5. O que o freio segura, e o que ele não segura

- **Intenção:** conceito
- **Por que existe:** três coisas acontecem no jogo dela agora e nenhuma das três é visível jogando:
  a base andando de 1 em 1, a base parando em -9, e um cacto saindo com -10 mesmo assim. Para ver a
  primeira ela precisaria sobreviver quarenta e cinco segundos, e mesmo assim não veria o número.
- **Conclui quando:** as quatro metas de `acceleration` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue`: abertura de três linhas, ligando ao que ela acabou de montar. "O seu jogo já acelera,
     mas tem coisa acontecendo lá dentro que a partida não mostra. Aqui você aperta o botão que passa
     5 segundos quantas vezes quiser, e olha o número de cada cacto que nasce."
  2. `interactive`: cena `acceleration`, "Acelere com um limite", com o palpite antes de abrir.
     Elenco: cacto no papel do obstáculo. Cenário: `corre-dino`. Metas cobradas: `base-limit`,
     `variation-limit`, `old-speed` e `past-limit`, nesta ordem.

**Vem depois da montagem, e a inversão é o conteúdo.** É o mesmo caso da cena `layers` no Dia 1 do
Desafio: o arranjo certo já está montado, e a cena serve para examinar o que ele faz por dentro e
para provar o contrafactual (a base sem condição nenhuma) sem estragar o jogo dela.

**É aqui que a ideia da Seção 2 fecha.** "Mudar o jogo sem mudar a lógica" foi nomeado na montagem e
é provado aqui: a base muda, a regra não muda, e cada cacto novo nasce com o número novo enquanto os
velhos guardam o deles.

### Seção 6. Escolha a dificuldade, teste tudo e entregue

- **Intenção:** conceito e entrega
- **Por que existe:** os dois números do acelerador são os últimos campos do curso que ficam sendo
  dela, e escolher eles é o momento em que ela para de montar o jogo do professor e ajusta o dela.
  Depois disso, o teste final e o envio.
- **Conclui quando:** a entrega é enviada e todos os critérios passam
- **Blocos:**
  1. `video` (`video-balanceamento`): a demonstração por extremos, conduzida pela narração, nos dois
     campos. Primeiro o limite: troca o -9 por -7 e joga, e o jogo acelera pouquinho e fica tranquilo
     até o fim. Depois -14, e ele fica quase impossível lá na frente. Depois o ritmo: o relógio em 2 e
     o jogo endurece logo, o relógio em 10 e demora tanto que a partida fica sem graça. A fala nomeia
     o que está acontecendo: escolher o quanto o jogo fica difícil e com que rapidez tem nome nos
     estúdios de verdade, chama **balanceamento**, e é um trabalho inteiro que gente faz por semanas
     antes de lançar um jogo. Devolve a escolha sem rotular: "os meus ficaram em -9 e 5 segundos".
     **Cortar da gravação original** as três partidas comparadas com as da Aula 9, conforme a
     orientação já registrada. Duração alvo: 55 a 70 segundos.
  2. `dialogue`: instrução de teste do jogo inteiro. "Clica na área do jogo e joga. Confere o começo
     pela tecla e pelo toque, o pulo, a batida, o placar subindo e o voltar a jogar. Depois sobrevive
     o máximo que der e repara se o jogo vai apertando. Se a partida acabar cedo, tudo bem: você já
     viu a base inteira na experiência de hoje. Não precisa bater recorde para terminar."
  3. `studio`: entrega, com os dez critérios do manifesto atual, **com uma correção**: os critérios
     `acelerar-com-limite` e o valor do relógio passam a aceitar a faixa que o vídeo acabou de
     oferecer. A estrutura continua exigida por inteiro (relógio próprio dentro do
     `🔁 Enquanto estiver rodando`, `o estado do jogo é jogando`, `Se` de comparação com o
     `valor da variável velocidade` do lado esquerdo e o sinal `>`, e `Somar -1 em variável
     velocidade` no então de dentro). O que passa a ser faixa: o número do relógio, de 2 a 10, e o
     limite, de -14 a -7. Um único incremento da variável velocidade continua exigido.

**Junta duas seções de hoje e resolve o conflito dos campos livres.** O balanceamento saiu da seção
onde estava de carona e virou a abertura da entrega. E o critério deixou de cravar os números que o
próprio vídeo convida a mudar.

### Seção 7. O que tem embaixo dos seus blocos

- **Intenção:** fechamento
- **Por que existe:** é a única coisa que o fecho do curso mostra, e é uma descoberta, não um aviso.
  Ela precisa de espaço próprio para acontecer.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-ponte`): na barra superior do Estúdio Completo, clicar em `Ponte` no seletor de modos e
     abrir a aba `script.js`, com blocos e código lado a lado. Esse caminho foi conferido em
     `ModeSegment.tsx` e `BridgeMode.tsx`. Com o painel aberto, a narração aponta o sprite `dino`,
     cujo nome é canônico, o grupo `cactos`, o sorteio e a variável `velocidade` com o limite que a
     pessoa escolheu. A fala não apressa e não
     exagera: "esses blocos coloridos não são um brinquedo. Cada um deles vira código de programação
     de verdade, e é esse aqui. Tudo o que você montou está escrito nesse painel, do jeito que um
     programador escreveria. Você não estava brincando de programar. Você estava programando. Só que
     com peças que já cabem na sua mão hoje. Quem escreve as letrinhas faz exatamente a mesma coisa."
     Duração alvo: 60 a 75 segundos.

**A Ponte não vira cena, e é de propósito.** A coisa real é mais forte: é o projeto dela, com o nome
do sprite dela, e ela pode abrir de novo depois. Uma simulação seria uma versão mais fraca de uma
tela que já existe.

**Os três degraus do Dino Corredor na vitrine não entram.** Está registrado: degrau é planejamento
interno de trilha e não é conversa com quem está terminando o curso. O fecho é resumo da conquista
dela.

### Seção 8. Você fez um jogo inteiro

- **Intenção:** fechamento
- **Por que existe:** treze aulas terminam aqui. O fecho precisa devolver a ela, em coisas concretas,
  o que ela construiu, e precisa contar o que a Comunidade faz com isso, sem prometer nada que não
  aconteça.
- **Conclui quando:** 90% do clipe assistido e as três perguntas respondidas
- **Blocos:**
  1. `video` (`video-fecho-curso`): quatro movimentos, nesta ordem.
     - **O que ela tem nas mãos**, item por item, com o jogo rodando ao lado. Um cenário que se
       mexe. Um dino que pula e faz barulho só quando está no chão. Cactos que nascem sorteados, do
       lado de fora da tela. Uma faxina limpando quem já foi embora. Uma colisão justa. Um placar,
       uma tela de início e uma tela de fim. E um jogo que fica mais difícil quanto melhor ela joga.
       A lista é longa de propósito: ela reconhece cada peça e lembra da aula em que ela entrou.
     - **O que ela fez**, sem hype e sem falar de dom: sentou, uma peça de cada vez, treze aulas
       seguidas, até o fim. Isso é o que dá para dizer com honestidade, e é bastante.
     - **O convite**, que é a melhor parte e não é tarefa: chamar alguém para jogar e olhar a cara da
       pessoa quando ela bate no primeiro cacto.
     - **O que a Comunidade faz com isso.** O projeto entregue já conta. Publicar é uma escolha dela,
       para depois, e não é o que fecha o curso: se ela quiser, o Compartilhar libera depois do
       envio, ela escreve um resumo, gera a capa e publica, e o jogo ganha um link e aparece no Mural
       junto com os jogos dos outros criadores. O curso fica marcado na **Carreira de Criador**, com
       os troféus, e é ali que ela vê tudo o que já construiu. **Não existe certificado neste curso, e
       o fecho não pode prometer um.** Nenhum número de XP é citado.
     - **A despedida**, sem promessa de futuro que não se pode cumprir: quando bater a vontade de
       fazer o próximo, tem mais curso esperando por ela na Comunidade.
     Duração alvo: 75 a 90 segundos.
  2. `quiz`: as três perguntas atuais, mantidas. Elas cobrem exatamente as três descobertas de
     `acceleration` e a leitura do sinal.

**Junta duas seções de hoje.** *Veja o que você aprendeu* e *Confira as ideias de hoje* viram uma, e
a recapitulação encosta no quiz.

## Experiências e demonstrações desta aula

### 1. `number-line` (A régua dos números negativos) · **CONSTRUÍDA, CONFERE COM O ESPECIFICADO**

A cena nasceu desta análise e está no catálogo. A conferência de 19/09/2026 comparou o construído com
o especificado, campo a campo, e eles batem: o grupo, o título, a instrução, o campo do que ela
manipula, as quatro metas com os mesmos ids, rótulos e pedidos, as três pistas na mesma ordem, a
frase de sucesso e a pergunta extra. **Nenhuma divergência para decidir.** Duas notas de
implementação, nenhuma delas contrariando a especificação:

- **Não tem roteiro de demonstração**, e é assim de propósito. A especificação já dizia que uma
  demonstração do erro do sinal igual não mostraria nada, porque o erro não tem sintoma.
- **O palpite e a pergunta final viraram conteúdo da cena**, e não só do bloco. A cena guarda o
  palpite "Na régua, qual dos dois é o maior: -5 ou -9?", com `revealOn` em `greater`, e a pergunta
  "Se o sinal ficar no igual, o que acontece com uma base que começa em -5?". O bloco desta aula
  declara os dois também, com um texto de contexto mais específico, e o do bloco prevalece.

- **Id:** `number-line`
- **Grupo:** `speed`, junto de `random` e `acceleration`
- **Título visível:** "A régua dos números negativos"
- **O conceito abstrato que ela concretiza:** quanto mais para a esquerda da régua um número mora,
  menor ele é, e é isso que a pergunta "é maior que?" responde. Com o sinal errado, ela responde não
  para sempre, sem aviso nenhum.
- **Tipo:** experimentação. Pelo critério da seção 3 do briefing, a relação tem botão duas vezes: dá
  para escrever "quando eu levo o marcador para a esquerda, a resposta vira não" e "quando eu troco o
  sinal, a resposta muda sem o número ter mudado".
- **O que a criança manipula:**
  1. Um **marcador** do valor da base sobre uma régua deitada de -12 a 0, de 1 em 1. Ela arrasta o
     marcador ou usa os dois botões de passo.
  2. Um botão **Somar -1**, que anda o marcador uma casa para a esquerda. É o mesmo gesto que o
     relógio de 5 segundos faz no jogo, com o mesmo rótulo do bloco.
  3. Um botão **Voltar ao começo**, que devolve o marcador ao -5.
  4. Um **seletor de sinal** com três opções: `>`, `=` e `<`. Três, e não os oito do menu real, para
     a cena ficar sobre a comparação e não sobre a lista. A aula continua mandando abrir a listinha
     do bloco e escolher o quinto item, e a cena não contradiz isso porque não mostra a lista do
     bloco.
- **Como o palco começa:** a régua deitada de -12 a 0, com uma bandeirinha fixa no -9 e o marcador no
  -5. O sinal começa no `=`, que é como o bloco nasce. Embaixo da régua, a frase montada com as
  peças: `velocidade` `=` `-9`, e ao lado dela a resposta, **não**, em palavra e em ícone. Um contador
  de quantas vezes o Somar -1 foi apertado, em 0.
- **Metas:**

  | id | rótulo ao cair | pedido na faixa |
  |---|---|---|
  | `colder` | "Somar -1 anda uma casa para a esquerda, e para a esquerda é mais rápido" | "Aperte Somar -1 três vezes e olhe onde o marcador para." |
  | `greater` | "-5 é maior que -9, porque mora à direita dele na régua" | "Volte ao começo e troque o sinal para o biquinho que aponta para a direita." |
  | `stops` | "No -9 a pergunta diz não, e a base para ali" | "Com o biquinho escolhido, leve o marcador até o -9." |
  | `silent` | "Com o igual, a resposta é não em todo lugar menos num" | "Volte ao começo, ponha o sinal no igual e aperte Somar -1 quatro vezes." |

- **Pistas, uma por vez, em ordem crescente:**
  1. "A régua é parecida com um termômetro deitado. O -9 fica mais para a esquerda que o -5."
  2. "Olhe a frase embaixo da régua. A resposta muda sozinha conforme o marcador anda."
  3. "Deixe o marcador no -5 e troque o sinal para o biquinho que aponta para a direita. Depois leve
     o marcador até o -9 e olhe a resposta."
- **Palpite antes de abrir:** "Na régua, qual dos dois é o maior: -5 ou -9?"
  - -5, porque está mais à direita ✓
  - -9, porque 9 é maior que 5 (se ela escolher esta, a tela conta depois: "Na régua, o -9 mora à
    esquerda do -5. Quem está mais à direita é o maior.")
  O palpite volta à tela quando a meta `greater` cai.
- **Pergunta depois de descobrir (conta para concluir):** "Se o sinal ficar no igual, o que acontece
  com uma base que começa em -5?"
  - Ela para no -9, igual.
  - Ela nunca muda, porque -5 não é igual a -9 ✓
- **Explicação que ela lê ao acertar:** "Com o igual, a pergunta só diz sim no -9 exato. A base começa
  no -5, então a resposta é não já na primeira vez, e ela fica parada para sempre. E o jogo não mostra
  aviso nenhum, porque não tem erro nenhum: a pergunta foi respondida, e a resposta foi não."
- **Frase de sucesso:** "Na régua, quem está mais à direita é o maior. E o sinal decide o que a
  pergunta responde."
- **Metas cobradas nesta aula:** `colder`, `greater`, `stops`, `silent`, que são as quatro da missão
  de fábrica. O bloco **não declara `setup.goals`** de propósito: a cena não tem meta só de caso, e
  sem lista ela cobra exatamente estas quatro.
- **Onde mais serve:** todo curso que use a comparação, que é o bloco que estreia aqui. Curso 2
  (Pong), quando a velocidade da bola troca de sinal; curso 3 (Duelo de Heróis) e curso 6
  (Sobrevivente), quando a vida desce até zero e a pergunta segura o fundo; curso 9 (Dino Corredor
  Profissional), no recorde. Também serve no Desafio do Primeiro Jogo, em qualquer dia em que um
  valor ganhe limite. É a cena com o segundo maior reuso potencial do catálogo, atrás só de
  `once-vs-always`, porque comparação e limite aparecem em quase todo jogo.
- **Ações do motor:** uma ação de passo sobre régua (`step-value`, com mínimo, máximo e passo) e uma
  de troca de operador (`compare-op`). O contador de disparos por botão é o mesmo que
  `once-vs-always` usa.

### 2. `acceleration` (Acelere com um limite) · **CONSTRUÍDA, AJUSTES APLICADOS**

- **Situação:** a cena certa, com o palco certo, e a única do catálogo que mostra um valor mudando
  sozinho com o tempo. Faltava uma meta e a ordem das outras, e as duas coisas foram resolvidas.
- **Elenco:** cacto no papel do obstáculo, agora declarado no bloco. **Cenário:** `corre-dino`.
- **Metas cobradas nesta aula:** `base-limit`, `variation-limit`, `old-speed`, `past-limit`, que são
  as quatro da missão de fábrica, nesta ordem. O bloco **não declara `setup.goals`** de propósito:
  sem lista, a cena cobra as quatro e deixa de fora a `spawned-ten`, que é só de caso.

**Ajuste 1: faltava a meta do -10, que é a razão de ser da cena, e ela existe.** O catálogo tinha
`base-limit`, `old-speed` e `past-limit`. A frase de sucesso falava do cacto -10 e o palpite
perguntava sobre ele, e nenhuma meta o produzia. Ficou assim:

| id | rótulo ao cair | pedido na faixa |
|---|---|---|
| `variation-limit` | "Mesmo parada em −9, saiu um cacto −10" | "Com a base em −9 e a condição ligada, aperte Passar 5 segundos até nascer um cacto −10." |

**Divergência registrada, e o código vence.** Esta análise propôs o id `spawned-ten`. Ele existe no
catálogo, como meta só de caso, com rótulo e pedido quase iguais. O que entrou na missão de fábrica
foi `variation-limit`. A aula cobra `variation-limit`.

**O pedido não conta as vezes, e isso ficou assim.** A aula de hoje escrevia "aperte Passar 5
segundos mais quatro vezes", e quatro sorteios entre 0 e 1 podem não trazer nenhum -10. O pedido é
"até nascer", e o botão Conferir, enquanto a meta não cai, responde que o -10 ainda não saiu. Contar
vezes num sorteio é prometer o que o sorteio não garante, e a Aula 12 acabou de ensinar justamente
isso.

**Ajuste 2: a ordem das descobertas. Feito.** A ordem no catálogo é `base-limit`, `variation-limit`,
`old-speed`, `past-limit`, que é a que a aula precisa: a base para em -9, mesmo assim sai um -10, os
cactos velhos não mudaram, e só no fim, com a condição desligada, a base passa de -9. Essa é a ordem
de uma história: o limite funciona, o limite tem alcance, o passado não muda, e o limite é mesmo quem
segura. O contrafactual fica por último, que é onde ele ensina.

**Ajuste 3: o campo de elenco. Feito.** O bloco declarava `cenario` e não declarava `cast`. A cena
está escrita em vocabulário de cacto, então funcionava neste curso e não viajava para nenhum outro. O
bloco passou a declarar o cacto no papel do obstáculo, que é o valor de fábrica e por isso não muda
nada nesta aula, e é o que permite reusar a cena nos cursos em que um inimigo fica mais rápido com o
tempo, trocando só o elenco.

**Um ajuste que foi considerado e recusado.** Trocar o interruptor da condição (ligada e desligada)
por um seletor de três estados, com `>` -9, `=` -9 e sem condição, para que o erro silencioso
acontecesse dentro do sistema rodando. Recusado por um motivo que é o próprio conteúdo: com o `=`, a
cena não mostra nada, porque não há nada para mostrar. É exatamente isso que torna o erro silencioso
difícil de aprender, e é por isso que ele mora na `number-line`, onde a resposta da pergunta está
escrita na tela a cada passo. Colocá-lo aqui seria pedir para a criança descobrir um erro pela
ausência de sintoma, que é o que não funciona.

**Nota de continuidade entre as seções:** a cena diz "Passar 5 segundos" e a Seção 6 convida a trocar
o relógio para 2 ou 10. A ordem proposta resolve isso sozinha, porque a cena vem antes do
balanceamento. Se as duas trocarem de lugar em alguma revisão futura, o rótulo do botão da cena
passa a contradizer o jogo dela.

### 3. `once-vs-always` · **NÃO SERVE AQUI**

A cena separa o que roda uma vez, no `⚙️ Ao iniciar`, do que roda de novo a cada quadro, no
`🔁 Enquanto estiver rodando`, e no Corre Dino essa distinção foi resolvida nas Aulas 1 e 2. Houve um
motivo para considerar: a Aula 13 cria uma variável no `⚙️ Ao iniciar` e a muda dentro de um relógio,
e pôr o `Criar variável velocidade com valor -5` no lugar errado zeraria a base a cada volta. Só que
esse é exatamente o arranjo que ela montou na Aula 11 com a variável pontos, e a montagem de hoje é
conduzida bloco a bloco, com âncora nomeando os dois vizinhos. O que a Aula 13 tem de novo não é
"uma vez contra sempre": é "uma vez **por cacto**", que é um conceito diferente e está coberto pela
meta `old-speed` de `acceleration`.

## Vídeos

| Chave | Título do clipe | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-jogo-nao-aperta` | Vinte segundos depois, está tudo igual | a partida longa, idêntica dos vinte segundos em diante, e a promessa do dia | `video-abertura-editorial` | 40 a 55 s | fala sim, tela não: regravar na edição `jogo-2d-1.0-documento-2` |
| `video-memoria-e-leitura` | A velocidade muda de endereço | criar a variável velocidade e trocar o -5 literal pelo `valor da variável` | `video-guardar-velocidade` + `video-usar-memoria` | 70 a 85 s | funde dois clipes. **Corrigir a âncora**: nomear os dois vizinhos e não afirmar que o `Mudar o estado do jogo para` é o último bloco do `⚙️ Ao iniciar` |
| `video-acelerador` | O acelerador, e o freio dele | o terceiro relógio, o `Se` do estado, o `Se` da comparação com o `>` escolhido na lista, e o `Somar -1` | `video-relogio-aceleracao` | 125 a 145 s | fala sim, encurtando a explicação de negativos, que passou para a cena. Corrigir os endereços da paleta |
| `video-balanceamento` | Escolha o quanto o seu jogo aperta | -7 e -14, 2 s e 10 s, e a volta para os números dela | `video-descricao-final`, trecho do meio | 55 a 70 s | fala parcial: **cortar** as três partidas comparadas com as da Aula 9. O trecho final da gravação de origem sai do curso junto com a revisita de acessibilidade |
| `video-ponte` | O que tem embaixo dos seus blocos | Ponte na barra superior, aba `script.js`, e dino, cactos e velocidade no código | `video-fecho-editorial`, trecho da Ponte | 60 a 75 s | fala sim, tela nova. O caminho de interface precisa ser conferido antes de gravar |
| `video-fecho-curso` | Você fez um jogo inteiro | a lista do que ela construiu, o que ela fez, o convite, o que a Comunidade faz, e a despedida | `video-fecho-editorial`, o resto | 75 a 90 s | fala parcial: **cortar** o passo a passo de publicar como tarefa e a promessa de XP |

**Saldo:** de 8 clipes para 6. Saem inteiros `video-base-e-nascimento` e `video-comparar-negativos`,
cujos conteúdos foram para `acceleration` e para a `number-line`. Do `video-descricao-final` sobra só
o trecho do meio, que virou o `video-balanceamento`. O `video-fecho-editorial` vira dois clipes
menores, porque a Ponte e a despedida são coisas de naturezas diferentes. Em minutagem a aula encolhe
bastante, porque as duas explicações mais longas do dia, a dos negativos e a da base contra a
velocidade recebida, deixaram de ser narração.

## Continuidade

- **O que esta aula assume da Aula 12:** o campo x do `No grupo criar obstáculo em x tamanho com vx`
  com `um número de a` de 500 a 560; o campo vx com uma `Conta matemática` de sinal menos, com -5 do
  lado esquerdo e `um número de a` de 0 a 1 do lado direito; o relógio de 1,4 s protegido pelo
  `o estado do jogo é jogando`; um único bloco de criar obstáculo. A criança já arrastou bloco de
  valor por cima de número três vezes no curso e já sabe ler uma conta em voz alta.
- **O que esta aula entrega:** o jogo terminado. Não existe Aula 14, e é por isso que os dois campos
  do acelerador podem ficar livres sem risco de quebrar nada adiante.
- **Valores canônicos que saem daqui:** variável `velocidade` criada com -5 no `⚙️ Ao iniciar` ·
  incremento -1.
- **Campos livres, e são os dois últimos do curso:** o limite da aceleração (canônico -9, faixa que a
  aula oferece de -14 a -7) e o relógio da aceleração (canônico 5 s, faixa de 2 a 10). **Os critérios
  de entrega precisam ser afrouxados para aceitar a faixa**, conforme o diagnóstico acima. Sem isso,
  o vídeo convida e a entrega reprova.
- **Correção aplicada no manifesto, registrada aqui.** O critério `acelerar-com-limite` do v6 cravava
  duas coisas que o vídeo convida a mudar: `SECS: 5` no relógio e `RIGHT: -9` no lado direito da
  comparação. As duas saíram. A estrutura continua exigida por inteiro, e é ela que carrega o
  aprendizado: relógio próprio dentro do `🔁 Enquanto estiver rodando`, `Se` do estado em jogando,
  `Se` de comparação com o `valor da variável velocidade` do lado esquerdo e o sinal `>`, e
  `Somar -1 em variável velocidade` no então de dentro. As duas faixas, de 2 a 10 e de -14 a -7,
  passam a viver no rótulo do critério, que é onde a conferência fala com quem construiu. O motor de
  conferência compara valor por valor e não sabe comparar faixa, então faixa declarada vira critério
  ausente com o intervalo escrito no rótulo, que é o mesmo caminho já aprovado na Aula 10.
- **Um terceiro critério herdado foi afrouxado pelo mesmo motivo.** O `relogio-pontos`, que esta aula
  revalida na entrega, cravava o intervalo de 1 segundo que a Aula 11 declara livre. O `SECS` saiu, e
  a estrutura do relógio dos pontos continua cobrada.
- **O quiz deixou de afirmar um campo livre como fato.** As duas primeiras perguntas do v6 tratavam o
  -9 como se fosse o limite de todo mundo. A primeira passa a dizer "no exemplo do vídeo" e a segunda
  passa a falar em "o limite que você escolheu". O conceito cobrado é o mesmo: o sorteio entra depois
  da base, e o sinal de igual travaria a base logo na primeira volta.
- **O que fica para a Comunidade, e não para outra aula:** publicar e compartilhar, que são escolha
  dela e não fecham o curso; a Carreira de Criador e os troféus, onde o curso aparece concluído; e o
  Mural. Não existe certificado neste curso.
- **Dívidas que este curso deixa para a trilha, e que o fecho não pode prometer:** a distinção entre
  evento e estado de tecla (curso 2), vida do sprite e quadros de invencibilidade (cursos 3 e 6), o
  laço solto sobre o grupo (curso 5), a colisão que premia (curso 7) e a persistência do recorde
  (curso 9). O fecho fala de "mais curso esperando", sem nomear o que cada um traz.
