import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import Breadcrumbs from "../../components/Breadcrumbs";
import { confirmUser, resendSignUpCode } from "../../auth";
import { confirmSchema, type ConfirmFormValues } from "../../schemas/auth";

const ConfirmSignUpPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);
  const [resendInfo, setResendInfo] = useState("");

  const email = searchParams.get("email")?.trim() ?? "";
  const username = searchParams.get("username")?.trim() ?? "";
  const isUsernameMissing = username.length === 0;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmFormValues>({ defaultValues: { code: "" } });

  const onSubmit = async (formValues: ConfirmFormValues) => {
    const parsed = confirmSchema.safeParse(formValues);
    if (!parsed.success) {
      parsed.error.issues.forEach(({ path, message }) => {
        if (path[0] === "code") setError("code", { type: "manual", message });
      });
      return;
    }

    if (isUsernameMissing) {
      setError("root", { message: "Missing username — please restart sign-up." });
      return;
    }

    try {
      const result = await confirmUser(username, parsed.data.code.trim());
      if (result.isSignUpComplete) {
        navigate("/signin", { replace: true });
        return;
      }
      const step = result.nextStep?.signUpStep;
      setError("root", {
        message: step ? `Next step: ${step}` : "Could not complete verification.",
      });
    } catch (error) {
      setError("root", {
        message: error instanceof Error ? error.message : "Failed to confirm account",
      });
    }
  };

  const handleResend = async () => {
    setResendInfo("");

    if (isUsernameMissing) {
      setError("root", { message: "Missing username — please restart sign-up." });
      return;
    }

    setIsResending(true);
    try {
      const result = await resendSignUpCode(username);
      setResendInfo(
        result.destination
          ? `A new code was sent to ${result.destination}.`
          : "A new code was sent."
      );
    } catch (error) {
      setError("root", {
        message: error instanceof Error ? error.message : "Failed to resend code",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <section className="grid place-items-center mt-3.5 reveal delay-1">
      <article className="w-full max-w-120 rounded-3xl border border-[rgba(10,52,60,0.13)] bg-[rgba(255,255,255,0.82)] p-[clamp(20px,4vw,34px)] shadow-[0_14px_34px_rgba(12,35,40,0.1)]">
        <p className="eyebrow">Account Verification</p>
        <h1 className="mt-2.5 font-heading text-[#0d2230] text-[clamp(1.4rem,3.2vw,2rem)] leading-[1.1] tracking-[-0.03em]">
          Confirm your email
        </h1>
        <p className="mt-3.5 text-[#506071] text-[0.97rem] leading-[1.55]">
          Enter the code sent to your email to activate your account.
        </p>

        <Breadcrumbs
          className="mt-3.5"
          items={[
            { label: "Sign up", to: "/signup" },
            { label: "Confirm" },
          ]}
        />

        <form className="mt-4.5 grid gap-3.5" onSubmit={handleSubmit(onSubmit)}>
          <label className="grid gap-2">
            <span className="text-[0.9rem] font-semibold text-[#203649]">Email</span>
            <Input type="email" value={email} readOnly placeholder="name@facility.go.ke" />
          </label>

          <label className="grid gap-2">
            <span className="text-[0.9rem] font-semibold text-[#203649]">Confirmation Code</span>
            <Input
              {...register("code")}
              autoComplete="one-time-code"
              placeholder="123456"
            />
            {errors.code && (
              <small className="text-[0.85rem] font-semibold text-[#b43b33]">
                {errors.code.message}
              </small>
            )}
          </label>

          <Button size="lg" type="submit" className="w-full mt-0.5" disabled={isSubmitting}>
            {isSubmitting ? "Confirming…" : "Confirm account"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={isSubmitting || isResending || isUsernameMissing}
            onClick={() => { void handleResend(); }}
          >
            {isResending ? "Resending…" : "Resend code"}
          </Button>
        </form>

        {resendInfo && (
          <p className="mt-4 rounded-xl border border-[rgba(17,122,101,0.24)] bg-[rgba(17,122,101,0.09)] px-3 py-2.5 text-[0.9rem] font-semibold text-[#0f5f52]">
            {resendInfo}
          </p>
        )}

        {errors.root && (
          <p className="mt-4 rounded-xl border border-[rgba(180,59,51,0.18)] bg-[rgba(180,59,51,0.06)] px-3 py-2.5 text-[0.9rem] font-semibold text-[#b43b33]">
            {errors.root.message}
          </p>
        )}

        <p className="mt-3.5 text-[#506071] text-[0.97rem] leading-[1.55]">
          Back to{" "}
          <Link className="text-[#0f5a78] font-semibold hover:underline" to="/signin">
            sign in
          </Link>
          .
        </p>
      </article>
    </section>
  );
};

export default ConfirmSignUpPage;
