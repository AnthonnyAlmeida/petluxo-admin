import { useNavigate } from 'react-router-dom'

export default function AdminPage() {
  const navigate = useNavigate()

  function handleLogout() {
    sessionStorage.removeItem('petluxo-admin-auth')
    navigate('/login')
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)' }}>
      <h1 style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-serif)' }}>
        ✦ PetLuxo Admin
      </h1>
      <p style={{ color: 'var(--color-muted)', margin: '0.5rem 0 1.5rem' }}>
        Painel carregado com sucesso.
      </p>
      <button
        onClick={handleLogout}
        style={{ background: 'var(--color-dark)', color: 'var(--color-gold)', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.6rem 1.25rem', fontSize: '0.8rem', letterSpacing: '0.06em' }}
      >
        SAIR
      </button>
    </div>
  )
}
