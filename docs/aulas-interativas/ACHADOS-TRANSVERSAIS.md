# Achados transversais do redesenho

> Coisas descobertas durante a análise das aulas que **não** eram parte do redesenho didático, mas
> precisavam de ação de alguém.
>
> ✅ **Tudo que dependia do catálogo de cenas foi resolvido em 19/09/2026.** As 11 cenas novas foram
> construídas, as metas que faltavam foram criadas, os quatro ids duplicados foram removidos, e os
> 27 manifestos passam no validador com zero avisos. O catálogo tem **56 cenas e 189 metas**.
>
> ⚠️ **Este arquivo é um registro do que foi encontrado, na ordem em que apareceu.** Várias seções
> descrevem o estado de antes e continuam escritas no presente. Onde isso confunde, há uma marca de
> resolvido. A fonte da verdade sobre cenas é [cenas/RELATORIO-CENAS.md](cenas/RELATORIO-CENAS.md) e
> o `CATALOGO-CENAS.json`, reextraído do código.
>
> **Atualização de 20/09/2026:** os GRAVE 2 e 3 abaixo descrevem o estado anterior, não uma
> pendência dos manifestos redesenhados. Nas Aulas 1 a 3 do Corre Dino, as dez seções de aplicação
> têm `workspaceKey` e `completion.projectChecks`; o serviço de progressão usa esses critérios
> mesmo com `blockIds` vazio. As oito cenas dessas aulas estão com `required: true`. A auditoria
> dos 53 usos de cena está em `AUDITORIA-CENAS-E-CONTINUIDADE-2026-09-20.md`. Continuam exigindo
> produção ou revisão os cadernos, as falas gravadas com rótulos antigos e o ensaio com crianças.

## ✅ RESOLVIDO AO CONTRÁRIO. GRAVE 1: a acessibilidade sai do Corre Dino

**Decisão de produto da dona, 20/09/2026.** A inconsistência era real, e o conserto que este
relatório propôs era o inverso do certo.

O que a análise achou: o bloco `Descrever o jogo para leitor de tela` **não existia em nenhuma
seção do v6**, e a Aula 2 tinha na entrega o critério "Mantenha a descrição do jogo em Ao iniciar".
Quem fizesse a Aula 1 como estava **não conseguia entregar a Aula 2**. As provas convergiam:

- O fecho da Aula 1 recapitulava quatro passos, e a abertura mandava gravar três.
- O clipe `video-tela-v7` termina em "O terceiro é rapidinho.", e não havia quarto.
- O `retireBlockKeys` do manifesto aposentou de uma vez `video-descricao-demo-v7`,
  `orientacao-descricao-v7`, `video-descricao-criar-v7` e `experiencia-leitor-de-tela`.
- A fala gravada da Aula 2 diz "Foram três blocos" ao arrastar a borda, o que só era verdade com a
  descrição na pilha.

**O redesenho concluiu errado.** Ele restaurou o passo e a cena `screen-reader` na Aula 1. A dona
decidiu o contrário: a descrição do jogo para leitor de tela é um conceito complexo demais para o
primeiro curso da trilha, e o resultado dele não muda nada na tela de quem está aprendendo. Nos
primeiros cursos, quem aprende precisa ver a criação tomar forma. Acessibilidade pode virar um curso
bônus mais para a frente. **Neste curso não se fala disso.**

**Tira-se a cobrança, não se restaura o passo.** O que foi feito em 20/09/2026:

| Aula | O que saiu |
|---|---|
| 1 | O bloco `Descrever o jogo para leitor de tela` do passo a passo, a cena `screen-reader`, o clipe do gesto, as falas, os dois critérios de projeto. A aula voltou a ter **três passos**, e o fecho diz três. A pilha do `Ao iniciar` entrega **três blocos** |
| 2 | O critério de entrega "Mantenha a descrição do jogo em Ao iniciar", nos dois lugares em que aparecia. A fala dos blocos arrastados passou de **três para dois**, porque a pilha da Aula 1 encolheu |
| 13 | A revisita da cena `screen-reader`, a seção que levava a correção ao projeto, o clipe e o critério `descricao-final` |
| 3 a 6, 8 | Menções ao bloco nos estados de entrada e nas notas ao professor |

A cena `screen-reader` continua existindo no catálogo e serve a outro curso. **Ela não volta para o
Corre Dino.** Uma busca por `screen-reader`, "leitor de tela" ou "Descrever o jogo" nos 13 pares de
arquivos do curso volta vazia, de propósito, e o vocabulário fica guardado aqui, neste registro.

## GRAVE 2. Nenhuma seção de construção do Corre Dino 1 a 3 conclui nada

No manifesto, as **11 seções de construção dessas três aulas estão com a lista de conclusão vazia**
e nenhuma carrega bloco de Estúdio. Os critérios estão escritos no roteiro e ligados a lugar
nenhum. Na prática, a primeira conferência do dia é a entrega, no fim da aula. A criança monta
quatro ou cinco seções sem nenhum retorno.

Conferir se o mesmo vale para as outras aulas do curso antes de importar qualquer manifesto.

## GRAVE 3. Cenas obrigatórias marcadas como opcionais

Quatro das seis cenas das Aulas 1 a 3 (`world`, `layers`, `gravity`, `impulse`) estão marcadas
como opcionais, sendo cada uma o **único critério de conclusão da sua seção**. A seção fecha sem a
criança ter feito a atividade que a define.

## PADRÃO SISTÊMICO. Critérios que reprovam quem aceita o convite da aula

Três ocorrências em cursos e aulas diferentes, o que indica causa comum no gerador e não descuido
pontual. O vídeo convida a experimentar uma faixa, e o critério exige um valor exato.

| Onde | O convite | O critério | Correção proposta |
|---|---|---|---|
| Corre Dino, Aula 3 | testar a força do pulo entre 12 e 18, e a referência registra o campo como escolha da criança | exige exatamente 14 | aceitar a faixa |
| Corre Dino, Aula 13 | campos livres entre -7 e -14, e entre 2 e 10 segundos | crava -9 e 5 s | aceitar a faixa, já que não há Aula 14 para quebrar |
| Corre Dino, Aula 5 | a narração manda usar -5 | o bloco nasce com -3 e a troca só vem duas seções depois | corrigir o critério ou antecipar a troca |
| Corre Dino, Aula 10 | a referência do curso lista a área de colisão como campo livre de 70 a 85 | a entrega exige `PERCENT: 80` exato | aceitar a faixa |
| Corre Dino, Aula 4 | a fala convida a escolher o efeito sonoro (`quicar`, `zunido`) | três critérios travam `FX: jump` | tirar o campo do critério |
| Corre Dino, Aula 4 | a Aula 3 declarou a força do pulo numa faixa de 12 a 18 | a entrega da Aula 4 exige `JUMP: 14` | tirar o campo do critério. **Quem escolheu 16 na Aula 3 reprovava uma aula depois** |

| Corre Dino, Aula 11 | a tabela de campos livres oferece 0,5 e 3 para o relógio dos pontos | `relogio-pontos` cravava `SECS: 1`, e a entrega da Aula 13 revalidava o mesmo relógio | campo fora do critério nas três seções |
| Corre Dino, Aula 13 | o limite da velocidade é escolha da criança | o quiz tratava `-9` como fato | a pergunta passa a dizer "no exemplo do vídeo" e "o limite que você escolheu" |

São **oito ocorrências** em seis aulas. O padrão é claro o bastante para virar regra de geração, não
correção caso a caso.

**Correção adicional na revisão de 20/09/2026:** a Aula 7 ainda exigia `JUMP: 14` em dois critérios
`proteger-controle`, embora a força do pulo pudesse ter sido escolhida entre 12 e 18 na Aula 3.
As duas exigências foram retiradas do manifesto novo. A posição do controle e o sprite `dino`
continuam conferidos. Esta ocorrência reforça que a auditoria precisa atravessar aulas posteriores,
não só a aula em que o campo livre foi apresentado.

### ✅ RESOLVIDA. A pendência de decisão humana do `descricao-final`

Na Aula 13 do Corre Dino, o critério `descricao-final` comparava a frase de descrição **letra por
letra**, enquanto o vídeo convidava a criança a escrever outra. A recomendação era afrouxar o
critério para conferir só que os três jeitos de pular estavam nomeados.

**A decisão de 20/09/2026 dispensou o critério inteiro:** com a acessibilidade fora do curso, não há
frase a revisitar nem critério a afrouxar. O `descricao-final` saiu da Aula 13.

## ✅ RESOLVIDO. O catálogo de cenas mudou durante este trabalho

Uma frente paralela implementou as correções em 19/09/2026, citando este relatório. **O trabalho de
cenas está concluído:** as 11 novas existem, as metas que faltavam foram criadas, e o catálogo tem
**56 cenas e 189 metas**.

O que está abaixo desta linha era o estado intermediário, quando só parte estava pronta. Fica como
registro de como a coisa evoluiu.

⚠️ **Parte dos ajustes pedidos já foi feita**, e alguns com id diferente do que os relatórios
propuseram. Confirmados até agora:

| O relatório pediu criar | Já existe como | Onde |
|---|---|---|
| `with-timer` | **resolvido:** a cena teve dois ids para esta descoberta e hoje tem um só, `with-timer`, na missão de fábrica | `spawn` |
| `still` | **`stopped`** | `velocity` |
| `rule-removes` | **resolvido:** a cena teve dois ids para esta descoberta e hoje tem um só, `rule-removes`, na missão de fábrica | `cleanup` |
| `fill-ignores-mirror` | já existe com o mesmo id, rótulo e pedido | `symmetry` |
| `same-frames` | já existe com o mesmo id, rótulo e pedido | `frames` |

E o inverso também acontecia: seis metas que os relatórios tratavam como existentes não existiam.
**Todas foram criadas:** `two-sides` e `axis-decides` na `symmetry`, `ghost-on` na `onion-skin`,
`only-fill` na `fill-stroke`, `stairs` e `smooth` na `pixel-vector`.

Enquanto elas não existiam, os manifestos das aulas afetadas ficaram sem declarar lista de metas.
**Isso foi desfeito:** as aulas 1 a 4 do Meu Jeito hoje declaram os subconjuntos certos, porque
descobriu-se que meta nova criada como meta de caso não entra sozinha na missão de fábrica.

⚠️ **Uma medição minha estava errada, e vale registrar.** Numa primeira auditoria eu afirmei que
faltavam metas em `symmetry`, `onion-skin`, `fill-stroke`, `pixel-vector`, `gravity`, `draw-loop`,
`random` e `cleanup`. Era erro do extrator que eu tinha escrito, que perdia metas cujos campos
vinham em ordem diferente ou com campos extras. Refeito com casamento de chaves, não faltava
nenhuma. Quem for auditar de novo: use o `CATALOGO-CENAS.json` reextraído, não uma leitura própria
do fonte.

## ✅ RESOLVIDO. Cenas do catálogo com defeito próprio

As quatro foram corrigidas. A tabela fica como registro do que estava errado.

| Cena | O problema, e o que foi feito |
|---|---|
| `hitbox` | Estava com a lista de metas **vazia** e não cobrava nada. Ganhou `contact`, `area-contrast` e `too-small` de fábrica, mais `early-hit` e `fair-hit` como metas de caso. O palco abre em 100%, e o outro extremo do dial entrou, sem o qual a cena ensinaria que "menor é sempre melhor" |
| `variable` | Existia, correta, e nenhuma aula usava. **Ligada na Aula 11 do Corre Dino.** A troca de "Três acertos" por "Três segundos" que eu recomendei **não foi feita, e não devia ser:** a frase vive no roteiro de demonstração, a Aula 11 usa experimentação, e a frase nunca aparece ali |
| `score` | Cobrava 2 metas onde o roteiro descrevia 4. Hoje tem cinco de fábrica mais duas de caso |
| `screen-reader` | Tinha sido descartada junto com o passo perdido da Aula 1. Foi restaurada com a meta `says-all-controls`, e em 20/09/2026 **saiu de novo, por decisão de produto** (ver GRAVE 1). A cena e a meta continuam no catálogo, sem aula do Corre Dino apontando para elas |

**Regra a travar:** todo campo declarado livre pela aula tem critério em faixa, nunca em valor
exato. E todo campo com critério exato é dito na fala como valor fixo, sem convite a experimentar.

## Bugs de material que quebram a aula hoje

| # | Onde | O problema | Ação |
|---|---|---|---|
| 1 | Corre Dino, Aula 5, seção *Monte os dois ritmos do jogo* | O manifesto exige `VX: -5`, mas o bloco nasce com -3 e a troca só acontece duas seções depois. Quem segue a narração e aperta Conferir **não passa**. | Corrigir o critério ou antecipar a troca do valor |
| 2 | Corre Dino, Aula 13, critérios de entrega | Os critérios cravam -9 e 5 s, mas a tabela de campos livres oferece -7/-14 e 2/10. Quem aceitar o convite do vídeo **reprova**. | Recomendação: manter os campos livres (não há Aula 14 para quebrar) e afrouxar o critério para faixa |
| 3 | Corre Dino, Aula 13, âncora de encaixe | A âncora afirma que `Mudar o estado do jogo para` é o último bloco do `Ao iniciar`. Não é desde a Aula 10, quando `Usar área de colisão de 80%` passou a ser o último. | Corrigir a âncora |
| 4 | Corre Dino, Aulas 12 e 13, falas gravadas | As falas citam endereços de paleta que não existem na edição atual: "Mira e contas", "Tempo e repetição", "a tela atual é", "Ir para a tela". | Os rótulos corretos estão nos dois arquivos de redesenho. Regravar ou substituir a fala |

## ⚠️ ABERTO. Os cadernos do aluno estão na nomenclatura antiga

Descoberto em 20/09/2026, ao migrar as referências. **É o material que o aluno lê enquanto monta**,
e é o único desta lista que chega direto na mão dele.

Os dois cadernos estão igualmente defasados: `cursos/o-jogo-do-meu-jeito/caderno/` (20 ocorrências)
e `cursos/corre-dino/caderno/`, este com `📦 Muitos`, `📺 Telas e cenas` e `✨ Aparência`.

O caso pior é uma instrução que manda **abrir a subcategoria "Muitos"**, que não existe mais. Não é
só nome errado: manda procurar uma parte da paleta que sumiu.

**O impedimento que eu tinha registrado aqui não existia.** Eu escrevi que o chip `class="tag"`
tinha um nível só e que faltava decidir como caberiam quatro. Medido em 20/09/2026, os 23 chips do
caderno do Meu Jeito já carregam **dois** degraus (`Jogo 2D · Sprites`, `Jogo 2D · Muitos`), e três
cabem na mesma linha (`Jogo 2D · Sprites · Animação`), que é o que serve para achar o bloco. Não há
decisão de desenho pendente: é passada de conteúdo, conferindo bloco a bloco no JSON de referência.

**Em andamento desde 20/09/2026** no caderno do Meu Jeito. O do Corre Dino continua na fila.

A tabela linha a linha de cada resolução, para a passada virar mecânica, está no relatório da
migração e no próprio caderno do Meu Jeito.

## Documentação desatualizada

| # | Arquivo | O problema | Ação |
|---|---|---|---|
| 1 | `cursos/corre-dino/referencia-blocos-corre-dino.md` | O som da Aula 4 ainda aparece como `Tocar som de pulo` em Kits prontos › Dino. Esse bloco **não existe mais no Estúdio**. Por decisão de produto de 20/09/2026, o Estúdio está certo e quem muda é a aula: o `Tocar efeito` com a opção `pulo`, em Jogo 2D › Som › Efeitos prontos, deixou de ser troca opcional e virou o caminho principal desde o primeiro encaixe. Os manifestos e os relatórios das 13 aulas já não citam o bloco aposentado. | Atualizar o rótulo e o caminho |
| 2 | `cursos/corre-dino/referencia-blocos-corre-dino.md` | O documento se contradiz sobre quando o medidor sai: as seções 2.5 e 5 dizem Aula 7, a tabela da seção 7 diz passo 4 da Aula 6. O README do v6 confirma que sai na Aula 6. | Corrigir para Aula 6 nas três seções |
| 3 | `docs/orientacao-cursos-jogos.md`, seção 6.3 | A regra "o curso não tem exercício" está escrita de um jeito que parece proibir as experiências de cena. Ela governa o eixo do Estúdio (onde está o bloco, como montar), não o eixo do conceito. | Reescrever separando os dois eixos, conforme o BRIEFING deste projeto |
| 4 | `docs/orientacao-cursos-jogos.md`, seção 1 | Não menciona a extensão Mundo 3D (`world-3d`), que existe, tem 10 exemplos e é usada no nível 5. | Acrescentar a linha |

## Material redundante a remover

| # | O quê | Por quê |
|---|---|---|
| 1 | `docs/aulas-interativas-legado/interacoes/coordenadas.html` | Superada pela cena nativa `coordinates` |
| 2 | `docs/aulas-interativas-legado/interacoes/pixel-vetor.html` | Superada pela cena nativa `pixel-vector` |
| 3 | `docs/aulas-interativas-legado/interacoes/quadros.html` | Superada pela cena nativa `frames` |
| 4 | `docs/aulas-interativas-legado/interacoes/telas-pontos.html` | Superada pelas cenas nativas `game-state` e `score` |
| 5 | `docs/aulas-interativas-legado/interacoes/velocidade-limite.html` | Superada pela cena nativa `velocity` |

As cinco nunca entraram nos manifestos v6. O README da pasta afirma que estão incorporadas, o que
vale para o pacote histórico e não para as revisões atuais.

## Decisões pedagógicas que voltaram atrás sem registro

| # | Onde | O quê |
|---|---|---|
| 1 | Corre Dino, Aula 5 | A montagem da avalanche (a maior dor do curso) foi trocada por vídeo, com a justificativa de que "a criança ainda não copia esta pilha". Isso contraria a inversão consciente de degrau registrada na referência do curso, e faz a criança receber a solução de um problema que nunca teve. O redesenho devolve a montagem: dos quatro blocos, só um muda de lugar. |
| 2 | Corre Dino, Aula 6 | A honestidade da provocação está no trecho gravado e sumiu da nota de tela. O redesenho exige mostrar o medidor em 1.4 subindo devagar **antes** de baixar para 0.1, para a criança não achar que o acúmulo é invenção do 0.1. |

## Conteúdo duplicado entre seções

| # | Onde | O quê |
|---|---|---|
| 1 | Corre Dino, Aula 5 | As seções *Veja onde o cacto começa* e *Faça o cacto entrar pela direita* transcrevem literalmente o mesmo trecho de origem (Parte 4, Passo 4). Viraram uma no redesenho. |
| 2 | Corre Dino, Aula 7 | Seções 4 e 6 são o mesmo clipe descrito duas vezes. |
| 3 | Corre Dino, Aula 8 | Seções 2 e 3 são o mesmo clipe; seções 4 e 6 também. |
| 4 | Corre Dino, Aula 9 | Seções 2 e 3 carregam o mesmo trecho na íntegra. |

Somando com a Aula 5, são **seis seções que são três clipes descritos duas vezes**. Isso explica
parte do inchaço de 281 seções.

## Promessas para a frente, contra a regra do curso

A regra do molde diz que promessa feita é promessa cobrada, e que a aula não antecipa o que ainda
não existe.

| # | Onde | O quê |
|---|---|---|
| 1 | Corre Dino, Aula 7 | A entrada promete o estado `fim` duas aulas antes de ele existir |
| 2 | Corre Dino, Aula 8 | A fala da pecinha de texto promete a Aula 11 |
| 3 | Corre Dino, Aula 8 | Sobreviveu ao próprio corte: a aula ainda afirma "no celular não existe teclado nenhum", que a nota de montagem da mesma seção manda retirar |

## Falas gravadas que citam rótulos e endereços que não existem mais

Este é o achado mais repetido, e vale para os três cursos. A paleta 1.0 renomeou blocos e
reorganizou categorias, e a narração gravada ficou para trás. Em vários casos a mudança é **ganho
didático**, porque o bloco passou a dizer a mesma palavra que a aula ensina.

| Onde | Falado no vídeo | Como é hoje |
|---|---|---|
| Corre Dino, Aulas 7 a 9 | `Ir para a tela` | `Mudar o estado do jogo para` |
| Corre Dino, Aulas 7 a 9 | `a tela atual é` | `o estado do jogo é __ ?` |
| Corre Dino, Aulas 7 a 9 | categoria "Telas e cenas" | Jogo 2D › Jogo e telas › Telas e partida |
| Corre Dino, Aulas 12 e 13 | "Mira e contas", "Tempo e repetição" | rótulos corretos nos arquivos de redesenho |
| Corre Dino, Aula 4 | `Tocar som de pulo` em Kits prontos › Dino, bloco que não existe mais | `Tocar efeito` com a opção `pulo`, em Jogo 2D › Som › Efeitos prontos, como caminho principal desde o primeiro encaixe |
| Corre Dino, Aula 9 | `Soltar explosão no sprite` no Kit espaço | está em Desenho e efeitos › Partículas. A frase sobre reaproveitar bloco de outro kit perde o sentido |

## Conferências que não detectam o que prometem

| # | Onde | O problema |
|---|---|---|
| 1 | Corre Dino, Aula 7 | O aviso "se apareceu cacto, volta no relógio" descreve algo impossível: com o miolo do quadro embrulhado, o cacto do relógio desprotegido nasce, não é desenhado e não anda. O acúmulo é mudo. O instrumento certo é o Conferir, e a prova pertence à cena |

## Remissões entre aulas a conferir

| # | Onde | O quê |
|---|---|---|
| 1 | Corre Dino, Aulas 6 e 11 | A micro-dor da Aula 11 (placar branco no céu claro) é gasta na Aula 6, que empresta o mesmo `Mostrar placar`. Quem fechar a Aula 11 trata como remissão para trás, não como novidade. |

## ✅ RESOLVIDO. A minha referência de blocos estava incompleta em 30 blocos

Descoberto em 20/09/2026, quando a passada dos roteiros do Corre Dino levantou uma divergência: o
`REFERENCIA-BLOCOS-JOGO-2D.json` trazia `Para cada sprite do grupo … que colidir com o sprite …`
com dois campos, e os roteiros ensinavam um terceiro, o apelido. Conferido no código, **os roteiros
estavam certos e a minha referência errada**: o bloco tem `message1: 'chamar o sprite de %1'` e
`message2: 'fazer %1'`, e o meu extrator lia só o `message0`.

Trinta blocos têm mais de uma linha de rótulo, e a segunda costuma ser justamente o campo que a
aula ensina. O extrator foi reescrito e o JSON regerado. Agora cada tipo traz:

| Chave | O que ganhou |
|---|---|
| `linhas` | **todas** as linhas do rótulo, não só a primeira. 30 blocos afetados |
| `campos` | cada campo com o **padrão de fábrica**, que sustenta a fala em campo que não muda |
| `opcoes` | a lista do menu **na ordem da tela**, em 25 blocos, para dizer a posição em vez do desenho |

Os 285 tipos da paleta têm rótulo lido, contra 272 na versão anterior: 13 blocos escapavam porque
tinham comentário entre a chave e a linha do `type`.

**Consequência para quem escreve roteiro:** dá para dizer "o quinto da lista, a barra de espaço" e
"o apelido já vem escrito inimigo" com certeza, em vez de mandar procurar pelo nome. Onde `opcoes`
é nulo, o menu não tem lista fixa no código e a fala continua mandando procurar pelo nome.

## ✅ RESOLVIDO. Onde as coisas estão na plataforma, medido

O material dos três cursos nomeia menu, tela e botão o tempo todo, e não havia um lugar só dizendo
o que é verdade hoje. Cada passada media de novo, e duas mediram errado.

Criado `REFERENCIA-PLATAFORMA.md` nesta pasta, lido direto do código em 20/09/2026, com fonte citada
por linha: o menu da esquerda do Kids, o recolhimento automático dele na aula e na ferramenta, a cor
do perfil que substituiu o tema, as três ações de plataforma da aula, os seis grupos do menu ⋯ do
Estúdio, a lista de projetos e o Pinta.

O achado mais caro é o segundo: **dentro de uma aula e dentro de uma ferramenta, a barra esquerda
recolhe sozinha no primeiro quadro**, e o botão que a traz de volta chama **Mostrar menu**. Toda
fala que comece por "no menu da esquerda" está descrevendo uma tela que não está lá. São 18
ocorrências, todas no Meu Jeito, que é o curso que ensina a plataforma.

## ✅ RESOLVIDO. O roteiro separa a nota de produção da fala

Decisão de 20/09/2026. Quem grava lê o roteiro de relance, com o microfone aberto. Correndo no mesmo
parágrafo, o olho não achava onde a fala começava e o narrador lia a instrução em voz alta.

O par agora leva **linha em branco entre os dois**, e a fala vai em citação, com `>` linha a linha,
o que a destaca tanto no arquivo cru quanto na tela. Aplicado nos seis roteiros do Desafio, 238
pares, e escrito na seção 1 do `ESPEC-ROTEIRO.md`.

## ⚠️ REGRA. O trio de cada aula anda junto

Cada aula tem três arquivos: a proposta (`{slug}.md`), o manifesto (`{slug}.manifesto.json`) e o
roteiro (`{slug}.roteiro.md`). **Mudou num, muda nos três.** Tirar um bloco do manifesto sem tirar o
clipe do roteiro deixa a gravação com um trecho órfão; corrigir a fala sem corrigir a proposta faz o
próximo leitor reabrir a decisão já tomada.

A lista do que obriga varredura nos três está na seção 9 do `ESPEC-MANIFESTO.md`, e a regra está
repetida na seção 10 do `ESPEC-ROTEIRO.md`.
