# Chunks físicos com a autoridade local existente

Parte da etapa 8a, depois da homologação dos destinos da etapa 7. O formato
portátil continua nativo 3–7; o domínio e os adaptadores continuam recebendo
o mesmo documento completo. Não há um segundo editor nem mudança visual.

## Diagnóstico e alternativas

O render já recorta blocos de 32 casas e limita os canvases a 32 MiB. O
minimapa já permite navegar e mostra a região visível. A persistência ainda
grava duas cópias densas do mapa (autoridade e espelho de compatibilidade).
O pior caso medido tem 2.097.152 células: 4 MiB de índices por cópia. A
recuperação de clientes antigos exige manter o espelho e a revisão atômicos.

1. Manter os dois buffers densos e acrescentar um cache não reduz a escrita
   autoritativa e não atende ao salvamento incremental.
2. Trocar todo o modelo público por coordenadas esparsas exige mudar de uma
   vez histórico, ferramentas e todos os motores. Essa mudança pertence à
   expansão autoral seguinte, com versão e orçamento próprios.
3. Separar a representação física IndexedDB do documento lógico permite
   gravar somente os chunks autoritativos alterados e conservar os contratos
   atuais. Esta é a primeira entrega escolhida. O espelho continua denso;
   seu custo deve permanecer explícito nas medições.

## Contrato físico

- Cabeçalho reconhecido por `version: 2` e `storage: 'pinta-cells-32-v1'` em
  `pinta:local:document:<id>`. O protocolo anterior já recusa `version > 1`,
  sem usar o espelho como fonte principal. Nativo e nuvem têm versões
  independentes; não aumentar `schema` por uma representação física.
- Apenas mapas/conjuntos com pelo menos 32.768 células usam o protocolo.
  Projetos menores continuam no envelope 1. Exportações continuam completas.
- Chunks de 32 × 32, com arestas recortadas e células `Int16Array` intactas,
  inclusive espelhos/giros. Chunks inteiramente vazios não ocupam registro.
- Chaves derivadas do ID do asset, ID estável da camada e posição do chunk,
  sob `pinta:local:chunk:`. Um cabeçalho não pode referenciar chunks de outro
  documento. Limites de dimensões, camadas e células são conferidos antes
  de alocar buffers; nada é truncado para caber.
- Revisão, cabeçalho, chunks, espelho, cópias recuperadas e exclusões usam a
  mesma transação IndexedDB. Nenhum `await` no planejador transacional. O
  domínio só vê envelopes 1 já reconstruídos pela camada de IO.
- Comparar células exatas para reutilizar chunks; não usar hash sujeito a
  colisão como prova de igualdade. Uma pintura troca somente o chunk atingido.
- Ler um chunk ausente ou inválido aborta a operação com mensagem de dados
  preservados. Nunca cair silenciosamente no espelho. Formatos físicos
  desconhecidos continuam sendo questões de versão, sem sobrescrita.
- Reduzir mapa, remover camada, apagar documento e desfazer coletam somente
  chunks do próprio documento que deixaram de ser referenciados, atomicamente.
  Lápides e o CAS da issue 026 permanecem ativos.

## Fronteiras e orçamento

`localChunkStorage.ts` contém codec/diff puros. `assetAuthorityDb.ts` é a
única fronteira que descobre chunks, reconstrói o documento e agenda as
escritas. `localAssetAuthority.ts` conserva o planejamento da recuperação e
do orçamento da galeria. Não duplicar a autoridade no host ou no backend.

O domínio ainda mantém buffers densos em memória e a abertura lê os chunks
necessários ao documento completo. Esta entrega não declara carregamento
somente da área visível, mapas infinitos ou memória constante. O total
continua em 256 × 256, 32 camadas e 2.097.152 células, sem ampliar limites.
O espelho custa uma gravação densa para manter clientes antigos. Essa
compatibilidade não será retirada para produzir um número melhor.

## Aceite

Conservar bytes de todas as células, metadados, recursos, objetos, referências
e revisão após gravação, fechamento e reabertura. Num mapa ruidoso grande,
editar uma casa deve gravar exatamente um chunk autoritativo e o cabeçalho,
além do espelho conhecido. Repetir exclusão, resize, undo/redo, conflito entre
abas, edição antiga do espelho, abort/quota e recuperação após reabrir.
Testar o leitor anterior real, além de IndexedDB real no Chromium. Medir
bytes e chamadas de IO, heap, tempo e cache, sem extrapolar para outro aparelho.

As próximas entregas da etapa 8a tratam do custo de recompor muitas camadas,
da expansão autoral e de seus contratos nos motores. Automapping e projeções
continuam sendo entregas próprias 8b/8c; este lote não as considera concluídas.
