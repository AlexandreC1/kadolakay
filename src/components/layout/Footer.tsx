import styles from "./footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span>© {new Date().getFullYear()} Bayou.</span>
    </footer>
  );
}
