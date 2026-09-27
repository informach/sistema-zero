# Revisão de montagem de clipes bbmodel — lote 206

Implementação, review e verificações concluídos em 09/09/2026.

## Contrato

`convertBbmodelPreparedClips` compõe trilhas numéricas preparadas, agendas e poses
em clipes nativos locais, com dados próprios. Draft privado recebe duração, FPS,
repetição, peso resolvido e escolha de vizinhos Catmull; não infere esses valores
de length/snapping/Molang. O planejador de origem ainda precisa resolver binding,
flags global/quaternion/IK, seleção, campos adicionais e metadados. O assembler
não pode transformar esses gates em aprovações implícitas.

Opções estritas precedem drafts. Qualquer clipe exige adaptation continuous-sampled;
default reject. A escolha declara tempos exatos e curvas matemáticas do lote 203,
seguidos de interpolação nativa. Não é reprodução idêntica ao Blockbench.
Trilhas lineares/step sem pre/post mantêm tempos autorais e limites da janela;
curvas e rotação Euler interpolada recebem também grade. Outgoing step é mantido.
Os vizinhos fora da janela continuam na fonte e participam das amostras de borda.

Pre/post exige escolha própria sample-pre: uma chave nativa não comporta dois
valores no mesmo instante. Amostra pre no tempo exato; o salto pode ser espalhado
ou perdido entre quadros. A presença de dois pontos é reportada mesmo quando seus
valores coincidem. FPS não dá limite de erro nem elimina aliasing de rotações;
um teste demonstra 720 graus desaparecerem entre duas amostras de baixa frequência.
Escala source-minimum só altera zeros efetivamente amostrados; também não prova
equivalência contínua nas passagens por zero entre eles.

Limites conjuntos de clipes/trilhas precedem planejamento. Agendas completas
cabem antes de ler XYZ, handles ou valores da base. Classificação lê métodos e
cardinalidade dos pontos, não componentes. Saída tem IDs por índice original,
nomes gerados/encurtados explicitamente e zero nativo canônico; demais F64 não
são quantizados. Valores e relatório não compartilham arrays/objetos mutáveis
com fonte ou outros clipes. Relatórios agregados por trilha, não por key;
integração posterior deve submetê-los ao orçamento conjunto do relatório final.

## Review e evidências

- Três versões por envelope, grafo, metadados, seleção, key reader, binding,
  preparo e repouso reais. Duração/FPS explícitos diferentes da origem. Leitor
  nativo estrito e reprodução de translação/rotação/escala verificadas.
- Polinômio Bezier independente nas amostras, mixed step, vizinhos externos,
  tempos subnormais, clipe vazio explícito, trilha vazia e IDs inválidos recusados.
- 600 s/120 FPS linear conserva três keys. 65.536 amostras aceitas; mais um
  instante off-grid na última trilha falha antes de XYZ/handles/base do prefixo.
- Políticas estritas, peso zero, contagem local de underflow/escala zero,
  canonicalização sem mudança da fonte e ownership entre clipes/relatórios.
- Tipos inicialmente identificaram inferência incorreta de helper de teste sobre
  união de arrays de keys Vec3/Quaternion. Leitura direta da key com guard mantém
  a união correta, sem casts nem mudanças no contrato de produção.
- Unidade inicial: 11 passes, zero falhas, 216 asserts, 519 ms (`982503`), antes
  das duas provas extras do review. Tipos finais exit 0 (`8a6fab`/`aac00a`).
- Biome: 1.057 arquivos, exit 0 (`a4145d`). Focal final: **264 passes, zero
  falhas, 8.135 asserts, 14 arquivos, 8,52 s** (`f599ad`).
- Integral: **2.574 passes, zero falhas, 8.340.051 asserts, 337 arquivos,
  162,05 s** (`a068bd`). Sem avisos act nesta execução; a ausência não prova
  correção da interação registrada no lote 203.
- Vite: exit 0, **1,25 s** (`bc827e`); tamanhos e hashes dos bundles mantidos
  em relação ao lote 205. Three 579,29 kB ainda gera aviso de tamanho.
- Kids: exit 0 (`bb367b`), compilação **5,4 s**, tipos **10,7 s**, 59 páginas
  em 571 ms. Diff exit 0 (`8c61d6`), apenas os três avisos CRLF anteriores.

## Limitações

Ainda não há composição no importador completo, relatório/protocolo worker/UI,
validação mundial animada, revisão visual ou homologação infantil. Checks locais
não provam limites de matrizes mundiais nem de geometria. Não é benchmark nem
ativação pública. Pendências das outras fases continuam no plano.
