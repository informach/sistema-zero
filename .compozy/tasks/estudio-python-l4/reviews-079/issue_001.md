---
status: resolved
file: packages/studio-runtime/src/python-job-state.ts
line: 55
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Confirmação de cleanup não impede criar sandbox depois

## Review Comment

O store SQLite só impede a primeira criação de sandbox quando status já é terminal. Um estado running/sandboxCreated=false pode confirmar cleanup e depois aceitar sandboxCreated=true, mantendo cleanupConfirmed=true. Isso permite que o registro avance para succeeded com uma confirmação referente ao momento em que nenhum sandbox existia, sem nova limpeza da geração criada depois. A monotonicidade da flag, isoladamente, não preserva a ordem da fence.

Reprodução independente com o módulo real e SQL real Bun SQLite: `bun test ./.cache/review079-job-cleanup.test.ts`, cwd StudioRuntime, exit1/1pass1fail/6assertions. O caso queria rejeitar running false/false → cleanupConfirmed=true → sandboxCreated=true, mas recebeu stateVersion3/sandboxCreated=true/cleanupConfirmed=true. O controle create → cleanup → succeeded passou. O implementador reproduziu também no workerd SQLite real: `.cache/studio-python-l0/l6-python-job-state-cleanup-fence-before-1.log`, expected409/actual200 no cenário cleaned.

Impedir a primeira criação após cleanupConfirmed, independentemente de ainda estar running. Preservar o fluxo legítimo de criação seguida de cleanup e sucesso, CAS e as transições terminais existentes. Este é um defeito de constraint da fundação privada; não é alegação de rota/coordenador já ativado nem de aprovação SDK falsa em produção.

## Triage

- Decision: `VALID`
- Notes: Correção revalidada. A primeira criação agora exige status running E cleanup ainda não confirmado; estado já criado continua preservando idempotência/monotonicidade. `bun test ./.cache/review079-job-cleanup.test.ts`: exit0/2pass/6assertions no SQL real Bun, incluindo fluxo legítimo create→cleanup→success. Repetição independente `STUDIO_PYTHON_TEST_NODE=<cache Node24.22>/node.exe bun test tests/python-job-state.test.ts`: exit0/1pass/2assertions do wrapper, com asserts nativos completos no workerd/SQLite real, reset DO e cenário cleanedrunning→criação409. Evidência própria em `.cache/studio-python-l0/job-state/10b0fac9-cdab-4047-a99a-9822a7c89683/`; processo owned encerrado. Nenhuma fonte/teste de produção alterado pelo revisor.

### Escopo e verificação complementar

Core `.cache/review079-neutral-client.test.ts` + `src/studio/python-inspection-job.test.ts`: exit0/3pass/28assertions. Cliente neutro preserva BOM/CRLF, bytes binários, SHA, referência de escopo, autorização e cleanup com global Buffer indisponível; wrapper Next mantém server-only/reexport da mesma classe/função.

`bun test tests/studio-free-options-hook.test.tsx tests/studio-python-runtime.test.ts`, cwd member-shell: exit0/3pass/28assertions, filho nativo15pass/51assertions, com a implementação extraída Core e realm HTTP isolado. Biome8arquivos do escopo:exit0, sem fixes.

Fechamento apenas da fundação de contrato/CAS e extração neutra. A classe concreta `src/python-inspection-job.ts` ainda em implementação está fora deste recorte, sem qualquer alegação de rotas SDK/job ativadas, cancelamento do protocolo completo, Cloudflare remoto ou feature global concluída.
