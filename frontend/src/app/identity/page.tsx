'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { apiClient } from '@/lib/api';
import { MintPayloadResponse, IdentityHistoryEntry } from '@/lib/types';
import { getIdentityLevel, getIdentityColor } from '@/lib/types';
import Button from '@/components/Button';
import IdentityBadge from '@/components/IdentityBadge';
import ErrorAlert from '@/components/ErrorAlert';
import SuccessAlert from '@/components/SuccessAlert';

export default function IdentityPage() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  
  const [walletScore, setWalletScore] = useState<number | null>(null);
  const [walletLevelValue, setWalletLevelValue] = useState<number | null>(null);
  const [isLoadingScore, setIsLoadingScore] = useState(false);
  const [mintPayload, setMintPayload] = useState<MintPayloadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [lastMintDigest, setLastMintDigest] = useState<string | null>(null);
  const [lastMintScore, setLastMintScore] = useState<number | null>(null);
  const [history, setHistory] = useState<IdentityHistoryEntry[]>([]);

  // Fetch identity history when wallet connects
  useEffect(() => {
    if (!currentAccount?.address) {
      setHistory([]);
      return;
    }
    
    const fetchHistory = async () => {
      try {
        const historyData = await apiClient.getIdentityHistory(currentAccount.address);
        setHistory(historyData);
      } catch (err) {
        console.error('Failed to fetch identity history:', err);
      }
    };

    fetchHistory();
  }, [currentAccount?.address]);

  // Fetch backend-computed wallet risk score when address changes
  useEffect(() => {
    if (!currentAccount?.address) {
      setWalletScore(null);
      setWalletLevelValue(null);
      return;
    }

    const fetchWalletScore = async () => {
      setIsLoadingScore(true);
      try {
        const data = await apiClient.getWalletRiskScore(currentAccount.address);
        setWalletScore(data.score);
        setWalletLevelValue(data.level);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch wallet risk score');
        setWalletScore(null);
        setWalletLevelValue(null);
      } finally {
        setIsLoadingScore(false);
      }
    };

    fetchWalletScore();
  }, [currentAccount?.address]);

  const handleGetMintPayload = async () => {
    try {
      setError(null);
      setMintPayload(null);

      if (!currentAccount?.address) {
        setError('Please connect your wallet first');
        return;
      }

      if (walletScore === null) {
        setError('Wallet risk score is not available yet. Please wait a moment and try again.');
        return;
      }

      const payload = await apiClient.getMintPayload({
        address: currentAccount.address,
      });

      setMintPayload(payload);
      setSuccessMessage('Mint payload generated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate mint payload');
    }
  };

  // Initial mint (uses mintPayload)
  const handleMintNFT = async () => {
    if (!mintPayload || !currentAccount) return;
    // Use the payload already generated
    setIsMinting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Build Sui transaction
      const tx = new Transaction();
      tx.moveCall({
        target: `${mintPayload.package_id}::${mintPayload.module}::${mintPayload.function}`,
        arguments: [
          tx.pure.address(mintPayload.args[0]),
          tx.pure.u64(parseInt(mintPayload.args[1])),
          tx.pure.u8(parseInt(mintPayload.args[2])),
          tx.pure.u64(parseInt(mintPayload.args[3])),
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            const digest = result.digest;
            const score = mintPayload.score;
            const level = getIdentityLevel(score);
            const timestamp_ms = mintPayload.timestamp_ms;

            setSuccessMessage(`🎉 Risk Identity NFT minted successfully! Digest: ${digest}`);
            setLastMintDigest(digest);
            setLastMintScore(score);
            setMintPayload(null);
            setIsMinting(false);

            try {
              await apiClient.storeIdentity({
                address: currentAccount.address,
                score,
                level,
                timestamp_ms,
                tx_digest: digest,
              });
              // Refetch history for latest
              const historyData = await apiClient.getIdentityHistory(currentAccount.address);
              setHistory(historyData);
            } catch (err) {
              console.error('Failed to store identity:', err);
            }
          },
          onError: (err) => {
            setError(err.message || 'Failed to mint NFT');
            setIsMinting(false);
          },
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mint NFT');
      setIsMinting(false);
    }
  };

  // Re-mint handler: Gets fresh payload and mints
  const handleRemint = async () => {
    if (!currentAccount) {
      setError('Please connect your wallet first');
      return;
    }

    setIsMinting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. Get fresh mint payload from backend with current wallet risk score
      const payload = await apiClient.getMintPayload({
        address: currentAccount.address,
      });

      // 2. Build Sui transaction
      const tx = new Transaction();
      tx.moveCall({
        target: `${payload.package_id}::${payload.module}::${payload.function}`,
        arguments: [
          tx.pure.address(payload.args[0]),
          tx.pure.u64(parseInt(payload.args[1])),
          tx.pure.u8(parseInt(payload.args[2])),
          tx.pure.u64(parseInt(payload.args[3])),
        ],
      });

      // 3. Sign and execute transaction
      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: async (result) => {
            const digest = result.digest;
            const score = payload.score;
            const level = getIdentityLevel(score);
            const timestamp_ms = payload.timestamp_ms;

            setSuccessMessage(`🎉 Risk Identity re-minted successfully! Digest: ${digest}`);
            setLastMintDigest(digest);
            setLastMintScore(score);
            setIsMinting(false);

            // 4. Store identity in backend
            try {
              await apiClient.storeIdentity({
                address: currentAccount.address,
                score,
                level,
                timestamp_ms,
                tx_digest: digest,
              });

              // 5. Refetch history
              const historyData = await apiClient.getIdentityHistory(currentAccount.address);
              setHistory(historyData);
            } catch (err) {
              console.error('Failed to store identity:', err);
            }
          },
          onError: (err) => {
            setError(err.message || 'Failed to re-mint NFT');
            setIsMinting(false);
          },
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to re-mint NFT');
      setIsMinting(false);
    }
  };

  const walletLevelName = walletLevelValue !== null
    ? (walletLevelValue === 1 ? 'Bronze' : walletLevelValue === 2 ? 'Silver' : 'Gold')
    : walletScore !== null
      ? getIdentityLevel(walletScore)
      : null;
  const walletLevelColor = walletScore !== null ? getIdentityColor(walletScore) : null;
  const lastMintLevel = lastMintScore !== null ? getIdentityLevel(lastMintScore) : null;
  const lastMintColor = lastMintScore !== null ? getIdentityColor(lastMintScore) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Risk Identity NFT</h1>
        <p className="text-gray-600">
          Mint an on-chain NFT that encodes your risk profile for protocol composability
        </p>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
      {successMessage && <SuccessAlert message={successMessage} onDismiss={() => setSuccessMessage(null)} />}

      {/* Explanation Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          What is Risk Identity?
        </h3>
        <p className="text-sm text-gray-700">
          This endpoint computes your normalized risk score and level, generates a timestamp, 
          and returns a ready-to-use Sui Move call payload for <code className="bg-blue-100 px-1 py-0.5 rounded">risk_identity::mint_identity</code>.
          The NFT encodes: address, score (0-100), level (Bronze/Silver/Gold), and timestamp.
          DeFi protocols can query this on-chain identity to make informed decisions about lending limits, 
          deposit caps, or fee structures.
        </p>
      </div>

      {/* Wallet Connection */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Connect Wallet</h2>
        
        {!currentAccount ? (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Connect your Sui wallet using the button in the top right corner to mint a Risk Identity NFT
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                👆 Click &quot;Connect Wallet&quot; in the navigation bar to get started
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-green-50 rounded-lg p-4 border border-green-200">
            <div>
              <p className="text-sm text-gray-600 mb-1">Connected Address</p>
              <p className="text-sm font-mono text-gray-900">{currentAccount.address}</p>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-green-700">Connected</span>
            </div>
          </div>
        )}
      </div>

      {/* Wallet Risk (Auto) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Wallet Risk (Automatic)</h2>

        {!currentAccount ? (
          <div className="text-sm text-gray-600">
            Connect your wallet to fetch its backend-computed risk score.
          </div>
        ) : (
          <div className="space-y-3">
            {isLoadingScore ? (
              <div className="flex items-center gap-3 text-blue-700">
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm font-medium">Computing wallet risk...</span>
              </div>
            ) : walletScore !== null ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <IdentityBadge score={walletScore} size="lg" />
                  <div>
                    <p className="text-xs text-gray-500">Wallet Risk Score</p>
                    <p className="text-3xl font-bold text-gray-900">{walletScore}</p>
                    <p className="text-xs text-gray-500 mt-1">Computed server-side from your address</p>
                  </div>
                </div>

                {walletLevelName && walletLevelColor && (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${walletLevelColor}`}>
                    Level: {walletLevelName}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600">Unable to load wallet risk score. Please retry.</p>
            )}

            <p className="text-xs text-gray-500">
              Score is always generated on the backend and is the sole source of truth for minting.
            </p>
          </div>
        )}
      </div>

      {/* Generate Payload & Mint Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Generate Mint Payload</h2>

        <Button
          onClick={handleGetMintPayload}
          variant="primary"
          disabled={!currentAccount || isLoadingScore || walletScore === null}
          className="w-full mb-4"
        >
          Get Mint Payload & Prepare Move Call
        </Button>

        {mintPayload && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">✓ Payload Generated</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Score:</span>
                  <span className="ml-2 font-medium">{mintPayload.score}</span>
                </div>
                <div>
                  <span className="text-gray-600">Level:</span>
                  <span className="ml-2 font-medium">
                    {getIdentityLevel(mintPayload.score)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Timestamp:</span>
                  <span className="ml-2 font-mono text-xs">{mintPayload.timestamp_ms}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Move Call Details</h4>
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-xs">
{JSON.stringify({
  package_id: mintPayload.package_id,
  module: mintPayload.module,
  function: mintPayload.function,
  args: mintPayload.args,
}, null, 2)}
              </pre>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Next Steps</h4>
              <p className="text-sm text-blue-800 mb-3">
                Click the button below to execute the Move call with your Sui wallet.
                In a production app, this would use the Sui dApp Kit SDK.
              </p>
              <Button
                onClick={handleMintNFT}
                variant="success"
                loading={isMinting}
                className="w-full mb-2"
              >
                {isMinting ? 'Minting...' : '🎨 Mint Risk Identity NFT'}
              </Button>
              {/* Re-Mint Button: enabled if wallet connected and score selected */}
              <Button
                onClick={handleRemint}
                variant="primary"
                loading={isMinting}
                disabled={!currentAccount || isMinting}
                className="w-full"
              >
                {isMinting ? 'Re-Minting...' : '🔄 Re-Mint Identity'}
              </Button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                SDK Integration (Already Implemented!)
              </h4>
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-xs">
{`// This app uses @mysten/dapp-kit v2024
import { Transaction } from '@mysten/sui/transactions';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';

const tx = new Transaction();
tx.moveCall({
  target: \`\${payload.package_id}::\${payload.module}::\${payload.function}\`,
  arguments: [
    tx.pure.address(payload.args[0]),           // recipient: address
    tx.pure.u64(parseInt(payload.args[1])),     // score: u64
    tx.pure.u8(parseInt(payload.args[2])),      // level: u8
    tx.pure.u64(parseInt(payload.args[3])),     // timestamp_ms: u64
  ],
});

signAndExecuteTransaction({ transaction: tx });`}
              </pre>
            </div>
          </div>
        )}

        {lastMintDigest && lastMintScore !== null && (
          <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Identity Badge</h4>
                <p className="text-sm text-gray-600 mb-3">Last minted Risk Identity NFT</p>
                <div className="flex items-center gap-3">
                  <IdentityBadge score={lastMintScore} size="lg" />
                  <div>
                    <p className="text-xs text-gray-500">Risk Score</p>
                    <p className="text-lg font-semibold text-gray-900">{lastMintScore} / 100</p>
                    {lastMintLevel && lastMintColor && (
                      <span className={`inline-flex items-center mt-2 px-2 py-1 rounded-full text-xs font-medium border ${lastMintColor}`}>
                        {lastMintLevel}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-auto">
                <p className="text-xs font-semibold text-gray-700 mb-1">Transaction</p>
                <a
                  className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                  href={`https://suiscan.xyz/testnet/tx/${lastMintDigest}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View in SuiScan
                </a>
                <p className="text-[11px] text-gray-500 font-mono break-all mt-2">{lastMintDigest}</p>
              </div>
            </div>
          </div>
        )}

        {!mintPayload && currentAccount && (
          <p className="text-sm text-gray-600 text-center">
            Click the button above to generate your mint payload using the backend-computed wallet risk score.
          </p>
        )}
      </div>

      {/* Risk Identity History Section & Re-Mint Info */}
      {currentAccount && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Risk Identity History</h2>

          {/* Re-Mint Info Section */}
          {history.length > 0 && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-md font-semibold text-blue-900 mb-2">Update Your Risk Identity</h3>
              <p className="text-sm text-blue-800">
                Your wallet risk score is computed automatically on the backend. Click re-mint to refresh your identity with the latest score.<br />
                The badge below always reflects your <strong>last minted</strong> identity.
              </p>
            </div>
          )}

          {history.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">
                No past risk identities found. Mint your first Risk Identity NFT above!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => {
                const entryLevel = entry.level;
                const entryColor = 
                  entryLevel === 'Bronze' ? 'text-amber-700 bg-amber-50 border-amber-300' :
                  entryLevel === 'Silver' ? 'text-gray-700 bg-gray-100 border-gray-300' :
                  'text-yellow-600 bg-yellow-50 border-yellow-300';

                return (
                  <div
                    key={`${entry.tx_digest}-${index}`}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Risk Score</p>
                          <p className="text-2xl font-bold text-gray-900">{entry.score}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Level</p>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${entryColor}`}>
                            {entryLevel === 'Bronze' && '🥉 '}
                            {entryLevel === 'Silver' && '🥈 '}
                            {entryLevel === 'Gold' && '🥇 '}
                            {entryLevel}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Minted</p>
                          <p className="text-sm text-gray-700">
                            {new Date(entry.timestamp_ms).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-start sm:items-end">
                        <p className="text-xs text-gray-500 mb-1">Transaction</p>
                        <a
                          href={`https://suiscan.xyz/testnet/tx/${entry.tx_digest}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          View on SuiScan →
                        </a>
                        <p className="text-[10px] text-gray-400 font-mono mt-1 max-w-[200px] truncate">
                          {entry.tx_digest}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Info Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          How Risk Identity Works
        </h3>
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>On-chain Composability:</strong> Your Risk Identity NFT is stored on the Sui blockchain,
            making it queryable by any protocol or smart contract.
          </p>
          <p>
            <strong>Dynamic Updates:</strong> While the NFT captures a specific risk profile at mint time,
            protocols can implement logic to check both the on-chain identity and real-time risk scores.
          </p>
          <p>
            <strong>Use Cases:</strong> Lending protocols can set LTV ratios based on risk levels,
            DEXs can implement dynamic fee structures, and yield aggregators can gate high-risk strategies.
          </p>
          <p>
            <strong>Privacy:</strong> The NFT only contains your risk score and level—no personal
            information is stored on-chain.
          </p>
        </div>
      </div>
    </div>
  );
}
