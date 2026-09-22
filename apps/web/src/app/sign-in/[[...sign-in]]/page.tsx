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

  // Client trust verification
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerification, setShowVerification] = useState(false);

  // Forgot password flow
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<"email" | "code" | "success">("email");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

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

      console.log("Sign-in result:", JSON.stringify(result, null, 2));
      console.log("Current signIn status:", signIn.status);
      console.log("Current signIn object:", JSON.stringify(signIn, null, 2));

      // Login was successful.
      if (result.status === "complete") {
        // Activate the newly created session.
        await setActive({
          session: result.createdSessionId,
        });

        // Send the user to the home page.
        router.push("/");
      } else if (result.status === "needs_client_trust") {
        // Handle client trust verification
        const emailCodeFactor = result.supportedSecondFactors?.find(
          (factor) => factor.strategy === "email_code",
        );

        const phoneCodeFactor = result.supportedSecondFactors?.find(
          (factor) => factor.strategy === "phone_code",
        );

        if (emailCodeFactor) {
          // Use prepareSecondFactor for client trust
          await signIn.prepareSecondFactor({
            strategy: "email_code",
            emailAddressId: emailCodeFactor.emailAddressId,
          });
          setShowVerification(true);
        } else if (phoneCodeFactor) {
          // Use prepareSecondFactor for client trust
          await signIn.prepareSecondFactor({
            strategy: "phone_code",
          });
          setShowVerification(true);
        } else {
          setError("No supported verification method available.");
        }
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

  async function handleVerification(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;

    setError(null);
    setSubmitting(true);

    try {
      const emailCodeFactor = signIn.supportedSecondFactors?.find(
        (factor) => factor.strategy === "email_code",
      );

      const phoneCodeFactor = signIn.supportedSecondFactors?.find(
        (factor) => factor.strategy === "phone_code",
      );

      if (emailCodeFactor) {
        // Use attemptSecondFactor for client trust verification
        await signIn.attemptSecondFactor({
          strategy: "email_code",
          code: verificationCode,
        });
      } else if (phoneCodeFactor) {
        // Use attemptSecondFactor for client trust verification
        await signIn.attemptSecondFactor({
          strategy: "phone_code",
          code: verificationCode,
        });
      }

      if (signIn.status === "complete") {
        await setActive({
          session: signIn.createdSessionId,
        });
        router.push("/");
      } else {
        setError("Verification failed. Please try again.");
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? "Invalid verification code.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendCode() {
    if (!isLoaded) return;

    try {
      const emailCodeFactor = signIn.supportedSecondFactors?.find(
        (factor) => factor.strategy === "email_code",
      );

      const phoneCodeFactor = signIn.supportedSecondFactors?.find(
        (factor) => factor.strategy === "phone_code",
      );

      if (emailCodeFactor) {
        // Use prepareSecondFactor to resend code for client trust
        await signIn.prepareSecondFactor({
          strategy: "email_code",
          emailAddressId: emailCodeFactor.emailAddressId,
        });
      } else if (phoneCodeFactor) {
        // Use prepareSecondFactor to resend code for client trust
        await signIn.prepareSecondFactor({
          strategy: "phone_code",
        });
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? "Failed to resend code.");
    }
  }

  function handleStartOver() {
    if (!signIn) return;
    // For legacy API, we don't have a reset method
    // Instead, we just clear the local state
    setShowVerification(false);
    setVerificationCode("");
    setError(null);
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;

    setError(null);
    setSubmitting(true);

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: forgotEmail,
      });
      setForgotPasswordStep("code");
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? "Could not send reset email. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;

    setError(null);
    setSubmitting(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode,
        password: newPassword,
      });

      if (result.status === "complete") {
        await setActive({
          session: result.createdSessionId,
        });
        setForgotPasswordStep("success");
      } else {
        setError("Password reset incomplete. Please try again.");
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? "Invalid or expired code.");
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

          {/* Verification Form */}
          {showVerification ? (
            <>
              <h1 className="text-[30px] text-[#099]">
                Verify your account
              </h1>

              <p className="mt-1 text-[12.5px] text-[#545465]">
                Enter the verification code we sent to you.
              </p>

              <form onSubmit={handleVerification} className="mt-6 flex flex-col gap-[18px]">
                <div>
                  <label htmlFor="verificationCode" className="mb-1.5 block text-[11.5px] text-[#26263A]">
                    Verification code
                  </label>

                  <input
                    id="verificationCode"
                    type="text"
                    required
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="123456"
                    className={`${inputClasses} text-center tracking-[0.3em] placeholder:tracking-normal`}
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-500">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="h-[46px] w-full rounded-[9px] bg-[#3F4AA8] text-[13.5px] text-white transition-colors hover:bg-[#333D94] disabled:opacity-60"
                >
                  {submitting ? "Verifying..." : "Verify"}
                </button>

                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-xs text-[#3F4AA8] hover:underline"
                >
                  Need a new code?
                </button>

                <button
                  type="button"
                  onClick={handleStartOver}
                  className="text-xs text-[#545465] hover:underline"
                >
                  Start over
                </button>
              </form>
            </>
          ) : showForgotPassword ? (
            <>
              <h1 className="text-[30px] text-[#099]">
                Reset password
              </h1>

              {forgotPasswordStep === "email" ? (
                <>
                  <p className="mt-1 text-[12.5px] text-[#545465]">
                    Enter your email to receive a password reset code.
                  </p>

                  <form onSubmit={handleForgotPassword} className="mt-6 flex flex-col gap-[18px]">
                    <div>
                      <label htmlFor="forgotEmail" className="mb-1.5 block text-[11.5px] text-[#26263A]">
                        Email
                      </label>

                      <input
                        id="forgotEmail"
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="you@company.com"
                        className={inputClasses}
                      />
                    </div>

                    {error && (
                      <p className="text-xs text-red-500">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="h-[46px] w-full rounded-[9px] bg-[#3F4AA8] text-[13.5px] text-white transition-colors hover:bg-[#333D94] disabled:opacity-60"
                    >
                      {submitting ? "Sending..." : "Send reset code"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setForgotEmail("");
                        setForgotPasswordStep("email");
                        setShowNewPassword(false);
                        setError(null);
                      }}
                      className="text-xs text-[#545465] hover:underline"
                    >
                      Back to sign in
                    </button>
                  </form>
                </>
              ) : forgotPasswordStep === "code" ? (
                <>
                  <p className="mt-1 text-[12.5px] text-[#545465]">
                    Enter the code sent to {forgotEmail} and your new password.
                  </p>

                  <form onSubmit={handleResetPassword} className="mt-6 flex flex-col gap-[18px]">
                    <div>
                      <label htmlFor="resetCode" className="mb-1.5 block text-[11.5px] text-[#26263A]">
                        Reset code
                      </label>

                      <input
                        id="resetCode"
                        type="text"
                        required
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="123456"
                        className={`${inputClasses} text-center tracking-[0.3em] placeholder:tracking-normal`}
                      />
                    </div>

                    <div>
                      <label htmlFor="newPassword" className="mb-1.5 block text-[11.5px] text-[#26263A]">
                        New password
                      </label>

                      <div className="relative">
                        <input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          required
                          minLength={8}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className={`${inputClasses} pr-11`}
                        />

                        <button
                          type="button"
                          onClick={() => setShowNewPassword((v) => !v)}
                          aria-label="Toggle password visibility"
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#989DB4] hover:text-[#545465]"
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <p className="text-xs text-red-500">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="h-[46px] w-full rounded-[9px] bg-[#3F4AA8] text-[13.5px] text-white transition-colors hover:bg-[#333D94] disabled:opacity-60"
                    >
                      {submitting ? "Resetting..." : "Reset password"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setForgotPasswordStep("email");
                        setResetCode("");
                        setNewPassword("");
                        setShowNewPassword(false);
                        setError(null);
                      }}
                      className="text-xs text-[#545465] hover:underline"
                    >
                      Back to email
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <p className="mt-1 text-[12.5px] text-[#545465]">
                    Password reset successful! You can now sign in with your new password.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordStep("email");
                      setForgotEmail("");
                      setResetCode("");
                      setNewPassword("");
                      setShowNewPassword(false);
                      setError(null);
                    }}
                    className="mt-6 h-[46px] w-full rounded-[9px] bg-[#3F4AA8] text-[13.5px] text-white transition-colors hover:bg-[#333D94]"
                  >
                    Back to sign in
                  </button>
                </>
              )}
            </>
          ) : (
            <>
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

          {/* Forgot password link */}
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="mt-3 text-xs text-[#3F4AA8] hover:underline"
          >
            Forgot password?
          </button>

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
            </>
          )}
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