# Leitor e proteção da sincronia de desenhos

A CI completa **44863963656** da fonte `13e88e9c8` terminou com sucesso.
`previous-ci.json` conserva o resultado e os jobs. Antes da integração local,
a staging recebeu três commits concorrentes, até `dbd736865`, ainda não publicados.
O merge preparado incorporou seus oito arquivos sem conflito e preservou a
correção de perda silenciosa em `readProjectAssetsSnapshot`.

Essa correção reutiliza a trava de preservação da abertura completa: a varredura
dos desenhos recusa regravar um jogo fechado se a limpeza remover uma cena que
este leitor não entende. Um novo teste mantém no disco a cena de versão 99
enquanto outro desenho é atualizado. Os ajustes das fixtures usam assets que
a loja realmente persiste; não relaxam a trava nem o orçamento.

Passaram **47 testes externos**, incluindo o wrapper de **91 casos isolados de
sincronia** e o ensaio real de pagehide, recarga e conflito entre abas. O total
externo inclui o wrapper; não se somam os 91 como se fossem casos externos.
Passaram também os tipos completos do Estúdio e **12 fluxos locais de navegador**
Pinta → Estúdio, sem skip ou flaky, com programação e dados estruturados preservados.

Core, Pinta, Worker e fontes Python não mudaram neste merge. A distribuição e a
imagem qualificadas continuam correspondendo a esses componentes, mas a nova
fonte integrada requer sua própria CI geral. Este registro não representa
deploy, ativação de catálogo, gravação de nuvem 6 nem homologação autenticada.

`source-freeze.json` congela os dois arquivos de código do delta. `index.json`
registra os hashes das evidências; a CI anterior é vinculada explicitamente à
sua fonte, sem atribuir seu resultado ao merge novo.
