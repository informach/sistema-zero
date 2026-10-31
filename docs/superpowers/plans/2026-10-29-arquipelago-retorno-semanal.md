# L09: retorno semanal e festas recorrentes

A proposta prevê tema de construção semanal, feira renovada e festas anuais. Ausência não
perde conquistas. O tema é convite criativo, sem exigência de cor, objeto comprado ou nota.

## Tema de construção

- Calendário puro com semana iniciando segunda-feira no dia civil de São Paulo. Uma referência
  fixa e uma lista editorial versionada garantem o mesmo convite nos dois públicos e aparelhos.
- Seis convites baseados nos sistemas que existem: luz e janelas, horta, cores próprias,
  cantinho de leitura, cozinha e espaço para visitas. Cada convite dá uma sugestão concreta,
  sem bloquear outra escolha, sem prêmio por entrar todos os dias e sem contagem regressiva.
- O diário mostra o convite da semana e todos os anteriores da lista. Continuar qualquer tema
  depois da troca é permitido. Só abrir Construir usa as mesmas regras de acesso já existentes.
- A janela muda por data; nenhum campo novo no salvamento ou evento financeiro.
- Testes: domingo/segunda, fronteira UTC/São Paulo, virada de ano, repetição do ciclo, entrada
  inválida e textos. Conferência de leitura e seleção no computador e celular.

## Feira e peças sazonais

- A vitrine de aparências reutiliza o catálogo, a loja e a confirmação de compra já existentes.
  Não cria carteira, inventário ou cobrança própria. A migração para o inventário único de L04
  continua necessária e alcançará essa mesma porta. Insumos de L07 não entram nesta vitrine.
- A barraca de brinquedos `barraca-6` da Vila abre a feira por E ou Usar. A cada segunda-feira
  de São Paulo, três das nove aparências existentes ganham destaque; todas continuam acessíveis.
  Só oferece compra quando o projeto funcional correspondente já existe. Não duplica modelos.
- A rotação destaca itens existentes, mas não elimina o acesso ao catálogo normal nem uma
  compra anterior. Aparências têm que ser compatíveis com o destino antes de aparecer.
- Carnaval e Junina mantêm datas aprovadas. Noite das Lanternas continua sem data definida;
  fim de ano continua proposta. Não ativar essas janelas por inferência.
- O aviso anual existente já guarda o ano de São Paulo no localStorage. Não substituí-lo
  por uma marca permanente que silencie as próximas edições.

## Estado

- [x] Tema semanal puro, integrado ao diário; testes e navegador Kids computador/celular.
- [x] Vitrine semanal com compra pela porta atual; navegador Kids computador e adulto celular,
  confirmação, cancelamento, persistência e recusa de cobrança duplicada.
- [ ] Migração da propriedade das aparências para o inventário único, junto de L04.
- [x] Receitas e sugestões de roupas sazonais com catálogos existentes e confirmação da plataforma.
- [ ] Conferência autenticada do vestuário junto ao mundo completo, no aceite de L14.
- [ ] Revisão e prova integrada de retorno sem perda de progresso.

Evidências locais: `docs/qa/2026-10-29-convidados/` e `docs/qa/2026-10-29-feira/`.
O navegador usa o serviço simulado do playground. Não representa implantação ou teste remoto.

Complementos de 30/10: planos de receitas sazonais e vestuário sazonal; provas em
`docs/qa/2026-10-30-receitas-sazonais/` e `docs/qa/2026-10-30-vestuario/`. A decoração das
festas aprovadas continua usando os modelos existentes. Lanternas e fim de ano seguem
sem ativação automática enquanto a dona não definir as datas.
