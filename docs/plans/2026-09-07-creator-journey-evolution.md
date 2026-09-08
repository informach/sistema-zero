# Evolução do Sistema Zero pela Carreira do Criador

Implementação solicitada em 07/09/2026, na branch `staging`. A entrega mantém a
carreira como eixo da plataforma. Direção visual: oficina de criação com os tokens
atuais de azul, céu/navy, laranja e amarelo, sem trocar o tema de adulto/admin.

**Estado:** alterações de produto das fases 1–6 implementadas e verificadas por
código, testes e build. A preparação operacional da fase 0 está documentada;
inventário do catálogo real, revisão visual, piloto com famílias e implantação ainda
não realizados. A fase 7 depende da avaliação desse piloto e não está habilitada.

**Revisão posterior:** o [relatório de revisão](2026-09-07-creator-journey-review.md)
registra seis problemas corrigidos e a nova verificação de 2.742 testes, TypeScript,
Biome e build. As contagens da seção Verificação abaixo são da implementação inicial.

## Contratos preservados

- Oito níveis e 49 posições obrigatórias: 1 de Primeiros Passos e 8 por cada uma das
  seis etapas seguintes, na sequência atual 2D/3D. O curso-base continua primeiro;
  não foi imposta uma sequência nova entre as demais posições.
- Faísca (`noob`, 0): criação nas aulas. Construtor (`coder`, 1): Estúdio livre/Pinta.
  Inventor (`hacker`, 9): Pensa/Zappy. Explorador (`explorer`, 17): Molda.
  As etapas seguintes continuam em 25, 33, 41 e 49 posições; Bridge permanece no
  `champion` (41) e Pro no `god` (49). Posse comercial continua sendo exigida.
- Posse comercial pela conta; progresso, permissões pedagógicas, planos e trabalhos
  pelo perfil. Irmãos não compartilham conquistas ou histórico de prática.
- Obrigatório Kids qualifica com conclusão **e** publicação. Bônus concede blocos
  pela conclusão, sem promover rank, e libera depois de concluir sua etapa.
- Estúdio livre usa a união dos blocos conquistados. Configuração das aulas é
  independente; extensões continuam opt-in e o fallback de currículo vazio permanece.
- IDs, posições, ledger, rascunhos e projetos preservados. Nenhuma substituição
  automática de trabalho local por cópia da nuvem e nenhuma retirada de conquista.

## Entregas por fase

| Fase | Implementado | Condição operacional restante |
| --- | --- | --- |
| 0 — Base | Política compartilhada; mapa dos serviços; matriz de aceitação; consultas de inventário; coortes por conta e instruções de reversão | Executar inventário/baseline no catálogo real e selecionar famílias |
| 1 — Consistência | Próxima ação; ferramentas por posse/rank; missões por conteúdo possível; outbox de publicação e estado de propagação; concessões persistentes; prontidão da autoria | Conferir propagação entre serviços no ambiente de implantação e conciliar casos históricos conhecidos |
| 2 — Kids | Cinco grupos de navegação; início e curso orientados à próxima ação; marcos distintos no mapa/cartão; celebração com progresso confirmado; visual de oficina | Revisão visual e percurso completo com teclado/celular; avaliação com alunos |
| 3 — Criação | Trabalhos da nuvem e planos no hub; retomada pelo ID com preferência local; Pensa → Molda; contexto da IA pelos blocos conquistados; retorno ao plano com salvamento protegido | Piloto de troca entre ferramentas e casos reais de conflito/offline |
| 4 — Acompanhamento | Área dedicada de responsáveis; carreira e pendências no dashboard/relatório; comunidade e recados; abertura da entrega pela conversa do professor | Conferir relatório com dados reais e avaliar clareza com responsáveis |
| 5 — Prática | Sessões de até cinco perguntas já estudadas; feedback, revisão da aula, rascunho e histórico próprios; isolamento e idempotência; sem XP/moedas/rank | Revisão pedagógica do conteúdo e piloto por família; flag começa desligada |
| 6 — Adulto/admin | Retomada do curso e acesso a devolutivas no adulto; prontidão na tabela de cursos; contexto da entrega e erro recuperável no admin; componentes/temas próprios mantidos | Revisão visual dos fluxos afetados |
| 7 — Outros conhecimentos | Oito atividades de matemática aplicada especificadas no guia de implantação | Implementação/liberação dependem da avaliação da prática; finanças ficam para depois |

## Comportamentos entregues

### Jornada, aulas e publicação

`@sistemazero/core/career` concentra qualificação, próxima ação, disponibilidade de
ferramentas e coorte. Início, mapa, cartões e detalhe de curso distinguem aulas
concluídas de publicação. `GetMyCourse` resolve uma aula publicada e alcançável para
publicar; falta de conteúdo apresenta ajuda, sem apagar a conclusão.

A celebração de aula usa a resposta de progresso do servidor. Ao terminar as aulas
de um curso obrigatório ainda sem publicação, aponta para a conferência do projeto.
Uma aula nova no catálogo não apaga os marcos já conquistados.

Hub grava thread e outbox na mesma transação. O worker usa lease, novas tentativas
com espera crescente e confirmação; reenviar o mesmo marco é idempotente. O Kids
consulta none/pending/delivered por perfil/conta, mostra a confirmação em trânsito e
limita a atualização automática, com opção manual. O ledger de Members permanece
como autoridade da conquista. Não houve backfill especulativo de publicações antigas.

Concessões de blocos são congeladas junto aos marcos de curso na transação do award;
a conciliação legada continua. A autoria impede remover, converter ou despublicar a
última atividade publicada de vitrine em qualquer curso obrigatório. O lock do curso
protege inclusive alterações concorrentes em blocos, aulas e módulos.

As missões Kids conservam a atribuição determinística do período. Filtram criação
livre antes da liberação do Estúdio e metas de conteúdo sem oportunidades suficientes
nos cursos acessíveis ao perfil. Excluem conteúdo em breve, barreiras sequenciais e
eventos já premiados. Missões completas/recebidas permanecem. Metas sociais e de
cosméticos conservam as regras atuais; não foi criado um incentivo novo de gastos.

### Oficina e Pensa → Molda

A nova navegação agrupa Início, Carreira, Criar, Comunidade e Meu espaço, mantendo as
URLs das ferramentas. O hub mostra disponibilidade e próximas conquistas; a área de
trabalhos lista metadados da nuvem e planos. Ela informa que trabalhos somente locais
continuam nas galerias. A retomada do Estúdio conserva o ID e prefere o rascunho local.

Pensa usa os blocos conquistados ao gerar/revisar tarefas. Molda é destino para modelos,
texturas e céus de planos 3D quando está disponível. Backend revalida posse e carreira
no handoff e no progresso. O guia permite vincular uma criação salva existente, preserva
IDs de passos/critérios e usa controle de versão do plano. Antes de sair ou concluir,
o aluno guarda e fecha a criação pelo Voltar do próprio Molda.

### Pais, professores, adulto e prática

`/responsavel` exige sessão da conta e verificação de responsável. Reusa o dashboard
com carreira, ferramentas incluídas, pendências e próxima conquista, além de perguntas
para conversar sobre as criações. `/perfis` continua gerenciando a família. O relatório
semanal usa a mesma noção de publicação pendente; nenhum relatório real foi enviado.

O professor abre a entrega de uma conversa com o perfil, curso, aula e bloco daquela
conversa, mantendo o rascunho da resposta. Erro ao buscar a conversa apresenta nova
tentativa. O adulto pode retomar seu curso e consultar devolutivas, inclusive após
terminar os cursos disponíveis, sem receber o tema visual Kids.

`/praticar` só inicia sessões para contas habilitadas em Members. Requer aula concluída
e quiz aprovado, congela até cinco perguntas e oculta respostas corretas até o envio.
A primeira resposta confirmada é imutável; retentativas não duplicam a sessão.
Histórico é isolado por perfil+conta, sobrevive a edições do curso e à saída do piloto,
e é removido na exclusão da conta. Rascunho local usa perfil+sessão. Não há escrita em
XP, moedas, progresso das aulas ou marcos da carreira.

## Verificação

Execução em dados sintéticos; logs locais em `.audits/creator-journey/`.

| Pacote | Testes de pacote | TypeScript | Biome |
| --- | ---: | --- | --- |
| Members | 981 | Passou | Passou |
| Kids | 612 | Passou no build | Passou |
| member-shell | 469 | Passou | Passou |
| Hub | 140 | Passou | Passou |
| API gateway | 216 | Passou | Passou |
| Admin | 218 | Passou | Passou |
| Pensa | 39 | Passou | Passou |
| Core | 54 | Passou | Passou |
| Comunidade adulta | 5 | Passou | Passou |

Build de produção Kids passou: compilação, TypeScript e geração de 59 páginas.
As provas PostgreSQL incluem outbox/migrations do Hub, proteção concorrente de autoria,
histórico/idempotência/purge de prática, oportunidades de missões e acréscimo do destino
Molda preservando valores anteriores. As consultas de auditoria foram executadas com
sucesso no banco sintético em transações somente leitura.

Uma primeira compilação apontou um campo obrigatório ausente nos novos dados de teste
da celebração (`lastCompletedAt`); a fixture foi corrigida e o build passou novamente.
A revisão visual e os percursos completos entre serviços não foram executados: o
navegador conectado retornou uma lista vazia. Testes de componentes não substituem
essa validação, nem representam pesquisa com crianças.

## Implantação e trabalho condicionado

O [guia operacional](creator-journey-rollout.md) contém a ordem das quatro migrations,
flags por conta, reversão, consultas de baseline, matriz de aceitação e proposta das
oito atividades de matemática. `CREATOR_WORKSHOP_ACCOUNTS` (Kids) controla navegação
agrupada/trabalhos; `PRACTICE_PILOT_ACCOUNTS` (Members) controla novas sessões. Ausentes
ou `none`, começam desligadas. As correções de integridade independem dessas flags.

O banco de desenvolvimento disponível não contém `members.courses`; portanto, o
catálogo real e a baseline continuam sem medição. O piloto precisa dessa medição,
da revisão visual e de observação de alunos/responsáveis antes de expansão. A fase 7
não foi antecipada: há conteúdo proposto para revisão, sem rota ou liberação pública.

As alterações anteriores do usuário em Molda e persistência foram preservadas.
Nenhum commit, push, implantação, aplicação de migration em staging/produção ou envio
de mensagens reais foi realizado nesta execução.
