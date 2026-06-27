/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Flame, Compass, Cpu, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Web3 and Toast Providers
import { Web3Provider } from "./Web3Provider";
import { ToastProvider, useToast } from "./components/Toast";

// Layout components
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import AnimatedBackground from "./components/AnimatedBackground";
import { ThemeProvider, useTheme } from "./components/ThemeContext";

// Business Logic Hook
import { useArcOTC } from "./hooks/useArcOTC";

// Sub-view Pages
import HomeView from "./components/HomeView";
import AllOrdersView from "./components/AllOrdersView";
import CreateOrderView from "./components/CreateOrderView";
import MyOrdersView from "./components/MyOrdersView";
import OrderDetailView from "./components/OrderDetailView";
import AdminView from "./components/AdminView";

function AppContent() {
  const {
    orders,
    loading,
    error,
    stats,
    isDemoMode,
    toggleDemoMode,
    approveToken,
    getBalance,
    createOrder,
    fillOrder,
    cancelOrder,
    refetch,
    address,
    isConnected,
  } = useArcOTC();

  const [cancelledIds, setCancelledIds] = React.useState<bigint[]>([]);
  const toast = useToast();
  const { theme } = useTheme();

  return (
    <div className={`relative min-h-screen flex flex-row transition-colors duration-300 ${
      theme === "light" ? "text-slate-800" : "text-white"
    }`} id="app-content-root">
      {/* Background Animated/Static Elements */}
      <AnimatedBackground />

      {/* Left Sidebar navigation */}
      <Sidebar isDemoMode={isDemoMode} toggleDemoMode={toggleDemoMode} />

      {/* Main desktop content area shifts right to accommodate the fixed sidebar */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen relative z-10 w-full min-w-0">
        {/* Navigation Bar */}
        <Navbar isDemoMode={isDemoMode} toggleDemoMode={toggleDemoMode} />

        {/* Global Network Status Ribbon (Only shown if warning is active) */}
        {error && (
          <div className="bg-brand-warning/15 border-b border-brand-warning/30 text-brand-warning text-center py-2 px-4 text-xs font-semibold select-none flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-warning animate-ping" />
            <span>{error}</span>
          </div>
        )}

        {/* Page Main Core view spacing */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
          {loading && orders.length === 0 ? (
            /* Custom pulsing Loading bar skeleton to match styling instructions */
            <div className="flex flex-col items-center justify-center py-24 space-y-4 select-none">
              <div className="h-12 w-12 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
              <div className="text-center font-heading text-xs font-black tracking-widest text-brand-primary uppercase animate-pulse">
                Establishing ArcOTC Protocol Liquidity...
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <Routes>
                <Route
                  path="/"
                  element={
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <HomeView orders={orders} stats={stats} isDemoMode={isDemoMode} cancelledIds={cancelledIds} />
                    </motion.div>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <AllOrdersView orders={orders} address={address} onCancelOrder={cancelOrder} onRefetch={refetch} cancelledIds={cancelledIds} setCancelledIds={setCancelledIds} />
                    </motion.div>
                  }
                />
                <Route
                  path="/create"
                  element={
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <CreateOrderView
                        address={address}
                        isConnected={isConnected}
                        isDemoMode={isDemoMode}
                        approveToken={approveToken}
                        createOrder={createOrder}
                        getBalance={getBalance}
                        refetch={refetch}
                      />
                    </motion.div>
                  }
                />
                <Route
                  path="/my-orders"
                  element={
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <MyOrdersView
                        orders={orders}
                        address={address}
                        isConnected={isConnected}
                        isDemoMode={isDemoMode}
                        onCancelOrder={cancelOrder}
                        onRefetch={refetch}
                        cancelledIds={cancelledIds}
                        setCancelledIds={setCancelledIds}
                      />
                    </motion.div>
                  }
                />
                <Route
                  path="/order/:id"
                  element={
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <OrderDetailView
                        orders={orders}
                        address={address}
                        isConnected={isConnected}
                        isDemoMode={isDemoMode}
                        approveToken={approveToken}
                        fillOrder={fillOrder}
                        getBalance={getBalance}
                      />
                    </motion.div>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <AdminView orders={orders} stats={stats} address={address} onCancelOrder={cancelOrder} onRefetch={refetch} cancelledIds={cancelledIds} setCancelledIds={setCancelledIds} />
                    </motion.div>
                  }
                />
                {/* Fallback routing */}
                <Route
                  path="*"
                  element={
                    <div className="py-24 text-center space-y-4">
                      <HelpCircle className="h-12 w-12 text-brand-primary mx-auto" />
                      <h2 className="font-heading text-xl font-bold uppercase">404 - Path Missing</h2>
                      <p className="text-sm text-brand-text-secondary">We cannot locate the requested path.</p>
                      <Link to="/" className="inline-block bg-brand-primary text-black font-heading font-black text-xs px-4 py-2 rounded-lg">
                        Back Home
                      </Link>
                    </div>
                  }
                />
              </Routes>
            </AnimatePresence>
          )}
        </main>

        {/* Footer Bar */}
        <Footer />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Web3Provider>
        <BrowserRouter>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </BrowserRouter>
      </Web3Provider>
    </ThemeProvider>
  );
}
