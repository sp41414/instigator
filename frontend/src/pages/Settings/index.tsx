import { useState } from "react";
import { useNavigate } from "react-router";
import NavBar from "../../components/NavBar";
import { useLogout } from "../../hooks/auth/useLogout";
import { useDeleteAccount } from "../../hooks/users/useDeleteAccount";
import useTheme from "../../hooks/useTheme";
import { Loader2, LogOut, Trash2, Moon, Sun, Monitor } from "lucide-react";
import { useCheckAuth } from "../../hooks/auth/useCheckAuth";

export default function SettingsPage() {
    const navigate = useNavigate();
    const { logout, isLoading: isLoggingOut } = useLogout();
    const { deleteAccount, isLoading: isDeleting } = useDeleteAccount();
    const { theme, setTheme } = useTheme();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { state } = useCheckAuth();

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await deleteAccount();
            navigate("/login");
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="flex min-h-screen w-full justify-center">
            <NavBar />
            <div className="flex-1 max-w-2xl border-x border-zinc-200 dark:border-zinc-800 min-h-screen pb-16 md:pb-0">
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800 p-4">
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                        Settings
                    </h1>
                </div>

                <div className="p-4 space-y-6">
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                            Appearance
                        </h2>
                        <div className="space-y-3">
                            <button
                                onClick={() => setTheme("light")}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors cursor-pointer ${
                                    theme === "light"
                                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400"
                                        : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                }`}
                            >
                                <Sun className="w-5 h-5" />
                                <span className="font-medium">Light</span>
                            </button>
                            <button
                                onClick={() => setTheme("dark")}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors cursor-pointer ${
                                    theme === "dark"
                                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400"
                                        : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                }`}
                            >
                                <Moon className="w-5 h-5" />
                                <span className="font-medium">Dark</span>
                            </button>
                            <button
                                onClick={() => setTheme("system")}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors cursor-pointer ${
                                    theme === "system"
                                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400"
                                        : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                }`}
                            >
                                <Monitor className="w-5 h-5" />
                                <span className="font-medium">System</span>
                            </button>
                        </div>
                    </div>

                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                            Account
                        </h2>
                        <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {isLoggingOut ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <LogOut className="w-5 h-5" />
                            )}
                            Logout
                        </button>
                    </div>

                    {state.user?.id !== 1 && (
                        <div className="border border-red-200 dark:border-red-900/50 rounded-xl p-6">
                            <h2 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4">
                                Danger Zone
                            </h2>
                            {!showDeleteConfirm ? (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    Delete Account
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                        Are you sure you want to delete your
                                        account? This action cannot be undone.
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() =>
                                                setShowDeleteConfirm(false)
                                            }
                                            className="flex-1 px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleDeleteAccount}
                                            disabled={isDeleting}
                                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 transition-colors"
                                        >
                                            {isDeleting ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
