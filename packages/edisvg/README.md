# Artes ediSVG no Sistema Zero

Este pacote integra o player web portátil do ediSVG. O editor e o consumidor usam o mesmo
compilador e interpretador. O formato não é exclusivo do Sistema Zero.

## Exportar e cadastrar uma nova arte

1. No ediSVG, escolha a prancheta e a entrada inicial corretas.
2. Exporte por **Animação para web**. Preserve o `.edisvg` como projeto editável separado.
3. No Admin, abra o módulo do curso e envie o `.edi-animation.json` em **Animação do módulo**.
4. Confira a prévia e salve. O Admin extrai a reserva PNG, valida ambos e cria uma revisão
   imutável no R2. O botão Remover limpa a referência do módulo, não apaga mídia de outro módulo.

O upload não contém código executável. O parser canônico impõe versão, recursos seguros e
limites de bytes/custo. O projeto do editor, HTML, SVG bruto e JSX não são aceitos como arte web.

## Usar em outra aplicação web

No ediSVG, **Baixar player para outro aplicativo** entrega um ZIP com o módulo JavaScript,
tipos, exemplos JavaScript/React e licenças. Não exige importar este monorepo, instalar Electron,
assinar o Sistema Zero ou carregar o editor. A aplicação hospeda o player e suas exportações.
O `mountWebAnimation` cria uma sessão por SVG; quem monta deve descartar a sessão ao sair.

## Consumir neste monorepo

- `@sistemazero/edisvg/data`: validação sem DOM/React, metadados e separação da reserva.
- `@sistemazero/edisvg/react`: `EdiAnimation` e pré-carga do módulo DOM.
- `@sistemazero/edisvg/builtins`: referências pequenas às sete artes embarcadas.
- `@sistemazero/edisvg/types`: contrato do SDK portátil.

`EdiAnimation` mantém a reserva desde o primeiro HTML. Só baixa e monta perto da tela; respeita
menos movimento, economia de dados, pausa e aba oculta. O download é compartilhado, com teto de
10 MB por arquivo e cache LRU de 24 entradas/20 MB. Cada componente mantém seu próprio relógio,
estado e descarte. Não há atualização de estado React por quadro. O fetch usa same-origin para
preservar autenticação da prévia Admin; não envia cookies para o R2 de outra origem.

Controles são nomes públicos do projeto. A fala usa `falando`; o baú usa `aberto`, máquina `Baú`,
camada `Tampa` e estado final `Aberto`. O player nunca concede prêmios nem conclui aulas.

## Atualizar o motor e as artes embarcadas

`vendor/manifest.json` registra commit de origem e SHA/tamanho dos seis arquivos do build.
Atualize o player, os tipos, o módulo puro e as licenças juntos. Não copie código do editor
para o componente React e não baixe um runtime externo em produção.

`art/edisvg/sources` preserva os originais; `derived` contém variantes editáveis e proveniência;
`exports` contém os arquivos web completos e o manifest de qualificação. Estes diretórios ficam
no Git e fora do contexto Docker.

Na raiz, `scripts/edisvg/import-artifacts.ts` confere o recibo do exportador e seus hashes antes
de aceitar uma exportação. `scripts/edisvg/prepare-builtins.ts` prepara os sete recursos usados
nas interfaces. A reserva WebP usa compressão sem perda e `exact`; a geração decodifica ambos e
exige RGBA idêntico ao PNG. O JSON de runtime não repete a reserva incorporada na exportação.

Admin, Kids e comunidade executam `bun ../edisvg/scripts/sync-assets.ts public` antes de dev/build.
O script confere SHA/tamanho e remove apenas arquivos gerados obsoletos do próprio namespace.
Não depende do editor instalado ou do diretório Downloads durante o build.

## Verificações

Execute `bun run test`, `bun run typecheck` e `bun run check` neste pacote. Os testes de cache
usam Node nativo e HTTP local real, inclusive limites, cancelamento e compartilhamento.
Os testes de desenho/voz/resgate ficam no Kids; DOM simulado não qualifica o renderer SVG.
Confira o plano e os recibos de `docs/qa/2026-10-31-edisvg` antes de afirmar implantação.
