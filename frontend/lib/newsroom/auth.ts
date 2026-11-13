import { cms, type Account } from '@/lib/cms';

export type CodeDelivery = { expiresAt: string; resendAt: string };
export const newsroomAuth = {
  signIn: async (email: string, password: string) => {
    await cms('auth/login', 'POST', new URLSearchParams({ email, password }));
    return cms<Account>('auth/me');
  },
  sendCode: () => cms<CodeDelivery>('auth/newsroom/code', 'POST', {}),
  verify: async (code: string) => {
    await cms('auth/newsroom/verify', 'POST', { code });
    return cms<Account>('auth/me');
  },
};
