'use client'

import {
  isLearningFrameMessage,
  LEARNING_PROTOCOL,
  type LearningAnswers,
} from '@sistemazero/core/learning'
import { useEffect, useMemo, useRef, useState } from 'react'

// An opaque origin, no network, no navigation, and no access to cookies or the parent DOM.
const POLICY =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'"
export function LearningHtml({
  html,
  title,
  answers,
  onChange,
}: {
  html: string
  title: string
  answers: LearningAnswers
  onChange: (value: LearningAnswers) => void
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [instance] = useState(() => crypto.randomUUID())
  const [height, setHeight] = useState(420)
  const current = useRef({ answers, onChange })
  current.current = { answers, onChange }
  const source = useMemo(() => {
    const config = JSON.stringify({ protocol: LEARNING_PROTOCOL, instance }).replaceAll(
      '<',
      '\\u003c',
    )
    const bridge = `(()=>{const config=${config};let state={};const send=(event,extra={})=>parent.postMessage({...config,event,...extra},'*');window.learning={get state(){return state},save(value){state=value;send('state',{state})},participated(){send('participated',{state})},resize(height){send('resize',{height})}};addEventListener('message',event=>{if(event.source!==parent||event.data?.protocol!==config.protocol||event.data?.instance!==config.instance||event.data?.event!=='restore')return;state=event.data.state||{};dispatchEvent(new CustomEvent('learning:restore',{detail:state}))});addEventListener('DOMContentLoaded',()=>send('ready'))})();`
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${POLICY}"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:16px system-ui;margin:0;padding:16px;color:#152746;background:#f3f8ff}button,input,select{font:inherit}button{cursor:pointer;min-height:44px}*:focus-visible{outline:3px solid #1762bc;outline-offset:3px}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}</style><script>${bridge}</script></head><body>${html}</body></html>`
  }, [html, instance])
  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (
        event.source !== frame.current?.contentWindow ||
        !isLearningFrameMessage(event.data, instance)
      )
        return
      const message = event.data
      if (message.event === 'ready')
        frame.current?.contentWindow?.postMessage(
          {
            protocol: LEARNING_PROTOCOL,
            instance,
            event: 'restore',
            state: current.current.answers,
          },
          '*',
        )
      if (message.event === 'resize' && message.height) setHeight(message.height)
      // The frame owns only its exploration state. Checkpoint answers are native controls.
      if ((message.event === 'state' || message.event === 'participated') && message.state) {
        const { checkpoint: _checkpoint, ...state } = message.state
        current.current.onChange({
          ...state,
          ...(current.current.answers.checkpoint === undefined
            ? {}
            : { checkpoint: current.current.answers.checkpoint }),
          ...(message.event === 'participated' || current.current.answers.participated === true
            ? { participated: true }
            : {}),
        })
      }
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [instance])
  return (
    <iframe
      ref={frame}
      title={title}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      srcDoc={source}
      style={{ height }}
      className="w-full rounded-xl border border-border bg-card"
    />
  )
}
