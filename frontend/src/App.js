import { useEffect, useState } from "react";
import axios from "axios";
import './App.css';

function App() {
    const [message, setMessage] = useState("");
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCoupons = async () => {
            try {
                const response = await axios.get("https://the-sales-studio-assignment.onrender.com/api/available-coupons", { withCredentials: true });
                setCoupons(response.data.coupons);
            } catch (error) {
                console.error("Error fetching coupons:", error);
                setMessage("Failed to load coupons. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchCoupons();
    }, [coupons]);

    const claimCoupon = async () => {
        try {
            const response = await axios.get("https://the-sales-studio-assignment.onrender.com/api/claim", { withCredentials: true });
            setMessage(`🎉 ${response.data.message}`);
        } catch (error) {
            setMessage(`❌ ${error.response?.data?.message || "Error claiming coupon."}`);
        }
    };

    return (
        <div className="app-container">
            <header>
                <h1>🎯 Round-Robin Coupon Distribution</h1>
                <p className="tagline">Unlock exclusive deals — claim yours before they're gone!</p>
                <button onClick={claimCoupon} className="claim-btn">🎁 Claim Coupon</button>
                {message && <p className="message">{message}</p>}
            </header>

            <main>
                <h2>📝 Available Coupons: {coupons.length}</h2>
                {loading ? (
                    <div className="loader">Loading Coupons...</div>
                ) : coupons.length === 0 ? (
                    <p className="no-coupons">❗ All coupons have been claimed. Stay tuned for more!</p>
                ) : (
                    <div className="coupon-list">
                        {coupons.map((coupon) => (
                            <div
                                key={coupon._id}
                                className= "coupon-card available"
                            >
                                {coupon.code}
                                {coupon.claimedBy && <span className="claimed-tag">Claimed</span>}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;
