# Corre, Dino! · Aula 7 · O jogo aprende a esperar

> Análise de redesenho didático. Formato herdado de `desafio-dia-1.md`.

## Resumo

- **Estado de entrada:** o jogo roda sem começo. O dino corre, pula e faz som, os cactos nascem a
  cada 1,4 segundo, andam e saem do grupo pela faxina. O medidor da Aula 6 e o `Mostrar placar`
  emprestado já saíram. Nada no jogo sabe que existe um antes e um depois: quem recarrega a página
  cai no meio da correria.
- **Vitória do dia:** o jogo passa a saber onde está. No fim, ela aperta espaço cinco vezes, espera
  dez segundos, e nada acontece. É a primeira vez no curso em que dar certo é uma coisa parar de
  acontecer na hora errada, e a aula diz isso com todas as letras.
- **Seções hoje:** 9 · **Seções propostas:** 6
- **Clipes hoje:** 6 · **Clipes propostos:** 5, sendo 1 bem mais longo, 2 bem mais curtos e 1 novo
  na entrega. A contagem não muda com o redesenho da entrega: nenhum clipe entrou nem saiu, o
  `video-teste-e-envio` é que cresceu.
- **Fecho da entrega:** o teste, a explicação do som e a recapitulação saíram do balão e foram para
  o roteiro do `video-teste-e-envio`, e só o gancho da Aula 8 continuou balão. Balão depois da
  ferramenta não existe para quem faz a aula, porque o Estúdio fica sozinho na coluna da direita e
  todo o resto na esquerda.
- **Cenas:** 1 (`game-state`), construída no catálogo, com os ajustes de posição e de vocabulário
  aplicados

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| Estados do jogo: o jogo fica num estado de cada vez | Sim. Nenhum pixel na tela representa "onde o jogo está" | **Sim**, junto com o próximo | Experimentação (`game-state`) | Depois de guardar o primeiro estado, antes de montar o Se | A palavra sozinha não ensina nada. O que ensina é ver a mesma ação rodar num momento e esperar no outro |
| Guardar o estado não manda em nada sozinho | Sim, e é contraintuitivo: ela acabou de encaixar um bloco e a tela não muda | **Sim**, no próprio jogo dela | Dor, sem cena | Na hora do encaixe, Seção 2 | O bloco literalmente não faz nada visível. A ausência de efeito é a lição, e reproduz em 100% dos casos |
| A condição protege o que está dentro dela | Sim. É a ideia que a manobra mais difícil do curso executa | **Sim** | Experimentação (`game-state`, metas `outside` e `waiting`) | Antes de montar | Sem sentir isso antes, ela arrasta seis blocos por fé e não sabe o que está comprando |
| O relógio é raiz irmã do quadro: uma condição só alcança o que está dentro dela | Sim | **Sim**, pela mesma cena | Experimentação (`game-state`, o caso da cena é justamente o relógio) | Cena antes, montagem depois | Uma cena, três pagamentos. Propor cena nova aqui seria repetir o mesmo palco |
| Anatomia do Se: a pergunta, o então, o formato pontudo | Não. É vocabulário e operação de interface | Não | | Dentro do vídeo da manobra, com o bloco na mão | Nomear o encaixe de uma peça que já está na tela dela não precisa de simulação. Hoje isso ocupa uma seção inteira |
| A comparação de fábrica sai e a pergunta entra no lugar | Não. Operação | Não | | Etapa 2 da manobra | É gesto. O que vale é que ela seja narrada sem pular nada, não que vire seção |
| Embrulhar no Se: as 4 etapas | Não. É manobra de interface | Não | | Seção 4, demonstrada por inteiro uma vez | Eixo do Estúdio: a narração conduz do primeiro ao último gesto. Descoberta aqui seria abandono |
| Arrastar leva os de baixo junto, e copiar duplica | Não | Não | | Dentro do vídeo da manobra | Operação, e o erro tem sintoma descrito na fala: dois jogos rodando ao mesmo tempo |
| Limpar a tela e a floresta ficam fora do Se | Não. A razão é visível | Não | | Seção 4, antes do arrasto | O fundo tem que aparecer em todos os estados, e isso se vê na hora |
| O acúmulo invisível de cactos no estado `inicio` | Sim | **Não reproduz no jogo dela** | Honestidade declarada, mais o contador da cena | Seção 5 | Com o miolo do quadro já embrulhado, o cacto nasce mas não é desenhado nem movido. Encenar sintoma seria mentira |
| O som se protege sozinho | Sim. É uma corrente de três elos | Não precisa de cena | | Seção 6, dentro do teste | Ela aperta espaço e não ouve nada. O teste É a concretização, e a explicação vem em cima do que ela acabou de fazer |
| Recarregar a página para voltar ao começo | Não. Operação | Não | | Seção 6 | Esta é a primeira aula do curso que precisa da ação. Vira instrução dentro do teste |

Doze coisas, uma cena só. A cena paga três vezes, e é isso que permite tirar a aula de 9 para 6
seções sem perder conceito nenhum.

**Cena considerada e recusada:** `once-vs-always`. O par "uma vez contra sempre" aparece hoje de
verdade, porque `Mudar o estado do jogo para inicio` vai no `⚙️ Ao iniciar` e a pergunta é feita no
motor. Só que essa é a ideia da Aula 1 e ela já está firme, e a aula de hoje já tem uma cena que
cobre o que importa agora. Reaproveitar aqui seria repetir um conceito assentado no dia mais pesado
do curso.

## Diagnóstico do desenho atual

**A aula fala uma língua que o Estúdio não fala mais.** A narração inteira usa `Ir para a tela`,
`a tela atual é` e a subcategoria "Telas e cenas". Na edição `jogo-2d-1.0-documento-2`, que é a que
a própria pasta declara, os rótulos são `Mudar o estado do jogo para` e `o estado do jogo é __ ?`,
os dois em **Jogo 2D › Jogo e telas › Telas e partida**. Isso não é só manutenção: é ganho didático
grande, porque o bloco passou a dizer a mesma palavra que a aula ensina. Hoje a aula nomeia
"estados do jogo" no fim de uma fala que passou dez minutos dizendo "tela".

**O conceito do dia está partido em três, e a cena que o concretiza vem por último.** A seção 2
(*Diga em qual tela o jogo começa*) guarda o estado, a seção 3 (*Veja o Se e sua pergunta*) mostra o
bloco, a seção 4 (*Coloque as ações dentro do Se*) faz a manobra, e só na seção 5 (*Quem ainda está
trabalhando no início?*) a criança finalmente sente o que uma condição faz. Ela atravessa a
montagem mais difícil do curso antes de a ideia virar concreta.

**A seção 3 é uma demonstração sem demonstração, e ainda é redundante.** Ela declara intenção de
demonstração e entrega um clipe. Pior: as etapas 1, 2 e 3 da manobra que esse clipe mostra são
narradas de novo, inteiras, no clipe da seção 4. São dois clipes ensinando o mesmo gesto.

**As seções 4 e 6 são o mesmo clipe descrito duas vezes.** *Coloque as ações dentro do Se* e *Faça o
relógio esperar também* carregam o mesmo "Trecho original selecionado" na íntegra, palavra por
palavra, e a mesma nota "Na tela". O roteiro pede que a segunda "selecione apenas o trecho final",
mas o material entregue não fez esse corte.

**A seção 5 anuncia um problema que o jogo dela não mostra.** Ela é apresentada como a revelação de
que outra rotina ainda trabalha no início. Só que, com o miolo do quadro já embrulhado, o cacto
criado pelo relógio não é desenhado, não é movido e não é removido. Ele fica parado em x 560, fora
da tela, invisível. Nada aparece. A cena é ótima, mas a moldura narrativa dela promete um sintoma
que não existe.

**A conferência final não detecta a falha que ela mesma avisa.** O teste manda apertar espaço cinco
vezes e esperar dez segundos, e diz: "se apareceu cacto, volta no relógio de 1,4 segundos". Um cacto
só apareceria se `Desenhar o grupo` ou `Mover os sprites do grupo` tivessem ficado de fora do Se. O
relógio desprotegido é mudo. O instrumento certo para essa metade existe e é o Conferir, e a aula
não diz isso.

**A entrada promete o estado `fim` duas aulas antes de ele ser usado.** "Vamos separar inicio,
jogando e fim" abre a aula com uma peça que só entra na Aula 9. O curso tem regra própria contra
isso, porque promessa cria referência solta.

**Três seções são molde.** *Teste e entregue sua construção*, *Veja o que você aprendeu* e *Confira
as ideias de hoje* somam uma entrega, uma recapitulação e um quiz, que são um bloco de fechamento
só.

## Proposta final

### Seção 1. Hoje o seu jogo aprende a esperar

- **Intenção:** apresentação
- **Por que existe:** a criança precisa ver, em quinze segundos, que o jogo dela não tem começo.
  Sem isso, embrulhar seis blocos é trabalho sem motivo.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`): recarrega a página e o jogo já está acontecendo. O dino correndo, um
     cacto chegando, sem nenhum aviso. Fala curta: "Recarrega a página e olha o que acontece. O jogo
     já começou. Ninguém falou nada, ninguém apertou nada, e você já está no meio da correria. Todo
     jogo que você joga tem um antes disso. Hoje o seu vai ter também: o jogo vai aprender a
     esperar." Duração alvo: 25 a 35 segundos.

**A dor entra na abertura, e como cena, não como passo.** É a regra do curso, e aqui ela cai
perfeita: a ausência de começo é visível em dois segundos e motiva a aula inteira.

### Seção 2. O jogo passa a saber onde está

- **Intenção:** construção e dor
- **Por que existe:** ela encaixa um bloco e a tela não muda em nada. Esse nada é o conteúdo da
  seção, e ele precisa fechar sozinho antes de a ferramenta aparecer.
- **Conclui quando:** `Mudar o estado do jogo para` está no fim do `⚙️ Ao iniciar`, com `inicio`
  escolhido
- **Blocos:**
  1. `dialogue`: "Em Jogo 2D, Jogo e telas, Telas e partida, pega o bloco Mudar o estado do jogo
     para. Clica, segura, arrasta pra dentro do Ao iniciar e encaixa como o último bloco de lá, logo
     abaixo do Criar grupo de sprites. Ele tem um campo só, e é uma listinha com vários estados
     prontos. O que a gente quer hoje é o inicio."
  2. `video` (`video-estado-inicio`): o gesto, a listinha aberta, e depois a área do jogo sem
     mudança nenhuma. A fala precisa segurar o silêncio: "Olha a área do jogo. O dino
     continua correndo. Os cactos continuam chegando. Não mudou nada, e está certo. O jogo guardou
     uma palavra, e essa palavra é o estado do jogo. Agora ele sabe onde está. Só que ninguém
     perguntou nada pra ele ainda, então ninguém mudou de comportamento." Duração alvo: 35 a 45
     segundos.
  3. `studio`: conferência de um critério só, o bloco no fim do Ao iniciar com `inicio`.
  4. `dialogue`: o nome do padrão, curto. "Esse é o primeiro dos estados do jogo. Hoje o seu jogo
     vai ter dois, o inicio e o jogando, e ele fica num estado de cada vez, sempre. Nunca nos dois
     ao mesmo tempo."

**Nomeia dois estados, não três.** A entrada de hoje promete `inicio`, `jogando` e `fim`, e o `fim`
só é usado na Aula 9. Ele entra lá, como peça nova.

### Seção 3. Uma pergunta que decide o que roda

- **Intenção:** conceito
- **Por que existe:** é o que a manobra da próxima seção faz. Ela precisa sentir que uma condição
  segura o que está dentro dela antes de arrastar seis blocos para dentro de uma.
- **Conclui quando:** as três metas de `game-state` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue`: abertura curta do Zappy, sem vídeo. "Existe um bloco que faz uma pergunta e guarda
     coisas dentro dele. Se a resposta for sim, o que está guardado acontece. Se for não, ele não faz
     nada e o jogo segue em frente. Antes de você montar um, vamos ver um funcionando."
  2. `interactive`: cena `game-state`, "O relógio na tela de início". Elenco: personagem Dino,
     obstáculo cacto. Cenário: `corre-dino`. As três metas: fora da condição o cacto nasce antes de
     a partida começar, dentro dela o início fica em zero, e na partida volta a nascer.

**Não tem vídeo de propósito.** O contador de cactos criados da cena mostra a relação melhor do que
qualquer narração, porque é um número subindo e parando. A fala de hoje que explicaria isso vira a
abertura em texto, de três frases.

### Seção 4. Embrulhe o jogo no Se

- **Intenção:** construção
- **Por que existe:** é a manobra mais difícil do curso, e ela é um movimento só. Partir ao meio
  obriga a criança a atravessar uma divisória com seis blocos na mão.
- **Conclui quando:** `Se o estado do jogo é jogando` está dentro do `A cada quadro do jogo`, com os
  seis comandos dentro do então e na ordem da montagem, e com `Limpar a tela` e
  `Desenhar fundo de floresta` fora dele
- **A força do pulo permanece a escolha da Aula 3:** a conferência do encaixe identifica o bloco
  `Controlar o dinossauro` pelo sprite `dino` e pela posição, sem exigir 14 no campo do pulo.
- **Blocos:**
  1. `dialogue`: "Deixa o Limpar a tela e o Desenhar fundo de floresta onde eles estão, lá no topo
     do A cada quadro do jogo. O fundo tem que aparecer em todos os estados. Do Aplicar a gravidade
     do mundo ao sprite pra baixo, são seis blocos, e os seis vão pra dentro do Se: a gravidade, o
     Controlar o dinossauro, o Desenhar o sprite, o Mover os sprites do grupo, o Desenhar o grupo e a
     faxina."
  2. `video` (`video-embrulhar`): a manobra inteira, com pausa visual em cada etapa. Etapa 1, pegar
     o `Condição se, senão se e senão` em Programação, Lógica e Se, e encaixar dentro do
     `A cada quadro do jogo`, logo abaixo do `Desenhar fundo de floresta`. Etapa 2, tirar a
     comparação de fábrica de dentro dele e jogar fora. Etapa 3, encaixar no lugar dela o
     `o estado do jogo é __ ?`, de Jogo 2D, Jogo e telas, Telas e partida, e escolher `jogando`.
     Etapa 4, arrastar os seis blocos para dentro. Manter as três coisas que a fala gravada acerta:
     o formato pontudo da pergunta, "arrastar e nunca copiar" com o sintoma dito por extenso (dois
     jogos rodando ao mesmo tempo), e "nada de Ctrl aqui, porque hoje levar os de baixo junto é
     exatamente o que a gente quer". No fim, a cartela com o nome da manobra e as quatro etapas.
     Duração alvo: 100 a 120 segundos.
  3. `studio`: conferência dos seis dentro do então, na ordem, e dos dois de fora.
  4. `dialogue`: o batismo, e a leitura da tela. "Isso que você acabou de fazer tem nome, e o nome é
     embrulhar no Se: pegar um monte de bloco que já existia e embrulhar tudo dentro de um Se. São
     sempre as mesmas quatro etapas. Agora olha a área do jogo. Sobrou a floresta passando, e mais
     nada. O dino sumiu. Nada quebrou: está tudo guardado, esperando o estado virar jogando."

**Junta o que hoje são duas seções.** Ver o Se e usar o Se são o mesmo movimento, e o curso só
demonstra as quatro etapas por inteiro uma vez. Esta é a vez.

### Seção 5. O relógio não foi junto

- **Intenção:** construção
- **Por que existe:** o relógio é raiz irmã do quadro, não ficou dentro de nada, e essa é a segunda
  e última vez que a manobra completa aparece no curso.
- **Conclui quando:** dentro do `A cada 1,4 segundos` existe um `Se o estado do jogo é jogando` com
  o `No grupo criar obstáculo` dentro do então
- **Blocos:**
  1. `dialogue`: "Falta um lugar, e ele é fácil de esquecer. É o A cada 1,4 segundos, que mora ao
     lado do A cada quadro do jogo, não dentro dele. Como ele está do lado, o Se que você acabou de
     montar não alcança ele. Embrulha no Se o que tem dentro dele, do jeito que você fez agora há
     pouco: pega um Se novo, tira a comparação de fábrica, põe no lugar a pergunta o estado do jogo
     é com jogando, e envolve com ele o No grupo criar obstáculo. Aqui também é arrastar, nunca
     copiar."
  2. `video` (`video-relogio`): só a segunda manobra, sem repetir o tutorial. As quatro etapas
     aparecem na cartela, em silêncio, enquanto o gesto acontece. Duração alvo: 55 a 65 segundos.
  3. `dialogue`: a honestidade sobre o que ela não vai ver. "Essa parte você não vai conseguir
     conferir com o olho, e eu prefiro te contar do que te deixar procurando. Sem esse Se, o cacto
     continua nascendo no início. Só que o desenhar e o mover estão lá dentro do outro Se, então
     esse cacto não é desenhado e não anda. Ele fica parado do lado de fora da tela, e a tela não
     mostra nada de diferente. Na experiência de agora há pouco você viu o contador de cactos
     criados subindo enquanto a tela ficava parada: é exatamente isso. Por isso este passo tem um
     critério só dele no Conferir, e é o Conferir que enxerga por você."
  4. `studio`: conferência do segundo Se, com o critério próprio.

**Sem cena nova.** A prova desta seção já foi paga na Seção 3, e o caso concreto da cena é justamente
este relógio.

### Seção 6. Teste, envie e fecha

- **Intenção:** entrega e fechamento
- **Por que existe:** o teste é a vitória do dia, e é aqui que o som explica sozinho por que não
  precisou de Se.
- **Conclui quando:** a entrega é enviada e as três perguntas são respondidas
- **Blocos:**
  1. `video` (`video-teste-e-envio`): a página recarregando, o clique na área do jogo, as cinco
     apertadas na barra de espaço sem som nenhum, os dez segundos de tela parada sem cacto entrando,
     os objetivos conferidos e o gesto de enviar na tela. O clipe **passou a levar também a
     explicação do som**, que era balão e só faz sentido depois do teste, com os blocos à vista:
     ninguém mexeu no som hoje, quem toca o som é o `Quando o sprite dino pular`, e para ele
     disparar o dino tem que pular de verdade, e quem faz o dino pular é o `Controlar o dinossauro`,
     que acabou de entrar para dentro do `Se`. Fora do estado jogando ele nem roda, então o som se
     protege sozinho, porque ele escuta o dino. E o clipe **passou a fechar com a recapitulação do
     dia**, que também era balão: hoje o jogo não ganhou nada novo na tela e mesmo assim mudou
     bastante, porque às vezes o sinal de que você acertou é uma coisa parando de acontecer na hora
     errada. **Entrou pela regra de que toda seção com o Estúdio embarcado tem um vídeo mostrando
     como se faz.** Duração alvo: 65 a 80 segundos.
  2. `dialogue`: gancho da Aula 8, o único balão que fica aqui porque é curto e não depende de ter
     acabado de jogar: "Na próxima aula o estado inicio ganha o nome do seu jogo escrito grande."
  3. `quiz`: as três perguntas atuais, com os rótulos corrigidos.
  4. `studio`: entrega, com os critérios já definidos no manifesto atual, traduzidos para os rótulos
     da edição atual. É o último item de `blockKeys`.

**Junta três seções de hoje.** A entrega, a recapitulação e o quiz são um fechamento só.

**Por que os três balões saíram.** Balão depois da ferramenta não existe para quem faz a aula: o
Estúdio fica sozinho na coluna da direita e todo o resto na esquerda, então "depois do Estúdio" não
é um lugar. E a explicação do som era o caso mais claro disso, porque ela começa com "repara no
som", uma frase que só existe para quem acabou de fazer o teste. Nada foi apagado. O teste, a
explicação do som e a recapitulação foram para o roteiro do `video-teste-e-envio`, e só o gancho da
Aula 8 continuou balão.

## Experiências e demonstrações desta aula

### 1. `game-state` · O relógio na tela de início · **CONSTRUÍDA, AJUSTES APLICADOS**

- **Situação:** a cena é a certa para o conceito e tem três metas boas (`outside`, `waiting`,
  `playing`), que continuam com os mesmos ids e os mesmos rótulos. O problema não era a cena, era
  onde ela estava e o vocabulário dela.
- **Ajuste 1, de posição: feito.** Ela saiu da seção 5 e foi para a seção 3, antes da manobra. A
  cena deixou de ser a revelação de um problema e passou a ser a metade concreta da explicação do
  Se.
- **Ajuste 2, de vocabulário: feito.** Os pedidos das metas dizem `Se jogando` com o sentido do
  bloco `o estado do jogo é __ ?`, e o "tela de início" virou "início" onde nenhuma tela é
  desenhada ainda.
- **Ajuste 3, o contador vira protagonista:** o número de cactos criados fica visível e rotulado o
  tempo todo, ao lado do palco, porque é ele que torna visível justamente aquilo que o jogo dela não
  mostra. Sem esse número à vista, a meta `waiting` vira uma tela parada olhando outra tela parada.
- **Elenco/cenário:** personagem Dino, obstáculo cacto, cenário `corre-dino`.
- **Metas cobradas nesta aula:** `outside`, `waiting`, `playing`, que são as três da missão de
  fábrica, mais a pergunta final de fábrica ("O que faz Criar cacto esperar na tela de início?"),
  com o enunciado dela ajustado para "no início". O bloco **não declara `setup.goals`** de
  propósito: a cena não tem meta só de caso, e sem lista ela cobra exatamente estas três.
- **Onde mais serve:** em qualquer curso da trilha no momento em que o jogo ganha um menu e uma
  partida, porque o palco é sempre o mesmo: uma ação, um relógio e dois momentos. Trocando o elenco,
  ela serve sem tocar no motor.

## Vídeos

| Chave | Título do clipe | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-abertura` | O jogo já começou sem você | o jogo começando do nada ao recarregar | `video-abertura-editorial` | 25 a 35 s | fala parcial, tela regravada |
| `video-estado-inicio` | O bloco que não muda nada | pegar o bloco, escolher `inicio`, e a tela não mudar | `video-estado-inicial` | 35 a 45 s | fala sim, com troca de rótulo, tela regravada |
| `video-embrulhar` | A manobra de embrulhar no Se | as 4 etapas e os 6 blocos, em um movimento | `video-pergunta` + `video-embrulhar` | 100 a 120 s | funde dois clipes, tela regravada |
| `video-relogio` | O relógio ficou de fora | a segunda manobra, chamada pelo nome | `video-relogio-protegido` | 55 a 65 s | recorta só o trecho final da Parte 3 |
| `video-teste-e-envio` | O teste do silêncio e o envio | o recarregar, as cinco apertadas mudas, os dez segundos sem cacto, o gesto de enviar, a explicação do som e a recapitulação do dia | novo | 65 a 80 s | não, gravação nova |

**Saldo:** de 6 clipes para 5. A queda em minutagem é maior do que a contagem sugere, porque o clipe
da manobra ficou maior de propósito: ele absorveu a anatomia do Se, que hoje ocupa um clipe inteiro
e depois é repetida. O `video-fecho-editorial` some, e a recapitulação passa a ser o fim do clipe da
entrega, depois do teste e do envio. A entrega ganha o clipe novo pela regra de que toda seção com o
Estúdio embarcado tem um vídeo mostrando como se faz.

**Os cinco pedem gravação de tela nova.** A edição `jogo-2d-1.0-documento-2` mudou os rótulos
dos dois blocos centrais do dia, e não existe corte que conserte isso.

## Continuidade

- **Assume da Aula 6:** o medidor (`quantos sprites tem no grupo cactos`) e o `Mostrar placar`
  emprestado **já saíram**, conforme a decisão registrada na v6. O `A cada quadro do jogo` tem
  `Limpar a tela`, `Desenhar fundo de floresta` e mais seis comandos. O `A cada 1,4 segundos` está
  ao lado, com o `No grupo criar obstáculo`.
  - **Divergência a resolver antes de gravar:** a referência do curso ainda diz que a retirada do
    medidor é o primeiro passo da Aula 7, e a v6 diz que ela acontece no fecho da Aula 6. A v6 é a
    decisão mais recente e é a que esta análise segue. A fala de segurança ("se o seu tiver sete
    blocos, o medidor ainda está aí") fica na nota de montagem do `video-embrulhar`, não na
    narração.
- **Entrega para a Aula 8:** `Mudar o estado do jogo para inicio` como último bloco do `Ao iniciar`.
  No `A cada quadro do jogo`: `Limpar a tela`, `Desenhar fundo de floresta`, e um
  `Se o estado do jogo é jogando` com os seis comandos dentro. No `A cada 1,4 segundos`: um segundo
  `Se o estado do jogo é jogando` com o `No grupo criar obstáculo` dentro. A área do jogo mostra só
  a floresta passando.
- **Valores canônicos que saem daqui:** estados `inicio` e `jogando` · seis comandos dentro do então,
  nesta ordem: gravidade, controlar, desenhar o sprite, mover o grupo, desenhar o grupo, faxina ·
  `Limpar a tela` e `Desenhar fundo de floresta` fora do Se · relógio em 1,4 s.
- **Campos livres:** nenhum novo hoje. A força do pulo escolhida na Aula 3 continua livre entre 12
  e 18. As conferências desta aula não podem trocá-la silenciosamente pelo valor 14 do exemplo.
- **Dívida deixada para a Aula 8:** se o relógio ficar sem o Se, o sintoma não aparece hoje, mas
  aparece lá. Com o menu na tela, quem esperar vinte segundos antes de começar vai ver a primeira
  partida abrir com uma parede de cactos parados. Vale como linha de diagnóstico para o professor na
  Aula 8, e não como promessa na narração de hoje.
