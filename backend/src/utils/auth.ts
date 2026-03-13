import bcrypt from "bcryptjs";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { AuthUser } from "../types/auth";
import { settings } from "./env";

type TokenPayload = JwtPayload & {
  sub: number;
  email: string;
  name: string;
};

export const hashPassword = async (plain: string): Promise<string> => bcrypt.hash(plain, 10);

export const comparePassword = async (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

export const signAccessToken = (user: AuthUser): string => {
  const options: SignOptions = {
    expiresIn: settings.jwtExpiresIn as SignOptions["expiresIn"]
  };

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name
    },
    settings.jwtSecret,
    options
  );
};

export const verifyAccessToken = (token: string): AuthUser => {
  const decoded = jwt.verify(token, settings.jwtSecret);
  const payload = decoded as TokenPayload;

  return {
    id: Number(payload.sub),
    email: payload.email,
    name: payload.name
  };
};
