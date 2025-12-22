import { createContext, useSTate } from "react";

export const ThemeContext = createContext(null);

const ThemeProvider = () => {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem("theme");
        return saved === "dark";
    });

    useEffect(() => {
        document.documentElement.classList.toggle("dark", isDark);
        document.documentElement.style.colorScheme = isDark ? "dark" : "light";
        localStorage.setItem("theme", isDark ? "dark" : "light");
    }, [isDark]);

    return (
        <ThemeContext.Provider value={{ isDark, setIsDark }}>
            {children}
        </ThemeContext.Provider>
    );
};

export default ThemeProvider;
