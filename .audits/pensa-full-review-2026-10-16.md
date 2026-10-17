# Revisão integral da reestruturação do Pensa

Data: 16/10/2026. Revisão adicional solicitada depois da implementação em lotes.

## Escopo e método

Revisão do diff da entrega, dos arquivos novos e dos consumidores: core, Members/PostgreSQL, gateway, BFF, Pensa, oficinas Kids, Estúdio clássico/Pro, Pinta, host Molda, UI compartilhada, voz/tutor, créditos, recompensas, limpeza, Admin, migrations, CI e documentação. O trabalho concorrente em `packages/molda` e seus documentos foi preservado e não foi tratado como parte desta alteração.

Foram cruzados os requisitos da especificação com os contratos e percursos reais. As falhas funcionais encontradas foram reproduzidas antes da correção; os testes foram repetidos depois. A revisão incluiu consultas estáticas a imports/endpoints antigos, tipos, testes de componente, PostgreSQL real, geração de schema, builds e navegador. Não houve commit, deploy, migração remota nem uso de provedor pago.

## Achados corrigidos

| Prioridade | Problema reproduzido | Correção e evidência |
| --- | --- | --- |
| P1 | A biblioteca da equipe não enviava `x-sz-viewer`; o BFF recusava consulta e download de artes. Os primeiros mocks não reproduziam essa exigência. | Perfil original enviado em todas as chamadas internas da biblioteca e no hook de disponibilidade. Testes agora recusam chamadas sem o header e verificam importação, revisão entregue e troca de perfil. O header não é enviado ao storage externo. |
| P1 | “Tentar de novo” não enviava `retry=true`. Mesmo com o flag, a resposta podia continuar mostrando `failed` enquanto o worker começava, deixando a tela aguardar o polling de 30 segundos. | Retry autenticado e idempotente grava `queued` no Members antes da resposta e do agendamento. Etapa, pagador, resultados e orçamento são conservados. Teste PostgreSQL prova a transição e o orçamento; Chromium percorre falha inicial do provedor, retomada e conclusão. |
| P1 | A validação admitia plano em código para executor disponível somente em blocos e runtime incompatível com a dimensão escolhida. | Validação canônica compara autoria e dimensão. O runtime tem dimensão explicitamente cadastrada; geração e inspeção usam essa informação. Testes reproduzem a aceitação indevida e agora exigem recusa. Conversão já salva para Pro continua dispensando setup na disponibilidade. |
| P1 | Existir uma missão de setup não garantia que a programação esperasse por ela nem que incluísse as extensões auxiliares necessárias. | Validação exige dependência transitiva das missões do Estúdio e preparação de todas as extensões usadas. Artes independentes continuam podendo ocorrer em paralelo. Três regressões cobrem ordem, dimensão e preparação incompleta. |
| P1 | Recusas definitivas de checkpoint viravam 503 no BFF; o host Kids também lançava `Error` comum enquanto a UI esperava `PensaApiError`. A combinação podia manter uma identidade de tentativa encerrada. | Status de prepare/commit/restore preservados; transporte Kids usa a classe canônica. Testes de BFF, host e ProjectCare distinguem recusa definitiva de conexão incerta, sem eliminar a idempotência nas falhas ambíguas. |
| P1 | Saída de participante e purga de conta só procuravam artes produzidas em missão `asset`; uma arte `existing`, ligada diretamente à integração, continuava marcada como válida. | Regra pura única para referências existentes, entregas e dependentes, utilizada pela saída da equipe e pela purga. PostgreSQL prova invalidação da integração/teste final e preservação do jogo de outra conta. |
| P2 | Uma consulta iniciada antes de uma mutação podia sobrescrever o resultado confirmado na interface. Falha ao trocar de projeto conservava o projeto anterior na seleção visual. | Leituras têm sequência própria, invalidada por navegação e mutação. A abertura limpa a seleção anterior; respostas antigas não substituem o estado atual. Duas regressões controlam a ordem real das respostas. |
| P2 | Pinta/Molda recebiam todos os slots do jogo na sessão da missão; podiam mostrar ou tentar vincular elementos de outra missão. O intent inicial do Pinta usava a mesma lista ampla. | Sessão projeta somente os slots da missão aberta e recusa vínculo fora desse conjunto antes de confirmar o arquivo. O Pinta escolhe seu intent nessa projeção. Teste cobre lista e recusa antecipada. |
| P2 | Um plano composto por integração podia concluir a construção sem receber o marco de primeira funcionalidade, deixando recompensa e funil incoerentes. | Integração também produz `first_feature`, uma vez por projeto. Teste PostgreSQL confirma o marco em um plano válido sem missão `feature`. |
| P2 | Um projeto pausado ainda podia aceitar/editar o rascunho. A restauração forçava pausa e mudava metadados; um programador que não fosse a dona não conseguiria retomar sozinho. | Comandos respeitam pausa/arquivamento, mantendo o rascunho. Restore conserva os metadados atuais e invalida a conferência final. A UI mostra pausa somente para quem pode administrá-la. Testes reais cobrem recusa, retomada e metadados preservados. |
| P2 | Playground do Pinta ainda passava o contrato de checklist removido. Os demos precisavam fornecer estado real para o recolhimento controlado. | Pinta usa a missão funcional; seu playground entra no typecheck. Pinta e Estúdio usam o seletor `missao` e estado local de recolhimento. Chromium abriu o Pinta real, recolheu/reabriu o painel e verificou erro visível ao tentar sair. |
| P2 | O instalador, importado estaticamente pelo painel de missão, puxava Blockly e o catálogo completo ao abrir o editor. O limite real de bundle reprovou: 22 arquivos contra o máximo de 20. | Instalador nativo carrega somente após escolha explícita; o projeto é relido antes da instalação. O guarda voltou a passar com 20 arquivos e 3.794.971 bytes crus / 1.173.750 gzip na rota do editor. Nenhum teto de tamanho, quantidade ou tempo foi aumentado. |

Também foram alinhados `PensaProjectBase` entre cliente e servidor, validação de bilhetes de download sem assertions, tratamento da atualização manual da tela e documentação de retry/restauração.

## Verificação desta revisão

| Verificação | Resultado |
| --- | --- |
| Core completo | 1.188 testes passaram; typecheck passou |
| Members geral | 1.363 passaram, 318 testes de banco pulados nessa rodada geral, nenhum fail; prova PostgreSQL Pensa executada separadamente |
| Members PostgreSQL dedicado | 24 testes passaram, 171 asserções, nenhum skip/fail; typecheck passou |
| Member-shell completo | 1.440 testes passaram; typecheck final passou |
| Gateway completo | 248 testes passaram |
| Pensa completo | 20 testes passaram; typecheck passou |
| UI completo | 101 testes passaram |
| Pinta completo | 1.537 testes passaram; typecheck com playground passou |
| Kids completo | 1.413 testes passaram; typecheck passou; regressões finais de transporte/equipe/sessão também passaram |
| Admin completo | 591 testes passaram na repetição, sem alterar o teste ou seu limite; build passou |
| Estúdio completo | 9.093 testes passaram, nenhum fail, após preparar dependências e corrigir o import do instalador; typecheck passou |
| Pensa Chromium | 3 testes de definição, aceite, equipe/foco e celular passaram |
| Pensa Chromium com banco/API reais | Passou, incluindo falha do provedor, retomada, aceite, bloqueio de missão futura, configuração salva, conclusão, reabertura e recarga |
| Pinta real no Chromium | Passou: missão funcional, recolhimento, reabertura e falha visível na saída; captura inspecionada |
| Persistência do Estúdio em navegador | Chromium e WebKit passaram nas provas de pagehide, recarga e conflito entre abas |
| Schema Drizzle | `db:generate`: nenhuma diferença entre schema e migrations |
| Builds finais | Admin e Kids passaram; Kids reconstruído depois do ajuste do instalador |
| Biome e diff | 210 arquivos passaram no Biome; diff da entrega passou em `git diff --check` |

A primeira rodada ampliada do Estúdio teve quatro falhas: compilador npm do runtime ausente, WebKit ausente, uma análise Three acima do tempo sob carga e a regressão real de bundle. Os pré-requisitos foram instalados pelo mesmo procedimento da CI. Compilação real, persistência Chromium/WebKit, análise Three isolada e guarda de bundle passaram depois da preparação/correção. A suíte completa foi repetida; seu resultado final consta acima.

A primeira rodada do Admin teve um timeout no teste de PDF em Node enquanto outras verificações pesadas executavam. A repetição completa passou com os mesmos 591 testes e os mesmos limites. O total das suítes da tabela é 17.018 testes aprovados; testes repetidos e provas extras de navegador não foram somados novamente.

## Resultado

Os achados reproduzidos nesta revisão foram corrigidos e verificados. Não há achado bloqueador conhecido pendente no escopo da entrega. O schema continua correspondendo às migrations 0126–0128, sem DDL adicional nesta revisão.

Pontos de entrada das correções:

- [Validação de plano e recursos](../packages/core/src/pensa/plan.ts) e [impacto de artes indisponíveis](../packages/core/src/pensa/changes.ts).
- [Retomada durável](../packages/members/src/infrastructure/persistence/drizzle/pensa-operations.repository.ts) e [BFF](../packages/member-shell/src/routes/pensa.ts).
- [Sequenciamento da interface](../packages/pensa/src/components/usePensaProject.ts) e [transporte Kids](../packages/community-kids/src/components/kids/pensa-client.tsx).
- [Sessão de missão](../packages/community-kids/src/components/kids/use-pensa-mission-session.tsx) e [biblioteca da equipe](../packages/community-kids/src/lib/pensa-team-library.ts).
- [Proteção/restauração](../packages/member-shell/src/server/pensa/protection.ts) e [transações de checkpoint](../packages/members/src/infrastructure/persistence/drizzle/pensa-checkpoints.repository.ts).
- [Instalação nativa sob demanda](../packages/studio/src/studio/TaskGuidePanel.tsx) e [percurso Chromium com falha/retomada](../packages/pensa/e2e/native.spec.ts).

## Limites da conclusão

Testes determinísticos comprovam os contratos e comportamentos exercitados. Não houve avaliação de respostas de um modelo pago nem observação de crianças usando o produto. O teste nativo de navegador usa identidade de QA, provedor determinístico e fronteira local de arquivos; editores e protocolos têm provas separadas, sem alegar que esse percurso abre todos os editores completos.

As migrations foram ensaiadas em PostgreSQL local, tanto em banco vazio quanto no schema anterior, incluindo sentinelas e manutenção/rollback. Aplicação no ambiente publicado continua dependendo da janela operacional documentada. Esta revisão não publicou código nem alterou dados remotos.
