# Ajuste dos ícones e do papel dos pais no Desafio

## Problema

Na seção "O papel dos pais", quatro nomes internos do Material Symbols aparecem como texto em inglês. A regra `.dpj .arow .al-val span` troca a fonte dos ícones pela fonte de texto e impede que as ligaduras `event`, `computer`, `family_restroom` e `celebration` sejam desenhadas.

O hero e a seção também destacam que os pais não precisam programar. Essa formulação pressupõe que o responsável reconheça programação como uma barreira. A mensagem precisa explicar o papel do adulto com ações simples e familiares.

## Decisão aprovada

Corrigir a regra que sobrescreve a fonte dos ícones, preservando o Material Symbols self-hosted usado pelo funil inteiro. A correção será feita no seletor da seção, sem esconder palavras nem trocar os ícones por conteúdo duplicado.

Atualizar a copy do Desafio:

- Hero: "Você apoia sem precisar ensinar"
- Título da seção: "Você não precisa ensinar. Só precisa ajudar a começar."
- Texto da seção: "Escolha um momento possível na rotina, garanta um computador compatível e acompanhe o primeiro acesso. As aulas mostram o caminho para a criança, passo a passo. Depois, vocês comemoram juntos cada parte do jogo que funcionar."

A explicação técnica continua disponível no FAQ para os responsáveis que já chegam com essa dúvida.

## Verificação

1. Criar uma regressão que comprove a precedência incorreta da fonte antes da correção.
2. Confirmar que os quatro elementos usam `Material Symbols Rounded` no navegador.
3. Revisar a oferta da Comunidade para o mesmo conflito de especificidade.
4. Executar testes, typecheck, lint e build do funil.
