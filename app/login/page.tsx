"use client";

import { useRef, useState } from "react";
import { MdOutlineLocalPhone } from "react-icons/md";
import { FaRegUser } from "react-icons/fa";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AuthPage() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState(Array(6).fill(""));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isMobileValid = /^\d{10}$/.test(mobile);
  const showMobileError = mobile.length > 0 && !isMobileValid;
  const isOtpComplete = otp.every((digit) => digit.match(/^\d$/));

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < otp.length - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      <section className="w-full max-w-md rounded-xl bg-white shadow-lg overflow-hidden">
        <header
          className="flex flex-col items-center justify-center py-6 px-4"
          style={{
            background:
              "linear-gradient(135deg, #14843E, #169D47, #14823E, #159B48)",
          }}
        >
          <div className="bg-white rounded-full p-1 shadow-md mb-3">
            <img alt="Your Company" src="/logo.png" className="h-14 w-14" />
          </div>
          <h1 className="text-center text-2xl font-bold text-white mb-2">
            Periskope Team Chat
          </h1>
          <p className="font-bold text-white text-sm">
            Connect with your team instantly
          </p>
        </header>

        {/* Tab Navigation */}
        <nav className="flex justify-between px-6 pt-4">
          <button
            className={`w-1/2 py-2 font-semibold rounded-t-md ${
              tab === "signin"
                ? "text-green-700 border-b-2 border-green-500"
                : "text-gray-500"
            }`}
            onClick={() => setTab("signin")}
          >
            Sign In
          </button>
          <button
            className={`w-1/2 py-2 font-semibold rounded-t-md ${
              tab === "signup"
                ? "text-green-700 border-b-2 border-green-500"
                : "text-gray-500"
            }`}
            onClick={() => setTab("signup")}
          >
            Sign Up
          </button>
        </nav>

        {/* Form */}
        <section className="px-6 pt-4 pb-8">
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              alert(
                `Submitting ${tab} with Mobile: ${mobile} OTP: ${otp.join("")}`
              );
            }}
          >
            {/* Full Name (Sign Up) */}
            {tab === "signup" && (
              <div>
                <label
                  htmlFor="fullname"
                  className="block text-sm font-bold text-gray-900 mb-1"
                >
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-green-500">
                    <FaRegUser className="h-5 w-5" />
                  </span>
                  <input
                    id="fullname"
                    name="fullname"
                    type="text"
                    required
                    placeholder="Enter your full name"
                    className="pl-10 block w-full rounded-md border border-green-300 px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#169D47]"
                  />
                </div>
              </div>
            )}

            {/* Mobile Number */}
            <div className="relative">
              <label
                htmlFor="mobile"
                className="block text-sm font-bold text-gray-900 mb-1"
              >
                Mobile Number
              </label>
              <div className="relative h-12">
                <span className="absolute left-0 top-1/2 transform -translate-y-1/2 pl-3 text-green-500 pointer-events-none">
                  <MdOutlineLocalPhone className="h-5 w-5" />
                </span>
                <input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setMobile(val);
                  }}
                  required
                  placeholder="Enter your mobile number"
                  className={`pl-10 h-full w-full rounded-md bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-0 border ${
                    showMobileError
                      ? "border-red-400"
                      : "border-green-300 focus:border-[#169D47]"
                  }`}
                />
              </div>
              {showMobileError && (
                <p className="mt-1 text-xs text-red-600">
                  Please enter a valid 10-digit mobile number.
                </p>
              )}
            </div>

            {/* OTP */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">
                OTP
              </label>
              <div className="grid grid-cols-6 gap-4 justify-center mb-3">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    disabled={!isMobileValid}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(e, i)}
                    className={`h-14 w-full text-center rounded-md text-xl ${
                      !isMobileValid
                        ? "bg-gray-100 text-gray-400 border border-gray-200"
                        : "bg-white border border-green-300 focus:outline-none focus:ring-2 focus:ring-[#169D47]"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-center text-sm text-gray-500 mb-1">
                <span>Didn't receive OTP?</span>
                <a
                  href="#"
                  className="ml-1 font-semibold text-[#159B48] hover:text-[#14843E]"
                >
                  Resend
                </a>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={!isMobileValid || !isOtpComplete}
                className={`w-full flex justify-center rounded-md px-4 py-2 font-semibold text-white focus:ring-2 focus:ring-offset-2 ${
                  !isMobileValid || !isOtpComplete
                    ? "bg-green-600 cursor-not-allowed opacity-70"
                    : "bg-[#169D47] hover:bg-[#14823E] focus:ring-[#159B48]"
                }`}
              >
                {tab === "signin" ? "Sign In" : "Create Account"}
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
