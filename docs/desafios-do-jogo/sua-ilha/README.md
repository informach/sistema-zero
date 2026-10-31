# Desafios da sua ilha: Pega-conchas

C03a de 30/10/2026. A proposta do Arquipélago põe o minijogo Pega-conchas no posto Faísca, na
sua ilha. A régua de conteúdo é a da Jornada ([conteúdo por posto](../conteudo-por-posto.md)):
evento, ação, informação verdadeira ou falsa, se/senão e posição; ao aplicar, coletar uma vez,
lembrar, decidir com e sem o objeto e reiniciar. Todos os blocos vêm da trilha do Faísca
(`desafio-primeiro-jogo` e `o-jardim-secreto`), sem extra nem Poder.

Arquivos para importar: `sua-ilha.manifesto.json` (Kids) e `sua-ilha-adulto.manifesto.json`
(adulto). Formato `arquipelago-desafios`, versão 1, escopo `ilha`. Os seis pedem publicação; a
importação é da equipe, e a barreira C01a confere de novo no serviço.

| Desafio | Quadro | O que a pessoa completa | Extra |
| --- | --- | --- | --- |
| Passos na areia | 1 | O laço move o guia com as setas, sem sair da tela | Enter recomeça |
| A primeira concha | 2 | No contato, guardar `temConcha` e tirar a concha da areia | Enter recomeça |
| O balde do Nico | 3 | Entregar só com a concha; o Senão marca `pediu` | Enter recomeça |
| A concha rosa | 4 | Pegar a rosa (`temRosa`); só ela vale no balde, a cinza não | Enter recomeça |
| A maré volta | 5 | Enter recomeça a praia inteira | A barra de espaço também recomeça |
| Pega-conchas | 6 | Três conchas, cada uma uma vez; o balde só enche com as três | Enter recomeça |

Cada quadro vale 20 moedas e o extra 10. A sua ilha já tem cor: os quadros não pintam a ilha
(`cor: false`). No jogo, o cavalete fica na grama ao lado da trilha do píer
(`QUADRO_DA_SUA_ILHA` em `packages/arquipelago/src/mundo/lugar-do-quadro.ts`) e acende a mancha
de cada quadro feito. Cada quadro entrega o próprio minijogo ao fliperama; o sexto entrega o
`pega-conchas`.

As posições e os tempos de tecla são os dos quadros do Bosque, já conferidos no executor. Cada
conferência falha no projeto inicial, inclusive os casos de "sem a concha" (com um ponto de
conferência antes do fim).

## Gerar e conferir

```powershell
bun docs/desafios-do-jogo/sua-ilha/gerar-manifesto.ts
bun test docs/desafios-do-jogo/sua-ilha
$env:SZ_CHECK_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
cd packages/studio-runtime; bun test tests/sua-ilha-browser.test.ts --timeout 900000
```

O teste do executor real roda gabarito (passa), inicial (falha em tudo) e erros causais:
reinício vazio, guia sem limite da tela, concha já guardada no começo e condição ignorada no
balde. Em 30/10/2026: 6 testes, 23 cenários, 181 conferências, todos aprovados.
