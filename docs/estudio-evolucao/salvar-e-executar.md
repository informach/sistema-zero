# Salvar e executar no Clássico JavaScript

Esta página documenta a entrega de salvamento antes dos comandos explícitos.
Não substitui o manual completo nem declara as demais etapas concluídas.

## Rodar e Rodar de novo

Os botões continuam nos mesmos lugares e com os mesmos nomes. Ao apertar:

1. O Estúdio materializa a última edição que ainda está no buffer dos editores.
2. O serviço de salvamento existente confirma a gravação. Enquanto espera, o
   botão de Rodar fica indisponível e Parar continua disponível.
3. A prévia passa a usar o código confirmado, sem esperar o atraso da atualização
   automática. Se já havia um jogo, o documento anterior permanece durante a espera.

Se a gravação falhar, o Estúdio apresenta o problema e conserva a edição para
uma nova tentativa. Não apresenta uma falha de armazenamento como erro do jogo.
Se houver outra edição durante uma gravação lenta, pede um novo Rodar para usar
a revisão atual; não afirma que essa revisão já foi salva.

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

O teste local ainda reproduz uma falha anterior de reinício após trabalho nativo
pesado no Chromium 148. Não equivale a isolamento integral nos navegadores.
Veja [o diagnóstico e as evidências](diagnostico-windows.md).

## Para quem incorpora o Estúdio

Continue usando `StudioPersistenceAdapter` e os callbacks existentes. O novo
coordenador guarda apenas a intenção de executar; não introduz armazenamento ou
fila de gravação paralelos. Adapters devem resolver `save` após a confirmação que
prometem ao usuário. Escritas iniciadas preservam seu escopo; cancelar uma
solicitação de execução não deve abortar uma mutação de persistência.

Fora de um `StudioStoresContext`, o serviço local acompanha o ciclo do perfil
ativo, inclusive ao voltar a um namespace já usado. Dentro do contexto, o serviço
continua pertencendo à instância do Estúdio.
