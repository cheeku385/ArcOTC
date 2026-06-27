import React from "react";
import "@rainbow-me/rainbowkit/styles.css";
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
  lightTheme,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";
import { ARC_TESTNET_CHAIN_ID } from "./types";
import { useTheme } from "./components/ThemeContext";

// Define custom Arc Testnet chain matching parameters exactly
export const arcTestnet = {
  id: ARC_TESTNET_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: {
    decimals: 6,
    name: "USDC",
    symbol: "USDC",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.arc.network"],
    },
    public: {
      http: ["https://rpc.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "ArcScan",
      url: "https://testnet.arcscan.app",
    },
  },
} as const;

// Create standard Wagmi Config
export const config = getDefaultConfig({
  appName: "ArcOTC",
  projectId: "cc905ecf8c0c35451aee4b0fe0b79921",
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: http("https://rpc.testnet.arc.network"),
  },
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 2,
          },
        },
      })
  );

  const { theme } = useTheme();
  const isLight = theme === "light";

  const customTheme = isLight
    ? lightTheme({
        accentColor: "#EF4444", // Red accent color for Light Mode
        accentColorForeground: "#FFFFFF",
        borderRadius: "medium",
        fontStack: "system",
      })
    : darkTheme({
        accentColor: "#EF4444", // Red accent color for Dark Mode
        accentColorForeground: "#FFFFFF",
        borderRadius: "medium",
        fontStack: "system",
        overlayBlur: "small",
      });

  if (!mounted) {
    return null;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={customTheme}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
