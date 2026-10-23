---
status: resolved
file: packages/studio/src/runtime/python/bootResourceBroker.ts
line: 20
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Broker aceita store vinculado a outro manifesto de boot

## Review Comment

O broker copia seu manifest, mas recebe store.read como porta independente e não vincula a configuração desse store ao manifesto esperado. Após a leitura, verifica apenas comprimento/tipo do Uint8Array. Um store real e corretamente verificado para outra release pode devolver bytes diferentes com o mesmo tamanho; o broker os transfere como recurso de sua própria release, sem falha. O reader recebe apenas nome/bytes e confia nessa capacidade privada. A verificação do store confirma o pin B, não o pin A que o broker anunciou.

Prova independente `packages/studio/.cache/review116-boot-store-binding.test.ts` constrói dois deployments/releases Core reais, verifyStudioPythonDeployment via createPythonBootResourceManifest, com três descritores de mesmos tamanhos e hashes diferentes. createPythonBootResourceStore real configurado com B verifica SHA B; createPythonBootResourceBroker recebe manifesto A; reader solicita URL A. Resultado received='release B bytes', errors0; expectedSHA A95d6ce248c60bcfd536cdc093303bb5ee53a2215e6957ec319cae9ac337420ba, actualSHA B9790f69384beee6d610658dec5f928a8edc702cc0942c4375104077c316b7b50. `bun test ./.cache/review116-boot-store-binding.test.ts` em Studio: exit1,0pass/1fail/2asserts. Não se usou um store fake que ignora SHA: store B validou seu próprio pacote. Não há consumidor deste novo canal em produção ainda; o achado é na fronteira que permitirá wiring incorreto antes dessa integração.

Vincular de forma verificável a configuração imutável do store ao manifesto do broker antes de admitir a porta ou chamar read. Pode-se expor uma chave estrutural canônica somente de identidade (pin+três descritores name/bytes/SHA/MIME, ordem normalizada), congelada no store e comparada pelo broker, sem repetir hash de todos os binários. A chave não concede autorização nem é credencial. Copiar read/key antes dos awaits; recusar mismatch de pin ou qualquer descritor, e aceitar descritores equivalentes em ordem diferente.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou medium. Fix preferido Object.freeze(store) com manifestKey readonly canônica e comparação no broker antes do uso; helper normaliza ordem. Permanentes devem incluir stores reais A/B, mesmo pin com descritor alterado e equivalência de ordem, sem hash duplicado16MiB. Nenhuma produção/permanente alterada pelo revisor. Aguarda patch/revalidação.

### Independent revalidation — gates pending

Patch causalconfirmado por26testes/138asserts EXIT0 (probeprópria+permanentes Store/channel/payload). StoreREALBrecusado antesdeporthandler/IO; mesmo pin SHA/tamanhodivergentes recusados, descriptororderreversa funciona, key/read Object.freeze impedemmutação. Keycanônica inclui pin/version/descritores completos, nãoéSHA/autorização e evita hashduplodosbinários. Statusadministrativo permaneceVALID aguardando browser/TSCfresh explicitamente solicitado pela raiz.

### Final verification — resolved

Os gates requeridos foram conferidos. A prova independente causal passou 26 testes / 138 asserts; o leitor independente `.cache/review116-browser5-artifacts.py` passou com 16 resultados Chrome/Edge, sem skips ou retries, incluindo conclusão/forja/abort/timeout e os controles de Store. O log browser5 registra 16 passed. Foi lido o recibo explícito `.cache/studio-python-l0/l8-boot-channel-typecheck-2.receipt.txt`: sessão 15825 colhida pela raiz, exit0, stdout/stderr vazios; nenhum log de saída do TSC foi criado. O log unitário da raiz registra 32 pass / 0 fail / 189 asserts. Sem outro achado neste vínculo. Resolvido somente o contrato Store/Broker; consumidores, CPython/SDK e desempenho não são qualificados por esses bytes inertes.
