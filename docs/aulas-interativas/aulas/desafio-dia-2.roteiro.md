# Roteiro de gravação · A Chave do Farol · Dia 2

Duas seções, dois vídeos. Abrir o projeto enviado no Dia 1; para ensaio sem envio, usar a retomada do Dia 2, que já tem somente as regras do primeiro dia. Não dizer que a criança montou a arte. **Na tela** orienta a gravação; só o texto de **Narração** é falado.

## Seção 1. Encostar ainda não é pegar

### Vídeo `video-d2-contexto` · A chave precisa fazer diferença

**Na tela:** mover o personagem com as setas até a chave no projeto que só tem o movimento. Ele passa pela chave; ela continua desenhada. Mostrar o farol, sem tentar resolver a porta.

**Narração:**
> "Ontem você fez o personagem andar. Agora olha o que acontece quando ele chega à chave. Ele encosta nela, mas a chave continua no chão. Encostar, sozinho, não diz ao jogo o que fazer. É parecido com uma campainha: alguém aperta, mas só ouvimos o som se a campainha estiver ligada. No nosso jogo, o encontro com a chave vai ser o acontecimento. Precisamos dizer qual ação vem depois desse encontro."

**Na tela:** mostrar duas fichas simples da gravação: `temChave = falso` e `temChave = verdadeiro`, sem mostrar o resultado do teste. Apontar o farol apagado.

**Narração:**
> "Tem mais uma coisa. Quando a chave sumir do chão, o jogo ainda precisa se lembrar de que o personagem a encontrou. Vamos guardar essa resposta numa variável. Variável é como uma caixinha com nome: ela guarda uma informação que pode mudar. A nossa vai se chamar temChave. No começo, a resposta é falso, porque ele ainda não pegou a chave. Depois do encontro, a resposta pode virar verdadeiro. Amanhã o farol vai olhar essa informação antes de abrir a porta."

## Seção 2. Guarde que a chave foi encontrada

### Vídeo `video-d2-programar` · Faça o jogo guardar a chave

**Na tela:** no Estúdio do Dia 2, mostrar **Ao iniciar**. Abrir **Programação → 🏷️ Variáveis**, pegar **Criar variável ... com valor ...** e encaixar depois de **Ativar controles clássicos**. Nomear `temChave`. No encaixe de valor, abrir **Programação → ❓ Lógica & Se**, pegar **Verdadeiro ou falso** e selecionar **falso**. Sair do campo para confirmar.

**Narração:**
> "Vamos montar essa caixinha. Na paleta, abra Programação e depois Variáveis. Pegue Criar variável com valor e encaixe no fim de Ao iniciar, depois do controle de setas. Dê o nome temChave, tudo junto, como estou escrevendo. Para colocar o valor, abra Programação, Lógica e Se. Pegue Verdadeiro ou falso, encaixe no espaço da variável e escolha falso. Assim o jogo começa sabendo que o personagem ainda não está com a chave."

**Na tela:** mostrar **Quando acontecer**. Abrir **Jogo 2D → Colisões → Encostar e bloquear**, pegar **Quando o sprite ... começar a encostar no sprite ...**, encaixar na área. Selecionar `personagem` e `chave`. Antes de pôr ações, testar: o evento vazio não muda nada.

**Narração:**
> "Agora vamos avisar o jogo do encontro. Na paleta, abra Jogo 2D, Colisões, Encostar e bloquear. Pegue Quando o sprite começar a encostar no sprite e encaixe na área Quando acontecer. No primeiro nome, escolha personagem. No segundo, escolha chave. Esse bloco espera os dois se encostarem. Mas olha dentro dele: ainda não mandamos fazer nada, então o teste continua igual."

**Na tela:** abrir **Jogo 2D → Sprites → Criar e trocar aparência**, pegar **Destruir o sprite ...**, encaixar dentro do evento e selecionar `chave`. Abrir **Programação → 🏷️ Variáveis**, pegar **Alterar variável ... para ...**, encaixar abaixo; escolher `temChave`. Abrir **Programação → ❓ Lógica & Se**, pegar **Verdadeiro ou falso** e escolher `verdadeiro`. Em seguida, outro **Alterar variável ... para ...** para `aviso`, com texto `Você pegou a chave! Agora vá ao farol.` por **Programação → 🔣 Valores → texto**.

**Narração:**
> "Vamos colocar a ação dentro desse encontro. Abra Jogo 2D, Sprites, Criar e trocar aparência. Pegue Destruir o sprite, encaixe dentro do encontro e escolha chave. É a chave do chão que sai do jogo; o personagem continua. Abaixo, abra Programação, Variáveis. Pegue Alterar variável para e escolha temChave. Abra Programação, Lógica e Se, pegue Verdadeiro ou falso, encaixe no espaço do valor e escolha verdadeiro. Agora a caixinha se lembra da coleta. Para a mensagem da tela acompanhar, abra de novo Programação, Variáveis. Pegue outro Alterar variável para, encaixe abaixo e escolha aviso. Abra Programação, Valores, pegue texto e escreva: ‘Você pegou a chave! Agora vá ao farol.’"

**Na tela:** mover até a chave. Mostrar desaparecimento e mensagem. Mover pelo mesmo lugar novamente. Mostrar **Salvo** e **Enviar para o professor**, deixando o farol apagado. Não ensinar porta.

**Narração:**
> "Teste no jogo. Leve o personagem até a chave. Ela sumiu? A mensagem mudou? Passe pelo mesmo lugar mais uma vez. A chave não é recolhida de novo, porque já saiu da partida. Se a sua chave não sumir, confira os dois nomes no bloco Quando encostar: personagem primeiro, chave depois, e veja se Destruir o sprite chave está encaixado dentro dele. Quando o teste funcionar, confira Salvo e use Enviar para o professor. O farol ainda está apagado: amanhã vamos usar a resposta guardada em temChave para decidir se a porta pode abrir."
