# Reestruturação do Pensa para planejamento funcional de jogos

Data: 16/10/2026. Especificação vigente da implementação funcional.

A direção de produto foi aprovada e implementada: ajudar a criança a definir seu jogo, planejar todo o escopo escolhido em missões funcionais e acompanhar a construção. Esta especificação incorpora a orientação posterior de recomendar a extensão na preparação e de adaptar a proposta aos recursos efetivamente liberados. Evidências e limites da verificação estão no [relatório de revisões](../../.audits/pensa-implementation-reviews-2026-10-16.md).

Documento normativo desta reestruturação. Substitui os contratos de produto das propostas de 14/10, do fluxo ZERO documental e dos guias por gestos. O [diagnóstico](../../.audits/architectural-analysis-2026-10-16-pensa-purpose.md) continua como evidência histórica. Execução detalhada: [plano de implementação](../superpowers/plans/2026-10-16-pensa-reestruturacao.md).

## 1. Decisões de produto

1. A criança cria o jogo. O Pensa define, organiza e acompanha; cursos e tutor apoiam a implementação.
2. A definição e o plano representam todo o jogo escolhido, incluindo suas entregas posteriores. O primeiro resultado jogável pode ser intermediário.
3. Cada missão entrega um resultado funcional reconhecível, com regras e conferência. Quantidade de blocos não determina quantidade de missões.
4. A preparação pode recomendar e solicitar instalar uma extensão oficial. Essa orientação não autoriza gerar instruções de montagem para as demais missões.
5. Todo requisito do plano aceito precisa ser realizável com os recursos atuais da criança ou das pessoas responsáveis na equipe.
6. Uma limitação gera explicação e alternativa semelhante. Mudanças importantes de intenção exigem escolha da criança; não são substituídas silenciosamente.
7. Alterações preservam identidades, criações e progresso ainda válidos. A nova estrutura admite reabertura e reconferência.
8. Existe um único contrato e uma única experiência final. Sem legado legível, aliases de versão, adaptadores de compatibilidade ou novo fluxo sobreposto.
9. Reutilizar infraestrutura existente: autenticação, criações, editores, cotas, OpenRouter, ElevenLabs, autorização, equipe, salvamento e proteção de versões.
10. Método ZERO permanece como orientação: organizar a ideia, enxergar o jogo escolhido, realizar por partes e observar para melhorar. As letras não são estados de tabelas nem aprovações de documentos.

## 2. Problema e mapa atual

| Responsabilidade | Implementação anterior | Problema identificado |
| --- | --- | --- |
| Estado público | core/src/pensa/index.ts | Proposta centrada em firstResult; não há requisitos rastreáveis |
| Geração | member-shell/server/pensa-journey/{planner,contracts}.ts | Até oito missões; geração posterior de gestos por bloco |
| Memória | planner.ts e prompt-context.ts | Ideia e histórico são cortados; decisões não têm memória canônica independente |
| API | rotas pensa, pensa-journey e pensa-team | Jornada atual ainda lê etapas e tarefas do contrato anterior |
| Interface | PensaApp e JourneyApp | Duas experiências acessíveis e tutorial como conteúdo principal da missão |
| Oficinas | TaskGuidePanel, TaskBriefPanel e molda-task-guide | Contrato de passos repetido, checklist antigo e conferência misturados |
| Persistência | pensa.repository e pensa-journey.repository | Ciclos/artefatos e jornada sobrepostos; revisão arquiva todas as missões |
| Observação | progresso e nextPensaMission | Conclusão inválida pode bloquear o grafo sem tornar a missão novamente elegível |
| Apoio | voz, gamificação, atividade e funil | Dependências de stepId, cycleId, stage e primeiro começo |

Fontes principais: [contrato compartilhado](../../packages/core/src/pensa/index.ts), [geração](../../packages/member-shell/src/server/pensa-journey/planner.ts), [schema do banco](../../packages/members/src/infrastructure/persistence/drizzle/schema.ts), [publicação](../../packages/members/src/infrastructure/persistence/drizzle/pensa-journey.repository.ts) e [entrada da interface](../../packages/pensa/src/components/PensaApp.tsx).

Há limites divergentes: geração permite oito missões; DTO permite doze; posição HTTP vai até vinte; domínio permite oitenta tarefas por ciclo. A mudança substitui essas réguas por uma política técnica compartilhada, sem confundir teto de chamada com tamanho pedagógico do projeto.

## 3. Responsabilidades e fluxo

~~~text
Texto ou voz revisada
        |
        v
Definição estruturada + intenção original
        |
        v
Viabilidade com recursos atuais -- limitação --> explicação e escolha de adaptação
        |                                              |
        +---------------- definição escolhida <--------+
        |
        v
Plano completo: etapas, preparação, funcionalidades, arte, integração e conferência
        |
        v
Revisão de cobertura + ordem + recursos + linguagem
        |
        v
Criança confere e aceita -> publicação atômica
        |
        v
Construção na oficina -> criação salva + conferência -> próxima missão
        |
        +--> mudança de ideia -> rascunho de impacto -> aceite -> atualização localizada
~~~

| Dono | Responsabilidade |
| --- | --- |
| @sistemazero/core/pensa | Contratos, schemas de dados e regras puras de cobertura, ordem, impacto e elegibilidade |
| Members | Autorização, agregado do projeto, revisões, progresso, equipe, operações, reservas e persistência |
| Member-shell | Sessão, catálogo oficial, capacidades atuais, orquestração IA, inspeção autorizada de arquivos e mídia |
| Pensa | Interface de definição, plano e acompanhamento; nenhum editor ou armazenamento de criações |
| Hosts Kids | Navegação, sessão de missão, salvamento, vínculo de criação e integração das oficinas |
| Estúdio/Pinta/Molda | Autoria e edição das criações; instalação nativa de extensão e continuidade |
| Gateway | Roteamento, autenticação, HMAC, limites de corpo e rate limiting |

Não introduzir Effect, outro ORM, outro provedor de IA, fila paralela ou segundo motor de estado. Usar TypeScript, Zod, Elysia, Drizzle, PostgreSQL e os componentes atuais. Core já depende de Zod; Elysia 1.4 admite Standard Schema. Os schemas compartilhados podem ser usados nas bordas sem repetir regras em TypeBox e Zod. Ver [documentação oficial do Elysia 1.4](https://elysiajs.com/blog/elysia-14).

## 4. Definição e escolhas

A entrada continua livre por texto ou voz. Só persistir projeto no primeiro envio ou pedido de processamento; abrir “Nova ideia” não cria projetos vazios. Texto transcrito é revisável antes de enviar. Não reescrever uma transcrição como se fosse a fala original.

A definição registra proposta do jogo, ação do jogador, elementos importantes, controles, regras, objetivos quando aplicáveis, formato, requisitos escolhidos e necessidades de arte. Exploração e brincadeira livre não recebem vitória, derrota ou pontuação artificiais.

Cada requisito tem ID estável e origem. Uma sugestão do Zappy só entra na definição aceita depois do aceite da criança. A narrativa original sanitizada permanece distinta da definição adaptada.

Perguntar uma coisa por vez quando a resposta mudar regra, escopo, sequência, identidade ou viabilidade. Não repetir informação existente. Não há teto pedagógico de duas perguntas. Detalhes reversíveis que não impedem planejar podem ficar abertos, explicitamente identificados como escolhas para a construção.

A criança confere definição e caminho em uma mesma proposta. Não precisa aprovar uma série de documentos ZERO. Antes do aceite, todos os requisitos relevantes precisam ter um destino conhecido.

## 5. Viabilidade e adaptação obrigatórias

### 5.1 Fontes autoritativas

Consultar no servidor: acesso ao Pensa e às oficinas, posto, blocos conquistados, extensões autorizadas, formato/autoria, ferramentas granulares do Molda, recursos de cada integrante, inventário autorizado e estado salvo do jogo existente.

Entitlement, recurso liberado, aula acessível, aula concluída e domínio são informações diferentes. O planejamento verifica viabilidade técnica; a ajuda pode indicar conteúdo acessível sem presumir que a criança domina um conceito.

Não tomar o catálogo completo da plataforma como catálogo da criança. Não usar recursos do perfil privilegiado de quem está fazendo uma consulta para ampliar permissões de outra participante.

Para cada missão, pelo menos uma pessoa real deve ter o conjunto completo dos recursos necessários. Quem programa precisa ter todos os recursos da construção no Estúdio; somar blocos de perfis diferentes não comprova viabilidade.

### 5.2 Resultado da análise

| Resultado | Conduta |
| --- | --- |
| Recursos suficientes e combinação fundamentada | Propor o jogo e o plano completos |
| Parte importante indisponível | Explicar a limitação, preservar a intenção e propor alternativa realizável |
| Combinação técnica sem fundamento suficiente | Investigar nas fontes oficiais ou propor simplificação comprovável; não declarar viabilidade por semelhança de nomes |
| Nenhuma alternativa pertinente disponível | Guardar a ideia e explicar o impedimento; não fabricar um plano executável |
| Falha na leitura de acesso/catálogo/inventário necessário | Exibir falha recuperável; não interpretar como recurso bloqueado ou criação inexistente |

Exemplo de linguagem: “Esse jeito de jogar precisa de um recurso que você ainda não tem. Podemos manter a ideia de encontrar tesouros e fazer a aventura em 2D. Quer seguir por esse caminho?” A alternativa concreta só pode ser oferecida se a análise confirmar os recursos para ela.

Registrar por adaptação: intenção afetada, limitação real, alternativa, o que foi preservado, o que muda e a escolha da criança. Converter 3D em 2D, trocar multiplayer por uma experiência local ou remover uma regra central exige decisão explícita. Um detalhe cosmético sugerido continua corrigível, sem outra aprovação formal.

O plano ativo contém somente requisitos escolhidos e viáveis agora. Desejos dependentes de desbloqueio ficam nas ideias não incluídas, com explicação; não aparecem como missões futuras já executáveis. Depois de a criança escolher a adaptação, cobrir todo esse novo escopo.

Revalidar recursos ao propor, aceitar, iniciar, reivindicar e concluir missão e antes de publicar resultado de operação. Mudança de acesso durante a construção bloqueia somente as ações afetadas e oferece adaptação; não apaga trabalho.

Fingerprint técnico separa recursos do projeto/equipe, identidade do solicitante e versão do catálogo. Não incluir o perfil que está vendo a tela na identidade de um mesmo conjunto de capacidades de equipe.

## 6. Contrato canônico

Contratos serializáveis pertencem a core/src/pensa. [Schemas Zod estritos](../../packages/core/src/pensa/schemas.ts) são a fonte dos tipos e dos limites; as interfaces abaixo apresentam o núcleo do domínio. O contrato completo é exportado por model.ts com tipos inferidos, sem uma segunda declaração independente. Datas públicas são ISO; IDs e referências são validados em runtime.

~~~ts
type PensaDestination = 'studio' | 'pinta' | 'molda'
type PensaAuthoring = 'blocks' | 'code'
type PensaMissionStatus = 'planned' | 'in_progress' | 'completed'
type PensaValidity = 'current' | 'needs_review'
type PensaAssetKind =
  | 'sprite' | 'background' | 'tileset' | 'tilemap'
  | 'model' | 'texture' | 'sky'

interface PensaCheck {
  id: string
  action: string
  expected: string
}

interface PensaRequirement {
  id: string
  text: string
  origin: 'child' | 'suggestion' | 'accepted_suggestion'
  category: 'gameplay' | 'visual' | 'interface' | 'content'
}

interface PensaAssetSlot {
  id: string
  name: string
  kind: PensaAssetKind
  description: string
  source: 'create' | 'existing' | 'editor'
  existing: PensaCreationRef | null
}

interface PensaAdaptation {
  id: string
  originalIntent: string
  limitation: string
  alternative: string
  preserved: string
  acceptedByProfileId: string | null
  acceptedAt: string | null
}

interface PensaGameDefinition {
  title: string
  summary: string
  originalIntent: string
  playerExperience: string
  dimension: '2d' | '3d'
  requirements: PensaRequirement[]
  assetSlots: PensaAssetSlot[]
  openChoices: Array<{ id: string; text: string }>
  futureIdeas: Array<{ id: string; text: string; origin: 'child' | 'zappy' }>
  adaptations: PensaAdaptation[]
}

interface PensaMissionBase {
  id: string
  contentRevision: number
  stageId: string
  position: number
  title: string
  objective: string
  requirementIds: string[]
  rules: Array<{ id: string; text: string }>
  checks: PensaCheck[]
  dependencyIds: string[]
}

type PensaMission = PensaMissionBase & (
  | {
      kind: 'setup'
      destination: 'studio'
      setup: {
        type: 'extensions'
        authoring: 'blocks'
        runtimeExtensionId: string
        requiredAuxiliaryExtensionIds: string[]
        recommendation: string
      }
    }
  | {
      kind: 'feature'
      destination: 'studio'
    }
  | {
      kind: 'asset'
      destination: 'pinta' | 'molda'
      assetSlotIds: string[]
    }
  | {
      kind: 'integration'
      destination: 'studio'
      assetSlotIds: string[]
    }
  | {
      kind: 'playtest'
      destination: 'studio'
      scope: 'stage' | 'project'
    }
)

interface PensaPlan {
  stages: Array<{ id: string; title: string; position: number }>
  missions: PensaMission[]
}

interface PensaCreationRef {
  tool: PensaDestination
  profileId: string
  creationId: string
  saveRevision: string
  contentFingerprint: string | null
}

interface PensaDelivery {
  assetSlotId: string | null
  creation: PensaCreationRef
}

interface PensaMissionVerification {
  missionContentRevision: number
  source: 'child' | 'saved_configuration'
  note: string
  verifiedAt: string
  verifiedByProfileId: string
}

interface PensaMissionProgress {
  missionId: string
  progressRevision: number
  status: PensaMissionStatus
  validity: PensaValidity
  assigneeProfileId: string | null
  completedByProfileId: string | null
  deliveries: PensaDelivery[]
  verification: PensaMissionVerification | null
  resumeNote: string | null
  startedAt: string | null
  completedAt: string | null
}

interface PensaProjectRevision {
  id: string
  projectId: string
  number: number
  previousRevisionId: string | null
  definition: PensaGameDefinition
  plan: PensaPlan
  technical: import('@sistemazero/core/pensa').PensaTechnicalPlan
  acceptedByProfileId: string
  acceptedAt: string
}
~~~

Regras complementares: pelo menos um requisito e uma missão de construção em plano aceito; toda missão tem conferência; exatamente um playtest com scope=project encerra o plano ativo e depende transitivamente de todas as entregas pertinentes. Playtests por etapa são opcionais. Setup e playtest podem ter requirementIds vazios porque servem à preparação/verificação; feature, asset e integration precisam de requisitos que justifiquem a entrega. Assets existentes/editor não geram missão de criação obrigatória.

Sugestões e adaptações podem estar pendentes no rascunho. A revisão aceita não admite origin=suggestion nem recibo de adaptação vazio: Members carimba a decisão autenticada. ProjectView e MissionHandoff incluem gameCreation e restoredSaveRevision, ambos anuláveis; o host usa a revisão salva como autoridade para recuperar o arquivo, sem inferir restauração pela estrutura de mensagens.

Uma missão de arte pode produzir um conjunto de slots, como seis desenhos de cartas. Não exigir uma missão por arquivo. Entregas ligam cada slot à criação/revisão correspondente; podem reutilizar a mesma criação quando isso fizer sentido para o conjunto.

Todos os slots de uma missão de arte precisam ser produzíveis na mesma ferramenta: tipos Pinta não se misturam com tipos Molda. Referências existentes precisam corresponder a ferramenta, tipo, perfil e autorização confirmados. Aceites, datas, autoria e origin=accepted_suggestion são preenchidos pelo servidor a partir da ação autenticada; o modelo e a edição do rascunho não fabricam recibos de escolha.

Contexto técnico é uma projeção separada e de servidor: necessidades de recursos, documentos oficiais, referências de viabilidade, vínculo do jogo e elegibilidade por pessoa. Não colocar snapshot completo de blocos em cada cartão nem exigir blockIds para descrever uma funcionalidade.

## 7. Preparação e extensão recomendada

O servidor resolve ID e nome oficiais. O modelo pode justificar e propor a escolha, mas a seleção precisa sustentar todo o escopo aceito, respeitar acesso, dimensão e conflitos. Escolher a extensão mais simples que atenda o jogo inteiro.

Exemplo, quando os recursos autorizados sustentarem a escolha:

> **Prepare o Estúdio para o seu jogo**
>
> Recomendo a extensão **Jogo 2D Avançado**, que tem recursos para as cartas deste jogo.
>
> **Pronto quando:** ela estiver instalada neste projeto.

O [manual oficial do Jogo 2D Avançado](../../packages/studio/src/official-extensions/game-2d-advanced/docs.ts) documenta cartas de duas faces, seleção e comparação para memória. Isso fundamenta um cenário de referência; não significa que todo perfil tenha essa extensão e os blocos necessários liberados.

Primeira missão de programação em projeto novo por blocos: preparação. Missões de programação que precisam da base dependem dela. Arte independente pode ocorrer em paralelo. A ordem de exibição não deve criar uma dependência inexistente.

Pode haver orientação curta para abrir o gerenciador de extensões ou ação contextual de instalar a recomendada. A criança escolhe instalar; aceitar o plano ou abrir a missão não instala automaticamente. Usar [installExtension](../../packages/studio/src/state/extensionsAdapter.ts), preservando idempotência e conflito nativos.

| Situação | Regra |
| --- | --- |
| Já instalada | Mostrar “Já está preparada”; conferir a revisão salva, sem reinstalar |
| Clique repetido/reload | Uma instalação nativa; confirmação idempotente |
| Recurso indisponível | Impedir a ação e oferecer revisão/adaptação |
| Runtime conflitante existente | Não remover nem trocar automaticamente; explicar e adaptar às condições do jogo |
| Outra extensão escolhida | Revalidar todo o escopo e atualizar a proposta; não mudar só o texto do cartão |
| Extensão removida depois | Reabrir preparação e exigir reconferência dos resultados dependentes |
| Extensões auxiliares necessárias | Incluir as necessárias no setup; sugestões opcionais não viram requisitos escondidos |
| Projeto já em código | Não criar instalação de extensão Blockly |
| Conversão para Pro | Objetivos permanecem; setup já satisfeito fica histórico, sem tutorial sintético de código |

Members recebe confirmação técnica somente pelo BFF autenticado por HMAC, ligada à criação/revisão salva. O BFF consulta o bilhete autorizado, lê o documento pela storageKey do bilhete usando r2ReadCreationJson e validateStudioCreationSnapshot existentes, e extrai installedExtensions de raw ou raw.program no formato multipart. O módulo inspection concentra essa projeção, sem reconstruir ou baixar as partes de assets. Relê a revisão antes de concluir e Members faz CAS da revisão da criação, missão, progresso e capacidades. Não aceitar installed=true do navegador como autoridade.

Essa inspeção comprova configuração salva, não funcionamento do jogo. A preparação usa “Já preparei”; funcionalidades usam “Conferi e está pronto”; teste usa “Experimentei”. Critérios não são convertidos em marcações sintéticas de checklist.

Inspecionar a configuração necessária no handoff/início/conclusão e ao retomar o jogo, compartilhando cache somente por criação e revisão salva. Alteração local é salva antes de reconciliar fatos com o servidor. Remoção de extensão invalida a preparação e os resultados que dependem dela, sem apagar entregas ou afetar funcionalidades independentes.

## 8. Missões e cobertura

Uma missão descreve objetivo, regras relevantes e uma observação que demonstre seu resultado. Pode informar valores do jogo, como doze cartas ou três vidas. Não prescreve variáveis, loops, campos de blocos, encaixes, linhas de código ou sequência de cliques.

Preparar um tabuleiro, organizar um cenário ou criar elementos são resultados legítimos. Não exigir movimento ou interação na primeira missão. Agrupar operações que entregam a mesma funcionalidade e separar resultados independentes.

Todo requisito escolhido precisa estar ligado a missão. Uma parte já construída pode ser conferida nessa missão e concluída sem repetir a montagem; a IA não a declara pronta por conta própria. Em revisões do mesmo projeto, preservar missões e conferências válidas. Uma missão não pode inventar requisito em nome da criança. Identidades são atribuídas e preservadas pelo servidor; o modelo não cria UUIDs de autoridade.

Validar IDs, cobertura, topologia, ausência de ciclos, unicidade de posições, dependências reais, existência de slots e integração posterior de arte produzida. Dependências apontam para missões anteriores na ordem topológica, mas nem toda missão anterior é dependência.

## 9. Exemplo de caminho completo

Escopo ilustrativo: memória com doze cartas/seis pares, seleção de duas cartas, acertos permanecendo abertos, erros fechando após pausa, vitória e reinício. Extensão e blocos devem estar liberados para o perfil usado no cenário.

| Etapa | Missão | Conferência essencial |
| --- | --- | --- |
| Preparar | 1. Prepare as ferramentas do jogo | Extensão recomendada instalada no projeto correto |
| Preparar | 2. Organize a área das cartas | Há espaço para doze cartas sem sobreposição |
| Preparar | 3. Crie e distribua as cartas | Seis pares embaralhados, desenhos inicialmente escondidos |
| Jogar | 4. Deixe escolher duas cartas | Máximo de duas; mesma carta duas vezes não forma par |
| Jogar | 5. Mantenha os pares encontrados abertos | Acertos permanecem abertos e saem das próximas escolhas |
| Jogar | 6. Esconda novamente as cartas diferentes | Pausa bloqueia outra seleção; depois as cartas fecham |
| Finalizar | 7. Mostre quando o jogo terminar | Vitória somente depois dos seis pares |
| Finalizar | 8. Deixe jogar novamente | Seleção, cartas e mensagem anterior reiniciam corretamente |
| Conferir | 9. Experimente uma partida completa | Conferir acerto, erro, vitória, reinício e cliques durante a pausa |

O plano contém nove missões por causa dessas entregas, incluindo preparação. Não há obrigação de caber em oito. Se a criança escolher desenhar, entram missão de criação do conjunto e integração; se as figuras já existirem, reutilizar. A preparação não conta como jogo funcionando nem como primeira funcionalidade construída.

## 10. Interface e experiência nas oficinas

Meus jogos apresenta continuar, novo jogo, arquivados e entrada por código. O projeto apresenta definição do jogo, próxima missão, caminho completo agrupado, ideias não incluídas, conversa e cuidados do projeto. Preservar identidade Kids, tipografia, paletas, controles do host, teclado, foco e adaptação a celular.

Antes de aceitar, mostrar a definição, o caminho completo, a recomendação técnica e as adaptações que precisam de escolha. Depois, destacar uma missão e permitir inspecionar as demais. Uma etapa recolhida continua planejada; não significa parte indefinida.

O cartão de missão mostra título, objetivo, regras, conferência e ação principal para a oficina. Ajuda é secundária. Nas oficinas, o mesmo conteúdo aparece em painel recolhível; não há Passo N, Próximo passo, lista de blocos úteis ou código para copiar.

Abrir o jogo sem missão não inicia uma missão. Abrir a missão não conclui nada. Trocar de missão no mesmo Estúdio preserva editor, undo, buffers e arquivo. Trocar de oficina confirma o salvamento pertinente antes de navegar. No Pro, manter navegação completa necessária ao isolamento do navegador.

Um recado de espera explica dependência, colega responsável, recurso indisponível ou falha de consulta. A falta de permissão não aparece como erro de internet; uma falha de leitura não aparece como permissão negada.

## 11. Estado, identidades e revisões

Separar quatro dimensões:

| Dimensão | Representação |
| --- | --- |
| Projeto | Identidade, ativo/arquivado, pausa, equipe, vínculo do jogo e revisão aceita |
| Plano aceito | Snapshot imutável com definição e plano publicados juntos |
| Progresso | Estado e conferência de cada missão, com revisão de concorrência própria |
| Rascunho/operação | Proposta de mudança e execução técnica ainda não aceita |

Não manter stage ZERO e lifecycle editáveis em paralelo. O estado visível é derivado: sem plano aceito = definindo; missões de construção pendentes = construindo; construção válida e conferência final pendente = conferindo; conferência final válida = projeto conferido. Pausa e arquivamento são condições independentes.

O mapa ZERO orienta a experiência atual. Uma mudança em rascunho não faz o projeto aceito voltar a Z nem impede continuar missões válidas.

Uma revisão aceita agrega definição e plano porque precisam ser consistentes entre si. Seu número cresce monotonamente. contentRevision cresce por missão quando o conteúdo apresentado muda; alterações apenas editoriais preservam a conferência por equivalência registrada pelo servidor.

progressRevision cresce ao iniciar, reivindicar, salvar nota, concluir, reabrir ou reconferir. teamRevision cresce com membros/funções. Narração, polling, pausa e uma ajuda sem mudança de escopo não mudam a revisão semântica do plano.

Identidades de requisitos, etapas, missões, regras, critérios e slots persistem quando representam o mesmo conceito. Uma missão retirada permanece no histórico, sem aparecer como tarefa ativa. Não usar título, posição, nome do desenho ou hash de texto como identidade.

## 12. Alteração por impacto

O plano aceito permanece ativo enquanto um rascunho é preparado. O rascunho informa revisão base, versão própria, proposta completa e impacto. Pode ser gerado por conversa ou editado diretamente com validação; não existe CRUD livre de tarefas que contorne cobertura.

| Alteração | Efeito |
| --- | --- |
| Correção de texto sem mudar comportamento | Mantém identidade, autoria, entrega e conclusão; invalida somente áudio/texto antigo |
| Reordenação sem mudar dependências | Mantém progresso; revalida topologia |
| Requisito ou comportamento alterado | Mantém identidade quando reconhecível; exige nova conferência da missão afetada |
| Dependência ou slot consumido alterado | Reconferir dependentes afetadas e seu fechamento transitivo |
| Novo requisito | Nova missão ou ampliação coerente, cobertura e viabilidade revistas |
| Requisito retirado | Retira entrega do plano ativo; não apaga criação |
| Nova funcionalidade após concluir | Reabre o projeto na nova revisão; não repete as missões válidas |

O servidor calcula impacto a partir dos campos funcionais, cobertura e dependências. A avaliação da IA é auxiliar. Não aceitar a declaração do modelo de que “não afeta nada” como única regra.

Mostrar antes do aceite o que entra, muda, sai e precisa ser conferido. O aceite usa revisão do rascunho, revisão aceita base e versões do progresso afetado exibidas à criança. Se uma colega avançou em parte afetada, devolver conflito recuperável e recalcular o impacto, mantendo o rascunho. Progresso de parte não afetada é preservado e não força nova geração.

Publicar definição, plano, impacto no progresso, evento e débito aplicável numa transação. Não arquivar todas as missões nem criar IDs novos por padrão.

## 13. Progresso, conferência e próxima missão

Andamento: a fazer, fazendo e feita. Validade: atual ou precisa conferir. Uma conclusão histórica com validade pendente conserva entregas e autoria, mas não satisfaz dependências.

| Comando | Pré-condição e resultado |
| --- | --- |
| Iniciar/reivindicar | Missão ativa, recursos e função válidos, dependências atuais; claim atômico |
| Salvar nota | Permissão de trabalho e revisão de progresso atual; não conclui |
| Concluir | Conteúdo atual, dependências válidas, entrega salva, conferência pertinente e executor autorizado |
| Reabrir | Executor autorizado; estado passa a fazendo, histórico permanece e dependentes relevantes precisam de conferência |
| Reconferir | Dependências novamente válidas, entrega atual e critério do conteúdo vigente; restaura validade |
| Retirar por mudança de plano | Sai do plano ativo; não exclui entrega nem histórico |

O algoritmo inclui missões completed + needs_review como trabalho elegível de reconferência, respeitando dependências. Não repetir o defeito atual que retira essas missões da fila e bloqueia o grafo. Uma dependência concluída só libera a seguinte se sua validade estiver atual.

Priorizar missão já iniciada da pessoa, depois a primeira elegível na ordem recomendada. Pode oferecer outra missão independente disponível. Em equipe, considerar função, capacidade individual e reivindicação. O servidor retorna próxima missão, modo construir/reconferir e motivo de indisponibilidade; clientes não replicam essa política.

GET do projeto e respostas de mutação entregam definição, plano, progresso, disponibilidade, equipe, próxima ação e rascunho/operação pertinentes numa visão consistente. Não consultar stages/z ou buscar todos os projetos para descobrir a próxima missão.

### Evidência e salvamento

Funcionalidade exige confirmação da criança e vínculo à revisão salva; isso é relato de conferência, não teste automático. Setup usa inspeção da configuração salva. Nenhuma confirmação inventa uma evidência runtime.

O host descarrega buffers, confirma nuvem, relê a revisão e só então solicita conclusão. O servidor confere propriedade, ferramenta, identidade e versão. Revalidar perfil/projeto/missão após operações assíncronas. Falha não marca concluído de forma otimista.

Salvar o mesmo arquivo em missão posterior não invalida todas as conclusões anteriores. A conferência registra o que foi verificado naquela revisão; validade muda por impacto funcional, remoção de recurso, restauração incompatível ou entrega ausente.

O dono do jogo é quem programa. O ID canônico continua pensa-<id do projeto sem hífens>, usando armazenamento normal de criações. Se o arquivo esperado estiver ausente, oferecer recuperação ou criação explícita de outra base; não criar silenciosamente um jogo vazio sobre o vínculo existente.

## 14. Arte e equipe

Criar arte termina com os slots esperados guardados na conta da artista. Integrar arte ao jogo é outra entrega, dependente da criação. Retirar requiresStudioUse da conclusão de arte: o foguete não é prova de integração e não transfere automaticamente a criação para outra conta.

Cada slot guarda referência autorizada à criação, perfil e revisão. O jogo importado preserva sua cópia segundo o contrato atual das criações. Uma mudança no desenho original não atualiza automaticamente o jogo; a revisão pode propor nova integração.

Manter uma pessoa em programação e zero ou mais em artes, com até seis pessoas no projeto. Só a dona pode excluir/arquivar/reativar o projeto, administrar convites, remover colegas e definir funções. Toda equipe pode participar da definição, propor mudanças e aceitar atualizações de escopo, inclusive retiradas de requisitos, depois de ver seu impacto explícito. Essas retiradas não apagam criações e ficam no histórico. Ações de criação, conferência global e versões do jogo respeitam quem programa.

Uma missão precisa de pelo menos uma pessoa elegível para seus recursos completos. A união de ferramentas de duas artistas não autoriza atribuir a qualquer uma uma missão que nenhuma consegue executar sozinha. Dividir a entrega ou adaptar quando necessário.

Duas artistas reivindicando a mesma missão: uma transação vence; a outra recebe a situação atual. Um responsável que perde acesso ou sai da equipe tem seu trabalho preservado e a missão oferece nova atribuição elegível.

Depois de iniciado/salvo o jogo, manter a função de programação bloqueada como hoje. Não criar transferência de autoria entre contas nesta reestruturação. Antes desse ponto, troca revalida o plano e as capacidades. A saída de quem programa exige resolver a responsabilidade com a regra atual de posse; não copiar o jogo para outra conta como efeito colateral.

“Trazer da equipe” autoriza acesso ao material entregue no projeto; bibliotecas pessoais continuam pessoais. Revogar participação impede novas descidas e operações, sem apagar a cópia já integrada ao jogo de quem programa.

## 15. Persistência com uma autoridade

| Tabela final | Conteúdo e autoridade |
| --- | --- |
| pensa_projects | Identidade, dono/conta, metadados/metadataRevision, pausa, revisão aceita ativa, teamRevision, executionRevision, contador de revisões e vínculo do jogo |
| pensa_project_revisions | Snapshots imutáveis de definição + plano + contexto técnico da decisão, número por projeto e autor do aceite |
| pensa_plan_drafts | Candidato, revisão base/própria, decisões pendentes, impacto e tokens de concorrência; nunca autoridade do plano ativo |
| pensa_mission_progress | Identidade estável da missão, estado, validade, claim, entregas, conferência e revisão de progresso |
| pensa_project_messages | Conversa sanitizada por projeto/contexto, com origem e identidade; não é fonte única das decisões |
| pensa_execution_events | Histórico de comandos e marcos com requestId único; não exige replay para montar o projeto |
| pensa_operations | Etapas IA/arquivo, pagador original, rascunho, revisões base, orçamento, resultados intermediários e lease |
| pensa_checkpoints | Snapshot coerente do plano/progresso e manifesto de arquivos, com estados de cópia |
| pensa_project_members / pensa_project_roles | Equipe e funções, com a política existente |

Definição e especificações ativas têm uma fonte: pensa_project_revisions apontada pelo projeto. Não repetir especificação mutável em missão, journey JSON e artefato. Progresso é separado por missão e consultado contra as missões presentes no snapshot aceito. Checkpoints e revisões são cópias imutáveis deliberadas para histórico/recuperação.

Remover pensa_cycles, pensa_journeys, pensa_conversations por etapa, pensa_artifacts e pensa_tasks, além dos enums/colunas que só servem ao contrato anterior. Substituir pensa_tasks por pensa_mission_progress; dados de teste anteriores não são convertidos.

Preservar ai_usage_reservations, pensa_provider_usage, ai_usage_daily, private_narrations e pensa_deletion_jobs com sua contabilidade. Adaptar FKs/campos de operações e checkpoints para projeto/revisão, retirando cycleId.

Reservas financeiras usam projectId anulável com ON DELETE SET NULL. Antes de um reset sob as FKs antigas, desvincular as reservas dos projetos removidos e liberar somente as pendentes; contadores e recibos committed/released permanecem.

Garantir no banco unicidade de revisão por projeto, draft estrutural ativo por projeto, requestId por comando, identidade de missão/projeto, evento de marco por projeto e claims válidos. Índices cobrem projetos por participante, progresso por projeto e estado, operações por estado/lease e mensagens por projeto/data.

Views leem um snapshot consistente de revisão ativa, progresso e equipe. Mudança de ponteiro durante a leitura não pode misturar o plano anterior com o progresso aplicado ao seguinte.

## 16. Concorrência e falhas

Travar contas envolvidas em ordem estável, depois projeto, rascunho/operação e progresso pertinente. Todas as mutações usam a mesma ordem. Chamadas ao provedor, R2, inspeção de documentos e síntese ficam fora das transações.

Toda mutação recebe requestId; toda edição recebe a revisão apropriada. Repetição retorna o resultado já persistido. Conteúdo de uma solicitação repetida com o mesmo ID e corpo diferente é rejeitado.

Operação usa lease com token e validade; publicação relê lease, cancelamento, autorização, base aceita, equipe e capacidades. Desconectar a tela não duplica chamada, débito ou publicação. Progresso atual nunca é sobrescrito por snapshot antigo do worker.

Manter execução por passos persistidos e mecanismo existente de retomada no BFF. A implementação não promete completar jobs sem processo/visita ativa. Polling ou retorno retoma somente passos pendentes após expirar lease. Falha de etapa tem tentativa explícita com orçamento finito.

| Falha | Resultado obrigatório |
| --- | --- |
| Modelo/JSON/revisão de qualidade falha | Rascunho e decisões permanecem; nenhum plano parcial fica ativo |
| Salvamento/arquivo indisponível | Missão continua no estado anterior; recado específico e retry |
| Base aceita mudou | Candidato permanece, aceite exige nova análise do impacto |
| Acesso/equipe mudou | Revalidar ações; impedir publicação incompatível |
| Cancelamento/exclusão | Cercar worker tardio, liberar reserva e limpar destinos privados órfãos |
| Autosave concorre com restore | Conflito explícito; preservar versão atual e rascunho local |

## 17. API única

No navegador, prefixo /api/pensa. Em Members, /members/pensa. Gateway preserva sessão/JWT; operações internas usam /members/internal/pensa com HMAC permitido somente ao member-shell. Retirar /v2, /cycles, /artifacts, /advance, /stages e /tasks como superfícies públicas de planejamento.

| Método e caminho relativo | Contrato |
| --- | --- |
| GET /projects | Projetos acessíveis, estado derivado e resumo; filtro de arquivados |
| POST /projects | requestId + mensagem inicial; cria rascunho/projeto uma vez |
| GET /projects/:id | Visão canônica consistente; inclui o plano completo e disponibilidade |
| PATCH /projects/:id | Metadados permitidos, expectedMetadataRevision e requestId |
| DELETE /projects/:id | Exclusão da dona, cercamento e outbox; criações independentes conservadas |
| POST /projects/:id/messages | requestId, contexto planning/help, mensagem, missionId opcional; retorna operação/rascunho |
| GET /projects/:id/messages | Histórico autorizado com limit (1–100, padrão 30) e cursor UUID exclusivo; retorna items e nextCursor |
| GET /projects/:id/operations/:operationId | Estado/progresso técnico autorizado, sem entradas privadas de outro ator |
| POST /projects/:id/operations/:operationId/work | requestId e retry opcional; retomar passo permitido, com identidade/lease internos |
| POST /projects/:id/operations/:operationId/cancel | Cancelamento idempotente e liberação de reserva |
| GET /projects/:id/draft | Candidato e impacto atuais |
| PATCH /projects/:id/draft | Edição tipada, expectedDraftRevision e base; valida cobertura antes de aceitar |
| POST /projects/:id/draft/accept | requestId, draftId/revision, baseRevisionId e affectedProgressVersions; publicação atômica |
| DELETE /projects/:id/draft | Descartar candidato sem alterar o plano vigente |
| GET /missions/:id/handoff | Missão, progresso, projeto, destino, vínculo, disponibilidade e próxima ação |
| POST /missions/:id/start | requestId + baseRevisionId + expectedProgressRevision; inicia/reivindica |
| PATCH /missions/:id/note | requestId + expectedProgressRevision + nota curta |
| PATCH /missions/:id/deliveries | requestId + base/content/progress revisions + slots já salvos; aceita vínculo parcial sem concluir |
| POST /missions/:id/complete | requestId, baseRevisionId, contentRevision, expectedProgressRevision, entregas salvas e confirmação |
| POST /missions/:id/reopen | requestId + base/content/progress revisions; reabre e aplica impacto |
| POST /missions/:id/reconfirm | Mesmo envelope de complete; confere conteúdo vigente novamente |
| GET/POST /projects/:id/checkpoints | Listar/criar versão guardada com snapshot e arquivo confirmados |
| POST /projects/:id/checkpoints/:checkpointId/restore | requestId + baseRevisionId + revisão esperada do arquivo; restauração protegida |
| GET /projects/:id/revisions | Histórico das definições/planos aceitos, paginado |
| POST/DELETE /projects/:id/share | Gerar/desligar convite pela dona |
| POST /projects/join | requestId e código normalizado; 10/min permanece |
| GET/DELETE /projects/:id/members[/:profileId] | Ler membros, remover/sair conforme papel |
| GET/PUT /projects/:id/roles | Funções efetivas e troca permitida antes de programação iniciar |
| GET /projects/:id/team-art | Slots entregues e criações autorizadas da equipe |
| GET /projects/:id/team-art/:missionId/:slotId/download | Bilhete e URL assinada, com nova checagem de acesso |
| GET /credits | Saldo atual autoritativo; ausência de leitura não é saldo zero |

Ação complete não aceita status arbitrário, actor, capabilities, URLs de storage ou source=runtime vindos do navegador. O BFF constrói a confirmação técnica de setup/arquivos e envia pelo contrato HMAC interno.

Rotas internas: retry/claim/publish/fail de operações; prepare/commit/abort de checkpoint e restore; confirmação de setup; resolução de recursos de equipe, edição validada do draft e reserva de narração. Retry grava a operação como queued antes de responder, preservando orçamento e resultados anteriores; somente a tentativa explícita reinicia uma falha. /members/internal/pensa/rewards/work processa intenções duráveis, inclusive depois da exclusão de projeto; o worker de limpeza existente também faz essa retomada. Cada rota tem schema próprio e autorizações específicas. Reutilizar infraestrutura atual, removendo campos/branches legados.

Uma leitura nunca inicia missão, aceita plano ou cobra IA. Ao retomar, a observação de configuração salva pode persistir a invalidação factual de resultados dependentes sob CAS; repetir a mesma observação não repete o evento. Essa reconciliação conserva arquivos, entregas e histórico. Mutações de projeto retornam ProjectView atual; comandos de missão retornam MissionHandoff, com revisões explícitas e próxima ação calculada no servidor.

Erros tipados: PROJECT_GONE, REVISION_CONFLICT, DRAFT_CHANGED, MISSION_UNAVAILABLE, DEPENDENCY_PENDING, RESOURCES_CHANGED, RESOURCES_UNAVAILABLE, CREATION_NOT_SAVED, CREATION_CHANGED, EXTENSION_CONFLICT, NOT_YOUR_MISSION, QUOTA_EXCEEDED, OPERATION_FAILED. Mensagens públicas são curtas e específicas; erro interno não aparece cru.

Corpo público comum: até 16 KiB; edição integral do draft: até 512 KiB incluindo snapshot e envelope; publicação interna validada: até 1 MiB. Aplicar limites por rota. Respostas privadas sem cache compartilhado. Páginas de histórico/mensagens usam cursor; o plano ativo completo cabe no teto técnico.

## 18. Geração, memória e orçamento

Usar OpenRouter existente para interpretação, planejamento, revisão e ajuda. Fontes técnicas são catálogos/manuais oficiais e conhecimento recuperado autorizado. Dados de conversa e fontes são conteúdo, não instruções com poder de mudar permissões.

| Etapa | Saída persistida | Condição para avançar |
| --- | --- | --- |
| Entender | Definição candidata e decisões extraídas | Sem perda da intenção; lacunas importantes identificadas |
| Adaptar/esclarecer | Pergunta curta e alternativas realizáveis | Escolha da criança registrada quando mudar a intenção |
| Organizar | Etapas e esqueleto completo com requisitos associados | Todo escopo escolhido tem destino e base técnica viável |
| Produzir missões | Cartões funcionais por lotes | Cada lote corresponde ao esqueleto; sem tutorial |
| Revisar | Problemas identificados por requisito/missão e correções necessárias | Cobertura, ordem, granularidade, linguagem e recursos aprovados |
| Apresentar | Rascunho completo e impacto | Nenhuma parte do plano está faltando |
| Aceitar/publicar | Revisão ativa e delta de progresso | Revalidações atuais e transação de entrega/débito concluídas |

Eliminar a etapa guides. Detalhamento funcional pertence à própria missão, não a uma segunda camada que se transforma em tutorial.

A definição candidata/aceita é memória canônica. Extrair novas decisões a cada mensagem, preservar decisões anteriores e registrar mudanças explícitas. Histórico recente ajuda a conversa, mas cortá-lo nunca remove um requisito da definição.

Contexto por chamada recebe requisitos completos sobre os quais decide, índice global dos demais, esqueleto do plano, decisões relevantes e recursos autorizados. Usar aliases curtos de IDs no prompt, com mapa persistido e resolução determinística, sem mudar identidades reais. Reduzir fontes auxiliares antes de fatos do jogo.

Não truncar intenção, requisitos ou critérios silenciosamente para caber no prompt. Particionar geração e revisão por contagem, bytes reais e tokens de saída. Uma etapa não pode decidir sobre detalhe que não recebeu.

Cada cartão completo precisa passar por uma revisão semântica com suas regras/conferências e os requisitos pertinentes. Acrescentar janelas de revisão conjunta para missões que compartilham regra, elemento, slot ou dependência, incluindo ligações entre lotes. Registrar cobertura das revisões por missionId/contentRevision e ligação examinada; o índice global sozinho não conta como revisão dos detalhes. A auditoria global valida cobertura e ordem e confere os relatórios dessas janelas.

Antes da geração, calcular um work manifest com lotes de produção, janelas de revisão local e cruzada, tokens máximos e orçamento total. Durante a geração, medir os cartões; se excederem a reserva de tamanho, compactar a redação sem retirar regras ou recalcular o manifesto antes de novas chamadas. Não apresentar candidato que não caiba numa revisão completa dentro do orçamento finito.

Resultados de lotes ficam em rascunho. Falha no último lote não publica os anteriores, não perde decisões e não exige gerar tudo de novo. IDs alocados e lotes concluídos permanecem persistidos para retomada idempotente.

### Política técnica inicial única

| Limite | Valor e significado |
| --- | --- |
| Projetos ativos e participações | 20 de cada por perfil, como a política atual |
| Equipe | Dona + até cinco colegas |
| Requisitos escolhidos | Até 80 no projeto |
| Missões ativas | Até 80 incluindo preparação e conferência |
| Etapas de agrupamento | Até 12 |
| Slots de arte | Até 128, respeitando também limites das criações |
| Missões por lote IA | Até oito, teto de chamada e não tamanho do jogo |
| Contexto por chamada | Até 48 KiB em UTF-8, incluindo sistema e dados |
| Saída por chamada | Até 8.000 tokens; lote reduzido quando a previsão de saída não couber |
| Texto funcional por cartão | Até 4 KiB em UTF-8, além dos tetos individuais; uma regra extensa pode exigir divisão funcional |
| Snapshot aceito | Até 384 KiB em UTF-8; teto agregado além dos limites individuais |
| Mensagem/ideia enviada | Até 4.000 caracteres; overflow preservado para revisão |
| Campo de missão | Título 120, objetivo 600; até seis regras de 300 e seis conferências de 300+300 caracteres |
| Versões guardadas | 80 e 512 MiB por perfil, preservando a política atual |

Esses tetos protegem armazenamento e geração; não são metas pedagógicas. Exceder um limite exige explicar e combinar um escopo adequado, sem apagar partes da ideia. Todos são constantes canônicas consumidas por schemas, worker, gateway e testes.

O teto agregado não garante simultaneamente todos os campos no máximo. Validar a proposta antes de apresentá-la como pronta. Edição integral usa envelope HTTP de 512 KiB para acomodar snapshot e revisões.

### Chamadas e créditos

Separar orçamento de diálogo, planejamento em lotes e ajuda, todos persistidos e limitados. Não criar uma exceção ilimitada para o antigo passo de guias.

| Fase | Orçamento |
| --- | --- |
| Diálogo de planejamento/adaptação | Até seis chamadas por rodada; até 24 no pedido |
| Elaboração de um candidato completo | Até 48 chamadas; manifesto reserva no máximo duas tentativas por unidade de produção/revisão e contabiliza todas as janelas |
| Ajuda localizada | Até duas tentativas de resposta |
| Reparo | Usa a segunda tentativa da etapa/lote correspondente; não ganha orçamento invisível |
| Limite externo por conta | 60 chamadas/dia e 600/mês, incluindo chamadas que falharam ou foram canceladas |

Cada chamada externa exige claim autoritativo que consome orçamento da fase e contador da conta. O manifesto considera esqueleto, lotes, revisão semântica local, revisão cruzada e auditoria global. Fórmula máxima reservada: duas vezes o número de unidades, limitada a 48 chamadas; unidades determinísticas não consomem IA. O modelo não amplia seu próprio orçamento.

Exemplo: esqueleto + dois lotes de produção + duas revisões locais + uma cruzada + auditoria global somam sete unidades, com até quatorze chamadas incluindo reparos. Um plano de oitenta missões não implica automaticamente dez janelas de revisão nem promessa de caber no mesmo orçamento.

Se a partição necessária exceder o orçamento, preservar o candidato e explicar a limitação de organização; tentar uma redação/decomposição mais compacta dentro das tentativas restantes, sem eliminar decisões. Se continuar excedendo, não publicar ou cobrar plano entregue e oferecer ajuste explícito do escopo. Teto de processamento não é apresentado como ferramenta bloqueada da criança.

Diálogo e elaboração no teto podem exceder as sessenta chamadas disponíveis num dia. Checar saldo externo antes de cada chamada; interrupção por esse limite mantém o rascunho e a retomada no próximo período sem reiniciar lotes concluídos. Não prometer conclusão no mesmo dia nem reservar como disponíveis chamadas já usadas em outros pedidos.

Diálogo e loteamento compartilham uma reserva de planejamento, mas têm contadores próprios. Aceitar um plano novo/alteração gerada cobra uma unidade de planejamento na publicação; ajuda entregue cobra uma unidade. Edição manual, iniciar, salvar, concluir, reabrir e reconferir não usam IA nem créditos de planejamento.

Perguntas e escolhas de adaptação retomam a reserva existente. Uma candidata rejeitada não é entrega cobrada; chamadas externas continuam contabilizadas. Falha/cancelamento libera reserva. Reserva expirada é readquirida sob a mesma idempotência antes da entrega; se faltar saldo, preservar o candidato e explicar.

Pagador é a conta de quem iniciou o pedido, mesmo se outra pessoa retomar. Limite privilegiado, cotas compartilhadas e convenções de data atuais permanecem. Nenhuma camada de geração faz retry externo sem claim.

Não prometer custo/latência menor antes de medir. Avaliar tokens, chamadas, reparos, tempo ativo e tempo até plano aceito, além da qualidade.

## 19. Ajuda e conhecimento

O Pensa esclarece objetivo, regras, próxima parte, mudanças de escopo e organização. Se a criança pedir implementação, encaminhar a aula/ajuda acessível ou o tutor pertinente, mantendo o contexto da missão.

Ajuda técnica localizada pode responder à dúvida expressa; não gerar automaticamente uma solução inteira, sequência de blocos ou novo conjunto de missões. Falta de domínio é necessidade de aprendizagem, não motivo para fingir que um recurso autorizado está bloqueado.

Contexto do tutor inclui definição aceita, missão atual, critérios, recursos e fatos realmente observados no editor. Não enviar passos antigos nem instruções sintéticas de conversão para código. Quando a criança trava de novo, mudar a abordagem de ajuda e pedir observação concreta quando necessário.

A lista de blocos pode sustentar viabilidade e investigação interna. Sua presença não transforma o conteúdo da missão em prescrição de montagem. Links são resolvidos no servidor a partir das fontes autorizadas.

## 20. Voz, privacidade e narração

Preservar ditado com texto revisável, preferências parentais, escuta opcional e cancelamento ao trocar perfil/projeto/aba. Manter texto disponível se áudio falhar.

Substituir pensa_guide/stepId e pensa_proposal/cycleId por referências tipadas:

| Origem | Referência |
| --- | --- |
| Definição aceita | projectId + projectRevisionId + seção |
| Definição candidata | projectId + draftId + draftRevision + seção |
| Missão | missionId + contentRevision + seção objective/rule/check/setup + itemId quando aplicável |
| Mensagem | projectId + messageId + messageRevision |

Servidor resolve o texto, acesso e revisão; navegador não envia texto arbitrário para síntese. Revalidar depois da síntese e antes de disponibilizar URL. Mudança de conteúdo invalida referência/áudio antigo, sem afetar o texto disponível.

Reutilizar ElevenLabs e cache privado existentes. Preservar limites de caracteres/tentativas, TTL de URL e limpeza específica do plano. Não apagar contadores de custo quando remover dados antigos.

Manter a régua de privacidade da narrativa do Pensa, que preserva ficção e trechos úteis da ideia ao redigir dados pessoais. Não substituí-la pelo filtro de perguntas técnicas do tutor. Logs não contêm narrativa, áudio, nomes, documentos de criação ou corpo do provedor.

## 21. Versões guardadas e restauração

Versão guardada contém definição/plano aceitos, revisões de conteúdo, progresso/conferências, entregas, vínculo do jogo e manifesto dos arquivos. Mensagens e ideias não incluídas não podem desaparecer silenciosamente ao restaurar.

Preservar protocolo prepare → copiar/verificar arquivos → commit. Antes de substituir o jogo, proteger o estado atual quando existir. Falha parcial não muda a versão ativa e agenda limpeza dos destinos órfãos.

Restore prepare captura revisão esperada do arquivo/base aceita, teamRevision e progressRevision de todas as missões afetadas. Commit compara esses tokens depois das cópias; progresso novo de colega ou mudança incompatível de equipe produz conflito, preservando estado atual e limpando destinos órfãos. Ponteiro da revisão, progresso restaurado e criação mudam juntos na transação.

Publica uma nova revisão monotônica do projeto e do save; não volta números de versão para trás. Missões recuperadas mantêm identidade e recebem versões de conteúdo novas quando necessário, invalidando áudios tardios.

Não restaurar membros, papéis, acessos ou cotas antigas. Revalidar equipe e recursos atuais; uma versão que exige recursos agora indisponíveis fica preservada para consulta, sem promessa de edição viável.

Entregas e conferências antigas permanecem com sua proveniência. Quando arquivo e conteúdo correspondem exatamente ao snapshot confirmado, conservar o trabalho registrado; a conferência final do jogo precisa ser refeita. Entrega externa ausente ou recurso removido exige reconferir somente as partes afetadas e dependentes.

Artes de colegas não são recriadas nem copiadas sem autorização. A versão guarda o que de fato estava integrado ao jogo e identifica referências externas indisponíveis. Não preservar expectativa de atualização automática do desenho original.

## 22. Funil, atividade e gamificação

Atualizar métricas que hoje leem cycle1, stage=done e firstResult. O funil passa a medir: projeto iniciado, definição candidata apresentada, adaptação necessária/escolhida, plano completo apresentado/aceito, preparação concluída, primeira funcionalidade conferida, construção concluída e projeto conferido.

Definir métricas por projeto e primeiro evento pertinente, sem contar revisão ou retry como novo projeto. Mudança aceita, reabertura e reconferência são eventos de manutenção. Atividade do aluno distingue plano aceito de jogo conferido.

Preservar o orçamento total de recompensa de um percurso Pensa atual, distribuindo os três marcos de 15 XP/5 moedas e o marco de 30 XP/15 moedas:

| Marco novo | Recompensa | Regra |
| --- | --- | --- |
| Primeiro plano aceito | 15 XP e cinco moedas | Uma vez por projeto |
| Primeira funcionalidade conferida | 15 XP e cinco moedas | Setup não conta |
| Construção do escopo completa | 15 XP e cinco moedas | Todas as entregas não finais com validade atual |
| Projeto conferido | 30 XP e quinze moedas | Conferência final válida do escopo completo |

Deduplicar no evento de projeto e no ledger; o ator autorizado do primeiro marco recebe a recompensa. Nova revisão, reabrir, reconferir, retirar/reincluir requisito ou restaurar não concede novamente. Adaptar badges/labels existentes aos marcos novos; não resetar XP, moedas ou conquistas de outras áreas.

Persistir evento de marco e intenção de recompensa na mesma transação do comando. Entregar ao ledger de forma idempotente, com estado pendente/concluído no próprio evento e retry pelo mecanismo de trabalho existente. Falha no award não desfaz progresso nem perde a recompensa; não criar uma fila paralela para esse caso.

Eventos financeiros de recompensa possuem payload mínimo próprio, sem narrativa, e vínculo de projeto anulável. Na exclusão, conservar somente esses recibos/intenções com sourceId estável e apagar o histórico de conteúdo. Não deixar uma cascata eliminar recompensa pendente; a purga da conta segue a política existente da gamificação.

## 23. Arquivos, módulos e superfície pública

### 23.1 Organização final planejada

| Caminho | Conteúdo |
| --- | --- |
| packages/core/src/pensa/{model,schemas,limits,plan,progress,changes,team}.ts | Contrato único, limites e regras puras; index reexporta a superfície pública |
| packages/members/src/domain/pensa/{project,plan,progress,changes,operation-budget}.ts | Regras de aplicação e persistência sem modelos públicos duplicados |
| packages/members/src/domain/ports/pensa-project-repository.port.ts | Porta do agregado e transações de projeto/progresso |
| packages/members/src/application/pensa/{project,planning,mission,revision,checkpoint,team}.service.ts | Casos de uso coesos; sem um serviço por detalhe de clique |
| packages/members/src/infrastructure/persistence/drizzle/pensa-project.repository.ts | Orquestração de transações e consultas do agregado |
| packages/members/src/infrastructure/persistence/drizzle/pensa-{operations,checkpoints,team}.repository.ts | Persistência das responsabilidades que já exigem protocolo próprio |
| packages/members/src/interfaces/http/routes/pensa.routes.ts | API única; rotas internas em módulo próprio |
| packages/member-shell/src/server/pensa/{context,planning,contracts,inspection,protection,help}.ts | Orquestração e projeções técnicas; sem regras puras duplicadas |
| packages/member-shell/src/routes/pensa.ts | BFF único, com módulo separado para mídia privada já existente |
| packages/member-shell/src/server/pensa-client.ts | Cliente Members do contrato único |
| packages/pensa/src/components/{PensaApp,GameDefinition,ProjectPlan,MissionCard,PlanChangeReview}.tsx | Composição do projeto, com testes junto aos componentes |
| packages/pensa/src/components/usePensaProject.ts | Carregamento, polling e comandos sem política de elegibilidade local |
| packages/ui/src/components/ui/pensa-mission-content.tsx | Corpo funcional compartilhado, sem navegação/negócio |
| packages/community-kids/src/components/kids/use-pensa-mission-session.ts | Sessão de handoff, identidade, progresso e próxima ação |
| packages/community-kids/src/lib/pensa-mission-link.ts | Navegação de missão/game por destino e autoria |

Nomes são o destino do plano, não arquivos já existentes. Colocar testes junto dos módulos novos e preservar a organização por camadas do Members. Não criar pacote genérico de workflow nem repositório universal. Repositórios especializados participam da mesma unidade transacional, sem transações aninhadas independentes.

### 23.2 Substituição coordenada

| Atual | Destino |
| --- | --- |
| core/pensa/index.ts monolítico e tipos de tarefa repetidos | Contratos e regras em módulos canônicos |
| PensaApp alternando JourneyApp/LegacyPensaApp | Um PensaApp composto; remover ambos os percursos antigos |
| TaskPlan, TeamDialog legado, artefatos e avanço | Plano funcional e equipe vigente |
| PensaInstructions | PensaMissionContent |
| TaskGuidePanel, TaskBriefPanel, molda-task-guide | Painéis de missão funcional, sem branches de versão |
| use-pensa-task-handoff e use-studio-task-session | Sessão única por missão, sem stages/z nem checklist |
| pensa-journey/{planner,contracts,interface-map,missions}.ts | Pipeline de definição/plano, setup tipado e projeção de contexto |
| pensa.repository e pensa-journey.repository | Agregado nativo e protocolos separados |
| create-cycle/get-stage/advance/artefatos/CRUD livre de tarefas | Comandos de definição, revisão e missão |
| pensa-journey-dtos e blocos Pensa em dtos | Schemas canônicos usados nas rotas |
| gateway wildcards v2 e endpoints ZERO | Rotas canônicas e internas específicas |
| shims Kids antigos e /v2/[...path] | Um catch-all Pensa com dispatch explícito |
| private-narration refs de guia/proposta | Referências a conteúdo funcional com revisão |
| funil/admin/tool-usage/gamificação ZERO | Eventos e indicadores do projeto funcional |

Retirar também pensaCodeTransitionInstructions, contractVersion usado como seletor de fluxo, completedStepIds, completedCriteriaIds sintéticos, requiresStudioUse, estimates fixas de dez minutos e fallbacks “host antigo”. Uma ausência de recurso real continua representada explicitamente.

### 23.3 API pública dos pacotes

Core/pensa exporta schemas/tipos de definição, requisito, slot, adaptação, missão, plano, revisão, progresso, draft, view, comandos, narração e equipe; PENSA_LIMITS; validatePensaPlan; analyzePensaChange; nextPensaMissionFor; resolvePensaAvailability; pensaZeroPresentation. Identidade e verificações dos schemas são únicas.

Pensa exporta PensaApp, PensaHostAdapter, PensaTransport, PensaHostChromeProvider e os tipos de apresentação necessários. O adapter recebe viewerId, transport, onOpenMission e onOpenGame; voz/escuta permanecem opcionais por configuração real. Remover streamChat legado e onOpenTask. Disponibilidade vem da view do servidor, sem fallback de capabilities entre hosts.

UI exporta PensaMissionContent. Estúdio/Pinta recebem sessão de missão por contrato canônico de core/pensa e callbacks do host, sem conhecer router/Members. As exportações server-only do Estúdio fornecem catálogo e leitura/validação de configuração sem importar Blockly, React ou browser no BFF.

## 24. Verificação necessária

| Cenário | Evidência exigida |
| --- | --- |
| Memória completo com nove ou mais missões | Todos os requisitos cobertos; preparação e critérios funcionais; sem tutorial |
| Ideia com decisão antiga após conversa longa | Decisão preservada na definição e no plano |
| 3D sem recursos 3D | Limitação correta, alternativa viável e escolha explícita |
| Multiplayer/combinação não suportada | Sem promessa falsa; alternativa semelhante fundamentada |
| Falha na consulta de recursos | Retry recuperável; nenhuma adaptação baseada em “bloqueio” inventado |
| Recursos mudam durante geração/aceite | Publicação incompatível recusada; rascunho preservado |
| Equipe com capacidades diferentes | Cada missão tem executor real com conjunto completo |
| Extensão já instalada/repetida/conflitante | Instalação nativa idempotente, configuração salva e conflito compreensível |
| Setup com manifesto adulterado ou revisão concorrente | Recusa sem concluir e sem aceitar lista do navegador |
| Criação/revisão/tipo/perfil incorretos | Vínculo e conclusão recusados |
| Arte com múltiplos slots | Entregas corretas por slot, criação e integração separadas |
| Mudança localizada de regra | IDs/progresso válidos conservados; impacto transitivo apenas pertinente |
| Reabrir/reconferir | Histórico preservado e grafo novamente executável |
| Save posterior do mesmo jogo | Conclusões não invalidadas indiscriminadamente |
| Dois claims/aceites/conclusões concorrentes | Uma mutação autoritativa e resposta idempotente |
| Falha no último lote/cancelamento/lease antigo | Nenhum plano parcial, cobrança ou publicação duplicada |
| Restore com autosave/equipe atual/arquivo ausente | Proteção, conflito e contexto restaurado coerentes |
| Blocos para Pro | Mesmas funcionalidades; sem instrução de instalar Blockly |
| Voz em conteúdo editado/acesso revogado | Texto atual autorizado; referência antiga recusada |
| Navegação e painel nas três oficinas | Mesmo conteúdo; editor/rascunho preservado e próxima missão correta |
| Acessibilidade/celular | Teclado, foco, leitor de tela, contraste e painel recolhido úteis |
| Banco vazio e banco antigo com sentinelas | Migration real aplicada; ferramentas/contabilidade intactas |
| Exclusão e purga | Outbox Pensa não finaliza conta nem apaga criações independentes; recompensa pendente continua entregável |
| Gamificação/funil | Marcos corretos e idempotentes após revisão/restauração |
| Remoção do fluxo anterior | Sem imports/endpoints/branches v2 ou ZERO documental em produção |

Unidades cobrem regras puras; integração cobre fronteiras HTTP, IA fake e storage fake; PostgreSQL real descartável cobre locks, CAS, migrations e concorrência. Browser cobre o percurso efetivo e falhas de navegação/salvamento. Avaliação com crianças verifica compreensão e retomada; testes de código não substituem essa observação.

Os exemplos de qualidade devem avaliar funcionalidade, precisão, autoria e cobertura, não apenas procurar palavras proibidas. Nenhum plano é liberado só porque não contém “arrastar”. Testes antigos que exigem gesto preciso são substituídos; os de isolamento, quota, salvamento e acesso continuam adaptados ao contrato novo.

## 25. Substituição sem compatibilidade

Desenvolver e verificar a implementação final numa mudança coordenada. Ordem interna de trabalho não significa servir contratos antigos e novos ao mesmo tempo.

1. Preflight identifica dados Pensa, operações/leases, reservas, checkpoints, narrações, prefixes privados e criações vinculadas.
2. Preparar backup do subconjunto Pensa e manifesto de limpeza. Confirmar que não há uso infantil a preservar antes do reset operacional.
3. Bloquear temporariamente somente escritas/processamento Pensa na janela de substituição; cercar workers e liberar reservas pendentes.
4. Antes de apagar estruturas, gravar na outbox os prefixes privados de donos, membros, autores de versões e destinos órfãos de restauração.
5. Aplicar migrations novas: customização de limpeza/dados primeiro; DDL gerado pelo Drizzle depois. Não editar migrations históricas/snapshots já aplicados.
6. Publicar Members, gateway, BFF e hosts do contrato final; rodar smoke antes de reabrir Pensa.
7. Verificar criações e contadores intactos; processar outbox com retries.

Não converter planos ZERO/v2; descartar somente seus dados operacionais de teste conforme o manifesto. Preservar jogos, desenhos, modelos, cursos, submissões, XP e contabilidade. Cleanup não usa prefixo amplo de perfil nem DROP SCHEMA.

Um jogo independente cujo plano foi removido continua abrindo como criação independente, com o mesmo conteúdo. A ausência confirmada do vínculo Pensa encerra a sessão de missão; não é fallback de contrato legado e não transforma um 403 de acesso em abertura autorizada.

Rollback operacional restaura backup do subconjunto e implantação anterior durante a janela bloqueada. Não manter aliases, feature flags de versão ou leitor de payload antigo na implementação final.

## 26. Critério de conclusão

A reestruturação só está pronta quando a mesma definição e o mesmo plano funcional atravessam geração, aceite, persistência, Pensa, oficinas, equipe, revisão, conferência e restauração. Todos os requisitos escolhidos são viáveis com recursos atuais e têm missões rastreáveis.

O projeto precisa suportar pausa, retomada, adaptação, reabertura e mudança localizada preservando trabalho. A preparação recomenda a extensão correta; as demais missões explicam resultados e regras numa ordem coerente. As salvaguardas de dados, créditos, identidade e acesso continuam comprovadas.

O [plano de implementação](../superpowers/plans/2026-10-16-pensa-reestruturacao.md) detalha tarefas, dependências, arquivos, comandos e critérios de aceite. Nenhum aplicativo, migration ou serviço remoto foi alterado por esta especificação.
