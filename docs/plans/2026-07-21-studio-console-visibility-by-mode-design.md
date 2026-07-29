# Visibilidade inicial do Console por modo

**Status:** aprovado em 2026-07-21

## Objetivo

Dar mais espaço ao editor e reduzir informação técnica no fluxo infantil de
blocos, sem remover o Console nem perder mensagens produzidas pelo preview.

## Decisão de experiência

O Console começa oculto nos modos **Blocos** e **Ponte**. No modo **Código**, ele
começa visível. Em todos os modos, o menu de três pontos permite mostrar ou
esconder o painel.

A primeira ação manual substitui o padrão do modo. Essa escolha permanece ao
trocar de projeto ou modo enquanto a mesma instância do Estúdio estiver aberta.
Fechar o Estúdio encerra a preferência; uma nova instância volta a usar o padrão
do modo.

Mensagens continuam chegando ao armazenamento do Console enquanto o painel está
oculto. Quando o aluno o abre, encontra o histórico acumulado. Logs e erros não
abrem o painel automaticamente.

## Modelo de estado

A preferência de sessão terá três estados:

- sem escolha manual;
- visível por escolha manual;
- oculto por escolha manual.

Sem escolha manual, a visibilidade efetiva deriva do modo:

| Modo | Console inicial |
| --- | --- |
| Blocos | oculto |
| Ponte | oculto |
| Código | visível |

Depois de uma escolha manual, a visibilidade efetiva usa esse valor em qualquer
modo ou projeto. O estado pertence à instância do Estúdio, não ao projeto, e não
será gravado no navegador.

A configuração pública `features.console` permanece como limite do host. Quando
ela estiver desligada, o Estúdio não mostrará o painel nem a opção no menu,
independentemente da preferência de sessão.

## Interação e layout

O item Console no menu de três pontos refletirá a visibilidade efetiva. Ao
selecioná-lo, o aluno escolhe explicitamente o estado oposto.

Em telas largas, ocultar a única aba inferior remove também o painel inferior e
devolve o espaço ao editor. Em telas estreitas, a aba Console sai da lista. O
mesmo item do menu restaura o painel nos dois layouts.

O preview permanece ativo e continua enviando mensagens ao `logsStore`. A
visibilidade controla apenas a apresentação do Console.

## Alternativas descartadas

Trocar o booleano global para oculto esconderia o Console também no modo Código.
Reaplicar o padrão a cada troca de modo ou projeto sobrescreveria a escolha
manual. Persistir a preferência no navegador faria uma decisão antiga sobreviver
a novas sessões e enfraqueceria os padrões pedagógicos de cada modo.

## Fora de escopo

Esta mudança não adicionará contador, badge, toast, abertura automática ou
espelhamento de diagnósticos semânticos dos blocos no Console. Ela também não
mudará a captura, a retenção ou a formatação das mensagens.

## Testes

Os testes devem demonstrar que:

- Blocos e Ponte começam sem a aba e sem o painel do Console;
- Código começa com o Console visível;
- o menu de três pontos mostra e esconde o Console nos três modos;
- a escolha manual prevalece após trocar de modo ou projeto;
- uma nova instância do Estúdio volta ao padrão do modo;
- `features.console: false` continua removendo painel e item de menu;
- mensagens recebidas com o painel oculto aparecem quando ele é aberto;
- os layouts largo e estreito aplicam a mesma regra de visibilidade.
