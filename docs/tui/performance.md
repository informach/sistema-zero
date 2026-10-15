# Evidência de desempenho

Hardware: AMD Ryzen 5 5600G, 12 processadores lógicos, 16.96 GB RAM, Windows 10.0.26200, Bun 1.3.11. Evidências e amostras completas: [.audits/tui-bench/working-tree/win32](../../.audits/tui-bench/working-tree/win32). Os JSONs registram data, parâmetros e dados brutos. Foram produzidos na worktree desta implementação; `working-tree` não é um SHA de release certificada.

| Ensaio | Resultado observado | Interpretação |
|---|---|---|
| F1: 1.000 arquivos / 25 MiB | índice inicial 337 ms; leitura p95 1,22 ms; busca p95 214 ms | Unicode/CRLF, exclusões e operações reais |
| F2: 50.000 arquivos / 1 GiB | índice inicial 266 ms; busca em conteúdo p95 1.519 ms; busca no índice p95 3,71 ms | Dados determinísticos; cache de SO não controlado; invalidações registradas |
| F3: 500 sessões / 10 mil mensagens / 100 mil eventos | histórico p95 1,64 ms; snapshot 6,66 ms; tail 0,61 ms; reconexão 7,49 ms | 1.000 consultas, 30 reconexões, índices/EXPLAIN registrados; não inclui render de todas as linhas |
| F4: 4 processos, 5 MiB/s oferecidos | cada árvore encerrada em 4 MB; IPC p95 0,44 ms | Política de quota encerra produção; não armazena cinco minutos de saída |
| F5: cinco minutos | 16.360 leituras, 91 builds de CPU, 298 observações Chromium | Dois executores sintéticos no scheduler real; oito leitores e um build |
| F6: crash de processo | prepared/dispatched/accepted/confirmed preservados; efeito aceito não repetido | Inclui aceitação seguida de perda de resposta; não equivale a disco físico cheio |
| F7: 100 nós | 4,95 s; registro de controle 32.890 bytes | Outputs de 60 KB por referência/deduplicação; definição fixada, outputs com owner |
| Ciclo de 100 tarefas | heap retido +1,51 MB; RSS +15,65 MB | GC diagnóstico antes/depois; não confundir com política de GC em produção |
| Cancelamento | p95 2,60 ms para ack | 1.000 tarefas aguardando pergunta; cancelamento de processo tem prova separada |
| Intenção durável | p95 1,87 ms | 1.000 dispatches; exclui corpo da tool/fila, mantém SQLite FULL |

Renderer: 1.000 entradas observadas até o frame, sem forçar `renderOnce`. No scheduler sob demanda usado em produção, p95 32,15 ms e p99 34,92 ms. Golden de tela+rascunho: `dc3aa186c4f6cb8929eb92e4faca4dba1bf87a816f2419cf3e4a2d6912718b29`. A medição anterior forçava render contínuo a 30 fps (p95 50,4 ms; sob carga 61,4 ms); esses arquivos foram mantidos como stress adicional e não são apresentados como o scheduler real do app. A inicialização do fixture agora aguarda o commit React antes da primeira entrada.

Startup é medido em ConPTY real, até runtime pronto e primeiro texto visível, com 3 warmups e 30 processos por cenário. A primeira medição concorria com o scan de 1 GiB e ficou em arquivo separado. Antes de pré-compilar o helper Windows: help p95 107,5 ms, prompt com supervisor existente 619,6 ms e perfil novo 3.031,5 ms. Compilando o helper no build: 103,8 ms, 602,9 ms e 1.929,7 ms (`startup-before-staging-integration.json`).

A repetição final sobre o código integrado `0908f2b36`, sem build/instalação/checkout/teste concorrente iniciado por esta tarefa, deu **help p95 123,3 ms, prompt com supervisor 857,1 ms e perfil novo 2.183,0 ms** (`startup.json`), dentro das metas de 300 ms, 1,5 s e 2,5 s. Atividade de outros aplicativos e cache de SO não são controlados. Uma repetição que coincidiu com checkout de 14.347 arquivos fica preservada como `startup-concurrent-checkout.json` (149,6 / 815,6 / 2.437,5 ms); não foi usada como baseline isolado. Não se chama processo novo de cache de disco frio.

Na repetição F5 com o scheduler sob demanda, input até frame teve p95 **32,55 ms** e p99 **40,80 ms**. Os arquivos de render contínuo permanecem identificados separadamente. A prova durou 301,3 segundos e não fez chamadas pagas a modelos.

Memória continua fora do aceite: supervisor ocioso ~295,2 MiB na repetição final e renderer ~290 MiB na medição de interação, medidos separadamente; a soma de RSS excede 300 MiB e inclui páginas compartilhadas contadas por processo. No F5 foram 238,6 MiB no supervisor e 317,6 MiB no processo de UI. Não foi substituída por outra métrica para declarar aprovação. CPU ociosa final não apresentou incremento na precisão do contador durante 60,1 segundos; a medição anterior foi 0,0021% da máquina. Isso não significa consumo permanentemente zero. Browser/clientes oficiais ficam fora desse repouso.

O perfil de heap reteve 29,9 MiB: aproximadamente 16 MiB de ArrayBuffer/WASM, 4,5 MiB de code blocks e 3 MiB de módulos; estado do renderer ~192 KB e textarea ~49 KB. O perfil de CPU concentrou amostras em operações nativas de edição/texto/desenho, não em reconstruir o histórico SQLite. O dump bruto de heap permanece local/ignorado; os números acima são a síntese, e o CPU profile está versionado.

Experimento de uma variável: `--smol` manteve o golden e p95 ~49,7 ms no fixture contínuo, mas RSS foi ~281 MiB versus ~266 MiB no baseline correspondente. Não demonstrou ganho de memória e não foi adotado. Pré-compilar o helper tem impacto 4, confiança 5, esforço 2 (score 10): conserva fonte, argumentos, quotas e ordenação; apenas remove compilação da abertura de perfil. Manifesto e smoke validam o binário distribuído.

Ainda faltam para o aceite integral B12: RSS combinado na meta, quota física do workspace Docker, injeção real de ENOSPC e de cada fronteira de patch, além da avaliação de adoção com 30 tarefas e modelos reais. Não há resultado comparativo de qualidade/custo inventado a partir desses benchmarks.

O [registro de proveniência](../../.audits/tui-bench/working-tree/win32/verification-provenance.json) associa o commit integrado, logs de testes, hash do manifesto distribuído e artefatos. F1–F7 foram executados antes da integração com staging; o startup final e a verificação da distribuição foram repetidos sobre o código integrado.

## Revisão posterior: ownership de portas

A consulta WMI anterior foi substituída por leitura TCP nativa e confirmação do listener no
Job Object próprio, com identidade aleatória. Em dez amostras alternadas no mesmo serviço
(uma rodada de aquecimento), a consulta anterior teve p50 1.262,43 ms/p95 1.364,99 ms; a
verificação nativa completa teve p50 84,44 ms/p95 92,48 ms. A baseline inclui processo,
consulta, leitura e parse, mas exclui a checagem JS de ancestralidade. Os testes exercitam
IPv4, IPv6, descendentes, porta alheia e job encerrado.

[Script e amostras](../../.audits/tui-full-review-2026-10-15/ports.json). Esse ganho é específico
da verificação de portas e não altera o resultado anterior do aceite de RSS ou de inferência.
