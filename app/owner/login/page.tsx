"use client";

import { useActionState } from "react";
import { login } from "../actions";

export default function OwnerLogin() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <div className="mx-auto max-w-sm px-5 py-16">
      <h1 className="font-display text-3xl font-extrabold text-ink">Owner sign-in</h1>
      <form action={action} className="mt-6 space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-ink">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 block w-full rounded-md border-2 border-ink bg-white px-3 py-2 text-base"
          />
        </div>
        {state?.error && <p role="alert" className="font-semibold text-error">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border-2 border-ink bg-ink px-5 py-2 font-bold text-white disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
