import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BellRing, CircleX, ExternalLink, Timer } from "lucide-react";
import QRCode from "qrcode";
import { ChangeMethodForm } from "@/components/checkout/change-method-form";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { CopyButton } from "@/components/checkout/copy-button";
import { Countdown } from "@/components/checkout/countdown";
import { HowToPay } from "@/components/checkout/how-to-pay";
import { OrderSummary } from "@/components/checkout/order-summary";
import { PayActions, PaymentWatcher, SimulatePayment } from "@/components/checkout/pay-actions";
import { orderSummaryLines } from "@/components/checkout/summary-lines";
import { SummaryToggle } from "@/components/checkout/summary-toggle";
import { StatusBadge } from "@/components/ui/badges";
import { buttonClasses, ButtonLink } from "@/components/ui/button";
import { PaymentMark } from "@/components/ui/choice-tiles";
import { getLocale, getMessages } from "@/i18n/server";
import { checkoutMessages } from "@/i18n/messages/checkout";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { fulfilmentStatusInfo, paymentMethodInfo, paymentStatusInfo } from "@/lib/order-status";
import { cancelledByStore, getOrderForViewer, itemCount, orderDeadline, payable, withOrderToken } from "@/lib/orders";
import { canSimulatePayment, getPaymentOptions, getPaymentProvider } from "@/lib/payments";
import { getStoreSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages(checkoutMessages)).meta.pay, robots: { index: false } };
}

const SPECIFIC_HOW_TO = ["bca_va", "mandiri_va", "bni_va", "bri_va"] as const;

/** pen: Checkout · Pay (KKqcJ) — VA, retail, QRIS and e-wallets share this layout. */
export default async function PayPage({ params, searchParams }: PageProps<"/checkout/pay/[orderNumber]">) {
  const { orderNumber } = await params;
  const query = await searchParams;
  const token = typeof query.t === "string" ? query.t : "";

  const order = await getOrderForViewer(orderNumber, token);
  if (!order) notFound();
  if (order.paymentStatus === "paid") redirect(withOrderToken(`/checkout/success/${orderNumber}`, token));

  const [t, locale, settings] = await Promise.all([getMessages(checkoutMessages), getLocale(), getStoreSettings()]);
  const { methods, logos } = await getPaymentOptions(settings);
  const p = t.pay;
  const payment = order.payments[0] ?? null;
  // Cancelled by the store: closed, even if a payment still looks open.
  const storeCancelled = cancelledByStore(order);
  const live = payment?.status === "awaiting" && !storeCancelled ? payment : null;
  const orderExpired = order.paymentStatus === "expired";
  const choosing = !orderExpired && (query.change === "1" || !live);
  const initialError = query.error === "unavailable" ? "gatewayUnavailable" : query.error === "busy" ? "gatewayBusy" : undefined;

  const status = storeCancelled ? fulfilmentStatusInfo.cancelled : paymentStatusInfo[order.paymentStatus];
  const pay = payable(order, live);
  const amount = formatRupiah(pay.amount);
  const payHref = withOrderToken(`/checkout/pay/${orderNumber}`, token);
  const orderHref = withOrderToken(`/orders/${orderNumber}`, token);
  const successHref = withOrderToken(`/checkout/success/${orderNumber}`, token);
  const changeHref = `${payHref}${token ? "&" : "?"}change=1`;
  const statusUrl = withOrderToken(`/api/orders/${orderNumber}/payment-status`, token);
  const deadline = formatDateTime(live?.expiresAt ?? orderDeadline(order), locale);

  // Below lg the summary folds into a bar under the payment details.
  const summary = (
    <SummaryToggle id="pay-summary" labels={{ show: t.summary.show, hide: t.summary.hide }} total={amount} className="lg:w-[440px] lg:shrink-0">
      <OrderSummary
        t={t.summary}
        lines={orderSummaryLines(order, locale)}
        itemCount={itemCount(order)}
        subtotal={order.subtotal}
        fulfilment={order.fulfilmentMethod}
        fee={order.deliveryFee}
        serviceFee={pay.serviceFee}
        total={pay.amount}
      />
    </SummaryToggle>
  );

  const layout = (title: string, sub: string, body: React.ReactNode) => (
    <>
      <CheckoutHeader step={3} />
      <main id="main" tabIndex={-1} className="flex w-full flex-1 flex-col outline-hidden">
        <div className="flex w-full flex-col gap-8 px-4 pt-8 pb-16 md:px-8 lg:flex-row lg:items-start lg:gap-12 lg:px-16 lg:pt-12 lg:pb-24">
          <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
            <div className="flex flex-col items-start gap-2.5 pb-2">
              <StatusBadge tone={status.tone}>{status[locale]}</StatusBadge>
              <h1 className="type-checkout font-display font-bold text-foreground">{title}</h1>
              <p className="text-[17px] leading-[26px] text-muted-foreground">{sub}</p>
            </div>
            {body}
          </div>
          {summary}
        </div>
      </main>
    </>
  );

  if (storeCancelled) {
    return layout(
      p.cancelledTitle,
      p.cancelledBody(orderNumber),
      <>
        <div className="flex w-full items-center gap-4 rounded-m bg-tint-salmon px-6 py-[18px]">
          <CircleX className="size-6 shrink-0 text-error" aria-hidden />
          <p className="text-base leading-6 font-bold text-foreground">{p.cancelledNote}</p>
        </div>
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <ButtonLink href={orderHref}>{p.viewOrder}</ButtonLink>
          <ButtonLink href="/menu" variant="secondary">
            {p.orderAgain}
          </ButtonLink>
        </div>
      </>,
    );
  }

  if (orderExpired) {
    const name = payment ? paymentMethodInfo[payment.method].name : null;
    return layout(
      p.expiredTitle,
      p.expiredBody(formatDateTime(orderDeadline(order), locale)),
      <>
        <div className="flex w-full items-center gap-4 rounded-m bg-tint-salmon px-6 py-[18px]">
          <CircleX className="size-6 shrink-0 text-error" aria-hidden />
          <p className="text-base leading-6 font-bold text-foreground">
            {[orderNumber, name, formatRupiah(order.total)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <ButtonLink href={orderHref}>{p.viewOrder}</ButtonLink>
          <ButtonLink href="/menu" variant="secondary">
            {p.orderAgain}
          </ButtonLink>
        </div>
      </>,
    );
  }

  if (choosing || !live) {
    const lapsed = !live && payment ? paymentMethodInfo[payment.method].name : null;
    return layout(
      live ? p.title : p.choose,
      lapsed ? p.paymentExpired(lapsed) : p.chooseSub,
      <ChangeMethodForm
        orderNumber={orderNumber}
        token={token}
        current={live?.method ?? null}
        methods={methods}
        logos={logos}
        cancelHref={live ? payHref : null}
        initialError={initialError}
      />,
    );
  }

  const info = paymentMethodInfo[live.method];
  const provider = getPaymentProvider(live.provider);
  const ovo = live.method === "ovo";
  const code = live.vaNumber ?? "";
  const qrSvg =
    info.kind === "qris" && live.qrContent
      ? await QRCode.toString(live.qrContent, { type: "svg", margin: 0, color: { dark: "#1F2A14", light: "#FFFFFF" } })
      : null;

  const sub =
    info.kind === "va"
      ? p.subVa(info.name)
      : info.kind === "retail"
        ? p.subRetail(info.name)
        : info.kind === "qris"
          ? p.subQris
          : ovo
            ? p.subOvo
            : p.subEwallet(info.name);
  const sections =
    info.kind === "qris"
      ? t.howTo.qris(amount)
      : info.kind === "retail"
        ? t.howTo.retail(info.name, code, amount)
        : info.kind === "ewallet"
          ? ovo
            ? t.howTo.ovo(amount)
            : t.howTo.wallet(info.name, amount)
          : (SPECIFIC_HOW_TO as readonly string[]).includes(live.method)
            ? t.howTo[live.method as (typeof SPECIFIC_HOW_TO)[number]](code, amount)
            : t.howTo.va(info.name.replace(" Virtual Account", ""), code, amount);

  return layout(
    p.title,
    sub,
    <>
      <div className="flex w-full flex-wrap items-center gap-4 rounded-m bg-tint-mustard px-5 py-[18px] sm:flex-nowrap sm:px-6">
        <Timer className="size-6 shrink-0 text-foreground" aria-hidden />
        <p className="min-w-0 flex-1 basis-[calc(100%-40px)] text-base leading-6 font-bold text-foreground sm:basis-0">
          {p.payBefore(deadline)}
        </p>
        {live.expiresAt ? (
          <div className="w-full pl-10 sm:w-auto sm:pl-0">
            <Countdown expiresAt={live.expiresAt.toISOString()} label={p.timeLeft} />
          </div>
        ) : null}
      </div>

      <section
        aria-label={info.name}
        className="flex w-full flex-col overflow-hidden rounded-m bg-white inset-ring-[1.5px] inset-ring-border"
      >
        {/* Below sm "Change method" sits under the name, so a long name like "BCA Virtual Account" keeps one line. */}
        <div className="flex w-full items-center gap-3.5 bg-mint px-5 py-[18px] sm:px-6">
          <PaymentMark label={info.mark} className={info.markClass} logoUrl={logos[live.method]} />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <p className="min-w-0 text-base leading-6 font-bold text-foreground">{info.name}</p>
            <Link
              href={changeHref}
              className="relative shrink-0 text-sm leading-[21px] font-bold text-primary after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] hover:underline"
            >
              {p.changeMethod}
            </Link>
          </div>
        </div>

        {live.vaNumber ? (
          <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-5 shadow-[inset_0_-1px_0_var(--border-subtle)] sm:px-6">
            {/* Same layout as the Amount row: Copy stays on the right; below sm the number wraps only if it must. */}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-[13px] leading-5 text-muted-foreground">{info.kind === "retail" ? p.paymentCode : p.vaNumber}</p>
              <p
                id="pay-va-number"
                className="font-mono text-lg leading-[30px] font-semibold text-balance break-words text-foreground sm:text-[32px] sm:leading-[35px] sm:tracking-[1px] sm:whitespace-nowrap"
              >
                {live.vaNumber}
              </p>
            </div>
            <CopyButton
              value={live.vaNumber.replace(/\s/g, "")}
              label={p.copy}
              copiedLabel={p.copied}
              failedLabel={p.copyFailed}
              ariaLabel={info.kind === "retail" ? p.copyCode : p.copyVa}
              selectId="pay-va-number"
            />
          </div>
        ) : info.kind === "qris" && (qrSvg || live.payUrl) ? (
          <div className="flex w-full flex-col items-center gap-4 px-5 py-6 shadow-[inset_0_-1px_0_var(--border-subtle)] sm:flex-row sm:px-6">
            {qrSvg ? (
              <div
                role="img"
                aria-label={p.qrAlt(info.name)}
                className="size-44 shrink-0 rounded-sm bg-white p-2 inset-ring-1 inset-ring-border-subtle [&_svg]:size-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- the gateway's QR image, shown as is
              <img src={live.payUrl!} alt={p.qrAlt(info.name)} className="size-44 shrink-0 rounded-sm bg-white p-2 inset-ring-1 inset-ring-border-subtle" />
            )}
            <p className="text-[15px] leading-[23px] text-muted-foreground">{p.scanQris}</p>
          </div>
        ) : info.kind === "ewallet" && !ovo && live.payUrl ? (
          <div className="flex w-full flex-col items-start gap-3 px-5 py-5 shadow-[inset_0_-1px_0_var(--border-subtle)] sm:px-6">
            <a href={live.payUrl} className={buttonClasses("primary", "w-full gap-2 sm:w-auto")}>
              {p.openWallet(info.name)}
              <ExternalLink className="size-4" aria-hidden />
            </a>
            <p className="text-sm leading-[21px] text-muted-foreground">{p.walletNote(info.name)}</p>
          </div>
        ) : info.kind === "ewallet" ? (
          <div className="flex w-full items-start gap-4 px-5 py-5 shadow-[inset_0_-1px_0_var(--border-subtle)] sm:px-6">
            <BellRing className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-base leading-6 font-bold text-foreground">{p.ovoTitle}</p>
              <p className="text-[15px] leading-[23px] text-muted-foreground">{p.ovoBody(order.phone)}</p>
            </div>
          </div>
        ) : null}

        <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-5 sm:px-6">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-[13px] leading-5 text-muted-foreground">{p.amount}</p>
            <p id="pay-amount" className="font-display text-[28px] leading-[31px] font-bold text-foreground">
              {amount}
            </p>
            {pay.serviceFee > 0 ? (
              <p className="text-[13px] leading-5 text-muted-foreground">
                {p.serviceFee} {formatRupiah(pay.serviceFee)}
              </p>
            ) : null}
          </div>
          <CopyButton
            value={String(pay.amount)}
            label={p.copy}
            copiedLabel={p.copied}
            failedLabel={p.copyFailed}
            ariaLabel={p.copyAmount}
            selectId="pay-amount"
          />
        </div>
      </section>

      <HowToPay title={p.howToPay} sections={sections} />

      <PaymentWatcher statusUrl={statusUrl} successHref={successHref} />
      <PayActions orderNumber={orderNumber} token={token} orderHref={orderHref} />
      {canSimulatePayment(live.provider) ? <SimulatePayment orderNumber={orderNumber} token={token} sandbox={provider.id !== "mock"} /> : null}
    </>,
  );
}
