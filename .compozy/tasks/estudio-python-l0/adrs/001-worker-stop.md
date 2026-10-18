# ADR 001 — Interrupção e restrição de workers Python

Estado: decisão técnica de implementação; qualificação integrada continua pendente. Data:16/10/2026.

## Evidência e causa

A meta original exigia ausência de qualquer atividade após1s. Os primeiros probes mediam somente retorno de Parar/invalidação da geração. A prova nativa posterior acompanhou targetId e CPU do renderer: Worker.terminate em loop Python ocupa CPU por cerca de2s. O Chromium tem um prazo interno de2s antes de forçar a interrupção. [Código primário](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/workers/worker_thread.cc). A tag exata do Chrome instalado não foi reconciliada com esse commit; a relação causal é compatível com a fonte, enquanto os tempos/CPU são observações diretas.

Remover iframe não resolveu. Navegar para about:blank só foi rápido quando o Chromium conseguiu encerrar o processo inteiro; com outro iframe vivo, voltou a2s. Não usar navegação como garantia. Com um worker filho também preso em loop, o término chegou a4s; a topologia sem restrição de filhos foi rejeitada. Evidência original: `.cache/studio-python-l0/termination-chrome-bac7c2e8-0dc2-4ee4-b413-2c4105f84cc1.json`.

## Decisão

1. Manter origem separada e sandbox **opaco**. Não conceder allow-same-origin nem trocar headers da aula/vídeo.
2. Perfil Python exige Trusted Types efetivamente aplicado ao bootstrap, além de WASM/JSPI. CSP permite somente a policy `sz-python-bootstrap`, sem duplicatas/default. No frame, policy privada emite somente a URL do Blob atual; no worker, o mesmo nome é reservado com policy vazia **antes de qualquer fonte Python**. A verificação nativa impede construir Worker com strings ou objetos falsificados. O perfil falha fechado sem essa capacidade; não há fallback sem proteção.
3. Somente bootstrap Blob clássico com import dinâmico está qualificado. Outros modos são recusados quando a proteção está ativa; a revisão encontrou policy ainda disponível no caminho módulo anterior. A política e o bootstrap fazem parte da release imutável revisada. Não sobrescrever Worker/trustedTypes nem alterar protótipos.
4. Parar invalida a geração primeiro, corta renderização/entrada/áudio/saídas e resolve operações pendentes; então usa Worker.terminate. A ação continua imediata. O programa não pode persistir efeitos pela identidade antiga, mesmo enquanto o navegador recolhe o worker.
5. Onde crossOriginIsolated e SAB já estão disponíveis, usar o mecanismo oficial setInterruptBuffer como aceleração, antes de terminate. O programa pode ignorar SIGINT; a interrupção cooperativa não substitui encerramento. Nos10 loops iniciais, esse caminho destruiu o target em8,7–10,3ms; com SIGINT ignorado, cerca de2s. Uma repetição Edge observou também um loop comum levar2009,84ms (`termination-edge-b03b7484-4f65-4540-baf6-328be6e578f3.json`), após seis amostras rápidas. Portanto nem esse caminho promete término físico em1s: a aceleração é oportunista e a causa dessa variação ainda não foi isolada. A asserção opcional de1s foi reprovada e retirada como gate, preservando a observação e o contrato nativo de3s. [API oficial](https://pyodide.org/en/stable/usage/keyboard-interrupts.html).
6. Revisar explicitamente a meta nativa para3s na carga de qualificação do perfil protegido, preservando ACK≤250ms e corte de efeitos antes do ACK. Isso reconhece o prazo do motor, não adiciona espera ao produto. A meta original1s foi **reprovada**, não corrigida. Não introduzir sleeps, navegação ou sys.settrace para disfarçá-la. Nenhuma API web promete prazo de tempo real sob suspensão do SO.

## Provas e limites

Prova inicial protegida Chrome: `browser-probes-2026-10-16T19-43-34.198Z-90e4e5cf-5d83-4c39-a8ae-87549df055d9.json`; `security-chrome-7d3a0c7c-c02e-4b59-932a-ac43092d94ba.json` confirma filho/policies bloqueados, rede proibida sem requests e recuperação. Revisor readonly testou adicionalmente Reflect.construct, protótipo falso, objeto URL, emptyScript/importScripts e reinício. Não inferir suporte a outros browsers por marca/API presente.

A medição protegida de término e a repetição em Edge devem constar no relatório L0 antes da aprovação. Provas integradas incluem30 ciclos, memória nativa, responsividade com vídeo e troca rápida de projetos. Um worker não oferece quota rígida de RAM contra alocação hostil; não anunciar imunidade a OOM. Não montar interpretadores extras em cards ou preaquecer sessões sem orçamento medido. A geração antiga perde autoridade mesmo quando a liberação nativa demora.

Referência normativa: [Trusted Types](https://www.w3.org/TR/trusted-types/). A restrição faz parte do modelo de capacidades do navegador e da CSP; não é um instalador de bibliotecas nem qualifica novas extensões automaticamente.
