import { Radio } from 'lucide-react'

/**
 * O cartão fixo do editor de aula de um curso AO VIVO (14/10/2026). Na aula ao vivo o "vídeo" é
 * a transmissão do encontro, que é da aula inteira e não de uma parte: por isso não existe bloco
 * de vídeo, e a autora precisa ler isso antes de procurar onde subir um.
 */
export function LiveBroadcastCard() {
  return (
    <section
      aria-labelledby="live-broadcast-title"
      className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4"
    >
      <Radio className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <div className="space-y-1.5 text-sm">
        <h2 id="live-broadcast-title" className="font-semibold">
          Transmissão do encontro
        </h2>
        <p>
          Nesta aula, o vídeo é a transmissão do encontro: quem conduz a turma aparece ao vivo no
          alto da tela de cada criança.
        </p>
        <p>
          Quando o encontro termina, a transmissão vira a gravação da turma no Vimeo, que as
          crianças podem rever durante o prazo de acesso. Cada parte aberta durante o encontro vira
          um capítulo da gravação.
        </p>
        <p className="text-muted-foreground">
          Por isso esta aula não usa bloco de vídeo. Em cada parte, as anotações da parte ficam
          visíveis só para quem conduz o encontro.
        </p>
      </div>
    </section>
  )
}
