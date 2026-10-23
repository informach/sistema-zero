---
status: resolved
file: packages/studio-runtime/src/python-previews.ts
line: 188
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: ACK pendente mantém preview cancelado sem settlement

## Review Comment

O store aguarda diretamente os puts nativos, inclusive após cancelamento; esses awaits não competem com signal nem prazo. Uma porta que já gravou o arquivo mas perdeu/retardou o ACK retém a Promise indefinidamente. O comentário de esperar native puts explica a intenção de não perder ownership, mas o record gravado primeiro já oferece a trilha para GC de bytes incertos, portanto não exige manter o job cancelado aberto até ACK ilimitado. Delete de cleanup e cancel de bodies também merecem a mesma disciplina de settlement.

Reprodução independente: `bun test ./.cache/review085-previews.test.ts -t 'lost native put'`, cwd Runtime. Porta grava o primeiro arquivo real da fixture e segura somente a resolução do put; depois aborta o owner. Esperado retired, recebido still pending após40ms. A prova libera a própria porta no finally e aguarda sua operação, sem deixar recursos próprios. O defeito é o await sem bound, não a duração40ms usada para observar uma Promise que não tem resolução enquanto a porta fica retida. Sem SDK/browser/R2 real nesta prova.

Competir cada I/O com lifetime/prazo explícito, preservar o record para coleta e solicitar cleanup próprio também quando uma gravação resolve tardiamente. Não transformar timeout/cancel em referência publicada nem depender de ACK infinito para retornar erro.

Extensão da mesma causa confirmada em servePythonPreview: `-t 'marker body cancellation'` antes exit1/1fail/1assertion. O body cancel do marker retinha o handler após requestabort (expected404/receivedstillpending), até a própria prova liberar o ACK no finally. Não é issue extra: awaits de retirement também precisam de bound.

## Triage

- Decision: `VALID`
- Notes: Revalidado após correção completa: puts por inputAwait/lifetime90s; late file/marker ACK solicita delete independente limitado5s; catch cleanup limitado5s e GC record retido. Serve bodycancel compete com requestsignal e limite5s; approval/approved bodycancel por inputAwait(signal). Originais missingACK e marker-bodycancel agora passam. Probes adicionais atrasam a gravação REAL de arquivo/marker para depois do cancel e do cleanup inicial; após ACK tardio nenhum objeto data/marker permanece e record segue coletável. Suite própria9/24 exit0; permanente18/138 exit0 inclui ambos cancelamentos. Não houve browser/SDK/R2 real nem fontes/testes permanentes alterados pelo revisor.
