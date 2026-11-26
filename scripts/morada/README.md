# Biblioteca Morada

Publicação concluída em staging e produção em 14/11/2026. O [registro operacional](../../docs/operations/2026-11-14-morada-publicacao.md) documenta os arquivos verificados, a conversão efetiva das contas, os reembolsos e os deployments. As instruções abaixo continuam sendo o procedimento para novas operações.

Importa móveis, construção, fazenda, os 24 gatos/cachorros e os oito troféus próprios. Só metadados entram no Git. GLB, imagens e miniaturas importados ficam em `output/morada-assets/morada`, ignorado pelo Git, e depois nos buckets privados.

## Preparar e conferir

Na raiz: `bun run morada:migrar`, depois `bun --no-env-file scripts/morada/encaixes.ts` (o vão de cada janela e porta, do `vao` da arte, em `packages/core/src/morada/encaixes.generated.ts`; `--check` só confere) e `bun run morada:conferir`. `ARTES_3D_DIR` altera a fonte (`../artes-3d` por padrão), `MORADA_OUTPUT_DIR` altera a pasta de preparação. A importação não muda a fonte da arte nem o banco.

O catálogo gerado tem arquivos por hash; extrai texturas compartilhadas para carregar sem imagens embutidas/blob no Kids. Mantém as origens e converte `dims` para XYZ. Paredes antigas recebem caixas calculadas pelos vãos autorais; batentes mantêm vãos livres; folhas sem dobradiça recebem pivô de abertura na cópia importada. Partes móveis usam colisões em coordenadas da peça em repouso, com `part` identificando o nó que as carrega.

## Conferência no navegador

`bun scripts/morada/qa.ts` abre o editor real em `http://127.0.0.1:5284`; `?adulto=1` escolhe a pele adulta. Recursos privados locais, casa e revisão em memória, sem sessão/banco de produção. O playground do jogo também aceita `MORADA_QA_DIR=<pasta dos recursos>`. O servidor fica ligado apenas em 127.0.0.1.

## Publicação dos recursos

`bun --env-file=packages/admin/.env scripts/morada/migrar.ts --r2` prepara e envia os arquivos aos buckets PRIVADOS de testes e produção, seguindo o mecanismo do avatar. Não publica a aplicação nem migra contas. Fazer isso antes de disponibilizar o cliente que referencia o catálogo novo.

## Banco e contas

Aplicar a migration `0149_morada_house.sql` com o fluxo do Members. A ferramenta `packages/members/scripts/swap-morada.ts` faz ensaio por padrão; revisar o relatório antes da execução de escrita. O reembolso é pelo extrato histórico dos itens retirados, preservando Galeria e troféus. A casa usa CAS/revisão e as requisições do editor antigo são recusadas depois da conversão.

O script faz parte da imagem de produção do Members. Antes de `--confirm`, executar o ensaio no ambiente de destino e guardar `--backup-json` em armazenamento privado. Esse modo exporta quartos, inventários, carteiras, extratos e casas em uma transação de leitura consistente; não aceitar `--confirm` junto com backup. O ensaio também constrói e valida cada casa nova, sem escrever. Após aplicar, repetir o ensaio: não deve haver casas, itens ou reembolsos pendentes. O banco histórico permanece para conferência e recuperação; não restaurar carteiras inteiras sobre transações posteriores.

**Preço (14/11/2026, decisão da dona: a régua do avatar).** O preço é editorial e mora em `packages/core/src/morada/prices.generated.ts`, fora do catálogo que o `migrar.ts` reescreve. Peça nova da arte: rodar `bun scripts/morada/propor-precos.ts` (preserva o que já está no arquivo e propõe só as novas, com `review`; `--tudo` refaz só as que ainda estão em `review`) e conferir. Construção, a casa inicial e os canteiros da horta são grátis; cada categoria de móvel tem jeito grátis (`GRATIS_ESCOLHIDAS` ou a régua automática); troféus e a estante de troféus (`moveis/escola/vitrine_trofeus`) são por conquista. Depois de um deploy que torne pagas peças que já estavam nas casas, rodar `packages/members/scripts/conceder-morada.ts` (ensaio, depois `--confirm`). A identidade visual das páginas Kids e adulta deve permanecer a atual.
