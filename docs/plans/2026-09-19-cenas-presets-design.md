# Presets e correção das cenas de aula

## Objetivo

Uma cena representa uma relação que a criança experimenta. O mesmo modelo deve servir aulas diferentes com caso inicial, elenco, cenário, fichas e metas próprios, sem duplicar o motor nem mudar a identidade visual do player.

## Estado encontrado em 19/09/2026

O catálogo tem 45 cenas. `SceneSetup` já aceita ações de preparo e metas por atividade; a atividade também aceita elenco e cenário. O motor já tem `reset`, que volta ao caso preparado e preserva as descobertas. O relatório externo descreve uma fotografia anterior do código: `hitbox`, `gravity`, `impulse` e `velocity`, entre outras, já receberam parte das metas citadas como ausentes. IDs existentes não serão renomeados apenas para coincidir com o relatório, pois manifestos e sessões os referenciam.

## Contrato de preset

O bloco de experimentação continua apontando para um único `scene`. `setup` passa a poder carregar uma configuração declarativa específica da cena. Para `once-vs-always`, ela informa quais caixas aparecem, quais fichas existem, o efeito de cada ficha e as regras do caso preparado. O editor oferece os cinco casos do redesenho como modelos preenchidos e permite conferir a configuração antes de publicar. `setup.goals` continua determinando quais provas esta aula cobra.

O catálogo mantém os IDs e o significado das metas. Uma configuração pode adaptar apenas os textos de apresentação da meta (`label` e `pedido`), validados contra IDs existentes. A previsão e a pergunta final continuam sendo conteúdo do bloco, para permitir variantes por aula sem criar outra cena.

O core valida a configuração, executa ações e guarda o estado sem depender de React. O member-shell desenha palco e bancada com os componentes e tokens de cena já usados no produto. O admin edita o caso; o servidor rejoga os mesmos comandos do core para avaliar a conclusão. Fichas arrastáveis também têm um controle por teclado e leitor de tela que envia a mesma ação.

No player, o cenário declarado pela atividade chega a todos os palcos; na ausência dele, o cenário continua sendo inferido do elenco. Assim uma aula pode manter a mecânica e trocar a ambientação sem duplicar a cena. Em `variable`, o rótulo desenhado no jogo acompanha esse cenário: `placar` no Corre Dino e `Pontos:` no Desafio.

`cleanup` tem dois casos preparados no mesmo modelo: cactos saem pela esquerda no Corre Dino, e tiros saem por cima no Desafio. O seletor do editor prepara direção, elenco, cenário e as duas metas; o motor usa a direção para mover e retirar os objetos, e o palco move a marca de saída junto. No caso do Dino, um quarto cacto aparece chegando pela direita antes do primeiro nascimento do relógio, fora da contagem do grupo.

`game-state` também tem dois casos preparados. No Corre Dino, o relógio toca a cada 18 quadros (0,6 s), e a espera é de dois segundos no estado de início. No Desafio, toca a cada 40 quadros; a meta de espera só cai após três toques sem nascimento. O editor preenche as três metas, os textos da pedra, o elenco e o cenário. O palco e a bancada mostram o intervalo do caso, e a faixa mostra toques, nascimentos e resposta da condição.

## Voltar ao começo

As novas cenas reutilizam a ação `reset` existente. Para elas, a interface pode chamar o gesto de “Voltar ao começo”. Ele restaura posições, tempo, fichas e contadores do preset, preservando as metas que a criança já descobriu, como nas cenas atuais.

## Compatibilidade e ordem

As 45 cenas atuais continuam válidas sem configuração nova. Metas realmente novas são acrescentadas; a equivalência entre um ID atual e um nome novo no relatório é resolvida no conteúdo, sem apagar progresso. Primeiro entra o contrato com `once-vs-always` e seus cinco casos. Depois entram os ajustes das cenas existentes, testados pelo gesto que a criança precisa fazer e pelo que aparece no palco, e as dez cenas novas restantes.

`published-copy` deve representar a republicação como um novo post: o serviço do Mural cria outro post quando recebe uma nova chave de publicação; a mesma chave apenas evita duplicar o mesmo envio.

Manifestos e roteiros v6 permanecem fora desta etapa, conforme a ordem indicada para o redesenho.
