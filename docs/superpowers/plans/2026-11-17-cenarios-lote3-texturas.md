# Lote 3.3 — Texturas de biblioteca por objeto

Continuidade na staging após `a1d76b25e`. Execução sequencial, sem aprovações intermediárias. Não iniciar as ferramentas dos lotes seguintes.

## Contrato

- Tabela autoral opcional `texturas`, com referências fixadas por biblioteca, item e digest. `instancia.aparencia.textura` aponta à tabela e registra a repetição em metros. Sem URLs temporárias no documento.
- Comandos de definir/remover referência; inversão e validação completas, incluindo referências ausentes, colisões de ID, limites e bloqueios. A cor já implementada é conservada ao trocar/limpar a textura.
- Mesmo espaço e arquivo confirmado como textura, conferidos no serviço e na transação. Head, revisões, lotes, inversos e restaurações preservam os arquivos, inclusive depois de apagar a biblioteca. GC libera apenas os recursos sem referências. Nada de novas concessões à conta ou cópias entre espaços.
- Host oferece conteúdo binário autorizado, limitado e verificável por hash. Palco carrega apenas texturas utilizadas, com limite de concorrência, cancelamento e identidade do pedido; erro explícito e descarte de imagem/texture/material próprios.

## Mapeamento físico

Não interpretar coordenadas UV arbitrárias de um atlas GLB como metros. O acabamento escolhido usa projeção por face no espaço local da raiz do modelo, em unidades físicas. A geometria de consulta recebe a transformação interna do GLB, preservando pivô e medidas, sem alterar o arquivo original.

Uma normal geométrica constante por triângulo define um referencial determinístico sobre a face. A escala positiva da instância é aplicada ao ponto e à normal antes de calcular UV/repetição. Faces coplanares têm o mesmo referencial, evitando alternância de direção entre os dois triângulos de um quadrilátero. A projeção acompanha o objeto quando ele se move e gira.

O caminho da CPU e o shader devem usar a mesma conta. Na exportação futura, UVs podem ser materializadas por instância para PBR comum, sem depender de shader particular do editor. O renderer reutiliza geometrias projetadas e variantes de material por textura/repetição; a tonalidade continua no atributo de instância.

Escolher outra textura substitui o acabamento visual da superfície. Limpar retorna aos materiais e UVs originais do modelo. Não prometer preservar uma máscara de recorte que faça parte do material substituído. Modelos originais e suas texturas permanecem intactos.

## Ordem e validação

1. [x] Esquemas, comandos, referências e inversão no núcleo; prova de concorrência/bloqueios e roundtrip.
2. [x] Serviço/repositório/GC e hosts; testes de espaço, histórico e Postgres real, incluindo apagar biblioteca e conservar/reler bytes.
3. [x] Loader de imagens e projeção física; testes independentes de escala, rotação, inclinação, faces coplanares, espelho, UV materializada e recursos compartilhados/descartados.
4. [x] Painel Aparência com as bibliotecas existentes, busca paginada, escolha, repetição, remoção e estados de erro. Não duplicar a biblioteca de chãos.
5. [x] Ensaios com GLB real e formas, em claro/escuro/390 px: textura, cor, espelho, escala, troca de modelo, undo, reentrada e descarte. Capturas comparáveis e teste em movimento.
6. [x] Revisão da parte 3.3 inteira, tipagem, testes e [registro](../../plans/2026-11-16-cenarios-reforma/revisao-lote3-texturas-objetos.md). Próximo: parte 3.4 do mesmo lote 3.

O lote 3 permanece aberto até todas as suas partes estarem implementadas, testadas e revisadas. Implantação e validação de staging no encerramento global.
