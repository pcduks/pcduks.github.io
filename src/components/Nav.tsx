import { profile } from '../lib/content'
import { useScrolled } from '../lib/hooks'

const items = [
  { href: '#about', label: 'About', compact: false },
  { href: '#log', label: 'Log', compact: true },
  { href: '#builds', label: 'Builds', compact: true },
  { href: '#toolkit', label: 'Toolkit', compact: false },
  { href: '#contact', label: 'Contact', compact: true },
]

export default function Nav({ onHelp }: { onHelp: () => void }) {
  const scrolled = useScrolled()
  return (
    <header className={`nav ${scrolled ? 'nav--scrolled' : ''}`}>
      <a className="nav__brand" href="#top">
        <span className="nav__callsign">{profile.callsign}</span>
        <span>{profile.name}</span>
      </a>
      <nav aria-label="Sections">
        {items.map((i) => (
          <a key={i.href} href={i.href} className={i.compact ? '' : 'nav__wide'}>
            {i.label}
          </a>
        ))}
      </nav>
      <button className="nav__help" onClick={onHelp} aria-label="Keyboard shortcuts and display options">
        ?
      </button>
    </header>
  )
}
