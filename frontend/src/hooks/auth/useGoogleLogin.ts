import { API_URL } from "./useAuth";

export const useGoogleLogin = () => {
    const loginGoogle = () => {
        window.location.href = `${API_URL}/auth/google`;
    };
    return { loginGoogle };
};
