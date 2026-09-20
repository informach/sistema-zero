# Desafio do Primeiro Jogo · Dia 4 · O jogo passa a contar

## Resumo

- **Estado de entrada:** o jogo do fim do Dia 3. Nave controlada, grupo `tiros` com disparo pela
  barra de espaço, grupo `asteroides` nascendo a cada 40 quadros num x sorteado, em y menos 30, com
  vy 3, o trio mover, faxina e desenhar dos dois grupos no motor, e a colisão `tiros × asteroides`
  tirando os dois participantes, soltando explosão e tocando o som.
- **Vitória do dia:** um placar que sobe a cada acerto e três corações que apagam quando uma pedra
  encosta na nave.
- **Seções hoje:** 13 · **Seções propostas:** 7 (5 no desenho didático, mais 2 divisórias obrigadas
  pela regra das duas colunas)
- **Clipes hoje:** 10 · **Clipes propostos:** 4, sendo 2 fusões
- **Cenas:** 3, todas construídas (1 que já existia, com mudança de formato, 1 reaproveitada do Dia
  1 com preset próprio, e a `invincibility`, feita para este dia). Uma cena usada no v6 sai da aula.
- **Blocos no manifesto:** 19 · **Manifesto:** `aulas/desafio-dia-4.manifesto.json`. Estado no
  validador: **OK**, sem nenhum aviso de convenção
- **Revisão da entrega, 20/09/2026:** o balão de teste saiu porque o Estúdio ocupa a coluna da
  direita sozinho e não existe "depois da ferramenta" na leitura da seção. O `video-fecho` passa a
  mostrar o teste e o envio, e só recapitula depois deles

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| Variável: guardar, mudar e mostrar são três coisas | Sim. A caixa é invisível, e desenhar o placar parece somar ponto | **Sim** | Experimentação (`variable`, hoje usada como demonstração) | Antes de montar | É o primeiro bloco fora do Jogo 2D e a pergunta 1 do quiz cobra exatamente essa separação |
| A soma mora dentro da colisão, não solta no motor | Sim, mas a cena anterior já separa mudar de mostrar | Não | | Orientação com âncora | Somar no lugar errado é erro de encaixe, e a conferência da etapa pega. A cena `variable` já matou a confusão que importa |
| HUD: o painel desenhado por cima do jogo | Não. É vocabulário | Não | | Dito na hora do bloco | Nomear o que já está na tela não precisa de simulação, e o nome é conteúdo pelo documento de pedagogia |
| Onde a preparação mora: Ao iniciar contra o motor | Sim. É a ideia do Dia 1 voltando com uma consequência nova e feia | **Sim** | Experimentação (`once-vs-always`, do Dia 1, com as fichas deste jogo) | **Depois** de montar, como contrafactual | Se `Dar ao sprite de vida` cair no motor, a nave recebe três vidas em todo quadro e nunca perde nenhuma. É a pergunta 2 do quiz |
| Colisão de um sprite contra um grupo | Não. É o bloco irmão do de ontem | Não | | | O apelido já foi concretizado no Dia 3, com `collision-pair`. Aqui o apelido se chama inimigo e a relação é a mesma |
| Quadros de invencibilidade | Sim. Uma janela de tempo é invisível por definição, e ela só aparece quando três batidas acontecem perto | **Sim** | Experimentação (cena nova `invincibility`) | Antes de montar o bloco que tem o campo 45 | Sem isso, o 45 é um número copiado. E é o único jeito honesto de mostrar três batidas seguidas sem pedir que ela apanhe de propósito três vezes |
| A pedra que bate é retirada antes do dano | Sim, e a explicação gravada está errada | Correção, não cena | | Dentro da cena nova e na orientação | A proteção atende as outras pedras que chegam logo depois, não a mesma pedra encostada |
| Tremer a tela | Não. Ela sente no corpo | Não | | Nomeado como retorno pro jogador | Som, partícula e tremida juntos são o padrão 4.8 do documento de pedagogia |
| Ler a vida do sprite no desenho dos corações | Não. O bloco lê sozinho | Não | | | Ela encaixa e os três corações aparecem na hora |
| Ponto e vida são duas contagens separadas | Sim, mas ela testa no próprio jogo em dez segundos | Não | | Instrução dirigida no teste final | A cena `lives` existe e a terceira meta dela, "Sem vidas, a partida acabou", é falsa neste jogo hoje. Ver a análise da cena mais abaixo |
| Cor do placar e dos corações | Não. É escolha dela | Não | | | Só vale pedir contraste com o fundo escuro |

Onze coisas, três concretizações. Oito conceitos não ganham nada, e duas das três cenas são
reaproveitamento, uma do catálogo e uma do Dia 1. A triagem tira a aula de 13 para 5 blocos de
conteúdo. Com as duas divisórias que a regra das duas colunas obriga, o manifesto fica em 7 seções.

## Diagnóstico do desenho atual

**Quatro seções para uma vitória só.** As seções 2, 3, 4 e 5 (*Observe o número e o placar*, *Crie a
memória dos pontos*, *Faça o acerto valer um ponto*, *Mostre o que está guardado*) somam três
encaixes e um conceito. A vitória, que é o placar subindo quando ela acerta, só acontece no fim das
quatro.

**A cena que mais ensina hoje está no formato errado.** `variable` entra como demonstração, com o
roteiro tocando sozinho em três passos. As metas dela, no catálogo, são pedidos de experimentação:
"Guarde um número na caixa", "Depois de guardar, aperte Somar 1 em pontos com Mostrar placar
desligado", "Depois de guardar, ligue Mostrar placar". A relação tem botão, e o botão está
desligado.

**A comparação da proteção não tem controle nenhum.** A seção 7 (*Compare três batidas bem
próximas*) é um HTML com dois botões fixos, Proteção de 0 quadros e Proteção de 45 quadros, e três
passos. A criança nunca escolhe a janela, nunca vê a proteção contando para trás e nunca vê a
proteção acabar. A janela é o conceito, e é justamente ela que não aparece.

**A cena `lives` promete um fim que este jogo ainda não tem.** A seção 10 (*Observe ponto e vida
mudarem*) termina com "Mais duas batidas: acabaram os corações e a partida". No jogo dela, hoje, as
vidas chegam a zero e a partida continua normalmente. A própria fala revisada da seção admite isso
duas linhas antes: "Quando as vidas chegam a zero, ainda falta ensinar o jogo a terminar".

**A ordem esconde o campo mais importante.** A seção 6 (*Dê três vidas à nave*) vem antes da
comparação da proteção e tem um bloco só. Depois vem a comparação, depois o bloco que tem o campo
45. A preparação das vidas fica isolada, longe do lugar onde as vidas são gastas.

**A regra do Dia 1 volta sem a cena do Dia 1.** A fala da seção 6 explica que `Dar ao sprite de
vida` não pode ir para o motor "ou ele devolveria as vidas o tempo todo". Isso é exatamente a cena
`once-vs-always`, proposta no Dia 1, aplicada a um caso em que o erro é visível e engraçado.

**A contagem falada está errada na gravação.** O trecho original do teste diz "Leva mais uma
batida... dois corações". Depois da segunda perda sobra um. A correção já está registrada nas
decisões do roteiro, e precisa valer também para a fala da cena.

**Uma seção inteira de observação para um teste de dez segundos.** A seção 10 mostra o placar subir
e um coração apagar. Ela faz as duas coisas no próprio jogo, no mesmo tempo.

**Três endereços de paleta na gravação estão vencidos.** O original manda pegar `Mostrar placar` em
"Placar e HUD", e hoje ele está em Jogo 2D › Vida e placar › Indicadores e texto na tela. "Vida"
virou Jogo 2D › Vida e placar › Vida, e `Tremer a tela com intensidade` saiu de "Aparência" para
Jogo 2D › Desenho e efeitos › Efeitos.

## Proposta final

> **Regra das duas colunas.** Duas seções desta proposta acumulavam uma cena nativa e o Estúdio
> embarcado, e os dois vão para a coluna da direita do player. Cada uma virou duas. Na primeira, a
> cena vem antes da montagem e a divisória cai entre as duas. Na segunda, a cena é contrafactual e
> vem depois, então a divisória cai entre a montagem e a cena, preservando a ordem do desenho.

### Seção 1. O que a gente vai fazer hoje

- **Chave:** `abertura` · **Intenção:** apresentação
- **Por que existe:** ela precisa ver o placar subindo e um coração apagando antes de mexer em
  qualquer bloco.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`, "O jogo começa a contar"): o jogo do fim do Dia 4 rodando, com o
     placar no canto de cima e os três corações embaixo dele, um acerto somando ponto e uma batida
     apagando um coração. Fala curta: "Hoje o seu jogo começa a contar. Cada pedra que você explodir
     vale um ponto, a nave ganha três vidas, e você vai descobrir por que ela precisa de um respiro
     depois de levar uma batida." Duração alvo: 25 a 35 segundos.

### Seção 2. A caixa que guarda o seu placar

- **Chave:** `caixa-de-pontos` · **Intenção:** exploração
- **Por que existe:** é o primeiro bloco que ela pega fora do Jogo 2D, e a ideia de guardar um
  número num lugar invisível sustenta o resto do curso.
- **Conclui quando:** as três metas de `variable` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue` (`fala-caixa`): abertura curta, sem vídeo. "Para guardar os seus pontos, o jogo
     precisa de um lugar onde caiba um número. Isso se chama variável: é como uma caixinha com um
     nome escrito na tampa e um número dentro, e esse número pode mudar a qualquer hora. Olha essa
     caixa por dentro antes da gente montar a sua."
  2. `interactive` (`experiencia-variavel`): cena `variable`, "Guardar, mudar e mostrar". Elenco:
     nave e asteroide. Cenário: nave. Passa a ser experimentação.

### Seção 3. O acerto vira número na tela

- **Chave:** `placar` · **Intenção:** construção
- **Por que existe:** criar a caixa, somar dentro da colisão e desenhar o placar são três encaixes
  de um movimento só: fazer o acerto virar número na tela.
- **Conclui quando:** o projeto tem a variável `pontos` criada com 0 em Ao iniciar, o `Somar em
  variável` dentro da colisão `tiros × asteroides` e o `Mostrar placar valor em x y cor tamanho` no
  motor
- **Blocos:**
  1. `dialogue` (`fala-criar-pontos`): a caixa, em Programação, Variáveis, com pontos e 0.
  2. `dialogue` (`fala-somar-ponto`): a soma, dentro da colisão, depois do `Tocar efeito`.
  3. `dialogue` (`fala-placar`): o placar no HUD, com o rótulo Pontos:, a leitura da variável e os
     campos x 12, y 30 e tamanho 24.
  4. `video` (`video-pontos-e-placar`, "A caixa, a soma e o placar"): funde os três clipes de gesto
     de hoje. Manter a fala do laranja contra o rosa das categorias, que ajuda ela a se localizar na
     paleta. Manter a nomeação do HUD, que é curta e é conteúdo. Trocar "todo jogo começa com zero
     ponto" por "este jogo começa com zero ponto". Cortar a contagem de passos. Duração alvo: 80 a
     95 segundos.
  5. `studio`: conferência dos três encaixes, do nome da variável e da leitura no campo do valor.

**Por que junta o que hoje são quatro seções.** O conceito mora inteiro na cena da seção anterior, e
separá-lo em quatro divisórias é o que produziu quatro seções de um bloco.

### Seção 4. O respiro depois da batida

- **Chave:** `respiro` · **Intenção:** exploração
- **Por que existe:** daqui a pouco ela vai escrever 45 num campo. Sem sentir o que essa janela faz,
  é um número copiado.
- **Conclui quando:** as três metas de `invincibility` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue` (`fala-respiro`): abertura curta, sem vídeo. "Quando uma pedra encosta na nave, ela
     tira uma vida. O problema é que as pedras chegam em bando, e uma batida costuma vir logo atrás
     da outra. Por isso existe um respiro: logo depois de levar dano, a nave fica um tempinho
     piscando, e nesse tempinho nenhum dano novo entra. Isso tem nome de criador de jogo: são os
     quadros de invencibilidade."
  2. `interactive` (`experiencia-protecao`): cena nova `invincibility`, "O respiro depois da batida"
     (especificada abaixo). Elenco: nave e asteroide. Cenário: nave.

**Sem vídeo de propósito.** A cena mostra a proteção contando para trás quadro a quadro, com as
vidas do lado. Nenhuma narração mostra isso melhor, e o clipe de hoje não mostra de jeito nenhum.

### Seção 5. A batida machuca

- **Chave:** `batida` · **Intenção:** construção
- **Por que existe:** é a vitória do dia, e o primeiro momento em que o jogo dela pode dar errado
  para quem joga.
- **Conclui quando:** `Dar ao sprite de vida` está em Ao iniciar com nave e 3, o `Para cada sprite
  do grupo que colidir com o sprite` está no motor com os quatro comandos dentro, e o `Desenhar as
  vidas do sprite como em x y tamanho cor` está no fim do motor
- **Blocos:**
  1. `dialogue` (`fala-vida`): as vidas em Ao iniciar, com a nota de que elas não vão para o motor.
  2. `dialogue` (`fala-batida`): o bloco irmão da colisão, com o grupo, o sprite e o apelido
     inimigo.
  3. `dialogue` (`fala-dano`): os quatro comandos de dentro, na ordem, com o 45 da proteção.
  4. `dialogue` (`fala-coracoes`): o desenho das vidas, fora da colisão, no fim do motor.
  5. `video` (`video-batida-e-coracoes`, "A batida custa um coração"): funde os dois clipes de hoje.
     Manter o gesto inteiro e a tremida da gravação. **Corrigir a explicação da invencibilidade**:
     onde a gravação diz que sem ela "uma batida só podia tirar as 3 vidas de uma vez, porque a
     colisão acontece em vários quadros seguidos", trocar por "a pedra que bateu já saiu do grupo na
     linha de cima, então o respiro serve para as outras pedras que estão chegando logo atrás".
     Duração alvo: 140 a 155 segundos.
  6. `studio`: conferência das vidas em Ao iniciar, dos quatro comandos dentro da colisão e do
     desenho das vidas no fim do motor.

**Seis encaixes, uma vitória.** As vidas, a colisão com os quatro comandos e os corações formam um
movimento só: a nave sentir a batida e você ver o que ela custou. Partir isso ao meio produziria uma
seção que termina com vidas guardadas e nada na tela.

### Seção 6. As vidas são dadas uma vez

- **Chave:** `vidas-uma-vez` · **Intenção:** exploração
- **Por que existe:** é o contrafactual da seção anterior. Ela já tem o bloco no lugar certo, e a
  cena mostra o que aconteceria no lugar errado, sem estragar o jogo dela.
- **Conclui quando:** a meta `once` de `once-vs-always` cai e a pergunta final é respondida
- **Blocos:**
  1. `interactive` (`experiencia-uma-vez`): cena `once-vs-always`, do Dia 1, com o preset
     `uma-ficha-vidas`. Cobra só a meta `once`. **Vem depois da montagem.**
  2. `dialogue` (`fala-retorno`): nomeia o padrão e fecha. "Barulho, explosão e tremida no mesmo
     instante: isso é o retorno pro jogador. Nenhum desses três muda a regra do jogo, e os três
     juntos fazem a batida parecer uma batida."

**Por que a divisória cai aqui e não antes.** A cena é contrafactual e precisa vir depois do
Estúdio. Com a divisória entre os dois, a ordem do desenho didático fica intacta: ela monta, e só
então vê o que o lugar errado faria.

### Seção 7. Teste, envie e fecha

- **Chave:** `entrega` · **Intenção:** entrega e fechamento
- **Por que existe:** fecha o ciclo com o jogo rodando e guarda as duas ideias do dia.
- **Conclui quando:** a entrega é enviada e as duas perguntas são respondidas
- **Blocos:**
  1. `video` (`video-fecho`, "Duas contagens, cada uma com o seu motivo"): o teste dirigido com a
     contagem corrigida, as duas batidas de propósito, o gesto de enviar e, depois do envio, a
     conquista do dia com a ponte para o Dia 5. Duração alvo: 55 a 70 segundos.
  2. `quiz`: as duas perguntas atuais, mantidas. As duas passam a ter cena por trás: a primeira é a
     terceira meta de `variable`, e a segunda é a meta `once` de `once-vs-always`.
  3. `studio`: entrega, com os treze critérios de estrutura já definidos no manifesto atual.

**Junta quatro seções de hoje**, e a entrega fica sem nenhum balão do Zappy.

**Por que o balão de teste saiu.** O Estúdio ocupa a coluna da direita sozinho, e tudo o que não é
ferramenta cai na esquerda, de cima para baixo. O `fala-teste` era passo a passo de gesto, e gesto se
mostra na tela. Ele foi para o roteiro do clipe, que também passa a mostrar o envio, pela regra de
que toda seção com ferramenta tem vídeo mostrando como se faz. O `video-fecho` vira teste, envio e
fecho, nessa ordem, e a recapitulação só chega depois do envio ter acontecido na tela.

**A batida de propósito ganha mais cuidado no clipe.** Pedir para apanhar é o contrário do que um
jogo pede, e por escrito isso confundia. Na gravação a narração avisa antes que é de propósito, e o
enquadramento segura o placar e os corações juntos, para dar para ver que um mudou e o outro não.

## Experiências e demonstrações desta aula

### 1. `variable` · Guardar, mudar e mostrar · **EXISTE E JÁ AJUSTADA**

- **Situação:** a cena está pronta e é exatamente o conceito do dia. As três metas (`stored`,
  `changed-hidden`, `shown`) cobrem a separação inteira, e a pergunta extra do catálogo ("E se você
  mostrar primeiro e mudar depois?") é boa. O problema era só o formato.
- **Ajuste 1, formato, aplicado:** o bloco `experiencia-variavel` entra como experimentação, e não
  mais como demonstração. Os pedidos das três metas já estão escritos como ações da criança, e a
  relação tem botão: ela liga e desliga o `Mostrar placar` e aperta `Somar 1 em pontos`.
- **Ajuste 2, elenco:** manter nave e asteroide, e trocar a palavra placar do palco pelo mesmo
  rótulo que ela vai escrever no bloco, Pontos:. A cena e o Estúdio passam a mostrar a mesma coisa.
- **Ajuste 3, pergunta final:** a pergunta que hoje mora no quiz vira a pergunta da cena, porque é
  ali que ela acabou de ver a resposta. "O placar foi desenhado três vezes sem nenhum acerto novo. O
  que o número na tela mostra?" As alternativas: "O mesmo número de antes" (correta) e "Três pontos
  a mais, um por desenho". A do quiz continua onde está, como revisão.
- **Elenco:** nave e asteroide. **Cenário:** nave.
- **Metas cobradas nesta aula:** `stored`, `changed-hidden`, `shown`, as três de fábrica,
  declaradas no bloco.

### 2. `invincibility` · O respiro depois da batida · **JÁ CONSTRUÍDA**

- **Id:** `invincibility`
- **Título:** O respiro depois da batida
- **O conceito abstrato:** depois de levar dano, o sprite ignora danos novos por um número de
  quadros. É uma janela de tempo que conta para trás, não um escudo que dura a partida inteira.
- **Tipo:** experimentação. A relação tem botão, e o botão é o número de quadros: dá para escrever
  "quando eu aumento a proteção, menos batidas contam".
- **O que a criança manipula:** o controle **proteção**, com os valores 0, 15, 45 e 90 quadros. E
  três botões: **Avançar 1 quadro**, **Avançar até a próxima pedra** e **Voltar ao começo**.
- **Como o palco começa:** a nave com três corações cheios, o contador de quadros em 0 e três pedras
  diferentes a caminho, marcadas para encostar nos quadros 1, 10 e 30. A faixa mostra duas
  informações o tempo todo: as vidas que restam e "proteção: 0 quadros restando".
- **Metas:**
  | id | rótulo ao cair | pedido na faixa |
  |---|---|---|
  | `no-shield` | "Sem proteção, as três batidas tiraram as três vidas" | "Deixe a proteção em 0 e avance até passar a terceira pedra." |
  | `window` | "Com 45 quadros, só a primeira batida tirou vida" | "Ponha a proteção em 45, volte ao começo e avance até passar a terceira pedra." |
  | `expires` | "Com 15 quadros, a proteção acabou antes da terceira pedra" | "Ponha a proteção em 15, volte ao começo e avance até passar a terceira pedra." |
- **Pistas:**
  1. "Depois da primeira batida, olhe a faixa da proteção contando para trás."
  2. "Compare quantas vidas sobraram com a proteção em 0 e com a proteção em 45."
  3. "Ponha 15 e olhe em que quadro a proteção chega a zero. A pedra do quadro 30 chega antes ou
     depois disso?"
- **Palpite antes de abrir:** "Imagine: a nave tem três vidas e três pedras diferentes vão encostar nela, uma
  logo atrás da outra, com 45 quadros de proteção ligados. Quantas vidas sobram?"
  - Nenhuma
  - Duas ✓
- **Pergunta depois de descobrir (conta para concluir):** "Por que só a primeira batida tirou vida
  quando a proteção estava em 45?"
  - Porque os danos seguintes foram ignorados enquanto a proteção contava ✓
  - Porque a nave ficou com vidas infinitas até o fim da partida
- **Explicação ao acertar:** "A proteção é uma janela de tempo. Enquanto ela está contando, dano
  novo não entra. Quando ela chega a zero, a próxima batida volta a tirar vida."
- **Frase de sucesso:** "A proteção não é um escudo para sempre: é um respiro com prazo."
- **Honestidade obrigatória no palco:** as três pedras somem nos três testes, porque cada uma é
  retirada do grupo no instante da batida. O que muda entre os testes é só a contagem de vidas. Sem
  isso, a cena ensinaria que a proteção faz a pedra atravessar, que é falso.
- **Onde mais serve:** Corre Dino, na batida contra o cacto. O Jogo do Meu Jeito. E qualquer aula
  que use `Machucar o sprite em e deixá-lo invencível por quadros`, que é o degrau 8 da escada de
  conceitos e o padrão 4.8 do documento de pedagogia, onde os quadros de invencibilidade são o termo
  canônico.
- **Ações do motor:** a cena precisava de um contador regressivo de proteção por sprite (`shield`) e
  de batidas agendadas por quadro (`schedule-hit`). O avanço (`advance`) e o encontro (`collide`) já
  existiam. Tudo construído.
- **Conferido contra o código:** metas, rótulos, pedidos, as três pistas, o palpite, a pergunta do
  fim, a explicação e a frase de sucesso saíram idênticos ao que esta análise pediu. Nada diverge.
- **Elenco:** nave e asteroide. **Cenário:** nave.
- **Metas cobradas nesta aula:** `no-shield`, `window`, `expires`, as três de fábrica, declaradas no
  bloco.

### 3. `once-vs-always` · Uma vez e sempre · **REAPROVEITADA DO DIA 1, PRESET `uma-ficha-vidas`**

- **Situação:** a cena é proposta no Dia 1 como a ideia que organiza o projeto inteiro. Hoje ela
  volta uma única vez, com um caso em que o erro é visível e engraçado, e depois não aparece mais no
  curso.
- **Ajuste aplicado:** a cena nasceu com as fichas de ação configuráveis por aula. O preset do Dia 4
  tem uma ficha só, **Dar três vidas à nave**, mais uma pedra que encosta na nave a cada três
  quadros, já rodando no palco. A criança arrasta a ficha para uma das duas caixas e avança.
  - Em **Ao iniciar**: a nave começa com três corações, apanha, e os corações vão apagando.
  - Em **Enquanto estiver rodando**: os três corações voltam a encher em todo quadro, e a nave nunca
    perde nada, por mais que apanhe.
- **Meta cobrada nesta aula:** só `once`, com o rótulo adaptado ao preset: "Em Ao iniciar, as vidas
  foram dadas uma vez, e a batida conseguiu tirar". As metas `always` e `both` não são cobradas de
  novo, porque já caíram no Dia 1.
- **Pergunta depois de descobrir (conta para concluir):** "Onde vai o bloco que dá três vidas à
  nave?"
  - Em Ao iniciar, para ela receber as vidas uma vez ✓
  - No motor, para ela receber as vidas o tempo todo
- **Posição na seção:** depois da montagem, como contrafactual. Ela já tem o bloco no lugar certo, e
  a cena mostra o que aconteceria no lugar errado, sem estragar o jogo dela. É o mesmo arranjo
  invertido que a cena `layers` tem no Dia 1.
- **Elenco:** nave e asteroide. **Cenário:** nave.

### 4. `lives` · O que a batida muda? · **SAI DESTA AULA**

- **Situação:** a cena é boa e foi escrita para o Corre Dino, onde a partida realmente acaba quando
  os corações somem. As metas são `life-lost`, `points-stay` e `over`.
- **Problema:** a meta `over` diz "Sem vidas, a partida acabou", e no jogo do Dia 4 as vidas chegam
  a zero e a partida continua, porque a tela de fim só existe no Dia 5. A cena afirmaria sobre o
  jogo dela uma coisa que ela pode conferir e descobrir que é mentira.
- **Decisão:** retirar do Dia 4. As duas metas que sobrariam (`life-lost` e `points-stay`) tratam de
  uma relação que ela testa no próprio jogo em dez segundos, e o teste dirigido da entrega já manda
  ela olhar o placar depois de apanhar, que é a parte difícil de notar.
- **Onde ela continua servindo:** no Corre Dino, onde nasceu, com as três metas verdadeiras. No
  Desafio, a meta `over` só passa a ser verdadeira a partir do Dia 5. A análise do Dia 5 avalia e
  recusa trazê-la para lá, porque aquela aula já está carregada e a relação fica visível no jogo
  dela.

## Vídeos

| Chave | Título do vídeo | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-abertura` | O jogo começa a contar | o jogo do fim do dia, com placar e corações | `video-abertura-v6` | 25 a 35 s | fala parcial, tela regravada |
| `video-pontos-e-placar` | A caixa, a soma e o placar | a caixa, a soma na colisão e o placar no HUD | `video-pontos` + `video-somar` + `video-placar` | 80 a 95 s | funde três clipes, com uma substituição |
| `video-batida-e-coracoes` | A batida custa um coração | as vidas, a colisão da batida e os corações | `video-vida` + `video-batida` + `video-coracoes` | 140 a 155 s | funde três clipes, com correção obrigatória |
| `video-fecho` | Duas contagens, cada uma com o seu motivo | o teste dirigido, as duas batidas de propósito, o envio, e a conquista do dia com a ponte para o Dia 5 | `video-fecho-v6` | 55 a 70 s | fala parcial, com teste e envio gravados novos |

**Saem da aula:** `video-memoria`, porque a analogia da caixinha cabe em três linhas de fala e a
cena `variable` mostra o resto melhor. `video-vida` e `video-coracoes` deixam de ser clipes próprios
e viram as pontas do `video-batida-e-coracoes`. `video-teste-vidas`, porque o teste passa a ser a
primeira metade do `video-fecho`, e porque a contagem falada dele está errada.

**Saldo:** de 10 clipes para 4 blocos de vídeo. É a maior queda das cinco aulas, e ela vem de dois
lugares: as três seções de um encaixe viraram uma, e as duas explicações conceituais (a caixa e a
janela de proteção) saíram da narração e foram para as cenas.

## Continuidade

- **Assume do Dia 3:** os dois grupos, o relógio de 40 quadros com o nascimento sorteado, o trio
  mover, faxina e desenhar dos dois grupos, e a colisão `tiros × asteroides` com os quatro comandos
  dentro. Assume também que o apelido de colisão já foi concretizado, com a cena `collision-pair`.
- **Entrega para o Dia 5:** variável `pontos` criada com 0 em Ao iniciar. `Dar ao sprite de vida` na
  nave com 3, em Ao iniciar. `Somar em variável` com pontos e 1, dentro da colisão `tiros ×
  asteroides`, depois do som. No motor, depois da colisão dos tiros: `Mostrar placar valor em x y
  cor tamanho` com o rótulo Pontos: lendo a variável pontos, em x 12, y 30, tamanho 24. Depois dele,
  `Para cada sprite do grupo que colidir com o sprite`, com o grupo asteroides, o sprite nave e o
  apelido inimigo, contendo tirar inimigo do grupo, soltar explosão em inimigo, machucar a nave em 1
  com 45 quadros de proteção e tremer a tela com 8. E, como último bloco do motor, `Desenhar as
  vidas do sprite como em x y tamanho cor`, na nave, em corações, x 12, y 48, tamanho 22.
- **Valores canônicos que saem daqui:** pontos começa em 0 · soma de 1 por acerto · placar em x 12,
  y 30, tamanho 24 · 3 vidas · dano de 1 · proteção de 45 quadros · tremida de intensidade 8 ·
  corações em x 12, y 48, tamanho 22 · apelido `inimigo`.
- **Campos livres:** cor do placar, cor dos corações e cor da explosão da batida.
- **O que o Dia 5 depende disto:** o último bloco do `A cada quadro do jogo` passa a ser o `Desenhar
  as vidas do sprite`. A primeira construção do Dia 5 pega a cadeia inteira, do `Limpar a tela` até
  esse bloco, e leva para dentro de uma pergunta. Se a ordem mudar aqui, a instrução de lá quebra.

## Manifesto

Arquivo: `aulas/desafio-dia-4.manifesto.json`. Versão 4, `lessonSlug` `dia-4`, título
"O jogo passa a contar". **19 blocos em 7 seções**, com 4 vídeos planejados, 3 cenas, 1 quiz e o
Estúdio da aula.

**O Estúdio** aparece uma vez em `blockKeys`, na seção `entrega`, e é referenciado por
`workspaceKey` nas seções `placar`, `batida` e `entrega`.

**Seções divididas pela regra das duas colunas.**

| Seção do desenho | Virou | Motivo |
|---|---|---|
| A caixa que guarda o seu placar | `caixa-de-pontos` (cena `variable`) + `placar` (Estúdio) | cena e Estúdio na mesma seção; a cena vem antes |
| A batida machuca | `batida` (Estúdio) + `vidas-uma-vez` (cena `once-vs-always`) | cena e Estúdio na mesma seção; a cena é contrafactual e fica depois |

**Estado no validador:** `OK`, sem nenhum aviso de convenção. As três cenas existem no catálogo e a
fila de dependência desta aula está vazia.

**Cenas e metas, como o manifesto as declara hoje:**

1. **`invincibility`, construída.** O bloco `experiencia-protecao` cobra `no-shield`, `window` e
   `expires`, as três de fábrica, e o palpite de abertura revela em `window`.
2. **`variable`, já experimentação.** O bloco `experiencia-variavel` entra como
   `type: "experimentation"`, cobrando `stored`, `changed-hidden` e `shown`, e o core aceita a cena
   nesse formato.
3. **`once-vs-always`, com preset.** O bloco `experiencia-uma-vez` usa o preset `uma-ficha-vidas`,
   com a ficha única "Dar três vidas à nave" e a pedra batendo a cada 3 quadros, cobra só a meta
   `once` e reescreve o rótulo e o pedido dela por `goalCopy`, como o preset pede. Sem palpite de
   abertura, porque ele já foi feito no Dia 1. A cena traz ainda uma frase de sucesso própria para
   esta missão de uma meta só: "Em Ao iniciar, a ação acontece uma vez e a batida consegue tirar
   vidas."

**Critérios de estrutura.** Todos os `projectChecks` e `blockType` do Estúdio foram copiados do
manifesto v6 desta mesma aula, sem nenhum tipo de bloco inventado. A entrega repete os treze
critérios do v6.

**Campos livres.** Cor do placar, cor dos corações e cor da explosão da batida não têm critério de
valor, nem exato nem em faixa.
