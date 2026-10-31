# Desafios do Bosque dos Bichos

Revisão C01b1 de 30/10/2026: [inventário por atividade](../repertorio-local.md) e
[fontes por bloco](../repertorio-local.json). Intenção editorial não comprova concessão de
blocos. C01b2a retirou as dependências opcionais dos seis quadros: a corrida usa teclado e
controle de toque da extensão. Noite é a única variação com fonte opcional, pela opacidade
ensinada em Cadê Todo Mundo. Não contar estruturas prontas como aprendizagem.

Arquivos para importar: `bosque.manifesto.json` (Kids) e `bosque-adulto.manifesto.json` (adulto).
Formato `arquipelago-desafios`, versão 1, escopo `ilha`. Segue a parte 3 de
`docs/plans/2026-10-28-arquipelago-desafio-do-dia-e-manifestos.md`.

| Desafio | Tipo | Quadro | Moedas | Extra |
| --- | --- | --- | --- | --- |
| Pinhas caindo | Quadro das Cores | 1 | 20 | 10 |
| Bolotas para o alto | Quadro das Cores | 2 | 20 | 10 |
| Quebrar as pinhas | Quadro das Cores | 3 | 20 | 10 |
| Três vidas | Quadro das Cores | 4 | 20 | 10 |
| Fim e outra partida | Quadro das Cores | 5 | 20 | 10 |
| Corrida dos bichos | Quadro das Cores | 6 | 20 | 10 |
| Pedras | Desafio do dia | Nenhum | 10 | 5 |
| Noite | Desafio do dia | Nenhum | 10 | 5 |
| Placar | Desafio do dia | Nenhum | 10 | 5 |

Os seis quadros pintam a ilha. As três variações diárias não pintam outro quadro.

## A chuva de pinhas (quadros 1 a 5, A42, 31/10/2026)

Os quadros 1 a 5 trabalham o centro do Construtor com o repertório da Nave Contra Asteroides: o
vento derruba pinhas bem em cima de onde o coelho está, ele joga bolotas para quebrá-las, tem três
vidas, perde quando elas acabam e começa outra partida do zero. Cada quadro deixa uma parte para
completar, como pedido da Capi (A44): o grupo das pinhas que nasce no relógio (1), as bolotas no
espaço (2), o encontro dos dois grupos que tira os dois e soma o ponto (3), as três vidas que caem
com cada pinha (4) e a derrota com o recomeço pelo Enter (5). O gabarito dos cinco é o mesmo jogo,
com a atração `chuva-de-pinhas`. As pinhas nascem na coluna do coelho, o que deixa o executor
conferir sem depender de sorte. O pad da extensão vale no celular (setas, A para a bolota e + para
o Enter). Cada quadro tem um extra opcional: som da bolota, a pinha que explode, a tela que treme
ou a tela de vitória com dez pinhas. Os quadros de antes (vagalume, lanche, pegadas, os quatro
bichos e a travessia) retomavam o Faísca e saíram nesta revisão.

A corrida dos bichos (quadro 6, o minijogo da proposta) e os três do dia continuam abaixo.
Cada variação começa com a corrida funcionando.
O extra da corrida permite escolher qualquer um dos quatro bichos, antes da Largada, para
avançar com Espaço ou A. A seta ao lado do nome escolhe o bicho; repetir a mesma seta antes
da largada devolve o controle automático. Enter ou + dá a largada. Os outros extras usam
Espaço ou A para outra largada em Pedras, alternar a luz em Noite e zerar o Placar.

## Blocos e aprendizagem

`packages/arquipelago-contracts/src/ilhas.ts` liga o Bosque ao posto `coder`, o Construtor.
O catálogo da jornada indica Iniciante 2D. Porém, pelas regras 7.4 a 7.6 do Arquipélago,
abrir a ilha não concede todos os blocos desse nível: a disponibilidade depende dos blocos
conquistados nos cursos. A publicação continua passando pela análise do Members.

O teste compara os blocos dos dezoito projetos por público com as listas locais até Construtor.
`quadros-iniciais.test.ts` exige uma base menor nos quadros 1 a 3: Farol e Jardim do Faísca.
Nos quadros 4 e 5, acrescenta somente a Nave. A entrada no posto não substitui a conquista
real desses blocos. `repertorio-local.test.ts` confere o gabarito inteiro dos seis quadros,
Pedras e Placar sem fontes opcionais, nos dois públicos. Noite exige só a opacidade além
dessa trilha. Régua completa em [conteúdo por posto](../conteudo-por-posto.md).

| Fonte | Ferramentas aproveitadas |
| --- | --- |
| Faísca: Cadê Todo Mundo, extra | Opacidade apenas no desafio opcional Noite; a arte reutilizada não exige concluir o curso |
| Faísca: A Chave do Farol | Velocidade, aplicação do movimento, borda, posição X, contato e estado |
| Faísca: O Jardim Secreto | Evento de teclado e condições |
| Construtor: Nave Contra Asteroides | Laço a cada N quadros, sorteio e placar |

Nenhum bloco do Inventor ou de posto posterior é necessário. `random_between`, `set_position`
e `on_sprite_click` não constam dessas listas e não foram usados. Nenhuma liberação é forçada
em `blocosManuais`.

O sorteio de posição da Nave escolhe entre passos de tamanho 2 e 3, pela comparação com a
metade da largura da pista. Cada bicho sorteia separadamente, a cada dois quadros. A Largada
usa velocidade e limite da tela para voltar à borda e recolocar cada bicho na sua faixa, no
mesmo evento, antes do próximo desenho. Assim, não exige o bloco de definir posição.

O primeiro contato registrado com a chegada guarda o vencedor, escreve Ganhei e encerra
o movimento de todos. Contatos no mesmo passo usam a ordem cachorro, gato, coelho, porquinho.
Há um único vencedor por corrida. A Largada limpa posições, falas e contadores de pulo,
preservando as vitórias. Zerar placar é uma ação separada.

Nas pedras, a subida e a descida têm a mesma quantidade de passos. A contagem de pulos fica
visível ao lado de cada faixa. O extra usa Espaço ou A para iniciar outra corrida. Não exige um
segundo salto tardio, que poderia ser interrompido pela vitória de outro participante.

## Autoria e reprodução

`projetos.ts` monta a corrida; `quadros-iniciais.ts` monta os outros cinco jogos, seus objetivos
e SVGs. Ambos montam IR, blocos, arquivos gerados e arte embutida. Os projetos usam
somente Programação e Jogo 2D. As listas HTML e CSS do IR são vazias. Os arquivos de execução
do Estúdio são gerados automaticamente, não são programação direta pedida à criança.
Gato, coelho e pedras reutilizam a arte de Cadê Todo Mundo. Cachorro e porquinho são SVGs
incluídos no projeto. Não há dependência de imagens externas.

`objetivos.ts` contém as regras. Eventos usam teclas e o controle da própria extensão,
sem grupos de botões ou coordenadas fixas da janela. As observações leem valores individuais. Ler o estado inteiro
também levaria as imagens e poderia exceder o limite de observação do executor.

`gerar-manifesto.ts` valida o schema antes de escrever. Não edite somente o JSON:

```powershell
bun docs/desafios-do-jogo/bosque/gerar-manifesto.ts
```

Todos os itens Kids e adultos usam `publicar: false`, incluindo os quatro principais anteriores,
para conferir os vínculos reais antes da publicação. Não existe
liberação artificial de blocos. Importar e publicar exige a conferência normal do Admin, incluindo
cobertura no currículo publicado e disponibilidade dos quadros. Esta entrega não consulta nem
grava dados de alunos, staging ou produção. Não inclui o brinquedo na ilha ou o rodízio diário,
que são outras partes do plano.

## Verificações

```powershell
bun test packages/arquipelago-contracts/tests docs/desafios-do-jogo/bosque/bosque.test.ts packages/studio/src/blockly/__tests__/bosqueManifest.test.ts
$env:SZ_CHECK_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
bun test packages/studio-runtime/tests/bosque-browser.test.ts
bun test packages/studio-runtime/tests/quadros-bosque-browser.test.ts
bun docs/desafios-do-jogo/bosque/conferir-quadros-browser.ts
$env:NODE_OPTIONS='--max-old-space-size=8192'
node packages/studio/node_modules/typescript/bin/tsc --noEmit -p docs/desafios-do-jogo/bosque/tsconfig.json
```

Use o TypeScript instalado no pacote, evitando uma versão diferente baixada por `bunx` na raiz.
O teste de navegador copia o executor `check-objectives.mjs` para um diretório temporário
e usa seu Chromium local, o runtime oficial do Jogo 2D e o julgador do core. Nenhuma aprovação
é simulada. Sem `SZ_CHECK_CHROMIUM`, esse teste fica explicitamente ignorado.

As verificações cobrem schema, moedas, público, paleta, orçamento dos objetivos, correspondência
dos dois JSON com as fontes e abertura dos dezoito projetos no Blockly. Regerar o JavaScript a partir dos
blocos precisa produzir exatamente o código salvo. O executor aprova o gabarito e reprova o
inicial em cada objetivo de execução, incluindo extras. O avaliador de estrutura faz o mesmo
para sorteio, falas e dono dos pontos.

Também há casos incorretos: passo fixo, fala trocada, ponto para outro bicho, Largada sem
reposicionar, corrida que não para, pulo sem descida, luz que não apaga e Largada que zera
a contagem de corridas. Falha do executor não conta como reprovação pedagógica.

Na chuva de pinhas, cada quadro tem uma regra que roda o jogo e uma de estrutura (que passa no
gabarito e reprova no inicial). O executor real reprova também a bolota que atravessa a pinha, a
pinha que não tira vida e o fim sem recomeço. `conferir-quadros-browser.ts` joga a partida inteira
no computador e no celular com o pad, com os prints em
`docs/qa/2026-10-31-revisao-dos-lotes/bosque-pinhas/`.
