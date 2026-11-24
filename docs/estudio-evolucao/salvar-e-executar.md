# Salvar e executar no Clássico JavaScript

Esta página documenta a entrega de salvamento antes dos comandos explícitos.
Não substitui o manual completo nem declara as demais etapas concluídas.

## Rodar e Rodar de novo

Os botões continuam nos mesmos lugares e com os mesmos nomes. Ao apertar:

1. O Estúdio materializa a última edição que ainda está no buffer dos editores.
2. **Sem mudança a gravar**, roda no mesmo instante do clique e não grava nada
   (era assim antes desta entrega, e é o caso comum do "Rodar de novo").
3. **Com mudança**, pede a gravação e espera a confirmação. Não há liberação
   por timeout: demora não prova que a revisão está guardada. Nesse intervalo o
   Rodar fica indisponível, o Parar continua disponível e o jogo anterior permanece.
4. Se houver outra edição durante a confirmação, materializa e confirma também essa
   revisão antes de iniciar. A prévia usa a revisão confirmada, sem o debounce do editor.

Se a gravação falhar, a execução solicitada não começa. O diagnóstico aparece no
estado de execução e no selo de salvar; a edição continua no editor como não salva,
e o jogo anterior é preservado. É possível corrigir o armazenamento e tentar novamente.
Essa regra corrige o achado R3: esperar 1,5 s ou ignorar uma rejeição não confirmava
a revisão que efetivamente entrava no jogo.

Parar durante a espera cancela a execução solicitada. A gravação continua: sua
confirmação tardia não faz o jogo começar sozinho. Fechar o editor, mudar de
projeto ou perder a autorização de edição também invalida essa solicitação.

## Confirmação e limites

A confirmação é fornecida pelo adapter do host, pelo armazenamento local ou pelo
callback assíncrono de salvamento. Um laboratório configurado com
`persistence="none"` sem callback não confirma armazenamento em disco ou nuvem.

As edições que atualizam a prévia sem apertar Rodar continuam seguindo o autosave.
A entrega não promete salvar sincronicamente cada tecla. Durante uma solicitação
explícita pendente, essa atualização automática não antecipa a execução da nova
revisão. A marca de execução interrompida existente continua protegendo a reabertura.

Na revisão de 18/11, o reinício após trabalho nativo pesado passou no Chromium 148
completo. Firefox/WebKit ainda têm limitações de isolamento registradas na revisão;
aprovação de persistência não equivale a isolamento integral de execução.

## Para quem incorpora o Estúdio

Continue usando `StudioPersistenceAdapter` e os callbacks existentes. O novo
coordenador guarda apenas a intenção de executar; não introduz armazenamento ou
fila de gravação paralelos. Adapters devem resolver `save` após a confirmação que
prometem ao usuário. Escritas iniciadas preservam seu escopo; cancelar uma
solicitação de execução não deve abortar uma mutação de persistência.

Fora de um `StudioStoresContext`, o serviço local acompanha o ciclo do perfil
ativo, inclusive ao voltar a um namespace já usado. Dentro do contexto, o serviço
continua pertencendo à instância do Estúdio.
