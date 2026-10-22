import { useEffect, useState } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'category'; slug: string }
  | { name: 'loved' }
  | { name: 'note'; id: string }
  | { name: 'me' }
  | { name: 'moderate' }
  | { name: 'about'; section?: string }
  | { name: 'not-found' }

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  const [first, second] = parts
  if (!first) return { name: 'home' }
  if (first === 'garden' && second) return { name: 'category', slug: second }
  if (first === 'most-loved') return { name: 'loved' }
  if (first === 'note' && second) return { name: 'note', id: second }
  if (first === 'me') return { name: 'me' }
  if (first === 'moderate') return { name: 'moderate' }
  if (first === 'about') return { name: 'about', section: second }
  return { name: 'not-found' }
}

export const href = {
  home: '#/',
  category: (slug: string) => `#/garden/${slug}`,
  loved: '#/most-loved',
  note: (id: string) => `#/note/${id}`,
  me: '#/me',
  moderate: '#/moderate',
  about: (section?: string) => (section ? `#/about/${section}` : '#/about'),
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function go(to: string) {
  if (window.location.hash === to) window.dispatchEvent(new HashChangeEvent('hashchange'))
  else window.location.hash = to
}
