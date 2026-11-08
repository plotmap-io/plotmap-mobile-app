import { type ReactNode } from 'react';

import { SignInPrompt } from '@/components/sign-in-prompt';
import { StackScreen } from '@/components/stack-screen';
import { ErrorState, Loading } from '@/components/states';
import { useAuth } from '@/lib/auth';
import { useCreateFlow } from '@/lib/create-flow';

/**
 * What every step of the flow needs before it can show anything: an account,
 * and a draft on the server to hang photos off. One gate rather than four
 * copies of the same three branches.
 */
export function CreateGate({ children }: { children: ReactNode }) {
  const { signedIn, loading } = useAuth();
  const { ready, error, retry } = useCreateFlow();

  if (!signedIn && !loading) {
    return (
      <StackScreen title="Create listing">
        <SignInPrompt message="Sign in to list your land or property." />
      </StackScreen>
    );
  }

  if (error) {
    return (
      <StackScreen title="Create listing">
        <ErrorState title="Couldn’t start a draft" message={error} onRetry={retry} />
      </StackScreen>
    );
  }

  if (!ready) {
    return (
      <StackScreen title="Create listing">
        <Loading label="Starting a draft…" />
      </StackScreen>
    );
  }

  return <>{children}</>;
}
