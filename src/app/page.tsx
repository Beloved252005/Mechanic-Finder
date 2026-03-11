import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1 className="hero-title">
          Find Trusted &<br />
          <span>Verified Mechanics</span>
        </h1>
        <p className="hero-subtitle">
          Auto-Link connects motorists with credential-verified automotive
          professionals. Book appointments, track mechanics in real-time,
          chat directly, and build trust through transparent reviews.
        </p>
        <div className="hero-actions">
          <Link href="/auth/register" className="btn btn-primary" style={{ padding: "14px 36px", fontSize: "1rem" }}>
            Get Started Free
          </Link>
          <Link href="/auth/login" className="btn btn-secondary" style={{ padding: "14px 36px", fontSize: "1rem" }}>
            Sign In
          </Link>
        </div>
      </section>

      <section className="features">
        <div className="feature-card">
          <div className="feature-icon">🔍</div>
          <h3 className="feature-title">Discover Mechanics</h3>
          <p className="feature-desc">
            Browse verified professionals by location, specialty, and rating.
            Find the perfect match for your vehicle needs.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">✅</div>
          <h3 className="feature-title">Verified Credentials</h3>
          <p className="feature-desc">
            Every mechanic undergoes administrative verification. Look for the
            verified badge for extra peace of mind.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📅</div>
          <h3 className="feature-title">Easy Booking</h3>
          <p className="feature-desc">
            Schedule appointments with conflict-free booking. Track your repair
            status from pending to completion.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📍</div>
          <h3 className="feature-title">Live GPS Tracking</h3>
          <p className="feature-desc">
            Track your mechanic&apos;s location in real-time during active jobs.
            Know exactly when they&apos;ll arrive.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">💬</div>
          <h3 className="feature-title">In-App Chat</h3>
          <p className="feature-desc">
            Communicate directly with your mechanic through booking-based private
            chat channels. Stay connected throughout the process.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⭐</div>
          <h3 className="feature-title">Ratings & Reviews</h3>
          <p className="feature-desc">
            Leave honest reviews after completed services. Help the community
            identify top-quality mechanics.
          </p>
        </div>
      </section>
    </>
  );
}
