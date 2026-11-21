# Aviso adaptativo e diagnóstico de assets — 21/11/2026

A CI de 691fb teve também uma falha no Chromium shard 2, repetida três vezes.
O ensaio gráfico de GLB animado/HDR completava renderização, animação, pointer lock
e teardown, mas recusava o aviso deliberado de qualidade leve. O orçamento comum
dos runtimes reduz a qualidade uma vez quando a sondagem encontra FPS abaixo de 45.
A mensagem não indica erro de asset. O código funcional permanece intacto.

O caso original reproduziu exatamente essa falha nesta máquina. A correção de QA
preserva a coleta integral e anexa o diagnóstico bruto ao resultado; somente a
mensagem completa de nível warning é reconhecida como status permitido na validação.
O teste novo exige que GLTFLoader, RGBELoader, pageerror, a mesma frase como error
e a frase acrescida de uma falha continuem reprovando. Não há filtro por prefixo.
Todas as asserções gráficas e esperas do ensaio original permanecem.

A repetição local passou em dois casos, sem skip/flaky/retry. O diagnóstico bruto
da execução verde foi []; não se declara que ela acionou novamente o modo leve.
A execução vermelha registrou o aviso real e só falhou na validação final, depois
dos controles funcionais. As duas evidências e a prova do classificador são distintas.
Não houve medição nova de desempenho ou validação física em outro aparelho.

A alteração usa a exceção de QA/CI autorizada. Uma nova CI completa do gravador
continua necessária antes do rollout, após a homologação do leitor.
