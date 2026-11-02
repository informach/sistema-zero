# Substituição do Rive pelo ediSVG no Sistema Zero

> Registro histórico das bases citadas, em 31/10/2026. Este levantamento não representa o estado atual da implementação ou das implantações.

Data: 31/10/2026. Levantamento de integração, sem alterar o ediSVG nem substituir artes da plataforma.

## Conclusão

A substituição é viável para os usos encontrados. O ediSVG já tem um motor web independente do
Electron, com animações, máquinas de estados, entradas, gatilhos, eventos, desenho SVG, áudio e
políticas de movimento reduzido. A integração não deve depender da instalação nem da licença do
editor no computador de quem estuda.

Para um primeiro ensaio técnico, exportar **React (.react.zip)** pelo editor atual. Esse é o
exportador existente que preserva a composição interativa e entrega componente, motor e licenças.
Isso ainda não é um arquivo que o upload do Admin atual consiga aceitar.

Para a solução definitiva com cadastro no Admin, recomendo acrescentar ao ediSVG uma exportação
**Player web**, de dados compilados e versionados. Nome de arquivo proposto:
`nome.edi-animation.json`. Essa extensão e o envelope são propostas, não recursos já existentes.
O Sistema Zero terá um motor confiável e versionado, carregado uma vez, e receberá somente os
dados de cada arte. Não executará JavaScript vindo de uploads.

Não foi encontrada uma conversão/importação de `.riv` no ediSVG. A migração das artes exige os
originais vetoriais ou a reconstrução e animação no editor. Trocar a extensão não converte arquivos.

## Fontes e limites da análise

- Sistema Zero: interfaces observadas em staging local `8ba0ed6f148ec6428fa620a16dbbd8eeddeb048f`.
  Os consumidores Rive analisados também estão no corte de implantação `9ab50794e`.
- ediSVG: `C:/Users/tocha/projects/informach-apps/apps/edisvg`, versão de pacote 0.5.4,
  commit do monorepo `eb9095b7c845e6123b971230b7cfe571c7f245a3`.
- Motor compartilhado: `informach-apps/packages/edi-motion`, fora do diretório do aplicativo.
- Foram lidos contratos, exportadores, consumidores, upload, persistência, políticas e testes
  relevantes à substituição. Este documento não é uma auditoria de todos os produtos dos monorepos.
- Um build novo do runtime React e um teste do exportador foram executados. Não foi feito um
  piloto visual com artes do Zappy, uma medição de FPS nem uma certificação em celular real.
- Nenhum arquivo do ediSVG foi modificado. A alteração preexistente em `.claude/settings.local.json`
  foi preservada e não integra a análise.

## Onde o Rive está hoje

| Uso | Código principal | Comportamento que precisa continuar |
| --- | --- | --- |
| Zappy animado | `community-kids/src/components/kids/mascot.tsx`, `mascot-rive.tsx`, `mascot-rive-canvas.tsx` | Cinco expressões, pré-carga, imagem estática de reserva, silêncio e movimento reduzido. Na fala, começar e parar junto com o áudio da aula, fechando a boca ao parar. |
| Arte de cada módulo | `community-kids/src/components/kids/course-trail.tsx`, `trail-rive.tsx`, `trail-rive-canvas.tsx` | Arte escolhida no Admin, encaixe sem deformação, laço, pré-carga perto da tela, pausa fora dela, primeiro quadro com menos movimento e tratamento de falha sem quebrar a trilha. |
| Baú | `community-kids/src/components/kids/chest-rive-contract.ts`, `chest-rive-canvas.tsx`, `trail-chest.tsx` | Gatilho `open`, valor `opened` e estado final `Open`. O servidor confirma o resgate antes da animação. Reabrir um baú já recebido não concede prêmio de novo. |
| Cadastro e prévia | `admin/src/components/media/module-rive-uploader.tsx`, `module-rive-preview.tsx`, `app/api/media/module-rive/route.ts`, `server/media.ts`, `lib/riv-file.ts` | Upload autenticado, limites, validação por conteúdo e versão, R2 e prévia da arte real antes de salvar. |
| Campo persistido | `members/src/infrastructure/persistence/drizzle/schema.ts` e repositórios, DTOs e views | O módulo guarda `rive_url`; os contratos públicos usam `riveUrl`. O DTO e `core/src/course/module-rive.ts` recusam URLs que não terminem em `.riv`. |
| Distribuição | `community-kids/scripts/sync-rive-wasm.ts`, equivalente do Admin, manifests e políticas | WASM servido pela própria plataforma e CDN de recursos do Rive desligado. Existem testes de CORS, upload, descarte e navegador. |

Os cinco arquivos locais de expressão são `happy.riv`, `celebrating.riv`, `thinking.riv`,
`sleeping.riv` e `fala.riv`. O baú também admite uma URL configurada por
`NEXT_PUBLIC_KIDS_CHEST_RIVE_URL`.

O uso direto do runtime está concentrado no Kids e na prévia do Admin. Na comunidade adulta,
`community/src/components/community/lesson-zappy.tsx` usa as poses WebP estáticas. Compartilhar o
player novo pode permitir animá-las depois, mas a existência dessas imagens não comprova um
consumidor Rive adulto que também precise de conversão.

## Qual exportação usar

| Formato | Situação observada | Uso recomendado |
| --- | --- | --- |
| `.react.zip` | Existe. Seis arquivos: `EdiAnimation.jsx`, declarações, `edi-react-player.mjs`, `NextExample.tsx`, README e licenças. O blueprint compilado está dentro do componente. | Piloto e artes integradas pelo desenvolvimento, com o pacote revisado e a compatibilidade React verificada. Não tratar como upload de mídia executável. |
| Player web em JSON compilado | O documento e o compilador existem, mas não há exportação de arquivo independente com esse envelope. | Formato definitivo para cadastro de arte pelo Admin. É o acréscimo recomendado no ediSVG. |
| `.edisvg` / exportação `.edisvg.json` | Documento de autoria completo. `export.js` usa `serializeProject`, não entrega apenas o blueprint do player. | Guardar originais editáveis. Não enviar todo o projeto para o navegador do aluno como formato de execução. |
| SVG estático ou animado | Existe, com perfis e recusas para recursos que não preserva. A conversão animada é amostrada. | Imagem de reserva e casos decorativos simples, previamente qualificados. Não resolve sozinho entradas, estados e eventos do baú/Zappy. |
| Lottie | Existe com perfil próprio e limitações, inclusive em recursos gráficos e interação. | Não é a escolha para substituir todos os usos atuais. Acrescentaria outro consumidor e não preservaria todo o contrato interativo. |
| HTML interativo | Existe, com runtime e controles de demonstração embutidos. | Demonstração e revisão fora do app. Evitar um iframe/HTML completo para cada mascote ou arte de módulo. |
| GIF / vídeo / sequência PNG | Existem. Exportam a animação em quadros, não a lógica interativa. | Materiais de divulgação ou reserva estática, sem substituir o player interativo. |

Para o piloto atual: selecionar a prancheta, sua animação ou máquina inicial e exportar React,
com texto alternativo, encaixe `contain`, menos movimento respeitado e pausa fora da tela.
O projeto `.edisvg` permanece como original de trabalho separado.

## O que acrescentar ou revisar no ediSVG

1. **Exportador Player web.** Reutilizar `compileInteractiveArtboard` e o mesmo documento que
   hoje alimenta o React, sem criar outro avaliador. Emitir só a prancheta escolhida e suas
   dependências, com dimensão/viewBox, entrada inicial, versão do formato e versão/capacidades
   mínimas do motor. O blueprint interativo atual é **v13**.
2. **Contrato público dos controles.** Acrescentar nomes públicos estáveis para entradas,
   gatilhos e eventos, mapeados aos IDs internos. Hoje o consumidor recebe IDs do blueprint;
   não deve ter de procurar IDs novos a cada reconstrução da arte.
3. **Validação reutilizável sem DOM.** Publicar um subpath puro para validar o documento
   compilado, seus recursos e orçamentos no servidor. Hoje o parser interativo é exposto pelo
   `/runtime`, enquanto o entrypoint puro principal não o reexporta. Evitar importar o player,
   Yoga ou o aplicativo Electron no serviço que apenas recebe uma mídia.
4. **Imagem de reserva.** Emitir um quadro estático da mesma prancheta, com fundo transparente
   quando aplicável, e permitir definir a pose sem movimento. Não é necessário inventar um
   novo renderizador: reutilizar o exportador raster já existente.
5. **Distribuição do motor.** Gerar um artefato ESM versionado, com hash e licenças, independente
   do ZIP de cada desenho. O pacote `@informach/edi-motion` é privado e só tem exports de fonte;
   sua existência no outro monorepo não equivale a um pacote já instalável pelo Sistema Zero.
   Pode-se distribuir o bundle revisado por release interna, fixando a versão no build.
6. **Compatibilidade React.** O exporter e o peer atual declaram React 19.3.1+, enquanto a
   instalação de referência do Sistema Zero usa 19.2.6. Validar o player no React/Next reais do
   consumidor e só então ampliar a faixa suportada. Não apenas remover a restrição. Um adapter
   React do Sistema Zero sobre o player DOM é uma alternativa se não se quiser elevar o React.
7. **Documentação gerada.** O README dentro do ZIP ainda diz blueprint v9, enquanto o compilador
   atual emite v13. Gerar essa informação da constante vigente e testar o texto. O runtime local
   em `out/renderer` era de 19/10; a medição deste estudo refez o bundle, sem usar esse arquivo antigo.

O player já tem `play`, `pause`, `reset`, `setInput(s)`, `trigger`, callbacks de eventos e de
estado, descarte e controle de áudio. Não é necessário reimplementar essas capacidades no editor.

O envelope proposto para Player web deve incluir: identificador e versão do formato, versão do
exportador, blueprint, tamanho/viewBox, opções iniciais e aliases públicos de controles. Recursos
podem continuar no catálogo verificado por hash do documento. Caso sejam separados posteriormente,
isso exige um contrato explícito de resolução, orçamento e integridade; não trocar IDs por URLs
externas livres. A imagem de reserva pode ser um segundo arquivo vinculado pela mesma revisão.

## O que mudar no Sistema Zero

1. **Player único compartilhado.** Consumir o motor web homologado, com carregamento tardio,
   reserva estática e montagem por identidade da arte. Usar o mesmo player para a prévia do Admin
   e para o Kids. O projeto da arte é dado, não código enviado por upload.
2. **Modelo de mídia.** Criar uma referência de animação independente do fornecedor, com formato,
   URL/chave, revisão/hash, versão e reserva. Atualizar core, DTOs, domínio, repositórios, views e
   tipos dos dois apps. Não guardar JSON do ediSVG num campo que ainda se chama `riveUrl` e é
   validado como `.riv`. Fazer a migração do banco pelo mecanismo normal do Members.
3. **Admin e R2.** Substituir o uploader específico por upload e prévia do formato novo. Conferir
   schema, versão, referências, recursos e custo expandido antes de publicar. Preservar autorização,
   validação na borda, prefixo seguro da prévia, CORS e chaves imutáveis por revisão. Não aceitar
   JSX, scripts ou HTML de um arquivo de mídia. Revisar o teto atual de 5 MB com dados do piloto,
   em vez de apenas copiá-lo do limite de 10 MB do exportador.
4. **Artes de módulo.** Trocar o leitor de `.riv` pelo contrato novo. Manter encaixe, reserva de
   espaço, pausa e economia de dados já existentes. O formato novo precisa indicar claramente
   qual animação ou máquina começa e se ela repete; não depender da primeira timeline encontrada.
5. **Zappy.** Recriar/exportar as cinco expressões. Mapear `expression` e a propriedade `tocando`
   para controles públicos da arte. A voz da aula continua com seu player atual: ao iniciar,
   pausar, terminar ou falhar, a boca acompanha e retorna à pose fechada. Áudio embutido no
   ediSVG não substitui automaticamente as falas gravadas. Não foi provado lip sync fonético.
6. **Baú.** Mapear os aliases `open`, `opened` e a confirmação visual de estado final. Preservar
   o botão, o resgate no servidor e a idempotência. Um evento gráfico nunca credita moedas nem
   concede uma conquista. Abertura ocorre uma vez e retém a pose final; revisita mostra aberto.
7. **Entrega e limpeza.** Durante a migração, manter as referências Rive que ainda têm conteúdo
   real. Depois de converter e conferir todas, remover uploader/rota exclusivos, dependências,
   cópia de WASM, variáveis, arquivos e testes específicos que ficaram sem uso. Não apagar a
   reserva WebP, que continua útil com o motor novo.

Nos balões, preservar nome/texto/botão Ouvir acessíveis e não duplicar o mascote. Artes decorativas
não criam controles de teclado extras. Revisar também a política do host para fontes, recursos
embutidos, movimento reduzido e áudio iniciado por gesto.

## Desempenho: o que foi medido e o que falta

Foi construído um runtime React novo com a mesma configuração essencial do exportador:
Vite 8.3.4, produção, minificação, módulo único, React externo e sem gravação em `out/` do ediSVG.
O commit e o estado dos arquivos foram conferidos antes e depois. Brotli abaixo usa qualidade 5.

| Artefato medido | Bytes sem compressão | Bytes Brotli |
| --- | ---: | ---: |
| Runtime React atual do ediSVG, sem a arte | 594.912 | 166.956 |
| Apenas o WASM do Rive Canvas 2.42.1 instalado | 1.899.725 | 695.683 |

O resultado é promissor para o download. **Não é comparação completa de páginas nem prova de FPS
melhor**: faltam os desenhos, o JavaScript do Rive, os chunks Next, o custo de DOM/SVG, a
complexidade de rig/filtros e o aparelho real. Também não é uma medição da compressão servida em
produção. O bundle ediSVG mantém React externo, sem importar outro React nem dependências via CDN.

O ediSVG usa Yoga/WASM quando o documento pede layout. Esse código está no bundle independente
atual, mesmo que a inicialização seja condicional. Portanto, não prometer remoção total de WASM
nem retirar `wasm-unsafe-eval` da CSP sem conferir os documentos e os outros consumidores.

O scheduler atual já interrompe quadros fora da tela, com aba oculta e com menos movimento, e
libera observadores no descarte. Na integração, preservar isso e não atualizar estado React por
quadro. Compartilhar o runtime e cache de dados, mas nunca compartilhar a sessão mutável entre
duas instâncias do Zappy. Separar engine de layout/áudio em chunks só se a medição justificar.

Piloto necessário: uma fala do Zappy com áudio real, um módulo com várias artes e o baú completo.
Medir carga fria/quente, bytes por tela, tempo de primeira arte, CPU/memória, long tasks e tempo de
quadro. Validar 60 fps no computador e, quando animar, 30 fps no aparelho mais fraco, além de
nenhuma atividade contínua de quadro quando pausado/oculto. Comparar a mesma composição e
dispositivo, incluindo Android/iPhone reais posteriormente, sem inferir aprovação a partir de emulação.

## Ordem recomendada de execução

1. Fazer um ensaio com o `.react.zip` atual e uma arte real, antes de substituir qualquer tela.
2. Entregar o exportador Player web, validação pura, aliases e artefato de runtime versionado.
3. Integrar upload/prévia/armazenamento e uma arte de módulo no ambiente de testes.
4. Migrar o Zappy e provar áudio, troca de expressão, falha, reabertura e menos movimento.
5. Migrar o baú e provar gatilho, pose final, revisita e independência das recompensas.
6. Conferir browser/Next/StrictMode, várias instâncias, cache, descarte e desempenho; migrar o
   restante dos arquivos e só então retirar a infraestrutura específica do Rive.

## Evidências desta sessão

- Build isolado do runtime: `.cache/deploy-local-20261031-1507/edisvg-runtime-measure.json`.
  SHA-256 do módulo novo: `095bfaffff785fa34832687d4b0b2dccf6e1927eebd95d16a1fb58c3cd752a8d`.
- Teste existente do arquivo React: `node --import tsx --test
  src/renderer/src/behavior/react-export.test.ts`, executado no ediSVG: 1 passou, 0 falharam.
  Prova nomes, limites e determinismo do pacote. Não prova a arte no Sistema Zero.
- A análise de compatibilidade React também considera a documentação oficial de
  [useEffectEvent](https://react.dev/reference/react/useEffectEvent). A API disponível no host
  não substitui a homologação da faixa de versões declarada pelo exportador.
- Fontes principais no ediSVG: `src/renderer/src/behavior/react-export.ts`,
  `src/renderer/src/export.js`, `src/shared/interactive.ts`; no edi-motion:
  `src/react.tsx`, `src/interactiveDocument.ts`, `src/interactiveRuntime.ts`,
  `src/visual/react.tsx`, `src/frameLoop.ts`, `src/layout/yoga.ts` e `README.md`.

Este levantamento especifica a troca. Não afirma que as artes foram convertidas, que a nova
exportação de dados já existe ou que os dispositivos foram homologados.
