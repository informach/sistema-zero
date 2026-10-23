# Revisões da implementação do Pensa

Plano: [reestruturação](../docs/superpowers/plans/2026-10-16-pensa-reestruturacao.md).

## Lote 1 — Contratos, regras e schema

Revisado: contratos canônicos em core/pensa, cobertura dos requisitos, dependências, capacidades individuais, disponibilidade, reconferência e impacto de alterações. Schema e migrations 0126–0128 inspecionados; execução PostgreSQL ainda pendente nesta etapa.

Correções encontradas na revisão:

- Separar sugestão pendente de sugestão aceita. Adaptações no draft não inventam pessoa/data de aceite; Members carimba o aceite explícito.
- Limite de snapshot mede somente definição/plano/técnica, sem incluir o contexto de capacidades.
- Detalhes reversíveis podem continuar em aberto. Escolhas bloqueantes pertencem a pendingChoices.
- Missão de arte exige artista designado, mesmo quando quem programa tem a ferramenta disponível.
- Disponibilidade exige dimensão ainda liberada e usa a configuração salva ao considerar Pro.
- DDL gerada remove primeiro as referências de ciclos; a migration seguinte elimina as tabelas antigas. Nenhum ajuste manual de DDL gerada.

Evidências iniciais: core typecheck passou; 1.183 testes do core passaram, incluindo 17 novos testes de Pensa. Os acréscimos da revisão serão revalidados com a integração. Testes de migração estáticos passaram; não substituem replay em PostgreSQL.

Workspace: mudanças preexistentes de packages/molda preservadas; não pertencem a esta entrega. Sem aplicação de migrations remotas nem publicação.

## Lote 2 — Integração, equipe e continuidade

Revisados os primeiros contratos de Members/BFF, as capacidades autorizadas, os tickets de criação, os painéis compartilhados e a interface. A revisão identificou e encaminhou correções antes da verificação integrada:

- Mutações precisam devolver a view canônica após resolver as capacidades atuais; um estado parcial ou uma resposta de equipe não substitui ProjectView.
- Retomada de operações envia um requestId, preserva orçamento por unidade e distingue falha de organização de ferramenta bloqueada.
- O schema de revisão precisa aceitar uma lista vazia de correções quando a revisão aprova o conteúdo.
- Salvar vínculos de arte durante a missão aceita entregas parciais; concluir exige todas as entregas.
- Restore considera revisões do plano/arquivo, equipe e progresso pertinente; preserva arte independente ainda válida.
- Saída de artista não pode deixar integração liberada com uma entrega inacessível.
- Revisões de conteúdo são atribuídas pelo servidor e não podem regredir por entrada manual.
- Arte da equipe tem identidade por missão e slot, e o download confere a revisão entregue.

Evidências até esta etapa: replay de todas as migrations em PostgreSQL 17.11 descartável e atualização a partir do schema anterior passaram (2 testes/10 asserções). Sentinelas de criações, reservas committed, consumo de IA e outbox foram preservadas. Gateway typecheck e 68 testes passaram. Bibliotecas de equipe/restore passaram em 28 testes. O percurso visual passou em 3 testes Chromium (plano completo de 9 missões, aceite, abertura, equipe/foco e celular sem overflow). O core passou novamente com 18 testes específicos de Pensa.

O navegador integrado falhou ao conectar; os testes visuais usam Chromium local pelo Playwright existente no monorepo. O playground é uma fixture de interface e não substitui os testes reais de banco nem a verificação dos contratos BFF.

## Lote 3 — Interface, oficinas e continuidade

Revisados os quatro hosts, o contrato compartilhado de missão, as bibliotecas de arte, o ZERO derivado, a voz e os cuidados do projeto. A revisão cruzada encontrou problemas que não apareciam nos primeiros testes isolados:

- Handoff, comandos de missão, vínculo do Estúdio e próxima missão precisavam enviar o perfil original em x-sz-viewer. O BFF recusa chamadas sem essa prova. Os testes agora conferem os headers e a troca de perfil.
- Ao retomar uma operação em equipe, o worker precisa conservar o ator e o pagador originais persistidos, mesmo se outra pessoa fizer o polling.
- O contexto de replanejamento precisava incluir regras e critérios anteriores, além do esqueleto, para preservar suas identidades.
- O painel permite consultar missões futuras sem iniciar sua execução. Ajuda mantém a missão aberta; links são resolvidos somente dentro das rotas autorizadas.
- Trocar somente a missão do mesmo jogo Pro preserva navegação e buffers. Cruzar documentos mantém a navegação completa necessária ao isolamento.
- Buscar um jogo salvo que falta no aparelho não pode criar um arquivo vazio com o mesmo ID quando a nuvem falha. A retomada usa a criação existente e apresenta recuperação.
- O cabeçalho desktop somava padding à largura total no playground. Box sizing e composição flex foram corrigidos no escopo do Pensa. O navegador agora verifica também a posição real do botão de equipe; somente medir scrollWidth não detectava o corte.
- Strings corrompidas e vocabulário inadequado foram corrigidos. Exceções de prompts nos testes de copy são trechos técnicos específicos; mensagens de tela continuam sendo verificadas.

## Revisão completa

O diff foi revisto por responsabilidades e pelos percursos do contrato, incluindo os consumidores indiretos. Contratos e regras puras ficam em core; aplicação depende de portas; PostgreSQL concentra locks, CAS e comandos atômicos. BFF resolve recursos e arquivos autorizados. Interface e oficinas recebem os mesmos schemas. Não há rota, leitor de payload nem seleção de versão que mantenha o fluxo antigo.

A revisão confirmou separadamente:

- Cobertura do escopo escolhido, ordem, teste final, recursos de um executor real e escolha explícita das adaptações.
- Revisões imutáveis, identidades estáveis, impacto localizado, reconferência e preservação de criações e progresso válido.
- Inspeção de configuração salva por bilhete autorizado; confirmação da criança continua sendo a evidência de funcionamento do jogo.
- Reservas, orçamento por unidade, contador externo, leases, retomada e idempotência. Respostas parciais não se tornam plano aceito.
- Entregas por slot, acesso à arte da equipe e invalidação após saída de participante. Recursos não são somados entre perfis.
- Proteção e restore com comparação das revisões após as cópias, abort e limpeza de destinos órfãos. Cópias em voo terminam antes de agendar limpeza.
- Exclusão do plano preserva criações independentes e recibos mínimos de recompensa. A substituição não zera custos, XP ou moedas.
- Admin, funil, uso de ferramentas, narração privada, tutor, gateway, cliente e shims usam o contrato funcional.

Achados finais corrigidos e verificados:

- A lista de jogos Pro desconta preparação dispensada, sem inventar conclusão de setup. Conta e pagadores seguem ordem única de locks, inclusive na purga concorrente de duas contas em equipe.
- Restore commit devolve a base após a promoção; a observação anterior do arquivo não pode produzir um falso conflito depois de uma restauração já confirmada.
- Histórico de mensagens tem cursor autorizado em Members, gateway e BFF. Consulta não inicia trabalho nem consome IA.
- Cópias de checkpoint com falha ocupam cota enquanto os arquivos órfãos aguardam limpeza. O manifesto liga cleanupId ao job; após a confirmação, libera a cota. Tentativa encerrada não reutiliza o mesmo checkpoint, e a UI distingue recusa definitiva de falha de conexão incerta. A prova real esgota 80 tentativas, confirma a limpeza e consegue proteger de novo.
- O funil distingue preparação, primeira funcionalidade, construção e conferência final. Preparação aparece separadamente porque Pro a dispensa; retirar a duplicação entre teste final e projeto concluído evita dois indicadores com o mesmo significado.
- Documentos CLAUDE de Members/member-shell e sete planos anteriores foram consolidados ou marcados como históricos. Os enums financeiros preservados são recibos existentes, sem leitores do antigo contrato Pensa.

### Evidência integrada de navegador

`bun run e2e` em packages/pensa passou: três testes Chromium, com plano completo de nove missões, aceite explícito, abertura da missão, equipe/foco, desktop sem corte e celular sem overflow.

`bun run e2e:native` passou com PostgreSQL 17.11 local descartável: PensaApp → sessão de missão do Kids → BFF → worker → API Elysia → regras e banco reais. Conferiu candidato antes do aceite, chamada do provedor por unidade, bloqueio de missão futura, configuração salva, conclusão das três missões, reabertura, reconferência e recarga com estado preservado. `typecheck:e2e` passou.

O teste nativo usa identidade privilegiada de QA e respostas determinísticas do provedor; armazena o documento do jogo na fronteira local de storage e grava seu índice no PostgreSQL. Não substitui decisões de progresso do backend. Não abre o editor completo: instalação nativa, flush, artes, autorização e conflitos são cobertos por seus testes de componente/API/banco. O navegador integrado da ferramenta não conectou; Playwright local forneceu a prova visual e as capturas.

### Verificação dos pacotes

| Verificação executada | Resultado |
| --- | --- |
| Core, suíte completa | 1.184 testes passaram; typecheck passou |
| Members, suíte geral sem bancos externos | 1.363 passaram, 309 testes DB pulados na rodada geral; Pensa DB executado separadamente; typecheck final passou |
| Members, runner Pensa DB explícito | 20 passaram, 151 asserções, nenhum skip/fail; 8 arquivos com migrations, CAS, HTTP, créditos, equipe, restore, cota, funil, purga e manutenção |
| Member-shell, suíte completa | 1.438 passaram; typecheck passou |
| Gateway, suíte completa | 248 passaram; typecheck passou |
| Pensa, suíte completa | 17 passaram; typecheck passou |
| UI, suíte completa | 101 passaram; typecheck passou |
| Pinta, suíte completa | 1.537 passaram; typecheck passou |
| Kids, suíte completa | 1.411 passaram; typecheck passou |
| Admin, suíte completa | 591 passaram; typecheck passou |
| Estúdio, regressão do painel de missão | 3 passaram: instalação explícita/idempotente, flush recusado e reabertura; typecheck passou |
| Build Kids | Passou; rota canônica /api/pensa/[...path] incluída |
| Build Admin | Passou |
| Biome no diff de implementação | 206 arquivos passaram; migrations geradas e trabalho concorrente Molda fora dessa formatação |
| Instalação com lockfile congelado | Passou, sem mudança de dependências |
| git diff --check da entrega | Passou |

As suítes completas de Estúdio e Molda não foram repetidas. As alterações internas concorrentes de packages/molda pertencem a outra frente e foram preservadas; o host Molda do Kids foi verificado nesta entrega. Os 309 skips gerais de Members não são aprovação de banco: há prova Pensa explícita em PostgreSQL e o script test:pensa-db recusa ausência da configuração dedicada.

### Limites e operação

A verificação de migrações inclui criação do banco vazio e upgrade do schema anterior. A janela operacional usa backup e manifesto restritos ao Pensa, dry-run, comparação de sentinelas, cutover e rollback; o procedimento fica em docs/pensa-planner.md e scripts/pensa-maintenance.ts. A CI exige o teste nativo com PostgreSQL e guarda traces em falha.

Não restou achado conhecido que impeça a entrega local. A implantação continua sendo uma janela operacional separada: substituir Members/gateway/BFF/hosts de forma coordenada, aplicar 0126–0128, executar smoke e somente depois liberar a limpeza privada.

Não houve migração remota, deploy, commit nem chamada a provedor pago. Qualidade de respostas de um modelo real e compreensão por crianças ainda precisam de avaliação própria; testes determinísticos demonstram contratos e comportamentos, sem afirmar esses resultados pedagógicos. Os testes e serviços locais usados nesta entrega não mudam o ambiente publicado.

# Revisão adicional após a entrega

A revisão integral solicitada posteriormente encontrou e corrigiu falhas de integração e de recuperação que não haviam sido detectadas nesta rodada. O resultado atualizado está em [Revisão integral do Pensa](pensa-full-review-2026-10-16.md), com regressões reproduzidas, correções e novas evidências.
