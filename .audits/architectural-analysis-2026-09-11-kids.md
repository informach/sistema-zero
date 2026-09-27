**Comunidade Kids — investigação e proposta para recados, ajuda e progresso**

11/09/2026 · Base local: `4b08fec7` · Proposta para discussão, sem implementação funcional.

Registro da investigação original. A implementação posteriormente autorizada e sua validação estão
no [plano de implementação](../docs/plans/2026-09-11-kids-recados-progresso-implementacao.md).

A recomendação é evoluir os serviços existentes de conversas e progresso. Há uma base consistente de isolamento por perfil, evidências de aprendizagem e conclusão idempotente. As prioridades são corrigir uma rota ausente no gateway, tornar a configuração dos critérios fiel ao comportamento do servidor e oferecer ao professor composição de recados individuais e coletivos.

O público dos recados foi confirmado nesta conversa: **um aluno, alunos de um curso ou todos do Kids**.

**Diagnóstico dos três fluxos**

| Pedido | Situação encontrada | Consequência |
| --- | --- | --- |
| Professor iniciar recado individual | Backend e BFF já possuem POST de criação de conversa `general`. A caixa principal só lista e responde. O painel de uma entrega também consegue iniciar a conversa daquele contexto. | Falta principalmente o fluxo de composição e seleção correta do perfil destinatário. |
| Professor enviar a um curso ou a todos | O contrato existente recebe um único `userId`; não há um fluxo coletivo de recados com público e acompanhamento de entregas. | Exige operação coletiva no servidor, além da interface. |
| “Preciso de ajuda” | Vai para `lesson_section` na mesma caixa de Recados, com curso, aula, seção e perfil. | O encaminhamento existe; a descoberta e o retorno podem melhorar. |
| Verificação por seção | Implementada no Core, Members, player e editor; ativada ao publicar estrutura com critérios válidos. | Precisa corrigir o acesso pelo gateway e alinhar critérios, evidências e interface. |

**1. Recados: o que existe e o fluxo proposto**

A criação individual já passa por [POST no BFF](../packages/admin/src/app/api/members/teacher-threads/route.ts), [rota do Members](../packages/members/src/interfaces/http/routes/admin.routes.ts:296) e [serviço de conversas](../packages/members/src/application/teacher-threads/teacher-threads.service.ts:287). As mensagens mantêm autoria, histórico, leitura do aluno e leitura individual de cada professor. A posse da conversa e a audiência restringem a consulta do aluno.

Na [caixa principal](../packages/admin/src/app/admin/professor/recados/recados-client.tsx), falta “Novo recado”. O link na ficha do aluno atualmente apenas filtra essa caixa, mesmo quando ainda não existe conversa.

Proposta de interação:

1. O professor abre **Novo recado** pela caixa ou pela ficha de uma criança.
2. Escolhe **Um aluno**, **Alunos de um curso** ou **Todos do Kids**.
3. Para envio individual, busca pela criança ou pelo responsável e seleciona explicitamente o perfil. Mostrar criança, responsável e identificação suficiente para distinguir homônimos.
4. Escreve assunto e mensagem, usando o editor rico e os modelos de resposta já existentes.
5. Revisa a mensagem e o público. No coletivo, vê a quantidade e pode inspecionar os destinatários antes de enviar.
6. O resultado aparece em **Enviados**, com a situação das entregas. A criança recebe no mesmo lugar dos recados atuais e responde em conversa privada.

Proponho considerar, por padrão, perfis infantis ativos com acesso vigente ao público escolhido. Para um curso, usar o acesso efetivo daquele perfil ao curso; para todos, a elegibilidade à comunidade Kids. A lista de conversas existentes não serve como cadastro de destinatários: excluiria crianças que nunca escreveram. A busca atual por responsável, limitada a 20 contas, também não deve ser reutilizada como enumerador do público inteiro.

No coletivo, recomendo um registro da mensagem original e uma lista persistida de destinatários, com uma entrega/conversa privada por perfil. Essa lista fica fixada no envio; novos alunos não recebem retroativamente um aviso antigo. Avisos permanentes para futuros alunos seriam outra configuração.

O servidor deve resolver perfil, conta responsável, audiência e acesso, sem depender da combinação de identificadores enviada pelo navegador. Cada par mensagem coletiva/perfil deve ser único, e repetir uma tentativa de entrega deve reutilizar a mesma conversa e mensagem. Um processamento persistente em lotes permite retomar falhas. A tela precisa distinguir “em processamento”, “entregue” e “falhou”; “lido” significa abertura registrada, sem inferir compreensão.

Agrupar o envio coletivo na visão do professor evita criar centenas de linhas iguais na caixa. As respostas individuais entram normalmente na fila de conversas.

Melhorias ligadas à caixa:

- Separar **Não lidos**, que é pessoal por professor, de **Aguardando resposta**, que representa trabalho da equipe. Abrir uma dúvida não significa resolvê-la.
- Oferecer estados simples como “Aguardando professor”, “Aguardando aluno” e “Resolvido”. Nova mensagem do aluno reabre a pendência.
- Corrigir “Marcar todas como lidas”: a lista aceita filtro por aluno/busca, mas a ação só envia contexto, audiência e curso. Reproduzi uma lista com uma conversa visível em que a ação marcou duas conversas como lidas. A consulta da ação em lote deve usar o mesmo escopo resolvido da lista.
- Atualizar os contadores após ler/responder, ao recuperar foco e durante uso ativo. O [sino do Kids](../packages/community-kids/src/components/kids/recados-bell.tsx:24) hoje busca o contador apenas ao montar.
- No admin, marcar como lida depois que a conversa tiver sido carregada com sucesso. O diálogo atual dispara carregamento e marcação em paralelo.

**2. “Preciso de ajuda”: destino confirmado e melhorias**

O percurso encontrado é:

`Aula → section-help no BFF → gateway → LearningService.help → TeacherThreadsService → Recados do professor → resposta → Recados da criança`

A [interface](../packages/member-shell/src/components/lesson-sections.tsx:346) envia o texto e a seção com proteção de troca de perfil. O [serviço](../packages/members/src/application/learning/learning.service.ts:113) verifica acesso à aula e à seção e cria/reutiliza o contexto `lessonId:sectionId`. O título contém aula e seção. A [configuração do gateway](../packages/api-gateway/gateway.config.ts:2058) expõe essa rota.

A reprodução local confirmou dois pedidos na mesma seção reutilizando uma conversa, a conversa não lida na caixa do professor e a resposta não lida na caixa do aluno. O admin já possui “Acompanhamento da aula” no diálogo e destaca a seção de origem. Esse acompanhamento mostra respostas e interações das descobertas; ainda não reúne todos os critérios, notas, entregas e marcos da seção.

Lacunas de experiência:

- O rótulo **Dúvida na aula** existe, mas está ausente do seletor de contexto do admin. Com “Todos”, as dúvidas aparecem; selecionar “Recado geral” não as inclui.
- O envio devolve `threadId`, mas a interface ignora esse identificador e só exibe uma confirmação em texto.
- O aluno não tem um atalho nessa confirmação para acompanhar a conversa, nem um retorno específico da conversa à seção.
- As pendências da etapa e os resultados dos objetivos de projeto não são reunidos no acompanhamento do professor.
- O contexto deduplica a conversa, mas o pedido não tem identificador idempotente para deduplicar a mensagem após uma resposta de rede perdida.

Proposta: manter tudo em Recados, acrescentar o filtro, mostrar **Pedido enviado — Ver conversa**, oferecer **Voltar à seção** e registrar a seção, a revisão e os critérios pendentes no momento da dúvida. O professor poderá ver tanto esse registro quanto o estado atual. O texto continua preservado quando o envio falha, como já acontece. Falhas de rede, limite de envio e troca de perfil devem ter orientações diferentes.

**3. Conclusão e avanço: funcionamento atual**

O modelo atual está em [SectionCompletion](../packages/core/src/learning/section-progression.ts), com uma lista de blocos verificáveis e, opcionalmente, objetivos estruturais de projeto. A publicação recusa critérios vazios/inválidos, referências fora da seção e entregas fora da última seção de fechamento.

O [serviço de progressão](../packages/members/src/application/learning/section-progression.service.ts:53) calcula estados `locked`, `available` e `completed`, persiste marcos e libera a primeira seção ainda não concluída. O percentual conta seções com pesos iguais. Navegar, salvar respostas ou registrar posição de vídeo não conclui uma seção.

O servidor restringe leitura e ações de seções futuras. O projeto contínuo pode aparecer antes do fechamento, mas sua entrega fica no final. A última seção é obrigatória antes de concluir a aula; recompensas continuam ligadas ao comando de conclusão da aula. Seções já concluídas e aulas concluídas são preservadas. A prévia permite revisão livre sem representar progresso de aluno.

| Bloco ou atividade | O que verifica hoje | Direção recomendada |
| --- | --- | --- |
| Texto, diálogo, imagem, áudio, vídeo e ebook | Não comprovam aprendizagem nem são critérios diretos de seção. Vídeo tem retomada. | Uma checagem curta sobre o objetivo quando necessária. Evitar perguntas repetidas em microetapas apenas expositivas; reorganizá-las em seções significativas. |
| Embed externo | Não tem avaliação nativa de conclusão. | Pergunta corrigida pelo servidor, entrega identificável ou avaliação explícita do professor quando necessária. |
| Pergunta curta | Alternativa correta, corrigida no servidor. É escolha de alternativa, não correção de texto livre. | Autor configura pergunta, opções, resposta e explicação no mesmo lugar do critério. |
| Ordenar/associar | Ordem/relações conferidas no servidor. | Usar quando a relação ou sequência é o objetivo, com pistas e novas tentativas. |
| Prever/observar e comparar | Participação e, quando configurada, checagem final. Para servir de critério de seção, essas descobertas exigem resposta corrigível. | Preservar a previsão inicial como observação; avaliar a conclusão depois da exploração. |
| Experimento e HTML interativo | Parte da participação vem do navegador; a pergunta adicional fornece correção no servidor. | Usar a interação como evidência de exploração e a checagem como evidência do conceito. |
| Estúdio durante uma etapa | Cinco regras estruturais: repetição, variável, função, chamada e presença de bloco. | Modelos visuais que verifiquem estrutura válida, área, encaixe e parâmetros relevantes. |
| Entrega do Estúdio | Envio; se houver nota de corte, também aprovação na atividade. A correção mistura estrutura no servidor e outros resultados do cliente. | Distinguir “enviado” e “verificado”; reservar validação confiável para critérios obrigatórios de resultado. |
| Pinta | Envio do desenho; não há verificador pedagógico visual. Experimento não exige entrega. | Verificar propriedades objetivas do arquivo quando elas forem o objetivo. Para conteúdo criativo, usar checagem de conceito e/ou retorno humano. |
| Certificado e “em breve” | Fluxos próprios; certificado não aceita progressão por seção e aula em produção não libera o percurso normal. | Manter essas exceções explícitas no editor. |

**Problemas de correção encontrados**

**Alta prioridade — rota de verificação ausente.** O player chama `POST /members/lessons/:lessonId/sections/:sectionId/project-check` e o Members implementa essa rota, mas ela não existe em `gateway.config.ts`. O resolvedor real não encontra correspondência. Assim, com essa configuração, o caminho normal da interface não chega ao verificador. Os testes do serviço e do BFF passam separadamente porque não atravessam o gateway real. A correção precisa incluir rota, autenticação, identidade de perfil, token interno, limite compatível com projeto e teste de percurso entre as camadas.

**Alta prioridade — critérios desmarcados ainda bloqueiam.** O editor afirma que o aluno deve cumprir os critérios selecionados. Porém, o servidor calcula pendências sobre todos os blocos da seção: preserva `required: true` de descobertas desmarcadas e exige quizzes com nota mínima mesmo sem seleção. Nas duas reproduções, a validação da configuração aceitou a seção, a pergunta escolhida foi aprovada e o avanço continuou bloqueado pelo bloco desmarcado. [Causa no serviço](../packages/members/src/application/learning/section-progression.service.ts:90) e [regras reutilizadas](../packages/core/src/learning/requirements.ts).

**Limite das verificações de projeto.** “Usar um bloco” procura o tipo em qualquer ponto de `blocksState`. A reprodução aceitou um bloco isolado marcado como desativado, mesmo sem comportamento executável na IR. As outras regras estruturais também verificam presença, não demonstram funcionamento completo. Além disso, notas das entregas podem usar resultados `behavior/testcase/code` reportados pelo cliente; o backend marca essa origem, mas a aprovação considera esses resultados. Uma nota aprovada não equivale necessariamente a execução comprovada no servidor. [Implementação](../packages/members/src/domain/course/studio-activity.ts:129).

**Feedback insuficiente.** O verificador devolve resultados por objetivo, mas [a interface](../packages/member-shell/src/components/studio/section-project-check.tsx:41) mostra apenas uma mensagem geral. A criança não vê qual objetivo cumpriu e o que falta.

**Histórico heterogêneo.** Descobertas guardam tentativas por revisão. Na publicação, mudanças nas perguntas/nota do quiz apagam suas tentativas e mudanças na atividade do Estúdio limpam a correção anterior, preservando o projeto. Há invalidação implementada; o problema para acompanhamento é a perda de evidência histórica, não uma suposta ausência de invalidação. [Publicação](../packages/members/src/infrastructure/persistence/drizzle/lesson-draft.repository.ts:480).

**Proposta de configuração para o professor**

Cada seção deve apresentar uma pergunta central: **“O que o aluno precisa demonstrar para continuar?”**

Oferecer quatro modelos principais: **Responder uma pergunta**, **Resolver uma atividade**, **Cumprir um objetivo no projeto** e **Entregar a criação**. A revisão do professor pode ser uma opção adicional para objetivos que dependam de avaliação humana, mas não deve bloquear toda seção por padrão.

A interface sugere modelos compatíveis com o conteúdo e o tipo de projeto. O professor escolhe blocos pelo nome visual do catálogo, informa parâmetros quando necessários e recebe um resumo em linguagem natural: “Para continuar, o aluno precisa preparar a tela em Ao iniciar e criar o personagem dino”. IDs e regras técnicas ficam no contrato interno.

Recomendo uma fonte única de obrigatoriedade para aulas com progressão: os critérios explícitos da seção. A nota do quiz define o que significa passar naquele quiz; a seleção na seção define se ele é necessário para avançar. Entregas obrigatórias devem ser geradas e mostradas explicitamente no fechamento. A migração deve transformar as exigências atuais em critérios explícitos antes de remover inferências antigas, preservando o comportamento publicado.

Os critérios selecionados combinam-se por **todos devem ser cumpridos**. Evitaria um editor de expressões arbitrárias. A publicação deve validar compatibilidade, referência, regra executável e mensagem de orientação. Uma simulação no admin deve exercitar o mesmo avaliador e indicar exatamente o que bloquearia o aluno, sem gravar progresso real.

Para etapas práticas, começar por verificações determinísticas específicas: bloco conectado à área correta, configuração relevante, variável inicializada e relação entre ações. Não usar presença de qualquer nó como substituto de comportamento. Quando for necessário comprovar execução, adotar avaliação isolada compatível com o tipo de projeto, com entradas controladas e limites; até existir essa capacidade, usar checagem pedagógica ou revisão humana explícita.

Para a criança, mostrar uma lista curta de objetivos com resultado individual e uma ação principal adequada à etapa. O avanço só deve ficar confirmado depois da persistência da evidência no servidor. Mostrar claramente “verificando”, “objetivo cumprido”, “o que falta” e “não consegui salvar”. Ao concluir a última seção, a ação de concluir a aula continua acionando a mesma lógica idempotente de recompensas.

Recomendo novas tentativas imediatas nas checagens formativas. O quiz tradicional hoje impõe 90 segundos após reprovação; essa decisão deve ser revista quando o quiz for uma porta obrigatória de seção, mantendo proteção técnica contra excesso de requisições sem obrigar uma espera pedagógica fixa.

O acompanhamento do professor deve reunir marcos de seção, critérios pendentes, respostas, notas, entregas e origem da verificação. Guardar revisões e evidências históricas permite explicar por que uma seção foi concluída e qual era o projeto avaliado. Marcos já confirmados continuam preservados; nova edição não deve retirar conquistas silenciosamente. Aprovação ou dispensa manual, se introduzida, precisa de autoria e motivo, separados da simples leitura de recados.

**Conteúdo já preparado**

A leitura dos arquivos atuais confirmou **27 manifestos, 226 seções com critérios, 206 checagens interativas, duas seções com objetivo estrutural e 18 critérios de entrega do Estúdio**. Há **118 vídeos planejados**.

Isso mostra que a infraestrutura foi adotada nos manifestos, mas a maioria das etapas ainda comprova respostas a perguntas. Para uma etapa cujo objetivo é construir algo, responder sobre o conceito pode ser útil sem comprovar que a construção foi feita. Recomendo revisar primeiro os objetivos práticos mais importantes, escolhendo verificações que consigam demonstrá-los, sem substituir todas as perguntas indiscriminadamente.

Esses números descrevem os arquivos locais. O [relatório anterior](../docs/plans/2026-09-10-progresso-secoes-verificacao.md) informa que a ativação depende de migração e publicação. Esta investigação não consultou o estado de publicação ou o banco de produção.

**Alternativas consideradas**

| Abordagem | Benefício | Limite |
| --- | --- | --- |
| Correção mínima e botão “Novo recado” | Entrega menor para os problemas mais visíveis. | Mantém critérios difíceis de entender e verificações práticas limitadas; envio coletivo ainda precisa de persistência própria. |
| Evoluir conversas e progressão existentes — recomendada | Atende aos três pedidos, preserva os fluxos atuais e melhora a confiabilidade com mudanças delimitadas. | Exige alinhar contrato, servidor, gateway, editor, player e conteúdo. |
| Motor universal de avaliações e comunicações | Grande flexibilidade para regras, execução e campanhas futuras. | Custo e complexidade maiores que os necessários para estes fluxos; criaria mais configuração para o professor. |

**Sequência de entrega proposta**

| Etapa | Entrega concreta | Critério de aceite |
| --- | --- | --- |
| 1. Corrigir inconsistências | Rota de project-check, divergência dos critérios, escopo de marcar como lido e filtro de dúvidas. | A mesma ação funciona atravessando o gateway; desmarcar um critério tem efeito coerente; ação em lote não atinge alunos fora do filtro. |
| 2. Recados e retorno da ajuda | Composição individual/coletiva, seleção por perfil e acesso, entregas persistentes, atalhos e atualização de contadores. | Criança sem conversa prévia recebe; curso/todos selecionam público correto; repetição não duplica; cada resposta permanece privada. |
| 3. Autoria e feedback | Modelos de verificação, uma fonte de obrigatoriedade, simulação e resultados por objetivo. | Professor configura e entende a regra sem IDs técnicos; aluno sabe o que falta; erro de gravação não produz avanço falso. |
| 4. Evidências práticas e acompanhamento | Avaliadores compatíveis, revisão dos manifestos e histórico por revisão. | Casos incorretos e corretos reais distinguíveis; projeto/dado avaliado recuperável; marcos existentes preservados. |

Para publicar as mudanças, verificar a migração e o estado efetivo das aulas, testar uma aula de cada modalidade com perfis distintos e percorrer ajuda/resposta, falha de rede, retomada, reprovação, entrega e conclusão. O escopo compartilhado em `member-shell` e `members` também exige preservar o funcionamento da comunidade adulta.

**Evidências desta investigação**

Foram executados **75 testes existentes, todos aprovados**:

| Pacote | Arquivos selecionados | Resultado |
| --- | --- | --- |
| Core | `section-progression`, `lesson-requirements` | 11 passaram |
| Members | integração de `section-progression`, `learning`, `teacher-threads` | 41 passaram |
| Admin | `section-completion-editor`, `lesson-learning-panel` | 4 passaram |
| Kids | `lesson-sections` | 14 passaram |
| Member shell | `learning-routes` | 5 passaram |

O [script de reprodução](kids-flows-2026-09-11/reproduce.ts) usa fixtures sintéticas, repositórios em memória e a configuração real do resolvedor do gateway. Confirma os defeitos descritos e o percurso de ajuda; suas asserções registram o comportamento atual, não correções. Executar na raiz: `bun run .audits/kids-flows-2026-09-11/reproduce.ts`.

Os [logs selecionados](kids-flows-2026-09-11/evidence.txt) registram os resultados. Não houve sessão autenticada no navegador nem verificação em banco real nesta investigação. Nenhum recado foi enviado a usuários reais. As únicas gravações foram os artefatos desta análise.
