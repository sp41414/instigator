import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ThemeProvider from "./context/ThemeProvider";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";
import router from "./router";
import { RouterProvider } from "react-router";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeProvider>
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </ThemeProvider>
    </StrictMode>,
);
