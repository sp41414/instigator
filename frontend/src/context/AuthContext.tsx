import { createContext, useReducer, type ReactNode } from "react";

interface User {
    id: number;
    username: string;
    profile_picture_url: string | null;
    aboutMe?: string | null;
    email?: string | null;
    createdAt: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    needsUsername: boolean;
}

type AuthAction =
    | { type: "LOGIN_SUCCESS"; payload: User }
    | { type: "LOGOUT" }
    | { type: "LOADING"; payload: boolean }
    | { type: "NEEDS_USERNAME"; payload: boolean }
    | { type: "UPDATE_USER"; payload: Partial<User> }
    | { type: "SET_USER"; payload: User };

const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    needsUsername: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case "LOGIN_SUCCESS":
            return {
                ...state,
                user: action.payload,
                isAuthenticated: true,
                isLoading: false,
                needsUsername: false,
            };
        case "SET_USER":
            return {
                ...state,
                user: action.payload,
                isAuthenticated: true,
                isLoading: false,
            };
        case "LOGOUT":
            return {
                ...initialState,
                isLoading: false,
            };
        case "LOADING":
            return {
                ...state,
                isLoading: action.payload,
            };
        case "NEEDS_USERNAME":
            return {
                ...state,
                needsUsername: true,
                isAuthenticated: true,
                isLoading: false,
            };
        case "UPDATE_USER":
            return {
                ...state,
                user: state.user ? { ...state.user, ...action.payload } : null,
            };
        default:
            return state;
    }
}

interface AuthContextType {
    state: AuthState;
    dispatch: React.Dispatch<AuthAction>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
    undefined,
);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(authReducer, initialState);

    return (
        <AuthContext.Provider value={{ state, dispatch }}>
            {children}
        </AuthContext.Provider>
    );
}
