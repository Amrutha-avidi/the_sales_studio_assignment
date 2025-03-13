require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const Coupon = require("./models/coupon"); // Importing the Coupon model

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {

    serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
    socketTimeoutMS: 45000, // Optional: Handles idle connections
})
    .then(() => console.log("MongoDB connected successfully"))
    .catch((err) => console.error("MongoDB connection error:", err));

// Abuse Prevention Data (For IP and Cookies)
const claimedRecords = new Map();  // { IP: timestamp }

const extractRealIP = (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim(); // Extracts first public IP
    }
    return req.headers['x-real-ip'] || req.socket.remoteAddress;
};

app.get("/api/claim", async (req, res) => {

    const userIP = extractRealIP(req);
    const userCookie = req.cookies['claimedID'];

    const cooldownPeriod = 60 * 60 * 1000; 

    const lastIPClaimTime = claimedRecords.get(userIP);
    if (lastIPClaimTime && Date.now() - lastIPClaimTime < cooldownPeriod) {
        const timeLeft = Math.ceil((cooldownPeriod - (Date.now() - lastIPClaimTime)) / 1000/60);
        return res.status(403).json({ message: `Please wait ${timeLeft} minutes before claiming another coupon !` });
    }
    if (!userCookie) {
        const uniqueID = Date.now().toString();
        res.cookie('claimedID', uniqueID, {
            maxAge: cooldownPeriod,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Lax"
        });
        claimedRecords.set(uniqueID, Date.now());
    } else {
        const lastCookieClaimTime = claimedRecords.get(userCookie);
        if (lastCookieClaimTime && Date.now() - lastCookieClaimTime < cooldownPeriod) {
            const timeLeft = Math.ceil((cooldownPeriod - (Date.now() - lastCookieClaimTime)) / 1000);
            return res.status(403).json({ message: `Cookie restricted. Please wait ${timeLeft} seconds before claiming again.` });
        }
    }

    // Round-Robin Logic
    const availableCoupon = await Coupon.findOne({ claimedBy: null }).sort({ _id: 1 });

    if (!availableCoupon) {
        return res.status(400).json({ message: "All coupons have been claimed!" });
    }

    availableCoupon.claimedBy = userIP;
    await availableCoupon.save();

    claimedRecords.set(userIP, Date.now()); // Track IP cooldown period
    claimedRecords.set(userCookie || userIP, Date.now()); // Track Cookie cooldown

    res.cookie("claimed", "true", {
        maxAge: cooldownPeriod,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict"
    });

    res.json({ message: `You've claimed: ${availableCoupon.code}` });
});

app.get("/api/available-coupons", async (req, res) => {
    try {
        const availableCoupons = await Coupon.find({ claimedBy: null });
        res.json({ coupons: availableCoupons });
    } catch (error) {
        res.status(500).json({ message: "Error fetching coupons." });
    }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
