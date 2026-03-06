import { cookies } from 'next/headers';
import { db } from '@/lib/prisma';

export const SESSION_COOKIE = 'foodlose_session';

export async function getSessionUser() {
  const cookieStore = cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: Number(userId) },
    select: { id: true, email: true, name: true }
  });
  return user;
}

export function makeSessionCookie(userId) {
  return `${SESSION_COOKIE}=${userId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
}

export function makeClearCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
