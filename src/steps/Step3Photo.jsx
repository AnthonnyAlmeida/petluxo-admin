import { useRef, useState, useEffect } from 'react'
import { convertToWebP, generateImageFilename } from '../lib/imageConverter'
import styles from './Step3Photo.module.css'

const GITHUB_OWNER = import.meta.env.VITE_GITHUB_OWNER
const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO
const GITHUB_BRANCH = import.meta.env.VITE_GITHUB_BRANCH

export default function Step3Photo({ fields, setField, errors, onNext, onBack, onImageBlob }) {
  const [converting, setConverting] = useState(false)
  const [preview, setPreview] = useState(null)
  const [fileSize, setFileSize] = useState(null)
  const inputRef = useRef(null)

  // Detecta modo edição: fields.image vem com caminho completo (/images/products/...)
  const initialImagePath = useRef(
    fields.image && fields.image.startsWith('/images/products/') ? fields.image : null
  )
  const existingImageUrl = initialImagePath.current
    ? `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}${initialImagePath.current}`
    : null

  // Normaliza fields.image para apenas o filename, evitando prefixo duplo no commit
  useEffect(() => {
    if (initialImagePath.current) {
      const filename = initialImagePath.current.replace('/images/products/', '')
      setField('image', filename)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFile(file) {
    if (!file) return
    setConverting(true)
    try {
      const blob = await convertToWebP(file)
      const filename = generateImageFilename(fields.name || 'produto')
      const previewUrl = URL.createObjectURL(blob)
      setPreview(previewUrl)
      setFileSize(Math.round(blob.size / 1024))
      setField('image', filename)
      onImageBlob(blob)
    } catch (err) {
      alert('Erro ao converter imagem: ' + err.message)
    } finally {
      setConverting(false)
    }
  }

  function handleChange(e) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleReset() {
    setPreview(null)
    setFileSize(null)
    if (initialImagePath.current) {
      // Modo edição: restaura o filename original
      const filename = initialImagePath.current.replace('/images/products/', '')
      setField('image', filename)
    } else {
      setField('image', '')
    }
    onImageBlob(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={styles.step}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleChange}
      />

      {/* Modo criação: nenhuma foto ainda */}
      {!initialImagePath.current && !preview && !converting && (
        <div className={styles.uploadArea} onClick={() => inputRef.current?.click()}>
          <div className={styles.uploadIcon}>
            <svg className={styles.uploadIconSvg} viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <p className={styles.uploadText}>Toque para escolher a foto</p>
          <p className={styles.uploadSub}>Da câmera ou da galeria do iPad</p>
        </div>
      )}

      {converting && (
        <p className={styles.converting}>Convertendo para WebP...</p>
      )}

      {/* Modo edição: mostra foto atual do GitHub quando nenhuma nova foi selecionada */}
      {initialImagePath.current && !preview && !converting && (
        <>
          <div className={styles.preview}>
            <img src={existingImageUrl} alt="foto atual" className={styles.previewThumb} />
            <div className={styles.previewInfo}>
              <p className={styles.previewName}>{initialImagePath.current.replace('/images/products/', '')}</p>
              <p className={styles.previewSize}>Foto atual</p>
            </div>
          </div>
          <button type="button" className={styles.btnChange} onClick={() => inputRef.current?.click()}>
            Trocar foto
          </button>
        </>
      )}

      {/* Preview de nova foto selecionada (criação ou edição) */}
      {preview && !converting && (
        <>
          <div className={styles.preview}>
            <img src={preview} alt="preview" className={styles.previewThumb} />
            <div className={styles.previewInfo}>
              <p className={styles.previewName}>{fields.image}</p>
              <p className={styles.previewSize}>{fileSize} KB</p>
            </div>
          </div>
          <div className={styles.webpBadge}>
            <svg className={styles.webpIcon} viewBox="0 0 24 24">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            Convertida para WebP
          </div>
          <button type="button" className={styles.btnChange} onClick={handleReset}>
            Trocar foto
          </button>
        </>
      )}

      {errors.image && <p className={styles.error}>{errors.image}</p>}

      <div className={styles.nav}>
        <button type="button" className={styles.btnBack} onClick={onBack}>← Voltar</button>
        <button type="button" className={styles.btnNext} onClick={onNext}>Próximo →</button>
      </div>
    </div>
  )
}
