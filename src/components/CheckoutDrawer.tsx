import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  CreditCard,
  Globe,
  Minus,
  Plus,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import {
  calculateCheckoutBreakdown,
  CartItemInput,
  CurrencyCode,
  formatCurrency,
  PaymentRail,
  ShippingRegion,
  WORKSHOP_TICKET_PRICE_KES,
} from '../utils/marketplaceLogic';

interface CheckoutDrawerProps {
  isOpen: boolean;
  items: CartItemInput[];
  currency: CurrencyCode;
  onToggleCurrency: (c: CurrencyCode) => void;
  onUpdateQuantity: (index: number, delta: number) => void;
  onToggleItemDeposit: (index: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  onClose: () => void;
}

export const CheckoutDrawer: React.FC<CheckoutDrawerProps> = ({
  isOpen,
  items,
  currency,
  onToggleCurrency,
  onUpdateQuantity,
  onToggleItemDeposit,
  onRemoveItem,
  onClearCart,
  onClose,
}) => {
  const [shippingRegion, setShippingRegion] = useState<ShippingRegion>('nairobi-pickup');
  const [paymentRail, setPaymentRail] = useState<PaymentRail>('mpesa-paybill');
  const [includeWorkshopTicket, setIncludeWorkshopTicket] = useState<boolean>(false);

  // Buyer verification & magic-link inputs
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [mpesaPhone, setMpesaPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copiedReference, setCopiedReference] = useState<boolean>(false);
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderId: string;
    paybillRef: string;
    totalPaidText: string;
    email: string;
    railLabel: string;
  } | null>(null);

  if (!isOpen) return null;

  const breakdown = calculateCheckoutBreakdown({
    items,
    shippingRegion,
    paymentRail,
    includeWorkshopTicket,
  });

  const hasFurnitureItems = items.some((i) => i.domain === 'furniture');

  const handleCopyPaybill = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(breakdown.structuredPaybillAccount).catch(() => {});
    }
    setCopiedReference(true);
    setTimeout(() => setCopiedReference(false), 2500);
  };

  const handleCompleteCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (items.length === 0) {
      setValidationError('Your shared marketplace bag is empty.');
      return;
    }

    if (!buyerEmail.trim() || !buyerEmail.includes('@')) {
      setValidationError('Please enter a valid email address for magic-link order tracking.');
      return;
    }

    if (paymentRail === 'mpesa-paybill' && mpesaPhone.trim().length < 9) {
      setValidationError(
        'Please enter your Safaricom M-PESA phone number or Paybill confirmation code.',
      );
      return;
    }

    if (shippingRegion !== 'nairobi-pickup' && deliveryAddress.trim().length < 5) {
      setValidationError('Please enter your delivery street address and city.');
      return;
    }

    const railLabels: Record<PaymentRail, string> = {
      'mpesa-paybill': `M-PESA Paybill ${breakdown.paybillNumber} (${breakdown.structuredPaybillAccount})`,
      'paystack-kenya-card': 'Paystack Kenya Local Card (2.9%)',
      'paystack-intl-card': 'Paystack Global Visa / Mastercard (3.8%)',
      'paystack-apple-pay': 'Paystack Apple Pay Express (3.8%)',
    };

    setConfirmedOrder({
      orderId: `UAC-${Math.floor(100000 + Math.random() * 900000)}`,
      paybillRef: breakdown.structuredPaybillAccount,
      totalPaidText: formatCurrency(breakdown.totalDueKes, currency),
      email: buyerEmail.trim(),
      railLabel: railLabels[paymentRail],
    });
    onClearCart();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Unity Art Collective Shared Marketplace Checkout"
      className="fixed inset-0 z-50 flex justify-end bg-black/75"
    >
      <div className="relative w-full max-w-xl bg-[#0E0E13] border-l border-white/15 h-full flex flex-col text-[#F4F3EF] overflow-hidden">
        {/* Drawer Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10 bg-[#121218]">
          <div>
            <h2 className="text-lg font-semibold">Shared Marketplace Checkout</h2>
            <p className="text-xs text-[#A1A09A]">
              Unity Art Collective · Paybill 000000 & Paystack Global
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Currency Switcher */}
            <div className="flex items-center bg-[#1A1A22] p-0.5 rounded-lg border border-white/10">
              {(['KES', 'USD'] as CurrencyCode[]).map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => onToggleCurrency(curr)}
                  className={`px-2.5 py-1 text-xs font-mono-tabular rounded-md transition-colors ${
                    currency === curr
                      ? 'bg-[#D97736] text-[#0B0B0E] font-semibold'
                      : 'text-[#A1A09A] hover:text-white'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Checkout Drawer"
              className="p-2 rounded-lg bg-[#1A1A22] text-[#E4E2DD] hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {confirmedOrder ? (
            <div className="bg-[#15151C] border border-emerald-500/40 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-emerald-400">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Order {confirmedOrder.orderId} Confirmed
                  </h3>
                  <p className="text-xs text-[#A1A09A]">
                    Magic-link tracking dispatched to {confirmedOrder.email}
                  </p>
                </div>
              </div>

              <div className="bg-[#0D0D11] border border-white/10 rounded-xl p-4 space-y-2 text-xs font-mono-tabular">
                <div className="flex justify-between">
                  <span className="text-[#A1A09A]">PAYMENT RAIL:</span>
                  <span className="text-white">{confirmedOrder.railLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A1A09A]">ACCOUNT REF:</span>
                  <span className="text-[#D4AF37]">{confirmedOrder.paybillRef}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A1A09A]">AMOUNT SETTLED:</span>
                  <span className="text-[#D97736] font-semibold">
                    {confirmedOrder.totalPaidText}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A1A09A]">FULFILLMENT:</span>
                  <span className="text-white">Nairobi Production Hub · Quality Verified</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setConfirmedOrder(null);
                  onClose();
                }}
                className="w-full py-2.5 text-xs font-semibold bg-[#F4F3EF] text-[#0B0B0E] rounded-lg hover:bg-white transition-colors"
              >
                Continue Exploring WebAR Catalog
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-[#A1A09A]">
                Your Unity Art Collective bag is currently empty.
              </p>
              <p className="text-xs text-[#71717A]">
                Launch AR Virtual Try-On for East African fashion or Spatial Room AR for bamboo
                furniture to calibrate and add pieces.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCompleteCheckout} className="space-y-6">
              {/* Itemized List */}
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-wider text-[#A1A09A] font-medium">
                  Selected Nairobi Pieces ({items.length})
                </div>
                {items.map((item, idx) => (
                  <div
                    key={`${item.productId}-${item.variantName}-${idx}`}
                    className="p-3.5 rounded-xl bg-[#15151C] border border-white/10 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white">{item.name}</div>
                        <div className="text-xs text-[#A1A09A] mt-0.5">
                          <span>{item.variantName}</span>
                          {item.selectedSize && (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span>Calibrated Size: {item.selectedSize}</span>
                            </>
                          )}
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono-tabular text-[#D4AF37]">
                            {item.paybillCode}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(idx)}
                        aria-label={`Remove ${item.name}`}
                        className="p-1.5 text-[#A1A09A] hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(idx, -1)}
                          aria-label={`Decrease quantity of ${item.name}`}
                          className="p-1 rounded bg-[#1F1F29] text-white hover:bg-white/15"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono-tabular px-2">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(idx, 1)}
                          aria-label={`Increase quantity of ${item.name}`}
                          className="p-1 rounded bg-[#1F1F29] text-white hover:bg-white/15"
                        >
                          <Plus className="w-3 h-3" />
                        </button>

                        {item.domain === 'furniture' && (
                          <button
                            type="button"
                            onClick={() => onToggleItemDeposit(idx)}
                            className={`ml-2 px-2.5 py-1 text-xs rounded border transition-colors ${
                              item.isDepositOnly
                                ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]'
                                : 'bg-[#1F1F29] border-white/10 text-[#A1A09A]'
                            }`}
                          >
                            {item.isDepositOnly ? '50% Custom Deposit' : 'Pay 100% Full'}
                          </button>
                        )}
                      </div>

                      <div className="text-sm font-mono-tabular font-semibold text-white">
                        {formatCurrency(
                          item.unitPriceKes * item.quantity * (item.isDepositOnly ? 0.5 : 1),
                          currency,
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Workshop / Event Ticket Upsell */}
              <div className="p-3.5 rounded-xl bg-[#16151D] border border-[#D4AF37]/30 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-[#D4AF37] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Art After Dark · Nairobi Bamboo & Upcycling Workshop Pass
                  </div>
                  <p className="text-xs text-[#A1A09A]">
                    Includes live WebAR showcase entry + artisan studio tour in Nairobi (+
                    {formatCurrency(WORKSHOP_TICKET_PRICE_KES, currency)})
                  </p>
                </div>
                <input
                  id="workshop-upsell-checkbox"
                  type="checkbox"
                  aria-label="Add Art After Dark Workshop Pass"
                  checked={includeWorkshopTicket}
                  onChange={(e) => setIncludeWorkshopTicket(e.target.checked)}
                  className="w-4 h-4 accent-[#D97736]"
                />
              </div>

              {/* Shipping & Global Distribution Selector */}
              <div className="space-y-2">
                <label
                  htmlFor="shipping-region-select"
                  className="block text-xs uppercase tracking-wider text-[#A1A09A] font-medium"
                >
                  Nairobi Fulfillment & Global Freight
                </label>
                <div className="relative">
                  <select
                    id="shipping-region-select"
                    value={shippingRegion}
                    onChange={(e) => setShippingRegion(e.target.value as ShippingRegion)}
                    className="w-full bg-[#15151C] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  >
                    <option value="nairobi-pickup">
                      Local Nairobi Pickup — Unity Studio (Free)
                    </option>
                    <option value="nairobi-courier">
                      Nairobi Same-Day Boda / Electric Van Delivery
                    </option>
                    <option value="east-africa">
                      East Africa Regional Courier (Kampala, Kigali, Dar es Salaam)
                    </option>
                    <option value="eu-uk">
                      Europe & UK Tracked Air Freight + Estimated Duties
                    </option>
                    <option value="north-america">
                      North America (US / Canada) DHL Express + Estimated Duties
                    </option>
                  </select>
                </div>
              </div>

              {/* Payment Rails: Kenya Paybill 000000 vs International Paystack */}
              <div className="space-y-2.5">
                <span className="block text-xs uppercase tracking-wider text-[#A1A09A] font-medium">
                  Payment Method (Paybill 000000 + Paystack Kenya)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentRail('mpesa-paybill')}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      paymentRail === 'mpesa-paybill'
                        ? 'bg-[#D97736]/15 border-[#D97736] text-white'
                        : 'bg-[#15151C] border-white/10 text-[#A1A09A]'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      M-PESA Paybill 000000
                    </div>
                    <div className="text-xs text-[#A1A09A] mt-1">
                      Ref: <span className="font-mono-tabular">{breakdown.structuredPaybillAccount}</span> · 0% Fee
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentRail('paystack-intl-card')}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      paymentRail === 'paystack-intl-card'
                        ? 'bg-[#D97736]/15 border-[#D97736] text-white'
                        : 'bg-[#15151C] border-white/10 text-[#A1A09A]'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <Globe className="w-4 h-4 text-[#D4AF37]" />
                      Paystack Global Card
                    </div>
                    <div className="text-xs text-[#A1A09A] mt-1">
                      USD / KES · 3.8% Intl Gateway
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentRail('paystack-kenya-card')}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      paymentRail === 'paystack-kenya-card'
                        ? 'bg-[#D97736]/15 border-[#D97736] text-white'
                        : 'bg-[#15151C] border-white/10 text-[#A1A09A]'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <CreditCard className="w-4 h-4 text-[#D97736]" />
                      Paystack Kenya Card
                    </div>
                    <div className="text-xs text-[#A1A09A] mt-1">
                      Local KES Cards · 2.9% Fee
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentRail('paystack-apple-pay')}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      paymentRail === 'paystack-apple-pay'
                        ? 'bg-[#D97736]/15 border-[#D97736] text-white'
                        : 'bg-[#15151C] border-white/10 text-[#A1A09A]'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <ShieldCheck className="w-4 h-4 text-white" />
                      Apple Pay (via Paystack)
                    </div>
                    <div className="text-xs text-[#A1A09A] mt-1">
                      One-Tap iOS Safari · Settles KE
                    </div>
                  </button>
                </div>
              </div>

              {/* Structured M-PESA Paybill 000000 Instruction Box */}
              {paymentRail === 'mpesa-paybill' && (
                <div className="p-4 rounded-xl bg-[#131816] border border-emerald-500/30 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-300">
                      M-PESA Lipa na M-PESA · Paybill 000000
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPaybill}
                      className="px-2.5 py-1 rounded bg-white/10 text-white hover:bg-white/20 flex items-center gap-1 font-mono-tabular"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedReference ? 'Copied Ref' : 'Copy Account Ref'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono-tabular pt-1">
                    <div className="bg-black/40 p-2 rounded border border-white/10">
                      <div className="text-[#A1A09A] text-[11px]">BUSINESS NUMBER</div>
                      <div className="text-sm text-white font-semibold">
                        {breakdown.paybillNumber}
                      </div>
                    </div>
                    <div className="bg-black/40 p-2 rounded border border-white/10">
                      <div className="text-[#A1A09A] text-[11px]">ACCOUNT NUMBER</div>
                      <div className="text-sm text-[#D4AF37] font-semibold">
                        {breakdown.structuredPaybillAccount}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Buyer Magic-Link & Contact Verification Inputs */}
              <div className="space-y-3">
                <div>
                  <label htmlFor="checkout-email" className="block text-xs text-[#A1A09A] mb-1">
                    Buyer Email (For Magic-Link Order & Shipping Tracker) *
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-[#15151C] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>

                {paymentRail === 'mpesa-paybill' && (
                  <div>
                    <label
                      htmlFor="checkout-mpesa-phone"
                      className="block text-xs text-[#A1A09A] mb-1"
                    >
                      Safaricom M-PESA Phone Number (for STK Push / Verification) *
                    </label>
                    <input
                      id="checkout-mpesa-phone"
                      type="tel"
                      value={mpesaPhone}
                      onChange={(e) => setMpesaPhone(e.target.value)}
                      placeholder="M-PESA phone number"
                      className="w-full bg-[#15151C] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white font-mono-tabular"
                    />
                  </div>
                )}

                {shippingRegion !== 'nairobi-pickup' && (
                  <div>
                    <label
                      htmlFor="checkout-delivery-address"
                      className="block text-xs text-[#A1A09A] mb-1"
                    >
                      Delivery Street Address, City & Country *
                    </label>
                    <input
                      id="checkout-delivery-address"
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="e.g. 14 Riverside Drive, Westlands, Nairobi or International Address"
                      className="w-full bg-[#15151C] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                  </div>
                )}
              </div>

              {/* Financial Breakdown & Transparent 80/20 Creator Commission Split */}
              <div className="p-4 rounded-xl bg-[#15151C] border border-white/10 space-y-2 text-xs font-mono-tabular">
                <div className="flex justify-between text-[#A1A09A]">
                  <span>Catalog Subtotal</span>
                  <span>{formatCurrency(breakdown.subtotalKes, currency)}</span>
                </div>
                {breakdown.depositAppliedKes > 0 && (
                  <div className="flex justify-between text-[#D4AF37]">
                    <span>50% Custom Build Deposit Balance Deferred</span>
                    <span>-{formatCurrency(breakdown.depositAppliedKes, currency)}</span>
                  </div>
                )}
                {breakdown.workshopTicketKes > 0 && (
                  <div className="flex justify-between text-[#E4E2DD]">
                    <span>Art After Dark Workshop Pass</span>
                    <span>{formatCurrency(breakdown.workshopTicketKes, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#A1A09A]">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" /> Shipping & Freight
                  </span>
                  <span>
                    {breakdown.shippingFreightKes === 0
                      ? 'FREE (Nairobi Pickup)'
                      : formatCurrency(breakdown.shippingFreightKes, currency)}
                  </span>
                </div>
                {breakdown.estimatedDutiesKes > 0 && (
                  <div className="flex justify-between text-[#A1A09A]">
                    <span>Estimated Export Duties & Clearance</span>
                    <span>{formatCurrency(breakdown.estimatedDutiesKes, currency)}</span>
                  </div>
                )}
                {breakdown.paymentGatewayFeeKes > 0 && (
                  <div className="flex justify-between text-[#A1A09A]">
                    <span>Paystack Processing Fee</span>
                    <span>{formatCurrency(breakdown.paymentGatewayFeeKes, currency)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-white/15 flex justify-between text-sm font-semibold text-white">
                  <span>Total Due Now</span>
                  <span className="text-[#D97736]">
                    {formatCurrency(breakdown.totalDueKes, 'KES')} (
                    {formatCurrency(breakdown.totalDueKes, 'USD')})
                  </span>
                </div>

                <div className="pt-2 border-t border-white/10 text-[11px] text-[#A1A09A] space-y-1 font-sans">
                  <div className="flex justify-between">
                    <span>Direct to Nairobi Artisan / Workshop (80%):</span>
                    <span className="font-mono-tabular text-white">
                      {formatCurrency(breakdown.creatorPayoutKes, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unity Collective Platform & WebAR Commission (20%):</span>
                    <span className="font-mono-tabular text-white">
                      {formatCurrency(breakdown.unityCommissionKes, currency)}
                    </span>
                  </div>
                  {hasFurnitureItems && (
                    <div className="pt-1 text-[#D4AF37]">
                      KCB Green Design Installment Option: 6 monthly payments of{' '}
                      <span className="font-mono-tabular font-semibold">
                        {formatCurrency(breakdown.kcbMonthlyInstallmentKes, currency)}/mo
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {validationError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-red-950/80 border border-red-500/60 text-red-200 text-xs"
                >
                  {validationError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 text-xs font-semibold bg-[#D97736] text-[#0B0B0E] rounded-xl hover:bg-[#EA8A47] transition-colors"
              >
                Confirm & Complete Order ({formatCurrency(breakdown.totalDueKes, currency)})
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
