# Protocolo e worker OBJ, lote 173

## Escopo implementado

Leitura do conjunto OBJ/MTL e conversão completa executadas por um worker próprio
por pedido, reaproveitando `runWorkerTask`. Tokens de criação/revisão/pedido são
conferidos antes de ler o payload. Resultado é revisão obrigatória ou lista de
arquivos faltantes; nunca documento parcial ou adoção automática. Cancelamento
termina o worker e remove listeners, inclusive quando a factory cancela antes
do post. Falhas de clone, execução, mensagem ilegível e retorno inválido encerram
a tarefa; não há retry/fallback que perca escolhas ou avisos.

`nativeImportRequest` compartilha identidade/token e preflight de bytes com glTF.
Todos os arquivos escolhidos, inclusive não usados, contam antes de qualquer cópia:
32 MiB por arquivo, 64 MiB no transporte e 1.024 companions. Paths passam pelos
adapters de formato; OBJ rejeita companion igual ao entry, sem mudar a política
anterior glTF. Somente Uint8Array sobre ArrayBuffer não compartilhado. Snapshot
possui o intervalo exato de cada arquivo e todas as escolhas aninhadas; structured
clone leva essa cópia ao worker, sem transferir originais. O worker não repete
o snapshot inteiro. Saída transfere somente pixels derivados completos. Esses
tetos não representam pico de memória nem um ganho de desempenho medido.

## Relatório e fronteira de confiança

Retorno passa pelo leitor completo do domínio e confere identidade/timestamps,
ausência de thumb herdada, custos recalculados e ausência de skins/clipes OBJ.
Fonte exige entry correto, paths canônicos/únicos de bibliotecas escolhidas,
contagens coerentes e limites dos arquivos selecionados. O resumo não arquiva
original ou metadados auxiliares e não se declara aprovado.

Seis leitores discriminados rejeitam campos desconhecidos, valores ausentes,
códigos futuros, enums/tipos/contagens fora de limite e referências inexistentes.
Catálogos exaustivos tornam a inclusão de códigos uma decisão de transporte.
Base/mapas conferem identidade de biblioteca/declaração/variante com o helper
compartilhado de seleção. Avisos de imagem apontam para imagens; normal/cor e
culling para materiais. Orientação normal, alpha, culling e reamostragem conferem
as escolhas do pedido e os respectivos campos/dimensões do documento recebido.
O reader verifica contrato/coerência: não reexecuta o parser na UI, não prova
autenticidade criptográfica nem a equivalência visual de toda adaptação.

Teto de 65.536 decisões acrescido de 4.194.304 unidades UTF-16 dos valores de texto
e nomes dos campos. Arrays não cobram índices; números não viram texto. Não é
JSON byte length nem RAM. Contador só recebe dados acíclicos validados, nunca
objeto bruto do worker. Origem e avisos são cobrados incrementalmente na produção;
avisos de materiais/imagens agora são emitidos por sink síncrono durante o plano,
inclusive ajuste de nomes, antes do bake de pixels nativos. Custos acrescentam
um pequeno conjunto de nomes no final. Não alegar que todo excesso textual é
necessariamente detectado antes de decodificar rasters.

Reader reconstrói e cobra o relatório por partes. Excesso interrompe, sem truncar,
descartar avisos ou aceitar uma revisão parcial. Sink opcional preserva o retorno
de conversão de materiais independente; exceções interrompem a composição. Nome
de imagem passa a ser preparado no plano, sem modificar sua receita/pixels/cache.

## Revisão e evidências finais

Teste inicial do novo teto mudou a primeira falha do caso de 10 mil materiais:
texto excede antes da contagem de decisões. Expectativa corrigida para report.text,
sem enfraquecer o gate anterior a coordenadas/bytes codificados. Guards de testes
distinguem Map.size (metadado do resumo) de Map.get (bytes). Focal final desse
núcleo: 25 passes, 497 asserts, três arquivos, 3,75 s.

Fixture de worker real percorre os seis estágios, variantes com/sem UV, conflito
de materiais/propriedades, interpretação de mapas, objetos vazios, construção,
normais e rasters. Saída igual à conversão direta e originais intactos. Testes de
fronteira cobrem todos os códigos atuais, campos extras/ausentes, vínculos,
resoluções, choices e tetos textuais/numéricos exatos, além de payloads falsos.
Worker real também transporta erro report.text de um arquivo com 500 materiais
e paths longos; sem resultado parcial. Ownership/cancelamento usam worker real
e porta controlada, sem substituir o parser/conversor pelo mock.

Focal final de fronteira: 25 passes, zero falhas, 761 asserts em quatro arquivos,
3,76 s (inclui glTF real). Typecheck passou. Biome: 914 arquivos, sem alterações.
Focal ampliado: 463 passes, zero falhas, 40.615 asserts, 48 arquivos, 26,24 s.
Integral: 2.106 passes, zero falhas, 8.236.835 asserts, 290 arquivos, 133,41 s.
Vite: 1,07 s; worker glTF 181,86 kB (+0,31), painel 35,90 kB (+0,30), Three
579,29 kB e aviso >500 kB preservado. Worker OBJ ainda não alcançável pelo painel:
o teste real usa Bun; este build não comprova sua integração ao bundle browser.
Kids: compilação 5,9 s, tipos 10,2 s, 59 páginas/653 ms, saída zero.
Diff check passou com avisos CRLF preexistentes.

Regressão normal de materiais glTF: três hashes preservados e fontes intactas.
p50/p95 (ms): 16²×1 0,209/0,231; 256²×4 3,370/7,445; 1024²×8 83,460/105,522.
RSS amostrado: 181.858.304/210.305.024/263.168.000 bytes. Não é medição pareada
nem alegação de ganho de desempenho ou memória do novo transporte/pipeline OBJ.

## Limitações preservadas

OBJ ainda não está ligado ao painel de revisão/adoção da oficina; esse é o lote
seguinte. Formato público continua 1; v2 é interno. Nenhuma fase inteira é marcada
concluída. Sem dependências novas, upload, IO de rede, arquivos executados ou código
GPL copiado. Sem homologação GPU/toque/hardware/crianças; browser indisponível
registrado anteriormente não foi reiniciado nem substituído por outra automação.
