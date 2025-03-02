import { users, type User, type InsertUser, type PlaidAccount, type Account, type Transaction, type InsertPlaidAccount, type InsertAccount, type InsertTransaction, type InvestmentHolding, type Security, type InsertHolding, type InsertSecurity } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createPlaidAccount(account: InsertPlaidAccount): Promise<PlaidAccount>;
  getAccountsByUserId(userId: number): Promise<Account[]>;
  getTransactionsByUserId(userId: number): Promise<Transaction[]>;
  createAccount(account: InsertAccount): Promise<Account>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getAccountByPlaidId(plaidAccountId2: string): Promise<Account | undefined>;
  // New methods for investment data
  createHolding(holding: InsertHolding): Promise<InvestmentHolding>;
  createSecurity(security: InsertSecurity): Promise<Security>;
  getHoldingsByAccountId(accountId: number): Promise<InvestmentHolding[]>;
  getSecurityById(securityId: string): Promise<Security | undefined>;
  getHoldingsByUserId(userId: number): Promise<InvestmentHolding[]>;
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private plaidAccounts: Map<number, PlaidAccount>;
  private accounts: Map<number, Account>;
  private transactions: Map<number, Transaction>;
  private holdings: Map<number, InvestmentHolding>;
  private securities: Map<string, Security>;
  currentId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.plaidAccounts = new Map();
    this.accounts = new Map();
    this.transactions = new Map();
    this.holdings = new Map();
    this.securities = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createPlaidAccount(account: InsertPlaidAccount): Promise<PlaidAccount> {
    const id = this.currentId++;
    const plaidAccount: PlaidAccount = { 
      ...account, 
      id,
      lastSync: account.lastSync || null 
    };
    this.plaidAccounts.set(id, plaidAccount);
    return plaidAccount;
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const id = this.currentId++;
    const newAccount: Account = { 
      ...account, 
      id,
      subtype: account.subtype || null 
    };
    this.accounts.set(id, newAccount);
    return newAccount;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentId++;
    const newTransaction: Transaction = { 
      ...transaction, 
      id,
      category: transaction.category || null 
    };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async getAccountByPlaidId(plaidAccountId2: string): Promise<Account | undefined> {
    return Array.from(this.accounts.values()).find(
      account => account.plaidAccountId2 === plaidAccountId2
    );
  }

  async getAccountsByUserId(userId: number): Promise<Account[]> {
    const userPlaidAccounts = Array.from(this.plaidAccounts.values()).filter(
      pa => pa.userId === userId
    );
    return Array.from(this.accounts.values()).filter(
      account => userPlaidAccounts.some(pa => pa.id === account.plaidAccountId)
    );
  }

  async getTransactionsByUserId(userId: number): Promise<Transaction[]> {
    const userAccounts = await this.getAccountsByUserId(userId);
    return Array.from(this.transactions.values()).filter(
      transaction => userAccounts.some(account => account.id === transaction.accountId)
    );
  }

  async createHolding(holding: InsertHolding): Promise<InvestmentHolding> {
    const id = this.currentId++;
    const newHolding: InvestmentHolding = { 
      ...holding, 
      id,
      costBasis: holding.costBasis || null 
    };
    this.holdings.set(id, newHolding);
    return newHolding;
  }

  async createSecurity(security: InsertSecurity): Promise<Security> {
    const newSecurity: Security = { 
      ...security,
      id: this.currentId++,
      closePrice: security.closePrice || null,
      updateDate: security.updateDate || null,
      tickerSymbol: security.tickerSymbol || null
    };
    this.securities.set(security.securityId, newSecurity);
    return newSecurity;
  }

  async getHoldingsByAccountId(accountId: number): Promise<InvestmentHolding[]> {
    return Array.from(this.holdings.values()).filter(
      holding => holding.accountId === accountId
    );
  }

  async getSecurityById(securityId: string): Promise<Security | undefined> {
    return this.securities.get(securityId);
  }

  async getHoldingsByUserId(userId: number): Promise<InvestmentHolding[]> {
    const userAccounts = await this.getAccountsByUserId(userId);
    return Array.from(this.holdings.values()).filter(
      holding => userAccounts.some(account => account.id === holding.accountId)
    );
  }
}

export const storage = new MemStorage();