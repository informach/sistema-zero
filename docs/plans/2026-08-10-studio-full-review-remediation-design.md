# Design — remediação integral do full review do Estúdio

**Data:** 2026-08-10  
**Escopo:** `packages/studio`, `packages/studio-runtime` e CI do Estúdio

## Objetivo

Corrigir os sete grupos de achados do full review: bypass da CSP no runtime Pro, capas sem canvas, instabilidade da suíte E2E, isolamento insuficiente de UGC público, acoplamento que elimina o lazy-loading do editor, concentração arquitetural e higiene/dependências.

## Abordagem aprovada

A remediação será feita em camadas compatíveis. O editor continuará aceitando projetos criativos com recursos externos, enquanto o player público terá política estrita por padrão e uma fronteira explícita para execução em origem isolada. Não será criado um novo serviço de preview nesta etapa.

Os arquivos grandes que já têm alterações concorrentes não serão reescritos em massa. A decomposição será introduzida por fronteiras novas e pequenas, acompanhadas por testes que impeçam o acoplamento de voltar.

## CSP do runtime Pro

O runtime deixará de inserir a CSP por substituição textual. O HTML compilado será analisado e serializado por um parser HTML, e a meta de segurança será anexada ao `head` estrutural real. Documentos sem `head` serão normalizados pelo parser. Testes de navegador cobrirão scripts e comentários posicionados antes do `head`, além do caso canônico.

## Capas e snapshots DOM

A rasterização baseada em `foreignObject` será consolidada num runtime compartilhado. A mesma implementação atenderá previews com canvas, overlays DOM e projetos inteiramente DOM. Falhas de canvas contaminado continuarão isoladas e retornarão `null` somente depois da tentativa DOM.

## Confiabilidade E2E e CI

Os E2E passarão a rodar contra um build de produção servido pelo Vite Preview. A auditoria visual desativará transições e `content-visibility` apenas durante a medição. Falhas de recurso registrarão URL, status e tipo da requisição. A suíte Chromium completa será dividida em shards no CI, mantendo os casos de segurança em Firefox.

## Perfil estrito para UGC público

O CSP ganhará perfis explícitos. O perfil estrito bloqueará por padrão rede ativa e passiva; o perfil criativo manterá a compatibilidade do editor. `StudioProjectPlayer` usará o perfil estrito por padrão e aceitará opt-in documentado para recursos externos.

O player também aceitará um adaptador assíncrono que transforme o documento de preview em uma URL de origem isolada. Quando configurado, o iframe usará `src`; sem adaptador, continuará usando `srcDoc` opaco para preservar instalações existentes. O contrato permitirá que o host adote um serviço isolado sem mudar o formato do projeto.

## Bundle e fronteiras arquiteturais

As APIs leves usadas pelo playground serão expostas em subpaths específicos, eliminando o import estático da raiz que alcança `StudioEditor`. O build terá uma asserção para o chunk inicial e outra para a fronteira lazy do editor.

As novas APIs de segurança, renderização pública e captura DOM ficarão em módulos focados, em vez de ampliar os coordenadores centrais. Testes de arquitetura verificarão que os subpaths leves não importam a raiz nem o editor e que a política de segurança permanece centralizada.

## Dependências e higiene

Warnings estáticos diretamente relacionados ao Estúdio serão corrigidos sem alterar comportamento. A cadeia `wrangler`/`miniflare`/`undici` será atualizada pela dependência oficial que contém a correção; não será aplicado override de pacote transitivo sem suporte do mantenedor.

## Testes e verificação

Cada correção receberá primeiro um teste de regressão. A validação final incluirá testes direcionados, suíte unitária completa, typecheck, Biome, builds, auditoria de dependências e Playwright completo. Nenhuma conclusão será declarada com base em resultados anteriores às mudanças.

## Critérios de aceite

- Nenhum conteúdo antes do `head` consegue executar antes da CSP do runtime Pro.
- Projetos DOM-only produzem capa e snapshot sem `html2canvas` remoto.
- O contraste é medido de forma determinística e a suíte E2E usa artefato de produção.
- O player público bloqueia rede passiva por padrão e pode delegar execução a outra origem.
- O playground preserva a fronteira lazy do editor e possui orçamento verificável.
- Novas responsabilidades ficam fora dos coordenadores centrais e os subpaths leves não recaem na raiz.
- O Estúdio termina sem warnings próprios e sem a vulnerabilidade transitiva identificada.
