# Revisão da estrutura de animações bbmodel — lote 198

Implementação, review e verificações concluídos; homologação visual/hardware pendente.

## Contrato e implementação

Leitor puro e privado sobre o envelope já validado e imutável durante a chamada.
Aceita free 4.9/4.10/5.0, sem interpretar a fonte por meio do Blockbench, Molang,
plugins, DOM, Three ou IO. Pesquisa primária e links em
`bbmodel-animation-research.md`; nenhuma implementação GPL incorporada.

Preflight em três varreduras: contêineres de todos os clipes/animadores/marcadores,
listas de todas as chaves, depois cardinalidades de data_points. Tetos agregados:
1.024 clipes, 65.536 animadores/marcadores, 262.144 chaves, 524.288 slots de dados,
1.000 pontos por chave. Ausência/lista vazia reserva um slot para valores diretos.
São limites da entrada, não aprovação dos canais nem dos limites nativos. O limite
de arquivo/estrutura JSON continua anterior e pode ser atingido primeiro.

Só depois vêm os cabeçalhos, tipos declarados, nomes, flags e marcadores. Campos
numéricos finitos mantêm F64/zero assinado, sem clamp de duração, ajuste de grade,
deduplicação de marcadores próximos ou conversão de snapping em FPS. Marcador sem
nome conserva o sentinel numérico zero. Nomes vazios são válidos; IDs obrigatórios
e tipos/loops declarados precisam de texto não vazio. UUID de clipe é obrigatório
e único em Map, com identidade literal, não regex nem geração aleatória.

Expressões temporais continuam strings/números; strings numéricas não são
convertidas. Loops e tipos desconhecidos ficam explícitos, não viram opções
conhecidas. Ausência de tipo não resolve o alvo; nem a chave effects é aprovação
de capacidade. Paths ficam metadados literais, sem resolução ou leitura externa.

Texto por campo ≤4.096 unidades UTF-16 e agregado ≤4 Mi unidades. A métrica soma
ocorrências de strings conhecidas presentes na fonte, inclusive UUIDs, IDs do mapa
de animadores, nomes, tipos, loops, paths, grupos, marcadores e expressões temporais.
Não conta defaults ausentes, nomes de propriedades, paths gerados nem campos opacos;
não é estimativa de RAM. A soma completa precede cópias das listas de chaves.

Listas, cabeçalhos, timing, marcadores e Map de saída são próprios. Registros raw
de clipes/animadores/marcadores/chaves são emprestados e somente leitura por contrato;
não existe promessa de clone profundo de payload opaco. Listas raw ficam junto aos
cabeçalhos temporários, evitando correspondência por índices entre listas paralelas.
Valores/interpolações das chaves, alvos, migração dos eixos anteriores a 5.0 e campos
não mapeados permanecem para a próxima etapa; este leitor não aprova essas perdas.

## Review e evidências

- As três versões atravessam o envelope JSON real, preservando Unicode, nomes/paths
  literais, identidade __proto__/constructor, duas marcas próximas, desconhecidos
  explícitos e expressões inertes. Mutação de todos os contêineres próprios não
  altera fonte; raw keys compartilham intencionalmente apenas os registros.
- Casos estritos de arrays/objetos, UUIDs, tipos, números, flags, textos e markers;
  valores F64 extremos/±0, defaults e ausência distintos de null. Sondas de acesso
  demonstram que geometria, controladores, scripts, valores de chaves e flags de
  animador ainda não interpretadas não são lidos.
- Limites exatos e excedidos, contagem por ocorrência mesmo com aliases, prioridade
  de todos os contêineres antes de números/pontos, texto agregado antes de cópias de
  keys. Fixtures de limites/sentinelas não JSON usam envelope próprio já criado,
  isolando o limite desta etapa do limite anterior de bytes/estrutura JSON.
- Primeiro typecheck reprovou indexação potencialmente ausente na correspondência
  entre planos/cabeçalhos e nas fixtures. Corrigido pelo vínculo direto no domínio
  e guardas de presença nos testes, sem cast/supressão/fallback. O review também
  preservou sondas de getters sem espalhar objetos que perderiam esses getters.
- Focal: **161 passes, zero falhas, 2.987 asserts, 8 arquivos, 7,88 s** (`b622bc`).
  Inclui composição, worker/receptor, painel/opções/hook reais e pureza.
- Tipos: `bun run typecheck`, exit 0 (`b63852`). Biome: **1.033 arquivos**, exit 0
  (`d260b9`). Integral: **2.442 passes, zero falhas, 8.323.438 asserts, 328 arquivos,
  145,82 s** (`87cfd7`).
- Vite: **1,57 s**, exit 0 (`45153a`). BB worker 171,26 kB e painel 46,44 kB,
  ambos +0,17 kB pela constante compartilhada de limites de entrada. O leitor
  privado novo ainda não é alcançado pelo importador. CSS 53,82 kB, index 360,81 kB
  e Three 579,29 kB mantidos; aviso de chunk >500 kB permanece. Sem ganho de
  desempenho alegado.
- Kids: compilação **6,8 s**, tipos **10,0 s**, 59 páginas em 684 ms, exit 0
  (`9dabd4`). Diff: exit 0 (`78132b`), apenas três avisos CRLF anteriores.

## Limitações mantidas

Nenhuma mudança nas escolhas reject/omit de clipes do importador estático, worker
ou painel do lote 197. Ainda não há importação de movimentos, target binding,
conversão de curvas, execução de efeitos ou controladores. Não altera formato
público, dependências, armazenamento ou ponte Studio. Não há benchmark novo nem
homologação visual/GPU/toque/crianças nesta verificação.
