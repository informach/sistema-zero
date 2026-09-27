# Corre, Dino! · Aula 3 · O Dino pisa no chão e pula

## Resumo

- **Estado de entrada:** `Ao iniciar` com `Preparar o jogo em tela cheia, tela 480 × 270, fundo` e
  `Criar dinossauro dino em x 110 y 150 tamanho 64 cor`.
  `Enquanto estiver rodando` com `A cada quadro do jogo` contendo `Limpar a tela`,
  `Desenhar fundo de floresta (velocidade 5)` e `Desenhar o sprite dino`. Na tela, o Dino corre no
  lugar na frente da floresta que passa, e não obedece a nada.
- **Vitória do dia:** o Dino pisa na grama pela primeira vez e pula quando ela manda, pelo teclado,
  pelo clique do mouse e pelo dedo na tela. E a altura do salto passa a ser escolha dela.
- **Seções hoje:** 9 · **Seções propostas:** 7 no manifesto, a partir dos 6 movimentos desta
  proposta. O movimento do impulso abre em duas seções, porque a regra das duas colunas admite uma
  única coisa na direita por seção: a cena vira *Você escolhe a altura do pulo* e a escolha no
  projeto vira *Ponha a sua força de pulo no jogo*. É o mesmo arranjo que a gravidade já tem.
- **Clipes hoje:** 5 · **Clipes propostos:** 5, sendo dois bem mais curtos. A contagem não muda com
  o redesenho da entrega: nenhum clipe entrou nem saiu, o `video-fecho` é que cresceu.
- **Fecho da entrega:** o passo a passo do teste e o envio saíram do balão e foram para o roteiro do
  `video-fecho`. Balão depois da ferramenta não existe para quem faz a aula, porque o Estúdio fica
  sozinho na coluna da direita e todo o resto na esquerda.
- **Cenas:** 2, as duas construídas no catálogo (`gravity`, `impulse`), com o mesmo par de ajustes
  aplicado: a meta que faltava existe e o bloco passou a obrigatório nas duas

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| O bloco que dá o comando de pulo | Não. É um bloco com dois campos | Não | | | Ela encaixa e testa em dois segundos. O valor dele hoje não é conceitual, é produzir a dor da aula |
| Quem não tem chão embaixo do pé não pula | Sim, mas a dor roda no jogo dela | **Não em cena** | A dor acontece no próprio projeto: as perninhas congelam, a pose trava no meio do pulo, os pés ficam um tiquinho acima da grama e o espaço não faz nada | Logo depois de encaixar o controle | É a melhor dor do curso, porque acontece sozinha com os valores de fábrica. Simular numa cena o que já quebra na tela dela seria repetir |
| A gravidade: ela puxa para baixo em todo quadro, e a subida vira descida | Sim. A força é invisível e o efeito acontece no tempo | **Sim** | Experimentação (`gravity`) | Depois da dor, antes de encaixar o bloco no projeto | Sem ver a subida que não acaba, "gravidade" é só uma palavra que o adulto usa. A cena liga e desliga a força com o Dino no ar, e isso não dá para fazer no jogo dela |
| A gravidade é do mundo e só age em quem recebe o bloco | Sim, mas não tem botão nesta aula | Não | | Dito no clipe, em uma frase | Hoje o jogo tem um sprite só, então não existe nada para comparar. Uma cena aqui seria inventada. A frase é honesta e prepara a Aula 5, quando os cactos andam sem cair |
| O impulso, e quem decide a altura do salto | Sim. A relação entre força inicial e altura tem botão | **Sim** | Experimentação (`impulse`) | Antes de escolher o número no jogo dela | A cena mantém a gravidade igual e deixa só o impulso mudar, com a marca do salto anterior no palco. No jogo dela as duas coisas mudam juntas e a comparação se perde |
| Achar o número bom levando para os dois extremos | Não é conceito, é método de trabalho | Não ganha cena, **roda no jogo dela** | Conduzido pela narração: põe 2 e olha, põe 30 e olha, para em 14 | Na mesma seção do impulso | É conteúdo do curso e é gostoso de ver. Não vira exercício, porque a narração conduz cada troca e a observação vem logo depois de cada uma |
| Os quatro jeitos de pular, e o agachar | Não. Ela aperta e vê | Não | | Dentro do clipe da gravidade, que é quando eles passam a funcionar | O mouse importa porque é o mesmo controle do dedo no celular, que é onde ela mostra o jogo para a família |
| A ordem no quadro: a gravidade vem antes do bloco que move | Sim, mas sem sintoma que a criança consiga ler | Não | | Dito no encaixe e cobrado no critério de montagem e no quiz | Invertido, o efeito é de um quadro de atraso, que ninguém enxerga. Encenar diferença que não aparece quebraria a confiança da aula |
| Que y cresce para baixo | Já foi concretizado na Aula 1 | Não | | Uma frase no momento do pouso | Remissão para trás, citando a aula, é construção de confiança. Abrir outra aula de coordenadas não |

Nove coisas, duas concretizações. Sete não ganham cena, e uma delas (a dor do Dino flutuando) é
forte justamente por acontecer no projeto da criança.

## Diagnóstico do desenho atual

**Esta é a aula mais bem desenhada das três, e o problema dela é quase todo de acabamento.** A
espinha (dor, cena, conserto, cena, escolha) já está certa. O que falta é fechar as seções, tornar
as cenas obrigatórias e parar de partir a última ideia ao meio.

**Nenhuma das três seções de construção conclui nada.** No manifesto, `controle-provisorio`,
`aplicar-gravidade` e `regular-pulo` estão com a lista de conclusão vazia e nenhuma carrega um
bloco de Estúdio. Os "Critérios automáticos" estão escritos no roteiro e não estão ligados a nada.
A criança monta as três vezes sem receber uma única confirmação, e a primeira conferência aparece
só na entrega.

**As duas cenas da aula são opcionais.** `experiencia-gravidade-modelo` e
`experiencia-impulso-modelo` estão com `required: false`, e ao mesmo tempo cada uma é o único
critério de conclusão da sua seção. As duas coisas não podem valer juntas, e são as duas cenas que
carregam os dois conceitos do dia.

**A cena da gravidade é um modelo diferente do jogo dela, e a aula não diz isso.** Na cena, a
criança faz o Dino pular com a gravidade desligada. No projeto dela, o Dino suspenso não consegue
pular de jeito nenhum, e é por isso que a aula existe. A seção 3 (*O que faz o Dino voltar?*) avisa
só que a cena não mexe no projeto, o que é outra coisa. Sem uma frase explicando a diferença de
comportamento, a criança sai da cena e tenta pular no jogo dela achando que vai funcionar.

**A última ideia está partida ao meio.** A seção 5 (*O que muda a altura?*) descobre o impulso e a
seção 6 (*Prepare o salto do seu jogo*) aplica no jogo. É um pensamento só, com uma divisória no
meio, e a divisória cai bem no ponto em que a criança está mais curiosa.

**O critério de entrega reprova a criança que aceitou o convite da aula.** A entrega exige
"Controle o dino com força 14". A força do pulo é um dos dez campos que a referência do curso
registra como escolha dela, com faixa dita de 12 a 18, e o roteiro original convida: "testa uns
entre 12 e 18 e para naquele que te deu mais vontade de jogar". Quem escolher 16 não passa. A
orientação do v6 resolveu isso tirando a faixa e fechando em 14, o que resolve o critério e mata o
campo de gosto. O certo é o contrário: o critério passa a aceitar de 12 a 18, e 14 continua sendo o
número do vídeo. Nenhuma aula posterior cita esse número.

**O clipe da gravidade carrega sozinho quatro assuntos.** O trecho original vai da bolinha jogada
para cima até o agachar, passando pelos quatro controles e pela gravidade do mundo. A explicação da
bolinha repete exatamente o que a cena `gravity` acabou de fazer com a criança no controle, e é a
primeira coisa a sair.

**A abertura anuncia a falta em vez de mostrar.** A ponte de hoje diz "primeiro vamos descobrir por
que ele ainda não consegue pular". A referência do curso pede o oposto: a aula abre com a criança
apertando espaço e o Dino ignorando ela, e isso motiva o bloco do dia em quinze segundos.

**Uma contradição de fonte a resolver antes de gravar.** A referência do curso diz que os quatro
controles do `Controlar o dinossauro` são ditos "na Aula 3, dentro do passo 1". No passo 1 nada
funciona, porque o Dino está flutuando. Os controles só podem ser demonstrados depois da gravidade,
e é onde esta proposta os coloca. A referência precisa ser corrigida nesse ponto.

## Proposta final

### Seção 1. O que a gente vai fazer hoje

- **Intenção:** apresentação
- **Por que existe:** a falta aparece aqui, rodando, e motiva a aula inteira em poucos segundos.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`): abre no jogo dela como ficou ontem. O Dino correndo, a floresta
     passando. Clica na área do jogo, aperta espaço: nada. Aperta a seta para cima: nada. "Ele corre
     bonito, mas não te obedece. Hoje isso muda: no fim da aula ele pula quando você mandar, e volta
     para o chão sozinho." **Mostrar a falta, não anunciar.** Duração alvo: 20 a 30 segundos.

### Seção 2. Dê o comando de pulo

- **Intenção:** construção
- **Por que existe:** o bloco entra e o jogo quebra de um jeito que dá para ver. Essa dor acontece
  sozinha, com os valores de fábrica, e é ela que faz a gravidade ter sentido.
- **Conclui quando:** `Controlar o dinossauro dino, força do pulo 15` está dentro do `A cada quadro
  do jogo`, entre o `Desenhar fundo de floresta` e o `Desenhar o sprite dino`
- **Blocos:**
  1. `dialogue`: "Em Jogo 2D, Kits prontos, Dino, pega o `Controlar o dinossauro __, força do pulo
     __` e encaixa dentro do `A cada quadro do jogo`, entre o `Desenhar fundo de floresta` e o
     `Desenhar o sprite dino`. O primeiro campo já nasce escrito dino, que é o nome que você deu ao
     seu dinossauro na Aula 1: confere e deixa assim. O segundo é a força do pulo, que vem 15. Deixa
     em 15 por enquanto, que no fim da aula a gente mexe nele."
  2. `video` (`video-comando-de-pulo`): o gesto do encaixe e, logo depois, o zoom na área do jogo.
     As perninhas congeladas, a pose travada no meio de um pulo, e o espacinho entre os pés e a
     grama. Apertar espaço: nada. Apertar a seta para cima: nada. **Preservar o Dino flutuando e
     parado**, que é o sintoma real deste Estúdio, e não trocar por um salto sem retorno. Fechar na
     frase que abre a aula seguinte: ninguém consegue pular sem ter chão embaixo do pé. Duração
     alvo: 60 a 70 segundos.
  3. `studio`: conferência do bloco, do nome e da posição entre os dois vizinhos.
  4. `dialogue`: "O comando está montado e está funcionando. O que falta não é comando. Olha os pés
     dele de novo."

**A dor fecha sozinha.** A ferramenta que resolve entra só na seção 4, depois de a criança entender
o que ela faz.

### Seção 3. O que traz o Dino de volta ao chão

- **Intenção:** conceito
- **Por que existe:** a palavra gravidade não ensina nada sozinha. A criança precisa ver uma subida
  que não acaba e ligar a força com o Dino já no ar.
- **Conclui quando:** as duas metas de `gravity` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue`: a ponte honesta, que hoje não existe. "Isto aqui é um modelo separado, feito para
     você olhar uma coisa de cada vez. Nele, o Dino consegue pular mesmo sem gravidade, porque o que
     a gente quer ver é o que acontece **depois** do salto. No seu jogo falta essa mesma peça, e é
     ela que vai trazer o Dino para o chão. Só quem está de pé no chão é que consegue pular."
  2. `interactive`: cena `gravity`, "Faça o Dino voltar ao chão". Elenco: Dino. Cenário:
     `corre-dino`. Ela faz o Dino pular com a gravidade desligada, olha o número da altura não parar
     de crescer e, com o Dino no ar, liga a gravidade.

**Sem vídeo, de propósito.** A cena mostra a subida que não acaba melhor do que qualquer narração,
e a explicação da bolinha jogada para cima, que hoje mora no clipe seguinte, sai por causa disso.

### Seção 4. A gravidade entra no seu jogo

- **Intenção:** construção
- **Por que existe:** é a vitória do dia. O Dino desce, encosta na grama, as perninhas voltam a
  correr e o pulo passa a funcionar dos quatro jeitos.
- **Conclui quando:** `Aplicar a gravidade do mundo ao sprite dino` está dentro do `A cada quadro
  do jogo`, entre o `Desenhar fundo de floresta` e o `Controlar o dinossauro`
- **Blocos:**
  1. `dialogue`: "Em Jogo 2D, Movimento, Velocidade e gravidade, pega o `Aplicar a gravidade do
     mundo ao sprite __` e encaixa dentro do `A cada quadro do jogo`, entre o `Desenhar fundo de
     floresta` e o `Controlar o dinossauro`. Ele nasce escrito jogador, igual ao `Desenhar o sprite`
     lá da Aula 2: clica no campo e escolhe o dino. Esse bloco não tem número nenhum, e é assim
     mesmo: a força é do mundo do seu jogo."
  2. `video` (`video-gravidade`): o encaixe, a troca do nome, e o Dino descendo e pousando na
     grama, com as perninhas voltando a correr. Apontar o pouso quando ele acontece: "olha a área do
     jogo: o dino desceu um tiquinho e agora está pisando na grama". Depois o pulo pelo
     espaço, pela seta para cima e pelo clique na parte de cima da área do jogo, com o motivo dito
     (é o mesmo controle do dedo no celular, que é onde ela vai mostrar o jogo para a família). Uma
     frase sobre a gravidade agir só em quem recebe o bloco. **Cortar a explicação da bolinha
     jogada para cima**, porque a cena da seção anterior já fez isso com a criança no controle.
     **Cortar o convite a testar o agachamento pensando em pássaros**, que é assunto de outro jogo.
     Duração alvo: 60 a 75 segundos.
  3. `studio`: conferência da gravidade antes do controle, com os dois apontando para `dino`.

### Seção 5. Você escolhe a altura do pulo

- **Intenção:** conceito
- **Por que existe:** o número da força ficou sem explicação desde a seção 2, e a criança está
  curiosa. A cena isola o impulso: a gravidade fica igual e só o impulso muda.
- **Conclui quando:** as duas metas de `impulse` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue`: a ponte curta que abre a cena, retomando o número da força que ficou pendente.
  2. `interactive`: cena `impulse`, "Escolha a altura do salto". Elenco: Dino. Cenário:
     `corre-dino`. O palco abre com o impulso em 9 e guarda a marca do salto anterior, para ela
     comparar 9 com 14 sem depender de memória.

### Seção 6. Ponha a sua força de pulo no jogo

- **Intenção:** construção
- **Por que existe:** logo depois da cena ela leva o número para os dois extremos no próprio jogo,
  que é o jeito de trabalhar que o curso quer ensinar.
- **Conclui quando:** a força do pulo do `Controlar o dinossauro dino` está entre 12 e 18
- **Blocos:**
  1. `dialogue`: "Agora no seu jogo. Põe 2 na força do pulo, clica na área do jogo e pula. Depois
     põe 30 e pula de novo. Por último, põe 14 e pula: esse é o número do meu jogo. Testa uns entre
     12 e 18 e para naquele que te deu mais vontade de jogar."
  2. `video` (`video-forca-do-pulo`): a demonstração por extremos, que já está gravada e é ótima.
     Força 2 e o Dino mal descolando do chão. Força 30 e ele sumindo da tela e demorando para
     voltar, com a observação de que quem traz ele de volta é a gravidade que ela encaixou na seção
     anterior. Fechar em 14, pulando por cima de um cacto imaginário. Manter a fala sobre o método:
     exagera para um lado, exagera para o outro, e aí você entende o que o número faz. Duração alvo:
     50 a 60 segundos.
  3. `studio`: conferência da força dentro da faixa e da ordem gravidade, controle, desenho.

**Junta duas seções de hoje, e a regra das colunas parte o resultado em duas.** A cena e a escolha
no jogo são a mesma ideia, e no v6 elas estavam separadas por outro motivo. Aqui voltam a ser um
movimento, e o manifesto as apresenta em duas seções porque a cena e o Estúdio não cabem juntos na
coluna da direita. É o mesmo arranjo da gravidade, nas seções 3 e 4.

### Seção 7. Teste, envie e fecha

- **Intenção:** entrega e fechamento
- **Por que existe:** fecha o dia com o salto completo testado dos dois jeitos e guarda a ordem do
  quadro, que é a ideia que volta em todas as aulas seguintes.
- **Conclui quando:** a entrega é enviada e as três perguntas do quiz são respondidas
- **Blocos:**
  1. `video` (`video-fecho`): o clipe passa a levar o fecho inteiro. Abre com o teste e o envio, que
     eram balão: o clique na área do jogo, um salto pela barra de espaço, outro por um toque na
     parte de cima, e nos dois o mesmo percurso enquadrado, com o Dino subindo, parando lá em cima
     um tiquinho e voltando sozinho para a grama enquanto a floresta passa. Depois os objetivos
     conferidos e o envio. Só então a recapitulação de hoje e o gancho da Aula 4. Manter a nota de
     que o modelo da cena é ilustrativo e que o sintoma do Estúdio é flutuar sem conseguir pular,
     não sair voando. **Sem o convite ao agachamento e sem abrir desafio extra.** Duração alvo: 45
     a 60 segundos.
  2. `quiz`: as três perguntas de hoje, mantidas. Elas já estão boas, e a terceira ("Qual ordem
     usamos no quadro?") é a única cobrança do conceito que não ganhou cena, o que está certo.
  3. `studio`: entrega, com os quatro critérios: `Aplicar a gravidade do mundo ao sprite dino` antes
     do controle; `Controlar o dinossauro dino` com a força entre 12 e 18, antes do desenho;
     `Desenhar o sprite dino` dentro do `A cada quadro do jogo`;
     `Desenhar fundo de floresta (velocidade 5)` antes do Dino. **A força deixa de ser exigida em
     14 exatos.** É o último item de `blockKeys`.

**Junta três seções de hoje.**

**Por que o balão de teste saiu.** Balão depois da ferramenta não existe para quem faz a aula: o
Estúdio fica sozinho na coluna da direita e todo o resto na esquerda, então "depois do Estúdio" não
é um lugar. Nada foi apagado, e o passo a passo dos dois saltos ganhou o lugar certo, que é a tela
do `video-fecho`.

## Experiências e demonstrações desta aula

### 1. `gravity` · Faça o Dino voltar ao chão · **CONSTRUÍDA, AJUSTES APLICADOS**

- **Situação:** a cena é exatamente o que a aula precisa e já segue a correção registrada: quem faz
  o pulo é a criança, e ela liga a gravidade com o Dino no ar. A instrução de abertura, as pistas, a
  pergunta final e a explicação estão boas.
- **Ajuste 1, de metas: feito.** A segunda meta existe, com o id e o texto pedidos:
  - `landed`, rótulo "Com gravidade, o pulo voltou ao chão", pedido "Com o Dino no ar, ligue a
    gravidade e espere."
- **Ajuste 2, de configuração: feito.** O bloco passou de `required: false` para obrigatório.
- **Ajuste 3, de honestidade: feito.** A fala que abre a seção diz que este é um modelo separado em
  que o Dino consegue pular sem gravidade, e que no jogo dela ele ainda não pula. Ela está na seção
  3 desta proposta.
- **Elenco/cenário:** Dino, cenário `corre-dino`. O palco começa com o Dino parado no chão e a
  gravidade desligada.
- **Metas cobradas nesta aula:** `floating`, `landed`, que são as duas da missão de fábrica. O bloco
  **não declara `setup.goals`** de propósito: sem lista, a cena cobra as duas.
- **Onde mais serve:** em qualquer curso da trilha com pulo ou queda. O curso 3 (Duelo de Heróis) e
  o curso 6 (Sobrevivente) usam o mesmo bloco de gravidade, e a cena serve sem mudança além do
  elenco.

### 2. `impulse` · Escolha a altura do salto · **CONSTRUÍDA, AJUSTES APLICADOS**

- **Situação:** a cena isola exatamente a variável certa. A gravidade fica igual, só o impulso muda,
  e a marca do salto anterior fica no palco para a comparação não depender de memória. O palpite de
  fábrica (68 de altura com impulso 9, mais de 150 com impulso 14) é bom porque a criança quase
  sempre chuta proporcional e erra.
- **Ajuste 1, de metas: feito, com um id diferente do proposto.** A comparação existe e se chama
  **`other-height`**, com o rótulo "Outro impulso, marca bem diferente" e o pedido "Pule com
  impulso 9 e depois com impulso 14", que são palavra por palavra os que esta análise pediu. O id
  `compare` também foi criado, como meta só de caso (`soNoCaso`), e por isso fica fora da missão de
  fábrica. **Vale o id do código: a aula cobra `other-height`.**
- **Ajuste 2, de configuração: feito.** O bloco passou de `required: false` para obrigatório.
- **Elenco/cenário:** Dino, cenário `corre-dino`. O palco começa com o impulso em 9.
- **Metas cobradas nesta aula:** `first-height`, `other-height`, que são as duas da missão de
  fábrica. Sem `setup.goals` no bloco, de propósito.
- **Nota de calibração:** a cena usa 9 e 14, e o jogo dela usa 2, 30 e 14. Não alegar equivalência
  numérica entre os dois: a cena é um modelo, e a aula já diz isso.

## Vídeos

| Chave | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|
| `video-abertura` | o jogo de ontem rodando e o Dino ignorando as teclas | `video-abertura-editorial` | 20 a 30 s | ponte nova, tela regravada. Mostrar a falta, não anunciar |
| `video-comando-de-pulo` | o encaixe do controle e o Dino congelado, flutuando | `video-controle-provisorio` | 60 a 70 s | fala sim, tela regravada com zoom nos pés |
| `video-gravidade` | o encaixe, o pouso na grama e os jeitos de pular | `video-aplicar-gravidade` | 60 a 75 s | fala sim, com dois cortes: a bolinha (a cena faz) e o agachamento |
| `video-forca-do-pulo` | a demonstração por extremos, 2, 30 e 14 | `video-regular-pulo` | 50 a 60 s | fala sim, mantendo a faixa de 12 a 18 |
| `video-fecho` | o teste dos dois saltos e o envio, e então a recapitulação e o gancho da Aula 4 | `video-fecho-editorial` mais o teste e o envio regravados | 45 a 60 s | fala sim, sem o convite ao agachamento. Absorve o balão de teste da entrega |

**Saldo:** cinco clipes hoje e cinco na proposta, mas o clipe da gravidade, que era o maior da aula,
perde dois assuntos inteiros. A explicação da bolinha sai porque a cena `gravity` faz melhor, e o
agachamento sai porque é conversa de outro jogo.

## Continuidade

- **O que esta aula assume da anterior:** o motor montado com `Limpar a tela`,
  `Desenhar fundo de floresta (velocidade 5)` e `Desenhar o sprite dino`, nessa ordem, dentro do
  `A cada quadro do jogo`. O Dino correndo no lugar, na frente da floresta. A criança já sabe abrir
  o seletor de sprite e trocar o nome de fábrica, e já sabe que y cresce para baixo.
- **O que esta aula entrega para a Aula 4:**
  - `Ao iniciar`: `Preparar o jogo em tela cheia, tela 480 × 270, fundo` ·
    `Criar dinossauro dino em x 110 y 150 tamanho 64 cor`.
  - `Enquanto estiver rodando` · `A cada quadro do jogo`: `Limpar a tela` ·
    `Desenhar fundo de floresta (velocidade 5)` · `Aplicar a gravidade do mundo ao sprite dino` ·
    `Controlar o dinossauro dino, força do pulo 14` · `Desenhar o sprite dino`.
  - Na tela: o Dino pisando na grama, correndo, e pulando quando a criança manda.
- **Valores canônicos que saem daqui:** a ordem gravidade, controle, desenho · força do pulo 14 no
  vídeo, com a faixa de 12 a 18 aceita no critério.
- **Campos livres:** a força do pulo. Nenhuma aula posterior cita esse número, então a faixa é
  segura.
- **O que a Aula 4 precisa deste estado:** o pulo funcionando pelos três jeitos, porque a dor da
  Aula 4 é exatamente o som sair só no espaço, ficar mudo na seta e no toque, e tocar no ar sem
  pulo nenhum.
- **Dívida registrada para a Aula 7:** o `Aplicar a gravidade do mundo ao sprite dino` passa a morar
  dentro do `Se a tela atual é jogando`, como primeiro bloco de lá, logo acima do
  `Controlar o dinossauro`. A ordem entre os dois continua valendo.
