# Caminhos: piso conformado e transferência

18/11/2026. Continuação exclusiva de 6.1, sobre staging `b7337c180`.

## Implementado e conferido neste recorte

`geometriaDoPiso` produz a superfície nativa de trilha, praça e estrada. Recorta a faixa em cada triângulo real do terreno, interpola as alturas pela mesma fonte triangular e mantém UV em metros. Os buffers são locais a uma origem separada, para preservar precisão longe do centro do mundo. Não acrescenta uma folga arbitrária no eixo Y; o desenho no motor deverá tratá-la como acabamento do chão, com polygonOffset e ordenação adequados.

Buracos de células, ausência de peças no terreno esparso, limites do plano e recortes poligonais retiram a superfície. Não há um piso substituto cobrindo lago ou buraco. O recorte reaproveita `recortarAtributos`, o núcleo puro que já atende ao adaptador do Molda. Há limite de visitas e vértices; erro não devolve uma malha parcial.

A revisão encontrou dois problemas na primeira passada, corrigidos e conferidos antes deste registro:

- Subdividir o eixo antes de calcular a faixa podia dobrar juntas próximas de esquinas. O piso preserva agora o eixo e visita as células por faixas do triângulo original. Uma diagonal comprida não percorre seu retângulo inteiro.
- A conversão dos fragmentos de recorte para Float32 podia colapsar faces na divisa. Essas faces degeneradas não entram na geometria de picking. Dobras efetivas da faixa são recusadas antes de recortar, com orientação para ajustar curva/largura.

O clipboard existente aceita caminhos sozinhos e pastas com as seis variantes, conservando modelos, texturas, camadas, aparência e parâmetros. Colagem remapeia identificadores/recursos, desloca controles XZ e cotas explícitas de pontes, preserva cabeceiras automáticas e não modifica o terreno. Não permite salvar silenciosamente caminhos como conjuntos de objetos. A seleção de um caminho pela árvore participa da mesma transferência da oficina.

Foi conferida também a remapagem do apoio em uma montagem copiada com seu objeto dependente. O vínculo aponta para a nova raiz e a pose muda uma vez, junto da composição.

## Evidência local

- Núcleo: **235 testes / 10.007 asserções**, sem falhas. Inclui dez testes de piso e quatro de transferência de caminhos, além do vínculo em montagem.
- Motor: **98 / 2.800**, sem falhas.
- Oficina: **94 / 603**, sem falhas; recorte de caminho e undo após reabrir o host existente.
- Postgres real, banco descartável `cenarios_reforma`: **40 / 356**, sem falhas. Caminho copiado percorre JSONB, idempotência, replay, reabertura e undo/redo.
- Members, serviço/HTTP/histórico: **51 / 244**, sem falhas.
- Tipagem de núcleo, motor, oficina e Members e Biome conferidos. Os logs ficam em `output/cenarios-reforma/lote6-*-piso*` e `lote6-pg-fragmento.log`.

## Limites e continuação

**6.1 permanece aberto.** A geometria de piso é um cálculo puro; ainda não está instalada no renderer. Acabamentos GLB, módulos de cerca/muro, ponte estrutural e seus apoios ainda serão integrados. Não há capturas novas nem conclusão artística neste recorte. Edição de pontos, worker/autoria de caminhos, aba Caminhos, prova jogável e revisão integral do lote continuam pendentes. Lotes 7–10 e implantação/validação final de staging não foram iniciados.
