# O Jogo do Meu Jeito · Aula 3 · O motor da sua nave acende

## Resumo

- **Estado de entrada:** a nave dela na galeria do Pinta, pixel art, Personagem, 32 × 32, com cor e
  volume, uma animação chamada `parado` com um quadro só, e cerca de quatro fileiras de quadradinhos
  vazias embaixo.
- **Vitória do dia:** o motor da nave dela aceso, pulsando sozinho na prévia.
- **Seções hoje:** 10 · **Seções propostas:** 7
- **Clipes hoje:** 7 · **Clipes propostos:** 7 (dois deles bem mais curtos), e sai o experimento em HTML
- **Cenas:** 2 (as duas já existem, as duas com ajuste). Mais um experimento em HTML que sai.
- **Testes de múltipla escolha hoje:** 3 no meio da aula, mais 1 dentro do experimento em HTML, mais
  2 no quiz final · **Propostos:** 0 no meio da aula, 2 no quiz final (um deles trocado). O teste do
  HTML vira meta de cena.
- **Textos corridos:** 0. Os 4 que existiam saíram em 20/09/2026 (ver a nota de decisão abaixo)
- **Manifesto:** `aulas/meu-jeito-aula-03.manifesto.json`, 19 blocos e 7 seções

> **Nota de decisão de produto, 20/09/2026.** Nos cursos infantis não existe texto corrido. Os 4
> blocos de texto desta aula saíram do manifesto, e as quatro seções que os tinham já tinham clipe.
> O conteúdo de cada um virou instrução de produção do clipe da própria seção, para ser executado
> e conferido na tela em vez de lido: `orientacao-fogo-base` foi para o `video-fogo-base`,
> `orientacao-segundo-quadro` foi para o `video-segundo-quadro`, `orientacao-nome-voando` foi para
> o `video-nome-voando` e `orientacao-entrega-v6` foi para o `video-fecho`. Só um deles deixou
> balão do Zappy, o `fala-mesma-nave`, que responde a dúvida que a seção de entrega abre: hoje a
> entrega é o mesmo cartão da nave, de novo, agora com a animação dentro. Os outros três não
> geraram balão, porque cada uma dessas seções já tem duas falas com o passo a passo e o clipe
> cobre o resto. Nenhum desses textos era critério de conclusão, então nenhuma regra de conclusão
> mudou. A chave `orientacao-entrega-v6` passou para `retireBlockKeys`, porque ela existia no
> rascunho v6.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| Quadro de animação: cada quadro é um desenho parado | **Sim.** O olho lê movimento e conclui que existe uma coisa se mexendo. Que cada quadro continua parado é o contrário do que ela sente | **Sim** | Experimentação (`frames`) | Antes de desenhar o fogo | É o conceito raiz da aula. Parar a prévia rápida e ver um quadro só é a prova, e ela precisa fazer isso com a mão |
| A troca rápida é o que faz o movimento | Sim, e é a mesma ideia | **Sim**, dentro da mesma cena | Experimentação (`frames`, metas de velocidade) | Junto | Velocidade 2 contra velocidade 8 é a relação com botão mais limpa da aula |
| Duplicar sozinho não faz pulsar: é a diferença que pulsa | Sim | **Sim**, dentro da mesma cena | Experimentação (`frames`, meta nova `same-frames`) | Junto | Hoje isso é um experimento em HTML separado, numa seção própria, e a pergunta extra da cena `frames` já é exatamente essa. É uma cena e um iframe disputando o mesmo assunto |
| O quadro da animação não é o quadro do bloco A cada 40 quadros | Não é conceito, é desambiguação de palavra | Não | | Uma frase, na hora em que o quadro da animação nasce | A referência oficial exige essa frase e o v6 não a carrega. Sem ela, quem faz a aula fica com duas coisas de mesmo nome na cabeça |
| Duplicar quadro traz o desenho inteiro | Não. Ela clica e o fogo aparece no quadro novo | Não | | Dentro do gesto | A tela responde no clique |
| Selecionar e mover, e o vão que sobra | Não. O vão aparece na tela dela no instante em que solta | Não | | Dentro do gesto, com o conserto na mesma frase | Mover é mover, e o lugar de antes fica vazio. Vira pergunta do quiz, que é onde a decisão da Helena de 2026-08-21 já tinha posto ela |
| Fantasma do quadro anterior | **Sim.** Ela enxerga um quadro por vez, e não tem como saber o quanto o fogo cresceu sem decorar | **Sim** | Experimentação (`onion-skin`) | Depois de ela ter os dois quadros | A dúvida precisa ser dela. Antes de existir um segundo fogo, não há o que comparar |
| O fantasma é guia de tela, não desenho | Sim, e é a mesma ideia | **Sim**, dentro da mesma cena | Experimentação (`onion-skin`) | Junto | O tracejado por cima diz isso melhor do que a frase |
| Renomear a animação para voando | Não é conceito, é um gesto com consequência na Aula 6 | Não | | Dentro do gesto | Ela digita e o nome aparece na faixa e embaixo da prévia. A consequência se paga sozinha na Aula 6, quando a listinha do bloco do Estúdio mostrar o nome dela |
| 8 quadros por segundo | Não é conceito, é o valor de fábrica que o curso não ensina a mudar | Não | | Dito uma vez | Toda animação nasce em 8, e o curso nunca abre o controle de velocidade |

Dez coisas, quatro concretizações, em duas cenas. É essa triagem que tira a aula de 10 para 7
seções e faz o experimento em HTML deixar de existir.

## Diagnóstico do desenho atual

**Duas seções e um iframe disputam o mesmo conceito.** A seção 2 (*Observe: cada quadro é um
desenho*) usa a cena `frames`, e a seção 4 (*Experimente: o que faz o fogo pulsar?*) usa o
`quadros.html` para comparar quadros iguais com quadros diferentes. A pergunta extra da própria cena
`frames` é, literalmente, "E se os dois quadros fossem iguais? O fogo ainda ia pulsar?". O iframe
foi construído para responder a pergunta que a cena já faz.

**E o iframe é o formato mais fraco dos dois.** O README do curso registra isso com todas as
letras: a participação do HTML é evidência declarada pelo cliente, não uma execução revalidada pelo
servidor como nas experiências nativas. A cena tem metas corrigidas no servidor, pistas em escada e
palpite. O iframe tem dois botões e uma pergunta anexada.

**A cena `frames` é usada como demonstração e ela tem quatro metas paradas no motor.**
`two-drawings`, `movement`, `paused-one` e `slow-shows-two` existem, com pedidos escritos, e nenhuma
é cobrada. Quem faz a aula assiste o roteiro de cinco partes e recebe, no fim, um botão "Agora é sua vez"
que abre um rascunho que não conta nada. Vale registrar que esse rótulo é uma das fórmulas banidas
pela decisão de 01/08/2026.

**A cena `onion-skin` está no mesmo caso, e com um agravante de ordem.** Ela é usada como
demonstração na seção 6, depois de já ter feito os dois quadros, o que está certo. Mas
suas três metas (`blind-move`, `ghost-on`, `even-step`) ficam de fora, e a primeira delas é
exatamente a dificuldade real desta aula.

**A dor do fantasma não reproduz mais, e as duas fontes do projeto discordam sobre isso.** A
referência do curso manda provocar e anunciar o desalinhamento: duplicar, desenhar o fogo grande no
quadro 2, voltar ao quadro 1 e desenhar o pequeno sem enxergar o outro. O v6 mandou o contrário, e
com razão: o percurso atual é fogo-base, duplicar, selecionar e mover só a ponta, preencher o vão.
Nesse percurso a base fica onde estava, copiada, e nada treme. A regra de honestidade do briefing
resolve o impasse, e a saída não é nenhuma das duas: existe uma dificuldade real no mesmo
gesto, e ela é outra. Ver a decisão registrada na seção da cena, adiante.

**Três perguntas de múltipla escolha conferem gestos que respondem sozinhos.** Encurtar o fogo antes
de duplicar, preencher o vão com o Lápis e saber que o nome da animação é o que aparece no Estúdio
são coisas que a tela mostra ou que só produzem consequência daqui a três aulas.

## Proposta final

> **Nota de arquitetura.** A regra das duas colunas do player manda só uma coisa para a direita por
> seção: ou a cena, ou a ferramenta embarcada. **Nenhuma seção desta aula precisou ser dividida.** As
> duas cenas moram em seções próprias, a 2 e a 5, uma em cada, e o trabalho no Pinta acontece sempre
> na ferramenta externa (`externalTool: "pinta"`), nunca num Pinta embarcado. Sem `workspaceKey` em
> nenhuma seção, a coluna da direita nunca fica disputada. Nas seções 2 e 5 o clipe e a cena convivem
> sem briga: o clipe vai para a esquerda e a cena para a direita, que é o desenho pretendido.
>
> **Consequência no texto das falas.** A fala do Zappy tem limite de 400 caracteres, então as
> instruções longas das seções 3, 4 e 6 viraram duas falas seguidas cada. Elas ficam na mesma coluna
> e na mesma ordem, e são lidas como uma fala só.

### Seção 1. O que a gente vai fazer hoje

- **Intenção:** apresentação
- **Por que existe:** quem faz a aula precisa ver o motor aceso antes de desenhar a primeira chama.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`, "O motor pulsando na prévia"). A nave do Júlio com o motor pulsando na prévia, e a fórmula do
     modelo de autoria: "no fim da aula você vai ter um motor parecido com esse aqui. Esse é o meu,
     e o seu vai ter o formato e a cor que você escolher." Mais o que a aula faz: desenhar o fogo
     uma vez, fazer uma cópia e mudar só um pedacinho na cópia. Duração alvo: 25 a 35 segundos.

### Seção 2. Dois desenhos viram movimento

- **Intenção:** conceito
- **Por que existe:** é o conceito raiz da aula, e hoje ele está partido entre uma cena e um
  experimento em HTML, em duas seções separadas por dois passos de desenho.
- **Conclui quando:** as cinco metas de `frames` caem e a pergunta final é respondida
- **Blocos:**
  1. `video` (`video-livrinho`, "A faixa de quadros, e o livrinho"). A faixa de baixo da tela do Pinta, que se chama Spritesheet, com a
     linha chamada parado e um quadradinho dentro. A analogia do livrinho, que é a imagem canônica
     deste conceito e só pode ser usada uma vez no curso inteiro. E a frase de desambiguação, que
     hoje falta: "esse quadro aqui é um desenho da sua animação. Não é o mesmo quadro do bloco A
     cada 40 quadros do seu jogo, que conta o tempo." Duração alvo: 35 a 45 segundos.
  2. `interactive` (`experiencia-quadros`). Cena `frames`, "Dois desenhos viram movimento", **promovida de demonstração para
     experimentação**, com a meta nova `same-frames`. Cenário: `meu-jeito`. Sem elenco.

**Junta a seção 2 e a seção 4 de hoje, e retira o `quadros.html`.** A seção 4 existia para responder
a pergunta extra desta cena, e a cena responde melhor, com correção no servidor.

### Seção 3. Desenhe o fogo no primeiro quadro

- **Intenção:** construção
- **Por que existe:** o fogo do quadro 1 é a base de tudo que vem depois, e desenhar ele antes de
  duplicar é o que impede desenho de memória.
- **Conclui quando:** 90% do clipe assistido, com o fogo no primeiro quadro e espaço sobrando para
  ele crescer
- **Blocos:**
  1. `dialogue` (`fala-fogo-base`). "Clica no botão Abrir meu Pinta desta seção: ele abre o Pinta em
     outra aba. Abre a nave na galeria clicando no cartão dela. No painel de cores, escolhe a cor do
     seu fogo. Pega o Lápis na caixa de ferramentas, que vai ficar na sua mão a aula quase inteira."
     **A abertura da ferramenta entrou na fala, e pelo botão da seção.** Antes ela começava com a
     galeria já aberta, sem dizer como se chega lá, e a gravação antiga preenchia esse buraco com
     "abre o Pinta ali no menu da esquerda", que hoje descreve uma tela que não existe. A regra
     inteira está na nota de decisão de plataforma de `meu-jeito-aula-01.md`.
  2. `dialogue` (`fala-espaco-para-crescer`). Continuação da mesma fala, partida pelo limite de 400
     caracteres do balão. "Desenha o fogo dentro daquele espaço que você deixou vazio embaixo da
     nave, e deixa um pouco de espaço sobrando embaixo dele, porque no segundo quadro ele vai ficar
     mais comprido. Se quiser, escolhe uma cor mais clara e risca por dentro, para fazer o miolo."
  3. `video` (`video-fogo-base`, "O primeiro fogo, no quadro 1"). **Manter** a cor, o Lápis, o formato como escolha dela e o miolo.
     **Retirar** a explicação da cor do fogo como regra física. **Manter** o aviso de encurtar a
     ponta se ela já encostou na borda de baixo, agora como instrução dentro do gesto e não como
     pergunta depois. Duração alvo: 55 a 70 segundos. **A chamada para pausar e ir fazer e a
     conferência entram dentro do clipe**: fogo no primeiro quadro, ponto de saída encostado no
     motor, espaço sobrando embaixo dentro do quadro, e o corpo da nave intocado.

**O texto de orientação saiu daqui, e não virou balão.** As duas falas da seção já dão o passo a
passo e já dizem que o espaço embaixo do fogo é para ele crescer no quadro 2. O atalho **Abrir meu
Pinta** continua onde estava: ele é o `externalTool` da seção, não um bloco.

**Autoconferência no fim do clipe `video-fogo-base`:** "No quadro 1, o fogo encosta no motor e ainda sobra espaço dentro da borda de baixo para ele crescer?"

### Seção 4. Duplique e alongue só a ponta

- **Intenção:** construção
- **Por que existe:** é a vitória do dia. No fim desta seção o motor está pulsando na prévia, sozinho.
- **Conclui quando:** 90% do clipe assistido, com dois quadros, o segundo fogo mais comprido e o vão
  preenchido
- **Blocos:**
  1. `dialogue` (`fala-duplicar-quadro`). "Na faixa de baixo, na ponta direita da linha, tem uma
     fileira de botõezinhos sem nome escrito. Parando o mouse em cima de um deles, o nome aparece.
     Procura o Duplicar quadro e clica. Apareceu o segundo quadro, com o seu fogo dentro, e o Pinta
     já te levou para ele: o quadradinho aceso é o da direita."
  2. `dialogue` (`fala-mover-a-ponta`). Continuação da mesma fala, partida pelo limite de 400
     caracteres do balão. "Pega o Selecionar e mover na caixa de ferramentas, arrasta um retângulo em
     volta da pontinha de baixo do fogo e desce ela um pouco. Vai ficar um vão no meio, porque mover
     é mover: o que sai de um lugar deixa o lugar vazio. Pega o Lápis de novo, escolhe a mesma cor e
     completa os quadradinhos que faltam." O aviso de completar cada cor na sua vai para a lista de
     conferência.
  3. `video` (`video-segundo-quadro`, "Duplicar, puxar a ponta e fechar o vão"). **Seguir a narração atual**, que é a correta: Selecionar e
     mover, depois preencher o vão. A descrição de imagem antiga fala só em acrescentar com o Lápis
     e precisa ser corrigida na gravação. **Manter** o aviso de conferir o quadro aceso antes de
     riscar, que é o engano mais comum aqui. **Terminar** na prévia do lado direito, que já roda
     sozinha e não precisa de nenhum botão. Duração alvo: 80 a 95 segundos. **A chamada para
     pausar e ir fazer e a conferência entram dentro do clipe**: exatamente dois quadros, segundo
     fogo mais comprido sem sair do quadro, vão preenchido, e corpo e ponto de saída no mesmo
     lugar. **Entra também o caso das duas cores**: quem fez miolo numa cor diferente completa o
     vão em cada cor na sua.

**O texto de orientação saiu daqui, e não virou balão.** O aviso de conferir qual quadradinho está
aceso já estava previsto na narração do clipe, e um balão repetiria.

**Autoconferência no fim do clipe `video-segundo-quadro`:** "Na Prévia, o corpo da nave fica no lugar enquanto a ponta do fogo cresce e diminui, sem passar da borda? Compare os dois quadros."

### Seção 5. Quanto o seu fogo cresceu?

- **Intenção:** conceito
- **Por que existe:** o tamanho da diferença entre os dois fogos é escolha dela, e é a única coisa
  desta aula que ela não consegue medir: enxerga um quadro por vez.
- **Conclui quando:** as três metas de `onion-skin` caem e a pergunta final é respondida
- **Blocos:**
  1. `video` (`video-fantasma`, "Onde fica o botão do fantasma"). Só o gesto e o que a coisa é: o botão Fantasma do quadro anterior,
     na mesma fileira do Duplicar quadro, o desenho do quadro de antes aparecendo por cima, e a
     frase na ordem certa, primeiro o que é e depois o limite: "ele está ali para você enxergar onde
     a coisa estava no outro quadro. É uma ajuda de tela, então não dá para pintar nem apagar em
     cima dele." Duração alvo: 25 a 35 segundos.
  2. `interactive` (`experiencia-fantasma`). Cena `onion-skin`, "O fantasma do quadro de antes", **promovida de demonstração
     para experimentação**. Cenário: `meu-jeito`. Sem elenco.

**A seção vem depois de ela ter os dois quadros**, e isso é o conteúdo. Antes de existir um segundo
fogo, não existe a dúvida que a ferramenta resolve.

### Seção 6. O nome que viaja com a sua animação

- **Intenção:** construção
- **Por que existe:** é a amarração entre as duas ferramentas, e o nome que ela escrever aqui é o
  que vai aparecer na listinha do bloco do Estúdio, na Aula 6.
- **Conclui quando:** 90% do clipe assistido, com a animação chamada `voando` e dois quadros a 8
  quadros por segundo
- **Blocos:**
  1. `dialogue` (`fala-nome-voando`). "Olha o nome escrito na linha da sua animação, ali na faixa:
     parado. Ele veio de fábrica e não combina com o que a sua nave está fazendo. Naquela mesma
     fileira de botõezinhos, depois de um risquinho que separa um grupo do outro, tem o Renomear
     animação. Clica nele, apaga o parado, escreve voando, tudo em letra minúscula, e clica no botão
     Renomear."
  2. `dialogue` (`fala-conferencia-final`). Continuação da mesma fala, partida pelo limite de 400
     caracteres do balão. "Antes de fechar, olha a sua nave inteira com calma, com o fantasma ligado
     no segundo quadro: vê se os dois fogos saem do mesmo lugar, se nenhum deles subiu por cima da
     nave e se a cor ficou como você quis."
  3. `video` (`video-nome-voando`, "De parado para voando"). **Manter** a renomeação completa e a conferência final.
     **Manter** a frase de por que isso importa, que o nome viaja junto com o desenho e aparece no
     Estúdio. **Retirar** o convite a criar mais quadros e a mexer na velocidade, que o curso não
     ensina. Duração alvo: 45 a 55 segundos. **A chamada para pausar e ir fazer e a conferência
     entram dentro do clipe**: nome `voando`, dois quadros a 8 quadros por segundo, que é como
     toda animação nasce, e na Prévia o corpo estável com o fogo crescendo e diminuindo, sem sumir
     em nenhum dos dois.

**O texto de orientação saiu daqui, e não virou balão.** A conferência final já é o assunto do
`fala-conferencia-final`, e o resto é confirmação de tela, que se faz olhando.

**Autoconferência no fim do clipe `video-nome-voando`:** "A animação está chamada voando, com dois quadros, e na Prévia o fogo pulsa sem a nave saltar?"

### Seção 7. Confira, envie e fecha

- **Intenção:** entrega e fechamento
- **Por que existe:** fecha o dia com o motor aceso e prepara a pedra da Aula 4.
- **Conclui quando:** a entrega é enviada, o clipe de fecho é assistido e as duas perguntas do quiz
  são respondidas
- **Blocos:**
  1. `dialogue` (`fala-previa-e-galeria`). "Antes de enviar, abre a prévia e olha os dois quadros.
     Depois volta para a galeria pela setinha da esquerda, na ponta da barra. A miniatura do cartão
     fica parada, e está certo: é na prévia do editor que a animação toca."
  2. `dialogue` (`fala-mesma-nave`). "Hoje você envia a mesma nave de novo, agora com o motor.
     Não é um desenho novo: é o mesmo cartão da galeria, com a animação dentro dele."
  3. `studio` (`entrega-galeria-v6`). Entrega pela galeria do Pinta, uma criação.
  4. `video` (`video-fecho`, "A nave que acende sozinha"). Retoma o motor aceso e anuncia o asteroide
     em vetor. Duração alvo: 50 a 65 segundos. **O gesto de entregar acontece dentro do clipe**,
     antes do corte final: abrir a Prévia e comparar os dois quadros, esperar o Guardado na sua
     conta, escolher o mesmo cartão da nave, enviar, e conferir na tela os critérios que antes
     estavam escritos.
  5. `quiz` (`quiz-v6`). Duas perguntas, com a segunda trocada (ver abaixo).

**O texto de entrega saiu daqui.** Os critérios viraram parte do `video-fecho`, e o que virou balão
foi só a resposta à dúvida que essa seção abre, porque a nave já tinha sido entregue na Aula 2.

## Destino de cada pergunta de múltipla escolha

### No meio da aula (`activity.type: 'question'`)

| Pergunta | Seção de hoje | Destino | Por quê |
|---|---|---|---|
| "O primeiro fogo já ocupa até a última linha. O que preparar antes da cópia?" (`conferir-fogo-base`) | 3. Desenhe o fogo no primeiro quadro | **Some** | É a mesma regra do espaço reservado da Aula 2, agora repetida, e a alternativa errada supõe que duplicar aumentaria a tela, que não é uma ideia que quem faz a aula traz. Vira instrução dentro do gesto e critério de conferência |
| "Mover a ponta deixou um buraco no meio do fogo. Como completar?" (`conferir-segundo-quadro`) | 5. Duplique e alongue só a ponta | **Vira pergunta do quiz final** | O vão aparece na tela dela no instante em que solta o arrasto, e a fala dá o conserto na mesma frase. No quiz ele vira aplicação, e isso devolve a pergunta que a decisão da Helena de 2026-08-21 já tinha escolhido para esta aula |
| "Qual nome vai aparecer para escolher esta animação no Estúdio?" (`conferir-nome-voando`) | 7. Confira a animação e dê um nome | **Some** | Não há nada a concretizar: ela digita `voando` e vê o nome na faixa e embaixo da prévia. A consequência é real e chega na Aula 6, quando a listinha do bloco mostrar o nome dela. Cobrar antes é pedir para ela acreditar |

### No experimento em HTML

| Pergunta | Seção de hoje | Destino | Por quê |
|---|---|---|---|
| "Duplicar o quadro já basta para o fogo parecer pulsar?" (`experimento-diferenca`, `quadros.html`) | 4. Experimente: o que faz o fogo pulsar? | **Vira experiência**, dentro de `frames` | Vira a meta nova `same-frames` da cena. A pergunta extra de fábrica da `frames` já é essa, e a cena corrige no servidor, enquanto o iframe registra participação declarada pelo cliente. Sai o iframe e sai a seção |

**Um teste vira experiência, dois somem, e o experimento em HTML vira meta de cena.**

**O que substitui a pergunta como critério de conclusão.** O clipe do gesto em 90% mais a lista de
conferência que se lê antes de voltar à aba da aula. A verificação do desenho continua sendo
a entrega da galeria revisada pelo professor, que é o que o manifesto já declara.

### No quiz final

| Pergunta | Destino | Por quê |
|---|---|---|
| "No primeiro quadro, o fantasma não aparece. É defeito?" | **Fica** | Como a cena `onion-skin` passa a ser experimentação, o roteiro de demonstração não toca, e é ele que hoje mostra a volta ao quadro 1. A pergunta continua sendo a única coisa que cobre o caso, e é aplicação numa situação curta |
| "Você quer pulsação do fogo sem a nave tremer. O que deve manter igual?" | **Trocada** | O corpo estável e o ponto de saída comum já são cobrados pela meta `even-step` da cena e pelos critérios da entrega. E a referência oficial registra que esta pergunta deveria ser a do vão do Selecionar e mover, decidida em 2026-08-21: o v6 divergiu disso |

**Pergunta nova no lugar da segunda:** "Você arrastou a pontinha do fogo para baixo e ficou um vão
no meio. Por quê?"

- Mover leva os pixels de um lugar para outro, e o lugar de antes fica vazio. (correta)
- O segundo quadro nasce sem a parte de baixo do desenho.

**Devolutiva:** "Mover desloca os pixels. O Lápis preenche o espaço que ficou."

## Experiências e demonstrações desta aula

### 1. `frames`. Dois desenhos viram movimento · **EXISTE, COM AS CINCO METAS**

- **Situação:** a cena existe inteira, com cinco metas no motor (`two-drawings`, `movement`,
  `paused-one`, `slow-shows-two`, `same-frames`), três pistas em escada, palpite de fábrica e frase
  de sucesso. No v6 ela era usada como **demonstração guiada** e nenhuma das metas era cobrada.
- **Ajuste 1, e é o principal:** promover a cena a **experimentação**. Pelo critério do briefing, a
  relação tem botão e a frase se escreve inteira: "quando eu ponho a velocidade em 8, paro de ver
  dois desenhos e passo a ver o fogo pulsar". Parar a prévia rápida e encontrar um quadro só na tela
  é a prova do conceito, e ela precisa fazer isso com a mão, não assistir.
- **Ajuste 2, e é o que apaga uma seção inteira:** a meta `same-frames`, com rótulo "Com os dois
  quadros iguais, o fogo parou de pulsar" e pedido "Deixe o quadro 2 igual ao quadro 1 e ligue a
  prévia rápida". Ela é a pergunta extra de fábrica da própria cena, promovida a meta, e torna o
  `quadros.html` desnecessário. **Ela está no catálogo**, com esse id, esse rótulo e esse pedido.
- **Ajuste 3:** a pergunta que conta para concluir passa a ser a que hoje está anexada ao iframe,
  reescrita para a cena: "Duplicar o quadro já basta para o fogo parecer pulsar?", com "É preciso
  mudar o fogo num dos dois quadros" (correta) e "Sim, dois desenhos iguais trocando depressa já
  pulsam".
- **Ação no motor:** a que iguala o quadro 2 ao quadro 1 e permite voltar já está construída, do lado
  do `frame` e do `rate`. O palco não mudou.
- **Elenco e cenário:** cenário `meu-jeito`. Esta cena não desenha personagem do elenco: ela desenha
  a nave 32 × 32 com o fogo, que é o objeto da aula.
- **Metas declaradas no manifesto:** `two-drawings`, `movement`, `paused-one`, `slow-shows-two`,
  `same-frames`, as cinco de fábrica.
- **Onde mais serve:** a Aula 5 deste curso, quando o asteroide ganha dois quadros, e a Aula 7,
  quando a animação passa a tocar dentro do jogo. Serve também a qualquer curso futuro que ensine
  animação quadro a quadro no Pinta.

### 2. `onion-skin`. O fantasma do quadro de antes · **AJUSTADA NO CATÁLOGO**

- **Situação:** a cena existe inteira, com três pistas em escada e palpite de fábrica. No v6 ela era
  usada como **demonstração guiada**, e as metas ficavam de fora. A ordem em que a aula a usa já
  estava certa, depois de os dois quadros existirem.
- **Estado do catálogo em 19/09/2026, depois da construção:** as **três** metas estão lá,
  `blind-move`, `ghost-on` e `even-step`. A `ghost-on`, que faltava, entrou com o rótulo "Viu o fogo
  1 tracejado no quadro 2" e o pedido "Vá para o quadro 2 e ligue o fantasma".
- **Ajuste 1:** promover a cena a **experimentação**. A relação tem botão em dois lugares ao mesmo
  tempo: o fantasma ligado ou desligado, e o tamanho do fogo do quadro 2. A frase do critério se
  escreve inteira: "com o fantasma desligado eu não sei o quanto o fogo cresceu; com ele ligado eu
  vejo os dois e escolho".
- **Ajuste 2, e é onde as duas fontes do projeto discordavam:** **não encenar tremor.** A referência
  do curso manda provocar o desalinhamento e anunciar que é de propósito. O v6 proíbe. Conferindo o
  percurso real, quem tem razão é o v6: com fogo-base, Duplicar quadro, Selecionar e mover só a
  ponta e preencher o vão, a base fica onde estava porque foi copiada, e nada treme. Encenar tremor
  exigiria mandar desenhar o segundo fogo do zero, que é um gesto pior e que a aula não
  ensina.
  **A saída não é ensinar sem sintoma.** Existe uma dificuldade real e reprodutível no mesmo gesto,
  e ela é outra: **o tamanho da diferença entre os dois fogos é escolha dela**, e com um quadro à
  vista por vez não há como saber o quanto o segundo cresceu. Isso é exatamente a meta `blind-move`
  da cena, que já está escrita no motor, e o palpite de fábrica já é essa pergunta. A aula passa a
  usar essa dificuldade, que é honesta, em vez do tremor, que não reproduz.
- **Ajuste 3:** a pergunta que conta para concluir passa a ser: "Com o fantasma ligado no quadro 2, o
  que é o desenho tracejado?", com "O fogo do quadro 1, só para você comparar" (correta) e "Um
  terceiro fogo, que vai entrar na animação".
- **Elenco e cenário:** cenário `meu-jeito`. Esta cena não desenha personagem do elenco: ela desenha
  a mesma nave da cena `frames`, o que é um acerto e precisa continuar assim, porque as duas cenas
  são da mesma aula e do mesmo objeto.
- **Metas declaradas no manifesto:** `blind-move`, `ghost-on`, `even-step`. A instrução do bloco
  ganhou o terceiro gesto, deixar o fogo 2 um pouco maior que o tracejado sem passar da borda, que é
  o que a `even-step` cobra.
- **Onde mais serve:** a Aula 5 deste curso, quando ela move crateras e apaga uma delas no segundo
  quadro do asteroide, que é precisamente o caso em que comparar sem decorar vale mais.

### Cenas que foram consideradas e não entram

- **`symmetry` e `shading`.** São da Aula 2 e já foram cobradas lá. O fogo não é simétrico e recebe,
  no máximo, um miolo mais claro, que é escolha e não regra de volume.
- **`pixel-vector`.** É da Aula 4, depois de ela ter desenhado nos dois estilos.
- **`layers`.** A ordem das formas é do vetor e entra na Aula 5. O fogo desta aula é pintado na
  mesma camada da nave.
- **`sheet-vs-sprite`.** É da Aula 6. A folha de quadros só existe quando o desenho vai para o jogo,
  e citar folha hoje seria explicação antes da necessidade.

## Vídeos

| Chave | Título do vídeo | O que mostra | Origem (chave v6) | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-abertura` | O motor pulsando na prévia | o motor pulsando na prévia | `video-abertura-v6` | 25 a 35 s | fala sim, com a fórmula do modelo de autoria |
| `video-livrinho` | A faixa de quadros, e o livrinho | a faixa de quadros, a analogia do livrinho e a desambiguação | `video-livrinho` | 35 a 45 s | fala sim, com a frase da desambiguação acrescentada |
| `video-fogo-base` | O primeiro fogo, no quadro 1 | cor, Lápis, formato, miolo, a pausa para ir fazer e a conferência ao retomar | `video-fogo-base` mais o texto de orientação | 55 a 70 s | fala sim, sem a regra física da cor do fogo |
| `video-segundo-quadro` | Duplicar, puxar a ponta e fechar o vão | Duplicar quadro, Selecionar e mover, o vão, o caso das duas cores, a prévia, a pausa para ir fazer e a conferência ao retomar | `video-segundo-quadro` mais o texto de orientação | 80 a 95 s | fala sim, com a imagem corrigida |
| `video-fantasma` | Onde fica o botão do fantasma | onde fica o botão e o que o tracejado é | `video-fantasma` | 25 a 35 s | fala parcial, bem encurtada |
| `video-nome-voando` | De parado para voando | Renomear animação, a conferência final, a pausa para ir fazer e a conferência dos dois quadros a 8 por segundo | `video-nome-voando` mais o texto de orientação | 45 a 55 s | fala sim, sem o convite a mais quadros |
| `video-fecho` | A nave que acende sozinha | o gesto de entregar na tela com a conferência dos critérios, o motor aceso e o anúncio da pedra | `video-fecho-v6` mais o texto de entrega | 50 a 65 s | fala sim |

**Saldo:** os sete clipes viram sete blocos de vídeo, mas o `video-fantasma` encolhe de um passo
inteiro para o gesto, porque a explicação foi para a cena. O que some de verdade é o **experimento
em HTML `quadros.html`**, junto com a seção que o hospedava. **Nenhum clipe novo entrou com a
saída do texto corrido:** as quatro seções que tinham texto já tinham clipe, e o que era lista
escrita virou gesto e conferência dentro do clipe que já existia. A minutagem de cada um pode
subir um pouco por causa disso, e as faixas de duração continuam valendo.

> A primeira linha de cada `plannedVideo` no manifesto é `Título: <nome do vídeo>`, e é a coluna
> "Título do vídeo" desta tabela que manda nela.

## Estado da importação

O manifesto `aulas/meu-jeito-aula-03.manifesto.json` passa no validador, com zero avisos. As duas
cenas existem no catálogo, então nada aqui fica esperando construção de cena.

**As duas cenas estão com a lista de metas completa.** A `frames` tem as cinco, com a `same-frames`
entre elas, e a `onion-skin` tem as três, com a `ghost-on` que faltava.

Por isso os dois blocos passam a declarar `setup.goals`: `experiencia-quadros` com as cinco da
`frames`, e `experiencia-fantasma` com `blind-move`, `ghost-on` e `even-step`. A seção 5 só fecha
depois do momento em que o fantasma acende, que era exatamente o que a ordem de trabalho antiga
segurava.

Nenhum dos dois blocos escreve pistas próprias: os dois herdam a escada da cena.

## Continuidade

- **O que esta aula assume da anterior:** o desenho `nave` na galeria, 32 × 32, com cor e volume, e
  a faixa de cerca de quatro fileiras livres embaixo. Ela sabe abrir um desenho clicando no cartão,
  sabe voltar à galeria pela setinha, e sabe usar o Lápis, o Balde e o desfazer.
- **O que esta aula entrega para a seguinte:** o mesmo desenho `nave`, agora com uma animação
  chamada `voando`, de dois quadros, a 8 quadros por segundo, com o fogo pequeno no quadro 1 e o
  fogo maior no quadro 2, saindo do mesmo ponto, e o corpo idêntico nos dois. A Aula 4 não abre esse
  desenho: ela cria outro, e a nave fica no cartão dela.
- **Valores canônicos que saem daqui:** nome da animação `voando` · exatamente 2 quadros · 8 quadros
  por segundo, que é como a animação nasce e o curso não ensina a mudar · o que muda entre os dois
  quadros é o fogo, e só ele.
- **Cuidado de gravação registrado na referência:** antes de gravar a Aula 6, conferir que a
  animação `voando` da nave do professor está mesmo em 8, porque uma gravação anterior ficou em 16.
- **Campos livres:** a cor e o formato do fogo, o miolo, e o quanto o fogo cresce entre um quadro e
  outro. Nenhuma aula posterior cita esses valores como fato.
