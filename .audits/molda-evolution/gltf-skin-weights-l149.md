# Valores de juntas e pesos glTF, lote 149

## Contrato

Leitura após graph, meshes, accessors e skins, para malhas instanciadas com skin.
Índices JOINTS incluem todos os slots, mesmo peso zero, e precisam caber em todas
as skins usadas pela malha. Todas as famílias JOINTS_n/WEIGHTS_n participam:
junta não pode ter dois pesos positivos por vértice, inclusive entre conjuntos.
Pesos negativos são erro. Slots de peso zero não são apagados/reordenados.

Não há pruning, normalização, criação de binding ou cópia de valores numéricos.
Saída guarda índices de conjuntos e estatísticas próprias: máximo de influências,
índice máximo, vértices sem força, somas não unitárias e slots sem peso com junta
diferente de zero. Layouts compartilhados são somente leitura por contrato. Mais
de quatro influências não é erro glTF: conversão nativa precisará de decisão e
relatório explícitos antes de aceitar/reduzir dados.

## Somas e precisão

Quando todos os conjuntos usam inteiros normalizados, soma unitária é requisito
do formato. Recuperar os numeradores exatos já divididos por 255/65535 e somar
com denominador comum 65535 (=255×257). Não aplicar tolerância Float32 a esse
requisito: um passo U16 pode ser menor que a tolerância com muitas influências.

Quando há Float32, a especificação recomenda soma próxima de um. O leitor mantém
os valores e contabiliza desvios para revisão, inclusive vértices sem força. Isso
não significa aprovação pelo validador Khronos nem validade do binding nativo:
o validador também sinaliza somas float fora da tolerância como problema. Acúmulo
diagnóstico Float32 por componente/conjunto e tolerância de 2e-7 por peso positivo
seguem sua referência. Overflows do acúmulo viram contagem, não Infinity na saída.

## Orçamento e compartilhamento

Indexar uma vez o menor número de juntas entre skins de cada malha. Combinações
ordenadas de índices de accessors compartilham conferência, mesmo entre primitives
e malhas, mas cada malha mantém sua decisão de faixa. Não cachear só por accessor
individual: duplicação e soma dependem da combinação de todos os conjuntos.

Teto de 4.194.304 slots de influência por combinações únicas antes de ler qualquer
valor. Um slot lê um índice e um peso; isso não é medição de pico de RAM/GPU/p95.
Paths das mensagens são preparados fora dos loops numéricos. Caches pertencem à
chamada e desaparecem depois; mudanças futuras são relidas. Sem dependência nova.

## Review e testes

- Dois conjuntos/oito influências mantidos; duplicatas positivas intra/entre
  conjuntos, pesos negativos e índices fora da menor skin recusados.
- Slots zero preservados e contados, inclusive índice inválido com peso zero.
  Dados Float32 não unitários/sem força/subnormais e soma overflow não são reparados.
- Todas as 256 divisões U8 e 65.536 divisões U16 conferidas; mistura U8/U16 usa
  denominador comum. Com 128 influências, um passo U16 errado continua recusado.
- Mistura float/quantizado preservada. Tolerância Float32 tem casos dos dois lados.
- 1.000 primitives compartilhadas leem os dois arrays uma vez. Malhas diferentes
  compartilham validação dos dados, nunca a decisão de faixa da skin. Chamada
  posterior vê mutação; malha sem instância com skin não abre esses valores.
- 1.024 combinações com 1.024 vértices atingem exatamente o teto de trabalho;
  a combinação seguinte falha antes de getters dos dados, sem mock do leitor.
- GLB real com accessors de três tipos confrontado com validador para pesos
  normais/negativos/duplicados/fora de faixa e somas quantizadas incorretas.
  Exportações reais de IK/poses espelhadas mantêm bytes e dados de pesos.
- Duas correções de fixtures para tipos de índice e matcher de constante numérica,
  sem casts/supressões. Nenhuma regra de validação foi enfraquecida.

Materiais, animações, conversão/montagem nativa, worker e UI de importação continuam
posteriores. Formato público, persistência, exportação e viewport não mudaram.

## Regressão de foco encontrada na integral

A primeira integral deste lote teve 1.821 passes/uma falha, em 98,42 s. O reporter
`--only-failures` preservou o diagnóstico: `SceneWorkshop.test.tsx:3277`, relatório
visível mas foco ainda fora do botão Conferir agora. É a mesma família de testes
que falhou intermitentemente no lote 148; agora há localização e reprodução.

O componente retirava o botão durante o trabalho e restaurava o foco em efeito
passivo. A conclusão assíncrona permite um commit do DOM antes desse efeito.
Teste mínimo observa o DOM em layout effect do pai, após a atualização do filho:
antes da correção, o relatório já existe e o foco está no body; falha reproduzida
sem worker, timeout, mocks ou alterações em dependências. Uma troca de useEffect
por useLayoutEffect no componente restaura o foco durante o mesmo commit.

O teste mínimo passou após a mudança. Regressões cobrem ocupado, relatório,
prévia pronta, cancelamento e erro antes dos efeitos passivos, além de ausência
de autofocus ao montar e em atualizações alheias à operação. Os testes originais
com worker real não foram alterados: 75 execuções focais (cinco casos × 15),
zero falhas, 1.021 asserts, 38,97 s. A integral final será repetida depois de tipos
e análise estática; não confundir esse teste DOM com homologação de navegador.

Referência de ciclo de vida: [React useEffect](https://react.dev/reference/react/useEffect)
e [useLayoutEffect](https://react.dev/reference/react/useLayoutEffect).

## Evidência

- Importação/pureza: 199 testes, zero falhas, 17 arquivos, 14.961 asserts, 5,13 s.
- Integral final após a correção de foco: **1.824 testes, zero falhas, 256 arquivos,
  8.210.981 asserts, 138,69 s**. Tipos passaram; Biome: 782 arquivos sem problemas.
- Vite: 1,23 s. Kids: compilação 7,0 s, tipos 7,9 s, 59 páginas em 554 ms.
  Diff check passou. Aviso conhecido de chunk Three >500 kB permanece.
- Headless ainda emite avisos de WebGL e alguns testes legados emitem `act`;
  esse resultado não certifica GPU, toque ou usabilidade infantil.

Fontes: [glTF, atributos de skin](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#skinned-mesh-attributes),
[validador, análise de influências](https://github.com/KhronosGroup/glTF-Validator/blob/main/lib/src/data_access/validate_accessors.dart).
