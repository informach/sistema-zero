# Geometria física comum — etapa 2b em execução

## Diagnóstico

O teste com personagem recebia somente `solidAt(x, y)`. Amostrava uma malha no
corpo do personagem; uma peça de conjunto menor que o intervalo dessa malha podia
ficar entre todas as amostras. O personagem então atravessava a parede. A reprodução
usa apenas dados nativos existentes: conjunto de 16 colunas reduzido para 1 pixel,
uma peça sólida, coordenadas inteiras e nenhum formato novo.

Na base deste diagnóstico, isso é diferente da grade aproximada dos motores JavaScript publicados. Esses
motores ainda precisam de um contrato novo para adotar física diferente sem trocar
silenciosamente a interpretação dos jogos já publicados. No Pygame, as peças de
conjuntos já usam quadriláteros, mas formas de objeto ainda não são paredes autorais.

## Primeiro lote: corpo inteiro no teste do Pinta

`sceneObjectIntersectsBox`, no Core, calcula a interseção do corpo com retângulo
girado, elipse analítica, polígono côncavo, polilinha aberta ou ponto. Os espelhos
da arte não alteram seu contorno autoral. A transformação afim de um conjunto
continua vindo de `transformSceneSetObject`, inclusive escala desigual e reflexão.
Encostar sem penetrar permanece livre; a margem numérica é interna ao corpo.

`sceneIntersectsBox` consulta as peças sólidas do documento e dos conjuntos. Usa
a caixa do corpo transformada de volta ao espaço local para percorrer apenas as
células candidatas. Conserva deslocamentos fracionários e herdados. Não achata o
mundo numa grade nem mantém uma cópia adicional de todos os colisores em memória.
Camada escondida não colide; opacidade zero conserva barreiras invisíveis. Peças
de plataforma não são promovidas a sólido por essa consulta.

`MapPlaytestDialog` fornece essa consulta ao mesmo movimento, teclado, toque,
portas e desenho existentes. A malha de pontos continua disponível para mundos
personalizados antigos que fornecem apenas `solidAt`. O documento nativo, sua
versão, o backup e os motores dos jogos publicados não são alterados neste lote.

Aceite deste lote:

- [x] Reproduzir a parede atravessada antes da correção.
- [x] Consultar o corpo inteiro e parar no contorno, incluindo peças menores que
  o intervalo antigo de amostragem.
- [x] Exercitar giros livres, espelhos, escala desigual, offsets de grupos e de
  filhos fora do tamanho nominal do conjunto.
- [x] Validar o ciclo nativo de salvar/importar da mesma fixture de navegador.
- [x] Exercitar reabertura e movimento na interface real em desktop e toque emulado.
- [x] Completar regressão, tipos, revisão e evidências antes do commit deste lote.

[Evidências locais e limites](qa/geometria-fisica/README.md).

## Segundo lote: contornos autorais protegidos

O [contrato e guia dos contornos](colisoes-autorais.md) registra a evolução seguinte:
documento/envelope 7, cena 3, PNG 4 e capacidade própria do runtime. Há marca de
barreira no painel existente, histórico, preservação em conjuntos, corpo e varredura
contínua nos motores JavaScript/Pygame, consulta afim no Godot e ida e volta no Tiled.
As cenas antigas não recebem a física nova implicitamente.

O [registro de QA](qa/colisoes-autorais/README.md) separa a qualificação local e o
artefato exato de Python/Wasm do rollout em staging. O gravador de nuvem continua
no formato 4 durante a publicação do leitor; os documentos 6/7 não são enviados
com uma declaração insuficiente.

## Fechamento restante da etapa 2b

Os lotes funcionais não concluem sozinhos a etapa nem a missão inteira.

- Fechar a semântica e a execução comum das plataformas de mão única sob giros,
  espelhos e deslocamentos fracionários. Os motores preservam seus resolvedores
  anteriores para plataformas; a nova consulta precisa cobre sólidos.
- Qualificar a atualização de cena 2 para 3 em jogos abertos e fechados e o ciclo
  de publicação/restauração com a conta de staging após rollout do leitor/runtime.
- Ampliar as medições para muitas instâncias reduzidas ou sobrepostas. Os 16
  corpos e a CPU reduzida da fixture não comprovam o pior caso dos limites autorais.
- Exercitar a marca nas ferramentas de templates e espalhamento quando elas forem
  concluídas nas respectivas etapas, preservando suas propriedades e vínculos.

Não usar um nome reservado dentro das propriedades livres para simular o novo
campo, nem habilitar o gravador de nuvem antes do leitor. As provas de staging e
as etapas posteriores continuam nos critérios do plano principal.
