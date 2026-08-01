import { useState } from 'react'
import { ArrowLeft, Bell, Check, EyeOff, Flame, Heart, Eye, List, MessageCircle, Share2, ShieldCheck, ShoppingBasket, Store, UserRound } from 'lucide-react'

export function createAuthScreens(dependencies) {
  const { sections, commerceCategories, parseMapCoordinates, hasBusinessPin, getBusinessMapUrl, RealLocationPicker, isAndroidCompatMode, normalizeArgentineWhatsapp, isValidArgentineWhatsapp, makeWhatsAppUrl, hasBusinessPublicAddress, isFounderPlanActive, isFounderPlanRequested, ThemeToggle, ContactFooter, cercaApi } = dependencies

  function LoginScreen({ authNotice, onBack, onLogin, onForgotPassword, onQuickAccess, allowQuickAccess, onRegister, onToggleTheme }) {
    const [credentials, setCredentials] = useState({ email: '', password: '' })
    const [showPassword, setShowPassword] = useState(false)

    if (isAndroidCompatMode()) {
      return (
        <div className="android-safe-screen">
          <header className="android-safe-header">
            <button type="button" onClick={onBack} aria-label="Volver">
              <ArrowLeft size={22} />
            </button>
            <strong>Iniciar sesion</strong>
            <ThemeToggle onToggleTheme={onToggleTheme} />
          </header>

          {authNotice && (
            <section className="android-safe-notice">
              <Check size={16} />
              <span>{authNotice}</span>
            </section>
          )}

          <section className="android-safe-card android-safe-intro">
            <span>Acceso seguro</span>
            <h1>Entrar a Cerca Liceo.</h1>
            <p>Usa tu email y clave. Tambien podes seguir mirando ofertas sin cuenta.</p>
          </section>

          <section className="android-safe-form">
            <label>
              <span>Email</span>
              <input value={credentials.email} onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))} placeholder="nombre@email.com" type="email" />
            </label>
            <label>
              <span>Clave</span>
              <div className="password-field">
                <input value={credentials.password} onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))} placeholder="Tu clave" type={showPassword ? 'text' : 'password'} />
                <button className="password-eye-button" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar clave' : 'Mostrar clave'}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </label>
            <button type="button" onClick={() => onLogin(credentials)}>Iniciar sesion</button>
            <button className="android-safe-link" type="button" onClick={onForgotPassword}>Olvide mi clave</button>
          </section>

          {allowQuickAccess && (
            <section className="android-safe-actions" aria-label="Acceso rapido">
              <button type="button" onClick={() => onQuickAccess('neighbor')}>
                <strong>Continuar como vecino</strong>
                <small>Favoritos y avisos.</small>
              </button>
              <button type="button" onClick={() => onQuickAccess('merchant')}>
                <strong>Soy comerciante</strong>
                <small>Panel, local y publicaciones.</small>
              </button>
            </section>
          )}

          <section className="android-safe-actions" aria-label="Crear cuenta">
            <button type="button" onClick={() => onRegister('neighbor')}>
              <strong>Crear cuenta vecino</strong>
              <small>Gratis y opcional.</small>
            </button>
            <button type="button" onClick={() => onRegister('merchant')}>
              <strong>Registrar comercio</strong>
              <small>Ficha gratis para aparecer en la guia.</small>
            </button>
          </section>
        </div>
      )
    }

    return (
      <div className="utility-screen auth-screen">
        <header className="detail-header">
          <button type="button" onClick={onBack} aria-label="Volver">
            <ArrowLeft size={22} />
          </button>
          <strong>Iniciar sesion</strong>
          <ThemeToggle onToggleTheme={onToggleTheme} />
        </header>

        <section className="auth-hero">
          <span>Acceso seguro</span>
          <h1>Entrar o registrarte en Cerca Liceo.</h1>
          <p>Podes seguir como visitante. La cuenta sirve para guardar favoritos, publicar como comercio y administrar tu local.</p>
        </section>

        {authNotice && (
          <section className={`auth-notice ${authNotice.toLowerCase().includes('email') ? 'mail-note' : ''}`}>
            <Check size={16} />
            <span>{authNotice}</span>
          </section>
        )}

        <section className="auth-form-card">
          <span>Cuenta existente</span>
          <h2>Ingresar con email y clave.</h2>
          <label>
            <span>Email</span>
            <input value={credentials.email} onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))} placeholder="nombre@email.com" />
          </label>
          <label>
            <span>Clave</span>
            <div className="password-field">
              <input value={credentials.password} onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))} placeholder="Tu clave" type={showPassword ? 'text' : 'password'} />
              <button className="password-eye-button" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar clave' : 'Mostrar clave'}>
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </label>
          <div className="auth-form-actions">
            <button type="button" onClick={() => onLogin(credentials)}>Iniciar sesion</button>
            <button className="link-button" type="button" onClick={onForgotPassword}>Olvide mi clave</button>
          </div>
        </section>

        {allowQuickAccess && (
          <section className="auth-options">
            <button type="button" onClick={() => onQuickAccess('neighbor')}>
              <UserRound size={22} />
              <span>Continuar como vecino</span>
              <strong>Favoritos y avisos</strong>
              <small>Tambien podes navegar sin cuenta.</small>
            </button>
            <button type="button" onClick={() => onQuickAccess('merchant')}>
              <Store size={22} />
              <span>Soy comerciante</span>
              <strong>Panel, local y publicaciones</strong>
              <small>Ficha gratis + 1 promo semanal.</small>
            </button>
          </section>
        )}

        <section className="auth-register-strip">
          <div>
            <strong>No tenes cuenta?</strong>
            <span>Crear cuenta es gratis y sin tarjeta.</span>
          </div>
          <button type="button" onClick={() => onRegister('neighbor')}>Registrarme</button>
        </section>

        <section className="auth-register-strip commerce">
          <div>
            <strong>Tenes un comercio?</strong>
            <span>Aparecer en la guia puede ser gratis.</span>
          </div>
          <button type="button" onClick={() => onRegister('merchant')}>Registrar comercio</button>
        </section>
      </div>
    )
  }

  function ForgotPasswordScreen({ authNotice, onBack, onSubmit, onToggleTheme }) {
    const [email, setEmail] = useState('')

    if (isAndroidCompatMode()) {
      return (
        <div className="android-safe-screen">
          <header className="android-safe-header">
            <button type="button" onClick={onBack} aria-label="Volver">
              <ArrowLeft size={22} />
            </button>
            <strong>Recuperar clave</strong>
            <ThemeToggle onToggleTheme={onToggleTheme} />
          </header>

          {authNotice && (
            <section className="android-safe-notice">
              <Check size={16} />
              <span>{authNotice}</span>
            </section>
          )}

          <section className="android-safe-card android-safe-intro">
            <span>Acceso seguro</span>
            <h1>Recuperar clave.</h1>
            <p>Escribi tu email y te mandamos un enlace para crear una clave nueva.</p>
          </section>

          <section className="android-safe-form">
            <label>
              <span>Email de la cuenta</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@email.com" type="email" />
            </label>
            <button type="button" onClick={() => onSubmit(email)}>Mandar enlace</button>
            <p>Si no aparece, revisa Spam o Promociones.</p>
          </section>
        </div>
      )
    }

    return (
      <div className="utility-screen auth-screen">
        <header className="detail-header">
          <button type="button" onClick={onBack} aria-label="Volver">
            <ArrowLeft size={22} />
          </button>
          <strong>Recuperar clave</strong>
          <ThemeToggle onToggleTheme={onToggleTheme} />
        </header>

        <section className="auth-hero">
          <span>Acceso seguro</span>
          <h1>Volver a entrar sin vueltas.</h1>
          <p>Escribi el email de tu cuenta y te mandamos un enlace para crear una clave nueva.</p>
        </section>

        {authNotice && (
          <section className={`auth-notice ${authNotice.toLowerCase().includes('correo') ? 'mail-note' : ''}`}>
            <Check size={16} />
            <span>{authNotice}</span>
          </section>
        )}

        <section className="auth-form-card recovery-card">
          <span>Recuperacion</span>
          <h2>Te enviamos un mail de Cerca Liceo.</h2>
          <label>
            <span>Email de la cuenta</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@email.com" type="email" />
          </label>
          <button type="button" onClick={() => onSubmit(email)}>Mandar enlace</button>
          <p>Si no aparece en unos minutos, revisa Spam o Promociones. El enlace sirve para crear una clave nueva.</p>
        </section>

        <section className="auth-register-strip">
          <div>
            <strong>Te acordaste?</strong>
            <span>Volver a probar con email y clave.</span>
          </div>
          <button type="button" onClick={onBack}>Iniciar sesion</button>
        </section>
      </div>
    )
  }

  function ResetPasswordScreen({ authNotice, onBack, onSubmit, onToggleTheme }) {
    const [form, setForm] = useState({ password: '', confirm: '' })
    const keysMismatch = form.password && form.confirm && form.password !== form.confirm

    const savePassword = () => {
      if (keysMismatch) return
      onSubmit(form.password)
    }

    if (isAndroidCompatMode()) {
      return (
        <div className="android-safe-screen">
          <header className="android-safe-header">
            <button type="button" onClick={onBack} aria-label="Volver">
              <ArrowLeft size={22} />
            </button>
            <strong>Nueva clave</strong>
            <ThemeToggle onToggleTheme={onToggleTheme} />
          </header>

          {authNotice && (
            <section className="android-safe-notice">
              <Check size={16} />
              <span>{authNotice}</span>
            </section>
          )}

          <section className="android-safe-card android-safe-intro">
            <span>Cuenta verificada</span>
            <h1>Nueva clave.</h1>
            <p>Usa una clave de al menos 6 caracteres.</p>
          </section>

          <section className="android-safe-form">
            <label>
              <span>Nueva clave</span>
              <input value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Minimo 6 caracteres" type="password" />
            </label>
            <label>
              <span>Repetir clave</span>
              <input value={form.confirm} onChange={(event) => setForm((current) => ({ ...current, confirm: event.target.value }))} placeholder="Escribila otra vez" type="password" />
            </label>
            {keysMismatch && <p className="form-warning">Las claves no coinciden.</p>}
            <button type="button" onClick={savePassword}>Guardar clave</button>
          </section>
        </div>
      )
    }

    return (
      <div className="utility-screen auth-screen">
        <header className="detail-header">
          <button type="button" onClick={onBack} aria-label="Volver">
            <ArrowLeft size={22} />
          </button>
          <strong>Nueva clave</strong>
          <ThemeToggle onToggleTheme={onToggleTheme} />
        </header>

        <section className="auth-hero">
          <span>Cuenta verificada</span>
          <h1>Crea tu nueva clave.</h1>
          <p>Usa una clave de al menos 6 caracteres. Despues vas a poder entrar normalmente.</p>
        </section>

        {authNotice && (
          <section className="auth-notice mail-note">
            <Check size={16} />
            <span>{authNotice}</span>
          </section>
        )}

        <section className="auth-form-card recovery-card">
          <span>Ultimo paso</span>
          <h2>Elegir nueva clave.</h2>
          <label>
            <span>Nueva clave</span>
            <input value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Minimo 6 caracteres" type="password" />
          </label>
          <label>
            <span>Repetir clave</span>
            <input value={form.confirm} onChange={(event) => setForm((current) => ({ ...current, confirm: event.target.value }))} placeholder="Escribila otra vez" type="password" />
          </label>
          {keysMismatch && <p className="form-warning">Las claves no coinciden.</p>}
          <button type="button" onClick={savePassword}>Guardar clave</button>
        </section>
      </div>
    )
  }

  function ProfileScreen({ account, local, onBack, onLogin, onRegister, onMerchantPanel, onPublish, onAdmin, onResetSession, onUpgradeToMerchant, onPrivacy, authNotice, onToggleTheme }) {
    const isLogged = Boolean(account)
    const isMerchant = account?.type === 'merchant'
    const isAdmin = account?.role === 'admin' || !cercaApi.isSupabaseEnabled()
    const founderActive = isMerchant && local ? isFounderPlanActive(local) : false
    const founderRequested = isMerchant && local ? isFounderPlanRequested(local) : false
    const showProfileFounderTrial = isMerchant && local && !founderActive
    const profileFounderUrl = makeWhatsAppUrl(
      '3517662142',
      `Hola Cristian, quiero activar Impulso Liceo gratis por 2 meses para ${local?.name || account?.businessName || 'mi comercio'}. Entiendo que se baja solo y no se cobra nada si no decido seguir.`
    )

    if (isAndroidCompatMode()) {
      return (
        <div className="android-safe-screen">
          <header className="android-safe-header">
            <button type="button" onClick={onBack} aria-label="Volver">
              <ArrowLeft size={22} />
            </button>
            <strong>Mi usuario</strong>
            <ThemeToggle onToggleTheme={onToggleTheme} />
          </header>

          {authNotice && (
            <section className="android-safe-notice">
              <Check size={16} />
              <span>{authNotice}</span>
            </section>
          )}

          {!isLogged && (
            <>
              <section className="android-safe-card android-safe-intro">
                <span>Acceso</span>
                <h1>Entrar es opcional.</h1>
                <p>Para mirar ofertas y locales no hace falta registrarse. La cuenta sirve para guardar favoritos o administrar un comercio.</p>
              </section>

              <section className="android-safe-actions android-account-options" aria-label="Opciones de cuenta">
                <button type="button" onClick={onLogin}>
                  <UserRound size={22} />
                  <span>
                    <strong>Iniciar sesion</strong>
                    <small>Vecino o comercio.</small>
                  </span>
                </button>
                <button type="button" onClick={() => onRegister('neighbor')}>
                  <UserRound size={22} />
                  <span>
                    <strong>Crear cuenta vecino</strong>
                    <small>Para favoritos y avisos.</small>
                  </span>
                </button>
                <button type="button" onClick={() => onRegister('merchant')}>
                  <Store size={22} />
                  <span>
                    <strong>Crear cuenta comercio</strong>
                    <small>Ficha gratis para aparecer en la guia.</small>
                  </span>
                </button>
              </section>
            </>
          )}

          {isLogged && (
            <>
              <section className="android-safe-card android-safe-intro">
                <span>{isMerchant ? 'Cuenta comercio' : 'Cuenta vecino'}</span>
                <h1>{account.name}</h1>
                <p>{isMerchant ? 'Administra tu ficha, publicaciones y datos del comercio.' : 'Tu cuenta esta lista para guardar favoritos y recibir avisos.'}</p>
              </section>

              <section className="android-safe-actions" aria-label="Acciones de cuenta">
                {isMerchant && (
                  <>
                    <button type="button" onClick={onMerchantPanel}>
                      <strong>Panel comercio</strong>
                      <small>Cargar local, horarios, foto y datos.</small>
                    </button>
                    <button type="button" onClick={onPublish}>
                      <strong>Publicar promo</strong>
                      <small>Usa tu publicacion semanal gratis.</small>
                    </button>
                  </>
                )}
                {!isMerchant && (
                  <>
                    <button type="button">
                      <strong>Favoritos y avisos</strong>
                      <small>Proximamente para vecinos registrados.</small>
                    </button>
                    <button type="button" onClick={onUpgradeToMerchant}>
                      <strong>Usar mi cuenta como comercio</strong>
                      <small>Si tenes local o emprendimiento, activa el panel.</small>
                    </button>
                  </>
                )}
                {isAdmin && (
                  <button type="button" onClick={onAdmin}>
                    <strong>Administracion</strong>
                    <small>Revisar locales, promos y solicitudes.</small>
                  </button>
                )}
                <button type="button" onClick={onResetSession}>
                  <strong>Cerrar sesion</strong>
                  <small>Volver a navegar como visitante.</small>
                </button>
              </section>

              {showProfileFounderTrial && (
                <section className="android-safe-card android-founder-teaser">
                  <span>{founderRequested ? 'Solicitud enviada' : 'Gratis 2 meses'}</span>
                  <h2>{founderRequested ? 'Impulso pendiente.' : 'Proba Impulso Liceo.'}</h2>
                  <p>{founderRequested ? 'Cristian te contacta para activarlo.' : 'Catalogo, pedidos por WhatsApp y 4 promos extra. Gratis por 2 meses y se baja solo.'}</p>
                  <button type="button" onClick={() => window.open(profileFounderUrl, '_blank', 'noopener,noreferrer')}>
                    {founderRequested ? 'Escribir a Cristian' : 'Quiero probar gratis'}
                  </button>
                </section>
              )}
            </>
          )}

          <section className="android-safe-card">
            <span>Comercios</span>
            <h2>Arrancas gratis.</h2>
            <p>La ficha del local o emprendimiento puede aparecer con foto, zona, horario y contacto. Los extras se activan solo si el comercio los pide.</p>
          </section>

          <section className="android-safe-card">
            <span>Contacto</span>
            <h2>Cerca Liceo</h2>
            <p>Soporte: 3517662142. Mail: crisalbavideografo@gmail.com.</p>
          </section>
        </div>
      )
    }

    return (
      <div className="utility-screen profile-screen">
        <header className="detail-header">
          <button type="button" onClick={onBack} aria-label="Volver">
            <ArrowLeft size={22} />
          </button>
          <strong>Mi usuario</strong>
          <ThemeToggle onToggleTheme={onToggleTheme} />
        </header>

        {isLogged && (
          <section className="profile-head">
            <div className="profile-avatar">{account.name.slice(0, 2).toUpperCase()}</div>
            <div>
              <span>{isMerchant ? 'Cuenta comercio' : 'Cuenta vecino'}</span>
              <h1>{account.name}</h1>
              <p>
                {isMerchant
                  ? `Registrado para publicar como ${account.businessName || 'comercio del barrio'}.`
                  : 'Cuenta lista para guardar favoritos, seguir locales y recibir avisos.'}
              </p>
            </div>
          </section>
        )}

        {isLogged && (
          <section className="session-bar">
            <div>
              <span>Sesion activa</span>
              <strong>{isMerchant ? 'Comercio' : 'Vecino'}</strong>
            </div>
            <button type="button" onClick={onResetSession}>Cerrar sesion</button>
            <button type="button" onClick={onLogin}>Cambiar cuenta</button>
          </section>
        )}

        {authNotice && (
          <section className="auth-notice">
            <Check size={16} />
            <span>{authNotice}</span>
          </section>
        )}

        {!isLogged && (
          <section className="account-start-card">
            <span>Acceso</span>
            <h2>Entrar es opcional.</h2>
            <p>Para mirar ofertas y locales no hace falta registrarse. La cuenta sirve para guardar favoritos o administrar un comercio.</p>
            <div className="account-choice-grid">
              <button type="button" onClick={() => onRegister('neighbor')}>
                <UserRound size={19} />
                <strong>Crear cuenta vecino</strong>
                <small>Favoritos y avisos.</small>
              </button>
              <button type="button" onClick={onLogin}>
                <UserRound size={19} />
                <strong>Iniciar sesion</strong>
                <small>Vecino o comercio.</small>
              </button>
              <button type="button" onClick={() => onRegister('merchant')}>
                <Store size={19} />
                <strong>Crear cuenta comercio</strong>
                <small>Ficha gratis.</small>
              </button>
            </div>
          </section>
        )}

        {isLogged && (
          <section className={`profile-actions compact ${isMerchant ? 'merchant-primary-actions' : ''}`}>
            {!isMerchant && (
              <>
                <button type="button">
                  <Heart size={19} />
                  Mis favoritos
                </button>
                <button type="button">
                  <Bell size={19} />
                  Avisos del barrio
                </button>
                <button type="button" onClick={onUpgradeToMerchant}>
                  <Store size={19} />
                  Pasar a comercio
                </button>
              </>
            )}
            {isMerchant && (
              <>
                <button type="button" onClick={onMerchantPanel}>
                  <List size={19} />
                  Panel de comercio
                </button>
                <button type="button" onClick={onPublish}>
                  <Flame size={19} />
                  Publicar promo
                </button>
              </>
            )}
            {isAdmin && (
              <button type="button" onClick={onAdmin}>
                <ShieldCheck size={19} />
                Administrar
              </button>
            )}
          </section>
        )}

        {showProfileFounderTrial && (
          <section className={`profile-founder-teaser ${founderRequested ? 'is-requested' : ''}`} aria-label="Probar Impulso Liceo gratis">
            <div>
              <span>{founderRequested ? 'Solicitud enviada' : 'Gratis 2 meses'}</span>
              <h2>{founderRequested ? 'Impulso pendiente.' : 'Proba Impulso Liceo.'}</h2>
              <p>{founderRequested ? 'Cristian te contacta para activarlo.' : 'Catalogo, pedidos por WhatsApp y 4 promos extra. Gratis por 2 meses, sin tarjeta y sin cobro automatico.'}</p>
            </div>
            <button type="button" onClick={() => window.open(profileFounderUrl, '_blank', 'noopener,noreferrer')}>
              {founderRequested ? 'Escribir' : 'Quiero probar'}
            </button>
          </section>
        )}

        {isMerchant && !local && (
          <section className="merchant-entry-card">
            <span>{local ? 'Local publicado' : 'Para comercios'}</span>
            <h2>{local ? local.name : 'Carga tu ficha y apareces en la guia.'}</h2>
            <p>{local ? `${local.category} en ${local.section}. ${hasBusinessPublicAddress(local) ? local.address : 'Contacto directo por WhatsApp o Instagram.'}` : 'Completa foto, zona, horarios, WhatsApp y catalogo para que los vecinos te encuentren.'}</p>
            <div>
              <button type="button" onClick={onMerchantPanel}>{local ? 'Editar local' : 'Cargar local'}</button>
            </div>
          </section>
        )}

        {isLogged && !isMerchant && (
          <section className="merchant-entry-card">
            <span>Tambien vendes?</span>
            <h2>Usa esta misma cuenta como comercio.</h2>
            <p>Si te registraste como vecino por error, no hace falta crear otra cuenta. Activas el panel y despues cargas local fisico o emprendimiento sin direccion.</p>
            <div>
              <button type="button" onClick={onUpgradeToMerchant}>Activar comercio</button>
            </div>
          </section>
        )}

        <section className="merchant-plans-card" id="planes-comercio">
          <div className="merchant-plans-head">
            <span>Opciones para comercios</span>
            <h2>Arrancas gratis y sumas extras solo si te sirven.</h2>
            <p>La ficha del local no se cobra: sirve para aparecer en la guia, mostrar datos claros y publicar una promo semanal que vence sola.</p>
          </div>
          <div className="merchant-plan-list">
            <article>
              <Store size={18} />
              <strong>Plan gratis</strong>
              <p>Ficha del local con foto, direccion, horarios, WhatsApp, rubro y 1 publicacion semanal gratis.</p>
              <span>La promo dura 3 dias y se baja sola</span>
            </article>
            <article>
              <Flame size={18} />
              <strong>4 publicaciones extra</strong>
              <p>Para subir mas promos en el mes cuando hay combos, cambios de precio o ventas puntuales.</p>
              <span>Incluido en Impulso Liceo</span>
            </article>
            <article>
              <ShoppingBasket size={18} />
              <strong>Catalogo + pedidos</strong>
              <p>El vecino elige productos o servicios, suma la consulta y la envia armada al WhatsApp del comercio.</p>
              <span>Gratis 2 meses en lanzamiento</span>
            </article>
          </div>
          <a
            className="founder-plan-cta merchant-plan-cta"
            href={makeWhatsAppUrl('3517662142', 'Hola Cristian, quiero activar Impulso Liceo gratis por 2 meses para mi comercio. Entiendo que se baja solo y no se cobra nada si no decido seguir.')}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={16} />
            Probar Impulso gratis
          </a>
        </section>

        <ContactFooter onPrivacy={onPrivacy} />
      </div>
    )
  }

  function PrivacyScreen({ onBack, onToggleTheme }) {
    return (
      <div className="utility-screen privacy-screen">
        <header className="detail-header">
          <button type="button" onClick={onBack} aria-label="Volver">
            <ArrowLeft size={22} />
          </button>
          <strong>Privacidad</strong>
          <ThemeToggle onToggleTheme={onToggleTheme} />
        </header>

        <section className="privacy-hero">
          <span>Reglas claras</span>
          <h1>Cerca Liceo cuida datos simples del barrio.</h1>
          <p>La pagina sirve para encontrar comercios, promociones y contactos. El vecino puede usarla gratis sin registrarse.</p>
        </section>

        <section className="privacy-list">
          <article>
            <ShieldCheck size={18} />
            <div>
              <strong>Para vecinos</strong>
              <p>No hace falta crear cuenta para mirar ofertas, locales, horarios o contactos.</p>
            </div>
          </article>
          <article>
            <Store size={18} />
            <div>
              <strong>Para comercios</strong>
              <p>Se guardan los datos que cargues para mostrar tu ficha: nombre, rubro, zona, horario, WhatsApp, Instagram y fotos.</p>
            </div>
          </article>
          <article>
            <MessageCircle size={18} />
            <div>
              <strong>WhatsApp</strong>
              <p>Los pedidos y consultas se envian directo al comercio. Cerca Liceo no cobra comision por venta.</p>
            </div>
          </article>
          <article>
            <Eye size={18} />
            <div>
              <strong>Control</strong>
              <p>El comercio puede pausar su ficha, marcar cerrado, editar datos y pedir ayuda para corregir o borrar informacion.</p>
            </div>
          </article>
        </section>

        <section className="privacy-contact">
          <span>Contacto directo</span>
          <h2>Soporte del proyecto</h2>
          <p>Creador: Cristian Eduardo Alba. Para cambios, bajas o consultas escribi por WhatsApp o email.</p>
          <div>
            <a href={makeWhatsAppUrl('3517662142', 'Hola Cristian, queria consultar por privacidad o datos en Cerca Liceo.')} target="_blank" rel="noreferrer">
              <MessageCircle size={16} /> WhatsApp
            </a>
            <a href="mailto:crisalbavideografo@gmail.com?subject=Privacidad%20Cerca%20Liceo">
              <Share2 size={16} /> Email
            </a>
          </div>
        </section>
      </div>
    )
  }

  function RegisterScreen({ initialType = 'neighbor', onComplete, onBack, onLogin, onToggleTheme }) {
    const [accountType, setAccountType] = useState(initialType)
    const [submitted, setSubmitted] = useState(false)
    const [pendingEmail, setPendingEmail] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitFeedback, setSubmitFeedback] = useState('')
    const [form, setForm] = useState({
      name: '',
      whatsapp: '',
      email: '',
      password: '',
      confirmPassword: '',
      section: '',
      businessName: '',
      businessType: 'local',
      category: '',
      salesMode: '',
      interests: '',
      instagram: '',
      address: '',
      reference: '',
      locationMode: 'address',
      locationLat: '',
      locationLng: '',
      locationPrecision: 'approximate',
      locationNote: '',
    })
    const isMerchant = accountType === 'merchant'
    const registerLocationMode = form.businessType === 'entrepreneur' ? 'none' : (form.locationMode || 'address')
    const registerHasPinLocation = registerLocationMode === 'pin' && hasBusinessPin(form)
    const registerMapUrl = getBusinessMapUrl({ ...form, section: form.section || 'Liceo Procrear' })
    const updateForm = (field, value) => {
      const cleanValue = field === 'whatsapp'
        ? value.replace(/\D/g, '').slice(0, 15)
        : value
      setForm((current) => ({ ...current, [field]: cleanValue }))
    }
    const updateRegisterBusinessType = (businessType) => {
      setForm((current) => ({
        ...current,
        businessType,
        locationMode: businessType === 'entrepreneur' ? 'none' : current.locationMode === 'none' ? 'address' : current.locationMode,
      }))
    }
    const updateRegisterLocationMode = (locationMode) => {
      setForm((current) => ({
        ...current,
        locationMode,
        address: locationMode === 'none' ? '' : current.address,
        locationLat: locationMode === 'pin' ? current.locationLat : '',
        locationLng: locationMode === 'pin' ? current.locationLng : '',
      }))
    }
    const updateRegisterMapLink = (value) => {
      const coords = parseMapCoordinates(value)
      setForm((current) => ({
        ...current,
        locationMode: 'pin',
        locationLat: coords?.lat ?? current.locationLat,
        locationLng: coords?.lng ?? current.locationLng,
        locationPrecision: coords ? 'exact' : current.locationPrecision,
        locationNote: value,
        address: current.address || `${current.section || 'Liceo Procrear'} - ubicacion marcada`,
      }))
    }
    const updateRegisterMapCoordinates = ({ lat, lng }) => {
      setForm((current) => ({
        ...current,
        locationMode: 'pin',
        locationLat: lat,
        locationLng: lng,
        locationPrecision: 'exact',
        locationNote: `${lat}, ${lng}`,
        address: current.address || `${current.section || 'Liceo Procrear'} - ubicacion marcada`,
      }))
    }
    const validateRegisterForm = () => {
      const fullName = form.name.trim().replace(/\s+/g, ' ')
      const email = form.email.trim()
      if (fullName.split(' ').filter(Boolean).length < 2) {
        return 'Escribi nombre y apellido para que la cuenta quede clara.'
      }
      if (isMerchant && !form.whatsapp.trim()) {
        return 'Para comercio hace falta un WhatsApp argentino. Ejemplo: 3517662142.'
      }
      if (form.whatsapp && !isValidArgentineWhatsapp(form.whatsapp)) {
        return 'El WhatsApp tiene que ser argentino, solo numeros y sin 0 ni 15. Ejemplo: 3517662142.'
      }
      if (!email || !email.includes('@') || !email.includes('.')) {
        return 'Escribi un email valido. Ahi va a llegar la confirmacion de Cerca Liceo.'
      }
      if (form.password.length < 6) {
        return 'La clave tiene que tener al menos 6 caracteres.'
      }
      if (form.password !== form.confirmPassword) {
        return 'Las claves no coinciden. Escribilas igual en los dos campos.'
      }
      if (isMerchant && !form.category) {
        return 'Elegi el rubro principal para que despues el local aparezca bien filtrado.'
      }
      return ''
    }
    const submitRegister = async () => {
      if (isSubmitting) return
      setSubmitFeedback('')
      const validationMessage = validateRegisterForm()
      if (validationMessage) {
        setSubmitFeedback(validationMessage)
        return
      }
      setIsSubmitting(true)
      try {
        const created = await onComplete({
          ...form,
          type: accountType,
          name: form.name.trim(),
          whatsapp: normalizeArgentineWhatsapp(form.whatsapp),
          email: form.email.trim(),
          section: form.section || 'Liceo Procrear',
          businessName: form.businessName || '',
          businessType: form.businessType,
          category: form.category || 'Comida',
          salesMode: form.salesMode,
          instagram: form.instagram,
          address: form.businessType === 'entrepreneur' || registerLocationMode === 'none' ? '' : form.address,
          reference: form.reference,
          locationMode: registerLocationMode,
          locationLat: registerLocationMode === 'pin' ? form.locationLat : '',
          locationLng: registerLocationMode === 'pin' ? form.locationLng : '',
          locationPrecision: form.locationPrecision || 'approximate',
          locationNote: form.locationNote || form.reference,
        })
        if (created === 'pending-confirmation') {
          setPendingEmail(true)
          return
        }
        if (created !== false) {
          setSubmitted(true)
          return
        }
        setSubmitFeedback('No se pudo crear la cuenta. Revisa el aviso de abajo o proba de nuevo en unos minutos.')
      } catch {
        setSubmitFeedback('No se pudo crear la cuenta. Proba de nuevo o escribi al soporte 351 766 2142.')
      } finally {
        setIsSubmitting(false)
      }
    }

    if (isAndroidCompatMode()) {
      if (pendingEmail) {
        return (
          <div className="android-safe-screen">
            <header className="android-safe-header">
              <button type="button" onClick={onBack} aria-label="Volver">
                <ArrowLeft size={22} />
              </button>
              <strong>Confirmar email</strong>
              <ThemeToggle onToggleTheme={onToggleTheme} />
            </header>

            <section className="android-safe-card android-safe-intro">
              <span>{isMerchant ? 'Comercio registrado' : 'Cuenta creada'}</span>
              <h1>Revisa tu email.</h1>
              <p>Te va a llegar un correo de Cerca Liceo. Abrilo y toca confirmar cuenta. Despues entra y seguimos con tu ficha basica.</p>
            </section>

            <section className="android-safe-actions">
              <button type="button" onClick={onLogin || onBack}>
                <strong>Ya confirme</strong>
                <small>Ir a iniciar sesion.</small>
              </button>
            </section>
          </div>
        )
      }

      if (submitted) {
        return (
          <div className="android-safe-screen">
            <header className="android-safe-header">
              <button type="button" onClick={onBack} aria-label="Volver">
                <ArrowLeft size={22} />
              </button>
              <strong>Cuenta creada</strong>
              <ThemeToggle onToggleTheme={onToggleTheme} />
            </header>

            <section className="android-safe-card android-safe-intro">
              <span>{isMerchant ? 'Comercio listo' : 'Vecino listo'}</span>
              <h1>{isMerchant ? 'Tu ficha basica ya esta.' : 'Ya podes usar tu cuenta.'}</h1>
              <p>{isMerchant ? 'Ahora podes sumar foto, horarios y publicar tu primera promo gratis.' : 'La cuenta sirve para favoritos y avisos.'}</p>
            </section>

            <section className="android-safe-actions">
              <button type="button" onClick={onBack}>
                <strong>Volver a mi cuenta</strong>
                <small>Seguir en Cerca Liceo.</small>
              </button>
            </section>
          </div>
        )
      }

      return (
        <div className="android-safe-screen">
          <header className="android-safe-header">
            <button type="button" onClick={onBack} aria-label="Volver">
              <ArrowLeft size={22} />
            </button>
            <strong>Crear cuenta</strong>
            <ThemeToggle onToggleTheme={onToggleTheme} />
          </header>

          <section className="android-safe-card android-safe-intro">
            <span>{isMerchant ? 'Comerciante' : 'Vecino'}</span>
            <h1>{isMerchant ? 'Registrar comercio.' : 'Crear cuenta vecino.'}</h1>
            <p>{isMerchant ? 'Con estos datos ya armamos tu ficha basica. Despues podes sumar foto, horarios y promos.' : 'La cuenta es opcional y sirve para guardar favoritos y recibir avisos.'}</p>
          </section>

          <section className="android-safe-actions android-safe-toggle">
            <button className={accountType === 'neighbor' ? 'active' : ''} type="button" onClick={() => setAccountType('neighbor')}>
              <strong>Vecino</strong>
              <small>Cuenta gratis.</small>
            </button>
            <button className={accountType === 'merchant' ? 'active' : ''} type="button" onClick={() => setAccountType('merchant')}>
              <strong>Comercio</strong>
              <small>Para publicar.</small>
            </button>
          </section>

          <section className="android-safe-form">
            {submitFeedback && <p className="form-warning">{submitFeedback}</p>}
            <label>
              <span>Nombre y apellido</span>
              <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="Ej: Nombre y apellido" />
            </label>
            <label>
              <span>WhatsApp</span>
              <input value={form.whatsapp} onChange={(event) => updateForm('whatsapp', event.target.value)} placeholder="3510000000" inputMode="numeric" />
            </label>
            <label>
              <span>Email</span>
              <input value={form.email} onChange={(event) => updateForm('email', event.target.value)} placeholder="nombre@email.com" type="email" />
            </label>
            <label>
              <span>Clave</span>
              <input value={form.password} onChange={(event) => updateForm('password', event.target.value)} placeholder="Minimo 6 caracteres" type="password" />
            </label>
            <label>
              <span>Repetir clave</span>
              <input value={form.confirmPassword} onChange={(event) => updateForm('confirmPassword', event.target.value)} placeholder="Escribila otra vez" type="password" />
            </label>
            <label>
              <span>Seccion</span>
              <select value={form.section} onChange={(event) => updateForm('section', event.target.value)}>
                <option value="">Elegir seccion</option>
                {sections.filter((section) => section !== 'Todos').map((section) => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </label>
            {isMerchant && (
              <>
                <section className="android-safe-mini-toggle" aria-label="Tipo de comercio">
                  <button
                    className={form.businessType !== 'entrepreneur' ? 'active' : ''}
                    type="button"
                    onClick={() => updateRegisterBusinessType('local')}
                  >
                    Tengo local
                  </button>
                  <button
                    className={form.businessType === 'entrepreneur' ? 'active' : ''}
                    type="button"
                    onClick={() => updateRegisterBusinessType('entrepreneur')}
                  >
                    Emprendo sin local
                  </button>
                </section>
                <p>{form.businessType === 'entrepreneur' ? 'No hace falta publicar direccion. Despues cargas zona, WhatsApp e Instagram.' : 'Despues podes cargar direccion, horario y boton para llegar.'}</p>
                {form.businessType !== 'entrepreneur' && (
                  <>
                    <div className="android-safe-mini-toggle location-safe-toggle" aria-label="Ubicacion inicial">
                      <button className={registerLocationMode === 'address' ? 'active' : ''} type="button" onClick={() => updateRegisterLocationMode('address')}>
                        Direccion
                      </button>
                      <button className={registerLocationMode === 'pin' ? 'active' : ''} type="button" onClick={() => updateRegisterLocationMode('pin')}>
                        Pin mapa
                      </button>
                      <button className={registerLocationMode === 'none' ? 'active' : ''} type="button" onClick={() => updateRegisterLocationMode('none')}>
                        Despues
                      </button>
                    </div>
                    {registerLocationMode === 'pin' && (
                      <div className="tap-map-editor real-pin-editor android-safe-map-picker">
                        <RealLocationPicker location={form} mapUrl={registerMapUrl} onPick={updateRegisterMapCoordinates} />
                        <label className="map-coordinates-field">
                          <span>Opcional: pegar link o coordenadas</span>
                          <input
                            value={form.locationNote || ''}
                            onChange={(event) => updateRegisterMapLink(event.target.value)}
                            placeholder="-31.36782, -64.129397 o link de Maps"
                          />
                        </label>
                        <div className="tap-map-help">
                          <strong>{registerHasPinLocation ? 'Ubicacion real marcada' : 'Todavia falta el punto real'}</strong>
                          <span>{registerHasPinLocation ? 'Se guarda para que el vecino abra Maps.' : 'Si no lo tenes ahora, podes cargarlo despues.'}</span>
                        </div>
                      </div>
                    )}
                    {registerLocationMode !== 'none' && (
                      <label>
                        <span>{registerLocationMode === 'pin' ? 'Referencia para llegar' : 'Direccion o referencia'}</span>
                        <input value={form.address} onChange={(event) => updateForm('address', event.target.value)} placeholder={registerLocationMode === 'pin' ? 'Ej: Frente a la plaza, manzana 12' : 'Ej: Calle, manzana o referencia'} />
                      </label>
                    )}
                  </>
                )}
                <label>
                  <span>{form.businessType === 'entrepreneur' ? 'Nombre del emprendimiento' : 'Nombre comercial'}</span>
                  <input value={form.businessName} onChange={(event) => updateForm('businessName', event.target.value)} placeholder={form.businessType === 'entrepreneur' ? 'Ej: Hecho en Casa' : 'Ej: Almacen del Barrio'} />
                </label>
                <label>
                  <span>Rubro principal</span>
                  <select value={form.category} onChange={(event) => updateForm('category', event.target.value)}>
                    <option value="">Elegir rubro</option>
                    {commerceCategories.map((category) => (
                      <option key={category.name} value={category.name}>{category.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Como vendes hoy</span>
                  <select value={form.salesMode} onChange={(event) => updateForm('salesMode', event.target.value)}>
                    <option value="">Seleccionar</option>
                    <option>Local fisico</option>
                    <option>WhatsApp</option>
                    <option>Instagram</option>
                    <option>Delivery propio</option>
                    <option>Por encargo</option>
                    <option>Retiro coordinado</option>
                  </select>
                </label>
              </>
            )}
            <p>Te puede llegar un email de Cerca Liceo para confirmar la cuenta.</p>
            <button type="button" disabled={isSubmitting} onClick={submitRegister}>
              {isSubmitting ? 'Creando cuenta...' : isMerchant ? 'Crear cuenta de comercio' : 'Crear cuenta vecino'}
            </button>
          </section>
        </div>
      )
    }

    if (pendingEmail) {
      return (
        <div className="utility-screen register-screen">
          <header className="detail-header">
            <button type="button" onClick={onBack} aria-label="Volver">
              <ArrowLeft size={22} />
            </button>
            <strong>Confirmar email</strong>
            <ThemeToggle onToggleTheme={onToggleTheme} />
          </header>

          <section className="register-success pending-email">
            <span>{isMerchant ? 'Comercio registrado' : 'Cuenta creada'}</span>
            <h1>{isMerchant ? 'Confirma el mail para activar tu comercio.' : 'Confirma el mail para activar tu cuenta.'}</h1>
            <p>
              Entra a <strong>{form.email || 'tu email'}</strong>, abri el correo de <strong>Cerca Liceo</strong> y toca el boton de confirmacion.
              Despues volve a la pagina e inicia sesion con tu email y clave. Si sos comercio, con esos datos ya armamos tu ficha basica.
            </p>
            <p className="mail-trust-note">
              Este paso protege tu cuenta y evita que otra persona publique usando el nombre de tu local.
              No te vamos a pedir tarjetas ni pagos por email.
            </p>
            <div className="email-confirm-steps">
              <article>
                <b>1</b>
                <span>Abrir el correo</span>
              </article>
              <article>
                <b>2</b>
                <span>Confirmar cuenta</span>
              </article>
              <article>
                <b>3</b>
                <span>Volver e ingresar</span>
              </article>
            </div>
            <button type="button" onClick={onLogin || onBack}>Ya confirme, iniciar sesion</button>
            <small>Si no aparece, revisa spam o escribi por WhatsApp al 351 766 2142.</small>
          </section>
        </div>
      )
    }

    if (submitted) {
      return (
        <div className="utility-screen register-screen">
          <header className="detail-header">
            <button type="button" onClick={onBack} aria-label="Volver">
              <ArrowLeft size={22} />
            </button>
            <strong>Cuenta creada</strong>
            <ThemeToggle onToggleTheme={onToggleTheme} />
          </header>

          <section className="register-success">
            <span>{isMerchant ? 'Comercio listo' : 'Vecino listo'}</span>
            <h1>{isMerchant ? 'Tu ficha basica ya esta.' : 'Ya podes guardar favoritos.'}</h1>
            <p>
              {isMerchant
                ? 'Con los datos del registro ya dejamos el local creado. Desde el panel podes sumar foto, horarios y tu primera promo gratis.'
                : 'Recorda que Cerca Liceo se puede usar igual sin cuenta. La cuenta solo suma preferencias y avisos.'}
            </p>
            <button type="button" onClick={onBack}>
              {isMerchant ? 'Ir a mi cuenta' : 'Volver a mi cuenta'}
            </button>
          </section>
          {isMerchant && (
            <section className="register-roadmap post-success">
              <article className="active">
                <b>1</b>
                <strong>Cuenta creada</strong>
                <span>Listo</span>
              </article>
              <article>
                <b>2</b>
                <strong>Completar ficha</strong>
                <span>Foto y horarios</span>
              </article>
              <article>
                <b>3</b>
                <strong>Primer promo</strong>
                <span>Gratis semanal</span>
              </article>
            </section>
          )}
        </div>
      )
    }

    return (
      <div className="utility-screen register-screen">
        <header className="detail-header">
          <button type="button" onClick={onBack} aria-label="Volver">
            <ArrowLeft size={22} />
          </button>
          <strong>Registro</strong>
          <ThemeToggle onToggleTheme={onToggleTheme} />
        </header>

        <section className="register-hero">
          <span>{isMerchant ? 'Alta sin tarjeta' : 'Cuenta opcional'}</span>
          <h1>{isMerchant ? 'Crea tu comercio sin pagar nada.' : 'Usa Cerca Liceo a tu manera.'}</h1>
          <p>
            {isMerchant
              ? 'Primero registras datos basicos. Puede ser local fisico o emprendimiento sin direccion publica.'
              : 'Para buscar ofertas no hace falta registrarse. La cuenta sirve para guardar favoritos, seguir locales y recibir avisos utiles.'}
          </p>
        </section>

        {isMerchant && (
          <section className="register-roadmap">
            <article className="active">
              <b>1</b>
              <strong>Cuenta</strong>
              <span>Datos basicos</span>
            </article>
            <article>
              <b>2</b>
              <strong>Local</strong>
              <span>Direccion y horarios</span>
            </article>
            <article>
              <b>3</b>
              <strong>Promos</strong>
              <span>1 gratis semanal</span>
            </article>
          </section>
        )}

        <section className="account-switch" aria-label="Tipo de cuenta">
          <button className={!isMerchant ? 'active' : ''} type="button" onClick={() => setAccountType('neighbor')}>
            <UserRound size={18} />
            <strong>Vecino</strong>
            <small>Opcional y gratis</small>
          </button>
          <button className={isMerchant ? 'active' : ''} type="button" onClick={() => setAccountType('merchant')}>
            <Store size={18} />
            <strong>Comerciante</strong>
            <small>Para publicar</small>
          </button>
        </section>

        <section className="register-form">
          <label>
            <span>Nombre y apellido</span>
            <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder={isMerchant ? 'Ej: Nombre y apellido' : 'Ej: Nombre y apellido'} autoComplete="name" />
          </label>
          <label>
            <span>WhatsApp</span>
            <input value={form.whatsapp} onChange={(event) => updateForm('whatsapp', event.target.value)} placeholder="3510000000" inputMode="numeric" pattern="[0-9]*" autoComplete="tel" />
          </label>
          <label>
            <span>Email</span>
            <input value={form.email} onChange={(event) => updateForm('email', event.target.value)} placeholder="nombre@gmail.com" type="email" inputMode="email" autoComplete="email" />
          </label>
          <label>
            <span>Clave</span>
            <input value={form.password} onChange={(event) => updateForm('password', event.target.value)} placeholder="Minimo 6 caracteres" type="password" autoComplete="new-password" />
          </label>
          <label>
            <span>Repetir clave</span>
            <input value={form.confirmPassword} onChange={(event) => updateForm('confirmPassword', event.target.value)} placeholder="Escribila otra vez" type="password" autoComplete="new-password" />
          </label>
          <label>
            <span>Seccion</span>
            <select value={form.section} onChange={(event) => updateForm('section', event.target.value)}>
              <option value="" disabled>Elegir seccion</option>
              <option>Liceo Procrear</option>
              <option>Liceo 1ra</option>
              <option>Liceo 2da</option>
              <option>Liceo 3ra</option>
            </select>
          </label>
          {isMerchant ? (
            <>
              <label className="wide">
                <span>Nombre comercial si ya lo tenes</span>
                <input value={form.businessName} onChange={(event) => updateForm('businessName', event.target.value)} placeholder={form.businessType === 'entrepreneur' ? 'Ej: Hecho en Casa' : 'Ej: Almacen del Barrio'} />
              </label>
              <div className="merchant-type-register wide">
                <span>Tipo de comercio</span>
                <div>
                  <button
                    className={form.businessType !== 'entrepreneur' ? 'active' : ''}
                    type="button"
                    onClick={() => updateRegisterBusinessType('local')}
                  >
                    Tengo local
                  </button>
                  <button
                    className={form.businessType === 'entrepreneur' ? 'active' : ''}
                    type="button"
                    onClick={() => updateRegisterBusinessType('entrepreneur')}
                  >
                    Sin local
                  </button>
                </div>
                <small>{form.businessType === 'entrepreneur' ? 'Contacto por WhatsApp o Instagram.' : 'Direccion y Maps visibles.'}</small>
              </div>
              {form.businessType !== 'entrepreneur' && (
                <div className="location-picker-card register-location-picker wide">
                  <strong>Ubicacion inicial</strong>
                  <div className="location-mode-tabs">
                    <button className={registerLocationMode === 'address' ? 'active' : ''} type="button" onClick={() => updateRegisterLocationMode('address')}>
                      Direccion
                    </button>
                    <button className={registerLocationMode === 'pin' ? 'active' : ''} type="button" onClick={() => updateRegisterLocationMode('pin')}>
                      Pin mapa
                    </button>
                    <button className={registerLocationMode === 'none' ? 'active' : ''} type="button" onClick={() => updateRegisterLocationMode('none')}>
                      Despues
                    </button>
                  </div>
                  {registerLocationMode === 'pin' && (
                    <div className="tap-map-editor real-pin-editor">
                      <RealLocationPicker location={form} mapUrl={registerMapUrl} onPick={updateRegisterMapCoordinates} />
                      <label className="map-coordinates-field">
                        <span>Opcional: pegar link o coordenadas</span>
                        <input
                          value={form.locationNote || ''}
                          onChange={(event) => updateRegisterMapLink(event.target.value)}
                          placeholder="-31.36782, -64.129397 o link de Maps"
                        />
                      </label>
                      <div className="tap-map-help">
                        <strong>{registerHasPinLocation ? 'Ubicacion real marcada' : 'Todavia falta el punto real'}</strong>
                        <span>{registerHasPinLocation ? 'Se guarda para que el vecino abra Maps.' : 'Si no lo tenes ahora, podes cargarlo despues.'}</span>
                      </div>
                    </div>
                  )}
                  {registerLocationMode !== 'none' && (
                    <label>
                      <span>{registerLocationMode === 'pin' ? 'Referencia para llegar' : 'Direccion o referencia'}</span>
                      <input value={form.address} onChange={(event) => updateForm('address', event.target.value)} placeholder={registerLocationMode === 'pin' ? 'Ej: Frente a la plaza, manzana 12' : 'Ej: Calle, manzana o referencia'} />
                    </label>
                  )}
                  {registerLocationMode === 'none' && <p className="no-location-note">Podes cargar la ubicacion despues desde el panel comercio.</p>}
                </div>
              )}
              <label>
                <span>Rubro principal</span>
                <select value={form.category} onChange={(event) => updateForm('category', event.target.value)}>
                  <option value="" disabled>Elegir rubro</option>
                  {commerceCategories.map((category) => (
                    <option key={category.name} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Como vendes hoy</span>
                <select value={form.salesMode} onChange={(event) => updateForm('salesMode', event.target.value)}>
                  <option value="" disabled>Seleccionar</option>
                  <option>Solo retiro</option>
                  <option>Delivery propio</option>
                  <option>Por encargo</option>
                  <option>Local fisico</option>
                </select>
              </label>
            </>
          ) : (
            <label className="wide">
              <span>Que te interesa ver</span>
              <input value={form.interests} onChange={(event) => updateForm('interests', event.target.value)} placeholder="Comida, despensa, belleza, ferreteria..." />
            </label>
          )}
        </section>

        <section className="register-mail-note">
          <ShieldCheck size={18} />
          <div>
            <strong>Despues de crear la cuenta, revisa tu email.</strong>
            <span>Te va a llegar un correo de confirmacion. Si todavia figura como Supabase Auth, es el sistema seguro que usa Cerca Liceo para activar cuentas.</span>
          </div>
        </section>

        <section className="register-next">
          <span>{isMerchant ? 'Que pasa despues' : 'Privacidad clara'}</span>
          <h2>{isMerchant ? 'Primero entrar, despues vender.' : 'Podes entrar sin cuenta.'}</h2>
          <p>
            {isMerchant
              ? 'Desde el panel cargas tu ficha gratis. Si no tenes local, dejas la direccion vacia y te contactan por WhatsApp o Instagram.'
              : 'La cuenta no bloquea el uso de la app. Solo mejora favoritos, avisos y preferencias del barrio.'}
          </p>
        </section>

        {isMerchant && (
          <section className="register-free-note">
            <ShieldCheck size={19} />
            <div>
              <strong>Alta gratis y sin compromiso</strong>
              <span>La ficha del local puede quedar visible gratis. Los planes son extras opcionales.</span>
            </div>
          </section>
        )}

        <div className="register-checks">
          <span><Check size={15} /> Sin tarjeta</span>
          <span><Check size={15} /> Gratis para empezar</span>
          <span><Check size={15} /> Datos editables</span>
        </div>

        {submitFeedback && (
          <section className="auth-notice needs-attention register-inline-feedback">
            <MessageCircle size={16} />
            <span>{submitFeedback}</span>
          </section>
        )}

        <button className="primary-action" type="button" onClick={submitRegister} disabled={isSubmitting}>
          {isSubmitting ? 'Creando cuenta...' : isMerchant ? 'Crear cuenta de comercio' : 'Crear cuenta gratis'}
        </button>
      </div>
    )
  }

  return { LoginScreen, ForgotPasswordScreen, ResetPasswordScreen, ProfileScreen, PrivacyScreen, RegisterScreen }
}
