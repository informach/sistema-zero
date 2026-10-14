# Oficinas ao vivo dentro do Sistema Zero

Proposta de produto e arquitetura — 14/10/2026. Pesquisa em documentação oficial e leitura do repositório atual. **Proposta para avaliação; nenhuma funcionalidade foi implementada ou publicada.**

Detalhamento para desenvolvimento: [arquitetura, contratos e implantação](2026-10-14-aulas-ao-vivo-arquitetura.md).

**Infraestrutura proposta:** Railway/Cloudflare existentes, aplicação e gravador próprios. [Decisão técnica e custos](2026-10-14-aulas-ao-vivo-infraestrutura-e-custos.md). Cloudflare Realtime SFU é o candidato à prova; fornecedores gerenciados permanecem apenas como alternativas. Esta revisão consolida a jornada para essa arquitetura, sem tratar as capacidades como já demonstradas.

Revisão de coerência, jornadas e identidade visual: [achados, ajustes incorporados e validações pendentes](2026-10-14-aulas-ao-vivo-revisao.md). As recomendações novas desta revisão continuam propostas; decisões explicitamente confirmadas pela dona permanecem identificadas abaixo.

## 1. Recomendação

Criar **Oficinas ao vivo** como uma modalidade da própria plataforma. A criança entra com seu perfil, encontra a professora, realiza experiências e constrói no Estúdio. Ao terminar, publica no Mural normal e conserva seu projeto, avatar e quarto. A família pode comprar outra oficina ou contratar a Comunidade dos Criadores para continuar criando.

A primeira versão deve atender **6–8 crianças por professora**, inteiramente no navegador, com cinco capacidades centrais:

1. Chamada de áudio/vídeo dentro da sala, junto das atividades existentes, com mão levantada, conversa da turma, materiais e controles docentes de participação.
2. Painel da professora com telas compartilhadas, etapa atual, salvamento e pedidos de ajuda.
3. **Ajuda com edição autorizada desde a primeira versão:** a professora assume temporariamente a autoria do projeto; a criança acompanha e pode interromper.
4. Integração com perfil, avatar, quarto, Como Fazer, projetos e Mural já existentes.
5. Gravação da professora e da demonstração, disponível na própria aula pelo prazo restante de acesso, para rever ou recuperar uma falta.

Essa modalidade serve tanto como primeira experiência quanto como compra avulsa de quem já assina. **Assinatura e vaga na oficina são direitos distintos.** Desenvolver a sala e a gravação com bibliotecas existentes e transporte WebRTC da Cloudflare, aproveitando os fornecedores já utilizados. Experiência pedagógica, projetos e regras comerciais permanecem no Sistema Zero. A integração precisa de ensaio; infraestrutura existente não implica consumo adicional gratuito ilimitado.

## 2. Decisões confirmadas e propostas ainda ajustáveis

| Tema | Definição |
| --- | --- |
| Turma inicial | Confirmado: 6–8 crianças por professora |
| Ambiente | Confirmado: uma área dentro do Sistema Zero, no navegador |
| Acompanhamento | Confirmado: visualização contínua para perceber dificuldades e acompanhar a turma |
| Controle | Confirmado: somente dentro do Sistema Zero, com autorização; não controlar o computador inteiro |
| Edição assistida | Confirmado: entra na primeira versão |
| Orientação visual | Confirmado: cursor diferenciado da professora e destaques/setas para orientar alunos |
| Comercial | Confirmado: oficina de entrada, oficina avulsa e oficina para assinantes |
| Integrações | Confirmado: publicação no Mural normal, avatar, quarto e Como Fazer também para quem compra só aulas ao vivo |
| Navegação | Confirmado: entrada própria no menu principal; proposta de nome curto: **Oficinas** |
| Administração | Confirmado: área específica para configurar oficinas, turmas e encontros |
| Continuidade visual | Confirmado: sala semelhante à experiência gravada, com transmissão ao vivo no lugar principal do vídeo |
| Participação | Confirmado: levantar a mão, falar, ligar câmera e conversar com a turma na própria sala |
| Fundo da câmera | Solicitado: desfoque e troca de fundo; proposta de prévia e seleção integrada para professora e crianças, conforme suporte do dispositivo |
| Controle docente | Confirmado: silenciar uma criança/todas e abaixar a mão de uma criança/todas; organizar quem pode falar |
| Materiais | Proposta: seção configurável da aula, com atalhos no chat; anexos livres pelo chat não são necessários no piloto |
| Infraestrutura de vídeo | Restrição solicitada: aproveitar Railway/Cloudflare e evitar novo fornecedor pago; proposta atual: Cloudflare Realtime SFU + gravador próprio, condicionados a ensaio |
| Gravação dos encontros | Confirmado: replay na própria aula, durante a janela de acesso dela; grava somente professora e demonstração do projeto |
| Liberação e duração do acesso | Confirmado: cada aula abre na própria data agendada e tem o prazo da oferta contado individualmente; não é vitalício nem contado após o último encontro |
| Repetição da oficina | Confirmado: cadastro reutilizável com várias turmas e calendários, preservando o histórico |
| Duração de encontro | Hipótese para o primeiro ensaio: 60–75 minutos, com pausa curta conforme a turma |

As hipóteses de duração do encontro e fornecedor não são decisões já tomadas pela dona. A regra de acesso por aula está confirmada; o número de dias é configurado na oferta (30 dias é o exemplo). Preços, condições de cancelamento e calendário precisam ser definidos na preparação comercial.

## 3. O que a plataforma já oferece

| Capacidade | Evidência atual | Uso na oficina |
| --- | --- | --- |
| Atividades independentes do vídeo | [renderer de blocos](../../packages/member-shell/src/components/lesson-blocks.tsx) e [atividades](../../packages/member-shell/src/components/learning-activity.tsx) | Reutilizar experiências, quiz e construção, mudando o contexto de execução |
| Estúdio embarcável | [StudioLesson](../../packages/studio/src/studio/StudioLesson.tsx) e [contratos](../../packages/studio/src/studio/types.ts) | Um editor por criança, com projeto preparado e recursos adequados à atividade |
| Rascunho local e nuvem | [canal de rascunhos](../../packages/member-shell/src/lib/lesson-draft-cloud.ts) | Preservar recuperação e continuar o trabalho entre encontros |
| Sala do Professor | [layout atual](../../packages/admin/src/app/admin/professor/layout.tsx) | Acrescentar agenda, turmas e condução de encontros |
| Leitura de entregas | [visualizador atual](../../packages/admin/src/components/professor/gallery-submission-viewer.tsx) | Base de inspeção de projetos, com novo modo de acompanhamento |
| Identidade familiar | [sessões Kids](../../packages/core/src/security/kids-session.ts) | Responsável compra; um perfil infantil ocupa cada vaga |
| Publicação e comunidade | Fluxos existentes de criação e vitrine/Mural | Publicar no mesmo lugar, preservando autoria, moderação e interação |

Há três lacunas estruturais. Não existe um domínio de turma/encontro com professores vinculados. O acompanhamento atual lê entregas anteriores, não o estado corrente da criança. E as atividades ainda obtêm acesso e progresso pelas regras do curso gravado.

Por exemplo, o [acesso ao rascunho](../../packages/members/src/application/creations/lesson-draft-access.service.ts) exige aula publicada, sem `coming_soon`, curso liberado e seção acessível. Logo, colocar uma chamada ao lado de uma aula do Farol não resolveria sua oferta antes dos vídeos. A oficina precisa publicar seu próprio roteiro de atividades, sem liberar indiscriminadamente o curso gravado.

Outro detalhe concreto: hoje [Kids](../../packages/community-kids/next.config.ts) e [Admin](../../packages/admin/next.config.ts) bloqueiam câmera e microfone por cabeçalhos de segurança. A integração terá de habilitá-los nas rotas da sala, mantendo os projetos executados pelas crianças isolados.

## 4. A jornada completa

### Antes da oficina

Antes de pagar, a família encontra os equipamentos/navegadores efetivamente aprovados, câmera opcional, orientação de fones e **Testar meu computador**. O alvo inicial de ensaio é computador com Chrome/Edge; suporte a agenda no celular não significa suporte equivalente à criação ao vivo. O teste usa dispositivos e conteúdo fictício, sem antecipar material da aula nem depender de inscrição. Duas crianças participando ao mesmo tempo precisam de perfis e equipamentos separados no recorte inicial. Uma falha no teste oferece orientação e atendimento antes da compra.

O responsável escolhe o projeto, a turma, os horários e o perfil da criança. Quem já tem conta aproveita tudo que possui; uma compra não cria outro perfil nem reinicia avatar, quarto ou progresso.

Para uma família nova, a compra precisa conceder também o direito de criar o perfil infantil. Hoje essa criação depende de acesso ativo na conta. A vaga pode ficar confirmada aguardando a escolha/criação do perfil, sem exigir que a família compre uma assinatura para completar a inscrição. Duas vagas para irmãos precisam permitir associar ou criar os dois perfis. Cada vaga concede uma vinculação; repetir oficinas para a mesma criança reaproveita seu perfil, sem multiplicar cadastros. A administração identifica inscrições pagas ainda sem perfil associado.

Depois da inscrição, a área dos pais mostra os encontros e um caminho curto de preparação: autorizar o computador, testar áudio, abrir o perfil e conhecer a sala. A criança encontra **Oficinas** no menu e sua próxima oficina em destaque, junto do acesso normal ao avatar, quarto e Como Fazer. O preparo deve caber em uma visita curta, sem exigir concluir um curso gravado para participar.

O Como Fazer é contextual: entrar, usar microfone, compartilhar a aba, pedir ajuda, interromper a ajuda, salvar e publicar. Aproveitar a central atual e acrescentar tutoriais desses passos. A professora pode enviar o tutorial adequado para a criança durante o encontro.

Conferência adicional do código: avatar e quarto já usam o perfil autenticado, peças gratuitas/inventário e moedas; não exigem assinatura. O Como Fazer também permite leitura publicada para contas ativas. A adaptação concentra-se no onboarding, navegação e acesso ao Mural, não em recriar esses recursos. [Avatar](../../packages/members/src/application/avatar/equip-avatar.service.ts), [quarto](../../packages/members/src/application/room/save-room.service.ts), [Como Fazer](../../packages/members/src/interfaces/http/routes/help.routes.ts).

Quem vem apenas para aulas ao vivo recebe essa experiência de criador. O acesso não deve cair no estado de visitante de uma campanha gratuita por falta de assinatura.

### Durante a oficina

Na hora marcada, a criança clica em **Entrar na oficina**. O sistema confere perfil, inscrição e encontro, testa os dispositivos e explica o que será compartilhado. A professora admite a turma e abre a primeira atividade.

Cada criança tem seu próprio projeto. A professora pode apresentar uma ideia, indicar uma experiência, orientar a abertura do Estúdio preparado, pedir um teste e acompanhar cada participante. Mudar a etapa indicada à turma não troca automaticamente a etapa local da criança. Quando ela escolhe acompanhar, preservar o trabalho anterior e confirmar o salvamento antes da mudança.

Na hierarquia da sala, tarefa e projeto vêm primeiro; **Levantar a mão**, **Microfone** e **Pedir ajuda** são as ações primárias. **Câmera**, **Conversa**, **Materiais** e dispositivos ficam acessíveis sem competir com a atividade. **Mostrar meu projeto** aparece na apresentação da turma; **Parar ajuda** e o estado do compartilhamento permanecem visíveis quando aplicáveis. **Sair da oficina** é separado dos controles de participação. Informações de pagamentos e assinaturas ficam na área dos pais.

### No encerramento

Reservar tempo para a criança testar, escolher um título/capa e publicar. O botão deve acionar o fluxo normal de publicação do Sistema Zero. O resultado entra no **Mural existente**, com autoria infantil, regras de conteúdo e moderação atuais. Pode receber a indicação discreta “Criado na oficina …”; isso é contexto, não uma segunda galeria.

A participação da professora pode ficar no histórico privado de ajuda. Ela não transforma a professora em dona do jogo nem gera uma publicação em seu perfil. Publicar continua sendo uma ação explícita da criança; uma tela compartilhada não autoriza a publicação automática.

O responsável recebe um resumo com o projeto, o encontro realizado e o próximo passo. A criança reconhece o mesmo projeto na plataforma depois da chamada.

### Depois da oficina

Há três caminhos legítimos: continuar no projeto enquanto houver acesso à aula correspondente, comprar outra oficina ou assinar a Comunidade dos Criadores. Cada aula tem sua própria janela: abre na data agendada e vence após o número de dias contratado. Comprar antes não antecipa a liberação nem começa a consumir o prazo.

A gravação aparece nessa mesma aula depois de processada e publicada. A criança pode rever a explicação e continuar seu projeto salvo. Quem faltou encontra o roteiro, os materiais e o projeto inicial da atividade, sem precisar ter registrado presença. Assistir ao replay não é requisito para abrir o Estúdio nem conta como presença ao vivo.

Avatar, quarto, identidade, histórico e publicação não devem ser apagados quando termina o encontro ou o prazo de edição. O direito de editar e criar novos projetos é uma política separada da preservação da criação, respeitando as regras de retenção e exclusão da conta.

Se a família assinar, o mesmo perfil continua no mesmo ambiente. Um projeto elegível pode aparecer em Criar como entrada para o mesmo workspace, com direito do plano e a mesma proteção de autoria; não criar duas versões que divergem silenciosamente. Abrir por Criar durante ajuda docente respeita o bloqueio de edição. Isso não reabre aulas, materiais ou chamadas vencidos. Outros cursos e criação livre continuam sujeitos às regras pedagógicas vigentes, salvo equivalência explicitamente aprovada. Preservar uma publicação no Mural não concede acesso vitalício à aula que a originou.

## 5. Como ficam as telas

### Entrada no menu principal

O menu atual tem **Início, Explorar, Criar, Comunidade e Meu espaço**. A recomendação é acrescentar **Oficinas**, depois de Explorar, como destino principal em `/oficinas`. Na página, usar o título **Oficinas ao vivo** e a explicação “Crie com a professora e sua turma”. Ícone de pessoas, no mesmo traço dos demais, sem linguagem de transmissão pública. [Fonte única da navegação atual](../../packages/community-kids/src/components/kids/nav.ts).

| Nome considerado | Avaliação |
| --- | --- |
| **Oficinas** | Recomendado: curto, concreto e comporta agenda, participação e histórico |
| Oficinas ao vivo | Bom título da página e nome comercial; mais comprido para o menu |
| Criar juntos | Acolhedor, mas se aproxima demais de Criar e pode sugerir um projeto coletivo |

O destino fica visível para assinantes e compradores avulsos. A página oferece **Minha próxima oficina**, **Minhas oficinas** e **Todas as oficinas**. O cartão da próxima mostra projeto, professora, data/fuso, estado e entrada quando disponível. O catálogo reúne todas as oficinas publicadas em um cartão por oficina, com suas turmas disponíveis na página de detalhe. Quem comprou vê a indicação **Você está nesta turma** e sua agenda; quem ainda não comprou conhece as opções, com inscrição e pagamento na área do responsável. Oficinas concluídas levam ao projeto e aos materiais ainda disponíveis pelo prazo de cada aula. Aulas vencidas continuam no histórico, identificadas como **Acesso encerrado**.

Durante a aula, o menu começa recolhido e pode ser reaberto, como na experiência gravada. Entrar no modo de criação não deve esconder os controles essenciais da chamada. Voltar usa **Voltar às oficinas**; uma saída efetiva da sala pede confirmação se houver chamada ou trabalho pendente.

No celular, conservar as cinco abas atuais: **Início, Explorar, Criar, Comunidade e Meu espaço**. Oficinas ganha cartão/atalho no Início e link contextual na página Explorar, consumindo o mesmo destino do menu principal. Explorar continua abrindo diretamente sua página. Não substituir Meu espaço por Mais nem transformar o menu em seis abas automaticamente. Dentro de Oficinas, o título e o retorno identificam a seção, sem acender falsamente outra aba. A sala completa no computador continua sendo o alvo do primeiro ensaio.

### Contrato de identidade visual

Oficinas deve parecer uma área da plataforma desde a listagem até a criação. O vocabulário permanece ligado a aventura, criação, Estúdio, avatar, quarto, turma e Mural. A assinatura visual é a combinação já existente de tipografia infantil, cor escolhida pelo perfil, cartões e atividades de criação; não será criada uma marca ou paleta separada para o ao vivo.

| Superfície | Regra obrigatória | Referência atual |
| --- | --- | --- |
| Lista e detalhe de oficinas | Reutilizar faixas, cabeçalhos, filtros, cartões, estados vazios e botões Kids | [KidsBand](../../packages/community-kids/src/components/kids/kids-band.tsx), [KidsPageHeader](../../packages/community-kids/src/components/kids/kids-page-header.tsx), [KidsTabs](../../packages/community-kids/src/components/kids/kids-tabs.tsx) |
| Fontes e cores infantis | Baloo 2 nos títulos, Nunito no corpo e paleta vigente do perfil; usar os tokens existentes | [Layout Kids](../../packages/community-kids/src/app/layout.tsx), [paletas canônicas](../../packages/ui/src/tokens/palettes.ts) |
| Menu e localização | Mesmo menu lateral, ícones de traço, estado ativo e botão de voltar | [AppSidebar](../../packages/community-kids/src/components/kids/app-sidebar.tsx), [navegação](../../packages/community-kids/src/components/kids/nav.ts) |
| Sala da criança | Aplicar a aparência de aula existente e os componentes de atividade/material; transmissão ocupa a área de explicação | [MainContainer](../../packages/community-kids/src/components/kids/main-container.tsx), [estilos Kids](../../packages/community-kids/src/app/globals.css) |
| Estúdio | Preservar editor, tema próprio, menus e comportamento de expansão | [StudioLesson](../../packages/studio/src/studio/StudioLesson.tsx), [escopo do tema](../../packages/studio/src/studio/theme.tsx) |
| Configuração e condução docente | Preservar o console do admin, fonte Geist, componentes e padrões de formulários atuais | [Layout admin](../../packages/admin/src/app/layout.tsx), [console](../../packages/ui/src/styles/console.css) |

O código atual oferece seis paletas: azul, turquesa, verde, laranja, rosa e roxo. A oficina herda a seleção vigente; não congela azul/rosa nem introduz um modo escuro de reunião. Fundo, cartão, texto, menu, ação e estados usam seus tokens semânticos. Novos controles de participação herdam raios, relevo, foco e espaçamentos do host. A sala docente continua reconhecível como admin; identidade compartilhada não exige vestir o painel adulto com a tipografia infantil.

Para conferir visualmente, comparar aula gravada e sala ao vivo lado a lado com a mesma atividade e paleta. Testar as seis paletas, catálogo em 360 px, tablet em 768 px e sala em 1366×768 e 1440×900, além de zoom de 200%. Ações infantis essenciais têm área de toque de pelo menos 44 px, rótulo compreensível, foco visível e estado textual. Reutilizar um botão pequeno do pacote UI, por si só, não cumpre esse critério. Essa comparação renderizada será um aceite da implementação; ainda não foi executada nesta proposta.

### Criança: espaço para criar

Manter tipografia, cores, botões, cartões, seções, materiais e comportamento de expansão da aula gravada. A estrutura atual já dispõe de conteúdo à esquerda, ferramenta à direita quando há espaço e alternância em larguras menores. A transmissão ocupa o lugar principal da explicação: câmera da professora ou demonstração, com sua câmera pequena quando útil. A criança reconhece o mesmo Estúdio e as mesmas atividades. [Divisão da aula](../../packages/member-shell/src/lib/lesson-split.ts), [player atual](<../../packages/community-kids/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx>).

```text
Oficinas > Cadê, Todo Mundo?     AO VIVO · Professora Ana
┌──────────────────────────┬────────────────────────────────────┐
│ Professora / demonstração│ Experiência ou Estúdio              │
│                          │                                    │
│ Nossa tarefa de agora    │ Blocos / código / jogo              │
│ Fazer aparecer ao clicar │                                    │
│                          │                                    │
│ Pequenas câmeras/avatares │ Meu trabalho salvo                  │
├──────────────────────────┴────────────────────────────────────┤
│ Mão  Microfone  Câmera  Ajuda  Conversa (2)  Materiais  Mais    │
└───────────────────────────────────────────────────────────────┘
Painel recolhível: Conversa | Materiais | Turma
Sua aba está sendo vista pela professora    [Parar compartilhamento]
Em Mais: dispositivos, iniciar compartilhamento; saída identificada
```

A atividade ganha espaço ao expandir; manter a divisória ajustável e as alternativas da aula atual. Em área estreita, alternar **Ver professora / Criar** conservando áudio e os controles. Conversa, materiais e turma abrem um painel de cada vez; não reservar três colunas permanentes que comprimam o Estúdio. Câmeras dos colegas podem recolher; os avatares existentes identificam quem está sem câmera. A própria criança pode esconder sua prévia local sem desligar a câmera, com estados distintos.

Não há barra de avanço, velocidade ou pausa da transmissão. A professora conduz as etapas; a criança vê **Nossa etapa agora** e **Meu trabalho**, sem trocar automaticamente de projeto ou perder alterações ao abrir o chat. **Ir para a etapa da turma** muda de etapa após preservar o trabalho. Durante ajuda, **Ver onde a professora está mexendo** apenas localiza arquivo/bloco/cursor dentro do projeto assistido. Sair desse projeto exige devolver/interromper a ajuda com segurança; não abandonar uma assistência ativa silenciosamente. Não deduzir conclusão de curso ou presença apenas por assistir.

**Som do projeto** é separado do microfone e do áudio da aula. A criança pode desligar música/efeitos do jogo e continuar ouvindo a professora; silenciar o microfone não resolve música local encobrindo a explicação. A proposta inicial é um controle simples no Estúdio, conservando o estado após reiniciar o jogo. Redução automática de volume pode ser avaliada depois.

Proposta revisada para o piloto: **o roteiro publicado da aula fica disponível quando chega a data de liberação dessa aula**. A professora indica a etapa da turma, sem criar outro cadeado por presença ou por vídeo assistido. A criança pode voltar, recuperar uma etapa ou seguir no seu ritmo; requisitos de conclusão da atividade continuam explícitos, separados da navegação. Materiais complementares adicionados durante o encontro só aparecem quando a professora os publica. Aulas futuras continuam bloqueadas pela própria data.

Toda etapa publicada precisa ter uma instrução breve, objetivo e ponto de partida compreensíveis sem depender exclusivamente da fala docente. Isso permite que quem faltou, chegou atrasado ou quer rever continue dentro do prazo. Não é necessário produzir uma explicação gravada separada para cada etapa. O encerramento mostra a criação salva e a orientação de continuidade; a área de mídia apresenta o estado de preparação e, depois, o replay publicado, sem ligar câmera/microfone nem manter fila de mãos ativa.

A chamada e o projeto permanecem montados ao trocar de atividade, abrir materiais, ampliar o Estúdio ou consultar Como Fazer dentro da sala. Isso pede uma estrutura persistente do encontro, não uma chamada montada dentro de cada bloco. Uma navegação externa efetiva avisa sobre a saída. Materiais e tutoriais internos abrem em painel/visualizador da sala quando compatíveis.

Expandir o Estúdio deve conservar microfone, mão, ajuda, estado do compartilhamento e **Parar ajuda** acessíveis. Integrar os controles ao mesmo sistema de foco e sobreposições da aula atual; aumentar apenas o z-index pode deixar botões visíveis, mas inalcançáveis pelo teclado. Um diálogo de confirmação fica acima e recebe o foco; ao fechar, devolve-o corretamente. A mídia e o projeto não remontam nessa operação.

### Estados que a criança precisa reconhecer

| Situação | Mensagem/ação | O que permanece disponível |
| --- | --- | --- |
| Aula futura | Libera em… | Agenda e preparação dos dispositivos, sem conteúdo antecipado |
| Chegou a data, professora ainda não abriu | Aguardando a professora | Conteúdo já liberado; nenhuma chamada aberta automaticamente |
| Pediu entrada | Aguardando sua entrada | Teste local e criação; ainda não recebe áudio, câmera, tela ou chat da turma |
| Admitida na chamada | Ao vivo | Participação conforme permissões e acompanhamento docente |
| Rede da criança falhou | Reconectando… | Trabalho local preservado; só indicar Salvo na conta após confirmação |
| Professora desconectou | A professora está reconectando | Criação e salvamento; comunicação coletiva suspensa após detecção confirmada |
| Chamada encerrada, gravação em processamento | Gravação sendo preparada · Continuar criação | Atividades, materiais e projeto; sem chamada ou fila ativa |
| Replay publicado, prazo válido | Rever aula · Continuar criação | Vídeo com pausa/retomada e os mesmos materiais e projeto da criança |
| Problema na gravação | Gravação indisponível no momento | Atividades e projeto preservados; prazo de solução informado pela equipe |
| Prazo venceu | Acesso encerrado | Agenda/histórico e publicações conforme regras próprias; sem reabrir aquela aula |

Reconectar recupera etapa local, revisão confirmada, admissão e permissões vigentes. Não liga dispositivos automaticamente. Se a professora não retornar dentro da tolerância operacional, encerrar a mídia, preservar a criação e informar o próximo passo. A tolerância precisa ser ensaiada; não deixar a sala aberta indefinidamente esperando.

Proposta de uso em dois aparelhos: uma participação ativa por criança/encontro. A segunda entrada mostra **A oficina está aberta em outro aparelho — Continuar aqui**. Confirmar a troca preserva admissão e projeto, encerra a participação anterior e resolve uma ajuda pendente antes de permitir nova edição. Não duplicar a criança no mosaico nem ligar dispositivos no aparelho novo. A superfície auxiliar de demonstração da professora pertence à sua condução e não é uma segunda criança.

Se os controles da sala perderem conexão com o servidor enquanto o áudio ainda chega, mostrar **Estamos recuperando os controles da sala**. Não apresentar silenciamento ou encerramento como concluídos sem confirmação. Suspender novas intervenções e comunicação conforme a tolerância operacional, preservando trabalho local e indicando quando o salvamento na conta também estiver indisponível.

### Gravação e experiência de rever a aula

**Escolha confirmada pela dona: professora e demonstração do projeto.** O replay contém a voz/câmera da professora e a superfície de demonstração preparada para a aula. Câmeras, vozes, nomes, chat, mosaico de acompanhamento e telas individuais das crianças ficam fora da gravação. Uma apresentação de aluno durante a chamada não muda essa regra. Gravar o painel inteiro da professora não atende ao requisito.

No espaço onde estava a transmissão, aparece **Gravação sendo preparada** e, depois da publicação, o vídeo. O restante da aula conserva roteiro, materiais e Estúdio. No replay há pausa, avanço, volume e retomada de onde parou; somem mão levantada, microfone, câmera e controles exclusivos da chamada. Assistir novamente não reinicia a atividade, não substitui o projeto salvo e não aciona comandos antigos de edição/setas na interface atual. O cursor e as explicações que estavam na demonstração aparecem como parte do vídeo.

A professora deve reformular uma dúvida antes de responder — “Como mudar a cor do personagem?” — para a explicação continuar compreensível sem a voz da criança. Proposta: ao iniciar atendimento individual, interromper a captura e confirmar esse estado; ao voltar à explicação coletiva, retomar em novo segmento. A demonstração permanece isolada do projeto assistido. Conferir os trechos antes de publicar, evitando que atendimento particular, nomes e dados pessoais entrem no replay. A aula pode apresentar os segmentos em sequência sem exigir edição completa de cada encontro.

O replay reúne **explicações e demonstrações da professora**; sua duração pode ser menor que a do encontro, por excluir ajuda individual e apresentações infantis. Não vender esse formato como filmagem integral da sala. Antes de encerrar, a professora retoma os passos essenciais e as dúvidas em demonstração própria, para o faltante conseguir acompanhar o roteiro. Pausar a gravação não cria uma conversa reservada: no piloto, a turma continua ouvindo a orientação por voz.

**O prazo continua sendo o da aula.** Exemplo: encontro liberado em 07/11/2026 às 14h, com 30 dias, vence em 07/12/2026 às 14h. Se o vídeo ficar pronto em 08/11, poderá ser visto até 07/12 às 14h; a publicação não reinicia a contagem. A aula de 14/11 mantém seu próprio vencimento, em 14/12. A oferta precisa explicar “gravação disponível após processamento, até a data de encerramento desta aula”.

Proposta operacional: publicar até 24 horas após o encontro, após conferir áudio, demonstração e ausência de conteúdo infantil. Esse é um objetivo a validar no piloto, não um prazo já garantido pelo fornecedor. Se houver atraso relevante ou perda da gravação, avisar a família e aplicar solução registrada: nova explicação da professora, reposição ou prorrogação do acesso afetado conforme a política da oferta. Não trocar silenciosamente a data de início nem manter indefinidamente a mensagem de processamento.

No admin, cada encontro ganha **Gravação**: status de captura/processamento, duração, prévia, conferência, publicar, retirar de publicação e substituir arquivo. Iniciar a aula dispara a captura configurada; só mostrar **Gravando professora e demonstração** após confirmação. A professora recebe alerta se a captura falhar. Publicação fica sob conferência da equipe na primeira versão; não exige editar toda aula. O upload de uma explicação substituta reutiliza as validações de mídia, com acesso da mesma turma e prazo original.

Replay é da **aula daquela turma**. Duplicar uma oficina ou criar turma nova não copia gravações nem libera vídeos de outras crianças/turmas. A gravação não vai ao Mural: o que vai ao Mural é o projeto publicado pela criança. Assinar depois permite os benefícios da assinatura, sem tornar os replays das oficinas vitalícios.

### Participação: falar, ouvir e pedir ajuda

| Recurso | Experiência da criança | Controle da professora |
| --- | --- | --- |
| **Levantar a mão** | Alterna para Abaixar minha mão; mostra que o pedido foi recebido | Vê ordem de chegada; convida para falar; abaixa uma mão ou todas |
| **Microfone** | Entra desligado; liga com ação própria quando a fala estiver liberada | Silencia uma criança/todas, mantém microfones bloqueados ou libera turnos |
| **Câmera** | Pode ligar/desligar; enxerga a prévia e quem a vê; avatar quando desligada | Pode interromper uma câmera e restringir seu uso na sessão; não liga pela criança |
| **Pedir ajuda** | Sinaliza dificuldade no projeto, sem ter de disputar a vez de falar | Fila separada, com abrir projeto, orientar e solicitar edição autorizada |
| **Conversa** | Chat da turma e avisos; badge discreto de mensagens não lidas | Publica/fixa recado, remove mensagem e pausa a conversa da turma ou de um participante |
| **Materiais** | Encontra arquivos, referências e tutoriais da etapa/oficina | Configura antes, libera durante e destaca o material para a turma |

**Mão levantada e pedido de ajuda são diferentes.** Abaixar mãos não apaga pedidos de ajuda, mensagens ou tarefas. A criança também pode abaixar a própria mão; convidá-la para falar informa o nome e oferece **Ligar meu microfone**. Encerrar a vez retira sua permissão de fala no modo por turnos. Ela pode recusar ou continuar sem microfone e usar a conversa.

A professora tem três modos simples: **Conversa livre** (cada criança pode ligar seu microfone), **Falar por vez** (somente quem teve a vez liberada) e **Hora de ouvir** (microfones infantis fechados; mão e ajuda continuam acessíveis). Liberar a fala autoriza o dispositivo, mas não o ativa remotamente.

Há duas ações distintas: **Silenciar agora**, que desliga o áudio atual sem mudar o modo da sala, e **Manter microfone fechado**, que impede reativação até a liberação docente. **Silenciar turma** não desliga a professora. O silenciamento pontual atua em quem está conectado; o modo coletivo persiste e também se aplica a quem entra depois. Bloqueio individual permanece até liberação individual explícita, mesmo ao voltar para Conversa livre. A sala informa com texto a diferença entre “Seu microfone está desligado” e “A professora vai chamar sua vez”. Bloqueios continuam após reconexão; não dependem apenas de esconder o botão.

**Abaixar mão** fica no cartão/menu de cada criança; **Abaixar todas as mãos** fica no cabeçalho da fila. O comando coletivo limpa os pedidos existentes quando é aplicado; uma nova mão levantada depois entra normalmente. Não silencia automaticamente quem já está falando: **Encerrar vez** é uma ação distinta. Evitar confirmações repetitivas para essas ações reversíveis; mostrar o resultado imediatamente.

No piloto, os colegas veem as câmeras voluntariamente ligadas e ouvem a fala autorizada. As telas de trabalho continuam visíveis somente à professora, salvo apresentação aceita pela criança. Câmera desligada não bloqueia a atividade. Entrada tem teste de áudio, câmera e compartilhamento, estados de permissão negada e um caminho para continuar com os recursos disponíveis.

O bloqueio real de áudio precisa ser provado além do estado visual do botão. No caminho Cloudflare SFU, traduzir a política para controle de publicação e fechamento de trilhas, com reconciliação; na alternativa Daily há comandos prontos de participante. [Cloudflare — operações de mídia](https://developers.cloudflare.com/realtime/sfu/api/), [referência alternativa Daily](https://docs.daily.co/reference/daily-js/instance-methods/update-participant).

### Câmera: desfoque e troca de fundo

Oferecer **Fundo da câmera** na preparação antes da entrada e no menu junto do botão Câmera, tanto para a criança quanto para a professora. Três escolhas: **Sem efeito**, **Desfocar fundo** e **Fundos do Sistema Zero**. Usar prévia local com indicação “Só você está vendo”; preparar a câmera não começa a transmiti-la. Aplicar o efeito antes de habilitar o envio à turma, sempre por ação da pessoa.

Recomendo começar com desfoque e uma pequena seleção de imagens estáticas do Sistema Zero, com cores e ilustrações do universo visual existente, sem animações. O seletor usa componentes, foco e paleta do host. No piloto, o catálogo é preparado pela equipe; imagens enviadas livremente por alunos ficam para uma evolução. Alternativas consideradas: apenas desfoque reduz o trabalho, mas não atende à troca solicitada; upload livre dá mais personalização, com mais configuração e validação. O catálogo pequeno atende ao pedido mantendo a escolha simples.

Lembrar somente o efeito e o identificador do fundo por perfil/aparelho; ao mudar de perfil, recuperar a preferência correspondente sem ligar a câmera. A professora pode interromper a câmera conforme a política da sala, mas não retirar remotamente o fundo escolhido pela criança. Trocar efeito não muda microfone, admissão ou permissão de câmera. Não alterar a tela compartilhada nem o Estúdio.

O recurso deve respeitar capacidade e desempenho. Na arquitetura atual, avaliar processamento local com MediaPipe e detecção de recursos do navegador, sem depender de Daily. A matriz inicial continua centrada no computador; suporte móvel exige ensaio próprio. Na alternativa Daily, a documentação limita esses efeitos a navegadores de computador; essa limitação não deve ser generalizada para toda implementação. [MediaPipe web](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter/web_js), [alternativa Daily](https://docs.daily.co/reference/daily-js/static-methods/supported-browser).

Se houver falha do efeito, pausar o envio da câmera, manter áudio/atividade e oferecer **Tentar novamente** ou **Ligar sem efeito**. Não revelar o ambiente real automaticamente. Em equipamento sobrecarregado, sugerir câmera desligada ou simplificar o efeito após escolha local; desempenho do áudio, Estúdio e compartilhamento tem prioridade. Desfoque não é garantia de ocultação perfeita, especialmente com movimento e iluminação difícil.

Na gravação, a câmera da professora deve conservar o efeito aplicado e a demonstração permanecer legível; incluir isso na prova do arquivo final. As câmeras infantis continuam fora do replay. A configuração e os testes entram no escopo de sala/dispositivos e na reestimativa, sem exigir programa externo.

### Conversa da turma e materiais da aula

O chat pertence ao encontro, mostra nome/avatar da plataforma e identificação da professora. Entra na primeira versão com texto, pequenos emojis, mensagens fixadas e cartões de materiais. Não exigir leitura do chat para entender a tarefa: instruções importantes também aparecem na área da atividade e são explicadas em voz.

Para a primeira versão, uma conversa coletiva moderada e pedidos de ajuda direcionados à professora atendem à turma. Não abrir mensagens privadas entre crianças. Pausar o chat bloqueia novas mensagens das crianças, mas mantém avisos da professora, leitura do histórico e o botão de ajuda. Remover uma mensagem retira seu conteúdo para todos; o registro mínimo de moderação fica restrito à equipe. Nenhum anexo ou link arbitrário enviado por criança é necessário para a oficina.

O histórico reaparece após reconexão e para inscritos que entram atrasados. Proposta de retenção: até 30 dias após o encerramento daquela realização da chamada, informada à família; expiração/exclusão conforme política final. A leitura infantil também exige acesso válido à aula: retenção não estende o prazo comercial. A conversa encerra novos envios quando a chamada termina; uma reposição tem conversa própria, sem reabrir a anterior. Materiais e atividades seguem a janela da aula; o chat não vira um canal permanente da comunidade.

**Materiais é a fonte organizada dos arquivos.** Reaproveitar o bloco atual: a autora coloca PDFs, imagens, arquivos e links aprovados nas seções do roteiro. O painel Materiais reúne os itens liberados, por etapa, e o chat pode ter um cartão **Abrir material** apontando para o mesmo item. Assim, entrar atrasado ou perder uma mensagem não impede achar o arquivo. [Bloco de materiais existente](../../packages/member-shell/src/components/materials-block.tsx).

Se precisar disponibilizar algo durante o encontro, a professora usa **Adicionar material**, escolhe título/arquivo, confere e libera; depois compartilha o atalho na conversa. Esse acréscimo é um material complementar do encontro, sem alterar silenciosamente o roteiro publicado. Projeto inicial e recursos usados pelo Estúdio devem ser preparados na atividade, evitando downloads/importações manuais desnecessários. Depois da oficina, os arquivos continuam acessíveis pelo prazo informado na oferta.

### Professora: visão da turma e ajuda individual

```text
Turma · 8 presentes       Atividade: criar o clique     Encerrar
┌──────────────────┬──────────────────┬──────────────────┐
│ Ana · criando    │ Bia · pediu ajuda│ Caio · testando   │
│ tela compartilhada│ tela compartilhada│ tela compartilhada│
├──────────────────┼──────────────────┼──────────────────┤
│ Davi · salvando  │ Eva · etapa 2    │ Fê · reconectando │
│ tela compartilhada│ tela compartilhada│ última imagem     │
└──────────────────┴──────────────────┴──────────────────┘
Roteiro | Mãos levantadas (3) | Pedidos de ajuda (1) | Conversa
Silenciar turma | Modo de fala | Abaixar todas as mãos | Materiais

Ao selecionar Bia:
tela ampliada | abrir projeto | apontar | solicitar ajuda com edição
```

O painel pode mostrar oito cartões; o desenho acima ilustra seis. Nome, avatar, etapa, situação do salvamento, compartilhamento, mão levantada, câmera/microfone e pedido de ajuda identificam cada criança. Cor sempre acompanhada de texto/ícone. Cada cartão tem uma ação principal contextual e um menu com **Silenciar**, **Manter microfone fechado**, **Liberar fala**, **Abaixar mão** e **Ajudar no projeto**; não mostrar cinco botões completos em cada um dos oito cartões. No cabeçalho ficam **Silenciar turma**, modos de fala, **Abaixar todas as mãos** e controle da conversa. A professora permanece audível durante esses comandos.

O admin precisa de um **modo de condução** que permita recolher o menu e ampliar a área útil, preservando seu tema e componentes. O mosaico ajuda a perceber situações; a tela selecionada é ampliada para ler e orientar. No atendimento individual, participantes e filas continuam acessíveis. Há no máximo um atendimento com edição ativo por professora; antes de assumir outro, devolver o anterior com salvamento confirmado. Apenas olhar outro cartão não transfere controle nem deixa outra criança bloqueada.

**Ajudar no projeto** coordena pedido/aceite, confirmação de que a gravação está inativa, checkpoint e transferência de edição. Se já estiver pausada, não exige outra interrupção. A criança continua autora enquanto os pré-requisitos não estiverem prontos. Uma falha cancela a transferência pendente e oferece recuperação, sem deixar a criança travada; se a gravação já parou, também oferece retomá-la. Durante a ajuda, mostrar **Ajudando Bia · Fora da gravação · A turma continua ouvindo** somente quando esse estado estiver confirmado. Ao devolver, destacar **Voltar à explicação gravada**, que confere a demonstração e confirma a retomada; não exigir que a professora administre jobs ou segmentos manualmente.

Executar o jogo de uma criança não pode congelar os controles da professora. O preview atual compartilha processamento com o host; mesmo uma única execução pesada pode afetar a sala. Isolar e ensaiar a execução em relação à chamada/moderação é condição do piloto, também na sala infantil. Não executar automaticamente o projeto ao inspecionar ou receber revisão. Um editor por professora reduz carga, mas não resolve esse risco sozinho.

“Sem alterações há dois minutos” não significa “não está prestando atenção”. A criança pode estar ouvindo, pensando ou testando. O painel oferece sinais concretos à professora, sem classificar comportamento automaticamente.

A professora vê as telas; os outros alunos não as recebem por padrão. Para mostrar um projeto à turma, há uma ação separada de apresentação, com aceite da criança e indicação de quem verá. A superfície apresentada deve conter somente a demonstração/projeto, sem mosaico docente, pedidos individuais ou dados da família. A prova técnica precisa validar uma superfície de demonstração isolada; compartilhar a aba inteira do admin não atende ao requisito. Encerrar a apresentação retira a permissão coletiva temporária.

Quando atende uma criança, a professora continua vendo os alertas de mãos, conexão e ajuda da turma. O chat coletivo e as falas continuam seguindo o modo escolhido. A ajuda no projeto não cria uma conversa de áudio privada automaticamente; a sala informa quem ouve. No piloto, orientar por voz é audível à turma. Uma sala privada de apoio com outro docente pode ser evolução posterior, sem esconder essa limitação.

Controles adicionais da condução: admitir inscritos, fechar novas entradas temporariamente, remover participante com impedimento de reentrada naquele encontro e encerrar a sala para todos. Remover/encerrar pede confirmação; silenciar/abaixar mão não. Quem chegou atrasado pode aguardar admissão sem perder a inscrição. Admissão é individual e recuperável: a criança já admitida não precisa disputar a entrada novamente a cada queda, salvo remoção/revogação. Na ausência da última professora, suspender novas admissões, falas/câmeras entre crianças e escrita no chat; a criação individual continua disponível pelo prazo contratado.

### Administração: preparar a oficina e conduzir o encontro

O admin já separa **Configuração**, **Sala do Professor** e **Gestão**. Acrescentar duas entradas para as mesmas entidades, com funções distintas: **Configuração → Oficinas ao vivo** (`/admin/oficinas`) para preparar o produto e **Sala do Professor → Ao vivo** (`/admin/professor/ao-vivo`) para agenda e condução. Não duplicar cadastro ou turmas. Preços/ofertas permanecem vinculados ao Catálogo existente. [Navegação atual do admin](../../packages/admin/src/components/admin/nav.ts).

| Área de configuração | Conteúdo |
| --- | --- |
| Apresentação | Nome, capa, descrição, faixa etária indicada, pré-requisitos, projeto final e informações para a família |
| Roteiro | Etapas e duração sugerida, experiências, Estúdio/projeto inicial, quiz opcional, materiais e notas privadas da professora |
| Turmas e encontros | Professora designada, limite de 6–8, data/horário de cada aula, fuso, duração da chamada, liberação e vencimento calculados, inscritos e presença |
| Participação | Modo inicial de fala, câmera disponível/opcional, chat, compartilhamento, materiais liberados e política de entrada |
| Acesso e oferta | Benefícios, dias de acesso por aula, produto/oferta do Catálogo, condições de Mural e inscrição administrada no piloto |
| Revisão e publicação | Salvar rascunho, validar, pré-visualizar como criança, ensaiar a sala e publicar |

No editor, a explicação principal pode ser **Ao vivo**, sem exigir upload de vídeo. Reaproveitar os construtores de seções, atividades e materiais, adaptando sua identidade à oficina. Vídeos gravados continuam opcionais como apoio; a ausência deles não impede publicar o encontro.

Oficina é o conteúdo reutilizável; turma reúne crianças e calendário; encontro é a aula de uma data. Uma oficina pode ter várias turmas. **Nova turma** reaproveita o roteiro e permite preencher todas as datas, inclusive a partir de um padrão semanal com revisão antes de confirmar. **Duplicar configuração da turma** copia sequência, intervalos e capacidade, sem copiar alunos, pagamentos, mensagens ou progresso. Publicar fixa a versão do roteiro para cada encontro, e editar o modelo não substitui o trabalho das crianças nem muda uma aula em andamento. A prévia usa dados fictícios e não cria presença, compra ou progresso infantil real.

Dentro da oficina, mostrar **Turmas abertas, Em andamento, Encerradas e Canceladas**. Cada turma tem **Inscritos**, com perfil infantil, responsável e situação da inscrição para a administração autorizada; a professora recebe somente os dados necessários à condução. O histórico preserva datas, versão aplicada, participantes e projetos vinculados. Repetir a oficina cria nova turma; reagendar corrige uma turma existente e exige tratamento explícito dos participantes já inscritos.

**Agendar reposição** cria uma nova ocorrência de chamada vinculada à mesma aula. Preserva data, presença e gravação da ocorrência interrompida. A nova chamada precisa de autorização operacional e eventual prorrogação registrada do acesso; não reinicia 30 dias automaticamente. A criança vê claramente qual é a data da reposição e qual é o vencimento vigente.

O projeto no histórico docente é a revisão entregue/registrada naquele encontro. A professora não continua acompanhando o rascunho atual da criança fora da aula. Calendário também informa duração prevista da chamada, limite operacional e eventual prorrogação: o prazo de 30 dias do conteúdo não mantém a videoconferência aberta. A prévia de aluno usa a aparência Kids real em contexto de ensaio, separada dos dados da turma.

Em **Sala do Professor → Ao vivo**, a docente encontra Hoje, Próximos e Encerrados, revisa o roteiro/material, testa dispositivos e clica **Preparar sala / Iniciar encontro**. Configurações avançadas do fornecedor pertencem à administração da plataforma, sem exigir que a professora copie tokens, links externos ou chaves técnicas.

## 6. O que significa ver continuamente

Existem duas fontes complementares:

| Fonte | O que mostra | Limitação |
| --- | --- | --- |
| Compartilhamento da aba/janela/tela | O que aparece visualmente na superfície escolhida, incluindo blocos, cursor e menus | A pessoa precisa iniciar e pode parar; compatibilidade depende do navegador |
| Observação do projeto | Documento atual, modo, etapa, salvamento, checagens e miniatura do jogo | Não reproduz cada gesto nem outras partes do computador |

Proposta de recorte inicial: compartilhar a **aba do Sistema Zero**, com prévia local antes do envio. Se escolher janela/monitor, orientar a selecionar a aba e não publicar essa captura no piloto. A interface informa a superfície efetivamente escolhida; texto “aba do Sistema Zero” não pode ser usado quando essa origem não foi verificada. Validar no navegador alvo como reconhecer a própria aba; enquanto não for possível confirmar, oferecer nova escolha e acompanhamento do projeto sem imagem. O seletor do navegador não se torna restrito só porque a aplicação recomenda uma aba.

O navegador exige ação do usuário e nova permissão para iniciar captura; não se pode prometer que o professor liga o compartilhamento silenciosamente. Depois de autorizado, o fluxo pode permanecer contínuo durante a aula até ser encerrado ou interrompido. [Documentação de captura de tela — MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia).

Se o compartilhamento parar, o cartão muda para **Tela não compartilhada**. O acompanhamento pedagógico autorizado dentro da oficina continua, com horário da última atualização. Uma miniatura antiga nunca deve aparecer como se fosse uma transmissão atual.

O Estúdio já captura JPEG 320×192 do jogo para sua capa. Essa imagem não contém Blockly, código ou o restante da interface e pode parar de atualizar quando há capa escolhida. Ela serve de base para uma observação auxiliar, não substitui o compartilhamento solicitado.

Para oito telas, receber qualidade reduzida no mosaico e qualidade maior na selecionada, quando o dispositivo suportar os perfis ensaiados. Reduzir apenas o tamanho do cartão não reduz o tráfego recebido. Em rede limitada, priorizar voz e demonstração, reduzir câmeras voluntárias e a frequência/qualidade das telas, avisando sobre a redução; miniatura antiga nunca representa acompanhamento contínuo. O ensaio mede legibilidade, CPU, memória e rede em computadores comuns, incluindo o custo de publicar mais de uma qualidade. Não montar oito Estúdios completos nem executar oito projetos para produzir o painel.

## 7. Ajuda com edição: primeira versão

O botão da professora será **Ajudar no projeto**. A criança recebe:

> A professora Ana quer ajudar neste projeto. Enquanto ela mexe, você acompanha. Você pode parar a ajuda quando quiser.

Após o aceite, o sistema salva uma versão de segurança, pausa a edição da criança e transfere temporariamente a autoria daquele projeto. A professora pode mover blocos, editar código e testar sua versão. A criança acompanha as revisões aceitas, com **Parar ajuda** sempre disponível.

Ao devolver, o sistema confirma a última versão salva e libera a criança sobre esse mesmo projeto atualizado. Se a conexão cair, retoma a última revisão confirmada; alterações ainda não enviadas permanecem recuperáveis, sem sobrescrever trabalho mais novo.

**É edição do mesmo projeto lógico, feita dentro do Sistema Zero.** Não é clicar remotamente em qualquer botão do navegador da criança. Também não é permitir que as duas pessoas escrevam simultaneamente: a primeira versão tem um autor por vez.

O compartilhamento de tela mostra gestos; a sincronização do projeto transmite as alterações aceitas. A professora pode demonstrar seu próprio Estúdio enquanto ajuda. O teste do jogo no computador da professora é outra execução: não preserva automaticamente a partida, as teclas ou o estado temporário do jogo no computador da criança.

A primeira versão cobre edição no Estúdio e condução das atividades do encontro. A professora não recebe acesso à conta dos pais, compras, troca de perfil ou publicações sem confirmação. Controle de outras ferramentas, como Pinta, exige adaptar seu próprio contrato de edição; não será considerado pronto porque o Estúdio funciona.

O CodeHS oferece modos distintos de leitura, observação e colaboração; sua documentação também registra limitações de colaboração em programas de blocos. É uma referência de produto, não evidência de que Blockly já suporte esse comportamento no Sistema Zero. [CodeHS — Assignment Collaboration](https://help.codehs.com/en/articles/8923090-assignment-collaboration).

### Cursor da professora e recursos para explicar

Durante a intervenção, a criança vê um cursor com cor distinta, contorno e rótulo **Professora Ana**. O cursor local continua reconhecível. A identificação não depende só da cor; acompanha o aviso de ajuda e desaparece quando a autorização termina. O cursor é uma indicação dentro do aplicativo, não o ponteiro do sistema operacional.

Uma pequena barra docente oferece:

| Recurso | Como a professora usa | O que aparece para a criança |
| --- | --- | --- |
| Apontar | Seleciona um alvo ou move o apontador na área compartilhada do projeto | Cursor identificado ou marcador temporário |
| Destacar botão | Escolhe “Executar”, “Salvar”, “Pedir ajuda” ou outro alvo cadastrado | Contorno, seta e texto curto no botão correspondente |
| Destacar bloco/código | Seleciona um bloco do projeto observado ou um trecho de código | Realce no elemento correspondente àquela revisão |
| Mostrar para todos | Envia um destaque comum à turma ou a um grupo selecionado | Cada navegador localiza o alvo em seu próprio layout |
| Limpar orientação | Encerra a explicação visual | Remove setas, realces e cursor temporário |

Exemplo: a professora escolhe **Destacar → Executar → Toda a turma**. Cada criança recebe a seta no seu botão Executar, ainda que o botão esteja em outra posição devido à largura da tela. Isso deve funcionar por identificação do elemento, não por coordenadas copiadas do computador da professora.

Se o botão estiver num menu fechado, mostrar uma orientação para abrir o menu; se o aluno estiver em outra atividade, indicar à professora que o alvo não está disponível. Não mostrar setas em lugares errados, mudar a atividade silenciosamente nem clicar pela criança. Os destaques expiram e respeitam a preferência de movimento reduzido.

**Cursor identificado e destaques em alvos essenciais entram na V1.** Desenho livre sobre a tela, seleção arbitrária de qualquer elemento e realces dentro de qualquer jogo ficam para expansão. O módulo de orientação funciona sem tomar a autoria do projeto: apontar um botão não precisa bloquear a criança.

## 8. Conteúdo: aproveitar o que já foi produzido

Criar um **roteiro de oficina** com etapas e materiais selecionados da biblioteca atual. Cada etapa fixa a revisão de origem, o projeto inicial e o objetivo. A versão usada num encontro não muda quando alguém reedita o curso gravado.

Exemplo de roteiro para um primeiro piloto com Cadê, Todo Mundo?:

| Momento | Ação | Recurso reaproveitado |
| --- | --- | --- |
| Chegada | Reconhecer perfil/avatar e conferir acesso | Identidade e preparação |
| Experimentar | Brincar com um exemplo e perceber o clique | Atividade interativa/jogo preparado |
| Construir | Fazer o personagem aparecer ou desaparecer | Estúdio e materiais do Cadê |
| Personalizar | Mudar uma escolha do projeto | Assets e ferramentas já compatíveis |
| Testar e ajudar | Conferir o resultado e corrigir com a professora | Checagens e edição assistida |
| Compartilhar | Nomear, publicar e abrir o jogo no Mural | Publicação existente |

Não é necessário reproduzir toda a sequência do curso gravado. A explicação ao vivo substitui o momento expositivo previsto no roteiro da oficina; a conclusão continua baseada em atividade/evidência, não em presença ou em falsificar minutos assistidos.

Começaria com **um projeto e uma configuração de turma**. Depois adaptaria Farol, cujo material pode ser publicado especificamente para oficinas mesmo sem a série de vídeos pronta. Encontros seguintes podem continuar a criação anterior por uma regra explícita do roteiro, sem sobrescrever as evidências do encontro passado.

Avatar e quarto podem fazer parte da preparação ou de um encontro de boas-vindas. Não consumir a maior parte de uma oficina curta com configuração de conta: a preparação deve ser testada antes.

## 9. Produto, assinatura e acesso

| Recurso | Só oficina | Só assinatura | Oficina + assinatura |
| --- | --- | --- | --- |
| Perfil, avatar, quarto, Como Fazer | Incluídos na experiência da oficina | Conforme acesso atual da comunidade | Mesmo perfil e progresso |
| Entrar no encontro | Apenas turma/horário comprado | Exige vaga, salvo evento expressamente incluído | Vaga da oficina |
| Atividades e projeto da oficina | Incluídos, independentemente dos vídeos | Conforme cursos/atividades contratados | Ambos os direitos |
| Publicar projeto da oficina no Mural | Incluído, pelas regras normais de publicação | Conforme política atual | Mesmo fluxo de publicação |
| Editar esse projeto após encontro | Dentro da janela da aula: data agendada + dias da oferta | Conforme direito do plano; não implica inscrição | Janela da aula; continuidade em Criar pelo plano se elegível |
| Criar livremente/outros cursos | Não concedidos automaticamente por uma vaga | Conforme plano e jornada vigente | Conforme plano e jornada vigente |
| Outra oficina | Compra avulsa | Compra avulsa ou benefício explicitamente previsto | Compra avulsa ou benefício previsto |

Propor uma capacidade de acesso de **participante de oficina**, sem confundi-la com visitante do desafio gratuito nem com assinatura completa. O desenho exato dos gates está no anexo técnico.

O Mural possui uma chave de acesso completo (`mural-dos-criadores`) e outra de visitante. A oficina deve conceder o acesso completo previsto na oferta e uma elegibilidade de publicação específica para seu projeto. O fluxo avulso atual exige Estúdio Completo; liberar esse produto apenas para contornar o bloqueio seria conceder direitos além da oficina. A solução é acrescentar uma origem de publicação da oficina no mesmo pipeline. [Acesso do Mural](../../packages/hub/src/application/access/access-resolution.service.ts), [publicação atual](../../packages/hub/src/application/showcase/showcase.service.ts).

O catálogo pode oferecer um encontro, uma sequência de encontros ou uma turma fechada. Todos usam o mesmo módulo. A capacidade é por criança, não por número de perfis permitido na conta.

### Uma oficina, várias turmas, acesso contado por aula

```text
Oficina: Cadê, Todo Mundo?                 cadastro do conteúdo
├─ Turma de novembro · sábados · 14h       inscrições próprias
│  ├─ Aula 1 · 07/11/2026                 janela própria de acesso
│  └─ Aula 2 · 14/11/2026                 janela própria de acesso
└─ Turma de dezembro · sábados · 10h      outras inscrições
   ├─ Aula 1 · nova data                  mesmo roteiro reutilizado
   └─ Aula 2 · nova data
```

A oferta informa quantos dias cada aula fica acessível e quais aulas estão incluídas na inscrição. No piloto, a compra reserva uma vaga na turma e inclui seu conjunto de encontros; a liberação continua individual por aula. Vender vagas avulsas em encontros de uma sequência exigiria uma regra adicional de lotação e não deve acontecer implicitamente.

Exemplo com **30 dias por aula**, no horário de Brasília:

| Aula da mesma turma | Libera em | Acesso termina em |
| --- | --- | --- |
| Aula 1 | 07/11/2026 às 14h | 07/12/2026 às 14h |
| Aula 2 | 14/11/2026 às 14h | 14/12/2026 às 14h |

As datas de fim são o instante de encerramento, sem um dia extra. Recomendo usar data **e horário**, visíveis à família; “liberar no dia” não deve deixar indefinido se começa à meia-noite ou no horário da aula. O horário agendado é o padrão proposto. Se a operação quiser acesso desde o começo do dia, configurar essa hora explicitamente e usar a mesma referência para contar o prazo.

Antes da liberação, a criança vê título, agenda e **Libera em 14/11 às 14h**, mas não entra nas atividades, materiais ou Estúdio daquela aula. O teste de dispositivos e a preparação familiar ficam fora do conteúdo bloqueado. Ter acesso à primeira aula não libera antecipadamente a segunda.

Durante a janela, **Ao vivo agora** identifica a chamada aberta no horário permitido. Depois aparecem **Rever aula**, quando a gravação foi publicada, e **Continuar criação**, para atividades, materiais e projeto. Enquanto o vídeo é preparado, a criação permanece disponível. Trinta dias de acesso não mantêm a chamada aberta; o replay também termina na data de vencimento da aula. Quando o prazo vence, mostrar **Acesso encerrado**, conservando a agenda e o histórico.

Recomendações para casos especiais: uma compra tardia usa a data original e mostra o tempo restante antes de pagar; não reinicia 30 dias sem oferta explícita. Antes de chegar a data de liberação, reagendar pode recalcular início/fim e deve comunicar a família. Depois que o conteúdo já foi liberado, preservar esse acesso mesmo se a professora ainda não iniciou a chamada; a nova data passa por reposição/prorrogação registrada, sem recolher o direito existente. Falta da criança não reinicia o prazo. Não se altera uma turma encerrada para receber novos alunos.

O prazo fecha novos acessos pela plataforma. Arquivos que a família já baixou não podem ser recolhidos, e cópias locais não equivalem a um acesso renovado ao serviço. Links temporários de materiais não devem ultrapassar o vencimento da aula. Na compra, congelar calendário, turma, quantidade de vagas e condições aceitas antes de aguardar a confirmação do pagamento.

Se várias aulas continuarem o mesmo projeto, uma aula atualmente válida pode dar acesso à criação compartilhada entre elas, sem reabrir os materiais e a execução de uma aula vencida. Se os projetos forem diferentes, cada um respeita a aula de origem. A política é conferida pelo servidor, inclusive em links diretos e ao salvar, não apenas pela cor do cartão.

A assinatura entra como continuidade concreta: “Seu projeto já está aqui; você pode continuar criando e conhecer as próximas atividades”. O convite aparece para os pais após a experiência, junto do resultado real. Não há conversão automática de compra avulsa em cobrança recorrente.

Para assinantes, o valor da oficina é o projeto especial, a turma e a ajuda da professora. Desconto, prioridade de inscrição ou evento incluído podem ser testados depois; não embutir aulas individuais ilimitadas no preço atual sem calcular horas docentes.

## 10. Escolha técnica e fornecedores

Três caminhos foram considerados:

| Caminho | Vantagem | Limitação | Parecer |
| --- | --- | --- | --- |
| Chamada externa + plataforma aberta | Permite ensaiar conteúdo rapidamente | Experiência fragmentada; não entrega o painel e a edição integrados | Contingência/ensaio, não o produto final |
| Sala própria + fornecedor de áudio/vídeo | Mantém a experiência no Sistema Zero e reaproveita mídia pronta | Exige implementar turma, observação e autoria assistida | **Recomendado** |
| Construir/operar infraestrutura de vídeo e colaboração geral | Máximo controle da infraestrutura | Mais operação, compatibilidade, rede e manutenção | Sem justificativa para o início |

**Prioridade atual: aproveitar Cloudflare/Railway, com gravação própria.** O SFU encaminha mídia, enquanto o Sistema Zero implementa sala, permissões, reconexão e replay. Realtime SFU e RealtimeKit são produtos distintos: não aplicar o preço por minuto do Kit ao SFU. A [revisão de infraestrutura](2026-10-14-aulas-ao-vivo-infraestrutura-e-custos.md) detalha responsabilidades, limites e prova técnica.

Comparação dos candidatos à chamada:

| Fornecedor | Evidência relevante | Avaliação |
| --- | --- | --- |
| **Cloudflare Realtime SFU** | Transporte WebRTC com API de publicações/assinaturas e franquia por tráfego | Primeira escolha para ensaio, com sala e gravador desenvolvidos por nós; exige mais integração |
| **LiveKit self-hosted** | Servidor de mídia e gravação separados, operados pela equipe | Alternativa de auto-hospedagem; exige validar rede, recursos e operação |
| **Daily** | SDK para interface própria; compartilhamento com ajustes de qualidade; permissões de recepção por tipo de mídia e usuário; tokens por sala | Alternativa gerenciada comparativa; deixou de ser a preferência por custo |
| **LiveKit Cloud** | Controle de tracks, SDK customizável, permissões e revogação de tokens no Cloud | Boa alternativa se o ensaio demonstrar melhor desempenho/flexibilidade; custo inclui conexão e tráfego |
| **Cloudflare RealtimeKit** | SDK/UI Kit, presets e infraestrutura já familiar ao projeto | Bom candidato; tokens duram 100 dias e exigem revogação/encerramento explícitos; validar recepção privada de telas |
| **Zoom Meeting SDK** | Integra reuniões; documentação distingue controle de clientes nativos e participantes web | Não resolve sozinho a autoria do Estúdio nem garante o painel pedagógico desejado |

Fontes: [Daily — permissões](https://docs.daily.co/reference/daily-js/types/daily-participant-permissions), [Daily — compartilhamento](https://docs.daily.co/docs/daily-js/features/screen-sharing), [LiveKit — tracks](https://docs.livekit.io/transport/media/publish/), [LiveKit — tokens](https://docs.livekit.io/frontends/reference/tokens-grants/), [RealtimeKit — visão geral](https://developers.cloudflare.com/realtime/realtimekit/), [RealtimeKit — tokens e revogação](https://developers.cloudflare.com/realtime/realtimekit/faq/), [Zoom — suporte no navegador](https://developers.zoom.us/docs/meeting-sdk/web/browser-support/).

**Escolha proposta: Cloudflare Realtime SFU para transporte e Sistema Zero para sala, permissões, gravação e dados pedagógicos.** O backend limita as publicações/assinaturas de trilhas segundo turma, papel e consentimento. Validar tentativas de receber telas indevidas e revogação de conexões existentes; esconder vídeo na interface não protege o fluxo. Daily continua como referência de capacidade, sem dependência necessária de seu SDK.

Não construir três integrações simultâneas. Criar uma porta pequena de mídia e implementar um fornecedor, mantendo IDs e regras pedagógicas independentes dele.

## 11. Custos

A referência econômica desta proposta é a [análise de infraestrutura existente](2026-10-14-aulas-ao-vivo-infraestrutura-e-custos.md): SFU/TURN por tráfego, gravador próprio por recursos consumidos, R2 por armazenamento/operações e serviços auxiliares. As tabelas anteriores por minuto da Daily não são orçamento desta solução e foram retiradas do fluxo principal.

| Componente | O que precisa ser medido |
| --- | --- |
| Chamada | Saída agregada para professora, alunos e gravador, incluindo reconexões e camadas de qualidade |
| Gravação | CPU/RAM durante preparação, captura e finalização; ociosidade e transferências |
| Replay | Tamanho dos segmentos e arquivo final, retenção, leituras e processamento de entrega |
| Operação | Preparo docente, suporte, revisão do replay e manutenção técnica |

Franquia disponível na conta não foi consultada. Simulações não demonstram o consumo de uma sala real. Separar custo técnico por encontro do custo de desenvolvimento e das horas de professora; custo zero de transporte em uma faixa não significa operação gratuita.

A conta comercial usa receita da turma menos taxas, infraestrutura, mensagens, preparo/condução/revisão/suporte e aquisição. Alertas devem anteceder o limite operacional; evitar corte inesperado de uma aula paga para cumprir orçamento.

## 12. Etapas e esforço

A estimativa anterior de 180–300 horas foi retirada como referência de entrega: ela foi feita antes de gravação própria, integração direta do SFU e dependências de persistência/isolamento identificadas nesta revisão. Não há estimativa fechada para o escopo atual. A nova decomposição deve partir dos resultados da prova.

| Etapa | Resultado necessário |
| --- | --- |
| Prova de fundamentos | Oito telas privadas, moderação real, reconexão, execução isolada, edição autorizada recuperável, captura seletiva e replay privado |
| Domínio e persistência | Oficina/turma/aula/ocorrências, grants por aula, perfis/vagas, roteiro versionado e arquivos de revisões preservados |
| Autoria e navegação | Menu Oficinas, catálogo, configuração no admin, calendário, materiais e prévia Kids |
| Sala infantil e docente | Chamada persistente, preparação, estados claros, som do projeto, participação/chat, mosaico e condução |
| Ajuda e continuidade | Fluxo único de assistência, cursor/destaques, mesmo workspace em Criar com autorização uniforme, publicação no Mural |
| Gravação e operação | Gravador, recuperação, conferência, publicação, retenção, reposição e acompanhamento de custo/falhas |
| Ensaio e piloto | Identidades fictícias, ensaio adulto, turma pequena e ampliação até oito, com inscrição administrada |
| Venda automatizada | Reserva, snapshot comercial, pagamento/reembolso por unidade e notificações reconciliáveis |

A prova não é apenas conectar duas câmeras. Ela precisa produzir evidências para as capacidades difíceis e um relatório de consumo no ambiente escolhido. Resultado insuficiente pede ajuste de arquitetura antes de ampliar as telas. Sem esses dados, não prometer prazo, economia mensal garantida ou entrega completa em sete dias.

O piloto mantém edição autorizada, controles docentes, orientação visual, câmera com efeitos conforme suporte, integração com projetos/Mural e replay. Inscrição administrativa e catálogo inicial pequeno reduzem automação e conteúdo, sem retirar silenciosamente recursos confirmados. A implementação detalhada segue a ordem e os critérios da arquitetura.

## 13. Privacidade, confiabilidade e qualidade da experiência

A observação deve ficar restrita à professora designada e ao encontro ativo. O responsável recebe informação clara sobre áudio, tela e edição; a criança vê quando compartilha e quando recebe ajuda. A base legal e os avisos devem ser definidos para cada operação, considerando o melhor interesse da criança. O entendimento da ANPD não limita todo tratamento infantil a uma única hipótese legal. [ANPD — tratamento de dados de crianças e adolescentes](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-divulga-enunciado-sobre-o-tratamento-de-dados-pessoais-de-criancas-e-adolescentes).

A gravação entra no escopo, limitada à professora e à demonstração. Transcrição automática da turma fica fora. Transmissão, gravação, edição assistida e publicação no Mural são operações distintas, com informação clara sobre destinatários e prazo. A exclusão de áudio infantil precisa ocorrer na seleção das trilhas de gravação: esconder uma câmera não remove sua voz. A implementação deve validar também som capturado pela aba de demonstração, para não reintroduzir a chamada no replay.

O fornecedor pode reter metadados mesmo sem gravação. Por exemplo, o RealtimeKit publica retenções específicas, inclusive indefinidas para registros de reuniões/participantes. Portanto, não prometer “nada é guardado” apenas porque o botão de gravar está desligado; revisar contrato, exclusão, suboperadores e transferência de dados do fornecedor escolhido. [RealtimeKit — retenção](https://developers.cloudflare.com/realtime/realtimekit/data-retention/).

Critérios para abrir o piloto:

- Uma criança só de oficina consegue entrar, usar avatar/quarto/Como Fazer e publicar no Mural sem assinatura.
- Um assinante participa sem conta duplicada ou perda de progresso.
- Oficinas aparece no menu, com catálogo e inscrições; a sala conserva os padrões visuais das aulas gravadas.
- A mesma oficina gera outra turma sem copiar alunos/progresso nem alterar o histórico da anterior.
- Cada aula bloqueia antes da data e vence no próprio prazo, inclusive em link direto, materiais e salvamento; a aula seguinte não abre antes da hora.
- O admin permite preparar roteiro sem vídeo, materiais, turmas e calendário, com prévia isolada.
- Duas vagas para irmãos permitem vincular/criar os dois perfis; repetir compra para a mesma criança não duplica seu cadastro.
- Criança atrasada ou faltante consegue continuar o roteiro publicado após a chamada, sem gate de presença ou vídeo.
- Replay publicado abre na própria aula, conserva o projeto e a posição assistida, e vence com o grant daquela aula; processamento não reinicia os 30 dias.
- Arquivo final exclui vozes/câmeras/telas/chat das crianças, mesmo quando esses recursos são usados na sala; queda/reconexão docente não amplia a captura.
- Gravação com erro, segmentos incompletos ou revisão pendente não aparece como pronta; turma diferente e acesso vencido não obtêm reprodução autorizada.
- Espera não recebe mídia da turma; queda da última professora suspende a comunicação coletiva e preserva o trabalho.
- Expansão do Estúdio conserva controles essenciais, foco, Parar ajuda e Parar compartilhamento; a comparação visual respeita os componentes e as seis paletas atuais.
- A professora acompanha oito compartilhamentos e abre um projeto por vez sem travar o painel.
- Silenciar uma criança/todas funciona de fato; manter microfone fechado impede reativação e persiste na reconexão, preservando a fala da professora.
- Abaixar uma mão/todas não apaga ajuda nem uma nova mão levantada depois do comando; liberar fala não liga o dispositivo remotamente.
- Chat recupera histórico permitido, aplica moderação e não duplica mensagens; materiais liberados continuam encontráveis fora do fluxo da conversa.
- Outro aluno e um professor de outra turma não conseguem receber uma tela/projeto indevido.
- Aceitar, recusar, interromper e devolver a edição funcionam; autosaves atrasados não sobrescrevem a revisão atual.
- O cursor identifica a professora e a seta encontra o mesmo botão em telas de tamanhos diferentes; alvo ausente não produz um destaque errado.
- Queda de rede, atualização da página e troca de perfil não misturam projetos nem perdem versões confirmadas.
- Sem câmera ou sem compartilhamento, a sala apresenta uma alternativa clara; nunca indica uma imagem antiga como atual.
- Prévia e troca de fundo funcionam para professora/criança sem ativação remota; falha não transmite câmera sem efeito; gravação docente conserva o fundo; testar efeitos junto de oito participantes, Estúdio e telas compartilhadas.
- O encerramento fecha a chamada e o acesso docente temporário, preservando o acesso contratado ao projeto.

Computador com Chrome/Edge é o primeiro alvo de validação proposto. Celular pode atender a agenda familiar; não anunciar experiência equivalente de criação e compartilhamento em todos os dispositivos antes do teste. Teclado, foco, leitores de tela, zoom e contraste fazem parte do ensaio da sala.

## 14. Indicadores para decidir a evolução

Medir primeiro se a experiência funciona: tempo para entrar, falhas de dispositivo, ajuda solicitada/atendida, espera para falar, falhas de silenciamento/liberação, projetos recuperados, sucesso de publicação e satisfação de família/professora. Registrar a latência de tela e de revisões, consumo de recursos e incidentes de acesso. Verificar compreensão das datas e prazos e facilidade de encontrar materiais após o encontro.

Depois medir negócio: ocupação, presença, conclusão com projeto publicado, recompra de oficina, assinatura posterior e continuidade de uso em 7/30 dias. Comparar quem já assinava com quem chegou pela oficina. Não atribuir toda assinatura posterior à oficina sem evidência de origem.

A evolução mais útil, depois do piloto, é ampliar o catálogo de projetos, automatizar vagas e lembretes e oferecer um histórico claro de criações. Colaboração simultânea, publicação automática de replay sem conferência, IA avaliando atenção e operação de um SFU próprio não são pré-requisitos. Sala, gravador da professora/demonstração e replay próprios fazem parte do escopo revisado, usando a rede de mídia Cloudflare no caminho prioritário.

**Próximo passo recomendado:** uma prova técnica da sala com oito participantes, ajuda com edição e gravação seletiva com replay privado, seguida de uma oficina piloto com um único projeto. Esse recorte testa as integrações mais difíceis antes de transformar a modalidade em um produto recorrente.
