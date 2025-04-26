import {
    Deposit as DepositEvent,
    Withdrawal as WithdrawalEvent
  } from "../generated/SimpleBank/SimpleBank"
  import { Deposit, Withdrawal, Account } from "../generated/schema"
  import { BigInt, Bytes } from "@graphprotocol/graph-ts"
  
  export function handleDeposit(event: DepositEvent): void {
    // Handle Deposit entity
    let deposit = new Deposit(
      event.transaction.hash.toHex() + "-" + event.logIndex.toString()
    )
    deposit.depositor = event.params.depositor
    deposit.amount = event.params.amount
    deposit.timestamp = event.block.timestamp
    deposit.blockNumber = event.block.number
    deposit.transactionHash = event.transaction.hash
    deposit.save()
  
    // Update Account entity
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
    // Handle Withdrawal entity
    let withdrawal = new Withdrawal(
      event.transaction.hash.toHex() + "-" + event.logIndex.toString()
    )
    withdrawal.withdrawer = event.params.withdrawer
    withdrawal.amount = event.params.amount
    withdrawal.timestamp = event.block.timestamp
    withdrawal.blockNumber = event.block.number
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