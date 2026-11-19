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

O primeiro recorte `44627962166` selecionou sete casos, três vezes:
**21 aprovações no Linux e 21 no Windows**, sem retries. A execução
completa seguinte, `44625198436`, teve onze jobs verdes e um vermelho:
outro timeout de teclado, em **Patrulha Espacial**, no Chromium Linux 1.
Logo, as 42 aprovações do recorte não resolvem a intermitência.

O workflow foi ampliado para incluir Patrulha nas três famílias: dez casos,
dez repetições, **cem casos por sistema**, conferidos com `--list`. Mantém
os prazos, as teclas e os critérios originais, sem retries. Seu objetivo
é obter reprodução e evidência antes de alterar o produto. Uma execução
diagnóstica verde não apaga as falhas anteriores nem conclui a missão.

Se a chamada nativa continuar pendente por cinco segundos, uma sondagem
somente de leitura registra o estado dos documentos por sessões CDP.
Não usa `Frame.evaluate` nessa sondagem: a instrumentação de snapshots
desse método pode esperar por outro quadro bloqueado e confundir a
observação. O deadline de dois segundos limita apenas a coleta; o prazo
e o resultado da ação original não mudam. Não há pause/resume ou alteração
de código do jogo.

Um controle deliberado de oito segundos com casca em outro site validou
a coleta sob trace completo: o documento principal respondeu, enquanto
o quadro ocupado não respondeu. O teste confere esses dois resultados,
além da conclusão do trabalho e da tecla nativa. É um controle de
diagnóstico, não homologação de motor. Uma execução passou localmente;
os smokes da galeria com observação ligada e desligada também passaram,
e a checagem TypeScript focada dos três arquivos passou. O controle é
executado separadamente no workflow ampliado.

O disparo manual inicial retornou 404 porque o workflow novo não existe
na branch padrão. Para não alterar a `main`, o recorte é disparado por
push em `staging` restrito a esse YAML e ao helper diagnóstico.

Os servidores de diagnóstico nas portas 5357/5358 foram encerrados pelos
PIDs verificados de seus processos Vite; a consulta posterior confirmou
ausência de listeners nas duas portas. O build redundante e os dois logs
listados no checkpoint permanecem: a revisão automática bloqueou a
exclusão com `blocked by policy`.

## Resultado ampliado e próxima observação

O run `44633216192` concluiu cem casos Linux: 98 passaram e dois Duelo
de Heróis ficaram pendentes em ArrowDown. A navegação do iframe ocorreu
25–31 ms após o início da tecla; cinco segundos depois, editor e jogo
responderam à leitura CDP com `readyState=complete`. Não há prova de loop
de CPU nessas duas falhas. O controle bloqueado passou. Windows foi
cancelado e não vale como aprovação.

O observador opt-in passa a registrar diferenças limitadas dos documentos
reais dos fixtures: posição da mudança, tamanhos e até 1.024 caracteres
removidos/inseridos, dentro do mesmo buffer de duzentos registros. Sem
alterar o documento, a navegação ou a entrada. Serve para distinguir uma
nova geração de fonte de uma troca de runtime/recursos; não é coletor
de código em produção. Um segundo controle verifica diferença, limite
e integridade do atributo. Os dois controles passaram localmente em
11 s; TypeScript focado não emitiu erros.
