// https://blog.logrocket.com/create-advanced-scroll-lock-react-hook/
import { useCallback, useLayoutEffect } from "react";
export const useScrollLock = () => {
  const lockScroll = useCallback(() => {
    const scrollBarCompensation = window.innerWidth - document.body.offsetWidth;
    document.body.style.overflow = "hidden";
    document.body.dataset.scrollLock = "true";
    const desktop = document.querySelector("#layout");
    desktop.style.paddingRight = `${scrollBarCompensation}px`;
    const navbar = document.querySelector("#navbar");
    navbar.style.paddingRight = `${scrollBarCompensation}px`;
  }, []);

  const unlockScroll = useCallback(() => {
    document.body.style.overflow = "";
    delete document.body.dataset.scrollLock;
    const desktop = document.querySelector("#layout");
    desktop.style.paddingRight = "";
    const navbar = document.querySelector("#navbar");
    navbar.style.paddingRight = "";
  }, []);

  useLayoutEffect(() => {
    const scrollBarCompensation = window.innerWidth - document.body.offsetWidth;
    document.body.style.setProperty(
      "--scrollbar-compensation",
      `${scrollBarCompensation}px`
    );
  }, []);

  return {
    lockScroll,
    unlockScroll,
  };
};
