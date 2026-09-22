# Desafio do Primeiro Jogo · Dia 1 · A nave ganha vida

> Aula de referência do projeto. As outras 27 análises entram na fila de migração deste formato.

## Resumo

- **Estado de entrada:** projeto vazio, com a extensão Jogo 2D preparada pelo professor. A criança
  nunca abriu o Estúdio.
- **Vitória do dia:** a nave dela aparece num espaço com estrelas e obedece às setas, sem sair da
  tela.
- **Seções hoje:** 16 · **Seções propostas:** 13
- **Clipes hoje:** 12 · **Clipes propostos:** 12, reorganizados para uma ideia e um vídeo por seção
- **Tempo estimado:** 15 a 25 minutos para a aula completa; os vídeos somam de 8min05s a 10min05s
  e o restante acontece nas experiências, montagens, quiz e envio
- **Cenas:** 5, todas construídas (4 que já existiam e a `once-vs-always`, feita para este dia)
- **Manifesto:** `aulas/desafio-dia-1.manifesto.json`, 31 blocos e 13 seções. Estado no validador:
  **OK**, sem nenhum aviso de convenção
- **Revisão pedagógica, 21/09/2026:** vídeo e atividade ficam disponíveis juntos e os dois concluem
  a seção; o Zappy virou ponte curta; só `coordinates` e `world` mantêm palpite; o quiz ganhou uma
  seção própria antes da entrega

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| Uma vez contra sempre (as duas áreas do projeto) | Sim. Tempo é invisível, e "roda uma vez" contra "repete para sempre" não tem representação na tela | **Sim** | Experimentação (cena nova `once-vs-always`) | Antes de montar | É a ideia que sustenta o dia inteiro e todos os 48 cursos. Hoje é só um gesto de arrastar dois blocos |
| Tamanho da tela (800 × 480) | Não. É um retângulo que ela vê | Não | | Dentro do vídeo prático | O bloco já traz os dois valores. O vídeo aponta que 800 mede de um lado ao outro e 480 de cima até embaixo; a criança confere em vez de redigitar |
| x e y, e o zero lá no alto | Sim, e contraria a intuição: y cresce para baixo | **Sim** | Experimentação (`coordinates`) | Depois da explicação, antes de montar | Ela vai preencher x e y no bloco seguinte. Se não sentir a direção antes, escreve número sem significado |
| A palavra sprite | Não. É vocabulário | Não | | Dito na hora do bloco | Nomear uma coisa que já está na tela não precisa de simulação |
| Criar contra mostrar | Sim. Invisível por definição: o objeto existe sem aparecer | **Sim** | Experimentação (`world`) | Antes de montar o desenho | É o momento em que a nave "não apareceu" e a criança acha que errou. O conceito resolve a frustração |
| O quadro e o motor | Sim. É o conceito raiz do curso inteiro | **Sim** | Experimentação (`draw-loop`) | Antes de montar o motor | Montar "A cada quadro do jogo" sem saber o que é um quadro é copiar gesto |
| Limpar antes de desenhar | Sim, mas tem sintoma visível | **Sim**, dentro da mesma cena do quadro | Experimentação (`draw-loop`) | Antes de montar | A cena já cobre as duas coisas nas suas três metas. Separar em duas cenas repetiria o palco |
| Mover com as setas | Não. Ela aperta a seta e vê | Não | | | Testa no jogo dela em dois segundos. Cena aqui seria redundante |
| Ficar dentro da tela | Não. Ela segura a seta e vê parar | Não | | | Idem |
| Ordem de desenho (camadas) | Sim. Ordem não se vê no código, só no resultado | **Sim** | Experimentação (`layers`) | **Depois** de montar | Único caso invertido da aula: o arranjo certo já está montado, e a cena serve para provar o contrafactual sem estragar o jogo dela |
| Confirmar campo e clicar na área do jogo | Não é conceito, é operação | Não | | Dentro do clipe de teste e envio | Hoje ocupa uma seção inteira com vídeo próprio. É gesto, e gesto se mostra na tela |

Onze coisas, cinco concretizações. Cinco conceitos não ganham cena, e é essa triagem que evita
atividades artificiais. Duas ideias se dividem em conceito e construção porque cena e Estúdio
disputariam a mesma coluna da direita.

## Diagnóstico do desenho atual

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

**Camadas é tratada como encaixe.** A seção 12 (*Faça a nave aparecer por último*) é ordem de
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
  os cursos. Hoje ela é montada sem ser ensinada.
- **Conclui quando:** 90% do vídeo foi assistido e a experiência foi concluída
- **Blocos:**
  1. `video` (`video-duas-areas`, "Uma arruma, a outra é o motor"). Apresenta as duas áreas com o
     mesmo peso: preparar uma vez e repetir enquanto o jogo funciona. Mantém a analogia do
     ventilador para a segunda. Duração alvo: 40 a 50 segundos.
  2. `dialogue` (`fala-uma-vez-e-sempre`). Convite curto para observar uma vez contra repetição.
  3. `interactive`. Cena `once-vs-always`, preset `duas-caixas-nave` (especificada abaixo). Elenco:
     nave e asteroide. Cenário: nave. Metas cobradas: `once`, `always`, `both`.

**Sem palpite.** A experiência concretiza uma relação que o vídeo acabou de explicar; uma hipótese
antes dela acrescentaria uma etapa sem enfrentar uma concepção relevante.

**Sem pergunta final.** As três descobertas já exigem a organização certa e a comparação dos
contadores. Repetir a mesma organização numa pergunta aumentaria o percurso; a avaliação fica no
quiz dedicado da seção 12.

### Seção 3. Monte as áreas e prepare a tela

- **Intenção:** construção
- **Por que existe:** é o gesto que dá corpo ao conceito da seção anterior, e arrastar duas áreas e
  preparar a tela é um movimento só, o de montar o palco.
- **Conclui quando:** 90% do vídeo foi assistido, Ao iniciar e Enquanto estiver rodando estão no
  projeto, e a tela padrão de 800 por 480 está conferida dentro de Ao iniciar
- **Blocos:**
  1. `video` (`video-montar-areas-tela`, "As áreas do projeto e a tela do jogo"). O gesto das três
     peças de uma vez. Os campos já vêm em 800 × 480: o clipe explica largura e altura, sem mandar
     redigitar os padrões. Junta os dois clipes de hoje. Duração alvo: 50 a 60 segundos.
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
  1. `video` (`video-coordenadas`, "O endereço da nave na tela"). A analogia do endereço, já gravada:
     "x e y são só o endereço da nave na tela, é como dizer onde ela mora". Acrescentar a origem no
     alto à esquerda. **Retirar a afirmação de que x 400 centraliza a nave**: 400 é o canto esquerdo
     da caixa de largura 54, e o centro fica em 427. Duração alvo: 30 a 40 segundos.
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
     escolha de cores. Encurtar a parte dos eixos, já resolvida na seção anterior. **Manter a
     surpresa de a nave não aparecer, sem dizer que houve erro.** Duração alvo: 45 a 55 segundos.
  2. `dialogue` (`fala-criar-nave`). Convite para criar e escolher as cores; a receita fica no vídeo.
  3. `studio`. O projeto da aula, com conferência dos campos.

### Seção 6. Criar e mostrar são duas coisas diferentes

- **Intenção:** conceito
- **Por que existe:** a nave não apareceu, e nesse instante a criança acha que errou. O conceito é a
  resposta para uma pergunta que ela acabou de fazer sozinha.
- **Conclui quando:** 90% do vídeo foi assistido e as duas metas de `world` caem
- **Blocos:**
  1. `video` (`video-criar-e-mostrar`, "Criar não é mostrar"). Bastidores e tela lado a lado, sem
     montar blocos. Duração alvo: 35 a 45 segundos.
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
     abstrato sem mostrar montagem. Duração alvo: 35 a 45 segundos.
  2. `dialogue` (`fala-o-quadro`). Convite para acompanhar o livrinho do jogo em câmera lenta.
  3. `interactive`. Cena `draw-loop`, "Por que o desenho se repete". Elenco: nave. As três metas:
     sem redesenhar a tela não muda, sem limpar ficam os desenhos velhos, limpando e desenhando a
     nave anda.

**Sem palpite.** O vídeo apresenta a ideia e a experiência já pede três observações; adicionar uma
hipótese aqui aumentaria o percurso sem resolver uma confusão diferente.

### Seção 8. Ligue o motor e desenhe o espaço

- **Intenção:** construção
- **Por que existe:** três blocos que formam uma vitória só, o primeiro quadro desenhado do jogo
  dela. Ela monta o motor já sabendo o que ele faz.
- **Conclui quando:** 90% do vídeo foi assistido e A cada quadro do jogo está em Enquanto estiver
  rodando, com Limpar a tela e Desenhar fundo de estrelas dentro, nessa ordem, velocidade 1
- **Blocos:**
  1. `video` (`video-motor-e-fundo`, "A lousa mágica e o espaço com estrelas"). Junta os dois clipes
     de hoje. Manter a lousa mágica, que é comparação boa e literal. Duração alvo: 60 a 70 segundos.
  2. `dialogue` (`fala-motor-e-fundo`). Resume a ordem e convida a montar; não enumera a receita.
  3. `studio`. Conferência da ordem dos três blocos.

### Seção 9. A nave obedece a você

- **Intenção:** construção
- **Por que existe:** é a vitória do dia, e o primeiro momento em que o jogo responde a ela.
- **Conclui quando:** 90% do vídeo foi assistido e Mover o sprite nave com as setas (velocidade 7)
  e Manter o sprite dentro da tela estão no motor, os dois apontando para nave
- **Blocos:**
  1. `video` (`video-setas-e-borda`, "As setas e a borda da tela"). O gesto dos dois blocos e, junto,
     o alerta do bloco. **Manter a explicação do alerta como ajudante, não como bronca**: é o
     primeiro contato dela com depuração, e a fala gravada acerta o tom. Duração alvo: 55 a 65
     segundos.
  2. `dialogue` (`fala-setas-e-borda`). Convite curto para dar o controle ao jogador.
  3. `studio`. Conferência dos dois blocos apontando para nave.

**Sem cena.** Ela aperta a seta e vê. Concretização aqui seria redundante.

### Seção 10. Desenhe a nave no fim do motor

- **Intenção:** construção
- **Por que existe:** é o bloco que finalmente mostra a nave, e a posição dele no motor é o que faz
  ela aparecer por cima do espaço.
- **Conclui quando:** 90% do vídeo foi assistido e Desenhar o sprite está no fim do motor, com nave
  escolhida, depois do fundo e do movimento
- **Blocos:**
  1. `video` (`video-desenhar-por-ultimo`, "A nave no fim do motor"). O gesto e a ordem final.
     Substituir "as estrelas iam tampar ela" por "o que é desenhado depois pode cobrir o que veio
     antes". Duração alvo: 35 a 45 segundos.
  2. `dialogue` (`fala-desenhar-nave`). Resume que falta mostrar a nave e convida a completar o motor.
  3. `studio`. Conferência da ordem do motor inteiro.

> ⚠️ **Correção de rótulo.** O bloco se chama `Desenhar o sprite`, não "Desenhar o sprite por
> último". O "por último" é a posição no motor, que é o conceito da seção seguinte, e não faz parte
> do nome da peça. E atenção à continuidade: o Dia 2 encaixa três blocos **depois** deste, então nada
> nesta aula pode afirmar que ele é para sempre o último bloco do motor.

### Seção 11. Quem é desenhado depois fica por cima

- **Intenção:** conceito
- **Por que existe:** ordem de desenho é abstrata, volta em todas as aulas seguintes e em todos os
  cursos, e hoje é tratada como um encaixe.
- **Conclui quando:** 90% do vídeo foi assistido e a experiência foi concluída
- **Blocos:**
  1. `video` (`video-camadas`, "Quem é desenhado depois fica na frente"). A analogia de folhas
     sobrepostas e a mesma ordem na tela do jogo. Duração alvo: 30 a 40 segundos.
  2. `dialogue` (`fala-camadas`). Convite para observar a pilha de desenhos funcionando.
  3. `interactive`. Cena `layers`, "Quem fica na frente?". Elenco: a nave no papel do herói e o
     fundo de estrelas no papel do cenário, com a figura `estrelas`. **Vem depois da montagem**,
     para provar o contrafactual sem estragar o jogo dela.

**Sem palpite.** O vídeo explica a regra e a experiência deixa testar as duas ordens. O objetivo é
materializar, não pedir uma aposta adicional.

**É o único caso invertido da aula**, e a inversão é o conteúdo: ela já tem a ordem certa e a cena
mostra o que aconteceria na ordem errada.

**Por que as seções 10 e 11 são duas, e não uma.** Pela mesma regra das colunas: a conferência do
Estúdio e a cena `layers` disputariam a direita. A separação até ajuda a leitura, porque a inversão
desta aula fica explícita: primeiro ela monta a ordem certa, depois a cena mostra a ordem errada.

### Seção 12. O que fez a nave ganhar vida

- **Intenção:** quiz
- **Por que existe:** conferir duas ideias centrais sem misturar avaliação, mídia e entrega.
- **Conclui quando:** as duas perguntas são respondidas com 100%.
- **Blocos:**
  1. `dialogue` (`fala-quiz`). Uma frase que apresenta a revisão, sem ensinar respostas.
  2. `quiz`. Criar contra desenhar; Ao iniciar contra repetição.

**Seção dedicada.** Não há vídeo, experiência ou ferramenta aqui. Ela vem imediatamente antes do
teste e da entrega finais.

### Seção 13. Teste, envie e feche

- **Intenção:** entrega e fechamento
- **Por que existe:** fecha o ciclo com o jogo rodando e guarda as duas ideias do dia.
- **Conclui quando:** 90% do vídeo foi assistido, o projeto passa pelos nove critérios e a entrega
  é enviada
- **Blocos:**
  1. `video` (`video-teste-e-envio`): o gesto de confirmar um campo, o clique na área do jogo, a
     nave levada até as duas bordas pelas setas, a conferência de que ela fica na frente do espaço e
     não deixa rastro, o gesto de enviar e a confirmação na tela. **Entrou pela
     regra de que toda seção com o Estúdio embarcado tem um vídeo mostrando como se faz.** Duração
     alvo: 45 a 55 segundos.
  2. `dialogue` (`fala-entrega`): "Agora é sua vez. Faça a conferência final no Estúdio e termine a
     aula com o seu jogo funcionando."
  3. `studio`. Entrega, com os nove critérios de estrutura já definidos no manifesto atual.

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
- **O que a criança manipula:** duas fichas de ação (Acender o painel da nave e Mover a nave um
  pouquinho), que ela seleciona e coloca em **Ao iniciar** ou **Enquanto estiver rodando**. No
  computador, também pode arrastar. Mais os botões **Avançar 1 passo** e **Voltar ao começo**.
- **Como o palco começa:** as duas caixas vazias, as duas fichas de lado, o passo em 0 e a nave já
  presente no céu estrelado, diante de um asteroide. A nave pertence ao simulador; nenhuma ficha
  afirma que criar também desenha.
- **Metas:**
  | id | rótulo ao cair | pedido na faixa |
  |---|---|---|
  | `once` | "Em Ao iniciar, a ação aconteceu uma vez só" | "Ponha a ficha de arrumação em Ao iniciar e avance três passos." |
  | `always` | "Em Enquanto estiver rodando, a ação se repete a cada passo" | "Ponha a ficha de movimento em Enquanto estiver rodando e avance três passos." |
  | `both` | "Preparar uma vez e repetir sempre, juntos" | "Deixe a preparação em Ao iniciar e o movimento em Enquanto estiver rodando; avance cinco passos." |
- **Pistas:**
  1. "Olhe o número do passo e conte quantas vezes cada ação aconteceu."
  2. "Ponha uma ação em Ao iniciar e avance mais de um passo. Ela acontece de novo?"
  3. "Agora arraste a mesma ação para Enquanto estiver rodando e avance de novo."
- **Sem palpite e sem pergunta final:** a criança passa direto do vídeo para a manipulação e conclui
  ao comprovar as três metas. O quiz da seção 12 avalia o conceito sem repetir a tarefa.
- **Frase de sucesso:** "Você achou a diferença: arrumar é uma vez, o motor é sempre."
- **Onde mais serve:** é a primeira seção de conceito de todo curso base de nível novo da grade dos
  48. As análises de curso fixaram os usos: Corre, Dino! Aula 2, Corre, Dino! Aula 4, Desafio Dia 2
  e Desafio Dia 4. É a cena com maior reuso do catálogo.
- **Estado em 22/09/2026:** a cena usa o preset `duas-caixas-nave`, com duas caixas, duas fichas e
  três metas. O preset declara quais fichas comprovam cada meta; o piloto não depende dos ids
  históricos `paint` e `create`.

### 2. `coordinates` · O endereço na tela · **EXISTE E JÁ AJUSTADA**

- **Situação:** a cena é boa e tem três metas (`right`, `down`, `origin`). O manifesto v6 cobrava
  **só a meta `down`**.
- **Ajuste aplicado:** o bloco `experiencia-coordenadas` declara as três. A criança vai preencher x
  e y no bloco seguinte, então precisa dos dois eixos, e a origem 0,0 é o que explica por que 400
  não é o meio da nave.
- **Ajuste 2, aplicado:** o caso preparado parte a nave de x 400, y 40, na tela 800 × 480 do
  Desafio. Mantido.
- **Elenco:** nave. **Cenário:** nave.
- **Metas cobradas nesta aula:** `right`, `down`, `origin`.

### 3. `world` · Criar e mostrar são duas coisas diferentes · **EXISTE E SERVE**

- **Situação:** serve exatamente como está. Duas metas, pergunta final boa, explicação precisa.
- **Elenco:** nave. **Cenário:** nave.
- **Metas cobradas nesta aula:** as duas de fábrica, `hidden` e `visible`. O bloco
  `experiencia-criar-mostrar` **não declara lista de metas de propósito**, porque a aula quer a
  missão inteira da cena. Herdar é o certo aqui, e é o único bloco de cena do Desafio que herda.

### 4. `draw-loop` · Por que o desenho se repete · **EXISTE E JÁ AJUSTADA**

- **Situação:** a cena entrega três descobertas e cobre o loop inteiro, mas está rotulada na aula
  como se fosse só sobre limpeza.
- **Ajuste aplicado:** é editorial, não de motor. O título da seção é "O que é um quadro", a
  instrução de abertura do bloco é "Avance um quadro por vez e olhe a tela e o x da nave", e a
  pergunta final cobra o ciclo, não só a limpeza.
- **Elenco:** nave. **Cenário:** nave.
- **Metas cobradas nesta aula:** `frozen`, `trail`, `moving`, as três de fábrica, declaradas no
  bloco.

### 5. `layers` · Quem fica na frente? · **EXISTE E JÁ AJUSTADA**

- **Situação:** a cena é perfeita para o conceito e nasceu com elenco de Corre Dino (herói e
  cenário, com dino e floresta).
- **Ajuste aplicado:** o elenco do Desafio entrou no bloco. `hero` é a nave. **Atenção que continua
  valendo:** no cenário `nave` o papel `scenery` vem de fábrica como o tiro, e não como fundo, então
  o fundo de estrelas precisa de figura declarada, senão a cena abre com um tiro no lugar do
  cenário. O cenário do palco é `nave`.
- ✅ **Dependência de figura resolvida.** A figura `estrelas` foi criada e está em `SCENE_FIGURES`,
  que agora tem doze figuras, com os apelidos "estrelas", "fundo estrelado" e "céu estrelado". O
  bloco `experiencia-camadas` declara `scenery` com o nome **fundo de estrelas** e a figura
  `estrelas`, no lugar do `asteroide` que servia de placeholder. O texto que a criança lê e o
  desenho que ela vê passaram a bater.
- **Metas cobradas nesta aula:** as três de fábrica (`front`, `covered`, `back-in-front`),
  declaradas no bloco.

## Vídeos

| Chave | Título do vídeo | O que mostra | Origem (chave v6) | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-abertura` | A sua nave no espaço | o jogo do fim do dia rodando | `video-abertura-v6` | 25 a 35 s | fala sim, tela não (regravar no Estúdio atual) |
| `video-duas-areas` | Uma arruma, a outra é o motor | as duas áreas e a analogia do ventilador | `video-areas`, parte conceitual | 40 a 50 s | fala parcial, tela não |
| `video-montar-areas-tela` | As áreas do projeto e a tela do jogo | o gesto das três peças | `video-areas` (gesto) + `video-tela` | 50 a 60 s | funde dois clipes, tela regravada |
| `video-coordenadas` | O endereço da nave na tela | o endereço, com a correção do 400 | `video-endereco` | 30 a 40 s | fala parcial, precisa da correção |
| `video-criar-nave` | A nave com as suas cores | pegar, configurar e pintar a nave | `video-nave` | 45 a 55 s | fala sim, tela não |
| `video-criar-e-mostrar` | Criar não é mostrar | bastidores e tela, antes e depois de desenhar | novo, a partir de `video-criar-desenhar` | 35 a 45 s | não, gravação nova |
| `video-livrinho` | O livrinho de folhear | a analogia do livrinho | `video-criar-desenhar` | 35 a 45 s | fala sim, imagem nova |
| `video-motor-e-fundo` | A lousa mágica e o espaço com estrelas | motor, borracha e estrelas | `video-quadro` + `video-fundo` | 60 a 70 s | funde dois clipes |
| `video-setas-e-borda` | As setas e a borda da tela | setas, cerquinha e o alerta | `video-mover` | 55 a 65 s | fala sim, tela regravada |
| `video-desenhar-por-ultimo` | A nave no fim do motor | o bloco Desenhar o sprite e a ordem final | `video-desenhar` | 35 a 45 s | fala sim, com substituição |
| `video-camadas` | Quem é desenhado depois fica na frente | folhas sobrepostas e a ordem na tela | novo, a partir de `video-desenhar` | 30 a 40 s | não, gravação nova |
| `video-teste-e-envio` | A nave nas duas bordas e o envio | confirmar um campo, a nave até as duas bordas, a conferência do rastro, o gesto de enviar e a confirmação na tela | novo, com `video-teste` do v6 como referência de tela | 45 a 55 s | não, gravação nova |

**Saldo:** 12 blocos de vídeo, um por seção quando a seção tem mídia. Os pares `video-areas` com
`video-tela` e `video-quadro` com `video-fundo` continuam fundidos nas construções. Entram dois
clipes conceituais focados (`video-criar-e-mostrar` e `video-camadas`) para que nenhuma experiência
fique tentando substituir a explicação abstrata. Sai `video-fecho-v6` como clipe próprio; o
`video-teste-e-envio` termina de modo neutro, e a conclusão pertence à entrega real da criança.

> A primeira linha de cada `plannedVideo` no manifesto é `Título: <nome do vídeo>`, e é a coluna
> "Título do vídeo" desta tabela que manda nela.

## Continuidade

- **Assume da anterior (introdução):** a criança sabe encontrar a aula, os materiais, o salvamento e
  a ajuda. Não assume nenhum conhecimento de Estúdio.
- **Entrega para o Dia 2:** projeto com as duas áreas montadas, tela 800 × 480, sprite `nave` criado
  em x 400, y 410, tamanho 54 × 62, motor com limpar, estrelas velocidade 1, mover com setas
  velocidade 7, manter dentro da tela, e desenhar a nave por último.
- **Valores canônicos que saem daqui:** tela 800 × 480 · nave x 400, y 410, 54 × 62 · estrelas
  velocidade 1 · movimento velocidade 7 · identificador do sprite `nave`.
- **Campos livres:** cor do fundo, cor do corpo e das asas da nave. Nenhuma aula posterior cita
  essas cores como fato.
