/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility to parse Web3 / Viem / Wagmi errors into cleaner, human-friendly messages.
 */
export function parseWeb3Error(err: any, fallbackMessage: string): string {
  if (!err) return fallbackMessage;

  const errMsg = String(err.message || err.details || (typeof err === "string" ? err : ""));

  // Check if user rejected the request
  if (
    errMsg.includes("User rejected") ||
    errMsg.includes("user rejected") ||
    errMsg.includes("User denied") ||
    errMsg.includes("action rejected") ||
    errMsg.includes("rejected the transaction") ||
    err.code === 4001
  ) {
    return "Transaction Cancelled: You rejected the signature request in your wallet.";
  }

  // Check for insufficient funds for gas or asset transfer
  if (
    errMsg.includes("insufficient funds") ||
    errMsg.includes("funding") ||
    errMsg.includes("exceeds the balance") ||
    errMsg.includes("INSUFFICIENT_FUNDS")
  ) {
    return "Insufficient Funds: You don't have enough gas (ETH) or tokens to execute this transaction.";
  }

  // Check for contract execution reverted
  if (errMsg.includes("execution reverted") || errMsg.includes("revert")) {
    const revertMatch = errMsg.match(/reverted with the following reason:\s*([^\n]+)/i);
    if (revertMatch && revertMatch[1]) {
      return `Contract Reverted: ${revertMatch[1].trim()}`;
    }
    return "Contract Reverted: Transaction check failed on-chain.";
  }

  // Shorten technical logs to make it scannable
  if (errMsg.length > 120) {
    const firstLine = errMsg.split("\n")[0];
    if (firstLine && firstLine.length < 120 && !firstLine.includes("Error:")) {
      return firstLine;
    }
  }

  return errMsg || fallbackMessage;
}
