# O Jogo do Meu Jeito · Aula 1 · Uma cópia do seu jogo no Estúdio Completo

## Resumo

- **Estado de entrada:** o Nave contra Asteroides terminado no Dia 5 do Desafio e publicado no
  Mural, morando dentro da aula. É o primeiro uso guiado do Estúdio Completo e do Pinta neste curso. A lista de
  projetos pode estar vazia ou já ter outros cartões.
- **Vitória do dia:** o jogo dela rodando fora da aula, num projeto com o nome que ela escolheu, e
  um segundo projeto vazio guardado ao lado.
- **Seções hoje:** 9 · **Seções propostas:** 7
- **Clipes hoje:** 7 · **Clipes propostos:** 6
- **Cenas:** 1 (`copy-vs-original`, já construída no catálogo)
- **Testes de múltipla escolha hoje:** 3 no meio da aula, mais 2 no quiz final ·
  **Propostos:** 0 no meio da aula, 2 no quiz final (um deles trocado)
- **Textos corridos:** 0. Os 3 que existiam saíram em 20/09/2026 (ver a nota de decisão abaixo)
- **Manifesto:** `aulas/meu-jeito-aula-01.manifesto.json`, 20 blocos e 7 seções

> **Nota de decisão de produto, 20/09/2026.** Nos cursos infantis não existe texto corrido. Os 3
> blocos de texto desta aula saíram do manifesto, e as três seções que os tinham já tinham clipe.
> O conteúdo de cada um virou instrução de produção do clipe da própria seção, para ser executado
> e conferido na tela em vez de lido: `orientacao-projeto-teste` foi para o
> `video-lista-e-projeto`, `orientacao-importar` foi para o `video-importar` e
> `orientacao-entrega-v6` foi para o `video-fecho`. Dois deles deixaram também um balão do Zappy
> curto, com o que o clipe não repete: `fala-de-proposito`, que diz que a falta do Jogo 2D é de
> propósito, e `fala-qual-cartao`, que diz qual dos dois cartões é a entrega de hoje. O terceiro
> não gerou balão, porque a seção já tem três falas e o clipe cobre o resto. Nenhum desses textos
> era critério de conclusão, então nenhuma regra de conclusão mudou. A chave
> `orientacao-entrega-v6` passou para `retireBlockKeys`, porque ela existia no rascunho v6.

> **Nota de decisão de plataforma, 20/09/2026. Como a fala manda sair da aula.** Dentro de uma
> aula o menu da esquerda começa recolhido (`focus-mode.tsx`), então nenhuma fala desta aula pode
> começar por "no menu da esquerda". A regra adotada, e ela vale para as Aulas 1 a 4, tem duas
> linhas e nenhuma condicional:
>
> 1. **Ir para uma ferramenta usa o botão da própria seção**, `Abrir meu Estúdio` ou
>    `Abrir meu Pinta`, que o player desenha quando a seção declara `externalTool`
>    (`lesson-sections.tsx`). Ele abre em **outra aba**, e a fala diz isso, porque a aula fica na
>    aba de trás e é para lá que se volta.
> 2. **Quando o destino não é ferramenta e não tem botão**, que nesta aula é só a ida à Jornada
>    para achar o Dia 5, a fala manda antes clicar no **Mostrar menu**, o botão pequeno colado na
>    beirada esquerda da tela, e só então nomeia o item.
>
> Por que não as outras saídas: fingir que o menu está aberto descreve uma tela que ninguém tem, e
> "se o menu estiver escondido, então…" dá dois caminhos a uma gravação que mostra um só. O botão
> da seção resolve a maioria dos casos sem menu nenhum, e o `Mostrar menu` cobre o que sobra com
> um gesto só, repetido no mesmo lugar.
>
> **Três rótulos corrigidos junto, medidos no código:** o item do menu chama **Jornada** e não
> Cursos (`nav.ts`); o **Estúdio** e o **Pinta** são filhos de **Criar**, e não itens de primeiro
> nível; e as Extensões moram na parte **O meu jogo** do menu ⋯, não numa parte Exibição, que não
> existe (`menuLayout.ts`). O antigo `Exportar para o Estúdio` hoje é **Baixar o projeto**, na
> parte **Levar o jogo**, e o `Sincronizar com o enviado` hoje é **Trazer o que eu enviei**, na
> parte **O meu jogo** (`core/i18n/pt-BR.ts`).

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| Projeto, e a lista Meus Jogos | Não. É a tela que está na frente dela, com cartões e dois botões | Não | | Dito na hora, no clipe | Nomear a tela que ela está olhando não precisa de simulação. O nome é da própria interface |
| A aula do Desafio e a lista são dois lugares diferentes | Não. A lista abre vazia na tela dela, com a frase de fábrica | Não | | Dentro da seção da dor | É estado zerado, não problema montado. Cena aqui seria uma segunda cópia de uma tela que ela já tem à vista |
| Extensão, e o projeto novo que abre sem Jogo 2D | Sim, mas com sintoma real e reprodutível no projeto dela | **Sim**, e não como cena: como **dor no próprio Estúdio** | Ela procura a categoria Jogo 2D, não acha, e só então instala | A dor roda antes, e fecha sozinha | Conferido no código: projeto novo nasce com `initialExtensions: []`, então a falta acontece com todo mundo. Uma cena repetiria, num palco de mentira, o que a tela dela faz de verdade |
| Exportar e importar: a cópia sai e o original fica | **Sim.** Os dois lugares nunca aparecem juntos, e para conferir que a aula continuou inteira ela teria que ir e voltar entre duas abas | **Sim** | Experimentação (cena `copy-vs-original`) | Antes de percorrer as telas do caminho | É a única ideia da aula que a tela não prova sozinha. Tanto que hoje o quiz final tenta compensar isso com uma pergunta, o que é o sintoma clássico de conceito abstrato sem concretização |
| O projeto importado chega com a extensão dentro | Sim, e se prova por contraste imediato | Não | | Dito na hora, com os dois projetos já criados | Ela tem dois cartões e duas colunas da esquerda para comparar. O contraste é a prova, e ele está na tela |
| Guardado na sua conta | Não é conceito, é confirmação de tela | Não | | Uma frase dentro do teste final | Hoje ocupa uma seção inteira, com clipe próprio e pergunta própria, para ensinar a esperar um selo aparecer |
| Renomear o projeto pela barra de cima | Operação de interface | Não | | Dentro da seção do import | O nome que chega é "Projeto da aula" e não diz nada. Trocar é um gesto, não uma ideia |
| O botão Mostrar menu | Operação de interface | Não | | Dentro do gesto, nas duas vezes em que a aula precisa dele | Dentro da aula e da ferramenta o menu começa recolhido, então esse botão é a única porta para a Jornada e para o Estúdio. Ele deixou de ser assunto ("dá para ganhar espaço") e virou passo do caminho |

Oito coisas, duas concretizações, e só uma delas é cena. A dor da extensão acontece no Estúdio de
quem faz a aula. Os movimentos do jogo ficam em 6 seções; a seção do caderno, logo após a
apresentação, leva a proposta a 7.

## Diagnóstico do desenho atual

**A ideia mais abstrata da aula não tem nada que a torne concreta.** A seção 4 (*Observe: uma cópia
faz a ponte*) é uma das 32 seções do v6 que declaram demonstração e não têm bloco de demonstração:
ela depende de um diagrama num vídeo que ainda não existe. O conceito de que exportar deixa o
original no lugar é justamente o que quem faz a aula não consegue conferir sozinha, porque as duas pontas
moram em abas diferentes.

**A dor e a ferramenta estão dentro da mesma seção.** A seção 3 (*Crie um projeto e encontre os
blocos*) faz, num clipe só, quatro coisas: criar o projeto, descobrir que Jogo 2D não está lá, abrir
as Extensões e instalar. A falta nunca chega a fechar sozinha, e é a melhor dor do curso inteiro:
reproduz em 100% dos casos e tem conserto de trinta segundos.

**Uma seção inteira ensina a esperar um selo.** A seção 6 (*Reencontre o mesmo jogo*) existe para
quem faz a aula ver o aviso Guardado na sua conta e reabrir o cartão. Reabrir o cartão já foi ensinado na
seção 3, quando ela voltou pela marca Sistema Zero Studio. O que sobra é esperar um aviso aparecer,
que é instrução dentro do teste.

**As três perguntas do meio não verificam trabalho nenhum.** O próprio README do curso diz que a
plataforma não inspeciona o projeto externo. Então `conferir-projeto-teste`, `conferir-importar` e
`conferir-guardar` não conferem o que ela fez: conferem se ela lembra do que acabou de acontecer na
tela dela, dois minutos antes. A conferência real do trabalho já existe e é a entrega da galeria,
revisada pelo professor.

**A pergunta da seção 5 é administração do curso, não conteúdo.** *Há um cartão vazio e outro com o
jogo completo. Qual usaremos nas aulas 6 e 7?* é uma instrução sobre qual cartão abrir daqui a cinco
aulas, vestida de pergunta.

**A seção 2 (*Observe: onde os projetos ficam*) gasta um clipe inteiro numa tela vazia.** Mostrar a
lista vazia é a abertura natural do gesto de criar o primeiro projeto, não uma parada própria.

## Proposta final

> **Nota de arquitetura.** A regra das duas colunas do player manda só uma coisa para a direita por
> seção: ou a cena, ou o Estúdio embarcado. **Nenhuma seção desta aula precisou ser dividida**, e o
> motivo é a forma do dia: a aula tem uma cena só, na seção 5, e o trabalho no Estúdio acontece na
> ferramenta externa (`externalTool: "estudio"`), não num Estúdio embarcado. Sem `workspaceKey` em
> nenhuma seção, a coluna da direita nunca fica disputada. A conferência antes de voltar à aba da
> aula deixou de ser bloco em 20/09/2026: ela agora acontece dentro do clipe, na tela, e o que
> sobra do lado esquerdo são clipes e falas, que ficam à esquerda do mesmo jeito.
>
> **Duas consequências no texto das falas.** Primeira: a fala do Zappy tem limite de 400 caracteres,
> então as instruções longas das seções 4 e 6 viraram duas e três falas seguidas. Elas ficam na mesma
> coluna e na mesma ordem, e são lidas como uma fala só. Segunda: a abertura da seção 5 não pode
> dizer "olha as duas telas aí embaixo", porque acima de 1080 px de coluna a cena fica ao lado, e não
> embaixo. A fala passa a dizer "na bancada desta seção".

### Seção 1. O que a gente vai fazer hoje

- **Intenção:** apresentação
- **Por que existe:** quem faz a aula precisa ver o jogo dela rodando fora da aula antes de percorrer seis
  telas para chegar lá.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`, "O seu jogo rodando fora da aula"). O jogo do Dia 5 rodando dentro do Estúdio Completo, num cartão com
     nome escolhido. Fala curta: "O seu jogo da nave já está pronto, e hoje ele sai da aula. A gente
     vai preparar um projeto do zero, descobrir uma coisa importante sobre ele, e trazer uma cópia
     do seu jogo para o Estúdio Completo. No fim você vai saber qual cartão abrir para continuar."
     Duração alvo: 25 a 35 segundos.

### Seção 2. Seu caderno para criar do seu jeito

- **Intenção:** material
- **Por que existe:** este caderno acompanha a cópia do jogo e as criações no Pinta. Quem faz a
  aula precisa encontrá-lo antes do primeiro passo no Estúdio Completo.
- **Conclui quando:** 90% do `video-caderno` é assistido. Baixar o PDF não é obrigatório.
- **Blocos:**
  1. `video` (`video-caderno`, "Seu caderno para criar do seu jeito"). Vídeo de 20 a 30 segundos
     que mostra o botão Baixar, a confirmação Baixado e uma página real do PDF. Gravar depois de
     anexar o arquivo e conferir a página escolhida.
  2. `materials` (`materiais-caderno`, "Caderno do Jogo do Meu Jeito"). O PDF fica abaixo do vídeo
     e continua disponível nesta aula. O arquivo é vinculado no admin, não no manifesto.

### Seção 3. Um projeto do zero, e um bloco que não está lá

- **Intenção:** dor
- **Por que existe:** é a melhor dor do curso. Ela reproduz sempre, o conserto é rápido, e é ela que
  dá sentido à palavra extensão. Hoje a falta nunca fica sozinha na tela.
- **Conclui quando:** 90% do clipe assistido, com o projeto de teste criado e a coluna da esquerda
  aberta no projeto dela
- **Blocos:**
  1. `dialogue` (`fala-projeto-teste`). "Esta seção tem o botão Abrir meu Estúdio. Clica nele: o
     Estúdio abre em outra aba, e esta aula continua aberta. Essa tela chama Meus Jogos, e ela é sua.
     Lá em cima, à direita, tem Importar e + Novo projeto. Clica no + Novo projeto, escreve um nome
     no campo Nome do projeto e clica em Criar e abrir. Com o projeto aberto, procura a categoria
     Jogo 2D na coluna da esquerda, onde ficam os bloquinhos."
  2. `video` (`video-lista-e-projeto`, "Onde o Jogo 2D não está"). Funde o clipe da lista com a primeira metade do clipe do
     projeto de teste. Mostra Meus Jogos, os dois botões, o modal Novo projeto com Cancelar e Criar
     e abrir, e a coluna da esquerda do projeto novo com Áreas do projeto e Programação à vista.
     **Manter a lista de cima a baixo antes de dizer que falta**, porque a ausência fica muito mais
     evidente depois de ver o que está lá. **Retirar "Segundo passo concluído" e a promessa de um
     cartão único.** A fala termina na constatação, sem conserto: "Jogo 2D não tem." Duração alvo:
     55 a 70 segundos. **A chamada para pausar e ir fazer entra dentro do clipe**, logo depois do
     Criar e abrir, e a conferência entra quando o clipe retoma: o projeto de teste aparecendo em
     Meus Jogos, e a categoria Jogo 2D ausente da coluna da esquerda.
  3. `dialogue` (`fala-de-proposito`). "Esta seção fecha com alguma coisa faltando, e é de
     propósito. Você não fez nada de errado. O conserto vem na próxima."
  4. `materials` (`ajuda-projeto-novo`, "Se travar, o passo a passo está no Como fazer"). Só
     links, para `/como-fazer/estudio-criar-um-projeto` e `/como-fazer/plataforma-mostrar-o-menu`.
     O passo a passo da seção continua no balão e no clipe; o link é a rede para quem travar num
     detalhe da interface, e abre em nova aba com volta para a aula. Não conta para concluir.

**A dor fecha aqui, sem conserto.** É o único lugar da aula onde uma seção termina com alguma coisa
faltando, e é de propósito.

**O texto de orientação saiu daqui.** O passo a passo e a conferência viraram parte do
`video-lista-e-projeto`, e o que sobrou de único no texto, a tranquilização de que a falta é de
propósito, virou o balão acima. O atalho **Abrir meu Estúdio** continua onde estava: ele é o
`externalTool` da seção, não um bloco.

**Autoconferência no fim do clipe `video-lista-e-projeto`:** "No seu projeto de teste, você vê o cartão em Meus Jogos e percebe que Jogo 2D ainda não aparece entre os blocos? Deixe essa falta visível; vamos resolvê-la na próxima seção."

### Seção 4. Os bloquinhos vêm de um pacote que você instala

- **Intenção:** construção
- **Por que existe:** é a resposta da seção anterior, e o gesto que quem faz a aula vai repetir em todo
  projeto novo da vida dela.
- **Conclui quando:** 90% do clipe assistido, com o selo Instalada à vista e a categoria Jogo 2D de
  volta na coluna da esquerda
- **Blocos:**
  1. `dialogue` (`fala-extensao`). "Não foi você que fez nada de errado. Clica no botão de três
     pontinhos, lá em cima. Na parte O meu jogo, clica em Extensões. Abriu a janela Extensões oficiais,
     e dentro dela tem um cartão: o Jogo 2D. Do lado direito do cartão, clica em Instalar."
  2. `dialogue` (`fala-jogo-2d-de-volta`). Continuação da mesma fala, partida pelo limite de 400
     caracteres do balão. "Apareceu o selo Instalada, e o botão virou Remover. Agora clica no Fechar,
     lá embaixo. Olha a coluna da esquerda de novo: a categoria Jogo 2D está lá. Para voltar para a
     lista, clica no Sistema Zero Studio, no canto esquerdo da barra de cima."
  3. `video` (`video-extensao`, "Instalar os bloquinhos do Jogo 2D"). Segunda metade do clipe do projeto de teste. Mantém o caminho
     completo e a frase da Jornada que já está gravada e é boa: "hoje você tem um só porque é o que
     você conquistou até agora, e conforme você for terminando os próximos cursos, mais cartões vão
     aparecendo aqui." **Retirar "com uns cartões" e "procura o cartão"**, porque a janela tem um
     item só. Duração alvo: 50 a 60 segundos.
  4. `materials` (`ajuda-extensao`, "Se travar, o passo a passo está no Como fazer"). Um link,
     para `/como-fazer/estudio-instalar-jogo-2d`. Mesma regra da seção 3: o gesto é ensinado
     aqui, e o tutorial é a versão consultável, atualizada quando o menu ⋯ mudar de nome.

**Junta com a seção 3 o que hoje é uma seção só, e separa o que hoje está grudado.** A conta fecha:
duas seções continuam sendo duas, mas o corte passou a ser no lugar certo, entre a falta e o
conserto.

**Pausa antes da conferência:** abrir o Estúdio pelo botão da seção, fazer o gesto na aba da ferramenta e voltar à aula.

**Autoconferência no fim do clipe `video-extensao`:** "No projeto de teste, a categoria Jogo 2D apareceu na coluna dos blocos? Compare com a falta que você acabou de ver."

### Seção 5. Uma cópia vai, e o original fica

- **Intenção:** conceito
- **Por que existe:** é o único conceito da aula que a tela não prova sozinha. Para ver as duas
  pontas ao mesmo tempo, seria preciso ter duas abas abertas lado a lado.
- **Conclui quando:** as três metas de `copy-vs-original` caem e a pergunta final é respondida
- **Blocos:**
  1. `dialogue` (`fala-copia`). Abertura curta, sem vídeo: "O seu jogo mora dentro da aula do
     Desafio. Para ele chegar aqui, ele faz uma viagem em duas partes, e nenhum dos dois lados sai do
     lugar. Na bancada desta seção tem duas telas: a da aula, com o jogo da nave dentro, e a do
     Estúdio Completo, ainda vazia. Experimenta lá antes de percorrer o caminho de verdade."
  2. `interactive` (`experiencia-copia`). Cena `copy-vs-original`, já construída, descrita adiante.
     Cenário: `nave`. Metas declaradas: `exported`, `imported`, `independent`.

**Sai um clipe.** A demonstração de hoje é um diagrama narrado que ainda não foi gravado. A cena faz
o mesmo trabalho com quem faz a aula mexendo, e ainda cobre a parte que o diagrama não cobria: o que
acontece com o outro lado depois que existem dois jogos.

### Seção 6. Traga o jogo do Dia 5 para o seu Estúdio

- **Intenção:** construção
- **Por que existe:** é a vitória do dia, e é um percurso de navegação contínuo que não pode ser
  partido no meio.
- **Conclui quando:** 90% do clipe assistido, com o projeto importado aberto, jogável e renomeado
- **Blocos:**
  1. `dialogue` (`fala-achar-dia-5`). "Clica no botão Abrir meu Estúdio desta seção: ele abre em
     outra aba, e é nela que você faz tudo agora. Na beirada esquerda da tela tem um botão pequeno,
     o Mostrar menu. Clica nele e o menu aparece. Clica em Jornada, depois no nível Faísca, acha o
     cartão do Desafio do Primeiro Jogo e clica em Acessar curso. Procura a aula do Dia 5 e abre
     ela."
  2. `dialogue` (`fala-exportar-importar`). "Na barra do Estúdio da aula do Dia 5, clica nos três
     pontinhos. Na parte Levar o jogo, clica em Baixar o projeto, que tem escrito embaixo: um
     arquivo para abrir este mesmo projeto no Estúdio Completo. O arquivo cai na pasta Downloads,
     com ponto szproject ponto json no fim do nome. Clica no Mostrar menu de novo, clica em Criar,
     depois em Estúdio, e clica em Importar."
  3. `dialogue` (`fala-testar-renomear`). "Abriu a janela do seu computador: vai na pasta Downloads
     e dá dois cliques no arquivo. O jogo abre sozinho. Clica na área do jogo e mexe a nave com as
     setas. Depois clica em cima do nome Projeto da aula, lá em cima, e escreve o nome do seu jogo."
     As três falas são o percurso contínuo de hoje, partido só pelo limite de 400 caracteres do
     balão. Elas ficam na mesma coluna, na mesma ordem, e são lidas como uma fala só.
     **O percurso inteiro acontece na aba que o botão da seção abriu**, e o `Mostrar menu` aparece
     duas vezes, no mesmo lugar: uma para ir à Jornada e outra para voltar a Criar › Estúdio. É
     a aplicação da nota de decisão de plataforma do topo deste relatório.
  4. `video` (`video-importar`, "Do Dia 5 até o seu Estúdio"). O clipe do import, com o caminho inteiro preservado. **Encurtar as
     definições de exportar e importar**, que a cena da seção 5 já entregou, e ficar no gesto.
     **Manter** o contraste das duas colunas da esquerda (o projeto importado já tem Jogo 2D e ela
     não instalou nada) e o renomear pela barra. **Mostrar o Mostrar menu nos dois momentos em que
     ele é usado**, sempre colado na beirada esquerda da tela. **Manter como ajuda condicional**,
     sem virar tarefa, o Trazer o que eu enviei para quem achar o Dia 5 vazio, que fica na parte
     O meu jogo do mesmo menu de três pontinhos. Duração alvo: 90 a 110 segundos.
     **A chamada para pausar e ir fazer e a conferência entram dentro do clipe**: o jogo abrindo
     com nave, tiros, asteroides, placar e telas, a nave respondendo às setas, e o cartão com o
     nome escrito por quem fez a aula, que dá para diferenciar do projeto de teste.

**O texto de orientação saiu daqui, e não virou balão.** O caminho inteiro já está na tela e a
seção já tem três falas: um balão a mais seria eco. O atalho **Abrir meu Estúdio** continua onde
estava, como `externalTool` da seção, e agora é ele que abre a ferramenta, em vez do menu.

**Um assunto saiu do curso aqui, e a saída é de plataforma.** A gravação antiga fechava este passo
ensinando o puxador da beirada como jeito de *ganhar espaço*: com o jogo aberto, clicar nele
escondia o menu da Comunidade e a área de montar crescia. Hoje isso não acontece mais. Com um
projeto aberto na ferramenta, o menu já está recolhido e o botão **some da tela**
(`focus-mode.tsx`, `navAvailable = onFocus && isTablet && !workspaceActive`), porque o editor toma
a largura inteira sozinho. O botão continua existindo, com o nome **Mostrar menu**, mas só na aula
e na galeria, e a função dele é a inversa: trazer o menu de volta para navegar. Então ele deixou de
ser assunto de aula e virou passo do caminho, dentro das duas falas acima. **Nada a compensar em
outra aula:** ganhar espaço deixou de ser uma coisa que alguém precisa fazer.

**Autoconferência no fim do clipe `video-importar`:** "No cartão com o nome que você escolheu, a nave responde às setas e o jogo ainda tem tiros, pedras e placar? Confira que esse cartão é o jogo completo, diferente do projeto de teste."

### Seção 7. Teste, envie e fecha

- **Intenção:** entrega e fechamento
- **Por que existe:** fecha o ciclo com o jogo rodando e guarda as duas ideias do dia.
- **Conclui quando:** a entrega é enviada, o clipe de fecho é assistido e as duas perguntas do quiz
  são respondidas
- **Blocos:**
  1. `dialogue` (`fala-fecho`). Absorve as duas seções de operação que somem: "Para testar, clica na
     área do jogo e usa as setas. Antes de fechar a aba, espera aparecer Guardado na sua conta, lá em
     cima na barra, logo depois do nome do projeto e do Salvo. Quer dizer que o jogo subiu para a
     sua conta, e ele vai estar lá se você entrar
     em outro computador. O cartão que tem o jogo é o que volta na Aula 6, e o projeto de teste fica
     guardado na lista, sem ser apagado."
  2. `dialogue` (`fala-qual-cartao`). "Na hora de enviar, escolhe o cartão do jogo que veio do
     Dia 5. O projeto de teste fica na lista, e não é a entrega de hoje."
  3. `studio` (`entrega-galeria-v6`). Entrega pela galeria do Estúdio, uma criação.
  4. `video` (`video-fecho`, "Dois cartões na sua lista"). Retoma o jogo rodando fora da aula e
     anuncia o Pinta. Duração alvo: 50 a 65 segundos. **O gesto de entregar acontece dentro do
     clipe**, antes do corte final: esperar o Guardado na sua conta, escolher o cartão do jogo do
     Dia 5, enviar, e conferir na tela os critérios que antes estavam escritos.
  5. `quiz` (`quiz-v6`). Duas perguntas, com a primeira trocada (ver abaixo).

**Junta três seções de hoje.** A seção do salvamento vira instrução, e a recapitulação encosta no
quiz em vez de ocupar seção própria.

**O texto de entrega saiu daqui.** Os critérios de conferência viraram parte do `video-fecho`, e a
única coisa que nenhum outro bloco dizia, qual dos dois cartões é a entrega de hoje, virou o balão
acima.

## Destino de cada pergunta de múltipla escolha

### No meio da aula (`activity.type: 'question'`)

| Pergunta | Seção de hoje | Destino | Por quê |
|---|---|---|---|
| "Num projeto novo, os blocos de Jogo 2D não apareceram. O que conferir?" (`conferir-projeto-teste`) | 3. Crie um projeto e encontre os blocos | **Some** | É a dor que ela acabou de viver no projeto dela, com a ferramenta na mão, dois minutos antes. A seção da dor passa a fechar na própria falta, e a da ferramenta no selo Instalada |
| "Há um cartão vazio e outro com o jogo completo. Qual usaremos nas aulas 6 e 7?" (`conferir-importar`) | 5. Traga o jogo do Dia 5 | **Some** | Não é conceito, é administração do curso. Vira uma frase de instrução no fecho: o cartão que tem o jogo é o que volta na Aula 6 |
| "A ferramenta ainda está guardando seu jogo. O que fazer antes de fechar?" (`conferir-guardar`) | 6. Reencontre o mesmo jogo | **Some**, junto com a seção inteira | Esperar um selo aparecer é operação de interface. Vira uma frase dentro do teste final |

Nenhuma das três vira experiência, porque nenhuma cobre relação abstrata: duas são coisas que
acontecem na tela dela no segundo seguinte, e a terceira é instrução de curso.

**O que substitui a pergunta como critério de conclusão.** Hoje a pergunta é o bloco de conclusão
das seções de aplicação, e isso confunde duas coisas. O próprio README do curso diz que a plataforma
não inspeciona o projeto externo, então a pergunta nunca verificou o trabalho: ela verificava
atenção. Nas seções propostas a conclusão passa a ser o clipe do gesto em 90%, com a lista de
conferência que se lê antes de voltar à aba da aula, e **a verificação de verdade continua
sendo a entrega da galeria revisada pelo professor**, que já existe e já está descrita no manifesto.

### No quiz final

| Pergunta | Destino | Por quê |
|---|---|---|
| "Depois de exportar o jogo, o que aconteceu com o original da aula?" | **Trocada** | Vira o palpite e a primeira meta da cena `copy-vs-original`, dentro da seção 5. Repetir no fim é eco |
| "Você recebeu o arquivo .szproject.json e quer abri-lo no Estúdio. Qual ação usa?" | **Fica** | Aplica duas ideias diferentes da aula numa situação nova, que é a função declarada do quiz |

**Pergunta nova no lugar da primeira:** "O seu projeto de teste abriu sem a categoria Jogo 2D, e o
jogo que veio do Desafio abriu com ela. Por quê?"

- A extensão foi junto dentro do arquivo exportado. (correta)
- Jogo importado não precisa de extensão nenhuma.

**Devolutiva:** "Quando você exporta, as ferramentas do jogo vão dentro do arquivo. Num projeto que
você começa do zero, quem instala é você."

Ela recupera um fato que a aula mostra e que hoje nada cobra: o contraste entre as duas colunas da
esquerda.

## Experiências e demonstrações desta aula

### 1. `copy-vs-original`. A cópia e o original · **CONSTRUÍDA**

- **Id no catálogo:** `copy-vs-original`
- **Título visível:** "A cópia e o original"
- **O conceito abstrato:** exportar tira uma cópia para um arquivo e importar transforma essa cópia
  num projeto. Depois disso são dois jogos separados, e mexer num não mexe no outro.
- **Tipo:** experimentação. A relação tem botão, e o botão é **em qual dos dois lados ela mexe**. Dá
  para escrever a frase do critério: "quando eu mudo a cor da nave de um lado, a do outro lado fica
  como estava". Um roteiro que só toca não alcançaria a segunda metade da ideia, porque é ela quem
  precisa escolher o lado.
- **O que se manipula na bancada:**
  - **Exportar**, botão do lado da aula. Faz nascer o cartão do arquivo no meio da tela, com o nome
    terminando em `.szproject.json`.
  - **Importar**, botão do lado do Estúdio. Só fica ativo depois que o arquivo existe. Faz nascer o
    projeto no lado do Estúdio.
  - **Pintar a nave de outra cor**, um botão em cada lado, que troca a cor do corpo da nave daquele
    lado por uma das quatro cores do seletor.
  - **Voltar ao começo.**
- **Como o palco começa:** duas telas lado a lado, com rótulo em cima de cada uma: **A aula do
  Desafio**, à esquerda, com o jogo da nave dentro, e **O Estúdio Completo**, à direita, vazio, com
  a frase "Você ainda não tem projetos". O meio, onde o arquivo vai aparecer, começa sem nada.
- **Metas:**
  | id | rótulo ao cair | pedido na faixa |
  |---|---|---|
  | `exported` | "O arquivo saiu, e o jogo continuou na aula" | "Aperte Exportar e olhe o lado da aula." |
  | `imported` | "O mesmo jogo apareceu no Estúdio" | "Com o arquivo pronto, aperte Importar." |
  | `independent` | "Mudou a cor de um lado, e o outro ficou como estava" | "Com jogo nos dois lados, pinte a nave de um lado só." |
- **Pistas, uma por vez:**
  1. "Aperte Exportar e olhe o lado da aula antes de olhar o arquivo."
  2. "Com o arquivo no meio, aperte Importar e compare as duas telas."
  3. "Pinte a nave do lado do Estúdio e olhe a nave do lado da aula."
- **Palpite antes de abrir:** "Você exporta o jogo que está na aula do Desafio. O que acontece com o
  jogo que estava lá?"
  - Ele continua na aula, inteiro. (correta)
  - Ele sai da aula e vai para dentro do arquivo. *(se ela escolher esta, a tela conta depois: "O
    jogo continuou na aula. O arquivo levou uma cópia.")*
  - O palpite volta à tela quando a meta `exported` cai.
- **Pergunta depois de descobrir (conta para concluir):** "Você pintou a nave de outra cor no
  projeto do Estúdio. E a nave do jogo que está na aula do Desafio?"
  - Continua com a cor de antes. (correta)
  - Muda junto, porque é o mesmo jogo.
- **Explicação que ela lê ao acertar:** "O arquivo levou uma cópia. Depois de importar, são dois
  jogos separados: cada um guarda o que você fizer nele."
- **Frase de sucesso:** "Exportar tira uma cópia, importar transforma a cópia num projeto seu, e daí
  em diante cada um segue o seu caminho."
- **Elenco e cenário:** cenário `nave`, e não `meu-jeito`. É a escolha certa aqui e vale registrar o
  motivo: o jogo retratado é o do Dia 5, que ainda tem a nave e o asteroide de fábrica. A arte de quem
  faz a aula só entra na Aula 6, e as outras cenas deste curso usam `meu-jeito` porque retratam a pedra
  e a chama que ela desenha. Os dois cenários têm fundo de estrelas e fundo escuro, então a troca
  não muda a paleta do palco, só as figuras.
- **Metas cobradas nesta aula:** `exported`, `imported`, `independent`.
- **Quais outros cursos e aulas usariam esta cena:**
  - **Aula 8 deste curso.** O texto da tela Compartilhar diz literalmente que a versão publicada
    fica no Mural do jeito que está agora e que mudar o projeto depois não muda a do Mural. É a
    mesma relação, com outros dois lados, e hoje a Aula 8 cobra isso com uma pergunta de múltipla
    escolha (`conferir-publicar`).
  - **Desafio do Primeiro Jogo.** O Enviar para o professor e o Trazer o que eu enviei são a
    mesma ideia de cópia com duas pontas.
  - **Qualquer curso que ensine o Fazer a minha versão do Mural**, que cria um projeto novo a partir
    da versão do dia da publicação.
- **Ações no motor, conferidas no código:** `export-file` e `import-file` (o arquivo no meio, e a
  chegada dele do outro lado) e `recolor` com `side` de `lesson` ou `studio` e quatro cores. O palco
  de dois lados já existia: `delta-time` tem dois computadores e `contact` tem duas pistas. O
  "Voltar ao começo" não virou ação própria: o motor reusa o `reset` que já existe, como o documento
  de design da plataforma registra.
- **O que o catálogo traz, comparado com esta especificação:** título, instrução, o que se
  manipula, frase de sucesso, pergunta extra, as três metas com rótulo e pedido e as três pistas
  entraram palavra por palavra. Nenhuma divergência.

## Vídeos

| Chave | Título do vídeo | O que mostra | Origem (chave v6) | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|---|
| `video-abertura` | O seu jogo rodando fora da aula | o jogo do Dia 5 rodando dentro do Estúdio Completo | `video-abertura-v6` | 25 a 35 s | fala sim, com a lista de passos substituída pela fala nova |
| `video-caderno` | Seu caderno para criar do seu jeito | onde baixar o PDF e como consultar uma página real | novo | 20 a 30 s | gravação nova, após vincular o PDF |
| `video-lista-e-projeto` | Onde o Jogo 2D não está | Meus Jogos, os dois botões, criar o projeto de teste passo a passo na tela, a pausa para ir fazer, a conferência ao retomar e a falta do Jogo 2D | `video-lista` mais a primeira metade de `video-projeto-teste`, mais o texto de orientação | 55 a 70 s | funde dois clipes, e termina na falta |
| `video-extensao` | Instalar os bloquinhos do Jogo 2D | três pontinhos, O meu jogo, Extensões, Instalar, Fechar e a volta pela marca | segunda metade de `video-projeto-teste` | 50 a 60 s | fala sim, com o corte de "procura o cartão" |
| `video-importar` | Do Dia 5 até o seu Estúdio | o caminho inteiro até o jogo rodando, o Mostrar menu nas duas vezes, o renomear, a pausa para ir fazer e a conferência ao retomar | `video-importar` mais o texto de orientação | 90 a 110 s | fala sim, com as definições encurtadas |
| `video-fecho` | Dois cartões na sua lista | o gesto de entregar na tela com a conferência dos critérios, o jogo fora da aula e o anúncio do Pinta | `video-fecho-v6` mais o texto de entrega | 50 a 65 s | fala sim |

**Saem dois clipes:** o `video-ponte`, cujo diagrama a cena substitui com vantagem, e o
`video-guardar`, que ensinava a esperar um selo. Entra o `video-caderno`. **Saldo:** de 7 para 6 clipes, e o corte de
minutagem é maior que o de contagem, porque a definição de exportar e importar saiu da narração do
clipe longo. **Nenhum clipe novo entrou com a saída do texto corrido:** as três seções que tinham
texto já tinham clipe, e o que era lista escrita virou gesto e conferência dentro do clipe que já
existia. A minutagem de cada um pode subir um pouco por causa disso, e as faixas de duração
continuam valendo.

> A primeira linha de cada `plannedVideo` no manifesto é `Título: <nome do vídeo>`, e é a coluna
> "Título do vídeo" desta tabela que manda nela.

## Estado da importação

O manifesto `aulas/meu-jeito-aula-01.manifesto.json` passa no validador, com zero avisos. A
`copy-vs-original` está no catálogo, então nada aqui fica esperando construção de cena.

O bloco `experiencia-copia` declara `setup.goals` com as três metas da cena, `exported`, `imported`
e `independent`, que é a missão inteira dela. O `revealOn` do palpite aponta para `exported`, meta
real da cena, então o palpite volta à tela no instante em que o arquivo sai e o jogo continua na
aula, em vez de voltar só na conclusão.

## Continuidade

- **O que esta aula assume da anterior:** o Desafio do Primeiro Jogo inteiro, com o jogo do Dia 5
  enviado ao professor e publicado no Mural. Ela sabe achar bloco na coluna da esquerda, arrastar,
  encaixar e trocar número, e sabe que o jogo roda ao vivo. Não assume nada de Estúdio Completo nem
  de Pinta.
- **O que esta aula entrega para a seguinte:** dois projetos na lista dela. O jogo do Dia 5
  importado, com nome escolhido por ela, e um projeto de teste vazio com a extensão Jogo 2D
  instalada. A Aula 2 não abre nenhum dos dois: ela vai para o Pinta, e o jogo só volta na Aula 6.
- **Valores canônicos que saem daqui:** o projeto importado chega com o nome `Projeto da aula` e é
  renomeado por quem faz a aula · o arquivo termina em `.szproject.json` · o caminho de volta para a
  lista é a marca `Sistema Zero Studio`, no canto esquerdo da barra de cima · o selo de conta é
  `Guardado na sua conta` · a ferramenta se abre pelo botão `Abrir meu Estúdio` da própria seção,
  que abre em outra aba · o menu da esquerda volta pelo botão `Mostrar menu`, colado na beirada
  esquerda da tela. Os dois últimos valem para as Aulas 2, 3 e 4, com `Abrir meu Pinta` no lugar.
- **Campos livres:** o nome do projeto de teste e o nome do jogo importado. Nenhuma aula posterior
  cita esses nomes como fato, e a Aula 6 manda abrir o cartão pelo conteúdo, não pelo nome.
