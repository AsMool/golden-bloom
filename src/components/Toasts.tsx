import { Icon } from './Icon'
import './Toasts.css'

export interface Toast {
  id: number
  text: string
  tone: 'info' | 'error' | 'success'
}

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}`}>
          <Icon name={t.tone === 'error' ? 'info' : t.tone === 'success' ? 'check' : 'flower'} size={18} />
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  )
}
