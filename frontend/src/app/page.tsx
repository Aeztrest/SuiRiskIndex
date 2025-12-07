import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6">
          <span className="text-white font-bold text-4xl">S</span>
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          On-chain Liquidity Risk Index for Sui
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          We fetch Deepbook data via Surflux, compute risk metrics, store them in a SQL DB 
          and expose a 0–100 risk score per pool. Users can mint a Risk Identity NFT that 
          encodes their risk profile on-chain.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/pools"
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Explore Pools
          </Link>
          <Link
            href="/identity"
            className="px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Mint Risk Identity NFT
          </Link>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white rounded-xl p-8 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Deepbook-powered Risk Scoring
          </h3>
          <p className="text-gray-600">
            We analyze spread, volatility, TVL, volume, and imbalance metrics from Deepbook 
            pools to generate comprehensive risk scores from 0 to 100.
          </p>
        </div>

        <div className="bg-white rounded-xl p-8 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            On-chain Risk Identity NFT
          </h3>
          <p className="text-gray-600">
            Mint an NFT that encodes your risk profile (score, level, timestamp) on-chain. 
            Protocols can query this identity to make informed decisions about user interactions.
          </p>
        </div>

        <div className="bg-white rounded-xl p-8 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Composable Guard Contracts
          </h3>
          <p className="text-gray-600">
            Protocols can integrate our risk scores and identity system to implement 
            deposit limits, lending guards, and dynamic risk-based restrictions.
          </p>
        </div>
      </div>

      {/* Additional Info Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 border border-blue-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">How It Works</h2>
        <div className="space-y-4 text-gray-700">
          <div className="flex items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mr-4">
              1
            </span>
            <div>
              <h3 className="font-semibold mb-1">Data Collection</h3>
              <p>We sync liquidity pool data from Deepbook through Surflux API, capturing real-time metrics.</p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mr-4">
              2
            </span>
            <div>
              <h3 className="font-semibold mb-1">Risk Computation</h3>
              <p>Our backend analyzes TVL, volume, price volatility, impermanent loss risk, and utilization to compute a normalized 0-100 risk score.</p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mr-4">
              3
            </span>
            <div>
              <h3 className="font-semibold mb-1">On-chain Identity</h3>
              <p>Users mint Risk Identity NFTs that encode their risk profile, enabling protocols to make informed decisions.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
