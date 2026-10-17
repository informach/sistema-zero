# Pensa v2 — implementação e ativação

> Histórico: substituído pela [especificação funcional de 16/10/2026](2026-10-16-pensa-reestruturacao-spec.md). Este documento registra decisões anteriores e não define o contrato vigente.

Implementação em 14/10/2026 da [proposta aprovada](2026-10-14-pensa-proposta.md), com rastreabilidade à [revisão R01–R32](2026-10-14-pensa-revisao.md). O código está no workspace; migrações remotas, publicação e liberação para crianças não foram executadas.

Revisão posterior da implementação: [relatório completo](../../.audits/architectural-analysis-2026-10-14-pensa-v2.md). Foram corrigidos nove problemas de privacidade, troca de perfil, respostas atrasadas, validade dos testes, compatibilidade 2D/3D, reparos, tentativas de voz, abertura após restauração e conclusão no Molda. A rodada ampliada passou em **532 testes distintos**, typechecks, lint e novo build completo Kids. As condições de validação real do piloto continuam pendentes.

Segunda revisão: [quatro novos achados corrigidos](../../.audits/architectural-analysis-2026-10-14-pensa-v2-round2.md), envolvendo conflitos de salvamento após restauração, efeitos de respostas atrasadas, cancelamento da reprodução e próxima missão. Verificação atual: **594 testes distintos**, typechecks de core/Pensa/members/member-shell, Biome nos dez arquivos alterados e build completo Kids aprovado com 73 páginas. Em conflito de base dos jogos Pensa, a criança fecha e reabre o editor; a reconciliação mantém a versão remota no arquivo do plano e preserva a edição local como cópia. A validação visual e com serviços/crianças reais continua pendente.

## Experiência implementada

A criança conta a ideia por texto ou ditado revisável. Zappy prepara um primeiro resultado, preserva os elementos essenciais e separa sugestões próprias das ideias da criança. Ela pode aceitar, corrigir ou guardar outra ideia. A geração detalhada acontece depois dessa escolha; as missões só aparecem quando o plano inteiro é confirmado.

O caminho continua representado pelo método ZERO: **Zerar a bagunça → Enxergar o jogo → Realizar por partes → Observar e melhorar**. A tela mostra uma missão atual e mantém caminho completo, referências, ideias futuras e versões em áreas recolhíveis. Quem volta encontra um destaque para continuar o jogo identificado.

Os guias do Estúdio, Pinta e Molda apresentam ação, lugar e efeito esperado. Passos v2 são orientações; concluir exige uma criação salva e uma confirmação do resultado, sem marcar cada instrução. A criança constrói e testa. O sistema não declara que observou a execução do jogo quando só recebeu um relato.

O Estúdio mantém o mesmo arquivo por plano, inclusive ao trocar de missão. A conclusão confirma a sincronização e a revisão real da nuvem. Pinta confirma o desenho salvo; Molda exige guardar/fechar a criação e confirma sua sincronização. A próxima missão abre pelo guia. Referências de aulas e ajuda abrem em outra aba, mantendo o contexto de origem.

Há pausa, retomada, arquivamento, reativação, exclusão com explicação do alcance, reparo após teste negativo, adaptação do caminho e incremento. Encerrar um começo funcional cria uma cópia privada confirmada. Restaurar protege o estado atual e reconcilia arquivo, ciclo, tarefas, guia e evidências; o jogo restaurado precisa de nova observação. Apagar o plano conserva o jogo independente e as artes nos editores.

## IA, conhecimento e skills

- Planejador, revisor técnico/pedagógico, detalhador de guias e ajuda usam o cliente **OpenRouter** existente. As funções são etapas persistidas, com validações determinísticas entre elas.
- A transcrição também passa pelo OpenRouter existente, respeitando a preferência parental e os limites atuais de 60 segundos/2 MB. Texto longo não é cortado silenciosamente no Pensa ou no tutor.
- O contexto consulta posto, produtos, blocos conquistados, extensões, ferramentas granulares do Molda, disponibilidade do tutor e inventário autorizado. Recursos são conferidos novamente antes de publicar o cartão/plano, aceitar e abrir uma missão.
- A busca oficial de conhecimento é compartilhada com Zappy. Acesso à aula, conclusão e domínio são informações distintas; domínio permanece desconhecido. Links de aulas só são oferecidos quando o conteúdo está acessível.
- Catálogo inclui nomes, caminho real na paleta, entradas e posicionamento. Receitas internas vêm do índice dos exemplos do Estúdio e só entram quando **todos** os seus blocos e extensões estão liberados.
- A curadoria de [GameDev](2026-10-14-pensa-skills-inventario.csv) aparece nas regras de interação central, redução de escopo, preservação da intenção, dependências, arte separada de integração, teste observável e ajuda progressiva. As instruções específicas de MakeCode não são tratadas como APIs do Estúdio.

A revisão por modelo e a checagem de catálogo não comprovam que qualquer combinação de mecânicas funciona no runtime. A avaliação de referência dos recortes 2D/3D e a observação infantil continuam sendo condições de liberação do piloto, conforme a proposta.

## Voz opcional

Mensagens finalizadas, proposta e passos dos guias podem ser ouvidos com a voz do Zappy via **ElevenLabs**. O tutor do Estúdio recebe ditado e escuta pelos adapters existentes, sob sua própria autorização.

O navegador envia uma referência à fala, nunca texto livre para sintetizar. O servidor resolve origem, dono, ciclo e revisão, usa a normalização de pronúncia da plataforma e grava o áudio no bucket UGC privado. A URL assinada dura 60 segundos. Não há reprodução automática; trocar de perfil, cancelar, esconder a aba ou dar foco a outra mídia interrompe a reprodução.

O cache é invalidado para acesso quando a origem desaparece ou muda. Áudios de planos são removidos pela fila de exclusão do plano; áudios do tutor ficam privados e inacessíveis após apagar seu histórico, sendo removidos fisicamente pela purga da conta. Não foi criada uma política automática de expiração temporal desses blobs. Uma URL já assinada pode continuar válida até seu prazo de 60 segundos.

## Persistência e limites

As migrações **0108–0111**, geradas pelo Drizzle, são aditivas: jornadas, operações com lease, reservas compartilhadas de IA, checkpoints, narrações privadas, fila de exclusão e contador de tentativas externas. Não convertem projetos antigos.

- A reserva de créditos compartilha o lock de conta usado pelos demais apps. Cartão e explicação de planejamento não debitam um plano entregue; publicação das tarefas e débito acontecem na mesma transação. Ajuda entregue usa uma unidade.
- A operação mantém entrada, saída de cada etapa, revisão, estado e lease. Há no máximo duas tentativas por etapa e dez chamadas por operação; falhas precisam de ação explícita para repetir.

  > **Atualização de 15/10/2026 (decisão da dona):** as dez chamadas por operação viraram seis por rodada (cada mensagem que abre ou retoma o pedido, e o "Vamos construir esse começo"); a conversa para em 24 no pedido, e os guias nunca param nesse teto. Operação criada antes não tem rodada para contar e fica só com o teto. Ver "Pensa v2: cota de chamadas por rodada…" no `packages/members/CLAUDE.md`.
- O teto adicional de chamadas externas é de 60/dia e 600/mês por conta, inclusive quando uma tentativa é cancelada. Esses contadores e os de voz usam UTC; a quota compartilhada de créditos mantém a convenção existente de São Paulo.
- A síntese tem duas tentativas por chave, até 4.000 caracteres por fala, 6.000 caracteres/dia e 60.000/mês por conta. Ela não utiliza uma unidade de plano. Texto continua disponível em falha ou limite.
- São até 20 planos ativos, 80 checkpoints e 512 MiB de versões por perfil. O limite de armazenamento das criações continua sendo conferido na restauração.
- Exclusão cerca publicações tardias e enfileira limpeza privada após dez minutos. O worker reutilizado distingue limpeza do plano da exclusão da conta.
- Logs `[pensa-v2] step` registram ID da operação, etapa, duração e resultado, sem narrativa, áudio, nome da criança ou corpo do provedor. A duração começa após adquirir o lease e exclui o tempo de decisão humana.

A execução usa `Next.after` e passos duráveis no banco. Se o processo cair, a visita/polling seguinte retoma o passo após expirar o lease; não existe um scheduler independente para completar planejamento com o processo morto e sem nenhuma nova visita. O cron existente continua responsável pela limpeza de criações.

## Configuração e implantação

> **Atualização de 14/10/2026 (decisão da dona):** `PENSA_V2_ENABLED` e `ZAPPY_PRIVATE_VOICE_ENABLED` foram REMOVIDAS. Nenhuma criança usou o Pensa em produção, então o v2 substitui o Pensa todo, sem piloto, e a voz liga quando a chave existe. `ELEVENLABS_API_KEY` e `ELEVENLABS_VOICE_ID` do community-kids são referências às do serviço admin (`${{admin.…}}`), já gravadas em staging e produção. O ditado no Pensa e no tutor segue a mesma regra da fase (escolha dos pais). O bloco abaixo é o registro original.

Exemplo em `packages/community-kids/.env.example`:

```dotenv
PENSA_V2_ENABLED=false
ZAPPY_PRIVATE_VOICE_ENABLED=false
# Reaproveita o opt-in parental existente:
VOICE_INPUT_ENABLED=false
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=uj19ZrP8mFHr1twXk7aq
```

OpenRouter, gateway HMAC, autenticação e bucket UGC utilizam a configuração atual da plataforma. Não inserir credenciais no cliente. A voz usa `eleven_multilingual_v2`; a seleção de modelo de planejamento continua no cliente OpenRouter compartilhado.

Ordem de implantação:

1. Aplicar **0108, 0109, 0110 e 0111** pelo processo normal de migrações do members, depois das migrações anteriores do repositório.
2. Publicar members e as rotas do gateway; depois a Comunidade Kids com as flags desligadas.
3. Conferir credenciais, permissões de COPY/HEAD/PUT/GET/DELETE no bucket privado e funcionamento do worker de limpeza.
4. Executar os percursos manuais abaixo com contas de teste e os recursos reais de cada perfil. Perfis privilegiados podem acessar o fluxo para revisão; a autorização privilegiada já existente continua sendo aplicada.
5. Ativar criação v2 e voz somente para a implantação do piloto definida pela equipe. A flag atual é global por ambiente; seleção de uma coorte por conta ainda exige infraestrutura própria de flags.

Rollback operacional: desligar `PENSA_V2_ENABLED` bloqueia novos planos, mas a página continua permitindo reencontrar jornadas v2 existentes, inclusive arquivadas. Desligar a voz conserva todos os textos. Manter rotas v2 e tabelas para leitura/retomada; reverter o binário inteiro para uma versão anterior à implementação não oferece essa compatibilidade. Não remover tabelas ou converter os dados de volta ao legado.

## Verificação automatizada

Executada localmente, sem chamadas pagas a OpenRouter/ElevenLabs e sem migração remota:

| Área | Evidência |
| --- | --- |
| Contrato ZERO e transições | 6 testes em `packages/core/tests/pensa.test.ts`. |
| Pensa e legado | 102 testes no pacote Pensa, incluindo narrativa livre, repetição lógica, correção do cartão, ideias futuras e retomada com criação desligada. |
| IA, autorização e voz no BFF | 48 testes de contratos, worker, origem narrável, limpeza e transcrição; mais 3 do portão de acesso do Pensa. |
| Banco real | 11 testes v2 em Postgres local: concorrência, reserva, débito único, cancelamento, restauração, autosave concorrente, evidência de conclusão e exclusão. |
| Compatibilidade do members | 14 testes de quota, equipes, limpeza, purga e rotas autenticadas. |
| Estúdio | 34 testes de guia, persistência e índice de exemplos. |
| Pinta | 40 testes de galeria/guia e salvamento antes da saída. |
| Host Kids | 23 testes dos guias, handoff e integração dos editores; 19 de ditado e reprodução privada. |
| Proteção de versões no BFF | 3 testes de falha de cópia, ordem de confirmação e repetição após autosave. |
| Gateway | 34 testes de configuração e fronteiras de autenticação. |

São **337 testes aprovados** nessas suítes, sem contar novamente as repetições durante os ajustes. Também passaram lint direcionado em 78 arquivos, typechecks e o **build completo da Comunidade Kids**, incluindo compilação, TypeScript e geração das páginas. A compilação isolada do Pensa passou. Os comandos e limites estão registrados no [plano de execução](../superpowers/plans/2026-10-14-pensa-v2-implementacao.md).

## Conferências para liberar o piloto

O navegador integrado não estava disponível nesta sessão (`agent.browsers.list()` retornou lista vazia). Portanto, os testes de componentes não substituem inspeção visual em desktop/celular nem teste com criança.

1. Percorrer uma ideia simples 2D, uma ideia ambiciosa com recorte explícito e uma ideia 3D compatível. Um adulto monta a referência seguindo exatamente o guia antes de incluir a combinação no piloto.
2. Fazer ida e volta real entre Pensa, Pinta/Molda e Estúdio, incluindo importação da arte. Confirmar a biblioteca e os nomes dos controles em cada posto.
3. Fazer um segundo ciclo e restaurar o primeiro usando R2 real; interromper uma cópia, editar em outra aba e retomar em outro aparelho.
4. Testar microfone, cancelamento, voz e retomada no Safari/iOS e nos navegadores usados pelas famílias. Validar foco por teclado, leitores de tela, contraste nas paletas Kids e largura estreita.
5. Conferir o modelo OpenRouter escolhido com linguagem infantil real, qualidade das instruções, tempo de cada etapa e custo. Não usar uma saída sintética aprovada como prova de aprendizagem.
6. Observar se a criança reconhece sua ideia, encontra a próxima ação e consegue tentar algo diferente após receber ajuda. Registrar apoio adulto necessário, sem atribuir dificuldade à criança nem alegar facilidade já validada.

## Rastreabilidade R01–R32

“Implementado” descreve o comportamento do código; os percursos reais acima continuam necessários para liberação.

| Achado | Tratamento nesta entrega |
| --- | --- |
| R01 | Cartão com missões/recursos/dependências validado antes da escolha; tarefas atômicas. Prova de funcionamento no runtime depende do recorte avaliado. |
| R02 | Máquina de estados, ZERO, testes explícitos, pausa e encerramento incompleto. |
| R03 | Reparo separado preserva histórico; adaptação arquiva as tarefas substituídas e mantém cópia protegida. |
| R04 | Produzir arte e integrar são missões distintas; inventário autorizado e tipo conferido. |
| R05 | Cópias privadas materializadas, manifesto completo do jogo e partes, revisão comparada no commit. R2 real pendente. |
| R06 | Ideias futuras, reutilização, ajuste e incremento presentes no mesmo fluxo. |
| R07 | Jornadas novas individuais; equipes e projetos anteriores permanecem no legado. |
| R08 | Contrato v2 próprio, migrações aditivas e desligamento de novos planos sem ocultar existentes. |
| R09 | Rascunho por perfil/projeto, IDs estáveis de geração, comparação de revisão e erros recuperáveis. |
| R10 | Passos/lease/reserva/débito persistidos; retomada por visita. Limite de execução sem processo ativo descrito acima. |
| R11 | Referências narráveis, cache privado e autorização por origem/revisão. Retenção física descrita acima. |
| R12 | Busca oficial, referências autorizadas, acesso/conclusão/domínio separados. |
| R13 | Capacidades granulares e bloqueio de caminho indisponível. Matriz real de dispositivos pendente; permanecem os limites dos próprios editores. |
| R14 | Logs por etapa sem espera humana. Benchmark com fornecedores e pesquisa infantil pendentes. |
| R15 | Guia v2 sem checklist; backend aceita evidência salva sem exigir transição intermediária manual. |
| R16 | Instrução com ação, lugar e efeito; detalhes progressivos. Clareza real depende da avaliação. |
| R17 | Próxima missão no guia, mesmo jogo e salvamento antes da saída; referências preservam a aba atual. |
| R18 | Planejamento recebe apoio disponível e progresso conhecido; não infere domínio. Avaliação de carga conceitual pendente. |
| R19 | Entrada livre, cartão curto e áreas recolhíveis. Hierarquia visual ainda precisa de inspeção renderizada. |
| R20 | Ajuda contextual do Pensa e tutor com missão/resultado/teste no Estúdio. |
| R21 | Ajuda recebe histórico e é instruída a mudar de estratégia; eficácia depende de observação. |
| R22 | Preview do editor permanece livre; observação não é sucesso automático. |
| R23 | Arquivar, reativar e apagar têm efeitos distintos; saída tardia cercada e limpeza durável. |
| R24 | Receitas concretas do Estúdio filtradas por todos os recursos; revisão técnica anterior ao cartão. Validação de combinações no runtime ainda é condição do piloto. |
| R25 | Protocolo formativo permanece na proposta; não foi realizado com crianças nesta sessão. |
| R26 | Checkpoint no encerramento e revalidação antes do incremento; autosave concorrente testado. |
| R27 | Destaque de retomada, lista de arquivados e criação somente após envio. |
| R28 | Disponibilidade do tutor integra capacidades e autorização da rota; guias não dependem dele. |
| R29 | Ditado e escuta no tutor, sem corte silencioso. Validação em dispositivos reais pendente. |
| R30 | Restauração conjunta de criação/plano/guia/evidências, com novo teste exigido. |
| R31 | Planejamento, explicação, ajuda, reparo e voz têm consumo e caminhos separados. |
| R32 | Estados e ações de recuperação; falha de proteção permite pausar. “Guardado na conta” e cópia protegida têm confirmações distintas. |
