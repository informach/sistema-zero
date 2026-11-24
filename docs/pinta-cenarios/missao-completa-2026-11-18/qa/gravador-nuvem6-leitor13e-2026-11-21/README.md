# Preparação do gravador sobre o leitor 13e — 21/11/2026

O leitor 13e foi integrado sem conflitos. A declaração de mapas/conjuntos/peças
permanece preparada em 6, com leitura de nuvem 6 e nativo até 7. Não foi implantada.
O delta de packages contra esse leitor contém somente cinco arquivos: constante,
teste de contrato, fixture real do host, seu teste e a suíte do espelho no Kids.

A CI 44861952640 de c70 falhou no Kids: nove testes paravam em expectativas fixas
da capacidade 4. A reprodução local teve 63 aprovações e nove falhas. Foram corrigidas
as expectativas do produtor atual e os metadados de confirmações simuladas; fixtures
de versões históricas permanecem explícitas. A primeira correção revelou mais uma
expectativa após o ponto antes interrompido. A versão final passou nos 72 casos,
incluindo quota, reinício, revisão, retirada legítima e recuperação de corte antigo.
O nativo/envelope fracionário continua 5: capacidade declarada não é schema autoral.

Passaram dez categorias de verificação, distribuídas nos três recibos preservados.
O primeiro lote passou em sete e parou por colisão entre o nome do log externo e
o log interno do comparador. A segunda rodada corrigiu os nomes, provou igualdade
do Worker e perfil, mas encontrou um objeto de QA fora da formatação. A terceira
expandiu somente esse objeto e repetiu os 72 casos e o lint completo com sucesso.
Isso não é apresentado como uma única execução original inteiramente verde.

Contagens: Core 3.191; host 213; formatos do backend 70; espelho Kids 72. Tipos de
Core/host, perfil, Worker e Python também foram conferidos. Os 70 casos do backend
usam serviços/fixtures de integração, sem provar PostgreSQL de staging ou conflitos
ao vivo. O Worker continua com 1.979.073 bytes e mesmo SHA do leitor; os 126 arquivos
Python são idênticos. O comparador usa configuração somente de dry-run, sem deploy.

Faltam a CI da revisão final, o rollout autenticado do leitor 13e, ativação ordenada
da distribuição/política, publicação da mesma Vila, CAS/offline e rollback A/B.
Os ensaios desta máquina e as simulações não comprovam outros aparelhos físicos
ou testes com crianças. Etapa 0b e missão completa continuam pendentes.
