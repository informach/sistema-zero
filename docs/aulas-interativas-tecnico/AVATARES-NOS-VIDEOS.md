# Dedé e Debinha na edição kids

Direção atual, 21/10/2026: a professora grava uma aula completa e contínua, comum aos dois públicos. Na edição kids, frases marcadas são substituídas pela mesma fala com a voz de Dedé ou Debinha e uma camada visual. O histórico anterior de inserções está no Git; não aplicar as antigas tabelas de inserção a este novo master.

## Como gravar e editar

1. Gerar a voz da professora usando o `.elevenlabs.txt` completo da aula.
2. Gerar a voz de cada personagem presente usando o seu `.dede.elevenlabs.txt` ou `.debinha.elevenlabs.txt`.
3. Localizar cada troca pelo ID, clipe, frase exata, ocorrência e âncoras no `.roteiro.md` ou no `.edicao.json`.
4. No kids, silenciar a frase correspondente da professora e substituir pelo personagem. Manter a fala anterior e a retomada da professora. Não tocar as duas vozes juntas nem repetir a frase.
5. Conferir escuta, transições e pausas de aproximadamente três segundos entre partes para facilitar os cortes. Ajustar o silêncio na edição.

No adulto, usar o master integral. Exemplo: “Talvez você esteja pensando: ‘No meu jogo ainda não funcionou.’ Se aconteceu com você…”. No kids, apenas a frase citada passa para o personagem.

As aparições precisam ajudar na compreensão, sem interromper encaixes ou impor uma cota. Um personagem por aula; ambos podem descobrir, perguntar e corrigir. A professora não se dirige a eles pelo nome no master. Zappy orienta na página e não integra esse áudio.

Veja o [contrato de voz](DIRETRIZES-VOZ-ELEVENLABS.md). Arquivos locais preparados não comprovam que as vozes foram geradas, escutadas, montadas ou publicadas.
