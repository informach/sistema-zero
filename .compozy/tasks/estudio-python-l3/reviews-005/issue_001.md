---
status: resolved
file: packages/studio/e2e-runtime/python-lifecycle.spec.ts
line: 166
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Anexo registra aprovação antes de concluir o encerramento

## Review Comment

O finally anexa a evidência, que já pode conter qualification = local-console-lifecycle-passed, antes de aguardar cdp.detach(). Se detach rejeitar, o teste termina com falha, mas o anexo continua declarando aprovação e não registra a falha de cleanup. No sentido inverso, uma falha em testInfo.attach impede que detach seja chamado. Os dois efeitos vêm da mesma ordem de finalização: persistência e liberação não são independentes, e o status final é serializado antes de se conhecer o resultado do encerramento.

Reprodução sem navegador: extrair e executar exatamente o bloco finally atual com testInfo.attach que captura o JSON e cdp.detach que rejeita. Resultado: erro "CDP disconnected", detach chamado uma vez e anexo ainda com qualification: "local-console-lifecycle-passed". Com attach que rejeita e detach instrumentado, o erro é "attachment failed" e detach recebe zero chamadas. Nenhuma fonte foi modificada para a reprodução.

Finalizar a sessão CDP antes de serializar a evidência final, registrar cleanupFailure e remover qualification se o encerramento falhar, preservando a falha do teste. Garantir a tentativa de encerramento mesmo se a gravação do anexo falhar. O helper pode ter testes de falha sem repetir os 30 ciclos de navegador, pois o problema está na finalização da prova, não no protocolo do runtime.

As duas execuções salvas nesta rodada efetivamente passaram; o achado não invalida suas medições de memória ou tempo. Ele impede que futuras falhas de finalização sejam publicadas como aprovação nos anexos. A mesma preocupação já foi resolvida nos probes anteriores de L0 e não aparece no r2-proof.ts atual, que remove a aprovação quando dispose falha.

## Triage

- Decision: `VALID`
- Notes: Ordem conferida diretamente e reproduzida com o bloco finally extraído do arquivo atual. Não foram iniciados navegadores nem alteradas fontes nesta revisão.

- Resolution: A finalização agora tenta detach antes do anexo, captura cleanupFailure, remove qualification em falha e relança o erro após anexar. Se attach falha, a tentativa de detach já ocorreu.
- Verification: Bloco finally corrigido extraído do próprio arquivo e executado independentemente com quatro cenários: detach falha, attach falha, sucesso e falha anterior. Todos confirmaram uma tentativa de detach; falhas não conservaram aprovação, sucesso a conservou e o erro anterior foi preservado. Biome da spec e git diff --check passaram. Não foi necessário repetir os ciclos, pois o protocolo e a medição não mudaram.
