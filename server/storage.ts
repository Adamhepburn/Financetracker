import { users, type User, type InsertUser, type PlaidAccount, type Account, type Transaction, type InsertPlaidAccount } from "@shared/schema";
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
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private plaidAccounts: Map<number, PlaidAccount>;
  private accounts: Map<number, Account>;
  private transactions: Map<number, Transaction>;
  currentId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.plaidAccounts = new Map();
    this.accounts = new Map();
    this.transactions = new Map();
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
    const plaidAccount: PlaidAccount = { ...account, id };
    this.plaidAccounts.set(id, plaidAccount);
    return plaidAccount;
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
}

export const storage = new MemStorage();