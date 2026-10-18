# Atividades Python — contrato, execução e correção

Continuação do escopo aprovado, seção12 da proposta de16/10 e loteC do plano de inspeção de17/10. Usar executing-plans e revisões independentes entre os sublotes. Não fazer commits intermediários nem deploy.

## Decisões

Atividades legadas sem linguagem continuam JavaScript. Atividades Python declaram linguagem, versão e perfil. A linguagem da atividade deve corresponder ao projeto; regras de DOM/SZIR não são Python. A receita de observação é limitada e pertence à atividade autorizada, não ao programa do aluno. Turtle é opcional; critérios Turtle exigem a extensão instalada.

Estrutura usa fatos CPython completos da revisão exata. O navegador produz feedback formativo identificado como cliente. Members reconstrói o snapshot submetido e obtém seus próprios fatos pelo cliente S2S autorizado. O relatório enviado pelo aluno nunca vira prova estrutural servidor. Gates conservam a exigência de peso estrutural suficiente para impedir aprovação somente com resultados de comportamento forjados.

O executor de comportamento usa um frame/worker descartável dedicado. As verificações de console, variáveis, funções e Turtle executam dentro desse worker, nunca no BFF ou no processo Node. Não modificar a fonte, desativar mainloop, reentrar no interpretador suspenso nem avaliar código Python em JavaScript. Um pedido de correção é atendido pelo próprio fluxo Python em um checkpoint cooperativo Turtle, ou depois do término normal do programa. Timeout encerra o worker. Observáveis são capturados antes de testes que possam alterar o programa. Resultados são limitados e validados em todas as fronteiras; continuam sem autoridade servidor.

## A — contrato canônico e grading puro

- Criar Core `studio/python-activity.ts`: definição estrita, JSON limitado antes de schemas recursivos, regras Python, receita, resultados limitados, validação de perfil/extensão e autoria de gates. Não alterar schemas JavaScript.
- Cobrir leitura legada separada, regras incompatíveis, limites/ciclos/getters, valores não JSON, IDs duplicados, pesos, igualdade tipada e score arredondado no gate.
- Definir grading compartilhado a partir dos resultados e um avaliador estrutural fornecido pelo proprietário da evidência. Somente esse avaliador pode gerar `verifiedBy: server`; demais resultados sempre cliente.
- Revisão independente antes de habilitar consumidores.

## B — executor protegido

- Criar grader Python confiável, carregado somente em sessões de atividade; obter namespace do mesmo `__main__`. Testes recebem valores JSON copiados; comparar somente tipos JSON/tuplas sem executar protocolos de igualdade de objetos arbitrários. Asserção do professor é corpo de função Python com contexto documentado.
- Estender protocolos prepare/check/result com definição capturada antes dos awaits e validação estrita. Supervisor aceita um único pedido e resultado correspondente, valida IDs/tipos/limites e recusa mensagens fora da ordem. Frame/session cercam identidade, sequência, timeout e retirada.
- Turtle oferece checkpoint privado opcional e wake do renderer sem sintetizar eventos do aluno. Preservar timers, callbacks, mainloop e todas as sessões comuns.
- Provar CPython WASM real: console parcial e saída volumosa, retorno de função/async, igualdade bool/número, erro de asserção, Turtle mainloop sem timer, teste que desenha sem recursão, timeout/stop/stale. Provar sessão comum sem importação de Turtle e sem regressão.
- Revisão independente e correções.

## C — consumidores coordenados

- Atualizar juntos Studio activity/context/runner/UI, DTO Members, tipos/admin activity-builder e validação de autoria. Runner escolhe linguagem explicitamente e cerca revisão/runtime/contexto/epoch após cada await.
- Injetar no Members o cliente S2S Core com URL/token exclusivos de servidor e política aprovada. Submissão/progressão validam contexto antes/depois da inspeção e antes de persistir resultado; falha de serviço não aprova gate.
- Preservar entregas sem atividade, JS legado, sticky passedAt/XP/idempotência e autorização contextual Pro. Configuração Python ausente gera erro explícito.
- Exercitar feedback/envio/progressão e autoria em livre, aula gravada, authoring e sala, incluindo revogação, perfil errado, respostas tardias, alteração do projeto e gate falsificado. Revisão independente integrada antes da próxima etapa.

## Estado

Checkpoint posterior18/10 (prevalece sobre históricos abaixo): autoria e objetivos Python de seção implementados no Core/Members/Admin/Shell. Reviews093–097 fechadas; 096 retirou geração antiga do ensaio ao mudar autor/aula/draft, 097 exige autoria atual para progresso live sem retirar análise readonly. Members HTTP+LiveWorkspace real/in-memory+DTO30/178 passou (transporte compilador controlado). Admin lifecycle/form/rehearsal5/31, StudioHandle público JS/Py18/91 e ShellDOM/liveprepare+BFF7/38 verdes. AdminTSC4 e ShellTSC1 EXIT0; fullStudioTSC1 sessão4058 ainda em execução. Nenhuma outra heavy.

Prova nova do helper Admin em navegador: `bun scripts/verify-python-activity-browser.ts --sections`, browser3 EXIT0, `.cache/studio-python-l0/section-browser/7aa39df7-8735-41e0-9337-7d416f20c9de`, 24cenários Chrome/Edge ×Classic/Pro ×valid/wrongfile/invalid/profile/captured/cancel. Usa helperprod/parser/contextEnvironment/runPythonActivity/CPythonWASM real e serviço/política AuthorizeAuthoringRuntimeService atrás de HTTPBun com staffQAfixo/draftport em memória. NÃO login/BFF/gateway/SQL/SDK, desempenho ou UI React completa. SHA das fontes, critérios, projeto/ref/scope/snapshotmetadata e decisões autorais arquivados. Browser1 históricoasserçãoaboutblank errado; browser2 observouiframe1na rejeição antecipada doowner; runneragora removeframesSINCRONAMENTE nosignalabort eantesawaitdispose. Permanente lifecycle2/8request/envabort +regressões23/68 passaram com warningsDOMiframe loadingdisabled; review098/artefatos independente em andamento, não tratar como encerrada.

CompatibilidadegaleriaPython permanece aberta: precisa conservar assets exatos e aceitar treePro sem aumentar corpo do gateway. Próximo desenho: referência HMAC pequena à cópia imutável+partes, URLs temporárias ligadas a storagebase explicitamente configurada, leitor Members próprio com limites/decompressão/hash/reautorização; JS inline continua compatível. Não implementar stripping para Python nem enviar base64grande no gateway. Transporte e materialização devem ser revisados juntos antes de qualificar.

Checkpoint atual18/10 (prevalece): MembersTSC2 EXIT0 e extração portátil revisada limpa73/405. Autoria Python no admin implementada; review0931/1/0 encerrada, permanentes editor7/37 e próprios3/26 passam. AdminTSC2 única heavy ativa7877, log l6-python-activity-admin-typecheck-2.log. Proxy encaminha request.signal e cancela sem retry/healthfailure/latência fictícia; review094001 VALID corrigido com settleCircuitTrial atômico no storage (InMemory+RedisLua), permanentes14/64 incluem HTTP real e socketabort; aguardando execução Redisreal dedicada para fechar094. Novos testes Redis opcionais exigem GATEWAY_TEST_REDIS_URL, não executados ainda.

Galeria lifecycle agora propaga request.signal no BFF prepare/read/copy/commit/HMAC e Members routes/prepare/commit; operação commit50s desdeentrada, gateway55s/BFF60s. Owner-races entre etapas impedem sucessores após retirada; cópiaR2 jáadmitida pode concluir fisicamente. BFF11/42 e Members13/101 (gallery2/PySubmission) passaram; revisão independente solicitada. NÃO é qualificação completa da galeria Python: BFForiginal exige files (PyPro usa tree) e retira assets do programa; tratar em recorte de compatibilidade, inclusive parts/hash/quotas antes de habilitar jogoTurtle da galeria. Nenhum commit/merge/push/deploy.

### Próximo recorte C — objetivos das seções

1. Preservar SectionStructureRule e critérios JavaScript legados; acrescentar SectionProjectCheck Python explícito com linguagem/perfil e StudioPythonStructureRule canônica. Mistura de linguagens/perfis, escopo incompatível com initialProject e regraJS emPython devem impedir publicação. Somente regras estruturais autorizam progressão; converter listaPython para atividade estrutural100% sem resultados do cliente.
2. Reutilizar PythonActivityInspectionService e configuração única no composition-root para submissão e seção. LearningService é dono do prazo50s desdeantesda primeiraautorização; callback fresco obtém aula/acesso/unlock/seção/revisão/workspace/baseline sem criar ciclo Sections→AuthorizeLesson→Sections. Capturar critérios/revisões/identidades antesawait; reautorizar duranteinspeção eantes persistência. Repositório continua recebendo revisões atuais e não admite publicação retirada/critério alterado/projeto deoutraaula. A mesma inspeçãoS2S produzfatospróprios, sem regex/SZIR/Pythonclientflags comoautoridade.
3. Propagar signal SectionProjectCheck→BFF→gateway55s→Members→inspector; invalidar resultado formativo quando projeto/contexto muda. EditorAdmin usa categorias/regrasPython earquivo opcional, mantémJS. Simulação eensaio Python usam compiladorPython real assíncrono e flagscliente, sem chamar avaliadorJS nem fingir aprovação.
4. Testar contrato/autoria/DTO/publicação, factsreaiscontroladostransporte, revogação/revisão/baseline/entitlement/cancel/lateSQL, JSlegado eUI. Revisão independente antes daqualificação integrada SDK/fourhosts. GaleriaPython com assets fica recorte próprio emseguida.

Atualização18/10: Ccliente eDTO implementados, review0913/3/0 encerrada e browser8 vintecenários Chrome/Edge qualificados no escopo funcional. Sequência controlesACK→observe→grading, readinessmainloop/publicupdate, callbacksoutermost, stdinindependente e receita structure-only executada. Apresentação offscreen própria limitada, playercomumRAF preservado. Artefatos56284241-2444-406d-9709-15a224a5b92e; limiteconsumersemreceipt/capturaseparado, semMember/SDK/performanceclaim.

Members submissão/prodconfig/autoria serverwired, review0921/1/0 encerrada e HTTP/JS/lifetime56/227 passaram. Inspector090ownfacts+45s; operação50s desdeentrada; postpersist5s limitadoaoowner; route55s/BFF60s. ProxyEngine ainda nãoencaminhasignaloriginal; AdminUI eprogressão ainda nãoimplementados. FullStudioTSC2 EXIT0 antesextraçãoportátil; MembersTSC1 revelou fronteiratipoDOM, corrigida separando assets/Pythontypes/pathhelpers/documentguards portáteis, preservandoexports/semDOMlibbackend. Unidades48/285 passaram; revisãoextração eMembersTSC2(session75144) pendentes. Ver checkpoint18/10 noexecution-state para detalhes/limites atuais; parágrafosabaixo sãohistóricos.

A implementado e revisado0872/2/0 resolvido. Dez testes de contrato, normalização NFKC e preservação de todas as chaves JSON; prova independente incluiu CPython3.14.2 e matriz de pesos/arredondamento. Core TSC2 passou antes das correções087; typecheck runtime3 posterior passou com os imports atualizados.

B implementado, revisão0881/1/0 resolvida: encapsular a asserção por AST preserva strings multilinha e continuadas; sete testes CPython nativo passaram. Fronteiras/protocolo/console/render24/157 passaram, mais teste de feedbackframe posterior20/136. Sessão agora preserva causa técnica nos comandos pendentes; stop normal continua AbortError, conferido independentemente4/22. TSCruntime3 passou; runtime4 encontrou somente inferência do expected em novo teste, corrigida como unknown na fronteira; reexecução com fixture QA ainda pendente.

Browser2 e9241af6-ba50-4a5c-9612-f1bd23070b28 EXIT0: oito cenários Chrome/Edge, CPython WASM3.14.2, async/JSON/Turtle/mainloop/teste que desenha/captura/wake/timeout/stop. Não cobre Members/SDK/performance. Revisão encontrou perda de __proto__ apenas no serializador de objetos do Playwright ao arquivar a evidência, não na execução. Harness corrigido para transportar JSON textual e validar as chaves/SHAs; browser3 em execução e revisão089 pendente dessa prova. Não tratar browser2 como arquivo fiel dos critérios especiais.

Browser3 083fc977-c711-4fe3-a747-3bef39b32d88 EXIT0, artefatos conferidos independentemente: fontes/SHAs/revisões e critérios lossless, Unicode/async/strings e os demais oito cenários confirmados. Review0891/1/0 resolvida. RuntimeTSC5 EXIT0 inclui o harness. B qualificado funcionalmente nesses caminhos, sem claim de desempenho, consumidores, SDK ou nova regressão JS em navegador.

C em implementação. Novo PythonActivityInspectionService no Members usa snapshot original/S2S/fatos verificados e autorização fresca; unidade5/18 passou com política real e transporte controlado. Serviço ainda sem wiring, revisão ou typecheck próprio. Orçamento planejado45s inspeção +5s cleanup, gateway específico55s e BFF60s; o defaultgateway15s não atende ao cold jáobservado. Não aumentar prazos globais. Propagar retirada do request até o job e revalidar contexto também antes de persistir/espelhar recado.

Prova leve do adaptador oficial t.Transform/Decode do Elysia passou: Core valida/normaliza Python na borda, erros recebem422, dicionários especiais preservados e JS legado aceito. Ainda não instalado nos DTOs reais. Nenhum consumidor Python habilitado por este documento. A prova de preview d22 é uma baseline anterior às alterações de produto deste lote; regenerar fingerprint e qualificar os caminhos afetados ao fechar o sublote.
