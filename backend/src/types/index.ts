import type { JwtPayload as BaseJwtPayload } from "jsonwebtoken"
import type { Request as ExpressRequest } from "express";

export interface JwtPayload extends BaseJwtPayload {
    id: number;
}

export interface Request extends ExpressRequest {
    signedCookies: {
        [key: string]: any
    }
}

export interface AuthenticatedRequest extends ExpressRequest {
    user?: {
        id: number
        username: string
        email?: string | null
        googleId?: string | null
        profile_picture_url?: string | null
    }
}
