# Geometria física comum — etapa 2b em execução

## Diagnóstico

O teste com personagem recebia somente `solidAt(x, y)`. Amostrava uma malha no
corpo do personagem; uma peça de conjunto menor que o intervalo dessa malha podia
ficar entre todas as amostras. O personagem então atravessava a parede. A reprodução
usa apenas dados nativos existentes: conjunto de 16 colunas reduzido para 1 pixel,
uma peça sólida, coordenadas inteiras e nenhum formato novo.

Isso é diferente da grade aproximada dos motores JavaScript publicados. Esses
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

## Fechamento restante da etapa 2b

Este lote não conclui a etapa. A função matemática de formas está pronta para a
integração, mas isso não oferece ainda uma ferramenta de parede por objeto.

- Acrescentar marca autoral explícita de colisão por objeto, com controle no painel
  existente e histórico, seleção múltipla, cópia, conjuntos e templates completos.
- Elevar formato nativo/envelope e contrato de cena para que leitores que removem
  essa marca recusem o documento. Conservar as cenas antigas com a física anterior.
- Acrescentar capacidade de runtime e versões de dados PNG/mundo correspondentes;
  conferir importação, atualização, execução, pacote web e publicação. Preservar a
  autoridade offline e os checkpoints quando a escrita de nuvem ainda não foi ativada.
- Integrar corpo, formas, peças transformadas e plataformas aos dois motores do
  Estúdio e ao Pygame. Verificar o Phaser e os adaptadores externos com os mesmos
  casos, incluindo limites, contatos, concavidade e transformações afins.
- Medir o custo das consultas e a carga adicional dos motores antes de decidir
  tetos. O percurso local por células não comprova desempenho do pior caso de
  centenas de instâncias reduzidas ou sobrepostas.

Não usar um nome reservado dentro das propriedades livres para simular o novo
campo, nem habilitar o gravador de nuvem antes do leitor. As provas de staging e
as etapas posteriores continuam nos critérios do plano principal.
