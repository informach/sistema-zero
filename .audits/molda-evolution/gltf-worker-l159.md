# Worker cancelável de importação glTF, lote 159

## Arquitetura e ownership

`prepareGltfImportInWorker` captura pacote próprio antes de construir o worker e
reusa `runWorkerTask`, sem modificar sua política de clone/cancelamento. Token
inclui criação, revisão e pedido; identidade da saída deve corresponder a ID,
nome e timestamps capturados. Uma revisão viva ainda deverá ser conferida pelo
host ao adotar a prévia: validar token de transporte não substitui essa guarda.

Preflight de pacote é estrito e limita todos os arquivos selecionados, inclusive
os ainda não descobertos como dependências: 32 MiB por arquivo e 64 MiB agregados,
até 1.024 acompanhantes. Paths literais normalizados/repetidos, opções, identidade,
inteiros e memória compartilhada são conferidos antes de copiar/postar. Snapshot
copia só o intervalo Uint8Array escolhido, nunca backing oculto de subarray/Buffer.
Metadados também são próprios. Não destacar os originais; envio usa structured
clone, assim há uma cópia adicional de entrada. No worker não repetir o snapshot
do pacote; leitores de fonte mantêm suas cópias defensivas e limites próprios.

Worker é individual e terminado no resultado, erro, abort, mensagem ilegível ou
falha do consumidor. Respostas posteriores não reabrem tarefas. Pré-abort não lê
arquivos nem cria worker. Alteração do objeto chamador durante a factory não muda
o pacote nem o token usado para conferir a resposta.

## Estados e fronteiras

Leitura informa `validating`/`reading`; conversão acrescenta `converting`. Retorno:
faltantes completos sem documento parcial, inspeção de cenas/custos fonte para
escolha, ou documento nativo e relatório para revisão. Inspect não escolhe a cena
default pelo usuário. Converter após inspeção cria outro pedido e relê a fonte;
não mantém leitor/pixels vivos num worker ocioso. Não afirmar reuso de parse.

Falhas de domínio conservam reason/path. Erros estruturais de transporte usam a
validação estrita existente; erro inesperado vira mensagem genérica, nunca uma
importação vazia bem-sucedida. Mensagem fonte maior que 1.024 caracteres recebe
texto genérico sem perder reason/path — por exemplo extensão obrigatória com
nome longo. Não executar extensões/extras, baixar recursos ou escrever criação.

Resposta valida envelope, token, status, identidade, documento pelo leitor nativo,
relatório discriminado, alvos de avisos existentes (exceto IDs prospectivos de
clipes/canais omitidos), listas e custos. Custos agora são contados do documento
final por uma função compartilhada com o produtor; todos os campos anunciados
precisam coincidir. O gate pré-pixels de instâncias do lote 158 continua usando o
plano de topologia. Mapas exhaustivos de códigos obrigam decisão de transporte
quando um produtor adiciona um novo aviso.

Relatório tem teto explícito de 65.536 diagnósticos, além dos limites separados
de ocorrências de extensão/chunks; produtor recusa excesso, não corta avisos para
parecer compatível. `review: required`, original não arquivado e metadados não
persistidos são invariantes da resposta, não flags que o worker pode aprovar.

Somente buffers próprios de pixels finais são transferidos na volta. O leitor
nativo do receptor faz outra cópia defensiva; este lote não a remove nem anuncia
ganho de latência/RSS. Orçamentos de pixels/transporte não representam pico de
memória. Ainda falta medir e homologar o fluxo no navegador e em hardware.

## Testes e review

Worker real: documento/textura/clipes e skin iguais à conversão direta; arquivos
originais intactos, inspeção/faltantes e conversão de cena vazia, erro estruturado,
cancelamento ao receber reading, curva cúbica opt-in/FPS/loop e extensão com nome
longo. A primeira fixture cúbica tinha uma só chave, proibida pelo leitor fonte;
foi corrigida para GLB real com duas chaves e treze amostras em 12 FPS. Não relaxar
esse contrato para acomodar teste.

Porta controlada: token mutado na factory, pedidos estrangeiros, cancelamento e
sucesso tardio, pré-abort, erro de post/messageerror/worker/consumidor e descarte
único. Pacote: limites exatos/excedidos, subarray com backing maior, paths repetidos,
SAB, opções null/fora do intervalo, listas/identidade/campos estritos e ownership.

Protocolo: todos os códigos/estágios, alvos ausentes, NaN, campos extras, custos
divergentes em cada campo, tentativa de aceite, status/scene incorretos, inventário
global e erro malformado. Limite exato de 65.536 avisos passa; um a mais falha no
produtor e receptor. Alterar o objeto da resposta após parsing não altera documento
ou relatório entregue. O parser conserva nomes vazios de extensão aceitos pelo
leitor atual, sem introduzir uma restrição nova escondida no transporte.

Primeiro typecheck mostrou que `gltfImportReply` alargava todo resultado para a
união; helper agora preserva o discriminante recebido com generic, sem cast de
documento no teste. Nenhuma API de teste foi adicionada ao domínio ou worker.

## Evidência final

Focal: 30 passes, zero falhas, 1.011 asserts, 2,00 s. Tipos passaram. Biome:
828 arquivos. Importação/workers/pureza: 406 passes, zero falhas, 41 arquivos,
33.083 asserts, 10,68 s. Integral: 1.947 passes, zero falhas, 270 arquivos,
8.228.612 asserts, 102,71 s. Vite: 912 ms. Kids: compilação 5,6 s, tipos 8,5 s,
59 páginas em 466 ms. Diff check passou. Worker real foi executado no Bun; ainda
não é alcançável pela UI, então esse build Vite não prova seu bundle de navegador.
Essa prova acompanha a integração seguinte. Não há nova dependência ou ativação
pública; UI de arquivo/revisão/adoção ainda vem a seguir.
