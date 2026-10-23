# Pensa: diagnóstico do propósito e proposta de reestruturação

Data: 16 de outubro de 2026. Proposta para discussão, sem alteração no aplicativo.

Direção aprovada e detalhada posteriormente na [especificação da reestruturação](../docs/plans/2026-10-16-pensa-reestruturacao-spec.md), incorporando preparação com extensão recomendada e adaptação obrigatória aos recursos atuais. Este relatório preserva o diagnóstico e a proposta inicial.

O Pensa deve ajudar a criança a definir o jogo que quer criar, transformar o escopo combinado em missões de funcionalidades e acompanhar a construção. A recomendação é reestruturar o contrato de planejamento, a geração e a apresentação das missões em torno dessas três responsabilidades, aproveitando a infraestrutura existente.

## 1. O propósito que deve orientar o produto

A criança precisa conseguir responder: como será meu jogo, quais partes preciso construir, o que já fiz e qual é a próxima parte. O curso ensina a implementar. O Pensa organiza o projeto e mantém as decisões compreensíveis durante a construção.

Uma missão descreve um resultado do jogo, suas regras relevantes e como reconhecer que está pronto. Quantidades, comportamentos, controles e condições de vitória podem aparecer quando fazem parte da definição combinada. Categorias da paleta, encaixes de blocos, nomes de variáveis e sequências de cliques pertencem ao apoio de implementação.

Planejar o escopo completo significa cobrir tudo o que a criança escolheu incluir neste projeto. Uma ideia ainda pode ser negociada, reduzida ou dividida em entregas. Essa decisão precisa ficar explícita; o sistema não deve transformar silenciosamente partes importantes do jogo em sugestões para um futuro indefinido.

## 2. Diagnóstico do código atual

A análise acompanhou a entrada do Pensa, os contratos compartilhados, os prompts de planejamento e ajuda, as validações, a publicação das missões, o progresso e os painéis nas oficinas. Também considerou a proposta de 14/10 e os registros das mudanças de 15/10. As consequências de experiência abaixo são inferências a partir do código, sem atribuir resultados a testes com crianças.

### 2.1 O desvio para tutorial está explicitamente contratado

O prompt principal atribui ao Zappy a função de organizar e ensinar. A geração dos guias exige um gesto preciso por passo: onde clicar, qual bloco pegar, para onde arrastar e qual valor preencher. Há exemplos de pegar um bloco de inicialização e encaixar um bloco de sprite. A regra final é um bloco por passo.

Evidências: [sistema e geração dos guias](../packages/member-shell/src/server/pensa-journey/planner.ts:55), especialmente a geração a partir da linha 557; [GuideDraftSchema e guideIssues](../packages/member-shell/src/server/pensa-journey/contracts.ts:201).

O validador também reforça essa direção: certas formulações são devolvidas ao modelo com a orientação de substituir o texto pelo gesto de pegar e arrastar o bloco. Portanto, mudar apenas o prompt e manter o restante deixaria partes do sistema exigindo o comportamento anterior.

Na interface, [PensaInstructions](../packages/ui/src/components/ui/pensa-instructions.tsx:14) mostra um passo por vez, com Anterior, Próximo passo e Ver todos os passos. O [cartão da missão](../packages/pensa/src/components/JourneyApp.tsx:1506) orienta a seguir o guia exatamente. O [painel do Estúdio](../packages/studio/src/studio/TaskGuidePanel.tsx:185) reproduz essa experiência.

A conclusão do v2 já dispensa marcar cada gesto, o que é útil preservar. O problema é o conteúdo e o papel dos guias, mesmo sem uma caixa de seleção por passo.

### 2.2 O objeto central é um primeiro começo

[PensaProposal](../packages/core/src/pensa/index.ts:112) contém resumo, primeiro resultado, características essenciais, sugestões, ideias futuras e missões. Não há uma definição independente e estruturada do conjunto de funcionalidades acordadas, com vínculo entre requisitos e missões.

O [prompt principal](../packages/member-shell/src/server/pensa-journey/planner.ts:71) exige um primeiro resultado pequeno, de duas a seis missões, com máximo de oito, e orienta a guardar os ciclos futuros em later. O [schema](../packages/member-shell/src/server/pensa-journey/contracts.ts:12) limita as missões a oito e essentials a três itens.

Há organização dentro desse começo. A lacuna é representar, como fonte estável, o jogo completo escolhido pela criança e conferir se todas as partes estão contempladas. Um resumo livre pode mencionar outras partes, mas não fornece essa rastreabilidade.

### 2.3 As perguntas buscam começar rapidamente

[pensaQuestionsLeft](../packages/core/src/pensa/index.ts:166) permite duas perguntas num jogo novo e uma quando já existe construção. O [prompt de proposta](../packages/member-shell/src/server/pensa-journey/planner.ts:455) só admite perguntas cuja resposta mude a primeira missão. Também manda decidir visual, cenário, ritmo e outros detalhes como sugestões do Zappy.

Evitar perguntas repetidas é uma melhoria. Vincular toda dúvida à primeira missão, porém, pode deixar indefinidas regras importantes para o restante do jogo. Aparência e cenário também podem ser centrais para uma ideia, mesmo quando não alteram a primeira ação no editor.

### 2.4 Regras de experiência viraram obrigações universais

O sistema manda começar no Estúdio com algo se movendo e reagindo, sem menu antes de jogar. A [validação playFirstIssues](../packages/member-shell/src/server/pensa-journey/contracts.ts:126) exige que a primeira missão seja do Estúdio; o restante dessa intenção fica no prompt.

Ter retorno cedo é útil. Uma primeira missão de preparar o tabuleiro, organizar uma cena ou criar um conjunto necessário de cartas também pode ser apropriada. Resultado observável inclui uma disposição visual correta, além de uma ação jogável. A ordem deve vir das necessidades do jogo.

### 2.5 A missão de produto está acoplada à montagem técnica

[PensaBlueprintMission](../packages/core/src/pensa/index.ts:99) já exige destino, blocos, extensões, manuais, ferramentas e um asset opcional. A etapa posterior transforma esse objeto em uma tarefa com guia técnico, mantendo a correspondência exata com o plano aceito.

O catálogo autorizado e a compatibilidade devem continuar sendo conferidos. A especificação da funcionalidade, entretanto, precisa continuar válida se a criança usar outra montagem de blocos ou converter o jogo para código. As referências técnicas devem apoiar a viabilidade e a ajuda, sem definir a unidade de planejamento.

Há um efeito adicional: [gameExtensionIssues](../packages/member-shell/src/server/pensa-journey/contracts.ts:159) preserva a extensão do jogo já iniciado. Escolher a extensão apenas para um começo reduzido pode limitar funcionalidades já imaginadas para o restante do projeto. A escolha técnica deve considerar o escopo acordado inteiro, usando a extensão mais simples que o suporte.

### 2.6 Adaptar o caminho substitui o conjunto de missões do ciclo

Na [publicação do novo plano](../packages/members/src/infrastructure/persistence/drizzle/pensa-journey.repository.ts:1118), a revisão arquiva todas as tarefas do ciclo e insere as novas. O histórico permanece arquivado, mas as missões ativas recebem novas identidades.

Isso é diferente de alterar apenas as partes afetadas de um projeto. Um gerenciador de projeto precisa preservar missões e progresso válidos quando uma regra, quantidade ou funcionalidade muda.

### 2.7 Permanecem dois fluxos acessíveis

[PensaWorkspace](../packages/pensa/src/components/PensaApp.tsx:115) monta a jornada atual e também permite abrir LegacyPensaApp. O legado não é código morto: há navegação e testes que o utilizam. Como a direção atual dispensa compatibilidade, a implementação futura pode remover esse fluxo de forma coordenada.

Os documentos também registram definições distintas de ZERO: o contrato antigo encerra no plano aprovado; o atual acompanha construção e teste. A reestruturação precisa deixar uma única descrição vigente para evitar que mudanças futuras recuperem regras antigas por engano.

## 3. Alternativas consideradas

| Abordagem | Vantagem | Limitação |
| --- | --- | --- |
| Reestruturar definição do jogo, plano e missão funcional, reutilizando a infraestrutura | Resolve o propósito no modelo, na geração e nas oficinas | Exige alteração coordenada dos contratos e dos fluxos |
| Alterar somente os prompts e esconder os passos | Produz uma mudança pequena na interface | Mantém o foco no primeiro começo, os limites de escopo e contratos de guia incompatíveis |
| Retomar o fluxo antigo de documentos e auditorias | Recupera descrição mais abrangente e planejamento anterior à execução | Reintroduz aprovações documentais e burocracia; o legado também possui passos técnicos |

Recomendo a primeira abordagem. O ganho das melhorias recentes está na facilidade de entrada e continuidade. Essas melhorias podem sustentar um planejador de funcionalidades.

## 4. Definir o jogo com facilidade

Manter a entrada livre por texto ou voz e a possibilidade de guardar uma ideia incompleta. O Zappy extrai o que já foi dito e organiza uma definição curta:

- O que o jogador faz e qual é a proposta do jogo.
- Quais personagens, objetos, espaços e telas são necessários.
- Quais regras governam as ações e os resultados.
- Como a partida começa, continua e termina, quando houver partida e término.
- Quais características visuais são importantes para a autoria da criança.
- Quais funcionalidades entram no projeto e quais ficam como possibilidades ainda não escolhidas.

Esses itens orientam a estrutura interna; não são um formulário obrigatório. Exploração e criação livre podem não ter vitória, derrota ou pontuação.

A criança vê algo como “Seu jogo vai ser assim”, em linguagem cotidiana, e pode corrigir. Propostas do Zappy permanecem identificadas como sugestões até serem aceitas. Um detalhe que não muda as missões pode ficar aberto para decisão durante a construção.

A pergunta deve esclarecer uma dúvida que altere o escopo, uma regra importante, a viabilidade ou a ordem das missões. Não deve depender exclusivamente de mudar a primeira missão. Fazer uma pergunta de cada vez, aproveitando respostas anteriores, mantém a conversa leve.

Usar um critério de definição suficiente: há informação para descrever as funcionalidades e ordená-las sem inventar decisões importantes? Quando houver, apresentar a visão e o caminho. Quando faltar, esclarecer o ponto específico. Limites técnicos de custo e tamanho continuam existindo, mas não devem forçar o modelo a adivinhar uma regra importante depois de duas perguntas.

## 5. Planejar todo o escopo acordado

O plano precisa relacionar cada funcionalidade escolhida a uma ou mais missões. Cada missão também precisa justificar sua existência por um requisito, pela preparação necessária ou pela verificação do jogo.

Por exemplo, se o jogo inclui cartas, comparação de pares, vitória e reinício, esses quatro elementos devem aparecer no caminho. Não basta preparar um tabuleiro e deixar todo o restante numa lista genérica de ideias.

Para jogos maiores, organizar o mapa em entregas com nomes compreensíveis, como “Preparar o jogo”, “Fazer as regras funcionarem” e “Finalizar e experimentar”. Os nomes e a quantidade de etapas dependem do projeto. Elas agrupam as missões; não criam outro roteiro de implementação dentro de cada missão.

Uma primeira versão jogável pode ser uma entrega intermediária. O mapa continua mostrando as funcionalidades já combinadas para as próximas entregas. Ideias ainda não escolhidas ficam num espaço separado. A criança deve conseguir distinguir uma parte planejada para depois de uma possibilidade que ainda não entrou no projeto.

Todos os requisitos e os cartões funcionais do escopo escolhido ficam disponíveis no plano. A apresentação pode recolher etapas futuras para reduzir leitura. Isso não deve adiar a definição de partes necessárias nem inventá-las somente depois de a criança terminar o começo.

Remover o máximo de oito como regra de produto. Limites de geração devem ser tratados por tamanho de contexto, lotes e agrupamentos coerentes, preservando a cobertura do escopo. Não se deve juntar funcionalidades sem relação ou apagar requisitos para caber no formato de uma chamada.

## 6. O contrato de uma missão

Uma missão contém:

| Informação | Papel |
| --- | --- |
| Título | Nomear o resultado com um verbo e um elemento concreto do jogo |
| Objetivo | Explicar o que passará a existir ou funcionar |
| Regras e detalhes | Registrar os comportamentos e configurações que fazem parte do combinado |
| Como conferir | Dar uma observação ou experiência curta que permita verificar o resultado |
| Relação com o plano | Identificar a etapa, os requisitos atendidos e as dependências reais |
| Trabalho | Registrar ferramenta principal, responsável quando houver equipe e progresso |

A ferramenta pode aparecer como orientação de destino. Referências técnicas, identificação do projeto e recursos permitidos ficam no contexto interno ou no apoio solicitado.

Exemplo de cartão, supondo que a criança tenha escolhido essa regra:

> **Faça as cartas diferentes virarem de volta**
>
> Quando o jogador escolher duas cartas com desenhos diferentes, elas ficam abertas por um instante e depois escondem os desenhos. Durante essa espera, outras cartas não podem ser escolhidas.
>
> **Pronto quando:** você consegue escolher duas cartas diferentes, ver as duas fecharem e escolher outro par em seguida.

O tempo pode ser escolhido pela criança ou apresentado como sugestão editável, quando fizer diferença para o projeto. A missão não precisa prescrever variáveis, temporizadores ou blocos para expressar essa regra.

### Granularidade

A missão deve ter um resultado principal que a criança consiga reconhecer, explicar e concluir. Separar resultados independentes; reunir ações que entregam a mesma funcionalidade. “Fazer o jogo inteiro” é amplo demais. “Criar uma variável” é detalhe de montagem. “Mostrar os pontos e atualizá-los quando uma estrela for pega” é uma entrega funcional.

A repetição de conteúdo não exige repetir a missão: seis pares podem ser um conjunto de cartas, e várias fases podem compartilhar uma missão de criação de fases quando as regras já existem. Separar conteúdo em missões adicionais quando houver diferenças relevantes de criação, responsabilidade ou resultado.

Uma missão pode exigir muitos blocos e continuar sendo uma única entrega. Se o resultado tiver vários comportamentos independentes ou ficar difícil de acompanhar, dividir em outras missões funcionais. A divisão não deve acompanhar a quantidade de linhas de código.

### Ordem

A sequência recomendada respeita dependências concretas, prepara a base necessária, permite conferir resultados durante a construção e apresenta regras centrais antes de aprimoramentos que dependem delas. Um tabuleiro pode vir antes da interação; a regra de comparação depende da seleção de cartas; o reinício depende dos estados que precisará restaurar.

A dependência precisa representar uma necessidade real, além da ordem recomendada. Isso permite, por exemplo, trabalho paralelo de arte e programação. O sistema destaca uma próxima missão, mas pode oferecer outra disponível sem liberar uma missão que dependa de algo ainda ausente.

## 7. Exemplo completo de caminho funcional

Exemplo ilustrativo: jogo da memória com doze cartas, seis pares, seleção de duas cartas, pares encontrados permanecendo abertos, cartas diferentes fechando após uma pausa, mensagem de vitória e botão de jogar novamente. Essas escolhas representam um escopo hipotético combinado, não decisões já tomadas por uma criança real.

| Etapa | Missão | Resultado esperado |
| --- | --- | --- |
| Preparar o jogo | 1. Prepare a área das cartas | A área acomoda as doze cartas de forma organizada e sem sobreposição |
| Preparar o jogo | 2. Crie e distribua as cartas | Há seis pares com posições embaralhadas, começando com os desenhos escondidos |
| Fazer as regras funcionarem | 3. Deixe o jogador virar duas cartas | É possível escolher duas cartas diferentes; escolher a mesma duas vezes não forma um par |
| Fazer as regras funcionarem | 4. Deixe os pares encontrados abertos | Duas cartas iguais permanecem abertas e deixam de participar das próximas escolhas |
| Fazer as regras funcionarem | 5. Esconda novamente as cartas diferentes | Depois da comparação, cartas diferentes fecham; durante a pausa a seleção fica bloqueada |
| Finalizar e experimentar | 6. Mostre quando o jogador completar o jogo | A mensagem de vitória aparece somente depois dos seis pares |
| Finalizar e experimentar | 7. Deixe jogar novamente | Uma nova partida esconde e embaralha as cartas, limpa a seleção e a mensagem anterior |
| Finalizar e experimentar | 8. Experimente uma partida completa | A criança confere acertos, erros, vitória e reinício; problemas encontrados voltam para correção |

A regra de seleção limita a duas cartas; a comparação define quando a próxima seleção fica disponível. Esses comportamentos precisam ser coerentes entre as missões, sem exigir que o Zappy determine a montagem interna.

Se a criança também quiser desenhar as figuras, incluir a criação do conjunto no Pinta e a colocação dessas figuras no jogo. Posicionar esse trabalho conforme a importância do visual e as dependências. Usar figuras provisórias pode ser uma escolha útil, apresentada como tal. Não deve ser uma obrigação universal.

As oito missões deste exemplo resultam das funcionalidades escolhidas. Outro jogo pode precisar de menos ou mais missões.

## 8. Acompanhar a construção

A tela do projeto deve apresentar a definição do jogo, uma missão em destaque e o mapa por etapas. No mapa, mostrar o que já foi feito, o que está sendo feito e o que falta. A conversa permanece acessível para ajustar a ideia, esclarecer a missão ou registrar uma dificuldade.

O cartão atual mostra objetivo, regras e como conferir, com uma ação principal para continuar na ferramenta. O painel dentro do Estúdio, Pinta ou Molda mostra o mesmo conteúdo funcional. Não reaparece uma sequência de gestos no destino.

Manter os estados básicos por missão: a fazer, fazendo e feita. Dependências indisponíveis e pedidos de ajuda podem aparecer como condições e recados, sem multiplicar colunas de gestão. Um breve registro de onde parou pode ajudar a retomar.

Conclusão usa a conferência do resultado e o vínculo com a criação, sem contar cliques nem exigir marcas para cada detalhe. Um arquivo salvo comprova a existência da criação, mas não o funcionamento da regra. O sistema deve distinguir relato da criança e observação efetivamente disponível no runtime, preservando essa honestidade já existente nos testes de versão.

Permitir retomar, conferir e reabrir uma missão quando necessário. Ao mudar um requisito, revisar o impacto nas missões dependentes e marcar o que precisa ser conferido. Não apagar conclusões de partes sem relação com a mudança. O progresso do plano também não deve ser apresentado como percentual de tempo restante.

A ferramenta continua abrindo o mesmo projeto e oferecendo continuidade sem idas obrigatórias ao Pensa entre missões. Preparação técnica necessária, como a seleção de extensão, permanece explícita no host quando exigir uma ação da criança. Não se transforma em uma tarefa de conteúdo gerada pelo planejador.

## 9. A relação com cursos e tutor

| Responsável | Pergunta que responde |
| --- | --- |
| Pensa | O que meu jogo precisa ter e qual parte vou construir agora? |
| Curso | Como aprendo a criar esse comportamento com as ferramentas? |
| Tutor no Estúdio | Como esclareço uma dúvida ou investigo uma dificuldade concreta aqui? |

O Pensa pode explicar o resultado de uma missão e indicar uma aula ou ajuda pertinente. Links precisam continuar validados por acesso. Ter uma aula concluída não prova domínio; ter um recurso liberado não prova que a criança sabe usá-lo.

Se a criança pedir como fazer, oferecer apoio de aprendizagem localizado ou acesso ao tutor. A resposta não deve reescrever o plano em uma sequência de comandos. Aumentar o apoio de aprendizagem também não deve aumentar automaticamente o número de missões.

Essa separação combina com a atividade Project Planning do currículo Creative Computing, que propõe definir um projeto com escopo adequado, organizar as atividades para concluí-lo e listar recursos. A mesma unidade inclui revisão de progresso e aprendizagem durante a criação. Isso oferece uma referência de organização; não demonstra que esta interface do Pensa será compreendida sem avaliação. [Creative Computing Curriculum, unidade 6](https://creativecomputing.gse.harvard.edu/guide/curriculum.html).

## 10. Estrutura técnica proposta

Separar as seguintes responsabilidades no domínio:

1. **Definição do jogo:** intenção, decisões aceitas, sugestões ainda abertas, funcionalidades e regras com identidades estáveis.
2. **Plano do projeto:** etapas, entregas escolhidas, missões, dependências e cobertura dos requisitos.
3. **Missão funcional:** objetivo, regras, conferência, destino e responsabilidade.
4. **Progresso:** estado, criação vinculada, relato de conferência e registros de retomada.
5. **Contexto técnico e aprendizagem:** recursos autorizados, compatibilidade, referências e contexto para o tutor, sem determinar a montagem da funcionalidade.

São responsabilidades do modelo, não cinco novos sistemas ou serviços. Os contratos compartilhados devem expressá-las para o Pensa, o host e a persistência.

O pipeline passa a organizar a definição, esclarecer lacunas relevantes, decompor o escopo e revisar cobertura, ordem, granularidade, linguagem e viabilidade. Publica o plano funcional sem uma etapa obrigatória de gerar guias de implementação. A ajuda técnica é solicitada conforme a necessidade.

As verificações determinísticas mantêm IDs, acessos, dependências válidas, destinos, compatibilidade e integridade das referências. A cobertura exige correspondência entre requisitos e missões. A qualidade funcional exige avaliação semântica e exemplos de referência; a presença de um verbo ou a ausência da palavra “arrastar” não basta.

Planejar em lotes ou detalhar a apresentação por etapa pode controlar tamanho e latência. Preservar a definição e a cobertura é obrigatório em qualquer estratégia. Remover a geração extensa de guias pode reduzir texto gerado; o efeito real em custo e tempo precisa ser medido.

### Componentes a alterar

| Área | Alteração necessária |
| --- | --- |
| Core e DTOs de jornada | Expressar definição, requisitos, plano e missão funcional; revisar o limite fixo de perguntas |
| planner.ts e contracts.ts | Substituir regras de primeiro começo e guia por definição suficiente, cobertura e resultados funcionais |
| Contexto do planejador | Conferir a viabilidade do escopo inteiro; separar catálogo técnico de texto para a criança |
| JourneyApp | Apresentar visão, caminho completo agrupado, próxima missão e mudanças de escopo |
| PensaInstructions e painéis das oficinas | Apresentar objetivo, regras e conferência, substituindo a navegação por gestos |
| Repositório e progresso | Aplicar alterações às missões afetadas, preservando identidades e conclusões ainda válidas |
| Handoff e contexto do tutor | Transmitir a missão funcional e as decisões do jogo; fornecer apoio técnico sob demanda |
| Fluxo legado e documentação | Remover o percurso anterior e consolidar o contrato vigente após a decisão de produto |
| Testes e avaliações | Substituir expectativas de gesto preciso e primeiro começo por cobertura, granularidade e gestão |

Há formatos de guia em tipos do pacote Pensa, no domínio members, nas sessões do Estúdio/Pinta e nos schemas do host. A mudança deve atravessar esses pontos de uma vez; esconder a lista em um componente deixa os contratos antigos ativos.

### O que aproveitar

Reutilizar projetos, persistência, autorização, catálogo permitido, identidade única do jogo, voz e escuta, abertura das oficinas, salvamento, checkpoints, proteção contra respostas atrasadas, cotas de IA e equipe. O mecanismo de próxima missão com dependências já oferece uma base adequada.

As regras reais do Estúdio continuam valendo, inclusive a extensão de jogo única. A liberdade de remover compatibilidade é uma oportunidade de simplificar os contratos; não exige reescrever armazenamento, autenticação ou editores.

Preservar o método ZERO como orientação da experiência: organizar a ideia, enxergar o jogo escolhido, construir por partes e observar para melhorar. Ajustar a apresentação de E para mostrar o jogo escolhido inteiro. Não criar aprovações de documentos para cada letra nem confundir as etapas do método com as etapas internas do plano de um jogo.

## 11. Mudanças de escopo e situações importantes

| Situação | Comportamento proposto |
| --- | --- |
| Ideia muito curta | Esclarecer o comportamento principal e propor decisões identificadas como sugestões |
| Ideia grande | Mostrar o conjunto de partes e combinar entregas ou redução de escopo, mantendo o destino das partes que ficaram de fora |
| Recurso ainda não disponível | Explicar a limitação, oferecer alternativa e manter a intenção registrada; a missão indisponível não aparece como ação possível agora |
| Criança quer desenhar primeiro | Avaliar dependências e importância da arte; permitir quando viável |
| Arte já existente | Reutilizar a criação autorizada, mantendo apenas o trabalho de integração necessário |
| Criança já fez uma parte | Permitir conferir o resultado e registrar a conclusão sem exigir repetir a montagem |
| Criança muda doze cartas para dezesseis | Atualizar distribuição e condições afetadas, preservando funcionalidades que continuam válidas |
| Criança concluiu uma missão e encontrou um problema | Reabrir ou registrar correção vinculada; não gerar outro plano inteiro por padrão |
| Conversão do jogo para código | Manter os objetivos funcionais e atualizar somente o contexto técnico de apoio |
| Equipe | Manter responsáveis, entregas de arte, dependências e a próxima missão possível para cada pessoa |
| Jogo sem fim ou vitória | Conferir os comportamentos escolhidos sem inventar uma condição de término |

## 12. Ordem recomendada para a reestruturação

1. Validar o contrato de produto com exemplos de missões e caminhos completos para memória, plataforma e exploração 3D. Estabelecer o que é funcionalidade, qual é a cobertura esperada e quais decisões ficam com a criança.
2. Definir os contratos de visão, requisitos, plano, missão e progresso. Manter uma representação de produto que continue válida em blocos e em código.
3. Substituir a geração e a revisão. Eliminar o guia obrigatório, a regra universal de primeira missão interativa e o teto de oito como definição do escopo.
4. Alterar juntos o Pensa e os painéis das oficinas. Preservar voz, acesso, vínculo do jogo e continuidade.
5. Implementar revisão por impacto, retomada e conclusão funcional. Remover o fluxo anterior e consolidar a documentação vigente.
6. Verificar contratos, fluxos e qualidade dos planos; avaliar compreensão com crianças antes de afirmar que a simplificação funcionou para esse público.

Esta ordem é uma proposta de execução após a decisão sobre o desenho. Não inclui migração de compatibilidade, publicação ou alteração em criações existentes.

## 13. Critérios para avaliar a nova direção

- Todo requisito escolhido aparece no caminho e cada missão tem uma função justificável.
- A criança reconhece o jogo descrito e consegue corrigir uma sugestão que não quer.
- O cartão diz o resultado e as regras com clareza, sem prescrever cliques, blocos ou linhas de código.
- Uma missão de configuração é aceita quando prepara uma parte necessária e verificável.
- O caminho mantém a ordem coerente e mostra entregas futuras já combinadas.
- Um pedido de ajuda não transforma o plano inteiro num tutorial.
- Uma mudança localizada mantém o progresso e as identidades das missões sem relação com ela.
- Concluir uma missão exige conferência pertinente, sem afirmar que o sistema verificou algo que só foi relatado.
- O mesmo objetivo continua válido no Estúdio por blocos e no Pro.
- A criança consegue retomar o projeto, identificar o que fez e escolher a próxima parte.

Na avaliação de planos, usar casos com entrada curta, regras detalhadas, desenho solicitado, criações existentes, equipe, limites de recursos e escopo maior que oito missões. Conferir também ausência de funcionalidades inventadas, excesso de tarefas técnicas e perdas de requisitos durante revisões.

Os testes atuais de estrutura continuam úteis onde preservam acesso, integridade e progresso. Expectativas como “o preciso vira o passo” em [pensa-journey-worker.test.ts](../packages/member-shell/tests/pensa-journey-worker.test.ts:1047) precisam ser substituídas por avaliações alinhadas ao novo propósito. Passar nos testes atuais prova conformidade com o contrato atual, incluindo partes que esta proposta quer mudar.

O aplicativo não foi alterado nesta análise. O próximo trabalho de implementação deve partir da definição de missão funcional e da cobertura do jogo completo, antes de ajustes de layout.
