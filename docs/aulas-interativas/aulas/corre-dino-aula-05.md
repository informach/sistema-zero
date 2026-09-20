# Corre, Dino! · Aula 5 · O cacto vem vindo

## Resumo

- **Estado de entrada:** o Dino corre na floresta, pula pelos três controles e o pulo tem som. Em
  `Ao iniciar`: `Preparar o jogo em tela cheia, tela 480 × 270, fundo azul-claro` e
  `Criar dinossauro dino em x 110 y 150 tamanho 64`. Em `Quando acontecer`:
  `Quando o sprite dino pular` com `Tocar efeito` com `pulo`. Em `Enquanto estiver rodando`, um
  `A cada quadro do jogo` com cinco blocos. A pista está vazia: não há de que desviar.
- **Vitória do dia:** cactos entrando pela direita, um de cada vez, com espaço entre eles, e o Dino
  pulando por cima. É a aula em que o jogo vira jogo.
- **Seções hoje:** 11 · **Seções propostas:** 8
- **Clipes hoje:** 8 · **Clipes propostos:** 6. A contagem não muda com o redesenho da entrega:
  nenhum clipe entrou nem saiu, o `video-teste-e-envio` é que cresceu.
- **Fecho da entrega:** o passo a passo do teste e a recapitulação saíram do balão e foram para o
  roteiro do `video-teste-e-envio`, e só o gancho da Aula 6 continuou balão. Balão depois da
  ferramenta não existe para quem faz a aula, porque o Estúdio fica sozinho na coluna da direita e
  todo o resto na esquerda.
- **Cenas:** 2, as duas construídas no catálogo (`spawn`, `velocity`). As duas metas que a análise
  pedia já estão na missão de fábrica: `with-timer` na `spawn` e `stopped` na `velocity`.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| Grupo (o time de cactos) | Sim, no papel. Um grupo vazio não tem nada na tela | **Sim, sem cena** | A própria avalanche. Um `Mover os sprites do grupo cactos usando suas velocidades` move duzentos cactos de uma vez | Dentro da seção de dor | Não há o que isolar num palco separado: o grupo fica concreto no instante em que dois blocos comandam uma multidão. Cena aqui seria repetir o jogo dela num palco pior |
| **A dor:** criar o cacto dentro do `A cada quadro do jogo` vira avalanche | Não é conceito, é um defeito | **Roda no jogo dela, com os valores de fábrica** | Seção de dor, montada por ela | Antes do relógio | 60 cactos por segundo, quase 200 em três segundos. É a dor mais visível do curso e ela reproduz sozinha |
| O relógio (`A cada __ segundos fazer`) | Sim. Tempo entre dois acontecimentos não se vê | **Sim** | Experimentação, `spawn` | Depois da dor, antes de montar | Ela precisa sentir que o que abre espaço é o tempo entre um nascimento e o outro, e não a velocidade. A cena isola isso com uma variável só |
| Dois ritmos vizinhos dentro da mesma área | Sim, mas é a mesma ideia do relógio | **Sim, dentro da mesma cena** | `spawn` | Junto | A cena já compara o mesmo tempo com e sem relógio. Separar repetiria o palco |
| Mover um bloco deixando os de baixo (Ctrl e arrastar) | Não é conceito, é operação | Não | | Dentro da montagem do relógio | O curso ensina a ferramenta na aula que precisa dela. O estrago aqui é mudo, então a fala não encolhe |
| Nascer fora da tela | Não. A tela acaba em 480 e o cacto nasce em 400, e ela vê o cacto aparecer do nada | Não | | Dentro da construção, com a régua no clipe | Ela já fez `coordinates` e `stage-size` na Aula 1. Repetir cena de coordenada aqui seria cobrar de novo o que ela já derrubou. A régua com 400, 480 e 560 na mesma escala resolve em dez segundos |
| Velocidade negativa (o sinal) | Sim. Contraria a intuição: para ir para a esquerda o número diminui | **Sim** | Experimentação, `velocity` | Antes de ela escrever menos 5 | É a conta que as Aulas 12 e 13 assumem como sabida. Se ela digitar o menos 5 antes de sentir o sinal, escreve um número sem significado |
| Pixels por quadro (o que o vx conta) | Sim, e é a mesma ideia do sinal | **Sim, dentro da mesma cena** | `velocity` | Junto | A cena mostra o x mudando quadro a quadro. É a mesma explicação |
| Tamanho 44 do cacto | Não. Vem de fábrica e fica | Não | | Uma linha na montagem | Todo campo recebe uma fala, inclusive o que não muda |
| A forma `cacto` no seletor do obstáculo | Não. Já nasce escolhida | Não | | Uma linha na montagem | Idem |
| Colisão (o Dino atravessa o cacto) | Não é conteúdo de hoje | Não | | Uma frase na entrega | A aula precisa dizer que é de propósito e que a Aula 9 resolve, senão a criança acha que errou |

Onze coisas, três concretizações, e as três moram em duas cenas que já existem. Oito conceitos não
ganham nada, e é essa triagem que tira a aula de 11 para 7 seções.

## Diagnóstico do desenho atual

**A maior dor do curso virou vídeo.** A seção *Veja por que nascem tantos cactos* mostra a avalanche
num clipe e diz, na orientação de montagem, "a criança ainda não copia esta pilha". Isso desmonta a
regra número um do curso. A `referencia-blocos-corre-dino.md` registra a avalanche entre as dores
que reproduzem sozinhas com os valores de fábrica, e registra também que a inversão de degrau da
Aula 5 é consciente: a criança põe o criar-cacto dentro do `A cada quadro do jogo` **primeiro**, leva
a avalanche, e o relógio entra como conserto. No desenho de hoje ela assiste ao erro de outra pessoa.

O custo de devolver a montagem é quase zero, e é isso que decide. Os três blocos daquela pilha são
blocos que ela vai manter até o fim do curso. Só um deles muda de lugar depois, e é justamente esse
que motiva a ferramenta de arrastar com Ctrl. Sem a montagem, a aula ensina o Ctrl e arrastar para
resolver um problema que ela nunca teve.

**Os critérios da seção *Monte os dois ritmos do jogo* cobram um valor que ainda não foi digitado.**
A regra do manifesto pede `No grupo cactos criar obstáculo` com `VX: -5`, e o bloco nasce com menos
3. A troca do vx de menos 3 para menos 5 só acontece duas seções depois, em *Faça o cacto entrar
pela direita*. Quem seguir a narração e apertar Conferir não passa. O mesmo critério também exige
"Mantenha apenas um bloco de criação de cacto", um critério herdado do fluxo em que ela montava a
avalanche primeiro e depois movia o bloco: no fluxo de hoje ela nunca teve dois.

**Duas seções contam a mesma coisa com o mesmo clipe.** *Veja onde o cacto começa* e *Faça o cacto
entrar pela direita* apontam para a mesma fonte, Parte 4, Passo 4, e o trecho original transcrito nas
duas é **literalmente o mesmo texto**. A primeira é declarada `demonstration` e não tem bloco de
demonstração nenhum, só uma nota de tela pedindo uma régua. É exatamente o defeito que o briefing
conta: intenção de demonstração sem demonstração.

**O sinal da velocidade é explicado depois de ela escrever o número.** Em *Faça o cacto entrar pela
direita* ela troca o vx para menos 5, e só na seção seguinte, *Por que a velocidade é negativa?*,
vem a explicação do sinal. É o mesmo defeito do motor montado antes de a criança saber o que ele faz.

**A seção do sinal roda como demonstração, e a relação tem botão.** *Por que a velocidade é negativa?*
usa a cena `velocity` em formato de demonstração guiada. Pelo critério do briefing, experimentação é
quando dá para escrever "quando eu mudo X, acontece Y", e o próprio briefing lista o sinal da
velocidade entre os exemplos de experimentação. A cena, no catálogo, já nasceu experimentação: tem
campo do que manipula, duas metas e três pistas. O que o v6 fez foi embrulhá-la num bloco de
demonstração com caso preparado.

**A seção *Prepare o grupo dos cactos* é um encaixe só.** Um bloco, `Criar grupo de sprites cactos`,
e um grupo vazio que não muda nada na tela. Encaixe não é seção.

**Duas seções para fechar.** *Veja o que você aprendeu* e *Confira as ideias de hoje* repetem o
padrão do curso inteiro: um clipe de recapitulação numa seção, o quiz noutra.

## Proposta final

### Seção 1. O que a gente vai fazer hoje

- **Intenção:** apresentação
- **Por que existe:** o Dino pula sem motivo. A criança precisa ver o motivo chegando pela direita
  antes de montar a primeira peça.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`). O jogo do fim da aula rodando: cactos entrando pela direita, um de
     cada vez, e o Dino pulando por cima. Fala curta: "Repara no seu Dino pulando aí. Ele está
     pulando à toa, porque não tem nada para desviar. Hoje isso acaba. Você vai fazer os cactos
     nascerem, andarem e virem na direção dele." Duração alvo: 25 a 35 segundos.

### Seção 2. Um time de cactos, e a avalanche

- **Intenção:** dor
- **Por que existe:** o grupo só fica concreto quando uma peça manda em muitos de uma vez, e a
  avalanche é essa prova e a dor do dia ao mesmo tempo. Ela monta, olha a tela e vê o estrago.
- **Conclui quando:** o `Criar grupo de sprites cactos` está em `Ao iniciar` e os três blocos do
  obstáculo estão dentro do `A cada quadro do jogo`, na ordem, com os valores de fábrica
- **Blocos:**
  1. `dialogue`. Orientação de montagem, parte um: "Quantos cactos o seu jogo vai ter? Não é um, nem
     dois. É um monte, um atrás do outro. Em Jogo 2D, Grupos, Criar e percorrer, pegue o
     `Criar grupo de sprites` e encaixe dentro do `Ao iniciar`, logo abaixo do `Criar dinossauro`.
     Ele tem um campo só, o nome do grupo, e ali você escreve `cactos`, tudo junto e sem acento.
     Isso é um grupo, e ele funciona que nem um time: em vez de falar com cada cacto, você fala com
     o time inteiro de uma vez."
  2. `dialogue`. Orientação de montagem, parte dois, os três blocos do laço: "Agora três blocos, e
     os três vão dentro do `A cada quadro do jogo`. Em Jogo 2D, Kits prontos, Dino, pegue o
     `No grupo criar obstáculo` e encaixe logo abaixo do `Desenhar o sprite dino`. Ele tem cinco
     campos. No primeiro, o grupo, escolhe `cactos`. O segundo é a forma, e já nasce em `cacto`, que
     é o que a gente quer. Os três últimos são números, o x, o tamanho e o vx, e hoje nenhum deles
     muda: deixa os três como vieram. Em Jogo 2D, Grupos, Movimento, pegue o
     `Mover os sprites do grupo usando suas velocidades` e encaixe logo abaixo do
     `No grupo cactos criar obstáculo`, com o grupo `cactos`. Em Jogo 2D, Grupos, Desenho e ordem,
     pegue o `Desenhar o grupo` e encaixe logo abaixo do
     `Mover os sprites do grupo cactos usando suas velocidades`, também com `cactos`. Agora olha a
     área do jogo."
  3. `video` (`video-grupo-e-avalanche`). O gesto dos quatro blocos e a avalanche acontecendo. Junta
     os dois clipes de hoje. Fecha na conta, sem prometer conserto: "A tela virou uma parede de
     cacto, e não dá nem para ver o Dino. Isso era para acontecer mesmo. Onde a gente encaixou o
     bloco de criar o cacto? Dentro do `A cada quadro do jogo`, que roda 60 vezes por segundo. Então
     a gente pediu 60 cactos por segundo. Em três segundos são quase duzentos. O computador fez
     exatamente o que você mandou. Ele é obediente demais." Duração alvo: 75 a 90 segundos.
  4. `studio`. Conferência dos quatro encaixes e da ordem dos três blocos do laço.

**Por que junta o que hoje são duas seções, e por que ela volta a montar.** Criar o grupo e encher o
grupo é um movimento só, e o grupo vazio sozinho não é vitória nenhuma. A montagem volta porque a dor
do curso é montar errado e ver quebrar: dos quatro blocos, três ficam onde estão até o fim do curso e
só um muda de lugar na seção seguinte, que é exatamente o que dá sentido ao Ctrl e arrastar.

**Âncoras, conferidas contra a regra do último bloco colocado.** A pilha do laço fica
`Limpar a tela`, `Desenhar fundo de floresta`, `Aplicar a gravidade do mundo ao sprite dino`,
`Controlar o dinossauro dino`, `Desenhar o sprite dino`, `No grupo cactos criar obstáculo`,
`Mover os sprites do grupo cactos usando suas velocidades`, `Desenhar o grupo cactos`. Cada encaixe
ancora no bloco colocado imediatamente antes, e nenhuma âncora aparece duas vezes.

### Seção 3. O que abre espaço é o tempo

- **Intenção:** conceito
- **Por que existe:** a criança acabou de ver duzentos cactos colados. Antes de arrastar qualquer
  peça, ela precisa descobrir que o que separa um cacto do outro é o tempo entre dois nascimentos, e
  não a velocidade deles.
- **Conclui quando:** as metas `every-frame` e `with-timer` caem, e a pergunta final da cena é
  respondida
- **Blocos:**
  1. `dialogue`. Abertura curta do Zappy, sem vídeo: "O bloco de criar o cacto está certo. O problema
     é onde ele está. Aqui do lado dá para experimentar os dois jeitos sem mexer no seu jogo."
  2. `interactive`. Cena `spawn`, "Abra espaço entre os cactos". Elenco: dino e cacto. Cenário:
     `corre-dino`.

**Não tem vídeo de propósito.** A cena põe o mesmo tempo passando com e sem relógio, lado a lado, e a
pergunta final separa tempo de velocidade, que é exatamente a confusão que a aula precisa evitar
antes da Aula 12.

### Seção 4. Dois ritmos, um do lado do outro

- **Intenção:** construção
- **Por que existe:** é o conserto, e é o gesto mais delicado da aula: tirar um bloco do meio de uma
  pilha deixando os de baixo onde estão.
- **Conclui quando:** existe um `A cada 1.4 segundos fazer` dentro do `Enquanto estiver rodando`, ao
  lado do `A cada quadro do jogo`, com o `No grupo cactos criar obstáculo` dentro dele, e o laço
  mantém o `Mover os sprites do grupo cactos usando suas velocidades` e o `Desenhar o grupo cactos`
- **Blocos:**
  1. `dialogue`. Orientação de montagem: "Em Jogo 2D, Tempo, Quadros e intervalos, pegue o
     `A cada __ segundos fazer` e solte dentro do `Enquanto estiver rodando`, ao lado do
     `A cada quadro do jogo`, com um espaço. Repara bem: ao lado, não dentro. Os dois são vizinhos,
     cada um com o seu ritmo. Agora o bloco de criar o cacto muda de lugar, e ele está no meio da
     pilha. Se você arrastar do jeito normal, o `Mover os sprites do grupo` e o `Desenhar o grupo`
     vêm junto, e aí o grupo passa a andar e a ser desenhado uma vez a cada 1.4 segundo, o que faz o
     cacto andar aos trancos sem você entender por quê. Então segura a tecla Ctrl enquanto clica e
     arrasta: com o Ctrl segurado, sai só o bloco que você clicou. Segura o Ctrl, pega o
     `No grupo cactos criar obstáculo`, arrasta para fora e solta dentro do bloco novo. Se vier tudo
     junto sem querer, aperta Ctrl+Z e tenta de novo. O bloco novo tem um campo só, o número de
     segundos, e vem com 2. Troca por 1.4, e no Estúdio número quebrado se escreve com ponto, não
     com vírgula."
  2. `video` (`video-relogio`). O gesto do relógio e do Ctrl com arrastar, com o antes e o depois na
     área do jogo. Nomeia a peça: "Esse bloco tem nome, e é relógio. Ele serve para uma coisa
     acontecer no ritmo certo, em vez de acontecer sempre. E não é só para cacto: relógio serve para
     um inimigo aparecer, para um item nascer, para o veneno tirar uma vida de tempo em tempo. Você
     vai usar essa peça em muito jogo daqui para frente." Duração alvo: 60 a 70 segundos.
  3. `studio`. Conferência do relógio em 1.4, do bloco de criação dentro dele, do bloco de criação
     fora do `A cada quadro do jogo`, de existir um só, e dos dois blocos de grupo que ficaram no
     laço.

**O bug do vx, e o que foi feito com ele.** O critério desta seção no manifesto v6 exigia
`No grupo cactos criar obstáculo` com `VX: -5` e `X: 400`. O bloco nasce com vx menos 3, e a troca
para menos 5 só acontece duas seções adiante. Quem seguisse a narração e apertasse Conferir
reprovava. **A correção escolhida foi tirar os três números do critério desta seção**, o x, o
tamanho e o vx, e não trocar menos 5 por menos 3. Os dois motivos:

1. Travar menos 3 punia pelo outro lado: quem tivesse se adiantado e escrito menos 5 reprovaria numa
   seção que nunca falou de velocidade.
2. Esta seção não é sobre nenhum dos três números. Ela é sobre o relógio existir com 1.4, o bloco de
   criação ter saído do laço e caído dentro dele, e os dois blocos de grupo terem ficado onde
   estavam. É exatamente isso que o critério passa a cobrar.

O x 560 é cobrado na Seção 5, que é onde ele é pedido, e o vx menos 5 na Seção 7, pelo mesmo motivo.

### Seção 5. Nascer fora da tela

- **Intenção:** construção
- **Por que existe:** com o relógio funcionando, aparece um defeito que estava escondido pela
  avalanche: o cacto surge do nada perto da beirada, em vez de entrar andando. É uma regra de ofício,
  e ela cabe numa seção só, com a régua e a troca de um número.
- **Conclui quando:** o `No grupo cactos criar obstáculo` está com x 560, forma `cacto`, tamanho 44
- **Blocos:**
  1. `video` (`video-fora-da-tela`). A régua horizontal com 400, 480 e 560 na mesma escala, e o
     retângulo de 480 × 270 com uma faixa externa à direita. Um cacto por vez. A fala aponta o
     defeito primeiro e o conserto depois: "Repara onde os cactos estão aparecendo. Eles não entram
     vindo de fora, eles simplesmente aparecem, pertinho da beirada da direita. Isso é porque o bloco
     veio com o x em 400, e a nossa tela tem 480 de largura. O 400 é dentro da tela. Nos jogos, os
     obstáculos nascem fora da tela e entram andando, para o jogador ver eles chegando e ter tempo de
     reagir. Lembra disso: nascer fora da tela é uma regra que quem cria jogo segue quase sempre.
     Então troca o x de 400 para 560. Como a tela vai até 480, o 560 fica bem depois da beirada
     direita, do lado de fora." Duração alvo: 40 a 50 segundos.
  2. `dialogue`. A linha do campo que não muda: "O tamanho já vem 44, que é um tamanho bom para o
     cacto. Deixa assim. O vx a gente mexe na próxima."
  3. `studio`. Conferência do x 560.

**Junta duas seções que hoje contam a mesma coisa duas vezes**, com o mesmo trecho de origem em
ambas. Sem cena: ela já derrubou as três metas de `coordinates` e as duas de `stage-size` na Aula 1,
e a régua com os três números na mesma escala fecha a ideia em dez segundos.

### Seção 6. Por que o número é negativo

- **Intenção:** conceito (`exploration`)
- **Por que existe:** o cacto anda para a esquerda porque o vx é negativo, e essa conta é a base das
  Aulas 12 e 13. A criança sente o sinal na cena antes de escrever o menos 5.
- **Conclui quando:** as metas `moves`, `left` e `stopped` caem e a pergunta final da cena é
  respondida
- **Blocos:**
  1. `dialogue` (`fala-antes-da-velocidade`). Abertura curta do Zappy, sem vídeo: "O cacto já vem
     para a esquerda, e o número dele é menos 3. Por que menos? Vamos ver o número mandando no
     cacto, um quadro de cada vez."
  2. `interactive` (`experiencia-velocidade`). Cena `velocity`, com o cacto no papel de personagem.
     Elenco: cacto. Cenário: `corre-dino`. Formato: experimentação, com a justificativa na ficha da
     cena, abaixo. O palpite do v6 é mantido, porque ele aponta direto para o sinal.

**A meta chamada `still` já existe, e o nome dela é `stopped`.** A ficha da cena, mais abaixo, pede
uma meta nova para "com velocidade zero, o cacto fica parado". O catálogo já tem essa meta, com esse
comportamento, sob o id `stopped`, e o próprio manifesto v6 esperava por ela no `waitFor` da
demonstração. Criar `still` duplicaria o que existe. O manifesto cobra `moves`, `left` e `stopped`,
que são exatamente as três metas de fábrica da cena.

### Seção 7. Ponha o menos 5 no seu jogo

- **Intenção:** construção (`application`)
- **Por que existe:** agora ela escreve o menos 5 sabendo o que o sinal quer dizer, joga de verdade
  e fecha nos dois valores de que as próximas aulas partem.
- **Conclui quando:** o `No grupo cactos criar obstáculo` está com x 560, tamanho 44 e vx -5, dentro
  de um `A cada 1.4 segundos fazer`
- **Blocos:**
  1. `dialogue` (`fala-menos-cinco`). Orientação de montagem: "Agora o último campo do bloco. O vx é
     a velocidade, e é quantos pixels o cacto anda a cada quadro. Pixel é aquele quadradinho miúdo
     da tela. Ele veio com menos 3. Troca por menos 5: quanto mais negativo, mais rápido ele vem na
     sua direção."
  2. `video` (`video-teste-e-valores`). O teste de verdade e o fecho nos valores do jogo: "Clica na
     área do jogo e joga. Os cactos vêm da direita, um depois do outro, e você pula para escapar. E
     se o Dino encostar num cacto, ainda não acontece nada: ele atravessa. É de propósito, e é a
     Aula 9 que resolve. Antes de fechar, confere os dois números do nosso jogo: o vx em menos 5 e o
     relógio em 1.4. Esses dois são os valores de que as próximas aulas partem." Duração alvo: 45 a
     55 segundos. **Cortar do material de hoje** o passeio livre por menos 3, menos 9, 0.8 e 2.5:
     essa comparação por extremos volta na Aula 12, onde ela tem função.
  3. `studio`. Conferência do vx -5, do x 560, do tamanho 44 e do relógio em 1.4.

**Por que a Seção 6 virou duas seções.** A regra das duas colunas do player só deixa uma coisa na
coluna da direita por seção, e a seção desenhada acima tinha duas: a cena `velocity` e o Estúdio
embarcado. A divisão não muda o desenho didático, e até o aperta: a bancada fecha sozinha na
descoberta do sinal, e a troca do número vira uma seção de um gesto só, com o teste do jogo no fim.

### Seção 8. Teste, envie e fecha

- **Intenção:** entrega e fechamento
- **Por que existe:** fecha o ciclo com a pista povoada e guarda os dois nomes do dia.
- **Conclui quando:** a entrega é enviada e as três perguntas são respondidas
- **Blocos:**
  1. `video` (`video-teste-e-envio`): a espera pelos dois primeiros cactos, com a borda direita
     enquadrada, o espaço entre eles contado, um pulo por cima de cada um, os objetivos conferidos
     um por um e o gesto de enviar na tela. O clipe **passou a fechar com a recapitulação do dia**,
     que era balão: o grupo, que é falar com o time inteiro de uma vez, o relógio, que é escolher o
     ritmo de uma coisa em vez de deixar ela acontecer sempre, e a regra de ofício de que obstáculo
     nasce fora da tela e entra andando. **Entrou pela regra de que toda seção com o Estúdio
     embarcado tem um vídeo mostrando como se faz.** Duração alvo: 50 a 60 segundos.
  2. `dialogue`. Gancho da Aula 6, o único balão que fica aqui porque é curto e não depende de ter
     acabado de jogar: "Na Aula 6 você vai descobrir uma coisa que está acontecendo no seu jogo
     agora e que não dá para ver."
  3. `quiz`. As três perguntas atuais, mantidas como estão.
  4. `studio`. Entrega, com os oito critérios do manifesto atual, **com uma correção**: o
     `criar-uma-vez` volta a fazer sentido, porque ela de fato chegou a ter o bloco dentro do laço e
     o moveu. É o último item de `blockKeys`.

**Junta três seções de hoje.**

**Por que a recapitulação saiu do balão.** Balão depois da ferramenta não existe para quem faz a
aula: o Estúdio fica sozinho na coluna da direita e todo o resto na esquerda, então "depois do
Estúdio" não é um lugar. Nada foi apagado. O passo a passo do teste e as três ideias do dia foram
para o roteiro do `video-teste-e-envio`, e só o gancho da Aula 6 continuou balão.

## Experiências e demonstrações desta aula

### 1. `spawn` · **CONSTRUÍDA, SERVE COMO ESTÁ**

- **Situação:** a cena é exatamente o conceito da seção e o palco já é de cactos. A dúvida era de
  metas: o roteiro da aula declara **duas** descobertas ("Viu a parede de cactos" e "Com o relógio,
  sobrou espaço"), e a conferência mostrou que as duas existem.
- **Ajuste 1, meta nova: já existe, e o id dela é `with-timer`.** A segunda meta está construída na
  missão de fábrica, com o rótulo "Com o relógio, sobrou espaço entre os cactos" e o pedido "Leve
  Criar cacto para dentro do relógio e deixe o tempo passar até nascerem dois cactos". **A aula cobra
  `with-timer`.**
- **Ajuste 2, rótulo do relógio:** a cena chama a peça de "o relógio", que é o vocabulário canônico e
  está certo. Acrescentar, na primeira menção dentro da cena, o rótulo do bloco que ela vai procurar
  logo depois: `A cada __ segundos fazer`.
- **Elenco/cenário:** dino e cacto / `corre-dino`. Já é assim, sem elenco novo.
- **Metas cobradas nesta aula:** `every-frame` e `with-timer`, que são as duas da missão de fábrica.
  O bloco **não declara `setup.goals`** de propósito: sem lista, a cena cobra as duas.
- **Onde mais serve:** toda aula de qualquer curso em que alguma coisa passa a nascer de tempo em
  tempo. É a cena do relógio, e o relógio é peça de quase todo jogo.

### 2. `velocity` · **CONSTRUÍDA, AJUSTE DE FORMATO APLICADO**

- **Situação:** a cena existe, o caso preparado com o cacto em x 400, y 230 e velocidades zeradas
  está bom, e as pistas servem. O que precisava mudar era o formato, e a meta que parecia faltar já
  estava lá.
- **Ajuste 1, de demonstração para experimentação.** Pelo critério do briefing, experimentação é
  quando dá para escrever "quando eu mudo X, acontece Y", e o briefing lista o **sinal da
  velocidade** entre os exemplos de experimentação. A cena já nasceu experimentação no catálogo: tem
  campo do que manipula ("Velocidade do Dino nos dois eixos, e o relógio"), duas metas e três pistas.
  O v6 a embrulhou num bloco de demonstração com cinco ações de preparo. O custo do ajuste é retirar
  esse embrulho: o palco e as metas já existem. O ganho é que a criança escolhe o número, vê o x
  mudar quadro a quadro e só depois digita menos 5 no bloco dela.
- **Ajuste 2, meta nova `still`: já existe, e o id dela é `stopped`.** A conferência de 19/09/2026
  contra o catálogo real mostrou três metas de fábrica, não duas: `moves`, `left` e `stopped`, esta
  última com o rótulo "Com velocidade zero, o Dino fica parado". O próprio manifesto v6 já esperava
  por ela no `waitFor` do terceiro passo da demonstração. O id `still` também existe, como meta só
  de caso, com o rótulo escrito sem citar o Dino, e serve a quem trocar o elenco. **Nada a fazer
  neste ajuste**, além da troca de elenco do Ajuste 3, que alcança o rótulo dela. A cena tem ainda
  as metas `up` e `down`, do eixo de cima e baixo, também só de caso: elas nasceram para o Dia 2 do
  Desafio e ficam fora da missão desta aula.
- **Ajuste 3, elenco:** trocar Dino por cacto no título, na instrução, nos rótulos das metas e na
  frase de sucesso. O v6 já renomeia o título para "O que move o cacto a cada quadro", e a troca
  precisa alcançar o resto do texto. Cenário: `corre-dino`.
- **Ajuste 4, palpite:** manter o palpite escrito na aula, que é bom e aponta para o sinal: "O cacto
  nasce na direita da tela. Para o cacto vir para a esquerda, a velocidade para o lado precisa
  ser…", com menos 5 correto.
- **Metas cobradas nesta aula:** `moves`, `left` e `stopped`, que são as três da missão de fábrica.
  O bloco **não declara `setup.goals`** de propósito: sem lista, a cena cobra as três e deixa de
  fora as três metas só de caso (`still`, `up` e `down`).
- **Onde mais serve:** Corre, Dino! Aula 12, comparando os passos de menos 5 e menos 6, e todo curso
  em que alguma coisa se move por velocidade em vez de por posição.
- **Nota de continuidade para quem redesenhar a Aula 12:** lá a cena é usada de novo. Se o que a
  criança faz for acompanhar dois cactos já sorteados correndo lado a lado, é processo no tempo e
  pode continuar demonstração. Se ela puder escolher os dois números, vale a mesma regra de hoje. A
  decisão fica para aquela análise.

## Vídeos

| Chave | Título do clipe | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-abertura` | O motivo do pulo chega pela direita | o jogo do fim da aula, com os cactos chegando | `video-abertura-editorial` | 25 a 35 s | fala parcial, tela regravada |
| `video-grupo-e-avalanche` | Duzentos cactos em três segundos | o grupo, os três blocos do obstáculo e a avalanche | `video-grupo-cactos` + `video-avalanche` | 75 a 90 s | funde dois clipes, e a criança volta a montar junto |
| `video-relogio` | O relógio mora ao lado do motor | o relógio ao lado do laço e o Ctrl com arrastar | `video-relogio-cacto` | 60 a 70 s | fala sim, tela regravada |
| `video-fora-da-tela` | Nascer do lado de fora | a régua com 400, 480 e 560, e a troca do x | `video-fora-da-tela` + `video-entrada-suave` | 40 a 50 s | funde dois clipes que hoje têm o mesmo trecho de origem |
| `video-teste-e-valores` | Joga de verdade | jogar de verdade e fechar em menos 5 e 1.4 | `video-sentido-velocidade` | 45 a 55 s | fala parcial, sem o passeio por menos 3, menos 9, 0.8 e 2.5 |
| `video-teste-e-envio` | Esperar dois cactos e enviar | os dois primeiros cactos entrando, o espaço entre eles, dois pulos, o gesto de enviar e a recapitulação do dia | novo | 50 a 60 s | não, gravação nova |

**Saldo:** de 8 clipes para 6. Dois pares fundidos, o clipe de fecho antigo que sai com o fecho
virando o fim do clipe da entrega, a explicação do sinal da velocidade que sai da narração e vai
inteira para a cena, e um clipe novo na entrega, que entrou pela regra de que toda seção com o
Estúdio embarcado tem um vídeo mostrando como se faz.

## Continuidade

- **Assume da Aula 4:** as três áreas do projeto montadas, o som no `Quando o sprite dino pular`, e o
  laço com cinco blocos. Assume também que ela já sabe que arrastar um bloco leva os de baixo junto,
  porque viu isso acontecer na Aula 2. É essa aula que a narração cita ao ensinar o Ctrl.
- **Entrega para a Aula 6:** em `Ao iniciar`, o `Criar grupo de sprites cactos` logo abaixo do
  `Criar dinossauro`. Em `Enquanto estiver rodando`, ao lado do `A cada quadro do jogo`, um
  `A cada 1.4 segundos fazer` com `No grupo cactos criar obstáculo cacto em x 560 tamanho 44 com vx
  -5` dentro. No laço, depois do `Desenhar o sprite dino`, o
  `Mover os sprites do grupo cactos usando suas velocidades` e o `Desenhar o grupo cactos`. O laço
  fica com **sete blocos**.
- **Valores canônicos que saem daqui:** relógio 1.4 · x 560 · tamanho 44 · vx -5 · nome do grupo
  `cactos` · forma `cacto`.
- **Campos livres:** nenhum. O vx e o relógio **não** são campos de gosto: a Aula 13 cria a variável
  `velocidade` com menos 5 e parte do vx do cacto, e o relógio de 1.4 é assumido pelas aulas
  seguintes. É por isso que o clipe do teste fecha devolvendo os dois valores, com fala explícita.
- **Dívida que a aula abre de propósito:** o Dino atravessa o cacto. A entrega diz que é de propósito
  e cita a Aula 9, para a criança não achar que errou.

## Manifesto

Arquivo: `corre-dino-aula-05.manifesto.json`. **8 seções, 26 blocos.** Validado contra o validador
real do core: `OK`, sem avisos.

| Seção | Chave | Intenção | Coluna da direita |
|---|---|---|---|
| 1. O que a gente vai fazer hoje | `abertura` | `presentation` | nenhuma |
| 2. Um time de cactos, e a avalanche | `avalanche` | `application` | Estúdio |
| 3. O que abre espaço é o tempo | `espaco-e-tempo` | `exploration` | cena `spawn` |
| 4. Dois ritmos, um do lado do outro | `dois-ritmos` | `application` | Estúdio |
| 5. Nascer fora da tela | `fora-da-tela` | `application` | Estúdio |
| 6. Por que o número é negativo | `numero-negativo` | `exploration` | cena `velocity` |
| 7. Ponha o menos 5 no seu jogo | `menos-cinco` | `application` | Estúdio |
| 8. Teste, envie e fecha | `entrega` | `delivery` | Estúdio |

**Divisão pela regra das duas colunas:** uma, a Seção 6 original, que acumulava a cena `velocity` e
o Estúdio embarcado. Virou as Seções 6 e 7. Nenhuma outra seção acumula.

**Decisões registradas no manifesto:**

- **O bug do vx foi consertado tirando os três números do critério da Seção 4**, e não trocando
  menos 5 por menos 3. O raciocínio inteiro está na própria Seção 4, acima.
- A Seção 2 devolve a montagem da avalanche e por isso ganha critério próprio: o
  `No grupo cactos criar obstáculo` **dentro** do `A cada quadro do jogo`, que é o estado errado de
  propósito. A Seção 4 cobra o inverso, o mesmo bloco **fora** do laço. São dois estados do mesmo
  projeto em momentos diferentes da aula, no mesmo padrão que o v6 já usa na Aula 6 com o relógio em
  0.1 e depois em 1.4.
- O `criar-uma-vez` volta a ter sentido e fica: ela de fato chega a ter o bloco dentro do laço e o
  move, e o critério pega a cópia acidental de quem arrastar sem o Ctrl.
- As cenas `spawn` e `velocity` entram com `required: true`. No v6 a `spawn` era o único critério da
  seção e estava como opcional.
- A `velocity` deixa de ser demonstração embrulhada e volta a ser experimentação, com o elenco do
  cacto e o palpite do v6 mantido.
