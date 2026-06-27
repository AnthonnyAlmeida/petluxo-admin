import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage() {
  const canvasRef = useRef(null)
  const navigate = useNavigate()

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

  return (
    <div className={styles.page}>
      <canvas ref={canvasRef} className={styles.matrix} />
      <div className={styles.content}>
        <p className={styles.eyebrow}>// erro do sistema</p>
        <p className={`${styles.errorCode} ${styles.glitch}`}>404</p>
        <div className={styles.dividerLine} />
        <h1 className={styles.title}>Página não encontrada</h1>
        <p className={styles.message}>
          A rota acessada não existe no painel administrativo. Verifique o endereço ou retorne à listagem de produtos.
        </p>
        <div className={styles.statusRow}>
          <div className={styles.dot} />
          <span className={styles.statusText}>acesso negado · rota inválida</span>
        </div>
        <button className={styles.btn} onClick={() => navigate('/admin/products')}>
          ← Voltar ao painel
        </button>
      </div>
    </div>
  )
}
