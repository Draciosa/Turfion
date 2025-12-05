import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Download, ArrowLeft } from "lucide-react";
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
    const fetchBookingData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const bookingDoc = await getDoc(doc(db, "bookings", id));
        if (bookingDoc.exists()) {
          const bookingData: any = bookingDoc.data();
          const cardDoc = await getDoc(doc(db, "cards", bookingData.cardId));
          let cardData: any = {};
          if (cardDoc.exists()) cardData = cardDoc.data();
          const userDoc = await getDoc(doc(db, "users", bookingData.userId));
          let userEmail = "user@example.com";
          if (userDoc.exists()) userEmail = userDoc.data()?.email || userEmail;
          const timeSlots: string[] =
            bookingData.timeSlotsArray || bookingData.timeSlot?.split(",") || [];
          const pricePerHour = cardData?.pricePerHour || 0;
          const totalAmount = pricePerHour * timeSlots.length;

          setBooking({
            id: bookingDoc.id,
            cardTitle: cardData?.title || "Unknown Card",
            cardType: cardData?.type || "Unknown Type",
            date: bookingData.date,
            timeSlots,
            pricePerHour,
            totalAmount,
            userEmail,
            bookingTime: bookingData.bookingTime?.toDate?.() || new Date(),
            location: cardData?.location || "",
            paymentMethod: bookingData.paymentMethod || "Unknown",
          });
        } else {
          console.error("Booking not found");
        }
      } catch (error) {
        console.error("Error fetching booking:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBookingData();
  }, [id]);

  useEffect(() => {
    if (booking) generateReceiptImage();
  }, [booking]);

  const generateReceiptImage = async () => {
    if (!booking) return;
    try {
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      tempDiv.style.width = "400px";
      tempDiv.style.padding = "20px";
      tempDiv.style.backgroundColor = "white";
      tempDiv.style.fontFamily = "Arial, sans-serif";

      tempDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #059669; margin: 0;">Booking Confirmed!</h2>
          <p style="color: #6b7280; margin: 5px 0;">Akxtral</p>
        </div>
        <div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">${booking.cardTitle}</h3>
          <p style="margin: 5px 0; color: #6b7280;"><strong>Type:</strong> ${booking.cardType}</p>
          <p style="margin: 5px 0; color: #6b7280;"><strong>Date:</strong> ${formatDate(booking.date)}</p>
          <p style="margin: 5px 0; color: #6b7280;"><strong>Time:</strong> ${booking.timeSlots.join(", ")}</p>
          ${booking.location ? `<p style="margin: 5px 0; color: #6b7280;"><strong>Location:</strong> ${booking.location}</p>` : ""}
          <p style="margin: 5px 0; color: #6b7280;"><strong>Payment Method:</strong> ${booking.paymentMethod}</p>
        </div>
        <div style="border-top: 1px solid #e5e7eb; padding-top: 15px;">
          <p style="margin: 5px 0; color: #6b7280;"><strong>Total Amount:</strong> <span style="color: #059669; font-size: 18px;">₹${booking.totalAmount}</span></p>
          <p style="margin: 5px 0; color: #6b7280; font-size: 12px;">Booking ID: ${booking.id.slice(-8).toUpperCase()}</p>
          <p style="margin: 5px 0; color: #6b7280; font-size: 12px;">Booked by: ${booking.userEmail}</p>
          <p style="margin: 5px 0; color: #6b7280; font-size: 12px;">Booked: ${formatTime(booking.bookingTime)}</p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding: 10px; background-color: #f3f4f6; border-radius: 8px;">
          <p style="margin: 0; font-size: 12px; color: #6b7280;">Show this receipt at the venue</p>
        </div>
      `;

      document.body.appendChild(tempDiv);
      const canvas = await html2canvas(tempDiv, { backgroundColor: "#ffffff", scale: 2 });
      document.body.removeChild(tempDiv);

      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            const filename = `booking-receipt-${booking.id}.png`;
            const storageRef = ref(storage, `receipts/${booking.id}.png`);
            await uploadBytes(storageRef, blob, {
              contentType: "image/png",
              contentDisposition: `attachment; filename="${filename}"`,
            });
            const downloadURL = await getDownloadURL(storageRef);
            setReceiptImageUrl(downloadURL);
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(downloadURL)}`;
            setQrCodeUrl(qrUrl);
          } catch (error) {
            console.error("Error uploading receipt image:", error);
            const fallbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/receipt/${booking.id}`)}`;
            setQrCodeUrl(fallbackQrUrl);
          }
        }
      }, "image/png");
    } catch (error) {
      console.error("Error generating receipt image:", error);
      const fallbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/receipt/${booking.id}`)}`;
      setQrCodeUrl(fallbackQrUrl);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const handleDownload = () => {
    if (!receiptImageUrl || !booking) {
      alert("Receipt image not available yet.");
      return;
    }
    try {
      const filename = `booking-receipt-${booking.id}.png`;
      const link = document.createElement("a");
      link.href = receiptImageUrl;
      link.setAttribute("download", filename);
      link.setAttribute("rel", "noopener");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error triggering download link:", error);
      alert("Failed to trigger download. Please open the image and save it manually.");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-600 text-lg">Booking Not Found</p>
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
        onClick={() => navigate("/")}
        className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to home
      </button>
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-green-600 mb-4">Booking Receipt</h1>
        <div className="space-y-6">
          <div className="border p-4 rounded-lg space-y-2">
            <p><strong>Card:</strong> {booking.cardTitle}</p>
            <p><strong>Type:</strong> {booking.cardType}</p>
            {booking.location && <p><strong>Location:</strong> {booking.location}</p>}
            <p><strong>Date:</strong> {formatDate(booking.date)}</p>
            <p><strong>Time Slots:</strong> {booking.timeSlots.join(", ")}</p>
            <p><strong>Payment Method:</strong> {booking.paymentMethod}</p>
          </div>
          <div className="border p-4 rounded-lg space-y-2">
            <p><strong>Price per Hour:</strong> ₹{booking.pricePerHour}</p>
            <p><strong>Total Slots:</strong> {booking.timeSlots.length}</p>
            <p className="text-green-600 font-semibold"><strong>Total Amount:</strong> ₹{booking.totalAmount}</p>
          </div>
          <div className="border p-4 rounded-lg space-y-2 text-sm">
            <p><strong>Booking ID:</strong> {booking.id.slice(-8).toUpperCase()}</p>
            <p><strong>Booked by:</strong> {booking.userEmail}</p>
            <p><strong>Booking Time:</strong> {formatTime(booking.bookingTime)}</p>
          </div>
          {qrCodeUrl && (
            <div className="text-center">
              <img src={qrCodeUrl} alt="QR Code" className="mx-auto border rounded" />
              <p className="mt-2 text-sm text-gray-600">Scan to view receipt</p>
            </div>
          )}
          <div className="flex">
            <button
              onClick={handleDownload}
              className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 flex items-center justify-center"
            >
              <Download className="w-4 h-4 mr-1" /> Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Receipt;