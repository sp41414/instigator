export default function DefaultProfilePicture({
    username,
    className,
}: {
    username?: string;
    className?: string;
}) {
    return (
        <div
            className={
                className
                    ? className
                    : "w-8 h-8 rounded-full flex items-center justify-center bg-blue-600 text-white font-bold text-sm uppercase"
            }
        >
            {username?.[0] || "U"}
        </div>
    );
}
