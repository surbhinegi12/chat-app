"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MdOutlineLocalPhone } from "react-icons/md";
import { FaRegUser } from "react-icons/fa";
import { supabase } from "../../lib/supabase";

const STATIC_OTP = "123456";

export default function AuthPage() {
  const router = useRouter();

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [fullName, setFullName] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [status, setStatus] = useState<null | {
    type: "success" | "error" | "loading";
    message: string;
  }>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  const isMobileValid = /^\d{10}$/.test(mobile);
  const showMobileError = mobile.length > 0 && !isMobileValid;
  const isOtpComplete = otp.every((digit) => digit.match(/^\d$/));
  const isOtpValid = otp.join("") === STATIC_OTP;

  //Send otp and start countdown
  const sendOtp = () => {
    if (!isMobileValid) return;
    setStatus({
      type: "success",
      message: `OTP sent to +91 ${mobile}`,
    });
    setResendCountdown(10);

    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setStatus(null); // Hide the message when countdown ends
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCountdown === 0) return;
    const timer = setInterval(() => {
      setResendCountdown((count) => {
        if (count <= 1) {
          clearInterval(timer);
          return 0;
        }
        return count - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCountdown]);

  // Send OTP on mobile valid change
  useEffect(() => {
    if (isMobileValid) {
      sendOtp();
    } else {
      setStatus(null);
      setResendCountdown(0);
    }
  }, [isMobileValid, mobile]);

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

  const clearOtpInputs = () => {
    setOtp(Array(6).fill(""));
    otpRefs.current[0]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOtpValid) {
      setStatus({
        type: "error",
        message: "Invalid OTP.",
      });
      clearOtpInputs();
      return;
    }

    setStatus({
      type: "loading",
      message: tab === "signup" ? "Creating account..." : "Logging in...",
    });

    try {
      if (tab === "signin") {
        // Check if user exists and get their details
        const { data: user, error: checkError } = await supabase
          .from("users")
          .select("*")
          .eq("mobile_number", `+91${mobile}`)
          .single();

        if (!user || checkError) {
          setStatus({
            type: "error",
            message: "Please sign up first.",
          });
          return;
        }

        // Store user info in localStorage
        localStorage.setItem("user", JSON.stringify(user));
      }

      if (tab === "signup") {
        // Check if user already exists
        const { data: existingUser, error: checkError } = await supabase
          .from("users")
          .select("id")
          .eq("mobile_number", `+91${mobile}`)
          .single();

        if (existingUser) {
          setStatus({
            type: "error",
            message: "Account already exists with this mobile number.",
          });
          return;
        }

        // Create user profile
        const { data: newUser, error: insertError } = await supabase
          .from("users")
          .insert({
            mobile_number: `+91${mobile}`,
            full_name: fullName,
            role: "member",
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Store user info in localStorage
        localStorage.setItem("user", JSON.stringify(newUser));
      }

      setStatus({ type: "success", message: "Logging you in" });

      // Wait for the status message to be visible
      await new Promise((resolve) => setTimeout(resolve, 1000));

      router.push("/chats");
    } catch (err: any) {
      console.error("Submit Error:", err);
      setStatus({
        type: "error",
        message: err.message || "Something went wrong.",
      });
    }
  };

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      <section className="w-full max-w-md rounded-xl bg-white shadow-lg overflow-hidden">
        {/* Header */}
        <header
          className="flex flex-col items-center justify-center py-6 px-4"
          style={{
            background:
              "linear-gradient(135deg, #14843E, #169D47, #14823E, #159B48)",
          }}
        >
          <div className="bg-white rounded-full p-1 shadow-md mb-3">
            <img alt="Logo" src="/logo.png" className="h-14 w-14" />
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
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Full Name */}
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
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Enter your full name"
                    className="pl-10 block w-full rounded-md border border-green-300 px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#169D47]"
                  />
                </div>
              </div>
            )}

            {/* Mobile Number */}
            <div>
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
              <div className="grid grid-cols-6 gap-3 justify-center mb-3">
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
                        : "bg-white text-gray-900 border border-green-300 focus:outline-none focus:ring-2 focus:ring-[#169D47]"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-center text-sm text-gray-500 mb-1">
                <span>Didn't receive OTP?</span>
                <button
                  type="button"
                  disabled={resendCountdown > 0}
                  onClick={sendOtp}
                  className={`ml-1 font-semibold text-[#159B48] hover:text-[#14843E] ${
                    resendCountdown > 0
                      ? "text-green-300 cursor-not-allowed hover:text-green-300"
                      : ""
                  }`}
                >
                  {resendCountdown > 0
                    ? `Resend in ${resendCountdown}s`
                    : "Resend"}
                </button>
              </div>

              {/* Status Message */}
              {status && (
                <div
                  className={`mt-3 text-sm px-4 py-2 rounded-md text-center font-medium ${
                    status.type === "success"
                      ? "bg-green-100 text-green-700"
                      : status.type === "error"
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700 flex items-center justify-center space-x-2"
                  }`}
                >
                  {status.type === "loading" && (
                    <svg
                      className="animate-spin h-5 w-5 text-blue-700"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      ></path>
                    </svg>
                  )}
                  <span>{status.message}</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={!isMobileValid || !isOtpComplete}
                className={`w-full flex justify-center rounded-md px-4 py-2 font-semibold text-white focus:ring-2 focus:ring-offset-2 focus:ring-[#159B48] ${
                  !isMobileValid || !isOtpComplete
                    ? "bg-green-600 cursor-not-allowed opacity-60"
                    : "bg-[#169D47] hover:bg-[#14823E]"
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
