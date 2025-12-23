import { Outlet } from "react-router";
import { useCheckAuth } from "../hooks/auth/useCheckAuth";
import { Loader2, AlertCircle } from "lucide-react";

export default function RootLayout() {
    const { isLoading, error } = useCheckAuth();

    return (
        <div className="flex flex-col sm:flex-row min-h-screen bg-zinc-100 dark:bg-zinc-950">
            <div className="flex flex-col flex-1">
                {isLoading && (
                    <div className="flex items-center justify-center min-h-screen">
                        <Loader2 className="w-12 h-12 text-zinc-600 dark:text-zinc-400 animate-spin" />
                    </div>
                )}
                {error && (
                    <div className="flex items-center justify-center min-h-screen">
                        <div className="flex items-center gap-3 text-2xl text-red-500">
                            <AlertCircle className="w-8 h-8" />
                            <span>{error}</span>
                        </div>
                    </div>
                )}
                {!isLoading && !error && <Outlet />}
            </div>
        </div>
    );
}
