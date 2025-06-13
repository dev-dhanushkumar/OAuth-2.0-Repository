import { NextFunction, Request, Response } from "express";
import { CreateUserInput, LoginUserInput } from "../schema/user.schema";
import {
  getGoogleOauthToken,
  getGoogleUser,
} from "../services/session.service";
import { prisma } from "../utils/prisma";
import jwt from "jsonwebtoken";
import { generateRandomString } from "../utils/random";
import { renderTemplate } from "../email/renderTemplate";
import { transporter } from "../email/transporter";
import bcrypt from "bcryptjs";

export function exclude<User, Key extends keyof User>(
  user: User,
  keys: Key[]
): Omit<User, Key> {
  for (let key of keys) {
    delete user[key];
  }
  return user;
}

export const registerHandler = async (
  req: Request<{}, {}, CreateUserInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(req.body.password, 12);

    const user = await prisma.user.create({
      data: {
        name: req.body.name,
        email: req.body.email,
        password: hashedPassword,
        createdAt: new Date(),
        password_reset_token: "",
        password_reset_at: new Date(0),
      },
    });

    res.status(201).json({
      status: "success",
      data: {
        user: exclude(user, ["password"]),
      },
    });
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(409).json({
        status: "fail",
        message: "Email already exist",
      });
    }
    next(err);
  }
};

export const loginHandler = async (
  req: Request<{}, {}, LoginUserInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: req.body.email },
    });

    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid email or password",
      });
    }

    if (user.provider === "Google") {
      return res.status(401).json({
        status: "fail",
        message: `Use ${user.provider} OAuth2 instead`,
      });
    }

    // Password verification
    const isValid = await bcrypt.compare(req.body.password, user.password);
    if (!isValid) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid email or password",
      });
    }

    const TOKEN_EXPIRES_IN = process.env.TOKEN_EXPIRES_IN as unknown as number;
    const TOKEN_SECRET = process.env.JWT_SECRET as unknown as string;
    const token = jwt.sign({ sub: user.id }, TOKEN_SECRET, {
      expiresIn: `${TOKEN_EXPIRES_IN}m`,
    });

    res.cookie("token", token, {
      expires: new Date(Date.now() + TOKEN_EXPIRES_IN * 60 * 1000),
    });

    res.status(200).json({
      status: "success",
    });
  } catch (err: any) {
    next(err);
  }
};

export const logoutHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.cookie("token", "", { maxAge: -1 });
    res.status(200).json({ status: "success" });
  } catch (err: any) {
    next(err);
  }
};

export const googleOauthHandler = async (req: Request, res: Response) => {
  const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN as unknown as string;

  try {
    const code = req.query.code as string;
    const pathUrl = (req.query.state as string) || "/";

    if (!code) {
      return res.status(401).json({
        status: "fail",
        message: "Authorization code not provided!",
      });
    }

    const { id_token, access_token } = await getGoogleOauthToken({ code });

    const { name, verified_email, email, picture } = await getGoogleUser({
      id_token,
      access_token,
    });

    if (!verified_email) {
      return res.status(403).json({
        status: "fail",
        message: "Google account not verified",
      });
    }

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        createdAt: new Date(),
        name,
        email,
        photo: picture,
        password: "",
        verified: true,
        provider: "Google",
        password_reset_token: "",
        password_reset_at: new Date(0),
      },
      update: { name, email, photo: picture, provider: "Google" },
    });

    if (!user) return res.redirect(`${FRONTEND_ORIGIN}/oauth/error`);

    const TOKEN_EXPIRES_IN = process.env.TOKEN_EXPIRES_IN as unknown as number;
    const TOKEN_SECRET = process.env.JWT_SECRET as unknown as string;
    const token = jwt.sign({ sub: user.id }, TOKEN_SECRET, {
      expiresIn: `${TOKEN_EXPIRES_IN}m`,
    });

    res.cookie("token", token, {
      expires: new Date(Date.now() + TOKEN_EXPIRES_IN * 60 * 1000),
    });

    res.redirect(`${FRONTEND_ORIGIN}${pathUrl}`);
  } catch (err: any) {
    console.log("Failed to authorize Google User", err);
    return res.redirect(`${FRONTEND_ORIGIN}/oauth/error`);
  }
};


export const forgotPasswordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN as unknown as string;
  const SMTP_FROM = process.env.SMTP_FROM as unknown as string;
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "You will receive a password reset email if user with that email exists",
      });
    }

    
  const passwordResetToken = generateRandomString(20);
  const passwordResetAt = new Date(Date.now() + 10 * 60 * 1000);

  const passwordResetUrl = `${FRONTEND_ORIGIN}/resetpassword/${passwordResetToken}`;

  const html = renderTemplate('reset_password', {
      first_name: user.name.split(' ')[0],
      subject: 'reset_password',
      url: passwordResetUrl
  });


  try {
      await transporter.sendMail({
        from: `Dev-Dhanushkumar <${SMTP_FROM}>`,
        to: `${user.name} <${user.email}>`,
        replyTo: SMTP_FROM,
        subject: `Your password reset token (valid for only 10 minutes)`,
        html
      });
    } catch (error) {
      return res.status(500).json({
        status: 'fail',
        message: 'Something bad happened while sending the password reset code'
      });
    }

    await prisma.user.update({
      where: { email: user.email },
      data: {
        password_reset_token: passwordResetToken,
        password_reset_at: passwordResetAt
      }
    });

    res.status(200).json({
      status: "success",
      message: "You will receive a password reset email if user with that email exists",
    });
  } catch (err: any) {
    next(err);
  }
};



export const resetPasswordHandler = async (
  req: Request<{ passwordResetToken: string }, {}, { password: string; passwordConfirm: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { password, passwordConfirm } = req.body;
    const { passwordResetToken } = req.params;

    if (password !== passwordConfirm) {
      return res.status(400).json({
        status: "fail",
        message: "Passwords do not match",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        password_reset_token: passwordResetToken,
        password_reset_at: {
          gte: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "Invalid or expired password reset token",
      });
    }

  const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        password_reset_token: "",
        password_reset_at: new Date(0),
      },
    });

    res.status(200).json({
      status: "success",
      message: "Password has been reset successfully",
    });
  } catch (err: any) {
    next(err);
  }
};
