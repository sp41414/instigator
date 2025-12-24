import { useNavigate } from "react-router";
import { useSetupUsername } from "../../hooks/auth/useSetupUsername";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useCheckAuth } from "../../hooks/auth/useCheckAuth";

export default function SetupUsernamePage() {
    const [username, setUsername] = useState("");
    const [errors, setErrors] = useState({ username: "" });
    const [touched, setTouched] = useState({ username: false });
    const { setupUsername, error, isLoading } = useSetupUsername();
    const navigate = useNavigate();
    const { state } = useCheckAuth();

    useEffect(() => {
        if (!state.needsUsername && !state.isLoading) {
            navigate("/");
        } else if (!state.isAuthenticated && !state.isLoading) {
            navigate("/signup");
        }
    }, [state.isAuthenticated, state.needsUsername, state.isLoading, navigate]);

    const handleUsernameUpdate = (value: string) => {
        setUsername(value);

        if (!value.trim()) {
            setErrors({ username: "Username is required" });
        } else if (value.length < 1 || value.length > 20) {
            setErrors({
                username: "Username must be between 1 and 20 characters",
            });
        } else if (!/^[a-zA-Z0-9-_]*$/.test(value)) {
            setErrors({
                username:
                    "Only letters, numbers, dashes, and underscores allowed",
            });
        } else {
            setErrors({ username: "" });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({ username: true });

        if (errors.username || !username) {
            return;
        }

        try {
            await setupUsername(username);
            navigate("/");
        } catch (err) {
            console.error("Setup username failed:", err);
        }
    };

    if (state.isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-12 h-12 text-zinc-600 dark:text-zinc-400 animate-spin" />
            </div>
        );
    }

    if (!state.needsUsername) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-zinc-600 dark:text-zinc-400 animate-spin" />
                    <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                        Redirecting...
                    </p>
                </div>
            </div>
        );
    }

    const showUsernameError = touched.username && errors.username;
    const isUsernameValid = username && !errors.username && touched.username;

    return (
        <div className="flex items-center justify-center min-h-screen bg-zinc-100 dark:bg-zinc-950 px-4">
            <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg">
                <div className="flex flex-col items-center mb-8">
                    <img src="/logo.png" alt="logo" className="w-32 mb-4" />
                    <h1 className="text-3xl text-zinc-900 dark:text-white font-display font-bold">
                        Choose Your Username
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-2 text-center">
                        Your Google display name was already taken. Please
                        choose a unique username.
                    </p>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-4 mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                        <span className="text-sm text-red-600 dark:text-red-400">
                            {error}
                        </span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label
                            htmlFor="username"
                            className="block text-xl font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                        >
                            Username
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) =>
                                    handleUsernameUpdate(e.target.value)
                                }
                                onBlur={() => setTouched({ username: true })}
                                className={`w-full px-4 py-3 pr-12 bg-zinc-50 dark:bg-zinc-800 border rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 transition-all duration-200 ${showUsernameError ? "border-red-500 focus:ring-red-500" : isUsernameValid ? "border-green-500 focus:ring-green-500" : "border-zinc-200 dark:border-zinc-700 focus:ring-blue-500"}`}
                                placeholder="Enter your username"
                                autoFocus
                            />
                            {isUsernameValid && (
                                <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                            )}
                        </div>
                        {showUsernameError && (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {errors.username}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 hover:cursor-pointer disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Setting username...
                            </>
                        ) : (
                            "Continue"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
