import passport from "passport";
import {
    Strategy as JwtStrategy,
    StrategyOptionsWithoutRequest,
} from "passport-jwt";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import prisma from "../db/prisma";
import { JwtPayload, Request } from "../types";

const extractCookie = (req: Request) => {
    let token = null;
    if (req && req.signedCookies) {
        token = req.signedCookies["token"];
    }
    return token;
};

const jwtOpts: StrategyOptionsWithoutRequest = {
    jwtFromRequest: extractCookie,
    secretOrKey: process.env.JWT_SECRET!,
};

passport.use(
    new JwtStrategy(jwtOpts, async (payload: JwtPayload, done) => {
        try {
            const user = await prisma.user.findUnique({
                where: {
                    id: payload.id,
                },
            });

            if (user) {
                return done(null, user);
            }

            return done(null, false);
        } catch (err) {
            return done(err);
        }
    }),
);

const googleOpts = {
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: "/auth/google/callback",
};

passport.use(
    new GoogleStrategy(
        googleOpts,
        async (accessToken, refreshToken, profile, done) => {
            try {
                let user = await prisma.user.findUnique({
                    where: {
                        googleId: profile.id,
                    },
                });

                if (!user) {
                    const googleUsername = profile?.displayName;
                    const existingUsername = await prisma.user.findUnique({
                        where: {
                            username: googleUsername,
                        },
                    });

                    user = await prisma.user.create({
                        data: {
                            googleId: profile.id,
                            email: profile.emails?.[0]?.value,
                            username: existingUsername
                                ? `temp_${profile.id}`
                                : profile.displayName || `user_${profile.id}`,
                            profile_picture_url: profile.photos?.[0]?.value,
                        },
                    });
                }

                return done(null, user);
            } catch (err) {
                done(err);
            }
        },
    ),
);

export default passport;
