export const parseErrorMessage = (error: any): string => {
    // i messed up real bad on the backend, next time for sure...
    if (Array.isArray(error)) {
        if (typeof error[0] === "string") {
            return error[0];
        }
        return error.map((err) => err?.msg).join(", ");
    }
    return "An error occurred";
};
