---
status: resolved
file: packages/members/src/application/live/live-workspace.service.ts
line: 290
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Não reimpor a semente nova ao projeto já vinculado à aula

## Review Comment

`openForBlock` compara todo projeto encontrado com `this.seed(block, record.id)` antes de verificar se a aula já pertence ao vínculo. Isso transforma a semente publicada atual em requisito permanente para reabrir trabalho existente. Se a equipe troca o ambiente/template da semente após a criação do projeto, o aluno recebe conflito ao abrir a mesma aula, embora não esteja entrando em uma nova etapa da cadeia e o documento anterior continue íntegro.

O contrato da proposta, seção 9, determina que o vínculo registra a baseline autoral de criação e seu ambiente, e que renovar acesso não impõe a semente nova ao documento existente. A validação para uma nova aula da cadeia continua necessária, inclusive para o vencedor concorrente de `ensureByKey`; ela não deve substituir essa baseline histórica.

Reprodução executada: `bun .cache/studio-python-l0/review039-baseline.ts` (exit 0). Usa `LiveWorkspaceService` real e as portas do teste existente. Abre bloco JS, assume autoria, salva `Trabalho já feito`, altera apenas `initialProject` do mesmo bloco para Python e tenta reabrir. A aula já está em `lessonIds`, mas `openForBlock` lança `ambientes diferentes`; `service.get` ainda devolve corretamente o trabalho JS. Nenhum projeto foi alterado pela tentativa recusada.

Preservar/consultar a baseline do vínculo existente e separar retomada de um vínculo autorizado da admissão de uma nova aula/bloco na cadeia. Cobrir alterações de linguagem, release e template após a primeira abertura, mantendo as recusas de nova cadeia incompatível e do vencedor concorrente. A mesma regra deve orientar a retomada local/nuvem das aulas gravadas, para não apenas mover a imposição da semente nova de uma camada para outra.

## Triage

- Decision: `VALID`
- Notes: Correções de baseline durável, consumidores, offline e primeira admissão revalidadas independentemente. Última borda do canal Kids indisponível resolvida; escopo e limites das provas registrados abaixo. Esta resolução não qualifica L6 completo nem a UI integrada.

## Revalidation

Correção parcial comprovada: `bun .cache/studio-python-l0/review039-live-revalidate.ts` (exit 0) reabre o mesmo bloco após alterar sua semente e conserva o documento original. Members também passou 33 testes/163 assertions, incluindo o cenário permanente.

A issue permanece pendente pela baseline das aulas gravadas e por um limite da correção live: ela usa somente `lessonIds` para decidir que o vínculo já existia. No mesmo harness, dois blocos diferentes da MESMA aula com a mesma `chain` são abertos em sequência: o primeiro tem JS/Classic e o segundo Python/Pro. O segundo é admitido sem comparar os ambientes e recebe o projeto JS do primeiro, pois a aula já consta em `lessonIds`. É preciso distinguir o bloco/vínculo já admitido do ingresso de outro bloco, preservando a retomada do original sem liberar uma cadeia incompatível.

### Baselines duráveis e consumidores — revisão adicional

O novo vínculo por proprietário/bloco e o `openBound` transacional substituem a aproximação por `lessonIds`. Leitura independente do repositório confirma bloqueio de conta/exclusão, lock do workspace, comparação do ambiente e criação do vínculo na mesma transação. Executei `bun test tests/unit/live-workspace.test.ts tests/unit/workspace-snapshot.test.ts` em Members: **35 pass, 0 fail, 170 assertions**. Os casos incluem retomada após mudança de semente/cadeia/curadoria e recusa do segundo bloco incompatível na mesma aula. A prova PostgreSQL/migration 0129 foi executada pelo implementador; não executei nem alterei o banco nesta revisão.

Foram confirmadas e corrigidas durante a revisão duas fugas na aplicação da configuração original: o wrapper gravado herdava campos omitidos da publicação atual ao fazer spread, e a sala ignorava `view.studio` e perdia esse campo após claim. Também foi corrigida a geração de timestamps variáveis na semente vazia, que impedia compartilhar o hash da mesma configuração entre alunos. `bun .cache/studio-python-l0/review039-baseline-revalidate.ts` passou: executa o handler atual extraído do wrapper e comprova que campos originalmente ausentes continuam ausentes, além da igualdade das baselines vazias sob relógios distintos. A retenção de `studio` no claim e seu consumo no editor foram conferidos por leitura, sem reivindicar teste React/browser.

Foi confirmada outra fronteira do carryover: o serviço usava a cadeia original do bloco B, mas `findPrecedingChainBlock` consultava a cadeia **atualmente publicada** do predecessor A. `bun .cache/studio-python-l0/review039-carryover-predecessor.ts` passou reproduzindo o serviço real com a porta do repositório que modelava esse predicado SQL: A e B têm vínculos com cadeia X; B recupera a entrega de A; republicar somente A com cadeia Y fazia a recuperação de B devolver `null`, sem consultar a entrega existente. A correção subsequente acrescenta o proprietário à consulta e sobrepõe a configuração vinculada inteira antes de extrair `chain`, incluindo ausência original; filtros incluem usuário/conta/curso e vínculo gravado. Li a nova SQL e a prova real produzida pelo implementador em `l6-baselines-db-3.log`: **4 pass, 0 fail, 23 assertions**, incluindo cadeia alterada, ausência original e outro proprietário. Não executei DB nesta revisão. A política para trabalho legado sem baseline e o comportamento offline seguem declarados em implementação; a issue ainda não deve ser fechada.

### Recuperação offline — fronteiras de transporte e composição

O cache novo passou `bun test tests/studio-lesson-context.test.ts` em member-shell: **8 pass, 0 fail, 15 assertions**. O escopo separa perfil/aula/bloco, exige documento local compatível e recusa falhas 4xx ou dados online inválidos. O cache não cria concessões de execução/serviços.

Dois casos impediram a recuperação offline pretendida e foram corrigidos após as reproduções abaixo:

1. `packages/member-shell/src/lib/api.ts:54` converte toda rejeição de `response.json()` em `null`. Quando headers HTTP 200 já chegaram e o corpo perde conexão ou estoura o prazo, o erro de transporte desaparece; `resolveStudioLessonContext` trata o retorno como dado online inválido e recusa o cache. `bun .cache/studio-python-l0/review039-offline-body.ts` passou reproduzindo `apiSend` e resolver reais com `Response`/`ReadableStream`: erro antes dos headers recupera; `TypeError` ou `TimeoutError` na leitura do corpo recusa contexto/local válidos. Propagar falhas de transporte/aborto, mantendo JSON 200 sintaticamente inválido e recusas 4xx fora do fallback.
2. Mesmo após o contexto recuperar por timeout, `LessonStudioBlockView` inicia `prepareStudioLessonDraft`, que aguarda `channel.peek(blockId)` sem sinal ou prazo. O canal real também não impõe timeout nessa leitura. Portanto o mesmo servidor sem resposta prende novamente a abertura, agora sem os 15 segundos do contexto. `bun .cache/studio-python-l0/review039-offline-cloud.ts` passou com os dois helpers reais: contexto offline e documento local existem, mas a preparação só termina quando a porta `peek` é rejeitada manualmente. O helper já existia; o achado é a composição nova que promete recuperar offline e volta a depender de rede não limitada. Transportar a origem offline para abrir o local sem outra tentativa bloqueante, ou limitar/cancelar de fato o preparo inteiro, mantendo a sincronização posterior.

Essas provas são de helpers/transportes reais com portas controladas; não são provas de montagem React/navegador. A adoção de trabalho legado ainda está em implementação e permanece pendente separadamente.

**Revalidação das duas correções offline:** `api.handle` agora propaga falhas de transporte do body em respostas 200, mantém status de recusa HTTP e continua tratando JSON inválido como payload inválido. O resolver retorna `{context, offline}`; o wrapper passa `resumeOffline` e a preparação offline exige documento local compatível, sem `peek`, leitura de envio ou alteração de marcas. O carregamento final também recusa local ausente em vez de semear outro projeto. `bun .cache/studio-python-l0/review039-offline-revalidate.ts` passou independentemente: 2 falhas de transporte recuperadas, 5 status de recusa preservados, JSON inválido e cancelamento recusados; preparo offline com **0 chamadas de rede, 0 marcas, 0 escritas**, recusando local ausente/incompatível. A ligação das flags no wrapper foi conferida por leitura. A suíte `bun test tests/studio-lesson-context.test.ts tests/lesson-draft-persistence.test.ts tests/studio-lesson-seed.test.ts` passou **52 testes/149 assertions**. Os dois pontos offline estão resolvidos; a issue002 continua pendente somente pela adoção de legado declarada em implementação, sem qualificar UI/browser nesta revalidação.

### Adoção de legado sem histórico disponível

A política proposta é aceitável como **adoção atual**, sem alegar reconstrução da origem histórica: usar somente a configuração publicada server-owned, preservar o trabalho compatível e disponibilizar recuperação/exportação explícita quando incompatível. Nem fonte do aluno, nem um hint de ambiente, nem mera coincidência de linguagem demonstram curadoria/grants históricos. Não é necessário criar um sistema de histórico completo sem um consumidor justificado.

Ainda há uma fronteira concreta na admissão: `OpenLessonStudioService.execute` cria o binding antes de conferir o ambiente do trabalho legado. `bun .cache/studio-python-l0/review039-failed-adoption.ts` (exit0) usa esse serviço e o resolver de semente reais, com a porta do binding em memória: local JS legado + publicação Python → retomada recusada no cliente, mas baseline Python já gravada; a equipe restaura a publicação JS → nova tentativa continua recebendo a baseline Python e recusa o mesmo local. O documento é preservado, porém a tentativa fracassada fixou um ambiente que nunca foi compatível com ele. A primeira admissão precisa considerar o ambiente do trabalho existente antes da vinculação durável (hint apenas restritivo, configuração/grant sempre server-owned), revalidando a decisão na fronteira de publicação, ou oferecer uma recuperação explícita do vínculo que permita realmente retomar. O botão de download preserva os bytes, mas por si só não corrige essa adoção falha.

### Revalidação da admissão em duas etapas

O serviço agora propõe a configuração com `bound:false`, sem persistir o vínculo. A confirmação exige o hash da configuração e uma referência restritiva do ambiente, revalida acesso e publicação, e a porta transacional conserva o primeiro vínculo confirmado. O cache só recebe configurações confirmadas; a rota Kids Pro recusa propostas. A preparação inicial propaga falhas da consulta/download da conta e só enfileira a subida depois da confirmação.

`bun .cache/studio-python-l0/review039-admission-revalidate.ts` passou independentemente com serviço, resolvers, confirmação e preparo reais: a tentativa recusada JS/Python produziu **0 bindings e 0 writes de cache**; restaurar a publicação JS permitiu confirmar o mesmo trabalho; a publicação posterior Python manteve a baseline JS; confirmações obsoletas foram recusadas. A falha no download da conta produziu **0 writes e 0 marks**. O harness usa portas em memória, sem alterar DB ou montar React.

Também passaram nesta revalidação: Members `bun test tests/integration/studio-context.test.ts tests/unit/live-workspace.test.ts tests/unit/workspace-snapshot.test.ts` — **41 pass/202 assertions**; member-shell `bun test tests/studio-lesson-context.test.ts tests/lesson-draft-persistence.test.ts tests/studio-lesson-seed.test.ts` — **55 pass/163 assertions**; Kids `bun test tests/studio-pro-route.test.ts tests/lesson-draft-cloud.test.ts` — **18 pass/52 assertions**, todos com 0 fail. A propagação do sinal de `peek` ao ticket, body e partes foi conferida no transporte real por leitura.

**Borda ainda pendente:** `studio-block.tsx:322` converte um canal fornecido pelo Kids com `supported:false` em `null`. Assim o caminho que exige `requireRemoteCheck` é pulado e a primeira confirmação prossegue apenas com semente/local. O canal real retorna `null` em `peek` quando CompressionStream/DecompressionStream não está disponível, sem consultar a conta. `bun .cache/studio-python-l0/review039-unsupported-admission.ts` passou reproduzindo **supported:false, canal UI null, 0 consultas à conta e 1 binding Python confirmado**. Usa o canal real, o gate atual extraído do componente e os helpers/serviço reais; não é prova React/browser. Havendo trabalho legado JS na conta, esta primeira tentativa fixa novamente um ambiente que não pôde ser comparado com ele. Distinguir ausência deliberada do canal (comunidade adulta) de canal Kids fornecido porém indisponível: nesta última condição, recusar a primeira admissão sem baseline durável; a retomada local de vínculos já confirmados pode conservar sua política existente. A issue permanece pendente somente por esta borda.

### Revalidação final — canal indisponível e nova proposta no retry

A borda acima foi corrigida em `confirmStudioLessonContext`: `accountAvailable` é obrigatório; a UI distingue canal ausente de canal fornecido mas inutilizável. A primeira admissão indisponível lança `StudioLessonAdmissionError` antes do envio/cache; vínculos existentes e suporte somente leitura não fazem nova confirmação. O erro é mostrado pelo bloco. O retry de uma proposta não confirmada incrementa a tentativa do wrapper, altera seu escopo e refaz a consulta, em vez de repetir o mesmo ID obsoleto; essa ligação React foi conferida por leitura, sem reivindicar teste de montagem.

`bun .cache/studio-python-l0/review039-unsupported-revalidate.ts` passou: canal Kids real com CompressionStream ausente + gates extraídos da implementação + helper/serviço reais produzem **0 bindings, 0 envios e 0 writes de cache**. Retomada vinculada e suporte somente leitura seguem sem envio; canal deliberadamente ausente permite **1 admissão e 1 cache**. `bun .cache/studio-python-l0/review039-admission-revalidate.ts` foi atualizado somente para informar o novo argumento obrigatório e passou novamente, preservando as provas de proposta/recusa/restauração JS/confirmação/publicação posterior e falha no download da conta. A suíte member-shell dos três arquivos passou novamente: **56 pass, 0 fail, 167 assertions**. Nenhum browser, TSC ou DB foi executado nesta revalidação. Issue resolvida no escopo descrito.
