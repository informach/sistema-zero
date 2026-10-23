# Members submissão/autoria — revisão em andamento

Escopo: SubmitStudioProjectService, GalleryDeliveryService, validação activity/project e content-admin, config/composition e rotas Members, gateway timeout específico55s, Shell signal forwarding. Conhecidos pendentes explicitamente excluídos: ProxyEngine não encaminha request.signal, gallery BFF signal, section progression/Admin UI. Nenhum produto/teste permanente editado nem comando pesado executado pelo revisor.

092001 VALID/pending, reprodução própria `bun test ./.cache/review092-initial-abort.test.ts` cwd Members:0pass2fail/3asserts exit1, fases iniciais sem signal race/check. Gate liberado em finally. Não é falha SQLcancelreal nem SDK, e não atribui transporteHTTP à chamada direta de serviço.

Baseline permanente fresh `bun test tests/integration/python-activity-submission.test.ts tests/unit/python-activity-authoring.test.ts`:7pass0fail/46asserts exit0. HTTP real Elysia/context/submit com compiler transport controlado, não qualificação CPython/SDK. Preserva notas serverstructure/clientbehavior, stickyapproval e recusa publicação/revisão/critérios retirados durante inspeção, serviço ausente/projetoIDforeign, autoria language/profile/Turtle.

Leitura confirmou reautorização de aula/critérios/revisão/acesso/section/baseline antes/durante/depoishelper e antesmirror/upsert; Drizzleupsert também verifica revision sob sharelock na transação. Gallerycallback server-only refaz prepare e o commit interno é exclusivo member-shell autenticado. Demais provas/triagem ainda em andamento; não declarar sublote/featureglobal concluídos.

## Encerramento scoped — 1/1/0

092001 resolvida após correção e revalidação independente; nenhum segundo achado confirmado. Histórico acima preserva estado inicial. Lifetime50s é criado na entrada antes de I/O, com signalrequest e check inicial; owned usa CoreawaitWithSignal em read/checkAccess/unlock/section/binding, authorizefresh e mirror/upsert. Requestsignal chega ao inspector45s e à fencepersistence5s, combinada com operação. Capturas authoredRevision/activityRevision/baselineId e projectID escopado preservadas; não realiza fallbackJS para Python sem serviço.

Comando fresh no Members `bun test ./.cache/review092-initial-abort.test.ts ./.cache/review092-context-fences.test.ts tests/unit/studio-submission-lifetime.test.ts tests/integration/python-activity-submission.test.ts tests/unit/python-activity-authoring.test.ts tests/integration/gallery-delivery.test.ts`:19pass0fail/128asserts exit0. Originais iniciais agora rejeitam ownerabort antesgate terminar e não despacham read se já retirados. Próprios HTTP adicionais3/18 provam entitlement retirada e baseline substituída/removida durante retorno do compiler controlado, sem persistência. Permanente lifetime preserva exatamente o cenário causal.

`bun test ./.cache/review092-persistence-abort.test.ts`:2pass0fail/16asserts exit0. Serviço real/inspectorverifier/contextos reais, portas de teacherappend/upsert controladas aguardam gate e ignoram signal. Após ownerabort, promise rejeitaAbortError antes gate. Late mirror pode terminar fisicamente, mas não inicia upsert; late upsert pode persistir fisicamente, mas não inicia awards. Todos gates liberados e continuations terminadas em finally. Não é qualificação de SQLcancel/transactionabort, nem garantia de rollback de efeito já despachado.

Regressão independente JS `bun test tests/unit/studio-activity.test.ts`:21pass/63asserts exit0; `bun test tests/integration/studio.test.ts`:42pass/151asserts exit0. Inclui gradinghíbrido/gateweights, submissão/recados/retry/backup/stickyapproval/ownerperfil. Total desse recorte fresh84pass/358asserts em4invocações; não equivale fullsuite.

Biome fresh13files source/wiring/tests:exit0, Checked13/no fixes, 1warning lint/complexity/useOptionalChain em python-activity-submission.test.ts212. Somente formatter/linter, não convertido em issue. Sem produção/permanentes editados pelo revisor. Readback YAML exige1VALIDmedium/resolved e meta1/1/0.

Limites: compilertransport controlado nas provasHTTP, sem CPython/SDKnovo/Cloudflare; não executar SQL/TSC/build/browser próprio. MembersTSCroot1771 ainda emcurso no momento da revisão. ProxyEngine requestsignal, galleryBFFsignal e sectionprogression/AdminUI pendentes conhecidos permanecem fora do recorte. Sem claimConfig/ProxycancelamentoE2E, performance ou featureglobal.
