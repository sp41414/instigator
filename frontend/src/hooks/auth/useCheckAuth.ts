import { useEffect, useState } from "react";
import { useAuth, API_URL } from "./useAuth";
import { parseErrorMessage } from "../../utils/parseError";
import axios from "axios";
import { useLocation, useNavigate } from "react-router";

export const useCheckAuth = () => {
    const { state, dispatch } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await axios.get(`${API_URL}/users/me`, {
                    withCredentials: true,
                });

                const user = response.data?.data.user;

                if (user.username?.startsWith("temp_")) {
                    dispatch({ type: "NEEDS_USERNAME", payload: true });
                    dispatch({ type: "SET_USER", payload: user });

                    if (location.pathname !== "/setup-username") {
                        navigate("/setup-username");
                    }
                } else if (user) {
                    dispatch({ type: "LOGIN_SUCCESS", payload: user });
                } else {
                    dispatch({ type: "LOADING", payload: false });

                    const routes = ["/login", "/signup"];
                    if (!routes.includes(location.pathname)) {
                        navigate("/signup");
                    }
                }
            } catch (err: any) {
                setError(parseErrorMessage(err.response?.data?.message));
                dispatch({ type: "LOADING", payload: false });

                const routes = ["/login", "/signup"];
                if (!routes.includes(location.pathname)) {
                    navigate("/signup");
                }
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [dispatch, navigate, location.pathname]);

    return { error, isLoading, state };
};
