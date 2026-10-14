> **Registro histórico da revisão.** Os achados de código foram tratados na rodada seguinte. Consulte o [relatório de correções](live-corrections-2026-10-14.md) para resultados atuais e limites de validação. As reproduções antigas foram arquivadas como `.historical.txt`; os comandos ao final deste documento descrevem a execução original.

**Revisão da implementação das oficinas ao vivo — 14/10/2026**

A implementação precisa de correções antes de receber uma turma real. A revisão encontrou **quatro problemas P1 e quatro P2**, sete deles acompanhados de uma reprodução automatizada. Os testes existentes passaram, mas não exercitavam os cenários abaixo. Há também diferenças funcionais em relação à proposta e validações operacionais ainda pendentes.

P1 significa corrigir antes do piloto com crianças, por risco de perder trabalho ou comprometer a gravação. P2 significa corrigir o comportamento antes de oferecer os fluxos afetados. As classificações são prioridades desta revisão, não uma alegação de incidente em produção.

Esta execução é uma revisão: não alterou código da aplicação, não aplicou migrações em produção, não fez deploy e não contratou infraestrutura. Foram acrescentados somente este relatório, o inventário e testes de reprodução em `.audits/`.

**Achados, em ordem de prioridade**

**1. P1 — Recusar a ajuda pode descartar uma edição recente da criança.**

Referências: [live-workspace.tsx](../packages/member-shell/src/components/live/live-workspace.tsx), linhas 288, 422–451 e 535; [live-workspace.service.ts](../packages/members/src/application/live/live-workspace.service.ts), linha 440.

Quando a criança edita o projeto e clica em **Agora não** antes de o autosave entregar o snapshot ao host, `act('revoke')` espera somente a fila de requisições já iniciadas. Ele não materializa os buffers do editor nem salva a edição pendente. O servidor incrementa `writerEpoch` e devolve o último projeto confirmado. Ao aplicar essa época nova, a interface chama `prepareHandoff()`, descarta o snapshot retornado e aplica a versão antiga por cima da edição local.

A reprodução usa o componente `LiveWorkspace` real e substitui apenas a fronteira imperativa do Studio: faz uma edição ainda não enviada, recusa o pedido e comprova que a versão anterior substitui a nova, sem chamada a `/commits`. Não é uma reprodução visual do Blockly completo.

A correção deve distinguir recusa de um pedido ainda não aceito de revogação da edição já transferida. A recusa precisa preservar a autoria e o conteúdo local; qualquer troca que realmente exija substituir o documento precisa salvar ou conservar duravelmente o snapshot antes. Critério de aceite: editar e recusar imediatamente mantém a alteração, inclusive com requisições atrasadas.

**2. P1 — O autosave pode liberar a saída antes da confirmação remota, sem rascunho durável.**

Referências: [live-workspace.tsx](../packages/member-shell/src/components/live/live-workspace.tsx), linhas 192, 385–418 e 631–649; [service.ts](../packages/studio/src/persistence/service.ts), linhas 402–424 e 458–492; [StudioCore.tsx](../packages/studio/src/studio/StudioCore.tsx), linha 489; [client.ts](../packages/member-shell/src/lib/live/client.ts), linha 22.

A sala usa `persistence="none"` e envia o projeto por um `onChange` que dispara `commit` sem retornar uma confirmação ao serviço de persistência. O Studio chama `markSaved()` mesmo sem adapter. Assim, `isDirty` pode ficar falso enquanto o salvamento na conta ainda está pendente. O bloqueio de saída existente depende desse sinal. A reprodução com o serviço e a store reais confirma exatamente essa janela: o host recebeu a edição, o salvamento ainda não terminou e `isDirty` já foi limpo.

Além disso, o host ignora o contexto `reason: 'flush'` e usa um fetch comum. O navegador não oferece a garantia de manter esse envio vivo após descarregar a página; `keepalive` é a opção específica para essa finalidade. [Referência MDN](https://developer.mozilla.org/en-US/docs/Web/API/Request/keepalive). A recuperação implementada fica em estado React e oferece download, portanto recarregar ou fechar a página antes de preservá-la elimina essa cópia em memória. Não foi executado neste review um ensaio completo de fechamento de navegador com a aplicação renderizada.

A correção precisa de rascunho/fila durável, com escopo de conta, perfil, workspace, revisão e época de autoria; o estado de salvamento deve acompanhar a confirmação do servidor. Também precisa coordenar navegação, buffers e recuperação sem sobrescrever uma revisão mais recente. Apenas acrescentar `keepalive` não resolve a consistência nem a recuperação de snapshots grandes. Critério de aceite: editar, interromper a rede e recarregar mantém uma cópia recuperável, sem escrita em outro perfil ou por uma autoria vencida.

**3. P1 — Uma falha ao finalizar a gravação deixa o job fora das tentativas automáticas.**

Referência: [own-recording.provider.ts](../packages/members/src/infrastructure/live/own-recording.provider.ts), linhas 43–58, 70–80 e 175–176.

O comando de parada grava `desiredState='stopped'` antes de enviar a operação ao gravador. Se o envio falhar, o reconciliador ignora o job: sua consulta busca somente `desiredState != 'stopped'`. O mesmo desenho afeta o encerramento disparado pela aula. Uma indisponibilidade transitória pode deixar a gravação sem finalização e sem replay pronto mesmo depois de o serviço voltar.

A reprodução usa PostgreSQL local, o provider real e um servidor de gravação simulado. A primeira parada recebe falha; o servidor simulado volta a responder; após um ciclo real de reconciliação, nenhuma nova tentativa de parada ocorre. Isso é diferente da limitação documentada de recuperação após reinício do gravador.

A correção deve reconciliar intenção e estado confirmado até obter o artefato final, incluindo jobs com intenção de parar. Precisa de tentativa idempotente, tratamento de falha observável e caminho operacional de recuperação. Critério de aceite: falhar o primeiro comando de parada e restaurar o serviço produz um único replay final, sem intervenção no banco.

**4. P1 — Um pedido de ajuda sem resposta pode bloquear a gravação pelo restante da aula.**

Referências: [live-workspace.service.ts](../packages/members/src/application/live/live-workspace.service.ts), linhas 334–355 e 440–465; [own-recording.provider.ts](../packages/members/src/infrastructure/live/own-recording.provider.ts), linhas 150–163 e 306–326.

Qualquer assistência não nula, inclusive `requested`, faz o coordenador pausar a gravação e impede `resume`. O pedido tem `requestedAt`, mas não expira. A professora não consegue cancelar esse pedido: `revoke` aceita somente a criança; `returnAuthorship` exige ajuda já ativa. Se a criança desconectar ou não responder, a professora perde o caminho para liberar a gravação. O texto do erro sugere cancelar a ajuda, mas essa ação não existe para ela nesse estado.

A reprodução com serviços e PostgreSQL locais confirma a pausa, a rejeição de `resume` e a recusa de cancelamento pela professora. A pausa em si protege a gravação; o defeito é não haver saída para um pedido abandonado.

A correção deve permitir cancelar um pedido pendente pela professora solicitante e expirar pedidos abandonados, com controle de versão. A retomada precisa continuar impedida quando um projeto infantil estiver efetivamente em atendimento ou apresentação. Critério de aceite: solicitar ajuda, desconectar a criança, cancelar o pedido e retomar a gravação sem registrar conteúdo infantil.

**5. P2 — Chegar ao horário final interrompe o acesso à chamada, mas não encerra seu ciclo de vida.**

Referências: [live.service.ts](../packages/members/src/application/live/live.service.ts), linhas 479–563 e 585–590; [own-recording.provider.ts](../packages/members/src/infrastructure/live/own-recording.provider.ts), linha 70; [recording-job.ts](../packages/live-recorder/src/recording-job.ts), linhas 57–81 e 204–211.

Após `hardEndsAt`, a autorização de mídia é negada, porém a ocorrência continua com `state='live'`. Consultar a sala apenas calcula a visão; não persiste um encerramento. O coordenador continua orientado pelo estado `live`. O lease vencido do gravador interrompe a captura por pausa, mas não executa a finalização que monta o replay.

A reprodução de domínio confirma simultaneamente o estado ainda ao vivo e a negação de mídia; a consequência para finalização foi rastreada no coordenador e no gravador. O encerramento manual continua sendo um caminho válido. Não se trata de afirmar que o comando manual de parada após o prazo é rejeitado.

A correção precisa de encerramento durável por prazo, independente de uma aba aberta, com transição idempotente, revogação e finalização recuperável. Critério de aceite: deixar a aula atingir o prazo sem clicar em encerrar resulta em estado encerrado e gravação disponível para revisão, preservando o prazo comercial do replay.

**6. P2 — Depois de uma reposição, não é possível retirar a gravação anterior pelo controle disponível.**

Referências: [live.service.ts](../packages/members/src/application/live/live.service.ts), linhas 911–921 e 974–1006; [live-recording-review.tsx](../packages/member-shell/src/components/live/live-recording-review.tsx), linhas 18–27.

O endpoint de leitura pode escolher uma gravação publicada de uma ocorrência anterior da mesma aula. Porém, publicação/retirada modifica somente `context.occurrence`, isto é, a ocorrência atual. Ao criar uma reposição, o painel passa a olhar essa ocorrência nova; o controle da gravação antiga desaparece. Tentar retirar a gravação usando a versão atual não retira a antiga, que segue acessível.

A reprodução publica o replay original, encerra a aula, cria a reposição e executa a retirada na ocorrência atual. A criança ainda recebe a gravação original. Preservar o histórico é correto; perder a capacidade de retirar um item publicado não é.

A correção deve endereçar gravações por ocorrência explícita e oferecer revisão/retirada do histórico, validando autorização e versão do item exato. Critério de aceite: retirar um replay antigo depois de agendar reposição impede novas autorizações para esse replay sem alterar a gravação da reposição. URLs já emitidas seguem a política de expiração do armazenamento e precisam ser consideradas no procedimento.

**7. P2 — A agenda mostra a data antiga depois de marcar uma reposição.**

Referências: [live.service.ts](../packages/members/src/application/live/live.service.ts), linhas 65, 397–438 e 1097–1103; [live-catalog.tsx](../packages/member-shell/src/components/live/live-catalog.tsx), linhas 88 e 103.

`replaceOccurrence` cria a nova ocorrência e atualiza `session.occurrenceId`, mas conserva as datas da sessão. O catálogo expõe essas datas e a interface usa `session.startsAt` para informar o horário. A ocorrência apontada é nova, mas o horário exibido continua sendo o original. A família pode se orientar pela data errada.

A reprodução confirma o novo identificador de ocorrência ao lado do `startsAt` antigo. A solução não deve simplesmente recalcular todos os grants: a abertura e o prazo comercial da aula precisam continuar separados do horário operacional da reposição.

A correção deve expor e renderizar o calendário da ocorrência atual, mantendo os campos de acesso separados. Critério de aceite: catálogo infantil, responsáveis e administração exibem a nova data, e o vencimento comercial só muda quando houver extensão explícita.

**8. P2 — Pausar o chat também impede a professora de enviar avisos.**

Referências: [live-classroom.tsx](../packages/member-shell/src/components/live/live-classroom.tsx), linhas 724–740; [live.service.ts](../packages/members/src/application/live/live.service.ts), linhas 687–700; [proposta visual](../docs/plans/2026-10-14-aulas-ao-vivo-design.md), linha 264.

O backend permite mensagens da professora quando o chat infantil está pausado. Já o textarea e o botão Enviar usam `!chatEnabled` sem distinguir o papel. A professora precisa reabrir a conversa das crianças para escrever um aviso, contrariando a moderação prevista.

Este achado foi confirmado por leitura do caminho de interface e da autorização no servidor, sem uma reprodução renderizada adicional. A correção deve aplicar o bloqueio de chat somente à composição infantil, mantendo as outras restrições de sessão. Critério de aceite: com chat pausado, a professora envia um aviso, a criança lê o histórico e não consegue enviar nova mensagem.

**Coerência com a proposta e jornadas**

| Parte da experiência | Resultado da revisão |
| --- | --- |
| Menu Oficinas e área própria no Admin | Implementados e ligados às rotas atuais; a navegação móvel preserva os atalhos existentes. |
| Oficina reutilizável, turmas, matrículas e histórico | Modelo presente. A reposição precisa das correções 6 e 7. A inscrição do piloto é manual. |
| Liberação e vencimento por aula | Políticas no servidor, separadas do acesso da assinatura. Publicar o replay não reinicia os 30 dias. Os testes focados de acesso passaram. |
| Atividades e Estúdio na experiência ao vivo | Integração com componentes de aprendizagem existentes, progresso da oficina e prévia isolada. Há problemas de persistência nos achados 1 e 2. |
| Mesmo projeto desenvolvido em várias aulas | **Incompleto em relação à proposta.** Hoje há um workspace por criança/aula, aberto a partir de template ou projeto vazio. Não há associação de várias execuções ao mesmo workspace como previsto na arquitetura, linha 145. |
| Observar e ajudar com autorização | Há observação, transferência de autoria, checkpoint e cursor identificado. Pedidos pendentes e recusa precisam das correções 1 e 4. |
| Painel da professora | Há participantes, mãos, ajuda, moderação e telas. Faltam etapa e estado de salvamento por criança na visão reunida. Os cartões expõem vários botões completos, apesar de a proposta prever uma ação contextual e menu. Isso precisa de revisão de uso com oito crianças. |
| Cursor e indicações visuais | Cursor identificado e destaques por alvo estão presentes. O cursor usa coordenadas normalizadas do contêiner; não há sincronização equivalente de arquivo/rolagem/viewport do editor. É preciso validar a correspondência visual em tamanhos diferentes. |
| Microfone, câmera, mãos e chat | Controles presentes, inclusive abaixar mãos individualmente e em grupo. O chat tem a inconsistência do achado 8. |
| Gravação e replay seletivos | Fontes limitadas à professora principal e demonstração; revisão antes de publicar e acesso temporário. Finalização/recuperação precisa dos achados 3–6 e de ensaio externo. |
| Mural e continuidade na assinatura | Publicação usa o snapshot confirmado e autorização entre Members/Hub. A assinatura pode continuar o mesmo workspace sem reabrir material ou replay expirado. Testes focados passaram. |
| Avatar e quarto | A jornada reutiliza o perfil e seus direitos existentes. A concessão de acesso foi examinada; a experiência visual completa de uma família nova ainda precisa ser percorrida. |
| Efeitos de câmera | Processamento local e desligamento da câmera quando o efeito falha. Teste de processamento com navegador passou; qualidade, CPU e uso real em máquinas das famílias ainda não foram medidos. |
| Identidade visual | O código reutiliza componentes e tokens da plataforma. Isso não comprova renderização correta: paletas, contraste, teclado, foco, larguras e densidade do painel continuam sem conferência visual completa neste review. |

As limitações já registradas na entrega continuam válidas: **Como Fazer** em outra aba; Blocos/Ponte, sem Pro/WebContainer nessa sala; snapshots de até 2 MB; matrícula manual; recuperação operacional de gravações após reinício; ausência de geração automática de legendas revisadas; compartilhamento acompanhado voltado a Chrome/Edge em computador. Elas não devem ser confundidas com novos defeitos descobertos nesta revisão.

**Arquitetura, manutenção e infraestrutura**

A separação entre conteúdo reutilizável, turma, aula e ocorrência permite preservar história sem duplicar cursos. A separação entre grant comercial e autorização de chamada também é adequada. Revisões, época de autoria e confirmação de pausa antes da assistência formam uma base útil; os achados mostram pontos em que a coordenação entre essas partes ainda está incompleta.

Há dois limites de escala concretos. [live.repository.ts](../packages/members/src/infrastructure/persistence/drizzle/live.repository.ts), linha 178, carrega todas as turmas e seus agregados antes da filtragem do catálogo, sem paginação. O custo cresce com o histórico, não apenas com as oito crianças presentes. [live-workspace.repository.ts](../packages/members/src/infrastructure/persistence/drizzle/live-workspace.repository.ts), linha 101, usa um advisory lock global para escritores de todas as turmas. É uma escolha explícita para o piloto, mas pode serializar salvamentos, renovações e cursores de salas independentes. Não foi demonstrado gargalo sob carga; são pontos para medir e corrigir antes de aumentar concorrência.

`LiveService`, `LiveClassroom` e `LiveWorkspace` concentram ciclo de vida, ações, sincronização e apresentação. Os defeitos de prazo, assistência e replay reforçam a necessidade de contratos claros entre esses estados. Recomenda-se extrair responsabilidades por comportamento depois de corrigir a consistência, preservando testes de integração. Não há justificativa nesta revisão para eliminar indiscriminadamente código semelhante dos processos isolados de mídia. Nenhum export foi classificado como código morto com evidência suficiente para recomendar remoção; não foi feita uma prova exaustiva de alcançabilidade de todos os exports do monorepo.

O SFU/TURN continua sendo Cloudflare; o serviço próprio grava com Chromium/FFmpeg, e os objetos ficam no R2. Isso atende à escolha de evitar outro fornecedor de videoconferência, mas **não comprova custo adicional zero**. A revisão não executou carga real nem mediu preços ou consumo. O gate `LIVE_MEDIA_READY=false` deve continuar fechado até as correções e o ensaio previstos. O gravador inicia com limite de um job simultâneo; aumentar capacidade depende de medição.

**Escopo e evidências executadas nesta revisão**

O [inventário](live-review-2026-10-14/changed-files.json) contém 215 caminhos alterados/novos em 11 pacotes, incluindo código, testes, configuração e metadados. Foram examinados os fluxos do módulo e seus pontos de integração em Core, Members, member-shell, Studio, Kids, Admin, Auth, Hub, Gateway, gravador e supervisor, além da proposta e do registro de implementação. O inventário não significa leitura linha a linha de todos os snapshots gerados ou uma auditoria de todo o monorepo. Alterações de marketing e da proposta de editor com IA ficaram fora do escopo.

| Verificação executada | Resultado |
| --- | --- |
| Members: serviços, HTTP, materiais, publicação, mídia e repositórios ao vivo | 61 testes aprovados |
| member-shell: estado, cliente, materiais, mídia, prévia e rotas ao vivo | 23 aprovados |
| Gravador: receptor Chromium/FFmpeg e efeitos | 6 aprovados |
| Supervisor de mídia | 5 aprovados |
| Kids: aprendizagem e navegação ao vivo | 28 aprovados |
| Studio: observação, persistência, preview e isolamento de capa | 130 aprovados |
| Kids: regressões de aulas gravadas e salvamento de atividades | 35 aprovados |
| Hub: acesso e Mural | 57 aprovados |
| Auth: servidor HTTP | 109 aprovados |
| Gateway: configuração de rotas | 34 aprovados |
| Core: políticas ao vivo | 3 aprovados |
| **Total dos testes existentes selecionados** | **491 aprovados, zero falhas nessas execuções** |
| Novas reproduções de revisão | 7 aprovadas, 29 asserções; demonstram os defeitos atuais |
| Typecheck Members, member-shell, Admin, Kids, Studio, gravador e supervisor | Aprovados nos sete pacotes |
| `git diff --check` | Aprovado |

Os testes de banco utilizam PostgreSQL local e as migrações da área ao vivo. As reproduções de domínio simples usam o repositório em memória; as de reconciliação e assistência do gravador usam banco real com transporte simulado. Testes de captura usam Chromium/FFmpeg e armazenamento de teste, não Cloudflare/R2 reais. As reproduções de interface usam uma fronteira simulada do Studio ou seu serviço de persistência real; não substituem um ensaio visual.

A execução selecionada do Studio em happy-dom emitiu avisos `NotSupportedError` sobre carregamento de script `data:` desabilitado no ambiente; terminou com zero falhas. Isso não foi apresentado como prova de renderização real. Não foi feito novo build de produção nesta revisão. Resultados do build registrado na implementação anterior não foram somados às evidências frescas acima.

Os testes novos ficam fora da suíte de aceitação porque suas asserções comprovam o comportamento defeituoso. Depois das correções, devem ser convertidos em expectativas de preservação/recuperação e incorporados ao pacote apropriado. Para reproduzir a evidência atual, a partir da raiz:

```powershell
bun test ./.audits/live-review-2026-10-14/reproductions.test.ts
bun test --preload ./packages/community-kids/test-setup.ts ./.audits/live-review-2026-10-14/workspace-ui.test.ts
bun test --preload ./packages/studio/test-setup.ts ./.audits/live-review-2026-10-14/persistence-ui.test.ts
```

O primeiro comando depende do PostgreSQL de testes local e prepara uma base de revisão dedicada. Não deve ser apontado para banco de produção.

**Sequência de correção e validação recomendada**

1. Preservar trabalho local e confirmação de salvamento: achados 1 e 2.
2. Completar cancelamento da ajuda, reconciliação e encerramento da gravação: achados 3, 4 e 5.
3. Tornar histórico de replay e calendário da reposição coerentes: achados 6 e 7.
4. Corrigir composição do chat e completar a revisão do painel: achado 8 e matriz de proposta.
5. Exercitar as mesmas falhas com rede lenta/interrompida, duas abas e troca de perfil; validar persistência e autoria com PostgreSQL.
6. Fazer conferência visual e de acessibilidade nas paletas e larguras reais, incluindo oito participantes e equipamentos diferentes.
7. Executar ensaio Linux/Railway/Cloudflare/R2 com oito dispositivos, gravação seletiva, perda de supervisão, retomada, expiração e medição de consumo antes de abrir o gate de mídia.
