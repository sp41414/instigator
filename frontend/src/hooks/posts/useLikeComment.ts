import { useState } from "react";
import axios from "axios";
import { API_URL } from "../auth/useAuth";

export const useLikeComment = () => {
    const [isLoading, setIsLoading] = useState(false);

    const toggleLikeComment = async (postId: string, commentId: string) => {
        setIsLoading(true);
        try {
            const response = await axios.post(
                `${API_URL}/posts/${postId}/comments/${commentId}/like`,
                {},
                { withCredentials: true },
            );
            return response.data.data.liked;
        } catch (err) {
            console.error("Like comment error:", err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { toggleLikeComment, isLoading };
};
