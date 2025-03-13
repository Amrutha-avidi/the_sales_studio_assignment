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
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.error("MongoDB Connection Failed:", err));

// Abuse Prevention Data (For IP and Cookies)
const claimedRecords = new Map();  // { IP: timestamp }
console.log(claimedRecords)

app.get("/api/claim", async (req, res) => {

    const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const lastClaimTime = claimedRecords.get(userIP);

    const cooldownPeriod = 60 * 1000; // **60 seconds cooldown for testing**
    if (lastClaimTime && Date.now() - lastClaimTime < cooldownPeriod) {
        const timeLeft = Math.ceil((cooldownPeriod - (Date.now() - lastClaimTime)) / 1000);
        return res.status(403).json({ message: `Please wait ${timeLeft} seconds before claiming again.` });
    }

    // Round-Robin Logic
    const availableCoupon = await Coupon.findOne({ claimedBy: null }).sort({ _id: 1 });

    if (!availableCoupon) {
        return res.status(400).json({ message: "All coupons have been claimed!" });
    }

    availableCoupon.claimedBy = userIP;
    await availableCoupon.save();

    claimedRecords.set(userIP, Date.now());

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
