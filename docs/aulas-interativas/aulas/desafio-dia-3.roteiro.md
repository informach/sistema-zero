# Roteiro de gravação · A Chave do Farol · Dia 3

Quatro seções: experiência com a porta, resposta sem chave, resposta com chave e publicação. Manter o projeto enviado no Dia 2 e o mesmo Estúdio entre as três últimas seções. A verificação intermediária não pede envio; a seção decisao recebe a entrega única do dia. Estimativas: 40 a 55 segundos para a experiência, 3 a 4 minutos para o aviso sem chave, 4 a 5 minutos para completar e testar a vitória. Ajustar no ensaio, sem acelerar encaixes, percursos ou a espera do barco. Não atribuir à criança a arte ou a animação preparada. Só a narração é falada.

## Seção 1. O que a porta precisa?

### Vídeo `video-d3-condicao` · Quando a porta pode abrir?

**Na tela:** mostrar a cena inicial da porta com o novo mostrador e as duas respostas sem destaque. Apontar Testar a porta e Levar a chave. Não clicar nem revelar a resposta. Duração estimada: 40–55 segundos.

**Narração:**
> "Seu jogo já guarda a coleta da chave. Agora a porta precisa usar essa informação. Uma condição é uma pergunta que o jogo confere. Nesta experiência, acompanhe temChave e a pergunta da porta. Primeiro aperte Testar a porta sem levar a chave. Veja qual resposta fica marcada. Depois aperte Levar a chave e Testar a porta outra vez. Compare o valor guardado e a resposta nas duas tentativas. Quando terminar os dois testes, aperte Próxima seção."

**Ponte do Zappy na página (não gravar):** A coleta já guarda uma informação. Veja como a porta usa essa informação para escolher uma resposta.

## Seção 2. Avise quando faltar a chave

### Vídeo `video-d3-sem-chave` · Avise quando faltar a chave

**Na tela:** retomar o projeto da criança. Apontar o encontro com a chave já montado e o espaço abaixo, na área Quando acontecer. Abrir Jogo 2D → Colisões → Encostar e bloquear. Pegar Quando o sprite começar a encostar no sprite e configurar personagem/farol em um evento separado.

**Narração:**
> "Você comparou as duas respostas da porta. Vamos começar pelo aviso de que falta a chave. O encontro com a chave já está pronto. Abra Jogo 2D, Colisões, Encostar e bloquear. Pegue Quando o sprite começar a encostar no sprite. Encaixe na área Quando acontecer, abaixo do evento da chave, sem colocar um evento dentro do outro. Escolha personagem no primeiro nome e farol no segundo. O encontro diz quando o jogo vai conferir a chave."

**Na tela:** abrir Programação → Lógica & Se, encaixar Se no corpo do evento. Abrir Programação → Valores, pegar valor da variável, substituir a condição inicial e selecionar temChave.

**Narração:**
> "Abra Programação, Lógica e Se. Pegue Se e encaixe dentro do encontro com o farol. Agora abra Programação, Valores. Pegue valor da variável, encaixe na pergunta do Se e escolha temChave. A pergunta decide qual resposta será executada. Dá para ler assim: quando o personagem encostar no farol, confira se temChave é verdadeiro."

**Na tela:** clicar + senão. Abrir Programação → Variáveis, pegar Alterar variável para, encaixar em senão e escolher aviso. Em Programação → Valores, pegar texto e substituir o número inicial. Escrever A porta não abriu. Falta a chave.

**Narração:**
> "No bloco Se, aperte mais senão. Escolha senão, sem o se no final. Essa parte recebe a resposta quando temChave é falso. Abra Programação, Variáveis. Pegue Alterar variável para, encaixe dentro de senão e escolha aviso. Abra Programação, Valores, pegue texto e coloque no valor do aviso, substituindo o número que veio ali. Escreva: A porta não abriu. Falta a chave. A parte então fica vazia por enquanto. Ainda não colocamos nela a regra para acender a luz."

**Na tela:** usar Atualizar. Ir ao farol sem passar pela chave. Mostrar a mensagem efetivamente produzida. Apontar evento, condição e aviso em senão ao conferir. Não programar o ramo então neste vídeo.

**Narração:**
> "Aperte Atualizar para começar a partida. Vá ao farol sem passar pela chave. A luz deve continuar apagada e o aviso deve dizer que falta a chave. Se a mensagem não apareceu, confira personagem e farol no encontro, temChave na pergunta e o aviso dentro de senão. Depois de corrigir, atualize e teste outra vez."

**Na tela:** clicar Verificar esta etapa e apresentar o resultado real da verificação intermediária. Esperar Salvo e apontar Próxima seção. O botão de envio não integra esta tarefa.

**Narração:**
> "Depois do teste, aperte Verificar esta etapa. Se aparecer uma pendência, corrija o bloco indicado e verifique novamente. Quando aparecer Objetivo da etapa cumprido!, espere Salvo. Aperte Próxima seção."

**Ponte do Zappy na página (não gravar):** Monte a resposta sem chave. Vá ao farol sem recolher a chave e confira o aviso. Verifique esta etapa antes de seguir.

## Seção 3. Acenda o farol com a chave

### Vídeo `video-d3-decisao` · Acenda o farol com a chave

**Na tela:** manter o mesmo Estúdio e o mesmo Se. Apontar o aviso em senão e o ramo então vazio. Não recarregar a retomada preparada nem duplicar o evento do farol.

**Narração:**
> "Seu farol já avisa quando falta a chave. Agora vamos completar a resposta para quando ela foi encontrada. No encontro entre personagem e farol, encontre o mesmo Se que você acabou de montar. A parte então ainda está vazia. É nela que vamos colocar as ações para quando temChave for verdadeiro."

**Na tela:** em Programação → Variáveis, pegar Alterar variável para, encaixar em então e escolher ganhou. Em Programação → Lógica & Se, pegar Verdadeiro ou falso, substituir o valor e manter verdadeiro.

**Narração:**
> "Abra Programação, Variáveis. Pegue Alterar variável para e encaixe dentro de então. Escolha ganhou. Abra Programação, Lógica e Se. Pegue Verdadeiro ou falso, encaixe no valor e mantenha verdadeiro, como veio no bloco. A variável ganhou já veio preparada para ligar o movimento do barco. Você está programando quando essa chegada pode acontecer."

**Na tela:** abrir Jogo 2D → Sprites → Criar e trocar aparência. Pegar Trocar imagem do sprite para, encaixar abaixo de ganhou em então, escolher farol e farol-aceso.

**Narração:**
> "Agora abra Jogo 2D, Sprites, Criar e trocar aparência. Pegue Trocar imagem do sprite para e encaixe logo abaixo do bloco de ganhou, ainda dentro de então. Escolha o sprite farol e a imagem farol-aceso. Essa ação muda a imagem para mostrar a luz acesa."

**Na tela:** abrir Programação → Variáveis, pegar outro Alterar variável para, encaixar abaixo da troca de imagem em então e escolher aviso. Em Programação → Valores, pegar texto, substituir o número e escrever o aviso de chegada.

**Narração:**
> "Falta a mensagem de chegada. Abra Programação, Variáveis. Pegue outro Alterar variável para e encaixe abaixo da troca de imagem, dentro de então. Escolha aviso. Abra Programação, Valores, pegue texto e encaixe no valor, substituindo o número. Escreva: Você acendeu o farol! Olhe o barco chegando. Confira: em então, ficam ganhou verdadeiro, a imagem acesa e o aviso de chegada. Em senão, continua o aviso de que falta a chave."

**Na tela:** iniciar uma partida por Atualizar. Visitar o farol sem chave; afastar-se, buscar a chave e voltar ao farol na mesma partida. Esperar a luz e o barco. Reiniciar depois da vitória e ir ao farol sem chave. Mostrar esses estados reais, sem edição que simule o funcionamento.

**Narração:**
> "Vamos testar a aventura inteira. Aperte Atualizar e vá ao farol sem passar pela chave. A luz deve ficar apagada e o aviso deve dizer que falta a chave. Agora se afaste do farol, busque a chave e volte, sem recomeçar a partida. A luz deve acender, o aviso deve mudar e o barco deve chegar. O jogo guardou a coleta enquanto você andava até o farol. Depois aperte Atualizar. A chave deve voltar ao chão. Vá direto ao farol, sem recolhê-la: ele deve voltar a avisar que falta a chave."

**Na tela:** apontar a declaração de temChave em Ao iniciar, sua mudança na coleta e sua consulta no farol, um trecho de cada vez. As correções a seguir correspondem aos pontos que os testes distinguem.

**Narração:**
> "Se a luz acendeu sem chave, confira se temChave começa em falso, se o Se consulta temChave e se a troca da imagem está dentro de então. Se não acendeu depois da coleta, confira se o encontro com a chave muda temChave para verdadeiro e se escolheu farol-aceso na troca da imagem. Se a luz acendeu, mas o barco não veio, confira ganhou verdadeiro dentro de então. Se o aviso saiu diferente, confira seu texto e a resposta em que ele está encaixado. Depois de corrigir, repita os testes."

**Na tela:** executar a verificação cumulativa, mostrar eventuais pendências reais, esperar Salvo e enviar com confirmação. Manter o mesmo projeto para publicar.

**Narração:**
> "Depois dos testes, aperte Verificar esta etapa. Se aparecer alguma pendência, corrija e verifique novamente. Quando aparecer Objetivo da etapa cumprido!, espere Salvo. Aperte Enviar para o professor e confirme em Enviar. Quando terminar o envio, aperte Próxima seção."

**Ponte do Zappy na página (não gravar):** Complete a resposta com chave. Teste chegar sem ela, buscar e voltar, e começar outra partida. Depois verifique e envie seu jogo.

## Seção 4. Publique seu jogo

### Vídeo `video-d3-fecho` · Publique seu jogo

**Na tela:** manter o mesmo Estúdio da seção anterior, já enviado ao professor. Abrir **Compartilhar**. Mostrar **Título** e **Resumo do projeto** preenchidos; não editar. Clicar **Gerar capa**, aguardar e conferir. Não demonstrar upload nem cópia de link. Duração estimada da seção: 45 a 60 segundos, incluindo espera da publicação.

**Narração:**
> "Seu jogo já foi enviado para o professor. Para outras pessoas também poderem jogar sua aventura, vamos publicá-la no Mural. No Estúdio, aperte Compartilhar. O título e o resumo já estão preenchidos. Deixe como estão. Aperte Gerar capa e espere a imagem aparecer. Essa imagem vai apresentar seu jogo."

**Na tela:** conferir a capa, clicar **Publicar**, esperar **Seu jogo está no Mural!** e clicar **Fechar**. Apontar **Concluir aula**. Não sair para outra ferramenta ou outra aula.

**Narração:**
> "Confira a capa, aperte Publicar e espere a confirmação. Quando aparecer Seu jogo está no Mural!, aperte Fechar. Agora aperte Concluir aula."

Ajuda escrita: [Como publicar seu jogo no Mural e copiar o link](/como-fazer/plataforma-publicar-no-mural). O tutorial abre na mesma aba e oferece retorno à aula.

**Conferência de produção:** o envio anterior libera Compartilhar. A configuração de publicação fica somente no projeto do Dia 3. Publicar é a tarefa ensinada; o critério técnico desta seção continua sendo o vídeo. Não transformar expiração do acesso ao Mural ou indisponibilidade momentânea em bloqueio de conclusão da aula. Personalização, outras capas, cópia do link e solução de problemas ficam no Como Fazer.

**Ponte do Zappy na página (não gravar):** Agora publique no Mural o jogo que você construiu. Espere a confirmação da publicação e feche a janela antes de clicar em Concluir aula.
