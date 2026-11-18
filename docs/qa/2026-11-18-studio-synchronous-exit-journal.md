# Recuperação de saída: cópia síncrona e promoção transacional

## Problema reproduzido

O job Linux `135092118177`, run `44386420665`, registrou a captura de
`exit-0` e a chamada nativa de `IDBTransaction.commit()`, mas reabriu
`in-flight-0`. Solicitar commit durante a saída não prova durabilidade.
O ensaio independente `scripts/measure-idb-exit-scheduling.mjs` encontrou
12/12 revisões preservadas por topologia no Chromium local e 0/12 no
WebKit local, para cada uma das três topologias: mesma store, outra store
na mesma base e outra base. Esse ensaio usa payload de 4 MiB e não é uma
homologação do produto. Separar a base não resolveu o problema.

## Implementação em qualificação

A revisão de saída também é gravada em Web Storage, antes do pedido nativo
IndexedDB. As chaves incluem perfil, projeto, escritor e token, escapados,
e são imutáveis. A recuperação usa o coordenador, as partições e o CAS já
existentes. Não há outra base de projetos ou alteração visual.

O codec versionado usa referências planas para preservar árvores profundas,
campos desconhecidos, arrays, undefined e zero negativo. Rejeita ciclos,
getters, referências inválidas e operações duplicadas ou conflitantes. Um
cabeçalho futuro ou registro malformado é preservado e bloqueia a abertura
específica, em vez de reconhecer silenciosamente uma versão antiga.

A cópia só é removida após confirmação transacional da promoção ou da cópia
recuperada, ou igualdade completa com partições e aplicações já confirmadas.
Revisões diferentes da mesma sequência originam cópias separadas, mantendo
o original. A cópia recuperada arquiva o journal completo no registro de
proveniência existente, na mesma transação, incluindo inversos e campos de
aplicações. Esse arquivo conserva a linhagem original; não se apresenta como
histórico automaticamente reaplicável ao identificador da cópia.

Se não existe cópia síncrona confirmada e o documento local continua dirty,
o beforeunload solicita a confirmação nativa. Não marca o documento como
salvo. Adaptadores externos conservam seu contrato. A confirmação depende
das regras de ativação do navegador e não cobre encerramento forçado do SO.

## Evidência local (Windows, laboratório)

- Suíte de estado/persistência: 374 testes, zero falhas, 2068 asserções
  em 37,77 s, incluindo colisão do histórico e arquivamento integral.
- Chromium e WebKit: 12 recargas imediatas por motor e conflito entre duas
  abas em cada motor. A repetição com transação nativa de saída abortada
  passou em 18,32 s. Não há espera por autosave antes da recarga.
- Chromium real: click confiável, quota síncrona negada, diálogo nativo de
  saída e cancelamento conservam texto, dirty e diagnóstico. Esse teste não
  declara comportamento de diálogo headless no WebKit.
- Typecheck incremental concluído sem erros após as alterações finais.
- Contratos dos cursos protegidos: 43 testes, 192 asserções, sem falhas.
  Isso não substitui os percursos no navegador.
- Testes específicos verificam codec profundo, quota, escopo, chave imutável,
  recuperação após aborto, conflitos de mesma sequência, partições estrangeiras,
  duplicação e sobreposição de operações.

## Limitações e aceitação pendente

O orçamento da cópia é de 2.000.000 caracteres codificados e não aumenta nem
reduz os limites de projeto. Acima disso ou sem Web Storage, a falha é explícita;
é necessário salvar ou exportar antes de sair. Não é garantia universal de
persistência. A serialização síncrona tem custo e precisa ser medida por tamanho.
O erro de structured clone de pilhas profundas no IndexedDB permanece separado.
A preservação de journals antigos pode consumir espaço, inclusive após apagar
uma cópia recuperada: não há limpeza agressiva de evidências.

Faltam aprovação do caso Linux originalmente vermelho, suíte isolada completa
e revisão dos resultados remotos. R3 continua aberto
até essa qualificação. A missão global continua parcial; este relatório não
fecha isolamento DOM, virtualização Blockly, depurador ou homologação física.


## Revisão posterior: acesso negado pela política do navegador

A captura agora distingue ausência de Web Storage de uma exceção ao acessar
localStorage. Uma exceção mantém a falha disponível ao leitor; não converte
cópias inacessíveis em lista vazia. O coordenador rejeita a abertura específica
nessa condição, conserva a revisão confirmada e não reconhece nem apaga o journal.
O erro explícito é preferível a editar silenciosamente uma revisão anterior.

A alteração de produção passou em 375 testes locais de estado/persistência,
2072 asserções, em 34,98 s, e typecheck. Um teste adicional do coordenador confirmou
que o journal continua presente e as partições originais não mudam quando a leitura
é negada; os nove testes desse arquivo passaram (37 asserções).

No GitHub, o SHA 69901bd64 já passou pelo caso normal de WebKit Linux que falhava
antes e pelo aborto nativo injetado. O run 44397955661 ainda estava executando a
suíte completa no momento deste registro; não estender o resultado à revisão
posterior de acesso negado nem ao aceite global.
