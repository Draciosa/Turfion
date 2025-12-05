import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Razorpay from "razorpay";
import { createHmac } from "crypto";

admin.initializeApp();

// Initialize Razorpay with production/test keys from environment
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Region for consistency (change if needed)
const region = "us-central1";

// CREATE RAZORPAY ORDER (Callable Function)
export const createPaymentOrder = functions
  .region(region)
  .https.onCall(async (data, context) => {
    // Auth check
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to create an order."
      );
    }

    const { amount, bookingId } = data;

    if (!amount || !bookingId || typeof amount !== "number" || amount <= 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Valid amount and bookingId are required."
      );
    }

    try {
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100), // Convert to paise
        currency: "INR",
        receipt: bookingId,
        notes: {
          bookingId, // Important: Helps webhook identify the booking
        },
      });

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID, // Client needs this for checkout
      };
    } catch (error: any) {
      functions.logger.error("Razorpay order creation failed:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to create payment order.",
        error.message
      );
    }
  });

// VERIFY PAYMENT SIGNATURE (for card/netbanking/UPI via Razorpay Checkout)
export const verifyPayment = functions
  .region(region)
  .https.onCall(async (data, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to verify payment."
      );
    }

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = data;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing payment verification details."
      );
    }

    const expectedSignature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      functions.logger.warn("Invalid payment signature", { razorpay_order_id });
      return { success: false, error: "Invalid payment signature" };
    }

    try {
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      if (payment.status === "captured") {
        return { success: true, paymentId: razorpay_payment_id };
      } else {
        return { success: false, error: "Payment not captured" };
      }
    } catch (error: any) {
      functions.logger.error("Payment fetch failed:", error);
      return { success: false, error: "Failed to verify payment status" };
    }
  });

// WEBHOOK HANDLER (Handles payment.captured for all methods including UPI)
export const paymentWebhook = functions
  .region(region)
  .https.onRequest(async (req, res) => {
    const signature = req.headers["x-razorpay-signature"] as string;
    const body = JSON.stringify(req.body);

    const expectedSignature = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      functions.logger.warn("Invalid webhook signature", { received: signature });
      return res.status(400).send("Invalid signature");
    }

    const event = req.body.event;

    if (event === "payment.captured") {
      const payment = req.body.payload.payment.entity;
      const bookingId = payment.notes?.bookingId || payment.order_id; // Fallback to order_id if notes missing

      if (!bookingId) {
        functions.logger.error("Missing bookingId in webhook", payment);
        return res.status(400).send("Missing booking reference");
      }

      try {
        const bookingRef = admin.firestore().collection("bookings").doc(bookingId);
        const bookingDoc = await bookingRef.get();

        if (!bookingDoc.exists()) {
          functions.logger.error("Booking not found for webhook", { bookingId });
          return res.status(404).send("Booking not found");
        }

        if (bookingDoc.data()?.paid) {
          functions.logger.info("Booking already marked as paid", { bookingId });
          return res.status(200).send("Already processed");
        }

        await bookingRef.update({
          paid: true,
          paymentId: payment.id,
          paymentMethod: payment.method,
          paymentCapturedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        functions.logger.info("Payment captured and booking updated", {
          bookingId,
          paymentId: payment.id,
          method: payment.method,
        });

        return res.status(200).send("OK");
      } catch (error: any) {
        functions.logger.error("Webhook processing failed:", error);
        return res.status(500).send("Internal error");
      }
    }

    // Ignore other events
    return res.status(200).send("Event ignored");
  });