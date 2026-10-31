# Revisão dos lotes recebidos do Arquipélago

Data: 30/10/2026. Base congelada: `f62ab0807c0960bb4d433c68fe7a0e3bfd5ea359`.
Comparação: `0285b4284..f62ab0807`, com 39 commits sem merges e 444 caminhos alterados.
No fechamento, staging local e origin/staging apontavam para essa mesma base.

Pedido: conferir o que outra sessão implementou do programa de ajustes, identificar o restante e
revisar a qualidade. Esta revisão não faz implantação nem comprova versões servidas em ambientes.

Referências principais:

- [Programa de ajustes](../docs/plans/2026-10-30-arquipelago-ajustes-da-auditoria.md).
- [Levantamento integrado](../docs/arquipelago-levantamento-2026-10-30.md).
- [Índice atual](../docs/arquipelago-estado-atual.md).
- [Qualificação Q01 registrada pela outra sessão](../docs/qa/2026-10-30-qualificacao-q01/README.md).
- [Plano C02](../docs/superpowers/plans/2026-10-30-arquipelago-c02-python-e-texto.md).
- [Plano E04](../docs/superpowers/plans/2026-10-30-arquipelago-e04-criacao-avancada.md).

## Conclusão

A outra sessão entregou uma parte substancial do programa. A base passou nas suítes locais do
jogo, dos contratos e do serviço, mas o programa integral continua aberto. Há três defeitos
reproduzidos no serviço de visitas de crianças e divergências na documentação de continuidade.
O C02 tem contratos, verificadores e conteúdo, mas o jogo recusa abrir Python e Pro. O E04
entregou quintal, móveis e galeria, sem entregar ainda segundo andar, terraformação, iglu ou
subida final jogável. Q01 tem provas locais e uma lista operacional, sem aceite hospedado ou físico.

Os testes verdes não cobriam os três cenários abaixo. Recomenda-se corrigir as visitas antes de
considerar N08a encerrado e antes de habilitar esse ciclo para famílias.

## Achados confirmados

### R01, alta: um convite novo restaura visitas antes revogadas

Arquivos:

- `packages/arquipelago-api/src/infrastructure/persistence/drizzle/repositorio-visitas-de-amigos.ts:19`
- `packages/arquipelago-api/src/infrastructure/persistence/drizzle/repositorio-visitas-de-amigos.ts:38`
- `packages/arquipelago-api/src/infrastructure/persistence/drizzle/repositorio-visitas-de-amigos.ts:93`

O aceite guarda a criança anfitriã, sem a geração do convite. Apagar o convite interrompe a
visita, mas preserva os aceites. Gerar outro convite para a mesma criança faz o left join
reencontrar a linha e reativa os aceites antigos. Não é necessário compartilhar ou aceitar o
código novo. O responsável pode revogar o acesso de uma família, gerar um código para outra e,
sem perceber, devolver acesso à primeira.

Reprodução com serviço e repositório reais no Postgres local: uma casa antes da revogação,
zero após apagar, uma novamente após gerar outro código, sem novo aceite.

Ajuste: vincular cada aceite à autorização que o originou, ou invalidar os aceites de maneira
atômica na revogação/rotação. Rotacionar, apagar, aceitar e ler devem obedecer à mesma regra
transacional. Acrescentar testes de apagar e recriar, rotação sem apagar e aceite concorrente
com revogação. A alteração de banco, se escolhida, precisa de migração nova.

### R02, alta: revogação durante leitura não impede devolver a casa

Arquivo: `packages/arquipelago-api/src/application/servico-das-visitas-de-amigos.ts:164`.

`casa` confere as permissões, lê o salvamento e espera `lerQuarto` do Members. Depois dessa
espera, retorna o resultado sem conferir novamente o convite, os dois consentimentos e o
aceite. Revogar enquanto o Members responde ainda permite entregar aquela resposta.

Reprodução: interromper apenas a dependência do quarto, apagar o convite, liberar a resposta
do quarto. A chamada devolveu a casa, embora a lista atual já tivesse zero casas.

Ajuste: revalidar a autorização depois das esperas externas e antes da resposta. As visitas
adultas já têm esse padrão. Cobrir também desligamento de cada família e remoção do aceite
durante a espera. Isso não promete apagar dados já entregues antes de uma revogação.

### R03, média: aceites simultâneos ultrapassam o limite de 20 casas

Arquivo: `packages/arquipelago-api/src/infrastructure/persistence/drizzle/repositorio-visitas-de-amigos.ts:52`.

A transação trava somente um aceite já existente. Para dois anfitriões novos não há uma trava
comum da família visitante. As duas transações leem a mesma contagem e inserem depois dela.
O índice único por par não protege o limite por família.

Reprodução com o limite real do contrato: 19 casas, dois aceites concorrentes para anfitriões
distintos, ambos aceitos, resultado 21 casas. Um gatilho no banco descartável atrasou somente
o INSERT para tornar a intercalação determinística; nenhuma regra de produção foi substituída.

Ajuste: serializar alterações do conjunto por conta visitante usando uma identidade estável
da família ou uma trava transacional equivalente. Conferir a contagem sob essa trava.
Aceites simultâneos do mesmo par também devem ser idempotentes, sem erro interno de unicidade.

### R04, média: os documentos de continuidade discordam do código atual

- `docs/arquipelago-estado-atual.md:38` ainda põe Faísca e autoria pós-Farol na coluna de faltas.
- A linha antiga do Farol, no mesmo índice, diz que a exposição continua pendente, mas há uma
  linha nova reconhecendo a galeria V20 implementada.
- A linha de mapa/segredos não reconhece o mapa por exploração e os quatro baús já ligados.
- A linha de construção mistura exposição entregue com segundo andar e terreno pendentes.
- O programa ainda apresenta instruções operacionais e estados históricos sem demarcar
  claramente que C01f e outros lotes já foram integrados depois daquele checkpoint.
- Q01 lista `recife-python/`, `pico-python/`, `vale-texto/` e `nuvens-pro/` como pastas. Os arquivos
  reais ficam nas pastas `recife`, `pico`, `vale` e `nuvens`, com esses nomes de manifesto.

Ajuste: atualizar as linhas atuais, preservando o histórico em seções identificadas. Uma sessão
nova precisa enxergar uma única lista atual, sem deduzir o estado pela data de cada parágrafo.

## O que a outra sessão implementou

| Lote | Implementação conferida | Estado correto |
| --- | --- | --- |
| C01e/e2/f | Requisitos derivados não removíveis, reanálise da publicação exata, objetivos que cobram trabalho a completar | Código presente; publicação remota é etapa separada |
| C01b restante | Revisão de blocos do Recife, Pico, Vale e Nuvens conforme repertório | Conteúdo presente, sujeito aos cursos e à importação |
| C02 | Contrato Python, encaminhamento ao verificador das aulas, Pro JavaScript com modelo, quatro desafios e manifestos Kids/adulto | Parcial: ferramenta do jogo não abre Python/Pro |
| C03a | Pega-conchas, seis quadros da ilha central e cavalete | Conteúdo e integração local presentes |
| C03b | Projeto autoral depois do Farol, critérios e inicial/gabarito | Conteúdo e cavalete presentes |
| N01 | Lumis e borrões nas ilhas, lanterna na primeira noite | Implementado |
| N02 | Cena de chegada/subida de posto, opção de pular | Implementado |
| N03/N04 | Horta em horas e clima natural antes da conquista do controle | Implementado |
| N05 | Três percursos adicionais e migração V19 | Implementado |
| N06/N07 | Resumo do dia e fim do tempo ao concluir a ação, com teto de 30 segundos | Implementado |
| N08a | Convites de amigos controlados pelos responsáveis, leituras restritas e interface | Implementado com R01/R02/R03 abertos |
| N08b | Fotos no Clube, permissão familiar, reencodificação e canal com moderação | Implementado; depende da configuração do Hub |
| N11 | Chaves dos quatro cômodos | Implementado |
| N12 | Quatro baús alcançados com o planador | Parcial: achado/álbum existem, conteúdo dos baús falta |
| E01 ampliado | Coleções do Pico/Nuvens e iscas obtidas de graça ou por compra | Implementado |
| E02 | Mapa detalhado revelado andando, integrado à exploração | Implementado nesse recorte; segredos ainda parciais |
| S01 | Companhia do pet do quarto ou bicho adotado; fim de ano aprovado no calendário | Implementado nesse recorte; data de Lanternas continua aberta |
| E04 | Quintal ampliado do Vale, 21 móveis V20, modo livre e seis vagas da galeria do Farol | Parcial: construção avançada continua aberta |
| Q01 | Verificadores locais, ciclos de memória e roteiro de adoção | Parcial: não comprova implantação, contas reais ou desempenho físico |

A01 a A04, a medição A06, as visitas adultas L12 e o fantasma familiar E03 já estavam na
base anterior. Permanecem na composição; não são entregas novas da outra sessão neste intervalo.
A05 precisa da reconciliação documental R04, apesar dos ajustes anteriores de versão/teto.

## O que falta, por natureza

### Código

1. Corrigir R01/R02/R03 e incorporar os respectivos testes de regressão.
2. Completar a abertura de Python e Pro no desafio da plataforma, incluindo autorização de
   runtime, curadoria, rascunho, verificação e fechamento. A recusa explícita está em
   `packages/member-shell/src/components/arquipelago-challenge-dialog.tsx:72`.
3. Fechar E04: segundo andar, terraformação delimitada, iglu e subida final jogável. A proposta
   de documento separado da obra existe, mas não equivale à implementação de API, contrato,
   persistência local, CAS, desfazer e recuperação.
4. Investigar o arrasto do Olhar no Construir. Q01 registra falha na base limpa no verificador
   de móveis. Não reproduzi esse fluxo no navegador nesta revisão; não afirmo a causa nem que
   todos os móveis estejam quebrados. A pendência impede aceitar aquela qualificação visual.

### Arte e conteúdo

- E04 pede lote do iglu no Pico, peças do segundo andar, terreno separado e trajeto exterior
  de subida no Farol. Os pedidos estão no plano; nenhum GLB foi alterado nesta revisão.
- Os baús precisam de conteúdo definido, incluindo espécies/textos caso sejam Lumis raros e
  páginas extras. Hoje `abrirSegredo` grava o achado; não entrega esses prêmios.
- Noite das Lanternas continua sem data aprovada. O calendário a mantém desligada por data.

### Publicação e operação

- Publicar uma release Python com Pygame Zero, atualizar os pins de
  `docs/desafios-do-jogo/ambiente-python.ts` e regenerar os manifestos do Recife/Pico.
  A release desses arquivos é de QA. Os quatro pacotes C02 usam `publicar: false`, coerente
  com a impossibilidade atual de abrir Python/Pro no jogo.
- Importar os conteúdos pelo Admin depois de conferir fontes e cursos por comunidade.
- Criar/conferir no Hub o clube e o canal `fotos-do-arquipelago` com aprovação obrigatória.
- Confirmar adoção das migrações 0017/0018 e versões compatíveis de API, gateway, BFF, Members,
  Admin e cliente do jogo. Não consultei a infraestrutura nesta revisão.
- Executar jornada autenticada nas duas comunidades, consentimentos de duas famílias e
  aparelhos físicos. SwiftShader e ciclos estáveis de recursos não provam 30/60 FPS reais.

## Verificação executada nesta revisão

| Comando/escopo | Resultado fresco |
| --- | --- |
| `bun test`, arquipelago-contracts | 226 aprovados, zero falhas, 9.641 asserções |
| `bun test`, arquipelago | 1.447 aprovados, 1 ignorado, zero falhas, 187.621 asserções |
| `bun test`, arquipelago-api, Postgres local descartável | 338 aprovados, 45 ignorados, zero falhas, 1.394 asserções |
| Cinco arquivos de conteúdo C02/Farol | 13 aprovados, zero falhas, 676 asserções |
| `bun run typecheck`, três pacotes acima, heap 8192 | Todos aprovados |
| Reprodução R01/R02/R03 | Três defeitos observados no serviço/repositório real |
| Biome do reprodutor e `git diff --check` | Aprovados |

Total de testes aprovados nos quatro comandos: 2.024. Os 46 ignorados não são aprovações.
Não foi reexecutado aqui o executor gráfico Python/Pro nem o navegador da plataforma com login.
O inventário do que existe usa código, planos e evidências anteriores, explicitamente separado
das provas frescas desta tabela. A revisão não afirma inspeção linha a linha de todos os 444
caminhos nem ausência universal de defeitos.

A primeira tentativa da suíte API usou um banco local com sufixo. Quatro arquivos antigos
exigem o nome exato `arquipelago_test` e recusaram a execução antes dos testes. A segunda
tentativa usou esse nome num container novo exclusivo e passou. Os 45 ignorados restantes
continuam sem qualificação neste comando. As reproduções usam outro banco do mesmo container,
sem interferir no banco da suíte.

Evidências reproduzíveis e limites estão no
[README de QA](../docs/qa/2026-10-30-revisao-lotes-recebidos/README.md).

## Ordem recomendada

Primeiro, corrigir a autorização e a concorrência de N08a. Em paralelo ao conteúdo, reconciliar
o índice de continuidade. Depois, completar C02 na ferramenta e investigar o Olhar. E04 segue
o plano do documento separado e os pedidos de arte. A importação/publicação e o aceite real
fecham Q01 depois desses ajustes, sem anunciar o programa integral como concluído antes disso.
