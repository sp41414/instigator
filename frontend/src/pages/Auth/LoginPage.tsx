import { useEffect, useState } from "react";
import { useGoogleLogin } from "../../hooks/auth/useGoogleLogin";
import { useLogin } from "../../hooks/auth/useLogin";
import { Link, useNavigate } from "react-router";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useCheckAuth } from "../../hooks/auth/useCheckAuth";
import { useGuestLogin } from "../../hooks/auth/useGuestLogin";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState({
        username: "",
        password: "",
        guestLogin: "",
    });
    const [touched, setTouched] = useState({
        username: false,
        password: false,
    });
    const { loginGoogle } = useGoogleLogin();
    const { guestLogin } = useGuestLogin();
    const { login, error, isLoading } = useLogin();
    const navigate = useNavigate();
    const { state } = useCheckAuth();

    useEffect(() => {
        if (state.isAuthenticated && !state.needsUsername && !state.isLoading) {
            navigate("/");
        }
    }, [state.isAuthenticated, state.needsUsername, state.isLoading, navigate]);

    const handleUsernameUpdate = (value: string) => {
        setUsername(value);

        if (!value.trim()) {
            setErrors((prev) => ({
                ...prev,
                username: "Username is required",
            }));
        } else {
            setErrors((prev) => ({ ...prev, username: "" }));
        }
    };

    const handlePasswordUpdate = (value: string) => {
        setPassword(value);

        if (!value) {
            setErrors((prev) => ({
                ...prev,
                password: "Password is required",
            }));
        } else {
            setErrors((prev) => ({ ...prev, password: "" }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({ username: true, password: true });

        if (errors.username || errors.password || !username || !password) {
            return;
        }

        try {
            await login(username, password);
            navigate("/");
        } catch (err) {
            console.error(err);
        }
    };

    const handleGuestLogin = async () => {
        try {
            await guestLogin();
            navigate("/");
        } catch (err) {
            console.error(err);
            setErrors((prev) => ({
                ...prev,
                guestLogin: "An error occurred while logging in as a guest",
            }));
        }
    };

    if (state.isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-12 h-12 text-zinc-600 dark:text-zinc-400 animate-spin" />
            </div>
        );
    }

    const showUsernameError = touched.username && errors.username;
    const showPasswordError = touched.password && errors.password;
    const showGuestError = errors.guestLogin;
    const isUsernameValid = username && !errors.username && touched.username;
    const isPasswordValid = password && !errors.password && touched.password;

    return (
        <div className="flex items-center justify-center min-h-screen bg-zinc-100 dark:bg-zinc-950 px-4">
            <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg">
                <div className="flex flex-col items-center mb-8">
                    <img src="/logo.png" alt="logo" className="w-32 mb-4" />
                    <h1 className="text-3xl text-zinc-900 dark:text-white font-display font-bold">
                        Welcome Back
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-2">
                        Sign in to continue to Instigator
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
                                onBlur={() =>
                                    setTouched((prev) => ({
                                        ...prev,
                                        username: true,
                                    }))
                                }
                                className={`w-full px-4 py-3 pr-12 bg-zinc-50 dark:bg-zinc-800 border rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 transition-all duration-200 ${showUsernameError ? "border-red-500 focus:ring-red-500" : isUsernameValid ? "border-green-500 focus:ring-green-500" : "border-zinc-200 dark:border-zinc-700 focus:ring-blue-500"}`}
                                placeholder="Enter your username"
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

                    <div>
                        <label
                            htmlFor="password"
                            className="block text-xl font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                        >
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) =>
                                    handlePasswordUpdate(e.target.value)
                                }
                                onBlur={() =>
                                    setTouched((prev) => ({
                                        ...prev,
                                        password: true,
                                    }))
                                }
                                className={`w-full px-4 py-3 pr-12 bg-zinc-50 dark:bg-zinc-800 border rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 transition-all duration-200 ${showPasswordError ? "border-red-500 focus:ring-red-500" : isPasswordValid ? "border-green-500 focus:ring-green-500" : "border-zinc-200 dark:border-zinc-700 focus:ring-blue-500"}`}
                                placeholder="••••••••"
                            />
                            {isPasswordValid && (
                                <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                            )}
                        </div>
                        {showPasswordError && (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {errors.password}
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
                            </>
                        ) : (
                            "Sign In"
                        )}
                    </button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white dark:bg-zinc-900 text-zinc-500">
                            Or continue with
                        </span>
                    </div>
                </div>

                {/*
                <button
                    onClick={loginGoogle}
                    className="w-full py-3 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-900 cursor-pointer dark:text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-3"
                >
                    <svg
                        viewBox="-3 0 262 262"
                        xmlns="http://www.w3.org/2000/svg"
                        preserveAspectRatio="xMidYMid"
                        className="w-5 h-5"
                        fill="#000000"
                    >
                        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                        <g
                            id="SVGRepo_tracerCarrier"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        ></g>
                        <g id="SVGRepo_iconCarrier">
                            <path
                                d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                                fill="#4285F4"
                            ></path>
                            <path
                                d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                                fill="#34A853"
                            ></path>
                            <path
                                d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
                                fill="#FBBC05"
                            ></path>
                            <path
                                d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                                fill="#EB4335"
                            ></path>
                        </g>
                    </svg>
                    Continue with Google
                </button>
                */}

                <button
                    onClick={handleGuestLogin}
                    className="w-full py-3 mt-2 bg-slate-200 dark:bg-zinc-700 border-transparent hover:bg-slate-300 dark:hover:bg-zinc-600 text-slate-900 dark:text-white cursor-pointer font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-3"
                >
                    Continue as a Guest
                </button>

                {showGuestError && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.guestLogin}
                    </p>
                )}

                <p className="text-center text-sm text-zinc-600 dark:text-zinc-400 mt-6">
                    Don't have an account?
                    <Link
                        to="/signup"
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-all duration-200 cursor-pointer ml-1"
                    >
                        Sign Up
                    </Link>
                </p>
            </div>
        </div>
    );
}
