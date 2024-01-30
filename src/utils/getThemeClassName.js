export const getThemeClassName = (className, styles, theme = "dark") => {
  const themeSuffix = theme === "light" ? "_light" : "_dark";
  return styles[className + themeSuffix];
};
