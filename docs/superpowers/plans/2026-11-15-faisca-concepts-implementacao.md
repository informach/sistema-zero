# Faísca pelas referências — plano de implementação

> Execução nesta sessão com `executing-plans`, sem subagentes. A usuária autorizou a implantação completa e pediu avaliar somente o conjunto montado, em vez de aprovar mapas/peças intermediários.

**Objetivo:** recompor o piloto no `/macro` a partir das três imagens: vila enquadrada por fachadas e árvores, praça contínua, cultivo, lago com ponte de corrimãos e Farol sobre colina rochosa.

**Arquitetura:** manter a declaração `PecaNaFaisca`, carregador, instâncias, assentamento, rede de passeios, bacia e setores existentes. Geometria de catálogo e colisão compartilham transformações. Atualizar as âncoras locais que precisam de recomposição e as ferramentas que as consomem.

**Tecnologias:** TypeScript, React Three Fiber, Three.js, Rapier, Bun e Playwright.

**Especificação:** [imagens e curadoria](../../plans/2026-11-15-faisca-concepts-curadoria.md), complementando o [projeto integral](../../plans/2026-11-15-faisca-projeto-artistico-praca-horta.md).

## Restrições globais

- Preservar sete territórios, Faísca ~520 m, seis distritos/cabeceiras, controladores, velocidade, inventário e identidades Kids/adulta.
- Preservar reserva atual da Morada de 24 × 24 m; não integrar a casa da conta nesta composição.
- Manter coração compacto e saídas legíveis; narrativa da oficina interrompida, sem campanha nova.
- Adventure Land prioritário quando adequado; exceções documentadas por função e composição.
- Não versionar os GLBs/texturas privados do acervo; registrar origem e hashes no manifesto.
- Avaliar o conjunto pronto. Não parar para pedir seleção de peças ou confirmação de etapas já autorizadas.
- Preservar alteração externa no roteiro da aula dos pais.

## 1. Preparação e procedência

Arquivos: `scripts/exportar-arte-faisca.ts`, `scripts/pecas-morada-faisca.ts`, `src/mundo/faisca/arte.generated.ts` do pacote.

- [x] Conferir `staging` local e remota em `16c3f719b` e mudanças externas.
- [ ] Exportar a seleção do acervo fixado em `67b72d4a1a90c0e95c6217341dccfc723ebe8c49`; manter procedência individual da Morada.
- [ ] Acrescentar pontes arqueadas, vegetação baixa, copas, rochas, componentes de água e carpintaria necessários.
- [ ] Preparar acabamentos restritos às peças/partes identificadas, sem modificar o original ou a paleta de outros objetos.

Comando: `bun scripts/exportar-arte-faisca.ts` em `packages/arquipelago`.

## 2. Praça, arquitetura e caminhos

Arquivos: `vila-catalogo-faisca.ts`, `composicao-faisca.ts`, `passeios-da-faisca.ts`, `solo-da-praca.ts`, `faisca.ts`, `pisos-de-catalogo.tsx`.

- [ ] Montar fachadas com os módulos reais de construção, em frente coerente à praça; gables, molduras, madeira e portas com função legível.
- [ ] Fazer praça contínua com os mesmos módulos de pedra e recorte das juntas; retirar o piso laranja da praça.
- [ ] Centralizar o encontro do poço sem bloquear a circulação; manter os acessos cotidianos próximos.
- [ ] Ligar caminhos a fachadas, oficina, horta, Costa e Farol; atualizar rotas/placas nos mesmos dados.
- [ ] Reservar implantação rígida pelo apoio de toda a construção, sem fundações flutuantes.

Interfaces preservadas: `casasDaVila(): PecaNaFaisca[]`, `passeiosDaFaisca(piso): ModuloDePasseio[]`, `assentamentoDaPeca(p)`.

## 3. Paisagem, cultivo e água

Arquivos: `composicao-faisca.ts`, `lago-da-faisca.ts`, `lago.tsx`, `faisca.ts`, `setores-do-arquipelago.ts`, componentes ambientais em `mundo/faisca/`.

- [ ] Integrar a ponte selecionada ao lago e à chegada da horta; usar piso e apoios reais para assentar o modelo.
- [ ] Manter contorno visual, furo no terreno, bacia, nível de nado e colisores correspondentes.
- [ ] Compor margem rochosa, queda/riacho, jardins e vegetação em camadas; não sobrepor águas nem criar barragens invisíveis.
- [ ] Enquadrar a vila e a colina com copas; proteger vistas, circulação e lote da Morada.
- [ ] Montar apoio rochoso do Farol e chegada legível; manter altura/modelo.
- [ ] Usar iluminação e materiais coerentes de dia/noite; sem luz artificial nas letras das placas.

## 4. Verificação e refinamento visual

- [ ] Capturar as mesmas vistas do antes e do depois, mais aproximações pela câmera normal.
- [ ] Percorrer praça, horta, ponte nos dois sentidos, margem/nado e subida com o controlador real.
- [ ] Corrigir causas de flutuação, sobreposição, z-fighting e bloqueios encontrados.
- [ ] Verificar toque, retomada local, entrada/saída dos setores e três ciclos de recursos.
- [ ] Gravar vídeos curtos dos percursos e registrar métricas do renderer.

Verificações do pacote:

```powershell
bun test
bun run typecheck
bun run check
bun run build
```

Os testes que possuem coordenadas da composição anterior deverão acompanhar a nova geometria; não eliminar verificações de passagem, lote, água ou recursos para obter aprovação.

## 5. Entrega

- [ ] Registrar relatório com implementação, correções, limites e evidências, sem declarar aprovação artística humana.
- [ ] Versionar código, plano, relatório, capturas e vídeos; manter binários licenciados em `output/`.
- [ ] Commitar em `staging`, fazer push e conferir SHA remoto.
- [ ] Manter `http://127.0.0.1:4530/macro` disponível para a avaliação do conjunto pronto.
