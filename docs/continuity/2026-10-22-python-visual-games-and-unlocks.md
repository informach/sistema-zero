# Jogos visuais e conquistas por linguagem — checkpoint de integração

## Código revisado

Pac-Man e Space Arena têm duas entradas cada na galeria: Clássico em Blocos/Ponte
e Pro em Código. Cada par compartilha os mesmos fontes Python e assets. O motor
recebe formas compostas Turtle oficiais e controles de cotas gerais; não contém
uma implementação escondida dos jogos. A qualificação R4 usa o loader real,
roundtrip Blockly e edições reais, sem blocos opacos.

O Estúdio Completo usa as conquistas do próprio perfil e público. Cursos
JavaScript não concedem blocos Python equivalentes. O servidor reutiliza a união
atual e congelada de `studioUnlockBlocks`, sem migração. Para criar, importar ou
remixar no Estúdio Completo, JavaScript e Python exigem ao menos um bloco conhecido
conquistado na própria linguagem, tanto no Clássico quanto no Pro, além dos direitos
de produto e modo. Pro também exige a capacidade Pro. Admin em prévia autorizada
recebe todos os blocos e extensões homologados; não há apresentação Python restrita
somente a admins. O catálogo aprovado e a paleta operável continuam necessários.
Aulas e salas mantêm sua curadoria contextual; essa regra de criação não impede
ler ou recuperar projetos JavaScript Clássico já existentes.

A regra está nos [direitos por linguagem do servidor](../../packages/members/src/application/studio/free-studio-access.service.ts),
na [oferta de criação](../../packages/member-shell/src/server/studio-unlocks.ts)
e nas revalidações de criação/importação
[JavaScript](../../packages/member-shell/src/lib/studio-javascript-creation.ts) e
[Python](../../packages/member-shell/src/lib/studio-python-remix.ts).

O Admin oferece recompensas por linguagem e salva auxiliares explicitamente.
O servidor recusa IDs Python desconhecidos, duplicados ou conjuntos incompletos.
O runtime nunca completa uma conquista inventando permissões. Pro permanece
código livre após os direitos de produto, curso, Pro e runtime.

O novo teto JavaScript `grantedBlockIds` diferencia ausência de um conjunto vazio
sem alterar a semântica antiga de curadoria `allowBlocks: []`. Busca, toolbox,
flyouts, ferramentas do projeto, extensões e Zappy compartilham o mesmo filtro.
Python usa snapshots imutáveis de autoridade: uma resposta antiga não restaura
permissões retiradas e uma mudança efetiva atualiza a oferta sem recriar parsers,
registry ou documento.

## Achados corrigidos na revisão

- Reuso de formas após `clear()` reservava cotas indevidamente.
- A cópia de exemplo precisava conferir os blocos/modos da decisão final, além
  do catálogo consultado antes de preparar o projeto.
- Um perfil com conquistas somente Python poderia receber a paleta JavaScript
  inteira ao interpretar uma lista vazia como curadoria por nível.
- A curadoria JavaScript inicial ocultava conquistas recebidas posteriormente.
- A paleta Python mantinha os IDs do bootstrap após uma autorização mais restrita.
- Revogar/restaurar extensão descarregava o documento e podia perder edições.
  A hidratação agora pertence à preparação do documento; mudanças de acesso ou
  modo preservam fonte, rascunhos e estado de edição.
- O seletor Admin ficava preso quando a release escolhida era retirada e restava
  uma única alternativa. A recuperação agora exige escolha explícita e preserva IDs.

## Evidências e checagens

Os [recibos dos jogos e da distribuição](2026-10-22-python-reference-games-visual-evidence/)
são imutáveis. `ui-r12` comprova os quatro percursos gráficos na candidata daquela
rodada (`e3188c84…`): galeria, edição, Ponte, salvar/reabrir, revisão exata, entrada causal em
pixels e Stop. A rodada `ui-r13`, executada sobre `1e8dd0e87` após as regras de
conquista e a correção de hidratação, repetiu os quatro percursos com sucesso:
zero skips, retries, falhas ou erros de página/console da aplicação, em 90,2 s.
O supervisor confirmou saída normal e nenhum processo/porta de teste restante.

Após a conciliação de `dd8dc807a`, a candidata passou a `476d32…`, release
`visual-games-3`, manifesto `bc5710…`, com a correção de `turtle.dot()` e 20 jogos.
Não herda a homologação gráfica anterior. A verificação fresca deste corte
conferiu a distribuição, 24 testes Turtle Chrome/Edge, seis percursos gráficos
Chrome de Pac-Man/Space Arena/Cobrinha, 204 testes nativos dos 20 modelos e os
geradores de fontes/sons/metadados. A sequência dos outros 17 jogos também passou:
40 percursos gráficos no total, além dos 24 testes Turtle Chrome/Edge, sem falhas,
skips ou retries. Cada lote encerrou seus processos e portas. O
[recibo atual](2026-10-22-python-reference-games-visual-evidence/current-476-local-ui-r1.json.snapshot)
registra os resultados e hashes dos relatórios completos. A tipagem completa do
Studio passou sobre este corte. O reparo de Tiles altera somente o teste:
escolhe um movimento legal pelos pixels do vazio, sem controlar o estado do jogo.

Checagens locais executadas neste lote, sem somar wrappers e seus casos internos:

| Recorte | Resultado |
| --- | --- |
| Motor Turtle, modelo Pac-Man, modelo Space Arena | 31, 12 e 13 testes aprovados |
| Qualificador configurado com CPython/Pyodide real | 10 testes, zero skips |
| Catálogo de recompensas, incluindo import nativo Node sem browser/rede | 5 testes, 33 asserções |
| Members HTTP/runtime/recompensas reexecutados pelo root | 47 testes, 350 asserções |
| Admin seletor, metadados e dependências reexecutados pelo root | 13 testes, 94 asserções |
| Autoridade, extensões e lease visual reexecutados pelo root | 41 testes, 207 asserções; wrapper visual sem dupla contagem |
| StudioCore real isolado após o reparo de hidratação | 23 casos internos, 155 asserções |
| Host real isolado após a assinatura da autoridade | 11 casos internos, 110 asserções |
| Geradores de fontes/sons/metadados e seus negativos | verificações de geração e 5 testes, 62 asserções |

Tipagem completa aprovada em Admin, Core, Members, Member Shell e Studio;
Studio Runtime passou também no `tsconfig.test.json`, e o serviço de linguagem
passou nos três projetos TypeScript. As verificações foram seriais, com Node
24.22.0 e TypeScript do lockfile. Biome conferiu os 221 arquivos de código/config
alterados; `git diff --check` passou. O fingerprint da imagem foi regenerado e
conferido, sem afirmar que uma imagem antiga corresponde a ele.

A distribuição `e3188c84b1b63baee730656ea1399e6ee4d03946e6cbe6cbee57ef92bc43f8e9`
foi reproduzida três vezes, mantendo os mesmos 41 arquivos. O
[plano atual](../superpowers/plans/2026-10-22-python-current-candidate/README.md)
contém os comandos portáveis e os limites da implantação. Os resultados de
desempenho remotos em `65c9bffd…` pertencem à candidata anterior.

## Implantação e pendências — checkpoint anterior

Este checkpoint disponibiliza código revisado para integração entre sessões;
não declara a homologação final do produto Python. CI/imagem, fluxos
autenticados hospedados Admin→aluno, aulas/salas/Mural, áudio
ouvido por pessoa e máquina de referência continuam qualificados separadamente.

O login Railway foi restabelecido pelo usuário. As consultas readonly confirmaram
ausência do catálogo Members em staging e um catálogo antigo no Worker. Nenhuma
chave, variável ou namespace remoto foi alterado por essas consultas. A ativação
exige conciliação explícita, imagem atual e os gates de drenagem do serviço de
linguagem; não haverá leitor de metadados Python antigos para acomodar a configuração.
O Docker local voltou a responder e as imagens atuais passaram nas provas
isoladas descritas no [plano de ativação](../superpowers/plans/2026-10-22-python-staging-activation.md).
A rotação das chaves Railway pertence a outra sessão.

## Atualização operacional — 22 de outubro, 21:01 BRT

Os parágrafos anteriores registram o checkpoint anterior às operações remotas.
O estado abaixo usa recibos de produção observados até **23 de outubro de 2026,
00:01:36 UTC**; não converte as provas locais da interface em qualificação hospedada.

O recorte Cloudflare Python de produção foi implantado e qualificado nas APIs:

- A distribuição `476d32…`, manifesto `bc5710…`, está no bucket de produção, com
  leitura independente dos 43 objetos e quatro regras de lifecycle verificadas,
  preservando as duas regras existentes. A entrega HTTP conferiu metadados e 12
  representações gzip.
- O Runtime usa o Worker `1fb3fff1…`, imagem `7e881384…` e perfil `ae46e781…`.
  A execução S2S passou 28 verificações e três casos: inspeção sem executar a
  fonte de teste, recusa de compilação e playtest Turtle com entrada/captura PNG.
  Os inputs e a prévia criada foram retirados. O namespace JavaScript foi preservado.
  Detalhes: [recibo Runtime/entrega](2026-10-22-python-reference-games-visual-evidence/production-python-runtime-r1.json.snapshot).
- O serviço de linguagem usa o Worker `88b6e8d6…`, imagem `b64cb8e2…` e Pyright
  `1.1.414`. A migração substituiu o namespace Owner após conferir suas cinco
  tabelas vazias e ausência de referências externas; preservou o namespace Sandbox.
  A API passou 27 verificações, incluindo cancelamento de consulta, com as duas
  sessões conhecidas fechadas e retiradas. Não houve execução de fonte Python
  nessa qualificação. Detalhes: [recibo Language](2026-10-22-python-reference-games-visual-evidence/production-python-language-r1.json.snapshot).
- A leitura externa final, de 23:45:03 a 23:45:21 UTC, confirmou zero instâncias
  físicas e contadores `active`, `assigned`, `scheduling` e `starting` zerados nas
  duas aplicações. Isso registra o estado observado, não uma garantia permanente
  de ausência de recursos futuros.

Depois dessas provas, uma única operação gravou no Members de produção
`STUDIO_AUTHORING_POLICY_JSON` e `STUDIO_RUNTIME_HOSTS_JSON`, extraídos do plano
canônico `7564f459…`. Houve ACK e leitura idêntica à configuração esperada, com
`skipDeploys: true` e `replace: false`. O deployment `9d8368c2…`, commit `6f93dcbf…`,
permaneceu ativo antes e depois, sem deployment pendente. **Configuração armazenada
não significa configuração carregada pelo serviço:** não houve reload ou ativação
contextual do Members. O [recibo de armazenamento](2026-10-22-python-reference-games-visual-evidence/production-members-python-storage-r1.json.snapshot)
registra os hashes dos recibos de check/apply, a comparação anterior/posterior e
os limites. A API de gravação não oferecia CAS; a operação exigiu exclusão de
outros escritores, e o intent local permanente impede replay automático.

O [recibo de preparação da plataforma](2026-10-22-python-reference-games-visual-evidence/production-platform-configuration-r1.json.snapshot)
e os demais snapshots permanecem imutáveis. Seus campos de pendências descrevem
os respectivos horários; os recibos posteriores comprovam a evolução específica
de Workers, serviço de linguagem e armazenamento, sem declarar o rollout completo.

Ainda faltam o rollout das aplicações com o código atual e a comprovação de que
carregaram a configuração, seguidos dos fluxos autenticados hospedados
Admin→aluno, aulas/salas, Mural, publicação/remix e jogo público. JavaScript Pro,
áudio ouvido por pessoa e desempenho em máquina de referência também não são
qualificados por esses recibos S2S. O cancelamento de consulta Pyright não prova
cancelamento durante bootstrap nativo ocupado ou execução ocupada do Runtime.
Crons, seeds e mídia live conservam seus gates próprios. O estado geral continua
**rollout de produção não concluído**.
