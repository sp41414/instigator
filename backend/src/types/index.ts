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
