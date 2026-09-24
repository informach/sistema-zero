# Briefing do redesenho didático das aulas

> Documento de governança. Toda análise de aula deste projeto segue exatamente o que está aqui.
> Quem analisar uma aula sem ter lido este arquivo inteiro produz material que será descartado.

> **Direção vigente desde 21/09/2026.** A unidade didática é a seção. Em uma seção de conceito,
> vídeo e experiência ficam disponíveis ao mesmo tempo e os dois precisam ser concluídos. Em uma
> seção prática, vídeo e ferramenta também ficam disponíveis juntos e os dois compõem a conclusão.
> Há no máximo um vídeo e um diálogo-ponte do Zappy fora da experiência por seção; a instrução
> interna da experiência é outra função. Quiz fica sozinho em uma seção própria,
> precedido apenas por uma fala curta do Zappy. Palpite é seletivo, nunca automático.

## 1. O que estamos fazendo e por quê

Os jogos já gravados do Sistema Zero (Nave Contra Asteroides, Corre Dino e O Jogo do Meu Jeito)
foram concebidos num formato antigo: um vídeo único por aula mostrando tudo. O novo Desafio do
Primeiro Jogo foi redesenhado em três dias como **A Chave do Farol**, separado do jogo de nave. A plataforma mudou de
forma estrutural, e o formato das aulas mudou junto: agora cada aula é uma sequência de **seções**,
e cada seção tem **blocos** de conteúdo.

Existe uma revisão histórica chamada v6 em `sistema-zero/docs/aulas-interativas-legado/*-v6/`, com 27 aulas já
reorganizadas em 281 seções. **Essa revisão é um ponto de partida mecânico, não uma referência
didática.** A divisão das seções foi produzida por script (`qa/gerar-*-v6.ts`), aplicando um molde
igual para todas: toda aula tem exatamente 1 apresentação, 1 entrega e 2 fechamentos. O resultado
tem defeitos sérios e conhecidos:

- 43 seções declaram intenção de demonstração e só 11 têm bloco de demonstração. As outras 32
  dependem de um vídeo que não existe.
- 76 das 102 seções de construção têm 2 blocos ou menos. São micro-seções de um encaixe só.
- Os três cursos usam gramáticas diferentes: Corre Dino tem 17 experimentações, o Desafio tem 5 em
  78 seções, e o Meu Jeito substituiu experiência por 26 perguntas de múltipla escolha.

Nosso trabalho é redesenhar a didática aula por aula, do zero, usando o v6 apenas como inventário
do conteúdo que a aula precisa cobrir.

## 2. A doutrina: dois eixos com regras opostas

Este é o conceito central. Errar aqui invalida a análise inteira.

### Eixo do Estúdio: nada de descoberta

Onde fica o bloco, em que categoria e subcategoria, onde encaixa, o que escrever em cada campo.
Aqui a narração conduz do primeiro ao último gesto. A criança **nunca** é mandada descobrir sozinha
onde está uma peça nem montar sozinha uma mecânica.

Antes do primeiro clique de um vídeo prático, diga qual parte do jogo a criança vai montar e por
que ela serve. Depois, conduza cada gesto em voz falada: categoria, subcategoria e seção quando
existirem, nome exato do bloco, destino do encaixe, campo e valor. Ao pegar outro bloco, repita o
caminho necessário, mesmo que a categoria já esteja aberta na tela: **"Ainda na categoria Áreas
do projeto, pega o bloco Enquanto estiver rodando"**, não **"Na mesma categoria, pega o outro"**.
Repetir esse caminho ajuda a criança a acompanhar a gravação sem se perder. O vídeo pode ser mais
longo para não omitir uma etapa; a fala continua simples e pausada. Essa regra é para montagem no
Estúdio, não para transformar a experiência conceitual em uma receita com resposta pronta.

Confira os valores reais do bloco atual antes de roteirizar. Se um campo já vem correto, mostre
o que ele significa e diga para deixar como está, sem mandar apagar e redigitar. Se aparecer um
aviso, abra e leia o aviso **antes** de consertar o campo que o fará sumir; use um erro que surge
de verdade, não simule um em outro bloco. Explique termos como **velocidade** antes de pedir o
número que a criança escreverá.

Decisão registrada em 01/08/2026 e refinada em 21/09/2026: o curso não manda descobrir interface
nem mecânica sem ensino prévio. Estão banidas as fórmulas "descubra sozinho" e "pausa o vídeo e
resolve". Depois do passo a passo, porém, cabe uma ponte curta como **"Agora é sua vez de montar"**:
ela encaminha para a ferramenta já aberta na seção, sem repetir a lista de blocos nem substituir a
instrução específica da atividade.

### Eixo do conceito: explicar e concretizar

Um conceito abstrato é explicado e em seguida vira algo que a criança vê mudar. A experiência
**não é uma prova nem uma descoberta sem ensino prévio**: é a metade concreta de uma explicação.
O vídeo explica a ideia, o motivo e uma analogia compreensível, mas não encena a mesma sequência
de controles nem antecipa os resultados observáveis que a experiência vai pedir para comparar.

Exemplo canônico: a aula explica o que são x e y, e logo depois a criança arrasta um controle de x
e um de y e vê o sprite mudar de lugar em tempo real. Ela não descobriu a coordenada, ela sentiu a
coordenada.

O conceito não precisa ficar misterioso no vídeo. O espaço de descoberta está em a criança
manipular o exemplo concreto, observar o efeito e conferir com os próprios olhos como a ideia
funciona. Se o clipe já reproduz o teste e anuncia cada resultado, a experiência vira repetição.

### A exceção: dor antes da solução

Existe um caso, e só um, em que a ordem inverte. Quando o conteúdo é um **problema no jogo da
criança**, o problema roda antes de a ferramenta aparecer. Exemplos: o rastro na tela antes de
"Limpar a tela"; a avalanche de inimigos antes do relógio; o contador de sprites subindo antes da
faxina; a nave saindo da tela antes do bloco que a segura na borda. Mostre o problema num estado
em que ele seja realmente visível: sem limpar, o rastro deixa desenhos antigos da nave na tela e
esconde a saída pela borda. Primeiro resolva o rastro; só então teste a borda sem a solução.
Na fala, conecte causa e necessidade antes da analogia e da ferramenta: o desenho antigo ficou,
precisamos apagá-lo para ver só a nave atual, uma lousa mágica ajuda a imaginar o gesto, e então
entra Limpar a tela.

Isso pertence ao eixo do Estúdio, não ao do conceito. E vale a regra de honestidade: **conferir se
a dor reproduz de verdade naquele jogo**. Encenar problema que a gravação não mostra quebra a
confiança da aula. Quando a dor não reproduz, as saídas em ordem de preferência são: trocar por
uma dor real do mesmo jogo; provocar o sintoma de propósito e dizer que está provocando; ou
ensinar honestamente explicando por que a peça fica mesmo sem sintoma visível.

## 3. Vídeo e experimentação: abstrato e concreto na mesma seção

A plataforma tem dois tipos de atividade interativa: `experimentation` e `html`. O formato antigo
de demonstração guiada foi removido; processo no tempo é ensinado pelo vídeo.

Na seção de conceito, o vídeo explica a ideia abstrata com exemplos e analogias do universo de quem
aprende. A experiência, na coluna ao lado, deixa a criança alterar algo e observar o efeito. Nenhum
dos dois bloqueia o outro: ambos estão disponíveis desde a abertura. A seção só conclui quando o
vídeo chega a 90% **e** a experiência é completada.

A instrução da experiência é uma fala breve do Zappy, junto aos controles. Ela propõe **o que
comparar e observar**, sem prescrever todos os cliques, tempos ou resultados. O passo a passo exato
fica nas pistas solicitadas; elas precisam guiar até cada meta obrigatória. O texto da instrução
precisa dar orientação suficiente para começar, sem obrigar a criança a abrir uma pista. A
descoberta concreta pode confirmar a ideia que o vídeo explicou, mas não deve repetir uma
demonstração idêntica que ela acabou de assistir.
O controle da cena também precisa corresponder ao conceito: para comparar o que acontece ao
**começar o jogo** com o que se repete **enquanto ele roda**, a criança monta as áreas e inicia a
partida uma vez; não precisa avançar quadros manualmente. Uma demonstração automática para no
limite observável da cena (no piloto, quando a nave sai) ou após um tempo curto e limitado quando
não há deslocamento espacial. Trocar a montagem prepara uma nova partida sem apagar descobertas.
O HUD dessa comparação destaca só **Ações feitas**; "passo" e quantidade de personagens desviam
do que a criança está investigando. A cena não repete o mesmo contador sob outro nome.
Uma pergunta final só permanece quando pede uma interpretação nova; se repete o palpite ou a
observação que a criança acabou de fazer, deve sair.

Uma experiência só existe quando materializa a relação central do conceito. Operação de interface,
vocabulário simples ou algo que já fica concreto no próprio projeto não ganha uma cena artificial.
Quando o conceito é apenas um processo a observar, o vídeo resolve.

### Palpite antes da experiência

Palpite não é pedágio. Use somente quando registrar uma hipótese ajuda a confrontar uma concepção
comum ou um resultado contraintuitivo. Não use em toda cena, nem para perguntar qual botão apertar.

Quando existir, a tela do palpite contém apenas contexto, cena parada, pergunta e alternativas. Os
controles não aparecem, nem desativados. A escolha não vale nota e a retomada compara de modo
neutro: **"Seu palpite: … Ao testar: …"**, sem "acertou" ou "errou".

Na experimentação, a região visual reúne HUD, nome e cena. No painel estreito, logo abaixo da
cena, uma fala curta do Zappy apresenta a ação; a pista solicitada e os controles vêm em
seguida. Abaixo do vídeo, outro diálogo curto do Zappy pode fazer a ponte narrativa para a
experiência, sem repetir a instrução específica. Não acrescentar uma segunda instrução genérica
embaixo da fala dentro da experiência; os controles têm rótulos próprios, e a ajuda para usá-los
fica nas pistas ou na descrição acessível. Palpite retomado, conclusão e situação alcançada
aparecem depois da área de ação.
A ordem de leitura é a mesma no celular e no layout lado a lado.

### Layout adaptativo e ampliação da experiência

Ao aumentar a área da experiência pela divisória da aula, o layout se adapta automaticamente:
havendo espaço confortável, HUD e cena ficam à esquerda; instrução, controles e retorno ficam à
direita. A decisão considera a largura do **painel**, não apenas a da janela. Ao diminuir o
painel, as regiões voltam a ficar empilhadas. Vale tanto para o palpite quanto para a exploração.
Se a bancada for longa, ela rola sem levar a cena junto.

A experiência também oferece **Ampliar experiência**, como o Estúdio. É uma opção de
concentração, não um requisito para concluir a atividade ou conseguir o layout lado a lado.
O botão **Voltar à aula** permanece acessível; Escape também sai. Ampliar e voltar não reiniciam
ações posicionadas, contadores, seleção, execução ou descobertas. Redimensionar o painel também não.

Em painel estreito, janela muito baixa ou com zoom alto, as regiões continuam empilhadas.
Não reduzir fonte nem cortar conteúdo para prometer ausência de rolagem. Palcos simples se
ajustam à altura disponível sem distorção; comparações com legendas preservam o espaço necessário
à leitura.

Os cartões arrastáveis se adaptam à largura da bancada, não à largura da janela. Na experiência
de áreas do projeto, a criança lê **Ações disponíveis**, como no conceito ensinado; "ficha" é só
uma descrição interna da peça visual. Rótulos compridos quebram linha,
o contador fica separado e a bandeja de ações disponíveis não disputa uma coluna de mesmo
tamanho com as áreas de execução. Clicar ou usar teclado continua sendo alternativa ao arrasto.

## 4. As seis perguntas, uma vez por conceito

Não existe molde. As respostas variam de aula para aula e de conceito para conceito. Para **cada
conceito** que a aula ensina, responda e justifique:

1. Esse conceito é abstrato a ponto de precisar virar concreto, ou a explicação já basta?
2. Se precisa, existe uma relação que a criança consegue manipular numa experimentação?
3. O que o vídeo precisa explicar antes ou enquanto a experiência torna concreto?
4. A concretização vem antes ou depois da explicação?
5. Ela vem antes ou depois de a criança montar aquilo no Estúdio?
6. Isso é uma seção ou mais de uma?

Muitos conceitos respondem "não precisa de nada". Vocabulário (a palavra sprite), operação de
interface (confirmar um campo, clicar na área do jogo) e qualquer coisa que a criança testa
imediatamente no próprio jogo dela (as setas moverem a nave, a borda segurar) **não ganham cena**.
Gastar cena com isso é o que produziu o excesso de seções do v6.

## 5. Regras de seção

Não são molde, são pisos de qualidade:

- **Toda seção começa pelo contexto, não pelo clique nem pelo termo novo.** A primeira fala
  retoma o que a criança acabou de construir, ver ou descobrir; nomeia o problema ou a pequena
  conquista que vem agora. Só então entra a analogia, a explicação ou o primeiro caminho de
  paleta. Em uma seção de teste, diga o que será conferido antes de pedir o primeiro clique.
  Contexto é uma ligação concreta com o jogo da criança, não uma abertura genérica repetida.
- **Explique a palavra nova antes de usá-la num caminho da paleta.** Se a criança vai ouvir
  "Sprites" ou "Desenhar o sprite" pela primeira vez, ligue primeiro essa palavra a algo que
  ela já criou ou viu. Não deixe a definição para a seção seguinte nem repita depois que ela
  já foi apresentada.
- **Não esconda o efeito que está ensinando.** Se um cenário pinta o canvas inteiro a cada
  quadro, ele pode apagar visualmente o rastro mesmo sem o bloco Limpar a tela. Para ensinar a
  limpeza, deixe a criança ver o rastro sobre um fundo liso, coloque Limpar a tela e repita o
  mesmo movimento antes de adicionar um cenário que cobre a tela. Na conferência final, verifique
  também a ordem dos blocos; a aparência do cenário sozinha não prova que a limpeza está certa.
  Essa sequência visual é uma decisão de autoria, não uma fala a repetir para a criança: no
  vídeo, apresente cada ação pelo que ela faz no jogo, sem frisar que o fundo ainda é liso.
- **Abertura apresenta, não cobra observação.** O primeiro vídeo mostra o jogo e anuncia o
  que a criança vai construir. Não peça “repara”, “confere” ou uma comparação de efeito
  que ela ainda não produziu; guarde essa observação para o vídeo conceitual, a experiência
  ou o teste depois da montagem. Uma amostra do resultado pode aparecer como convite,
  sem exigir análise de detalhes naquele momento.
- **Encaixe não é seção.** Uma sequência de gestos sem conceito novo agrupa na vitória que produz.
- **Conceito e sua concretização ficam juntos.** São uma ideia, e partir ao meio obriga a criança a
  atravessar uma divisória no meio de um pensamento.
- **Um vídeo por seção, no máximo.** Se há dois assuntos que pedem vídeos independentes, a seção
  está misturando ideias e precisa ser redesenhada.
- **Vídeo não bloqueia atividade.** Vídeo e experiência ou ferramenta aparecem juntos. A conclusão
  exige 90% do vídeo e a conclusão da atividade.
- **Zappy é intervenção pontual.** Em seção de conceito, a ponte breve sob o vídeo liga a
  analogia à experiência, e a fala dentro da experiência diz a tarefa concreta perto dos
  controles. São funções diferentes; não repetir o mesmo comando. Fora da experiência, não
  acrescentar uma terceira instrução. Em construção, a fala pode resumir o que o vídeo mostrou
  e convidar a montar, sem recontar o passo a passo.
- **Quiz tem seção própria.** Ela contém somente uma fala curta do Zappy apresentando o que será
  feito e o quiz. Não leva vídeo, experiência, ferramenta ou texto, e vem antes da entrega ou teste
  final da aula.
- **Dor e ferramenta ficam separadas, nessa ordem.** A dor precisa fechar sozinha.
- **Uma vitória visível por aula, no mínimo.** A criança termina com algo novo acontecendo na tela
  dela. Se a aula é de mecânica invisível, ou ela ganha um instrumento que se vê (um medidor, um
  raio-X), ou a vitória é explicada com todas as letras.
- **O estado do projeto ao fim da aula é exatamente o que a aula seguinte assume.**

### Caderno do curso: regra para os próximos cursos

Todo curso infantil tem um caderno para consulta. Na **primeira aula**, a seção 1 apresenta o curso
e a **seção 2 apresenta o caderno**, antes da primeira atividade. Não é preciso criar uma aula de
boas-vindas só para o PDF. O Desafio do Primeiro Jogo já tem uma apresentação própria do caderno;
nos cursos seguintes, aplicar esta regra na Aula 1.

A seção tem intenção `material`, um vídeo curto que mostra onde o caderno fica e como usá-lo, e um
bloco `materials` com o PDF logo abaixo. A conclusão depende de assistir a 90% do vídeo. O
download fica disponível, mas não é obrigatório para avançar. O arquivo real é vinculado no admin;
o manifesto declara o bloco com `items: []`. Gravar o vídeo depois de anexar o PDF, mostrando uma
página verdadeira do caderno. Registrar a seção no relatório, no manifesto e no roteiro da aula.

## 6. Regras de língua e de execução (herdadas, obrigatórias)

- Português brasileiro com acentuação correta.
- **Travessão zero.** Exclamação pontual, 3 a 5 por aula, só nos picos.
- Linguagem falada, não escrita. Proibido "o objetivo de hoje é este".
- Na narração, começar pela situação que a criança consegue imaginar ou reconhecer. Se a analogia
  mudar de contexto, apresentá-lo antes: "Imagina que você quer fazer um desenho no papel" vem
  antes de falar em papel e lápis. Ligar a analogia ao jogo antes de nomear o termo do Estúdio.
- Cada "isso", "essa parte" ou "essas instruções" precisa apontar para algo já mostrado ou dito.
  Evitar definições com dois-pontos, frases telegráficas e enumerações que soam como documento.
  Ler a fala em voz alta e trocar por frases que mantenham o "você" na conversa.
- "o jogador" para a ação de jogar, "você" para falar com a criança.
- **Nunca chamar o aluno de criança na fala.** A turma vai de 8 a 15 anos. Use "os outros
  criadores", "alguém daqui".
- **Linguagem literal.** Muitos alunos leem ao pé da letra: nada de idiomatismo nem metáfora não
  marcada. Comparação anunciada ("é tipo", "é como") pode e funciona bem.
- Rótulo literal do bloco, nunca parafraseado. Caminho completo (categoria, subcategoria, bloco) na
  primeira menção.
- Âncora em todo encaixe. Nunca "dentro do Ao iniciar"; sempre "dentro do Ao iniciar, logo acima do
  Ir para a tela".
- **Nomear a ação real da interface.** Na prévia do Estúdio existem **Reproduzir** e **Atualizar**;
  para reiniciar um teste, apontar **Atualizar**, não mandar recarregar a página inteira. Não inventar
  um Play em outra tela nem dizer apenas "roda o jogo" sem mostrar onde agir.
- Sem vocabulário de outro jogo (nada de nave e asteroide num curso de dino).
- Usar o vocabulário canônico: relógio (timer), faxina (culling), medidor, camadas, estados do
  jogo, sorteio, apelido, embrulhar no Se, quadros de invencibilidade, HUD, área de colisão.

## 7. Fontes a ler para cada aula

Para os Dias 1 a 5 de **Nave Contra Asteroides** (antigo Desafio), ler primeiro os roteiros originais em
`C:\Users\tocha\Documents\fluxo-criativo\meus-produtos\desafio-primeiro-jogo\entregas\videos\roteiro-aula-diaN-desafio-primeiro-jogo.md`.
Eles são a fonte da sequência de raciocínio, dos exemplos e das analogias. Não são referência
para os nomes atuais da paleta, os valores corrigidos, o comportamento do jogo nem a estrutura
nova de seções. Introdução e certificado têm percurso próprio e não entram nessa regra.

Por aula, na referência histórica `C:\Users\tocha\projects\sistema-zero\docs\aulas-interativas-legado\{curso}-v6\{aula}\`:

- `roteiro.md` — o percurso v6, a fala revisada daquela versão, o trecho gravado e as instruções
  de montagem. Leia inteiro; em Nave Contra Asteroides, confronte-o com o roteiro original acima antes de
  aproveitar qualquer explicação ou analogia.
- `manifesto.json` — a estrutura importável: seções, intenções, blocos, critérios de conclusão.
- `montagem.json` — o mapa dos clipes: arquivo de origem, primeira e última fala, o que editar.
- `configuracao-estudio.json` — só nos antigos dias do Desafio, hoje Nave Contra Asteroides: blocos liberados, chain, vitrine.

No nível do curso:

- `{curso}-v6/README.md` — decisões por aula e continuidade entre aulas.
- `{curso}-v6/blocos-por-aula.json` — os blocos do Estúdio usados em cada aula, com caminho completo
  na paleta atual.

Referências transversais:

- `CATALOGO-CENAS.json` (nesta pasta) — as 56 cenas que existem hoje, com título, instrução, o que
  manipulam, metas, pistas e roteiro de demonstração.
- `sistema-zero/docs/orientacao-cursos-jogos.md` — a pedagogia oficial e o dicionário canônico.
- `fluxo-criativo/meus-produtos/comunidade-dos-criadores/entregas/cursos/MOLDE-ROTEIRO-AULA.md` — o
  molde de roteiro e o checklist de conformidade.

## 8. Formato de saída obrigatório

Um arquivo markdown por aula, em `aulas/{curso}-{aula}.md`, com esta estrutura exata:

```markdown
# {Curso} · {Aula} · {Título proposto}

## Resumo
- Estado de entrada: {o que o projeto da criança já tem quando a aula começa}
- Vitória do dia: {o que fica novo na tela dela}
- Seções hoje: {N} · Seções propostas: {M}
- Clipes hoje: {N} · Clipes propostos: {M}

## Triagem dos conceitos
| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
(uma linha por conceito, incluindo os que NÃO ganham nada, com a justificativa)

## Diagnóstico do desenho atual
(o que está errado hoje, item a item, com a seção citada pelo título)

## Proposta final

### Seção 1. {título voltado para a criança}
- **Intenção:** apresentação | conceito | construção | dor | entrega | fechamento
- **Por que existe:** {uma frase}
- **Conclui quando:** {critério}
- **Blocos:**
  1. `{tipo}` — {conteúdo integral ou resumo fiel do que o bloco traz}
  2. ...

(repetir para todas as seções)

## Experiências e demonstrações desta aula
Para cada uma:
- **Cena:** `{id}` — {título}
- **Situação:** já existe e serve | já existe e precisa de ajuste | precisa ser criada
- **Se precisa de ajuste:** qual ajuste, e por quê
- **Se é nova:** especificação completa (ver seção 9)
- **Elenco/cenário:** {cast e cenario a usar}
- **Metas cobradas nesta aula:** {ids das metas}

## Vídeos
| Chave | O que mostra | Origem | Duração alvo | Reaproveita gravação? |

## Continuidade
- O que esta aula assume da anterior
- O que esta aula entrega para a seguinte
- Valores canônicos que saem daqui
```

## 9. Especificação de cena nova

Quando propor uma cena que não existe, entregue:

- **Id sugerido** (kebab-case, em inglês, no padrão dos 45 existentes)
- **Título** visível para a criança, em português
- **O conceito abstrato** que ela torna concreto, em uma frase
- **Tipo:** experimentação; se for apenas processo a observar, use um vídeo em vez de criar cena
- **O que a criança manipula** (os controles exatos, com faixas de valor quando houver)
- **Como o palco começa**
- **Metas** (id, rótulo que aparece quando cai, pedido que a faixa mostra)
- **Pistas**, uma por vez, em ordem crescente de entrega
- **Palpite, se houver:** qual crença útil ele testa, pergunta conceitual e alternativas; a
  criança pode manipular mesmo sem responder
- **Pergunta final, se houver:** qual interpretação nova ela pede e por que não repete o palpite
- **Frase de sucesso**
- **Vídeo de apoio:** ideia abstrata, exemplo próximo da criança e ponte para a experiência,
  sem narrar os comandos da bancada
- **Quais outros cursos e aulas também usariam essa cena**, porque cena que serve um lugar só é cara

## 10. Princípios de julgamento

Quando estiver em dúvida, decida por estes, nesta ordem:

1. **A criança entende de verdade**, e não apenas avança na tela.
2. **Menos seções com mais substância**, sempre que o conceito não se perder.
3. **Reaproveitar cena que já existe** antes de propor cena nova, mas nunca forçar uma cena cujo
   foco não bate com o conceito da seção.
4. **Um vídeo de apoio por conceito com experiência**, sem duplicar a instrução dos controles.
5. **Encantamento conta.** Esta é uma aula para alguém de 8 a 15 anos que quer fazer um jogo. O
   texto tem que ser gostoso de ler e a seção tem que dar vontade de continuar.
