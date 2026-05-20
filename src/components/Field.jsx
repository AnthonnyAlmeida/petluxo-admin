import styles from './Field.module.css'

export default function Field({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  hint,
  error,
  required,
  multiline,
  rows,
}) {
  const inputClass = [
    multiline ? styles.textarea : styles.input,
    error ? styles.inputError : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={name}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      {multiline ? (
        <textarea
          id={name}
          className={inputClass}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows || 4}
        />
      ) : (
        <input
          id={name}
          type={type}
          className={inputClass}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
      {hint && !error && <span className={styles.hint}>{hint}</span>}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
