import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, QrCode, Smartphone } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { functions, db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import QRCode from "react-qr-code";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Checkout: React.FC = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upiQR" | "upiID" | null>(null);
  const [upiId, setUpiId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [qrCodeData, setQrCodeData] = useState("");
  const [isValidBooking, setIsValidBooking] = useState(false);
  const [isCheckingBooking, setIsCheckingBooking] = useState(true);

  const {
    bookingId,
    orderId,
    totalAmount,
    cardId,
    cardTitle,
    date,
    timeSlots,
    pricePerHour,
    currency,
    keyId,
  } = state || {};

  useEffect(() => {
    const validateBooking = async () => {
      if (!user) {
        setError("Please log in to proceed with payment");
        setTimeout(() => navigate("/"), 3000);
        setIsCheckingBooking(false);
        return;
      }

      if (!bookingId || !orderId || !totalAmount || !cardId || !date || !timeSlots) {
        setError("Invalid or missing booking details");
        setTimeout(() => navigate("/"), 3000);
        setIsCheckingBooking(false);
        return;
      }

      try {
        const bookingDoc = await getDoc(doc(db, "bookings", bookingId));
        if (!bookingDoc.exists()) {
          setError("Booking not found");
          setTimeout(() => navigate("/"), 3000);
          setIsCheckingBooking(false);
          return;
        }

        const bookingData = bookingDoc.data();
        if (bookingData.userId !== user.uid) {
          setError("Unauthorized access to this booking");
          setTimeout(() => navigate("/"), 3000);
          setIsCheckingBooking(false);
          return;
        }

        if (bookingData.paid) {
          setError("This booking has already been paid");
          setTimeout(() => navigate(`/receipt/${bookingId}`), 3000);
          setIsCheckingBooking(false);
          return;
        }

        // Normalize and compare booking details
        const storedTimeSlots = Array.isArray(bookingData.timeSlotsArray)
          ? bookingData.timeSlotsArray.sort()
          : typeof bookingData.timeSlot === "string"
          ? bookingData.timeSlot.split(",").sort()
          : [];
        const stateTimeSlots = Array.isArray(timeSlots) ? [...timeSlots].sort() : [];

        const isTimeSlotsMatch = storedTimeSlots.length === stateTimeSlots.length &&
          storedTimeSlots.every((slot: string, index: number) => slot === stateTimeSlots[index]);

        if (
          bookingData.cardId !== cardId ||
          bookingData.date !== date ||
          !isTimeSlotsMatch ||
          bookingData.totalAmount !== totalAmount
        ) {
          console.error("Booking details mismatch:", {
            firestore: {
              cardId: bookingData.cardId,
              date: bookingData.date,
              timeSlots: storedTimeSlots,
              totalAmount: bookingData.totalAmount,
            },
            state: {
              cardId,
              date,
              timeSlots: stateTimeSlots,
              totalAmount,
            },
          });
          setError("Booking details do not match");
          setTimeout(() => navigate("/"), 3000);
          setIsCheckingBooking(false);
          return;
        }

        setIsValidBooking(true);
      } catch (err) {
        console.error("Error validating booking:", err);
        setError("Failed to validate booking. Please try again.");
        setTimeout(() => navigate("/"), 3000);
      } finally {
        setIsCheckingBooking(false);
      }
    };

    validateBooking();
  }, [bookingId, orderId, totalAmount, cardId, date, timeSlots, user, navigate]);

  const handlePayment = async (method: "card" | "upiQR" | "upiID") => {
    if (!user) {
      setError("Please log in to proceed with payment");
      return;
    }
    if (!isValidBooking) {
      setError("Invalid booking. Please try again.");
      return;
    }
    setPaymentMethod(method);
    setError("");
    setLoading(true);

    try {
      if (method === "card") {
        const options = {
          key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: totalAmount * 100, // In paise
          currency: currency || "INR",
          order_id: orderId,
          name: "Turfion Booking",
          description: `Booking for ${cardTitle}`,
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            try {
              const verifyPayment = httpsCallable(functions, "verifyPayment");
              const verifyResponse: any = await verifyPayment({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              });

              if (verifyResponse.data.success) {
                await updateDoc(doc(db, "bookings", bookingId), {
                  paid: true,
                  paymentId: response.razorpay_payment_id,
                  paymentMethod: "card",
                });
                navigate(`/receipt/${bookingId}`);
              } else {
                setError("Payment verification failed. Please contact support.");
                navigate("/payment-failed", { state: { error: verifyResponse.data.error } });
              }
            } catch (err) {
              console.error("Error verifying payment:", err);
              setError("Payment verification failed. Please try again.");
              navigate("/payment-failed", { state: { error: "Verification failed" } });
            }
          },
          prefill: {
            name: userProfile?.displayName || user.email || "",
            email: user.email || "",
          },
          theme: { color: "#6366F1" },
          method: { card: true, upi: false, netbanking: false },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", () => {
          setError("Payment failed. Please try again.");
          navigate("/payment-failed", { state: { error: "Payment declined by provider" } });
        });
        rzp.open();
      } else if (method === "upiQR") {
        const qrData = `upi://pay?pa=${import.meta.env.VITE_UPI_ID}&pn=Turfion&tr=${orderId}&am=${totalAmount}&cu=INR`;
        setQrCodeData(qrData);

        const verifyPayment = httpsCallable(functions, "verifyPayment");
        const maxAttempts = 30;
        let attempts = 0;

        const poll = setInterval(async () => {
          attempts++;
          try {
            const verifyResponse: any = await verifyPayment({ order_id: orderId });
            if (verifyResponse.data.success) {
              await updateDoc(doc(db, "bookings", bookingId), {
                paid: true,
                paymentId: verifyResponse.data.paymentId || orderId,
                paymentMethod: "upiQR",
              });
              clearInterval(poll);
              navigate(`/receipt/${bookingId}`);
            } else if (attempts >= maxAttempts) {
              clearInterval(poll);
              setError("Payment not confirmed within time limit.");
              navigate("/payment-failed", { state: { error: "Payment timeout" } });
            }
          } catch (err) {
            console.error("Error polling payment:", err);
            if (attempts >= maxAttempts) {
              clearInterval(poll);
              setError("Payment verification failed.");
              navigate("/payment-failed", { state: { error: "Verification failed" } });
            }
          }
        }, 10000);
      } else if (method === "upiID") {
        if (!upiId) {
          setError("Please enter a valid UPI ID");
          setLoading(false);
          return;
        }
        const qrData = `upi://pay?pa=${upiId}&pn=Turfion&tr=${orderId}&am=${totalAmount}&cu=INR`;
        setQrCodeData(qrData);

        const verifyPayment = httpsCallable(functions, "verifyPayment");
        const maxAttempts = 30;
        let attempts = 0;

        const poll = setInterval(async () => {
          attempts++;
          try {
            const verifyResponse: any = await verifyPayment({ order_id: orderId });
            if (verifyResponse.data.success) {
              await updateDoc(doc(db, "bookings", bookingId), {
                paid: true,
                paymentId: verifyResponse.data.paymentId || orderId,
                paymentMethod: "upiID",
              });
              clearInterval(poll);
              navigate(`/receipt/${bookingId}`);
            } else if (attempts >= maxAttempts) {
              clearInterval(poll);
              setError("Payment not confirmed within time limit.");
              navigate("/payment-failed", { state: { error: "Payment timeout" } });
            }
          } catch (err) {
            console.error("Error polling payment:", err);
            if (attempts >= maxAttempts) {
              clearInterval(poll);
              setError("Payment verification failed.");
              navigate("/payment-failed", { state: { error: "Verification failed" } });
            }
          }
        }, 10000);
      }
    } catch (err) {
      console.error("Error processing payment:", err);
      setError("Failed to initiate payment. Please try again.");
      navigate("/payment-failed", { state: { error: "Payment initiation failed" } });
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingBooking) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!isValidBooking) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-600 text-lg">{error || "Invalid booking or payment details"}</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate(`/card/${cardId}`)}
        className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200 font-medium"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to card details
      </button>
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Checkout</h1>
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <span className="text-sm sm:text-base">{error}</span>
          </div>
        )}
        <div className="mb-8">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Booking Summary</h2>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm sm:text-base">
            <p><span className="font-medium">Card:</span> {cardTitle}</p>
            <p><span className="font-medium">Date:</span> {new Date(date).toLocaleDateString()}</p>
            <p><span className="font-medium">Time Slots:</span> {timeSlots.join(", ")}</p>
            <p><span className="font-medium">Total Slots:</span> {timeSlots.length}</p>
            <p><span className="font-medium">Price per Hour:</span> ₹{pricePerHour}</p>
            <p><span className="font-medium">Total Amount:</span> <span className="text-green-600 font-bold">₹{totalAmount}</span></p>
          </div>
        </div>
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Select Payment Method</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => handlePayment("card")}
            disabled={loading}
            className="flex flex-col items-center p-4 bg-blue-100 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CreditCard className="w-8 h-8 mb-2 text-blue-600" />
            <span>Pay with Card</span>
          </button>
          <button
            onClick={() => handlePayment("upiQR")}
            disabled={loading}
            className="flex flex-col items-center p-4 bg-green-100 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <QrCode className="w-8 h-8 mb-2 text-green-600" />
            <span>Pay with UPI QR</span>
          </button>
          <button
            onClick={() => setPaymentMethod("upiID")}
            disabled={loading}
            className="flex flex-col items-center p-4 bg-purple-100 rounded-lg hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Smartphone className="w-8 h-8 mb-2 text-purple-600" />
            <span>Pay with UPI ID</span>
          </button>
        </div>
        {paymentMethod === "upiID" && (
          <div className="mb-8">
            <input
              type="text"
              placeholder="Enter your UPI ID (e.g., name@upi)"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg mb-4"
            />
            <button
              onClick={() => handlePayment("upiID")}
              disabled={loading || !upiId}
              className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : "Pay Now"}
            </button>
          </div>
        )}
        {paymentMethod === "upiQR" && qrCodeData && (
          <div className="text-center">
            <h3 className="text-lg font-medium mb-4">Scan to Pay</h3>
            <QRCode value={qrCodeData} size={200} />
            <p className="mt-4 text-sm text-gray-600">Scan the QR code with your UPI app. Payment will be verified automatically.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;