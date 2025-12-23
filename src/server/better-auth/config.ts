import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import nodemailer from "nodemailer";

// import { env } from "~/env";
import { db } from "~/server/db";

// Get base URL for email links
const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
};

// Email transporter for sending emails
const getEmailTransporter = () => {
  const smtpHost = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (!smtpUser || !smtpPassword) {
    throw new Error(
      "SMTP_USER and SMTP_PASSWORD environment variables are required for sending emails",
    );
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    tls: {
      rejectUnauthorized: false,
    },
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });
};

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "mysql", // or "sqlite" or "mysql"
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true if you want email verification
    sendResetPassword: async ({ user, url, token }) => {
      const transporter = getEmailTransporter();
      const smtpFrom =
        process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@example.com";

      const resetUrl = url || `${getBaseUrl()}/reset-password?token=${token}`;

      try {
        await transporter.sendMail({
          from: smtpFrom,
          to: user.email,
          subject: "Reset Your Password",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                h1 { color: #2c3e50; }
                .button { display: inline-block; padding: 12px 24px; background-color: #3498db; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
                .button:hover { background-color: #2980b9; }
                .footer { margin-top: 30px; color: #7f8c8d; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Reset Your Password</h1>
                <p>Hi ${user.name || "there"},</p>
                <p>You requested to reset your password. Click the button below to reset it:</p>
                <a href="${resetUrl}" class="button">Reset Password</a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">${resetUrl}</p>
                <p>This link will expire in 1 hour.</p>
                <p class="footer">If you didn't request this password reset, please ignore this email.</p>
              </div>
            </body>
            </html>
          `,
          text: `Hi ${user.name || "there"},\n\nYou requested to reset your password. Click the link below to reset it:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this password reset, please ignore this email.`,
        });
      } catch (error) {
        console.error("Failed to send password reset email:", error);
        throw error;
      }
    },
    resetPasswordTokenExpiresIn: 3600, // 1 hour
  },
  email: {
    server: {
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT ?? "587", 10),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    },
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@example.com",
    baseURL: getBaseUrl(),
  },
  socialProviders: {
    // github: {
    //   clientId: env.BETTER_AUTH_GITHUB_CLIENT_ID,
    //   clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
    //   redirectURI: "http://localhost:3000/api/auth/callback/github",
    // },
  },
});

export type Session = typeof auth.$Infer.Session;
