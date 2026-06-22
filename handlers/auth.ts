"use server";

import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

// Look up confirmation state straight from Supabase's auth schema. Lets us
// tell "needs a new email" apart from "already confirmed, just sign in"
// even across browsers, where there's no local session to check.
async function isEmailConfirmed(email: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ email_confirmed_at: Date | null }[]>`
    SELECT email_confirmed_at FROM auth.users WHERE email = ${email} LIMIT 1
  `;
  return Boolean(rows[0]?.email_confirmed_at);
}

interface ICreateAccountPayload {
  displayName: string;
  email: string;
  password: string;
}
export const createAccount = async ({
  displayName,
  email,
  password,
}: ICreateAccountPayload) => {
  try {
    const sb = await createClient();
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: displayName,
        },
      },
    });
    if (error) {
      return { errorCode: error.code, errorMessage: error.message };
    }
    return data;
  } catch (e) {
    console.error("Error when trying to create new account:", e);
    return { errorCode: "unknown", errorMessage: (e as Error).message };
  }
};

interface ILoginPayload {
  email: string;
  password: string;
}
export const login = async (payload: ILoginPayload) => {
  try {
    const sb = await createClient();
    const { data, error } = await sb.auth.signInWithPassword(payload);
    if (error) {
      return { errorCode: error.code, errorMessage: error.message };
    }

    return data;
  } catch (e) {
    console.error("Error when trying to login to account:", e);
    return { errorCode: "unknown", errorMessage: (e as Error).message };
  }
};

export const resendConfirmation = async (email: string) => {
  try {
    if (await isEmailConfirmed(email)) {
      return { alreadyConfirmed: true as const };
    }
    const sb = await createClient();
    const { data, error } = await sb.auth.resend({
      type: "signup",
      email,
    });
    if (error) {
      return { errorCode: error.code, errorMessage: error.message };
    }
    return data;
  } catch (e) {
    console.error("Error when trying to resend confirmation email:", e);
    return { errorCode: "unknown", errorMessage: (e as Error).message };
  }
};

export const resetPassword = async (email: string) => {
  try {
    const sb = await createClient();
    const { data, error } = await sb.auth.resetPasswordForEmail(email);
    if (error) {
      return { errorCode: error.code, errorMessage: error.message };
    }
    return data;
  } catch (e) {
    console.error("Error when trying to reset password:", e);
    return { errorCode: "unknown", errorMessage: (e as Error).message };
  }
};
