import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { doc, getDoc, collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db, functions } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { httpsCallable } from "firebase/functions";

type CardData = {
  id: string;
  title: string;
  imageUrl: string;
  type: string;
  openingTime: string;
  closingTime: string;
  pricePerHour: number;
  location: string;
  description: string;
  userId: string;
  assignedHost?: string;
  createdAt: any;
  Card_ID: string;
};

type TimeSlot = {
  time: string;
  available: boolean;
  paid: boolean;
};

const BookingCalendar: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Generate time slots from opening to closing time
  const generateTimeSlots = (openingTime: string, closingTime: string): string[] => {
    const slots: string[] = [];
    const parseTime = (timeStr: string): number => {
      const [time, period] = timeStr.split(" ");
      const [hours, minutes] = time.split(":").map(Number);
      let hour24 = hours;
      if (period?.toUpperCase() === "PM" && hours !== 12) {
        hour24 += 12;
      } else if (period?.toUpperCase() === "AM" && hours === 12) {
        hour24 = 0;
      }
      return hour24 * 60 + (minutes || 0);
    };

    const formatTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const period = hours >= 12 ? "PM" : "AM";
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${displayHours}:${mins.toString().padStart(2, "0")} ${period}`;
    };

    const startMinutes = parseTime(openingTime);
    let endMinutes = parseTime(closingTime);
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }

    for (let minutes = startMinutes; minutes < endMinutes; minutes += 60) {
      const actualMinutes = minutes % (24 * 60);
      slots.push(formatTime(actualMinutes));
    }

    return slots;
  };

  // Format date to YYYY-MM-DD
  const formatDateForStorage = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Check booked time slots and their payment status
  const checkAvailability = async (date: Date, cardId: string) => {
    const dateString = formatDateForStorage(date);
    const q = query(
      collection(db, "bookings"),
      where("cardId", "==", cardId),
      where("date", "==", dateString)
    );
    const querySnapshot = await getDocs(q);
    const bookedSlots: { time: string; paid: boolean }[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const slots = Array.isArray(data.timeSlotsArray)
        ? data.timeSlotsArray
        : typeof data.timeSlot === "string"
        ? data.timeSlot.split(",")
        : [];
      slots.forEach((slot: string) => {
        bookedSlots.push({ time: slot, paid: data.paid || false });
      });
    });
    return bookedSlots;
  };

  useEffect(() => {
    const fetchCard = async () => {
      if (!id) {
        setError("Card ID not provided");
        setLoading(false);
        return;
      }
      try {
        const cardDoc = await getDoc(doc(db, "cards", id));
        if (cardDoc.exists()) {
          setCard({ id: cardDoc.id, ...cardDoc.data() } as CardData);
        } else {
          setError("Card not found");
        }
      } catch (err) {
        console.error("Error fetching card:", err);
        setError("Failed to load card details");
      } finally {
        setLoading(false);
      }
    };
    fetchCard();
  }, [id]);

  useEffect(() => {
    const updateTimeSlots = async () => {
      if (selectedDate && card?.openingTime && card?.closingTime) {
        const allSlots = generateTimeSlots(card.openingTime, card.closingTime);
        const bookedSlots = await checkAvailability(selectedDate, card.id);
        const slotsWithAvailability = allSlots.map((slot) => ({
          time: slot,
          available: !bookedSlots.some((bs) => bs.time === slot && bs.paid),
          paid: bookedSlots.some((bs) => bs.time === slot && bs.paid),
        }));
        setTimeSlots(slotsWithAvailability);
      }
    };
    updateTimeSlots();
  }, [selectedDate, card]);

  const parseTimeToMinutes = (time: string): number => {
    const [t, period] = time.split(" ");
    const [hours, minutes] = t.split(":").map(Number);
    let h = hours % 12;
    if (period === "PM") h += 12;
    return h * 60 + (minutes || 0);
  };

  const areSlotsConsecutive = (slots: string[]): boolean => {
    if (slots.length <= 1) return true;
    const minutes = slots.map(parseTimeToMinutes).sort((a, b) => a - b);
    for (let i = 1; i < minutes.length; i++) {
      if (minutes[i] - minutes[i - 1] !== 60) {
        return false;
      }
    }
    return true;
  };

  const handleTimeSlotToggle = (timeSlot: string) => {
    setSelectedTimeSlots((prev) => {
      if (prev.includes(timeSlot)) {
        const newSlots = prev.filter((slot) => slot !== timeSlot);
        if (newSlots.length > 1 && !areSlotsConsecutive(newSlots)) {
          setError("Non-consecutive time slots are not allowed. Selection reset.");
          return [];
        }
        return newSlots;
      }

      const slotData = timeSlots.find((slot) => slot.time === timeSlot);
      if (!slotData?.available || slotData?.paid) {
        return prev;
      }

      if (prev.length === 0) {
        return [timeSlot];
      }

      const slotMinutes = parseTimeToMinutes(timeSlot);
      const prevMinutes = prev.map(parseTimeToMinutes);
      const minPrev = Math.min(...prevMinutes);
      const maxPrev = Math.max(...prevMinutes);
      const isConsecutive = slotMinutes === minPrev - 60 || slotMinutes === maxPrev + 60;

      if (!isConsecutive) {
        setError("Please select consecutive time slots");
        return prev;
      }

      const updated = [...prev, timeSlot].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
      return updated;
    });
  };

  const canUserBookCard = (): boolean => {
    if (!user || !card) return false;
    if (hasRole("admin")) return false;
    if (hasRole("user")) return true;
    if (hasRole("host")) {
      return card.assignedHost !== user.uid;
    }
    return false;
  };

  const getBookingErrorMessage = (): string => {
    if (!user) return "Please log in to make a booking";
    if (hasRole("admin")) return "Admins cannot book cards";
    if (hasRole("host") && card?.assignedHost === user.uid) {
      return "You cannot book your own assigned card";
    }
    return "You do not have permission to book this card";
  };

  const handleConfirmBooking = async () => {
    if (!user) {
      setError("Please log in to make a booking");
      return;
    }
    if (!canUserBookCard()) {
      setError(getBookingErrorMessage());
      return;
    }
    if (!selectedDate || selectedTimeSlots.length === 0) {
      setError("Please select a date and at least one time slot");
      return;
    }
    if (!card) {
      setError("Card information not available");
      return;
    }

    setBookingLoading(true);
    setError("");

    try {
      const dateString = formatDateForStorage(selectedDate);
      const totalAmount = selectedTimeSlots.length * (card.pricePerHour || 0);
      const bookedSlots = await checkAvailability(selectedDate, card.id);
      const conflict = selectedTimeSlots.some((slot) =>
        bookedSlots.some((bs) => bs.time === slot && bs.paid)
      );
      if (conflict) {
        setError("Some selected time slots are no longer available. Please choose different slots.");
        setBookingLoading(false);
        return;
      }

      const sortedSlots = [...selectedTimeSlots].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
      const bookingData = {
        userId: user.uid,
        cardId: card.id,
        Card_ID: card.Card_ID,
        date: dateString,
        timeSlot: sortedSlots.join(","),
        timeSlotsArray: sortedSlots,
        bookingTime: new Date(),
        totalAmount,
        paid: false,
      };

      const bookingDocRef = await addDoc(collection(db, "bookings"), bookingData);

      const createOrder = httpsCallable(functions, "createPaymentOrder");
      const orderResponse: any = await createOrder({ amount: totalAmount, bookingId: bookingDocRef.id });
      if (orderResponse.data.error) {
        throw new Error(orderResponse.data.error);
      }

      const { orderId, currency, amount, keyId } = orderResponse.data;

      navigate("/checkout", {
        state: {
          bookingId: bookingDocRef.id,
          orderId,
          totalAmount: amount / 100, // Convert back to rupees for consistency
          cardId: card.id, // Ensure cardId is included
          cardTitle: card.title,
          date: dateString,
          timeSlots: sortedSlots,
          pricePerHour: card.pricePerHour,
          currency,
          keyId,
        },
      });
    } catch (err) {
      console.error("Error creating booking:", err);
      setError("Failed to create booking or payment order. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderCalendar = () => {
    const today = new Date();
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const days = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10 sm:h-12 sm:w-12" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
      const isPast = date < today && !isToday;

      days.push(
        <button
          key={day}
          onClick={() => !isPast && setSelectedDate(date)}
          disabled={isPast}
          className={`
            h-10 w-10 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center text-sm transition-all duration-200
            ${isPast ? "text-gray-300 cursor-not-allowed" : "hover:bg-blue-100"}
            ${isToday && !isSelected ? "border-2 border-blue-500" : ""}
            ${isSelected ? "bg-blue-500 text-white hover:bg-blue-600" : ""}
            ${!isPast && !isSelected ? "hover:bg-gray-100" : ""}
          `}
        >
          {day}
        </button>
      );
    }
    return days;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error && !card) {
    return (
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/")}
          className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to home
        </button>
        <div className="text-center bg-white rounded-xl shadow-lg p-8 sm:p-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-600 mb-6 text-sm sm:text-base">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!card) return null;

  if (!canUserBookCard()) {
    return (
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate(`/card/${id}`)}
          className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to card details
        </button>
        <div className="text-center bg-white rounded-xl shadow-lg p-8 sm:p-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Cannot Book This Card</h2>
          <p className="text-gray-600 mb-6 text-sm sm:text-base">{getBookingErrorMessage()}</p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Browse Other Cards
          </button>
        </div>
      </div>
    );
  }

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate(`/card/${id}`)}
        className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200 font-medium"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to card details
      </button>
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Book {card.title}</h1>
          <p className="text-gray-600 text-sm sm:text-base">Select a date and time slots for your booking</p>
          {card.pricePerHour && (
            <p className="text-base sm:text-lg font-semibold text-green-600 mt-2">₹{card.pricePerHour} per hour</p>
          )}
        </div>
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <span className="text-sm sm:text-base">{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            <span className="text-sm sm:text-base">{success}</span>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Select Date
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base sm:text-lg font-medium">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={handlePrevMonth}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors duration-200"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors duration-200"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekdays.map((day) => (
                  <div key={day} className="h-6 sm:h-8 flex items-center justify-center text-xs text-gray-500 font-medium">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
            </div>
          </div>
          <div className="relative group">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Select Time Slots
            </h2>
            <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 -top-8 left-0 z-10">
              Only consecutive time slots can be selected
            </div>
            {!selectedDate ? (
              <div className="bg-gray-50 rounded-lg p-6 sm:p-8 text-center">
                <p className="text-gray-500 text-sm sm:text-base">Please select a date first</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <div className="mb-4">
                  <p className="text-xs sm:text-sm text-gray-600">
                    Selected date: <span className="font-medium">{selectedDate.toLocaleDateString()}</span>
                  </p>
                  {selectedTimeSlots.length > 0 && (
                    <p className="text-xs sm:text-sm text-blue-600 mt-1">
                      {selectedTimeSlots.length} slot{selectedTimeSlots.length > 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {timeSlots.map((slot) => {
                    const slotMinutes = parseTimeToMinutes(slot.time);
                    const prevMinutes = selectedTimeSlots.map(parseTimeToMinutes);
                    const minPrev = prevMinutes.length > 0 ? Math.min(...prevMinutes) : null;
                    const maxPrev = prevMinutes.length > 0 ? Math.max(...prevMinutes) : null;
                    const isSelectable =
                      selectedTimeSlots.includes(slot.time) ||
                      (slot.available &&
                        !slot.paid &&
                        (selectedTimeSlots.length === 0 ||
                          slotMinutes === minPrev! - 60 ||
                          slotMinutes === maxPrev! + 60));
                    return (
                      <button
                        key={slot.time}
                        onClick={() => handleTimeSlotToggle(slot.time)}
                        disabled={!isSelectable}
                        className={`
                          p-2 sm:p-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-between
                          ${
                            slot.paid
                              ? "bg-red-100 text-red-400 cursor-not-allowed"
                              : !isSelectable
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : selectedTimeSlots.includes(slot.time)
                              ? "bg-blue-500 text-white hover:bg-blue-600"
                              : "bg-white text-gray-700 hover:bg-blue-50 border border-gray-200"
                          }
                        `}
                      >
                        <span>{slot.time}</span>
                        {slot.paid && <X className="w-3 h-3 sm:w-4 sm:h-4" />}
                        {slot.available && !slot.paid && selectedTimeSlots.includes(slot.time) && (
                          <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {timeSlots.length === 0 && (
                  <p className="text-center text-gray-500 py-4 text-sm">No time slots available</p>
                )}
              </div>
            )}
          </div>
        </div>
        {selectedDate && selectedTimeSlots.length > 0 && (
          <div className="mt-6 sm:mt-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 sm:p-6 border border-blue-200">
            <h3 className="text-base sm:text-lg font-semibold mb-4 text-blue-800">Booking Summary</h3>
            <div className="space-y-2 mb-4 sm:mb-6 text-sm sm:text-base">
              <p><span className="font-medium">Card:</span> {card.title}</p>
              <p><span className="font-medium">Date:</span> {selectedDate.toLocaleDateString()}</p>
              <p><span className="font-medium">Time Slots:</span> {selectedTimeSlots.join(", ")}</p>
              <p><span className="font-medium">Total Slots:</span> {selectedTimeSlots.length}</p>
              {card.pricePerHour && (
                <>
                  <p><span className="font-medium">Price per Hour:</span> ₹{card.pricePerHour}</p>
                  <p>
                    <span className="font-medium">Total Amount:</span>{" "}
                    <span className="text-green-600 font-bold">₹{selectedTimeSlots.length * card.pricePerHour}</span>
                  </p>
                </>
              )}
            </div>
            <button
              onClick={handleConfirmBooking}
              disabled={bookingLoading || !user}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm sm:text-base"
            >
              {bookingLoading ? "Confirming Booking..." : "Confirm Booking"}
            </button>
            {!user && (
              <p className="text-center text-red-600 text-xs sm:text-sm mt-2">Please log in to make a booking</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingCalendar;