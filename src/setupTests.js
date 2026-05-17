// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Web Crypto polyfill — jsdom doesn't expose `crypto.subtle`, but the
// password-hashing tests in lib/__tests__/auth.test.ts need it. Node 18+
// ships webcrypto natively; we just have to attach it to globalThis so
// lib/auth.ts (which calls `crypto.subtle.digest` directly) can find it.
import { webcrypto } from 'node:crypto';
// jsdom defines `crypto` as a non-writable property; defineProperty patches
// over it so lib/auth.ts can call `crypto.subtle.digest`/`deriveBits`.
if (!globalThis.crypto || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: true,
    configurable: true,
  });
}
