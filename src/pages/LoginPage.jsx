import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [time, setTime] = useState('')
  const canvasRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function updateTime() {
      setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    updateTime()
    const t = setInterval(updateTime, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    function resize() {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)
    const chars = 'アイウエオカキクケコ0123456789ABCDEF✦◆▸▹<>{}[]|'
    const fontSize = 13
    let drops = Array(Math.floor(canvas.width / fontSize)).fill(1)
    function draw() {
      ctx.fillStyle = 'rgba(19,17,14,0.06)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.font = fontSize + 'px monospace'
      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)]
        ctx.fillStyle = drops[i] * fontSize < 30
          ? 'rgba(201,169,110,0.9)'
          : 'rgba(201,169,110,0.3)'
        ctx.fillText(text, i * fontSize, drops[i] * fontSize)
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0
        drops[i]++
      }
    }
    const interval = setInterval(draw, 55)
    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', resize)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Senha incorreta')
      sessionStorage.setItem('petluxo-admin-auth', data.token)
      navigate('/admin/products')
    } catch (err) {
      setError(err.message)
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <canvas ref={canvasRef} className={styles.matrix} />
      <div className={styles.card}>
        <div className={styles.scanline} />
        <div className={styles.statusRow}>
          <div className={styles.dot} />
          <span className={styles.statusText}>Sistema seguro — conexão criptografada</span>
        </div>
        <div className={styles.dividerLine} />
        <div className={styles.header}>
          <p className={styles.logo}>✦ PetLuxo</p>
          <p className={styles.subtitle}>acesso restrito // painel administrativo</p>
        </div>
        <div className={styles.dividerLine} />
        <form className={styles.form} onSubmit={handleSubmit}>
          <div>
            <label className={styles.label} htmlFor="password">// senha de acesso</label>
            <div className={styles.inputWrap}>
              <input
                id="password"
                type="password"
                className={[styles.input, error ? styles.inputError : ''].join(' ')}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                autoFocus
                autoComplete="current-password"
                disabled={loading}
              />
              <div className={styles.cursorBlink} />
            </div>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? '[ autenticando... ]' : '[ entrar ]'}
          </button>
        </form>
        <div className={styles.dividerLine} />
        <div className={styles.footerRow}>
          <span className={styles.footer}>petluxostory.com.br</span>
          <span className={styles.footer}>{time}</span>
        </div>
      </div>
    </div>
  )
}
