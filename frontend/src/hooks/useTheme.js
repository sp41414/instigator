import { ThemeContext } from "../contexts/ThemeProvider";
import { useContext } from "react";

export default function useTheme() {
    const context = useContext(ThemeContext);
    return context;
}
