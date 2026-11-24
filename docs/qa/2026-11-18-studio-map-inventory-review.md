# Inventário e manual após as consultas de cenários

Base: `7b36c4ff6`; revisão isolada `estudio-revisao-contratos-20261118`.

O run `44439619231` detectou quatro regressões de contrato após a integração
das consultas Pinta: contagem histórica 322 contra 326 definições no Jogo 2D,
inventário da auditoria desatualizado, contagem 404 contra 408 no Avançado e
manual Avançado com 60.670 caracteres para um limite de 60.000.

As quatro falhas foram reproduzidas localmente antes das correções. A guarda
de inventário continua exata, agora incluindo os quatro blocos novos de objeto
por referência, imagem do recurso, propriedade de camada e propriedade de peça.
A auditoria registra 326 definições, 324 visíveis e duas ocultas. O inventário
de 316 métodos/valores públicos permanece inalterado, conforme a fonte real.

O manual foi revisado para retirar repetições da introdução, campanhas, estados
e telas. Foram preservados os nomes de blocos, unidades de movimento, regras de
reinício/pausa, condições das campanhas, fontes, localização das ferramentas e
todas as consultas de cenários. Resultado: **59.881 caracteres**, dentro do teto
original, sem ampliar cotas nem remover recursos ou diagnósticos.

Verificação local: `bun test` sobre `docDrift.test.ts`, `blockAudit.test.ts` e
`manifest.test.ts`: **461 testes, 4.364 asserções, zero falhas**. Este lote altera
documentação e os inventários esperados; não altera definições, cores, conexões,
paleta ou runtime. A suíte global continua sendo um gate separado no GitHub.

## Revisão após a suíte completa no GitHub

O run `44443712486`, SHA `82be89bcf`, aprovou todos os jobs de navegador,
Python, runtime hospedado, auditoria e medições. Os contratos Linux/Windows
identificaram uma falha em `game-2d-advanced/__tests__/docDrift.test.ts`, ausente
da seleção local anterior: a revisão do texto retirou três expressões exigidas
sobre identificador único, identidade fase + objeto e ancoragem dos controles.
O grupo final de cada job teve 5.345 aprovações e essa única falha.

As expressões foram restauradas no manual, mantendo as instruções e o limite.
O texto passou a **59.902 caracteres**, ainda abaixo de 60.000. Os quatro
arquivos de contratos, incluindo agora o drift do Avançado, aprovaram
**472 testes e 4.417 asserções**, sem falhas. Nenhuma asserção foi removida ou
flexibilizada. A CI integral do novo SHA continua obrigatória.
