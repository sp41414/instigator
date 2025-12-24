import NavBar from "../../components/NavBar";

export default function HomePage() {
    return (
        <div className="flex min-h-screen w-full justify-center">
            <NavBar />
            <div className="flex-1 max-w-2xl border-x border-zinc-200 dark:border-zinc-800 min-h-screen pb-16 md:pb-0"></div>
        </div>
    );
}
