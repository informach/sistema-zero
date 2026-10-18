# Mapeamento técnico dos recursos Kids e da comunidade adulta

Data: 18 de outubro de 2026. Base local: commit `fddb734b7`, com alterações de Molda já presentes no workspace. Escopo: experiência dos dois aplicativos, motor de aulas, ferramentas de criação, acesso, autoria, comunidade, atendimento e venda de cursos. Análise estática; disponibilidade em produção depende de configuração, conteúdo e validação operacional.

O núcleo de aprendizagem já atende adultos e crianças. A maior distância está na experiência de criação fora da aula e em integrações que o aplicativo adulto ainda não expõe. Reaproveitar requer distinguir componente compartilhado, integração completa e produto comercial pronto.

Não foi feita auditoria global de código morto. As conclusões abaixo tratam dos caminhos envolvidos na transferência de recursos entre as comunidades. Não foram consultados banco de produção, faturamento ou métricas reais de alunos.

A proposta vigente é a [paridade técnica da comunidade adulta](../docs/plans/2026-10-18-comunidade-adulta-paridade-tecnica-proposta.md), com ferramentas e gamificação completas. As recomendações iniciais sobre criação pedagógica e oferta foram retiradas do escopo após esclarecimento de Júlio.

## Inventário verificável

O inventário de `src/app` encontrou 17 arquivos `page.tsx` no adulto e 47 no Kids; dentro de `api`, 68 arquivos `route.ts` no adulto e 133 no Kids. Os 68 caminhos de API do adulto também existem no Kids; o Kids possui 65 caminhos adicionais. Contagem inclui autenticação e administração familiar, portanto não representa quantidade de funcionalidades vendáveis nem percentual de prontidão.

Os aplicativos instanciam `createShell` com públicos distintos:

- Adulto: `packages/community/src/server/shell.ts`, `audience: 'adult'`, cookies `sz_member`.
- Kids: `packages/community-kids/src/server/shell.ts`, `audience: 'kids'`, cookies `sz_kids`.

O caminho comercial usa `pro` no funil; o domínio de cursos usa `adult`. Essa diferença já existe e deve ser preservada na configuração de uma nova oferta.

## Matriz funcional

Legenda: **compartilhado** indica implementação consumida pelo adulto; **parcial** indica componentes existentes com diferenças de integração; **Kids** indica superfície ou política ainda exclusiva. Todas as classificações se referem ao código local.

| Recurso | Kids | Adulto | Trabalho necessário e utilidade |
| --- | --- | --- | --- |
| Login, recuperação, compras e perfil | Integrados, com fluxo familiar adicional | Integrados | Reusar. Não reproduzir seleção de criança no adulto |
| Catálogo e matrícula por curso | Integrados à jornada | Catálogo e grade de cursos | Cadastrar oferta e curso adulto; verificar pagamento até acesso |
| Retomar curso, aula e vídeo | Disponível | Disponível | Aperfeiçoar indicação do próximo objetivo; não construir outro motor |
| Aula por seções com objetivo | Motor compartilhado | Motor compartilhado | Produzir aulas adultas com etapas curtas e objetivos observáveis |
| Vídeo, texto, áudio, imagem, materiais e e-book | Disponíveis | Disponíveis | Conteúdo novo, revisão de linguagem e de acessibilidade |
| Quiz e exercícios interativos | Motor e apresentação infantil | Motor consumido pelo renderer adulto | Adaptar perguntas e exemplos; validar atividades escolhidas no adulto |
| Cenas para experimentar conceitos | Biblioteca de cenas de jogos e arte | Renderer compartilhado | Reusar cenas pertinentes; arte e narrativa não são universais |
| Regras de avanço e conclusão | Integradas | Integradas | Configurar por aula; evitar impor progressão infantil inteira |
| Estúdio clássico dentro da aula | Integrado | Componente e rotas de entrega presentes | Melhor ponto de partida para jogo 2D, sujeito a QA real |
| Projeto contínuo entre aulas | Contrato `chain` e carryover | Mesmo componente e rotas presentes | Configurar cadeias e testar retomada, reenvio e mudança de aula |
| Entrega ao professor | Disponível | Rotas e componente compartilhados | Definir rubrica, equipe e quantidade de revisões incluídas |
| Revisão, histórico e recados | Disponíveis | Recados e devolutivas presentes | Operar fila e capacidade de atendimento |
| Rascunho de Estúdio/Pinta salvo na conta | Contrato ligado ao player e transporte de criações | Player não fornece `lessonDrafts`; faltam rotas de criações | Prioridade para curso prático: extrair transporte e integrar no adulto |
| Pinta dentro da aula | Componente e entregas | Componente e rotas presentes | Pode ser usado em atividade guiada; validar no adulto |
| Estúdio Pro dentro da aula | Rota de build e runtime integrados ao Kids | Componente faz referência ao endpoint, mas rota não existe no adulto | Adicionar integração, limites, permissões e QA antes de curso Pro |
| Estúdio livre e lista de projetos | `/estudio`, `/estudio/pro/[id]` e `/criar` | Páginas ausentes | Reusar biblioteca; construir host adulto e política de capacidades |
| Pinta livre | Página, galeria e sincronização | Página ausente | Extrair host e revisar acesso antes de curso de arte |
| Molda livre | Página, host 3D e capacidades por jornada | Página ausente | Reusar editor; integrar host, armazenamento e política adulta |
| Pensa | Planejamento de jogos, missões e equipe | Página ausente; BFF exige sessão Kids ou papel privilegiado | Adaptação de identidade e experiência. Planejamento de apps exige contratos novos |
| Assistente IA do Estúdio | Integração de tutor, créditos e políticas Kids | Rotas e configuração não expostas | Adaptar contexto adulto, acesso, cobrança e limites; não prometer IA ilimitada |
| Publicação, jogar e remix | Mural, página jogável e rotas de publicação | Fórum existe; fluxo especializado não está integrado | Tornar destino e público explícitos; não publicar no Mural infantil |
| Biblioteca Como fazer | Páginas, busca, coleções e conteúdo | Páginas ausentes; links desativados no renderer adulto | Reusar base e componentes de domínio, com apresentação e conteúdo adultos |
| Fórum de comunidade | Clube e Mural especializados | `/comunidade` e espaços por slug | Reusar fórum adulto; configurar espaço e canais do curso |
| Ajuda de acesso e atendimento | Fluxo da família | Portal de helpdesk em `/ajuda` | Reusar; diferenciar problema de acesso de dúvida pedagógica |
| Oficinas ao vivo | Sala, turmas e gravações | Páginas e sala adulta já presentes | Validar operação, capacidade e venda de vaga; não tratar como ausente |
| Certificados | Bloco e validação | Bloco e validação presentes | Configurar critérios reais; certificado não equivale a revisão humana |
| Gamificação | XP, sequência, moedas, conquistas, ranking, missões, avatar e quarto | Eventos e estado adultos já existem; interfaces ausentes e progressão ainda dependente da jornada Kids | Integrar todos os sistemas, com políticas adultas de progressão, elegibilidade e apresentação |
| Autoria e acompanhamento | Admin compartilhado, manifesto, publicação e relatórios | Infraestrutura por curso/público | Reusar operação, filtrando adultos; não construir segundo admin |
| Checkout e entitlements | Funis Kids e serviços centrais | Funil `pro/no-comando-da-ia` e mesmos serviços | Criar funil para curso adulto; preço e acesso continuam no catálogo |

## Achados que governam a implementação

### 1 Salvamento em nuvem é uma lacuna real do adulto

O player adulto preenche `LessonPlayerContextValue` com progresso, identidade e callbacks, mas não passa `lessonDrafts`. O player Kids instancia `lessonDraftCloudFor(viewerId)`, passa o contrato e usa `withSavedDrafts` antes de concluir.

O contrato compartilhado registra explicitamente que a ausência mantém rascunho local. Isso não significa que o adulto perde todo o trabalho: entregas já enviadas e progresso têm persistência própria. Significa que uma edição ainda não entregue não possui o mesmo fluxo de sincronização entre aparelhos do Kids.

Fontes: `packages/community/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx:110`; equivalente Kids, linhas 86 e 185; `packages/member-shell/src/lib/lesson-draft-cloud.ts:1`; `packages/community-kids/src/lib/lesson-draft-cloud.ts:1`.

Direção: mover o transporte reutilizável, marcas, resolução de conflito e coordenador para a biblioteca compartilhada; fornecer identidade e linguagem por aplicativo. Expor os handlers de criações no adulto. Preservar cópia local, indicação de estado e recuperação de conflito.

O acesso ao rascunho da aula deve continuar sendo concedido pelo curso/aula/bloco, sem exigir compra do Estúdio livre. `LessonDraftAccessService` já representa essa separação.

### 2 Componente de Estúdio não significa todas as capacidades integradas

O renderer adulto monta `StudioBlockView`. Projetos Pro nesse componente chamam `/api/studio/pro-runtime/build`, ausente no aplicativo adulto. O adulto também não expõe as rotas de publicação e de criações presentes no Kids.

O primeiro curso pode usar Estúdio clássico, Blocos e Ponte, com projeto inicial configurado e prévia no navegador. Cursos com projetos Pro precisam completar o caminho de build remoto. Não habilitar terminal local indiscriminadamente: a configuração adulta mantém COEP desligado e o runtime remoto existente permite uma integração específica.

Fontes: `packages/member-shell/src/components/lesson-blocks.tsx:80`; `packages/member-shell/src/components/studio/studio-block.tsx:282`; `packages/community/next.config.ts`; `packages/studio/src/studio/config.ts`.

### 3 Publicação contém um destino infantil fixo

`packages/member-shell/src/routes/studio.ts:82` define `MURAL_SPACE_SLUG = 'mural-dos-criadores'`; respostas montam URLs com esse slug. Além das rotas ausentes, existe política de destino a generalizar.

Direção: configuração explícita de público, espaço, URL de apresentação e regra de acesso. Validar o destino no servidor; publicar só quando o aluno escolhe. Projetos adultos e infantis devem permanecer separados nas listagens e na autorização. O fórum adulto pode receber apresentações e imagens no piloto; isso não substitui a futura publicação jogável especializada.

### 4 Pensa e voz recusam o usuário adulto comum

`packages/member-shell/src/routes/pensa.ts:117` exige criança ou papel privilegiado. `packages/member-shell/src/routes/voice.ts:127` exige sessão de criança, além de preferência do responsável e configuração do servidor. Copiar uma página ou ligar `voiceInput` não resolve.

O Pensa modela experiência do jogador, dimensão 2D/3D, assets e missões para Estúdio/Pinta/Molda. Esse domínio serve bem à futura criação de jogos por adultos, após adaptar identidade e acesso. Planejar aplicações com telas, dados e integrações é uma evolução diferente.

Direção: política adulta de conta titular, acesso e limites, sem fingir que adulto é perfil de criança. Preservar as proteções Kids no mesmo processo.

### 5 Capacidades livres estão ligadas à jornada Kids

`creative-apps-access.ts` e `studio-tier.ts` usam postos da jornada para liberar criação livre, IA, Molda e modo Pro. Os blocos liberados no Estúdio derivam do currículo; os 49 slots da jornada não representam catálogo já produzido.

Direção: resolver capacidades adultas por curso comprado, atividade e requisitos pedagógicos explícitos. Não fazer adulto cumprir jornada infantil para abrir uma ferramenta incluída na oferta. Manter checagem do backend, isolando políticas por público.

### 6 Todos os cursos não entrega automaticamente todas as ferramentas

O acesso a cursos distingue `all_courses` e `all_kids_courses`. A escrita nas ferramentas livres exige a posse da referência da ferramenta, por grant/comunidade; a chave-mestra de cursos não é suficiente nesse serviço.

Fontes: `packages/members/src/application/access/check-access.service.ts:99`; `packages/members/src/application/creations/creations.service.ts`, `assertToolOwned`; `packages/members/src/domain/creations/creation.ts:60`.

Direção: configurar entregas explícitas para cada promessa. Se diferenciar licença adulta de infantil, revisar a propagação da referência de acesso e o isolamento de identidade, sem apenas duplicar o nome comercial.

### 7 A sala ao vivo já existe, mas venda de vaga exige verificação própria

Adulto usa `LiveCatalog skin="adult"` e `LiveClassroom`. No serviço de inscrição examinado, a origem criada é `manual`. A análise não confirmou uma automação completa de pagamento para reserva e concessão de vaga em turma.

Cursos ao vivo têm grants por sessão e prazo de turma; são excluídos da chave-mestra e da jornada. Esse contrato é diferente do curso gravado.

Direção: para piloto ao vivo, cadastro manual acompanhado de conciliação explícita é uma operação possível. Para escalar venda, definir pagamento → vaga → confirmação, lotação, duplicação, estorno, cancelamento e revogação. Não considerar esse trabalho concluído por haver checkout genérico.

Fontes: `packages/community/src/app/(app)/oficinas/page.tsx`; `packages/members/src/application/live/live.service.ts:428`; `docs/plans/2026-10-14-cursos-ao-vivo-design.md`, confrontado com sala e serviços atuais.

### 8 Suporte e aprendizagem precisam de medidas diferentes

O adulto já possui recados privados e helpdesk. O analytics de cursos também existe. Em `GetCourseAnalyticsService`, `started` significa ter concluído ao menos uma aula publicada, não simplesmente abrir a primeira aula. A taxa de conclusão usa essa população.

Direção: manter essa definição nos relatórios existentes e medir separadamente ativação da compra e primeira ação prática. Definir capacidade humana para revisão; presença de botão não comprova disponibilidade de professor nem prazo de resposta.

### 9 A progressão Blocos e Ponte já tem suporte técnico

`packages/studio/src/core/modes.ts` define Blocos/Ponte para projetos clássicos e Código para projetos Pro. `BridgeMode.tsx` apresenta blocos e código, com sincronização entre representações. A passagem pedagógica pode começar no clássico, sem antecipar o runtime Pro.

`StudioLesson.tsx` desliga por padrão terminal, IA, modo profissional, exportação e download. O host pode sobrescrever recursos, mas isso não torna a exportação uma promessa automaticamente cumprida no aplicativo adulto. Se o primeiro curso oferecer download do jogo/projeto, incluir a configuração autorizada e a verificação dessa saída no escopo.

A direção definida pelo usuário é ensinar programação por jogos, começando com blocos, passando pela ponte e pelo código, e introduzindo IA apenas no avançado. Recursos de IA não são dependência do primeiro lançamento.

### 10 Jornada adulta exige mudança de domínio e banco

`packages/members/src/application/content-admin/content-admin.service.ts:329` recusa posições da jornada para cursos adultos. `packages/members/src/infrastructure/persistence/drizzle/schema.ts:223` declara `courses_career_slot_check`, com condição explícita `audience = 'kids'` para posições não nulas.

`GetGamificationService` chama `computeStudentLevel`, que depende de `listQualifyingJourneySlots`; essa consulta cruza conclusão e publicação do mesmo curso com posição válida. Assim, apresentar o nível atual como uma jornada adulta completa seria incorreto: cursos adultos não podem produzir as posições necessárias pelo cadastro normal.

Direção: política de jornada por público e versão, com autoria, projeções e migração coerentes. Preservar o significado dos marcos Kids existentes. Fontes adicionais: `packages/members/src/application/gamification/get-gamification.service.ts`; `packages/members/src/domain/gamification/levels.ts`; `packages/members/src/infrastructure/persistence/drizzle/gamification.repository.ts:882`.

### 11 XP e recompensas adultas já são concedidos

`packages/members/src/application/gamification/award-gamification.service.ts:64` concede a recompensa de módulo automaticamente no adulto. O Kids a resgata pelo baú. Se a interface adulta ganhar resgate explícito, revisar a política de concessão e a compatibilidade de eventos já pagos; o ledger deve continuar pagando uma única vez.

`packages/members/src/application/gamification/get-missions.service.ts` aplica o filtro de oportunidades de conteúdo ao Kids, mas não ao adulto. Um painel adulto precisa receber apenas missões disponíveis e alcançáveis; checagens de exibição e resgate devem concordar.

### 12 Hub também bloqueia publicação adulta e recompensa apenas contribuição Kids

`packages/hub/src/application/showcase/showcase.service.ts:183` exige espaço Kids, e a criação também exige elegibilidade Kids. `packages/hub/src/application/moderation/moderation.service.ts:101` interrompe a recompensa de contribuição fora do Kids.

Direção: política explícita de destino e público no Hub e no BFF, sem simplesmente remover as checagens. Generalizar também as notificações de recompensa e a prevenção de contagem duplicada.

### 13 Estado segregado não significa configuração universalmente segregada

`packages/members/src/domain/ports/challenge-config-repository.port.ts` identifica configuração do desafio pelo mês, sem público, embora a participação seja lida por `audience`. Desafios diferentes entre plataformas exigem configuração por público.

`packages/members/src/infrastructure/persistence/drizzle/schema.ts:1913` identifica criação por usuário, ferramenta e item, sem `audience` nessa chave. A integração adulta deve definir explicitamente isolamento ou compartilhamento de bibliotecas e revisar namespaces, autorização e migração correspondentes.

## Reaproveitamento arquitetural recomendado

Manter dois aplicativos com identidades próprias e um núcleo compartilhado. A comunidade adulta importa bibliotecas e contratos; não deve importar componentes diretamente de `community-kids`.

| Camada | Preservar | Extrair ou completar |
| --- | --- | --- |
| `core` | Contratos de projeto, aprendizagem e modalidades | Capacidades adultas e distinção de público nos novos fluxos |
| `members` | Cursos, matrículas, aprendizagem, entregas, revisão e criações | Políticas de ferramentas adultas e métricas adicionais necessárias |
| `member-shell` | Player, BFF, autenticação, materiais, exercícios e sala ao vivo | Transporte de nuvem; publicação configurável; integrações adultas selecionadas |
| `studio`, `pinta`, `molda`, `pensa` | Editores e lógica de domínio | Hosts e adaptadores por público; Pensa com política de conta adulta |
| `community` | Navegação, identidade, cursos, fórum, recados e ajuda | Projetos, tutoriais e marcos de criação, introduzidos conforme a oferta |
| `community-kids` | Jornada, linguagem, família, mascote e gamificação | Consumir extrações compartilhadas sem perder regras infantis |
| `admin`, `catalog`, `payments`, `funnel` | Autoria, preço, contratos, cobrança e acesso | Novo curso/oferta/funil e eventual automação de vagas |

O motor de blocos tem apresentação distinta em Kids e adulto. A oportunidade é compartilhar comportamento, validações e transporte, mantendo linguagem e apresentação próprias. Não ampliar a refatoração para uma reconstrução de todo o monorepo.

## Verificação necessária antes da primeira venda

1. Conta adulta comum compra a oferta de teste, recebe o curso correto e não recebe direitos Kids.
2. Abre a primeira aula, altera o jogo, executa, fecha e retoma sem apagar alterações.
3. Retoma em outro navegador/aparelho depois de sincronizar, com indicação de conflito quando aplicável.
4. Envia o projeto; a equipe abre a mesma versão, responde e o aluno encontra a devolutiva.
5. Reenvio e continuidade entre aulas preservam o projeto; falha de rede não vira confirmação falsa de salvamento.
6. Quiz, exercícios e requisitos de conclusão funcionam no público adulto; revisão humana e conclusão automática permanecem estados distintos.
7. Expiração e revogação respeitam o contrato; acesso a aula não depende de licença de ferramenta livre.
8. Materiais e certificado não vazam dados ou acessos entre contas.
9. Caso Pro entre no escopo, build e prévia funcionam com a CSP adulta e limites do runtime.
10. Caso publicação entre no escopo, jogo adulto usa espaço adulto e visibilidade escolhida, sem alterar o Mural Kids.

Esta lista é um contrato de aceitação para implementação posterior. Os cenários não foram executados nesta análise e não há afirmação de prontidão de produção.
