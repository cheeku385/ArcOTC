/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BadgePlus, BarChart3, ShieldCheck, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { formatUnits } from "viem";
import { Order, OrderType, OrderStatus } from "../types";

interface HomeViewProps {
  orders: Order[];
  stats: {
    total: number;
    active: number;
    filled: number;
    volume: number;
  };
  isDemoMode: boolean;
  cancelledIds: bigint[];
}

export default function HomeView({ orders, stats, cancelledIds }: HomeViewProps) {
  const navigate = useNavigate();

  // Get latest 5 active/filled orders that are not cancelled
  const latestOrders = orders
    .filter(
      (order) =>
        !cancelledIds.includes(order.id) &&
        order.status !== OrderStatus.Cancelled &&
        Number(order.status) !== 2
    )
    .slice(0, 5);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
  };

  return (
    <div className="space-y-16 py-8" id="home-view-container">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6">
        {/* Animated tag */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 px-3.5 py-1 text-xs text-black dark:text-white font-bold tracking-wide font-heading uppercase">
          <Flame className="h-3 w-3 text-black dark:text-white" />
          <span>P2P OTC Swap Exchange</span>
        </div>

        {/* Hero Title */}
        <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-none uppercase text-black dark:text-white">
          SWAP USDC AND EURC PEER TO PEER
        </h1>

        {/* Hero Subtext */}
        <p className="text-[#4B5563] dark:text-[#9CA3AF] text-base sm:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed">
          Create OTC orders. Set your own rate. No DEX. No slippage.
          Direct wallet-to-wallet swap.
        </p>

        {/* Action Button Links */}
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Link
            to="/create"
            className="flex items-center gap-2 rounded-xl bg-black dark:bg-white px-8 py-4 font-heading text-sm font-bold text-white dark:text-black transition-all hover:scale-105"
          >
            <BadgePlus className="h-5 w-5 stroke-[2.5]" />
            <span>Create Order</span>
          </Link>
          <Link
            to="/orders"
            className="flex items-center gap-2 rounded-xl border-2 border-black dark:border-white px-8 py-4 font-heading text-sm font-bold text-black dark:text-white transition-all hover:bg-black/5 dark:hover:bg-white/5 hover:scale-105"
          >
            <span>Browse Orders</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-section">
        {/* Stat 1 */}
        <div className="card-glass p-6 text-center shadow-md relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-50 text-black dark:text-white">
            <BarChart3 className="h-5 w-5" />
          </div>
          <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] font-heading font-black tracking-wider uppercase select-none">
            Total Orders
          </p>
          <p className="font-number text-2xl sm:text-3xl font-bold mt-2 text-black dark:text-white">
            {stats.total}
          </p>
        </div>

        {/* Stat 2 */}
        <div className="card-glass p-6 text-center shadow-md relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-50 text-black dark:text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] font-heading font-black tracking-wider uppercase select-none">
            Active Orders
          </p>
          <p className="font-number text-2xl sm:text-3xl font-bold mt-2 text-black dark:text-white">
            {stats.active}
          </p>
        </div>

        {/* Stat 3 */}
        <div className="card-glass p-6 text-center shadow-md relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-50 text-black dark:text-white">
            <ArrowRight className="h-5 w-5" />
          </div>
          <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] font-heading font-black tracking-wider uppercase select-none">
            Filled Orders
          </p>
          <p className="font-number text-2xl sm:text-3xl font-bold mt-2 text-black dark:text-white">
            {stats.filled}
          </p>
        </div>

        {/* Stat 4 */}
        <div className="card-glass p-6 text-center shadow-md relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-50 font-black text-black dark:text-white">
            $
          </div>
          <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] font-heading font-black tracking-wider uppercase select-none">
            Total Volume
          </p>
          <p className="font-number text-2xl sm:text-3xl font-bold mt-2 text-black dark:text-white">
            ${stats.volume.toLocaleString()}
          </p>
        </div>
      </section>

      {/* Recent Orders List */}
      <section className="space-y-6" id="recent-orders-section">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-2xl font-black text-black dark:text-white tracking-tight uppercase">
            Recent Orders ({latestOrders.length})
          </h2>
          <Link
            to="/orders"
            className="flex items-center gap-1.5 text-xs font-bold font-heading text-black dark:text-white hover:opacity-80 transition-colors"
          >
            <span>See All Orders</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {latestOrders.length === 0 ? (
          <div className="card-glass p-12 text-center text-[#4B5563] dark:text-[#9CA3AF]">
            No orders created yet. Be the first to launch an OTC trade!
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4"
          >
            {latestOrders.map((order) => {
              const isUSDCtoEURC = order.orderType === OrderType.USDCtoEURC;
              const offerToken = isUSDCtoEURC ? "USDC" : "EURC";
              const askToken = isUSDCtoEURC ? "EURC" : "USDC";

              // Decimal display conversion
              const offerAmountStr = parseFloat(formatUnits(order.offerAmount, 6)).toLocaleString();
              const askAmountStr = parseFloat(formatUnits(order.askAmount, 6)).toLocaleString();

              // Calculate exchange rate
              const rateVal = parseFloat(formatUnits(order.askAmount, 6)) / parseFloat(formatUnits(order.offerAmount, 6));
              const roundedRate = rateVal.toFixed(4);

              // Get status display badge
              let statusText = "Active";
              let statusClass = "bg-slate-200 dark:bg-white/5 text-black dark:text-white border-slate-300 dark:border-white/10";
              if (order.status === OrderStatus.Filled) {
                statusText = "Filled";
                statusClass = "bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800";
              } else if (order.status === OrderStatus.Cancelled) {
                statusText = "Cancelled";
                statusClass = "bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800";
              }

              // Address truncation
              const truncCreator = `${order.creator.slice(0, 6)}...${order.creator.slice(-4)}`;

              return (
                <motion.div
                  key={order.id.toString()}
                  variants={itemVariants}
                  className="card-glass p-6 space-y-4 hover:shadow-lg transition-all"
                  id={`order-card-${order.id}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-xs font-black text-black dark:text-white">
                      Order ID #{order.id.toString()}
                    </span>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full border text-xs font-semibold ${statusClass}`}>
                      {statusText}
                    </span>
                  </div>

                  {/* Transfer Visual */}
                  <div className="grid grid-cols-2 gap-4 items-center bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3.5">
                    <div>
                      <div className="text-[10px] text-[#4B5563] dark:text-[#9CA3AF] uppercase font-semibold">Offering</div>
                      <div className="text-base font-number font-black text-black dark:text-white">
                        {offerAmountStr} <span className="text-xs font-sans font-normal text-slate-500 dark:text-slate-400">{offerToken}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#4B5563] dark:text-[#9CA3AF] uppercase font-semibold">Asking</div>
                      <div className="text-base font-number font-black text-black dark:text-white">
                        {askAmountStr} <span className="text-xs font-sans font-normal text-slate-500 dark:text-slate-400">{askToken}</span>
                      </div>
                    </div>
                  </div>

                  {/* Inner Stats */}
                  <div className="flex justify-between items-center text-xs text-[#4B5563] dark:text-[#9CA3AF]">
                    <div>
                      Rate: <span className="text-black dark:text-white font-semibold font-number">1 {offerToken} = {roundedRate} {askToken}</span>
                    </div>
                    <div>
                      Creator: <span className="text-black dark:text-white font-mono">{truncCreator}</span>
                    </div>
                  </div>

                  {/* Swap/Fill Action button */}
                  <div className="pt-2">
                    <button
                      onClick={() => navigate(`/order/${order.id.toString()}`)}
                      className={`w-full text-center block py-2.5 rounded-xl font-heading text-xs font-black transition-all ${
                        order.status === OrderStatus.Active
                          ? "bg-black dark:bg-white text-white dark:text-black hover:opacity-85"
                          : "bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[#4B5563] dark:text-[#9CA3AF]"
                      }`}
                    >
                      {order.status === OrderStatus.Active ? "View & Fill P2P Swap" : "View Swap Details"}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </section>
    </div>
  );
}
