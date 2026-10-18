---
status: resolved
file: packages/studio-runtime/src/python-inputs.ts
line: 264
severity: high
author: claude-code
provider_ref:
---

# Issue 001: R2 recusa stream verificado sem comprimento conhecido

## Review Comment

store.upload fornece transfer.stream diretamente a bucket.put. verifiedPythonFileStream cria um ReadableStream genérico, que não conserva a informação de comprimento conhecida pelo binding R2. index também passa PYTHON_INPUTS raw ao módulo. O R2 exige um stream de comprimento conhecido; portanto o upload normal falha500 antes de qualquer inspeção, embora os doubles de armazenamento aceitem esse mesmo stream e os testes unitários passem.

Evidência válida fornecida pelo implementador e conferida pelo revisor: `.cache/studio-python-l0/l6-python-r2-inputs-before-adapter-2.log`, `tests/python-r2-inputs.test.ts` e fixtures `python-inputs-worker.ts`/`python-inputs-workerd.cjs`. Node24.22 inicia Wrangler unstable_dev com ESbuild, workerd local, R2 remote:false, persist:false, forceLocal e containers desabilitados. O store real abre o input200; no primeiro upload retorna500 com Provided readable stream must have a known length (request/response body or readable half of FixedLengthStream). A assertion expected200/actual500 falha; 0 pass,1 fail,exit1. Não foi deploy nem binding remoto. A tentativa anterior com erro de startup/bundle não é evidência deste defeito. A leitura do revisor confirma o caminho direto do stream genérico ao raw binding; o revisor não repetiu workerd nesta etapa.

Introduzir adapter de R2 que dê comprimento conhecido ao stream sem buffering/base64. O tamanho deve vir da metadata registrada, nunca do Content-Length enviado pelo caller. Preservar checksum R2 e conditional onlyIf, backpressure e ownership de pipe/body, com verificação/ack antes da aceitação. Cobrir vazio, tamanho divergente, duplicate conditional-null, falha do sink e cancelamento/pipe tardio. O store privado e a fixture workerd devem usar o mesmo adapter da factory de produção.

## Triage

- Decision: `VALID`
- Notes: Correção revalidada independentemente. `createPythonR2InputStorage` converte apenas streams para `FixedLengthStream(bytes)`, com comprimento vindo de `file.byteLength` da metadata registrada; preserva checksum e `onlyIf`, remove a opção neutra `bytes` antes do binding, mantém Uint8Array nativo e é ligado pelo index e pela fixture workerd. Não há buffer/base64/fallback. O store conserva a propriedade do verificador e o cancela após conditional-null ou erro do sink.

### Verificação independente após a correção

- `STUDIO_PYTHON_TEST_NODE=<cache Node24.22>/node.exe bun test tests/python-r2-inputs.test.ts`, cwd `packages/studio-runtime`: **exit0, 1 pass, 0 fail, 16.95s**. Node nativo + Wrangler/workerd + R2 local exercitam o store e o MESMO adaptador: bytes binários, vazio, duplicata, curto/excessivo/hash inválido sem objeto residual, recuperação com bytes corretos, 32 MiB em chunks, leitura e fechamento. Evidência do subprocesso preservada no diretório UUID criado pelo teste sob `.cache/studio-python-l0/r2-inputs/`.
- Node24.22 `.cache/review075-r2-ownership.cjs`: **exit0, quatro casos** com `FixedLengthStream` nativo. Conditional-null e sink rejeitado com cancelAck upstream que nunca resolve não impedem settlement; checksum/onlyIf são preservados; Uint8Array passa diretamente sem `bytes`; aborto do proprietário durante escrita R2 real rejeita, cancela o produtor uma vez e não deixa objeto. Cache usa `verifiedPythonFileStream` e o mesmo `transfer.cancel` que `store.upload` executa no null/catch. A primeira tentativa direta com stream genérico não incluía esse proprietário e foi corrigida no probe, sem mudança de produção.
- `bun test tests/python-inputs.test.ts tests/python-file-stream.test.ts tests/python-requests.test.ts`: **exit0, 22 pass, 0 fail, 1132 assertions**.
- `bunx biome check src/python-r2-inputs.ts src/python-inputs.ts src/index.ts tests/python-r2-inputs.test.ts tests/fixtures/python-inputs-worker.ts tests/fixtures/python-inputs-workerd.cjs`: **exit0, Checked 6 files, No fixes applied**.

Escopo: fechamento do defeito de comprimento conhecido e revisão do adaptador/integração/lifetime. Nenhuma fonte ou teste de produção alterado pelo revisor. Provas são R2/workerd LOCAL, sem deploy, binding remoto, browser, Docker ou execução de consumidor; não qualificam Cloudflare remoto nem o lote completo.
