"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

//import { useSignUp } from "@clerk/nextjs"; 
import { useSignUp } from "@clerk/nextjs/legacy";

import Link from "next/link";

import { Eye, EyeOff } from "lucide-react";

import { LowPolyBackground } from "@/components/marketing/low-poly-background";



export default function Page() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [step, setStep] = useState<"form" | "verify">("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    setError(null);
    setSubmitting(true);
    try {
      const [firstName, ...rest] = fullName.trim().split(" ");
      await signUp.create({
        firstName,
        lastName: rest.join(" ") || undefined,
        emailAddress: email,
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? "Could not create account. Check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
      } else {
        setError("Verification incomplete. Double-check the code and try again.");
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? "Invalid or expired code.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClasses =
    "h-[46px] w-full rounded-[9px] bg-[#E3E7F5] px-4 text-[13px] text-[#181826] outline-none placeholder:text-[#989DB4] focus:ring-2 focus:ring-[#3F4AA8]/25";





  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden py-12 font-serif">
  <LowPolyBackground />

  {/* Logo + Form */}
  <div className="form-container relative z-10">

    {/* MABAI Logo */}
    <div className="logo-div">
      <img
        src="/MABAI_Logo_transparent.png"
        alt="MABAI Logo"
      />
    </div>

    {/* Signup Form */}
    <div className="signup-form rounded-[14px] bg-[#FBFBFD] px-7 pt-7 pb-6 shadow-[0_0_0_1px_rgba(255,255,255,0.7),0px_0px_30px_20px_rgba(126,200,229,0.45)]">

      {step === "form" ? (
        <>
          <h1 className="text-[30px] text-[#099]">
            Create your account
          </h1>

          <p className="mt-1 text-[12.5px] text-[#545465]">
            Start understanding markets with MABAI.
          </p>

          <form
            onSubmit={handleCreateAccount}
            className="mt-6 flex flex-col gap-[18px]"
          >
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-[11.5px] text-[#26263A]"
              >
                Full name
              </label>

              <input
                id="name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Sarah Chen"
                className={inputClasses}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-[11.5px] text-[#26263A]"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className={inputClasses}
              />
            </div>

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
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={`${inputClasses} pr-11`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
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

            <div id="clerk-captcha" />

            {error && (
              <p className="text-xs text-red-500">
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className="h-[46px] w-full rounded-[9px] bg-[#3F4AA8] text-[13.5px] text-white transition-colors hover:bg-[#333D94] disabled:opacity-60">
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-center gap-2 text-[11.5px] text-[#33334A]">
            <span>Already have an account?</span>

            <Link href="/sign-in" className="hover:underline" style={{fontSize: '13px', color: '#099', fontWeight:'bolder'}} >
              Sign-in
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-[22px] font-medium text-[#181826]">
            Check your email
          </h1>

          <p className="mt-1 text-[12.5px] text-[#545465]">
            Enter the 6-digit code we sent to {email}.
          </p>

          <form
            onSubmit={handleVerify}
            className="mt-6 flex flex-col gap-[18px]"
          >
            <div>
              <label
                htmlFor="code"
                className="mb-1.5 block text-[11.5px] text-[#26263A]"
              >
                Verification code
              </label>

              <input
                id="code"
                type="text"
                required
                value={code}
                maxLength={6}
                onChange={(e) => setCode(e.target.value)}
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
              {submitting ? "Verifying..." : "Verify email"}
            </button>
          </form>
        </>
      )}
    </div>
  </div>

  {/* Terms */}
  <p className="relative z-10 mt-6 text-[11px] text-[#63637A]">
    By signing up you agree to our{" "}
    <Link href="#" className="underline hover:text-[#3A3A52]">
      Terms
    </Link>{" "}
    and{" "}
    <Link href="#" className="underline hover:text-[#3A3A52]">
      Privacy Policy
    </Link>
    .
  </p>
</main>
  );
}