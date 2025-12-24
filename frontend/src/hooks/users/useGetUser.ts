import axios from "axios";
import { useState } from "react";
import { parseErrorMessage } from "../../utils/parseError";
import { API_URL } from "../auth/useAuth";

interface Post {
    // TODO
}

interface UserProfile {
    user: {
        id: number;
        username: string;
        profile_picture_url?: string;
        email?: string;
        aboutMe?: string;
    };
    posts: Post[];
}

export function useGetUser() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function getUser(id?: number) {
        setLoading(true);
        setError(null);

        try {
            if (!id || isNaN(id) || id <= 0) {
                const response = await axios.get(`${API_URL}/users/me`, {
                    withCredentials: true,
                });
                setUser(response.data.data);
                return;
            }
            const response = await axios.get(`${API_URL}/users/${id}`, {
                withCredentials: true,
            });

            setUser(response.data.data);
        } catch (err: any) {
            setError(parseErrorMessage(err.response?.data.message));
        } finally {
            setLoading(false);
        }
    }

    console.log(user);

    return { user, getUser, error, loading };
}
