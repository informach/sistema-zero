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

Os arquivos plannedVideo dos manifestos são moldes de autoria. As novas falas precisam de
novas gravações. Ao atualizar o Admin, reconciliar os blocos pelos identificadores e preservar
vídeos, PDF, configuração do certificado, projetos e progresso existentes. Não importar
um molde com vídeos planejados e materiais vazios por cima do conteúdo publicado.

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

Um único PDF para as duas aulas, anexado ao bloco **caderno** de **Seu Caderno do Aluno**, na
Aula 1. A leitura, o download e a impressão continuam opcionais; apenas o vídeo conta para
concluir essa seção. Desde 06/10/2026, o vídeo apresenta o caderno como escolha: ler na aula ou
clicar em **Baixar** para guardar e consultar onde quiser. O mesmo anexo alimenta a consulta na tela e o download.

Arquivo: **output/pdf/cade-todo-mundo-caderno-do-aluno.pdf**. Fonte editável:
**recursos/cade-todo-mundo/caderno-do-aluno.template.html**. Para regenerar, usar
**bun docs/aulas-interativas/recursos/cade-todo-mundo/gerar-caderno.ts**.

A Aula 2 mantém **retireBlockKeys: ['caderno']** para o molde anterior, mas não recebe outro PDF.
O PDF atualizado tem seis páginas: visão geral, montagem, troca de bichos e publicação, revisão e certificado. Os desenhos usam as cores oficiais de cada bloco. A atualização do anexo no Admin deve preservar o bloco e o histórico existentes. Para gerar com conferência de cores, fontes e limites: **python docs/aulas-interativas/recursos/desafio-farol/gerar-materiais.py cade-todo-mundo**.
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

No caderno, as duas páginas de montagem trazem a retomada numa caixa de experiência, na ordem da aula. Os vídeos dessas duas seções precisam ser regravados. A retomada não manda clicar em **Anterior**: ela lembra a experiência e convida a programar ("Agora vamos programar isso no seu jogo!").

Na mesma revisão:

- **As experiências explicam enquanto fazem.** O vídeo faz cada teste no ritmo da fala e diz por que o resultado aconteceu. Na Aula 1, a comparação é "toda ação tem uma reação": a cócega é a ação e a risada é a reação; no jogo, a gente precisa ligar uma reação ao toque. Na Aula 2, Achados é como o placar de um jogo de futebol. Cada comparação tem um meme ilustrado nosso na nota de tela.
- **Mexa e veja numa seção própria (seção nova da Aula 2, Deixe o jogo com a sua cara).** Só mudanças que a criança mantém. Saíram os momentos de trocar e voltar dentro das montagens (o 50% da Aula 1) e a mensagem de vitória saiu da montagem da Aula 2. Depois do envio e antes de publicar, a criança troca a imagem dos bichos e dos esconderijos nos blocos **Criar sprite**, na área **Ao iniciar**, e escreve a mensagem do final. O projeto traz sete bichos e seis esconderijos, com caixa única por tipo (72 × 87 e 161 × 144), então a troca não estica o desenho nem muda o lugar. Os sprites passaram a se chamar **bicho1** a **bicho3** e **esconderijo1** a **esconderijo3**. A seção é de fechamento (a entrega continua sendo a última montagem), conclui pelo vídeo e não tem critério. Chave nova: **personalizar**, com o vídeo **video-a2-personalizar**. No Admin, acrescentar a seção sem mexer nas outras.
- **Projetos salvos antes da revisão** recebem as imagens novas ao abrir: o Estúdio da aula acrescenta ao projeto salvo as imagens do curso que faltam, sem trocar nenhuma das que já existem. Eles guardam os nomes antigos dos sprites (coelho, arbusto e os outros) e as caixas antigas (coelho 54 × 87, raposa 66 × 84, coruja 72 × 81, arbusto 154 × 116, pedras 161 × 112, flores 133 × 144). Ao escolher outra imagem, o Estúdio ajusta largura e altura ao tamanho da imagem nova e mantém o canto de cima do sprite. Por isso, nesses projetos, o desenho trocado pode ficar um pouco fora do lugar: um bicho novo fica até 18 pixels mais largo para a direita e até 6 pixels mais baixo; um esconderijo novo, até 28 pixels mais largo para a direita ou até 32 pixels mais baixo. A fala da seção serve aos dois projetos, porque cita nomes de imagens, que existem nos dois. As crianças que começarem depois recebem o projeto novo, em que bicho por bicho e esconderijo por esconderijo não muda tamanho nem lugar.
- **A imagem do bloco é um NOME.** No fim do bloco **Criar sprite**, depois de **com imagem**, o Estúdio mostra o nome da imagem (coelho, arbusto…), e não um desenho. A fala manda clicar nesse nome para abrir a lista com as imagens do jogo e, se não achar, rolar a lista. O erro provável é escolher uma imagem do outro tipo (um esconderijo no bloco de um bicho fica grande e aparece antes do toque); a fala ensina a corrigir escolhendo de novo um desenho do mesmo tipo.

## Revisão de 06/10/2026

A pedido do responsável, todas as falas passaram a conversar com a criança e a chamar a atenção dela. A regra entrou nas [Diretrizes Pedagógicas](DIRETRIZES-PEDAGOGICAS.md), seção 6, para os próximos cursos já nascerem assim. Seções, blocos, critérios e identificadores não mudaram.

- **Seu Caderno do Aluno:** saiu o "Não precisa baixar nem imprimir", que a criança entendia como uma ordem para não baixar. O vídeo agora diz "Olha aqui: este é o seu Caderno do Aluno!" e oferece as duas escolhas: ler aqui mesmo, na aula, ou clicar em **Baixar** para guardar o caderno e consultar onde quiser. O Zappy da seção, a página 2 do caderno e o tutorial **Como abrir os materiais da aula**, no Como Fazer, seguem a mesma ideia.
- **Narração:** os momentos que importam ganharam um chamado para a tela: "Olha aqui" ao mostrar um lugar ou bloco, "Olha só" quando aparece um resultado, "Repare" num detalhe (o número Achados, o nome que já vem no bloco) e "Tá vendo?" depois do teste da retomada.
- **Conversa contínua (segunda rodada do mesmo dia):** as falas deixaram de ser frases soltas lidas em sequência. Cada frase se liga à anterior, cada resultado vem com o porquê e a experiência do toque diz com clareza que o toque é a ação e que a reação é o arbusto ficar invisível. A retomada da Aula 1 passou de "Primeiro, toque num esconderijo. Nada acontece: o toque ainda não tem uma reação. Vamos ligar uma." para "Primeiro, toque num esconderijo do seu jogo. Tá vendo? Não acontece nada, porque o toque ainda não tem nenhuma reação ligada a ele…".
- **O que já vem pronto:** saiu da montagem da Aula 1 a frase solta "O jardim e os personagens já estão preparados", e a mensagem de vitória da Aula 2 deixou de ser apresentada como "já estava preparada": a fala diz que quem a faz aparecer é a contagem montada pela criança. O reconhecimento do que veio pronto fica no certificado ("O jardim e os personagens já vieram prontos, mas olha só o que você programou…").
- **Durações:** com as explicações, alguns vídeos ficaram um pouco mais longos: abertura 35 a 45 s, caderno 25 a 35 s, experiência do toque 70 a 90 s, retomada da Aula 2 25 a 35 s, experiência do Achados 75 a 95 s e certificado 20 a 30 s.
- **Pontes do Zappy:** começam convidando ("Sua vez!", "Agora…!", "Hora de…!") e falam do jogo da criança ("Seus personagens já aparecem, mas Achados ainda fica em zero").

Os dez vídeos precisam ser regravados com as falas novas. A fórmula de verificação ("Funcionou? Clique em Verificar esta etapa…") continua a mesma dos outros cursos. O PDF do caderno foi regerado; no Admin, substituir o anexo e importar o tutorial do Como Fazer atualizado.
