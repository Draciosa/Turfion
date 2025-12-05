import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  Unsubscribe,
} from "firebase/firestore";
import { db, functions } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { httpsCallable } from "firebase/functions";

interface CardData {
  id: string;
  title: string;
  imageUrl: string;
  type: string;
  openingTime: string; // "09:00"
  closingTime: string; // "22:00"
  pricePerHour: number;
  location: string;
  description: string;
  userId: string;
  assignedHost?: string | null;
}

interface Booking {
  timeSlotsArray: string[];
  paid: boolean;
}

const BookingCalendar: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Generate 24-hour time slots (e.g., "09:00", "10:00")
  const generateTimeSlots = (opening: string, closing: string): string[] => {
    const slots: string[] = [];
    const [openHour] = opening.split(":").map(Number);
    let [closeHour] = closing.split(":").map(Number);

    if (closeHour <= openHour) closeHour += 24;

    for (let hour = openHour; hour < closeHour; hour++) {
      const h = hour % 24;
      slots.push(`${h.toString().padStart(2, "0")}:00`);
    }
    return slots;
  };

  const allTimeSlots = useMemo(() => {
    if (!card) return [];
    return generateTimeSlots(card.openingTime, card.closingTime);
  }, [card?.openingTime, card?.closingTime]);

  // Real-time availability listener
  useEffect(() => {
    if (!selectedDate || !card) {
      setAvailableSlots([]);
      return;
    }

    setFetchingSlots(true);
    const dateStr = selectedDate.toISOString().split("T")[0];

    const q = query(
      collection(db, "bookings"),
      where("cardId", "==", card.id),
      where("date", "==", dateStr)
    );

    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const booked = new Set<string>();
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as Booking;
          if (data.paid && Array.isArray(data.timeSlotsArray)) {
            data.timeSlotsArray.forEach((slot: string) => booked.add(slot));
          }
        });

        const available = allTimeSlots.filter((slot) => !booked.has(slot));
        setAvailableSlots(available);
        setFetchingSlots(false);

        // Auto-deselect conflicted slots
        setSelectedTimeSlots((prev) =>
          prev.filter((slot) => available.includes(slot))
        );
      },
      (err) => {
        console.error("Error listening to bookings:", err);
        setError("Failed to load availability");
        setFetchingSlots(false);
      }
    );

    return () => unsubscribe();
  }, [selectedDate, card, allTimeSlots]);

  // Fetch card
  useEffect(() => {
    const fetchCard = async () => {
      if (!id) {
        setError("Invalid card ID");
        setLoading(false);
        return;
      }

      try {
        const docSnap = await getDoc(doc(db, "cards", id));
        if (docSnap.exists()) {
          setCard({ id: docSnap.id, ...docSnap.data() } as CardData);
        } else {
          setError("Venue not found");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load venue");
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
  }, [id]);

  // Consecutive slot logic
  const handleSlotToggle = (slot: string) => {
    if (!availableSlots.includes(slot)) return;

    setSelectedTimeSlots((prev) => {
      if (prev.includes(slot)) {
        return prev.filter((s) => s !== slot);
      }

      if (prev.length === 0) return [slot];

      const prevHours = prev.map((s) => parseInt(s.split(":")[0]));
      const slotHour = parseInt(slot.split(":")[0]);
      const min = Math.min(...prevHours);
      const max = Math.max(...prevHours);

      const isAdjacent = slotHour === min - 1 || slotHour === max + 1;
      if (!isAdjacent) {
        setError("Only consecutive hours can be selected");
        return prev;
      }

      return [...prev, slot].sort();
    });
  };

  // Permission checks
  const canBook = user && hasRole("user") && (!hasRole("host") || card?.assignedHost !== user.uid);

  const handleBooking = async () => {
    if (!user || !canBook || !selectedDate || selectedTimeSlots.length === 0 || !card) return;

    setBookingLoading(true);
    setError("");

    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const totalAmount = selectedTimeSlots.length * card.pricePerHour;

      // Double-check availability
      if (selectedTimeSlots.some((s) => !availableSlots.includes(s))) {
        setError("Selected slots are no longer available");
        setBookingLoading(false);
        return;
      }

      const bookingRef = await addDoc(collection(db, "bookings"), {
        userId: user.uid,
        cardId: card.id,
        date: dateStr,
        timeSlotsArray: selectedTimeSlots,
        timeSlot: selectedTimeSlots.join(" - "),
        totalAmount,
        paid: false,
        bookingTime: new Date(),
      });

      const createOrder = httpsCallable(functions, "createPaymentOrder");
      const result = await createOrder({
        amount: totalAmount,
        bookingId: bookingRef.id,
      });

      const data = result.data as any;
      if (data.error) throw new Error(data.error);

      navigate("/checkout", {
        state: {
          bookingId: bookingRef.id,
          orderId: data.orderId,
          totalAmount: data.amount / 100,
          currency: data.currency,
          keyId: data.keyId,
          cardTitle: card.title,
          date: dateStr,
          timeSlots: selectedTimeSlots,
          pricePerHour: card.pricePerHour,
        },
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create booking");
    } finally {
      setBookingLoading(false);
    }
  };

  // Calendar rendering
  const renderCalendar = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-10 h-10" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selectedDate?.toDateString() === date.toDateString();
      const isPast = date < today;

      days.push(
        <button
          key={day}
          onClick={() => !isPast && setSelectedDate(date)}
          disabled={isPast}
          className={`
            w-10 h-10 rounded-full text-sm font-medium transition-all
            ${isPast ? "text-gray-300" : "hover:bg-blue-100"}
            ${isToday ? "border-2 border-blue-500" : ""}
            ${isSelected ? "bg-blue-600 text-white" : ""}
          `}
        >
          {day}
        </button>
      );
    }
    return days;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-xl text-red-600 mb-6">{error || "Venue not found"}</p>
        <button onClick={() => navigate("/")} className="btn-primary">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </button>
      </div>
    );
  }

  if (!canBook) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-xl text-gray-700 mb-6">
          {user
            ? hasRole("admin")
              ? "Admins cannot book venues"
              : "You cannot book your own assigned venue"
            : "Please log in to book"}
        </p>
        <button onClick={() => navigate(-1)} className="btn-primary">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center text-blue-600 hover:text-blue-800 font-medium"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back
      </button>

      <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Book {card.title}</h1>
          <p className="text-gray-600">Select date and consecutive hours</p>
          <p className="text-2xl font-bold text-green-600 mt-3">₹{card.pricePerHour}/hour</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Calendar */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Calendar className="w-6 h-6 mr-2" />
              Select Date
            </h2>
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">
                  {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
                </h3>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 hover:bg-gray-200 rounded-lg">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 hover:bg-gray-200 rounded-lg">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 text-center text-sm font-medium text-gray-600 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
            </div>
          </div>

          {/* Time Slots */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Clock className="w-6 h-6 mr-2" />
              Select Time ({allTimeSlots.length} slots available)
            </h2>

            {!selectedDate ? (
              <div className="bg-gray-50 rounded-xl p-12 text-center text-gray-500">
                Please select a date first
              </div>
            ) : fetchingSlots ? (
              <div className="bg-gray-50 rounded-xl p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-600 mx-auto" />
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-6 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {allTimeSlots.map((slot) => {
                    const isAvailable = availableSlots.includes(slot);
                    const isSelected = selectedTimeSlots.includes(slot);

                    return (
                      <button
                        key={slot}
                        onClick={() => handleSlotToggle(slot)}
                        disabled={!isAvailable && !isSelected}
                        className={`
                          py-3 px-4 rounded-lg font-medium text-sm transition-all
                          ${isSelected
                            ? "bg-blue-600 text-white shadow-lg scale-105"
                            : isAvailable
                            ? "bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                            : "bg-red-100 text-red-400 border-2 border-red-300 cursor-not-allowed"
                          }
                        `}
                      >
                        {slot}
                        {isSelected && <Check className="w-4 h-4 inline ml-1" />}
                        {!isAvailable && <X className="w-4 h-4 inline ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary & Confirm */}
        {selectedDate && selectedTimeSlots.length > 0 && (
          <div className="mt-10 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-200">
            <h3 className="text-2xl font-bold mb-6">Booking Summary</h3>
            <div className="grid md:grid-cols-2 gap-4 text-lg mb-8">
              <div>
                <p><span className="font-medium">Venue:</span> {card.title}</p>
                <p><span className="font-medium">Date:</span> {selectedDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
              </div>
              <div>
                <p><span className="font-medium">Time:</span> {selectedTimeSlots[0]} - {selectedTimeSlots[selectedTimeSlots.length - 1]}</p>
                <p><span className="font-medium">Duration:</span> {selectedTimeSlots.length} hour{selectedTimeSlots.length > 1 ? "s" : ""}</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-3xl font-bold text-green-600 mb-6">
                Total: ₹{selectedTimeSlots.length * card.pricePerHour}
              </p>
              <button
                onClick={handleBooking}
                disabled={bookingLoading}
                className="px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 transition-all text-lg"
              >
                {bookingLoading ? "Processing..." : "Proceed to Payment"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingCalendar;