# Módulos de Cadê Todo Mundo?

**Título do curso:** Cadê Todo Mundo?

**Descrição curta:** Monte um jogo de procurar personagens escondidos.

**Descrição:** Faça os esconderijos sumirem com um toque e conte os personagens encontrados.
O jardim já está preparado. Você monta as regras com blocos e testa até achar todo mundo.

## Módulo 1: Minha primeira busca

**Resumo:** Jogue o exemplo, faça os personagens aparecerem, programe a contagem dos três achados, deixe o jogo com a sua cara e publique.

- **Aula 1:** [O primeiro achado](aulas/cade-todo-mundo-aula-1.md)
- **Aula 2:** [Complete a busca](aulas/cade-todo-mundo-aula-2.md)
- **Aula 3:** [Seu certificado](aulas/cade-todo-mundo-certificado.md)

## Situação editorial

O curso já foi gravado e testado com duas crianças. A revisão de 27/09/2026 muda a linguagem
das nove seções: tarefa imediata, passos completos e tutoriais de interface no Como Fazer.
A revisão atual tem quatro seções na Aula 1, cinco na Aula 2 e duas no certificado: quiz e celebração. São onze seções e dez vídeos.

Os arquivos plannedVideo dos manifestos são moldes de autoria. A situação atual de gravação
está descrita abaixo, em **Debinha e Dedé nos vídeos**. Ao atualizar o Admin, reconciliar os blocos pelos identificadores e preservar
vídeos, PDF, configuração do certificado, projetos e progresso existentes. Não importar
um molde com vídeos planejados e materiais vazios por cima do conteúdo publicado.

## Debinha e Dedé nos vídeos

Aplicação de 10/10/2026, conforme a orientação do responsável: manter uma criança por aula e
alternar na seguinte. Os roteiros separam a professora, o avatar e as falas do Zappy na página.

| Aula | Avatar e participações | Estado da produção |
| --- | --- | --- |
| Aula 1 | Debinha: oito entradas nos quatro vídeos (duas novas na parte 4) | Gravação base informada; pontos de edição registrados |
| Aula 2 | Dedé: nove entradas distribuídas pelos cinco vídeos | Aplicado ao roteiro; gravação e edição não confirmadas |
| Certificado | Debinha: “Eu consegui!” na celebração | Aplicado ao roteiro; gravação e edição não confirmadas |

A professora responde às perguntas antes do próximo gesto. As notas de tela marcam entrada e
saída, sem sobrepor vozes ou cobrir os controles. A contagem mantém o caminho completo dos blocos
e a conferência passa a começar com “Se algo não funcionou no seu jogo…”, como na Aula 1.
O quiz continua sem vídeo. Zappy não fala dentro dos vídeos; as pontes e o recurso Ouvir ficam
na página. Se aparecer no meme ou na interface capturada, sua presença é visual.

Os tempos antigos são referências para produção; conferir a duração final com as participações.
As orientações históricas de regravação abaixo não substituem o estado atual da tabela. Não
regravar os quatro vídeos da Aula 1 apenas por causa das marcações. As falas e os IDs de edição
estão em [Avatares nos vídeos](AVATARES-NOS-VIDEOS.md) e nos roteiros de cada aula.

## Conteúdo e continuidade

A Aula 1 começa com a versão pronta do jogo para brincar e encontrar os três personagens.
Apresenta o caderno como consulta opcional, propõe os dois testes de toque e ensina a regra
de visibilidade. A prática termina com envio, confirmação e conclusão da aula.

A Aula 2 retoma o contador em zero, propõe quatro testes na experiência e ensina a soma no
evento de toque. A montagem continua com caminho completo, encaixe, campos e teste de 1, 2, 3.
O fechamento ensina a publicar o mesmo jogo no Mural: Compartilhar, gerar capa, publicar,
comemorar, copiar o link de jogar para a família e os amigos, fechar e concluir a aula. A
publicação é a tarefa ensinada, sem novo bloqueio técnico de conclusão. Trocar a capa fica no
Como Fazer. Antes de
publicar, **Deixe o jogo com a sua cara** ensina a trocar bichos, esconderijos e a mensagem do final.

Complemento de 03/10/2026: toda seção com vídeo tem uma ponte do Zappy logo após o vídeo.
Caderno, retomada e publicação receberam as falas que faltavam, sem novos critérios de conclusão.
Hoje são dez seções com vídeo, todas com ponte (incluindo **Deixe o jogo com a sua cara**, de
05/10/2026), mais a seção do quiz, que não tem vídeo e começa pela fala do Zappy.
O [quiz único antes do certificado](proposta-quizzes-cursos-curtos-2026-10-03.md) integra o manifesto e o caderno: três perguntas, fala inicial do Zappy e nenhum vídeo na seção de revisão.

O jardim e os personagens já vêm preparados. A narração reconhece que a criança programou
a reação ao toque e a contagem. O certificado encerra o curso sem oferta comercial.

## Caderno

Um único PDF para as duas aulas, anexado ao bloco **caderno** de **Seu Mapa da Aventura**, na
Aula 1. A leitura, o download e a impressão continuam opcionais; apenas o vídeo conta para
concluir essa seção. Desde 06/10/2026, o vídeo apresenta o caderno como escolha: ler na aula ou
clicar em **Baixar** para guardar e consultar onde quiser. O mesmo anexo alimenta a consulta na tela e o download.

Arquivo: **output/pdf/cade-todo-mundo-caderno-do-aluno.pdf**. Fonte editável:
**recursos/cade-todo-mundo/caderno-do-aluno.template.html**. Para regenerar, usar
**bun docs/aulas-interativas/recursos/cade-todo-mundo/gerar-caderno.ts**.

A Aula 2 mantém **retireBlockKeys: ['caderno']** para o molde anterior, mas não recebe outro PDF.
O PDF atualizado tem sete páginas: capa, visão geral, duas montagens, personalização, publicação e revisão com certificado. A página 5 mostra os sete bichos e os seis esconderijos, com os desenhos e nomes do jogo; a publicação fica na página 6 e a revisão com certificado na 7. A galeria é gerada a partir de **JARDIM_BICHOS**, **JARDIM_ESCONDERIJOS** e **jardimSvg**, as mesmas fontes do projeto. Os desenhos dos blocos usam suas cores oficiais. A atualização do anexo no Admin deve preservar o bloco e o histórico existentes. Para gerar com conferência de cores, fontes e limites: **python docs/aulas-interativas/recursos/desafio-farol/gerar-materiais.py cade-todo-mundo**.
Como folhear e baixar está no tutorial de materiais.

## Configuração que deve ser preservada

- Curso **cade-todo-mundo**, etapa Primeiros Passos / 2D, curso extra sem posição.
- Lições **aula-1**, **aula-2** e **certificado**, nessa ordem.
- Cadeia **cade-todo-mundo** para continuar o projeto entre aulas. A Aula 2 usa a retomada
  preparada somente quando não há projeto salvo.
- Estúdio incorporado em modo blocos, nível **iniciante-2d**, extensão Jogo 2D e blocos de
  [blocos-cade-todo-mundo.json](blocos-cade-todo-mundo.json). Sem Pinta ou Estúdio completo.
- Visibilidade dentro do evento na primeira prática; soma de 1 em achados na segunda.
- Compartilhamento habilitado apenas no projeto da Aula 2, depois do envio. O mesmo
  workspace permanece no fechamento. A publicação não é condição de conclusão.
- Matrículas, ofertas externas e permissões de Mural existentes. Não prometer acesso
  permanente ao Mural nem introduzir oferta dentro do certificado.

## Verificação

Executar **bun docs/aulas-interativas/qa/validar-manifestos.ts cade-todo-mundo**,
**python docs/aulas-interativas/validar-roteiros.py cade-todo-mundo** e os testes existentes
**cade-todo-mundo-*.test.ts**. Conferir as falas e a nova seção de quiz antes do certificado,
preservando os identificadores das seções anteriores, projetos, alvos e permissões. A revisão
exige todas as respostas corretas com nova tentativa imediata; certificados já emitidos permanecem acessíveis.

Na gravação, conferir rótulos atuais, envio com confirmação e conclusão. No ensaio com crianças,
verificar se começam a atividade sem explicação extra do adulto. Na abertura, devem saber
qual jogo vão construir, jogar a versão pronta e saber como avançar. Repetir essa conferência
nas experiências e nas duas montagens antes de substituir os vídeos.

## Revisão de 05/10/2026

As duas montagens passaram a começar pela retomada da experiência no próprio jogo, regra registrada nas [Diretrizes Pedagógicas](DIRETRIZES-PEDAGOGICAS.md):

- **Faça alguém aparecer:** a fala lembra que o toque sozinho não faz nada e pede para tocar num esconderijo do jogo. Nada acontece, porque ainda não há ação ligada ao toque. Só então vem a ligação.
- **Cada personagem vale um achado:** a fala lembra a experiência da contagem e pede para tocar num esconderijo. O personagem aparece, mas Achados continua em zero.

No caderno, as duas páginas de montagem trazem a retomada numa caixa de experiência, na ordem da aula. Os vídeos dessas duas seções precisam ser regravados. A retomada não manda clicar em **Anterior**: ela lembra a experiência e convida a programar ("Agora a gente vai fazer isso no seu jogo!").

Na mesma revisão:

- **As experiências explicam enquanto fazem.** O vídeo faz cada teste no ritmo da fala e diz por que o resultado aconteceu. Na Aula 1, a comparação é "toda ação tem uma reação": a cócega é a ação e a risada é a reação; no jogo, a gente precisa ligar uma reação ao toque. Na Aula 2, Achados é como o placar de um jogo de futebol. Cada comparação tem um meme ilustrado nosso na nota de tela.
- **Mexa e veja numa seção própria (seção nova da Aula 2, Deixe o jogo com a sua cara).** Só mudanças que a criança mantém. Saíram os momentos de trocar e voltar dentro das montagens (o 50% da Aula 1) e a mensagem de vitória saiu da montagem da Aula 2. Depois do envio e antes de publicar, a criança troca a imagem dos bichos e dos esconderijos nos blocos **Criar sprite**, na área **Ao iniciar**, e escreve a mensagem do final. O projeto traz sete bichos e seis esconderijos, com caixa única por tipo (72 × 87 e 161 × 144), então a troca não estica o desenho nem muda o lugar. Os sprites passaram a se chamar **bicho1** a **bicho3** e **esconderijo1** a **esconderijo3**. A seção é de fechamento (a entrega continua sendo a última montagem), conclui pelo vídeo e não tem critério. Chave nova: **personalizar**, com o vídeo **video-a2-personalizar**. No Admin, acrescentar a seção sem mexer nas outras.
- **Projetos salvos antes da revisão** recebem as imagens novas ao abrir: o Estúdio da aula acrescenta ao projeto salvo as imagens do curso que faltam, sem trocar nenhuma das que já existem. Eles guardam os nomes antigos dos sprites (coelho, arbusto e os outros) e as caixas antigas (coelho 54 × 87, raposa 66 × 84, coruja 72 × 81, arbusto 154 × 116, pedras 161 × 112, flores 133 × 144). Ao escolher outra imagem, o Estúdio ajusta largura e altura ao tamanho da imagem nova e mantém o canto de cima do sprite. Por isso, nesses projetos, o desenho trocado pode ficar um pouco fora do lugar: um bicho novo fica até 18 pixels mais largo para a direita e até 6 pixels mais baixo; um esconderijo novo, até 28 pixels mais largo para a direita ou até 32 pixels mais baixo. A fala da seção serve aos dois projetos, porque cita nomes de imagens, que existem nos dois. As crianças que começarem depois recebem o projeto novo, em que bicho por bicho e esconderijo por esconderijo não muda tamanho nem lugar.
- **A imagem do bloco é um NOME.** No fim do bloco **Criar sprite**, depois de **com imagem**, o Estúdio mostra o nome da imagem (coelho, arbusto…), e não um desenho. A fala manda clicar nesse nome para abrir a lista com as imagens do jogo e, se não achar, rolar a lista. O erro provável é escolher uma imagem do outro tipo (um esconderijo no bloco de um bicho fica grande e aparece antes do toque); a fala ensina a corrigir escolhendo de novo um desenho do mesmo tipo.

## A surpresa do final, 07/10/2026

Decisão do responsável (Diretrizes, seção 2, "A surpresa do final"), só aqui e na Chave do Farol, os primeiros cursos da criança (nos seguintes ela já sabe que pode personalizar): a seção **Deixe o jogo com a sua cara** passa a ser anunciada desde o começo.

- **Plantar:** o vídeo `video-a1-abertura` conta, antes de passar a vez, que no fim da aventura tem uma surpresa que vai deixar o jogo ainda mais seu (alvo de 40 a 55 s; era 35 a 45).
- **Lembrar:** o vídeo da montagem da Aula 1 (`video-a1-programar`) reconhece a conquista depois do envio com "Pronto, você já programou a primeira regra do seu jogo!" e lembra a surpresa antes de **Concluir fase**. A fala acompanha o encerramento, sem pedir que a criança olhe novamente para um resultado já testado.
- **Revelar:** o vídeo `video-a2-personalizar` começa com "A surpresa chegou! Olha quem mais pode brincar de se esconder!", mostra a galeria do Mapa da Aventura e fecha dizendo que é com essa cara que o jogo vai para o Mural; a ponte `ponte-a2-personalizar` começa com "A surpresa chegou!".
- **Mapa da Aventura:** a visão geral ganhou o cartão 3, **A surpresa do final**, e a página 5 tem o sobretítulo **Fase 2 · A surpresa do final**, com "o seu jogo não precisa ficar igual ao do vídeo". Continua com 7 páginas.

Seções, blocos, critérios e identificadores não mudaram. No Admin: importar os manifestos das Aulas 1 e 2 e substituir o anexo do Mapa da Aventura. Regravar os três vídeos citados.

## Revisão de 06/10/2026

A pedido do responsável, todas as falas passaram a conversar com a criança e a chamar a atenção dela. A regra entrou nas [Diretrizes Pedagógicas](DIRETRIZES-PEDAGOGICAS.md), seção 6, para os próximos cursos já nascerem assim. Seções, blocos, critérios e identificadores não mudaram.

- **Seu Mapa da Aventura** (na época, Seu Caderno do Aluno): saiu o "Não precisa baixar nem imprimir", que a criança entendia como uma ordem para não baixar. O vídeo agora diz "Olha aqui: este é o seu Mapa da Aventura!" e oferece as duas escolhas: ler aqui mesmo ou clicar em **Baixar** para guardar o mapa e consultar onde quiser. O Zappy da seção, a página 2 do caderno e o tutorial **Como abrir o Mapa da Aventura e os materiais**, no Como Fazer, seguem a mesma ideia.
- **Narração:** os momentos que importam ganharam um chamado para a tela: "Olha aqui" ao mostrar um lugar ou bloco, "Olha só" quando aparece um resultado, "Repare" num detalhe (o número Achados, o nome que já vem no bloco) e "Tá vendo?" depois do teste da retomada.
- **Conversa contínua (segunda rodada do mesmo dia):** as falas deixaram de ser frases soltas lidas em sequência. Cada frase se liga à anterior, cada resultado vem com o porquê e a experiência do toque diz com clareza que o toque é a ação e que a reação é o arbusto ficar invisível. A retomada da Aula 1 passou de "Primeiro, toque num esconderijo. Nada acontece: o toque ainda não tem uma reação. Vamos ligar uma." para "Primeiro, toque num esconderijo do seu jogo. Tá vendo? Não acontece nada, porque o toque ainda não tem nenhuma reação ligada a ele…".
- **O que já vem pronto:** saiu da montagem da Aula 1 a frase solta "O jardim e os personagens já estão preparados", e a mensagem de vitória da Aula 2 deixou de ser apresentada como "já estava preparada": a fala diz que quem a faz aparecer é a contagem montada pela criança. O reconhecimento do que veio pronto fica no certificado ("O jardim e os personagens já vieram prontos, mas olha só o que você programou…").
- **Três vozes:** "você" para o que é da criança e o que ela faz, "a gente" para pensar junto e convidar, "eu" só na demonstração (regra registrada nas Diretrizes). "No nosso jogo" virou "No seu jogo" na experiência do toque e na montagem da Aula 2; na experiência do Achados, em que o jogo da criança ainda não conta, ficou "Aqui no jardim é parecido".
- **Durações:** com as explicações, alguns vídeos ficaram um pouco mais longos: abertura 35 a 45 s, caderno 25 a 35 s, experiência do toque 70 a 90 s, retomada da Aula 2 25 a 35 s, experiência do Achados 75 a 95 s e certificado 20 a 30 s.
- **Pontes do Zappy:** começam convidando ("Sua vez!", "Agora…!", "Hora de…!") e falam do jogo da criança ("Seus personagens já aparecem, mas Achados ainda fica em zero").

Os dez vídeos precisam ser regravados com as falas novas. A fórmula de verificação ("Funcionou? Clique em Verificar esta parte…") continua a mesma dos outros cursos. O PDF do caderno foi regerado; no Admin, substituir o anexo e importar o tutorial do Como Fazer atualizado.

## Revisão de 06/10/2026 (vocabulário da aventura)

A pedido do responsável, a plataforma deixou de parecer uma extensão da escola: tudo o que a criança vê e ouve usa o vocabulário da aventura, regra registrada nas [Diretrizes Pedagógicas](DIRETRIZES-PEDAGOGICAS.md), seção 6. Por dentro (chaves, identificadores, `plannedVideo`, objetivos e documentos da equipe), curso, aula, seção e caderno continuam. Seções, blocos, critérios, identificadores e durações não mudaram.

- **Falas e pontes do Zappy:** os botões citados passaram a ser **Próxima parte**, **Verificar esta parte**, **Objetivo cumprido!**, **Enviar para o guia** e **Concluir fase**, e a retomada diz "Lembra da experiência da parte anterior?". Na Aula 2, "do jeito que ficou na Aula 1" virou "na Fase 1", "nesta aula" virou "agora" e "Na aula, ele pode aparecer só como um ícone" virou "Aqui, ele pode aparecer…".
- **Caderno para a criança:** a seção 2 da Aula 1 se chama **Seu Mapa da Aventura**, o material é **Mapa da Aventura: Cadê Todo Mundo?** e o vídeo diz "Olha aqui: este é o seu Mapa da Aventura! (…) Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o mapa e consultar onde quiser." As chaves **seu-caderno-do-aluno** e **caderno** continuam.
- **PDF:** capa, título e rodapé dizem Mapa da Aventura; os cabeçalhos passaram a Fase 1, Fase 2 e Fase 3, "seção" virou "parte" e "professor" virou "guia". A capa dizia "Todos os passos para construir o nosso jogo." e agora diz "o seu jogo". O arquivo continua **output/pdf/cade-todo-mundo-caderno-do-aluno.pdf**, agora com sete páginas após a inclusão da galeria de personalização.
- **Certificado:** sem imagem base, o PDF tem o título **Certificado de Criador**, e a frase passou de "concluiu Cadê Todo Mundo?" para "completou a aventura Cadê Todo Mundo?".
- **À noite, a equipe no lugar do guia:** "Enviar para o guia" soava estranho. Falas, pontes, notas de gravação e Mapa citam **Enviar meu projeto**, confirmado em **Enviar**, e as pontes dizem "antes de enviar o seu projeto"; quem recebe é a equipe. Manifestos e PDF (7 páginas) gerados de novo.

Os vídeos precisam ser gravados com as falas novas. No Admin, substituir o anexo do caderno e conferir os títulos das seções e o bloco do certificado.

## Full review de 06/10/2026

Os achados foram conferidos no código e aplicados juntos em roteiros, gerador, manifestos, propostas e Mapa da Aventura. Seções, blocos, critérios e identificadores não mudaram.

- **Ações de saída:** as pontes das duas experiências (do toque e do Achados) terminam em "Quando terminar, clique em Próxima parte.".
- **Publicação:** a ponte e o Mapa dizem "Se precisar, peça ajuda a um adulto"; o **Compartilhar** que aparece só como ícone é "uma setinha para cima", conferido no ícone do Estúdio; a ajuda escrita fala em "a área de ajuda", sem "nossa".
- **Três vozes:** o título da experiência da Aula 2 passou de "Quantos já encontramos?" para **Quantos você já encontrou?**, e a direção do vídeo do Achados diz "aqui no jardim é parecido" no lugar de "no nosso jogo".
- **O porquê sem círculo:** "Achados vai para 1, porque eu encontrei um personagem e o jogo somou um"; na vitória, "a mensagem aparece quando Achados chega a 3"; na troca de imagens, todos os bichos e todos os esconderijos "foram desenhados do mesmo tamanho", e por isso o desenho novo cabe no lugar do antigo. Ali a fala usa "por isso" e não "então", porque a criança está olhando um bloco **Se** do jogo.
- **Frase mais curta:** na Aula 1, "Cada esconderijo é um sprite, que é um objeto do jogo. E escolhido é o nome que o jogo dá ao esconderijo que você tocar.".
- **Mapa da Aventura:** a página da Fase 1 deixou de inverter ação e reação ("Você vai ligar uma reação ao toque: o esconderijo fica invisível e o personagem aparece"); o teste da Fase 1 diz que Achados fica em zero porque o jogo ainda não conta; as duas verificações usam a fórmula de sempre ("Se faltar alguma coisa, corrija os blocos e clique de novo…"); e todos os botões são citados com "clique em", inclusive **Baixar**, **Voltar para a fase** e **Preciso de ajuda**. O PDF tem sete páginas, com personalização e publicação em páginas próprias.

- **Retomada da Aula 2, curta e com o problema primeiro (à noite, pedido da dona):** "Aqui no seu jogo, toque num esconderijo. Tá vendo? O personagem aparece, mas Achados continua em zero, porque o seu jogo ainda não conta." Depois vêm a lembrança da experiência e o anúncio, uma vez só, colado ao primeiro passo. Saiu o segundo anúncio ("Então a gente vai ensinar o jogo a somar um em Achados…"). Foram de 70 para 49 palavras.
- **Conferência uma vez só, depois do teste:** a montagem da Aula 2 não termina mais em "Confira se ficou assim:"; a lista dos blocos entra depois do teste, com o gatilho genérico "Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: …". No Mapa da Aventura, as páginas das Fases 1 e 2 ganharam o teste como passo 4, o desenho dos blocos virou "Se no seu jogo não aconteceu isso, confira se ficou assim" e a caixa final ficou só com a verificação e o envio.

No Admin: importar os manifestos das Aulas 1 e 2 e substituir o anexo do Mapa da Aventura. Os vídeos ainda precisam ser gravados com as falas novas.
