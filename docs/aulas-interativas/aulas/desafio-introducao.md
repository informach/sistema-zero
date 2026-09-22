# Desafio do Primeiro Jogo · Introdução · Onde fica cada coisa

## Resumo

- **Estado de entrada:** conta criada, primeiro acesso. Ela nunca abriu uma aula, nunca viu o
  Estúdio e ainda não sabe voltar ao curso amanhã.
- **Vitória do dia:** um jogo que já estava pronto obedece a ela. Ela aperta a tecla e o som toca,
  troca um número e as estrelas aceleram, recarrega a página e o que ela escreveu continua lá.
- **Seções hoje:** 7 · **Seções propostas:** 7
- **Clipes hoje:** 6 · **Clipes propostos:** 8, sendo 3 novos, 1 fusão, 1 desmembrado e o fecho
  com um clipe de passeio pelo menu
- **Cenas:** 0, e a seção de experiências explica por quê
- **Textos corridos:** 0. Os 4 que existiam saíram em 20/09/2026 (ver a nota de decisão abaixo)
- **Manifesto:** `aulas/desafio-introducao.manifesto.json`, 17 blocos e 7 seções. Estado no
  validador: **OK**, sem nenhum aviso de convenção. Como não usa cena nenhuma, nunca esteve na fila
  de dependência

> **Nota de decisão de produto, 20/09/2026.** Nos cursos infantis não existe texto corrido. Os 4
> blocos de texto desta aula saíram do manifesto. O conteúdo de 3 deles virou instrução de produção
> dos clipes que já existiam nas mesmas seções, para ser executado na tela em vez de lido:
> `texto-tres-acoes` foi para o `video-testar`, `texto-tres-destinos` foi para o
> `video-guardar-e-entregar` e `texto-pedido-bom` foi para o `video-ajuda`. O quarto,
> `texto-menu`, estava na única seção sem clipe, e por isso virou um clipe novo, o `video-menu`.
> Dois deles ganharam também um balão do Zappy com o resumo: `fala-tres-destinos` e
> `fala-pedido-bom`. Nenhum desses textos era critério de conclusão, então nenhuma regra de
> conclusão mudou.

> **Nota de decisão de produto, 20/09/2026.** O caderno do aluno e o mapa dos pais deixam de ser
> aulas de material do curso e viram **materiais complementares desta aula**, num bloco `materials`
> logo abaixo do vídeo que fala deles. O bloco é um bloco de aula como outro qualquer: a autora o
> põe no ponto que quiser da seção, e a ordem dos itens é a que ela montou. Ele substituiu o antigo
> `<details>` "Materiais de apoio", que ficava em posição fixa no pé de toda seção, fora da ordem
> dela.
>
> Duas consequências. A primeira: o clipe `video-ajuda`, que juntava o caderno e o pedido de ajuda,
> **se partiu em dois**. O `video-caderno` fica na seção nova, com o bloco embaixo dele, e o
> `video-ajuda` fica com o botão **Preciso de ajuda** e os **Recados do professor**. A segunda: a
> proibição de dizer "Caderno do Aluno" e "Mapa dos Pais" na área do aluno **caiu**. Ela existia
> porque esses nomes eram só da página de venda; agora o título do bloco e o rótulo de cada item
> são escritos no admin, e a fala diz exatamente o que estiver escrito ali.
>
> A seção nova usa a intenção **Material do curso** (`material`), que o core cobra com regra
> própria: nela a conclusão só aceita bloco de livro, de materiais ou de vídeo, e ela não pode ter
> ação de plataforma, ferramenta embarcada nem verificação de projeto. Por isso a conclusão é o
> clipe. **Para exigir o download**, escolher os arquivos obrigatórios no admin depois de subir os
> dois: os identificadores deles nascem lá e não cabem num manifesto.

> **Nota de intenção.** Esta aula não monta jogo, então as intenções do briefing entram assim: as
> seções de percurso usam **conceito** (no manifesto, `explanation`), a do Estúdio de treino usa
> **construção** (`application`), e o fecho junta fechamento e quiz (`closing`).
>
> As três seções de percurso usavam `demonstration` até 20/09/2026. O `SECTION_INTENTS` do core
> deixou de aceitar esse valor, e estas eram as últimas três ocorrências dos 27 manifestos, então
> elas passaram para `explanation`, que é o valor restante com o mesmo sentido. O
> `ESPEC-MANIFESTO.md` foi alinhado ao core na mesma data: a lista de intenções da seção 5 já
> não traz `demonstration`, e a retirada ficou registrada lá. A divergência entre a
> especificação e o código está fechada.

> **Aviso de fidelidade.** Boa parte do diagnóstico abaixo é sobre rótulos de tela. Eles foram
> conferidos no código da plataforma atual (`packages/community-kids`, `packages/member-shell`,
> `packages/studio`) e estão citados aqui em letra literal. Onde o código não respondeu, está
> escrito "conferir antes de gravar", e não um palpite.

## Triagem dos conceitos

| O que a aula ensina | Abstrato? | Vira concreto? | Como | Quando | Por quê |
|---|---|---|---|---|---|
| Onde a aula mora, e como voltar amanhã | Não. É um caminho | Não | | | Caminho se aprende percorrendo uma vez. Uma cena seria um mapa de mentira de um lugar que ela pode abrir agora |
| Como uma aula é por dentro (seções, Anterior, Próxima seção, o avanço que trava, Concluir aula) | Não. É operação de interface | Não | | | O briefing tira operação de interface das cenas. É isso que inchou o v6 |
| Os dois lados na tela grande, os botões Ver exemplo e Criar na estreita, Expandir do Estúdio | Não. É operação | Não | | | Idem. E depende do tamanho da tela dela, coisa que nenhuma cena consegue simular com honestidade |
| **Não existe botão de play. As três ações de testar** | Sim. Contraria tudo o que ela já usou: todo jogo que ela conhece tem um play | **Sim**, mas no Estúdio de verdade | Estúdio de treino, com um jogo já montado | Antes de qualquer aula do curso | O molde de roteiro diz que a Aula 0 ensina as três e que nenhuma outra aula pode usá-las sem isso. Uma cena aqui seria uma segunda cópia do Estúdio para manter em dia |
| Confirmar um campo saindo dele | Não. É operação | Não | | Dentro do Estúdio de treino | É o gesto que mais custa caro (o número fica digitado e o jogo continua com o valor velho), mas é gesto, não conceito |
| **Salvar e enviar são coisas diferentes** | Sim. O rascunho desta aula fica neste navegador; a entrega cria uma cópia para o professor | **Sim**, com a etiqueta real e o recarregar da página | Dentro do Estúdio de treino e em um clipe curto | Logo depois de ela ter feito uma mudança | Ela vê que o 6 ficou no mesmo navegador e aprende quando enviar uma cópia |
| Pedir ajuda com uma descrição útil | Não é conceito, é um hábito | Não | | Com dois exemplos escritos, um bom e um fraco | Hábito se ensina com modelo, não com laboratório. A pergunta do quiz cobra |
| Onde ficam os materiais do curso, e de quem é cada um | Não. É um lugar, e um recado | Não | | Em seção própria, com o bloco de materiais logo abaixo do vídeo | Idem ao caminho da aula. O que não é óbvio não é o lugar, é que um dos dois arquivos não é para ela |
| XP, moedas, sequência de dias, ranking | Não para este curso | Não | | Nomeados uma vez no fecho | A decisão do v6 de não exigir personalização continua certa. O que muda é que agora eles são nomeados, em vez de escondidos |
| Avatar, quarto, Mural dos Criadores, Clube dos Criadores | Não | Não | | Nomeados uma vez no fecho | Nada disso é preciso para abrir o Dia 1, e ela precisa saber que existe para não achar que errou de lugar |

Dez coisas, duas concretizações, e as duas acontecem na plataforma de verdade. **Nenhuma cena.**

## Diagnóstico do desenho atual

**A aula inteira é assistir.** Seis clipes em fila e um quiz. A primeira coisa que ela faz num
curso que promete um jogo é responder duas perguntas sobre vídeos. Não existe um único gesto dela
nas sete seções.

**A aula ensina um controle que não existe na tela dela.** A seção 2 (*Uma seção de cada vez*)
manda "Mostrar Índice da aula, Anterior e o avanço que só libera depois do objetivo", e a ajuda da
seção diz "O índice permite rever seções disponíveis". O índice da aula é renderizado apenas fora
do modo imersivo, e o player infantil roda em modo imersivo. O que ela tem de verdade é a barra de
progresso com **"Seção X de Y"**, os botões **"Anterior"** e **"Próxima seção"**, a lista de aulas
com **"Mostrar lista de aulas"**, e, na última seção, **"Concluir aula"**.

**A aula precisa mostrar o aviso que a criança vê.** A seção do Estúdio embutido usa a etiqueta
**Alterações não salvas** e depois **Salvo**; não há estado "Salvando". O selo
**Guardado na sua conta** pertence à ferramenta completa e não aparece no Estúdio da aula.

**O rascunho desta aula é local.** Depois de aparecer **Salvo**, ela pode voltar pelo mesmo
navegador e encontrar a mudança. A entrega pedida ao fim de uma aula com projeto grava uma cópia
que pode ser retomada em outro aparelho. A introdução ensina a diferença sem prometer que um
rascunho ainda não enviado acompanha a conta.

**Os materiais moram longe de quem precisa deles.** A seção 4 (*Seu caderno e o caminho da ajuda*)
fala em "Caderno do Aluno" e "Mapa dos Pais", e manda procurar, na página do curso, uma faixa com o
título **"Seu caderno está aqui"**, com um botão por aula de material. Dois problemas de uma vez:
os nomes ditos não eram os rótulos da tela, e o material ficava a duas telas de distância de quem
estava no meio da aula. **Resolvido em 20/09/2026**, e ao contrário do que eu tinha proposto: em vez
de trocar a fala para apontar a faixa, os materiais viraram um bloco dentro desta aula, com nome
próprio. Ver a nota de decisão de produto no Resumo.

**A ajuda está subaproveitada, e ela é ótima.** "Preciso de ajuda" existe com esse nome exato, fica
na barra de baixo da aula, e abre um formulário ali mesmo, sem sair da página, com o campo **"Em
qual parte você ficou com dúvida?"** e o aviso **"O professor receberá o nome desta aula e desta
seção."** Ao enviar, aparece **"Pedido enviado. A resposta aparecerá nos seus recados."** com o
link **"Ver conversa"**, e a conversa continua em **"Recados do professor"**. A aula hoje resume
tudo isso em "use Preciso de ajuda e conte o que você fez".

**A seção dos dois lados promete coisas condicionais como se fossem sempre.** A seção 3 (*Veja o
exemplo e monte com conforto*) diz "Na tela grande, o exemplo e o Estúdio aparecem lado a lado" e
"Na tela pequena, use Ver exemplo e Criar". A divisória só arrasta quando a coluna da aula passa de
1080 pixels, e os botões **"Ver exemplo"** e **"Criar"** só aparecem em tela estreita **e** quando
o lado direito tem um editor. Numa seção com cena interativa eles não existem. Prometer um botão
que não vai estar lá é pior do que não falar dele.

**As três ações de testar não são ensinadas em lugar nenhum.** O checklist do molde é explícito:
"A Aula 0 ensina as três, e nenhuma outra aula pode usá-las sem que ela tenha ensinado". A
introdução atual não ensina nenhuma. O Dia 1 e o Dia 2 usam "clique na área do jogo e aperte" como
se ela já soubesse, e ninguém nunca disse a ela que não existe botão de play.

**Não existe caminho até a aula.** A introdução começa já dentro de uma aula. Ela não mostra o
menu, nem a Jornada, nem a página do curso, nem como voltar no dia seguinte. A primeira
dificuldade real de quem entra num curso é achar o curso outra vez.

**O fecho ocupa duas seções.** *Veja o que você construiu* é um clipe de despedida, e *Hora do
Desafio* são duas perguntas. Juntas, cabem numa seção só, como já ficou no Dia 1.

**O tour do mundo foi guardado inteiro, e sobrou silêncio.** Avatar, quarto, moedas, missões, XP e
ranking foram reservados para ambientação opcional. Como decisão de percurso está certo: nada disso
deve travar o Dia 1. O efeito colateral é que a introdução não nomeia uma única vez os lugares que
estão no menu dela, e ela vai clicar neles de qualquer jeito.

## Proposta final

### Seção 1. O seu primeiro jogo começa aqui

- **Intenção:** apresentação
- **Por que existe:** ela precisa ver o que vai construir antes de aprender onde as coisas ficam.
  Sem isso, a aula vira um tour de plataforma sem motivo.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-abertura`). O jogo pronto rodando, a nave andando e atirando no espaço.
     Fala: "Oi. Aqui você vai criar um jogo de nave, do zero, em cinco dias. Primeiro, vamos mexer
     num jogo que já funciona para você aprender a testar. Depois eu te mostro como voltar à aula,
     guardar o trabalho e pedir ajuda." Duração alvo: 30 a 40 segundos.

### Seção 2. O jogo já está rodando. As três coisas que você faz para testar

- **Intenção:** construção
- **Por que existe:** é a primeira vez que ela mexe em alguma coisa, e é aqui que ela aprende as
  três ações que todas as aulas do curso vão usar sem explicar de novo.
- **Conclui quando:** no projeto de treino, o fundo de estrelas está com velocidade 6
- **Blocos:**
  1. `dialogue`. "Nesta seção tem um jogo já montado, só para você mexer. O seu jogo, você vai
     montar do zero a partir do Dia 1. Repara numa coisa antes: não existe botão de play. O jogo
     já está rodando, o tempo todo."
  2. `video` (`video-testar`). As três ações e o gesto de confirmar, uma de cada vez, com pausa
     entre elas, e a conferência no fim. Duração alvo: 70 a 85 segundos.
  3. `studio`. O projeto de treino (especificado abaixo).

**O texto das três ações saiu daqui.** Ele era passo a passo, e passo a passo se executa na tela.
As quatro ações numeradas e a conferência final viraram instrução de produção dentro do
`video-testar`. A seção não ganhou balão: o clipe já diz tudo, e a velocidade 6 do fundo de
estrelas já é conferida pela máquina no `projectChecks`.

**O projeto de treino.** Três peças já montadas, que ela não precisa entender hoje:

- Em **Ao iniciar**: `Preparar o jogo em tela cheia`, com a tela 800 por 480 e um fundo escuro.
- Em **Enquanto estiver rodando**: `A cada quadro do jogo`, com `Limpar a tela` e
  `Desenhar fundo de estrelas (velocidade )` dentro, nessa ordem, velocidade 1.
- Em **Quando acontecer**: `Quando apertar a tecla`, com a barra de espaço, e `Tocar efeito`
  dentro.

**Três exigências de produção, e nenhuma é opcional:**

1. **O projeto de treino fica fora da cadeia `desafio-primeiro-jogo`.** Se ele entrar na cadeia, o
   Dia 1 vai abrir com o fundo de estrelas já montado, e a montagem do Dia 1 perde o sentido.
2. **Este Estúdio não é de entrega.** Nada é enviado ao professor nesta aula, e a conclusão da
   aula não pode depender de envio.
3. **O efeito sonoro escolhido não é o do disparo do Dia 2.** O menu de efeitos tem pulo, tiro,
   explosão e derrota. Usar o tiro aqui gasta a novidade do Dia 2 antes da hora.

**Por que o Estúdio e não uma cena.** A coisa a tornar concreta é o próprio Estúdio. Uma cena seria
uma segunda cópia da ferramenta, que envelhece sozinha na primeira mudança de interface, e que
ensinaria gestos que não valem no lugar de verdade.

### Seção 3. Do Início até a sua aula

- **Intenção:** conceito
- **Por que existe:** depois do primeiro gesto no jogo, ela precisa saber como reencontrar o curso
  amanhã. O caminho responde a uma necessidade que ela já viveu, sem adiar a primeira ação.
- **Conclui quando:** 90% dos dois clipes assistidos
- **Blocos:**
  1. `video` (`video-achar-a-aula`). Do Início até a aula aberta, com o menu à vista. Fala:
     "Este é o seu menu. **Início** é a sua página de todo dia, e é de lá que você continua de
     onde parou. **Jornada** é o mapa dos cursos: você clica nele, acha o Desafio do Primeiro
     Jogo, e dentro do curso as aulas aparecem numa trilha, uma depois da outra. Clica na aula que
     você estava fazendo e ela abre. Quando terminar esta introdução, o Dia 1 será o próximo.
     Amanhã, o Início também te leva direto para onde você parou."
     Duração alvo: 65 a 80 segundos.
  2. `video` (`video-por-dentro-da-aula`). A página da aula por dentro. Fala: "A aula é uma fila
     de seções, uma de cada vez. Em cima aparece em qual delas você está, tipo **Seção 3 de 7**, e
     a barrinha vai enchendo. Embaixo ficam **Anterior** e **Próxima seção**. Quando a seção pede
     uma tarefa, a Próxima seção só libera depois que a tarefa fica pronta. Na última seção o
     botão vira **Concluir aula**, e aí aparece a comemoração com o que você ganhou. Do lado fica
     a lista de aulas, e dá para esconder ela quando você quiser mais espaço." Duração alvo: 65 a 80 segundos.
  3. `dialogue`. O caminho escrito, para reler: "Início, Jornada, Desafio do Primeiro Jogo, e a
     aula do dia. Dentro da aula: uma seção de cada vez, e Próxima seção libera quando a tarefa
     fica pronta."

**Junta duas seções de hoje e acrescenta o que faltava.** *Uma seção de cada vez* e *Veja o exemplo
e monte com conforto* são a mesma coisa vista de dois ângulos, e nenhuma das duas mostrava como
chegar até ali.

**Sobre os dois lados da tela.** A parte de divisória, Ver exemplo, Criar e Expandir entra no
segundo clipe **em uma frase condicional**, porque ela depende do tamanho de tela de cada casa:
"Se a sua tela for grande, a aula fica de um lado e a ferramenta do outro, e você pode arrastar a
divisória do meio. Se for pequena, aparecem dois botões, **Ver exemplo** e **Criar**, e você
alterna entre eles. E o Estúdio tem um **Expandir**, para ele ocupar a tela toda." Nada de
prometer os botões como se estivessem sempre lá.

### Seção 4. Salvar e enviar são coisas diferentes

- **Intenção:** conceito
- **Por que existe:** o rascunho local e a cópia enviada ao professor cumprem funções diferentes.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-guardar-e-entregar`). Mostrar **Alterações não salvas** virar **Salvo** no
     Estúdio de treino; apontar **Enviar para o professor** sem apertar; recarregar e conferir o 6.
     Fala: "O rascunho desta aula fica neste navegador quando aparece Salvo. Para continuar amanhã,
     volte por este mesmo aparelho. Quando uma aula pedir, Enviar para o professor entrega uma cópia.
     Hoje não enviamos nada." Duração alvo: 35 a 45 segundos.
  2. `dialogue` (`fala-tres-destinos`). Chave mantida para a importação, com o novo resumo de duas
     ações: "Salvo mostra que o rascunho desta aula ficou neste navegador. Enviar para o professor
     entrega uma cópia quando a aula pedir."

O texto que nomeia os destinos foi incorporado ao vídeo. O balão curto permite reler a distinção.
O selo **Guardado na sua conta** pertence à ferramenta completa e não entra nesta gravação. Não
prometer recuperação de um rascunho local em outro aparelho ou depois de uma falha do dispositivo.

**A prova já aconteceu na seção de treino.** Ela recarregou a página e o 6 que escreveu continuava
lá. Esta seção dá nome ao que ela viu.

### Seção 5. O seu caderno, e o mapa para quem cuida de você

- **Intenção:** material do curso
- **Por que existe:** os dois materiais do curso passaram a morar aqui, e cada um tem dono
  diferente. O caderno é dela, e serve de conferência quando a tela não fica igual à do vídeo. O
  mapa é de quem cuida dela, e ninguém vai procurá-lo se a aula não disser que existe.
- **Conclui quando:** 90% do clipe assistido. Para exigir o download, escolher os arquivos
  obrigatórios no admin depois de subir os dois.
- **Blocos:**
  1. `video` (`video-caderno`). O bloco de materiais com os dois itens, o **Baixar** do caderno
     virando **Baixado**, e o caderno aberto numa página com os bloquinhos desenhados. Fala:
     "Nesta aula tem dois materiais para baixar, e eles aparecem logo depois deste vídeo. O
     primeiro é o seu caderno. Ele traz os bloquinhos desenhados passo a passo, para você conferir
     quando a sua tela não ficar igual à minha. Dá para ler na tela ou imprimir. O segundo é o
     **Mapa dos Pais**, e esse não é para você: é para quem cuida de você. Clica no **Baixar** de
     cada um, e eles ficam guardados no seu computador." Duração alvo: 40 a 50 segundos.
  2. `materials` (`materiais`). Os dois arquivos para baixar, na ordem em que a fala os cita. No
     manifesto ele entra como bloco já existente na aula, do mesmo jeito que o Estúdio de treino
     da seção 2: os arquivos sobem no admin, e o manifesto só aponta para o bloco.
  3. `dialogue` (`fala-responsavel`). O recado que tira o mapa da prateleira: "O **Mapa dos Pais**
     é para quem é responsável por você. Chama essa pessoa, mostra o botão de baixar e pede para
     ela ler. Tem lá o que ela precisa saber sobre segurança e sobre o ritmo das aulas."

**Por que o vídeo vem antes do bloco, e não depois.** O bloco sozinho é uma prateleira: dois botões
de baixar que ninguém sabe para que servem, e o mapa dos pais em especial só sai da prateleira se
alguém disser que ele não é para ela. O vídeo dá o dono de cada um, e o bloco fica logo
abaixo, no alcance da mão.

### Seção 6. Travou. O que fazer

- **Intenção:** conceito
- **Por que existe:** ela vai travar em algum bloco, e o caminho da ajuda precisa estar aprendido
  antes, não descoberto no meio da dificuldade.
- **Conclui quando:** 90% do clipe assistido
- **Blocos:**
  1. `video` (`video-ajuda`). O botão na barra de baixo, o formulário e os recados. Fala: "Quando
     emperrar, dentro da aula tem o botão **Preciso de ajuda**. Ele abre uma perguntinha: **Em qual
     parte você ficou com dúvida?** Você escreve o que fez e o que apareceu na tela, e manda. O
     nome da aula e da seção vão junto, então eu já sei onde você está. A resposta chega em
     **Recados do professor**." Duração alvo: 50 a 60 segundos. O clipe também encena os dois
     pedidos dentro do próprio formulário: digita o que ajuda, apaga, digita o que não ajuda, e
     fecha com a regra dita uma vez.
  2. `dialogue` (`fala-pedido-bom`). O contraste, para reler: "Um pedido que ajuda: coloquei o
     Criar nave dentro do Ao iniciar, com x 400 e y 410, e a nave não aparece na tela. Um pedido
     que não ajuda: não deu. A diferença é dizer o que você fez e o que apareceu na tela."

**O texto dos dois pedidos saiu daqui.** O contraste virou encenação dentro do `video-ajuda`, no
formulário de verdade, e o balão acima ficou como lembrete curto, porque é o hábito que o quiz
cobra no fim da aula.

**A fala não diz onde ficam os Recados.** Ela dizia "ali embaixo no menu", e o menu da esquerda
está recolhido dentro da aula. Apontar para ele manda procurar um lugar que não está na tela.

### Seção 7. Você já sabe se virar aqui

- **Intenção:** fechamento
- **Por que existe:** fecha o ciclo, nomeia o resto do mundo uma vez só, e engancha o Dia 1.
- **Conclui quando:** as duas perguntas são respondidas
- **Blocos:**
  1. `dialogue` (`fala-fecho`). O fecho: "Pronto. Você sabe achar a sua aula, sabe que o jogo roda
     sozinho, sabe as três coisas que se faz para testar, e sabe onde o seu trabalho fica
     guardado. Agora vem comigo, que o Dia 1 é para colocar a sua nave no espaço."
  2. `video` (`video-menu`). O passeio pelos outros lugares do menu: Comunidade, com o **Mural dos
     Criadores**, o **Clube dos Criadores** e o **Ranking**, e **Meu espaço**, com o perfil, o
     avatar, o quarto e a escolha da cor. Tom de passeio, não de tarefa: nada ali é condição para
     seguir, e o clipe não pede ação nenhuma. Duração alvo: 50 a 60 segundos.
  3. `quiz`. Duas perguntas.

**Esta é a exceção do dia.** O texto do menu era o único dos quatro que estava numa seção sem
clipe, então ele não tinha para onde ir e virou o `video-menu`. O clipe não entra em
`completion.blockIds`: como o texto que ele substitui não era critério de conclusão, a seção
continua concluindo pelo quiz, e o passeio continua opcional. A escolha da cor, que antes era uma
ação de plataforma solta, agora aparece dentro do passeio.

**Quiz proposto** (a segunda pergunta fica como está; a primeira muda por causa das etiquetas):

> **Você quer parar agora e continuar neste aparelho amanhã. O que faz?**
> - Espera aparecer Salvo, depois pode fechar. **(correta)**
> - Aperta Enviar para o professor toda vez que encaixa um bloco.
>
> *O rascunho fica neste navegador quando aparece Salvo. A aula avisa quando enviar uma cópia ao
> professor.*

> **A nave não apareceu. Qual pedido ajuda mais?**
> - "Criei a nave em Ao iniciar, mas ela não aparece na tela." **(correta)**
> - "Não deu", sem contar o que tentou.
>
> *Descrever a ação e o resultado ajuda o professor a localizar a dificuldade.*

**Junta duas seções de hoje**, no mesmo movimento que o Dia 1 fez com o fecho e o quiz.

## Experiências e demonstrações desta aula

**Nenhuma cena. Esta aula pede um passeio guiado, e o passeio acontece na plataforma de verdade.**

A conclusão não é economia, é doutrina. O briefing tira das cenas justamente o que esta aula tem:
operação de interface e qualquer coisa que ela testa imediatamente no lugar real. Uma
introdução com cena seria uma maquete da plataforma dentro da plataforma, e essa maquete
envelheceria na primeira mudança de tela. O v6 já mostra o preço disso ao descrever um índice de
aula que ela ainda não tem.

Os três candidatos foram considerados e recusados, um por um:

**1. Uma cena do percurso da aula (as seções, o avanço, os dois lados).** Recusada. O conceito é
"onde fica cada coisa", e "onde" não tem botão para girar: não dá para escrever "quando eu aumento
X, acontece Y". Pelo critério da seção 3 do briefing, nem experimentação nem demonstração se
encaixam, porque não é nem relação com botão nem processo no tempo. É um lugar.

**2. Uma cena de salvar contra enviar (dois destinos invisíveis).** Recusada, e foi a mais
tentadora. O conceito é abstrato de verdade, e a estrutura lembra a `world` do Dia 1 (existir nos
bastidores contra aparecer na tela). Mas o foco da `world` é um objeto do jogo, e o briefing proíbe
forçar cena cujo foco não bate. Mais forte que isso: a concretização honesta já existe e é grátis.
Ela muda um número, recarrega a página e encontra o número lá. Inventar dois destinos de mentira
numa cena para ensinar dois destinos de verdade é trabalho a mais que ensina pior.

**3. Uma cena das três ações de testar.** Recusada pelo mesmo motivo, agravado: a cena teria que
simular um Estúdio que não roda, para ensinar que o Estúdio roda sozinho. O Estúdio de treino da
Seção 2 resolve com o objeto real.

**O que substitui as cenas** é o Estúdio de treino, que é a única coisa desta aula que ela
faz com as mãos. Ele carrega três aprendizados de uma vez: as três ações de testar, o gesto de
confirmar um campo, e a prova de que nada se perde.

## Vídeos

| Chave | O que mostra | Origem | Duração alvo | Reaproveita gravação? |
|---|---|---|---|---|
| `video-abertura` | **A nave que você vai construir.** O jogo pronto e a promessa da aula | `video-abertura-v6` | 30 a 40 s | fala parcial, tela nova |
| `video-testar` | **As três coisas que você faz para testar.** As três ações executadas na tela, o confirmar do campo e a conferência do 6, no Estúdio de treino | novo | 70 a 85 s | não |
| `video-achar-a-aula` | **Achando a sua aula.** Do Início até a aula, pelo menu e pela Jornada | novo | 65 a 80 s | não |
| `video-por-dentro-da-aula` | **Por dentro de uma aula.** As seções, o avanço, a lista de aulas e os dois lados | `video-percurso` + `video-tela` | 65 a 80 s | a ideia sim, a tela não |
| `video-guardar-e-entregar` | **Salvar e enviar são coisas diferentes.** A etiqueta local, o botão de entrega e a prova do 6 após recarregar | `video-salvar` | 35 a 45 s | fala parcial, cortar a garantia absoluta |
| `video-caderno` | **O seu caderno, e o mapa para quem cuida de você.** O bloco de materiais, o Baixar virando Baixado e o caderno aberto | `video-materiais`, primeiro terço | 40 a 50 s | fala parcial, tela nova |
| `video-ajuda` | **Travou. Como pedir ajuda.** O Preciso de ajuda, os recados, e os dois pedidos encenados dentro do formulário | `video-materiais`, resto | 50 a 60 s | fala parcial |
| `video-menu` | **Os outros lugares do menu.** Comunidade, Mural, Clube, Ranking, Meu espaço, perfil, avatar, quarto e a cor | novo, nasceu do texto do menu | 50 a 60 s | não |

**Saldo:** de 6 clipes para 8, com o de fecho cortado e três novos entrando, um deles nascido do
texto corrido que saiu do manifesto. Em minutagem a queda continua grande: o clipe dos três modos
de fazer a atividade tinha **4min34s** de fala gravada, documenta uma interface que não existe
mais, e vira meio minuto dentro do `video-por-dentro-da-aula`.

**Nada da gravação de tela de 2026 se aproveita.** Menu, página de curso, página de aula e barra do
Estúdio mudaram. O que sobrevive é fala, e mesmo assim parcial: a abertura, a apresentação dos
materiais e a etiqueta de salvamento.

## Nota de plataforma: o que o menu mostra para quem acabou de entrar

Medido no código em 20/09/2026, e vale para os dois clipes que mostram o menu (`video-achar-a-aula`
e `video-menu`).

O menu **esconde** o filho trancado, não o mostra apagado, e quando sobra um filho só o item volta a
ser link direto, sem lista. Quem assiste esta aula está no primeiro posto, o **Faísca**.

| Item | O que ela vê |
|---|---|
| **Início**, **Jornada** | link direto, sempre |
| **Criar** | **link só, sem lista.** O Estúdio e o Pinta pedem o posto **Construtor(a)**, o Pensa pede **Inventor(a)** e o Molda pede **Explorador(a) de Mundos**. Sobra Meus trabalhos, e um filho só não abre lista |
| **Comunidade** | lista com Nossa turma, Mural dos Criadores, Clube dos Criadores e Ranking. Não depende de ferramenta |
| **Meu espaço** | lista com Meu perfil, Meu avatar e Meu quarto. Não depende de ferramenta |

**Consequência para a gravação:** gravar numa conta Faísca de verdade. Numa conta de professor o
menu aparece inteiro, e o clipe prometeria portas que quem assiste não tem.

## Continuidade

- **Assume da anterior:** nada. É a primeira aula do curso e o primeiro contato dela com a
  plataforma.
- **Entrega para o Dia 1:** sabe chegar na aula e voltar amanhã; sabe que não existe botão de play
  e conhece as três ações de testar; sabe confirmar um campo clicando fora; lê as etiquetas de
  salvamento e sabe que a entrega é outra coisa; sabe pedir ajuda com uma frase útil.
- **O que o Dia 1 passa a poder usar sem reensinar:** "olha o seu jogo", "clica na área
  do jogo e aperta a tecla", "recarrega a página" e "confirme saindo do campo". Hoje o Dia 1 usa
  três dessas quatro sem que ninguém as tenha ensinado.
- **Valores canônicos que saem daqui:** nenhum valor do jogo. O projeto de treino é descartável e
  não entra na cadeia. O único número que ela escreve, a velocidade 6 do fundo de estrelas, morre
  aqui, e o Dia 1 manda escrever velocidade 1 do zero.
- **Campos livres:** a cor do tema dela, se a ação de plataforma opcional do fecho for usada.
- **A confirmar com o professor, antes de gravar:** os títulos publicados das aulas de material
  deste curso; se o selo da nuvem aparece no Estúdio embutido na aula; e o que o tutorial guiado
  do Início já cobre, para os dois não contarem a mesma coisa em seguida.
