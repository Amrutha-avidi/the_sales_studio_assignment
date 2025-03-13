const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
    code: String,
    claimedBy: { type: String, default: null }
});

const Coupon = mongoose.model("Coupon", couponSchema);

const seedCoupons = async () => {
    const existingCoupons = await Coupon.countDocuments();

    if (existingCoupons === 0) {
        const sampleCoupons = Array.from({ length: 10 }, (_, index) => ({
            code: `COUPON${index + 1}`,
            claimedBy: null
        }));

        await Coupon.insertMany(sampleCoupons);
        console.log("Coupons seeded successfully during schema creation!");
    }
};

seedCoupons().catch((err) => console.error("Seeding Failed:", err));

module.exports = Coupon;
