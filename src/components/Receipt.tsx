import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Download, ArrowLeft, CheckCircle, Calendar, Clock, MapPin, CreditCard, QrCode } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db, storage } from "../lib/firebase";
import html2canvas from "html2canvas";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface Booking {
  id: string;
  cardTitle: string;
  cardType: string;
  date: string;
  timeSlots: string[];
  pricePerHour: number;
  totalAmount: number;
  userEmail: string;
  bookingTime: Date;
  location?: string;
  paymentMethod?: string;
}

const Receipt: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [receiptImageUrl, setReceiptImageUrl] = useState("");

  useEffect(() => {
    const fetchBooking = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const bookingSnap = await getDoc(doc(db, "bookings", id));
        if (!bookingSnap.exists()) {
          setLoading(false);
          return;
        }

        const data = bookingSnap.data();
        const cardSnap = await getDoc(doc(db, "cards", data.cardId));
        const cardData = cardSnap.exists() ? cardSnap.data() : {};

        const timeSlots = Array.isArray(data.timeSlotsArray)
          ? data.timeSlotsArray
          : typeof data.timeSlot === "string"
          ? data.timeSlot.split(",").map((s: string) => s.trim())
          : [];

        setBooking({
          id: bookingSnap.id,
          cardTitle: cardData.title || "Unknown Venue",
          cardType: cardData.type || "Sports",
          date: data.date,
          timeSlots,
          pricePerHour: cardData.pricePerHour || 0,
          totalAmount: (cardData.pricePerHour || 0) * timeSlots.length,
          userEmail: data.userEmail || "user@turfion.com",
          bookingTime: data.bookingTime?.toDate() || new Date(),
          location: cardData.location,
          paymentMethod: data.paymentMethod || "Online",
        });
      } catch (err) {
        console.error("Error fetching receipt:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [id]);

  useEffect(() => {
    if (booking) generateReceiptImage();
  }, [booking]);

  const generateReceiptImage = async () => {
    if (!booking) return;

    const receiptElement = document.createElement("div");
    receiptElement.style.width = "420px";
    receiptElement.style.padding = "32px";
    receiptElement.style.background = "white";
    receiptElement.style.fontFamily = "'Inter', sans-serif";
    receiptElement.style.boxShadow = "0 10px 30px rgba(0,0,0,0.1)";
    receiptElement.style.borderRadius = "24px";

    receiptElement.innerHTML = `
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 32px; font-weight: 800; color: #10b981; margin: 0;">Booking Confirmed!</h1>
        <p style="color: #6b7280; font-size: 18px; margin: 8px 0;">TURFION</p>
      </div>

      <div style="background: #f9fafb; border-radius: 20px; padding: 24px; margin-bottom: 24px; border: 2px solid #e5e7eb;">
        <h2 style="font-size: 24px; font-weight: 700; color: #1f2937; margin: 0 0 16px;">${booking.cardTitle}</h2>
        <div style="space-y: 12px; color: #4b5563; font-size: 16px;">
          <p><strong>Type:</strong> ${booking.cardType}</p>
          <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          <p><strong>Time:</strong> ${booking.timeSlots.join(" - ")}</p>
          ${booking.location ? `<p><strong>Location:</strong> ${booking.location}</p>` : ""}
          <p><strong>Payment:</strong> ${booking.paymentMethod}</p>
        </div>
      </div>

      <div style="border-top: 2px dashed #e5e7eb; padding-top: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <p style="color: #6b7280; font-size: 16px;">Total Amount</p>
            <p style="font-size: 36px; font-weight: 800; color: #10b981;">₹${booking.totalAmount}</p>
          </div>
          <div style="text-align: right;">
            <p style="color: #6b7280; font-size: 14px;">Booking ID</p>
            <p style="font-weight: 700; color: #1f2937;">${booking.id.slice(-8).toUpperCase()}</p>
          </div>
        </div>
      </div>

      <div style="margin-top: 32px; padding: 16px; background: #ecfdf5; border-radius: 16px; text-align: center;">
        <p style="color: #065f46; font-weight: 600;">Show this receipt at the venue</p>
      </div>
    `;

    document.body.appendChild(receiptElement);

    try {
      const canvas = await html2canvas(receiptElement, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
      });

      document.body.removeChild(receiptElement);

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        try {
          const storageRef = ref(storage, `receipts/${id}.png`);
          await uploadBytes(storageRef, blob);
          const url = await getDownloadURL(storageRef);
          setReceiptImageUrl(url);

          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
          setQrCodeUrl(qrUrl);
        } catch (uploadErr) {
          console.error("Upload failed, using fallback QR:", uploadErr);
          const fallbackQr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.href)}`;
          setQrCodeUrl(fallbackQr);
        }
      });
    } catch (err) {
      console.error("Canvas generation failed:", err);
      document.body.removeChild(receiptElement);
      const fallbackQr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.href)}`;
      setQrCodeUrl(fallbackQr);
    }
  };

  const handleDownload = () => {
    if (!receiptImageUrl) {
      alert("Receipt is still generating. Please wait a moment.");
      return;
    }

    const link = document.createElement("a");
    link.href = receiptImageUrl;
    link.download = `turfion-receipt-${id}.png`;
    link.click();
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-green-600 mb-6" />
          <p className="text-2xl font-semibold text-gray-700">Preparing your receipt...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
          <AlertTriangle className="w-20 h-20 text-red-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Booking Not Found</h2>
          <p className="text-gray-600 mb-8">The receipt you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all"
          >
            <Home className="w-6 h-6" />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="inline-flex items-center gap-4">
            <CheckCircle className="w-16 h-16 text-green-600" />
            <h1 className="text-5xl font-extrabold text-gray-900">Booking Confirmed!</h1>
          </div>
          <p className="text-2xl text-gray-700 mt-4">Your slot is reserved</p>
        </div>

        {/* Receipt Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-white text-center">
            <h2 className="text-3xl font-bold">TURFION</h2>
            <p className="text-green-100 text-lg mt-2">Official Booking Receipt</p>
          </div>

          <div className="p-10 space-y-8">
            {/* Venue Info */}
            <div className="text-center">
              <h3 className="text-3xl font-bold text-gray-900">{booking.cardTitle}</h3>
              <p className="text-xl text-gray-600 mt-2">{booking.cardType}</p>
              {booking.location && (
                <div className="flex items-center justify-center gap-2 mt-4 text-gray-600">
                  <MapPin className="w-5 h-5" />
                  <span>{booking.location}</span>
                </div>
              )}
            </div>

            {/* Booking Details */}
            <div className="bg-gray-50 rounded-2xl p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Calendar className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="text-xl font-semibold">{formatDate(booking.date)}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Clock className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Time</p>
                    <p className="text-xl font-semibold">
                      {booking.timeSlots[0]} – {booking.timeSlots[booking.timeSlots.length - 1]}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CreditCard className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Payment Method</p>
                    <p className="text-xl font-semibold">{booking.paymentMethod}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 text-center">
              <p className="text-lg text-gray-600">Total Amount Paid</p>
              <p className="text-6xl font-extrabold text-green-600 mt-4">₹{booking.totalAmount}</p>
            </div>

            {/* Booking Info */}
            <div className="text-center text-sm text-gray-500 space-y-2">
              <p>Booking ID: <span className="font-mono font-bold">{booking.id.slice(-8).toUpperCase()}</span></p>
              <p>Booked by: {booking.userEmail}</p>
              <p>Booked on: {booking.bookingTime.toLocaleString()}</p>
            </div>

            {/* QR Code */}
            {qrCodeUrl && (
              <div className="text-center">
                <div className="inline-block bg-white p-6 rounded-3xl shadow-xl">
                  <img src={qrCodeUrl} alt="Receipt QR Code" className="w-48 h-48" />
                </div>
                <p className="mt-4 text-gray-600 font-medium">Scan to view receipt anytime</p>
              </div>
            )}

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={!receiptImageUrl}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-6 rounded-2xl text-xl transition-all duration-300 shadow-xl hover:shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-4"
            >
              <Download className="w-8 h-8" />
              {receiptImageUrl ? 'Download Receipt' : 'Generating Receipt...'}
            </button>

            <p className="text-center text-gray-600 mt-8">
              Show this receipt at the venue entrance
            </p>
          </div>
        </div>

        {/* Support */}
        <p className="text-center text-gray-600 mt-12 text-lg">
          Questions? Contact us at{' '}
          <a href="mailto:support@turfion.com" className="text-blue-600 font-semibold hover:underline">
            support@turfion.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default Receipt;