import { Home, MessageCircle, Moon, Share2, ShieldCheck } from 'lucide-react'
import { makeWhatsAppUrl } from '../lib/businessRules'

export function ContactFooter({ onPrivacy }) {
  const supportMessage = 'Hola Cristian, vi Cerca Liceo y queria consultar por el proyecto.'
  const whatsappUrl = makeWhatsAppUrl('3517662142', supportMessage)

  return (
    <footer className="contact-footer" aria-label="Contacto y soporte">
      <div>
        <span>Proyecto local</span>
        <strong>Cerca Liceo</strong>
        <p>Creado por Cristian Eduardo Alba para conectar vecinos, comercios y ofertas del barrio.</p>
      </div>
      <div className="contact-actions">
        <a href={whatsappUrl} target="_blank" rel="noreferrer">
          <MessageCircle size={16} />
          WhatsApp
        </a>
        <a href="mailto:crisalbavideografo@gmail.com?subject=Consulta%20por%20Cerca%20Liceo">
          <Share2 size={16} />
          Email
        </a>
        {onPrivacy && (
          <button type="button" onClick={onPrivacy}>
            <ShieldCheck size={16} />
            Privacidad
          </button>
        )}
      </div>
      <small>Soporte: 351 766 2142 - crisalbavideografo@gmail.com</small>
    </footer>
  )
}
export function ThemeToggle({ onToggleTheme }) {
  return (
    <button className="theme-button in-header" type="button" onClick={onToggleTheme} aria-label="Cambiar modo noche">
      <Moon size={19} />
    </button>
  )
}

export function HomeReturnStrip({ onHome }) {
  if (!onHome) return null

  return (
    <div className="home-return-strip">
      <button type="button" onClick={onHome}>
        <Home size={18} />
        <span>Volver al inicio</span>
      </button>
    </div>
  )
}
