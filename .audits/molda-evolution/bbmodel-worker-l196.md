# Review de transporte bbmodel, lote 196

## Implementação

Worker próprio por preparação; snapshot de identidade, escolhas aninhadas e bytes
antes de criar a tarefa. Entrada não vazia, memória não compartilhada, caminhos
locais e totais (32 MiB por arquivo, 64 MiB pelo conjunto, 1.024 complementares)
conferidos antes de copiar. Buffer/subarray viram bytes próprios de tamanho exato;
arquivos originais não são transferidos nem separados de seus buffers.

O worker usa os bytes recebidos por structured clone sem uma segunda cópia de todo
o conjunto. Executa o conversor puro do lote 195 e transfere somente pixels derivados
de um resultado completo. Progresso real: validar e converter. Cancelamento encerra
o worker, inclusive durante sua construção; resultado, erro e messageerror removem
listeners e encerram a tarefa uma vez. Sem fallback para executar tudo na UI.

Protocolo confere documento/revisão/pedido antes do conteúdo. Resposta missing só
contém caminhos locais canônicos, únicos, ainda não escolhidos; nunca documento
parcial. Ready exige documento nativo válido, identidade do host preservada e sem
thumbnail antiga, relatório com revisão obrigatória, custos recalculados e
consistência das identidades de nós/geometrias/materiais/imagens.

Leitores de relatório separados por estrutura e aparência; catálogo discriminado
cobre as 14 etapas e todos os códigos dos produtores. Campos extras, ausentes,
referências inconsistentes, enums desconhecidos e adaptações não escolhidas são
recusados. Contagens respeitam os tetos de origem ou recursos nativos; imagens têm
uma origem por textura e índices contíguos de recursos, incluindo aliases. Células
do flipbook não se confundem com a quantidade de passos da sequência. Objetos e
arrays de diagnóstico são próprios; números de metadados de origem preservam -0.
Isso não modifica a canonicalização de zero autoral do leitor nativo.

O leitor não reinterpreta o JSON original na thread principal: prova o contrato
de transporte, não que um relatório inventado mas internamente consistente ocorreu
na fonte. A adoção ainda precisa das guardas de revisão viva e consentimento da UI.

## Review

Extraídos apenas os validadores genéricos de código de diagnóstico/ID de destino
do relatório OBJ para nativeImportReport; aliases existentes mantidos. Sem fazer
o Blockbench depender do importador OBJ. Contagens de faces são calculadas uma vez
por geometria, não novamente em cada aviso repetido.

Encontrada e corrigida uma divergência de orçamento: o produtor contava source e
costs sem as chaves externas que o receptor contava. Ambos agora contam exatamente
a estrutura inteira (chaves e valores UTF-16), com o mesmo teto de 4 Mi caracteres.
Regressão aceita o limite exato em ambos e recusa seu próximo caractere. Não houve
aumento de teto, truncamento ou afrouxamento do transporte.

Nos testes, a primeira massa de 65.536 avisos ultrapassava antes o teto de texto.
O caminho foi encurtado somente nessa massa para isolar o teto de quantidade.
Outra asserção esperava o path dentro da mensagem; o leitor já retornava erro
correto e o teste passou a conferir a mensagem real. Tipagem do catálogo de testes
foi ajustada para preservar os tipos dos detalhes e distinguir o último item
sabidamente existente de undefined. Nenhuma dessas falhas exigiu mudar produção.

## Evidências

Focal ampliado: **154 passes, zero falhas, 2.682 asserts, sete arquivos, 6,20 s**.
Inclui workers reais nas versões 4.9, 4.10 e 5.0, comparação com conversão direta
e todas as 14 etapas; cancelamento/erros/stale tokens, snapshot/ownership, arquivos
faltantes, erro de orçamento agregado real, aliases de imagem independentes,
metadados com -0, smooth vazio com zero faces, catálogo exaustivo e cada variante
com campos extras/ausentes/valores inválidos. Regressões OBJ e pureza incluídas.
Tipos e Biome (1.014 arquivos) passaram. Integral: **2.414 passes, zero falhas,
323 arquivos, 8.322.513 asserts, 142,79 s**, exit 0. Vite 1,39 s; CSS 53,82 kB
e aviso Three >500 kB mantidos. Nenhum worker bbmodel incluído ainda, pois o
runner não é alcançável pela UI neste lote. Kids compilou em 6,7 s, tipos em
9,1 s, 59 páginas em 470 ms, exit 0. Diff check passou com os três avisos CRLF
anteriores. Não foi feita medição nova de desempenho.

## Pendências

Runner ainda não alcançável pela oficina: integração lazy, escolha local, revisão,
prévia e adoção transacional seguem no lote 197. Nenhum chunk bbmodel no playground
é alegado antes dessa conexão. Clipes de peças, camadas ativas e PBR completos ainda
não convertidos. Sem ativação pública, dependência nova, benchmark, homologação
de GPU/toque/hardware ou usabilidade com crianças.
