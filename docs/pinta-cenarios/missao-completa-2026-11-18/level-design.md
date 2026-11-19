# Autoria profissional na oficina existente

As ferramentas de objetos oferecem pontos, retângulos, elipses, polígonos e
caminhos. Polígonos e caminhos são desenhados ponto a ponto: Enter ou toque no
primeiro ponto termina; Esc cancela. Os pontos continuam editáveis depois.

O campo **Papel no jogo** apresenta início, perigo, porta, caminho, interação,
inimigo e região com os nomes infantis existentes. São dados para o jogo:
o Estúdio decide o que acontece na área ou como percorrer o caminho. Uma porta
usa a propriedade `destino` e os destinos disponíveis na biblioteca.

**Impede o personagem de passar** marca o contorno autoral de um objeto. Os
contornos precisos, conjuntos transformados e plataformas de mão única seguem
o [contrato físico](plataformas-precisas.md). Uma área comum sem essa marca
continua consultável sem virar parede automaticamente.

Camadas e grupos organizam regiões, ordem, opacidade, travas e deslocamentos.
As camadas de peças marcadas como frente passam sobre o jogador. Distância X/Y
controla o parallax. Propriedades tipadas pertencem a objetos e camadas; as
animações de peças e de artes referenciadas usam os contratos existentes.

## Modelos inteiros, inclusive depois de girar

**Guardar modelo do objeto** cria uma definição reutilizável na biblioteca.
Seu recorte agora considera a caixa transformada, a âncora e os deslocamentos
herdados, alinhando para fora à grade. Pode existir margem vazia para conservar
a âncora de um objeto girado na borda. Dimensões além do teto são recusadas por
inteiro, antes de salvar. O chão do mapa não entra no modelo.

A operação pura `tiles/objectTemplate.ts` reutiliza `objectBounds` e
`createMapSet`; preserva propriedades, autorreferências, arte/animação,
colisões e versões de recursos. Outros objetos não entram no recorte. O botão,
mensagens, identidade visual e formato de conjunto permanecem os existentes.
O recorte comum de uma seleção mantém sua regra de incluir objetos pela âncora.

Colocar o modelo cria uma instância vinculada. **Soltar o conjunto** é uma
operação diferente que produz conteúdo independente dentro dos limites já
documentados. Copiar/colar não transforma cópias em definições vivas.

[Provas e limites](qa/level-design-2026-11-19/README.md). O ciclo autenticado e
a homologação externa ampliada continuam nos itens correspondentes do plano.
