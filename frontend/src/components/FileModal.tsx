import {
    Download,
    FileIcon,
    FileText,
    ImageIcon,
    Loader2,
    Music,
    Video,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface FileModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl: string;
    fileType: "image" | "video" | "audio" | "document" | "file";
    fileName?: string;
}

export default function FileModal({
    isOpen,
    onClose,
    fileUrl,
    fileType,
    fileName,
}: FileModalProps) {
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }

        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = fileName || fileUrl.split("/").pop() || "download";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } catch (err) {
            console.error("Download failed:", err);
        } finally {
            setIsDownloading(false);
        }
    };

    const getFileIcon = () => {
        switch (fileType) {
            case "image":
                return ImageIcon;
            case "video":
                return Video;
            case "audio":
                return Music;
            case "document":
                return FileText;
            default:
                return FileIcon;
        }
    };

    const FileIconComponent = getFileIcon();

    return (
        <>
            <div
                className="fixed inset-0 bg-black/70 z-20 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            ></div>

            <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
                <div className="relative bg-white dark:bg-zinc-900 rounded-2xl max-w-4xl max-h-[90vh] w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xl">
                    <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-3">
                            <FileIconComponent className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />

                            <div className="min-w-0">
                                <h3 className="font-bold text-zinc-900 dark:text-white truncate">
                                    {fileName || fileUrl.split("/").pop()}
                                </h3>

                                <p className="text-sm text-zinc-500 dark:text-zinc-400 capitalize">
                                    {fileType} file
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-50 transition-colors duration-200 cursor-pointer"
                                title="Download"
                            >
                                {isDownloading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Download className="w-5 h-5" />
                                )}
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors duration-200 cursor-pointer"
                                title="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="p-4 max-h-[calc(90vh-80px)] overflow-auto flex items-center justify-center">
                        {fileType === "image" ? (
                            <img
                                src={fileUrl}
                                alt={fileName || "Image"}
                                className="max-w-full max-h-full object-contain mx-auto"
                                loading="lazy"
                            />
                        ) : fileType === "video" ? (
                            <div className="w-full">
                                <video
                                    controls
                                    autoPlay
                                    className="max-w-full max-h-[70vh] rounded-lg mx-auto"
                                    src={fileUrl}
                                >
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        ) : fileType === "audio" ? (
                            <div className="w-full max-w-lg p-4">
                                <div className="flex items-center gap-4 mb-4">
                                    <Music className="w-16 h-16 text-blue-600 dark:text-blue-400 shrink-0" />
                                    <div className="min-w-0">
                                        <h4 className="font-semibold text-zinc-900 dark:text-white truncate">
                                            {fileName || "Audio File"}
                                        </h4>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                            Audio file
                                        </p>
                                    </div>
                                </div>
                                <audio
                                    controls
                                    className="w-full"
                                    src={fileUrl}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8">
                                <FileIconComponent className="w-32 h-32 text-blue-600 dark:text-blue-400 mb-4" />
                                <p className="text-zinc-600 dark:text-zinc-400 text-center mb-4">
                                    This file cannot be previewed directly.
                                </p>
                                <button
                                    onClick={handleDownload}
                                    disabled={isDownloading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors duration-200"
                                >
                                    {isDownloading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Downloading...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4" />
                                            Download File
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
