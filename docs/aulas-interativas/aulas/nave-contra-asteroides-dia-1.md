# Nave Contra Asteroides · Dia 1 · A nave ganha vida

> Aula de referência do projeto. As outras 27 análises entram na fila de migração deste formato.

## Resumo

- **Estado de entrada:** projeto vazio, com a extensão Jogo 2D preparada pelo professor. A criança
  nunca abriu o Estúdio.
- **Vitória do dia:** a nave dela aparece num espaço com estrelas e obedece às setas, sem sair da
  tela.
- **Seções no modelo anterior:** 16 · **Seções propostas:** 15
- **Clipes no modelo anterior:** 12 · **Clipes propostos:** 14, no máximo um vídeo por seção
- **Tempo estimado:** aferir após gravar. A narração atual tem cerca de 13 minutos a 137 palavras
  por minuto, antes das pausas de tela e do tempo da criança nas experiências e no Estúdio
- **Cenas:** 5, todas construídas (4 que já existiam e a `once-vs-always`, feita para este dia)
- **Manifesto:** `aulas/nave-contra-asteroides-dia-1.manifesto.json`, 35 blocos e 15 seções. Estado no validador:
  **OK**, sem nenhum aviso de convenção
- **Revisão pedagógica, 21/09/2026:** vídeo e atividade ficam disponíveis juntos e os dois concluem
  a seção; o Zappy virou ponte curta; só `coordinates` e `world` mantêm palpite; o quiz ganhou uma
  seção própria antes da entrega
- **Revisão da sequência visual:** o céu estrelado cobre o canvas inteiro, mesmo sem Limpar a
  tela. Por isso a criança primeiro vê a nave se mover sobre o fundo liso e deixar rastro; depois
  acrescenta a limpeza e compara. As estrelas entram por último, como acabamento, antes da
  experiência sobre a ordem de desenho. A narração não enfatiza essa escolha de fundo: ela é
  direção de gravação, não um assunto novo para a criança

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| Uma vez contra sempre (as duas áreas do projeto) | Sim. Tempo é invisível, e "roda uma vez" contra "repete para sempre" não tem representação na tela | **Sim** | Experimentação (cena nova `once-vs-always`) | Antes de montar | É a ideia que sustenta o dia inteiro e todos os 48 cursos. Hoje é só um gesto de arrastar dois blocos |
| Tamanho da tela (800 × 480) | Não. É um retângulo que ela vê | Não | | Dentro do vídeo prático | O bloco já traz os dois valores. O vídeo aponta que 800 mede de um lado ao outro e 480 de cima até embaixo; a criança confere em vez de redigitar |
| x e y, e o zero lá no alto | Sim, e contraria a intuição: y cresce para baixo | **Sim** | Experimentação (`coordinates`) | Depois da explicação, antes de montar | Ela vai preencher x e y no bloco seguinte. Se não sentir a direção antes, escreve número sem significado |
| A palavra sprite | Não. É vocabulário | Não | | Explicada na seção 8, antes da categoria e do bloco Sprites | Nomear uma coisa que já foi criada não precisa de simulação |
| Criar contra mostrar | Sim. Invisível por definição: o objeto existe sem aparecer | **Sim** | Experimentação (`world`) | Antes de montar o desenho | É o momento em que a nave "não apareceu" e a criança acha que errou. O conceito resolve a frustração |
| O quadro e o motor | Sim. É o conceito raiz do curso inteiro | **Sim** | Experimentação (`draw-loop`) | Antes de montar o motor | Montar "A cada quadro do jogo" sem saber o que é um quadro é copiar gesto |
| Limpar antes de desenhar | Sim, mas tem sintoma visível | **Sim**, dentro da mesma cena do quadro | Experimentação (`draw-loop`) | Antes de montar | A cena já cobre as duas coisas nas suas três metas. Separar em duas cenas repetiria o palco |
| Mover com as setas | Não. Ela aperta a seta e vê | Não | | | Testa no jogo dela em dois segundos. Cena aqui seria redundante |
| Ficar dentro da tela | Não. Depois de limpar o rastro, ela vê a nave sair sem limite e parar ao instalar a borda | Não | | | O problema e a correção aparecem no próprio jogo |
| Ordem de desenho (camadas) | Sim. Ordem não se vê no código, só no resultado | **Sim** | Experimentação (`layers`) | **Depois** de montar | Único caso invertido da aula: o arranjo certo já está montado, e a cena serve para provar o contrafactual sem estragar o jogo dela |
| Confirmar campo e clicar na área do jogo | Não é conceito, é operação | Não | | Dentro do clipe de teste e envio | Hoje ocupa uma seção inteira com vídeo próprio. É gesto, e gesto se mostra na tela |

Onze coisas, cinco concretizações. Cinco conceitos não ganham cena, e é essa triagem que evita
atividades artificiais. Duas ideias se dividem em conceito e construção porque cena e Estúdio
disputariam a mesma coluna da direita.

## Diagnóstico do desenho anterior

**O conceito mais importante da aula não tem dono.** "Ao iniciar roda uma vez, Enquanto estiver
rodando repete para sempre" aparece na seção 2 (*Monte os dois lugares do jogo*) apenas como gesto
de arrastar dois blocos. A criança monta sem entender, e o resto do dia se apoia nisso.

**A ideia de coordenada está partida ao meio.** A seção 4 (*Observe o endereço na tela*) é o vídeo
que explica x e y, e a seção 5 (*Compare duas alturas*) é a cena que concretiza. Uma ideia, duas
seções, uma divisória no meio do pensamento.

**A própria aula já se contradiz.** A seção 7 (*Criar e mostrar são duas coisas diferentes*) faz o
certo: o clipe e a cena moram na mesma seção, e é a cena que conclui. O modelo correto já está lá,
aplicado uma vez só.

**O motor é montado antes de a criança saber o que ele faz.** A seção 8 (*Ligue o motor de
quadros*) encaixa "A cada quadro do jogo". A cena que explica o que é um quadro vem na 9, depois.

**A cena do quadro está escondida atrás do título errado.** A seção 9 se chama *O que acontece sem
limpar a tela?*, mas a cena `draw-loop` entrega três descobertas: sem redesenhar a tela não muda,
sem limpar fica rastro, limpando e desenhando a nave anda. Isso é o loop inteiro. O conceito raiz
do curso está de penetra numa seção sobre limpeza.

**Camadas era tratada como encaixe.** A seção 12 anterior (*Faça a nave aparecer por último*) era ordem de
desenho, conceito abstrato, e tem cena pronta no catálogo (`layers`) que ninguém ligou.

**Duas seções são gesto puro.** *Monte os dois lugares do jogo* e *Prepare o espaço da nave* somam
dois blocos e zero conceito concretizado.

**Uma seção é operação de interface.** *Observe como conferir uma mudança* ensina a confirmar um
campo e clicar na área do jogo. Isso é instrução dentro do teste, não seção com vídeo.

## Proposta final

> **Nota de arquitetura.** A regra das duas colunas do player manda só uma coisa para a direita por
> seção: ou a cena, ou o Estúdio embarcado. Por isso conceito e construção ocupam seções consecutivas
> quando os dois são necessários. Dentro de cada seção, vídeo e atividade abrem simultaneamente; a
> progressão exige os dois. Cada fala do Zappy é uma ponte, não uma segunda explicação.

### Seção 1. O que a gente vai fazer hoje

- **Intenção:** apresentação
- **Por que existe:** a criança precisa ver o resultado do dia antes de montar a primeira peça.
  Sem isso ela encaixa blocos sem destino.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`, "A sua nave no espaço"). O jogo do fim do Dia 1 rodando: a nave num
     espaço com estrelas, indo para os dois lados com as setas. Fala curta: "Hoje sua nave vai
     aparecer num espaço cheio de estrelas e obedecer às setas. Vamos preparar o jogo, descobrir onde
     a nave fica e montar um pedacinho de cada vez." Duração alvo: 25 a 35 segundos.

### Seção 2. O que acontece uma vez e o que acontece sempre

- **Intenção:** conceito
- **Por que existe:** é a ideia que organiza o projeto inteiro e volta em todas as aulas de todos
  os cursos. Antes de dizer os nomes das áreas, o vídeo liga as ações do jogo ao exemplo de
  preparar papel e lápis uma vez e ao ventilador que continua girando enquanto está ligado.
- **Conclui quando:** 90% do vídeo foi assistido e a experiência foi concluída
- **Blocos:**
  1. `video` (`video-duas-areas`, "A mesma ação em dois momentos"). Parte da situação de desenhar,
     mostra onde ficam as duas áreas no Estúdio e usa o ventilador para a repetição. Termina sem
     executar a ação nem mostrar contadores: essa comparação pertence à criança na experiência.
     Duração alvo: 65 a 80 segundos, a recalibrar após gravar.
  2. `dialogue` (`fala-uma-vez-e-sempre`). Ponte curta que retoma **Ao iniciar** e **Enquanto
     estiver rodando** como as duas áreas do projeto; não substitui a instrução da experiência.
  3. `interactive`. Cena `once-vs-always`, preset `duas-caixas-nave` (especificada abaixo). Elenco:
     nave e asteroide. Cenário: nave. Metas cobradas: `once`, `always`.

**Sem palpite.** A experiência concretiza uma relação que o vídeo acabou de explicar; uma hipótese
antes dela acrescentaria uma etapa sem enfrentar uma concepção relevante.

**Sem pergunta final.** As duas descobertas já exigem a comparação do mesmo movimento. Repetir a
mesma tarefa numa pergunta aumentaria o percurso; a avaliação fica no quiz dedicado da seção 14.

### Seção 3. Monte as áreas e prepare a tela

- **Intenção:** construção
- **Por que existe:** é o gesto que dá corpo ao conceito da seção anterior, e arrastar duas áreas e
  preparar a tela é um movimento só, o de montar o palco.
- **Conclui quando:** 90% do vídeo foi assistido, Ao iniciar e Enquanto estiver rodando estão no
  projeto, e a tela padrão de 800 por 480 está conferida dentro de Ao iniciar
- **Blocos:**
  1. `video` (`video-montar-areas-tela`, "As áreas do projeto e a tela do jogo"). Primeiro situa o
     que a criança vai montar; depois guia cada gesto, repetindo a categoria **Áreas do projeto**
     ao pegar o segundo bloco e dizendo onde soltar e encaixar cada peça. Os campos já vêm em
     800 × 480: o clipe explica largura e altura, sem mandar redigitar os padrões. Junta os dois
     clipes de hoje. Duração alvo: 100 a 115 segundos.
  2. `dialogue` (`fala-montar-areas-tela`). Resume que a base foi mostrada e diz "Agora é sua vez
     de montar", sem repetir blocos ou valores.
  3. `studio`. Conferência das duas áreas e da tela.

**Por que as seções 2 e 3 são duas, e não uma.** No desenho pedagógico elas são um movimento só:
entender o "uma vez contra sempre" e montar as duas áreas com a tela. No player, a cena e o Estúdio
disputariam a mesma coluna da direita, e a seção abriria com os dois empilhados. Separadas, a cena
ocupa a bancada inteira na seção 2 e o Estúdio ocupa a bancada inteira na seção 3, que é a leitura
certa dos dois.

**Por que junta o que hoje são duas seções:** arrastar duas áreas e preparar a tela é um movimento
só. Separado, cada metade é um encaixe sem conceito.

### Seção 4. Onde a nave fica na tela

- **Intenção:** conceito
- **Por que existe:** no bloco seguinte ela vai escrever 400 e 410 em dois campos. Sem sentir a
  direção antes, são dois números sem significado.
- **Conclui quando:** 90% do vídeo foi assistido e a experiência foi concluída
- **Blocos:**
  1. `video` (`video-coordenadas`, "O endereço da nave na tela"). Primeiro pergunta onde a nave
     vai aparecer; só depois apresenta x e y como dois números de um endereço. Mostra a origem no
     alto à esquerda e a direção de cada um, sem encenar a experiência. Nota para a gravação, não
     para a narração: não dizer que x 400 centraliza a nave. Com largura 54, o centro da caixa
     fica em 427. Duração alvo: 40 a 50 segundos.
  2. `dialogue` (`fala-coordenadas`). Ponte para transformar endereço em movimento.
  3. `interactive`. Cena `coordinates`, "O endereço na tela". Elenco: nave. Cenário: nave.

**Palpite mantido.** O y crescer para baixo contraria uma intuição forte. A pergunta trata dessa
relação, não do controle que será usado.

### Seção 5. Crie a sua nave

- **Intenção:** construção
- **Por que existe:** é o primeiro objeto do jogo dela, e termina numa surpresa proposital.
- **Conclui quando:** 90% do vídeo foi assistido e o bloco Criar nave está em Ao iniciar com nome
  nave, x 400, y 410, largura 54 e altura 62
- **Blocos:**
  1. `video` (`video-criar-nave`, "A nave com as suas cores"). O gesto de pegar e configurar, com a
     escolha de cores. Nome `nave`, largura 54 e altura 62 já vêm preenchidos: conferir e explicar,
     sem redigitar. Encurtar a parte dos eixos, já resolvida na seção anterior. **Manter a
     surpresa de a nave não aparecer, sem dizer que houve erro.** Duração alvo: 65 a 75 segundos.
  2. `dialogue` (`fala-criar-nave`). Convite para criar e escolher as cores; a receita fica no vídeo.
  3. `studio`. O projeto da aula, com conferência dos campos.

### Seção 6. Criar e mostrar são duas coisas diferentes

- **Intenção:** conceito
- **Por que existe:** a nave não apareceu, e nesse instante a criança acha que errou. O conceito é a
  resposta para uma pergunta que ela acabou de fazer sozinha.
- **Conclui quando:** 90% do vídeo foi assistido e as duas metas de `world` caem
- **Blocos:**
  1. `video` (`video-criar-e-mostrar`, "Criar não é mostrar"). A analogia dos atores atrás da
     cortina explica o que existe, mas ainda não aparece; sem montar blocos nem mostrar os
     controles da experiência. Duração alvo: 25 a 35 segundos.
  2. `dialogue` (`fala-criar-mostrar`). Ponte curta para comparar bastidores e tela.
  3. `interactive`. Cena `world`, "Criar e mostrar são duas coisas diferentes". Elenco: nave.

**Palpite mantido.** A confusão entre criar e desenhar é uma concepção recorrente e nasce no
projeto imediatamente anterior. A pergunta é conceitual e os controles não aparecem antes da escolha.

### Seção 7. O que é um quadro

- **Intenção:** conceito
- **Por que existe:** é o conceito raiz do curso, e hoje está escondido dentro de uma seção sobre
  limpeza. A criança precisa entender o ciclo antes de montá-lo.
- **Conclui quando:** 90% do vídeo foi assistido e a experiência foi concluída
- **Blocos:**
  1. `video` (`video-livrinho`, "O livrinho de folhear"). A analogia concreta explica o conceito
     abstrato sem mostrar montagem. Duração alvo: 50 a 60 segundos.
  2. `dialogue` (`fala-o-quadro`). Convite para acompanhar o livrinho do jogo em câmera lenta.
  3. `interactive`. Cena `draw-loop`, "Por que o desenho se repete". Elenco: nave. As três metas:
     sem redesenhar a tela não muda, sem limpar ficam os desenhos velhos, limpando e desenhando a
     nave anda.

**Sem palpite.** O vídeo apresenta a ideia e a experiência já pede três observações; adicionar uma
hipótese aqui aumentaria o percurso sem resolver uma confusão diferente.

### Seção 8. Faça a nave aparecer

- **Intenção:** construção
- **Por que existe:** a criança já criou a nave e descobriu que criar não é desenhar. Agora vê a
  nave aparecer no próprio jogo, sem um cenário pintando sobre o rastro que ainda vai investigar.
- **Conclui quando:** 90% do vídeo foi assistido, A cada quadro do jogo está em Enquanto estiver
  rodando e Desenhar o sprite nave está dentro do motor
- **Blocos:**
  1. `video` (`video-motor-e-nave`, "O motor mostra a nave"). Apresenta a meta antes da paleta,
     encaixa o motor e explica **sprite** antes de abrir a categoria com esse nome. Mostra como
     desenhar a nave, abrindo o aviso do campo de sprite em `jogador` antes de escolher `nave`.
     Mantém a cor lisa escolhida pela criança; não instala Limpar a tela nem estrelas.
     Duração alvo: 85 a 100 segundos.
  2. `dialogue` (`fala-motor-e-nave`). Convida a fazer a nave aparecer no jogo.
  3. `studio`. Conferência do motor e do bloco de desenho.

### Seção 9. Faça a nave andar com as setas

- **Intenção:** construção
- **Por que existe:** é a primeira vez que o jogo responde às setas. O movimento deixa à vista
  um rastro de desenhos antigos sobre o fundo liso; o clipe ainda não chega às bordas.
- **Conclui quando:** 90% do vídeo foi assistido e Mover o sprite nave com as setas (velocidade 7)
  está antes de Desenhar o sprite no motor
- **Blocos:**
  1. `video` (`video-setas-e-rastro`, "As setas põem a nave em movimento"). Confere que o bloco
     já vem apontando para `nave`, explica velocidade antes de escrever 7 e testa o movimento.
     O rastro fica visível; não instala limpeza nem limite ainda. Duração alvo: 65 a 80 segundos.
  2. `dialogue` (`fala-setas-e-rastro`). Convite curto para testar o movimento no próprio jogo.
  3. `studio`. Conferência das setas apontando para nave antes do desenho.

**Sem cena.** Ela aperta a seta no próprio jogo e vê movimento e rastro.

### Seção 10. Apague o rastro da nave

- **Intenção:** construção
- **Por que existe:** o rastro observado na seção anterior dá uma razão concreta para limpar o
  quadro antes de desenhar o seguinte. A criança testa o mesmo movimento antes e depois da
  limpeza, ainda sobre o fundo liso.
- **Conclui quando:** 90% do vídeo foi assistido e Limpar a tela está no começo do motor, antes
  do movimento e do desenho da nave
- **Blocos:**
  1. `video` (`video-limpar-rastro`, "A borracha antes do desenho"). Mostra o rastro, encaixa
     a causa, diz por que precisamos apagar os desenhos antigos, usa a lousa mágica e só então
     encaixa Limpar a tela antes do movimento e repete o teste. Explica que a limpeza apaga a
     imagem antiga, não a nave criada. Duração alvo: 65 a 80 segundos.
  2. `dialogue` (`fala-limpar-rastro`). Convida a comparar o mesmo movimento no projeto.
  3. `studio`. Conferência da limpeza antes dos blocos da nave.

### Seção 11. Não deixe a nave escapar

- **Intenção:** construção
- **Por que existe:** com o rastro já limpo, a nave pode realmente desaparecer pela borda à vista
  da criança. Só depois desse problema visível entra o bloco que a mantém na tela.
- **Conclui quando:** 90% do vídeo foi assistido e Manter o sprite nave dentro da tela está no
  motor depois de Mover o sprite com as setas e antes de Desenhar o sprite
- **Blocos:**
  1. `video` (`video-limite-da-nave`, "A borda segura a nave"). Primeiro testa a nave sem limite
     até ela sair da tela; então guia o bloco de borda, lê o aviso do campo de sprite em `heroi` antes
     de escolher `nave` e repete o teste dos dois lados. Duração alvo: 85 a 105 segundos.
  2. `dialogue` (`fala-limite-da-nave`). Convida a testar a borda no próprio projeto.
  3. `studio`. Conferência do limite entre o movimento e o desenho.

### Seção 12. Coloque o céu estrelado

- **Intenção:** construção
- **Por que existe:** o jogo já funciona sem rastro no fundo liso. Só agora o céu estrelado entra
  como acabamento visual, sem fingir que foi ele quem limpou os desenhos antigos. O primeiro
  encaixe, depois da nave, cobre a nave e torna visível a importância da ordem; o clipe move o
  céu para antes dela e deixa o jogo funcionando.
- **Conclui quando:** 90% do vídeo foi assistido e Desenhar fundo de estrelas, velocidade 1, está
  no motor depois de Limpar a tela e antes do movimento e do desenho da nave
- **Blocos:**
  1. `video` (`video-fundo-estrelado`, "As estrelas entram no jogo"). Mostra a nave funcionando,
     encaixa o céu depois dela para observar o desaparecimento e corrige a ordem no mesmo clipe.
     Mantém a velocidade padrão 1. Duração alvo: 65 a 80 segundos.
  2. `dialogue` (`fala-fundo-estrelado`). Convida a dar ao jogo um céu de estrelas.
  3. `studio`. Conferência da ordem limpar, estrelas, mover, manter na tela, desenhar nave.

### Seção 13. Quem é desenhado depois fica por cima

- **Intenção:** conceito
- **Por que existe:** ordem de desenho é abstrata, volta em todas as aulas seguintes e em todos os
  cursos, e hoje é tratada como um encaixe.
- **Conclui quando:** 90% do vídeo foi assistido e a experiência foi concluída
- **Blocos:**
  1. `video` (`video-camadas`, "Quem é desenhado depois fica na frente"). A analogia de folhas
     sobrepostas explica o sumiço visto na seção 12, sem repetir os controles da experiência.
     Duração alvo: 40 a 50 segundos.
  2. `dialogue` (`fala-camadas`). Convite para observar a pilha de desenhos funcionando.
  3. `interactive`. Cena `layers`, "Quem fica na frente?". Elenco: a nave no papel do herói e o
     fundo de estrelas no papel do cenário, com a figura `estrelas`. **Vem depois da montagem**,
     para provar o contrafactual sem estragar o jogo dela.

**Sem palpite nem pergunta final.** O vídeo explica a regra e a experiência deixa testar as duas
ordens. Repetir a mesma resposta numa pergunta adicional só aumentaria o percurso.

O vídeo prático da seção 12 mostrou a nave desaparecer e voltar quando o céu mudou de lugar.
A experiência permite repetir a comparação em uma cena isolada, sem desarrumar o projeto dela.

**Por que as seções 12 e 13 são duas, e não uma.** A conferência do Estúdio e a cena `layers`
disputariam a direita. Primeiro ela observa o problema e corrige a ordem no jogo; depois a
cena deixa investigar por conta própria por que a troca funcionou.

### Seção 14. O que fez a nave ganhar vida

- **Intenção:** quiz
- **Por que existe:** conferir duas ideias centrais sem misturar avaliação, mídia e entrega.
- **Conclui quando:** as duas perguntas são respondidas com 100%.
- **Blocos:**
  1. `dialogue` (`fala-quiz`). Uma frase que apresenta a revisão, sem ensinar respostas.
  2. `quiz`. Criar contra desenhar; Ao iniciar contra repetição.

**Seção dedicada.** Não há vídeo, experiência ou ferramenta aqui. Ela vem imediatamente antes do
teste e da entrega finais.

### Seção 15. Teste, envie e feche

- **Intenção:** entrega e fechamento
- **Por que existe:** fecha o ciclo com o jogo rodando e guarda as duas ideias do dia.
- **Conclui quando:** 90% do vídeo foi assistido, o projeto passa pelos critérios de montagem e a entrega
  é enviada
- **Blocos:**
  1. `video` (`video-teste-e-envio`): o clique na área do jogo, a
     nave levada até as duas bordas pelas setas, a conferência de que ela fica na frente do espaço e
     não deixa rastro, o gesto de enviar e a confirmação na tela. **Entrou pela
     regra de que toda seção com o Estúdio embarcado tem um vídeo mostrando como se faz.** Duração
     alvo: 80 a 95 segundos.
  2. `dialogue` (`fala-entrega`): "Agora é sua vez. Faça a conferência final no Estúdio e termine a
     aula com o seu jogo funcionando."
  3. `studio`. Entrega, com os critérios de estrutura definidos no manifesto atual.

**A entrega fica sem quiz e ganha uma única ponte do Zappy.** O clipe mostra como testar e enviar;
o balão apenas devolve a ação para a criança, e a ferramenta permanece disponível desde que a
seção abre.

**Por que esse balão existe.** A criança assiste à demonstração, mas ainda precisa repetir o percurso
no próprio projeto. A fala faz somente essa ponte; os gestos e os critérios específicos continuam no
vídeo e no Estúdio, sem repetição.

O antigo passo a passo do `fala-teste` continua absorvido pelo vídeo. O antigo `fala-fecho` não vai
para o clipe: o vídeo não celebra como se a criança já tivesse concluído. É a entrega feita por ela,
e não a demonstração gravada, que fecha a conquista.

## Experiências desta aula

### 1. `once-vs-always` · Uma vez e sempre · **JÁ CONSTRUÍDA, PRESET `duas-caixas-nave`**

- **Conceito:** o que está em Ao iniciar acontece uma vez, no começo. O que está em Enquanto estiver
  rodando continua acontecendo enquanto o jogo funciona.
- **Tipo:** experimentação. A relação tem botão, porque a criança escolhe **onde** colocar a ação, e
  o "onde" é a variável.
- **O que a criança manipula:** a ação **Mover a nave um pouquinho**, que ela seleciona e coloca
  em **Ao iniciar** ou **Enquanto estiver rodando**. No computador, também pode arrastar. Depois,
  usa **Começar o jogo**; a partida se encerra sozinha. **Voltar ao começo** permite repetir o mesmo
  teste, e trocar a ação de área prepara uma nova partida.
- **Como o palco começa:** as duas caixas vazias, a ação disponível de lado e a nave já presente
  com a chama acesa no céu estrelado, diante de um asteroide. O HUD mostra só **Ações feitas**;
  a cena mostra a nave e o estado da partida, sem "Passo" nem contador repetido. A nave pertence
  ao simulador; nenhuma ação afirma que criar também desenha.
- **Metas:**
  | id | rótulo ao cair | pedido na faixa |
  |---|---|---|
  | `once` | "Em Ao iniciar, a nave se moveu uma vez e parou" | "Ponha Mover a nave um pouquinho em Ao iniciar e comece o jogo." |
  | `always` | "Enquanto estiver rodando, a nave continuou se movendo" | "Ponha Mover a nave um pouquinho em Enquanto estiver rodando e comece o jogo." |
- **Pistas:**
  1. "Ponha Mover a nave um pouquinho em Ao iniciar e aperte Começar o jogo. Espere o teste parar."
  2. "Leve a mesma ação para Enquanto estiver rodando. A mudança já prepara uma nova partida."
  3. "Aperte Começar o jogo de novo e observe até a nave sair da cena. Compare Ações feitas."
- **Sem palpite e sem pergunta final:** a criança passa direto do vídeo para a manipulação e conclui
  ao comprovar as duas metas. O quiz da seção 14 avalia o conceito sem repetir a tarefa.
- **Frase de sucesso:** "Você viu a mesma ação uma vez no começo e repetida enquanto o jogo rodava."
- **Onde mais serve:** é a primeira seção de conceito de todo curso base de nível novo da grade dos
  48. As análises de curso fixaram os usos: Corre, Dino! Aula 2, Corre, Dino! Aula 4, Nave Contra
  Asteroides Dia 2 e Dia 4. É a cena com maior reuso do catálogo.
- **Estado em 23/09/2026:** a cena usa o preset `duas-caixas-nave`, com duas caixas, uma ação e
  duas metas. O mesmo `move` comprova os dois testes; o piloto não depende dos ids históricos
  `paint` e `create`.

### 2. `coordinates` · O endereço na tela · **EXISTE E JÁ AJUSTADA**

- **Situação:** a cena é boa e tem três metas (`right`, `down`, `origin`). O manifesto v6 cobrava
  **só a meta `down`**.
- **Ajuste aplicado:** o bloco `experiencia-coordenadas` declara as três. A criança vai preencher x
  e y no bloco seguinte, então precisa dos dois eixos, e a origem 0,0 é o que explica por que 400
  não é o meio da nave.
- **Ajuste 2, aplicado:** o caso preparado parte a nave de x 400, y 40, na tela 800 × 480 do
  jogo da nave. Mantido.
- **Elenco:** nave. **Cenário:** nave.
- **Metas cobradas nesta aula:** `right`, `down`, `origin`.

### 3. `world` · Criar e mostrar são duas coisas diferentes · **EXISTE E SERVE**

- **Situação:** as duas metas servem. O palpite sobre criar sem desenhar confronta uma confusão
  comum; a pergunta final repetia a distinção já explicada e foi dispensada.
- **Elenco:** nave. **Cenário:** nave.
- **Metas cobradas nesta aula:** as duas de fábrica, `hidden` e `visible`. O bloco
  `experiencia-criar-mostrar` **não declara lista de metas de propósito**, porque a aula quer a
  missão inteira da cena. Herdar é o certo aqui, e é o único bloco de cena deste curso que herda.

### 4. `draw-loop` · Por que o desenho se repete · **EXISTE E JÁ AJUSTADA**

- **Situação:** a cena entrega três descobertas e cobre o loop inteiro, mas está rotulada na aula
  como se fosse só sobre limpeza.
- **Ajuste aplicado:** é editorial, não de motor. O título da seção é "O que é um quadro" e a
  instrução pede comparar desenhar no começo, desenhar a cada quadro e limpar. A pergunta final
  pede juntar essas observações numa explicação do ciclo, não apenas repetir o vídeo.
- **Elenco:** nave. **Cenário:** nave.
- **Metas cobradas nesta aula:** `frozen`, `trail`, `moving`, as três de fábrica, declaradas no
  bloco.

### 5. `layers` · Quem fica na frente? · **EXISTE E JÁ AJUSTADA**

- **Situação:** a cena é perfeita para o conceito e nasceu com elenco de Corre Dino (herói e
  cenário, com dino e floresta).
- **Ajuste aplicado:** o elenco de Nave Contra Asteroides entrou no bloco. `hero` é a nave. **Atenção que continua
  valendo:** no cenário `nave` o papel `scenery` vem de fábrica como o tiro, e não como fundo, então
  o fundo de estrelas precisa de figura declarada, senão a cena abre com um tiro no lugar do
  cenário. O cenário do palco é `nave`.
- ✅ **Dependência de figura resolvida.** A figura `estrelas` foi criada e está em `SCENE_FIGURES`,
  que agora tem doze figuras, com os apelidos "estrelas", "fundo estrelado" e "céu estrelado". O
  bloco `experiencia-camadas` declara `scenery` com o nome **fundo de estrelas** e a figura
  `estrelas`, no lugar do `asteroide` que servia de placeholder. O texto que a criança lê e o
  desenho que ela vê passaram a bater.
- **Metas cobradas nesta aula:** as três de fábrica (`front`, `covered`, `back-in-front`),
  declaradas no bloco. A pergunta final foi dispensada por repetir a regra já observada.

## Vídeos

| Chave | Título do vídeo | O que mostra | Origem (chave v6) | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-abertura` | A sua nave no espaço | o jogo do fim do dia rodando | `video-abertura-v6` | 25 a 35 s | fala sim, tela não (regravar no Estúdio atual) |
| `video-duas-areas` | A mesma ação em dois momentos | ações do começo e ações que se repetem, com papel e lápis e ventilador | roteiro original, Parte 1 + `video-areas` | 65 a 80 s | regravar com contexto atual |
| `video-montar-areas-tela` | As áreas do projeto e a tela do jogo | caminho completo das duas áreas e da tela 800 × 480 | `video-areas` (gesto) + `video-tela` | 100 a 115 s | regravar no Estúdio atual |
| `video-coordenadas` | O endereço da nave na tela | pergunta onde ela vai aparecer antes de nomear x e y | `video-endereco` | 40 a 50 s | regravar a abertura e a explicação |
| `video-criar-nave` | A nave com as suas cores | pegar, configurar e pintar a nave | `video-nave` | 65 a 75 s | regravar com contexto e paleta atual |
| `video-criar-e-mostrar` | Criar não é mostrar | atores preparados atrás da cortina e depois visíveis | novo, a partir de `video-criar-desenhar` | 25 a 35 s | gravação nova |
| `video-livrinho` | O livrinho de folhear | analogia do livrinho depois de situar a nave | `video-criar-desenhar` | 50 a 60 s | regravar com contexto |
| `video-motor-e-nave` | O motor mostra a nave | motor, significado de sprite, aviso e desenho da nave | novo, a partir de `video-quadro` e `video-desenhar` | 85 a 100 s | gravação nova |
| `video-setas-e-rastro` | As setas põem a nave em movimento | setas, velocidade e rastro visível | `video-mover` | 65 a 80 s | regravar com teste do rastro |
| `video-limpar-rastro` | A borracha antes do desenho | causa do rastro, necessidade de apagar e mesmo movimento sem rastro | novo, a partir de `video-quadro` | 65 a 80 s | gravação nova |
| `video-limite-da-nave` | A borda segura a nave | saída pela borda, aviso, correção e novo teste | novo, a partir de `video-mover` | 85 a 105 s | gravação nova |
| `video-fundo-estrelado` | As estrelas entram no jogo | céu cobre a nave, depois entra após a limpeza e antes dela | `video-fundo` | 65 a 80 s | regravar em seção própria |
| `video-camadas` | Quem é desenhado depois fica na frente | folhas sobrepostas e a ordem na tela | novo, a partir de `video-desenhar` | 40 a 50 s | gravação nova |
| `video-teste-e-envio` | A nave nas duas bordas e o envio | testar duas bordas, conferir a ordem do motor e enviar | novo, com `video-teste` do v6 como referência de tela | 80 a 95 s | gravação nova |

**Saldo:** 14 blocos de vídeo, um por seção quando há mídia. `video-areas` e `video-tela`
continuam unidos na montagem inicial. O motor, a limpeza e as estrelas ficam separados para
mostrar no jogo real o rastro antes da solução, sem abrir mão dos clipes conceituais de criar,
quadros e camadas. O `video-teste-e-envio` termina de modo neutro; a conclusão pertence à entrega
real da criança.

> A primeira linha de cada `plannedVideo` no manifesto é `Título: <nome do vídeo>`, e é a coluna
> "Título do vídeo" desta tabela que manda nela.

## Continuidade

- **Entrada no curso:** esta é a primeira aula de Nave Contra Asteroides. Não pressupõe a introdução
  do Desafio do Primeiro Jogo nem conhecimento prévio do Estúdio; gestos de teste, confirmação e
  envio devem ser mostrados quando aparecerem pela primeira vez.
- **Entrega para o Dia 2:** projeto com as duas áreas montadas, tela 800 × 480, sprite `nave` criado
  em x 400, y 410, tamanho 54 × 62, motor com limpar, estrelas velocidade 1, mover com setas
  velocidade 7, manter dentro da tela, e desenhar a nave por último.
- **Valores canônicos que saem daqui:** tela 800 × 480 · nave x 400, y 410, 54 × 62 · estrelas
  velocidade 1 · movimento velocidade 7 · identificador do sprite `nave`.
- **Campos livres:** cor do fundo, cor do corpo e das asas da nave. Nenhuma aula posterior cita
  essas cores como fato.
