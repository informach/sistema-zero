# Revisão integrada de fechamento — 25/10/2026

## Pensa: ajuda no primeiro quadro do projeto

O CI de `d19c84302` falhou no teste responsivo que abre a ajuda: o DOM final mantinha Plano selecionado. Um teste causal local clica no botão assim que ele entra no DOM, antes dos efeitos passivos da montagem. O clique foi confirmado, mas o formulário não apareceu (RED preservado em `pensa-early-help-red-r2.log`). O efeito de troca de projeto voltava a selecionar Plano depois da interação.

A aba passa a ser resolvida com a identidade do projeto antes do commit dos controles, preservando a abertura inicial por `?ajuda=` somente uma vez. Não há timer ou aumento de timeout. O teste também volta à lista e reabre o mesmo projeto: começa no Plano. O pacote Pensa passou em **45 testes / 138 asserções**, e sua tipagem completa passou (exit 0). A invocação canônica é `bun test src`; uma execução anterior sem `src` coletou indevidamente dois arquivos Playwright e foi preservada como falha de seleção, não como regressão funcional.

## Contratos dos exemplos 3D

A suíte ampla encontrou seis expectativas anteriores à conversão: hash do catálogo básico, canto central do HUD e quatro orçamentos do runtime. A atualização foi restrita a esses contratos; os quatro outros catálogos mantêm seus hashes. A seleção dos três arquivos passou em **177 testes / 1.804 asserções**.

Medição do texto de bootstrap em caracteres/bytes gzip: Jogo 3D completo **224.876 / 62.782**, sem Plataforma **190.794 / 53.051**, Mundo 3D **344.930 / 102.843**, Avançado **209.159 / 61.537**. O custo adicional do básico é cerca de 1,5 KB gzip pelos controles/cenas nativos, HUD e descarte; os tetos continuam próximos da medida e têm justificativa no teste. A tipagem completa do Studio passou após a composição `4d5c1558a`; isso não encerra a suíte completa, o CI nem a publicação.

## Carregamento inicial

A repetição ampla encontrou **350.770 bytes** de JavaScript inicial para um teto de 350.000. A análise do build identificou a janela de criação no grafo estático da lista, mesmo fechada. O componente agora é importado e montado quando aberto; os contratos e guardas de criação permanecem os mesmos. Abrir/cancelar/reabrir reinicializa o formulário como antes, conferido em DOM real de componente (17 casos / 110 asserções no processo isolado).

A medição posterior passou: **343.177 bytes crus / 112.096 gzip / dois arquivos iniciais**, com a janela fora do grafo inicial. Nenhum teto foi aumentado. O teste completo de orçamento também aprovou rota e os três modos, 27 asserções, em 15,56 s. Duas medições anteriores atingiram o prazo local de 20 s durante a geração; uma delas preservou o relatório de tamanho. Não foram classificadas como aprovação nem usadas para aumentar o prazo. A tipagem completa após a integração `d9a1cac98` passou, antes desta separação de componente; o CI final continua obrigatório.

Na execução agrupada seguinte, a geração completa atingiu 23,75 s. O teste inspeciona o build de todos os chunks dinâmicos, incluindo a galeria Python ampliada; não mede latência da aplicação. Seu prazo de ferramenta passou para 60 s, mantendo todos os tetos de bytes, gzip e arquivos, além das guardas de dependências. Os resultados negativos permanecem registrados. O helper de criação passou a aguardar o diálogo antes de testar as corridas de perfil; os 22 casos / 108 asserções passaram sem alterar o momento síncrono do clique de confirmação.

## Publicação imutável do runtime

A primeira tentativa nativa da distribuição final gravou os objetos e o catálogo ainda inativo, mas a releitura serial atingiu o limite de 100 s após 72 de 112 objetos. Recibo negativo `promotion-staging-operational-r4/attempt-2/operator-receipt.json`: HTTP 500, corpo encerrado e limpeza do Worker/credencial confirmada por 404. O ponteiro do catálogo ativo não foi alterado. A tentativa anterior falhou antes da rede por diretório de dry-run relativo; foi corrigido o caminho absoluto, preservando a evidência.

O fluxo foi ajustado para duas gravações/verificações de conteúdo e quatro releituras nativas de metadata por vez. A distribuição aguarda todas as operações já admitidas antes do marcador; a releitura aguarda todas antes de liberar ownership, inclusive após falha. A primeira falha para novas admissões; rejections falsy são preservadas. Prazo de 100 s, checksum nativo, escrita condicional, marcador final, verificação de todos os objetos e limpeza permanecem exigidos. A aprovação desse ajuste depende da repetição nativa completa; testes de porta sintética não qualificam R2 real.

Controle causal: a releitura original iniciava uma operação; o novo teste exige quatro, mantém a segunda requisição em 429 e não permite terminar com operação pendente. As seleções afetadas passaram em 25 testes / 157 asserções; a suíte completa do runtime passou em **353 testes / 3.870 asserções**, com um skip nativo explícito. Tipagem de produção/testes passou. O perfil foi regenerado e conferido; a imagem anterior não deve ser reutilizada com o novo fingerprint.

## Fechamento das verificações locais

Os 779 arquivos do Studio foram cobertos pelos 145 grupos do runner canônico, em lotes seriais preservando o isolamento. Os grupos anteriores a Projetos passaram na execução ampla; Projetos foi repetido após as correções (**245 testes / 5.528 asserções**, zero falhas); os grupos seguintes e os 15 grupos individuais de blocos Python passaram. O índice conferiu ausência de grupos faltantes ou extras (`studio-final-group-coverage-r1.json`). Não é uma única execução limpa nem uma soma de testes únicos; os negativos anteriores permanecem. O CI executa novamente a composição inteira.

A conferência financeira de variáveis, em memória e sem exibir valores, confirmou nos dois ambientes: sandbox/produção corretos, credenciais/identificador configurados, HMAC Payments/Gateway correspondente, token Gateway/Messaging correspondente e caminhos de regularização Kids/Adultos válidos. Um primeiro leitor usou o nome errado do token de Messaging; foi corrigido pelo contrato do serviço, sem alterar variáveis. Isso não substitui a prova autenticada após o deploy nem autoriza declarar a política ativada.

## Chromium do CI

O CI `40183615055` aprovou os nove jobs auxiliares e os testes dos pacotes, mas falhou em `verify:grid-export`: o processo Node usa o `playwright-core` fixado no runtime (1.64.1), enquanto o runner só havia instalado os navegadores dos outros pacotes. O Chromium esperado (`chromium_headless_shell-1248`) não existia. O pipeline agora instala o browser pelo CLI do próprio runtime, depois de seu `npm ci` congelado e antes das provas nativas. Não se aponta para um executável de outra versão nem se desativa o sandbox.

O teste de contrato falhou antes do ajuste e passou depois; seleção CI/Ubuntu: oito testes / 33 asserções. Foram restauradas/acrescentadas as guardas canônicas dos geradores Pygame Zero e Raylib no mesmo gate. Os checks locais conferiram **58 exemplos Pygame Zero e 17 Raylib** sem alteração dos arquivos gerados. O resultado Linux completo ainda depende da nova execução CI.

## Baseline financeiro somente de leitura

Consulta realizada dentro do serviço Payments correto, conferindo projeto/ambiente/serviço e usando transação read-only:

| Ambiente | Assinaturas | Política instalada | Identidade de ciclos instalada | Política ativa |
| --- | ---: | --- | --- | --- |
| Staging | 0 | sim | sim | não |
| Produção | 2 | não | não | não se aplica |

Em produção, um contador diverge dos recibos locais; a consulta não reescreveu contadores nem concluiu o histórico do provedor. Migrações canônicas, revisão de ciclos e seed da política são gates do deploy. O predeploy de Payments executa `db:migrate`. Avisos, cancelamentos e cobranças não foram acionados por essa consulta. As duas tentativas anteriores sem resposta JSON foram recusadas; a tentativa válida usa o transporte SSH de origem confiável, sem imprimir URL de banco ou credenciais.

Evidências no namespace `.cache/python-missions-20261024/`. Nenhuma dessas provas, isoladamente, afirma implantação ou ativação financeira concluída.
