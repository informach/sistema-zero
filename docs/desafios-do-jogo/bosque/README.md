# Desafios do Bosque dos Bichos

Revisão C01b1 de 30/10/2026: [inventário por atividade](../repertorio-local.md) e
[fontes por bloco](../repertorio-local.json). Intenção editorial não comprova concessão de
blocos. As lacunas de fontes obrigatórias continuam explícitas; não usar opcionais como
repertório universal nem contar estruturas prontas como aprendizagem.

Arquivos para importar: `bosque.manifesto.json` (Kids) e `bosque-adulto.manifesto.json` (adulto).
Formato `arquipelago-desafios`, versão 1, escopo `ilha`. Segue a parte 3 de
`docs/plans/2026-10-28-arquipelago-desafio-do-dia-e-manifestos.md`.

| Desafio | Tipo | Quadro | Moedas | Extra |
| --- | --- | --- | --- | --- |
| Vagalume aceso | Quadro das Cores | 1 | 20 | 10 |
| O lanche do coelho | Quadro das Cores | 2 | 20 | 10 |
| Trilha das pegadas | Quadro das Cores | 3 | 20 | 10 |
| Cuide dos quatro | Quadro das Cores | 4 | 20 | 10 |
| Travessia tranquila | Quadro das Cores | 5 | 20 | 10 |
| Corrida dos bichos | Quadro das Cores | 6 | 20 | 10 |
| Pedras | Desafio do dia | Nenhum | 10 | 5 |
| Noite | Desafio do dia | Nenhum | 10 | 5 |
| Placar | Desafio do dia | Nenhum | 10 | 5 |

Os seis quadros pintam a ilha. As três variações diárias não pintam outro quadro.
Cada variação começa com a corrida funcionando.
O extra da corrida permite escolher qualquer um dos quatro bichos, antes da Largada, para
avançar com espaço. Clicar novamente no mesmo bicho devolve o controle automático.
Os outros extras são dar a largada com Enter, alternar a luz e zerar o placar.

## Blocos e aprendizagem

`packages/arquipelago-contracts/src/ilhas.ts` liga o Bosque ao posto `coder`, o Construtor.
O catálogo da jornada indica Iniciante 2D. Porém, pelas regras 7.4 a 7.6 do Arquipélago,
abrir a ilha não concede todos os blocos desse nível: a disponibilidade depende dos blocos
conquistados nos cursos. A publicação continua passando pela análise do Members.

O teste compara os blocos dos dezoito projetos por público com as listas locais até Construtor.
`quadros-iniciais.test.ts` exige uma base menor nos quadros 1 a 3: Farol e Jardim do Faísca.
Nos quadros 4 e 5, acrescenta somente a Nave. A entrada no posto não substitui a conquista
real desses blocos. Régua completa em [conteúdo por posto](../conteudo-por-posto.md).

| Fonte | Ferramentas aproveitadas |
| --- | --- |
| Faísca: Cadê Todo Mundo | Grupo de botões, clique, arte, textos, opacidade e contagem |
| Faísca: A Chave do Farol | Velocidade, aplicação do movimento, borda, posição X, contato e estado |
| Faísca: O Jardim Secreto | Evento de teclado e condições |
| Construtor: Nave Contra Asteroides | Laço a cada N quadros, sorteio e placar |
| Construtor: O Jogo do Meu Jeito | Confirmação das ferramentas disponíveis no mesmo posto |

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
visível ao lado de cada faixa. O extra usa Enter para iniciar outra corrida. Não exige um
segundo salto tardio, que poderia ser interrompido pela vitória de outro participante.

## Autoria e reprodução

`projetos.ts` monta a corrida; `quadros-iniciais.ts` monta os outros cinco jogos, seus objetivos
e SVGs. Ambos montam IR, blocos, arquivos gerados e arte embutida. Os projetos usam
somente Programação e Jogo 2D. As listas HTML e CSS do IR são vazias. Os arquivos de execução
do Estúdio são gerados automaticamente, não são programação direta pedida à criança.
Gato, coelho e pedras reutilizam a arte de Cadê Todo Mundo. Cachorro e porquinho são SVGs
incluídos no projeto. Não há dependência de imagens externas.

`objetivos.ts` contém as regras. Cliques usam o sprite e seu grupo, sem coordenadas fixas
da janela. As observações de execução leem valores individuais. Ler o estado inteiro
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

Nos cinco quadros novos, cada objetivo usa execução. Negativos conferem luz que nasce acesa,
entrega sem alface, alface que pode ser recolhida depois da entrega, trilha fora de ordem,
visita repetida contada de novo e movimento que continua depois da bandeira. Cada extra
também reprova quando Enter não reinicia. A revisita sai e volta ao bicho: o evento de
contato dispara na entrada, portanto apenas ficar parado perto dele não prova essa regra.
