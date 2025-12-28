import { useState } from "react";
import { Link } from "react-router";
import DefaultProfilePicture from "./DefaultProfilePicture";
import { Heart, File, Play } from "lucide-react";
import FileModal from "./FileModal";
import { useLikeComment } from "../hooks/posts/useLikeComment";
import type { Comment as CommentType } from "../hooks/posts/useGetPost";
import { useAuth } from "../hooks/auth/useAuth";

interface CommentProps {
    comment: CommentType;
    postId: string;
}

export default function Comment({
    comment,
    postId,
}: CommentProps) {
    const { state } = useAuth();
    const currentUserId = state.user?.id;
    
    const [isLiked, setIsLiked] = useState(comment.likes.length > 0);
    const [likeCount, setLikeCount] = useState(comment._count.likes);
    const [selectedFile, setSelectedFile] = useState<{
        url: string;
        type: string;
        name?: string;
    } | null>(null);
    const { toggleLikeComment } = useLikeComment();
    const [modalOpen, setModalOpen] = useState(false);

    const openFileModal = (url: string, type: string, name?: string) => {
        setSelectedFile({ url, type, name });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
    };

    const getFileType = (
        url: string,
    ): "image" | "video" | "audio" | "document" | "file" => {
        const extension = url.split(".").pop()?.toLowerCase() || "";
        const imageExtensions = [
            "jpg",
            "jpeg",
            "png",
            "gif",
            "webp",
            "svg",
            "bmp",
        ];
        const videoExtensions = [
            "mp4",
            "webm",
            "mov",
            "avi",
            "mkv",
            "flv",
            "wmv",
            "m4v",
        ];
        const audioExtensions = ["mp3", "wav", "ogg", "flac", "aac", "m4a"];
        const documentExtensions = ["pdf", "doc", "docx", "txt", "rtf", "odt"];

        if (imageExtensions.includes(extension)) return "image";
        if (videoExtensions.includes(extension)) return "video";
        if (audioExtensions.includes(extension)) return "audio";
        if (documentExtensions.includes(extension)) return "document";
        return "file";
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            const minutes = Math.floor(diffInHours * 60);
            return `${minutes}m ago`;
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}h ago`;
        } else {
            return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            });
        }
    };

    const handleLike = async () => {
        try {
            const liked = await toggleLikeComment(postId, comment.id);
            setIsLiked(liked);
            setLikeCount((prev) => (liked ? prev + 1 : prev - 1));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <article className="relative border-b border-zinc-200 dark:border-zinc-800 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors duration-200">
            <div className="flex items-start gap-3 relative z-10">
                <Link to={`/profile/${comment.user.id}`} className="shrink-0">
                    {comment?.user?.profile_picture_url ? (
                        <img
                            src={comment?.user?.profile_picture_url}
                            alt="profile picture"
                            className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                        />
                    ) : (
                        <DefaultProfilePicture
                            username={comment?.user?.username}
                        />
                    )}
                </Link>

                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <Link
                                to={`/profile/${comment.user.id}`}
                                className="font-display font-bold text-zinc-900 dark:text-white hover:underline"
                            >
                                {comment?.user?.username}
                            </Link>

                            <span className="text-zinc-500 dark:text-zinc-400 text-sm">
                                {formatTime(comment.createdAt)}
                            </span>
                        </div>
                    </div>

                    <div className="relative z-10">
                        {comment?.text && (
                            <p className="prose dark:prose-invert mb-3 whitespace-pre-wrap font-body">
                                {comment?.text}
                            </p>
                        )}
                    </div>

                    {comment.file_urls && comment.file_urls.length > 0 && (
                        <div className="mb-3">
                            {comment.file_urls.map((url, index) => {
                                const fileType = getFileType(url);

                                return (
                                    <div key={index} className="mb-2">
                                        {fileType === "image" ? (
                                            <img
                                                src={url}
                                                alt={`Comment image ${index + 1}`}
                                                className="rounded-xl max-w-full max-h-60 object-contain cursor-pointer"
                                                loading="lazy"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openFileModal(
                                                        url,
                                                        fileType,
                                                        url.split("/").pop(),
                                                    );
                                                }}
                                            />
                                        ) : fileType === "video" ? (
                                            <div
                                                className="relative rounded-xl overflow-hidden cursor-pointer group"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openFileModal(
                                                        url,
                                                        fileType,
                                                        url.split("/").pop(),
                                                    );
                                                }}
                                            >
                                                <video
                                                    src={url}
                                                    className="max-w-full max-h-60 object-contain rounded-xl"
                                                    controls={false}
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                                                    <Play className="w-12 h-12 text-white opacity-80" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openFileModal(
                                                        url,
                                                        fileType,
                                                        url.split("/").pop(),
                                                    );
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <File className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-zinc-900 dark:text-white truncate">
                                                            {url
                                                                .split("/")
                                                                .pop()}
                                                        </p>
                                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 capitalize">
                                                            {fileType}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleLike}
                                className={`flex items-center gap-2 transition-colors duration-200 cursor-pointer ${isLiked ? "text-red-600 dark:text-red-400" : "hover:text-red-600 dark:hover:text-red-400"}`}
                            >
                                <Heart
                                    className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`}
                                />
                                <span>{likeCount}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <FileModal
                isOpen={modalOpen}
                onClose={closeModal}
                fileUrl={selectedFile?.url || ""}
                fileType={(selectedFile?.type as any) || "file"}
                fileName={selectedFile?.name}
            />
        </article>
    );
}
