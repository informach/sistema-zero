# Molda — primeiros passos contextuais (lote 224)

Continuação das fases 3/9 do plano aprovado. A criança de 9+ quer experimentar
uma criação, consultar uma instrução e voltar à peça sem perder seu trabalho.
Ajuda calma e opcional, não um curso obrigatório nem uma medida de aprendizagem.

## Direção e escopo

- Domínio: peças, alças, camadas, traços, poses, momentos, desfazer.
- Mundo visual: papel claro, grafite, argila, azul de ferramenta, violeta de seleção;
  expressar pelo sistema `mld-*` existente, sem acrescentar paleta ou fontes.
- Assinatura: instruções que distinguem experimentar uma pose de gravá-la, e
  imagem/camada de pintura no modelo, usando os mesmos nomes dos controles.
- Substituir tour que bloqueia a oficina por consulta dispensável; progresso de
  conquista por posição de leitura; execução automática por instruções manuais.
- Intenção: autonomia e retorno seguro ao trabalho. Tipografia `mld-display` nos
  títulos, corpo legível; grade de 4 px e alvos de 44 px. Borda e superfície do
  Molda separam a ajuda do desenho, sem animações ou decoração extra.

## Implementação

Componente de ajuda no canto inferior do palco, limitado à área disponível e com
rolagem própria. Sobreposição não modal: não redimensiona o canvas, não prende
Tab nem escurece a criação. Botão sempre disponível para abrir/fechar; painel
desmonta ao fechar. Sem listener global, timer, rede, persistência ou estado de domínio.

Ao abrir, escolher o assunto correspondente ao contexto atual: modelar, pintura
aberta ou animação. Escolher outro assunto só muda a ajuda. Enquanto aberta,
conservar o assunto escolhido; reabrir retoma a posição de leitura do contexto.
Guardar posições por assunto apenas na sessão e reiniciar no projeto seguinte.

Foco no título ao abrir, sincronizado ao layout e apenas se o acionador ainda é
dono do foco. Fechar devolve ao botão. Escape dentro da ajuda fecha só a ajuda;
Delete e undo não alcançam atalhos autorais quando o foco está no painel. Tab
continua nativo. Nenhuma chamada a `cancelGesture`: também descarta poses pendentes.

## Provas e limites

Testar assuntos, extremos da navegação, foco/reabertura/teclado e chave de projeto.
Integração com editor real prova documento, seleção, histórico e pose inalterados;
gravar a pose depois da consulta deve continuar possível com um único undo.
Revisar nomes contra controles reais. Tipos, Biome, suíte integral, Vite e Kids.
Sem browser conectado: não alegar validação visual/touch, leitor de tela, hardware
ou compreensão por crianças. Formato público e rollout permanecem inalterados.
