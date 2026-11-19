# Entrada nativa: falha residual ainda aberta

A execução `44621726882`, SHA `84eb23a07`, terminou com **nove jobs
aprovados e três falhos**. Os casos de página vazia da galeria deixaram
de aparecer nessa rodada. As falhas foram:

1. Contratos Windows: Desfazer Python antes da entrega dos eventos.
   Sincronização do teste corrigida em `c18869103`; falta a nova CI.
2. Chromium Linux 3: comparação do programa inteiro com a janela do
   textarea do Monaco. Corrigida em `61bf9a751`, posterior ao SHA testado.
3. Chromium Linux 2: timeout em `keyboard.press` em Duelo de Heróis e
   Vale Ensolarado, nas versões 2D clássica e avançada. **Não resolvido.**

O trace local de Desvie dos blocos também teve uma chamada `Press "s"`
sem resposta até o deadline. Esse fato não demonstra loop no programa,
modificador preso ou defeito do transporte: nenhuma dessas causas foi
confirmada. Dez aberturas diagnósticas sem trace e quatro com trace
completo passaram localmente. Não são a homologação dos casos Linux.

## Observação opcional e recorte de CI

`STUDIO_INPUT_DIAGNOSTICS=1` habilita observações somente nos testes:
foco, estado do documento, eventos nativos de keydown/keyup e navegações.
Os registros têm tamanho e quantidade limitados e são anexados em JSON,
inclusive nas aprovações. Não se usa console do jogo, acesso a modelos
privados, eventos sintéticos, alteração de foco, preventDefault ou
substituição das interações. Sem a variável não são instalados listeners
no navegador. Isso não é instrumentação do produto nem um profiler.

Dois casos locais da galeria estreita passaram com a observação ligada;
os anexos registraram as dez transições nativas de tecla de cada caso
(WASD e espaço), sem modificadores. A coleta e o helper de eventos Python
passaram em checagem TypeScript focada; Biome dos arquivos passou.

O workflow manual `studio-input-diagnostics.yml` executa os cinco casos
suspeitos, três vezes, em Linux e Windows com Chromium completo. Mantém
os prazos, as teclas e os critérios originais, sem retries. Seu objetivo
é obter reprodução e evidência antes de alterar o produto. Uma execução
diagnóstica verde não apaga as falhas anteriores nem conclui a missão.

Os servidores de diagnóstico nas portas 5357/5358 foram encerrados pelos
PIDs verificados de seus processos Vite; a consulta posterior confirmou
ausência de listeners nas duas portas. O build redundante e os dois logs
listados no checkpoint permanecem: a revisão automática bloqueou a
exclusão com `blocked by policy`.
