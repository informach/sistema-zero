# Roteiro de gravação · A Chave do Farol · Dia 3

Três seções: conceito com experiência, construção no Estúdio, fechamento. O vídeo conceitual explica a ideia de condição, mas **não** narra a sequência da experiência nem revela o resultado antes do teste. A experiência é a única cena paralela do curso; não há palpite obrigatório. Falar como conversa com a criança, com pausas para ela executar os blocos. As linhas **Na tela** não são faladas.

## Seção 1. O que a porta precisa?

### Vídeo `video-d3-condicao` · Quando a porta pode abrir?

**Na tela:** projeto do Dia 2. O personagem consegue andar e recolher a chave; o farol ainda não responde. Mostrar uma imagem de uma porta comum e de uma chave, sem dizer o que a experiência mostrará. A experiência do farol fica visível na página, mas sem mexer nos controles durante o vídeo.

**Narração:**
> "Você já fez a chave desaparecer do caminho e fez o jogo guardar que o personagem está com ela. Só que olha para o farol: a luz continua apagada. Falta ensinar uma decisão ao jogo. Imagina que você chega em casa e encontra a porta fechada. Antes de entrar, precisa conferir uma coisa: está com a chave? Essa pergunta tem duas respostas possíveis. Na programação, chamamos uma pergunta assim de condição. A condição ajuda o jogo a escolher o que faz em cada situação. Aqui, a pergunta vai ser sobre a informação temChave, que você guardou ontem. Depois deste vídeo, experimente a porta do farol nas duas situações. Repare no que muda quando o personagem leva ou não leva a chave."

**Na tela:** encerrar o vídeo antes de qualquer toque na experiência. Deixar o balão curto do Zappy fazer a ponte, sem repetir os passos dos controles da cena.

## Seção 2. Faça a porta conferir a chave

### Vídeo `video-d3-decisao` · Faça a porta decidir

**Na tela:** retomar o projeto do Dia 2. Mostrar rapidamente o evento da chave já feito e o farol apagado. Apontar a área **Quando acontecer**, mas não mudar o evento da chave.

**Narração:**
> "Na experiência, você testou a mesma porta em duas situações. Agora vamos ensinar essa decisão ao seu jogo. O encontro com a chave já tem uma ação. A porta precisa do seu próprio encontro, sem mexer no que você montou ontem."

**Na tela:** abrir **Jogo 2D → Colisões → Encostar e bloquear**, arrastar um novo **Quando o sprite ... começar a encostar no sprite ...** para **Quando acontecer**, abaixo do evento da chave. Selecionar `personagem` e `farol`.

**Narração:**
> "Abra Jogo 2D, Colisões, Encostar e bloquear. Pegue outro Quando o sprite começar a encostar no sprite. Encaixe na área Quando acontecer, abaixo do encontro com a chave. No primeiro nome, escolha personagem. No segundo, escolha farol. Este bloco só acorda quando o personagem chega ao farol."

**Na tela:** abrir **Programação → ❓ Lógica & Se**, colocar **Se ... então** dentro do novo evento. Abrir **Programação → 🔣 Valores**, pegar **valor da variável**, encaixar na pergunta do Se e escolher `temChave`. Enquadrar a hierarquia evento → Se → então.

**Narração:**
> "Dentro do novo encontro, vamos pôr a pergunta. Abra Programação, Lógica e Se. Pegue Se e encaixe dentro do evento do farol. A pergunta do Se precisa olhar para a informação que guardamos. Abra Programação, Valores. Pegue valor da variável, encaixe no espaço da pergunta e escolha temChave. Agora dá para ler os blocos de cima para baixo: quando o personagem encostar no farol, se temChave for verdadeiro, faça o que estiver dentro de então. Ainda falta dizer qual será essa ação."

**Na tela:** no bloco **Se**, usar o controle `+` para adicionar **senão**. Em **Programação → 🏷️ Variáveis**, pegar **Alterar variável ... para ...** e pôr no ramo **senão**, escolher `aviso`; em **Programação → 🔣 Valores**, pegar **texto** e escrever `A porta não abriu. Falta a chave.`. Testar chegando ao farol sem chave e mostrar o texto; farol continua apagado.

**Narração:**
> "Vamos cuidar primeiro do caso em que a chave ficou para trás. No Se, toque no sinal de mais para abrir a parte senão. Senão quer dizer: quando a pergunta não for verdadeira, faça isto. Em Programação, Variáveis, pegue Alterar variável para e encaixe em senão. Escolha aviso. Abra Programação, Valores, pegue texto, encaixe no espaço do valor e escreva: ‘A porta não abriu. Falta a chave.’ Teste: vá ao farol sem passar pela chave. Ele continua apagado, e agora a mensagem conta por quê. Se não apareceu, confira se este bloco está dentro do senão do evento do farol, não no evento da chave."

**Na tela:** no ramo **então**, abrir **Programação → 🏷️ Variáveis**, pegar **Alterar variável ... para ...**, escolher `ganhou`; abrir **Programação → ❓ Lógica & Se** para encaixar **Verdadeiro ou falso** com valor **verdadeiro**. Depois abrir **Jogo 2D → Sprites → Criar e trocar aparência**, pegar **Trocar imagem do sprite ... para ...**, escolher `farol` e `farol-aceso`. Depois abrir **Programação → 🏷️ Variáveis** para alterar `aviso` e **Programação → 🔣 Valores** para o texto `Você acendeu o farol! Olhe o barco chegando.`. Mostrar a ordem dos três blocos.

**Narração:**
> "Agora a resposta quando o personagem está com a chave. Dentro de então, abra Programação, Variáveis. Pegue Alterar variável para e escolha ganhou. Em Programação, Lógica e Se, pegue Verdadeiro ou falso, encaixe no valor e escolha verdadeiro. Essa informação liga o movimento do barco que já veio preparado no projeto. Logo abaixo, abra Jogo 2D, Sprites, Criar e trocar aparência. Pegue Trocar imagem do sprite para. Escolha farol e a imagem farol-aceso. Para o jogo contar o que aconteceu, abra Programação, Variáveis. Pegue mais um Alterar variável para, encaixe abaixo e escolha aviso. Em Programação, Valores, pegue texto e escreva: ‘Você acendeu o farol! Olhe o barco chegando.’ Confira a ordem: primeiro ganhou, depois a luz, depois a mensagem."

**Na tela:** reiniciar o jogo no Estúdio pelo botão **Atualizar** da prévia. Primeiro ir ao farol sem chave; depois usar **Atualizar** novamente, pegar chave e ir ao farol. Segurar a imagem tempo suficiente para ver o barco deslocar-se e parar na água. Mostrar **Salvo** e **Enviar para o professor**. Se a prévia estiver parada, mostrar **Reproduzir** antes de testar.

**Narração:**
> "Vamos comparar no seu jogo. Aperte Atualizar e vá ao farol sem pegar a chave: a porta não abre. Aperte Atualizar mais uma vez, encontre a chave e volte ao farol. A luz acendeu, e o barco está chegando! Repara: foi a condição que você programou que decidiu quando ligar a vitória. O movimento do barco já estava preparado, esperando essa resposta. Se os dois testes funcionaram, espere aparecer Salvo e use Enviar para o professor. Você acabou de construir a última regra da aventura."

## Seção 3. Você guiou o barco

### Vídeo `video-d3-fecho` · O barco encontrou o caminho

**Na tela:** jogar a versão enviada do início ao fim uma vez. Aproximar dos três grupos de blocos criados pela criança: controles/movimento, contato com a chave, condição no farol. Terminar no botão de próxima aula/certificado.

**Narração:**
> "Seu jogo agora tem uma história completa. Você fez o personagem andar, fez o encontro com a chave mudar o jogo e ensinou a porta a conferir se ele estava com ela. Quando a resposta é sim, a luz acende e o barco encontra o caminho. O cenário, os desenhos e o movimento do barco já estavam preparados; as regras que fizeram tudo isso se encontrar foram suas. Pode testar o jogo mais uma vez, mostrar a alguém da sua casa e seguir para o certificado."
