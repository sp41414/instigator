import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export const API_URL =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api/v1";
