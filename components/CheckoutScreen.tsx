"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const sriLankaLocations: Record<string, string[]> = {
  "Colombo": ["Colombo 01", "Colombo 02", "Colombo 03", "Colombo 04", "Colombo 05", "Colombo 06", "Colombo 07", "Colombo 08", "Colombo 09", "Colombo 10", "Colombo 11", "Colombo 12", "Colombo 13", "Colombo 14", "Colombo 15", "Dehiwala", "Mount Lavinia", "Nugegoda", "Maharagama", "Battaramulla", "Rajagiriya", "Kotte", "Moratuwa"],
  "Gampaha": ["Gampaha", "Yakkala", "Negombo", "Wattala", "Kelaniya", "Kadawatha", "Ja-Ela", "Minuwangoda", "Peliyagoda"],
  "Kalutara": ["Kalutara", "Panadura", "Horana", "Wadduwa", "Bandaragama"],
  "Kandy": ["Kandy", "Peradeniya", "Katugastota", "Gampola", "Nawalapitiya"],
  "Galle": ["Galle", "Hikkaduwa", "Ambalangoda", "Karapitiya", "Elpitiya"],
  "Matara": ["Matara", "Weligama", "Akuressa", "Dikwella"],
  "Kurunegala": ["Kurunegala", "Kuliyapitiya", "Pannala", "Narammala"]
};

type DeliveryDetails = {
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientAddress: string;
  deliveryDistrict: string;
  deliveryCity: string;
  phone: string;
  giftMessage: string;
  deliveryDate: string;
};

type CartItem = {
  id: string;
  name: string;
  price: { amount: number | null; currency: string };
  image: string | null;
  url: string;
  quantity: number;
};

type CheckoutScreenProps = {
  cart: CartItem[];
  recipientName: string;
  onConfirm: (details: DeliveryDetails) => void;
};

function formatPrice(price: { amount: number | null; currency: string }): string {
  if (price.amount == null) return "Price TBD";
  return `Rs. ${price.amount.toLocaleString()}`;
}

export default function CheckoutScreen({
  cart,
  recipientName,
  onConfirm,
}: CheckoutScreenProps) {
  const getTomorrowSLT = () => {
    const now = new Date();
    const sltTime = now.getTime() + (5.5 * 60 * 60 * 1000) + (24 * 60 * 60 * 1000);
    const tomorrow = new Date(sltTime);
    return tomorrow.toISOString().split("T")[0];
  };
  const minDate = getTomorrowSLT();
  const [formData, setFormData] = useState<DeliveryDetails>({
    senderName: "",
    senderEmail: "",
    recipientName: "",
    recipientAddress: "",
    deliveryDistrict: "",
    deliveryCity: "",
    phone: "",
    giftMessage: "",
    deliveryDate: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: keyof DeliveryDetails, value: string) => {
    if (field === "deliveryDistrict") {
      setFormData((prev) => ({ ...prev, deliveryDistrict: value, deliveryCity: "" }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
    setError("");
  };

  const handleConfirm = async () => {
    if (
      !formData.senderName.trim() ||
      !formData.senderEmail.trim() ||
      !formData.senderEmail.includes("@") ||
      !formData.recipientName.trim() ||
      !formData.recipientAddress.trim() ||
      !formData.deliveryDistrict.trim() ||
      !formData.deliveryCity.trim() ||
      !formData.phone.trim() ||
      !formData.deliveryDate.trim()
    ) {
      setError("Please fill all required fields");
      return;
    }

    if (formData.deliveryDate < minDate) {
      setError("Please select a valid delivery date (minimum 24 hours advance).");
      return;
    }
    
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/kapruka/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart: cart.map(item => ({ productId: item.id, quantity: item.quantity })),
          senderName: formData.senderName,
          senderEmail: formData.senderEmail,
          recipientName: formData.recipientName,
          recipientAddress: formData.recipientAddress,
          deliveryCity: formData.deliveryCity,
          phoneNumber: formData.phone,
          preferredDeliveryDate: formData.deliveryDate,
          giftMessage: formData.giftMessage,
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error && data.error.includes("city_not_deliverable")) {
          throw new Error("Please double-check your selected district and city. Kapruka does not deliver there.");
        }
        throw new Error(data.error || "Checkout failed");
      }

      if (!data.url || !data.url.startsWith("http") || data.url.includes("pydantic.dev")) {
        throw new Error("Kapruka did not return a valid checkout session URL.");
      }

      setSubmitted(true);
      onConfirm(formData);

      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "Failed to complete order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-[0.85rem] placeholder-slate-600 focus:outline-none focus:border-amber-400/50 focus:bg-white/[0.08] transition-all";
  const labelClass =
    "text-slate-400 text-[0.65rem] uppercase tracking-wider mb-1 block";

  return (
    <div className="w-full flex flex-col max-w-[340px] sm:max-w-sm">
      {!submitted ? (
        <>
          <p className="text-slate-200 text-[0.95rem] mb-4">
            Let's get this delivered. Tell me where to send it ✦
          </p>

          {/* ─── Cart Summary ─── */}
          <div className="mb-4 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
            <p className="text-[0.65rem] uppercase tracking-wider text-slate-400 px-3 pt-2 pb-1">
              Your Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})
            </p>
            {cart.map((item, i) => (
              <div key={item.id + '-' + i} className="flex items-center gap-3 px-3 py-2 border-t border-white/5">
                <div className="w-10 h-10 rounded-lg bg-[#0f0f0f] overflow-hidden flex-shrink-0">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs truncate">{item.name}</p>
                  <p className="text-amber-400 text-[0.7rem]">{formatPrice(item.price)} × {item.quantity}</p>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center px-3 py-2 border-t border-white/10 bg-white/[0.03]">
              <span className="text-slate-400 text-xs font-medium">Total</span>
              <span className="text-amber-400 text-sm font-bold">
                Rs. {cart.reduce((sum, item) => sum + (item.price.amount || 0) * item.quantity, 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* ─── Form Fields ─── */}
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Your name (Sender) *</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={formData.senderName}
                onChange={(e) => updateField("senderName", e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Your email (Sender) *</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={formData.senderEmail}
                onChange={(e) => updateField("senderEmail", e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Recipient's name *</label>
              <input
                type="text"
                placeholder="Enter recipient's name"
                value={formData.recipientName}
                onChange={(e) => updateField("recipientName", e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Recipient's address *</label>
              <textarea
                rows={2}
                placeholder="Full delivery address"
                value={formData.recipientAddress}
                onChange={(e) =>
                  updateField("recipientAddress", e.target.value)
                }
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="flex gap-2 w-full">
              <div className="flex-1 min-w-0">
                <label className={labelClass}>District *</label>
                <select
                  value={formData.deliveryDistrict}
                  onChange={(e) => updateField("deliveryDistrict", e.target.value)}
                  className={`${inputClass} appearance-none`}
                >
                  <option value="" disabled className="text-slate-500">Select district</option>
                  {Object.keys(sriLankaLocations).map(district => (
                    <option key={district} value={district} className="bg-[#0f1729] text-white">
                      {district}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-0">
                <label className={labelClass}>City *</label>
                <select
                  value={formData.deliveryCity}
                  onChange={(e) => updateField("deliveryCity", e.target.value)}
                  disabled={!formData.deliveryDistrict}
                  className={`${inputClass} appearance-none ${!formData.deliveryDistrict ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value="" disabled className="text-slate-500">Select city</option>
                  {formData.deliveryDistrict && sriLankaLocations[formData.deliveryDistrict].map(city => (
                    <option key={city} value={city} className="bg-[#0f1729] text-white">
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Phone number *</label>
              <input
                type="tel"
                placeholder="+94 7X XXX XXXX"
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Preferred delivery date *</label>
              <input
                type="date"
                min={minDate}
                value={formData.deliveryDate}
                onChange={(e) => updateField("deliveryDate", e.target.value)}
                className={`${inputClass} [color-scheme:dark] ${
                  formData.deliveryDate && formData.deliveryDate < minDate ? "border-red-500/80 focus:border-red-500/80" : ""
                }`}
              />
              <p className="text-amber-400/80 text-[0.65rem] mt-1.5 italic">
                Note: Deliveries require a minimum of 24 hours advance notice.
              </p>
            </div>

            <div>
              <label className={labelClass}>Gift message (optional)</label>
              <textarea
                rows={2}
                placeholder="Write a personal note..."
                value={formData.giftMessage}
                onChange={(e) => updateField("giftMessage", e.target.value)}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          {/* ─── Error ─── */}
          {error && (
            <p className="text-red-400 text-xs mt-3 mb-1 text-center">{error}</p>
          )}

          {/* ─── Buttons ─── */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`mt-4 bg-amber-400 text-black font-bold rounded-xl py-3 w-full transition-opacity hover:opacity-90 text-sm ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? "Creating Order..." : "Complete Order on Kapruka →"}
          </button>
        </>
      ) : (
        /* ─── Success State ─── */
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="flex flex-col items-center text-center mt-2"
        >
          <span className="text-3xl text-amber-400 mb-2">✓</span>
          <p className="text-slate-200 text-[0.95rem]">
            Redirecting to Kapruka...
          </p>
        </motion.div>
      )}
    </div>
  );
}
