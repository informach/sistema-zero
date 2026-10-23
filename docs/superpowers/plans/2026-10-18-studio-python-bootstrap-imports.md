# Antecipação dos módulos do worker Python

O baseline atual tem três aquecimentos e dez amostras completas: distribuição `bb10dfef789ab3caccdbd11373e693fb754d55ac959d9be9c51dd6bf4c2bc391`, release `d97a11329a840f2863fb52d938fbe424b7235a8fe38bcc09d85d67dcd6582cae`, servidor Bun 1.4.3 isolado e editor Node/Vite. Mediana após editar: 1859,5 ms; meta mantida em 1500 ms. O perfil atual está em `.cache/studio-python-l0/parallel-c-f1-cpu-fixed-server-pinned-20261018T231407042Z`.

O bootstrap Pyodide é um dos maiores custos do perfil: aproximadamente 390 ms inclusivos de CPU no loader, dos quais cerca de 358 ms passam por `finalizeBootstrap`. Esses tempos se sobrepõem; não somá-los. O worker tem 817 ms ativos amostrados, incluindo 517 ms de WASM. O perfil também registra download e parse dos módulos antes dessa inicialização. Antecipar imports pode sobrepor essa entrada ao carregamento do entry; não elimina o trabalho interno do CPython.

## Uma mudança por vez

Após validar a mensagem privada, iniciar os imports dos dois módulos pinados no mesmo worker de execução, em paralelo com reader/entry. A inicialização normal ainda configura o reader antes de chamar `startPythonWorker`; o `initialize` atual continua sendo o único lugar que chama `loadPyodide` e já importa loader e asm em paralelo. O cache ESM nativo do mesmo realm reúne os imports das mesmas URLs.

As promises dos módulos e da inicialização devem pertencer à mesma cadeia, com handlers de rejeição instalados no mesmo turno. Aguardar os módulos antes de iniciar o entry criaria uma nova barreira e atrasaria o prefetch do Turtle; essa variante foi rejeitada no review. O ramo do analisador permanece com seu contrato atual.

`pyodide.asm.mjs` exporta a fábrica sem executá-la no import. `pyodide.mjs` faz detecção de ambiente e prepara um pequeno helper WASM no import; não é totalmente inerte. O import não inicia o CPython nem solicita seu WASM principal ou biblioteca padrão. A revisão independente conferiu isso nos bytes pinados. Não chamar fábricas manualmente, substituir fetch, usar campos privados ou criar URLs fornecidas pelo projeto.

## Critérios e provas

- Capturar primeiro o RED nativo: segurar a resposta de `worker.mjs` e exigir os requests reais dos dois módulos antes de liberá-la. Os três arquivos de dados do CPython não podem ser solicitados nessa janela. Após liberar, o projeto portátil deve preparar e executar normalmente.
- Depois da mudança, repetir esse caso em Chrome/Edge e a bateria de bootstrap, incluindo Turtle paralelo, erro de módulos, Stop, cancelamento, reader antes de CPython e recusa de segundo startup.
- Preservar os resultados do projeto portátil, console Unicode, REPL, arquivos, inputs, pixels Turtle e isolamento de instâncias. Usar os mesmos projetos/fixtures anteriores; mudanças de hash do bootstrap exigem distribuição e release novos e registrados.
- Repetir três aquecimentos e dez amostras sem profiler, mantendo o servidor corrigido e o compilador pinado. Conservar falhas e amostras ausentes; não aprovar a meta por um teste funcional ou trace instrumentado.
- Não modificar CSP, Trusted Types, limites, tempo de vida, autoridade, hint de extensão ou estado de projetos. Cancelamento continua destruindo o worker e fechando portas/URLs. Cada execução mantém uma VM e FS novos.

Oportunidade: impacto 2, confiança 3, esforço 2; pontuação 3. O efeito esperado limita-se à sobreposição de download/parse na cadeia crítica de inicialização; a estimativa ainda precisa de medição. Reverter o delta de `protectedWorker.ts` e o teste novo restaura a ordem anterior, sem migração ou transformação de projetos. Nenhuma implementação ou ganho está aprovado neste documento.

## Estado do candidato e prova de equivalência

O RED nativo em Chrome foi executado: `bootstrap-import-red-1.log` mostra a lista de módulos vazia enquanto a entrada permanece retida. O gate foi liberado e a preparação foi drenada; o erro preservado é a falta da antecipação, sem alterar os três segundos da asserção. O delta local de `protectedWorker.ts` foi então implementado e revisado por leitura, sem achado confirmado. GREEN, regressões e medição continuam pendentes.

- Ordem da aplicação: manter configuração do reader antes da fábrica e a barreira já existente de ready/prepared. A ordem dos downloads internos muda intencionalmente; nenhum código da criança começa antes dos gates atuais.
- Desempates e eventos: nenhum código de timers, input, gráficos, seleção de mensagens ou fila Turtle muda. O preload não acrescenta barreira ao início do entry.
- Ponto flutuante: nenhuma operação matemática ou geometria muda.
- Aleatoriedade: nenhuma seed, API de aleatoriedade ou estado Python é reutilizado. Cada execução continua com worker/VM/FS próprios.
- Goldens: `bootstrap-import-before/golden-sources.json` preserva os hashes das fontes do interpretador, worker, frame, quatro módulos Turtle e F1; somente `protectedWorker.ts` pode mudar neste candidato. A distribuição controle, os recibos funcionais e a cópia de rollback também estão registrados. Resultados de console/arquivos/REPL/pixels ainda precisam ser comparados pela bateria nativa.

A compilação candidata deve usar Bun1.3.11 como o controle; Bun1.4.3 fica somente no servidor de qualificação Windows. Registrar a nova distribuição e seu diff de arquivos antes de executar. O caso do analisador mantém o literal anterior e não antecipa os módulos de execução.