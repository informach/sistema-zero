# L9 — Propagação de revisões, revisão em andamento

O lote 9 não está concluído. Estas medições são feitas em um computador com uma identidade sintética e dois transportes autenticados independentes. O limite medido é confirmação HTTP da escrita no servidor até presença da revisão na projeção SQLite do desktop. Não mede pintura da interface nem substitui duas pessoas em dois computadores.

## Problema e alteração

O ciclo anterior esperava cinco segundos após cada sincronização, acima da meta de três segundos do piloto antes mesmo de considerar rede/UI. Fazia duas leituras por ciclo, de protocolo e projetos, mesmo sem alterações. A web também consultava deltas vazios depois de receber a sequência autorizada de cada projeto.

O endpoint autenticado `/workspace/head` reúne compatibilidade, capacidades e lista autorizada com suas sequências. Clientes novos negociam a capacidade e passam a uma consulta por ciclo. Cada resposta revalida protocolo e acesso; servidores anteriores continuam com a sequência original de duas consultas. O intervalo saudável passa a 1.500 ms; desconexão mantém backoff e `Retry-After`. Na web, uma observação recém-autorizada substitui somente uma consulta de delta vazio. Uma leitura explícita posterior a uma escrita volta a conferir mudanças, sem confiar indefinidamente na lista anterior.

Não houve mudança em limites do gateway, ordem dos eventos, critérios de conflito, tie-break, recibos ou autorização. A medição escreve apenas uma direção sintética num projeto separado e confirma o ID exato de cada revisão. Não toca no acervo importado. A economia buscada é uma consulta por ciclo (impacto 4 × confiança 5 / esforço 2 = 10); a redução de intervalo atende o orçamento de latência, sem ocultar erros por atraso arbitrário.

## Primeiras evidências

- Instrumentação reproduzível: `packages/marketing-desktop/scripts/prove-sync-latency.ts`; três aquecimentos + vinte amostras, Electron 44.7.2, Ryzen 5 5600G, 16 GB. Banco nativo de revisão, gateway/BFF e sessões reais, loopback; modo dev Next também adiciona variação.
- Baseline com importação ainda concorrente: p50 **5.136 ms**, p95 **5.451 ms**, uma amostra de **19.116 ms**. Sessão preservada em `sync-latency-baseline/evidence-during-import.json`. Não tratar essa execução como comparação controlada de carga.
- Primeira versão corrigida: p50 **1.580 ms**, p95 **2.421 ms**, máximo **3.468 ms**. Foram 23 leituras de head e 23 deltas para 23 revisões, sem leituras separadas de protocolo/projetos após o aquecimento. Tipos desktop ainda estavam sendo conferidos durante essa execução. `proof-sync-candidate.log` / `sync-latency-candidate/evidence.json`.
- Tipos desktop/backend/workbench e build passaram. Workbench **24 testes / 97 assertions**, Node/SQLite **19 testes**, rotas/PostgreSQL **14 testes / 49 assertions**. Guards verificam acesso revogado, min-version incompatível, compatibilidade anterior e revisão posterior à observação. Retirar a redução do delta fez a regressão falhar; restauração passou (`tests-head-web-red.log`).

Na repetição sem importação/build/typecheck concorrentes, o baseline ficou em p50 **5.133 ms**, p95 **5.705 ms**, máximo **6.064 ms** (69 consultas/23 revisões). A versão corrigida ficou em p50 **1.570 ms**, p95 **1.591 ms**, máximo **1.603 ms** (46 consultas/23 revisões). Arquivos `proof-sync-{baseline,candidate}-idle.log` e `sync-latency-{baseline,candidate}/evidence.json`. Mesma máquina, banco, BFF e acervo; projetos sintéticos separados, escritos imediatamente após a observação anterior, portanto amostram perto do maior atraso do ciclo, não chegadas uniformes aleatórias. É uma comparação local, não estimativa de latência na internet.

A regressão completa seguinte passou: backend **354 testes / 2.024 assertions** e desktop **66 testes / 1.720 assertions**, sem falhas. Falta medir o percurso até a interface e o cenário de três sessões. Ainda não declarar a meta p95 ≤3 s da colaboração completa como cumprida.

`prove-web-refresh.ts` reproduziu a corrida de sessão web com login sintético isolado e dois transportes que iniciam com o mesmo cookie: primeira leitura **200**, leitura concorrente atrasada **401**, leitura seguinte do primeiro cliente **401**. O teste falhou como esperado (`proof-web-refresh-red.log`); os valores dos cookies não são registrados. Isso confirma que o single-flight em memória não resolve pedidos que chegam depois da rotação e que a família é invalidada.

### Correção da sessão web

O Auth ganhou um vínculo próprio para sessões do navegador (`browser_sessions`, migration gerada `0022_hard_leo`). O login do BFF consome o refresh uma única vez e recebe uma credencial opaca estável, guardada como hash no Auth e como cookie HttpOnly/SameSite/`__Host-` em produção. A família e seu prazo absoluto permanecem canônicos. Cada chamada do BFF resolve acesso novo, sem cache de JWT web; expiração, revogação, papel e status são conferidos novamente. Logout revoga antes de limpar o cookie. Nenhuma regra de rotação/reuso de `/auth/refresh` foi relaxada e o caminho de dispositivo continua separado.

A prova conectada passou (`proof-web-refresh-green.log`): primeira, atrasada, seguinte e oito consultas simultâneas retornaram 200; credencial/prazo não mudaram; logout tornou a outra sessão 401. CSRF retornou 403 sem encerrar a sessão; cookies antigos foram recusados e a página redirecionou a `/login?next=/bancada`. Os checks de CSRF/redirect usam transporte Node para observar a resposta HTTP sem o bloqueio CORS do Chromium; leituras/login/logout reais usam sessões Chromium. Valores de credenciais não foram registrados. Baseline preservado em `web-refresh-race-baseline.json`.

Auth completo: **300 testes / 1.051 assertions**; após a inclusão do cache-control, suíte de sessão **6 testes / 43 assertions**. Gateway: **242 testes / 756 assertions**. Web: **84 testes / 287 assertions**. Tipos Auth/gateway/web e check de migrations passaram. O check Auth também encontrou formatação preexistente da rota staff-directory, corrigida sem mudança de comportamento. A prova de acervo na nova sessão abriu P01, arte/copy/alt, histórico e Office de 14.222 caracteres; captura inspecionada (`proof-browser-acervo.log`).

Ordem de instalação: migration Auth 0022 → Auth e rotas gateway → web. Navegadores antigos fazem um novo login; não há conversão concorrente dos antigos cookies. Rollback mantém a tabela aditiva e exige login no cliente antigo. A validação de revogação acontece no BFF antes de cada requisição, não por uma alegação de introspecção de JWT comum pelo gateway. Migration aplicada somente aos bancos nativos de revisão/teste.

Referências de implementação consultadas: [rotas Elysia](https://elysiajs.com/essential/route), [schemas Zod](https://zod.dev/api). Context7/Octocode não estavam disponíveis nesta sessão; usados os contratos e padrões locais com documentação oficial.

### Três sessões e chegada à interface

`scripts/marketing-review-team.ts` cria somente duas contas sintéticas adicionais no banco nativo fixo. `electron . --smoke-ui-latency` usa o renderer/preload/SQLite reais e duas janelas web sem preload, cada superfície com sua própria identidade. Um projeto técnico recebe as escritas; o acervo continua presente no banco e na sincronização do proprietário, sem editar suas peças. Três aquecimentos e vinte amostras medem confirmação HTTP até texto no DOM e dois animation frames. A leitura não força sincronização.

- Ensaio inicial com uma identidade em três sessões: p95 desktop 1.482 ms, web 957/960 ms e navegação 34 ms. Ao alternar rapidamente seções, a mesma conta atingiu o limite compartilhado de 300 leituras/minuto. Isso é um limite registrado de múltiplas sessões de uma conta, não prova de carga da equipe. `evidence-single-identity.json` foi preservado; nenhuma quota foi aumentada.
- Com três identidades: p95 desktop 1.097 ms, web 1.528/1.528 ms, navegação 34 ms; **244 respostas 200**, nenhuma falha HTTP. `proof-l9-ui-team.log`.
- A repetição de encerramento deixou aparecer no log um cancelamento intencional como falha de rede. O ciclo de vida IPC agora deixa de tentar entregar erro ao consumidor durante encerramento explícito, após abortar a vida do app. Pedidos em andamento continuam drenados e recibos pendentes preservados; falhas fora do encerramento continuam propagadas. A repetição com pedidos enfileirados (`--smoke-shutdown`) passou sem erro de handler: **250 respostas 200**, p95 desktop **1.115 ms**, web **1.471/1.472 ms**, navegação **34,2 ms**. `proof-l9-ui-shutdown-final.log` e `ui-latency-proof/evidence.json`.

São janelas offscreen com throttling desabilitado, uma máquina/loopback, Next dev e nenhuma geração/render pesada simultânea. Dois animation frames não substituem a medição física de tela. Memória por processo e CPU acumulada ficam no JSON; `percentCPUUsage` da primeira amostra não é medida válida de utilização média. Ainda faltam carga visual ativa, piloto humano em duas máquinas e critérios funcionais restantes; não declarar L9 completo.

### Análise → hipótese → próxima pauta

O comando transacional `learning-pieces` cria a pauta, sua representação/componentes e o vínculo de volta à análise em uma única operação. Repetição recupera o recibo original; mudança concorrente da análise ou segunda proposta é recusada. A pauta guarda a revisão exata da análise; o contexto de IA carrega essa revisão e suas fontes imutáveis. O comando exige objetivo, hipótese e critério de avaliação. Não aprova, agenda, publica ou altera a direção. O formulário compartilhado abre a pauta criada e permite escolher formato e mídia.

PostgreSQL: **28 testes / 131 assertions**, incluindo execução existente, concorrência, perda de resposta, contexto histórico, revisão desatualizada, outro projeto e origem forjada. Tipos backend/workbench passaram. A primeira execução encontrou um uso incorreto de asserções assíncronas no teste; corrigido para `node:assert` sem ampliar timeouts ou alterar transações.

`scripts/prove-learning.ts` passou no Chromium web com BFF/servidor/banco reais: abriu a análise pela interface, preencheu critério, escolheu story/vídeo e abriu o novo rascunho com prévia Remotion. A captura do formulário foi inspecionada. O registro IndexedDB real preservou pedido de 80.000 caracteres após falha de transporte simulada. Seu limite anterior de leitura de chave (32.000) não cobria briefings longos; agora admite o payload válido escapado, com validação específica antes de repetir. A prova não gera nem publica vídeo. Evidências em `learning-proof/evidence.json`, `learning-dialog.png`, `learning-piece.png` e `proof-learning.{out,err}.log`.

O protocolo de workspace passa a **2**, mínimo desktop **2**, pois documentos estritos antigos não reconhecem `originAnalysis`. Clientes novos ainda consultam servidores de protocolo 1; clientes anteriores bloqueiam sincronização sem apagar pendências diante do 2. Instalar desktop/web novos junto do backend; servidor antigo não admite gravar os novos campos. Migração SQL não é necessária para esses campos JSON opcionais.

### Repetição durante transferência grande

O ensaio de três identidades foi repetido com sobreposição parcial à conferência remota do arquivo de 2 GB. p95 desktop **1.491 ms**, web **888/888 ms**, navegação **34,3 ms**, **266 respostas HTTP 200**, sem erros de handler. `proof-ui-large-transfer`, código 0; o JSON anterior foi copiado antes da repetição. A carga de verificação terminou antes das últimas amostras. Continua sendo uma máquina/loopback, sem render visual pesado; não encerra o piloto físico. Ver [recuperação L3](marketing-l3-recovery-review-2026-10-16.md) para delimitação das provas.
