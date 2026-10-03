# Roteiro de gravação · A Chave do Farol · Dia 2

Duas seções, dois vídeos. Retomar o projeto enviado no Dia 1; o projeto preparado do Dia 2 só é a alternativa quando não houver envio anterior. Não reconstruir nem substituir um projeto já feito pela criança. O primeiro vídeo apresenta a necessidade da variável em cerca de 40 segundos; o segundo acompanha a montagem, em 4 a 5 minutos. Só a narração é falada.

## Seção 1. Encostar ainda não é pegar

### Vídeo `video-d2-contexto` · A chave precisa fazer diferença

**Na tela:** no projeto que tem somente movimento e borda, mover o personagem até a chave e mostrar que ela continua no chão. Não demonstrar a solução pronta. Usar duas legendas simples: `temChave = falso` e `temChave = verdadeiro`. Encerrar apontando **Próxima seção**.

**Narração:**
> "Seu personagem já anda pelo mapa. Mas olha o que acontece quando ele chega à chave: ele passa por ela sem pegar. Vamos fazer esse encontro recolher a chave. Para isso, criamos um evento: uma instrução que responde ao encontro. Também precisamos guardar se a chave foi encontrada. Usamos uma variável, uma informação com nome que o jogo pode consultar e mudar. A nossa se chama temChave. No começo, ela guarda falso, porque a chave ainda está no chão. Depois da coleta, deve guardar verdadeiro. Aperte Próxima seção para montar essa regra."

## Seção 2. Guarde que a chave foi encontrada

### Vídeo `video-d2-programar` · Faça o jogo guardar a chave

**Na tela:** abrir **Programação → Variáveis**. Pegar **Criar variável ... com valor ...**, encaixar em **Ao iniciar**, após **Ativar controles clássicos**. Nomear `temChave`. Abrir **Programação → Lógica & Se**, pegar **Verdadeiro ou falso**, encaixar no valor inicial e escolher **falso**, substituindo o valor que veio no bloco. Confirmar o nome saindo do campo.

**Narração:**
> "Para a chave sair do chão e o jogo lembrar da coleta, precisamos guardar a informação temChave. Comece por ela. Abra Programação, Variáveis. Pegue Criar variável com valor e encaixe no fim de Ao iniciar, depois de Ativar controles clássicos. Escreva temChave, tudo junto, com o C maiúsculo, e clique fora do campo. Abra Programação, Lógica e Se. Pegue Verdadeiro ou falso, coloque no espaço do valor da variável e escolha falso. Assim, cada partida começa sem a chave."

**Na tela:** abrir **Jogo 2D → Colisões → Encostar e bloquear**. Pegar **Quando o sprite ... começar a encostar no sprite ...** e encaixar em **Quando acontecer**. Escolher `personagem` em A e `chave` em B. Apontar o interior do evento vazio.

**Narração:**
> "Agora programe o encontro. Abra Jogo 2D, Colisões, Encostar e bloquear. Pegue Quando o sprite começar a encostar no sprite e encaixe na área Quando acontecer. Escolha personagem no primeiro nome e chave no segundo. As ações que colocarmos dentro deste bloco vão acontecer quando os dois se encontrarem."

**Na tela:** abrir **Jogo 2D → Sprites → Criar e trocar aparência**, pegar **Destruir o sprite ...**, encaixar dentro do evento e selecionar `chave`. Depois abrir **Programação → Variáveis**, pegar **Alterar variável ... para ...** e encaixar logo abaixo, ainda dentro do evento. Escolher `temChave`. Em **Programação → Lógica & Se**, pegar **Verdadeiro ou falso**, encaixar no valor e escolher **verdadeiro**.

**Narração:**
> "Abra Jogo 2D, Sprites, Criar e trocar aparência. Pegue Destruir o sprite, encaixe dentro do encontro e escolha chave. Neste jogo, destruir quer dizer retirar da partida. É a chave que sai, não o personagem. Logo abaixo, ainda dentro do encontro, coloque Alterar variável para, que fica em Programação, Variáveis. Escolha temChave. Em Programação, Lógica e Se, pegue Verdadeiro ou falso, encaixe no valor e escolha verdadeiro. A chave sai do chão, mas o jogo guarda que ela foi encontrada."

**Na tela:** em **Programação → Variáveis**, pegar outro **Alterar variável ... para ...**, encaixar após `temChave`, dentro do mesmo evento, e selecionar `aviso`. Em **Programação → Valores**, pegar **texto**, substituir o valor e escrever `Você pegou a chave! Agora vá ao farol.`. Mostrar os três blocos na ordem: destruir, guardar, avisar.

**Narração:**
> "Vamos avisar quem está jogando. Abra Programação, Variáveis e pegue outro Alterar variável para. Encaixe abaixo do anterior e escolha aviso. Essa variável já veio preparada para mostrar uma mensagem na tela. Abra Programação, Valores, pegue texto e encaixe no valor. Escreva: Você pegou a chave! Agora vá ao farol. Confira os três blocos dentro do encontro: retirar a chave, mudar temChave para verdadeiro e mudar o aviso."

**Na tela:** após a prévia atualizar, recolher a chave e atravessar novamente o mesmo lugar. Usar **Atualizar** para reiniciar e conferir que ela reaparece. Não concluir a porta nesta aula.

**Narração:**
> "Teste no jogo. Leve o personagem até a chave. Ela deve sair do chão, e a mensagem deve mudar. Passe de novo pelo mesmo lugar: não há outra chave ali para recolher. Aperte Atualizar para começar uma nova partida. A chave deve voltar. Se ela não sumiu no encontro, confira personagem e chave no evento e Destruir o sprite chave dentro dele. Se a mensagem não mudou, confira o bloco que altera aviso e o texto encaixado. Corrija e teste outra vez."

**Na tela:** clicar **Verificar esta etapa**, mostrar o resultado ou uma pendência real e corrigir antes de verificar novamente. Após **Objetivo da etapa cumprido!**, esperar **Salvo**, abrir **Enviar para o professor**, confirmar **Enviar** sem exigir recado e aguardar. Apontar **Concluir aula**.

**Narração:**
> "Quando os testes funcionarem, aperte Verificar esta etapa. Se faltar alguma coisa, corrija o bloco indicado e verifique novamente. Ao aparecer Objetivo da etapa cumprido!, espere Salvo. Aperte Enviar para o professor e confirme em Enviar. Quando o envio terminar, aperte Concluir aula."
