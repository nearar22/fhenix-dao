/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  webpack: (config) => {
    // @cofhe/sdk uses WASM (TFHE) — make sure webpack handles it.
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    // @metamask/sdk pulls in react-native-async-storage in some bundles;
    // mark it as optional for the web build.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
    };
    return config;
  },
  async headers() {
    // The CoFHE SDK ships TFHE as WebAssembly executed inside a Worker built
    // by `wasm-bindgen-rayon`, which requires the page to allow `wasm-eval`.
    // We also explicitly allow `unsafe-eval` because some bundles still
    // fall back to `Function(...)` for hot paths. We deliberately do NOT
    // enable COOP/COEP because they break wallet-extension popups (Rabby,
    // MetaMask) which inject scripts cross-origin.
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https: wss: ws:",
              "worker-src 'self' blob:",
              "font-src 'self' data:",
              "frame-src 'self' https:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
