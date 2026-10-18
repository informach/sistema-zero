---
status: resolved
file: packages/studio-runtime/tests/fixtures/prepare-python-sdk-linux.ts
line: 62
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Build da ferramenta SDK fica fora do prazo do harness

## Review Comment

`preparePythonSdkLinux` inicia `docker build` e aguarda `built.exited` sem prazo ou cancelamento. O caller `tests/python-sdk-smoke.ts` instala seu timer de 600 segundos somente depois de aguardar essa preparação. Se o build ou acesso ao daemon não termina, a prova fica pendente indefinidamente, sem chegar ao timer ou ao finally de encerramento. O limite anunciado não cobre o preparo da ferramenta Linux, justamente necessário no Windows onde o Wrangler Containers nativo é explicitamente incompatível. Este é um defeito do harness de QA, não do aplicativo nem da limitação Windows do Wrangler.

Prova independente leve: `bun test ./.cache/review076-harness-deadline.test.ts`, cwd `packages/studio-runtime`, **exit0, 1 pass, 7 assertions**. O teste importa a função real com filesystem e `Bun.spawn` controlados, entrega um subprocesso cujo `exited` fica pendente e confirma: o build foi iniciado, nenhum timer/kill foi instalado, a preparação permanece pendente e só termina depois que o teste libera `exited`. Também confere a ordem real do caller: o await da preparação precede a instalação do timer. Nenhum Docker, SDK, workerd, browser ou build real foi executado pelo revisor.

Criar a lifetime total antes da preparação e propagá-la ao build e ao restante da prova. Em abort/deadline, encerrar somente o processo/container owned, observar a conclusão ou aplicar grace limitada e preservar logs/erro primário. O preparo também deve rejeitar sem dispatch se a lifetime já terminou. Não usar encerramento global de Docker ou de processos alheios.

## Triage

- Decision: `VALID`
- Notes: Correção revalidada independentemente. O caller cria a lifetime de 600s antes do build/preparo e a passa ao helper. O helper exige signal, confere antes de preparar/copiar e imediatamente antes do spawn, associa abort ao processo owned e usa awaitWithSignal para encerrar a espera sem depender de exited. O finally retira listener e pede kill apenas ao child owned ainda ativo. O caller confere lifetime imediatamente antes do spawn principal, faz race também da leitura dos logs e usa grace independente de 20s para docker stop do nome exclusivo da prova.

### Revalidação independente

`bun test ./.cache/review076-harness-deadline.test.ts ./.cache/review076-linux-signals.test.ts ./.cache/review076-main-lifetime.test.ts`, cwd `packages/studio-runtime`: **exit0, 11 pass, 0 fail, 37 assertions**. Cobre lifetime antes do preparo; signal já-abortado sem cópias/spawn; aborto no último write sem dispatch; docker build pendente rejeitado antes de exited; aborto dentro do spawn antes do listener; exited tardio sem alterar o erro/kill; sucesso que retira listener e exit não-zero que continua falha; encaminhamento SIGTERM somente ao command owned; microtask de retorno do preparo com aborto antes da continuação sem spawn principal; drains pendentes encerrando a espera em abort; stop pendente rejeitado/retirado pela grace independente.

O helper é importado diretamente com filesystem/spawn controlados. O trecho principal e helper CJS de sinais são extraídos do código real; para executar o trecho principal em AsyncFunction, o probe apenas resolve import.meta.dirname para o diretório original e transpila TypeScript, sem alterar a lógica. A primeira tentativa desse probe usou import.meta em AsyncFunction e falhou por sintaxe do probe; após corrigir a resolução, a prova completa acima passou.

`bunx biome check tests/python-sdk-smoke.ts tests/fixtures/prepare-python-sdk-linux.ts tests/fixtures/python-sdk-worker.ts tests/fixtures/python-sdk-workerd.cjs tests/fixtures/python-sdk-linux-runner.cjs`: **exit0, Checked 5 files, No fixes applied**.

Escopo do fechamento: prazo e cancelamento do build da ferramenta e espera/stop do processo principal, com portas controladas. Nenhuma fonte/teste de produção alterado pelo revisor; nenhum SDK, Docker, workerd ou browser executado nesta revalidação. A primeira execução Linux falhou antes do SDK por falta de buildx, e outra por CA pública ausente na imagem da ferramenta; essas falhas operacionais não são defeitos do app nem prova SDK bem-sucedida. O handler SIGTERM adicional no runner nativo CJS está sendo implementado separadamente e não é qualificado por este fechamento. Não se afirma remoção real de containers SDK, Cloudflare remoto ou conclusão do lote.
