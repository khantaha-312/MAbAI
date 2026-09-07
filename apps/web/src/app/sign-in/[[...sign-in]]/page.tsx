// import { SignUp } from "@clerk/nextjs";

// export default function SignUpPage() {
//   return (
//     <div className="flex min-h-screen items-center justify-center">
//       <SignUp />
//     </div>
//   );
// }




"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs/legacy";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

import { LowPolyBackground } from "@/components/marketing/low-poly-background";

export default function Page() {
  // Clerk sign-in functionality.
  const { isLoaded, signIn, setActive } = useSignIn();

  // Used to navigate the user after successful login.
  const router = useRouter();

  // Form values.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Controls password visibility.
  const [showPassword, setShowPassword] = useState(false);

  // Displays authentication errors.
  const [error, setError] = useState<string | null>(null);

  // Prevents multiple submissions while signing in.
  const [submitting, setSubmitting] = useState(false);

  // --------------------------------------------------
  // SIGN IN
  // --------------------------------------------------

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();

    // Wait until Clerk is ready.
    if (!isLoaded) return;

    setError(null);
    setSubmitting(true);

    try {
      // Send email and password to Clerk.
      const result = await signIn.create({
        identifier: email,
        password,
      });

      // Login was successful.
      if (result.status === "complete") {
        // Activate the newly created session.
        await setActive({
          session: result.createdSessionId,
        });

        // Send the user to the home page.
        router.push("/");
      } else {
        // This handles cases where Clerk requires
        // another step before completing sign-in.
        setError(
          "Sign-in could not be completed. Please check your details and try again."
        );
      }
    } catch (err: any) {
      // Display Clerk's error message when available.
      setError(
        err?.errors?.[0]?.message ??
          "Could not sign in. Please check your email and password."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Same input styling used on the signup page.
  const inputClasses =
    "h-[46px] w-full rounded-[9px] bg-[#E3E7F5] px-4 text-[13px] text-[#181826] outline-none placeholder:text-[#989DB4] focus:ring-2 focus:ring-[#3F4AA8]/25";

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden py-12 font-serif">
      {/* Same low-poly background as the signup page */}
      <LowPolyBackground />

      {/* Logo + Sign-in Form */}
      <div className="form-container relative z-10">

        {/* MABAI Logo */}
        <div className="logo-div">
          <img
            src="/MABAI_Logo_transparent.png"
            alt="MABAI Logo"
          />
        </div>

        {/* Sign-in Form Card */}
        <div className="signup-form rounded-[14px] bg-[#FBFBFD] px-7 pt-7 pb-6 shadow-[0_0_0_1px_rgba(255,255,255,0.7),0px_0px_30px_20px_rgba(126,200,229,0.45)]">

          {/* Heading */}
          <h1 className="text-[30px] text-[#099]">
            Welcome back
          </h1>

          {/* Description */}
          <p className="mt-1 text-[12.5px] text-[#545465]">
            Sign in to continue understanding markets with MABAI.
          </p>


          {/* Sign-in form */}
          <form onSubmit={handleSignIn} className="mt-6 flex flex-col gap-[18px]">

            {/* Email */}
            <div>
              <label htmlFor="email"  className="mb-1.5 block text-[11.5px] text-[#26263A]">
                Email
              </label>

              <input id="email" type="email" required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className={inputClasses}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[11.5px] text-[#26263A]"
              >
                Password
              </label>

              <div className="relative">

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`${inputClasses} pr-11`}
                />

                {/* Show / Hide Password */}
                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label="Toggle password visibility"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#989DB4] hover:text-[#545465]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>

              </div>
            </div>

            {/* Clerk CAPTCHA container */}
            <div id="clerk-captcha" />

            {/* Authentication error */}
            {error && (
              <p className="text-xs text-red-500">
                {error}
              </p>
            )}

            {/* Sign-in button */}
            <button
              type="submit"
              disabled={submitting}
              className="h-[46px] w-full rounded-[9px] bg-[#3F4AA8] text-[13.5px] text-white transition-colors hover:bg-[#333D94] disabled:opacity-60"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Link to signup */}
          <div className="mt-4 flex items-center justify-center gap-2 text-[11.5px] text-[#33334A]">
            <span>Don't have an account?</span>

            <Link
              href="/sign-up"
              className="hover:underline"
              style={{
                fontSize: "13px",
                color: "#099",
                fontWeight: "bolder",
              }}
            >
              Create account
            </Link>
          </div>
        </div>
      </div>

      {/* Terms */}
      <p className="relative z-10 mt-6 text-[11px] text-[#63637A]">
        By signing in you agree to our{" "}
        <Link
          href="#"
          className="underline hover:text-[#3A3A52]"
        >
          Terms
        </Link>{" "}
        and{" "}
        <Link
          href="#"
          className="underline hover:text-[#3A3A52]"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}