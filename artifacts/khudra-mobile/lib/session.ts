import { setAuthTokenGetter } from '@workspace/api-client-react';

/**
 * The generated API client's global bearer-token getter is used ONLY for
 * the customer session. Admin-protected calls must NOT rely on this global
 * getter — they explicitly attach their own `Authorization` header per call
 * (see `useAdminAuthRequest` in app/admin) so a stored admin token can never
 * accidentally override/break a concurrently logged-in customer session (or
 * vice versa). Each session's token is scoped to exactly the endpoints that
 * need it.
 */

let customerToken: string | null = null;

setAuthTokenGetter(() => customerToken);

export function setCustomerSessionToken(token: string | null): void {
  customerToken = token;
}
