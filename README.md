# SimpleBank Subgraph Implementation

## Overview

This solution implements a subgraph for the SimpleBank contract that tracks deposit and withdrawal events. The implementation includes schema definition, mapping logic, subgraph configuration, and sample GraphQL queries.

## 1. Schema Definition (`schema.graphql`)

```graphql
type Deposit @entity {
  id: ID!
  depositor: Bytes! # address
  amount: BigInt!
  timestamp: BigInt!
  transactionHash: Bytes!
}

type Withdrawal @entity {
  id: ID!
  withdrawer: Bytes! # address
  amount: BigInt!
  timestamp: BigInt!
  transactionHash: Bytes!
}

type Account @entity {
  id: ID! # address
  totalDeposited: BigInt!
  totalWithdrawn: BigInt!
  balance: BigInt! # calculated as totalDeposited - totalWithdrawn
  deposits: [Deposit!]! @derivedFrom(field: "depositor")
  withdrawals: [Withdrawal!]! @derivedFrom(field: "withdrawer")
}
```

## 2. Subgraph Manifest (`subgraph.yaml`)

```yaml
specVersion: 0.0.5
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum/contract
    name: SimpleBank
    network: mainnet # or whichever network you're using
    source:
      address: "0x1234...abcd" # Replace with actual contract address
      abi: SimpleBank
      startBlock: 1234567 # Block when contract was deployed
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - Deposit
        - Withdrawal
        - Account
      abis:
        - name: SimpleBank
          file: ./abis/SimpleBank.json
      eventHandlers:
        - event: Deposit(indexed address,uint256)
          handler: handleDeposit
        - event: Withdrawal(indexed address,uint256)
          handler: handleWithdrawal
      file: ./src/mapping.ts
```

## 3. Mapping Logic (`src/mapping.ts`)

```typescript
import {
  Deposit as DepositEvent,
  Withdrawal as WithdrawalEvent
} from "../generated/SimpleBank/SimpleBank"
import { Deposit, Withdrawal, Account } from "../generated/schema"
import { BigInt, Bytes } from "@graphprotocol/graph-ts"

export function handleDeposit(event: DepositEvent): void {
  // Create new Deposit entity
  let deposit = new Deposit(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  deposit.depositor = event.params.depositor
  deposit.amount = event.params.amount
  deposit.timestamp = event.block.timestamp
  deposit.transactionHash = event.transaction.hash
  deposit.save()

  // Update or create Account entity
  let accountId = event.params.depositor.toHex()
  let account = Account.load(accountId)
  
  if (!account) {
    account = new Account(accountId)
    account.totalDeposited = BigInt.fromI32(0)
    account.totalWithdrawn = BigInt.fromI32(0)
    account.balance = BigInt.fromI32(0)
  }
  
  account.totalDeposited = account.totalDeposited.plus(event.params.amount)
  account.balance = account.totalDeposited.minus(account.totalWithdrawn)
  account.save()
}

export function handleWithdrawal(event: WithdrawalEvent): void {
  // Create new Withdrawal entity
  let withdrawal = new Withdrawal(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  withdrawal.withdrawer = event.params.withdrawer
  withdrawal.amount = event.params.amount
  withdrawal.timestamp = event.block.timestamp
  withdrawal.transactionHash = event.transaction.hash
  withdrawal.save()

  // Update Account entity
  let accountId = event.params.withdrawer.toHex()
  let account = Account.load(accountId)
  
  if (account) {
    account.totalWithdrawn = account.totalWithdrawn.plus(event.params.amount)
    account.balance = account.totalDeposited.minus(account.totalWithdrawn)
    account.save()
  }
}
```

## 4. GraphQL Queries

### Get all deposits with details:
```graphql
{
  deposits(orderBy: timestamp, orderDirection: desc) {
    id
    depositor
    amount
    timestamp
    transactionHash
  }
}
```

### Get all withdrawals with details:
```graphql
{
  withdrawals(orderBy: timestamp, orderDirection: desc) {
    id
    withdrawer
    amount
    timestamp
    transactionHash
  }
}
```

### Get account summaries with total deposited/withdrawn:
```graphql
{
  accounts {
    id
    totalDeposited
    totalWithdrawn
    balance
  }
}
```

### Get specific account details with transaction history:
```graphql
{
  account(id: "0x1234...abcd") {
    id
    totalDeposited
    totalWithdrawn
    balance
    deposits {
      amount
      timestamp
      transactionHash
    }
    withdrawals {
      amount
      timestamp
      transactionHash
    }
  }
}
```

## 5. Deployment Instructions

### Prerequisites:
1. Install Graph CLI: `npm install -g @graphprotocol/graph-cli`
2. Have Docker installed if running locally

### Steps:

1. **Initialize subgraph** (if starting from scratch):
   ```bash
   graph init --contract-name SimpleBank \
     --index-events \
     --product hosted-service \
     --from-contract <CONTRACT_ADDRESS> \
     --network <NETWORK_NAME> \
     <GITHUB_USER>/<SUBGRAPH_NAME>
   ```

2. **Generate types**:
   ```bash
   graph codegen
   ```

3. **Build subgraph**:
   ```bash
   graph build
   ```

4. **Deploy to Hosted Service**:
   ```bash
   graph deploy --product hosted-service <GITHUB_USER>/<SUBGRAPH_NAME>
   ```

5. **For local development**:
   - Start a local Graph node
   - Create and deploy to local:
     ```bash
     graph create --node http://localhost:8020/ <SUBGRAPH_NAME>
     graph deploy --node http://localhost:8020/ --ipfs http://localhost:5001 <SUBGRAPH_NAME>
     ```

## Design Decisions

1. **Schema Design**:
   - Created separate entities for Deposit and Withdrawal to maintain full transaction history
   - Added Account entity to aggregate totals and calculate balances
   - Used derived fields to link transactions to accounts

2. **Mapping Logic**:
   - Implemented handlers for both event types
   - Added account aggregation to enable efficient queries
   - Used event parameters and blockchain context (timestamp, tx hash)

3. **Query Optimization**:
   - Designed queries to support both detailed transaction history and aggregated views
   - Added sorting options for chronological display
   - Enabled nested queries for account details

This implementation provides a complete solution for tracking SimpleBank activity with The Graph, offering both detailed transaction history and aggregated account views.
