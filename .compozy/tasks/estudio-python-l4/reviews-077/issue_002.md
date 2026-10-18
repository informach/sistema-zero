---
status: resolved
file: packages/studio-runtime/tests/python-sdk-smoke.ts
line: 218
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Teardown da prova SDK deixa proxy egress local ativo

## Review Comment

O harness terminava o workerd e o container da ferramenta Linux, mas não conferia os containers irmãos criados no daemon Docker pelo workerd. Após a SDKLinux5 terminar exit0 e o compiler ser removido, o sidecar egress `workerd-python-sdk-proof-114b61ea-ProBuildSandbox-88af49ce8856bb7c24e3e0978ad18da8efa015aa7846345e41839ce70d7efbfb-proxy` continuou running, com porta local publicada, fora do container da ferramenta. Assim a prova podia reportar sucesso e deixar recurso owned ativo para as próximas execuções.

Evidência fornecida pelo implementador e conferida pelo revisor: `.cache/studio-python-l0/l6-python-sdk5-leftover-proxy-before.log` identifica ID `84c6f9625922`, imagem `cloudflare/proxy-everything:3cb1195`, nome exclusivo da prova e state running; `.cache/studio-python-l0/l6-python-sdk5-leftover-proxy-after.log` está vazio depois da remoção manual apenas desse recurso owned. O seed/config staged da SDKLinux5 e o result exit0 preservados em `.cache/studio-python-l0/inspection-sdk/3753be94-7221-40b6-947e-1bb6a57ca6ba/` delimitam a execução. É um defeito de higiene do harness local, não prova de vazamento do compiler de produção ou de Cloudflare remoto.

Dar à prova um nonce completo e validar os nomes exatos do parent e o prefixo workerd desse nonce antes de remover qualquer ID. Após stop, registrar before/after dos recursos owned, limpar somente sidecars dessa prova e falhar se sobrarem recursos. Em sucesso da inspeção, não mascarar um compiler ainda presente com a limpeza corretiva: removê-lo por higiene, mas reprovar essa confirmação de teardown. Todo comando deve usar deadline/grace limitada; não usar prune, remoção por imagem ou nomes compartilhados.

## Triage

- Decision: `VALID`
- Notes: Correção revalidada. Novo `stopPythonSdkLinux` usa nonceUUID32, filtro/validação de nomes e IDs, deadline30s, cleanup.json e rejeição de compiler residual em sucesso. SDKLinux6 real terminou exit0; o before contém somente o proxy da prova e after está vazio. Nenhuma fonte de produção alterada pelo revisor.

### Revalidação leve do patch

`bun test ./.cache/review077-cleanup.test.ts`, cwd `packages/studio-runtime`: **exit0, 7 pass, 36 assertions**. Importa o helper real com filesystem/spawn controlados: ownership inválido não inicia Docker; sidecar owned é removido somente pelo ID validado com before/after gravado; compiler residual em prova bem-sucedida é removido mas continua causando falha; cancel/error mode permite saneamento sem afirmar confirmação SDK; qualquer entrada foreign/malformada reprova a lista inteira antes de rm; falha de ps e recursos em after não viram sucesso; Docker não cooperativo rejeita no deadline30s e pede kill somente ao child owned, sem dispatch adicional.

### Conferência independente da execução corrigida

Evidência real executada pelo implementador: `.cache/studio-python-l0/l6-python-inspection-sdk-linux-6.log`, diretório `.cache/studio-python-l0/inspection-sdk/986445ad-7de1-4412-a563-88131df4a05a/{result.json,stdout.log,stderr.log,cleanup.json,linux/wrangler.json,seed.json}`. Result exit0; report da revisão exata `52c30719742431d77cf9b2004abb747acc2d10f2d5f52f9e16d8311820280dde`, CPython3.14.2, dois arquivos passed, remove200. Cleanup.before contém apenas ID `74d705cef053`, nome `workerd-python-sdk-proof-481d3eb530f24392bf849d72e921d368-ProBuildSandbox-741fdb807ff4b1835a0a3d70f3d0aab455e3fd1e8b04b253987ceba6fd5a7891-proxy`; não há compiler primário antes da limpeza corretiva e cleanup.after está vazio.

`bun test ./.cache/review077-cleanup.test.ts ./.cache/review077-sdk6-artifacts.test.ts`: **exit0, 8 pass, 53 assertions**. Além dos negativos de ownership/parse/falha/deadline, confere o nonceUUID32 da configuração contra o nome completo do único proxy, ID válido e after vazio. O report é revalidado pelo Core contra a metadata do seed; hashes dos bytes e deployment/marker são conferidos independentemente. Não depende apenas de uma string verifiedtrue.

Limite: o revisor executou testes leves e conferiu artefatos, sem Docker/SDK/workerd próprios. A SDKLinux6 é qualificação LOCAL executada pelo implementador; não qualifica Cloudflare remoto, cancelamento SDK real ou lote completo. A observação 7066ms do job é funcional, não performance/30samples.
