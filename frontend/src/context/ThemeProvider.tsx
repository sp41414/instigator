import {
  createContext,
  useState,
  useEffect,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: Dispatch<SetStateAction<ThemeMode>>;
  isDark: boolean;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children?: ReactNode;
}

function ThemeProvider({ children }: ThemeProviderProps) {
  const getShouldBeDark = (currentTheme: ThemeMode): boolean => {
    if (currentTheme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return currentTheme === "dark";
  };

  const [theme, setThemeState] = useState<ThemeMode>((): ThemeMode => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light" || saved === "system") {
      return saved;
    }
    return "system";
  });

  const [isDark, setIsDark] = useState<boolean>(() => getShouldBeDark(theme));

  const applyTheme = (newTheme: ThemeMode) => {
    const root = document.documentElement;
    const shouldBeDark = getShouldBeDark(newTheme);
    setIsDark(shouldBeDark);

    if (shouldBeDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.style.colorScheme = shouldBeDark ? "dark" : "light";
    localStorage.setItem("theme", newTheme);
  };

  const setTheme: Dispatch<SetStateAction<ThemeMode>> = (
    newTheme: ThemeMode | ((prev: ThemeMode) => ThemeMode)
  ) => {
    const resolvedTheme =
      typeof newTheme === "function" ? newTheme(theme) : newTheme;
    setThemeState(resolvedTheme);
    applyTheme(resolvedTheme);
  };

  useEffect(() => {
    applyTheme(theme);

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => {
        const newShouldBeDark = mediaQuery.matches;
        setIsDark(newShouldBeDark);
        const root = document.documentElement;
        if (newShouldBeDark) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
        root.style.colorScheme = newShouldBeDark ? "dark" : "light";
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
