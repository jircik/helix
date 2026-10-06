'use client';
import { createAuthClient } from 'better-auth/react';

/** Sem baseURL: o cliente usa a origem da página, o que vale em dev e produção. */
export const authClient = createAuthClient();
