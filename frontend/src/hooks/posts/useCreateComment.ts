import { useState } from "react";
import axios from "axios";
import { API_URL } from "../auth/useAuth";
import { parseErrorMessage } from "../../utils/parseError";

export const useCreateComment = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createComment = async (
        postId: string,
        text: string,
        files?: File[],
    ) => {
        setIsLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append("text", text);
            if (files && files.length > 0) {
                files.forEach((file) => {
                    formData.append("files", file);
                });
            }

            const response = await axios.post(
                `${API_URL}/posts/${postId}/comments`,
                formData,
                {
                    withCredentials: true,
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                },
            );
            return response.data.data.comment;
        } catch (err: any) {
            const msg = parseErrorMessage(
                err.response?.data?.message || "Failed to post comment",
            );
            setError(msg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { createComment, isLoading, error };
};
