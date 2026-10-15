# Falas e atividades propostas para A Chave do Farol

Complemento da [revisão de 04/10/2026](../revisao-pedagogica-desafio-2026-10-04.md). Textos aprovados e incorporados aos roteiros canônicos em `aulas/`, com as experiências e os critérios implementados localmente. Este documento conserva a proposta; a gravação usa os roteiros canônicos completos. Veja o [registro de aplicação](aplicacao.md).

Os caminhos de montagem conservam os nomes do material vigente, confrontados com a paleta e os blocos do projeto. Os controles da nova experiência seguem a [especificação](experiencias.md). Na fala canônica do aviso opcional foi explicitado Atualizar para quem mantém o texto de exemplo e precisa recolher a chave de novo.

## Introdução: ajuste no fim da abertura

Conservar a apresentação do jogo e as instruções atuais dos controles. Substituir o final da narração por:

**Na tela:** personagem, chave e farol na versão pronta, sem resolver o trajeto. Apontar Próxima seção apenas ao final.

**Narração:**

> Explore o mapa e tente encontrar a chave para chegar ao farol. Você pode continuar mesmo sem terminar a partida. Depois de experimentar, aperte Próxima seção.

## Dia 1: comparação dentro da montagem

Conservar o roteiro completo do Dia 1. Inserir depois do primeiro movimento funcionar e antes do teste da beirada. Não criar seção, vídeo ou experiência separados.

**Na tela:** mostrar o campo de velocidade do bloco já encaixado dentro de A cada quadro. Apontar 3 e o mesmo campo, sem demonstrar antecipadamente a comparação. Dar tempo para o teste.

**Narração:**

> O personagem já anda. Vamos mudar uma coisa para comparar. No bloco de movimento que você acabou de encaixar, troque a velocidade de três para um e clique fora do campo. Antes de testar, pense se ele vai andar mais ou menos em cada repetição. Espere o jogo atualizar e segure uma seta. Compare com o movimento anterior. Depois volte a velocidade para três, clique fora do campo e teste novamente. Vamos continuar a aventura com esse valor.

Retomar o teste da beirada, a montagem do limite e a entrega como no roteiro atual. A criança não precisa registrar uma resposta escrita. Na gravação, não acelerar a comparação para caber na estimativa antiga.

**Ponte do Zappy na página (não gravar), substituindo a atual:** Monte o movimento e compare as velocidades. Depois teste as quatro direções e as bordas. Use Verificar esta etapa antes de enviar o projeto.

## Dia 2, seção 1: O jogo guardou a chave?

### Vídeo `video-d2-contexto`

Substitui a fala atual da seção `contexto`; a identidade do vídeo permanece, mas o conteúdo exige nova gravação. Duração estimada: 50–75 segundos, a ajustar no ensaio.

**Na tela:** mostrar brevemente, no projeto do fim do Dia 1, o personagem encostando na chave e se afastando, com a chave ainda presente. Depois abrir o estado inicial da experiência `collect-and-remember`. Apontar o mostrador `temChave = falso` e os controles, sem executar a coleta na experiência.

**Narração:**

> Seu personagem já anda, mas ainda passa pela chave sem pegar. Vamos investigar como recolher a chave e guardar que ela foi encontrada. Nesta experiência, a coleta já está preparada e você pode mudar se o encontro também guarda essa informação. O mostrador acompanha uma variável chamada temChave. Variável é onde o jogo guarda um valor que pode mudar. Aqui, falso significa que a coleta ainda não ficou guardada. Não quer dizer que você errou.

**Na tela:** apontar Guardar a coleta desligado, Encostar na chave, Recomeçar a partida e Afastar. Não mostrar os valores resultantes nem preencher as metas na edição.

**Narração:**

> Primeiro, deixe Guardar a coleta desligado e aperte Encostar na chave. Compare a chave, a mensagem e o valor guardado. Depois aperte Recomeçar a partida, ligue Guardar a coleta e encoste outra vez. Aperte Afastar e olhe o valor. Por último, recomece a partida e confira o que voltou ao começo. Depois de fazer esses testes, aperte Próxima seção.

**Ponte do Zappy na página (não gravar):** Compare o que some da tela com o que fica guardado no jogo. A experiência mostra a informação temChave durante cada tentativa.

## Dia 2, seção 2: Guarde que a chave foi encontrada

Conservar os caminhos, encaixes, campos e a montagem integral do roteiro atual. São duas alterações de fala e uma atividade curta, descritas abaixo.

### Retomar a experiência na abertura

Substituir somente as três frases iniciais, antes de **Abra Programação, Variáveis**, por:

**Na tela:** abrir o projeto próprio, ainda no estado enviado no Dia 1. Mostrar Ao iniciar e o lugar da declaração. Não substituir o projeto pela experiência.

**Narração:**

> Na experiência, você comparou tirar a chave do chão com guardar a coleta. Agora faça seu jogo guardar essa informação. Vamos criar a variável temChave começando em falso e mudar para verdadeiro no encontro com a chave.

Continuar imediatamente com a instrução existente: abrir Programação → Variáveis, pegar Criar variável com valor, encaixar após os controles, nomear temChave e substituir o valor pelo bloco booleano falso. Conservar a explicação do evento e as três ações dentro dele.

### Mensagem com palavras próprias

Inserir depois de a coleta com a mensagem de exemplo funcionar e antes da verificação/envio. O caminho e o bloco já foram ensinados; esta atividade modifica apenas seu texto.

**Na tela:** apontar o valor de texto encaixado em Alterar variável aviso dentro do encontro com a chave. Não apontar a declaração de aviso em Ao iniciar nem o bloco de temChave. Mostrar o mesmo programa, sem arrastar outra peça.

**Narração:**

> Agora você pode escrever esse aviso do seu jeito. Dentro do encontro com a chave, encontre o bloco que altera aviso. Mude só o texto encaixado nele, mantendo a ideia de que a chave foi encontrada e o próximo destino é o farol. Você também pode manter a frase do exemplo. Espere o jogo atualizar, recolha a chave e confira a mensagem. A frase mudou, mas a regra que guarda a coleta continua no bloco de temChave.

A mudança é opcional. O objetivo principal continua sendo a coleta e sua memória; não bloquear a entrega de quem preservou o texto de exemplo. Os critérios já aceitam texto próprio.

### Fecho da prática

Manter o teste de passar novamente pelo lugar da chave e reiniciar, a correção de nomes e encaixes e a sequência **Verificar esta etapa → corrigir se necessário → Objetivo da etapa cumprido! → Salvo → Enviar para o professor → Enviar → Concluir aula**.

**Ponte do Zappy na página (não gravar):** Programe a coleta: tirar a chave do chão, guardar a informação e mostrar o aviso. Teste seu jogo e use Verificar esta etapa antes de enviar.

## Dia 3, seção 1: O que a porta precisa?

### Vídeo `video-d3-condicao`

**Na tela:** mostrar a cena inicial da porta com o novo mostrador e as duas respostas sem destaque. Apontar Testar a porta e Levar a chave. Não clicar nem revelar a resposta. Duração estimada: 40–55 segundos.

**Narração:**

> Seu jogo já guarda a coleta da chave. Agora a porta precisa usar essa informação. Uma condição é uma pergunta que o jogo confere. Nesta experiência, acompanhe temChave e a pergunta da porta. Primeiro aperte Testar a porta sem levar a chave. Veja qual resposta fica marcada. Depois aperte Levar a chave e Testar a porta outra vez. Compare o valor guardado e a resposta nas duas tentativas. Quando terminar os dois testes, aperte Próxima seção.

**Ponte do Zappy na página (não gravar):** A coleta já guarda uma informação. Veja como a porta usa essa informação para escolher uma resposta.

## Dia 3, seção 2: Avise quando faltar a chave

### Novo vídeo `video-d3-sem-chave`

Nova seção `sem-chave`, entre `condicao` e `decisao`. Mesmo Estúdio `projeto`, sem envio intermediário. Duração estimada: 3–4 minutos, com tempo de execução.

**Na tela:** retomar o projeto da criança. Apontar o encontro com a chave já montado e o espaço abaixo, na área Quando acontecer. Abrir Jogo 2D → Colisões → Encostar e bloquear. Pegar Quando o sprite começar a encostar no sprite e configurar personagem/farol em um evento separado.

**Narração:**

> Você comparou as duas respostas da porta. Vamos começar pelo aviso de que falta a chave. O encontro com a chave já está pronto. Abra Jogo 2D, Colisões, Encostar e bloquear. Pegue Quando o sprite começar a encostar no sprite. Encaixe na área Quando acontecer, abaixo do evento da chave, sem colocar um evento dentro do outro. Escolha personagem no primeiro nome e farol no segundo. O encontro diz quando o jogo vai conferir a chave.

**Na tela:** abrir Programação → Lógica & Se, encaixar Se no corpo do evento. Abrir Programação → Valores, pegar valor da variável, substituir a condição inicial e selecionar temChave.

**Narração:**

> Abra Programação, Lógica e Se. Pegue Se e encaixe dentro do encontro com o farol. Agora abra Programação, Valores. Pegue valor da variável, encaixe na pergunta do Se e escolha temChave. A pergunta decide qual resposta será executada. Dá para ler assim: quando o personagem encostar no farol, confira se temChave é verdadeiro.

**Na tela:** clicar + senão. Abrir Programação → Variáveis, pegar Alterar variável para, encaixar em senão e escolher aviso. Em Programação → Valores, pegar texto e substituir o número inicial. Escrever A porta não abriu. Falta a chave.

**Narração:**

> No bloco Se, aperte mais senão. Escolha senão, sem o se no final. Essa parte recebe a resposta quando temChave é falso. Abra Programação, Variáveis. Pegue Alterar variável para, encaixe dentro de senão e escolha aviso. Abra Programação, Valores, pegue texto e coloque no valor do aviso, substituindo o número que veio ali. Escreva: A porta não abriu. Falta a chave. A parte então fica vazia por enquanto. Ainda não colocamos nela a regra para acender a luz.

**Na tela:** usar Atualizar. Ir ao farol sem passar pela chave. Mostrar a mensagem efetivamente produzida. Apontar evento, condição e aviso em senão ao conferir. Não programar o ramo então neste vídeo.

**Narração:**

> Aperte Atualizar para começar a partida. Vá ao farol sem passar pela chave. A luz deve continuar apagada e o aviso deve dizer que falta a chave. Se a mensagem não apareceu, confira personagem e farol no encontro, temChave na pergunta e o aviso dentro de senão. Depois de corrigir, atualize e teste outra vez.

**Na tela:** clicar Verificar esta etapa e apresentar o resultado real da verificação intermediária. Esperar Salvo e apontar Próxima seção. O botão de envio não integra esta tarefa.

**Narração:**

> Depois do teste, aperte Verificar esta etapa. Se aparecer uma pendência, corrija o bloco indicado e verifique novamente. Quando aparecer Objetivo da etapa cumprido!, espere Salvo. Aperte Próxima seção.

**Ponte do Zappy na página (não gravar):** Monte a resposta sem chave. Vá ao farol sem recolher a chave e confira o aviso. Verifique esta etapa antes de seguir.

## Dia 3, seção 3: Acenda o farol com a chave

### Vídeo preservado `video-d3-decisao`, com nova gravação

A seção mantém a chave `decisao` e recebe a entrega única do dia. Duração estimada: 4–5 minutos, incluindo os percursos. O tempo real de espera do barco deve aparecer na gravação.

**Na tela:** manter o mesmo Estúdio e o mesmo Se. Apontar o aviso em senão e o ramo então vazio. Não recarregar a retomada preparada nem duplicar o evento do farol.

**Narração:**

> Seu farol já avisa quando falta a chave. Agora vamos completar a resposta para quando ela foi encontrada. No encontro entre personagem e farol, encontre o mesmo Se que você acabou de montar. A parte então ainda está vazia. É nela que vamos colocar as ações para quando temChave for verdadeiro.

**Na tela:** em Programação → Variáveis, pegar Alterar variável para, encaixar em então e escolher ganhou. Em Programação → Lógica & Se, pegar Verdadeiro ou falso, substituir o valor e manter verdadeiro.

**Narração:**

> Abra Programação, Variáveis. Pegue Alterar variável para e encaixe dentro de então. Escolha ganhou. Abra Programação, Lógica e Se. Pegue Verdadeiro ou falso, encaixe no valor e mantenha verdadeiro, como veio no bloco. A variável ganhou já veio preparada para ligar o movimento do barco. Você está programando quando essa chegada pode acontecer.

**Na tela:** abrir Jogo 2D → Sprites → Criar e trocar aparência. Pegar Trocar imagem do sprite para, encaixar abaixo de ganhou em então, escolher farol e farol-aceso.

**Narração:**

> Agora abra Jogo 2D, Sprites, Criar e trocar aparência. Pegue Trocar imagem do sprite para e encaixe logo abaixo do bloco de ganhou, ainda dentro de então. Escolha o sprite farol e a imagem farol-aceso. Essa ação muda a imagem para mostrar a luz acesa.

**Na tela:** abrir Programação → Variáveis, pegar outro Alterar variável para, encaixar abaixo da troca de imagem em então e escolher aviso. Em Programação → Valores, pegar texto, substituir o número e escrever o aviso de chegada.

**Narração:**

> Falta a mensagem de chegada. Abra Programação, Variáveis. Pegue outro Alterar variável para e encaixe abaixo da troca de imagem, dentro de então. Escolha aviso. Abra Programação, Valores, pegue texto e encaixe no valor, substituindo o número. Escreva: Você acendeu o farol! Olhe o barco chegando. Confira: em então, ficam ganhou verdadeiro, a imagem acesa e o aviso de chegada. Em senão, continua o aviso de que falta a chave.

**Na tela:** iniciar uma partida por Atualizar. Visitar o farol sem chave; afastar-se, buscar a chave e voltar ao farol na mesma partida. Esperar a luz e o barco. Reiniciar depois da vitória e ir ao farol sem chave. Mostrar esses estados reais, sem edição que simule o funcionamento.

**Narração:**

> Vamos testar a aventura inteira. Aperte Atualizar e vá ao farol sem passar pela chave. A luz deve ficar apagada e o aviso deve dizer que falta a chave. Agora se afaste do farol, busque a chave e volte, sem recomeçar a partida. A luz deve acender, o aviso deve mudar e o barco deve chegar. O jogo guardou a coleta enquanto você andava até o farol. Depois aperte Atualizar. A chave deve voltar ao chão. Vá direto ao farol, sem recolhê-la: ele deve voltar a avisar que falta a chave.

**Na tela:** apontar a declaração de temChave em Ao iniciar, sua mudança na coleta e sua consulta no farol, um trecho de cada vez. As correções a seguir correspondem aos pontos que os testes distinguem.

**Narração:**

> Se a luz acendeu sem chave, confira se temChave começa em falso, se o Se consulta temChave e se a troca da imagem está dentro de então. Se não acendeu depois da coleta, confira se o encontro com a chave muda temChave para verdadeiro e se escolheu farol-aceso na troca da imagem. Se a luz acendeu, mas o barco não veio, confira ganhou verdadeiro dentro de então. Se o aviso saiu diferente, confira seu texto e a resposta em que ele está encaixado. Depois de corrigir, repita os testes.

**Na tela:** executar a verificação cumulativa, mostrar eventuais pendências reais, esperar Salvo e enviar com confirmação. Manter o mesmo projeto para publicar.

**Narração:**

> Depois dos testes, aperte Verificar esta etapa. Se aparecer alguma pendência, corrija e verifique novamente. Quando aparecer Objetivo da etapa cumprido!, espere Salvo. Aperte Enviar para o professor e confirme em Enviar. Quando terminar o envio, aperte Próxima seção.

**Ponte do Zappy na página (não gravar):** Complete a resposta com chave. Teste chegar sem ela, buscar e voltar, e começar outra partida. Depois verifique e envie seu jogo.

## Dia 3, seção 4: Publique seu jogo

Conservar integralmente `video-d3-fecho`, o caminho de publicação, o diálogo e a ajuda atuais. Atualizar somente o número da seção no roteiro. O Estúdio continua sendo `projeto`, já enviado na seção `decisao`.

## Quiz final: substituir somente a pergunta da memória

Continuam quatro questões, com revisão e correção imediata. Nova identificação sugerida: `q-memoria-coleta`. Não reaproveitar silenciosamente o id `q2` com outro significado.

**Enunciado:**

> Em um teste, a chave saiu do chão e apareceu o aviso de coleta, mas o farol ainda disse que faltava a chave. A porta está consultando temChave corretamente. Qual parte da coleta você deve conferir primeiro?

**Alternativas:**

- A. Se o aviso usa exatamente as mesmas palavras do vídeo.
- B. Se o encontro com a chave muda temChave para verdadeiro.
- C. Se a velocidade do personagem está mais alta.

**Resposta:** B.

**Explicação:**

> Destruir o sprite retira a chave do chão. Alterar aviso muda a mensagem para quem joga. Essas duas ações não guardam a coleta em temChave. Dentro do encontro com a chave, o bloco que altera temChave precisa guardar verdadeiro. É essa informação que a porta consulta depois.

O enunciado não afirma que essa seja a única causa possível em qualquer programa; especifica que a consulta da porta já foi conferida e pede a primeira verificação na coleta. A pergunta aplica a distinção aprendida a um problema do código.

Conservar o diálogo de abertura do quiz, as outras três perguntas, a seção isolada e a celebração atuais. Não imprimir o novo gabarito no caderno.
