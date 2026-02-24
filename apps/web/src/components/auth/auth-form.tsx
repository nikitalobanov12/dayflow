"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "~/server/better-auth/client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function Divider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card text-muted-foreground px-2">
          or continue with email
        </span>
      </div>
    </div>
  );
}

export function AuthForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign In state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign Up state
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/today",
      });
    } catch {
      setError("Failed to sign in with Google");
      setIsGoogleLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setError(null);
    setIsDemoLoading(true);

    try {
      const response = await fetch("/api/demo", { method: "POST" });

      if (!response.ok) {
        setError("Failed to start demo session");
        return;
      }

      router.refresh();
    } catch {
      setError("Failed to start demo session");
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await authClient.signIn.email({
        email: signInEmail,
        password: signInPassword,
      });

      if (result.error) {
        setError(result.error.message ?? "Failed to sign in");
        return;
      }

      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (signUpPassword !== signUpConfirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (signUpPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const result = await authClient.signUp.email({
        email: signUpEmail,
        password: signUpPassword,
        name: signUpName,
      });

      if (result.error) {
        setError(result.error.message ?? "Failed to create account");
        return;
      }

      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] px-4">
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
          <span className="text-[hsl(185,60%,49%)]">Aether</span>
        </h1>
        <p className="mt-4 text-xl text-gray-400">
          Organize your goals. Execute your day.
        </p>
      </div>

      <Card className="w-full max-w-md p-6">
        <div className="mb-6 space-y-3">
          <Button
            type="button"
            className="w-full bg-[hsl(185,60%,49%)] text-white hover:bg-[hsl(185,60%,42%)]"
            onClick={handleDemoSignIn}
            disabled={isLoading || isGoogleLoading || isDemoLoading}
            size="lg"
          >
            {isDemoLoading ? (
              "Setting up demo..."
            ) : (
              <>
                <svg
                  className="mr-2 h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
                Try Demo No Sign Up Required
              </>
            )}
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            Explore with pre-loaded sample data
          </p>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card text-muted-foreground px-2">
              or sign in to your account
            </span>
          </div>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-0">
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Welcome back</h2>
                <p className="text-muted-foreground text-sm">
                  Sign in to your account to continue
                </p>
              </div>

              {error && (
                <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500">
                  {error}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isLoading || isGoogleLoading}
              >
                <GoogleIcon className="mr-2 h-4 w-4" />
                {isGoogleLoading ? "Signing in..." : "Continue with Google"}
              </Button>

              <Divider />

              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="signup" className="mt-0">
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Create an account</h2>
                <p className="text-muted-foreground text-sm">
                  Get started with Aether
                </p>
              </div>

              {error && (
                <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500">
                  {error}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isLoading || isGoogleLoading}
              >
                <GoogleIcon className="mr-2 h-4 w-4" />
                {isGoogleLoading ? "Signing up..." : "Continue with Google"}
              </Button>

              <Divider />

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Your name"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm Password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="Confirm your password"
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create account"}
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
