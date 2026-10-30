# Entrega integral do Arquipélago Vagalume

Leitura vigente: [estado atual](../arquipelago-estado-atual.md) e
[lotes da auditoria](2026-10-30-arquipelago-ajustes-da-auditoria.md). Os checkpoints deste
documento registram bases anteriores. A autorização posterior de 30/10 permite review,
commit e merge por lote no staging local, sem push.

## Checkpoint integrado de 30/10/2026

Por solicitação posterior da dona, o trabalho local já implementado entra em commit e merge
em staging local, junto da arte recebida em `080b6a3d2`. Esta integração não fecha L01 a L14
nem publica serviços ou conteúdo. Os checkpoints abaixo registram a evolução anterior.

Os cinco portos estão nos modelos e têm a espera de colisores corrigida e testada. Não existe
mais bloqueio de arte para a rede ampliada do barco, e a rede ampliada, o painel e as aberturas nas boias estão implementados
no recorte de 30/10. As provas são locais, descritas no plano da rede. O fantasma familiar tem
gravação, retomada separada do save, serviço com autorização familiar e seleção/reprodução no
jogo. Provas locais em `docs/qa/2026-10-30-fantasma-familiar/`; aceite autenticado em L14.
L11, L12, lacunas de L13 e a qualificação integrada de L14 continuam abertas.

O recorte de visitas adultas de L12 está implementado localmente com consentimento por código
revogável, sem diretório, separado do Kids e sem mudanças de V18. Rotação, revogação concorrente,
projeção privada e suporte têm provas em Postgres local e HTTP reais. Plano em
`docs/superpowers/plans/2026-10-30-arquipelago-visitas-adultas.md`; não representa implantação
ou aceite autenticado hospedado. A paridade de conteúdo de L12 continua ligada ao restante de L03.

L07 inclui turnos, insumos e pedidos remunerados. L09 inclui tema, feira, receitas e integração
do vestuário com o configurador existente. Há provas locais, não implantação. A adoção da
galeria no Members exige o procedimento operacional documentado e não foi feita remotamente.
Os manifestos dos quadros também não foram importados em staging nem produção.

O registro dos comandos, resultados e limites desta composição fica em
`docs/qa/2026-10-30-integracao-portos/README.md`.

## Autorização e objetivo

Em 29/10/2026, a dona autorizou corrigir e completar os itens do levantamento da proposta. Base: [auditoria](../../.audits/architectural-analysis-2026-10-29-arquipelago.md), HTML original identificado por SHA-256 nessa auditoria e decisões posteriores da conversa. A autorização cobre a execução em lotes; não é necessário repetir pedidos genéricos de aprovação.

Objetivo: uma experiência completa nas duas comunidades, em que explorar, aprender, criar, guardar e voltar funcionem juntos. Não basta haver arquivos ou uma ilha montada.

## Estratégia escolhida

1. **Escolhida: consolidação incremental do motor atual.** Corrigir integridade e continuidade primeiro, completar os ciclos existentes depois e qualificar a composição final. Cada lote pode ser revisado e revertido independentemente.
2. Substituir o motor foi descartado: perderia uma base com regras puras, contratos e testes já úteis, sem resolver a falta de conteúdo.
3. Fazer todas as novidades antes de consolidar foi descartado: aumentaria os caminhos de salvamento, economia e integração sem fechar os já existentes.

O desenho mantém jogo independente, plataforma como dona de identidade/jornada/carteira/quarto, serviço do jogo como dono do restante e ferramentas abertas pela porta existente. Não criar cópias do Pinta, Molda ou Estúdio nem segundo intérprete dos Lumis.

## Restrições permanentes

- Nada de editar Blender ou GLB. Pedidos de arte especificam nome, posição e finalidade; a dependência fica visível.
- Nenhuma escrita de teste em staging/produção; banco descartável local com nome `arquipelago_test*`.
- Não editar `.env` nem workflows de CI nesta entrega.
- Preservar versões antigas de contratos. Evoluir a versão quando mudar salvamento ou ferramenta de forma incompatível.
- Salvamento limitado a 65.536 bytes UTF-8. Nunca abrir espaço apagando progresso ou referências válidas silenciosamente.
- Texto infantil sem travessão, sem exclamação e sem começar com pergunta. A interface adulta usa sua voz e tema.
- Cursos continuam donos da progressão. Jogo não bloqueia aula nem libera blocos por conta própria.
- Admin e aluno devem ser testados separadamente; privilégio de admin não pode esconder falhas do fluxo do aluno.
- Meta: 60 FPS no computador, 30 em aparelhos modestos. Física em 1/60 s, independente do desenho.
- Conteúdo, configuração, código, teste e implantação são estados diferentes.

## Matriz de entregas e dependências

Cada linha fica aberta até atender seu critério. Uma linha com teste local não é automaticamente homologada no ambiente publicado.

| Lote | Entrega | Critério de aceite | Dependências |
|---|---|---|---|
| L01 | Salvamento sem perda e continuidade das Nuvens/Farol | Migrar sem descartar aparências; recordes, constelações, clima e final retomam; conflito e limite provados | Contratos, jogo, API |
| L02 | História e descoberta | Introdução jogável, diário das seis ilhas, final coerente e indicações realizáveis | L01; arte disponível |
| L03 | Quadro das Cores e minijogos | Matriz dos seis quadros por ilha; principal/inicial/gabarito/negativos; faísca e pós-Farol; variações diárias; equivalentes adultos | Cursos publicados e blocos conquistados |
| L04 | Galeria e autoria integradas | Identidade/posse no Members; comprar num lugar aparece no outro quando compatível; Pinta/Molda/Estúdio voltam ao objeto sem perda | Definir adaptação de cada modelo ao quarto |
| L05 | Atrações e Mural | Jogos aprovados e publicações autorizadas no fliperama; acesso familiar e revogação reais | L03, contratos de projeto |
| L06 | Moradores e vida cotidiana | Gostos, aniversário, presentes, pedidos e desbloqueios dos moradores restantes; aconchego gera visitas/festas | L01, L02 |
| L07 | Economia e profissões | Turnos/pedidos remunerados no servidor, idempotência e teto; definir compra de insumos sem pressionar criança | Members; regras econômicas |
| L08 | Lumis, horta e receitas | Diferenças de espécie no intérprete único, colheita especial, receitas/coleções e bônus coerentes | L01; editor existente |
| L09 | Festas e retorno semanal | Temas semanais, feira renovada, roupas/receitas/decorações sazonais; ausências sem perda | Datas aprovadas, catálogo existente |
| L10 | Exploração ampliada | Rede de rotas do barco, mapa descoberto, segredos que usam habilidades anteriores, fantasma familiar | L01; colisores/arte disponíveis |
| L11 | Criação avançada e Lenda | Ampliações da casa, terraformação delimitada, modo criativo livre e exposição no Farol | L04; orçamento de memória/salvamento |
| L12 | Paridade adulta e social | Visita opt-in entre adultos, conteúdo equivalente, sem limite parental; Kids preserva regras familiares | L03, L06 |
| L13 | Medição confiável | Eventos de autoria/compra, retorno adulto, cursos antes/depois, tentativas/dicas e fontes de satisfação/retenção | Portas da plataforma; privacidade |
| L14 | UX, desempenho e entrega | Jornada completa com usuário real; celular/Chromebook; carga/descarte; rollout compatível, versões/variáveis/saúde conferidas | Todos os lotes aplicáveis |

O detalhe técnico de cada lote é escrito antes de alterá-lo, com caminhos, interfaces, testes e riscos. O primeiro plano está em `docs/superpowers/plans/2026-10-29-arquipelago-continuidade.md`. Esta matriz é o programa completo, não uma alegação de que todos os lotes já têm código.

## Decisões técnicas iniciais

### Salvamento

Usar a próxima versão disponível após conferir staging. Separar progresso durável de estado transitório: posição da câmera, fase de animação e corrida em andamento não são conquistas. Constelações e final são monotônicos; melhores tempos escolhem o menor e estrelas fazem união. Clima é preferência mutável e entra na regra conservadora de conflito.

Não reescrever o formato de uma versão antiga. O caminho de migração para a nova versão não deve atravessar uma transformação antiga que descarte IDs aceitos anteriormente. A V15 histórica continua reconhecida. Novos produtores usam os IDs canônicos; leitura de legado preserva até o limite que ele já admitia. Orçamento é em bytes, incluindo Unicode e dados anteriores, com recusa explícita e recuperação local quando ultrapassar o teto, nunca truncamento.

### Galeria

A direção é cumprir o inventário único da proposta. Primeiro definir uma identidade de item no Members e a compatibilidade visual por destino. Uma compra não duplica cobrança; uma aparência funcional que não cabe no quarto não vira um móvel quebrado. O caminho de migração de compras existentes precisa preceder a mudança de propriedade. Não migrar tabelas remotamente durante desenvolvimento.

### Conteúdo

Referência adicional indicada pela dona: proposta revisada da Jornada do Criador de 25/10.
Régua resumida, mapa de pré-requisitos e distinção entre entrar no posto e concluir seus cursos
em [conteúdo por posto](../desafios-do-jogo/conteudo-por-posto.md). Usar para preparar desafios
mesmo antes da produção dos cursos, sem inventar vínculos nem conceder blocos por posto.

O motor já aceita desafios, mas a entrega exige manifestos completos e acessíveis com blocos da jornada. Objetivos avaliam a ação ensinada; cor, sprite e valores livres não viram igualdade literal sem motivo. Criar por ilhas, com testes negativos e executor real. Importação/publicação só depois da revisão do conteúdo, com leitura do catálogo existente para não sobrescrever trabalho.

### Sistemas sociais e econômicos

Residentes reutilizam regras comuns com dados próprios. Consequências de aconchego são eventos do jogo, não pontos decorativos sem efeito. Prêmios que afetam carteira são confirmados no serviço; o cliente não declara sozinho que trabalhou e ganhou moedas. Adultos têm consentimento próprio para visita; crianças continuam limitadas pelas permissões do responsável.

### Validação e escala

Testes puros para regras, testes de contrato/rota para autoridade e integração, testes de navegador para gesto/retorno/persistência. Medir memória após ciclos completos de ilha/ferramenta, não só no carregamento inicial. Registrar p95 de frame, FPS, tempo de carga e recursos após descarte. Não usar SwiftShader como prova de GPU física.

## Decisões de produto ainda necessárias, sem bloquear lotes independentes

- Datas da Noite das Lanternas e janela de fim de ano: continuam desativadas até decisão da dona.
- Teto econômico resolvido no plano de L07: prevalece a escolha explícita da dona de 100 por semana. Preservar os créditos antigos e provar a concorrência e a virada semanal no Members.
- Amplitude da terraformação: entregar edição limitada de terreno sem quebrar rotas, colisores, construções ou vizinhos, com prévia e desfazer; arte nova segue com Blender.
- Satisfação familiar: só medir respostas efetivas a pesquisa, nunca inferir satisfação de minutos jogados.

## Processo de entrega registrado em 29/10

A orientação histórica abaixo foi complementada pela autorização de 30/10: executar e
integrar lotes revisados localmente. Publicação e implantação permanecem aceites separados.

Para cada lote: conferir remoto, registrar base, reproduzir problemas, implementar, testes dos pacotes afetados, tipagem, lint e revisão. Correção da orientação em 29/10: o push de L01 foi antecipado. A dona exige concluir o escopo inteiro, fazer a revisão integrada e corrigir seus achados antes do próximo commit/envio desta sessão. Não publicar lotes intermediários. Implantar apenas a composição revisada; verificar versão do jogo, host, API, executor, contratos e configuração nos dois ambientes.

Ao relatar andamento, informar separadamente: código pronto, teste local, prova de navegador, conteúdo publicado e ambiente implantado. Nenhum lote fica concluído por ter apenas arquivos preparados ou testes descobertos.

## Estado inicial

### Checkpoint local, base `6461f19c0`

- Remoto conferido novamente durante L05: sem divergência. Alterações locais preservadas.
- L03: as seis ilhas têm seis quadros, variantes adultas e conferências locais. Permanecem
  pendentes o conteúdo pós-Farol e o fluxo publicado do
  Quadro das Cores. O laço preparado de três complementares precisa de mediação na publicação. Os manifestos preparados não foram importados remotamente.
- L06: amizade dos moradores do anel, visitas e festa por aconchego implementadas e testadas
  localmente, inclusive em navegador. Falta revisão da composição final.
- L07: turnos, pedidos remunerados e compra de insumos estão implementados localmente.
  Serviço e carteira reais passaram nos bancos descartáveis, incluindo resposta perdida,
  concorrência e teto de 100 por semana. A revisão integrada e implantação permanecem abertas.
- L08: diferenças de trabalho dos Lumis, colheita especial e receitas do anel implementadas
  e testadas localmente. Não representam implantação.
- L09: tema semanal e feira funcionam localmente com compras e reabertura conferidas. Roupas
  sazonais e migração do inventário único dependem do restante de L04.
- L05: vínculo das aprovações do Bosque/Vila com o fliperama corrigido; ligação com o Mural
  conferida localmente nos dois públicos e tamanhos de tela. O player público continua sendo
  a fonte da execução; a página autenticada completa permanece no aceite integrado.
- L10: mapa de visitas implementado com V18, migração, união de descobertas, testes de
  serviço e navegador Kids/adulto. Rotas ampliadas e fantasma familiar continuam pendentes.
  A rede de barcos depende de cinco portos ainda ausentes nos GLBs, documentados no plano.
- L04, L10, L11, L12, L13 e L14 não estão fechados. Nenhum commit ou push intermediário foi
  feito neste checkpoint. A revisão integrada e a entrega completa continuam obrigatórias.

- [x] Proposta e código comparados, auditoria gravada.
- [x] Remoto conferido: `a3cd791de`, igual ao local em 29/10/2026.
- [x] Programa de entrega integral e critérios registrados.
- [x] L01 implementado e revisado. Provas em `docs/qa/2026-10-29-continuidade/README.md`; implantação não incluída neste aceite local.
- [ ] L02 a L14 implementados e revisados.
- [ ] Revisão integrada final e aceites nos dois públicos.
- [ ] Implantação final e conferência de versões/configuração.

### Fechamento local dos quadros Vale e Nuvens, 30/10

As duas tipagens finais terminaram com exit 0. Biome passou nos 28 arquivos TS/MJS
afetados. O conjunto tem 38 testes de fonte, contrato e HTTP (6665 asserções), dois
testes Blockly (144 asserções, 72 projetos), 42 cenários distintos no executor e
20 capturas de interação no computador e no celular emulado. Os dois erros iniciais
de observação foram preservados e corrigidos com oito cenários focados. Não é
validação autenticada no jogo nem publicação de conteúdo. As três atividades com
laço de grupo preparado precisam da revisão curricular descrita nos respectivos READMEs.

### Checkpoint de 30/10: posse e primeiro pedido

L04 tem a posse canônica no Members, compra atômica, adoção histórica auditável e
provas locais de banco, HTTP e interface nos dois públicos. Não foi feita adoção
remota nem validação autenticada entre jogo e quarto. O Docker do Members inclui
agora os contratos puros necessários, ainda sem prova de build da imagem.

O primeiro pedido da ilha central está implementado: plantar, regar e colher
entrega a geladeira uma vez, sem novo campo no save. A prova Kids esperou três
minutos reais e preservou o controle de tempo. O adulto foi conferido no celular
emulado. A revisão integrada continua pendente. L07 avança na compra de insumos,
com contrato e plano de consistência entre carteira e salvamento; o fluxo completo
ainda está em implementação. Nenhum lote foi publicado neste checkpoint.

### Checkpoint posterior de 30/10: economia e retorno sazonal

L07 tem compra de insumos e pedidos remunerados implementados, além dos turnos. As provas
locais incluem carteira real em bases descartáveis, idempotência, teto semanal, resposta
perdida, recuperação, interface e integração dos caminhos permitidos pelo host. A revisão
do host encontrou e corrigiu os seis caminhos econômicos que faltavam no allowlist.

L09 tem duas receitas sazonais adicionais, preparo somente durante a festa e pratos que
permanecem guardados depois da época. Junina e Carnaval foram conferidos no navegador.
O vestuário reutiliza o configurador real e peças existentes do avatar; os quatro fluxos
visuais passaram nas duas comunidades e tamanhos de tela. As sugestões se recolhem para
preservar o espaço do personagem. As datas não aprovadas continuam desligadas.

Provas e limitações em `docs/qa/2026-10-30-pedidos/`, `2026-10-30-insumos/`,
`2026-10-30-receitas-sazonais/` e `2026-10-30-vestuario/`. São provas locais, não publicação.
O vestuário foi testado com componentes/CSS/modelos reais e conta simulada; o mundo inteiro
com host autenticado continua em L14. Não transferir o resultado da fixture para esse aceite.

Pedido de arte encaminhável em `docs/plans/2026-10-30-arquipelago-pedidos-de-arte.md`:
cinco portos e acesso caminhável, com particularidade da altura das Nuvens. L10 aguarda essa
arte para ampliar a rede. Fantasma familiar, L11, social adulto de L12, lacunas de medição de
L13 e qualificação integrada de L14 permanecem abertos. Não houve commit/push intermediário.
