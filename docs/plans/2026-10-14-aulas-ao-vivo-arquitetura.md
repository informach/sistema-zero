# Oficinas ao vivo — arquitetura e contratos propostos

14/10/2026. Anexo à [proposta de produto](2026-10-14-aulas-ao-vivo-design.md). Nomes de APIs, arquivos novos, tabelas e intervalos abaixo são propostas; não descrevem funcionalidades já implementadas. Nenhuma mudança de produção foi realizada.

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
| Vídeo e compartilhamento | Não há sala implementada | Implementar SFU/TURN internamente amplia operação | Fornecedor de mídia |
| Presença/cursor | Não há contrato de sala | Redis do Gateway não é broker pedagógico | Estado efêmero e sinais delimitados |
| Participação e conversa | Hub tem comunidade; não há controle de encontro | Chat efêmero perde histórico e não aplica moderação | Members controla sala/chat; Hub permanece comunidade |
| Materiais da aula | Bloco, editor e download existentes | URLs e autorização ainda exigem curso/aula | Adapter de material por contexto de execução |

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

As chamadas de negócio mantêm navegador → BFF → Gateway → Members. Mídia usa conexão direta ao fornecedor com credencial limitada, emitida no servidor. Assets usam o mecanismo autorizado de storage existente.

Para o piloto, comandos e estado autoritativos usam HTTP; atualizações curtas podem usar consulta agrupada a cada 2–3 segundos, com pausa/backoff. Cursor e setas usam mensagens efêmeras do SDK. Isso evita depender de um upgrade WebSocket que o Gateway ainda não implementa. Um transporte próprio SSE/WebSocket pode substituir o adapter depois, sem mover matrícula e autorização para outro serviço.

O `gatewayFetch` atual trata JSON e tem timeout: não é um canal SSE genérico. O runtime Cloudflare do Studio compila projetos Pro; não deve virar servidor de sala.

## 3. Modelo de domínio

| Entidade proposta | Responsabilidade e invariantes |
| --- | --- |
| `LiveProgram` | Oficina vendável: proposta, materiais, configurações e benefícios; pode conter um ou vários encontros |
| `LiveLessonTemplate` | Aula reutilizável da oficina, com ordem e revisões de roteiro; não contém datas de uma turma |
| `LiveCohort` | Turma com capacidade, calendário e vínculo ao programa |
| `LiveTeacherAssignment` | Conta docente, turma, papel de condução/assistência e validade |
| `LiveEnrollment` | Conta compradora + aprendiz + turma + origem comercial + status; vaga não é entitlement genérico de curso |
| `LiveSession` | Aula de uma turma: template, data de liberação, horário/fuso da chamada, estado, versão do roteiro e referência opaca da mídia |
| `LiveSessionAccessGrant` | Direito da inscrição àquela aula, com snapshot da oferta, dias contratados, início, vencimento, versão de agenda e ajustes auditados |
| `LivePlanRevision` | Roteiro publicado e imutável; referências/revisões do conteúdo e assets preparados |
| `LiveActivityInstance` | Atividade do encontro com identidade própria, etapa e configuração de conclusão |
| `LiveActivityRun` | Execução por aprendiz/instância, respostas, evidências e workspace associado |
| `LiveWorkspaceRevision` | Revisão durável de projeto/manifesto, autoria, revisão-base e checkpoint |
| `LiveAssistance` | Pedido, aceite, transferência de autoria, geração, expiração, revogação e devolução |
| `LiveAttendance` | Intervalos de presença agregados; não equivale a conclusão pedagógica |
| `LiveRoomPolicy` | Estado versionado do encontro: modo de fala, câmera, chat, entrada e permissões individuais |
| `LiveParticipationRequest` | Pedido ativo de mão ou ajuda, com tipo, sequência, autoria e encerramento; filas independentes |
| `LiveChatMessage` | Mensagem ordenada por encontro, texto ou referência autorizada a material, status de moderação e expiração |
| `LiveSessionMaterial` | Material complementar liberado no encontro, independente da revisão imutável do roteiro |

As tabelas podem ser ajustadas na implementação para evitar fragmentação desnecessária; as responsabilidades acima devem permanecer explícitas. Presença de segundos, cursores e miniaturas transitórias não viram histórico ilimitado no Postgres.

O identificador de execução é próprio: `sessionId + learnerId + activityInstanceId`. Não reutilizar `(learnerId, blockId)` de aula gravada. Uma oficina repetida não pode abrir concluída nem substituir o rascunho do curso.

Para continuar o mesmo jogo em quatro encontros, o roteiro pode referenciar um `workspaceId` da mesma turma/aprendiz. Cada encontro conserva sua evidência por revisão. Reiniciar atividade cria nova tentativa; copiar um projeto anterior conserva a origem e nunca apaga o original.

Proposta de armazenamento: acrescentar `live-studio` aos contextos de criação, com `itemId=workspaceId`, mantendo quota, partes por hash e storage existentes. O guard de acesso dessa criação usa inscrição/continuidade e autoria vigente, em vez de `LessonDraftAccessService`. O ator docente e o proprietário infantil são campos distintos: o serviço resolve o dono pelo workspace autorizado; nunca troca o cookie ou o header de identidade da professora pelo da criança. Todos os endpoints de reserva/commit/restauração desse contexto passam pela mesma política.

Horários são guardados em UTC com fuso IANA da turma para apresentação e cálculo de dias de calendário. Reagendamento gera nova versão e invalida lembretes anteriores. Os estados básicos da condução são `draft → scheduled → lobby → live → ended`; `cancelled` encerra antes do término. Estado da chamada e janela de acesso à aula são dimensões distintas: `ended` fecha a mídia, mas não antecipa o vencimento das atividades. Somente professora autorizada inicia a condução. Fechamento é idempotente e também fecha a sala no fornecedor.

Criar nova turma referencia os templates/revisões escolhidos e materializa novos encontros com novas datas/IDs. **Duplicar configuração** reaproveita capacidade, sequência e intervalos, mas não inscrições, chamadas, execução ou mensagens. Não atualizar datas de turmas passadas para repetir a venda. Arquivar uma turma a retira das opções de compra, preservando o histórico e direitos ainda válidos.

## 4. Acesso de oficina e identidade

O ingresso exige sessão válida, perfil correto, inscrição ativa, encontro disponível e autorização de dispositivo vigente. O vínculo do responsável compra direitos; o perfil ocupa a vaga. Duas crianças da mesma família não compartilham uma inscrição.

Há uma dependência de onboarding a tratar: [GetProfileAllowanceService](../../packages/members/src/application/profile-allowance/get-profile-allowance.service.ts) retorna zero quando a conta não tem entitlement ativo, e o Auth consulta esse teto para criar perfis. A compra de oficina deve materializar benefício com allowance explícito compatível com a oferta. Não depender do fallback de compradores legados. Para família nova: reservar vaga por conta → confirmar compra/benefícios → criar ou escolher perfil → vincular inscrição. Uma vaga paga aguardando perfil continua contando na lotação; não expira como reserva não paga. `maxProfiles` limita perfis, não substitui o contador de vagas.

O pacote avulso concede:

- Participação na turma e uso contextual das atividades/ferramentas necessárias.
- Acesso a atividades, materiais e projeto por aula, da liberação agendada até o vencimento calculado pela oferta.
- Acesso completo ao Mural durante o período contratado e elegibilidade de publicação do projeto da oficina.
- Onboarding sobre avatar, quarto e Como Fazer, que já possuem acesso básico por perfil autenticado.

Avatar/quarto continuam usando inventário/moedas e perfil original. Não conceder peças premium, XP, certificado de curso ou conclusão de etapas por simples presença. Um tutorial não libera a ferramenta que ensina a usar.

**Mural:** aproveitar a chave `community:mural-dos-criadores`; não conceder apenas `mural-dos-criadores-visitante`. O modelo atual de entitlement é por conta: o benefício social pode alcançar os perfis da família, enquanto a vaga e publicação da oficina continuam por aprendiz. Se for desejado limitar também esse benefício social ao perfil inscrito, será necessária uma extensão explícita da política do Hub; não fingir que ela já existe.

As datas de cada aula devem aparecer na oferta e no painel dos pais. **Regra confirmada: prazo contado por aula, a partir da própria liberação; não contado após o último encontro nem a partir da compra.** Não há acesso vitalício. O benefício social de Mural precisa de período próprio, explicitado na oferta; proposta: do primeiro início de acesso até o último vencimento contratado. Esse intervalo social não autoriza conteúdo de aulas futuras/vencidas. O fim do benefício não apaga avatar, quarto ou publicação. Assinatura vigente conserva seus direitos, mas não renova automaticamente os encontros.

### Política temporal por aula

Ao confirmar a inscrição, salvar os termos comerciais aplicáveis e criar um grant para cada encontro incluído. Campos propostos: `enrollmentId`, `sessionId`, `offerSnapshotId`, `accessDays`, `accessStartsAt`, `accessEndsAt`, `scheduleRevision` e `status`. Restrição única por inscrição/encontro. A oferta fornece a duração padrão por aula; a compra preserva o snapshot mesmo se uma oferta futura passar de 30 para 15 dias.

Padrão: `accessStartsAt = scheduledStartAt`; `accessEndsAt = addCalendarDays(accessStartsAt, accessDays, cohort.timeZone)`, convertido para UTC. Comparar no servidor com início inclusivo e fim exclusivo. Exemplo: 07/11/2026 14h + 30 dias = 07/12/2026 14h; aula seguinte em 14/11 vence em 14/12. Se a autora configurar liberação à meia-noite da data, o campo explícito registra essa opção; nunca inferir a hora pelo timezone do navegador.

`canAccessLesson` exige identidade/dispositivo, inscrição válida, grant ativo e `accessStartsAt <= now < accessEndsAt`. Não exige que a chamada continue ao vivo. `canJoinMedia` acrescenta abertura docente, horário permitido e estado `lobby/live`; preparação da professora antes da data não libera ingresso infantil. `canSendChat` e comandos de participação exigem encontro ativo; leitura de chat exige grant vigente e retenção não vencida. Calendário/cartões históricos usam endpoint de metadados, sem incluir atividades, respostas, materiais privados ou URLs de assets.

Aplicar o mesmo guard em leitura de atividade, projeto, upload/commit, materiais, evidências e publicação da oficina. Sessão aberta antes do vencimento não é autorização permanente. A interface avisa o encerramento e tenta salvar antes dele; o servidor recusa alterações posteriores e preserva cópia local recuperável. Lease de assistência nunca ultrapassa o encerramento da condução ou acesso vigente. Não depender de job agendado para negar acesso: o job limpa/fecha recursos, mas a comparação temporal ocorre em cada operação.

O cadastro de perfil continua possível depois da compra e antes da primeira aula por benefício de onboarding separado. Isso não libera as aulas. O entitlement agregado pode representar identidade/benefícios sociais; ele não substitui `LiveSessionAccessGrant` nem autoriza todas as aulas entre a primeira e a última data.

Workspace continuado pode ser associado a várias execuções da mesma criança/turma. Acesso à criação exige ao menos um grant vigente que realmente inclua esse workspace; a evidência e os materiais de cada aula continuam escopados à própria janela. Não conceder acesso a todo projeto antigo porque uma oficina qualquer está ativa. Continuidade posterior via assinatura deve migrar/referenciar a criação elegível no contexto Criar, com direito do plano, sem transformar grant vencido em válido.

Compra tardia preserva calendário e mostra prazo restante antes de pagar; inscrição tardia é uma opção explícita da turma. Reagendamento de aula ainda não iniciada atualiza grants dos inscritos conforme versão de agenda e notifica; alteração concorrente é transacional. Aula já iniciada preserva o início/termos históricos, e prorrogação/reposição usa ajuste auditado próprio. Não encurtar acesso já concedido silenciosamente. Cancelamento revoga o encontro afetado e segue a política comercial, sem cancelar assinatura ou outras inscrições por consequência.

**Professora:** precisa de `LiveTeacherAssignment` mesmo que a conta atual seja admin/staff. No piloto, a dona pode usar sua conta atual. Antes de convidar docentes externos, criar papel/capacidade restrita, roteamento e navegação próprios; não dar `staff` genérico. A permissão de administrar turma não deve implicar acesso irrestrito a dados financeiros ou a todas as famílias.

O Gateway já distingue `kids.kind=parent|student` e introspecta sessões infantis. Troca de perfil, revogação de aparelho e bloqueio de conta precisam encerrar mídia/observação/assistência. A autorização inicial do fornecedor não substitui essa regra.

## 5. Execução pedagógica e reaproveitamento

Introduzir um contrato `LearningExecutionAdapter` no member-shell: identidade da execução, leitura/salvamento de respostas, envio de tentativas, rascunhos, conclusão e acesso a materiais. O contexto gravado continua apontando às rotas atuais; o contexto ao vivo aponta às novas rotas de execução.

Extrair as dependências diretas de `lessonId/courseSlug` e URLs em `learning-activity.tsx` e wrappers de Studio/quiz. Não duplicar checagens do Core nem remontar os players gravados por completo.

O roteiro ao vivo publica somente recursos autorizados e revisões validadas. Importar de um rascunho do Farol não significa torná-lo público: a professora revisa e publica o pacote da oficina com sua própria política de acesso. Assets e respostas corretas continuam com as proteções existentes. Um vídeo opcional não vira pré-requisito inventado.

Critérios aceitos: participação na experiência quando esse é seu contrato; respostas de quiz; checagens estruturais de projeto; entrega/publicação; validação docente identificada quando prevista. Resultado reportado pelo navegador não é prova inviolável de comportamento. Seguir a distinção já documentada em [observação do Estúdio](2026-09-12-estudio-observacao-de-comportamento-v5.md).

### Navegação e composição visual

Registrar `/oficinas` com rótulo **Oficinas** e volta **Voltar às oficinas** em `community-kids/src/components/kids/nav.ts`; o título da página é **Oficinas ao vivo**. Visibilidade do destino independe de assinatura; consulta e ingresso respeitam inscrição/benefícios. A página reúne próximas, inscritas, concluídas e catálogo público permitido. Compra segue no contexto dos pais.

Hoje `MOBILE_NAV_ITEMS = NAV_ITEMS`: acrescentar o item sem adaptar o componente criaria seis abas automaticamente. Proposta de mobile: quatro atalhos atuais e Mais, cuja gaveta reúne Oficinas e Meu espaço, derivados da mesma definição de destinos. Validar foco, rótulo ativo e acessibilidade; não duplicar manualmente as regras de pertencimento de rotas.

Extrair/reutilizar a composição visual da aula atual: conteúdo/explicação, atividade, divisória, expansão e índice. A sala insere `LiveStage` no lugar principal da mídia explicativa, sem copiar o player inteiro nem modelar a transmissão como vídeo com duração/percentual assistido. `LiveRoomShell` mantém chamada, controles e workspace acima das trocas de etapas. Conversa/Materiais/Turma são painéis mutuamente exclusivos. O contexto distingue controles gravados de capacidades live; não criar métodos de pause/seek que fingem funcionar na transmissão.

Adicionar a rota de sala à política explícita de foco e revisar `MainContainer`/altura disponível. Não classificar todo `/oficinas` como editor: a página de descoberta deve rolar normalmente. `FocusModeProvider` só conhece índice de aulas gravadas hoje; a oficina usa seu próprio roteiro. A fonte da régua responsiva continua [lesson-split](../../packages/member-shell/src/lib/lesson-split.ts), adaptada para a área de mídia live.

### Autoria no admin e materiais

Novas páginas: `/admin/oficinas` (configuração Kids), `/admin/oficinas/:programId` (Apresentação, Roteiro, Turmas, Participação, Acesso) e `/admin/professor/ao-vivo` (agenda e condução). Registrar em `admin/src/components/admin/nav.ts` nos grupos correspondentes. A configuração é específica do Kids, com indicação explícita; o seletor global Kids/Adultos não pode mudar silenciosamente a entidade editada. Capacidades de preparar/publicar/ofertar diferem de conduzir turma atribuída.

Reutilizar `lesson-structure-editor.tsx`, `lesson-section-authoring.tsx` e o construtor de materiais através de contratos comuns, retirando dependências exclusivas de curso. **Ao vivo** é a fonte principal de explicação do roteiro; upload de vídeo é opcional. Estados de autoria: rascunho, validado e publicado; prévia/ensaio usa execução fictícia, sem escrita nos dados da criança. Publicação fixa `LivePlanRevision`; turmas e encontros referenciam a versão escolhida.

O bloco [MaterialsBlockView](../../packages/member-shell/src/components/materials-block.tsx) e [download de anexos](../../packages/member-shell/src/lib/attachment-download.ts) ainda montam URLs e retorno por curso/aula. O adapter deve oferecer `resolveMaterial`, `downloadMaterial`, `recordMaterialAccess` e `returnToExecution`, validando revisão, liberação e prazo da oficina. Não fabricar `courseSlug/lessonId` para contornar o acesso. Preservar a marcação de acesso/baixado apenas quando fizer parte do critério explícito da atividade.

O painel reúne os materiais do roteiro e complementos liberados de `LiveSessionMaterial`. O complemento recebe asset autorizado, título, ordem, autoria e data; inclusão/ocultação é auditável e não altera a versão do roteiro em andamento. Adicionar durante a sala usa o mesmo upload/validação de tipo, tamanho e storage do admin. Links no chat usam `materialId`, nunca credencial ou URL privada duradoura. Resolver download a cada acesso pelo guard da oficina. Prévia de arquivo não confiável permanece isolada.

## 6. Mídia, presença e observação

Implementar um `LiveMediaProvider` com criação/encerramento de sala, emissão de ingresso, configuração de permissões, expulsão/revogação e validação de callbacks. Daily é a primeira implementação proposta.

Sala privada por encontro; tokens emitidos no backend com sala, identidade opaca e permissões. Aluno não recebe credencial de administrador. Recepção de telas: professora designada recebe telas da turma; aluno recebe a demonstração autorizada da professora, não telas de colegas. Câmeras voluntárias dos colegas e áudio autorizado circulam na turma; permissão de tela é independente. Abrir apresentação de um aluno exige ação explícita e escopo temporário.

A configuração de captura precisa permitir selecionar a própria aba do Sistema Zero; alguns exemplos de SDK a excluem. Evitar prévias que recapturem a própria transmissão e produzam efeito de espelho. Durante a assistência, a criança vê o workspace em observação, e a demonstração docente pode ampliar o editor, sem transmitir o painel privado dos outros alunos.

Daily documenta `canReceive` por mídia e por usuário, emissão de tokens com sala/limites e expulsão com bloqueio de reentrada por `user_id`. Validar essas combinações na prova técnica, inclusive reconexão com token antigo. [Permissões](https://docs.daily.co/reference/daily-js/types/daily-participant-permissions), [tokens](https://docs.daily.co/reference/rest-api/meeting-tokens), [expulsão](https://docs.daily.co/reference/rest-api/rooms/session/eject).

Fechar o encontro deve encerrar/expirar a sala do fornecedor, invalidar novas entradas e retirar participantes conectados. Uma rotina reconcilia salas abertas além do prazo e consumo anormal. Callbacks são autenticados, idempotentes e toleram duplicação/ordem invertida; falha transitória entra em retry. Presença não é concluída apenas porque o browser disparou um evento de saída.

Proposta de observação:

- Mídia: mosaico de oito telas, camada reduzida quando disponível e foco legível na selecionada; validar perfis de qualidade no SDK.
- Metadados: atividade, modo, revisão, estado de save, preview, pedido de ajuda e timestamp do servidor.
- Documento: buscar revisão autorizada do projeto selecionado, evitando transmitir assets em cada heartbeat.
- Miniatura auxiliar: capturar no navegador da criança com API própria, separada da capa; informar ausência, pausa e desatualização.

Um `LivePresenceStore` armazena somente último estado e TTL; propor adapter Redis dedicado à aplicação, sem presumir que o Redis opcional do Gateway esteja disponível em produção. Queda desse cache degrada presença, não perde projeto ou transfere autoria. O lease de escrita permanece transacional no armazenamento durável.

Presença e imagens auxiliares expiram em curto prazo e são removidas no encerramento; propor TTL máximo de 60 segundos para o último estado visual, com cache privado e sem arquivo de capturas. Não colocar projetos, imagens ou dados individuais de progresso em `userData` público da chamada. O atendimento pode preservar eventos mínimos de aceite/devolução e revisões de projeto, com retenção definida separadamente.

Intervalos iniciais para ensaio, não garantias: metadados a cada 3–5 s; última imagem auxiliar a cada 5–10 s quando necessária; consulta docente agrupada a cada 2–3 s. Mídia não usa esse polling. Não subir screenshot/documento completo em cada movimento do mouse.

Não executar oito previews para montar cartões. [Limitações atuais de multi-instância e thread do preview](../../packages/studio/docs/embedding.md) justificam cartões leves e um editor de assistência por professora.

### Moderação de áudio, câmera e entrada

Members guarda a política desejada e aplica o equivalente no fornecedor. Modos propostos: `open` (Conversa livre), `turns` (Falar por vez), `listen` (Hora de ouvir). Exceções individuais e a vez concedida são versionadas. Em `turns`, liberar uma criança encerra a vez anterior por padrão; em `listen`, liberar a vez passa para `turns`. Voltar a `open` libera a possibilidade de falar sem ativar dispositivos.

`mute_now` interrompe o áudio atual, sem revogar o direito posterior de reativá-lo quando o modo permitir. `lock_audio` também retira a permissão de publicar áudio até liberação. A ação coletiva resolve no servidor somente os aprendizes presentes, preservando o áudio docente. O bloqueio alcança novas conexões da mesma criança; ingresso tardio herda a política vigente. Selecionar apenas volume zero ou esconder botão não satisfaz o contrato.

Na integração Daily, silenciamento imediato pode usar `setAudio: false`; bloqueio persistente requer atualizar permissões `canSend` no fornecedor e guardar a decisão em Members. A API REST permite aplicar alterações de permissões pelo backend. `status: sent` não prova que todos os dispositivos já obedeceram: acompanhar estado confirmado, timeout/retry e indicar falhas individuais. [Controle de participante](https://docs.daily.co/reference/daily-js/instance-methods/update-participant), [permissões pela API](https://docs.daily.co/reference/rest-api/rooms/session/update-permissions).

Entrada começa com câmera/microfone desligados. Convite para falar permite ação local **Ligar meu microfone**; nenhum comando do produto abre microfone/câmera remotamente. Garantir no ensaio que devolver uma permissão não retoma uma trilha anteriormente aberta sem a ação local. Docente recebe somente as capacidades necessárias de condução; não conceder owner/recording por conveniência.

Impedir áudio por vias alternativas: `screenAudio` e `customAudio` infantis ficam desabilitados por padrão. Quando uma apresentação autorizar som do projeto, esse áudio fica sujeito ao mesmo encerramento/bloqueio docente. Não usar `canSend=false` para calar uma criança, pois também interromperia seu vídeo/tela de acompanhamento. Câmera, microfone e compartilhamento são capacidades distintas.

Fechar entrada preserva os participantes admitidos e manda novas solicitações para espera. Remover registra bloqueio do aprendiz naquele encontro e revoga sua mídia, não apenas o `session_id` corrente. Encerrar para todos fecha envio de chat, ingressos e permissões temporárias de edição. Reconexão da professora recupera a política confirmada e não restaura permissões antigas por defaults locais.

### Mãos levantadas e fila de ajuda

Mão e ajuda têm tipos diferentes. Cada criança pode ter no máximo um pedido ativo de cada tipo por encontro. Levantar/abaixar usa comando autenticado idempotente; o servidor dá sequência e horário. Docente pode abaixar uma mão ou todas. Nenhum desses comandos apaga ajuda ou termina automaticamente a vez de fala.

A ação individual identifica o pedido atual por ID/versão, impedindo que um clique atrasado apague uma mão levantada novamente. A coletiva encerra, transacionalmente, as mãos até a sequência corrente; pedidos criados depois permanecem. Clientes adotam a versão mais nova da fila e ignoram notificações antigas. A professora pode chamar por ordem ou selecionar outra criança; atender um pedido não depende de o cursor estar sobre o cartão.

Esse estado de controle precisa sobreviver a reconnect/restart: guardar estado corrente limitado em Members, separado do heartbeat com TTL. Na entrada, retornar fila permitida/capacidades e política atuais; não reconstruir a fila somente por mensagens de mídia. Criança recebe o status próprio e sinais da turma necessários, sem detalhes privados dos pedidos de ajuda.

### Conversa da turma

`LiveChatService` autoriza, valida e persiste texto/cartões em Members antes de confirmar envio. Cada mensagem recebe ID, sequência do encontro, remetente derivado da sessão, timestamp e chave de idempotência. Não aceitar identidade docente declarada no body. Limites iniciais propostos: 500 caracteres e 5 mensagens em 10 segundos por aprendiz, ajustáveis após ensaio; avisos e comandos docentes usam limites próprios.

Leitura incremental por cursor recupera mensagens após reconexão e para inscritos atrasados. Mensagens de SDK podem avisar que há atualização, mas não são a fonte confiável do conteúdo: Daily não armazena nem reproduz `sendAppMessage` para quem entra depois. Não renderizar texto recebido diretamente desse canal como mensagem docente/moderada. [Daily — mensagens da chamada](https://docs.daily.co/reference/daily-js/instance-methods/send-app-message).

No piloto, aproveitar a consulta agrupada de estado a cada 2–3 segundos, incluindo último cursor de chat/fila, com resposta vazia/ETag quando nada mudou. O envio recebe confirmação direta HTTP; indicar Enviando/Falhou e retry sem duplicar. Um futuro transporte de eventos pode antecipar a atualização sem alterar a persistência/autorização.

Moderação inclui pausar/reabrir escrita da turma, restringir um participante, fixar/desafixar aviso e remover mensagem. Ler histórico continua permitido durante pausa; Pedir ajuda continua funcionando. Não há DMs infantis, upload arbitrário de aluno nem envio de HTML. Escapar conteúdo; links infantis ficam como texto sem ação. Cartões de material são criados pela docente e resolvidos pelo mesmo guard dos materiais.

Proposta de retenção: texto mantido até 30 dias após o encontro, com limpeza agendada e tratamento explícito de exclusão/backups segundo política final. Leitura infantil exige também grant vigente daquela aula; retenção não estende acesso comercial. Remoção substitui o conteúdo por marcador para clientes que já o receberam e gera evento mínimo de moderação; não manter cópia oculta ilimitada. Chat e eventos privados não entram em `userData` público, logs de payload ou replay de sessão. Encerramento da chamada torna o histórico somente leitura pelo prazo restante.

## 7. Autoria assistida e recuperação

### Contrato funcional

1. Professora pede edição de um workspace da criança naquela sessão.
2. Criança aceita pedido ainda válido, vinculado ao perfil/projeto atual.
3. Editor pausa mutações e runtime, drena buffers e confirma checkpoint remoto.
4. Transação concede autoria à professora com geração monotônica e revisão-base.
5. Professora edita; somente suas gravações válidas são aceitas. Criança recebe revisões em observação, sem regravá-las.
6. Ao devolver, confirmar a revisão final e sua aplicação na criança; conceder nova geração de autoria à criança.
7. Interromper/expirar invalida imediatamente a geração anterior no servidor. Retomada usa última revisão confirmada, com recuperação separada do que ficou apenas local.

Um lease proposto dura 30 s e se renova a cada 10 s enquanto sessão e autorização são válidas. O tempo usa relógio do servidor. Esses valores precisam de ensaio de rede; não prometem revogação instantânea de mídia em provedor externo. A escrita recusada no servidor após revogação é obrigatória.

Toda gravação carrega `workspaceId`, `expectedRevision`, `writerEpoch` e `mutationId`. O servidor deriva o ator da autenticação, confere vínculo e rejeita revisão antiga, geração vencida ou ator errado. Idempotência devolve o mesmo resultado para reenvio da mesma mutação. A conferência precisa alcançar reserva/commit de uploads e rotas de recuperação, não apenas um endpoint novo.

Autosave antigo da criança, segunda aba, parse assíncrono atrasado ou upload iniciado antes do handoff não podem escrever sobre a professora. O mesmo vale para gravações tardias da professora depois de devolver.

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

O runtime da criança pausa na transferência. A professora testa sua instância e pode demonstrá-la; ao retornar, a criança executa a revisão recebida. Sincronizar documento não sincroniza partida, timers, aleatoriedade ou armazenamento local do jogo.

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

O resolver deve considerar controles que mudam da barra para o menu em telas estreitas e menus renderizados em portal. Cursores da assistência usam overlay sem interceptar cliques; “Acompanhar a professora” pode alinhar arquivo/viewport no observador. Isso não força o scroll de toda a turma a cada movimento docente.

Na primeira versão, registrar um conjunto pequeno dos alvos usados na oficina. Preview em iframe permanece isolado; destacar um objeto do jogo só é possível com ponte explícita e IDs do runtime. Não ampliar o sandbox para permitir inspeção do computador ou DOM arbitrário.

Sinais efêmeros podem usar mensagens do SDK. Daily documenta limite de 4 KB, destinatários por sessão e ausência de replay para quem entrou depois. Portanto, enviar apenas cursor/alvo/revisão; o estado autoritativo continua no Members. [Mensagens do Daily](https://docs.daily.co/docs/daily-js/guides/custom-messages).

Validar `fromId` do transporte contra roster autenticado e papel docente atual; não confiar em `role: 'teacher'` declarado no payload/userData. Rejeitar época antiga, destino fora da turma, mensagem vencida e frequência excessiva. Proposta inicial: no máximo 10 atualizações de cursor por segundo, coalescidas, descartáveis e sem histórico. Uma mensagem de cursor nunca concede permissão de escrita.

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
export type LiveSessionState =
  | 'draft' | 'scheduled' | 'lobby' | 'live' | 'ended' | 'cancelled'
export interface LiveActor {
  accountId: string
  learnerId: string | null
  sessionId: string
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
}
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
| Ingresso | `POST /members/live/sessions/:id/join` | Valida inscrição/aparelho/janela; emite credencial limitada e roster necessário |
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

Comandos de iniciar/encerrar encontro, mudar etapa, admitir/remover e publicar roteiro ficam no grupo docente, com schemas próprios e versões. `controls` distingue o alvo criança/turma conforme a operação, sem aceitar papel/identidade de ator vindos do body. Limpeza de mãos usa a sequência/versão da fila; grants temporais são resolvidos pelo relógio do servidor. Guias persistidos vêm do Members; cursor efêmero não é rota de alteração de projeto. Toda resposta privada usa política de cache apropriada; tokens nunca entram em URL/log.

### Exportações e ownership

| Pacote/subpath proposto | Exportações |
| --- | --- |
| `@sistemazero/core/live` | DTOs/eventos delimitados, estados e validadores compartilhados; nenhum SDK de mídia |
| `member-shell` módulo live | `LiveRoomShell`, `LiveStage`, `LiveParticipationControls`, `LiveChatPanel`, `LiveMaterialsPanel`, `LiveLearningAdapter`, `TeacherClassroom`, `LiveGuidanceLayer`, `LiveMediaClient` |
| `@sistemazero/studio` | Extensões opcionais de autoria/observação e alvos do editor; `Project` continua no dono atual |
| Members | Serviços/ports/repositórios internos de oficina, sem exportá-los para frontends |

## 11. Arquivos novos e alterações

Estrutura ilustrativa de novos arquivos, a ajustar às convenções finais:

```text
packages/core/src/live/{contracts,events,guards,index}.ts
packages/members/src/domain/live/{program,lesson-template,cohort,session,enrollment,session-access,participation,chat,assistance}.ts
packages/members/src/domain/ports/live-{repository,media,presence}.port.ts
packages/members/src/application/live/
  live-access.service.ts
  live-program.service.ts
  live-schedule.service.ts
  live-session.service.ts
  live-participation.service.ts
  live-chat.service.ts
  live-materials.service.ts
  live-learning.service.ts
  live-workspace.service.ts
  live-assistance.service.ts
  live-showcase.service.ts
packages/members/src/infrastructure/live/{daily-media,redis-presence}.ts
packages/members/src/interfaces/http/routes/live.routes.ts
packages/member-shell/src/components/live/
  live-room-shell.tsx
  live-stage.tsx
  live-participation-controls.tsx
  live-chat-panel.tsx
  live-materials-panel.tsx
  teacher-classroom.tsx
  live-guidance-layer.tsx
packages/member-shell/src/lib/live/{learning-adapter,media-client,workspace}.ts
packages/member-shell/src/routes/live.ts
packages/studio/src/studio/{observation,guidance-targets}.ts
packages/community-kids/src/app/(app)/oficinas/...
packages/community-kids/src/app/(app)/pais/oficinas/...
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
| `members/src/application/creations/lesson-draft-access.service.ts` | Preservar guard de aula; acrescentar resolver de acesso específico da oficina |
| `members/src/infrastructure/persistence/drizzle/schema.ts` | Tabelas live, grants por encontro, controles/chat/materiais e índices de idempotência/inscrição |
| `studio/src/studio/types.ts` e `StudioCore.tsx` | Contratos opcionais de observação, aplicação silenciosa e pausa de autoria |
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

Não eliminar arquivos de curso gravado. A extensão deve ser aditiva, com defaults que preservam os consumidores existentes. Não há reexports legados obrigatórios porque ainda não existe API de aulas ao vivo.

## 12. Compra, reserva e notificações

O piloto pode usar inscrição administrativa auditada e origem de pagamento registrada. Ainda assim, capacidade e associação ao perfil são conferidas transacionalmente. Nunca operar vagas apenas por planilha enquanto a sala admite qualquer perfil com link.

Para venda aberta, acrescentar fulfillment explícito de oficina/programa e seus benefícios; não sobrecarregar `courseRef` como se uma turma fosse curso nem `maxProfiles` como quantidade de assentos. Consumir o fluxo comercial já existente, com idempotência por compra/benefício. O grant pode conceder materiais + acesso ao Mural + direito de reservar/confirmar uma vaga, conforme oferta.

Reservar vaga atomicamente com vencimento; pagamento confirmado consome a reserva; falha/cancelamento libera; confirmação tardia não ultrapassa lotação e entra em procedimento explícito de realocação/reembolso. Reenvio de webhook não cria outra inscrição. Revogar uma compra remove apenas os benefícios originados nela, preservando outras compras/assinatura.

Messaging já possui fila e agendamento, mas a porta atual do Members não expõe todos os recursos. Ampliar a integração ou usar jobs idempotentes para confirmação, preparo, lembrete, reagendamento, cancelamento e resumo. Enfileirar não equivale a entregar. Destinatários comerciais são responsáveis; mensagens de aula ficam no contexto infantil permitido.

## 13. Uso de alto nível

Configuração do servidor injeta um fornecedor e repositórios reais; testes usam adapters controlados. Credenciais são segredo de ambiente no backend. Não registrar token no console nem persistir a chave de fornecedor no projeto do aluno.

Fluxo do consumidor:

```text
Abrir sala → validar sessão/perfil → carregar encontro/inscrição
→ obter credencial de mídia → montar chamada persistente
→ montar renderer com LiveLearningAdapter
→ conectar Studio com LiveWorkspaceAdapter
→ observar mídia/estado → enviar somente comandos autorizados
→ confirmar revisão final → publicar pelo pipeline comum → encerrar
```

Um novo provedor implementa `LiveMediaProvider`/`LiveMediaClient`; ele não redefine permissões pedagógicas, identidade da inscrição ou ownership do projeto. Um novo tipo de atividade implementa seu adapter de execução; não precisa construir uma segunda sala.

Antes: `LessonPlayer → contexto de curso → atividade/Studio → rotas de aula`.

Depois: `LessonPlayer → RecordedLearningAdapter` e `LiveRoomShell → LiveLearningAdapter`, ambos usando os mesmos renderers e avaliadores. Vídeo gravado continua no primeiro; mídia ao vivo fica no shell persistente do segundo.

## 14. Testes que sustentam a entrega

| Grupo | Casos obrigatórios |
| --- | --- |
| Política | Outra turma, professor não designado, criança de outra família, pais tentando estudar pelo contexto adulto, sessão revogada |
| Compra | Duas reservas para última vaga, webhook repetido, pagamento tardio, cancelamento sem revogar assinatura independente |
| Calendário e prazo | Aula futura negada; liberação exata; cada encontro vence separadamente; oferta editada preserva snapshot; compra tardia; relógio/fuso; link direto; gravação/salvamento após expiração |
| Reutilização | Nova turma não copia inscritos nem progresso; revisão fixa; reagendamento não recicla turma passada; workspace continuado não libera material vencido |
| Conteúdo | Farol não publicado no curso mas pacote live autorizado; revisão de roteiro fixa; outra oficina não herda respostas |
| Persistência | Retry de commit, conflito de revisão, quota, upload/commit interrompido, continuidade entre encontros |
| Assistência | Aceite real, recusa, revogação, timeout, autosave atrasado, segunda aba, parse atrasado, reload e devolução confirmada |
| Observador | Nenhum caminho de mutação local/remota; nenhum autosave em eco; mesma identidade do projeto com revisão nova |
| Orientação visual | Cursor rotulado; alvo em layouts/zoom diferentes; menu fechado; bloco inexistente; revisão antiga; remetente forjado |
| Mídia | Oito telas e Estúdios reais; aluno tenta receber tela de colega; token antigo após encerramento; mudança de professora |
| Controle docente | Silenciar um/todos preserva professora; bloqueio impede reativar/reconectar; som de tela não contorna mute; liberar não liga dispositivos |
| Mãos e ajuda | Abaixar uma/todas; comando atrasado não apaga pedido novo; fila recuperada; mãos não apagam ajuda nem encerram fala |
| Conversa e materiais | Histórico/retry sem duplicação; remover/pausar no servidor; conteúdo escapado; anexo autorizado; material de outra turma negado; complemento não altera roteiro |
| Interface e admin | Menu desktop/mobile, mesmas atividades/layout gravado, chamada persiste entre etapas, prévia isolada, roteiro sem vídeo, câmera opcional e teclado |
| Integração | Oficina sem assinatura acessa avatar/quarto/Como Fazer/Mural; publica Project válido; retry não duplica post; link segue moderação |
| Regressão | Cursos gravados, gates de vídeo, rascunhos, publicação de curso/avulsa, desafio mensal e troca de perfil continuam corretos |

Usar relógio injetável para leases, idempotência e expiração; testes de banco real para locks/concorrência, não apenas mocks. Testar headers, iframe e permissões em navegador real. Não há resultados desses testes nesta proposta: são critérios para a futura implementação.

Metas iniciais de ensaio: cursores/destaques percebidos em menos de um segundo em rede saudável, revisão aceita visível em poucos segundos e nenhum caso de perda de revisão confirmada. Medir p95 e definir orçamento de CPU/rede a partir dos equipamentos reais; não anunciar números como garantidos antes disso.

## 15. Ordem de implementação e rollout

| Ordem | Entrega | Dependência | Trabalho independente possível |
| --- | --- | --- | --- |
| 0 | Prova de mídia privada e handoff com duas identidades | Nenhuma mudança de produto | Ensaio de conteúdo pode ocorrer em paralelo |
| 1 | Contratos, modelo, grants por aula, agenda e revisões | Resultados da prova | UI sobre dados fictícios |
| 2 | Autoria no admin, turmas reutilizáveis, roteiro/adapter e workspace | 1 | Sala de mídia e componentes docentes |
| 3 | Menu, sala persistente, entrada, participação/chat/materiais e painel | 1–2 | Preparação familiar/Como Fazer |
| 4 | Assistência, observação e orientação visual | 2–3 | Integração Mural com contrato de artefato definido |
| 5 | Avatar/quarto/benefícios, publicação e retomada | 1–4 | Ensaios técnicos e de autorização |
| 6 | Turma piloto com inscrição administrada | 0–5 aprovados em testes | Preparação comercial sem anunciar recursos pendentes |
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

Fora da primeira versão: controle do computador, aplicativo nativo, edição simultânea de dois autores, sincronização da mesma partida entre máquinas, gravação/transcrição automática, coautoria geral em Pinta/Molda/Pro, reconhecimento de atenção, tela de qualquer aluno fora do encontro e infraestrutura própria de WebRTC.

O perfil de construção inicial deve usar o Estúdio clássico e um roteiro testado. A arquitetura pode evoluir para Pro, mas não assumir compatibilidade de WebContainer/COOP/COEP com mídia sem ensaio separado.

## 17. Verificações da análise e limites da evidência

Foram lidos diretamente os contratos de Studio, captura, componentes de aula, guards de acesso/rascunho, política Kids, introspecção, publicação e gates de ajuda/avatar/quarto. A exploração também percorreu Auth, Catalog, Messaging, Hub e configuração de deploy. Documentos relevantes confrontados: [acesso infantil](2026-10-10-acesso-infantil-design.md), [gramática didática](2026-09-21-redesenho-didatico-aulas-interativas-design.md), [manifesto e projeto inicial](2026-09-26-manifesto-substitui-projeto-inicial-estudio-design.md) e [observação de comportamento](2026-09-12-estudio-observacao-de-comportamento-v5.md).

Não foram acessadas credenciais, faturas, configuração viva do banco, contas de fornecedores ou uma sala com oito participantes. Desempenho, SDK escolhido, custo de infraestrutura incremental e comportamento de rede precisam da prova técnica. As referências de produção são de código/configuração versionados, não auditoria do ambiente implantado.
