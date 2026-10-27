import { ArrowDown, Eye, Hand, Link2, Link2Off } from 'lucide-react'
export function TouchRule({ enabled, chosen }: { enabled: boolean; chosen: string | null }) {
  return (
    <div className="sz-garden-rule" data-garden="rule" data-enabled={enabled}>
      <p className="sz-garden-eyebrow">A regra do jogo</p>
      <div className="sz-garden-node" data-tone="event">
        <Hand size={20} aria-hidden />
        <div>
          <span>Quando acontecer</span>
          <strong>Um toque no esconderijo</strong>
        </div>
      </div>
      <div className="sz-garden-wire" data-connected={enabled}>
        <span className="sz-garden-wire-line" aria-hidden />
        <span className="sz-garden-chosen">
          <span>Escolhido:</span> <strong>{chosen ?? 'nenhum ainda'}</strong>
        </span>
        <ArrowDown size={20} aria-hidden />
      </div>
      <div className="sz-garden-node" data-tone={enabled ? 'reaction' : 'off'}>
        <Eye size={20} aria-hidden />
        <div>
          <span>A reação</span>
          <strong>Deixar escolhido invisível</strong>
        </div>
      </div>
      <p className="sz-garden-link-status">
        {enabled ? <Link2 size={16} aria-hidden /> : <Link2Off size={16} aria-hidden />}
        <strong>{enabled ? 'Ligação ativa' : 'Reação desligada'}</strong>
      </p>
      <p className="sz-garden-caption">
        {enabled
          ? 'O toque executa a reação só no esconderijo escolhido. Os outros continuam como estavam.'
          : 'Sem a ligação, tocar não revela o personagem. Você pode ligar, desligar e comparar quantas vezes quiser.'}
      </p>
    </div>
  )
}
