import { useState } from "react";
import axios from "axios";
import { API_URL } from "../auth/useAuth";
import { parseErrorMessage } from "../../utils/parseError";
import type { Post } from "./useGetFeed";

export const useCreatePost = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createPost = async (text: string, files: File[]) => {
        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("text", text);

        files.forEach((file) => {
            formData.append("files", file);
        });

        try {
            const response = await axios.post(`${API_URL}/posts`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                withCredentials: true,
            });

            return response.data.data.post as Post;
        } catch (err: any) {
            setError(parseErrorMessage(err.response?.data.message));
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { createPost, isLoading, error };
};
