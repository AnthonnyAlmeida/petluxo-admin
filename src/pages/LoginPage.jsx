import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
      sessionStorage.setItem('petluxo-admin-auth', 'true')
      navigate('/admin/products')
    } else {
      setError('Senha incorreta. Tente novamente.')
      setPassword('')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>
          <svg className={styles.iconSvg} viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div className={styles.header}>
          <span className={styles.logo}>✦ PetLuxo</span>
          <span className={styles.subtitle}>Área restrita — painel administrativo</span>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div>
            <label className={styles.label} htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              className={[styles.input, error ? styles.inputError : ''].join(' ')}
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              autoFocus
              autoComplete="current-password"
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.button}>ENTRAR</button>
        </form>
        <span className={styles.footer}>petluxostory.com.br</span>
      </div>
    </div>
  )
}
