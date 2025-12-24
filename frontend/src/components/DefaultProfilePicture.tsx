export default function DefaultProfilePicture({
    username,
}: {
    username?: string;
}) {
    return (
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-600 text-white font-bold text-sm uppercase">
            {username?.[0] || "U"}
        </div>
    );
}
