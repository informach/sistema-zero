---
status: resolved
file: packages/studio-runtime/Dockerfile
line: 28
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Imagem do SDK não declara a porta de controle 3000

## Review Comment

O Dockerfile de produção usa Node como base e copia apenas o executável `/sandbox` da imagem Cloudflare SDK 0.10.3. Essa cópia não herda a metadata de portas da imagem de origem. O estágio final não declarava EXPOSE, enquanto o Dockerfile do SDK declara `EXPOSE 3000` e a classe Sandbox usa `defaultPort = 3000`.

O build da imagem termina com sucesso, mas a integração real local via Wrangler 4.120.1 não instala o handler: `checkExposedPorts` consulta `{{ len .Config.ExposedPorts }}` e rejeita zero portas com `The container "ProBuildSandbox" does not expose any ports`. Isso bloqueia o caminho SDK antes da própria chamada health/inspeção; a prova Docker via CLI anterior não atravessava esse guard e portanto não identificava a lacuna.

Evidência do implementador conferida independentemente por leitura: `.cache/studio-python-l0/l6-python-sdk-before-expose-proof.log` registra a rejeição real e termina com `EXPECTED_STARTUP_REJECTION_MISSING_EXPOSE_3000`; o log interno preservado está em `.cache/studio-python-l0/inspection-sdk/4dbf8d7b-9029-4d8b-8298-749e6df931fb/linux/wrangler-before-expose.log`, linhas 81–84. O Dockerfile staged no mesmo diretório não contém EXPOSE e continua usando a base Node. O implementador também confirmou image inspect com zero portas em `cloudflare-dev/probuildsandbox:755a46e5`. A reprodução é Linux + Wrangler/workerd/Docker locais, sem deploy ou SDK child iniciado; não é evidência de falha em produção remota.

Prova leve independente: `bun test ./.cache/review077-expose.test.ts`, cwd `packages/studio-runtime`: **exit0, 3 pass, 10 assertions**. Confere staged sem EXPOSE, receita atual com a única adição `EXPOSE 3000`, contrato do SDK instalado e o log real. Executa o `checkExposedPorts` extraído do Wrangler instalado com image-inspect controlado: zero rejeita, uma porta passa. O revisor não executou Docker/SDK/workerd.

Declarar a porta de controle do SDK no estágio final sem publicar portas arbitrárias ou alterar a política de rede. Regenerar o perfil/imagem e reexecutar o caminho SDK real local para confirmar que a validação de portas deixa de bloquear e que o handler/inspeção são efetivamente alcançados.

## Triage

- Decision: `VALID`
- Notes: Correção revalidada por conferência independente dos artefatos reais da SDKLinux5. A receita staged contém EXPOSE 3000; imagem compilada `cloudflare-dev/probuildsandbox:64d7df02`, manifest `sha256:a2286da724556777cc915e7230bd9f338faebba1446a0e3ef993082ccd360c86`, perfil `2ae3d898ef64b7561784dce6c847589a65c77b36df5e87799d4446325d437e41`. O caminho que antes era rejeitado agora chega a health200, 23 arquivos runtime + marker, uploads BOM/vazio, inspeção pelo index/default SDK/RPC e remoção200. Encerrar apenas o defeito de porta; higiene do sidecar de QA está separada na issue002.

### Revalidação independente após a correção

Evidência real executada pelo implementador: `.cache/studio-python-l0/l6-python-inspection-sdk-linux-5.log` e `.cache/studio-python-l0/inspection-sdk/3753be94-7221-40b6-947e-1bb6a57ca6ba/{result.json,stdout.log,stderr.log,linux/wrangler.log}`. O result registra exit0, report passed, CPython3.14.2 e revision `52c30719742431d77cf9b2004abb747acc2d10f2d5f52f9e16d8311820280dde`, com hashes exatos dos dois arquivos. O tempo 12181ms é UMA observação funcional, não performance/30samples.

Prova leve do revisor: `bun test ./.cache/review077-expose.test.ts`, cwd `packages/studio-runtime`: **exit0, 4 pass, 27 assertions**. Além do guard e rejeição anterior, carrega o seed/config/report da execução atual, recalcula os hashes dos bytes BOM/vazio, verifica metadata+report via Core `verifyStudioPythonInspectionReport`, valida deployment/marker via Core e confere staged EXPOSE, perfil, imagem e requests200 nos logs. Não reexecuta Docker/SDK/workerd nem usa doubles para afirmar que a execução real ocorreu.

Nenhuma fonte/teste de produção alterado pelo revisor. A qualificação é Linux/local SDK/R2/CPython, sem deploy ou Cloudflare remoto, sem alegação do lote completo ou de cancelamento SDK real.
