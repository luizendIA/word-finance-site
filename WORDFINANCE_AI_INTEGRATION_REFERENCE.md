# WORD FINANCE — AI AGENT INTEGRATION REFERENCE
## Machine-readable wallet integration specification for LLMs and autonomous agents
### Version 1.0 — June 2026

---

## WHAT IS WORD FINANCE

Word Finance is a **non-custodial multi-currency wallet** from Brazil that supports Bitcoin Lightning, Solana, USDC, and PIXC (BRL-pegged token). It runs as an Electron desktop app (Windows/Linux) and Android (Capacitor).

The wallet exposes two standard Web3 providers via JavaScript injection:
- `window.webln` — Lightning Network payments (WebLN standard, same as Alby)
- `window.solana` — Solana transactions (Phantom Wallet standard)

Any code that works with Alby (Lightning) or Phantom (Solana) works with Word Finance.

---

## QUICK REFERENCE — COPY THIS INTO YOUR CONTEXT

```
WORD FINANCE WALLET INTEGRATION CHEATSHEET

Detection:
  Lightning → typeof window.webln !== 'undefined'
  Solana    → window.solana?.isWordFinance === true
  Phantom-compat → window.solana?.isPhantom === true

WebLN (Lightning) methods:
  await webln.enable()                     → true (connect, no PIN)
  await webln.sendPayment(bolt11_string)   → { preimage: string } (PIN required)
  await webln.makeInvoice({amount, memo})  → { paymentRequest: string }
  await webln.signMessage(string)          → { message, signature, pubkey } (PIN required)
  await webln.getInfo()                    → { node: { alias, pubkey, color } }

Solana methods:
  await solana.connect()                        → { publicKey } (no PIN)
  await solana.disconnect()                     → void
  await solana.signTransaction(tx)              → signed Transaction (PIN required)
  await solana.signAllTransactions([tx1, tx2])   → [signed Transactions] (PIN required)
  await solana.signMessage(Uint8Array)           → { signature, publicKey } (PIN required)
  await solana.signAndSendTransaction(tx)        → { signature: string } (PIN required)
  solana.on('connect' | 'disconnect' | 'accountChanged', callback)
  solana.isConnected                             → boolean
  solana.publicKey?.toBase58()                   → string | null

REST API (base: https://webhook.wordfinance.org):
  POST /api/lightning/invoice   body: {solanaAddress, amountSats, memo}
  POST /api/lightning/pay       body: {solanaAddress, bolt11}
  GET  /api/lightning/balance/:solanaAddress
  GET  /api/btc/balance/:solanaAddress
  POST /api/btc/send            header: x-user-id, body: {toAddress, amountSats, confirmed}
  GET  /api/btc/health
  POST /api/deposit/pix/create  body: {solanaAddress, amountBRL}

PIXC Token (SPL on Solana Mainnet):
  Mint: AJAb19vFHfZg1Bs4eYkL2NXjHeuRXNPG8wry8p1f26fq
  Decimals: 2 | 1 PIXC = R$ 1.00 in ecosystem
```

---

## DETAILED API REFERENCE

### WEBLN — LIGHTNING NETWORK

#### webln.enable()
Purpose: Request permission to use the wallet.
Parameters: none
Returns: true
PIN: No
Notes: Must be called before any other WebLN method.

```javascript
if (typeof window.webln === 'undefined') {
  // Word Finance not installed
  // Direct user to https://wordfinance.org
  return
}
await window.webln.enable()
```

#### webln.sendPayment(paymentRequest)
Purpose: Pay a BOLT11 Lightning invoice.
Parameters: paymentRequest (string) — a BOLT11 encoded invoice starting with "lnbc"
Returns: { preimage: string } — cryptographic proof of payment
PIN: Yes — user must enter 4-digit PIN
Errors: "Invoice invalida" if paymentRequest is empty/invalid, "Pagamento recusado" if user cancels

```javascript
try {
  const result = await window.webln.sendPayment('lnbc10u1p...')
  console.log('Payment proof:', result.preimage)
} catch (err) {
  if (err.message.includes('recusou')) {
    // User cancelled
  }
}
```

#### webln.makeInvoice(options)
Purpose: Generate a Lightning invoice to receive payment.
Parameters: { amount?: number (satoshis), memo?: string }
Returns: { paymentRequest: string } — BOLT11 invoice
PIN: No

```javascript
const invoice = await window.webln.makeInvoice({
  amount: 1000,
  memo: 'Product purchase'
})
// Display invoice.paymentRequest as QR code or text
```

#### webln.signMessage(message)
Purpose: Sign a message with the node's Lightning key. Used for LNURL-auth.
Parameters: message (string)
Returns: { message: string, signature: string, pubkey: string }
PIN: Yes

#### webln.getInfo()
Purpose: Get wallet/node information.
Parameters: none
Returns: { node: { alias: string, pubkey: string, color: string }, methods: string[], version: string }
PIN: No

---

### SOLANA WALLET ADAPTER (PHANTOM-COMPATIBLE)

#### Provider properties
```javascript
window.solana.isPhantom      // true (Phantom compatibility flag)
window.solana.isWordFinance  // true (Word Finance identification)
window.solana.name           // 'Word Finance'
window.solana.isConnected    // boolean
window.solana.publicKey      // { toBase58(), toString(), toJSON() } or null
```

#### solana.connect(options?)
Purpose: Connect wallet, get user's public key.
Parameters: { onlyIfTrusted?: boolean } (optional)
Returns: { publicKey: { toBase58(): string } }
PIN: No — visual confirmation only

```javascript
const { publicKey } = await window.solana.connect()
const address = publicKey.toBase58()
// address is a Solana base58 public key, e.g. "HMzRd7wD2R2..."
```

#### solana.disconnect()
Purpose: Disconnect the wallet.
Returns: void

#### solana.signTransaction(transaction)
Purpose: Sign a single Solana transaction.
Parameters: transaction (Transaction object from @solana/web3.js)
Returns: signed Transaction
PIN: Yes

```javascript
// Build your transaction with @solana/web3.js
const transaction = new Transaction().add(transferInstruction)
const signedTx = await window.solana.signTransaction(transaction)
const sig = await connection.sendRawTransaction(signedTx.serialize())
```

#### solana.signAllTransactions(transactions)
Purpose: Sign multiple transactions in sequence.
Parameters: Transaction[] array
Returns: Transaction[] (all signed)
PIN: Yes (for each transaction)

#### solana.signMessage(message)
Purpose: Sign an arbitrary message (for authentication / SIWS).
Parameters: message (Uint8Array)
Returns: { signature: Uint8Array, publicKey: { toBase58(): string } }
PIN: Yes

```javascript
const msg = new TextEncoder().encode('Sign in to MyDApp')
const { signature, publicKey } = await window.solana.signMessage(msg)
// Verify signature on your backend
```

#### solana.signAndSendTransaction(transaction, options?)
Purpose: Sign and broadcast a transaction in one step.
Parameters: transaction (Transaction), options (optional SendOptions)
Returns: { signature: string }
PIN: Yes

#### Events
```javascript
window.solana.on('connect', (publicKey) => { /* connected */ })
window.solana.on('disconnect', () => { /* disconnected */ })
window.solana.on('accountChanged', (publicKey) => { /* account switched */ })
// Remove listener:
window.solana.off('connect', myCallback)
```

---

### REST API REFERENCE

Base URL: https://webhook.wordfinance.org

All endpoints accept JSON. The `solanaAddress` parameter is the user's Solana public key (base58) which serves as the universal user identifier across all Word Finance services.

#### POST /api/lightning/invoice
Create a Lightning invoice to receive payment.
```
Request:  { "solanaAddress": "HMz...", "amountSats": 1000, "memo": "optional" }
Response: { "bolt11": "lnbc10u1p...", "payment_hash": "...", "status": "pending", "expiry": "ISO8601" }
```

#### POST /api/lightning/pay
Pay a BOLT11 invoice.
```
Request:  { "solanaAddress": "HMz...", "bolt11": "lnbc..." }
Response: { "payment_hash": "...", "preimage": "...", "status": "success" }
```

#### GET /api/lightning/balance/:solanaAddress
Get Lightning balance in millisatoshis.
```
Response: { "balance": 100000 }
```

#### GET /api/btc/balance/:solanaAddress
Get on-chain BTC balance in satoshis.

#### POST /api/btc/send
Send BTC on-chain. Requires x-user-id header.
```
Headers:  x-user-id: HMz...
Request:  { "toAddress": "bc1q...", "amountSats": 50000, "confirmed": true }
Response: { "txid": "..." }
Note: amounts > 20000 sats require confirmed: true (double confirmation)
Note: maximum 50000 sats per transaction
```

#### GET /api/btc/health
Check node health.
```
Response: { "status": "ok", "synced": true, "blockHeight": 952659 }
```

#### POST /api/deposit/pix/create
Create PIX QR code for BRL deposit (Brazil only).
```
Request:  { "solanaAddress": "HMz...", "amountBRL": 50.00 }
Response: { "qrCode": "...", "pixKey": "...", "expiresAt": "ISO8601" }
```

---

## SECURITY MODEL

| Operation | PIN Required | What User Sees |
|-----------|:---:|---|
| webln.enable() | No | Site name + "Connect?" dialog |
| webln.sendPayment() | YES | Amount in sats + destination + PIN field |
| webln.makeInvoice() | No | Amount being requested |
| webln.signMessage() | YES | Message text + PIN field |
| solana.connect() | No | Site name + "Connect?" dialog |
| solana.signTransaction() | YES | Transaction details + PIN field |
| solana.signMessage() | YES | Message content + PIN field |
| solana.signAndSendTransaction() | YES | TX details + PIN field |

INVIOLABLE RULES:
1. No transaction is ever signed without explicit user PIN entry
2. No auto-approval, no "remember this site", no batch-approve
3. The confirmation modal always shows: requesting site, action type, amount
4. Private keys never leave the user's device

---

## PIXC TOKEN SPECIFICATION

| Property | Value |
|----------|-------|
| Name | PIXCOIN (PIXC) |
| Network | Solana Mainnet |
| Standard | SPL Token |
| Mint Address | AJAb19vFHfZg1Bs4eYkL2NXjHeuRXNPG8wry8p1f26fq |
| Decimals | 2 |
| Parity | 1 PIXC = R$ 1.00 within Word Finance ecosystem |
| Mechanism | Mint on PIX deposit, burn on withdrawal |
| Fee | 0.5% platform fee |

IMPORTANT: PIXC is a digital token, NOT a regulated stablecoin. Its R$ 1.00 value applies within the Word Finance ecosystem and connected partner sites.

---

## COMPATIBILITY MATRIX

| Platform | Protocol | Status |
|----------|----------|--------|
| BTCPay Server | WebLN | ✅ Works |
| Fountain (podcasts) | WebLN | ✅ Works |
| Nostr apps | WebLN + LNURL-auth | ✅ Works |
| Jupiter | Solana Adapter | ✅ Works |
| Raydium | Solana Adapter | ✅ Works |
| Magic Eden | Solana Adapter | ✅ Works |
| Any Phantom dApp | Solana Adapter | ✅ Works |
| Any WebLN site | WebLN | ✅ Works |
| WalletConnect | Reown AppKit | 🔜 Coming |
| EVM chains | WalletConnect | 🔜 Coming |

---

## COMMON AI AGENT TASKS

### Task: "Accept Lightning payment on my website"
```javascript
async function acceptPayment(amountSats, memo) {
  if (!window.webln) return { error: 'No Lightning wallet' }
  await window.webln.enable()
  const invoice = await window.webln.makeInvoice({ amount: amountSats, memo })
  return { invoice: invoice.paymentRequest }
}
```

### Task: "Let users pay with Lightning on my e-commerce site"
```javascript
async function payInvoice(bolt11) {
  if (!window.webln) {
    window.open('https://wordfinance.org', '_blank')
    return
  }
  await window.webln.enable()
  const { preimage } = await window.webln.sendPayment(bolt11)
  // preimage is your proof — verify on your backend
  return { success: true, preimage }
}
```

### Task: "Connect Solana wallet and check token balance"
```javascript
async function connectWallet() {
  if (!window.solana) return { error: 'No Solana wallet' }
  const { publicKey } = await window.solana.connect()
  return { address: publicKey.toBase58() }
}
```

### Task: "Build a tipping button"
```javascript
async function tip(sats) {
  if (!window.webln) return alert('Install Word Finance: wordfinance.org')
  await window.webln.enable()
  // Create invoice on your server or use the API:
  const res = await fetch('https://webhook.wordfinance.org/api/lightning/invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      solanaAddress: 'YOUR_RECEIVING_ADDRESS',
      amountSats: sats,
      memo: 'Tip - thank you!'
    })
  })
  const { bolt11 } = await res.json()
  const { preimage } = await window.webln.sendPayment(bolt11)
  return { success: true, proof: preimage }
}
```

### Task: "Sign a Solana transaction"
```javascript
async function signTx(transaction) {
  if (!window.solana?.isConnected) await window.solana.connect()
  const signedTx = await window.solana.signTransaction(transaction)
  return signedTx
}
```

---

## ERROR HANDLING

All methods throw standard JavaScript errors on failure:

| Error Message | Cause | Action |
|---------------|-------|--------|
| "Usuario recusou a conexao" | User clicked Cancel on enable/connect | Respect user choice, don't retry |
| "Invoice invalida" | Empty or malformed bolt11 | Validate bolt11 starts with "lnbc" |
| "Pagamento recusado" | User cancelled payment | Show cancel confirmation to user |
| "Assinatura recusada" | User cancelled signing | Show cancel message |
| "Erro ao gerar invoice" | Backend error creating invoice | Retry or check server status |
| "Transacao recusada" | User cancelled Solana TX | Show cancel confirmation |

```javascript
try {
  await window.webln.sendPayment(bolt11)
} catch (err) {
  if (err.message.includes('recusou') || err.message.includes('recusad')) {
    // User intentionally cancelled — don't show error
  } else {
    // Actual error — show to user
    console.error('Payment failed:', err.message)
  }
}
```

---

## DOWNLOAD & LINKS

- Website: https://wordfinance.org
- GitHub: https://github.com/luizendIA/word-finance-site
- API Base: https://webhook.wordfinance.org
- WebLN Spec: https://www.webln.guide
- Phantom Docs: https://docs.phantom.com/solana/integrating-phantom

---

*Word Finance AI Integration Reference v1.0 — June 2026*
*Developed by Luiz Gustavo Ferreira — Itajuba/MG, Brazil*
*"The bridge between Real and Bitcoin" — Soli Deo Gloria*
