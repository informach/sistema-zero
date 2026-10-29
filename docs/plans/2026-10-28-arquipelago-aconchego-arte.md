# Pedido consolidado de arte para o aconchego (fase1-15)

> **Entregue em 29/10/2026:** `src/assets/objetos/planta-interior.glb` (nós `vaso`, `terra` e `folhas`;
> 0,78 × 1,28 × 0,88; 4,5 mil triângulos), script `arte/objetos/planta_interior.py`, imagem em
> `docs/qa/2026-10-29-planta-interior.png`. Ligada ao catálogo (`planta-interior`), chega com a
> primeira obra e conta no aconchego. Contrato em `arte/objetos/README.md`.

Texto pronto para repassar à sessão de Blender. A lista cobre as necessidades desta tarefa,
conferidas contra o catálogo do quarto, o catálogo dos projetos azuis e o inventário de arte.

## Objetivo

Preparar uma planta de interior que possa ser colocada nos cômodos novos da casa e nas cabanas.
O cálculo de aconchego já reconhece as plantas do quarto da plataforma. Os cômodos novos ainda
não têm objeto de planta no catálogo e a ferramenta de objetos ainda não funciona nas cabanas.
A arte sozinha não libera essa colocação: a integração de catálogo, posse e ferramenta será
uma entrega posterior, coordenada com quem cuida do jogo e dos contratos.

## Lista completa de modelos necessários nesta tarefa

1. **Planta de interior em vaso, de chão.** Uma peça independente, reutilizável na casa e nas
   cabanas. Justificativa: preencher a contribuição Plantas fora do quarto com algo que a criança
   consiga reconhecer e posicionar, sem contar os canteiros do quintal como plantas de interior.
   Um modelo basta para iniciar essa categoria. Variações decorativas são opcionais e não
   precisam ser produzidas para fechar este pedido.

## Especificação proposta da peça

- Nome sugerido: `planta-interior.glb`; script reproduzível em `arte/objetos/planta_interior.py`.
  Confirmar esses nomes com a sessão que integra o catálogo antes de publicar o arquivo.
- Mesmo acabamento dos objetos da casa e do quarto: formas arredondadas, cores chapadas,
  folhas legíveis, vaso bem acabado e geometria leve para celular.
- Área proposta de 1 × 1 célula, sem folhas saindo dessa área. Altura proposta até 1,4 unidade.
  São limites novos propostos para a integração, não medidas de um arquivo já existente.
- Origem centralizada na base, chão em y = 0 no glTF; convenções de eixos e exportação de
  `arte/objetos/README.md`. Separar nós `vaso`, `terra` e `folhas` para facilitar ajustes.
- Colisão preparada com cilindro simples no vaso, menor que a folhagem, conforme a regra de
  colisão do pacote. A sessão de integração definirá o colisor jogável pelo volume final.
- Sem rig, animação ou luz dinâmica. Entregar script, GLB, medidas finais, nomes dos nós e
  uma imagem de referência. A miniatura pode ser gerada pela sessão que integra o catálogo.
- Não regenerar ilhas nem alterar os modelos do quarto para atender a este pedido.

## Peças existentes que serão reaproveitadas

- No quarto: planta, árvore, cacto, vaso de flores e planta pendurada já constam no catálogo.
- Luz: luminárias, vela, lâmpada de lava, varal de luzes e letreiro já existem no quarto;
  a lareira já existe nos projetos azuis. Nenhuma luz nova é necessária para esta entrega.
- Portas, três janelas e três pisos já existem no kit. O painel usa estrelas da interface,
  sem precisar de modelo Blender. Visitas e festas não pedem arte nesta fase.

Nenhuma peça de Blender bloqueia a entrega do cálculo e do painel de aconchego.
