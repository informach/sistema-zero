# Revisão de chaves de animação bbmodel — lote 199

Implementação, review e verificações concluídos; homologação visual/hardware pendente.

## Implementação e decisões

Leitor puro privado recebe a estrutura orçada do lote 198, imutável durante a
chamada. Bone e armature_bone têm descritores de posição/rotação/escala;
null_object somente posição. Tipo ausente segue declaração de bone, sem resolver
alvo; mapa literal effects permanece não resolvido, mesmo se declarar bone.
Outros tipos/canais ficam discriminados como unresolved, com sua fonte e contagem,
sem interpretar campos numéricos, flags, efeitos, scripts ou arquivos desses schemas.
Conhecer o schema de armature/null não aprova a semântica de pose/IK nem sua conversão.

Valores transformáveis guardam number|string por eixo, precisão F64/±0, source
time/color, UUID opcional sem geração, uniform opcional sem copiar X para Y/Z e
nome declarado da interpolação, incluindo desconhecidas. Não ordenar/deduplicar
tempos, transformar graus/quaternions, migrar eixos pré-5, avaliar expressões ou
confundir fonte finita com duração/curva nativa válida. Sem `Number`/`parseFloat`
para strings nesta etapa; até strings aparentemente numéricas continuam strings.

Pontos ausentes/[] usam valores diretos do keyframe com defaults string '1' em
escala e '0' nos demais canais. Pontos explícitos admitem o alias legado `values`,
validado como objeto e representado por layout/aliasSource distintos; apenas
propriedades próprias dos eixos sobrepõem o ponto. Não mutar a fonte nem incorporar
propriedades herdadas/__proto__. Valores diretos não usam esse alias, conforme o
caminho diferente da origem. Fonte bruta e alias ficam readonly para revisão de
campos não mapeados; strings sobrepostas/valores diretos inativos não são os valores
efetivos lidos e não recebem aprovação implícita para descarte.

Preservar todos os pontos até o limite estrutural de 1.000, sem supor que o máximo
de dois pontos dos controles de edição seja uma restrição do construtor/arquivo.
Pre/post e listas maiores ainda exigem avaliação de compatibilidade posterior.

Handles Bezier finitos de três eixos são próprios; defaults de origem em curvas
ativas ou quando algum campo de handles está declarado. Campos presentes são
conferidos mesmo em interpolação linear/desconhecida. Ausência total em curva não
Bezier permanece null, sem materializar quatro vetores descartáveis por chave.
Isso não elimina defaults necessários em um segmento misto na futura amostragem.

Budget compartilhado de texto foi extraído do leitor 198 com a mesma métrica e
diagnósticos. Chaves possuem teto separado de 4 Mi unidades UTF-16 por chamada,
incluindo canal/UUID/interpolação e valores efetivos de eixos, sem defaults, paths
gerados ou nomes de propriedades. Limite de campo 4.096; contagem inclui ocorrências
em todos os clipes/animadores. A estrutura global completa já precede qualquer
valor; texto incremental interrompe durante a materialização, nunca trunca saída.

Saída possui listas, vetores de valores, handles e cabeçalhos próprios. Referências
raw e declarações da estrutura são emprestadas/readonly. Proveniência de eixo pode
ser derivada de path + aliasSource; não reter três strings de path por ponto. Sem
cache global, busca por nome, parsing recursivo ou dependência nova. Não alegamos
ganho de desempenho medido.

## Review e evidências

- Três versões reais via JSON/envelope, sem migração numérica antecipada. Quatro
  tipos de interpolação e label futura, valores string/F64, graus 360, tempos
  negativos/repetidos/fora de ordem, três pontos e IDs de keyframe repetidos
  conservados. Mutação dos contêineres próprios não altera a fonte.
- Defaults/ausência, campos presentes inválidos, handles inativos malformados,
  flags, tipo/efeitos/canal desconhecidos, precedência e paths do alias, strings
  com scripts, números não finitos e sondas de acesso sem executar conteúdo.
- Tetos exatos e excedidos por campo/agregado, 1.000 pontos conservados, budget
  estrutural anterior aos números, dois clipes com animador de mesmo ID sem
  fusão e soma de texto compartilhada. Fonte e metadados do lote 198 regressados.
- Focal **174 passes, zero falhas, 3.471 asserts, 9 arquivos, 9,64 s** (`7bad0d`,
  término exit 0 `0e4cc7`). Inclui composição, worker/receptor, painel/opções/hook
  reais e pureza. Primeiros 21 testes dos leitores: 1.060 asserts, zero falhas
  (`b3b6b3`), antes de acrescentar a prova entre múltiplos clipes.
- Tipos exit 0 (`1eae85`); Biome **1.037 arquivos**, exit 0 (`c2764a`).
- Integral **2.455 passes, zero falhas, 8.323.930 asserts, 329 arquivos, 169,25 s**
  (`1c72c2`). Não usar duração desta execução como benchmark comparativo.
- Vite **1,38 s**, exit 0 (`ec1228`): BB worker 171,29 kB e painel 46,47 kB,
  +0,03 kB pela constante compartilhada de limite de texto. Leitores privados
  ainda não alcançados pelo importador. CSS 53,82 kB, index 360,81 kB e Three
  579,29 kB mantidos; aviso de chunk >500 kB continua.
- Kids: compilação **6,8 s**, tipos **13,4 s**, 59 páginas em 791 ms, exit 0
  (`04bc6f`). Diff exit 0 (`aff1c7`), três avisos CRLF anteriores apenas.

## Limitações mantidas

Não existem conversão de constantes/expressões, binding, sampling ou clipes nativos
de bbmodel nesta entrega. Pesquisa primária nos arquivos/commit documentados em
`bbmodel-animation-research.md`; implementação própria, sem parser Molang instalado
ou executado. Composição estática, worker e UI continuam reject/omit para movimentos.
Formato público, nuvem e Studio não mudam. Browser/GPU/toque/crianças pendentes.
