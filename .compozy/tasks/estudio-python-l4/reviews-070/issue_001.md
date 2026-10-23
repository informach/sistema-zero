---
status: resolved
file: packages/studio-runtime/src/python-inspection.ts
line: 121
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Abort entre leitura e wrapper deixa body sem cancelamento

## Review Comment

A verificação dentro de read(...).then não cobre a continuação adicional criada por await step. Se o body resolve e o sinal é abortado depois desse callback, mas antes da continuação do await, verifiedPythonFileStream lança em signal.throwIfAborted antes de obter o reader. O construtor está fora do try que cancela transfer: o container é destruído e a operação rejeita, mas o body entregue pelo transporte fica sem proprietário e sem cancelamento. Essa corrida pode conservar a leitura/conexão de R2/HTTP após perda de contexto ou prazo.

Prova independente `.cache/review070-stream-ownership.test.ts` no pacote studio-runtime usa o coordenador real e uma promessa já resolvida de ReadableStream. Um callback registrado antes do consumidor agenda o abort na microtask entre o callback de read e a continuação de await step. O job rejeita com actor changed, destroy ocorre uma vez e exec não é chamado; entretanto body.cancel recebe zero chamadas. Recorte completo: 5 pass, 1 fail, 21 verificações, exit1. Os outros casos confirmam cancelamento de body tardio, falha exclusiva do SDK sink, produtor travado, sink que resolve sem ler e espera pelo acknowledgement de escrita. Nenhum browser/Docker/build/TSC foi iniciado e nenhuma produção foi alterada pelo revisor.

Capturar o body assim que a leitura resolver e manter um try proprietário abrangendo leitura, criação do wrapper e envio. Transferir o ownership ao wrapper somente quando sua construção tiver sucesso; em qualquer falha anterior, cancelar diretamente o body capturado. Preservar o cancelamento da resposta que chega depois do abort e não executar antes de hash/completion e write acknowledgement concluírem.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e aplicou pendingBody capturado no callback de leitura, com try proprietário abrangendo await/construtor/mkdir/sink. Transfer assume ownership somente após construção bem-sucedida; catch cancela transfer ou o body capturado. Prova independente adaptada passou o caso original e os demais negativos: 8 testes com body tardio, sink failure sem consumo, produtor travado, sink que resolve sem consumir, espera do acknowledgement, mutabilidade do chunk produtor e erro upstream. Combinado com permanentes: `bun test tests/python-file-stream.test.ts tests/python-inspection.test.ts ./.cache/review070-stream-ownership.test.ts` exit0, 21 pass, 0 fail, 1102 verificações. Core metadata/identity: 4 pass, 0 fail, 54 verificações. Biome fresh dos cinco arquivos de implementação exit0. Leitura das declarações SDK0.10.3 confirma assinatura ReadableStream; não prova transporte Cloudflare real. Nenhuma produção alterada pelo revisor; nenhum build/TSC/Docker/browser executado. Inputstore/endpoints continuam explicitamente fora do recorte e o profile/imagem anterior não qualificam estes novos helpers.
