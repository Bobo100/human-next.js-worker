import Head from "next/head";
import styles from "./layout.module.scss";
import NavBar from "./common/NavBar/NavBar";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Layout({ children, title }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleRouteChangeStart = () => {
      document
        .querySelector(".progress_bar")
        ?.classList.add(styles.progress_bar_active);
    };

    const handleRouteChangeComplete = () => {
      document
        .querySelector(".progress_bar")
        ?.classList.remove(styles.progress_bar_active);
    };

    router.events.on("routeChangeStart", handleRouteChangeStart);
    router.events.on("routeChangeComplete", handleRouteChangeComplete);

    return () => {
      router.events.off("routeChangeStart", handleRouteChangeStart);
      router.events.off("routeChangeComplete", handleRouteChangeComplete);
    };
  }, [router.events]);

  if (!mounted) {
    return null;
  }

  return (
    <div
      id="layout"
      className={`${styles.container} ${
        theme === "light" ? styles.container_light : styles.container_dark
      }`}
    >
      <Head>
        <title>{title ? title : "Index"}</title>
      </Head>
      <div className={`progress_bar ${styles.progress_bar}`} />
      <NavBar />
      <div className="pt-20">{children}</div>
    </div>
  );
}
