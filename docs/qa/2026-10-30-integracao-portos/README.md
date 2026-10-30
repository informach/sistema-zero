# Integração dos portos e dos lotes locais

## Composição

Em 30/10/2026, `origin/staging` avançou de `6461f19c0` para `080b6a3d2`, com os portos do
Bosque, Vila Doce, Pico, Vale e Nuvens. O remoto foi integrado por fast-forward e o trabalho
local foi reaplicado, sem conflito. O único arquivo com alterações dos dois lados foi
`packages/arquipelago/CLAUDE.md`. A conferência contra o backup preservou todos os demais
conteúdos, descontando normalização de quebras de linha.

Esta composição registra o trabalho já implementado de L01 a L10. Não representa o
encerramento da proposta inteira. O plano principal distingue os lotes implementados,
os aceites locais e o que continua pendente.

## Ajuste de integração

Os deques já são desenhados e têm colisores nas ilhas completas. Seus limites passam dos
raios anteriores de espera pelo chão. `raioDaEsperaDaIlha` agora inclui um setor de 35 graus
para cada lado do porto, com limites de 26,7 m no Bosque, 19,2 m na Vila, 19,6 m no Pico,
19,1 m no Vale e 25,9 m nas Nuvens. A espera anterior da caverna do Pico, de 28 m, permanece.

Os testes percorrem todos os vértices reais dos colisores dos portos e provam que a espera,
incluindo a margem adicional de 1 m, fica dentro dos 30 m de ativação da ilha completa.
As exclusões temporárias dos portos nos testes de cobertura foram removidas. Os testes
também conferem os caminhos a pé, o casco atracado, o corredor de aproximação e a escada
das Nuvens. Nenhum GLB nem gerador foi alterado nesta integração.

## Verificações desta composição

| Verificação | Resultado |
| --- | --- |
| Portos, Nuvens, Pico e Vale | 53 testes, 15.385 asserções, sem falhas |
| Pacote do jogo completo, incluindo os testes acima | 1.221 testes, 144.135 asserções, sem falhas |
| Contratos completos | 195 testes, 8.261 asserções, sem falhas |
| API completa | 265 passaram, 71 omitidos por banco não configurado, sem falhas |
| Carteira, inventário, rotas e catálogo do Members | 16 testes, 111 asserções, sem falhas |
| Host, rotas, minijogos, cosméticos e vestuário compartilhados | 58 testes, 1.359 asserções, sem falhas |
| Fontes e regeneração determinística dos manifestos das seis ilhas | 18 testes, 12.316 asserções, sem falhas |
| Blockly dos seis manifestos e regressões do motor 2D | 37 testes, 505 asserções, sem falhas |
| Mural próprio no Hub | 2 testes, 13 asserções, sem falhas |
| Configuração do gateway | 3 testes, 51 asserções, sem falhas |
| Ferramentas nas duas comunidades | Dois testes externos, sem falhas, com fixtures isoladas por público |
| Tipagem completa dos 11 pacotes afetados | Todos terminaram com exit 0 |
| Perfil de validação do studio-runtime | Conferido, sem regeneração necessária |
| Biome dos arquivos preparados | 412 arquivos, sem erros, 12 avisos de tamanho dos manifestos |

Os pacotes conferidos por tipagem são `arquipelago`, `arquipelago-contracts`,
`arquipelago-api`, `members`, `member-shell`, `hub`, `api-gateway`, `studio`,
`studio-runtime`, `community-kids` e `community`. O runtime inclui a tipagem dos testes.
Os cinco modelos locais foram comparados com os objetos Git do remoto; os identificadores
e SHA-256 estão em `modelos-conferidos.json`.

Os testes da API habilitaram os bancos locais de galeria, insumos, pedidos e profissões,
incluindo os casos que usam o Members real e perda de resposta. Os 71 omitidos pertencem
a outras suítes de banco, não configuradas nesta rodada. Todos os bancos usados ficam em
Postgres descartável em `127.0.0.1`. Nenhum comando desta integração escreveu em staging
ou produção.

Os comandos seguem os scripts `bun test` e `bun run typecheck` dos pacotes. Tipagem usa
`NODE_OPTIONS=--max-old-space-size=8192`. Para seleções focadas, os arquivos e saídas
completas ficam em `.cache/integracao-portos-20261030/` na máquina de execução. Os testes
das fontes dos manifestos foram executados a partir da raiz; os de Blockly e runtime 2D,
a partir de `packages/studio`.

O lint cobre os arquivos preparados para commit. Os manifestos gerados acima do limite
de 1 MB do Biome são validados pelos testes de contrato e regeneração determinística.
A formatação dos recibos JSON de QA foi normalizada sem modificar nenhum dos 60 conteúdos
JSON, conferidos por digest de sua representação canônica antes e depois. Os originais
também permanecem no backup local da integração.

## Limites

Não foi feita nova conferência visual dos portos nesta rodada; a prova visual da arte
recebida está em `docs/qa/2026-10-30-portos-do-barco/`. A integração acrescenta as provas
dos colisores e do carregamento, sem alegar aceite de navegação entre os novos portos.

Rede ampliada do barco, aberturas das boias e transformação vertical das âncoras das Nuvens
ainda precisam da implementação restante de L10. O fantasma familiar tem somente contrato
e regras puras nesta composição. L11, L12, lacunas de L13 e a qualificação integrada de L14
continuam abertas. As migrações, adoção de inventário e manifestos não foram aplicados
remotamente. O pedido desta etapa é commit e merge em staging local, sem push ou deploy.
