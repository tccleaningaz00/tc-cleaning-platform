

export default function Home() {
  return (
  <main className="min-h-screen bg-white text-gray-900">
<main className="min-h-screen bg-white text-gray-900">

  {/* Navigation */}
  <nav className="border-b">

    <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

      <h2 className="text-xl font-bold text-green-600">
        TC Cleaning Services AZ LLC
      </h2>

      <div className="hidden gap-8 font-medium md:flex">
        <a href="#">Home</a>
        <a href="#">Services</a>
        <a href="#">Gallery</a>
        <a href="#">Reviews</a>
        <a href="#">Contact</a>
      </div>

      <button className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700">
        Free Estimate
      </button>

    </div>

  </nav>

  {/* Hero */}
  <section className="mx-auto max-w-7xl px-6 py-20">

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
<div>
      <p className="font-semibold uppercase tracking-wider text-green-600">
        TC Cleaning Services AZ LLC
      </p>

      <h1 className="mt-4 text-5xl font-bold leading-tight">
        Professional House Cleaning Across the East Valley
      </h1>

      <p className="mt-6 text-xl text-gray-600">
        Residential Cleaning • Deep Cleaning • Move-Out Cleaning • Commercial Cleaning
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 text-gray-700">

  <div className="flex items-center gap-2">
    ⭐ <span>5.0 Google Rating</span>
  </div>

  <div className="flex items-center gap-2">
    ✔ <span>Licensed & Insured</span>
  </div>

  <div className="flex items-center gap-2">
    🏡 <span>Locally Owned</span>
  </div>

  <div className="flex items-center gap-2">
    📅 <span>Flexible Scheduling</span>
  </div>

</div>
      <div className="mt-10 flex gap-4">

        <button className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700">
          Get My Free Estimate
        </button>

        <button className="rounded-xl border px-6 py-3 font-semibold hover:bg-gray-100">
          Our Services
        </button>
</div>
      </div>
<div className="flex justify-center">

    <img
        src="/images/cris.png"
        alt="Cris Cleaning"
        className="rounded-3xl shadow-2xl w-full max-w-lg"
    />

</div>    </div>

  </section>

</main>
    {/* Hero Section */}
    
<div className="flex justify-center">
</div>
  </main>
)
  
}
  

