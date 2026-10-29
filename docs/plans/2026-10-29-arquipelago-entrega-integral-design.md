# Entrega integral do Arquipélago Vagalume

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

O motor já aceita desafios, mas a entrega exige manifestos completos e acessíveis com blocos da jornada. Objetivos avaliam a ação ensinada; cor, sprite e valores livres não viram igualdade literal sem motivo. Criar por ilhas, com testes negativos e executor real. Importação/publicação só depois da revisão do conteúdo, com leitura do catálogo existente para não sobrescrever trabalho.

### Sistemas sociais e econômicos

Residentes reutilizam regras comuns com dados próprios. Consequências de aconchego são eventos do jogo, não pontos decorativos sem efeito. Prêmios que afetam carteira são confirmados no serviço; o cliente não declara sozinho que trabalhou e ganhou moedas. Adultos têm consentimento próprio para visita; crianças continuam limitadas pelas permissões do responsável.

### Validação e escala

Testes puros para regras, testes de contrato/rota para autoridade e integração, testes de navegador para gesto/retorno/persistência. Medir memória após ciclos completos de ilha/ferramenta, não só no carregamento inicial. Registrar p95 de frame, FPS, tempo de carga e recursos após descarte. Não usar SwiftShader como prova de GPU física.

## Decisões de produto ainda necessárias, sem bloquear lotes independentes

- Datas da Noite das Lanternas e janela de fim de ano: continuam desativadas até decisão da dona.
- Teto econômico: código atual usa 150/semana, conversa antiga menciona 100. Não alterar silenciosamente durante correção de integridade; consolidar antes de L07.
- Amplitude da terraformação: entregar edição limitada de terreno sem quebrar rotas, colisores, construções ou vizinhos, com prévia e desfazer; arte nova segue com Blender.
- Satisfação familiar: só medir respostas efetivas a pesquisa, nunca inferir satisfação de minutos jogados.

## Processo de entrega

Para cada lote: conferir remoto, registrar base, reproduzir problemas, implementar, testes dos pacotes afetados, tipagem, lint, revisão completa e commit descritivo. Pushes em ondas fechadas para não cancelar CI em andamento. Implantar apenas a composição revisada; verificar versão do jogo, host, API, executor, contratos e configuração nos dois ambientes.

Ao relatar andamento, informar separadamente: código pronto, teste local, prova de navegador, conteúdo publicado e ambiente implantado. Nenhum lote fica concluído por ter apenas arquivos preparados ou testes descobertos.

## Estado inicial

- [x] Proposta e código comparados, auditoria gravada.
- [x] Remoto conferido: `a3cd791de`, igual ao local em 29/10/2026.
- [x] Programa de entrega integral e critérios registrados.
- [ ] L01 implementado e revisado.
- [ ] L02 a L14 implementados e revisados.
- [ ] Revisão integrada final e aceites nos dois públicos.
- [ ] Implantação final e conferência de versões/configuração.
