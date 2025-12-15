import type { JwtPayload as BaseJwtPayload } from "jsonwebtoken"

export interface JwtPayload extends BaseJwtPayload {
    id: number;
}
