# Lote 218 — leitura transacional do layout de pixels

Estado: implementado, revisado e verificado, 09/09/2026. Fase 2.
Writer por blobs, GC e migração ainda não ativados; formato público permanece 1.

## Contrato e revisão

sceneBlobStorage lê as quatro chaves do alvo e, no callback ainda ativo, enfileira
os blobs únicos referenciados pelo manifesto. Todos pertencem à mesma transação
readonly. Hash e validação nativa acontecem somente depois de seu término. Não há
await para manter artificialmente uma transação viva, leitura posterior de pixels
em outra revisão nem confiança em mensagens de outra aba.

O reader confere envelope, id, índice, custo do manifesto, referências únicas,
presença de originais e integridade dos pixels; depois exige o documento nativo
completo e confere custo lógico, nome, timestamps e thumb. Stored Uint8Array precisa
ter backing ordinário próprio e inteiro; a flexibilidade de views do codec puro
não autoriza guardar memória oculta no layout físico.

Metadata aceita layouts 1/2 com campos fechados. bytes continua custo lógico;
storedBytes é manifesto e blobRefs descreve recursos únicos. Lista e observação
de revisão continuam somente metadata, inclusive quando o recurso está ausente:
observar índice NÃO certifica integridade nem concede token CAS.

Leitura inválida/futura retém registros capturados para recuperação, sem zeros,
fallback legacy, reparo ou downgrade. Falha de IO e abort propagam como falhas de
operação, não como ausência. Cancelamento é conferido antes do IO, nos requests,
ao terminar a transação e durante a hidratação. openSceneWorkshop passa seu signal.

O writer inline permanece recusando manifesto, metadata 2 ou tombstone 2. Não
existe escritor novo habilitado por este lote: fixtures usam writer transacional
somente de testes. Promoção e gravação do novo layout ainda serão integradas.

## Quota e regressão encontrada

sceneQuota usa storedBytes para o manifesto de metadata 2, sem cobrar pixels
hidratados mais blobs. Recursos físicos ainda são lidos e medidos uma vez por chave;
não há ledger otimizado de blobs, refcount ou coleta automática.

Na revisão, o ledger existente verificava cópia original ausente com custo positivo,
mas não o inverso: recibo presente com custo zero. 001f3d reproduziu duas falhas,
uma em cada layout. O guard agora exige equivalência entre presença e custo positivo;
índice inconsistente cai na leitura/cobrança raw. Não altera o recibo nem finge custo
zero. Estimativa continua structuredBytes, não bytes efetivos de disco.

## Testes e evidências focais

- ee18eb: 48/0, 345 asserts, cinco arquivos, primeira rodada.
- eaeb58/788697: tipos falharam em duas fixtures por literal alargado; tipos
  explícitos SceneTombstone corrigiram os testes, sem casts para silenciar produção.
- 5b127b: 71/0, 482 asserts, sete arquivos, 2,29 s, após a correção do ledger.
- d12ab5: 90/0, 360 asserts, concorrência/cancelamento repetidos 30 vezes cada.
- 9cb0d6/c26c73: tipos passaram. e59fc7: Biome, 1.125 arquivos, sem mudanças.

Fixtures reais indexed/RGBA, camadas ocultas/RGB sob alpha zero/opacity, flipbook,
clipes, skin e cena sem imagem conservam JSON nativo e ownership em leituras.
Transação concorrente troca manifesto, revision e pixels e remove recursos antigos:
a leitura em voo recebe inteiramente a versão anterior; a seguinte recebe a nova.
Sem sleeps, mocks de persistência, Web Locks ou mutações em globais/protótipos.

Cobertura adicional: preabort sem abrir transação; abort em request e em complete;
banco fechado; blobs ausentes/corrompidos/curtos/com backing oculto; índice/ref/custo/
nome/revisão incoerentes; geometria inválida apesar de manifesto estrutural; originais
ausentes; conflitos com tombstone; versões futuras; namespace sem cache cruzado;
quota física deduplicada exata e um byte abaixo, rollback e bloqueio do writer antigo.

## Verificação final

A primeira integral b96345/7a3104 falhou: **2.647 passes, 79 falhas, 365 arquivos,
169,23 s**. Primeiro erro: timeout no teste de troca de namespace de SceneWorkshopHost;
depois, hooks com result.current null e DOM vazio. Não ignorar a execução porque
os testes da persistência tinham passado.

Isolamento b3bb25 reproduziu o timeout em um único teste. Instrumentação 38cd07
mostrou AbortError saindo da leitura após a troca de perfil; a Promise completed
do harness só resolvia no caminho de sucesso. O await dentro de act ficava aberto,
contaminando os testes seguintes. Uma reprodução mínima na borda UseStore confirma
que cancelar enquanto o banco ainda abre deve rejeitar, preservando todos os dados.

Ajuste somente no harness: sinalizar término em finally, manter rejeição propagada
e exigir resultado rejected/AbortError para opening, fulfilled para commit já
autorizado. Não desabilitar cancelamento em produção, aumentar timeout nem suprimir
act. Log temporário removido. 18453d passou **37/0, 295 asserts**, incluindo Host,
animação e storage; 3a05ae repetiu a troca de namespace **30/0, 390 asserts**.
Esta causa é específica do timeout novo; não explica os avisos históricos 203/214/216.

Nova integral e11e88/f1971c: **2.727 passes, zero falhas, 8.347.198 asserts,
365 arquivos, 158,54 s**. Sete logs WebGL de MoldaApp, nenhum aviso act nesta execução;
as pendências históricas não são encerradas por isso. Tipos finais 7a096f/ddfe89
e Biome 7ea13f (1.125 arquivos) passaram.

Vite 86a65f passou em **1,25 s**. ScenePlayground 197,73→204,70 kB com o reader/codec
alcançáveis somente pela oficina; index 363,86→363,90 kB, CSS 53,64 kB e workers
mantidos. Three 579,29 kB mantém aviso >500 kB; limite não aumentado. Nenhuma medição
de FPS, RAM ou latência de disco é inferida desses números.

Kids f783ff/a5b735/087420 passou: **6,5 s compilação, 11,7 s tipos, 59 páginas/569 ms**.
Diff check 1d69be passou, mantendo os três avisos CRLF anteriores em outros pacotes.
Não houve rollout, escrita em dados de usuário, migração nem homologação visual/GPU.
