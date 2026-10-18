---
status: resolved
file: packages/studio-runtime/src/python-inputs.ts
line: 248
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Cancelamento de body sem limite deixa operação pendente

## Review Comment

O caminho de upload repetido aguarda existing.body.cancel() sem inputAwait ou outro limite. O catch de resolve.read também aguarda object.body.cancel() antes de devolver um erro já conhecido. Se o produtor/R2 não confirmar esse cancelamento, o abort do actor, a expiração e o deadline deixam de encerrar a operação. O pedido de cancelamento já aconteceu; esperar seu acknowledgement indefinidamente mantém a chamada e seus recursos pendentes.

Prova independente `.cache/review071-inputs-boundary.test.ts` executa o store real com porta R2 controlada. Primeiro confirma um upload; na repetição, body.cancel entra em um gate. Depois de abortar o actor, a promessa permanece pending até a liberação manual do gate. Segundo caso fornece um objeto com tamanho divergente a resolve.read e prende o cancelamento do body no catch: o erro e o abort também não encerram a chamada antes dessa liberação. Resultado: 0 pass, 2 fail, 3 verificações, exit1; Expected rejected / Received pending nos dois caminhos. Os gates foram liberados ao terminar a prova; nenhum processo ou recurso externo foi deixado pendente.

No caminho de repetição, limitar a espera pelo cancelamento com o lifetime existente. No catch de leitura, solicitar cancelamento e tratar sua eventual rejeição sem bloquear o erro original, ou aplicar um limite explícito que preserve o settlement após abort. Deduplicado nos dois pontos por terem a mesma causa. Nenhuma produção foi alterada pelo revisor; nenhum Docker/browser/build/TSC/R2 real foi executado.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e aplicou inputAwait(existing.body.cancel(), lifetime) no upload repetido e void cancel(error).catch no catch de leitura, preservando o erro original. Revalidação independente dos dois reproduzidores passou; provas adicionais cobrem rejeição do cleanup, snapshot/owner capturados antes de await, remoção negada a outro owner, metadata excessiva recusada antes de pull, SHA da metadata sem aceitar revisão adulterada, upload repetido sem consumir bytes substitutos, hash dos bytes efetivos, separação de identidade por projeto com mesmo conteúdo/nonce e expiração durante get. Combinado `bun test tests/python-inputs.test.ts tests/python-file-stream.test.ts tests/python-inspection.test.ts ./.cache/review071-inputs-boundary.test.ts`: exit0, 29 pass, 0 fail, 1123 verificações. Core input/identity: exit0, 4 pass, 54 verificações. Biome fresh dos seis arquivos exit0. Nenhuma produção alterada pelo revisor; nenhum heavy ou R2/Cloudflare real executado. O recorte confirma o módulo privado, não endpoints/quotas/GC/autoridade contextual; o profile/imagem anterior também não qualifica esses novos arquivos.
