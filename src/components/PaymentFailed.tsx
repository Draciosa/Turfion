import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle, RefreshCw, Home } from "lucide-react";

const PaymentFailed: React.FC = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const errorMessage = state?.error || "We couldn't process your payment at this time.";

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-orange-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-10 lg:p-16 text-center">
          {/* Icon */}
          <div className="w-28 h-28 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-in fade-in zoom-in duration-500">
            <AlertCircle className="w-16 h-16 text-red-600" />
          </div>

          {/* Title */}
          <h1 className="text-5xl font-extrabold text-gray-900 mb-6">
            Payment Failed
          </h1>

          {/* Error Message */}
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 mb-10">
            <p className="text-xl text-red-800 font-medium leading-relaxed">
              {errorMessage}
            </p>
          </div>

          {/* Helpful Guidance */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-8 mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">What you can do next:</h3>
            <ul className="space-y-5 text-left text-lg text-gray-700">
              <li className="flex items-start gap-4">
                <RefreshCw className="w-7 h-7 text-blue-600 flex-shrink-0 mt-1" />
                <span>
                  <strong>Try again</strong> with the same or different payment method
                </span>
              </li>
              <li className="flex items-start gap-4">
                <AlertCircle className="w-7 h-7 text-orange-600 flex-shrink-0 mt-1" />
                <span>
                  Check your card details, balance, or internet connection
                </span>
              </li>
              <li className="flex items-start gap-4">
                <Home className="w-7 h-7 text-green-600 flex-shrink-0 mt-1" />
                <span>
                  Your booking is <strong>still reserved</strong> for a short time — complete payment soon!
                </span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-xl hover:shadow-2xl text-xl"
            >
              <RefreshCw className="w-7 h-7" />
              Try Payment Again
            </button>

            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center justify-center gap-3 px-10 py-5 border-4 border-gray-300 text-gray-800 font-bold rounded-2xl hover:bg-gray-50 transition-all duration-300 text-xl"
            >
              <Home className="w-7 h-7" />
              Back to Home
            </button>
          </div>

          {/* Support Note */}
          <p className="mt-12 text-gray-500 text-lg">
            Need help? Contact support at{' '}
            <a href="mailto:support@turfion.com" className="text-blue-600 font-semibold hover:underline">
              support@turfion.com
            </a>
          </p>
        </div>

        {/* Decorative Background Element */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-20 left-10 w-96 h-96 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
          <div className="absolute top-40 right-10 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;