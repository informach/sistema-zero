# Desafios da Vila Doce

Revisão C01b1 de 30/10/2026: [inventário por atividade](../repertorio-local.md) e
[fontes por bloco](../repertorio-local.json). Intenção editorial não comprova concessão de
blocos. As lacunas de fontes obrigatórias continuam explícitas; não usar opcionais como
repertório universal nem contar estruturas prontas como aprendizagem.

C01d corrigiu as ocorrências compartilhadas de instruções na largada. Cada peça agora tem
ID próprio, aceito pelo leitor do Members. Código, comportamento e recompensas não mudaram.
O teste `../projetos-validos.test.ts` confere os dois públicos de todos os pacotes; Blockly
sozinho não basta, pois pode normalizar um ID repetido ao carregar o projeto.

Importe `vila-doce.manifesto.json` em Jogo → Desafios → Manifesto de desafios.
Formato `arquipelago-desafios`, versão 1, escopo `ilha`. O arquivo acima é Kids;
`vila-doce-adulto.manifesto.json` traz o conteúdo equivalente adulto, todo em rascunho.

| Desafio | Tipo | Quadro | Moedas | Extra |
| --- | --- | --- | --- | --- |
| O forno da vez | Quadro das Cores | 1 | 20 | 10 |
| A caixa de pães | Quadro das Cores | 2 | 20 | 10 |
| Suco na ordem | Quadro das Cores | 3 | 20 | 10 |
| O doce esfriou | Quadro das Cores | 4 | 20 | 10 |
| Bandejas da padaria | Quadro das Cores | 5 | 20 | 10 |
| A corrida do entregador | Quadro das Cores | 6 | 20 | 10 |
| Duas entregas | Desafio do dia | Nenhum | 10 | 5 |
| Oito segundos | Desafio do dia | Nenhum | 10 | 5 |
| Uma caixa nova | Desafio do dia | Nenhum | 10 | 5 |

O principal pinta um sexto da Vila, como os demais quadros. Cada projeto aprovado pode virar
minijogo no fliperama pelo campo `recompensa.atracao`, usando o serviço existente. As variações
nunca dão cor. O quadro 6 deve estar disponível no cadastro ao publicar.

Todos os itens usam `publicar: false` após C01b1. Projetos, objetivos e recompensas foram
preservados; somente o pedido de publicação automática dos quatro anteriores foi retirado.
A análise do currículo real e a disponibilização do conteúdo no Admin continuam necessárias.

## Quadros complementares

`quadros-iniciais.ts` monta cinco atividades independentes com cenário pronto e ações ausentes:
escolher o forno certo sem contar duas vezes, consumir estoque sem ficar negativo, seguir a
receita em ordem, esperar o doce esfriar e conferir a quantidade antes de limpar a bandeja.
O extra de todos é Enter recomeçar. Os controles de toque usam as mesmas ações do teclado.

Todos os blocos destes cinco projetos já aparecem nas listas do Faísca e da Nave do Construtor.
O resfriamento é uma animação pronta: 120 unidades de calor, uma a menos por atualização até
zero, sem prometer duração em segundos. A pessoa completa a condição de entrega, não o laço.
Não se usa o bloco de relógio do Dino antes de aprendê-lo.

`quadros-iniciais.test.ts` confere repertório, determinismo, orçamento e objetivos dos dois
públicos. O teste Blockly confere os dezoito projetos. O executor da Vila cobre os cinco novos
com gabarito, inicial, condições removidas e reinício ausente. O seletor
`SZ_VILA_QUADROS_NOVOS=1` executa somente esse complemento, sem alegar uma nova prova dos quatro
desafios preservados. Evidências visuais em `docs/qa/2026-10-29-quadros-vila/`.

## O que a criança completa

No principal, cenário, imagens, textos e controle de toque estão prontos. A criança completa
os eventos da Largada e dos contatos, o movimento em quatro direções e a contagem do prazo. A caixa
interrompe a tentativa, a chegada conta uma entrega e o tempo zero também encerra a corrida.
A Largada permite repetir e explorar caminhos por cima ou por baixo da caixa.

Cada variação começa com essa corrida funcionando:

- Duas entregas: contar a primeira parada uma vez e exigir essa entrega antes de concluir a segunda.
- Oito segundos: mudar apenas o prazo inicial de doze para oito segundos.
- Uma caixa nova: completar o contato da caixa nova, já desenhada, preservando rotas livres.

Enter dá a largada e o botão + do controle de toque faz a mesma ação. O extra de cada versão
é Espaço iniciar outra corrida; no toque, use A. São eventos de tecla já ensinados na trilha.
O botão desenhado no cenário foi retirado, sem deixar uma figura que pareça clicável.
O ID histórico `recomecar-enter` permanece, com rótulo e prova atualizados para Espaço/A.
Os objetivos avaliam as regras que faltam completar, sem premiar o cenário que veio pronto.

## Blocos e arte

`ilhas.ts` associa a Vila Doce a `hacker`, o posto Inventor. O perfil ainda é `iniciante-2d`.
O teste compara todos os blocos dos dezoito projetos com as listas locais de Faísca, Construtor
e Inventor. Usa somente as listas de A Chave do Farol, A Ilha do Farol, O Jardim
Secreto, Nave Contra Asteroides e Corre, Dino. A cobertura de cada criança
continua dependendo dos cursos conquistados e da análise normal do Members.

Movimento, contato e estado vêm do Farol; teclado, do Jardim;
placar, da Nave; repetição a cada segundo, do Dino. Não há `blocosManuais` adicionais.
Não há objetos JavaScript, HTML, CSS ou Canvas nos blocos. Os arquivos de execução são
gerados pelo Estúdio a partir do IR, como no Bosque.

O menino de boné reutiliza o SVG do Farol. Vila, lojas, caixas e destinos são SVGs
embutidos em `projetos.ts`, sem imagens externas. Não exige modelo do Blender.
As lojas e árvores do fundo são decoração. As caixas são os obstáculos com contato.

## Números escolhidos

`PISTA` reúne palco de 640 × 480, começo em (48, 270), velocidade 3 e prazos 12 e 8.
Os corredores acima e abaixo da caixa permitem rotas diferentes. O caminho usado na
verificação leva cerca de quatro segundos de entrada, com folga mesmo no prazo menor.
O relógio usa o bloco a cada segundo e só desconta durante a corrida. A Largada repõe o
contador; o primeiro desconto acompanha o próximo pulso desse relógio.

Os valores de moedas vêm de `MOEDAS_PADRAO_POR_TIPO`. Ordem 60 e quadro 6 seguem a convenção
do minijogo do Bosque, sem presumir que o quadro esteja livre em qualquer ambiente.

## Gerar e conferir

Edite as fontes e regenere, em vez de mudar somente o JSON:

```powershell
bun docs/desafios-do-jogo/vila-doce/gerar-manifesto.ts
bun test packages/arquipelago-contracts/tests docs/desafios-do-jogo/vila-doce/vila-doce.test.ts packages/studio/src/blockly/__tests__/vilaDoceManifest.test.ts
$env:SZ_CHECK_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
bun test packages/studio-runtime/tests/vila-doce-browser.test.ts
$env:NODE_OPTIONS='--max-old-space-size=8192'
node packages/studio/node_modules/typescript/bin/tsc --noEmit -p docs/desafios-do-jogo/vila-doce/tsconfig.json
```

O teste do executor usa `check-objectives.mjs`, runtime oficial e julgador do core.
Sem `SZ_CHECK_CHROMIUM`, fica explicitamente ignorado. Cada objetivo, inclusive os extras,
deve passar no gabarito e falhar no inicial. Falha de infraestrutura nunca vale como reprovação.
Casos incorretos incluem relógio congelado, caixas sem contato, primeira entrega repetida
e prazo antigo. O teste de Largada conclui uma entrega antes de conferir o reinício.
O extra também reprova quando seu evento é retirado do gabarito.

`bun docs/desafios-do-jogo/vila-doce/conferir-corrida-browser.ts` confere os quatro jogos
com teclado e toque em 1280 e 390 px. Usa `SZ_CHECK_CHROMIUM` e `ARQUIPELAGO_PRINTS`, sem
serviço externo nem banco. A correção C01b2b de controles não conclui a aplicação de pulo,
gravidade e dificuldade do Inventor, que continua sendo um recorte curricular distinto.

O teste Blockly abre os dezoito projetos e exige igualdade do JavaScript regenerado.
O teste HTTP em `arquipelago-api/tests/integration/manifestos.test.ts` confere importação,
exportação e reimportação sem revisão extra, com repositório em memória e porta Members falsa.
Ele não substitui a prova do executor real. Nenhum teste desta entrega acessa banco remoto.

Importar e publicar no Admin é uma ação posterior. Esta entrega fornece o arquivo validado,
sem cadastrar desafios ou alterar o progresso de alunos.
