# Oficinas ao vivo — arquitetura e contratos propostos

14/10/2026. Anexo à [proposta de produto](2026-10-14-aulas-ao-vivo-design.md), atualizado pela [revisão de coerência](2026-10-14-aulas-ao-vivo-revisao.md), incluindo a decisão de gravar professora/demonstração. Nomes de APIs, arquivos novos, tabelas e intervalos abaixo são propostas; não descrevem funcionalidades já implementadas. Nenhuma mudança de produção foi realizada.

**Infraestrutura vigente da proposta:** [Railway/Cloudflare](2026-10-14-aulas-ao-vivo-infraestrutura-e-custos.md), sala sobre Realtime SFU, gravador próprio e efeitos locais, condicionados à prova. Este documento define os contratos do produto; o anexo de infraestrutura define mecanismos de mídia e custos. Alternativas gerenciadas não fornecem implicitamente capacidades à implementação atual.

## 1. Fronteira e problema técnico

O módulo de negócio deve nascer em **Members**, onde já estão acesso, atividades, progresso e criações. A experiência infantil fica em **community-kids**, na nova seção **Oficinas**; a configuração entra em **Configuração → Oficinas ao vivo** e a condução em **Sala do Professor → Ao vivo**, no admin. BFF e componentes comuns ficam no **member-shell**. Studio continua uma biblioteca embarcável, sem conhecer matrícula, pagamento ou turma.

Seguir Bun/TypeScript, serviços e portas/adapters, Elysia e Drizzle existentes. Esta proposta não introduz Effect-TS nem um novo framework de serviços.

| Preocupação | Implementação existente | Lacuna / risco de duplicação | Dono proposto |
| --- | --- | --- | --- |
| Identidade da criança e responsável | Auth, Gateway, contexto Kids | Novo login separaria irmãos, avatar e progresso | Auth permanece canônico |
| Renderer de atividades | member-shell | Copiar player criaria dois motores pedagógicos | Adaptador de execução compartilhado |
| Critérios de curso gravado | Members | Reusar IDs/gates mistura encontros e exige vídeos | Execução própria da oficina, com avaliadores comuns |
| Rascunho e assets | Creations + R2 + cache local | Novo storage completo duplicaria recuperação e cotas | Reusar infraestrutura, ampliar contexto e revisões |
| Projeto enviado à equipe | Studio submissions | Entrega não é transmissão do estado corrente | Separar observação de entrega |
| Projeto publicado | BFF Studio + Hub showcase | Mural paralelo dividiria autoria e moderação | Nova origem no mesmo pipeline |
| Vídeo e compartilhamento | Não há sala implementada | Operar SFU/TURN próprio amplia operação; SFU de baixo nível exige integrar a sala | Cloudflare Realtime SFU/TURN como candidato prioritário |
| Presença/cursor | Não há contrato de sala | Redis do Gateway não é broker pedagógico | Estado efêmero e sinais delimitados |
| Participação e conversa | Hub tem comunidade; não há controle de encontro | Chat efêmero perde histórico e não aplica moderação | Members controla sala/chat; Hub permanece comunidade |
| Materiais da aula | Bloco, editor e download existentes | URLs e autorização ainda exigem curso/aula | Adapter de material por contexto de execução |
| Replay | Upload/player Vimeo e storage privado existentes | Embed por domínio não comprova direito temporal de cada aprendiz; captura live não existe | Members controla publicação/acesso; adapter de gravação e reprodução privada |

Não foram encontradas implementações concorrentes de sala ao vivo nos pacotes examinados. A duplicação mais perigosa seria introduzida agora ao copiar player, publicação, cadastro ou salvamento. Há adaptações visuais distintas entre Admin/Kids/adulto que devem continuar nos respectivos hosts.

## 2. Arquitetura

```text
Pais: inscrição/agenda       Criança: sala       Professora: sala
          |                       |                    |
          +-----------------------+--------------------+
                                  |
                   BFF / cookies / sessão do perfil
                                  |
                       API Gateway: JWT + escopo
                                  |
                         Members / live
           turma · encontro · roteiro · execução · autoria
                   |              |                |
              Postgres      Creations / R2     Estado efêmero
                   |                               (TTL)
                   +---- elegibilidade ----> Hub / Mural
                   +---- avisos -----------> Messaging
                   +---- direitos <-------- Catalog / fluxo de compra

Sala da criança <---- áudio/vídeo/telas ----> Fornecedor <----> Professora
                   sinais visuais efêmeros
```

As chamadas de negócio mantêm navegador → BFF → Gateway → Members. Mídia usa conexão WebRTC direta ao SFU, negociada por operações autorizadas no backend; App Secret nunca vai ao navegador. Adapters de outros fornecedores podem usar credencial de ingresso limitada. Assets usam o mecanismo autorizado de storage existente.

Para o piloto, comandos e estado autoritativos usam HTTP; atualizações curtas podem usar consulta agrupada a cada 2–3 segundos, com pausa/backoff. Cursor e setas usam DataChannels autorizados com topologia coletiva/individual explícita, conforme seção 8. Isso evita depender de um upgrade WebSocket que o Gateway ainda não implementa. Um transporte próprio SSE/WebSocket pode substituir o adapter depois, sem mover matrícula e autorização para outro serviço.

O `gatewayFetch` atual trata JSON e tem timeout: não é um canal SSE genérico. O runtime Cloudflare do Studio compila projetos Pro; não deve virar servidor de sala.

## 3. Modelo de domínio

| Entidade proposta | Responsabilidade e invariantes |
| --- | --- |
| `LiveProgram` | Oficina vendável: proposta, materiais, configurações e benefícios; pode conter um ou vários encontros |
| `LiveLessonTemplate` | Aula reutilizável da oficina, com ordem e revisões de roteiro; não contém datas de uma turma |
| `LiveCohort` | Turma com capacidade, calendário e vínculo ao programa |
| `LiveTeacherAssignment` | Conta docente, turma, papel de condução/assistência e validade |
| `LiveEnrollment` | Conta compradora + aprendiz + turma + origem comercial + status; vaga não é entitlement genérico de curso |
| `LiveSession` | Aula de uma turma: template, liberação, versão do roteiro e vínculo às ocorrências de chamada; é o dono do prazo comercial |
| `LiveMeetingOccurrence` | Uma realização da chamada, original ou reposição: agenda, estado de condução, vínculos de mídia, presença, chat e segmentos próprios; não cria prazo comercial implícito |
| `LiveSessionAccessGrant` | Direito da inscrição àquela aula, com snapshot da oferta, dias contratados, início, vencimento, versão de agenda e ajustes auditados |
| `LivePlanRevision` | Roteiro publicado e imutável; referências/revisões do conteúdo e assets preparados |
| `LiveActivityInstance` | Atividade do encontro com identidade própria, etapa e configuração de conclusão |
| `LiveActivityRun` | Execução por aprendiz/instância, respostas, evidências e workspace associado |
| `LiveWorkspaceRevision` | Revisão durável de projeto/manifesto, autoria, revisão-base e checkpoint |
| `LiveAssetReference` | Referência que preserva manifesto/partes usados por roteiro, checkpoint, evidência ou workspace; impede coleta enquanto houver uso retido |
| `LiveAssistance` | Pedido, aceite, transferência de autoria, geração, expiração, revogação e devolução |
| `LiveAttendance` | Intervalos de presença por ocorrência de chamada; não equivale a conclusão pedagógica |
| `LiveRoomPolicy` | Política versionada da ocorrência: fala, câmera, chat, entrada e permissões individuais |
| `LiveParticipationRequest` | Mão ou ajuda ativa por aprendiz/ocorrência, com sequência, autoria e encerramento; filas independentes |
| `LiveChatMessage` | Mensagem ordenada por ocorrência, texto ou material autorizado, moderação e expiração |
| `LiveSessionMaterial` | Material complementar liberado no encontro, independente da revisão imutável do roteiro |
| `LiveAdmission` | Situação por inscrição/ocorrência: espera, admitido ou removido; recuperável na reconexão, sujeita a grant e supervisão |
| `LiveSeatAllocation` | Unidade comercial paga/reservada e sua associação a um aprendiz; habilita criação de perfil quando necessária, sem confundir vaga com teto genérico |
| `LiveRecording` | Replay da aula: captura/segmentos identificados por ocorrência, status técnico, arquivo privado, versão publicada e histórico de substituição |

As tabelas podem ser ajustadas na implementação para evitar fragmentação desnecessária; as responsabilidades acima devem permanecer explícitas. Presença de segundos, cursores e miniaturas transitórias não viram histórico ilimitado no Postgres.

O identificador de execução é próprio: `sessionId + learnerId + activityInstanceId`. Não reutilizar `(learnerId, blockId)` de aula gravada. Uma oficina repetida não pode abrir concluída nem substituir o rascunho do curso.

Para continuar o mesmo jogo em quatro encontros, o roteiro pode referenciar um `workspaceId` da mesma turma/aprendiz. Cada encontro conserva sua evidência por revisão. Reiniciar atividade cria nova tentativa; copiar um projeto anterior conserva a origem e nunca apaga o original.

Proposta de armazenamento: acrescentar `live-studio` aos contextos de criação, com `itemId=workspaceId`, mantendo quota, partes por hash e storage existentes. O guard de acesso dessa criação usa inscrição/continuidade e autoria vigente, em vez de `LessonDraftAccessService`. O ator docente e o proprietário infantil são campos distintos: o serviço resolve o dono pelo workspace autorizado; nunca troca o cookie ou o header de identidade da professora pelo da criança. Todos os endpoints de reserva/commit/restauração desse contexto passam pela mesma política.

**Revisões precisam preservar seus arquivos.** Hoje o [commit de Creations](../../packages/members/src/infrastructure/persistence/drizzle/creations.repository.ts) libera manifesto/partes anteriores, e o [BFF](../../packages/member-shell/src/routes/creations.ts) os exclui. Para live, criar referência durável aos objetos antes de confirmar checkpoint, evidência ou roteiro; atualizar referências e revisão de forma transacional. A coleta revalida ausência de referências e reservas em curso antes de excluir. Uma linha de revisão no banco, sem manifesto/assets recuperáveis, não é checkpoint válido. Preservar também recursos de um roteiro publicado quando a origem no curso for editada ou removida.

Separar bytes do workspace corrente de bytes históricos retidos; deduplicar partes sem cobrar/contar duas vezes o mesmo objeto, com orçamento operacional próprio para checkpoints. Proposta inicial: conservar checkpoints de assistência/evidências pelo período de acesso e margem de suporte de sete dias, configurável antes do piloto; o projeto corrente e a publicação seguem sua política de conta, sem apagamento por simples vencimento da oficina. Prorrogação e pinagem concorrentes precisam impedir coleta prematura. Política de retenção e limites deve estar configurada antes de abrir turma; não acumular todo autosave indefinidamente.

Horários são guardados em UTC com fuso IANA da turma para apresentação e cálculo de dias de calendário. Reagendamento gera nova versão e invalida lembretes anteriores. Os estados básicos da condução pertencem a `LiveMeetingOccurrence`: `draft → scheduled → lobby → live → ended`; `cancelled` cancela uma ocorrência. Estado da chamada e janela de acesso à aula são dimensões distintas: `ended` fecha a mídia, mas não antecipa o vencimento das atividades. Somente professora autorizada inicia a condução. Fechamento idempotente retira descoberta e fecha os recursos registrados no SFU; não presumir uma API de sala pronta.

Cada aula nasce com uma ocorrência original. Reposição cria outra com vínculo à ocorrência anterior, motivo, novas datas e acesso operacional; não volta `ended` para `live` nem sobrescreve presença, chat ou segmentos. Só uma ocorrência da mesma aula pode estar ativa. Admissão, política de sala e pedidos são por ocorrência; inscrição e grant continuam por aula. As rotas por `sessionId` carregam/resolvem `occurrenceId` explícito nas operações da chamada, recusando referência ambígua/antiga. Histórico mostra as ocorrências separadas; replay pode reunir segmentos identificados e conferidos sob a mesma aula.

Modelar separadamente `supervisionStatus = present | reconnecting | unavailable`, admissão individual, janela do conteúdo e estado do replay. `ended` pode coexistir com conteúdo disponível e gravação em processamento. A chamada tem `mediaStartsAt`, fim previsto e `mediaHardEndsAt`, independentes do prazo comercial; extensão operacional é explícita/auditada e limitada. Professora pode testar dispositivos antes, sem admitir crianças antecipadamente.

Criar nova turma referencia os templates/revisões escolhidos e materializa novos encontros com novas datas/IDs. **Duplicar configuração** reaproveita capacidade, sequência e intervalos, mas não inscrições, chamadas, execução ou mensagens. Não atualizar datas de turmas passadas para repetir a venda. Arquivar uma turma a retira das opções de compra, preservando o histórico e direitos ainda válidos.

## 4. Acesso de oficina e identidade

O ingresso exige sessão válida, perfil correto, inscrição ativa, encontro disponível e autorização de dispositivo vigente. O vínculo do responsável compra direitos; o perfil ocupa a vaga. Duas crianças da mesma família não compartilham uma inscrição.

Há uma dependência de onboarding: [GetProfileAllowanceService](../../packages/members/src/application/profile-allowance/get-profile-allowance.service.ts) calcula o **maior** `maxProfiles` entre entitlements ativos e retorna zero sem benefício. Duas compras com teto 1 continuam permitindo apenas um perfil. Portanto, gerar dois entitlements iguais não resolve duas vagas para irmãos.

Introduzir alocação explícita por unidade paga: cada `LiveSeatAllocation` pode ser associada a um perfil existente ou autorizar uma criação de perfil, uma única vez. Auth permanece dono dos perfis; Members valida e consome a alocação idempotentemente. A operação usa chave de requisição comum, reserva/consumo e reconciliação para recuperar falha entre serviços sem duplicar perfil ou perder vaga. A criação não exige que a primeira aula já esteja liberada. Repetir oficinas para a mesma criança usa o perfil existente e não aumenta indefinidamente a capacidade de criar perfis. Cancelamento revoga o direito de oficina, sem apagar o perfil já criado.

Para família nova: reservar vaga por conta → confirmar unidade comercial → criar ou escolher perfil → vincular inscrição. Uma vaga paga aguardando perfil continua contando na lotação; não expira como reserva não paga. `maxProfiles` continua sendo teto dos benefícios gerais, não contador de assentos. Uma associação administrativa pode atender ao piloto, com auditoria e verificação de duas crianças, mas não elimina esse contrato para venda aberta.

Uma criança tem no máximo uma inscrição ativa na mesma turma, garantida por unicidade/transação na associação, inclusive administrativa. Outra unidade paga fica aguardando outro perfil ou correção comercial; não consumir duas vagas para o mesmo aprendiz nem fundir compras silenciosamente. Corrigir o perfil exige ausência de participação, execução, publicação e ajuda; depois disso, tratar transferência como operação explícita, preservando autoria e histórico.

O pacote avulso concede:

- Participação na turma e uso contextual das atividades/ferramentas necessárias.
- Acesso a atividades, materiais, projeto e replay publicado por aula, da liberação agendada até o vencimento calculado pela oferta.
- Acesso completo ao Mural durante o período contratado e elegibilidade de publicação do projeto da oficina.
- Onboarding sobre avatar, quarto e Como Fazer, que já possuem acesso básico por perfil autenticado.

Avatar/quarto continuam usando inventário/moedas e perfil original. Não conceder peças premium, XP, certificado de curso ou conclusão de etapas por simples presença. Um tutorial não libera a ferramenta que ensina a usar.

**Mural:** aproveitar a chave `community:mural-dos-criadores`; não conceder apenas `mural-dos-criadores-visitante`. O modelo atual de entitlement é por conta: o benefício social pode alcançar os perfis da família, enquanto a vaga e publicação da oficina continuam por aprendiz. Se for desejado limitar também esse benefício social ao perfil inscrito, será necessária uma extensão explícita da política do Hub; não fingir que ela já existe.

As datas de cada aula devem aparecer na oferta e no painel dos pais. **Regra confirmada: prazo contado por aula, a partir da própria liberação; não contado após o último encontro nem a partir da compra.** Não há acesso vitalício. O benefício social de Mural precisa de período próprio, explicitado na oferta; proposta: do primeiro início de acesso até o último vencimento contratado. Esse intervalo social não autoriza conteúdo de aulas futuras/vencidas. O fim do benefício não apaga avatar, quarto ou publicação. Assinatura vigente conserva seus direitos, mas não renova automaticamente os encontros.

O [repositório atual de entitlements](../../packages/members/src/infrastructure/persistence/drizzle/entitlement.repository.ts) considera status e vencimento, sem início futuro efetivo. Logo, não criar um entitlement social ativo imediatamente e presumir que aguarda a primeira aula. Proposta: Members resolve os intervalos dos benefícios live no relógio da requisição e o Hub agrega esses direitos aos benefícios existentes, preservando os demais produtos. Onboarding imediato é outro direito. Cache de acesso expira na próxima fronteira relevante e é invalidado em cancelamento/reagendamento; cron não é a autoridade de liberação.

### Política temporal por aula

Congelar os termos ao aceitar a compra/reserva, antes da confirmação assíncrona do pagamento: duração, benefícios, turma, encontros incluídos e versão de agenda. Na confirmação, consumir esse snapshot e criar os grants, sem consultar a oferta editável como verdade histórica. Inscrição administrativa também registra os termos aceitos. Campos propostos: `enrollmentId`, `sessionId`, `offerSnapshotId`, `accessDays`, `accessStartsAt`, `accessEndsAt`, `scheduleRevision` e `status`. Restrição única por inscrição/encontro. Alteração posterior de oferta não muda uma compra pendente nem paga.

O início canônico é a liberação de `LiveSession`, registrada no grant. Seu padrão inicial é o horário agendado da **ocorrência original**; uma reposição não o redefine. `accessEndsAt = addCalendarDays(accessStartsAt, accessDays, cohort.timeZone)`, convertido para UTC. Comparar com início inclusivo e fim exclusivo. Exemplo: 07/11/2026 14h + 30 dias = 07/12/2026 14h; aula seguinte em 14/11 vence em 14/12. Liberação à meia-noite é configuração explícita, nunca inferência do fuso do navegador. Reagendamento anterior à liberação e extensões seguem suas regras auditadas abaixo.

`canAccessLesson` exige identidade/dispositivo, inscrição válida, grant ativo e `accessStartsAt <= now < accessEndsAt`. Não exige chamada, presença nem vídeo assistido. `canJoinMedia` acrescenta abertura docente, estado `lobby/live`, janela operacional vigente, supervisão presente e admissão individual válida; a espera infantil é estado da aplicação, sem receber a mídia da turma. Preparação da professora antes da data não libera ingresso infantil. `canWatchRecording` acrescenta gravação publicada daquele encontro e turma, sem renovar o grant. `canSendChat` e comandos coletivos exigem encontro ativo, admissão e supervisão; leitura de chat durante a chamada respeita admissão, e depois segue grant/retenção. Calendário/cartões históricos usam endpoint de metadados, sem incluir conteúdo protegido ou URLs de assets.

Aplicar o mesmo guard em leitura de atividade, projeto, upload/commit, materiais, evidências e publicação da oficina. Sessão aberta antes do vencimento não é autorização permanente. A interface avisa o encerramento e tenta salvar antes dele; o servidor recusa alterações posteriores e preserva cópia local recuperável. Lease de assistência nunca ultrapassa o encerramento da condução ou acesso vigente. Não depender de job agendado para negar acesso: o job limpa/fecha recursos, mas a comparação temporal ocorre em cada operação.

O cadastro de perfil continua possível depois da compra e antes da primeira aula por benefício de onboarding separado. Isso não libera as aulas. O entitlement agregado pode representar identidade/benefícios sociais; ele não substitui `LiveSessionAccessGrant` nem autoriza todas as aulas entre a primeira e a última data.

Workspace continuado pode ser associado a várias execuções da mesma criança/turma. Acesso à criação exige ao menos um grant vigente que realmente inclua esse workspace; a evidência e os materiais de cada aula continuam escopados à própria janela. Não conceder acesso a todo projeto antigo porque uma oficina qualquer está ativa. Na continuidade via assinatura, Criar referencia **o mesmo workspace canônico**, com autorização do plano separada do grant vencido. Todos os pontos de entrada usam revisão, autoria e guarda comuns, inclusive endpoints existentes de Creations. Não criar um alias editável que contorne `writerEpoch` nem migrar arquivos durante assistência. Uma cópia voluntária, se oferecida, é outro projeto claramente identificado, criado de revisão confirmada fora da transferência de edição.

Compra tardia preserva calendário e mostra prazo restante antes de pagar; inscrição tardia é uma opção explícita da turma. Reagendamento antes de `accessStartsAt` pode atualizar grants e notificar, em transação versionada. Depois de alcançado esse instante, conservar o direito liberado **mesmo que a professora ainda não tenha iniciado a chamada**; reposição/prorrogação é ajuste auditado próprio. Não encurtar acesso já concedido silenciosamente. Cancelamento revoga somente os direitos afetados conforme política comercial, preservando outras compras/assinatura. Atraso de processamento do replay não move datas automaticamente.

Se a reposição ocorrer fora do grant atual, conceder explicitamente a extensão necessária à aula e ajustar retenção/benefício social aplicáveis antes de publicar a nova data. Registrar destinatários, motivo e novos limites. Isso não reinicia automaticamente o prazo da oferta. Cancelar uma ocorrência não revoga sozinho a inscrição ou os materiais; cancelar a entrega comercial exige comando próprio.

**Professora:** precisa de `LiveTeacherAssignment` mesmo que a conta atual seja admin/staff. No piloto, a dona pode usar sua conta atual. Antes de convidar docentes externos, criar papel/capacidade restrita, roteamento e navegação próprios; não dar `staff` genérico. A permissão de administrar turma não deve implicar acesso irrestrito a dados financeiros ou a todas as famílias.

O Gateway já distingue `kids.kind=parent|student` e introspecta sessões infantis. Troca de perfil, revogação de aparelho e bloqueio de conta precisam encerrar mídia/observação/assistência. A autorização inicial do fornecedor não substitui essa regra.

Uma participação ativa por aprendiz/ocorrência é o padrão proposto. `Continuar aqui` troca a geração da participação, retira trilhas/canais antigos, revoga assistência vinculada ao aparelho anterior e mantém admissão/revisão confirmada. Novos dispositivos começam desligados e qualquer nova ajuda precisa de aceite. Não liberar duas autorias porque as duas sessões Kids são válidas. Conexões auxiliares de demonstração/gravador têm capacidades próprias e são vinculadas à condução, sem ocupar vaga ou derrubar a docente.

## 5. Execução pedagógica e reaproveitamento

Introduzir um contrato `LearningExecutionAdapter` no member-shell: identidade da execução, leitura/salvamento de respostas, envio de tentativas, rascunhos, conclusão e acesso a materiais. O contexto gravado continua apontando às rotas atuais; o contexto ao vivo aponta às novas rotas de execução.

Extrair as dependências diretas de `lessonId/courseSlug` e URLs em `learning-activity.tsx` e wrappers de Studio/quiz. Não duplicar checagens do Core nem remontar os players gravados por completo.

O roteiro ao vivo publica somente recursos autorizados e revisões validadas. Importar de um rascunho do Farol não significa torná-lo público: a professora revisa e publica o pacote da oficina com sua própria política de acesso. Assets e respostas corretas continuam com as proteções existentes. Um vídeo opcional não vira pré-requisito inventado.

Padrão proposto: todo o roteiro publicado da aula fica navegável a partir de sua liberação. `teacherStageId` indica a etapa sugerida; `learnerStageId` preserva o trabalho local. Conclusão é dimensão separada. Cada etapa precisa de objetivo, instrução e recursos suficientes para retomada, inclusive por faltantes. Replay guarda posição assistida no contexto live, sem exigir percentual para liberar atividades ou conceder presença. Material complementar só aparece após sua publicação explícita.

Critérios aceitos: participação na experiência quando esse é seu contrato; respostas de quiz; checagens estruturais de projeto; entrega/publicação; validação docente identificada quando prevista. Resultado reportado pelo navegador não é prova inviolável de comportamento. Seguir a distinção já documentada em [observação do Estúdio](2026-09-12-estudio-observacao-de-comportamento-v5.md).

### Navegação e composição visual

Registrar `/oficinas` com rótulo **Oficinas** e volta **Voltar às oficinas** em `community-kids/src/components/kids/nav.ts`; o título da página é **Oficinas ao vivo**. Visibilidade do destino independe de assinatura; consulta e ingresso respeitam inscrição/benefícios. A página reúne próximas, inscritas, concluídas e catálogo público permitido. Compra segue no contexto dos pais.

Hoje `MOBILE_NAV_ITEMS = NAV_ITEMS`: acrescentar o item sem adaptar o componente criaria seis abas automaticamente. Manter as cinco abas móveis atuais e acrescentar acesso visível às oficinas em Início e Explorar, usando o descritor canônico de `/oficinas`; não substituir Meu espaço por Mais. Desktop ganha o item principal solicitado. Validar página ativa/retorno sem duplicar regras de pertencimento.

Extrair/reutilizar a composição visual da aula atual: conteúdo/explicação, atividade, divisória, expansão e índice. A sala insere `LiveStage` no lugar principal da mídia explicativa, sem copiar o player inteiro nem modelar a transmissão como vídeo com duração/percentual assistido. `LiveRoomShell` mantém chamada, controles e workspace acima das trocas de etapas. Conversa/Materiais/Turma são painéis mutuamente exclusivos. O contexto distingue controles gravados de capacidades live; não criar métodos de pause/seek que fingem funcionar na transmissão.

No pós-aula, `LiveReplayPlayer` substitui a área de transmissão quando publicado, com pause/seek reais e o mesmo contexto de atividade. Não inicializar SDK de chamada nem pedir microfone para assistir. Preservar as seis paletas Kids, Baloo 2/Nunito, `KidsBand`, `KidsPageHeader`, `KidsTabs` e tokens existentes; admin conserva Geist/console e Studio seu escopo local. O contrato visual e a matriz de telas/paletas estão na proposta de produto.

Adicionar a rota de sala à política explícita de foco e revisar `MainContainer`/altura disponível. Não classificar todo `/oficinas` como editor: a página de descoberta deve rolar normalmente. `FocusModeProvider` só conhece índice de aulas gravadas hoje; a oficina usa seu próprio roteiro. A fonte da régua responsiva continua [lesson-split](../../packages/member-shell/src/lib/lesson-split.ts), adaptada para a área de mídia live.

O breakpoint de split é 1.080 px de **coluna útil**, não necessariamente da janela. A sala precisa herdar explicitamente o tratamento de altura/padding da aula no `MainContainer`. O Estúdio expandido hoje usa overlay; integrar controles essenciais a [companheiros do modal](../../packages/ui/src/components/ui/use-modal-a11y.tsx) e à ordem de foco, como [vídeo flutuante](../../packages/member-shell/src/components/lesson-video-float.tsx). Não resolver apenas com z-index. Parar ajuda/compartilhamento permanecem alcançáveis. Controles infantis usam áreas de toque de pelo menos 44 px; defaults pequenos de botão não bastam.

Adicionar `/oficinas` à allowlist de [destino de estudo](../../packages/member-shell/src/lib/study-access.ts), preservando validação contra destinos externos. Integrar links familiares em `community-kids/src/app/pais`, com `aluno`/destino de retorno corretos; não usar a inexistente árvore `(app)/pais` nem misturar checkout infantil com área dos pais.

### Autoria no admin e materiais

Novas páginas: `/admin/oficinas` (configuração Kids), `/admin/oficinas/:programId` (Apresentação, Roteiro, Turmas, Participação, Acesso) e `/admin/professor/ao-vivo` (agenda e condução). Registrar em `admin/src/components/admin/nav.ts` nos grupos correspondentes. A configuração é específica do Kids, com indicação explícita; o seletor global Kids/Adultos não pode mudar silenciosamente a entidade editada. Capacidades de preparar/publicar/ofertar diferem de conduzir turma atribuída.

Reutilizar `lesson-structure-editor.tsx`, `lesson-section-authoring.tsx` e o construtor de materiais através de contratos comuns, retirando dependências exclusivas de curso. **Ao vivo** é a fonte principal de explicação do roteiro; upload de vídeo é opcional. Estados de autoria: rascunho, validado e publicado; prévia/ensaio usa execução fictícia, sem escrita nos dados da criança. Publicação fixa `LivePlanRevision`; turmas e encontros referenciam a versão escolhida.

O bloco [MaterialsBlockView](../../packages/member-shell/src/components/materials-block.tsx) e [download de anexos](../../packages/member-shell/src/lib/attachment-download.ts) ainda montam URLs e retorno por curso/aula. O adapter deve oferecer `resolveMaterial`, `downloadMaterial`, `recordMaterialAccess` e `returnToExecution`, validando revisão, liberação e prazo da oficina. Não fabricar `courseSlug/lessonId` para contornar o acesso. Preservar a marcação de acesso/baixado apenas quando fizer parte do critério explícito da atividade.

O painel reúne os materiais do roteiro e complementos liberados de `LiveSessionMaterial`. O complemento recebe asset autorizado, título, ordem, autoria e data; inclusão/ocultação é auditável e não altera a versão do roteiro em andamento. Adicionar durante a sala usa o mesmo upload/validação de tipo, tamanho e storage do admin. Links no chat usam `materialId`, nunca credencial ou URL privada duradoura. Resolver download a cada acesso pelo guard da oficina. Prévia de arquivo não confiável permanece isolada.

URLs assinadas de material usam TTL limitado ao prazo restante do grant; revalidar após preparação demorada, inclusive marca-d'água. [R2](../../packages/member-shell/src/server/r2.ts) já recebe expiração, mas [private-delivery](../../packages/member-shell/src/server/private-delivery.ts) precisa repassá-la no contrato. Recusar URL expirada e renovar só após autorização. Um arquivo já baixado não pode ser recolhido; revogação de URLs já emitidas é limitada pelo TTL. Se for exigida checagem a cada trecho, usar entrega autenticada em vez de prometer revogação instantânea de presign.

Na condução, permitir recolher a navegação administrativa e ocupar a largura útil, preservando cabeçalho, estado da sala e ação de saída. A grade mostra estado e ação principal por criança, com menu contextual, fila de mão e fila de ajuda separadas. Expandir um projeto mantém sinais/filas dos demais; só um editor completo fica ativo.

## 6. Mídia, presença e observação

Implementar um `LiveMediaProvider` com preparação/encerramento da mídia, ingresso, permissões, expulsão/revogação e reconciliação. `CloudflareSfuMediaProvider` mapeia ocorrência, participação, conexões e trilhas autorizadas. `OwnRecordingProvider` orquestra recepção seletiva, finalização e artefato no R2. Eventos autenticados vêm do worker e da reconciliação. Ver [contratos de infraestrutura](2026-10-14-aulas-ao-vivo-infraestrutura-e-custos.md). A identidade visual continua própria.

Sala privada por encontro, com autorização do Sistema Zero e conexões vinculadas no backend a identidade/dispositivo/permissões. Aluno não recebe App Secret nem credencial de administrador. Recepção de telas: professora designada recebe telas da turma; aluno recebe a demonstração autorizada da professora, não telas de colegas. Câmeras voluntárias dos colegas e áudio autorizado circulam na turma; permissão de tela é independente. Abrir apresentação de um aluno exige ação explícita e escopo temporário.

A captura deve aceitar a própria aba, com prévia antes do envio e sem espelho recursivo. No recorte proposto, recusar janela/monitor e validar a identidade da superfície no navegador aprovado; `displaySurface=browser` sozinho só identifica a categoria. Avaliar Capture Handle com origem permitida e identificador opaco da superfície, sem dados pessoais; reagir à mudança da captura e encerrar ao sair da sala/trocar perfil. Recurso indisponível oferece nova escolha ou observação sem imagem, nunca uma identificação falsa de origem. Essa verificação organiza a captura do cliente legítimo; não é prova criptográfica do conteúdo dos pixels enviados por cliente adulterado. [Capture Handle](https://developer.chrome.com/docs/web-platform/capture-handle).

A professora apresenta uma superfície de demonstração isolada, nunca a janela inteira do admin. Apresentação ao grupo de um projeto infantil exige aceite específico, distinto do aceite de edição e da observação docente. A seleção de trilhas do replay continua excluindo a criança mesmo durante essa apresentação. Validar no ensaio que troca de aba/assistência não expõe mosaico, nomes ou conversa no vídeo demonstrado.

O serviço autoriza publicação, assinatura e fechamento, mantendo vínculo entre conexão e identidade do Sistema Zero. Validar fechamento efetivo, reconexão e solicitação de recurso indevido. Autorização na API de mídia não é permissão para abrir projeto ou atuar como outra criança. [API Cloudflare](https://developers.cloudflare.com/realtime/sfu/api/).

Fechar a ocorrência nega novas operações, retira publicações da descoberta e fecha trilhas/canais de todas as conexões conhecidas, incluindo auxiliares e gravador. Reconciliação limpa recursos pendentes/tardios e aponta fechamento incompleto. Comandos e eventos do gravador são autenticados e ordenados por versão/tentativa, com tratamento explícito de duplicação. Presença não se encerra só porque o navegador disparou saída; ausência de heartbeat não comprova que a mídia parou.

Proposta de observação:

- Mídia: mosaico de oito telas com camadas/perfis recebidos de fato, foco legível e fallback testado; seguir o contrato de qualidade do anexo de infraestrutura.
- Metadados: atividade, modo, revisão, estado de save, preview, pedido de ajuda e timestamp do servidor.
- Documento: buscar revisão autorizada do projeto selecionado, evitando transmitir assets em cada heartbeat.
- Miniatura auxiliar: capturar no navegador da criança com API própria, separada da capa; informar ausência, pausa e desatualização.

Um `LivePresenceStore` armazena somente último estado e TTL; propor adapter Redis dedicado à aplicação, sem presumir que o Redis opcional do Gateway esteja disponível em produção. Queda desse cache degrada presença, não perde projeto ou transfere autoria. O lease de escrita permanece transacional no armazenamento durável.

Presença e imagens auxiliares expiram em curto prazo e são removidas no encerramento; propor TTL máximo de 60 segundos para o último estado visual, com cache privado e sem arquivo de capturas. Não colocar projetos, imagens ou dados individuais de progresso em `userData` público da chamada. O atendimento pode preservar eventos mínimos de aceite/devolução e revisões de projeto, com retenção definida separadamente.

Intervalos iniciais para ensaio, não garantias: metadados a cada 3–5 s; última imagem auxiliar a cada 5–10 s quando necessária; consulta docente agrupada a cada 2–3 s. Mídia não usa esse polling. Não subir screenshot/documento completo em cada movimento do mouse.

Não executar oito previews para montar cartões. [Limitações atuais de multi-instância e thread do preview](../../packages/studio/docs/embedding.md) justificam cartões leves e um editor de assistência por professora.

**Uma execução ainda pode congelar o host.** O [PreviewIframe](../../packages/studio/src/components/preview/PreviewIframe.tsx) documenta que seu watchdog não interrompe trabalho síncrono pesado na thread compartilhada. Nas salas live, o runtime executável precisa ficar isolado dos controles de mídia, edição e moderação, com runtime inicialmente pausado ao observar projeto. Avaliar origem/site dedicado com isolamento de processo comprovado nos navegadores suportados; um iframe/sandbox ou uma aba adicional não é prova suficiente. O [StudioProjectPlayer](../../packages/studio/src/components/preview/StudioProjectPlayer.tsx) possui `originAdapter`, mas isso não adapta automaticamente o preview do editor. Não liberar fallback automático para execução na thread da sala quando a origem isolada falhar. Provar o requisito nos dois hosts com carga pesada controlada antes de usar crianças.

Separar áudio local do runtime do microfone e do player da aula. Reaproveitar a [ponte de áudio](../../packages/studio/src/preview/inputBridge.ts) quando compatível com a execução isolada, mantendo contrato de origem/remetente. Expor **Som do projeto**, reaplicar sua escolha após reinício e preservar a voz docente. Isso não concede publicação de áudio de tela.

Os contratos específicos de negociação, camadas de vídeo, retomada de trilhas e falha do plano de controle estão no anexo de infraestrutura. A presença com TTL não comprova encerramento WebRTC. O estado da UI distingue política desejada, comando em aplicação, resultado confirmado e falha; falhas de moderação permanecem visíveis até reconciliação.

### Efeitos locais da câmera

Adicionar ao `LiveMediaClient` capacidades de efeitos e configuração `none | blur | image`, desacopladas da autorização de publicar câmera. Usar biblioteca de segmentação local, candidata MediaPipe, e compor a trilha resultante antes do envio; fixar modelo/versão e processamento fora da thread crítica do editor. [MediaPipe web](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter/web_js).

Detectar suporte do processador no navegador e medir desempenho junto do Estúdio, compartilhamento e chamada. Indisponibilidade do efeito não impede participação sem câmera. Só divulgar efeitos nos aparelhos/navegadores efetivamente ensaiados; não importar uma matriz de compatibilidade de outro fornecedor.

Fluxo: habilitar captura local mediante ação/permissão → prévia sem publicação → carregar/processar efeito → confirmar estado aplicado → permitir envio ao optar por ligar câmera. Ao trocar dispositivo/efeito, não publicar frames brutos enquanto a proteção escolhida ainda inicializa. Guardar preferência por perfil/aparelho e somente `mode/backgroundId`, sem imagens da câmera. Descartar operações assíncronas antigas quando a pessoa trocar seleção, desligar câmera ou mudar de perfil. Retomar após reconexão exige revalidar capacidade/efeito e respeitar o estado desligado previsto para a sala.

O catálogo inicial usa assets estáticos publicados pela equipe, identificados por ID e servidos por origem autorizada; não aceitar URL arbitrária no seletor. Verificar carregamento/CORS e CSP dos recursos do processador sem relaxar o isolamento dos previews do Studio. Reutilizar infraestrutura de assets; não criar upload infantil neste recorte.

O efeito atua na trilha de câmera enviada, não apenas em CSS da prévia local e não no compartilhamento de tela. Confirmar em outro participante e no arquivo gravado. Falha, perda de contexto gráfico ou indisponibilidade pausa publicação da câmera e oferece recuperação explícita; nunca reativar vídeo bruto silenciosamente. Encerrar/desligar limpa os recursos próprios do wrapper e respeita o ciclo de vida do SDK. A professora não recebe comando para remover o efeito de outro participante.

### Moderação de áudio, câmera e entrada

Members guarda a política desejada e aplica o equivalente no fornecedor. Modos propostos: `open` (Conversa livre), `turns` (Falar por vez), `listen` (Hora de ouvir). Exceções individuais e a vez concedida são versionadas. Em `turns`, liberar uma criança encerra a vez anterior por padrão; em `listen`, liberar a vez passa para `turns`. Voltar a `open` libera a possibilidade de falar sem ativar dispositivos.

`mute_now` interrompe o áudio atual, sem revogar o direito posterior de reativá-lo quando o modo permitir; a ação coletiva alcança os aprendizes conectados, preservando a professora. `lock_audio` individual persiste até liberação explícita. O modo coletivo `listen` é política do encontro e alcança também entradas futuras. Bloqueio individual prevalece sobre `open` e concessão de vez até ser retirado; liberar permissão nunca liga o dispositivo. Ingresso/reconexão herda a política vigente. Selecionar volume zero ou esconder botão não satisfaz o contrato.

No adapter Cloudflare, traduzir o bloqueio para fechamento das publicações/assinaturas necessárias e negação de recriação enquanto bloqueado; preservar trilhas permitidas. Comando enviado não significa aplicado: acompanhar confirmação, falhas individuais e reconciliação. A fila de negociação e o fechamento urgente seguem o contrato do anexo de infraestrutura.

Entrada começa com câmera/microfone desligados. Convite para falar permite ação local **Ligar meu microfone**; nenhum comando do produto abre microfone/câmera remotamente. Garantir no ensaio que devolver uma permissão não retoma uma trilha anteriormente aberta sem a ação local. Docente recebe somente capacidades necessárias; captura é comandada no backend com autorização específica, sem conceder owner/recording irrestritos ao navegador.

Impedir áudio por vias alternativas: `screenAudio` e `customAudio` infantis ficam desabilitados por padrão. Quando uma apresentação autorizar som do projeto, esse áudio fica sujeito ao mesmo encerramento/bloqueio docente. Não usar `canSend=false` para calar uma criança, pois também interromperia seu vídeo/tela de acompanhamento. Câmera, microfone e compartilhamento são capacidades distintas.

Fechar entrada preserva os participantes admitidos e manda novas solicitações para espera. Remover registra bloqueio do aprendiz naquele encontro e revoga sua mídia, não apenas o `session_id` corrente. Encerrar para todos fecha envio de chat, ingressos e permissões temporárias de edição. Reconexão da professora recupera a política confirmada e não restaura permissões antigas por defaults locais.

`LiveAdmission` persiste admissão por inscrição/ocorrência: a criança pode reconectar sem nova aprovação enquanto não removida e com acesso/supervisão válidos. Reposição tem nova admissão, mantendo o histórico da ocorrência anterior. Quem aguarda não recebe áudio, vídeo, telas nem chat da turma. A checagem é no servidor e nas permissões do fornecedor, não apenas uma tela sobreposta.

Ao detectar ausência da **última** docente designada, passar a `reconnecting`, bloquear novos ingressos e suspender comunicação coletiva/assistência enquanto preserva edição própria e salvamento. Heartbeat e eventos do fornecedor precisam de tolerância a falsos positivos; parâmetros de detecção/encerramento são medidos no ensaio. Não prometer reação instantânea na rede externa. Persistir política de supervisão, reconciliar permissões e encerrar mídia se a docente não voltar dentro do limite. Retorno recupera admissão e estado, mas exige ação local para microfone/câmera; com co-docente presente não suspender toda a aula.

### Mãos levantadas e fila de ajuda

Mão e ajuda têm tipos diferentes. Cada criança pode ter no máximo um pedido ativo de cada tipo por ocorrência. Levantar/abaixar usa comando autenticado idempotente; o servidor dá sequência e horário. Docente pode abaixar uma mão ou todas. Nenhum desses comandos apaga ajuda ou termina automaticamente a vez de fala.

A ação individual identifica o pedido atual por ID/versão, impedindo que um clique atrasado apague uma mão levantada novamente. A coletiva encerra, transacionalmente, as mãos até a sequência corrente; pedidos criados depois permanecem. Clientes adotam a versão mais nova da fila e ignoram notificações antigas. A professora pode chamar por ordem ou selecionar outra criança; atender um pedido não depende de o cursor estar sobre o cartão.

Esse estado de controle precisa sobreviver a reconnect/restart: guardar estado corrente limitado em Members, separado do heartbeat com TTL. Na entrada, retornar fila permitida/capacidades e política atuais; não reconstruir a fila somente por mensagens de mídia. Criança recebe o status próprio e sinais da turma necessários, sem detalhes privados dos pedidos de ajuda.

### Conversa da turma

`LiveChatService` autoriza, valida e persiste texto/cartões em Members antes de confirmar envio. Cada mensagem recebe ID, sequência da ocorrência, remetente derivado da sessão autenticada, timestamp e chave de idempotência. Não aceitar identidade docente declarada no body. Limites iniciais propostos: 500 caracteres e 5 mensagens em 10 segundos por aprendiz, ajustáveis após ensaio; avisos e comandos docentes usam limites próprios.

Leitura incremental por cursor recupera mensagens após reconexão e para inscritos atrasados. Um sinal efêmero pode avisar atualização, mas conteúdo, autoria e moderação vêm do endpoint autorizado. Não renderizar o payload de um DataChannel como mensagem docente confirmada.

No piloto, aproveitar a consulta agrupada de estado a cada 2–3 segundos, incluindo último cursor de chat/fila, com resposta vazia/ETag quando nada mudou. O envio recebe confirmação direta HTTP; indicar Enviando/Falhou e retry sem duplicar. Um futuro transporte de eventos pode antecipar a atualização sem alterar a persistência/autorização.

Moderação inclui pausar/reabrir escrita da turma, restringir um participante, fixar/desafixar aviso e remover mensagem. Ler histórico continua permitido durante pausa; Pedir ajuda continua funcionando. Não há DMs infantis, upload arbitrário de aluno nem envio de HTML. Escapar conteúdo; links infantis ficam como texto sem ação. Cartões de material são criados pela docente e resolvidos pelo mesmo guard dos materiais.

Proposta de retenção: texto mantido até 30 dias após o encerramento da respectiva ocorrência, com limpeza agendada e tratamento de exclusão/backups segundo política final. Leitura infantil exige também grant vigente da aula; retenção não estende acesso comercial. Remoção substitui conteúdo por marcador para clientes que já o receberam e gera evento mínimo de moderação; não manter cópia oculta ilimitada. Chat e eventos privados não entram em metadados públicos, logs de payload ou replay de sessão. Encerramento torna o histórico somente leitura; a reposição tem conversa própria identificada, sem reabrir escrita na anterior.

### Gravação e replay por encontro

**Escopo confirmado:** voz/câmera da professora e demonstração do projeto. Não capturar trilhas infantis, chat, mosaico docente, ajuda individual ou apresentação infantil no replay. A lista de entradas deriva da identidade docente autenticada e da superfície de demonstração autorizada, nunca de metadado declarado pelo navegador. Não usar seleção por pessoa que está falando.

O gravador próprio recebe somente trilhas explicitamente autorizadas de professora/demonstração; a composição não tem acesso às trilhas infantis. Reconexão ou expiração da publicação exige renovar vínculos permitidos, sem ampliar captura. Cada segmento identifica ocorrência, tentativa do job e intervalo; a prova inclui sincronização e recuperação. Pausas intencionais são distintas de lacunas por falha.

Demonstrar em superfície isolada e usar fones na condução evita reintroduzir vozes dos alunos pelo microfone da professora. Áudio da aba de demonstração fica desativado por padrão; habilitar som do jogo somente depois de provar que não mistura o áudio da chamada. Avisos, nomes e dados privados ficam fora da superfície. A captura seletiva não consegue remover automaticamente um nome que a própria professora pronuncie: a conferência editorial cobre esses casos.

Fluxo proposto:

1. Preparar sala com captura configurada, ainda sem gravar ensaio/lobby. Ao iniciar o encontro, backend inicia captura idempotente com ID e limite de duração próprios.
2. Mostrar `starting` até confirmação efetiva; somente depois, `recording`. Falha alerta a docente e permite nova tentativa; não exibir indicador falso.
3. Encerrar para todos finaliza captura. O fluxo de ajuda coordena interrupção e confirma o estado antes de tratar o atendimento como fora da gravação. Retorno explícito à explicação inicia novo segmento com demonstração conferida. Sem confirmação, mostrar falha; não chamar a orientação de conversa privada. Ausência docente interrompe o segmento e não amplia as entradas.
4. Worker escreve segmentos e manifesto progressivamente no R2, reportando confirmação e erro por geração/ocorrência. Orquestrador reconcilia jobs, objetos e lacunas com retry específico da operação. Não transferir vídeo inteiro pela requisição do navegador/BFF nem contar uma escrita apenas enfileirada como durável.
5. Validar integridade, duração, áudio e reprodução dos objetos privados. Estado `review` permite conferir, substituir ou publicar. A versão publicada reúne os segmentos aprovados, informa pausas e permite seek/retomada; definir a composição com MP4s sequenciais ou arquivo consolidado na prova do player. O replay não precisa ter a duração integral da chamada.
6. Publicar uma versão atômica associada a `sessionId`; notificar a família e atualizar o card. Versão anterior só é removida após integridade confirmada e política de retenção; falha de substituição não apaga um replay válido.

O job próprio usa início/interrupção/finalização idempotentes, exclusividade por ocorrência, geração, heartbeat e confirmação de escrita. Eventos antigos não substituem o estado do job novo. Comando aceito não prova captura ou arquivo pronto; transcrição/chat não entram como efeito colateral.

Separar o status técnico (`not_started`, `starting`, `recording`, `paused`, `processing`, `review`, `ready`, `failed`) do editorial (`unpublished`, `published`, `withdrawn`). Segmentos incompletos exigem conferência; `ready` sozinho não autoriza reprodução. Modelo inclui `recordingJobId`, ocorrência, geração, configuração de entradas, segmentos, duração, referência privada, checksum, erro sanitizado e `publishedAt`. Publicar exige versão pronta/conferida e capacidade de gestão daquela turma. Retirada invalida novas credenciais e caches.

**Entrega recomendada para o piloto:** MP4 em R2 privado, com seek/range e credencial curta renovável após reautorizar o grant. O arquivo consolidado ou sequência ordenada conserva identificação/tempo dos segmentos e permite retomada pelo contrato do player. Não usar o índice de um segmento como se fosse posição global. Validar formatos, consumo e retomada; não carregar vídeos longos inteiros na memória ou por `gatewayFetch` JSON.

O projeto já possui [ticket Vimeo](<../../packages/admin/src/app/api/media/videos/ticket/route.ts>), [configuração de privacidade](../../packages/admin/src/server/vimeo.ts), [status de processamento](<../../packages/admin/src/app/api/media/videos/[id]/status/route.ts>) e [player Vimeo](../../packages/member-shell/src/components/vimeo-player.tsx). Reutilizar composição/controles e validações onde fizer sentido. O fluxo atual é upload do navegador; não é importador automático de gravação. A restrição de embed por domínio e o hash Vimeo não equivalem à autorização temporal individual. Manter Vimeo como alternativa só se o contrato de acesso do replay for atendido; não expor URL permanente como solução de 30 dias.

`GET /recording/playback` confere família/perfil, inscrição, turma, grant, publicação e versão a cada emissão/renovação. TTL é o menor entre limite operacional e tempo restante do acesso. Cache privado e URLs fora de logs/chat. Pausar/recarregar/reconectar não reinicia prazo. Troca de perfil cancela o player; servidor nega novas solicitações vencidas/revogadas. URL assinada já emitida pode sobreviver até o TTL, e bytes já recebidos não podem ser recolhidos; se exigir revogação por requisição, adotar proxy/edge autenticado com suporte a range. Não prometer impedir captura de tela ou download tecnicamente possível.

Posição do replay usa `learnerId + sessionId + recordingVersion`, separada de vídeo de curso e presença. Substituição pode invalidar a posição se a duração mudou; avisar e iniciar no começo, sem alterar o projeto. Não reexecutar eventos antigos de setas, edição ou troca de etapa ao dar play: trata-se de vídeo, não de automação do editor.

Retenção: conservar o replay enquanto houver acesso válido à aula; proposta de margem operacional privada de sete dias após o último vencimento, sujeita à política de suporte/exclusão. Essa margem não libera acesso infantil. Prorrogação ajusta retenção antes da limpeza, com trava/revalidação que evite corrida com exclusão. Remover segmentos temporários apenas após validação do artefato e política de retenção; exclusão de arquivo não apaga registro mínimo da aula. Falha ou atraso além do objetivo operacional de 24h gera ação da equipe, sem alteração silenciosa do prazo.

## 7. Autoria assistida e recuperação

### Contrato funcional

1. Professora pede edição de um workspace da criança naquela sessão.
2. Criança aceita pedido ainda válido, vinculado ao perfil/projeto atual.
3. Editor pausa mutações e runtime, drena buffers e confirma checkpoint remoto.
4. Transação concede autoria à professora com geração monotônica e revisão-base.
5. Professora edita; somente suas alterações válidas são persistidas. Criança recebe revisões em observação, sem salvá-las novamente.
6. Ao devolver, confirmar a revisão final e sua aplicação na criança; conceder nova geração de autoria à criança.
7. Interromper/expirar invalida imediatamente a geração anterior no servidor. Retomada usa última revisão confirmada, com recuperação separada do que ficou apenas local.

O fluxo docente orquestra esses passos com a captura: pedido/aceite válido → confirmar interrupção **ou ausência de captura ativa** → pausar e confirmar checkpoint → transferir. Um estado genérico de erro não comprova ausência de captura. Não bloquear a criança enquanto o gravador prepara a pausa. Se um pré-requisito falhar, abortar a transferência pendente e preservar autoria infantil; se a captura já parou, oferecer **Voltar à explicação gravada** também nesse caminho. Devolver confirma revisão/aplicação, libera a criança e apresenta a mesma ação de retorno; retomar exige demonstração segura e confirmação do gravador. A exclusão do replay não significa áudio reservado: a turma continua ouvindo no piloto.

Um lease proposto dura 30 s e se renova a cada 10 s enquanto sessão e autorização são válidas. O tempo usa relógio do servidor. Esses valores precisam de ensaio de rede; não prometem revogação instantânea de mídia em provedor externo. A escrita recusada no servidor após revogação é obrigatória.

Uma professora mantém no máximo uma assistência ativa. Antes de aceitar outra, devolver com checkpoint confirmado ou encerrar a anterior por revogação/expiração; não deixar duas crianças em observação esperando a mesma autora. Inspecionar outro cartão não concede edição. O histórico docente consulta evidências/revisões congeladas do encontro, sem observar o rascunho corrente depois da condução.

Toda alteração persistida carrega `workspaceId`, `expectedRevision`, `writerEpoch` e `mutationId`. O servidor deriva o ator da autenticação, confere vínculo e rejeita revisão antiga, geração vencida ou ator errado. Idempotência devolve o mesmo resultado para reenvio da mesma mutação. A conferência precisa alcançar reserva/commit de uploads e rotas de recuperação, não apenas um endpoint novo.

Autosave antigo da criança, segunda aba, parse assíncrono atrasado ou upload iniciado antes do handoff não podem escrever sobre a professora. O mesmo vale para salvamentos tardios da professora depois de devolver.

Não fazer rollback automático ao checkpoint inicial quando cair a rede: isso apagaria revisões da professora já confirmadas. Restauração é uma ação explícita, com nova revisão. Undo/redo local não substitui histórico durável.

### Extensões necessárias no Studio

| API conceitual nova | Garantia |
| --- | --- |
| `editingAccess: 'author' \| 'observer'` | Bloqueia todos os caminhos de mutação, inclusive atalhos/import/IA/assets/undo e callbacks atrasados |
| `prepareHandoff()` | Pausa autoria/runtime, materializa buffers e entrega snapshot consistente |
| `applyObservedRevision(project, revision)` | Aplica revisão sem autosave, sem eco e sem iniciar automaticamente o jogo |
| `onRevisionApplied(revision)` | Confirma aplicação mesmo quando `projectId` é o mesmo |
| `resumeAuthorship(revision)` | Só reabre edição sobre revisão aplicada; o host controla o token de escrita |
| Observação de área/seleção | Emite sinais delimitados do editor para cursor/realces, sem varrer DOM arbitrário |

A confirmação de persistência remota pertence ao adapter do host. `onChange` hoje retorna `void`; `save()` não espera um fetch disparado arbitrariamente nesse callback. `replaceProject()` retorna `void`, remonta editores, marca alteração e religa preview; portanto, não serve como implementação pronta de aplicação remota. `onReady` também não confirma toda revisão do mesmo projeto. [Contratos atuais](../../packages/studio/src/studio/types.ts), [StudioCore](../../packages/studio/src/studio/StudioCore.tsx), [persistência](../../packages/studio/src/persistence/service.ts).

O member-shell já possui `confirm` e `withSavedDrafts` no [coordenador de rascunho](../../packages/member-shell/src/lib/lesson-draft-cloud.ts). Reutilizar essa experiência de confirmação; ela ainda não fornece lease, fencing nem confirmação de aplicação remota no observador.

Na Ponte, preservar a autoridade do código quando o parse de blocos estiver atrasado. Usar snapshots públicos coerentes, não estado interno bruto. A primeira versão sincroniza revisões coalescidas e referências de assets; não introduz CRDT para Blockly, código, IR e arquivos ao mesmo tempo.

O runtime da criança pausa na transferência. A professora testa sua instância isolada e pode demonstrá-la fora da captura quando se tratar do projeto infantil; ao retornar, a criança executa a revisão recebida por ação própria. Sincronizar documento não sincroniza partida, timers, aleatoriedade ou armazenamento local do jogo.

## 8. Cursor docente, setas e destaques

Separar `LiveGuidance` de autoria e de mídia. Apontar pode ser permitido durante condução sem assumir edição. O cursor da professora possui rótulo, contraste e formato próprio; não substitui o cursor nativo da criança.

Registrar alvos semânticos estáveis, por exemplo `studio.run`, `studio.save`, `live.ask-help`, `live.publish`, `studio.toolbox.events`. Cada host resolve o alvo no seu layout. Não aceitar seletor CSS, JavaScript ou HTML livre vindo do canal.

Há base local a aproveitar: [highlightStore](../../packages/studio/src/state/highlightStore.ts) guarda referências a bloco/código/tutor; [BlocklyPanel](../../packages/studio/src/components/blocks/BlocklyPanel.tsx) localiza blocos e categorias; [MonacoTabs](../../packages/studio/src/monaco/MonacoTabs.tsx) oferece cursor e realce de intervalos. Os [balões de guia](../../packages/community-kids/src/components/kids/parent-guide.tsx) fornecem referência visual acessível. Isso ainda não constitui registro público de alvos ou transmissão remota.

| Alvo | Endereçamento | Comportamento |
| --- | --- | --- |
| Botão/menu comum | `targetId` da versão de interface | Contorno/seta locais, após conferir presença e visibilidade |
| Bloco concreto | Workspace + revisão + `blockId` | Realçar só se existe nessa revisão; pode orientar centralização |
| Bloco para toda turma | Categoria/tipo/conceito mapeado na atividade | Não presumir que cada criança tem o mesmo `blockId` |
| Código | Arquivo + revisão + intervalo | Realçar trecho compatível; revisão diferente suspende indicação |
| Cursor na área de trabalho | Área semântica + coordenadas do workspace/viewport | Transformar localmente; não copiar pixels absolutos de telas distintas |

Setas têm duração e botão de limpar. Se o alvo não existe ou está fechado, a criança recebe orientação textual e a professora vê “alvo indisponível”; não é feita navegação/edição silenciosa. Avisos acessíveis, movimento reduzido e zoom fazem parte do contrato.

O resolver deve considerar controles que mudam da barra para o menu em telas estreitas e menus renderizados em portal. Cursores da assistência usam overlay sem interceptar cliques; **Ver onde a professora está mexendo** alinha arquivo/viewport no observador. **Ir para a etapa da turma** é outra ação, com preservação do trabalho e encerramento de ajuda se sair do projeto assistido. Não forçar scroll da turma a cada movimento docente.

Na primeira versão, registrar um conjunto pequeno dos alvos usados na oficina. Preview em iframe permanece isolado; destacar um objeto do jogo só é possível com ponte explícita e IDs do runtime. Não ampliar o sandbox para permitir inspeção do computador ou DOM arbitrário.

No SFU, canal coletivo transporta somente orientações coletivas. Orientação privada usa publicação/canal restrito à docente e ao destinatário autorizado, ou transporte autenticado equivalente; não transmitir ao grupo e apenas filtrar `destinationId` na UI. Retornos infantis usam canais separados quando necessários: o SFU admite só um assinante com resposta por canal publicado. Cursores são descartáveis, com sequência/expiração; comandos confirmados e aceite/lease permanecem HTTP. Políticas de entrega do DataChannel precisam coincidir nas pontas. [Contrato Cloudflare](https://developers.cloudflare.com/realtime/sfu/features/datachannels/).

Derivar o remetente do vínculo autenticado da publicação/canal com a conexão docente, em vez de esperar um `fromId` fornecido por SDK de reunião. Não confiar em `role: 'teacher'` no payload. Rejeitar época antiga, destino fora da turma, mensagem vencida e frequência excessiva. Proposta inicial: no máximo 10 atualizações de cursor por segundo, coalescidas, descartáveis e sem histórico. Revogar inclui fechar os canais; uma mensagem de cursor nunca concede escrita.

## 9. Integração com o Mural

Criar origem `live_activity` na elegibilidade de showcase, sem criar outro mural. Members autoriza o snapshot final: perfil dono, inscrição elegível, atividade publicável, revisão válida, janela de publicação e confirmação da criança. A professora não publica impersonando o perfil.

Reutilizar sanitização, manifesto autossuficiente, storage privado, `playId`, thread, capa, moderação e `/jogar/:id`. O Hub revalida a origem no Members e grava a thread no Mural/canal configurados. Não confiar somente no payload do browser ou BFF.

O endpoint atual de curso depende de aula/entrega/`showcase.enabled`; o avulso exige `estudio-completo`. A oficina precisa de terceiro ramo de autorização. A chave completa do Mural, sozinha, não substitui a elegibilidade do artefato.

Chave de idempotência por origem/aprendiz/workspace/ação de publicação. Retry não cria dois posts; falha após upload não deixa arquivo órfão indefinidamente. Uma publicação é snapshot: continuar editando não altera silenciosamente o jogo já compartilhado. Atualizar publicação segue a política existente ou uma ação explícita a implementar.

Um quiz ou experiência jogada não é automaticamente um projeto autoral publicável. O roteiro escolhido deve terminar em um `Project` válido do Estúdio. Pinta pode fornecer assets; publicar desenhos isolados exige outro contrato.

Referências: [BFF de publicação](../../packages/member-shell/src/routes/studio.ts), [elegibilidade de curso](../../packages/members/src/application/get-showcase-payload/get-showcase-payload.service.ts), [showcase no Hub](../../packages/hub/src/application/showcase/showcase.service.ts).

## 10. Contratos públicos propostos

Tipos existentes de `Project`, respostas de atividade e critérios continuam importados dos seus donos. IDs novos são validados como UUID nas bordas, seguindo o padrão atual. Exemplos abaixo delimitam responsabilidades, não são código de produção.

```ts
export type LiveOccurrenceState =
  | 'draft' | 'scheduled' | 'lobby' | 'live' | 'ended' | 'cancelled'
export interface LiveActor {
  accountId: string
  learnerId: string | null
  sessionId: string
  occurrenceId: string | null
}
export interface LiveWriteGuard {
  expectedRevision: number
  writerEpoch: number
  mutationId: string
}
export type LiveSpeakingMode = 'open' | 'turns' | 'listen'
export interface LiveLessonAccessView {
  startsAt: string
  endsAt: string
  status: 'scheduled' | 'available' | 'expired' | 'revoked'
  canOpen: boolean
  canJoinMedia: boolean
  canWatchRecording: boolean
}
export type LiveAdmissionState = 'waiting' | 'admitted' | 'removed'
export type LiveSupervisionStatus = 'present' | 'reconnecting' | 'unavailable'
export interface LiveParticipationRequestView {
  id: string
  learnerId: string
  kind: 'hand' | 'help'
  sequence: number
  requestedAt: string
}
```

```ts
export interface LiveWorkspaceCommit {
  workspaceId: string
  revision: number
  writerEpoch: number
  committedAt: string
}
export interface LiveGuidanceTarget {
  targetId: string
  workspaceId?: string
  revision?: number
  blockId?: string
}
```

O schema discrimina as variantes para tornar obrigatórios workspace/revisão em alvos de projeto. O tipo compacto acima não substitui essa validação de runtime. Limites de tamanho, duração e IDs permitidos são definidos no contrato compartilhado.

```ts
export interface LiveWorkspacePort {
  checkpoint(workspaceId: string): Promise<LiveWorkspaceCommit>
  acceptAssistance(requestId: string): Promise<LiveWorkspaceCommit>
  revokeAssistance(workspaceId: string): Promise<LiveWorkspaceCommit>
  returnAuthorship(workspaceId: string): Promise<LiveWorkspaceCommit>
}
```

Essas operações são executadas em cliente autenticado/escopado; não permitem escolher o ator pelo body. O serviço interno recebe um ator já resolvido e valida novamente a relação com o recurso. Erros esperados: acesso negado, encontro fechado, atividade indisponível, conflito de revisão, autoria revogada, capacidade esgotada, mídia indisponível e publicação inelegível. Usar envelopes HTTP/erros do projeto.

### Rotas de negócio

Todos os caminhos abaixo são propostos. O navegador usa shims `/api`; o Gateway encaminha os caminhos de serviço.

| Grupo | Rotas | Contrato |
| --- | --- | --- |
| Catálogo e inscrições | `GET /members/live/programs` e `/enrollments` | Oficinas publicadas e inscrições do perfil; cards/agenda sem conteúdo protegido |
| Turmas disponíveis | `GET /members/live/programs/:id/cohorts` | Datas, capacidade e condições de compra; não expõe nomes dos inscritos |
| Criança | `GET /members/live/sessions/:id` | Estado permitido, roteiro, identidade e capacidades; não retorna projetos de colegas |
| Ingresso | `POST /members/live/sessions/:id/join` | Valida ocorrência, participação/aparelho, grant, admissão e supervisão; prepara negociação autorizada no SFU; espera não recebe mídia |
| Replay | `GET /members/live/sessions/:id/recording/playback` | Publicação, versão, inscrição e grant vigente; credencial privada curta, sem iniciar chamada |
| Posição assistida | `PUT /members/live/sessions/:id/recording/position` | Aprendiz/versão próprios; não muda presença, conclusão ou prazo |
| Gestão da gravação | `/members/admin/live/sessions/:id/recording` | Captura/status, prévia, importação/substituição, publicação/retirada conforme capacidade |
| Execução | `GET/PUT /members/live/runs/:id` | Respostas/progresso do próprio aprendiz, revisão e idempotência |
| Workspace | `POST /members/live/workspaces/:id/commits` | Snapshot/manifesto + guarda de revisão/autoria; operação durável |
| Ajuda | `POST /members/live/assistance/:id/accept` e `/revoke` | Aceite/revogação pela criança do projeto; sem sessão adulta reutilizada |
| Pais | `GET /members/parents/live/enrollments` | Somente inscrições e calendário da própria família |
| Autoria | `/members/admin/live/programs` e `/programs/:id/plans` | Rascunho, validação, prévia e publicação; capacidade de autoria distinta da condução |
| Docente | `/members/admin/live/cohorts` e `/sessions/:id` | Gestão/condução segundo atribuição; não usa só `requireAdmin` |
| Repetir oficina | `POST /members/admin/live/programs/:id/cohorts` | Nova turma com calendário e referências aos templates; não copia participantes/progresso |
| Agenda | `PATCH /members/admin/live/sessions/:id/schedule` | Reagendamento versionado e cálculo dos grants; não recicla encontros históricos |
| Participação | `POST /members/live/sessions/:id/participation` | Levantar/abaixar mão ou pedir/cancelar ajuda próprios; idempotência e tipo explícito |
| Moderação da sala | `POST /members/admin/live/sessions/:id/controls` | Silenciar uma/todas, bloquear/liberar áudio, modo de fala, câmera, entrada e baixar uma/todas as mãos; comando discriminado e versão |
| Chat | `GET/POST /members/live/sessions/:id/messages` | Paginação incremental e envio autorizado; sem mensagem direta a outra criança |
| Moderação de chat | `/members/admin/live/sessions/:id/messages/:messageId` | Remover/fixar e refletir versão nos clientes; limites de acesso por turma |
| Materiais | `GET /members/live/sessions/:id/materials` e `/materials/:materialId/download` | Grant vigente, material liberado, prazo e revisão, com autorização em cada download |
| Material docente | `POST /members/admin/live/sessions/:id/materials` | Adicionar/liberar complemento validado, sem modificar silenciosamente o roteiro |
| Observação docente | `GET /members/admin/live/sessions/:id/observations` | Estado agrupado e acesso ao projeto selecionado autorizado |
| Solicitação docente | `POST /members/admin/live/workspaces/:id/assistance` | Cria pedido; não transfere autoria sem aceite |
| Edição docente | `POST /members/admin/live/workspaces/:id/commits` | Mesmo serviço/validação de commit, ator docente |
| Devolução docente | `POST /members/admin/live/workspaces/:id/return` | Checkpoint final e encerramento da ajuda |
| Publicação | `POST /members/live/runs/:id/showcase-eligibility` | Resolve snapshot canônico/artefato autorizado para pipeline de publicação |

Comandos de iniciar/encerrar, mudar etapa, admitir/remover e publicar roteiro ficam no grupo docente, com schemas próprios e versões. Operações de chamada, filas e chat identificam a ocorrência; grants e publicação pedagógica continuam vinculados à aula. `controls` distingue alvo criança/turma, sem aceitar identidade de ator no body. Reposição usa `POST /members/admin/live/sessions/:id/occurrences`, com motivo e ajustes explícitos de agenda/acesso. Limpeza de mãos usa sequência/versão da fila; grants usam relógio do servidor. Toda resposta privada recebe cache apropriado; segredos e credenciais não entram em logs/chat.

### Exportações e ownership

| Pacote/subpath proposto | Exportações |
| --- | --- |
| `@sistemazero/core/live` | DTOs/eventos delimitados, estados e validadores compartilhados; nenhum SDK de mídia |
| `member-shell` módulo live | `LiveRoomShell`, `LiveStage`, `LiveReplayPlayer`, `LiveParticipationControls`, `LiveChatPanel`, `LiveMaterialsPanel`, `LiveLearningAdapter`, `TeacherClassroom`, `LiveGuidanceLayer`, `LiveMediaClient` |
| `@sistemazero/studio` | Extensões opcionais de autoria/observação e alvos do editor; `Project` continua no dono atual |
| Members | Serviços/ports/repositórios internos de oficina, sem exportá-los para frontends |

## 11. Arquivos novos e alterações

Estrutura ilustrativa de novos arquivos, a ajustar às convenções finais:

```text
packages/core/src/live/{contracts,events,guards,index}.ts
packages/members/src/domain/live/{program,lesson-template,cohort,session,occurrence,enrollment,session-access,participation,chat,assistance,asset-reference}.ts
packages/members/src/domain/ports/live-{repository,media,presence,recording,playback}.port.ts
packages/members/src/application/live/
  live-access.service.ts
  live-program.service.ts
  live-schedule.service.ts
  live-session.service.ts
  live-participation.service.ts
  live-chat.service.ts
  live-materials.service.ts
  live-recording.service.ts
  live-playback.service.ts
  live-learning.service.ts
  live-workspace.service.ts
  live-assistance.service.ts
  live-showcase.service.ts
packages/members/src/infrastructure/live/{cloudflare-sfu-media,own-recording,redis-presence}.ts
packages/members/src/interfaces/http/routes/live.routes.ts
packages/member-shell/src/components/live/
  live-room-shell.tsx
  live-stage.tsx
  live-replay-player.tsx
  live-participation-controls.tsx
  live-chat-panel.tsx
  live-materials-panel.tsx
  teacher-classroom.tsx
  live-guidance-layer.tsx
packages/member-shell/src/lib/live/{learning-adapter,media-client,workspace}.ts
packages/member-shell/src/routes/live.ts
packages/studio/src/studio/{observation,guidance-targets}.ts
packages/community-kids/src/app/(app)/oficinas/...
packages/community-kids/src/app/pais/oficinas/...
packages/admin/src/app/admin/professor/ao-vivo/...
packages/admin/src/app/admin/oficinas/...
```

Criar migrações aditivas em Members; atualizações de papéis em Auth somente quando necessárias ao recorte docente. Novas páginas podem precisar respeitar os grupos de rotas efetivos do app na implementação; URLs públicas propostas são `/oficinas`, `/oficinas/:id/sala` e `/pais/oficinas`.

| Arquivo existente | Alteração / o que substitui |
| --- | --- |
| `member-shell/src/components/lesson-player-context.tsx` | Separar contrato de execução de controles específicos do vídeo |
| `member-shell/src/components/lesson-sections.tsx` e `lib/lesson-split.ts` | Compartilhar composição familiar e mídia live persistente; manter comportamento gravado |
| `member-shell/src/components/materials-block.tsx` e `lib/attachment-download.ts` | Resolver acesso, download e retorno pelo contexto gravado/live |
| `member-shell/src/components/learning-activity.tsx` | Trocar montagem direta de URLs/chaves por adapter; preservar modo gravado |
| `member-shell/src/components/studio/studio-block.tsx` | Contexto de rascunho da oficina, handoff e confirmação; manter caminho atual |
| `member-shell/src/lib/lesson-draft-cloud.ts` | Reaproveitar coordenação/flush, separando confirmação de revisão da mera emissão |
| `members/src/infrastructure/persistence/drizzle/creations.repository.ts` e `member-shell/src/routes/creations.ts` | Preservar manifestos/partes referenciados por checkpoints/evidências; coleta não pode apagar revisões live retidas |
| `members/src/application/creations/creations.service.ts` e entradas de Criar | Workspace canônico compartilhado com live, incluindo guard de autoria em todos os caminhos de gravação/restauração |
| `members/src/application/creations/lesson-draft-access.service.ts` | Preservar guard de aula; acrescentar resolver de acesso específico da oficina |
| `members/src/infrastructure/persistence/drizzle/schema.ts` | Tabelas live, grants por encontro, controles/chat/materiais e índices de idempotência/inscrição |
| `studio/src/studio/types.ts` e `StudioCore.tsx` | Contratos opcionais de observação, aplicação silenciosa e pausa de autoria |
| `studio/src/components/preview/PreviewIframe.tsx`, `StudioProjectPlayer.tsx` e `preview/inputBridge.ts` | Isolar execução da sala, impedir fallback inseguro/execução automática e preservar controle de som local |
| `studio/src/components/blocks/BlocklyPanel.tsx` | Observer, bloqueios de mutação e resolução de alvo/cursor |
| `member-shell/src/routes/studio.ts` | Reutilizar pipeline de publicação com origem live validada |
| `hub/src/application/showcase/showcase.service.ts` | Novo ramo autoritativo de elegibilidade; thread/canal continuam normais |
| `catalog/src/domain/product/fulfillment.ts` | Entrega de oficina/benefícios na etapa de venda automática |
| `community-kids/next.config.ts` e `admin/next.config.ts` | CSP e permissões de dispositivos por rota/origem necessária |
| `api-gateway/src/application/auth/kids-access-policy.ts` | Validar rotas novas nos contextos corretos; preservar separação pais/aluno |
| `community-kids/src/components/kids/nav.ts`, `app-sidebar.tsx` e `mobile-nav.tsx` | Entrada Oficinas, página ativa, volta e adaptação mobile sem seis abas automáticas |
| `community-kids/src/lib/focus-route.ts` e `components/kids/focus-mode.tsx` | Foco da sala separado da listagem e dos índices do curso gravado |
| `admin/src/components/admin/nav.ts` | Configuração → Oficinas ao vivo e Sala do Professor → Ao vivo |
| `admin/src/components/editor/lesson-structure-editor.tsx` e `lesson-section-authoring.tsx` | Adaptar autoria reutilizável para oficina, sem exigir vídeo gravado |
| `admin/src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/materials-builder.tsx` | Extrair contrato compartilhado de edição de materiais |
| `community-kids` Como Fazer | Retorno seguro à oficina e tutoriais, sem duplicar biblioteca |
| `members/src/application/profile-allowance/get-profile-allowance.service.ts` e integração Auth | Alocação por unidade comercial; criar/vincular irmãos sem somar ingenuamente `maxProfiles` |
| `members/src/application/grant-entitlement/grant-entitlement.service.ts` e resolução Hub | Consumir termos congelados; benefícios live com início/fim próprios, preservando outros produtos |
| `member-shell/src/lib/study-access.ts` e rotas `community-kids/src/app/pais` | Aceitar destino canônico da oficina e preservar contexto de perfil/retorno |
| `member-shell/src/server/private-delivery.ts` e `r2.ts` | Propagar TTL limitado ao acesso, renovação autorizada e entrega privada de replay/material |
| Upload/status de vídeo do admin e player de aula | Adaptar fonte de replay privado, prévia/status/publicação sem duplicar identidade visual ou supor importação Vimeo pronta |

Não eliminar arquivos de curso gravado. A extensão deve ser aditiva, com defaults que preservam os consumidores existentes. Não há reexports legados obrigatórios porque ainda não existe API de aulas ao vivo.

## 12. Compra, reserva e notificações

O piloto pode usar inscrição administrativa auditada e origem de pagamento registrada. Ainda assim, capacidade e associação ao perfil são conferidas transacionalmente. Nunca operar vagas apenas por planilha enquanto a sala admite qualquer perfil com link.

Para venda aberta, acrescentar fulfillment explícito de oficina/programa e seus benefícios; não sobrecarregar `courseRef` como se uma turma fosse curso nem `maxProfiles` como quantidade de assentos. Consumir o fluxo comercial já existente, com idempotência por compra/benefício. O grant pode conceder materiais + acesso ao Mural + direito de reservar/confirmar uma vaga, conforme oferta.

O [grant atual](../../packages/members/src/application/grant-entitlement/grant-entitlement.service.ts) resolve a oferta no momento da concessão, calcula certos prazos desde a concessão e usa chave por pagamento/produto. Esses defaults não servem diretamente à oficina: congelar termos antes do webhook, calcular por encontro e identificar **cada unidade comercial/reserva**. Duas vagas do mesmo produto no mesmo pagamento geram duas alocações, não uma; reenvio não duplica nenhuma. Cancelamento parcial revoga somente a unidade atingida. Versão de agenda alterada enquanto o pagamento chega exige reconciliação explícita, sem misturar snapshot antigo com datas arbitrárias.

Reservar vaga atomicamente com vencimento; pagamento confirmado consome a reserva; falha/cancelamento libera; confirmação tardia não ultrapassa lotação e entra em procedimento explícito de realocação/reembolso. Reenvio de webhook não cria outra inscrição. Revogar uma compra remove apenas os benefícios originados nela, preservando outras compras/assinatura.

O [serviço de revogação atual](../../packages/members/src/application/revoke-entitlement/revoke-entitlement.service.ts) opera por assinatura; o [webhook do funil](../../packages/funnel/src/server/webhook.ts) não implementa sozinho revogação de vaga avulsa por reembolso. Definir registro durável do estado de cada unidade comercial, comandos/eventos de cancelamento/reembolso e reconciliação. Reembolso recebido antes da confirmação de pagamento impede concessão tardia; eventos repetidos/invertidos não ressuscitam uma vaga. Revogar invalida grants, mídia/assistência e benefícios originados na unidade, preservando os demais.

No piloto administrado, a operação registra a decisão, a unidade afetada e a reconciliação financeira, com responsável explícito. Antes de venda automatizada, validar suporte a estorno parcial no fluxo de pagamento: cancelar uma das duas vagas não significa que o serviço financeiro atual já consegue estornar parte do pagamento. Não marcar reembolso como concluído ao apenas revogar acesso.

Messaging já possui fila e agendamento, mas a porta atual do Members não expõe todos os recursos. Ampliar a integração ou usar jobs idempotentes para confirmação, preparo, lembrete, reagendamento, cancelamento, resumo e replay publicado/atrasado. Enfileirar não equivale a entregar. Destinatários comerciais são responsáveis; mensagens de aula ficam no contexto infantil permitido.

## 13. Uso de alto nível

Configuração do servidor injeta um fornecedor e repositórios reais; testes usam adapters controlados. Credenciais são segredo de ambiente no backend. Não registrar token no console nem persistir a chave de fornecedor no projeto do aluno.

Fluxo do consumidor:

```text
Abrir aula → validar sessão/perfil → resolver inscrição/grant/estado
  ├─ futura/vencida/revogada: somente metadados permitidos
  └─ disponível: renderer LiveLearningAdapter + workspace autorizado
       ├─ chamada em andamento: pedir entrada → admissão/supervisão
       │    → negociação de mídia autorizada → participação/observação
       └─ chamada encerrada: criar/retomar sem conectar mídia
            → replay publicado? emitir reprodução privada e retomar posição
Salvar revisão → publicar projeto pelo pipeline comum quando desejado
Encerrar chamada → finalizar gravação → processar/conferir/publicar replay
```

Um novo provedor implementa `LiveMediaProvider`/`LiveMediaClient`; ele não redefine permissões pedagógicas, identidade da inscrição ou ownership do projeto. Um novo tipo de atividade implementa seu adapter de execução; não precisa construir uma segunda sala.

Antes: `LessonPlayer → contexto de curso → atividade/Studio → rotas de aula`.

Depois: `LessonPlayer → RecordedLearningAdapter` e `LiveRoomShell → LiveLearningAdapter`, ambos usando os mesmos renderers e avaliadores. Curso gravado conserva seu player/progresso. A oficina alterna explicação ao vivo, processamento e replay dentro do mesmo shell, sem converter a gravação em outra matrícula/curso.

## 14. Testes que sustentam a entrega

| Grupo | Casos obrigatórios |
| --- | --- |
| Política | Outra turma, professor não designado, criança de outra família, pais tentando estudar pelo contexto adulto, sessão revogada |
| Compra | Última vaga concorrente; dois irmãos; duas unidades do mesmo produto/pagamento; webhook repetido; oferta alterada antes do webhook; cancelamento parcial preserva demais direitos |
| Calendário e prazo | Aula futura negada; liberação exata; cada encontro vence separadamente; oferta editada preserva snapshot; compra tardia; relógio/fuso; link direto; gravação/salvamento após expiração |
| Reutilização | Nova turma não copia inscritos nem progresso; revisão fixa; reagendamento não recicla turma passada; workspace continuado não libera material vencido |
| Conteúdo | Farol não publicado no curso mas pacote live autorizado; revisão de roteiro fixa; outra oficina não herda respostas |
| Persistência | Retry de commit, conflito de revisão, quota, upload/commit interrompido, continuidade entre encontros |
| Arquivos históricos | Checkpoint seguido de vários commits e remoção de asset restaura íntegro; editar/remover origem não quebra roteiro; GC concorre com pinagem/prorrogação sem apagar objetos usados |
| Workspace único | Abrir por Criar e pela oficina durante ajuda respeita mesma geração/revisão; plano não reabre material vencido nem fornece rota de escrita alternativa |
| Assistência | Aceite real, recusa, revogação, timeout, autosave atrasado, segunda aba, parse atrasado, reload e devolução confirmada |
| Observador | Nenhum caminho de mutação local/remota; nenhum autosave em eco; mesma identidade do projeto com revisão nova |
| Orientação visual | Cursor rotulado; alvo em layouts/zoom diferentes; menu fechado; bloco inexistente; revisão antiga; remetente forjado |
| Mídia | Oito telas e Estúdios reais; aluno tenta receber tela de colega; token antigo após encerramento; mudança de professora |
| Conexão SFU | Entradas simultâneas, operações concorrentes, resposta perdida, recursos tardios, publicação expirada, fallback de camadas e limpeza real; não confundir HTTP 200 com resultado de todos os itens |
| Falha dos controles | BFF/Members indisponíveis com WebRTC ativo; suspensão local, supervisor independente, fechamento parcial, retorno sem política antiga e falha do próprio supervisor |
| Execução e áudio local | Carga pesada controlada no jogo mantém controles/microfone/encerramento responsivos; inspeção não executa projeto; Som do projeto preserva voz docente e reaplica após reinício |
| Efeitos de câmera | Prévia local sem envio; none/blur/image; câmera/efeito trocados rapidamente; reconexão e troca de perfil; imagem indisponível/processador falha; sem frames brutos de fallback; carga com Estúdio/telas; efeito visível remotamente e no replay docente |
| Controle docente | Silenciar um/todos preserva professora; bloqueio impede reativar/reconectar; som de tela não contorna mute; liberar não liga dispositivos |
| Mãos e ajuda | Abaixar uma/todas; comando atrasado não apaga pedido novo; fila recuperada; mãos não apagam ajuda nem encerram fala |
| Conversa e materiais | Histórico/retry sem duplicação; remover/pausar no servidor; conteúdo escapado; anexo autorizado; material de outra turma negado; complemento não altera roteiro |
| Interface e admin | Menu desktop/mobile, mesmas atividades/layout gravado, chamada persiste entre etapas, prévia isolada, roteiro sem vídeo, câmera opcional e teclado |
| Supervisão e admissão | Espera não recebe mídia/chat; reconnect conserva admissão; última docente cai; co-docente permanece; limite operacional encerra sala |
| Troca de aparelho | Continuar aqui invalida participação antiga, preserva projeto/admissão e resolve ajuda; demonstração auxiliar não derruba docente; dispositivos novos começam desligados |
| Reposição | Nova ocorrência preserva presença/chat/captura anteriores; entrada fora do prazo exige extensão explícita; não reinicia 30 dias nem reutiliza comandos da ocorrência encerrada |
| Operação comercial | Perfil duplicado na turma recusado; duas vagas pendentes de perfis distintos; refund anterior ao grant, ordem invertida e cancelamento parcial preservam direitos alheios |
| Continuidade | Criança faltante abre atividades e replay sem chamada; etapa indicada não sobrescreve etapa local; conteúdo já liberado não é recolhido por atraso/reagendamento |
| Identidade visual | Seis paletas; 360/768/1366×768/1440×900; zoom 200%; foco e controles na expansão; admin com oito cartões; comparação com componentes atuais |
| Captura | Somente professora/demonstração com alunos falando/compartilhando; som da aba não mistura turma; reconexão troca IDs sem ampliar seleção; falha não indica Gravando |
| Replay | Segmentar/retomar, callback repetido/invertido, transferir/validar, publicação e substituição; seek/range; posição própria; fora da turma/vencido/revogado negados; TTL e retenção respeitam prorrogação |
| Integração | Oficina sem assinatura acessa avatar/quarto/Como Fazer/Mural; publica Project válido; retry não duplica post; link segue moderação |
| Regressão | Cursos gravados, gates de vídeo, rascunhos, publicação de curso/avulsa, desafio mensal e troca de perfil continuam corretos |

Usar relógio injetável para leases, idempotência e expiração; testes de banco real para locks/concorrência, não apenas mocks. Testar headers, iframe e permissões em navegador real. Não há resultados desses testes nesta proposta: são critérios para a futura implementação.

Metas iniciais de ensaio: cursores/destaques percebidos em menos de um segundo em rede saudável, revisão aceita visível em poucos segundos e nenhum caso de perda de revisão confirmada. Medir p95 e definir orçamento de CPU/rede a partir dos equipamentos reais; não anunciar números como garantidos antes disso.

A prova entrega: matriz real de sistema/navegador/equipamento, versões fixadas das bibliotecas, política de captura validada, perfis de qualidade, tempos observados de moderação/recuperação, evidência de isolamento e restauração, replay conferido, consumo medido e procedimento de falha. Esses resultados devem existir antes de converter hipótese em requisito comercial ou prazo de entrega. Não basta uma demonstração com duas câmeras na mesma máquina.

## 15. Ordem de implementação e rollout

| Ordem | Entrega | Dependência | Trabalho independente possível |
| --- | --- | --- | --- |
| 0 | Prova de mídia/negociação, controle sob falha, execução isolada, handoff/restauração e captura/replay | Protótipo isolado com identidades fictícias | Ensaio de conteúdo pode ocorrer em paralelo |
| 1 | Contratos, grants por aula, ocorrências, agenda, revisões e referências duráveis de arquivos | Resultados da prova | UI sobre dados fictícios |
| 2 | Autoria no admin, turmas reutilizáveis, roteiro/adapter e workspace | 1 | Sala de mídia e componentes docentes |
| 3 | Menu, sala persistente, entrada, participação/chat/materiais e painel | 1–2 | Preparação familiar/Como Fazer |
| 4 | Assistência, observação e orientação visual | 2–3 | Integração Mural com contrato de artefato definido |
| 5 | Avatar/quarto/benefícios, publicação e retomada | 1–4 | Ensaios técnicos e de autorização |
| 5b | Captura, processamento, conferência/publicação, replay e retenção por aula | 0–3 e contratos temporais | Parte do pipeline pode ser construída junto da assistência |
| 6 | Turma piloto com inscrição administrada | 0–5b aprovados em testes | Preparação comercial sem anunciar recursos pendentes |
| 7 | Checkout/reserva/lembretes e docentes externos | Evidências do piloto | Novos roteiros publicados |

Publicar migrations e backend compatíveis antes das telas, sob feature flag por turma/ambiente. Não migrar alunos gravados automaticamente para uma inscrição ao vivo. Não usar dados reais de crianças nos testes de carga.

Rollout: staging com identidades de teste → ensaio com adultos → turma piloto pequena → ampliar para 6–8 → repetir e medir. Plano de contingência informa falha, conserva trabalho e oferece remarcação/apoio; uma chamada externa pode ser recurso operacional, não substituto silencioso da entrega anunciada.

Rollback desativa novas entradas e conclui/encerra encontros ativos de forma coordenada. Não remover tabelas, projetos ou revisões. Deploy durante assistência ativa exige drenagem ou retomada testada; não permitir que uma versão antiga ignore o fencing novo.

## 16. O que permanece onde está e limites

| Preocupação | Local | Motivo |
| --- | --- | --- |
| Login, família e aparelho | Auth | Identidade única e revogação canônica |
| Preço, checkout e cobrança | Catalog/fluxo comercial/Payments | Sala não vira sistema financeiro |
| Perfil, avatar, quarto e inventário | Members/Kids atuais | Preservar identidade e bens da criança |
| Forum/Mural/moderação | Hub | Mesma comunidade e regras de publicação |
| Compilação Pro | studio-runtime | Não confundir execução com presença |
| Avaliadores e contratos de atividade | Core/Studio atuais | Mesma semântica pedagógica |
| Curso gravado e progressão | Members/players atuais | Modalidade existente preservada |

Fora da primeira versão: controle do computador, aplicativo nativo, edição simultânea de dois autores, sincronização da mesma partida entre máquinas, transcrição automática da turma, publicação de replay sem conferência, coautoria geral em Pinta/Molda/Pro, reconhecimento de atenção e tela de aluno fora do encontro. O caminho prioritário usa SFU/TURN Cloudflare; operar um SFU próprio continua alternativa condicionada a decisão específica. Sala, gravador seletivo e replay próprios entram no escopo atual.

O perfil de construção inicial deve usar o Estúdio clássico e um roteiro testado. A arquitetura pode evoluir para Pro, mas não assumir compatibilidade de WebContainer/COOP/COEP com mídia sem ensaio separado.

## 17. Verificações da análise e limites da evidência

Foram lidos diretamente os contratos de Studio, captura, componentes de aula, guards de acesso/rascunho, política Kids, introspecção, publicação e gates de ajuda/avatar/quarto. A exploração também percorreu Auth, Catalog, Messaging, Hub e configuração de deploy. Documentos relevantes confrontados: [acesso infantil](2026-10-10-acesso-infantil-design.md), [gramática didática](2026-09-21-redesenho-didatico-aulas-interativas-design.md), [manifesto e projeto inicial](2026-09-26-manifesto-substitui-projeto-inicial-estudio-design.md) e [observação de comportamento](2026-09-12-estudio-observacao-de-comportamento-v5.md).

Não foram acessadas credenciais, faturas, configuração viva do banco, contas de fornecedores ou sala com oito participantes. Desempenho, bibliotecas escolhidas, isolamento do runtime, captura seletiva, replay, custo e rede dependem da prova. As referências de produção são de código/configuração versionados, não auditoria do ambiente implantado. Esta revisão é documental; os testes descritos não foram executados e não há estimativa fechada do escopo atual.
