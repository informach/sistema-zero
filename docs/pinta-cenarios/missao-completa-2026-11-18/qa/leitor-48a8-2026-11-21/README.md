# Leitor integrado ao remoto 48a8 — 21/11/2026

Este lote integra os quatro commits públicos após a674, incluindo a execução leve do Pro,
e corrige exclusivamente uma precondição de QA no Molda, dentro da exceção autorizada.
Não houve edição funcional 3D privada, ativação de distribuição, política ou gravador.

A CI do leitor 24226 falhou porque o teste aguardava a lista de movimentos e consultava
sincronamente um botão da linha do tempo, carregada em outro módulo. Seus outros onze
jobs de verificação passaram. O original passou isoladamente no Bun 1.3.11 e 1.4.4 e
também nos 1.392 casos da suíte Windows: não se declara reprodução local espontânea.
O diagnóstico separado controla a conclusão do módulo da linha do tempo e demonstra
que a lista/renomeação/revogação podem estar prontas antes dele. O acesso síncrono
falha nessa janela e a espera assíncrona encontra o botão quando o módulo termina.
O teste agora estabelece a reprodução antes de verificar sua preservação após revogar.
As verificações de conteúdo, revisão, ação retida e nome restaurado permanecem.
Não foram acrescentados sleeps nem alterados timeouts.

Referência: [espera por aparição na Testing Library](https://testing-library.com/docs/dom-testing-library/api-async/).

Os treze controles locais deste lote estão em pinta-48a8-gates.json, com seus logs.
O Worker continua idêntico à imagem qualificada 598 (1.979.073 bytes; SHA no recibo),
e todos os 126 arquivos do guest Python permanecem idênticos. A qualificação da imagem
e do guest não substitui a nova CI da aplicação integrada. O arquivo com nome cache
pro-performance-report é somente a origem histórica do relatório pro-light-browser:
este lote não declara uma nova medição de desempenho do Pro ou do Pinta.

RPC99 instalou uma restrição de mutações aos oito recursos próprios de QA, preservando
a aba histórica retida. Isso prepara a homologação autenticada; não comprova ainda
o rollout, o ciclo de publicação, conflitos reais da escrita 6 ou rollback.

Etapa 0b, etapa 8 e missão completa continuam pendentes.
