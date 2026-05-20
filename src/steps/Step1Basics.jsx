import Field from '../components/Field'
import { CATEGORIES } from '../data/categories'
import styles from './Step1Basics.module.css'

export default function Step1Basics({ fields, setField, errors, onNext }) {
  function toggleCategory(id) {
    const current = fields.category
    const updated = current.includes(id)
      ? current.filter(c => c !== id)
      : [...current, id]
    setField('category', updated)
  }

  return (
    <div className={styles.step}>
      <Field
        label="Nome completo do produto"
        name="name"
        value={fields.name}
        onChange={v => setField('name', v)}
        placeholder="Ex: Cama Redonda Veludo Premium"
        error={errors.name}
        required
      />
      <Field
        label="Nome curto"
        name="shortName"
        value={fields.shortName}
        onChange={v => setField('shortName', v)}
        placeholder="Ex: Cama Redonda Veludo"
        hint="Aparece no card do produto"
        error={errors.shortName}
        required
      />
      <Field
        label="Subtítulo"
        name="subtitle"
        value={fields.subtitle}
        onChange={v => setField('subtitle', v)}
        placeholder="Ex: Conforto e sofisticação para o seu pet"
      />
      <div className={styles.row}>
        <Field
          label="Preço"
          name="price"
          value={fields.price}
          onChange={v => setField('price', v)}
          placeholder="Ex: R$ 289,90"
          error={errors.price}
          required
        />
        <Field
          label="Preço original"
          name="originalPrice"
          value={fields.originalPrice}
          onChange={v => setField('originalPrice', v)}
          placeholder="Ex: R$ 340,00"
          hint="Opcional — aparece riscado"
        />
      </div>
      <div>
        <p className={styles.sectionLabel}>Categorias</p>
        <div className={styles.categories}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={[
                styles.catBtn,
                fields.category.includes(cat.id) ? styles.catBtnActive : '',
              ].filter(Boolean).join(' ')}
              onClick={() => toggleCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
        {errors.category && <p className={styles.catError}>{errors.category}</p>}
      </div>
      <div className={styles.row}>
        <Field
          label="Badge"
          name="badge"
          value={fields.badge}
          onChange={v => setField('badge', v)}
          placeholder="Ex: NOVO"
          hint="Opcional"
        />
        <Field
          label="Link PagBank"
          name="buyLink"
          value={fields.buyLink}
          onChange={v => setField('buyLink', v)}
          placeholder="https://..."
          hint="Opcional"
        />
      </div>
      <div className={styles.nav}>
        <button type="button" className={styles.btnNext} onClick={onNext}>
          Próximo →
        </button>
      </div>
    </div>
  )
}
