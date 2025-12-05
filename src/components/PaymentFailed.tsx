import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PaymentFailed: React.FC = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const errorMessage = state?.error || "An unknown error occurred during payment.";

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate("/")}
        className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to home
      </button>
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Payment Failed</h1>
        <p className="text-gray-600 mb-6">{errorMessage}</p>
        <p className="text-gray-600 mb-6">Please try again or contact support if the issue persists.</p>
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Return Home
        </button>
      </div>
    </div>
  );
};

export default PaymentFailed;