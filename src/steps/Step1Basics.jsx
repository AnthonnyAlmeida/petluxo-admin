import Field from '../components/Field'
import { formatPrice } from '../lib/formatPrice'
import styles from './Step1Basics.module.css'

export default function Step1Basics({ fields, setField, errors, onNext, addVariant, updateVariant, removeVariant, updateCategory, categories = [] }) {
  function handlePriceBlur() {
    setField('price', formatPrice(fields.price))
  }

  function handleOriginalPriceBlur() {
    setField('originalPrice', formatPrice(fields.originalPrice))
  }

  function handleVariantPriceBlur(index) {
    updateVariant(index, 'price', formatPrice(fields.variants[index].price))
  }

  function handleToggleVariants() {
    const turningOn = !fields.hasVariants
    setField('hasVariants', turningOn)
    if (turningOn && fields.variants.length === 0) {
      addVariant()
    }
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

      <div className={styles.variantToggle}>
        <span className={styles.variantToggleLabel}>Produto tem tamanhos diferentes?</span>
        <button
          type="button"
          className={[styles.toggleSwitch, fields.hasVariants ? styles.toggleSwitchOn : ''].filter(Boolean).join(' ')}
          onClick={handleToggleVariants}
          aria-pressed={fields.hasVariants}
        />
      </div>

      {!fields.hasVariants ? (
        <div className={styles.row}>
          <Field
            label="Preço"
            name="price"
            value={fields.price}
            onChange={v => setField('price', v)}
            onBlur={handlePriceBlur}
            placeholder="Ex: 289,90"
            error={errors.price}
            required
          />
          <Field
            label="Preço original"
            name="originalPrice"
            value={fields.originalPrice}
            onChange={v => setField('originalPrice', v)}
            onBlur={handleOriginalPriceBlur}
            placeholder="Ex: 340,00"
            hint="Opcional — aparece riscado"
          />
        </div>
      ) : (
        <div className={styles.variantsSection}>
          <div className={styles.variantsHeader}>
            <span className={styles.variantHeaderCell}>Tamanho</span>
            <span className={styles.variantHeaderCell}>Preço</span>
            <span className={styles.variantHeaderCell}>Link PagBank</span>
            <span />
          </div>
          {fields.variants.map((variant, i) => (
            <div key={i} className={styles.variantRow}>
              <input
                type="text"
                className={styles.variantInput}
                value={variant.size}
                onChange={e => updateVariant(i, 'size', e.target.value)}
                placeholder="P"
              />
              <input
                type="text"
                className={styles.variantInput}
                value={variant.price}
                onChange={e => updateVariant(i, 'price', e.target.value)}
                onBlur={() => handleVariantPriceBlur(i)}
                placeholder="129,90"
              />
              <input
                type="text"
                className={styles.variantInput}
                value={variant.link}
                onChange={e => updateVariant(i, 'link', e.target.value)}
                placeholder="https://..."
              />
              {fields.variants.length > 1 && (
                <button
                  type="button"
                  className={styles.variantRemove}
                  onClick={() => removeVariant(i)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className={styles.btnAddVariant}
            onClick={addVariant}
          >
            + Adicionar tamanho
          </button>
          {errors.variants && <p className={styles.variantError}>{errors.variants}</p>}
        </div>
      )}

      <div>
        <p className={styles.sectionLabel}>Categorias</p>
        <div className={styles.categories}>
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={[
                styles.catBtn,
                fields.category.includes(cat.id) ? styles.catBtnActive : '',
              ].filter(Boolean).join(' ')}
              onClick={() => updateCategory(cat.id)}
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
        {!fields.hasVariants && (
          <Field
            label="Link PagBank"
            name="buyLink"
            value={fields.buyLink}
            onChange={v => setField('buyLink', v)}
            placeholder="https://..."
            hint="Opcional"
          />
        )}
      </div>

      <div className={styles.nav}>
        <button type="button" className={styles.btnNext} onClick={onNext}>
          Próximo →
        </button>
      </div>
    </div>
  )
}
