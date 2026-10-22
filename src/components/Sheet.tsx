import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'
import './Sheet.css'

// A modal built on <dialog>: focus stays inside, Escape closes it, the page behind is inert.
// On phones it slides up from the bottom, on bigger screens it floats in the middle.
export function Sheet({
  title,
  onClose,
  children,
  wide = false,
  labelledBy,
}: {
  title?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  labelledBy?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    const onCancel = (e: Event) => {
      e.preventDefault()
      closeRef.current()
    }
    dialog.addEventListener('cancel', onCancel)
    document.documentElement.classList.add('has-sheet')
    return () => {
      dialog.removeEventListener('cancel', onCancel)
      document.documentElement.classList.remove('has-sheet')
    }
  }, [])

  return (
    <dialog
      ref={ref}
      className={`sheet${wide ? ' sheet--wide' : ''}`}
      aria-labelledby={labelledBy ?? (title ? 'sheet-title' : undefined)}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      <div className="sheet__inner">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="icon-btn sheet__close" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
        {title && (
          <h2 id="sheet-title" className="sheet__title">
            {title}
          </h2>
        )}
        {children}
      </div>
    </dialog>
  )
}
