import { useState } from 'react'
import { Sheet } from './Sheet'

export function ConfirmSheet({
  title,
  body,
  confirmLabel,
  danger = true,
  onConfirm,
  onClose,
}: {
  title: string
  body: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => Promise<void> | void
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Sheet title={title} onClose={onClose}>
      <p className="muted">{body}</p>
      <div className="confirm-actions">
        <button type="button" className="btn" onClick={onClose} autoFocus>
          Cancel
        </button>
        <button
          type="button"
          className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await onConfirm()
            } finally {
              setBusy(false)
            }
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  )
}
