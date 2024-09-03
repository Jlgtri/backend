// Define a mapping between chain IDs and RPC URLs
const rpcUrls = {
    1: "https://rpc.mevblocker.io", // Ethereum Mainnet
    10: "https://mainnet.optimism.io", // OP Mainnet
    56: "https://bsc-dataseed.binance.org/", // Binance Smart Chain
    137: "https://polygon-rpc.com/", // Polygon
    8453: "https://mainnet.base.org/", // Base Mainnet​
    42161: "https://endpoints.omniatech.io/v1/arbitrum/sepolia/public", // Arbitrum
    59144: "https://linea.decubate.com", // Linea
    // Add other chain IDs and RPC URLs as needed
};

// Function to get RPC URL by chain ID
function getRpcUrl(chainId) {
    return rpcUrls[chainId] || null; // Return null if chain ID is not found
}


module.exports = {
    getRpcUrl
};
