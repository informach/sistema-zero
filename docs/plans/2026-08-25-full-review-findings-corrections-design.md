# Correção dos achados do full review de 25/08/2026

## Objetivo

Corrigir os sete achados do review dos commits de 25/08/2026 sem alterar contratos públicos válidos. A entrega cobre conformidade do DANFSe, validação dos BFFs do Admin, prevenção de novas migrations de índice bloqueantes e atualização da documentação.

## DANFSe

O parser preservará a chave da NFS-e substituída e os percentuais aproximados de tributos federais, estaduais e municipais. O renderizador montará as informações complementares na ordem e no formato da NT 008 v1.02, omitindo apenas os dados ausentes no XML.

Arial regular e bold serão usadas nos rótulos e na marca d'água; Microsoft Sans Serif regular será usada no conteúdo. O serviço carregará ativos empacotados, verificará seus hashes no boot e incorporará somente os subconjuntos usados em cada PDF. A geração e o carimbo falharão de forma explícita se não puderem produzir o documento obrigatório.

Durante o licenciamento, cópias locais de `arial.ttf`, `arialbd.ttf` e `micross.ttf` serviram para avaliação. Em decisão posterior ao desenho inicial, o responsável informou ter obtido autorização temporária para uso em produção; os mesmos arquivos passam a integrar os ativos privados de implantação enquanto corre o licenciamento definitivo. A documentação operacional registra nomes, hashes, origem, finalidade, topologia de deploy, os dados que ainda precisam ser anexados à autorização e o texto necessário para solicitar a licença definitiva.

## Admin

Os BFFs de detalhe do membro e uso de ferramentas compartilharão parsers estritos para as respostas upstream. Campos obrigatórios ausentes, tipos incorretos e entradas parcialmente inválidas produzirão erro de dependência e resposta HTTP 502. O código deixará de transformar falhas contratuais em listas vazias ou respostas 200 incompletas.

## Auth e migrations

A migration `0017_profile_search_indexes` já foi aplicada em staging e produção. Ela permanecerá imutável. Alterá-la criaria histórias divergentes e não reduziria um lock que já ocorreu.

O pacote ganhará uma verificação automatizada que trata migrations até `0017` como histórico e rejeita novos `CREATE INDEX` potencialmente bloqueantes sem um fluxo concorrente explícito. A documentação exigirá migration custom fora de transação para índices criados em tabelas ativas. Novos ambientes aplicam `0017` antes de receber tráfego, quando o bloqueio de escrita não causa indisponibilidade.

## Documentação e higiene

O guia do Admin removerá a referência a `learnerDefaulted`. O guia Fiscal descreverá as fontes exigidas e o processo de licenciamento. O documento anterior perderá o whitespace excedente que faz `git diff --check` falhar.

## Testes e validação

Cada causa raiz receberá primeiro uma regressão que falha no estado atual. Os testes observarão contratos e saída real, sem métodos exclusivos de teste nem asserções sobre mocks.

A validação final incluirá testes focados, suítes completas dos pacotes afetados, typecheck, Biome, build do Admin, inspeção das migrations, `git diff --check`, extração de texto dos PDFs e renderização visual das variantes normal, substituída e cancelada.
