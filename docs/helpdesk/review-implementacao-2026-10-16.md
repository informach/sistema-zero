# Review final da implementação Helpdesk IA e conhecimento

Revisão dos lotes L0–L5 da [proposta](../plans/2026-10-15-helpdesk-ia-kb-proposta-revisada.md), com a alteração de escopo autorizada: Helpdesk ainda sem usuários, atualização conjunta dos contratos e nenhuma camada de compatibilidade antiga. Registro detalhado no [plano de execução](../superpowers/plans/2026-10-15-helpdesk-ia-kb-implementacao.md).

## Resultado arquitetural

A implementação mantém Helpdesk como dono dos tickets, conhecimento, jobs e política. Reutiliza Elysia, Drizzle/PostgreSQL, OpenRouter, contratos compartilhados, BFF, gateway e identidade do Sistema Zero. Console, portal adulto e área dos pais consomem os mesmos contratos; sessão infantil não ganha acesso ao atendimento. Não foram acrescentados frameworks, dependências ou serviços externos.

A automação nasce desligada. Copiloto, teste, classificação, sombra e publicação automática possuem finalidades separadas. Só o portal nativo sem thread Gmail pode receber resposta automática. O envio humano conserva a outbox transacional e o Gmail conserva intenção e reconciliação por Message-ID.

## Cobertura revisada

| Área | Implementação e evidência |
| --- | --- |
| Conhecimento | Revisão imutável, responsável, público/produto/validade, índice durável com lease, publicação administrativa atômica, retirada imediata e busca textual portuguesa por trechos. Testes de recuperação, revisão concorrente, retirada e indexação em PostgreSQL. |
| Copiloto | Contexto visível distingue cliente, equipe e IA; notas não entram. Resposta estruturada exige evidências recuperadas. Editor preserva texto, inserção é explícita e envio registra run/edição. Execuções incluem tentativas e custo desconhecido. |
| Automação | Job próprio, geração/epoch/lease/deadline, transação idempotente, limite de turnos/esclarecimento, reserva de custo, coorte estável e política administrativa. Dois clientes PostgreSQL e barreiras exercitam corridas reais. |
| Autoridade e handoff | Publicação revalida política, relatório, modelo, prompt, índice, configuração e fontes. Nota/resposta/atribuição/patch/takeover invalidam autonomia. Leitura não toma controle; retorno ao bot não ocorre após handoff. |
| Portal e privacidade | Projeção pública distinta, ownership, bloqueio readonly e parental, fontes somente atuais/autorizadas. Polling paginado com dedupe, cancelamento, backoff e Retry-After. Testes DOM verificam texto/foco, fonte, retry e expiração parental. |
| Histórico e entrega | Cursor por sequência sob lock do ticket; atualização de entrega avança sequência. Mensagens importadas/confirmadas tardiamente não desaparecem da leitura incremental. Notas e entregas incertas não ficam públicas. |
| SLA e resultado | Handoff conserva início da espera; TS, SQL, fila e fakes usam a mesma regra. Confirmação explícita, reabertura e janela madura de sete dias sustentam métricas; silêncio não é resolução. |
| Operação | Painel off/shadow/pilot, diagnóstico de filas/fontes/outbox, custos separados por finalidade, latências e feedback. Watchdog independe da chamada LLM. Retenção cobre execuções, derivados, jobs terminais, reservas e comandos. |
| Avaliação | Corpus versionado de 100 casos sintéticos, runner pelo motor do produto, scorer com hashes, revisão integral e relatório vinculado à configuração. Data de execução permanece a autoridade da validade, mesmo na reimportação. |
| Schema | Migrations 0013–0019 geradas pelo Drizzle e aplicadas com a cadeia existente em PostgreSQL 16.15 descartável; nova geração confirma ausência de drift. |

## Achados corrigidos durante os reviews

- Patch humano podia sobrescrever campos de IA produzidos depois da leitura: gravação agora limitada à intenção e protegida por versão.
- Fonte retirada podia ser desarquivada por outro comando: publicação/retirada preservam estado editorial e validam a revisão sob lock.
- Busca natural exigia todas as palavras da pergunta: lexemas normalizados em OR, com ranking e limite de trechos, recuperam perguntas sem corte arbitrário por recência.
- Ordenação incremental por data perdia mensagens importadas e confirmações tardias: sequência persistida substitui data no cursor.
- Confirmação Gmail anterior à associação da thread podia inverter locks: lock por ID mantém ticket antes de mensagem. Confirmação tardia não pausa inbound posterior.
- Mudança de modelo/configuração podia deixar trabalho autorizado em execução: guards conferem avaliação e política também no commit da resposta.
- Resposta de comando atrasada podia reverter o estado mais recente recebido por polling: atualizações agora respeitam a versão do ticket no portal e no console; regressão DOM reproduziu a corrida antes da correção.
- UI de takeover/retry precisava conservar o payload original: chave e versão da ação permanecem juntas durante repetição.
- Retenção precisava alcançar resumos/classificações e trabalhos terminais: expurgo cobre derivados e preserva jobs ativos.
- Relatório reimportado recebia validade nova: `evaluatedAt` permanece vinculada aos artefatos; avaliação vencida/futura e revisão parcial bloqueiam o piloto. Regressão observada antes da correção e aprovada depois.

## Verificação

A base de integração incorporou a staging `2d59b19a8`, incluindo marketing e Studio Pro. As verificações executadas incluem:

| Verificação | Resultado |
| --- | --- |
| Backend Helpdesk, com PostgreSQL dedicado | 283 testes, 926 asserções, zero falhas; inclui 26 cenários de automação/concorrência |
| Console Helpdesk | 26 testes, 193 asserções; typecheck e build Next aprovados |
| Contratos | 5 testes, 14 asserções; typecheck e Biome aprovados |
| Gateway: configuração/registry e readonly | 70 testes, 324 asserções; typecheck aprovado; rotas de marketing preservadas |
| Member-shell: API/HMAC/refresh/Helpdesk/paginação/readonly | 28 testes, 76 asserções |
| Kids: vocabulário, parental, conversa e superfícies | 31 testes, 163 asserções; inclui 3 testes DOM da conversa |
| Consumidores | Builds de Community, Kids e Admin executados durante L4; build final do console executado após integração |
| Estática | Typechecks de backend, contratos, console, gateway, member-shell e Kids; Biome de 117 arquivos alterados e `git diff --check` aprovados |
| Migrações | Cadeia 0000–0019 aplicada; `db:generate` sem alterações de schema |

Logs locais de execução estão em `.audits/helpdesk-implementation-2026-10-15/`; esta revisão mantém o resumo durável no repositório. Não se afirma que a suite inteira de todos os módulos do monorepo foi executada. As duas falhas antigas da varredura de vocabulário infantil deixaram de ocorrer após incorporar a staging atualizada, sem alteração incidental desses módulos.

## Limites da validação e ativação

Não houve chamada a modelo real, envio Gmail real, deploy ou ativação de piloto. Os testes de interface usam React em DOM de teste; não constituem ensaio de navegador conectado a todos os serviços. A avaliação entregue é ferramenta e corpus inicial, não atestado de qualidade de LLM.

Antes de ativar: aprovar fontes e corpus, executar/revisar a avaliação real, escolher modelo e parâmetros de custo/coorte, medir a capacidade do ambiente e da equipe, e importar relatório válido. Esses critérios são operacionais e estão descritos no [guia](operacao-ia.md). Reserva por tentativa é estimativa calibrada, não garantia de faturamento externo. Retirada de uma fonte bloqueia novas respostas e consulta da evidência; mensagens já enviadas permanecem no histórico da conversa.
