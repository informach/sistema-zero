# O Jogo do Meu Jeito · Aula 6 · A sua nave entra no jogo

## Resumo

- **Estado de entrada:** o jogo do Desafio importado num projeto dela, terminado na Aula 1, ainda com
  a nave cinza do Kit espaço e as pedras cinzas do kit. Na galeria do Pinta, os dois desenhos dela,
  `nave` (pixel art, 32 × 32, animação `voando`) e `asteroide` (vetor, 64 × 64, animação `girando`).
- **Vitória do dia:** a nave desenhada por ela voando no jogo dela, com o fogo do motor pulsando
  sozinho, e os controles, o tiro e o placar funcionando como antes.
- **Seções hoje:** 10 · **Seções propostas:** 8
- **Clipes hoje:** 7 · **Clipes propostos:** 6
- **Cenas:** 2, as duas no catálogo: `sheet-vs-sprite`, que já existia, e `unique-names`, construída
  para cá. Hoje a aula tem 2 blocos de cena, e os dois usam a **mesma** cena, em seções seguidas.
- **Perguntas de múltipla escolha hoje:** 4 · **propostas:** 0 (1 vira experiência, 1 vira a pergunta
  de abertura da seção seguinte, 2 viram instrução)
- **Blocos de texto corrido:** 0 · **eram:** 8. Por decisão de produto de 20/09/2026, nos cursos
  infantis não existe texto corrido. Os 8 blocos saíram e o conteúdo de cada um entrou nas
  instruções de produção do vídeo da própria seção, para ser executado na tela: trazer as artes foi
  para o `video-trazer-artes`, apagar o bloco do kit para o `video-apagar-nave-do-kit`, o passo a
  passo e a conferência do `Criar sprite` para o `video-montar-a-nave`, os dois encaixes de animação
  e a conferência deles para o `video-folha-e-animacao`, e a conferência do projeto mais o envio
  para o `video-fecho-v6`. Nas três seções com mais de um texto para o mesmo clipe, tudo entrou
  junto, em ordem, sem repetir.
- **Balões do Zappy:** 7 · **eram:** 4. Nasceram 3: o `fala-duas-naves-espremidas`, que fecha a
  seção 5 na surpresa, o `fala-enviar-o-projeto`, com o lembrete curto do envio, e o
  `fala-nome-do-dia`, que abre a seção de conceito depois que ela deixou de ser a mesma seção do
  gesto.
- **Regras de produto de 20/09/2026:** ferramenta de criação e experiência não dividem a mesma seção,
  e toda seção com ferramenta tem vídeo mostrando como se faz. A seção `nomes` batia nisso, e o caso
  dela é o de dividir, não o de tirar o `externalTool`: o objetivo dela manda apagar o criador do kit
  e ler os avisos que acendem, que é trabalho no Estúdio, **mais** a cena. Virou duas seções, com a
  experiência antes e a ferramenta depois, e o clipe que já existia foi para a seção da ferramenta.

## Como a fala manda sair da aula

A regra é a mesma das oito aulas, e a **nota de decisão de plataforma completa está em
`meu-jeito-aula-01.md`**. Em duas linhas, sem condicional:

1. **Ir para uma ferramenta usa o botão da própria seção**, `Abrir meu Estúdio` ou `Abrir meu
   Pinta`, que o player desenha quando a seção declara `externalTool` (`lesson-sections.tsx`). Ele
   abre em **outra aba**, e a fala diz isso, porque a aula fica na aba de trás e é para lá que se
   volta.
2. **Quando o destino não é ferramenta e não tem botão**, a fala manda antes clicar no **Mostrar
   menu**, o botão colado na beirada esquerda, e só então nomeia o item, sempre com os dois degraus
   (**Criar › Estúdio**, **Comunidade › Mural dos Criadores**, **Comunidade › Clube dos Criadores**).

⚠️ **O Mostrar menu some enquanto um projeto está aberto na ferramenta.** A régua é
`navAvailable = onFocus && isTablet && !workspaceActive` (`focus-mode.tsx`), e o Estúdio liga o
`workspaceActive` assim que um projeto abre (`studio-full-editor.tsx`). Então nenhuma fala pode
mandar "clica no Mostrar menu" de dentro de um projeto aberto: de lá se sai primeiro para a lista
**Meus Jogos**, pela marca **Sistema Zero Studio** da barra de cima ou por **Mais opções › Estúdio ›
Meus projetos**, e só ali o botão do menu volta a existir.

**Nesta aula só a regra 1 aparece.** As cinco seções de ferramenta têm `externalTool: "estudio"`,
então o caminho falado é sempre o **Abrir meu Estúdio**, e a barra esquerda não é nomeada em lugar
nenhum. O roteiro gravado antigo abre a Parte 1 por "vai no menu da esquerda e clica em Estúdio", e é
esse trecho que precisa ser regravado.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| Trazer do Pinta guarda o desenho no projeto, e não troca nada sozinho | Sim, mas com sintoma na tela dela | Não | | Dentro da construção | Ela adiciona os dois desenhos e a nave continua cinza, à vista, em dois segundos. E ela já viu a irmã disso no Desafio: criar não é mostrar |
| Apagar bloco é botão direito, e o rótulo conta quantos vão junto | Não. É operação, com um rótulo que se lê | Não | | Dentro da construção | O próprio menu avisa. O que a aula faz é mandar ler antes de clicar |
| **Cada nome só pode ser de uma coisa** | **Sim, e é o conceito que a aula mais precisa.** Nome que falta, nome repetido e nome próprio são três estados invisíveis com três resultados diferentes | **Sim** | Experimentação (cena `unique-names`) | Antes de apagar o criador do kit, para os avisos chegarem já legíveis | Hoje é pura obediência: ela digita `folha-nave` porque mandaram, e responde uma pergunta de múltipla escolha sobre uma regra que ninguém mostrou. E a regra volta na Aula 7, invertida |
| Os seis campos do Criar sprite com imagem | Não. São campos que ela preenche olhando a tela mudar a cada um | Não | | Dentro da construção | O próprio Estúdio concretiza: o quadradinho azul aparece, anda para o meio, cresce e recebe o desenho |
| Por que a altura é 54 e não 62 | Não. É proporção, e cabe em uma frase | Não | | Dita na hora do campo | O desenho dela é quadrado, 32 por 32. Num lugar mais alto que largo ele estica |
| **A folha de quadros, e o tamanho do quadro contra o tamanho no jogo** | **Sim.** Uma imagem que contém várias, e duas medidas com o mesmo cheiro e funções diferentes | **Sim** | Experimentação (`sheet-vs-sprite`) | Depois de aparecerem duas naves espremidas | É a dor central da aula, ela reproduz sempre, e a cena já existe |
| Carregar a folha não anima nada sozinho | Sim, mas é a terceira ausência do mesmo tipo no mesmo dia | Não | | Dentro da construção | Ela encaixa e olha: continua espremido. E o fecho da aula nomeia o padrão das três ausências de uma vez |
| Os índices começam em zero (do quadro 0 ao 1 são dois desenhos) | Sim, e contraintuitivo | Não | | Dito na hora em que os números aparecem sozinhos | Ela não digita esses números, o bloco preenche. E o índice zero não volta em nenhum lugar deste curso. Cena aqui seria cara e sem reuso |
| A animação se escolhe pelo nome, e os três números vêm da folha | Não. É a colheita do nome que ela deu na Aula 5 | Não | | Dentro da construção | É o momento mais bonito da amarração entre as duas ferramentas, e ele se vê acontecendo: ela escolhe `voando` e três números aparecem |

Nove coisas, duas concretizações. Sete conceitos não ganham cena.

## Diagnóstico do desenho atual

**A mesma cena aparece duas vezes, em seções seguidas.** A seção 4 (*Observe: duas imagens dentro de
uma só*) roda `sheet-vs-sprite` em modo demonstração, e a seção 5 (*Experimente: onde cortar a
folha?*) roda `sheet-vs-sprite` em modo experimentação. É o mesmo palco duas vezes seguidas, e a
primeira meta da experimentação, `squeezed` ("Viu o jogo mostrar a folha inteira"), é literalmente o
passo 1 da demonstração que acabou de rodar. Quem faz a aula assiste a uma coisa acontecer e em seguida é
mandada fazer a mesma coisa acontecer. Isso parte uma ideia ao meio e gasta uma seção inteira.

**A experimentação cobra uma meta que não existe.** O manifesto da seção 5 declara
`setup.goals: ["crop-half", "crop-whole", "size-apart"]`, e a cena `sheet-vs-sprite` tem três metas
de fábrica: `squeezed`, `crop-half` e `crop-whole`. **`size-apart` não existe no catálogo.** O texto
que o roteiro chama de terceira descoberta ("Mudou o tamanho no jogo e conferiu a folha") é, na cena
real, a terceira pista e a pergunta extra, não uma meta. Do jeito que está, a seção pede uma
descoberta que nunca vai cair.

**A dor mais bem construída da aula está escondida no meio de um clipe de dois minutos.** O
`video-trocar-nave` vai do "olha a nave que veio pronta" até "apareceram duas naves espremidas". Ele
contém, sem divisória, o apagar do bloco do kit, os avisos acendendo em tudo, a área do jogo
congelada, os seis campos do bloco novo e a dor final. São três momentos didáticos diferentes num
clipe só, e o do meio, que é o conceito de nome, passa como detalhe.

**O conceito de nome é ensinado por decreto.** A aula manda escrever `folha-nave` e explica com uma
frase ("cada nome só pode ser de uma coisa"), e depois cobra isso numa pergunta de múltipla escolha
que testa se ela lembra. O estado que prova a regra acontece na tela dela, entre apagar e montar, e
a aula passa por cima dele em uma frase.

**Três perguntas de múltipla escolha são instrução disfarçada.** *Os desenhos estão No projeto, mas a
nave continua cinza. O que falta?* é a pergunta que abre a seção seguinte, não um teste. *Carregar a
folha já faz o motor pulsar?* se responde olhando a área do jogo depois de encaixar. *O Estúdio
mostra quadros 0 e 1. Quantos desenhos isso representa?* cobra uma frase dita dez segundos antes.

**Dois encaixes viram duas seções.** *Prepare a folha da nave* e *Anime e teste a sua nave* são dois
blocos que produzem uma vitória só, e a primeira das duas termina em nada acontecendo na tela.

**O caminho do painel de imagens está desatualizado no texto gravado.** A narração manda abrir os
três pontinhos e ir na parte **Exibição**, e chama a janela de **Imagens e sons**. Nenhum dos dois
existe: o botão chama **Mais opções**, o grupo chama **Materiais** e a janela chama **Materiais do
jogo**, com as abas **Imagens**, **Sons** e **Modelos 3D** (`REFERENCIA-PLATAFORMA.md`, seção 5).
O caminho de hoje é **Mais opções › Materiais › Imagens**, e ele fica travado aqui.

**Dois endereços de paleta estão desatualizados no texto gravado.** A narração diz "clica na
categoria Jogo 2D e, na lista de partes, clica em Sprites" e depois "clica na Animação" como se
Animação fosse uma parte de mesmo nível. Na paleta atual (edição `jogo-2d-1.0-documento-2`), os dois
blocos ficam em **Jogo 2D › Sprites › Animação**, e o `Criar sprite ... com imagem` fica em **Jogo 2D
› Sprites › Criar e trocar aparência**. O caminho precisa ser regravado, não só relegendado.

## Proposta final

### Seção 1. O que a gente vai fazer hoje

- **Intenção:** apresentação
- **Por que existe:** o jogo dela já existe e já roda. O que ela precisa ver é o momento em que a
  nave cinza vira a nave dela, com o motor pulsando.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`) · o jogo rodando com a nave desenhada por ela, o fogo do motor
     pulsando, e as pedras cinzas do kit ainda caindo em volta, à vista. Fala curta: "Hoje o seu
     desenho entra no jogo. A nave cinza sai e a sua entra no lugar dela, com o motor pulsando igual
     na Prévia do Pinta. As pedras ainda vão ser as cinzas: elas são a próxima aula."
     Duração alvo: 25 a 35 segundos.

**A pedra cinza aparece de propósito.** É ela que abre a Aula 7, e mostrar que ela continua ali
impede quem faz a aula de achar que alguma coisa ficou pela metade por erro.

### Seção 2. Traga as suas duas artes para dentro do projeto

- **Intenção:** construção
- **Ferramenta:** Estúdio, por `externalTool`
- **Por que existe:** é a ponte entre as duas ferramentas, e ela termina numa ausência que a aula
  inteira vai preencher.
- **Conclui quando:** `nave` e `asteroide` aparecem na lista **No projeto**, com o selo **✓ no
  projeto**, e o jogo continua rodando com a nave cinza
- **Blocos:**
  1. `video` (`video-trazer-artes`) · o caminho inteiro executado na tela, do Estúdio aberto pelo
     **Abrir meu Estúdio** desta seção até os dois **Fechar**: o **Meus Jogos**, o cartão do jogo da
     Aula 1 com o aviso de que não é o **Meu jogo novo**, os três pontinhos do **Mais opções**,
     **Materiais**, **Imagens**, as duas partes da
     janela (o **No projeto**, que é o que existe dentro deste projeto, e a **Biblioteca**, que hoje
     não serve), o **🎨 Trazer do Pinta** e o botão **Adicionar ao projeto** virando **✓ no
     projeto**, nos dois cartões. Fecha com a conferência junto e o socorro de quando as artes não
     aparecem, que é conferir o salvamento no Pinta. **Não afirmar que o No projeto estará vazio em
     toda conta.** Duração alvo: 75 a 90 segundos.
  2. `dialogue` · a pergunta em aberto, que hoje é uma pergunta de múltipla escolha: "Com as duas
     janelas fechadas, olhe a área do jogo. Continua tudo igual, com a nave cinza. Trazer o desenho
     para dentro do projeto não troca nada sozinho: ele só deixa o desenho guardado ali. Você já viu
     isso no Desafio, com criar e mostrar. Quem manda usar são os blocos, e é isso que a gente faz
     agora."

**Autoconferência no fim do clipe `video-trazer-artes`:** "Na lista No projeto aparecem nave e asteroide com a marca de que entraram no projeto? Guardar no Pinta sozinho não faz essa troca."

### Seção 3. Cada nome só pode ser de uma coisa

- **Intenção:** conceito
- **Sem ferramenta:** `externalTool: null`
- **Por que existe:** a regra de nome sustenta o resto do dia e a Aula 7 inteira, e ela é a diferença
  entre ler um aviso do Estúdio com entendimento e ler achando que quebrou tudo.
- **Conclui quando:** as três metas de `unique-names` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue` (`fala-nome-do-dia`) · a ponte curta que abre a seção, porque o gesto não mora mais
     aqui: "As suas artes já estão guardadas no projeto, e quem manda usar são os blocos. Antes de
     mexer neles tem uma regra para ver de perto: dentro de um mesmo trecho, cada nome é de uma coisa
     só. Nesta experiência você tira o bloco que cria o nome e descobre o que acontece com quem
     estava procurando por ele."
  2. `interactive` · cena `unique-names`, "Cada nome só pode ser de uma coisa", já construída e
     descrita abaixo. Elenco: esta cena não desenha personagem do elenco. Cenário do palco:
     `meu-jeito`. Metas declaradas: `missing`, `clash`, `own-name`.

**O conceito prepara o gesto.** Pela regra de produto de 20/09/2026, ferramenta de criação e
experiência não dividem a mesma seção, e a experiência vem antes. A cena mostra os dois estados que a
quem faz a aula vai encontrar no projeto dela logo em seguida: o nome que sumiu, com os blocos acendendo
aviso, e o nome repetido, com o Estúdio pedindo outro. Quando ela apaga o `Criar nave` do kit na
seção 4, o aviso *"O nome nave ainda não foi criado neste jogo"* já é uma frase que ela sabe ler.

### Seção 4. Apague o criador que veio do kit

- **Intenção:** construção
- **Ferramenta:** Estúdio, por `externalTool`
- **Por que existe:** o bloco do kit não tem onde pôr o desenho dela, então ele precisa sair para o
  bloco novo entrar. E a saída dele deixa o projeto num estado que parece quebrado, que é exatamente
  o estado que a cena da seção 3 acabou de explicar.
- **Conclui quando:** 90% do clipe assistido, com o `Criar nave` do kit fora do **Ao iniciar** e a
  pilha religada
- **Blocos:**
  1. `video` (`video-apagar-nave-do-kit`) · extraído da cabeça do `video-trocar-nave`, agora com a
     âncora executada na tela antes do gesto: subir até o **Ao iniciar**, mostrar o `Criar nave` logo
     abaixo do `Preparar o jogo em tela cheia`, dizer que ele veio do **Jogo 2D › Kits prontos ›
     Espaço** e abrir os campos dele para mostrar que só dá para trocar a cor do corpo e a cor das
     asas. Depois o botão direito, o texto do menu lido antes de clicar (porque, quando um bloco tem
     outros encaixados dentro, ele conta quantos vão embora junto), o **Apagar este bloco**, o
     lembrete do Control e Z, a pilha se religando sozinha, e então o sintoma: vários blocos com
     sinal de aviso, e o aviso escrito *"O nome nave ainda não foi criado neste jogo"*. E a área do
     jogo sem mudar, com a nave cinza continuando a voar, porque o Estúdio segura a última versão que
     funcionava. Fecha com a conferência junto. **Manter o tom de ajudante, não de bronca**, como no
     resto dos cursos. Duração alvo: 90 a 105 segundos.

**Correção ao que este relatório dizia.** A versão anterior defendia gesto, sintoma e conceito na
mesma seção, com o argumento de que partir obrigaria quem faz a aula a atravessar uma divisória no meio de
um susto. A regra de produto de 20/09/2026 decidiu o contrário, e para melhor: com a cena antes, não
há susto a atravessar, porque o aviso já chega explicado. O apagar continua durando quinze segundos e
continua sem conceito próprio, e é por isso que ele conclui pelo clipe, e não por uma cena.

**Autoconferência no fim do clipe `video-apagar-nave-do-kit`:** "No Ao iniciar, só o criador da nave do kit saiu, os outros blocos continuam, e os avisos apareceram? A nave cinza na área do jogo ainda pode ser a última versão válida."

### Seção 5. Monte a sua nave

- **Intenção:** construção, e termina em dor
- **Ferramenta:** Estúdio, por `externalTool`
- **Por que existe:** é o bloco central do curso, montado do zero por ela, e ele termina numa
  surpresa que é o conteúdo da seção seguinte.
- **Conclui quando:** o bloco `Criar sprite nave em x 400 y 410 largura 54 altura 54 com imagem nave`
  está no **Ao iniciar**, entre o `Preparar o jogo em tela cheia` e o `Criar grupo de sprites tiros`,
  e os avisos sumiram
- **Blocos:**
  1. `video` (`video-montar-a-nave`) · o resto do `video-trocar-nave`, agora com a busca do bloco e
     os seis valores executados na tela. Começa em **Jogo 2D › Sprites › Criar e trocar aparência**,
     com o `Criar sprite em x y largura altura com imagem` reconhecido pelo fim do rótulo, **com
     imagem**, e encaixado no lugar que ficou vago, entre o `Preparar o jogo em tela cheia` e o
     `Criar grupo de sprites tiros`. Depois campo a campo, da esquerda para a direita, com a tela
     reagindo: `nave`, 400, 410, 54, 54 e a imagem `nave` escolhida na gradezinha. Os avisos sumindo
     todos de uma vez no instante em que ela escreve `nave`, o quadradinho azul claro aparecendo
     perto do canto de cima, andando para o meio lá embaixo com o x e o y, e crescendo com a largura
     e a altura. A frase da proporção, na hora da altura: "os dois são iguais por causa do seu
     desenho. Você desenhou num quadrado de 32 por 32, e num lugar mais alto do que largo a sua nave
     ia esticar para caber." Antes do corte, a conferência junto dos seis campos, dos avisos que
     sumiram e dos blocos de baixo intactos. O clipe **termina nas duas naves espremidas**, com a
     frase "não foi você que errou". **Não prometer o quadrado azul em toda etapa de digitação:** o
     preview pode manter a última versão válida. Duração alvo: 110 a 130 segundos.
  2. `dialogue` (`fala-duas-naves-espremidas`) · o fecho da dor, curto e sem conserto: "Olhe a área
     do jogo. Apareceram duas naves espremidas, uma do lado da outra, dentro do lugar de uma só. É
     isso mesmo, não foi você que errou, e a próxima seção explica de onde saiu a segunda."

**Autoconferência no fim do clipe `video-montar-a-nave`:** "No Ao iniciar, o novo criador com imagem nave está ligado, os avisos sumiram e surgiram duas naves espremidas? Essa duplicação é a pista da próxima correção."

### Seção 6. A folha e o tamanho no jogo

- **Intenção:** conceito
- **Sem ferramenta:** `externalTool: null`
- **Por que existe:** apareceram duas naves onde devia ter uma, e quem faz a aula precisa entender que a
  imagem que veio do Pinta guarda os dois quadros em fila antes de dizer ao jogo onde cortar.
- **Conclui quando:** as três metas de `sheet-vs-sprite` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue` · abertura curta do Zappy, sem vídeo: "As duas naves vieram do seu próprio desenho.
     Quando o desenho sai do Pinta e vem para o jogo, ele não vem um quadro de cada vez: ele vem numa
     imagem só, com os dois quadros em fila, um do lado do outro. Isso tem nome, e é o nome do dia:
     **folha de quadros**. O bloco pegou essa imagem inteira e esticou ela dentro do lugar da sua
     nave. Vamos ver isso acontecendo."
  2. `interactive` · cena `sheet-vs-sprite`, "A folha e o tamanho no jogo", em modo experimentação,
     com as **três metas de fábrica**. Elenco: esta cena não desenha personagem do elenco. Cenário do
     palco: `meu-jeito`.

**Uma seção no lugar de duas.** A demonstração guiada de hoje mostra exatamente o que a primeira meta
da experimentação faz cair, e a folha da cena já é uma nave com fogo pequeno e fogo grande, que é a
folha dela. O clipe `video-folha-demo` deixa de existir: ele mostraria pela segunda vez o que a cena
mostra pela primeira, com menos controle.

### Seção 7. Prepare a folha e anime a sua nave

- **Intenção:** construção
- **Ferramenta:** Estúdio, por `externalTool`
- **Por que existe:** dois blocos que formam uma vitória só. É aqui que a nave dela passa a voar.
- **Conclui quando:** `Carregar folha de quadros folha-nave da imagem nave com quadros de 32 x 32 px`
  e `Animar sprite nave com a folha folha-nave na animação voando, do quadro 0 ao 1 a 8 fps` estão no
  **Ao iniciar**, nessa ordem, logo abaixo do `Criar sprite` e acima do `Criar grupo de sprites
  tiros`
- **Blocos:**
  1. `video` (`video-folha-e-animacao`) · funde os dois clipes de hoje e passa a executar os dois
     encaixes na tela, com caminho e âncora ditos enquanto faz. Primeiro o `Carregar folha de quadros
     da imagem com quadros de x px`, pego em **Jogo 2D › Sprites › Animação** e encaixado no **Ao
     iniciar**, logo abaixo do bloco da seção anterior e ainda em cima do `Criar grupo de sprites
     tiros`, com a razão de ele só funcionar ali (a folha se carrega uma vez só), o nome `folha-nave`
     com um tracinho no meio, a imagem `nave` e os dois campos de tamanho que já vêm com 32 e não se
     mexe neles, porque esse 32 foi ela que escolheu no Pinta ao marcar o Médio. Entre um encaixe e
     outro, a área do jogo sem mudar. Depois o `Animar sprite com a folha na animação, do quadro ao a
     fps`, encaixado logo abaixo, com os três campos de escolher: `nave`, `folha-nave` e o
     **Escolher** da animação. O momento alto é a listinha das animações abrindo com o nome que ela
     escreveu duas aulas atrás. E, logo depois, os três números se preenchendo sozinhos: "apareceu do
     quadro 0 ao quadro 1, a 8 fps. São os seus dois desenhos: o primeiro é o 0 e o segundo é o 1.
     Você não digita nada aí, porque o bloco pegou tudo da sua folha." Fecha com a conferência junto,
     lendo a pilha do **Ao iniciar** de cima para baixo, e com o socorro de quando o `voando` não
     aparece na listinha. **Corrigir todas as falas de motor acendendo e apagando** para fogo pequeno
     e fogo grande. Duração alvo: 120 a 145 segundos.
  2. `dialogue` · a conferência que hoje é pergunta de múltipla escolha, dita como lembrete para o
     meio do trabalho dela: "Olhe a área do jogo. Continua com as duas naves espremidas, e é isso
     mesmo. Esse bloco só deixou a folha pronta. Quem usa ela é o próximo."
  3. `dialogue` · o teste: "Clique na área do jogo e aperte Enter. Jogue um pouco: mova com as setas,
     atire, e confira que o placar e as vidas continuam funcionando. A sua nave está lá, com o fogo
     dela pulsando."

**Autoconferência no fim do clipe `video-folha-e-animacao`:** "Na área do jogo há uma nave só com o fogo pulsando, e os tiros e o placar continuam funcionando?"

### Seção 8. Envie e fecha

- **Intenção:** entrega e fechamento
- **Ferramenta:** Estúdio, por `externalTool`
- **Por que existe:** guarda a vitória e nomeia o padrão que atravessa as três últimas aulas.
- **Conclui quando:** a entrega é enviada e as duas perguntas do quiz são respondidas
- **Blocos:**
  1. `dialogue` (`fala-enviar-o-projeto`) · o lembrete curto do envio: "Jogue uma partida antes de
     enviar, porque a entrega leva os blocos e as imagens juntos. Espere aparecer **Guardado na sua
     conta**, escolha a criação na lista e envie ao professor. Se ela ainda não estiver na lista,
     confira o salvamento e carregue a lista de novo."
  2. `studio` · entrega pela galeria do Estúdio, uma criação, com os critérios de revisão do professor
     já definidos no roteiro atual.
  3. `video` (`video-fecho-v6`) · agora em três partes. Abre com a conferência junto do projeto
     (as duas artes em **No projeto**, o sprite `nave` único com os seis valores, a `folha-nave` de
     32 carregada antes do `voando`, e o jogo original inteiro ainda funcionando), segue com o envio
     executado na tela e só então nomeia as três ausências do dia de uma vez: "A sua nave desenhada
     está no jogo. Repare numa coisa que aconteceu três vezes hoje. Trazer o desenho para o projeto
     não usou ele. Criar o sprite não mostrou o desenho certo. Carregar a folha não animou nada. Em
     todas, alguém prepara e outro alguém usa, e as duas coisas são blocos diferentes. Na próxima
     aula as pedras cinzas saem, e você vai ver esse mesmo par outra vez." Duração alvo: 60 a 75
     segundos.
  4. `quiz` · as duas perguntas atuais, mantidas. As duas são aplicação em situação nova.

## Experiências e demonstrações desta aula

### 1. `unique-names` · Cada nome só pode ser de uma coisa · **CONSTRUÍDA**

- **Id no catálogo:** `unique-names` · **grupo:** `world`
- **Título visível:** Cada nome só pode ser de uma coisa
- **O conceito abstrato:** no mesmo trecho do projeto, um nome pertence a uma coisa só. Se o nome que
  os blocos procuram não existe, eles avisam e a tela para de mudar. Se dois blocos criam o mesmo
  nome, o Estúdio recusa e pede um nome diferente.
- **Tipo:** experimentação. A relação tem botão, e o botão é o próprio nome: quando ela escreve o
  mesmo nome nos dois blocos, o aviso acende; quando ela troca um, ele apaga.
- **O que quem faz a aula manipula:**
  - **O bloco de cima**, que cria um nome, com dois botões: **Tirar este bloco** e **Pôr de volta**.
  - **O campo de nome do bloco de baixo**, com três opções numa listinha: `nave`, `folha-nave` e
    `nave2`.
  - Ao lado, a tela do jogo e três blocos que citam `nave`, cada um com um espaço para o sinal de
    aviso.
- **Como o palco começa:** o bloco de cima cria `nave`, o bloco de baixo está com o campo de nome
  vazio, os três blocos da direita estão sem aviso, e a tela mostra uma nave voando.
- **Metas:**
  | id | rótulo ao cair | pedido na faixa |
  |---|---|---|
  | `missing` | "Sem o bloco que cria o nome, os outros acendem o aviso e a tela para de mudar" | "Tire o bloco de cima e olhe os três blocos e a tela." |
  | `clash` | "Dois blocos criando o mesmo nome: o Estúdio pede um nome diferente" | "Ponha o bloco de cima de volta e escolha `nave` também no bloco de baixo." |
  | `own-name` | "Com um nome só dela, a folha fica junto da nave sem briga" | "No bloco de baixo, troque `nave` por `folha-nave`." |
- **Pistas:**
  1. "Olhe os três blocos da direita. Eles procuram um nome. Quem cria esse nome?"
  2. "Ponha os dois blocos criando `nave` e leia o aviso que aparece."
  3. "Dê um nome só dele ao bloco de baixo, com `folha` na frente."
- **Palpite antes de abrir:** "Os dois blocos vão criar o nome `nave`. O que acontece?"
  - O Estúdio pede um nome diferente ✓
  - O segundo substitui o primeiro
- **Pergunta depois de descobrir (conta para concluir):** "No seu jogo, o sprite já se chama `nave`.
  Que nome dar para a folha de quadros dele?"
  - `folha-nave`, um nome só dela ✓
  - `nave`, porque é o desenho da nave
- **Explicação ao acertar:** "Quando dois blocos criam o mesmo nome no mesmo trecho, o Estúdio para e
  pede um nome diferente. Por isso a folha recebe o nome dela, `folha-nave`, e a nave continua com o
  nome dela."
- **Frase de sucesso:** "Cada nome é de uma coisa só, e é por isso que a folha ganhou nome próprio."
- **Fidelidade obrigatória:** os dois avisos precisam ser os textos reais da tela. O de nome ausente é
  *"O nome nave ainda não foi criado neste jogo"*. O de nome repetido é *"O nome nave já foi criado
  neste trecho; escolha um nome diferente"*. E o congelamento do preview precisa ser mostrado como o
  Estúdio faz: a tela segura a última versão que funcionava, e não fica preta nem vazia.
- **Onde mais serve:** Desafio do Primeiro Jogo, onde ela cria os grupos `tiros` e `asteroides`, a
  variável `pontos` e a constante `alvo`, e onde a mesma regra vale sem nunca ser dita. Corre Dino,
  nos grupos e variáveis. **Meu Jeito Aula 7**, onde a regra aparece invertida: lá o bloco velho não
  cria nome nenhum, então os dois podem conviver, e é exatamente por isso que a ordem de troca muda.
  Esta cena se paga duas vezes dentro do próprio curso.
- **Por que nenhuma cena existente servia:** `world` trata de criar contra mostrar um objeto, e não
  de nome. `variable` trata de guardar, mudar e mostrar um valor, e o nome dela é dado. Nenhuma cena
  anterior tocava em declaração de nome nem em aviso do Estúdio.
- **Ações no motor, conferidas no código:** `name-field`, que aceita campo vazio, `nave`,
  `folha-nave` e `nave2`, e `toggle-block`, que tira o bloco e põe de volta. As duas saíram como
  esta especificação pedia, com a listinha fechada nas quatro opções.
- **O que o catálogo traz, comparado com esta especificação:** título, instrução, o que quem faz a aula
  manipula, frase de sucesso, pergunta extra, as três metas com rótulo e pedido e as três pistas
  entraram como estavam. Duas diferenças de escrita, as duas a favor do construído: as crases dos
  nomes saíram dos textos de tela, porque a cena não formata código, e a terceira pista concorda com
  a folha ("um nome só **dela**", e não "dele"). O manifesto foi alinhado a esses textos.

### 2. `sheet-vs-sprite` · A folha e o tamanho no jogo · **EXISTE, SEM MUDANÇA NO CATÁLOGO**

- **Situação:** a cena é exatamente a certa, e a folha dela já é uma nave com fogo pequeno e fogo
  grande, que é a folha que quem faz a aula acabou de desenhar. O problema é que a aula usa ela duas vezes,
  em seções seguidas, e a segunda cobra uma meta que não existe.
- **Ajuste 1, de uso:** uma aparição só, em modo experimentação. A demonstração guiada da seção 4 sai
  inteira, junto com o clipe `video-folha-demo`.
- **Ajuste 2, de metas:** trocar `["crop-half", "crop-whole", "size-apart"]` por `["squeezed",
  "crop-half", "crop-whole"]`. **Correção ao que este relatório dizia:** a `size-apart` **existe** no
  catálogo, com o rótulo "Mudou o tamanho no jogo e conferiu a folha", e não é `soNoCaso`. Ela fica
  de fora desta aula **por escolha**, não por ausência: a ideia dela já está na terceira pista da
  cena e na pergunta extra, e a explicação da pergunta final também cobre, porque o 32 é o quadro da
  folha e o 54 é o tamanho no jogo. Declarar as três no bloco é o que mantém a missão do tamanho
  desta seção. Se um dia a aula quiser cobrar a quarta, basta acrescentá-la à lista.
- **Ajuste 3, de palpite:** com a demonstração fora, o palpite da experimentação passa a ser o único, e
  o certo é o que a cena já traz de fábrica ("Os quadros da nave têm 32 de largura. Com um recorte de
  16, o que aparece no jogo?"). O palpite que estava na demonstração, sobre a folha inteira, deixa de
  existir porque a meta `squeezed` agora é cobrada na experimentação e o palpite dela cabe ali.
- **Elenco:** esta cena não desenha personagem do elenco. **Cenário do palco:** `meu-jeito`.
- **Metas declaradas no manifesto:** `squeezed`, `crop-half`, `crop-whole`.

## Vídeos

| Chave | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|
| `video-abertura` | o jogo com a nave dela voando e as pedras cinzas ainda caindo | `video-abertura-v6` | 25 a 35 s | fala sim, tela a regravar |
| `video-trazer-artes` | o Estúdio aberto, Meus Jogos, o cartão do jogo da Aula 1, três pontinhos, Materiais, Imagens, as duas partes da janela, Trazer do Pinta, os dois Adicionar ao projeto, os dois Fechar e a conferência junto | `video-trazer-artes` | 75 a 90 s | fala sim, tela a regravar na paleta atual |
| `video-apagar-nave-do-kit` | o `Criar nave` do kit localizado e aberto, o botão direito, o texto do menu lido, Apagar este bloco, a pilha religando, os avisos acendendo, a tela congelada e a conferência junto | cabeça do `video-trocar-nave` | 90 a 105 s | fala sim, com corte |
| `video-montar-a-nave` | a gaveta e o rótulo `com imagem`, o encaixe, os seis campos com a tela reagindo a cada um, a conferência junto e as duas naves espremidas no fim | resto do `video-trocar-nave` | 110 a 130 s | fala sim, com o caminho de paleta regravado |
| `video-folha-e-animacao` | os dois encaixes com gaveta, âncora e campos, a área do jogo parada entre eles, a listinha com o nome `voando`, os três números se preenchendo sozinhos e a conferência junto da pilha | `video-carregar-folha` + `video-animacao-nave` | 120 a 145 s | funde dois clipes, com a fala do motor corrigida |
| `video-fecho-v6` | a conferência junto do projeto, o envio executado na tela e o fecho da aula | `video-fecho-v6` | 60 a 75 s | fala nova, com o trecho de entrega novo na frente |

**Saldo:** de 7 clipes para 6. O `video-folha-demo` sai porque a cena faz melhor. O
`video-trocar-nave` vira dois clipes, e os dois de folha e animação viram um. Em minutagem, porém, a
aula cresce em vez de encolher: com o fim do texto corrido, o passo a passo e a conferência de cada
seção passaram a ser executados na tela, e o `video-fecho-v6` ganhou na frente a conferência do
projeto e o envio. O clipe do `Criar sprite` continua sendo o mais longo do curso, o que é correto:
são seis campos e cada um muda a tela.

**Onde cada clipe mora, depois da divisão da `nomes`:** `video-abertura` na seção 1,
`video-trazer-artes` na 2, `video-apagar-nave-do-kit` na 4 (era a 3, junto com a cena),
`video-montar-a-nave` na 5, `video-folha-e-animacao` na 7 e `video-fecho-v6` na 8. As seções 3 e 6
são as duas de conceito e não têm clipe, porque também não têm ferramenta.

## Estado da importação

O manifesto `aulas/meu-jeito-aula-06.manifesto.json` passa no validador, com zero avisos. As duas
cenas estão no catálogo, então nada aqui fica esperando construção de cena.

### Seções e critério de conclusão

| # | Chave | Título | Intenção | Ferramenta | Blocos | Conclui com |
|---|---|---|---|---|---|---|
| 1 | `abertura` | O que a gente vai fazer hoje | `presentation` | nenhuma | 1 | `video-abertura` |
| 2 | `trazer-artes` | Traga as suas duas artes para dentro do projeto | `application` | Estúdio | 2 | `video-trazer-artes` |
| 3 | `nomes` | Cada nome só pode ser de uma coisa | `exploration` | nenhuma | 2 | `experimento-nomes` |
| 4 | `apagar-nave-do-kit` | Apague o criador que veio do kit | `application` | Estúdio | 1 | `video-apagar-nave-do-kit` |
| 5 | `montar-a-nave` | Monte a sua nave | `application` | Estúdio | 2 | `video-montar-a-nave` |
| 6 | `folha-e-tamanho` | A folha e o tamanho no jogo | `exploration` | nenhuma | 2 | `experimento-recorte` |
| 7 | `folha-e-animacao` | Prepare a folha e anime a sua nave | `application` | Estúdio | 3 | `video-folha-e-animacao` |
| 8 | `entrega-e-fecho` | Envie e fecha | `delivery` | Estúdio | 4 | `entrega-galeria-v6` e `quiz-v6` |

### Regra das duas colunas e as duas regras de produto de 20/09/2026

Uma seção tinha ferramenta e experiência juntas, a `nomes`, e o caso dela é o de **dividir**, não o
de tirar o `externalTool`. O objetivo dela mandava apagar o criador do kit e ler os avisos que
acendem, que é trabalho no Estúdio, mais a cena `unique-names`. Trabalho de verdade na ferramenta não
se resolve tirando o atalho.

- A seção 3 ficou com a experiência, sem `externalTool`, e ganhou o balão `fala-nome-do-dia` como
  abertura, já que o clipe deixou de abrir a seção.
- A seção 4 nasceu com a ferramenta, `externalTool: "estudio"`, e levou o `video-apagar-nave-do-kit`,
  que já existia. Ela conclui pelo clipe, como as outras seções de ferramenta desta aula.
- A ordem é a da regra: a experiência antes, a ferramenta depois. E ela melhora a aula, porque o
  aviso do Estúdio chega legível em vez de chegar como susto.

As cinco seções que ficaram com `externalTool` têm vídeo: `video-trazer-artes`,
`video-apagar-nave-do-kit`, `video-montar-a-nave`, `video-folha-e-animacao` e `video-fecho-v6`.
Nenhum clipe novo precisou ser criado. A seção 6, `folha-e-tamanho`, já era conceito puro, com
`externalTool: null` desde o redesenho, e continua como está.

### Cenas

- `experimento-nomes` declara `missing`, `clash` e `own-name`, as três da `unique-names`, e o palpite
  aponta para `clash`, que é a meta que desmente o palpite errado.
- `experimento-recorte` declara `squeezed`, `crop-half` e `crop-whole`, três das quatro da
  `sheet-vs-sprite`. A quarta, `size-apart`, existe e fica de fora por escolha desta aula.
- Os dois blocos deixaram de escrever pistas próprias e passaram a herdar a escada da cena. Foi isso
  que apagou a única divergência de texto entre o manifesto e o catálogo nesta aula: a pista da
  `unique-names` estava escrita com crases e com "um nome só dele", e a da cena diz "dela".

## Continuidade

- **O que esta aula assume da Aula 1:** o jogo do Desafio importado num projeto dela, com a extensão
  Jogo 2D já instalada, e a lista **Meus Jogos** já conhecida.
- **O que esta aula assume da Aula 5:** os dois desenhos na galeria do Pinta, com os nomes `nave` e
  `asteroide` e as animações `voando` e `girando`, de dois quadros a 8 fps cada.
- **O que entrega para a Aula 7:** no **Ao iniciar**, nesta ordem: `Preparar o jogo em tela cheia`,
  `Criar sprite nave em x 400 y 410 largura 54 altura 54 com imagem nave`, `Carregar folha de quadros
  folha-nave da imagem nave com quadros de 32 x 32 px`, `Animar sprite nave com a folha folha-nave na
  animação voando, do quadro 0 ao 1 a 8 fps`, e então os `Criar grupo de sprites` e o resto do jogo,
  intocados. O `Criar nave` do Kit espaço não existe mais. Os asteroides continuam sendo os cinzas do
  kit, e a arte `asteroide` está no projeto sem estar em uso.
- **Valores canônicos que saem daqui:** x 400 · y 410 · largura 54 · altura 54 · nome do sprite `nave`
  · nome da folha `folha-nave` · quadro de 32 × 32 · animação `voando` · do quadro 0 ao 1 · 8 fps.
- **Campos livres:** nenhum. Esta aula é toda canônica, porque a Aula 7 cita os nomes e a Aula 8
  publica o resultado.
- **Pontos a conferir antes de gravar:**
  1. ✅ **Resolvido em 20/09/2026, medido no código.** O caminho do painel de imagens é **Mais
     opções › Materiais › Imagens**, e a janela chama **Materiais do jogo**. Não existe grupo
     **Exibição** no menu ⋯, e a janela não chama mais **Imagens e sons**. O roteiro gravado antigo
     usa os dois nomes velhos, e o trecho precisa ser regravado.
  2. Os caminhos de paleta. `Criar sprite ... com imagem` está em **Jogo 2D › Sprites › Criar e trocar
     aparência**, e os dois blocos de folha e animação em **Jogo 2D › Sprites › Animação**. A narração
     antiga trata Animação como se fosse uma parte de primeiro nível.
  3. A animação `voando` precisa estar em 8 fps na conta de gravação. Se ela tiver sido deixada em 16,
     o vídeo mostra 16 e o material diz 8.
