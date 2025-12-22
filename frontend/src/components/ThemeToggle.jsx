import { Sun, Moon } from "lucide-react";
import useTheme from "../hooks/useTheme";

function ThemeToggle() {
    const { isDark, setIsDark } = useTheme();

    return (
        <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
            aria-label="Toggle theme"
        >
            <div className="transition-transform duration-200">
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </div>
        </button>
    );
}

export default ThemeToggle;
