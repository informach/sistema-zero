# Performance e manutenção do Jogo 2D

## Contexto

O full review da extensão `game-2d` encontrou um caminho quadrático na colisão
com tilemaps. Para cada célula sobreposta, o runtime procura o índice do tile nas
listas `solid` e `platform` com `Array.indexOf`. No limite aceito pelo próprio
runtime, uma colisão percorre 262.144 células e até 512 entradas por lista.

O benchmark aprovado usa um mapa 512 × 512, 512 índices sólidos, três
aquecimentos e trinta medições. A linha de base foi p50 66,73 ms, p95 75,39 ms e
p99 76,59 ms por chamada.

O review também encontrou um arquivo de kits com duas responsabilidades grandes
e um comentário que descreve uma implementação antiga. O bootstrap montado tem
aproximadamente 309 KB, mas o carregador injeta a API completa antes do código do
projeto. Dividir arquivos melhora a manutenção do fonte; não reduz esse payload.

## Desenho aprovado

### Índices de colisão

O tilemap manterá `solid` e `platform` como arrays públicos. O runtime criará
índices internos com `Set` e os usará durante a colisão. Antes de cada varredura,
ele comparará as listas públicas com snapshots internos; se alguém alterar uma
lista no modo código, reconstruirá somente o índice correspondente.

Essa mudança reduz a busca de `O(células × entradas)` para `O(células + entradas)`.
Ela preserva a ordem da varredura, o cálculo geométrico, o desempate entre eixos,
a precedência de tiles sólidos sobre plataformas e os efeitos no sprite.

### Organização do runtime

O arquivo `casualKits.ts` passará a compor três fragmentos:

- utilidades compartilhadas dos kits;
- Kit Equilibrista;
- Kit Balão.

Os fragmentos continuarão concatenados na mesma ordem. A mudança não criará
novas APIs, não alterará o bootstrap produzido e não mudará o ciclo de vida dos
kits. O comentário dos tiros de inimigos será corrigido para descrever a
integração direta usada hoje.

### Release e decisões do review

O manifest passará de `0.57.0` para `0.57.1`. Os relatórios registrarão como
aceitos os riscos de perda de projetos e regressão de física, pois o inventário
de produção não contém os blocos afetados. `sz_g2d_update_group` pertence ao Kit
Essencial; a decisão pressupõe que esse bloco específico também não foi usado
nos projetos existentes. A progressão pedagógica permanecerá como decisão de
produto.

## Verificação

A correção terá uma guarda determinística que limita as leituras da lista de
sólidos durante uma colisão ampla. Testes adicionais provarão que mutações em
`solid` e `platform` atualizam os índices sem alterar a API pública.

O benchmark será repetido com o mesmo processo e o mesmo hash de saídas douradas.
A entrega também exige os testes focados da extensão, `bun run typecheck`,
`bun run check`, `bun test src` e o cenário Playwright do Jogo 2D.
