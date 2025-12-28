import axios from "axios";

export const API_URL =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/";

export const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});
