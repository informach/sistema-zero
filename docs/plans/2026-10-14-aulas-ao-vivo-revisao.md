# Revisão consolidada das Oficinas ao vivo

14/10/2026. Revisão de produto, jornadas, identidade visual, domínio e infraestrutura após a escolha de aproveitar Railway/Cloudflare. Foram confrontados os quatro documentos, o código existente e documentação oficial. **Ajustes incorporados ao planejamento; nenhuma sala foi implementada, ensaiada ou publicada nesta revisão.**

## Parecer

O modelo **oficina reutilizável → turma → aulas com prazo próprio** está coerente com a experiência pretendida. Também estão coerentes a compra avulsa, a continuidade por assinatura, o uso do mesmo perfil/Estúdio e a publicação no Mural existente. Não há necessidade de criar outra plataforma para as oficinas.

A proposta ainda precisava de ajustes importantes. Reaproveitar o salvamento atual não assegurava checkpoints duráveis; limitar o painel a um editor não impedia que um jogo congelasse seus controles; o caminho próprio de vídeo ainda herdava pressupostos de um SDK de reunião. Esses pontos afetariam diretamente a criança e a professora.

O parecer é **favorável ao produto e condicionado à prova dos fundamentos técnicos antes do piloto infantil**. A revisão torna os contratos mais completos, mas não comprova robustez, desempenho, economia ou prazo de implementação.

## Documentos e responsabilidade de cada um

| Documento | Fonte canônica |
| --- | --- |
| [Produto e experiência](2026-10-14-aulas-ao-vivo-design.md) | Jornadas, nomes, identidade visual, oferta e comportamento percebido |
| [Arquitetura](2026-10-14-aulas-ao-vivo-arquitetura.md) | Domínio, acesso, autoria, persistência, integrações, contratos e testes |
| [Infraestrutura e custos](2026-10-14-aulas-ao-vivo-infraestrutura-e-custos.md) | Cloudflare SFU, recuperação, gravador, operação e hipóteses econômicas |
| Esta revisão | Achados, decisões incorporadas e evidências ainda necessárias |

As capacidades da Daily deixaram de ser pressupostos dos contratos técnicos. Custos por minuto de outro produto e a estimativa antiga de 180–300 horas foram retirados do planejamento de entrega vigente. O escopo atual precisa de nova estimativa a partir da prova.

## Ajustes encontrados e incorporados

P1 significa necessário antes de um piloto com crianças; quando indicado, o bloqueio é apenas da venda automatizada. P2 fecha a jornada e precisa aparecer no desenho/ensaio, sem necessariamente exigir outro subsistema.

| Prioridade | Achado e consequência | Ajuste no planejamento |
| --- | --- | --- |
| P1 | O salvamento atual pode apagar manifesto/partes da versão anterior; registrar uma revisão no banco não garante restauração | Referências duráveis de arquivos por checkpoint, evidência e roteiro, coleta que respeita referências/reservas e orçamento de histórico |
| P1 | Um único preview pesado pode congelar a interface da professora e seus controles | Isolamento da execução em relação à sala, sem execução automática ao observar e sem fallback silencioso para a thread principal |
| P1 | Entrada por Criar poderia editar o mesmo projeto sem respeitar a ajuda docente | Um workspace canônico com revisão/guarda de autoria comuns em todos os pontos de entrada |
| P1 | Comandos simultâneos de conexão, câmera e moderação podem disputar negociação; retry pode duplicar recursos | Coordenação por conexão, geração de tentativa, recuperação de resultado incerto e limpeza de recursos tardios |
| P1 | Retomar câmera/tela pode depender de publicação que já deixou de existir | Estado por trilha e reconstrução autorizada de publicações/recepções, incluindo o gravador |
| P1 | Áudio/vídeo podem continuar quando o backend dos controles cai | Estado degradado explícito, suspensão nos clientes, supervisor independente e limite honesto da revogação sob falha total |
| P1 | Cartões menores não garantem menor tráfego; camada baixa depende do envio real | Perfis/camadas e fallback medidos, com prioridade de voz/demonstração e avaliação do custo no computador infantil |
| P1 | Canal coletivo filtrado por destinatário no cliente não protege orientação individual | Topologia de canais coletivos e privados realmente autorizados; autoria/aceite continuam no servidor |
| P2 | A professora teria de coordenar pausa de gravação, aceite, salvamento, transferência e retomada manualmente | Ação de ajuda orquestrada, progresso/erro visíveis e retorno explícito à explicação gravada |
| P2 | Gravação excluída poderia ser confundida com conversa reservada | Mensagem clara: fora do replay, mas a turma continua ouvindo; replay reúne explicações/demonstrações e pode ser menor que o encontro |
| P2 | Segunda entrada legítima pode duplicar a criança, causar eco e confundir quem recebe ajuda | Uma participação ativa por criança/ocorrência, com Continuar aqui, encerramento anterior e preservação de projeto/admissão |
| P2 | Requisitos de computador apareciam só como nota técnica; família poderia descobrir a limitação depois da compra | Requisitos visíveis na oferta e teste com conteúdo fictício antes de pagar; celular não é anunciado como equivalente |
| P2 | Compartilhar janela/monitor poderia ser apresentado como se fosse apenas a plataforma | Recorte proposto de aba do Sistema Zero, prévia e verificação da superfície no navegador aprovado; escolha incorreta não é publicada |
| P2 | Reposição após interrupção não tinha identidade própria no histórico | Ocorrência vinculada à aula, com presença/chat/captura separados e eventual extensão explícita do grant |
| P1 para venda automática | Reembolso de compra avulsa e confirmação tardia não estavam cobertos pelo fluxo atual | Estado durável por unidade, revogação/reconciliação, eventos fora de ordem e validação separada de estorno financeiro parcial |
| P2 | Duas unidades pagas poderiam ocupar duas vagas com o mesmo perfil | Unicidade de inscrição ativa por turma/aprendiz; outra unidade aguarda perfil/correção |
| P2 | Música do jogo poderia encobrir a professora; a mesma ação significava mudar etapa ou localizar cursor | Som do projeto independente e ações distintas: Ir para a etapa da turma / Ver onde a professora está mexendo |

As escolhas novas são recomendações de desenho, não preferências já confirmadas pela dona. Preservam os pedidos expressos de edição autorizada desde a primeira versão, acompanhamento contínuo, controles docentes, identidade visual e replay.

## Evidência decisiva no código

| Evidência lida diretamente | Implicação |
| --- | --- |
| [Repositório de Creations](../../packages/members/src/infrastructure/persistence/drizzle/creations.repository.ts) e [BFF de criações](../../packages/member-shell/src/routes/creations.ts) | Commit libera objetos anteriores e o BFF os exclui; checkpoints live exigem adaptação real de retenção |
| [PreviewIframe](../../packages/studio/src/components/preview/PreviewIframe.tsx) e [limitações de embedding](../../packages/studio/docs/embedding.md) | O watchdog atual não interrompe todo trabalho síncrono pesado; cartões leves não resolvem o isolamento do editor |
| [StudioProjectPlayer](../../packages/studio/src/components/preview/StudioProjectPlayer.tsx) | Existe adapter de origem isolada no player, sem garantia de integração pronta no editor |
| [Serviços de criações](../../packages/members/src/application/creations/creations.service.ts) | A escrita corrente não é o contrato de autoria exclusiva proposto para live; aliases precisam do mesmo guard |
| [Ponte de áudio](../../packages/studio/src/preview/inputBridge.ts) | Há base para silenciar som do projeto, separada do microfone da chamada |
| [Revogação de entitlement](../../packages/members/src/application/revoke-entitlement/revoke-entitlement.service.ts) e [webhook do funil](../../packages/funnel/src/server/webhook.ts) | Cancelamento por assinatura não substitui revogação por unidade avulsa |
| [Menu Kids](../../packages/community-kids/src/components/kids/nav.ts) e [régua de divisão](../../packages/member-shell/src/lib/lesson-split.ts) | Nova entrada exige preservar cinco abas móveis e usar largura útil, não só a janela |
| [Configuração Kids](../../packages/community-kids/next.config.ts) | Permissões de câmera/microfone e isolamento precisam ser adaptados às rotas específicas, sem liberar dispositivos aos projetos executados |

A documentação oficial foi usada para distinguir mecanismos reais do SFU de conveniências de SDK: [negociação](https://developers.cloudflare.com/realtime/sfu/concepts/negotiation/), [limites](https://developers.cloudflare.com/realtime/sfu/platform/limits/), [camadas de vídeo](https://developers.cloudflare.com/realtime/sfu/features/simulcast/) e [DataChannels](https://developers.cloudflare.com/realtime/sfu/features/datachannels/). São fundamentos dos ajustes técnicos, não evidência de que a integração local já funciona.

## Jornada infantil revisada

| Momento | Experiência esperada |
| --- | --- |
| Antes da compra | Família entende dispositivo necessário, datas, prazo por aula e o que haverá no replay; consegue testar preparação |
| Depois da compra | Mesmo perfil/avatar/quarto; duas vagas permitem dois perfis, sem assinatura obrigatória |
| Antes da data | Agenda e teste local; conteúdo futuro permanece fechado |
| Entrada | Dispositivos desligados, escolha da aba, espera sem receber turma e admissão recuperável |
| Criação | Tarefa/projeto em primeiro plano; mão, microfone e ajuda fáceis; som do jogo não impede ouvir |
| Ajuda | Criança aceita ou recusa, vê a professora identificada e pode interromper; troca de etapa não abandona o projeto assistido |
| Problema | Estado específico de rede, compartilhamento ou salvamento; nenhuma imagem antiga parece ao vivo |
| Encerramento | Projeto salvo e publicação explícita no Mural, sem publicação automática pela professora |
| Depois | Roteiro, materiais e replay pelo prazo da aula, inclusive para faltantes; sem conectar microfone para assistir |
| Vencimento | Aula encerrada, identidade e publicação preservadas conforme política; assinatura pode continuar o projeto elegível sem reabrir conteúdo vencido |

Os 30 dias continuam sendo exemplo de prazo por aula: 07/11 às 14h até 07/12 às 14h; a aula de 14/11 vence em 14/12. Upload, falta ou compra tardia não reiniciam a contagem. Reposição e prorrogação são operações explícitas.

## Jornada docente revisada

A professora prepara um roteiro reutilizável, abre turmas e agenda suas aulas. No dia, entra pelo admin, testa câmera/áudio/demonstração e inicia a condução. A captura só aparece como ativa depois de confirmação real.

O mosaico serve para perceber situações; o projeto selecionado serve para ler e ajudar. Filas de fala e ajuda são distintas. Silenciar agora, bloquear microfone e modo de fala têm efeitos diferentes e preservados na reconexão. Baixar mãos não cancela ajuda nem encerra uma vez de fala.

A ajuda vira um fluxo guiado: pedir e receber aceite, confirmar pausa de gravação, salvar, transferir, acompanhar e devolver. Os controles da turma permanecem acessíveis. Encerrar ajuda destaca a volta à explicação gravada, evitando depender da memória da professora.

No final, a professora confirma salvamento, orienta publicação e resume os passos essenciais em sua demonstração. A equipe confere e publica o replay; o admin mostra falha, lacuna e revisão pendente sem fingir que o vídeo está pronto. O objetivo de até 24 horas precisa ser validado na operação.

Se houver interrupção, a reposição não sobrescreve a aula realizada. Se a única professora desaparecer, a sala suspende comunicação conforme a política de supervisão, mantendo a criação. Se forem os controles do sistema que falharem, a interface informa essa falha e aplica o procedimento específico.

## Identidade visual e carga cognitiva

A proposta conserva o contrato já estabelecido:

- Kids herda Baloo 2/Nunito, as seis paletas do perfil, componentes de listagem, cartões, botões e navegação existentes.
- A área de explicação alterna ao vivo/preparação/replay; o Estúdio, as atividades e os materiais continuam familiares.
- Conversa, materiais e turma ocupam um painel por vez; não comprimem a atividade em três colunas permanentes.
- Expansão conserva foco, microfone, ajuda, Parar ajuda e Parar compartilhamento; não basta elevar z-index.
- O admin mantém seu console/Geist e um modo de condução amplo; não recebe uma identidade de videoconferência separada.
- Estados têm texto/ícone além da cor; ações infantis essenciais têm alvo de pelo menos 44 px, teclado e foco visíveis.

Essa coerência foi revisada no desenho e nas fontes do código. Ainda é necessário comparar telas renderizadas da aula gravada e ao vivo, nas seis paletas, notebook, largura estreita e zoom de 200%. Não foi feita aprovação visual de uma interface implementada.

## O que permanece aberto e como fechar

| Ponto ainda não comprovado | Entrega necessária antes de anunciar |
| --- | --- |
| Oito participantes criando e compartilhando | Ensaio em equipamentos/redes reais, com perfil de qualidade e leitura da tela selecionada |
| Intervenção sem perda | Transferência, revogação, segunda aba/aparelho, autosave atrasado, remoção de asset e restauração íntegra |
| Controles sob falha | Queda docente, perda do backend, resposta SFU perdida e falha do supervisor, com tempos observados e resultado visível |
| Gravação útil e seletiva | Arquivo conferido durante perguntas, apresentações infantis, assistência e reconexões; retomada e prazo corretos |
| Isolamento da execução | Jogo pesado controlado sem travar os controles de professora/criança; falha de preview recuperável |
| Custo e esforço | Consumo medido de mídia/gravador/storage/supervisor e decomposição atualizada da implementação |
| Preparação/identidade visual | Teste pré-compra, ensaio adulto e comparação renderizada com a plataforma existente |

Sequência recomendada: prova isolada → ensaio adulto → piloto pequeno → ampliar até oito → automatizar venda. O piloto conserva as capacidades confirmadas; inscrição administrada reduz automação, não a experiência prometida.

Esta revisão não depende de nova decisão de fornecedor para prosseguir ao protótipo. Preços comerciais, política de cancelamento, parâmetros operacionais e matriz final de aparelhos precisam ser fechados na preparação do piloto, apoiados nas medições. Nenhuma promessa de prazo ou economia substitui essas evidências.
