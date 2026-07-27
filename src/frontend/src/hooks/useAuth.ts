import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import type { Identity } from "@icp-sdk/core/agent";
import type { Principal } from "@icp-sdk/core/principal";
import { useCallback } from "react";

/**
 * Stable wrapper around `useInternetIdentity()` so pages and components don't
 * depend on the underlying provider's exact return shape. Exposes the
 * principal as a string for easy comparison and rendering.
 */
export interface AuthState {
  /** True once the II provider has finished its initial handshake. */
  isInitializing: boolean;
  /** True when a signed-in identity is present. */
  isAuthenticated: boolean;
  /** Raw Identity when signed in, otherwise undefined. */
  identity: Identity | undefined;
  /** Principal when signed in, otherwise null. */
  principal: Principal | null;
  /** Principal as a string (for display / keys), or null. */
  principalText: string | null;
  /** Short principal label like `abcd…wxyz` for compact UI. */
  principalShort: string | null;
  /** Trigger the II login flow. */
  login: () => void;
  /** Clear the current identity / sign out. */
  logout: () => void;
  /** Current login status string from the provider. */
  loginStatus: string;
}

function shorten(text: string): string {
  if (text.length <= 12) return text;
  return `${text.slice(0, 4)}…${text.slice(-4)}`;
}

export function useAuth(): AuthState {
  const {
    identity,
    login,
    clear,
    isAuthenticated,
    isInitializing,
    loginStatus,
  } = useInternetIdentity();

  const principal = identity ? identity.getPrincipal() : null;
  const principalText = principal ? principal.toText() : null;

  const logout = useCallback(() => {
    clear();
  }, [clear]);

  return {
    isInitializing,
    isAuthenticated,
    identity,
    principal,
    principalText,
    principalShort: principalText ? shorten(principalText) : null,
    login,
    logout,
    loginStatus: String(loginStatus ?? ""),
  };
}
