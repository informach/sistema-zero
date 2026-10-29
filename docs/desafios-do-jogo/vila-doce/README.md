# Desafios da Vila Doce

Importe `vila-doce.manifesto.json` em Jogo → Desafios → Manifesto de desafios.
Formato `arquipelago-desafios`, versão 1, escopo `ilha`, público `kids`.

| Desafio | Tipo | Quadro | Moedas | Extra |
| --- | --- | --- | --- | --- |
| A corrida do entregador | Quadro das Cores | 6 | 20 | 10 |
| Duas entregas | Desafio do dia | Nenhum | 10 | 5 |
| Oito segundos | Desafio do dia | Nenhum | 10 | 5 |
| Uma caixa nova | Desafio do dia | Nenhum | 10 | 5 |

O principal pinta um sexto da Vila, como os demais quadros. Cada projeto aprovado pode virar
minijogo no fliperama pelo campo `recompensa.atracao`, usando o serviço existente. As variações
nunca dão cor. O quadro 6 deve estar disponível no cadastro ao publicar.

## O que a criança completa

No principal, cenário, imagens, textos e botão estão prontos. A criança completa os eventos
da Largada e dos contatos, o movimento em quatro direções e a contagem do prazo. A caixa
interrompe a tentativa, a chegada conta uma entrega e o tempo zero também encerra a corrida.
A Largada permite repetir e explorar caminhos por cima ou por baixo da caixa.

Cada variação começa com essa corrida funcionando:

- Duas entregas: contar a primeira parada uma vez e exigir essa entrega antes de concluir a segunda.
- Oito segundos: mudar apenas o prazo inicial de doze para oito segundos.
- Uma caixa nova: completar o contato da caixa nova, já desenhada, preservando rotas livres.

O extra de cada versão é Enter iniciar outra corrida, com o mesmo comportamento da Largada.
É uma aplicação do evento de teclado já aprendido. O botão continua disponível para toque.
Os objetivos avaliam as regras que faltam completar, sem premiar o cenário que veio pronto.

## Blocos e arte

`ilhas.ts` associa a Vila Doce a `hacker`, o posto Inventor. O perfil ainda é `iniciante-2d`.
O teste compara todos os blocos dos oito projetos com as listas locais de Faísca, Construtor
e Inventor. Usa as listas de Cadê Todo Mundo, A Chave do Farol, A Ilha do Farol, O Jardim
Secreto, Nave Contra Asteroides, O Jogo do Meu Jeito e Corre, Dino. A cobertura de cada criança
continua dependendo dos cursos conquistados e da análise normal do Members.

Movimento, contato e estado vêm do Farol; grupos e botão, do Cadê; teclado, do Jardim;
placar, da Nave; repetição a cada segundo, do Dino. Não há `blocosManuais` adicionais.
Não há objetos JavaScript, HTML, CSS ou Canvas nos blocos. Os arquivos de execução são
gerados pelo Estúdio a partir do IR, como no Bosque.

O menino de boné reutiliza o SVG do Farol. Vila, lojas, caixas, destinos e botão são SVGs
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

O teste Blockly abre os oito projetos e exige igualdade do JavaScript regenerado.
O teste HTTP em `arquipelago-api/tests/integration/manifestos.test.ts` confere importação,
exportação e reimportação sem revisão extra, com repositório em memória e porta Members falsa.
Ele não substitui a prova do executor real. Nenhum teste desta entrega acessa banco remoto.

Importar e publicar no Admin é uma ação posterior. Esta entrega fornece o arquivo validado,
sem cadastrar desafios ou alterar o progresso de alunos.
