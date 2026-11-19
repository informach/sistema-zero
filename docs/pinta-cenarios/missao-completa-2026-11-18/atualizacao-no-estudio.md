# Atualização entre as oficinas

A homologação local monta o `PintaClient` real do member-shell, o `StudioEditor`, o adapter
real de “Trazer do Pinta” e os bancos IndexedDB. A única adaptação de framework é a navegação
Next no servidor Vite dedicado. O perfil é sintético e as requisições de API são interrompidas
explicitamente, para ensaiar o fluxo offline. Não se simula uma autenticação nem uma resposta
bem-sucedida da nuvem; a conta fornecida para staging permanece fora das fixtures.

O primeiro fluxo importa a Vila, cria um jogo por **Jogar meu mapa**, acrescenta uma variável
na Ponte e espera a conversão real para os blocos. Depois apaga uma peça no mapa em outra aba.
O checkpoint da biblioteca pessoal contém a nova célula e o Estúdio incorpora a cena quando
recebe o retorno ao foco. Arquivos, IR e blocos são comparados integralmente antes/depois.
O Chromium sem janela mantém todas as abas visíveis/focadas: o evento de retorno é simulado
explicitamente. Isso não é apresentado como teste físico de alternância de janelas.

## Dependências de arte

Antes deste lote, salvar uma folha de peças reenviava somente a própria folha. Mapas já
levados ao Estúdio guardavam sua própria cena e continuavam com as colisões/arte anteriores.
O ensaio reproduz o problema no código anterior: a folha não tinha vínculo próprio e o
mapa não recebia a edição. Com a correção, mudar a colisão da folha atualiza as cenas dos
mapas vinculados sem abrir nem editar esses mapas.

`core/dependentTilemaps.ts` percorre o grafo reverso das dependências nativas, uma vez por
ID. Inclui referências tipadas e conjuntos, tolera ciclos e conserva a ordem da galeria.
Uma origem de versão fixada não é dependência: alterar o original não atualiza a cópia.
O reenvio captura uma única vista da galeria antes do primeiro `await`, incluindo a arte
que ainda está no editor. Cada mapa passa pelos exportadores e tetos existentes.

A autorização do vínculo continua no host: `resyncToStudio` só salva itens já presentes na
biblioteca pessoal daquele perfil. A edição não cria novos vínculos. Falhas de um destino
são relatadas; os outros destinos são tentados. A fila existente continua conservando a
edição mais recente. O custo de reexportação é proporcional aos mapas dependentes, com
processamento sequencial; este lote não afirma tempo constante para galerias grandes.

O ensaio usa os mesmos componentes visuais, botões, tokens e estilos. O servidor e os
observadores de QA vivem em `playground/pinta-integration`, fora do produto publicado.

Ainda fazem parte da etapa 2a: validar o fluxo autenticado após o rollout do leitor e fechar
o transporte de mapas de destino das portas também no caminho de importação individual.
O lote não declara essa etapa inteira concluída.
