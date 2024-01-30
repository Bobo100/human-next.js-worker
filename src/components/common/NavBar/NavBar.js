import { Fragment, useEffect, useState } from "react";
import styles from "./NavBar.module.scss";
import Link from "next/link";
import { useRouter } from "next/router";
import ThemeToggle from "@/components/common/theme/ThemeToggle";
import { useTheme } from "next-themes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { getThemeClassName } from "@/utils/getThemeClassName";
import { useScrollLock } from "@/utils/scrollHook";
import { LinkList } from "../LinkList";
const NavBar = () => {
  const router = useRouter();

  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);
  const { theme } = useTheme();

  const [click, setClick] = useState(false);
  const { lockScroll, unlockScroll } = useScrollLock();

  const handleIconClick = () => {
    const innerWidth = window.innerWidth;
    if (innerWidth < 1024 && click) {
      unlockScroll();
    } else if (innerWidth < 1024 && !click) {
      lockScroll();
    }
    setClick(!click);
  };

  useEffect(() => {
    const handleResize = () => {
      const innerWidth = window.innerWidth;
      if (innerWidth > 1024) {
        unlockScroll();
        setClick(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.scrollY;
      const visible = prevScrollPos >= currentScrollPos;
      const innerWidth = window.innerWidth;
      if (innerWidth < 1024) {
        setVisible(true);
        setPrevScrollPos(currentScrollPos);
        return;
      }

      setPrevScrollPos(currentScrollPos);
      setVisible(visible);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [prevScrollPos, visible]);

  const mobileClose = () => {
    const innerWidth = window.innerWidth;
    if (innerWidth < 1024) {
      setClick(false);
      unlockScroll();
    }
  };

  const getLinkClassName = (path) => {
    const isActive = router.pathname === path;
    const activeStyles =
      theme === "light" ? styles.active_light : styles.active_dark;
    return isActive ? activeStyles : getThemeClassName("link", styles, theme);
  };

  const getLink = ({ href, name, className = "" }) => {
    return (
      <Link
        href={`${href}`}
        className={getLinkClassName(`${className}`)}
        onClick={mobileClose}
      >
        {name}
      </Link>
    );
  };

  return (
    <nav
      id="navbar"
      className={`${styles.navbar} ${
        visible ? "navbar--visible" : styles.navbar_Hidden
      } ${getThemeClassName("nav", styles, theme)}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.navbar_container}>
        <div
          className={`${styles.mobile_icon} ${getThemeClassName(
            "mobile_icon",
            styles,
            theme
          )}`}
          onClick={handleIconClick}
        >
          {click ? (
            <FontAwesomeIcon icon={fas.faTimes} />
          ) : (
            <FontAwesomeIcon icon={fas.faBars} />
          )}
        </div>

        <div
          className={`${styles.navbar_menu} ${
            click ? styles.navbar_menu_active : ""
          }`}
        >
          <div
            className={`${styles.link_container} ${getThemeClassName(
              "link_container",
              styles,
              theme
            )} ${click ? styles.link_container_active : ""}`}
          >
            {LinkList.map((item, index) => {
              return <Fragment key={index}>{getLink(item)}</Fragment>;
            })}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
