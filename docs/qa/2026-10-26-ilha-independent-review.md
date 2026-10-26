# Revisão independente da Ilha do Farol — 26/10/2026

Esta revisão prepara a próxima onda. O commit local do curso é `e6296ef067a0ee10f80c117e4c1dfdd8f9f75c46`; a onda em implantação tem outro código e outra imagem. Nenhum manifesto foi importado ou publicado por esta revisão.

## Achados corrigidos

- A prova de navegador dependia de uma instalação incidental do Three.js no cache do monorepositório. Ela agora lê a versão fixada instalada pelo lockfile do próprio executor; o comando de preparação consta no mapa técnico.
- As provas locais e em Docker gravavam no mesmo diretório. Os dois ambientes passaram a usar diretórios distintos.
- O lint global apontou imports desorganizados e formatação de artefatos gerados. Os imports foram corrigidos; os projetos do Molda preservam a serialização de origem e a cena gerada segue o tratamento dos demais arquivos gerados.
- No Admin, apagar um limite de chão de uma ação 3D convertia o campo vazio para zero. O editor agora conserva a digitação incompleta, aceita decimais com vírgula ou ponto e informa quando restaura o último valor válido.

As correções estão nos commits `6eeec1ce9`, `7224600ca` e `3ce2d33de`, ainda isolados para a próxima integração.

## Evidência

- Validação dos 40 manifestos: 40 válidos, nenhum reprovado. Validação dos 40 roteiros: 220 clipes, nenhum erro.
- Lint global após a primeira correção: 12.070 arquivos verificados, nenhum erro; os avisos não bloqueantes continuam registrados no log local. A alteração posterior do Admin passou no lint focado.
- Testes focados de autoria e navegação: 5 testes e 476 asserções. Contratos do executor e carregamento de módulos: 34 testes e 141 asserções.
- Admin: teste de regressão reproduziu o zero indevido antes da correção; depois, 7 testes do editor passaram. O componente real em uma página isolada no Chrome preservou valor vazio e sinal incompleto, aceitou vírgula decimal e avisou ao restaurar um valor fora do limite. A primeira tentativa com o servidor de teste em Bun não terminou; a prova com Node concluiu. Não é um teste do fluxo completo do Admin. Uma checagem semântica focada dos dois arquivos alterados terminou sem diagnósticos; não substitui a tipagem integral do CI.
- Chromium no Windows: oito cenários. A solução e uma posição alternativa passaram; ausência de memória, chave alta, ausência de movimento, barco lento e posição inalterada foram distinguidos conforme seus objetivos.
- Imagem Linux sem rede: os mesmos oito cenários produziram os resultados esperados. A imagem local usada tem digest `sha256:5aecc821651fcead9092a5f08a5b3a13f611351fedf70dfc4e8590c82d26d4ca` e perfil `ac16762ba3a94a4576abacdbcecde37a6e6786e0880416ffbb5ededcce3ae757`. O processo da imagem roda como usuário não root.

Os arquivos de observação e seus hashes estão em `.cache/ilha-do-farol/review-evidence.json` na cópia de revisão. Esses testes não demonstram aprendizagem nem validam todos os navegadores ou o desempenho em todos os computadores.

## Falta para disponibilizar

Conciliar os commits com o staging atualizado, executar o CI da composição, construir e homologar a imagem integrada no serviço hospedado e implantar staging e produção. A gravação e revisão das mídias, as artes finais, a importação dos manifestos no curso reservado e a publicação das aulas permanecem etapas próprias.

## Correção após CI da composição integrada

A suíte do CI revelou que a borda de autoria do Members não aceitava ações de configuração da Ilha 3D. O contrato passou a aceitar as sete ações conhecidas, com limites e recusas de entradas inválidas; uma rota tipada foi testada para preservar os campos. O caminho da criança usa a validação e reprodução do motor no servidor: três testes por HTTP cobrem as experiências reais de ponto de vista, posição e contato, até a conferência aprovada.

A suíte geral também presumia que todos os palcos fossem SVG e que todas as experiências compartilhassem um cenário 2D. A Ilha tem palco próprio WebGL; os testes agora verificam seu contêiner e controles, os caminhos próprios de descoberta e as amostras visuais sem atribuir um cenário 2D indevido. As 40 aulas permanecem verificadas, sem alteração de roteiro ou manifesto.

Verificação local: núcleo 1.625 testes aprovados; member-shell 1.878 aprovados; Members 2.001 aprovados e 532 ignorados por dependerem de infraestrutura; três percursos da Ilha aprovados por HTTP em repositórios de teste. Esta evidência não substitui homologação no navegador ou no banco e nos serviços hospedados.
