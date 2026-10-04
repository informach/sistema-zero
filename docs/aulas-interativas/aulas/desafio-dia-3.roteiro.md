# Roteiro de gravação · A Chave do Farol · Dia 3

Três seções: experiência com a porta, montagem da condição e publicação. Manter o projeto enviado no Dia 2. A experiência usa uma cena separada; a publicação usa o mesmo Estúdio da montagem. Não atribuir à criança a arte ou a animação preparada do barco. Só a narração é falada.

## Seção 1. O que a porta precisa?

### Vídeo `video-d3-condicao` · Quando a porta pode abrir?

**Na tela:** mostrar brevemente o projeto com a coleta programada e depois o estado inicial da experiência, sem chave. Apontar **Testar a porta** e **Levar a chave**, sem clicar nem mostrar a resposta da porta. Não demonstrar uma partida concluída. Duração estimada: 35 a 45 segundos.

**Narração:**
> "Seu personagem já recolhe a chave, mas a porta do farol ainda não responde a esse encontro. Vamos investigar como ela pode decidir o que fazer. Uma condição é uma pergunta que o jogo confere. Aqui, a pergunta é se o personagem está com a chave. Nesta experiência, primeiro aperte Testar a porta sem levar a chave. Observe o que acontece. Depois aperte Levar a chave e Testar a porta outra vez. Compare as duas tentativas. Quando terminar os dois testes, aperte Próxima seção."

**Ponte do Zappy na página (não gravar):** A chave já pode ser recolhida. Experimente a porta e compare o que acontece nas duas situações.

## Seção 2. Faça a porta conferir a chave

### Vídeo `video-d3-decisao` · Faça a porta decidir

**Na tela:** retomar o projeto enviado no Dia 2. Abrir **Jogo 2D → Colisões → Encostar e bloquear**. Pegar um novo **Quando o sprite ... começar a encostar no sprite ...**, encaixar em **Quando acontecer**, abaixo do evento da chave. Selecionar `personagem` e `farol`. Não encaixar um evento dentro do outro. Estimativa do vídeo completo: 5 a 6 minutos, com montagem e testes.

**Narração:**
> "Você testou a porta com e sem chave. Agora vamos colocar essa decisão no seu jogo. O encontro com a chave já está pronto. Vamos criar outro encontro, para o farol conferir se o personagem está com ela. Abra Jogo 2D, Colisões, Encostar e bloquear. Pegue Quando o sprite começar a encostar no sprite e encaixe na área Quando acontecer, abaixo do evento da chave. Escolha personagem no primeiro nome e farol no segundo. Este é um evento separado."

**Na tela:** abrir **Programação → Lógica & Se**, colocar **Se ... então** dentro do novo evento. Abrir **Programação → Valores**, pegar **valor da variável**, encaixar em `COND` e escolher `temChave`, substituindo a condição inicial. Apontar os três níveis: evento, condição, ações.

**Narração:**
> "Abra Programação, Lógica e Se. Pegue Se e encaixe dentro do evento do farol. A pergunta deste bloco precisa consultar temChave. Abra Programação, Valores. Pegue valor da variável, encaixe no espaço da pergunta e escolha temChave. Dá para ler assim: quando o personagem encostar no farol, se temChave for verdadeiro, faça o que estiver dentro de então."

**Na tela:** no bloco **Se**, usar **+ senão**, não **+ senão se**. Em **Programação → Variáveis**, pegar **Alterar variável ... para ...**, encaixar no ramo **senão** e selecionar `aviso`. Em **Programação → Valores**, pegar **texto** e escrever `A porta não abriu. Falta a chave.`. Reiniciar por **Atualizar** e chegar ao farol sem pegar a chave.

**Narração:**
> "Vamos cuidar do caso sem chave. No bloco Se, aperte mais senão para abrir a parte senão. Ela diz o que fazer quando a pergunta é falsa. Abra Programação, Variáveis. Pegue Alterar variável para e encaixe dentro de senão. Escolha aviso. Em Programação, Valores, pegue texto, encaixe no valor e escreva: A porta não abriu. Falta a chave. Aperte Atualizar e vá ao farol sem passar pela chave. O farol deve continuar apagado, e a mensagem deve explicar o motivo."

**Na tela:** em **Programação → Variáveis**, pegar **Alterar variável ... para ...**, encaixar no começo do ramo **então** e selecionar `ganhou`. Em **Programação → Lógica & Se**, pegar **Verdadeiro ou falso**, encaixar no valor e manter **verdadeiro**, como vem no bloco. Abrir **Jogo 2D → Sprites → Criar e trocar aparência**, pegar **Trocar imagem do sprite ... para ...**, encaixar logo abaixo, ainda em **então**. Escolher sprite `farol` e imagem `farol-aceso`.

**Narração:**
> "Agora monte a resposta quando temChave for verdadeiro. Abra Programação, Variáveis. Pegue Alterar variável para e encaixe dentro de então. Escolha ganhou. Em Programação, Lógica e Se, pegue Verdadeiro ou falso, encaixe no valor e mantenha verdadeiro, como veio no bloco. A variável ganhou já veio preparada para ligar o movimento do barco. Logo abaixo, ainda dentro de então, coloque Trocar imagem do sprite para. Ele fica em Jogo 2D, Sprites, Criar e trocar aparência. Escolha farol e a imagem farol-aceso."

**Na tela:** em **Programação → Variáveis**, pegar outro **Alterar variável ... para ...**, encaixar depois da troca de imagem, em **então**, e escolher `aviso`. Em **Programação → Valores**, pegar **texto**, encaixar no valor e escrever `Você acendeu o farol! Olhe o barco chegando.`. Mostrar os ramos separados, sem mover o evento da chave.

**Narração:**
> "Falta a mensagem de chegada. Abra Programação, Variáveis, pegue outro Alterar variável para e coloque abaixo da troca de imagem, ainda dentro de então. Escolha aviso. Em Programação, Valores, pegue texto e encaixe no valor de aviso, substituindo o número que veio ali. Escreva: Você acendeu o farol! Olhe o barco chegando. Confira: em então, ficam ganhou verdadeiro, a troca da imagem e a mensagem de chegada. Em senão, fica a mensagem de que falta a chave."

**Na tela:** reiniciar por **Atualizar**. Testar primeiro o farol sem chave. Reiniciar novamente, coletar a chave e chegar ao farol. Esperar o barco deslocar-se. A prévia atualiza automaticamente; não inserir um passo de Reproduzir. Mostrar uma pendência real somente se ocorrer no ensaio.

**Narração:**
> "Compare os dois caminhos. Aperte Atualizar e vá direto ao farol, sem pegar a chave. A luz deve continuar apagada, e a mensagem deve dizer que falta a chave. Aperte Atualizar outra vez. Agora pegue a chave, afaste-se do lugar onde ela estava e vá ao farol. O jogo continua lembrando da coleta em temChave. A luz deve acender, a mensagem deve mudar e o barco deve chegar. Se acendeu sem chave, confira se a troca de imagem está dentro de então e se a pergunta do Se usa temChave. Se não acendeu com a chave, confira a coleta e a imagem farol-aceso. O barco depende de ganhou ficar verdadeiro. Se o aviso saiu errado, confira se ele está dentro da resposta certa: então ou senão. Corrija o que precisar e repita os dois testes."

**Na tela:** clicar **Verificar esta etapa**; se houver pendência, corrigir e verificar novamente. Após **Objetivo da etapa cumprido!**, esperar **Salvo**, clicar **Enviar para o professor** e confirmar **Enviar**. Esperar confirmação e clicar **Próxima seção**, preservando o mesmo projeto no Estúdio.

**Narração:**
> "Depois dos dois testes, aperte Verificar esta etapa. Se houver algo para corrigir, ajuste os blocos e verifique de novo. Quando aparecer Objetivo da etapa cumprido!, espere Salvo. Aperte Enviar para o professor e confirme em Enviar. Quando o envio terminar, aperte Próxima seção."

**Ponte do Zappy na página (não gravar):** Agora monte no seu jogo a regra que faz a porta conferir a chave. Teste os dois caminhos e use Verificar esta etapa antes de enviar o projeto.

## Seção 3. Publique seu jogo

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
