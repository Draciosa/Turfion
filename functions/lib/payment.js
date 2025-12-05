"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentWebhook = exports.verifyPayment = exports.createPaymentOrder = void 0;
const functions = __importStar(require("firebase-functions"));
const razorpay_1 = __importDefault(require("razorpay"));
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("crypto");
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
exports.createPaymentOrder = functions.https.onCall(async (data, context) => {
    var name = 'Turfion';
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
    }
    const { amount, bookingId } = data;
    if (!amount || !bookingId) {
        throw new functions.https.HttpsError("invalid-argument", "Amount and bookingId are required.");
    }
    try {
        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100), // Convert to paise
            currency: "INR",
            receipt: bookingId,
        });
        return {
            name: name,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
        };
    }
    catch (error) {
        console.error("Error creating Razorpay order:", error);
        throw new functions.https.HttpsError("internal", "Failed to create payment order.", error.message);
    }
});
exports.verifyPayment = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
    }
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, order_id } = data;
    if (order_id) {
        // Verify UPI QR/ID payment by checking order status
        try {
            const order = await razorpay.orders.fetch(order_id);
            if (order.status === "paid") {
                const payments = await razorpay.orders.fetchPayments(order_id);
                const payment = payments.items.find((p) => p.order_id === order_id);
                if (payment) {
                    return { success: true, paymentId: payment.id };
                }
                return { success: false, error: "No payment found for order" };
            }
            return { success: false, error: "Order not paid" };
        }
        catch (error) {
            console.error("Error verifying order:", error);
            return { success: false, error: "Failed to verify payment" };
        }
    }
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        throw new functions.https.HttpsError("invalid-argument", "Missing payment details.");
    }
    const generatedSignature = (0, crypto_1.createHmac)("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
    if (generatedSignature === razorpay_signature) {
        try {
            const payment = await razorpay.payments.fetch(razorpay_payment_id);
            if (payment.status === "captured") {
                return { success: true, paymentId: razorpay_payment_id };
            }
            return { success: false, error: "Payment not captured" };
        }
        catch (error) {
            console.error("Error verifying payment:", error);
            return { success: false, error: "Failed to verify payment" };
        }
    }
    return { success: false, error: "Invalid signature" };
});
exports.paymentWebhook = functions.https.onRequest(async (req, res) => {
    const signature = req.get("x-razorpay-signature");
    const body = JSON.stringify(req.body);
    const expectedSignature = (0, crypto_1.createHmac)("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(body)
        .digest("hex");
    if (signature === expectedSignature) {
        const event = req.body.event;
        if (event === "payment.captured") {
            const payment = req.body.payload.payment.entity;
            const bookingId = payment.notes?.bookingId || payment.order_id;
            try {
                await admin.firestore().collection("bookings").doc(bookingId).update({
                    paid: true,
                    paymentId: payment.id,
                    paymentMethod: payment.method,
                });
                res.status(200).send("Webhook processed");
            }
            catch (error) {
                console.error("Error updating booking:", error);
                res.status(500).send("Error processing webhook");
            }
        }
        else {
            res.status(200).send("Webhook event ignored");
        }
    }
    else {
        res.status(400).send("Invalid webhook signature");
    }
});
//# sourceMappingURL=payment.js.map