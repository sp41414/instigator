import { useState } from "react";
import { Link } from "react-router";
import DefaultProfilePicture from "./DefaultProfilePicture";
import {
    Edit,
    Heart,
    MessageCircle,
    MoreVertical,
    Play,
    Trash2,
    File,
} from "lucide-react";
import FileModal from "./FileModal";

interface PostProps {
    post: {
        id: string;
        text: string | null;
        createdAt: string;
        file_urls: string[];
        _count: {
            comments: number;
            likes: number;
        };
        user: {
            id: number;
            username: string;
            profile_picture_url: string | null;
        };
        likes: { id: string }[];
    };
    currentUserId?: number;
}

export default function Post({ post, currentUserId }: PostProps) {
    const [isLiked, setIsLiked] = useState(post.likes.length > 0);
    const [likeCount, setLikeCount] = useState(post._count.likes);
    const [showOptions, setShowOptions] = useState(false);
    const [selectedFile, setSelectedFile] = useState<{
        url: string;
        type: string;
        name?: string;
    } | null>(null);

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
            // TODO: like api call/hook

            setIsLiked(!isLiked);
            setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
        } catch (err) {
            console.error(err);
        }
    };

    const isOwner = currentUserId === post.user.id;

    return (
        <article className="border-b border-zinc-200 dark:border-zinc-800 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors duration-200">
            <div className="flex items-start gap-3">
                <Link to={`/profile/${post.user.id}`} className="shrink-0">
                    {post?.user?.profile_picture_url ? (
                        <img
                            src={post?.user?.profile_picture_url}
                            alt="profile picture"
                            className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                        />
                    ) : (
                        <DefaultProfilePicture
                            username={post?.user?.username}
                        />
                    )}
                </Link>

                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <Link
                                to={`/profile/${post.user.id}`}
                                className="font-display font-bold text-zinc-900 dark:text-white hover:underline"
                            >
                                {post?.user?.username}
                            </Link>

                            <span className="text-zinc-500 dark:text-zinc-400 text-sm">
                                {formatTime(post.createdAt)}
                            </span>
                        </div>

                        {isOwner && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowOptions(!showOptions)}
                                    className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-pointer"
                                >
                                    <MoreVertical className="w-5 h-5" />
                                </button>

                                {showOptions && isOwner && (
                                    <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-2 z-10">
                                        {/* TODO: delete & edit post functions */}
                                        <button className="flex items-center gap-3 w-full px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                                            <Edit className="w-4 h-4" />
                                            <span>Edit Post</span>
                                        </button>
                                        <button className="flex items-center gap-3 w-full px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                                            <Trash2 className="w-4 h-4" />
                                            <span>Delete Post</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <Link to={`/posts/${post.id}`}>
                        {post?.text && (
                            <p className="prose dark:prose-invert mb-3 whitespace-pre-wrap font-body">
                                {post?.text}
                            </p>
                        )}
                    </Link>

                    {post.file_urls.length > 0 && (
                        <div className="mb-3">
                            {post.file_urls.map((url, index) => {
                                const fileType = getFileType(url);

                                return (
                                    <div key={index} className="mb-2">
                                        {fileType === "image" ? (
                                            <img
                                                src={url}
                                                alt={`Post image ${index + 1}`}
                                                className="rounded-xl max-w-full max-h-96 object-contain cursor-pointer"
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
                                                    className="max-w-full max-h-96 object-contain rounded-xl"
                                                    controls={false}
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                                                    <Play className="w-12 h-12 text-white opacity-80" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
                                                    <File className="w-8 h-8 text-blue-600 dark:text-blue-400" />
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
                                className={`flex items-center gap-2 transition-colors duration-200 ${isLiked ? "text-red-600 dark:text-red-400" : "hover:text-red-600 dark:hover:text-red-400"}`}
                            >
                                <Heart
                                    className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`}
                                />
                                <span>{likeCount}</span>
                            </button>

                            <Link
                                to={`/posts/${post.id}`}
                                className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                                <MessageCircle className="w-5 h-5" />
                                <span>{post._count.comments}</span>
                            </Link>
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
