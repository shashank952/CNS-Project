import styles from './PagePlaceholder.module.css'

export default function PagePlaceholder({ title, description }) {
  return (
    <section>
      <p className={styles.eyebrow}>Coming next</p>
      <h1>{title}</h1>
      <p className={styles.description}>{description}</p>
      <p className={styles.note}>
        This page is a placeholder. Its workflow is implemented in a later
        ticket.
      </p>
    </section>
  )
}
