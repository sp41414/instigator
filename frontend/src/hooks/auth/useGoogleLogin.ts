import { API_URL } from "../../utils/axios";

export const useGoogleLogin = () => {
    const loginGoogle = () => {
        window.location.href = `${API_URL}/auth/google`;
    };
    return { loginGoogle };
};
