import Head from "next/head";
import styles from "./layout.module.scss";

export default function Layout({ children, title, content }) {
  return (
    <div id="layout">
      <Head>
        <title>{title ? title : "Index"}</title>
      </Head>
      <div className={`progress_bar ${styles.progress_bar}`} />
      <div>{children}</div>
    </div>
  );
}
