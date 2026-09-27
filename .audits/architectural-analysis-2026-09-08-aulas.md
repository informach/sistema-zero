# Revisão completa da implementação de aulas interativas

Escopo: commit `aab691c5e549afe19a501c52a8ede7aa0a4137f6`, comparado a `d40f8fd9`, e correções desta revisão. Worktree `sistema-zero-aulas`, branch `feat/aulas-interativas`. Revisão restrita ao trabalho das aulas: 187 arquivos, incluindo 63 documentos/artefatos, 3 snapshots do Drizzle e 21 exclusões. O trabalho de Molda no checkout original não faz parte deste lote.

## Resultado

Sete defeitos confirmados foram reproduzidos antes da correção. A implementação inicial já chegou a staging pelo [CI 34278479416](https://github.com/informach/sistema-zero/actions/runs/34278479416), com sucesso inclusive no deploy. As correções e a verificação adicional estão descritas abaixo.

O código oferece seções, autoria, importação, atividades dentro da aula e acompanhamento. Isso não significa que os 27 roteiros adaptados já estejam publicados: os 118 trechos de vídeo ainda precisam de produção/upload no Vimeo e os manifestos não foram aplicados aos cursos existentes. O percurso autenticado completo continua exigindo validação em staging.

## Defeitos corrigidos

Todos os achados abaixo têm confiança alta, evidência de falha anterior e teste de regressão passando após a correção. Prioridade indica o impacto antes da correção.

| ID | Prioridade | Problema e consequência | Correção e evidência |
| --- | --- | --- | --- |
| R1 | P1 | O admin oferecia Estúdio/Pinta como experimento sem entrega, mas a API descartava `purpose`. O campo havia sido adicionado aos DTOs de contexto do Pensa. A atividade voltava a exigir entrega. | Campo movido para os schemas reais dos blocos de Estúdio/Pinta. Testes HTTP de criação, edição, configuração inválida e conclusão sem entrega em `members/tests/integration/learning.test.ts`. As duas criações falhavam na asserção de `purpose` antes da correção. |
| R2 | P1 | Uma sequência errada podia ser aprovada se o checkpoint posterior estivesse correto: a avaliação sobrescrevia a reprovação da atividade. | O checkpoint só avalia aprovação depois de a atividade principal passar. Teste cobre sequência errada/checkpoint certo, sequência certa/checkpoint errado e ambos certos em `core/tests/learning.test.ts`. |
| R3 | P1 | A posição por vídeo e a navegação usavam tabelas novas, mas os cinco leitores de retomada/última atividade continuavam consultando apenas o progresso legado. “Continuar curso” podia abrir uma aula antiga e o histórico ignorava a atividade nova. | Agregação das três fontes reais: posição legada, progresso dos blocos e navegação. Deduplicação por aula; posição legada preservada. Teste PostgreSQL verifica os cinco métodos, ordenação temporal, navegação de volta, isolamento de usuário e ausência de duplicatas em `members/tests/db/learning-migrations.test.ts`. |
| R4 | P2 | A prévia de uma atividade individual funcionava, mas “Prévia da sequência” não transmitia o conteúdo de autoria necessário à conferência. O botão ficava desabilitado. | A prévia sem contexto de aluno fornece o bloco completo ao avaliador local. O player do aluno continua recebendo o contrato público sem gabarito. Teste DOM em `community-kids/tests/lesson-sections.test.tsx`. |
| R5 | P2 | Uma resposta de rede do perfil anterior podia substituir o conjunto de atualizações locais do perfil atual e apagar o progresso exibido. | Atualizações atrasadas são recusadas quando pertencem a outro perfil/aula. Teste DOM simula A → B, resposta de B e chegada tardia de A. Não houve evidência de mistura de dados entre irmãos no banco. |
| R6 | P2 | O importador não chamava a sincronização de conhecimento usada pela autoria normal. Textos novos/alterados não entravam na base do Zappy. | Importação bem-sucedida agenda sincronização pelo fluxo existente, com lotes de três e indicação de processamento no admin. Também reprocessa textos preservados, permitindo retomar uma falha. Vídeos existentes não são reextraídos. Teste isolado da rota real cobre sucesso, importação rejeitada e falha de indexação sem desfazer a importação ou impedir os demais textos. |
| R7 | P2 | O acompanhamento do professor mostrava a quantidade de experimentos, mas omitia os valores efetivamente testados nos três modelos nativos. | Exibição dos valores testados e do último teste, distinguindo-o de uma alteração no controle ainda não testada. Três testes DOM em `admin/tests/lesson-learning-panel.test.tsx`. |

## Cobertura da revisão

| Área | Arquivos do lote inicial | Verificação realizada |
| --- | ---: | --- |
| Core | 4 | Contratos de atividades, avaliação, gabaritos privados, limites de estado, manifestos, referências de seções e remoção do export da prática. |
| Members | 57 | Serviços, domínio, DTOs e rotas, acesso, carreira, conclusão/entregas, revisões, idempotência, importação transacional, CAS de autoria, clone, relatórios, SQL, migrations e purga. Revisados também os leitores legados de retomada afetados pelo novo modelo. |
| Member-shell | 19 | Player compartilhado, instância dos editores, estado por perfil/revisão, retomada de vídeo/seção, Vimeo, interações, HTML isolado, ajuda e BFFs. |
| Kids e Adult | 29 | Integração do player, contexto do perfil, conclusão, recados, painel dos pais, navegação e remoção de UI/rotas da prática. As oito rotas de aprendizagem delegam ao mesmo BFF compartilhado. |
| Admin | 12 | Formulários de blocos, Vimeo/TUS existente, organização, prévia, importação, controle de revisão, acompanhamento e contexto de recados. |
| Gateway e CI | 3 | Destinos/permissões das rotas e execução obrigatória do teste de upgrade em banco exclusivo no CI. |
| Conteúdo e documentos | 63 | Contratos dos 27 manifestos, objetivos, explicações, modelos/gabaritos, passos de aplicação e continuidade dos cursos; cinco fragmentos HTML; pendências de produção e integridade das fontes. |

### Arquitetura e preservação

- Blocos continuam pertencendo à aula. A seção referencia seus IDs; não duplica os blocos nem cria uma aula nova.
- Um mesmo bloco do Estúdio/Pinta pode ser escolhido em várias seções. O editor visitado permanece montado ao ser ocultado, com seu estado preservado. Um bloco diferente representa outra atividade. O teste DOM confirma identidade e estado do elemento entre seções; a integração completa com salvamento e entrega reais ainda deve ser percorrida em staging.
- Os cursos incorporados mantêm projeto e entregas. O Jogo do Meu Jeito abre as ferramentas externas, preservando o percurso de projetos livres, exportação/importação e publicação.
- Carreira, quizzes anteriores, submissões, desbloqueios e XP continuam nos serviços existentes. Atividade essencial entra na condição de conclusão; a experiência opcional não produz uma entrega artificial.
- Importação preserva IDs existentes, quizzes, projetos e mídias; exige rascunho e fingerprint atual. Clone remapeia seções e projetos sem copiar progresso do aluno. Mídia pendente impede publicação.
- Migrations 0078–0080 acrescentam estruturas e progresso, removem a tabela da prática e organizam aulas antigas. O histórico de migrations aplicadas foi preservado. A posição legada serve como fallback do primeiro vídeo; contas não são inventadas para migrar progresso sem proprietário conhecido.
- A busca no código executável não encontrou os antigos `PracticeService`, `PracticeWorkshop`, `practiceRepository`, `practice_sessions`, `/practice/` ou `/praticar`. As referências históricas de migration/teste de remoção permanecem intencionalmente. Nenhuma flag foi adicionada.
- Não foi identificado serviço paralelo duplicando a lógica da carreira ou da conclusão. Os contratos interativos ficam no Core, regras no Members e player/BFF compartilhados no member-shell. Shims de rota do Next e tipos de transporte seguem a estrutura existente; o defeito dos DTOs reforça a necessidade dos testes HTTP adicionados.

### Segurança, estado e acompanhamento

- Conferência essencial no servidor, revisão do bloco e identidade da tentativa; gabaritos de sequência/checkpoint não fazem parte do conteúdo público do aluno.
- Rotas usam perfil ativo, conta, audiência e acesso ao curso; o BFF vincula escritas ao perfil exibido e bloqueia impersonação somente leitura. Casos de acesso cruzado cobertos por testes HTTP/SQL.
- HTML usa sandbox sem origem compartilhada, CSP e protocolo com instância e janela de origem verificadas. O HTML obrigatório exige checkpoint nativo; um evento do iframe não equivale a aprovação confiável.
- Relatórios dos pais usam temas realmente visitados na semana, com filtros de perfil, conta, audiência e conteúdo atual. Não interpretam erros como diagnóstico da criança. Purga remove o novo progresso e impede recriação após exclusão de conta.
- O histórico de tentativas de versões anteriores fica preservado, mas o painel atual só apresenta respostas detalhadas das revisões atuais e um aviso sobre registros antigos. Não há reprodução visual da versão antiga da atividade.
- A sincronização do Zappy mantém o processamento assíncrono existente. Se o serviço externo falhar, a importação continua salva; a falha fica no log e pode ser recuperada pela reimportação/backfill existente. Não foi criada uma fila durável nova nesta revisão.

### UX e conteúdo

O código mantém paleta/componentes existentes, um objetivo por seção, índice livre, pistas sem punição, ajuda contextual, controles com rótulos e foco no título ao navegar. Em telas menores o material e o editor ficam empilhados; a bancada em duas colunas começa em `2xl`. A legibilidade, o espaço útil do editor em notebooks e a reprodução de mídia precisam da conferência visual autenticada.

Os 27 arquivos originais em Documents foram reconferidos por SHA-256 e continuam idênticos ao catálogo. As contagens dos manifestos coincidem com as seções e os 118 trechos catalogados. Foram revisadas as explicações, atividades e sequências técnicas propostas; o importador não produz os vídeos, não os envia ao Vimeo e não substitui automaticamente as aulas publicadas.

## Verificação final

Executada em 08/09/2026 e concluída às 19h38 (America/Sao_Paulo). Logs locais em `.tmp/review-*.log`; nenhum banco de staging/produção foi usado para a suíte de upgrade.

| Verificação | Comando/alcance | Resultado |
| --- | --- | --- |
| Suíte global | `bun run --filter '*' --sequential test` | 14.342 testes passaram em 27 pacotes, zero falhas; 47 skips condicionais. |
| Members com banco real e upgrade | `bun run test` com `TEST_DATABASE_URL` e `LEARNING_QA_DATABASE_URL`, em PostgreSQL 16 local descartável | 982 testes, 5.781 asserções, zero falhas e nenhum skip. Inclui os testes de upgrade que ficam condicionais na suíte global. |
| Lint/formatação | `bun run ci` | 4.921 arquivos, zero erros. Um aviso preexistente de tamanho em `studio/playground/moldaDemoAssets.json`, que não pertence a este lote. |
| Schema | `bun run db:generate` no Members | Nenhuma mudança de schema a gerar. |
| Originais/manifestos | SHA-256 e comparação das contagens do catálogo | 27 fontes preservadas; seções e 118 pendências de clipes consistentes. |
| Builds | `bun run build` em admin, community-kids e community, em sequência | Os três passaram (35,5 s, 51,7 s e 57,4 s). |
| Tipos | `bun run typecheck` em core, members, member-shell, api-gateway, admin, community e community-kids | Os sete passaram, exit code 0. |

Os 16 cenários públicos Playwright e os E2E do CI da entrega inicial continuam como evidência histórica; não foram reapresentados como execução nova desta revisão. O container PostgreSQL exclusivo desta revisão foi encerrado depois dos testes.

As sete correções foram verificadas localmente e compõem um único commit destinado à branch `staging`. O CI/deploy desse novo commit é uma execução distinta do deploy inicial; os resultados locais acima não significam que essa execução remota já terminou.

## Limites de aceite

- Sem navegação manual autenticada completa no admin/Kids/Adult neste ambiente. O navegador integrado anteriormente retornou lista vazia; DOM, HTTP, SQL e os cenários públicos existentes não substituem esse aceite.
- Sem upload/reprodução de uma mídia real nova no Vimeo nesta revisão. O uploader existente foi preservado, incluindo o contrato de vídeos não listados.
- Sem importação/publicação dos 27 roteiros em staging. É necessário produzir/vincular as mídias, revisar os materiais preservados na importação e percorrer cada aula e sua continuidade.
- Produção depende da validação do usuário em staging. Esta revisão não promove produção.
