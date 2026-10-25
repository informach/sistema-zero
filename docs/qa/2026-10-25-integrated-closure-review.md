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

## Artefatos finais: transferência sem ativação

A distribuição final `55aa3dd527450cab8bf3396aebf070432bda33fe7b81fd56db12dfccbdf6628d` contém 110 arquivos / 23.488.465 bytes. A imagem final tem fingerprint de validação `268a4ca6032d599b0105e773e73540e0be68dbab9358692b335aa8d41d5fa532` e digest de registry `acdfd9288797772115498873574711e9a72d84249284dcaff37f8447dfd67982`. O conjunto do runtime passou em **353 testes / 3.870 asserções**, com um teste nativo opcional não executado. Oito provas Raylib passaram no executor dessa imagem; os 17 exemplos passaram no navegador com essa distribuição.

Os dois operadores R5 concluíram a escrita/leitura de **112 objetos por ambiente** (110 arquivos, marcador e catálogo), com checksum nativo, encerramento dos corpos e remoção dos Workers temporários confirmados. A etapa nativa levou 27.826 ms em staging e 45.927 ms em produção. Catálogos preparados: staging `9a9ddcb6dc256dbc6dd1bfcd3f9d2a93018a9f331507379228e8ac045677ca9c`; produção `f1be2e7a6d65a53455b82a034dfcdc6ad51970fa46307ac20189b33088155bcf`. A imagem também foi enviada aos dois repositórios corretos do registry.

Essas ações **não alteraram os ponteiros ativos**, a política Members nem as aplicações em execução. Ainda são necessários CI, rollout da imagem, ativação coordenada e prova hospedada da composição final. O negativo R4 de deadline continua preservado; o R5 usa concorrência limitada com drenagem de todas as operações admitidas e mantém o deadline de 100 s.

## Catálogo de exemplos: espera de carga fria no teste

O CI `40186233031` aprovou os nove jobs auxiliares, mas parou no grupo de componentes: o teste do painel de extensões usava o timeout implícito de 1 s do Testing Library para importar e validar os catálogos reais. A reprodução isolada falhou da mesma forma (11 pass / 1 fail). Com uma espera explícita limitada a 4 s, a primeira carga concluiu em 1.406 ms e os **12 testes / 31 asserções** passaram. A seleção ampliada de componentes também passou: **510 testes / 2.769 asserções / 60 arquivos**, em 40,49 s. Ela inclui quatro arquivos que o runner canônico isola; não substitui essa execução CI. A espera continua dentro do limite de 5 s do teste, sem sleep, mock de catálogo, retry ou mudança de produção. As verificações de permissão e de conteúdo foram preservadas. O CI da nova composição ainda é obrigatório.

## Modelos financeiros: leitura dos dois ambientes

A leitura do Messaging encontrou os oito modelos canônicos ativos em staging, remetente padrão verificado e nenhuma mensagem antiga pendente. Em produção, nenhum dos oito corresponde à versão canônica; há dois modelos antigos ativos e uma mensagem antiga pendente. Atualizar os modelos e retirar a fila antiga depende do corte coordenado dos consumidores. Nenhum seed, aviso, cobrança ou cancelamento foi executado por essa leitura.

## Abertura Python por admin e apresentação do bloqueio

O relato foi confirmado pelo usuário em `https://community-kids-staging.up.railway.app/estudio`. A leitura das variáveis Members, sem imprimir credenciais, encontrou nos dois ambientes a release ativa `2026-10-22-visual-games-3`: 256 IDs aprovados, dos quais 144 pertencem ao catálogo atual, com uma dependência ausente. A exceção administrativa a cursos já existia; a recusa por catálogo incompleto reutilizava indevidamente a mensagem de conquista de curso. Os dois motivos agora são distintos. **Não foi removida a validação de dependências ou de aprovação da release.**

Testes causais: a expectativa de mensagem de configuração falhou antes da mudança; depois, **26 testes / 288 asserções** passaram, incluindo admin sem conquistas em clássico e Pro, perfil próprio e recusa de suporte. A seleção do host passou em **cinco testes externos**, incluindo os subprocessos isolados de abertura e autoridade. Dentro da abertura há 15 cenários: o erro/retry preserva a mesma instância e seu buffer; em Pro, o editor retido fica oculto, inerte e em observação enquanto falta autoridade. As contagens externas e internas não são somadas.

Clássico e Pro usam um aviso compartilhado com os tokens e botões do host, nome do projeto, estado de preparo/erro, tentativa e retorno à galeria. A renderização Chrome focada compilou o CSS real do Kids: quatro combinações Padrão/Rosa e 320/1280 px, sem rolagem horizontal, alvos de 44 px, ações funcionais e nenhum erro de página; preparo sem retry prematuro também passou. É uma prova de componente/tema, não um login ou fluxo remoto completo. A fixture inicial usou o valor inválido de paleta `default`; o erro de fixture e seus screenshots foram preservados, e a prova corrigida usa ausência do atributo para Padrão e `pink` para Rosa.

Os planos R4 já preparados foram conferidos com a mesma função de currículo: ambos têm 619 IDs atuais e **nenhuma dependência ausente**, com as quatro extensões Python. A correção operacional ainda depende de ativar esse catálogo junto do runtime e validar a abertura real em staging. Atualizar apenas a mensagem não equivale a restaurar o ambiente.

## Orçamento global do CI

O CI completo `40129239034` (c7190ce) levou 41m14s; sua tipagem levou 803 s. Na execução `40186233031`, as novas provas Python e Three levaram 199 s e 60 s, respectivamente. A soma observada deixa o limite anterior de 45 minutos sem margem para o conjunto ampliado. O job principal recebe 60 minutos, mantendo os limites individuais de Python (8 min), Three (5 min) e cancelamento RPC (2 min), além dos orçamentos dos demais jobs e do produto. A alteração é de capacidade do pipeline, não uma aprovação de execução ou deploy.
