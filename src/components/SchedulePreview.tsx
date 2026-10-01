import { useEffect, useRef, useState } from 'react'
import type { AppState, ClassGroup } from '../types'
import { getMonthBlocks } from '../lib/schedule'
import { downloadBlob, renderPng, shareImage, type ShareResult } from '../lib/exportImage'
import { ClassCard } from './ClassCard'

interface Props {
  state: AppState
  onOverride: (key: string, name: string | null) => void
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const MESSAGES: Partial<Record<ShareResult, string>> = {
  copied: 'Imagem copiada! É só colar (Ctrl+V) na conversa do WhatsApp.',
  downloaded: 'Seu navegador não permite compartilhar; a imagem foi baixada.',
  retry: 'Imagem pronta! Toque em Compartilhar de novo.',
}

export function SchedulePreview({ state, onOverride }: Props) {
  const { config, overrides } = state
  const classes = state.classes.filter((c) => c.enabled)
  const blocks = getMonthBlocks(config.startMonth, config.months, config.weekday)
  const exportRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const images = useRef<Record<string, Blob>>({})
  const [ready, setReady] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ id: string; text: string } | null>(null)

  // Gera as imagens com antecedência: o compartilhamento precisa acontecer logo após o toque.
  useEffect(() => {
    let cancelled = false
    images.current = {}
    setReady({})
    const timer = setTimeout(async () => {
      for (const group of state.classes.filter((c) => c.enabled)) {
        const node = exportRefs.current[group.id]
        if (!node) continue
        try {
          const blob = await renderPng(node)
          if (cancelled) return
          images.current[group.id] = blob
          setReady((r) => ({ ...r, [group.id]: true }))
        } catch {
          /* gera na hora do clique */
        }
      }
    }, 600)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [state])

  const getImage = async (group: ClassGroup) => {
    const cached = images.current[group.id]
    if (cached) return cached
    const blob = await renderPng(exportRefs.current[group.id]!)
    images.current[group.id] = blob
    setReady((r) => ({ ...r, [group.id]: true }))
    return blob
  }

  const run = async (group: ClassGroup, action: 'share' | 'download') => {
    setBusy(group.id)
    setMessage(null)
    try {
      const blob = await getImage(group)
      const fileName = `escala-${slug(group.name)}.png`
      if (action === 'download') return downloadBlob(blob, fileName)
      const text = MESSAGES[await shareImage(blob, fileName)]
      if (text) setMessage({ id: group.id, text })
    } catch (err) {
      setMessage({ id: group.id, text: 'Não foi possível gerar a imagem: ' + String(err) })
    } finally {
      setBusy(null)
    }
  }

  if (classes.length === 0) {
    return <p className="hint">Ative pelo menos uma classe para ver a escala.</p>
  }

  return (
    <section>
      <h2 className="preview-title">Escala</h2>
      <p className="hint">Dica: clique num nome para trocar manualmente a pessoa daquele dia.</p>

      <div className="cards">
        {classes.map((group) => (
          <div key={group.id} className="card-wrap">
            <ClassCard group={group} blocks={blocks} overrides={overrides} onOverride={onOverride} />
            <div className="actions">
              <button className="share" disabled={busy !== null} onClick={() => run(group, 'share')}>
                {busy === group.id ? 'Gerando…' : ready[group.id] ? '📤 Compartilhar' : '📤 Compartilhar…'}
              </button>
              <button className="link" disabled={busy !== null} onClick={() => run(group, 'download')}>
                baixar
              </button>
            </div>
            {message?.id === group.id && <p className="share-msg">{message.text}</p>}
          </div>
        ))}
      </div>

      {/* Cópias com largura fixa, fora da tela, usadas para gerar as imagens */}
      <div className="export-stage" aria-hidden>
        {classes.map((group) => (
          <ClassCard
            key={group.id}
            ref={(el) => {
              exportRefs.current[group.id] = el
            }}
            group={group}
            blocks={blocks}
            overrides={overrides}
            exporting
          />
        ))}
      </div>
    </section>
  )
}
