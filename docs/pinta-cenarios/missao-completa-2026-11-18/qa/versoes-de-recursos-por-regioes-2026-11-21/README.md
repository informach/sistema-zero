# Versões de recursos por regiões — 21/11/2026

Base `549b930b9a46d2cb2cd73dcf16863007f9ff2fe5`. Continuação do item 1 do
plano aprovado. O formato público, os escritores e a identidade visual não mudam.

## Implementação e revisão

Capturar, atualizar, reconectar e limpar versões agora aceita o mapa autoral
comum. O retorno conserva o tipo do documento, os chunks e os snapshots já
guardados por referência. As ligações explícitas das camadas regionais continuam
explícitas, mesmo quando usam a folha principal. O ramo denso conserva sua
normalização e seus bytes de arte; IDs de origem fora do contrato, horários inválidos e carimbos futuros passam
a ser recusados antes de criar uma versão que não possa ser lida.

O ramo 8 usa o mesmo carimbo e sanitizador do projeto para conferir somente o
recurso novo. A comparação integral recusa qualquer reparo com perda. O resultado
é o snapshot canônico, mantendo ID, proveniência, instante, animações e dados
autorais; versões existentes e buffers do mundo não são clonados. Se a troca da
referência de um objeto for recusada, a operação inteira falha, sem deixar uma
versão solta nem anunciar sucesso. A interface usa a Toast existente para explicar
que o mapa permanece como estava.

A revisão encontrou ainda a passagem do mapa denso com versões sem carimbo para
o contrato estrito: a conversão produzia um documento que o codec 8 recusava.
`prepareMapResourceVersions` compartilha a admissão entre captura e migração.
Preparar regiões carimba as versões antigas sem copiar seus buffers, recusa
metadados não preserváveis e nunca rebaixa um carimbo futuro do mapa. Recursos
são admitidos antes da alocação dos chunks.

O percurso de dependências e a resolução de folhas incorporadas aceitam mapas e
conjuntos internos por regiões. A limpeza explícita mantém a cadeia de versões
referenciadas por propriedades e remove somente as versões sem uso. Não há novo
catálogo ou resolução de arte paralela.

## Provas

Dez regressões novas cobrem mundo de 10.000 × 10.000 com dois chunks ocupados,
duas folhas, ligações explícitas, autorreferência tipada, animações, frações,
snapshot imutável, atualização por nome de animação, locks herdados, limpeza
transitiva, limites e recusas atômicas. O teste de round-trip passa pelo codec
nativo interno real, sem cast para o store público.

Os módulos anteriores de recursos e preparação reproduziram oito falhas e dois controles positivos.
O ensaio temporário restaurou e conferiu os bytes atuais em `finally`. Os dois
casos de migração foram reproduzidos antes de alterar esse caminho. Depois da
correção, os 38 testes direcionados em cinco arquivos passaram, com 229 asserções.

Os cinco fluxos existentes de recursos passaram em Chromium com CPU emulada 4×.
Mais dois percursos, desktop e toque emulado, conferiram animação por pixels,
captura, desfazer/refazer, guarda de peças e reabertura real via IndexedDB/backup.
São sete ensaios, sem retries, na oficina pública densa; não é edição pública 8.

Suíte final: 2.592 aprovados, três controles Pygame omitidos pela configuração
comum, zero falhas e 29.814 asserções em 228 arquivos (172,97 s). Os controles
Pygame não foram repetidos neste lote. Tipos completos do Pinta e do Estúdio,
Biome dos sete arquivos e `git diff --check` passaram. Os recibos e hashes das
fontes estão no índice; há imagens dos dois controles de oficina.

## Alcance

O formato 8 continua interno. O lote não homologa store/IO 3, envio de regiões
ao Estúdio, motores externos, novas projeções, implantação ou desempenho global.
Os orçamentos existentes de recursos permanecem iguais. A contagem de memória
por chunks e suas partes compartilhadas é o próximo item do plano; não inferir
qualificação de heap total a partir destes testes. Toque/CPU são emulações nesta
máquina, sem teste com crianças ou outro dispositivo físico.
