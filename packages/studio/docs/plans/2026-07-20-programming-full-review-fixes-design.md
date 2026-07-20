# Correções do full review de Programação

## Objetivo

Corrigir os seis achados do full review da categoria Programação sem reescrever o
pipeline inteiro. O lote preserva projetos antigos, mantém o texto branco nos
blocos e conserva a CSP restritiva do preview.

## Abordagem

O trabalho cria contratos puros para aparência, execução semântica e handlers
HTML. Os arquivos centrais passam a consumir esses contratos e não recebem novas
tabelas ou regras transversais. A refatoração arquitetural fica limitada às
áreas tocadas pelas correções.

## Acessibilidade visual

A paleta de Programação continuará em tons de âmbar e laranja, mas cada cor de
bloco terá contraste mínimo de 4,5:1 com texto branco. A regra vale para as 149
definições visíveis, inclusive tons derivados por subcategoria.

O rótulo selecionado da toolbox voltará a usar texto branco, coerente com a nova
paleta. Um teste unitário medirá todas as definições reais. Um teste de navegador
comparará o `fill` computado dos textos e caminhos SVG renderizados.

O campo de busca receberá uma classe estável e um estado `:focus-visible`
explícito. O estilo inline deixará de remover o outline.

## Organização pedagógica

O contrato de Programação definirá os valores usados para construir condições:
booleano, comparação, E/OU e Não. A toolbox colocará esses blocos em
“Lógica & Se” e os removerá de “Valores”, sem duplicação. O nível iniciante
continuará com 25 blocos.

## Handlers HTML e CSP

O preview preservará atributos nativos como `onclick`. Antes de montar o
documento, um módulo puro localizará os atributos `on*`, decodificará o conteúdo,
instrumentará seus loops e reescreverá o valor seguro no HTML.

A CSP receberá os hashes SHA-256 exatos desses handlers e incluirá
`'unsafe-hashes'` somente quando houver handlers autorizados. Ela continuará sem
`'unsafe-inline'`, `data:` genérico ou `blob:` em `script-src`. Scripts e handlers
criados dinamicamente continuarão bloqueados, salvo quando seus bytes coincidirem
com um handler já instrumentado e autorizado.

Como o navegador continuará executando o atributo nativo, permanecem as
semânticas de `this`, `event` e `return false`. O loop guard também alcançará
laços escritos dentro do atributo.

## Validação temporal de símbolos

Um contrato separado classificará corpos filhos como imediatos, adiados ou
invocáveis. Corpos de temporizadores e eventos verão declarações concluídas ao
fim da tarefa atual; laços e condicionais continuarão usando apenas os símbolos
disponíveis naquele ponto.

O inventário de símbolos armazenará definições de classes e a classe conhecida
de cada instância. Construtores e métodos conhecidos serão revalidados no ponto
da instanciação ou chamada, assim como já ocorre com funções nomeadas. A busca de
métodos respeitará herança e terá guarda contra ciclos.

Expressões `new Namespace.Classe()` validarão o namespace. Namespaces oficiais,
imports e variáveis previamente declaradas serão aceitos; nomes inexistentes
gerarão diagnóstico.

## Refatoração incremental

O lote separará três responsabilidades hoje espalhadas:

- aparência e contraste de Programação;
- catálogo de referências e regras de execução;
- extração, instrumentação e autorização de handlers HTML.

Não haverá migração em massa dos 149 blocos para um novo sistema de adapters.
Novas regras transversais entrarão pelos contratos extraídos, evitando ampliar
os grandes switches do schema, parser, gerador e workspace.

## Testes e gates

Cada defeito receberá primeiro uma regressão que falha no estado anterior:

- contraste das 149 definições e contraste computado no Blockly real;
- execução de `onclick`, preservação de `return false` e corte de loop infinito;
- bloqueio de scripts e handlers dinâmicos não autorizados;
- temporizador com declaração posterior válida;
- método chamado antes da declaração capturada inválido;
- namespace inexistente inválido;
- snapshot exato das subcategorias iniciantes;
- foco visível da busca.

Depois das correções, serão executados Biome, TypeScript, testes focados, suíte
completa e Playwright. Falhas globais preexistentes fora deste escopo serão
isoladas e relatadas; somente regressões causadas pelo lote serão alteradas.

## Fora de escopo

- reescrever os seis arquivos centrais do pipeline;
- liberar execução arbitrária de script inline;
- mudar o orçamento de 25 blocos iniciantes;
- alterar APIs públicas ou o formato persistido do projeto.
