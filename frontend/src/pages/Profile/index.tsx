import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import NavBar from "../../components/NavBar";
import { useGetUser } from "../../hooks/users/useGetUser";
import { useUpdateProfile } from "../../hooks/users/useUpdateProfile";
import { useUpdateProfilePicture } from "../../hooks/users/useUpdateProfilePicture";
import { useSendFollow } from "../../hooks/follows/useSendFollow";
import { useBlockUser } from "../../hooks/follows/useBlockUser";
import { useDeleteFollow } from "../../hooks/follows/useDeleteFollow";
import DefaultProfilePicture from "../../components/DefaultProfilePicture";
import Post from "../../components/Post";
import {
    Loader2,
    Edit,
    X,
    Save,
    UserPlus,
    Ban,
    UserMinus,
    Camera,
} from "lucide-react";
import { useAuth } from "../../hooks/auth/useAuth";
import type { Post as PostType } from "../../hooks/posts/useGetFeed";

export default function ProfilePage() {
    const { id } = useParams();
    const userId = id ? parseInt(id) : undefined;
    const { state } = useAuth();
    const isOwnProfile = !userId || userId === state.user?.id;

    const { user, getUser, loading, error } = useGetUser();
    const { updateProfile, isLoading: isUpdating } = useUpdateProfile();
    const { updateProfilePicture, isLoading: isUpdatingPicture } =
        useUpdateProfilePicture();
    const { sendFollow, isLoading: isSendingFollow } = useSendFollow();
    const { blockUser, isLoading: isBlocking } = useBlockUser();
    const { deleteFollow, isLoading: isDeleting } = useDeleteFollow();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editUsername, setEditUsername] = useState("");
    const [editAboutMe, setEditAboutMe] = useState("");
    const [editPassword, setEditPassword] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [posts, setPosts] = useState<PostType[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isLoadingPosts, setIsLoadingPosts] = useState(false);
    const [hasMorePosts, setHasMorePosts] = useState(true);
    const observerRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getUser(userId);
    }, [userId]);

    useEffect(() => {
        if (user) {
            setPosts(user.posts || []);
            setNextCursor(user.nextCursor || null);
            setHasMorePosts(
                (user.posts?.length || 0) === 10 &&
                    (user.nextCursor || null) !== null,
            );
        }
    }, [user]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (
                    entries[0].isIntersecting &&
                    hasMorePosts &&
                    !isLoadingPosts
                ) {
                    loadMorePosts();
                }
            },
            { threshold: 0.5 },
        );

        if (observerRef.current) {
            observer.observe(observerRef.current);
        }

        return () => observer.disconnect();
    }, [hasMorePosts, isLoadingPosts, nextCursor]);

    const loadMorePosts = async () => {
        if (!nextCursor || isLoadingPosts) return;
        setIsLoadingPosts(true);
        try {
            const data = await getUser(userId, nextCursor, 10);
            if (data && data.posts) {
                setPosts((prev) => [...prev, ...data.posts]);
                setNextCursor(data.nextCursor || null);
                setHasMorePosts(
                    data.posts.length === 10 &&
                        (data.nextCursor || null) !== null,
                );
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingPosts(false);
        }
    };

    const handleOpenEditModal = () => {
        if (user?.user) {
            setEditUsername(user.user.username);
            setEditAboutMe(user.user.aboutMe || "");
            setEditEmail(user.user.email || "");
            setEditPassword("");
            setIsEditModalOpen(true);
        }
    };

    const handleSaveProfile = async () => {
        try {
            await updateProfile({
                username: editUsername,
                about: editAboutMe,
                password: editPassword || undefined,
                email: editEmail || undefined,
            });
            setIsEditModalOpen(false);
            getUser(userId);
        } catch (err) {
            console.error(err);
        }
    };

    const handleProfilePictureChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        if (e.target.files && e.target.files[0]) {
            try {
                await updateProfilePicture(e.target.files[0]);
                getUser(userId);
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleFollowAction = async () => {
        if (!userId) return;
        if (user?.followStatus?.status === "PENDING" && user.followStatus.senderId === state.user?.id) {
            try {
                await deleteFollow(user.followStatus.id);
                getUser(userId);
            } catch (err) {
                console.error(err);
            }
        } else {
            try {
                await sendFollow(userId);
                getUser(userId);
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleBlock = async () => {
        if (!userId) return;
        try {
            await blockUser(userId);
            getUser(userId);
        } catch (err) {
            console.error(err);
        }
    };

    const handleUnblock = async () => {
        if (!userId || !user?.followStatus) return;
        try {
            await deleteFollow(user.followStatus.id);
            getUser(userId);
        } catch (err) {
            console.error(err);
        }
    };

    const getFollowButton = () => {
        if (!userId || !user?.followStatus) {
            return (
                <button
                    onClick={handleFollowAction}
                    disabled={isSendingFollow}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-colors"
                >
                    {isSendingFollow ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <UserPlus className="w-4 h-4" />
                    )}
                    Follow
                </button>
            );
        }

        const status = user.followStatus.status;
        const senderId = user.followStatus.senderId;

        if (status === "BLOCKED") {
            if (senderId === state.user?.id) {
                return (
                    <button
                        onClick={handleUnblock}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-zinc-600 hover:bg-zinc-700 text-white rounded-full font-medium disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-colors"
                    >
                        {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <UserMinus className="w-4 h-4" />
                        )}
                        Unblock
                    </button>
                );
            } else {
                return (
                    <div className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full font-medium cursor-not-allowed">
                        Blocked
                    </div>
                );
            }
        }

        if (status === "PENDING") {
            if (senderId === state.user?.id) {
                return (
                    <button
                        onClick={handleFollowAction}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-zinc-600 hover:bg-zinc-700 text-white rounded-full font-medium disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-colors"
                    >
                        {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <UserMinus className="w-4 h-4" />
                        )}
                        Unfollow
                    </button>
                );
            } else {
                return (
                    <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-full font-medium cursor-not-allowed">
                        Pending
                    </div>
                );
            }
        }

        if (status === "ACCEPTED") {
            return (
                <div className="px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full font-medium cursor-not-allowed">
                    Following
                </div>
            );
        }

        return (
            <button
                onClick={handleFollowAction}
                disabled={isSendingFollow}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-colors"
            >
                {isSendingFollow ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <UserPlus className="w-4 h-4" />
                )}
                Send Request
            </button>
        );
    };

    if (loading) {
        return (
            <div className="flex min-h-screen w-full justify-center">
                <NavBar />
                <div className="flex-1 max-w-2xl border-x border-zinc-200 dark:border-zinc-800 min-h-screen pb-16 md:pb-0 flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                </div>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="flex min-h-screen w-full justify-center">
                <NavBar />
                <div className="flex-1 max-w-2xl border-x border-zinc-200 dark:border-zinc-800 min-h-screen pb-16 md:pb-0 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-red-600 dark:text-red-400">
                            {error || "User not found"}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full justify-center">
            <NavBar />
            <div className="flex-1 max-w-2xl border-x border-zinc-200 dark:border-zinc-800 min-h-screen pb-16 md:pb-0">
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800 p-4">
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                        Profile
                    </h1>
                </div>

                <div className="p-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
                        <div className="relative group">
                            {user.user.profile_picture_url ? (
                                <img
                                    src={user.user.profile_picture_url}
                                    alt={user.user.username}
                                    className="w-24 h-24 rounded-full object-cover border-2 border-zinc-200 dark:border-zinc-700"
                                />
                            ) : (
                                <DefaultProfilePicture
                                    username={user.user.username}
                                    className="w-24 h-24 rounded-full flex items-center justify-center bg-blue-600 text-white font-bold text-2xl uppercase"
                                />
                            )}
                            {isOwnProfile && (
                                <>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleProfilePictureChange}
                                        aria-label="Upload profile picture"
                                    />
                                    <button
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                        disabled={isUpdatingPicture}
                                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full transition-opacity cursor-pointer"
                                        aria-label="Change profile picture"
                                        title="Change profile picture"
                                    >
                                        {isUpdatingPicture ? (
                                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                                        ) : (
                                            <Camera className="w-6 h-6 text-white" />
                                        )}
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">
                                {user.user.username}
                            </h2>
                            {user.user.aboutMe && (
                                <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                                    {user.user.aboutMe}
                                </p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                                <span>
                                    <strong className="text-zinc-900 dark:text-white">
                                        {user.user._count?.posts || 0}
                                    </strong>{" "}
                                    posts
                                </span>
                                <span>
                                    <strong className="text-zinc-900 dark:text-white">
                                        {user.user._count?.sentFollows || 0}
                                    </strong>{" "}
                                    following
                                </span>
                                <span>
                                    <strong className="text-zinc-900 dark:text-white">
                                        {user.user._count?.receivedFollows || 0}
                                    </strong>{" "}
                                    followers
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {isOwnProfile ? (
                                <button
                                    onClick={handleOpenEditModal}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium cursor-pointer flex items-center gap-2 transition-colors"
                                >
                                    <Edit className="w-4 h-4" />
                                    Edit Profile
                                </button>
                            ) : (
                                <>
                                    {getFollowButton()}
                                    {user.followStatus?.status !== "BLOCKED" &&
                                        user.followStatus?.senderId !==
                                            state.user?.id && (
                                            <button
                                                onClick={handleBlock}
                                                disabled={isBlocking}
                                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-colors"
                                            >
                                                {isBlocking ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Ban className="w-4 h-4" />
                                                )}
                                                Block
                                            </button>
                                        )}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {posts.length === 0 && (
                            <div className="p-8 text-center">
                                <p className="text-zinc-600 dark:text-zinc-400">
                                    No posts yet
                                </p>
                            </div>
                        )}

                        {posts.map((post) => (
                            <Post key={post.id} post={post} />
                        ))}

                        {isLoadingPosts && (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                            </div>
                        )}

                        {hasMorePosts && !isLoadingPosts && (
                            <div ref={observerRef} className="h-10"></div>
                        )}

                        {!hasMorePosts && posts.length > 0 && (
                            <div className="p-8 text-center">
                                <p className="text-zinc-600 dark:text-zinc-400">
                                    You've reached the end
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                                Edit Profile
                            </h3>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full cursor-pointer"
                                aria-label="Close modal"
                                title="Close"
                            >
                                <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label
                                    htmlFor="edit-username"
                                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                                >
                                    Username
                                </label>
                                <input
                                    id="edit-username"
                                    type="text"
                                    value={editUsername}
                                    onChange={(e) =>
                                        setEditUsername(e.target.value)
                                    }
                                    placeholder="Username"
                                    className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="edit-about"
                                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                                >
                                    About Me
                                </label>
                                <textarea
                                    id="edit-about"
                                    value={editAboutMe}
                                    onChange={(e) =>
                                        setEditAboutMe(e.target.value)
                                    }
                                    rows={3}
                                    placeholder="About me"
                                    className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="edit-email"
                                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                                >
                                    Email
                                </label>
                                <input
                                    id="edit-email"
                                    type="email"
                                    value={editEmail}
                                    onChange={(e) =>
                                        setEditEmail(e.target.value)
                                    }
                                    placeholder="Email"
                                    className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="edit-password"
                                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                                >
                                    New Password
                                </label>
                                <input
                                    id="edit-password"
                                    type="password"
                                    value={editPassword}
                                    onChange={(e) =>
                                        setEditPassword(e.target.value)
                                    }
                                    placeholder="New password (leave empty to keep current)"
                                    className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                disabled={isUpdating}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-colors"
                            >
                                {isUpdating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
