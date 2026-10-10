import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { formatCedis } from "@gtyf/shared";
import {
  DONATION_LIMITS,
  PRESET_AMOUNTS,
  SLIDER_RESOLUTION,
  amountToSlider,
  coverFee,
  sliderToAmount,
  translateImpact,
  type DonationInitInput,
} from "@gtyf/shared/donations";
import type { FieldErrors } from "@gtyf/shared/forms";
import { ApiError } from "../../lib/api";
import { startPayment } from "../../lib/pay";
import { useDonationConfig, useSite } from "../../lib/site";
import { Button } from "../ui/Button";
import { AnimatedAmount, ImpactStack, Segmented, Toggle } from "./parts";

export type Frequency = "monthly" | "one_time";

export interface DonationCardProps {
  /** Programme slug, or null for "where it's needed most". */
  initialCause?: string | null;
  initialFrequency?: Frequency;
  initialAmount?: number;
  eventSlug?: string;
  campaignSlug?: string;
  /** Hide the cause picker (e.g. on a programme's own page). */
  lockCause?: boolean;
  onCauseChange?: (cause: string | null) => void;
  heading?: ReactNode;
}

const STORE_KEY = "gtyf:donation-draft";
const COUNTRIES = [
  "Ghana",
  "Nigeria",
  "United Kingdom",
  "United States",
  "Canada",
  "Germany",
  "Netherlands",
  "Ireland",
  "Italy",
  "France",
  "Côte d’Ivoire",
  "Togo",
  "South Africa",
  "Kenya",
  "Australia",
  "Other",
];

interface Details {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  anonymous: boolean;
  showOnWall: boolean;
  coverFee: boolean;
  dedicate: boolean;
  dedicationType: "honour" | "memory";
  dedicationName: string;
  dedicationEmail: string;
}

const EMPTY: Details = {
  fullName: "",
  email: "",
  phone: "",
  country: "Ghana",
  city: "",
  anonymous: false,
  showOnWall: false,
  coverFee: true,
  dedicate: false,
  dedicationType: "honour",
  dedicationName: "",
  dedicationEmail: "",
};

function loadDraft(): Partial<Details> {
  try {
    return JSON.parse(sessionStorage.getItem(STORE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/**
 * The donation card: one screen, no steps. Pick an amount, type your name, email
 * (and phone for Mobile Money), press Give. Extras (anonymous, dedication…) sit
 * under "More options". On phones the pay button sticks to the bottom of the card.
 */
export function DonationCard({
  initialCause = null,
  initialFrequency = "monthly",
  initialAmount = 20_000,
  eventSlug,
  campaignSlug,
  lockCause = false,
  onCauseChange,
  heading,
}: DonationCardProps) {
  const config = useDonationConfig();
  // Wording is editable in Admin → Website → Donation & thank-you text.
  const t = useSite().donate;
  const navigate = useNavigate();
  const [more, setMore] = useState(false);
  const [cause, setCause] = useState<string | null>(initialCause);
  const [frequency, setFrequency] = useState<Frequency>(initialFrequency);
  const [amount, setAmount] = useState(initialAmount);
  const [customText, setCustomText] = useState("");
  const [details, setDetails] = useState<Details>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<{
    kind: "idle" | "paying" | "cancelled" | "error";
    message?: string;
  }>({ kind: "idle" });
  const cardRef = useRef<HTMLDivElement>(null);
  const pillRow = useRef<HTMLDivElement>(null);

  // Keep the selected cause visible in the sideways-scrolling row on phones.
  useEffect(() => {
    const row = pillRow.current;
    const pill = row?.querySelector<HTMLElement>("[data-active]");
    if (row && pill && row.scrollWidth > row.clientWidth) {
      row.scrollTo({
        left: Math.max(0, pill.offsetLeft - row.offsetLeft - 8),
        behavior: "smooth",
      });
    }
  }, [cause]);

  // Restore details typed earlier in this visit (e.g. after cancelling the payment window).
  useEffect(() => setDetails((d) => ({ ...d, ...loadDraft() })), []);
  useEffect(() => {
    try {
      const { dedicationEmail: _e, ...rest } = details;
      sessionStorage.setItem(STORE_KEY, JSON.stringify(rest));
    } catch {
      /* ignore */
    }
  }, [details]);

  useEffect(() => setCause(initialCause), [initialCause]);
  useEffect(() => onCauseChange?.(cause), [cause, onCauseChange]);

  const causeInfo = config.causes.find((c) => c.slug === cause);
  const impact = useMemo(
    () => translateImpact(amount, config.impactItems, cause, 12),
    [amount, config.impactItems, cause],
  );
  const itemCount = impact.lines.reduce((n, l) => n + l.count, 0);
  const fee = details.coverFee ? coverFee(amount, config.feePercent) : 0;
  const total = amount + fee;
  const monthly = frequency === "monthly";
  const every = monthly ? " monthly" : "";

  const setField = <K extends keyof Details>(k: K, v: Details[K]) => {
    setDetails((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const chooseAmount = (pesewas: number) => {
    setAmount(Math.min(config.max, Math.max(DONATION_LIMITS.min, pesewas)));
    setErrors((e) => ({ ...e, amount: undefined }));
  };

  const buildInput = (): DonationInitInput => ({
    cause,
    eventSlug,
    campaignSlug,
    frequency,
    amount,
    coverFee: details.coverFee,
    fullName: details.fullName,
    email: details.email,
    phone: details.phone || undefined,
    country: details.country,
    city: details.city || undefined,
    anonymous: details.anonymous,
    showOnWall: details.showOnWall && !details.anonymous,
    dedication: details.dedicate
      ? {
          type: details.dedicationType,
          name: details.dedicationName,
          notifyEmail: details.dedicationEmail || undefined,
        }
      : null,
  });

  // Validation rules (zod) load as soon as the card is on screen, off the critical path.
  const loadSchema = () =>
    import("@gtyf/shared/donation-schema").then((m) => m.donationInitSchema);
  useEffect(() => {
    const id = window.setTimeout(() => void loadSchema(), 1500);
    return () => window.clearTimeout(id);
  }, []);

  const validateDetails = async () => {
    const parsed = (await loadSchema()).safeParse(buildInput());
    if (parsed.success) return true;
    const flat: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const [head, sub] = issue.path;
      const key =
        head === "dedication"
          ? `dedication${String(sub ?? "name").replace(/^./, (c) => c.toUpperCase())}`
          : String(head);
      (flat[key] ??= []).push(issue.message);
    }
    setErrors(flat);
    const first = Object.keys(flat)[0];
    if (first) {
      if (/^(country|city|dedication)/.test(first)) setMore(true);
      requestAnimationFrame(() => {
        const el = cardRef.current?.querySelector<HTMLElement>(
          `[data-field="${first}"]`,
        );
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus({ preventScroll: true });
      });
    }
    return false;
  };

  const onPay = async () => {
    if (amount < DONATION_LIMITS.min) {
      setErrors({ amount: ["The minimum gift is GH₵ 5."] });
      return;
    }
    if (!(await validateDetails())) return;
    setStatus({ kind: "paying" });
    try {
      const outcome = await startPayment(buildInput());
      if (outcome.kind === "success") {
        navigate(
          `/donate/thank-you?ref=${encodeURIComponent(outcome.reference)}&t=${outcome.receiptToken}`,
        );
      } else if (outcome.kind === "cancelled") {
        setStatus({
          kind: "cancelled",
          message:
            "No payment was taken. Your details are saved, so you can try again whenever you’re ready.",
        });
      } else {
        setStatus({ kind: "error", message: outcome.message });
      }
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setErrors(err.fieldErrors);
      }
      setStatus({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      });
    }
  };

  const presetActive = (p: number) => amount === p && !customText;

  return (
    <div
      ref={cardRef}
      data-donation-card
      className="relative min-w-0 scroll-mt-24 rounded-[28px] bg-white text-ink shadow-[0_2px_4px_rgb(11_20_34/0.04),0_24px_60px_-20px_rgb(11_20_34/0.28)] ring-1 ring-ink/[0.06]"
    >
      <div className="p-5 sm:p-8">
        {heading}

        {/* Header: who you're giving to, and progress */}
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-ink/10">
            <img
              src="/brand/logo-mark.png"
              alt=""
              width={44}
              height={44}
              className="size-full object-contain"
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[1.0625rem] leading-tight font-bold">
              Guide The Youth Foundation
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate">
              <svg
                viewBox="0 0 16 16"
                className="size-3.5 text-[#1F9D55]"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 4 15h8a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 12 6h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5H6V4.5a2 2 0 1 1 4 0V6Z" />
              </svg>
              {t.secureNote}
            </p>
          </div>
        </div>

        <div className="space-y-7">
          <Segmented<Frequency>
            label="How often"
            size="lg"
            value={frequency}
            onChange={setFrequency}
            options={[
              { value: "monthly", label: t.monthlyLabel },
              { value: "one_time", label: t.oneTimeLabel },
            ]}
          />

          {/* Amount */}
          <div>
            <div className="text-center">
              <AnimatedAmount
                pesewas={amount}
                className="text-[clamp(3.25rem,2.4rem+4vw,4.75rem)]"
              />
              <p className="mt-1 text-[0.9375rem] font-medium text-slate">
                {monthly ? t.monthlyNote : t.oneTimeNote}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-4 gap-2">
              {PRESET_AMOUNTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={presetActive(p)}
                  onClick={() => {
                    setCustomText("");
                    chooseAmount(p);
                  }}
                  className={`h-13 rounded-2xl text-base font-bold transition-all duration-300 ${
                    presetActive(p)
                      ? "bg-ink text-white shadow-soft"
                      : "bg-mist text-ink hover:bg-ink/10"
                  }`}
                >
                  ₵{p / 100}
                </button>
              ))}
            </div>

            <input
              type="range"
              className="amount-slider mt-4"
              min={0}
              max={SLIDER_RESOLUTION}
              step={1}
              value={amountToSlider(amount)}
              aria-label="Donation amount"
              aria-valuetext={formatCedis(amount)}
              onChange={(e) => {
                setCustomText("");
                chooseAmount(sliderToAmount(Number(e.target.value)));
              }}
              style={{
                ["--fill" as string]: `${(amountToSlider(amount) / SLIDER_RESOLUTION) * 100}%`,
              }}
            />

            <label className="mt-2 flex h-13 items-center gap-2 rounded-2xl bg-mist px-4 ring-ink transition-shadow focus-within:ring-2">
              <span className="font-semibold text-slate">GH₵</span>
              <input
                data-field="amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Other amount"
                aria-label="Other amount in Ghana cedis"
                aria-invalid={!!errors.amount}
                value={customText}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d.]/g, "");
                  setCustomText(v);
                  const n = Math.round(parseFloat(v) * 100);
                  if (Number.isFinite(n) && n > 0) chooseAmount(n);
                }}
                className="h-full min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-slate/70"
              />
            </label>
            {errors.amount && (
              <p className="mt-2 text-sm font-medium text-margin">
                {errors.amount[0]}
              </p>
            )}
          </div>

          {/* Live impact translation */}
          <div aria-live="polite" className="rounded-3xl bg-[#FFF6E0] p-5">
            <p className="text-[0.8125rem] font-bold tracking-wide text-[#7A4F00] uppercase">
              {t.impactLabel}
            </p>
            <p className="mt-2 font-display text-[1.375rem] leading-snug font-bold">
              {impact.text ? (
                impact.text
              ) : impact.towards ? (
                <>Goes towards a {impact.towards.singular}</>
              ) : (
                <>
                  Supports{" "}
                  {causeInfo?.title ?? "children and young people in Wamfie"}
                </>
              )}
              {monthly && (impact.text || impact.towards) ? (
                <span className="text-slate"> every month</span>
              ) : null}
            </p>
            {impact.icons.length > 0 && (
              <div className="mt-4">
                <ImpactStack
                  icons={impact.icons}
                  overflow={Math.max(0, itemCount - impact.icons.length)}
                />
              </div>
            )}
          </div>

          {!lockCause && (
            <fieldset className="min-w-0">
              {/* min-w-0: fieldsets refuse to shrink by default, which would widen the whole page on phones. */}
              <legend className="mb-3 text-[0.9375rem] font-semibold">
                {t.causeHeading}
              </legend>
              <div
                ref={pillRow}
                className="scrollbar-none -mx-5 flex snap-x gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
              >
                {[
                  {
                    slug: null as string | null,
                    shortTitle: "Where it's needed most",
                  },
                  ...config.causes,
                ].map((c) => {
                  const active = c.slug === cause;
                  return (
                    <button
                      key={c.slug ?? "general"}
                      type="button"
                      aria-pressed={active}
                      data-active={active || undefined}
                      onClick={() => setCause(c.slug)}
                      className={`h-11 shrink-0 snap-start rounded-full px-4 text-[0.9375rem] font-semibold whitespace-nowrap transition-colors duration-300 ${
                        active
                          ? "bg-ink text-white"
                          : "bg-mist text-ink hover:bg-ink/10"
                      }`}
                    >
                      {c.shortTitle}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* Your details: the whole form on one screen */}
          <div className="space-y-4">
            <p className="text-[0.9375rem] font-semibold">{t.detailsHeading}</p>
            <Field label="Full name" name="fullName" errors={errors}>
              <input
                data-field="fullName"
                value={details.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
                autoComplete="name"
                placeholder="As it should appear on your receipt"
                className={inputCls}
                aria-invalid={!!errors.fullName}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" name="email" errors={errors}>
                <input
                  data-field="email"
                  type="email"
                  inputMode="email"
                  value={details.email}
                  onChange={(e) => setField("email", e.target.value)}
                  autoComplete="email"
                  placeholder="For your receipt"
                  className={inputCls}
                  aria-invalid={!!errors.email}
                />
              </Field>
              <Field label="Phone" optional name="phone" errors={errors}>
                <input
                  data-field="phone"
                  type="tel"
                  inputMode="tel"
                  value={details.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  autoComplete="tel"
                  placeholder="024 000 0000"
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="rounded-3xl bg-mist px-5">
              <Toggle
                checked={details.coverFee}
                onChange={(v) => setField("coverFee", v)}
                label={`Add ${formatCedis(coverFee(amount, config.feePercent), { decimals: true })} to cover fees`}
                description={t.coverFeeText}
              />
            </div>
          </div>

          {/* Extras, tucked away so the common case stays short */}
          <div>
            <button
              type="button"
              onClick={() => setMore((v) => !v)}
              aria-expanded={more}
              className="inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-slate hover:text-ink"
            >
              <svg
                viewBox="0 0 16 16"
                className={`size-4 transition-transform duration-300 ${more ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden="true"
              >
                <path
                  d="M6 3l5 5-5 5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t.moreOptionsLabel}
            </button>
            {more && (
              <div className="mt-2 space-y-4">
                <div className="divide-y divide-ink/[0.07] rounded-3xl bg-mist px-5">
                  <Toggle
                    checked={details.anonymous}
                    onChange={(v) => {
                      setField("anonymous", v);
                      if (v) setField("showOnWall", false);
                    }}
                    label="Give anonymously"
                    description={t.anonymousText}
                  />
                  {!details.anonymous && (
                    <Toggle
                      checked={details.showOnWall}
                      onChange={(v) => setField("showOnWall", v)}
                      label="Show me on the supporter wall"
                      description="First name and city only, e.g. Ama, Kumasi."
                    />
                  )}
                  {details.showOnWall && !details.anonymous && (
                    <div className="py-4">
                      <Field
                        label="Your city"
                        optional
                        name="city"
                        errors={errors}
                      >
                        <input
                          data-field="city"
                          value={details.city}
                          onChange={(e) => setField("city", e.target.value)}
                          autoComplete="address-level2"
                          className={inputCls}
                        />
                      </Field>
                    </div>
                  )}
                  <Toggle
                    checked={details.dedicate}
                    onChange={(v) => setField("dedicate", v)}
                    label="Dedicate this gift"
                    description="In honour or in memory of someone."
                  />
                  {details.dedicate && (
                    <div className="space-y-4 py-4">
                      <Segmented<"honour" | "memory">
                        label="Dedication type"
                        value={details.dedicationType}
                        onChange={(v) => setField("dedicationType", v)}
                        options={[
                          { value: "honour", label: "In honour of" },
                          { value: "memory", label: "In memory of" },
                        ]}
                      />
                      <Field
                        label="Their name"
                        name="dedicationName"
                        errors={errors}
                      >
                        <input
                          data-field="dedicationName"
                          value={details.dedicationName}
                          onChange={(e) =>
                            setField("dedicationName", e.target.value)
                          }
                          className={inputCls}
                        />
                      </Field>
                      <Field
                        label="Let them know by email"
                        optional
                        name="dedicationNotifyEmail"
                        errors={errors}
                      >
                        <input
                          data-field="dedicationNotifyEmail"
                          type="email"
                          inputMode="email"
                          value={details.dedicationEmail}
                          onChange={(e) =>
                            setField("dedicationEmail", e.target.value)
                          }
                          className={inputCls}
                        />
                      </Field>
                    </div>
                  )}
                </div>
                <Field label="Country" name="country" errors={errors}>
                  <select
                    data-field="country"
                    value={details.country}
                    onChange={(e) => setField("country", e.target.value)}
                    autoComplete="country-name"
                    className={`${inputCls} appearance-none`}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
          </div>

          {(status.kind === "cancelled" || status.kind === "error") && (
            <p
              role="alert"
              className={`rounded-2xl p-4 text-[0.9375rem] font-medium ${status.kind === "error" ? "bg-margin/10 text-margin" : "bg-mist text-ink"}`}
            >
              {status.message}
            </p>
          )}
          {!config.publicKey && (
            <p
              role="alert"
              className="rounded-2xl bg-margin/10 p-4 text-sm font-medium text-margin"
            >
              Online giving is temporarily unavailable. Please try again
              shortly.
            </p>
          )}

          <StickyAction>
            <Button
              size="lg"
              className="w-full text-[1.0625rem]"
              onClick={onPay}
              disabled={status.kind === "paying" || !config.publicKey}
            >
              {status.kind === "paying"
                ? "Opening secure payment…"
                : `${t.giveLabel} ${formatCedis(total, { decimals: true })}${every}`}
            </Button>
            {monthly && (
              <button
                type="button"
                onClick={() => setFrequency("one_time")}
                className="mt-1 w-full py-2 text-center text-sm font-semibold text-slate hover:text-ink"
              >
                {t.mobileMoneyHint}
              </button>
            )}
            <TrustRow monthly={monthly} />
          </StickyAction>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "h-13 w-full rounded-2xl border-[1.5px] border-ink/15 bg-white px-4 text-base outline-none transition-colors focus:border-ink aria-[invalid=true]:border-margin";

function Field({
  label,
  hint,
  optional,
  name,
  errors,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  name: string;
  errors: FieldErrors;
  children: ReactNode;
}) {
  const error = errors[name]?.[0];
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.9375rem] font-semibold">
        {label}
        {optional && (
          <span className="ml-1 font-normal text-slate">(optional)</span>
        )}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-sm font-medium text-margin">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-sm text-slate">{hint}</span>
      ) : null}
    </label>
  );
}

/**
 * The main button. On phones it sticks to the bottom of the viewport
 * while the card is on screen (thumb reach, always visible); inline on desktop.
 */
function StickyAction({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-5 rounded-b-[28px] border-t border-ink/[0.06] bg-white/95 px-5 pt-3 pb-safe backdrop-blur-lg sm:static sm:m-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      {children}
    </div>
  );
}

function TrustRow({ monthly }: { monthly: boolean }) {
  const t = useSite().donate;
  return (
    <div className="mt-3 flex flex-col items-center gap-1 text-center text-[0.8125rem] text-slate sm:mt-4">
      <p className="flex items-center gap-1.5 font-semibold text-ink">
        <svg
          viewBox="0 0 16 16"
          className="size-3.5"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 4 15h8a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 12 6h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5H6V4.5a2 2 0 1 1 4 0V6Z" />
        </svg>
        Secured by Paystack · {monthly ? "Card" : "Mobile Money · Card · Bank"}
      </p>
      <p>{t.trustNote}</p>
    </div>
  );
}
