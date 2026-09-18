# Palpite, descoberta e diálogo do Zappy nas cenas

## Objetivo

Deixar experiências e demonstrações fáceis de entender antes do primeiro toque. Em um teste com uma criança, a instrução explicava como mexer na cena, mas os controles ainda estavam bloqueados porque faltava responder ao palpite. A criança recebeu duas mensagens contraditórias: parecia ser hora de agir, mas o produto ainda pedia uma resposta.

A nova estrutura mostra primeiro o que está sendo investigado, pede um palpite com contexto suficiente e só então abre a descoberta. A criança continua aprendendo por tentativa, curiosidade e observação, sem descobrir a resposta antes da hora.

## Princípios que o fluxo preserva

- Toda cena com palpite começa pelo palpite, inclusive as demonstrações. Cenas sem palpite e retomadas de uma atividade concluída mantêm o fluxo direto atual.
- Antes da resposta, a cena completa, os controles, as dicas e qualquer resultado ficam fora do DOM. Não basta deixá-los desativados.
- O palpite não é uma prova nem recebe nota. Ele prepara a observação que vem depois.
- A criança precisa saber exatamente sobre qual ferramenta, personagem ou situação está fazendo uma previsão. Nenhuma pergunta pode depender de um controle ainda invisível ou de um nome que não foi apresentado.
- A troca de palpite é permitida. Ao escolhê-la, a atividade volta por inteiro ao estado inicial e fecha novamente a descoberta.
- A regra de conclusão continua no sistema, mas a interface infantil não exibe o rótulo “Atividade obrigatória”. Como toda parte da aula participa da conclusão, o rótulo não orienta a criança e só acrescenta pressão desnecessária.

## Fluxo para cenas com palpite

### 1. Momento do palpite

1. A tela apresenta o marcador simples “Seu palpite” ou, em demonstrações, “Antes de assistir”.
2. O primeiro balão do Zappy explica o contexto e faz a pergunta. O botão `Ouvir` fica dentro desse balão e toca somente essa fala.
3. Abaixo do balão, aparece uma prévia estática e segura do estado inicial da cena. Ela vem do mesmo motor de cena, com elenco e preparação corretos, mas sem controles, dicas, estados de progresso ou detalhes que entreguem a resposta.
4. Uma ficha visual não interativa identifica o que será usado ou observado. Exemplo: “Hoje vamos usar: 🔊 Ouvir a tela”. Ela não imita um botão desativado, pois a criança não deve esperar conseguir acioná-la naquele momento.
5. As alternativas aparecem depois da prévia e respondem diretamente à pergunta.

O primeiro balão deve seguir este contrato editorial:

1. Nomear o elemento concreto da experiência.
2. Explicar em uma frase neutra para que ele serve.
3. Fazer uma pergunta que não revele o resultado.
4. Oferecer respostas que sejam respostas reais para aquela pergunta.

Exemplo para a experiência de leitor de tela:

> Nesta experiência, vamos usar o botão “Ouvir a tela”. Ele lê em voz alta o que aparece no jogo. Antes de apertar “Ouvir a tela”, o que você acha que ele vai dizer?

Isso substitui perguntas soltas como “Quando você clicar não haverá tela”. A criança passa a saber que está investigando o leitor de tela, vê a referência visual e consegue formar um palpite com significado.

### 2. Momento da descoberta

Depois de escolher uma alternativa, a tela mostra um resumo compacto do palpite e a ação “Trocar meu palpite”. O foco segue para o segundo balão do Zappy, que traz a instrução prática. Esse segundo balão tem o seu próprio `Ouvir`, que toca somente a instrução.

Só abaixo dessa instrução a cena completa e seus controles são montados. Em experiências, a linguagem convida a testar. Em demonstrações, ela convida a observar. A variação de texto deixa claro se a criança vai interagir ou acompanhar o que acontece.

Se a criança tocar em “Trocar meu palpite”, a escolha é apagada, o foco volta ao primeiro balão e a interface retorna ao estado inicial: prévia segura, ficha de contexto e alternativas. A cena completa e seus controles deixam de ser montados novamente.

## Áudio, Zappy e acessibilidade

- A fala do palpite reúne apenas contexto, pergunta e alternativas. Ela nunca inclui a instrução de ação.
- A fala da descoberta contém somente a instrução que acompanha a cena aberta. Ela não repete pergunta nem alternativas.
- Os dois botões compartilham a coordenação de mídia já existente. Iniciar uma fala interrompe outra fala em andamento.
- O Zappy começa parado e anima somente enquanto a fala do balão correspondente estiver audível. Ao terminar, pausar ou ser interrompida, a animação para.
- O fallback de voz do navegador continua sendo aplicado por botão quando não houver áudio gerado.
- Não haverá reprodução automática.
- Depois de responder ao palpite, o foco programático vai para o segundo balão, anunciado como a próxima etapa. Ao trocar o palpite, volta ao primeiro balão.
- A prévia e a ficha de contexto têm nomes acessíveis descritivos, mas não expõem controles que ainda não podem ser usados.

## Modelo de conteúdo e implementação técnica

O conteúdo do palpite passa a ter três partes independentes: `contexto`, `pergunta` e `alternativas`. O contexto é obrigatório para cenas publicadas que usam palpite e deve ser escrito pelo autor. O sistema não deve tentar deduzi-lo a partir do título da aula.

Cada cena com palpite também terá configuração explícita de prévia segura. A prévia usa o mesmo renderizador da cena, o elenco e a preparação usados pela atividade. Quando o estado inicial revelar a resposta, o modelo da cena define um estado específico de prévia que não a entregue. Não haverá capturas de tela manuais nem imagens desconectadas da cena real.

As falas ficam separadas em `falaDoPalpite` e `falaDaInstrucao`. A geração de voz deve armazenar e reutilizar cada trecho individualmente, com suas próprias chaves de conteúdo. Assim, editar uma instrução não invalida a fala do palpite e vice-versa.

As áreas que precisam evoluir são:

- O modelo, a validação e a projeção pública de cenas em `@sistemazero/core`, incluindo o contexto e a configuração da prévia.
- O editor administrativo, para cadastrar e revisar contexto, pergunta, alternativas e prévia segura antes da publicação.
- A migração dos modelos de cena já existentes, com contextos base revisados por cena. Conteúdo legado personalizado que não tiver contexto recebe aviso de revisão no Admin. Uma cena nova ou editada não deve ser publicada sem esse campo.
- O `SceneActivity` no Member Shell, que passa a orquestrar os estados fechados e abertos, a prévia, o foco e as duas filas de voz.
- Os blocos de diálogo da Comunidade Kids, para que cada balão mantenha seu próprio botão `Ouvir` sem criar provedores de fala concorrentes.
- O gerador de áudio do Zappy, para criar as duas falas separadas quando necessário.

## Critérios de aceite e revisão

O lote só estará pronto quando os testes cobrirem, no mínimo, os pontos abaixo.

- Uma cena com palpite inicia com apenas o primeiro balão, a prévia segura, a ficha de contexto e as alternativas. Os controles da cena não existem no DOM.
- A experiência de leitor de tela cita “Ouvir a tela”, explica sua função e mostra essa referência na ficha de contexto antes de perguntar o palpite.
- O primeiro `Ouvir` não toca instruções de ação. O segundo `Ouvir` não repete a pergunta ou as alternativas.
- Ao responder, a instrução, a cena e os controles são abertos e o foco chega ao segundo balão.
- Ao trocar o palpite, a atividade volta ao estado fechado e remove os controles do DOM.
- O Zappy fica parado sem áudio, anima apenas na fala ativa e para em término, pausa e interrupção.
- Demonstrações usam a linguagem de observar e experiências usam a linguagem de testar, sem perder a ordem palpite e descoberta.
- Cenas sem palpite e atividades retomadas continuam com o comportamento direto atual.
- A prévia segura de cada modelo de cena revisado não antecipa o resultado da pergunta.
- “Atividade obrigatória” não aparece na interface infantil, enquanto as regras de conclusão continuam funcionando.

## Implantação proposta

O primeiro cenário de referência será a experiência de leitor de tela. Ela cobre o problema encontrado no teste, a ficha “Ouvir a tela”, a separação das duas falas e o estado seguro antes da escolha. Em seguida, o mesmo contrato será aplicado ao catálogo de experiências e demonstrações que têm palpite, com revisão editorial de contexto e prévia por cena.

Essa ordem permite validar a nova semântica com uma criança antes de ampliar o padrão para todas as atividades, sem publicar uma solução genérica que volte a esconder o assunto real da pergunta.
