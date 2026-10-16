import { useEffect, useState } from 'react'
import type { ConnectionState, PairingView } from '../shared/connection'
export function DesktopConnection({ onChange }: { onChange?: (state: ConnectionState) => void }) {
  const [state, setState] = useState<ConnectionState | null>(null),
    [pairing, setPairing] = useState<PairingView | null>(null)
  const [origin, setOrigin] = useState(''),
    [label, setLabel] = useState('Meu computador'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [online, setOnline] = useState(false)
  const [managing, setManaging] = useState(false)
  useEffect(() => {
    if (state) onChange?.(state)
  }, [state, onChange])
  useEffect(() => {
    let live = true
    void window.marketing
      .connection()
      .then((value) => {
        if (live) {
          setState(value)
          setOrigin(value.origin ?? '')
        }
      })
      .catch((e) => {
        if (live) setError(e instanceof Error ? e.message : 'Não foi possível conferir a conexão')
      })
    return () => {
      live = false
    }
  }, [])
  useEffect(() => {
    if (!pairing) return
    let live = true,
      running = false
    const timer = setInterval(() => {
      if (running) return
      if (Date.parse(pairing.expiresAt) <= Date.now()) {
        setPairing(null)
        setError('Código expirado. Inicie uma nova conexão.')
        return
      }
      running = true
      void window.marketing
        .pollConnection()
        .then((value) => {
          if (live) {
            setState(value)
            if (value.status === 'connected') setPairing(null)
          }
        })
        .catch((e) => {
          if (live) setError(e instanceof Error ? e.message : 'Não foi possível conectar')
        })
        .finally(() => {
          running = false
        })
    }, pairing.intervalSeconds * 1000)
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [pairing])
  async function work(operation: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await operation()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível concluir')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <nav className="desktop-toolbar" aria-label="Áreas do marketing">
        <strong>Sistema Zero Marketing</strong>
        <div className="actions">
          <button
            type="button"
            aria-pressed={!online}
            onClick={() =>
              void work(async () => {
                await window.marketing.online(false)
                setOnline(false)
              })
            }
          >
            Produção
          </button>
          <button
            type="button"
            disabled={busy || state?.status !== 'connected'}
            aria-pressed={online}
            onClick={() =>
              void work(async () => {
                await window.marketing.online(true)
                setOnline(true)
              })
            }
          >
            Marketing online
          </button>
        </div>
        <span role="status">
          {state?.status === 'connected'
            ? 'Conectado ao servidor'
            : state?.status === 'offline'
              ? 'Servidor indisponível'
              : 'Conecte sua conta'}
        </span>
        {state?.status === 'connected' && !online ? (
          <button type="button" aria-expanded={managing} onClick={() => setManaging(!managing)}>
            Conta
          </button>
        ) : null}
      </nav>
      {!online && (state?.status !== 'connected' || managing || error) ? (
        <section className="panel connection-panel" aria-label="Conexão com o servidor">
          {state?.status === 'connected' ? (
            <div className="connection">
              <p>
                Conectado a <strong>{state.origin}</strong>. O marketing online usa a mesma conta.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void work(async () => {
                    setState(await window.marketing.disconnect())
                  })
                }
              >
                Desconectar
              </button>
            </div>
          ) : (
            <>
              <h2>Trabalhe com sua equipe</h2>
              <p>Informe o endereço do app de marketing e autorize este computador no navegador.</p>
              <form
                className="connection-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  void work(async () => {
                    setPairing(await window.marketing.connect({ origin, label }))
                    await window.marketing.openApproval()
                  })
                }}
              >
                <label>
                  Endereço do app
                  <input
                    type="url"
                    required
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="https://marketing.suaempresa.com.br"
                  />
                </label>
                <label>
                  Nome deste computador
                  <input
                    required
                    value={label}
                    maxLength={80}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy || Boolean(pairing) || state?.storageProtected === false}
                >
                  Conectar
                </button>
              </form>
              {pairing ? (
                <div className="pairing-code">
                  <p>
                    Confira este código no navegador: <strong>{pairing.code}</strong>
                  </p>
                  <p>
                    Este código expira em {new Date(pairing.expiresAt).toLocaleTimeString('pt-BR')}.
                  </p>
                  <button
                    type="button"
                    onClick={() => void work(() => window.marketing.openApproval())}
                  >
                    Abrir autorização novamente
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void work(async () => {
                        await window.marketing.cancelPairing()
                        setPairing(null)
                      })
                    }
                  >
                    Cancelar conexão
                  </button>
                </div>
              ) : null}
              {state?.message ? <p role="status">{state.message}</p> : null}
            </>
          )}
          {error ? (
            <p role="alert" className="error">
              {error}
            </p>
          ) : null}
        </section>
      ) : null}
    </>
  )
}
