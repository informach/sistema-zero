# Implementação das oficinas ao vivo

Registro da implementação local de 14/10/2026. Complementa a [proposta revisada](2026-10-14-aulas-ao-vivo-revisao.md), sem substituir o ensaio operacional previsto nela.

## Entrega e limites

O módulo integra cadastro de oficinas reutilizáveis, turmas, aulas datadas, matrícula manual por criança, sala supervisionada, atividades, Estúdio, ajuda autorizada, materiais e replay. Kids mantém sua identidade e seus cinco atalhos móveis; o desktop recebe **Oficinas**. Admin possui autoria, turmas e condução. As inscrições manuais atendem à primeira etapa aprovada; venda automática permanece na etapa posterior ao piloto.

O transporte usa WebRTC nativo e Cloudflare Realtime SFU/TURN; a gravação é um serviço próprio com Chromium/FFmpeg e armazenamento R2 privado. Não há fornecedor adicional de videoconferência. Isso **não significa custo adicional zero**: Railway, SFU/TURN, R2, Workers e Durable Objects devem ser medidos no ensaio. Nenhum recurso pago foi criado nesta execução.

`LIVE_MEDIA_READY=false` permanece como padrão. O código local não comprova prontidão para uma turma real. Não houve deploy nem aplicação das migrações em produção. Antes de habilitar mídia, concluir o ensaio Linux/Railway/Cloudflare/R2 e a conferência visual em navegador.

## Caminhos principais

| Área | Caminho |
| --- | --- |
| Catálogo e aulas da criança | `/oficinas` |
| Inscrições e escolha de perfil pelos responsáveis | `/pais/oficinas` |
| Projeto da oficina que continua na biblioteca | `/criar/oficinas/[workspaceId]` |
| Cadastro e turmas no admin | `/admin/oficinas` |
| Condução pela professora | `/admin/professor/ao-vivo` |
| Demonstração separada de crianças/chat | `/ao-vivo/demonstracao/[sessionId]` no admin |

O conteúdo do programa é copiado para a turma; editar um programa não reescreve aulas antigas. Reposições criam ocorrências novas e preservam o histórico. O acesso é por aula, começa no horário de liberação e termina exclusivamente no instante calculado com dias de calendário no fuso da turma. Publicar o replay não reinicia o prazo.

O roteiro reutiliza os blocos interativos atuais, com avaliação no servidor e progresso próprio da oficina. A indicação de etapa pela professora oferece uma ação à criança, sem trocar sua atividade à força. Na visão móvel, alternar entre a aula e Criar mantém o projeto e a chamada montados. **Como Fazer** abre uma nova aba nesta versão; o painel interno de consulta não foi incorporado.

## Projeto e assistência

- Um projeto canônico por criança e sequência de encontros vinculados (ou por aula independente), nos modos Blocos/Ponte, com revisões completas e assets embutidos. Pro/WebContainer não integra esta sala. Limite atual: 2 MB por snapshot; são preservadas as últimas 20 revisões e o checkpoint da ajuda ativa.
- A professora pede ajuda; a criança aceita. O servidor confirma que a captura foi pausada, salva o checkpoint e transfere a autoria com uma nova época. Escritas antigas são recusadas.
- O cursor da professora é identificado e aponta para o botão ou bloco correspondente na tela da criança. Não projeta coordenadas sobre controles ocultos ou arquivos diferentes. A criança pode encerrar a ajuda; a devolução aguarda aplicar a revisão final. Perda de conexão conserva um rascunho no IndexedDB, isolado por projeto, criança e autor. A recarga oferece recuperação sem sobrescrever uma revisão posterior; download e continuação pela versão da conta preservam versões alternativas. O indicador de salvamento aguarda a confirmação do servidor.
- Observação não executa o jogo. Prévia, atividades de projeto e geração da capa usam origem isolada na sala ao vivo; falha de isolamento não troca silenciosamente para execução local.
- A publicação no Mural usa o snapshot confirmado pelo Members, com prova temporária validada pelo Hub. A professora não publica em nome da criança.
- Após o prazo, a assinatura que dá acesso ao Estúdio permite continuar o mesmo projeto. Isso não reabre aula, materiais ou replay expirados.

A edição do roteiro permite **Continuar o projeto do encontro anterior**, com origem validada e congelada na turma. A próxima aula abre o mesmo workspace; seu grant é verificado separadamente. Ajuda, dispositivo e pausa de gravação usam a sala efetiva. Materiais, atividades e replay da aula vencida continuam fechados.

O painel docente reúne etapa atual, estado do salvamento e fila de ajuda/fala por criança. Relatos sem atualização recente aparecem como desconhecidos. A ação principal abre o projeto; controles individuais ficam em um menu. Os componentes, cores e tipografia continuam usando os tokens existentes.

## Correções da segunda revisão

Os cinco achados da segunda revisão foram corrigidos: abertura da recepção antes da entrada da professora, publicação recuperável após resposta perdida, encerramento de assistência com edição expirada, proteção de pedidos novos contra comandos atrasados e separação entre descoberta e agenda pessoal. Foram aprovados 186 testes selecionados nesta rodada, com verificações de tipos de Members, member-shell, Kids e Admin. Evidências e limites: [relatório das correções](../../.audits/live-round2-corrections-2026-10-14.md).

Na implantação, atualizar Members e os BFFs juntos: a preparação da publicação exige `clientIdempotencyKey`. A mesma tentativa reutiliza o arquivo privado; erros do Hub não provocam exclusão especulativa. A limpeza de arquivos sem publicação deve confirmar que não existe referência no Hub.

## Mídia e gravação

Cada participante tem um dispositivo ativo, com troca explícita. Câmera/microfone só são publicados com permissão válida. A professora pode admitir/remover, mutar, bloquear microfone/câmera, conceder fala, abaixar mãos e moderar o chat. Um supervisor independente aposenta conexões após perda de autorização/lease. Revogação instantânea sob falha simultânea do fornecedor e supervisor não é uma garantia possível.

As chamadas do navegador usam a prova de sessão do documento (`x-sz-session`), inclusive transporte, prévias, salvamento do replay e publicação. Trocar o perfil em outra aba não autoriza o documento antigo a escrever no novo perfil.

O gravador aceita apenas microfone, câmera e demonstração da primeira professora atribuída à turma, na mesma conexão SFU. Tela, voz, câmera e chat infantis não são fontes de gravação. Pedidos de ajuda podem ser cancelados pela solicitante e expiram após 60 segundos sem aceite; a recusa preserva a autoria infantil. O prazo operacional encerra a ocorrência de forma durável. O coordenador tenta finalizar a gravação até receber confirmação do artefato, mesmo após falha de parada. O replay fica privado até conferência e publicação, com revisão e retirada também das gravações anteriores à reposição. URLs assinadas respeitam o prazo restante do aluno.

O fundo desfocado e os dois fundos preparados rodam localmente com MediaPipe. Quando um efeito falha, a câmera é desligada; não há exposição automática da imagem original. A qualidade e o custo de CPU dependem do equipamento e ainda precisam ser conferidos com famílias.

O preflight informa quando o navegador não oferece compartilhamento seguro da aba e orienta usar Chrome/Edge em computador. Celular e navegadores sem Capture Handle não recebem uma promessa de acompanhamento equivalente. O replay não possui geração automática de legendas revisadas nesta versão.

**Limitação de recuperação:** após reinício do gravador, jobs encontrados no disco não são retomados automaticamente. Segmentos confirmados são conservados, mas a recuperação exige operação e revisão. Não há endpoint de recuperação automática nesta entrega. O procedimento e a restrição estão no [manual do gravador](../../packages/live-recorder/README.md).

## Preparação do ambiente

1. Revisar e aplicar pelo fluxo normal as migrações aditivas Members `0102`–`0106`. Os arquivos e snapshots foram gerados; não usar `db:push` como substituto em produção.
2. Configurar os segredos privados do Members descritos em `.env.example`: SFU, TURN, URL/token do supervisor e URL/token do gravador. O gate exige o conjunto completo. Não usar variáveis `NEXT_PUBLIC_*` para segredos.
3. Preparar o [supervisor](../../packages/live-supervisor/README.md) e o [gravador](../../packages/live-recorder/README.md), incluindo volume persistente, sandbox Chromium e desligamento com drenagem.
4. Manter gravações, materiais e prévias no R2 privado. O endpoint R2 precisa estar autorizado na CSP de frames. O admin precisa da configuração R2 e do segredo HMAC usado pelo upload de materiais.
5. Configurar limpeza por prefixo de objetos temporários `live/previews/` abandonados, por exemplo após um dia. A remoção normal acontece no descarte do player, mas fechar a aba ou perder rede pode impedir o DELETE. Não aplicar essa política aos projetos, materiais ou gravações.
6. Preparar uma oficina e turma de teste com perfis adultos. Conferir datas, fuso, responsáveis pelos perfis, professora principal e limite de vagas.
7. Seguir o ensaio do gravador: oito dispositivos, rede sem UDP, saída da professora, queda de Members/supervisor, controle consentido, reconexões, gravação seletiva e prazo do replay. Medir CPU, RAM, bytes e custos antes de ampliar.

O limite de uploads de prévia é uma proteção por processo do BFF, não uma cota financeira global. O gravador começa com um job simultâneo; aumentar capacidade exige medição. O prazo de acesso não apaga automaticamente projetos nem gravações: a política editorial de retenção deve ser configurada separadamente.

O catálogo filtra turmas antes de carregar agregados e pagina 20 por vez, com limite de 50. O lock global de escritores foi substituído por exclusão de aceitações por professora; salvamentos de turmas independentes não disputam esse lock.

## Verificação local

A rodada de correções tem evidência própria no [relatório de correções](../../.audits/live-corrections-2026-10-14.md). Os resultados da implementação inicial são registrados no [plano de implementação](../superpowers/plans/2026-10-14-oficinas-ao-vivo.md). Os testes de captura usam Chromium/WebRTC e FFmpeg reais, com armazenamento de teste. Isso não equivale a ensaio com Cloudflare/R2 reais.

O build final de produção do Admin passou, incluindo TypeScript e 58 páginas. Typechecks de Members, Auth, Hub, Studio, member-shell, Kids, Admin, Gateway, gravador e supervisor passaram nos respectivos escopos. Members teve 1.415 testes aprovados e 49 ignorados; as regressões da aprendizagem compartilhada tiveram 86 testes aprovados. O plano registra separadamente três timeouts na execução ampla do Studio e a repetição isolada que passou. O ensaio dos efeitos também processou frames com os chunks reais do Next e as políticas de produção, após corrigir a seleção do loader MediaPipe.

O navegador autorizado para conferência visual não estava disponível nesta sessão. Portanto, a comparação renderizada das seis paletas, foco, navegação por teclado e diferentes larguras permanece pendente. O build de produção e testes de componentes não substituem essa conferência.
