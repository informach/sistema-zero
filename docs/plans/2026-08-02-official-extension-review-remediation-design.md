# Remediação do full review do Jogo 2D

**Data:** 2026-08-02  
**Escopo principal:** `packages/studio/src/official-extensions/game-2d`  
**Escopo compartilhado:** contrato e carregamento de exemplos das cinco extensões oficiais

## Objetivo

Corrigir os achados do full review do Jogo 2D, exceto a curadoria pedagógica da paleta. A mudança preserva projetos salvos, tipos de bloco, ordem dos exemplos, IR, assets e APIs existentes, salvo pelas correções comportamentais descritas abaixo.

## Carregamento dos exemplos

O manifesto volta a conter apenas dados leves e serializáveis. `ExtensionDefinition` recebe um provider de exemplos com a contagem esperada e um `load()` assíncrono. As cinco extensões oficiais usam imports dinâmicos relativos para criar chunks separados.

`loadExtensionExamples(extension)` será o caminho único de leitura. O helper:

- compartilha a mesma Promise entre consumidores concorrentes;
- valida os exemplos com o schema existente;
- confere a contagem declarada;
- preserva a ordem e congela o array validado;
- remove falhas do cache para permitir uma nova tentativa.

`ExtensionsPanel` e `KitGallery` carregam os providers apenas quando a interface de exemplos está visível. Durante a carga, mostram um estado acessível; em erro, mostram uma mensagem e permitem tentar novamente. Catálogo, instalação, geração de preview e `findExtension` permanecem síncronos.

## Correções do runtime do Jogo 2D

### Pausa de áudio

O domínio de áudio suspende o `AudioContext` quando a partida pausa e o contexto está rodando. A retomada respeita a Promise de `resume()` e só reativa o scheduler da música se a partida continuar ativa. Contextos ainda bloqueados pelo navegador não são desbloqueados artificialmente.

### Evento do Equilibrista

O kit guarda o acerto do bastão como uma travessia pendente. `onCross` e `onPerfect` disparam quando o herói alcança a plataforma, depois de atualizar a fase e a posição. Reiniciar ou trocar de cena dentro do callback não deixa o runtime continuar uma transição antiga.

### Aleatoriedade segura

`randomChance` limita a porcentagem a `0..100`. `randomX` e `randomY` aceitam uma dimensão opcional. Os blocos passam largura e altura, com sombras didáticas, para manter o sprite inteiro no viewport. Chamadas antigas sem argumento mantêm a semântica legada.

### Revisões de grupo

Mutações de grupos gerenciados deixam o `Proxy` como única fonte de revisão. Helpers incrementam manualmente somente grupos externos não gerenciados.

## Organização e contratos

O catálogo de blocos será dividido em módulos por domínio, mantendo um único array público na ordem atual. O runtime dos kits arcade será separado por família de jogo e continuará composto como uma única string de bootstrap.

Os testes de contrato passam a cobrir os retornos observáveis e as invariantes que escapavam da checagem baseada apenas em nomes de parâmetros. A suíte inclui o instante dos eventos do Equilibrista, o lifecycle real do `AudioContext`, limites aleatórios, revisão unitária de grupos e um orçamento de bundle.

## Documentação e versão

O guia de extensões documentará o provider assíncrono. A auditoria do Jogo 2D registrará 31 exemplos e os achados encerrados. O manifesto do Jogo 2D receberá incremento de patch por causa das correções comportamentais; as demais extensões mantêm suas versões porque apenas o mecanismo interno de entrega dos exemplos muda.

## Verificação

A entrega exige:

1. regressões vermelhas antes das correções funcionais;
2. testes focados de contratos, manifests, loaders e componentes;
3. suíte própria do Jogo 2D e integrações do parser;
4. TypeScript e Biome do Studio;
5. Playwright dos exemplos, instalação, reabertura e Ponte;
6. medição minificada antes/depois e prova de que o catálogo inicial não contém o conteúdo dos exemplos.

## Fora do escopo

A quantidade de blocos visíveis e a curadoria pedagógica permanecem inalteradas, conforme decisão explícita do usuário.
