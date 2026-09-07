"use client";

import { Show, RedirectToSignIn } from "@clerk/nextjs";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>

      <Show when="signed-in">{children}</Show>
    </>
  );
}