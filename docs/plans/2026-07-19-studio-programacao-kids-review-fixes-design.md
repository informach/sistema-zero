# Correções da categoria Programação para crianças

Data: 19/07/2026

## Objetivo

Corrigir todos os achados do review da categoria Programação do Studio. A criança deve conseguir montar apenas programas coerentes com o contexto, aprender conceitos completos em cada degrau e atravessar Blocos, Ponte e Código sem perder estrutura ou identidade.

## Decisão aprovada

A correção preserva a arquitetura atual e fortalece seus contratos centrais. Contextos de JavaScript passam a ser tipos físicos de conexão; flyouts recebem o perfil de aprendizagem; seletores de nomes distinguem leitura e escrita; e o round-trip preserva a identidade de blocos internos. Operações inseguras de DOM saem da linguagem guiada e voltam como Código avançado quando importadas.

## Contextos e símbolos

- Laço, função, função assíncrona, evento e construtor derivado têm contextos próprios.
- `break` e `continue` só entram em laços.
- `return` só entra em funções, métodos e construtores.
- `await` só entra em corpos assíncronos.
- `super` só entra no contexto de classe adequado.
- Métodos e valores de evento só entram em eventos.
- A lista de nomes considera escopo léxico. Seletores de escrita excluem constantes e nomes ainda não declarados.

## Paleta e progressão

Flyouts de Funções e Classes filtram cada bloco pelo nível e por `allowBlocks`. As unidades pedagógicas aparecem completas: criar e modificar listas no mesmo degrau; salvar e ler dados no mesmo degrau; enviar formulário junto da forma segura de impedir o recarregamento.

`Quando a página carregar` fica na área correta. Temporizadores têm um único lugar. Operações de objetos deixam a seção de listas.

## Segurança do DOM

Os blocos guiados escrevem texto com `textContent` ou valores de formulário com `value`. `innerHTML`, atributos de evento, `srcdoc` e URLs `javascript:` não são representados por esses blocos. Ao importar código com essas operações, o parser preserva a linha como Código avançado em vez de criar um bloco aparentemente seguro.

## Ponte e identidade

O parser reconhece uma Promise vazia antes do caso genérico de instanciação. Cada `caso` de `switch` carrega seu próprio ID no IR, na serialização, no gerador e no source map.

## Linguagem e acessibilidade

Todos os blocos oferecidos têm tooltip. Textos infantis explicam efeito e uso, sem repetir a sintaxe que a Ponte já mostra. O seletor de nomes recebe rótulo acessível, foco visível, ações específicas e ícones decorativos ocultos de leitores de tela.

## Verificação

Cada achado recebe um teste mínimo que falha antes da correção. A matriz cobre paleta, conexões reais, escopo, geração sintática, segurança, IR, IDs e round-trip. A entrega exige os testes focados e, depois, `bun test src`, `bun run typecheck` e `bun run check` no pacote Studio.
