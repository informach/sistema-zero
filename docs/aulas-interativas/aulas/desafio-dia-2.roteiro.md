# Roteiro de gravação · A Chave do Farol · Dia 2

Duas seções, dois vídeos. Retomar o projeto enviado no Dia 1; o projeto preparado do Dia 2 só é a alternativa quando não houver envio anterior. Não reconstruir nem substituir um projeto já feito pela criança. O primeiro vídeo orienta a experiência em 50 a 75 segundos, sem resolvê-la. O segundo acompanha a montagem e a escolha do aviso em aproximadamente 5 a 6 minutos, sem acelerar encaixes para caber na estimativa. Só a narração é falada.

## Seção 1. O jogo guardou a chave?

### Vídeo `video-d2-contexto` · O jogo guardou a chave?

**Na tela:** mostrar brevemente, no projeto do fim do Dia 1, o personagem encostando na chave e se afastando, com a chave ainda presente. Depois abrir o estado inicial da experiência `collect-and-remember`. Apontar o mostrador `temChave = falso` e os controles, sem executar a coleta na experiência.

**Narração:**
> "Seu personagem já anda, mas ainda passa pela chave sem pegar. Vamos investigar como recolher a chave e guardar que ela foi encontrada. Nesta experiência, a coleta já está preparada e você pode mudar se o encontro também guarda essa informação. O mostrador acompanha uma variável chamada temChave. Variável é onde o jogo guarda um valor que pode mudar. Aqui, falso significa que a coleta ainda não ficou guardada. Não quer dizer que você errou."

**Na tela:** apontar Guardar a coleta desligado, Encostar na chave, Recomeçar a partida e Afastar. Não mostrar os valores resultantes nem preencher as metas na edição.

**Narração:**
> "Primeiro, deixe Guardar a coleta desligado e aperte Encostar na chave. Compare a chave, a mensagem e o valor guardado. Depois aperte Recomeçar a partida, ligue Guardar a coleta e encoste outra vez. Aperte Afastar e olhe o valor. Por último, recomece a partida e confira o que voltou ao começo. Depois de fazer esses testes, aperte Próxima seção."

**Ponte do Zappy na página (não gravar):** Compare o que some da tela com o que fica guardado no jogo. A experiência mostra a informação temChave durante cada tentativa.

## Seção 2. Guarde que a chave foi encontrada

### Vídeo `video-d2-programar` · Faça o jogo guardar a chave

**Na tela:** abrir **Programação → Variáveis**. Pegar **Criar variável ... com valor ...**, encaixar em **Ao iniciar**, após **Ativar controles clássicos**. Nomear `temChave`. Abrir **Programação → Lógica & Se**, pegar **Verdadeiro ou falso**, encaixar no valor inicial e escolher **falso**, substituindo o valor que veio no bloco. Confirmar o nome saindo do campo.

**Narração:**
> "Na experiência, você comparou tirar a chave do chão com guardar a coleta. Agora faça seu jogo guardar essa informação. Vamos criar a variável temChave começando em falso e mudar para verdadeiro no encontro com a chave. Abra Programação, Variáveis. Pegue Criar variável com valor e encaixe no fim de Ao iniciar, depois de Ativar controles clássicos. Troque o nome contador por temChave, tudo junto, com o C maiúsculo, e clique fora do campo. Abra Programação, Lógica e Se. Pegue Verdadeiro ou falso, coloque no espaço do valor da variável e escolha falso. Aqui, falso significa que o personagem ainda não está com a chave. Não quer dizer que você errou. Quando ele pegar a chave, vamos guardar verdadeiro."

**Na tela:** abrir **Jogo 2D → Colisões → Encostar e bloquear**. Pegar **Quando o sprite ... começar a encostar no sprite ...** e encaixar em **Quando acontecer**. Escolher `personagem` em A e `chave` em B. Apontar o interior do evento vazio.

**Narração:**
> "Agora programe o encontro. O personagem encostar na chave é um evento, um acontecimento ao qual o jogo pode responder. Abra Jogo 2D, Colisões, Encostar e bloquear. Pegue Quando o sprite começar a encostar no sprite e encaixe na área Quando acontecer, que ainda está vazia. Escolha personagem no primeiro nome e chave no segundo. As ações que colocarmos dentro deste bloco vão acontecer quando os dois começarem a se encostar."

**Na tela:** abrir **Jogo 2D → Sprites → Criar e trocar aparência**, pegar **Destruir o sprite ...**, encaixar dentro do evento e selecionar `chave`. Depois abrir **Programação → Variáveis**, pegar **Alterar variável ... para ...** e encaixar logo abaixo, ainda dentro do evento. Escolher `temChave`. Em **Programação → Lógica & Se**, pegar **Verdadeiro ou falso**, encaixar no valor e manter **verdadeiro**, como vem no bloco.

**Narração:**
> "Abra Jogo 2D, Sprites, Criar e trocar aparência. Pegue Destruir o sprite, encaixe dentro do encontro e escolha chave. Neste jogo, destruir quer dizer retirar da partida. É a chave que sai, não o personagem. Logo abaixo, ainda dentro do encontro, coloque Alterar variável para, que fica em Programação, Variáveis. Escolha temChave. Em Programação, Lógica e Se, pegue Verdadeiro ou falso, encaixe no valor e mantenha verdadeiro, como veio no bloco. A chave sai do chão, mas o jogo guarda que ela foi encontrada."

**Na tela:** em **Programação → Variáveis**, pegar outro **Alterar variável ... para ...**, encaixar após `temChave`, dentro do mesmo evento, e selecionar `aviso`. Em **Programação → Valores**, pegar **texto**, substituir o valor e escrever `Você pegou a chave! Agora vá ao farol.`. Mostrar os três blocos na ordem: destruir, guardar, avisar.

**Narração:**
> "Vamos avisar quem está jogando. Abra Programação, Variáveis e pegue outro Alterar variável para. Encaixe abaixo do bloco que muda temChave, ainda dentro do encontro, e escolha aviso. Essa variável já veio preparada para mostrar uma mensagem na tela. Abra Programação, Valores, pegue texto e encaixe no valor de aviso, substituindo o número que veio ali. Escreva: Você pegou a chave! Agora vá ao farol. Esta mensagem conta o que aconteceu. Quem guarda a informação da coleta é temChave, no bloco anterior. Confira as três ações dentro do encontro: retirar a chave, guardar verdadeiro e mudar o aviso."

**Na tela:** após a prévia atualizar, recolher a chave e atravessar novamente o mesmo lugar. Usar **Atualizar** para reiniciar e conferir que ela reaparece. Não concluir a porta nesta aula.

**Narração:**
> "Teste no jogo. Leve o personagem até a chave. Ela deve sair do chão, e a mensagem deve mudar. Passe de novo pelo mesmo lugar: não há outra chave ali para recolher. Aperte Atualizar para começar uma nova partida. A chave deve voltar. Se ela não sumiu no encontro, confira personagem e chave no evento e Destruir o sprite chave dentro dele. Se a mensagem não mudou, confira o bloco que altera aviso e o texto encaixado. Corrija e teste outra vez."

**Na tela:** apontar o valor de texto encaixado em Alterar variável aviso dentro do encontro com a chave. Não apontar a declaração de aviso em Ao iniciar nem o bloco de temChave. Mostrar o mesmo programa, sem arrastar outra peça.

**Narração:**
> "Agora você pode escrever esse aviso do seu jeito. Dentro do encontro com a chave, encontre o bloco que altera aviso. Mude só o texto encaixado nele, mantendo a ideia de que a chave foi encontrada e o próximo destino é o farol. Você também pode manter a frase do exemplo. Espere o jogo atualizar. Se manteve a frase, aperte Atualizar para começar outra partida. Recolha a chave e confira a mensagem. A frase mudou, mas a regra que guarda a coleta continua no bloco de temChave."

**Na tela:** clicar **Verificar esta etapa**, mostrar o resultado ou uma pendência real e corrigir antes de verificar novamente. Após **Objetivo da etapa cumprido!**, esperar **Salvo**, abrir **Enviar para o professor**, confirmar **Enviar** sem exigir recado e aguardar. Apontar **Concluir aula**.

**Narração:**
> "Quando os testes funcionarem, aperte Verificar esta etapa. Se faltar alguma coisa, corrija o bloco indicado e verifique novamente. Ao aparecer Objetivo da etapa cumprido!, espere Salvo. Aperte Enviar para o professor e confirme em Enviar. Quando o envio terminar, aperte Concluir aula."

**Ponte do Zappy na página (não gravar):** Programe a coleta: tirar a chave do chão, guardar a informação e mostrar o aviso. Teste seu jogo e use Verificar esta etapa antes de enviar.
