# Leitura integral dos materiais do projeto

A CI **44871808894**, da fonte `66e3c5458`, aprovou os outros onze jobs de
verificação e encontrou um teste incompatível com a trava de preservação
incorporada de `b380d05a8`. A fixture da leitura leve do espelho da nuvem esperava
descartar um nome duplicado e um tipo desconhecido. Esse resultado parcial
contraria a proteção necessária para conservar cenas de versões novas.

A implementação de produção foi mantida. O teste positivo usa materiais na
forma que a loja grava: nomes canônicos distintos e origem `upload`. Três novos
casos independentes exigem recusa de nome repetido, tipo desconhecido e cena de
versão futura, com o registro original intacto e nenhuma escrita parcial. O
teste anterior de rejeição no snapshot integral permanece inalterado.

A reprodução original terminou com 69 aprovados e uma falha. As duas tentativas
intermediárias registram a correção do alvo duplicado da fixture e dos nomes
canônicos; a execução final passou nos **73 casos isolados**, dentro de um wrapper.
O primeiro controle negativo não carregou os casos porque faltava `./` no caminho
do CLI. O controle corrigido executou os três casos: todos falharam ao retirar
temporariamente a trava. A fonte foi restaurada exatamente e os três passaram
novamente com a proteção. Os logs distinguem essas tentativas.

O runner oficial completo do Estúdio passou em **12.179 testes**, zero falhas e
quatro casos ignorados por ausência do caminho padrão de Chromium. Esses quatro
foram reexecutados com Chrome real e passaram sem skip. Passaram os tipos
completos do Estúdio. Os totais usam os resumos externos do Bun, sem somar de
novo os casos internos de wrappers. O log integral está em `full-studio.log.gz`,
com bytes, hashes e verificação de descompressão em `full-log.json`.

Core, Pinta, Worker, Python e o leitor de produção ficaram intactos. Não há
alteração visual. A correção também foi propagada às preparações do gravador e
das regiões. A CI verde **44868877191** continua vinculada à fonte anterior
`e92cbdc9a`; ela não qualifica os merges novos. A fonte corrigida ainda precisa
da sua CI geral e do rollout autenticado. Estes ensaios não fizeram deploy,
publicação de jogo ou validação em outro aparelho físico.
