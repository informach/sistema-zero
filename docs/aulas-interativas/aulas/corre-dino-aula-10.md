# Corre, Dino! · Aula 10 · A caixa que decide a batida

## Resumo

- **Estado de entrada:** o jogo está completo desde a aula 9. Tem tela de início, partida, batida com
  explosão, tremida, som de derrota, tela de fim e reinício. No `Ao iniciar`, o último bloco é o
  `Mudar o estado do jogo para inicio`. Dentro do `Se o estado do jogo é jogando ?`, o último bloco é
  o `Tirar do grupo cactos quem sair da tela`. O dino foi criado com tamanho 64.
- **Vitória do dia:** duas, e as duas se veem. A primeira é o contorno rosa aparecendo em volta do
  dino, que é o invisível virando visível. A segunda é passar raspando num cacto e escapar.
- **Seções hoje:** 9 · **Seções propostas:** 6
- **Clipes hoje:** 6 · **Clipes propostos:** 5. A contagem não muda com o redesenho da entrega:
  nenhum clipe entrou nem saiu, o `video-teste-e-envio` é que cresceu.
- **Fecho da entrega:** o teste, o arrasto do instrumento para a lixeira e o fecho de método saíram
  do balão e foram para o roteiro do `video-teste-e-envio`, e a seção ficou sem balão nenhum. Balão
  depois da ferramenta não existe para quem faz a aula, porque o Estúdio fica sozinho na coluna da
  direita e todo o resto na esquerda.
- **Cenas:** 1 (`hitbox`), construída no catálogo, com as três metas e o ponto de partida do palco
  já aplicados

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| A batida contada sem encosto (a dor do dia) | Não. É um sintoma que acontece na tela dela | **Sim**, no próprio jogo | Clipe de partida real, congelado e ampliado no instante da batida | Abre a aula, antes de qualquer bloco | Regra número 1 do curso. O problema roda antes da ferramenta, e aqui ele é o motivo de o dia existir |
| A caixa de colisão existe e tem forma | Sim. É invisível por definição | **Sim** | O instrumento no jogo dela (`Mostrar a caixa de colisão do sprite dino`) | Ela monta e vê | O instrumento já é a concretização. Cena aqui seria mostrar de novo o que o contorno rosa mostra melhor, no jogo dela |
| O jogo olha a caixa, e não o desenho | Sim. É a causa da injustiça, e ela é invisível | **Sim** | Experimentação (`hitbox`) | Depois de ver o contorno, antes do conserto | No jogo dela o cacto vem correndo e não dá para parar no lugar exato. Sem parar, não dá para provar a causa |
| O tamanho da caixa é um número que se escolhe | Sim. Ordem de grandeza e consequência não se veem no bloco | **Sim**, em duas metades | A geometria na cena `hitbox` (metas `area-contrast` e `too-small`), o gosto no jogo dela (extremos conduzidos) | Cena antes do conserto, extremos depois | A cena prova o que acontece. O jogo dela é onde ela decide o quanto quer perdoar |
| Menor que 100% para dano, maior para coleta | Sim, mas é regra de projeto, não mecanismo | Só a metade do dano | Frase, com a metade da coleta dita em uma linha | Na seção do dial | O jogo dela não tem nada para pegar. Construir a coleta aqui é dívida registrada do curso 7, Mundo Pirata |
| Ajustar a área do Dino, e não a do cacto | Sim. É decisão de projeto | Não | Uma frase com o motivo | No momento de escolher o sprite no bloco | O dino entra em toda batida do jogo. O cacto é um entre muitos, e amanhã existe pedra e pássaro |
| Onde cada bloco mora: o ajuste no `Ao iniciar`, o contorno dentro do quadro | Não. Ela separa preparação de motor desde a aula 2 | Não | Uma frase em cada encaixe | Dentro da montagem | Preparação acontece uma vez, desenho acontece todo quadro. Isso já é vocabulário dela há oito aulas |
| Uma vez contra sempre (cena `once-vs-always`) | Não, **nesta aula** | Não | | | Considerada e recusada. A cena serve quem está conhecendo as áreas do projeto. No Corre Dino isso é aula 1 e aula 2, não aula 10 |
| Instrumento contra regra permanente | Sim. É método de trabalho, não mecanismo | **Sim**, pelo gesto | O raio-X vai para a lixeira e o ajuste fica no `Ao iniciar` | No fechamento | Ela já viveu isso com o medidor da aula 6. Aqui a aula nomeia o método em vez de repetir a experiência |
| O desenho do dino não muda quando a área muda | Não. Ela compara na hora, com o contorno ligado | Não | | | É a frase de sucesso da cena e um critério da entrega. Ver acontecer basta |
| Apagar um bloco que é o último da pilha | Não é conceito, é operação | Não | | Dentro da entrega | Mesmo gesto do medidor da aula 6: arrastar para a lixeira. Nada vem junto, porque não tem bloco embaixo |

Onze coisas, duas concretizações de verdade, as duas na mesma cena. É essa triagem que tira a aula de
9 para 6 seções sem perder nada.

## Diagnóstico do desenho atual

**O conceito mais valioso do dia está escondido numa seção de faxina.** A seção 6 se chama *Retire o
instrumento, mantenha o ajuste* e declara como foco "Distinguir instrumento temporário de regra
permanente". É dentro dela que mora o dial de dificuldade: a comparação entre 40 e 100, o nome
"dial", e a regra de que área menor que 100% deixa a batida mais justa para o que machuca. O título
não diz, o foco não diz, e o critério automático não cobra. O maior conceito da aula está de
passagem numa seção sobre arrastar um bloco para a lixeira.

**A cena que sustenta a aula não cobrava nada, e agora cobra três coisas.** No catálogo do v6,
`hitbox` estava com `"metas": []`: o roteiro descrevia duas descobertas por escrito e nenhuma delas
existia como meta, então a seção *Ajuste só a área de colisão* concluía sem que nada precisasse
acontecer, com o bloco ainda em `"required": false`. A cena de hoje tem `contact`, `area-contrast` e
`too-small`, e o bloco é obrigatório.

**Uma seção inteira de demonstração faz, pior, o que a cena faz.** A seção 3, *O contorno e o desenho
são iguais?*, é um clipe parado comparando o desenho com o contorno. Isso é exatamente a primeira
descoberta de `hitbox`, e lá quem aproxima o cacto é ela. Além disso, um quadro congelado não é um
processo no tempo: pelo critério do briefing, não é caso de demonstração.

**As seções 2 e 3 partem uma olhada ao meio.** *Veja a área que o jogo usa* monta o instrumento e *O
contorno e o desenho são iguais?* observa o que ele revelou. É o mesmo gesto de olhar, com uma
divisória no meio.

**A dor não abre a aula.** A abertura anuncia por escrito que "a batida pode parecer acontecer antes
do toque". A regra número 1 do curso é o problema rodando primeiro. Aqui ele roda de verdade, e a
aula está contando em vez de mostrar.

**A cena não dizia de onde a área parte, e agora diz.** O palco do v6 declarava só a distância do
cacto (149). Sem dizer que a área abre em 100%, a cena podia nascer já ajustada, e aí a criança
mexeria num número que já estava certo. O palco de hoje abre com a área em 100%, no mesmo sentido do
conserto da aula, como a correção registrada no README manda.

**A entrega cobra 80 exato e a aula oferece uma faixa.** O critério automático é
`inputs: { PERCENT: 80 }`, e a referência do curso lista a área de colisão como campo livre, faixa de
70 a 85. Com o critério atual, quem escolher 78 por gosto, como a própria narração convida, leva um
vermelho na conferência. Recomendação: aceitar de 70 a 85 e manter 80 como o valor conduzido no
vídeo. Nenhuma aula posterior cita esse número.

**Os rótulos estão desatualizados em três pontos.** Na paleta 1.0, o bloco chama
`Mudar o estado do jogo para __` (e não "Ir para a tela") e a pergunta chama
`o estado do jogo é __ ?` (e não "a tela atual é"). A subcategoria do instrumento é
`Jogo 2D › Colisões › Área de contato`, e o trecho original manda procurar em "Aparência". Os nomes
antigos continuam achando o bloco na busca, então a troca é só de fala, mas ela precisa ser feita na
aula 7 também, que é onde a pergunta é batizada.

**O raio-X é a quarta retirada de bloco do curso, e a referência conta três.** A seção 2.5 lista as
retiradas das aulas 2, 4 e 8, e a seção 8 fala em três deleções. O medidor da aula 6 e o raio-X de
hoje também saem, os dois arrastados para a lixeira. Vale acertar a contagem no documento, porque
ela é usada para decidir o que a fala precisa explicar sobre o menu de apagar.

## Proposta final

### Seção 1. A batida que você não deu

- **Intenção:** dor
- **Por que existe:** o dia inteiro é a resposta para uma pergunta que ela já fez sozinha, jogando.
  Sem o problema rodando, o instrumento vira um bloco que apareceu do nada.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-batida-injusta`): uma partida de verdade no jogo do fim da aula 9, jogada até
     acontecer. O dino passa perto de um cacto, os dois desenhos não se tocam, e a partida acaba. O
     quadro congela no instante da batida e a imagem aproxima o vão entre o bico do cacto e a
     barriga do dino. Fala: "Olha de novo, bem devagar. O dino não encostou no cacto. Tem um espaço
     entre os dois, dá para ver. E mesmo assim a partida acabou. O jogo contou uma batida que não
     teve. Tem uma coisa acontecendo no seu jogo que você ainda não consegue enxergar. Hoje a gente
     enxerga, e depois arruma." Duração alvo: 25 a 35 segundos.

**Honestidade da dor:** ela reproduz, e é por isso que pode abrir a aula. O desenho do dino tem o
rabo para trás, o focinho para frente e as perninhas embaixo, e a caixa é um retângulo, então sobra
espaço vazio nos cantos. A gravação joga até o caso aparecer e mostra de novo, devagar e ampliado. O
que não pode é montar o efeito na edição: o que a tela mostra tem que ter acontecido na partida.

### Seção 2. Ligue o raio-X

- **Intenção:** construção
- **Por que existe:** é a primeira vitória visível do dia, e ela é literalmente ver. O instrumento põe
  na tela dela a forma que o jogo usa, e os cantos vazios aparecem no dino dela, não num close
  gravado de outro projeto.
- **Conclui quando:** o `Mostrar a caixa de colisão do sprite dino` está dentro do
  `Se o estado do jogo é jogando ?`, no fim, e o contorno rosa aparece na partida
- **Blocos:**
  1. `dialogue`: "Em Jogo 2D, Colisões, Área de contato, pega o bloco Mostrar a caixa de colisão do
     sprite. Arrasta para dentro do Se o estado do jogo é jogando, e solta no fim de tudo, logo
     abaixo do Tirar do grupo cactos quem sair da tela, que hoje é o último bloco de lá. Ele tem um
     campo só, que é o sprite. Abre a listinha e escolhe o dino."
  2. `video` (`video-raio-x`): o gesto, e depois a revelação. Clica na área do jogo, aperta Enter,
     e o contorno cor de rosa aparece em volta do dino. O clipe então para a partida com o dino
     parado e aproxima o contorno, apontando um vazio de cada vez: em cima da cabeça, na frente do
     focinho, e embaixo, entre os pés. Fala que fecha: "O jogo não olha para o desenho do
     dinossauro. Ele olha para esse retângulo. Para o computador, o seu dino é essa caixa." Duração
     alvo: 60 a 70 segundos.
  3. `studio`: conferência de que o bloco está dentro do Se de jogando, com o dino escolhido.

**Junta o que hoje são duas seções.** Montar o instrumento e olhar o que ele revelou é um movimento
só. A observação dos cantos vazios deixa de ser um clipe separado e passa a ser o segundo tempo do
mesmo clipe, com o dino dela na tela.

**Detalhe que vale dizer na fala:** o bloco de ajuste que ela vai usar daqui a pouco mora nessa mesma
gaveta, logo acima do raio-X. Ela vai ver os dois juntos, e saber que são dois blocos diferentes
evita que ela pegue o errado.

### Seção 3. É a caixa que decide, não o desenho

- **Intenção:** conceito
- **Por que existe:** o contorno mostra que existe uma caixa. Falta provar que é ela que decide, e que
  o tamanho dela muda o veredito sem mexer em mais nada. Isso não dá para provar numa corrida,
  porque o cacto não para onde ela quer.
- **Conclui quando:** as três metas de `hitbox` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue`: "No seu jogo o cacto vem correndo e não dá para segurar ele no lugar exato para
     medir. Aqui dá. O cacto anda um toque de cada vez, e o tamanho da área do Dino é um número que
     você escolhe. A área começa igual à do seu jogo agora."
  2. `interactive`: cena `hitbox`, "Onde a batida acontece?". Elenco: personagem Dino, obstáculo
     cacto. Cenário: `corre-dino`. Metas cobradas: `contact`, `area-contrast`, `too-small`.

**Sem vídeo, de propósito.** A cena mostra os dois desenhos, as duas áreas pontilhadas e a palavra
BATEU ao mesmo tempo, com ela no controle da distância e do tamanho. Narrar isso por cima seria
descrever o que já está na tela.

**Por que vem antes do conserto:** o bloco seguinte escreve 80 num campo. Se ela não tiver sentido o
que o número faz, 80 é só um número que o vídeo mandou digitar.

### Seção 4. Deixe a caixa do tamanho do seu dino

- **Intenção:** construção
- **Por que existe:** é o conserto, e ele acontece com o raio-X ainda ligado, para ela ver a caixa
  encolher e o desenho continuar igual no mesmo segundo.
- **Conclui quando:** o `Usar área de colisão de 80 % do tamanho para o sprite dino` está no
  `Ao iniciar`, o raio-X continua no lugar, e o `Criar dinossauro` continua com tamanho 64
- **Blocos:**
  1. `dialogue`: "Em Jogo 2D, Colisões, Área de contato, na mesma gaveta de onde veio o raio-X, pega
     o bloco comprido, o Usar área de colisão de tanto por cento do tamanho para o sprite. Arrasta
     para dentro do Ao iniciar e encaixa no fim de tudo, logo abaixo do Mudar o estado do jogo para
     inicio, que hoje é o último bloco de lá. Ele tem dois campos. O primeiro é a porcentagem, e já
     vem 80, que é o que a gente quer, então deixa como veio. No segundo, que é o sprite, escolhe o
     dino."
  2. `video` (`video-ajustar-area`): o gesto, e depois três observações em ordem. A caixa encolhe e
     fica grudada no dino. O desenho do dino continua do mesmo tamanho. E, na partida, ela passa
     raspando num cacto de propósito e escapa. Mantém a explicação de por que o bloco mora no
     `Ao iniciar`: "isso é coisa de preparação, acontece uma vez, quando o jogo liga. Aqui dentro a
     ordem não muda nada, só uma coisa importa: ele vem depois do Criar dinossauro, senão ele
     ajustaria um dino que ainda não existe." Duração alvo: 55 a 65 segundos.
  3. `studio`: conferência do bloco no `Ao iniciar`, do raio-X ainda presente, e do tamanho 64 no
     `Criar dinossauro`.

**Por que ajustar o dino e não o cacto:** uma frase, dita na hora de escolher o sprite. "O dino entra
em toda batida do jogo. O cacto é um entre muitos, e o seu jogo pode ganhar pedra e pássaro depois.
Ajustando o dino, você arruma todas as batidas de uma vez."

### Seção 5. O dial de dificuldade

- **Intenção:** conceito
- **Por que existe:** o número que ela acabou de escrever é o mais poderoso da aula, e hoje ele passa
  como detalhe de montagem. É aqui que ela deixa de consertar um jogo e passa a regular um jogo.
- **Conclui quando:** o `Usar área de colisão` do dino está com um número entre 70 e 85, e o
  `Criar dinossauro` continua com tamanho 64
- **Blocos:**
  1. `video` (`video-dial`): os dois extremos conduzidos pela narração, com o raio-X ligado, e uma
     partida curta em cada um. Em 40, a caixa fica minúscula no meio do dino, o cacto passa por
     dentro dele e não acontece nada. Em 100, a caixa volta ao tamanho cheio e voltam as batidas do
     começo da aula. Depois o número volta para a faixa boa. Duração alvo: 60 a 70 segundos.
  2. `dialogue`: o nome e a regra, mais o campo de gosto. "Esse número tem nome entre quem cria
     jogos: dial de dificuldade, que é como um botão de ajuste. Para coisa que machuca o jogador,
     área menor que 100 deixa o jogo mais justo, e isso vale na grande maioria dos jogos que você vai
     fazer. Para coisa que o jogador quer pegar, é o contrário: área maior que 100 deixa mais fácil
     de alcançar. Agora põe um número entre 70 e 85 e joga. O meu fica em 80, e o seu pode ser outro."

**Sem cena, e o motivo é o critério do briefing.** O dial é a coisa mais testável da aula no jogo
dela: ela troca um número e o efeito aparece em dez segundos de partida. Concretizar fora do projeto
o que o projeto mostra na hora seria gastar cena com o que ela já vive.

**A metade que ela não pode testar hoje fica em uma frase.** O jogo dela não tem nada para pegar,
então a área maior que 100% é dita e não é montada. Construir coleta aqui é dívida registrada do
curso 7, Mundo Pirata.

**Cuidado de escopo:** 80 é a escolha desta versão do Corre Dino, não uma regra universal de justiça.
A fala diz "o meu fica em 80", nunca "o certo é 80".

### Seção 6. Teste, guarde o raio-X e entregue

- **Intenção:** entrega e fechamento
- **Por que existe:** fecha o dia com o jogo limpo por fora e a regra viva por dentro, e nomeia o
  método que ela acabou de usar pela segunda vez no curso.
- **Conclui quando:** a entrega é enviada e as três perguntas são respondidas
- **Blocos:**
  1. `video` (`video-teste-e-envio`): a rodada com o contorno ainda ligado, uma passagem raspando,
     uma batida de propósito, a retirada do `Mostrar a caixa de colisão` para a lixeira com a lista
     enquadrada antes e depois, uma última rodada já sem o contorno, os objetivos conferidos e o
     gesto de enviar na tela. O clipe **passou a fechar com o fecho que nomeia o método**, que era
     balão: o raio-X entrou, mostrou o que estava escondido, e saiu, como o medidor da Aula 6 já
     tinha feito, e sempre que uma colisão do jogo estiver estranha é assim que se investiga.
     **Entrou pela regra de que toda seção com o Estúdio embarcado tem um vídeo mostrando como se
     faz.** Duração alvo: 60 a 75 segundos.
  2. `quiz`: três perguntas, duas mantidas e uma trocada (abaixo).
  3. `studio`: entrega, com os três critérios. O ajuste da área do dino entre 70 e 85, o desenho da
     área retirado (zero blocos), e o `Criar dinossauro` com tamanho 64 antes do ajuste. É o último
     item de `blockKeys`.

**Junta três seções de hoje.** O clipe de teste e envio é o único vídeo da seção, e ele leva o dia
todo: a retirada do instrumento acontecendo na tela, o envio, e o fecho que nomeia o método.

**Por que os dois balões saíram.** Balão depois da ferramenta não existe para quem faz a aula: o
Estúdio fica sozinho na coluna da direita e todo o resto na esquerda, então "depois do Estúdio" não
é um lugar. E o primeiro balão tinha um agravante: ele ensinava um arrasto para a lixeira, que é
gesto, e gesto pertence à tela. Nada foi apagado. O teste, a retirada e o fecho de método foram para
o roteiro do `video-teste-e-envio`. Esta aula não tem gancho para a seguinte, então nenhum balão
ficou.

**Quiz proposto:**

1. Ao ajustar a área para 80%, o desenho precisa encolher? *Não, a área de colisão e o desenho são
   coisas diferentes* (correta) · Sim, são sempre a mesma coisa.
2. Para uma coisa que machuca o jogador, uma área menor que 100% deixa o jogo: *mais justo* (correta)
   · mais difícil. **Entra no lugar de** "O que manter igual ao comparar duas áreas?", cuja
   alternativa errada ("Apenas a música") não é uma confusão que alguém tenha de verdade, e cujo
   conteúdo passou a ser cobrado pelas metas da cena.
3. Apagar o desenho da área apaga o ajuste? *Não, o ajuste continua no Ao iniciar* (correta) · Sim, o
   instrumento é a própria regra.

## Experiências e demonstrações desta aula

### 1. `hitbox` · Onde a batida acontece? · **CONSTRUÍDA, AJUSTES APLICADOS**

- **Situação:** o palco e os controles servem, e a pergunta final é boa. A cena não cobrava nada
  (`"metas": []`), não declarava de onde a área parte e cobria só um lado do dial. Os seis ajustes
  foram feitos, e o bloco passou a obrigatório.
- **Elenco:** personagem Dino (o de fábrica), obstáculo cacto (o de fábrica). **Cenário:**
  `corre-dino`.
- **Metas cobradas nesta aula:** `contact`, `area-contrast`, `too-small`, que são as três da missão
  de fábrica. O bloco **não declara `setup.goals`** de propósito: sem lista, a cena cobra as três e
  deixa de fora as duas metas só de caso, `early-hit` e `fair-hit`.

**Ajuste 1, o palco declara o ponto de partida: feito.** A área do Dino abre em **100%**, igual ao
jogo dela antes do conserto, e o cacto começa a 149 de distância, como já estava. Assim o primeiro
movimento dela é o mesmo movimento da aula: diminuir.

**Ajuste 2, as três metas: feito, com dois ids diferentes dos propostos.** Eram zero. Ficaram assim:

| id | rótulo ao cair | pedido na faixa |
|---|---|---|
| `contact` | "BATEU com os desenhos ainda longe" | "Aproxime o cacto do Dino com a Distância do cacto, um toque de cada vez." |
| `area-contrast` | "Área menor, mesmo lugar: a batida sumiu" | "Sem mexer na Distância do cacto, diminua o Tamanho da área do Dino." |
| `too-small` | "Os desenhos se tocam, e o jogo disse que não bateu" | "Encoste o cacto no desenho do Dino e deixe o Tamanho da área do Dino em 40%." |

**Divergência registrada, e o código vence.** Esta análise propôs os ids `early-hit` e `fair-hit`,
com pedidos que citavam os números: "com a área em 100%… até aparecer BATEU" e "diminua… até 80%".
Os dois ids existem no catálogo, como metas só de caso, e os pedidos são esses. O que entrou na
missão de fábrica foram `contact` e `area-contrast`, com pedidos que **não** contam o resultado nem
entregam o número: a regra do catálogo é que o pedido diga o gesto, nunca a descoberta, e
"até aparecer BATEU" é a resposta do próprio palpite desta cena. Os rótulos ao cair, que é o que a
criança lê depois, continuam sendo os que esta análise escreveu. A aula cobra `contact` e
`area-contrast`.

**Ajuste 3, o outro lado do dial entra na cena: feito.** A meta `too-small` é a imagem espelhada da
`contact`, e é ela que transforma o controle num dial de verdade: um extremo acusa batida que não
houve, o outro ignora batida que houve, e no meio a conta bate com o que o olho vê. Sem ela, a cena
ensina que menor é sempre melhor, que é justamente o que o README manda não ensinar. O gesto continua
no mesmo sentido do conserto da aula, porque ela desce de 100 para 80 antes de descer para 40, e a
terceira pista a leva de volta.

**Ajuste 4, a frase de sucesso: feita.** Ela fechava só o primeiro lado. Agora é: "O Dino ficou do
mesmo tamanho o tempo todo. Quem mandou na batida foi a área, e o tamanho dela é escolha sua."

**Ajuste 5, a instrução de abertura: feita.** Era "Traga o cacto um toque de cada vez até aparecer
BATEU. Depois deixe o cacto no mesmo lugar e mude só a área do Dino." Agora é "Traga o cacto um toque
de cada vez até aparecer BATEU. Depois deixe o cacto no lugar e mude só o tamanho da área do Dino,
para baixo e para cima."

**Ajuste 6, as pistas: feito.** As duas primeiras continuam. A terceira cobre o extremo de baixo:
"Agora encoste o cacto no desenho do Dino e leve o Tamanho da área do Dino para 40%. Olhe se aparece
BATEU."

**Palpite antes de abrir** (mantido): "Com esta área grande, quando vai aparecer BATEU?" Antes de os
desenhos se encostarem ✓ · Só quando os desenhos se encostarem.

**Pergunta depois de descobrir** (mantida, conta para concluir): "O que o jogo usa para saber que
houve batida?" Áreas invisíveis em volta de cada um ✓ · Os pixels coloridos de cada desenho.
**Explicação ao acertar**, ajustada: "O desenho é para os olhos, a área é para a conta. O tamanho da
área é um número seu: menor perdoa mais, maior perdoa menos."

**Onde mais serve:** toda aula de colisão de personagem contra obstáculo da trilha. Curso 3, Duelo de
Heróis, quando entram vida e quadros de invencibilidade. Curso 6, Sobrevivente. Curso 7, Mundo
Pirata, que é onde o dial ao contrário (área maior que 100% para coleta) é ensinado de verdade, e lá
a meta `too-small` vira o ponto de partida do assunto.

### 2. `once-vs-always` · **CONSIDERADA E RECUSADA NESTA AULA**

A cena `once-vs-always`, construída a partir da proposta do Dia 1 do Desafio, separa o que roda uma
vez do que roda a cada quadro. Nesta
aula existem os dois casos: o ajuste mora no `Ao iniciar` e o contorno é desenhado todo quadro. Ainda
assim ela não entra, por três motivos. As áreas do projeto são conteúdo da aula 1 e da aula 2 deste
curso, e chegar na aula 10 com uma cena de fundamento é tratar como novidade o que ela usa há oito
aulas. O elenco da cena é a nave do Desafio, e vocabulário de outro jogo é proibido aqui. E o caso
desta aula se resolve com uma frase dentro de cada encaixe, que é o que o critério do briefing manda
fazer quando a explicação basta.

**Onde ela serve no Corre Dino:** aula 1, quando o `Ao iniciar` estreia, e aula 2, quando o
`Enquanto estiver rodando` entra junto com o `A cada quadro do jogo`.

## Vídeos

| Chave | Título do clipe | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-batida-injusta` | A batida que você não deu | uma batida contada sem encosto, congelada e ampliada | `video-abertura-editorial` | 25 a 35 s | fala nova, tela nova. Precisa de partida jogada até o caso sair |
| `video-raio-x` | O contorno que aparece em volta do dino | o gesto do instrumento, o contorno rosa e os três vãos | `video-ligar-raio-x` + `video-desenho-e-area` | 60 a 70 s | funde dois clipes. Fala sim, com troca da subcategoria para Colisões, Área de contato |
| `video-ajustar-area` | A caixa encolhe, o dino continua igual | o bloco no `Ao iniciar`, a caixa encolhendo, o desenho igual e o teste raspando | `video-ajustar-area` | 55 a 65 s | fala sim, com troca de "Ir para a tela inicio" por `Mudar o estado do jogo para inicio` |
| `video-dial` | O botão que decide o quanto o jogo perdoa | 40 e 100 conduzidos, com partida em cada um, e a volta para a faixa | `video-tirar-raio-x`, primeira metade | 60 a 70 s | fala sim. A retirada do instrumento sai deste clipe e vira instrução de teste |
| `video-teste-e-envio` | Raspar, bater e tirar o raio-X | a rodada raspando, a batida de propósito, o instrumento indo para a lixeira, o gesto de enviar e o fecho que nomeia o método | novo | 60 a 75 s | não, gravação nova |

**Saldo:** de 6 clipes para 5. A abertura vira dor e muda de natureza, a demonstração do contorno é
absorvida pelo clipe do raio-X, a seção do dial ganha o clipe que hoje é da retirada, o clipe de
fecho antigo sai e o fecho passa a ser o fim do clipe da entrega, e a entrega ganha clipe pela regra
de que toda seção com o Estúdio embarcado tem um vídeo mostrando como se faz. Em minutagem, a queda é maior do que a contagem sugere, porque a prova
do conceito saiu da narração e foi para a cena.

## Continuidade

- **O que esta aula assume da anterior:** o jogo completo da aula 9. No `Ao iniciar`, o último bloco é
  o `Mudar o estado do jogo para inicio`, e é nele que o ajuste se ancora. Dentro do
  `Se o estado do jogo é jogando ?`, o último bloco é o `Tirar do grupo cactos quem sair da tela`, e é
  nele que o raio-X se ancora. O `Criar dinossauro` tem tamanho 64, que é o que faz a comparação entre
  desenho e área ter sentido.
- **O que esta aula entrega para a seguinte:** o `Ao iniciar` ganha o
  `Usar área de colisão de 80 % do tamanho para o sprite dino` como último bloco, e passa a ter seis
  blocos. O `Mostrar a caixa de colisão` não existe mais em lugar nenhum do projeto, e é por isso que
  na aula 11 o último bloco de dentro do `Se o estado do jogo é jogando ?` volta a ser a faxina, que é
  a âncora de onde o placar vai entrar. Se o raio-X ficar, a âncora da aula 11 fica errada.
- **Alerta de âncora para a aula 11:** desde hoje, o `Mudar o estado do jogo para inicio` **não é mais
  o último bloco do `Ao iniciar`**. A narração da aula 11 afirma que ele continua sendo, e precisa ser
  corrigida junto com esta aula.
- **Valores canônicos que saem daqui:** área de colisão do dino em 80, com a faixa de 70 a 85 aberta
  como campo de gosto · tamanho do dino em 64, inalterado · nenhum outro valor do projeto muda.
- **Campos livres:** o número da área, entre 70 e 85. Nenhuma aula posterior cita esse número.
