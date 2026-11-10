# RPay

**The connectivity layer for payments on Solana.**

One connection. Everyone can transact.

[Live Application](https://rpay-seven.vercel.app/) · [How It Works](https://rpay-seven.vercel.app/#how-it-works) · [Solana](https://solana.com/)

---

## Overview

Blockchains have made it possible to transfer value across borders without relying on traditional financial intermediaries. Yet participating in these networks still depends on something far less universal: internet connectivity.

For people in rural and underserved communities, where access to reliable internet remains a challenge, this dependency limits the reach of digital payments.

A person may have funds in their wallet and someone ready to receive them, but without a connection to the network, they cannot initiate a conventional on-chain payment.

Meanwhile, another device nearby may already have the connectivity they need.

**RPay is built around a simple idea: access to the network can be shared without sharing control of funds.**

RPay enables Solana wallets to authorize payments offline and use nearby connected devices to submit those payments to the network.

The sender remains in control of the transaction. The connected device provides network access. Solana handles settlement.

## The idea

### Separate authorization from connectivity.

In a conventional wallet, the same device is responsible for authorizing a payment and communicating with the blockchain.

RPay separates these responsibilities.

**Authorization happens on the sender's device.** The wallet owner chooses the recipient, specifies the amount, and signs the transaction locally.

**Connectivity comes from an available device.** A nearby connected peer exchanges the required transaction information with the sender and broadcasts the signed payment.

**Settlement happens on Solana.** The network validates the transaction and transfers the funds directly between wallets.

This creates a model in which a single connected device can provide network access to multiple offline wallets without taking custody of their funds.

## How it works

```text
  Sender                    Connected peer                 Solana
  (Offline)                 (Online)                       (Network)
     |                           |                              |
     |<--- Network information --|                              |
     |                           |                              |
     | Prepare payment           |                              |
     | Sign locally              |                              |
     |                           |                              |
     |--- Signed transaction --->|                              |
     |                           |--- Submit transaction ------>|
     |                           |                              |
     |                           |<--- Confirmation ------------|
     |                           |                              |
     |<--- Payment status -------|                              |
     |                           |                              |
```

The devices communicate using QR codes. The connected peer supplies the network information required to prepare the payment, while the sender signs the transaction on their own device.

Once signed, the amount and recipient cannot be changed without invalidating the signature.

The connected peer submits the transaction to Solana, where it is verified and settled.

The recipient does not need to be online for funds to arrive. Their wallet can retrieve the updated balance whenever it reconnects.

## Shared connectivity. Independent ownership.

The distinction between providing connectivity and controlling funds is fundamental to RPay.

A connected peer can help deliver a transaction, but cannot authorize spending from another person's wallet.

The sender's private keys and recovery phrase remain on their own device. Every transfer requires authorization on that device before anything reaches the network.

The connected peer never receives custody. It forwards a signature the sender already approved.

## Why it matters

Connectivity is uneven. Markets, crossings, and shared spaces often have one reliable link while the people in them do not.

RPay does not try to replace the network. It extends who can reach it when the constraint is local—not global.

One connected device can carry many authorized payments. Settlement still happens on Solana. Ownership stays with the wallet that signed.

## This repository

RPay is a working prototype on **Solana Devnet**. The live application is at [rpay-seven.vercel.app](https://rpay-seven.vercel.app/). Source and issue tracking live here on GitHub.

**One connection. Everyone can transact.**
