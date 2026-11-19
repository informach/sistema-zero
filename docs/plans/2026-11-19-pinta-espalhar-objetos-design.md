# Pincel de espalhar desenhos e conjuntos

Etapa 4b da missão autorizada, na mesma oficina e com os componentes atuais.
Usar como modelo um objeto de arte ou uma instância de conjunto já selecionada
no cenário. A biblioteca permite colocá-lo com a miniatura real, e o arrasto
recém-entregue já o deixa selecionado.

## Decisão

Acrescentar **Espalhar desenhos** às ferramentas de objetos de **Criar mais**,
com a mesma curadoria, botões, atalhos e fallback das ferramentas atuais.
Um modo escondido em checkbox tornaria seleção e atalhos ambíguos; criar outra
biblioteca duplicaria fontes e regras. O novo pincel usa o objeto selecionado
como modelo, preservando arte, propriedades, transformação e referências.

Controles: tamanho do pincel, quantidade, distância entre centros em casas e
número da variação. Giro em quartos de volta e espelho são opcionais. As escolhas
são preferências da sessão; o documento recebe os objetos finais, sem formato novo.

## Núcleo e determinismo

Reutilizar `seededChoice` e a geometria de células/objetos. Deduplicar e ordenar
as amostras para que a mesma região e semente produzam a mesma composição,
independentemente da ordem dos eventos. Conferir distância por hash espacial,
incluindo as artes já presentes. Evitar corte na borda usando a caixa transformada.

As identidades são estáveis durante um gesto e novas entre gestos. A clonagem
compartilhada remapeia referências do objeto para si mesmo e preserva as demais.
Uma cópia de árvore é independente; uma cópia de instância de conjunto continua
vinculada à definição. Não converter uma coisa na outra silenciosamente.

Inserir em lote com a mesma normalização e guarda das operações existentes.
O teto continua em 512 objetos por camada. Se o lote exceder o orçamento, recusar
o gesto inteiro com feedback; não cortar objetos silenciosamente.

## Gesto e integração

Pintar no palco mostra a composição provisória sem alterar o documento. Uma
soltura válida confirma exatamente a prévia, com um desfazer. Interpolar o
percurso entre eventos para não depender da frequência do mouse ou do toque.
Cancelar em Esc, `pointercancel`, perda de captura, blur, troca de ferramenta,
camada, grade, zoom, opções, origem ou revisão do documento. Um ponteiro é dono.
Eventos antigos não podem sobrescrever uma cópia recuperada.

Os objetos da prévia usam o render existente; a interface anuncia a quantidade
e os limites. A seleção volta pelo botão/atalho normal. Um save recusado pelo
orçamento do host não pode receber mensagem de sucesso nem seleção inexistente;
aplicar a mesma conferência à inserção da biblioteca.

## Aceite

Provar determinismo, distância, densidade, transformações e vínculos, limites e
recuperação com testes de dados e editor. No navegador, usar pixel, vetor e
conjunto, comparar prévia/soltura, desfazer/refazer, cancelar, salvar/reabrir e
executar o cenário. Separar mouse, toque e CPU emulados de aparelhos físicos.
