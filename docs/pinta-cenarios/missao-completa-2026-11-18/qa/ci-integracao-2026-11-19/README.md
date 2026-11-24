# QA/CI depois da integração com staging

Base integrada: `d8aa60e48`, preservada no merge `d7249b956`. As correções abaixo
ficam na exceção de QA/CI autorizada pelo usuário; não alteram os motores 3D.

## Falhas reproduzidas e correções

O CI `44570283526` recusou a formatação de sete recibos JSON e seis diagnósticos
de formatação/imports nos testes e no armazenamento do Estúdio. O Biome foi
aplicado somente aos arquivos apontados. Uma comparação por `isDeepStrictEqual`
confirmou que os valores dos sete recibos permanecem idênticos. Os dois arquivos
de implementação mudam somente a ordenação de imports.

Os três shards de Chromium paravam antes de executar testes: a fixture das aulas,
tratada como CommonJS, tentava carregar fontes ESM do Estúdio pelo `require`.
O erro foi reproduzido localmente com `playwright test --list`. O diretório de QA
agora declara seu formato ESM e o spec usa imports normais. Nenhuma dependência
ou dado do projeto foi alterado. Com isso, os dois jogos completos das aulas
executaram no Chromium; a regressão das aulas passou em **782 testes**,
**115.000 asserções**, zero falhas.

O ensaio do Arquipélago importava `playwright-core` **1.60.0**, que espera Chromium
**1223**, mas o workflow instalava pelo pacote do Estúdio, que traz Chromium
**1248**. O CI falhou por executável ausente. A instalação agora usa o CLI do
mesmo pacote consumidor, mantendo `--with-deps` e o runner Ubuntu 24.04.
O `--dry-run` local confirma o caminho 1223; o ensaio real de recuperação de
tempo passou no Chrome desta máquina. A instalação Linux será conferida no CI.

O preflight de fontes Ubuntu recebeu em paralelo no remoto suporte aos mirrors
EC2. O diagnóstico independente `44569021731` confirmou imagens Azure e EC2,
fontes assinadas e candidatos disponíveis nos três ensaios. Não se atribui a
esse diagnóstico a reprodução da falha transitória anterior. O Firefox passou
no CI seguinte, antes desta entrega; nenhuma verificação de assinatura foi removida.

## Evidências e alcance

- Biome global: **16.229 arquivos**, zero erros, 303 avisos e 245 informações.
- Testes de armazenamento nos arquivos reformatados: **36 aprovados**, 185 asserções.
- Preflight APT e contrato do workflow: **11 aprovados**, 39 asserções.
- Dois jogos completos no Chromium: **2 aprovados**, zero novas tentativas.

Os logs adjacentes registram comandos e resultados. As provas são locais nesta
máquina Windows, exceto os runs explicitamente identificados do GitHub. Não
significam aprovação de todos os gates remotos nem conclusão da missão do Pinta.
