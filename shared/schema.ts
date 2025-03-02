import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const plaidAccounts = pgTable("plaid_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  accessToken: text("access_token").notNull(),
  itemId: text("item_id").notNull(),
  institutionName: text("institution_name").notNull(),
  lastSync: timestamp("last_sync"),
});

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  plaidAccountId: integer("plaid_account_id").notNull(),
  plaidAccountId2: text("plaid_account_id2").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  subtype: text("subtype"),
  balance: numeric("balance").notNull(),
  isoCurrencyCode: text("iso_currency_code").notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  plaidTransactionId: text("plaid_transaction_id").notNull(),
  date: timestamp("date").notNull(),
  name: text("name").notNull(),
  amount: numeric("amount").notNull(),
  category: text("category"),
  pending: boolean("pending").notNull(),
});

// New schema for investment holdings
export const investmentHoldings = pgTable("investment_holdings", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  securityId: text("security_id").notNull(),
  quantity: numeric("quantity").notNull(),
  costBasis: numeric("cost_basis"),
  value: numeric("value").notNull(),
  lastPrice: numeric("last_price").notNull(),
  priceAsOf: timestamp("price_as_of").notNull(),
});

// New schema for securities
export const securities = pgTable("securities", {
  id: serial("id").primaryKey(),
  securityId: text("security_id").notNull().unique(),
  name: text("name").notNull(),
  tickerSymbol: text("ticker_symbol"),
  type: text("type").notNull(),
  closePrice: numeric("close_price"),
  updateDate: timestamp("update_date"),
});

// Export schemas and types
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPlaidAccountSchema = createInsertSchema(plaidAccounts);
export const insertAccountSchema = createInsertSchema(accounts);
export const insertTransactionSchema = createInsertSchema(transactions);
export const insertHoldingSchema = createInsertSchema(investmentHoldings);
export const insertSecuritySchema = createInsertSchema(securities);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPlaidAccount = z.infer<typeof insertPlaidAccountSchema>;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertHolding = z.infer<typeof insertHoldingSchema>;
export type InsertSecurity = z.infer<typeof insertSecuritySchema>;

export type User = typeof users.$inferSelect;
export type PlaidAccount = typeof plaidAccounts.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type InvestmentHolding = typeof investmentHoldings.$inferSelect;
export type Security = typeof securities.$inferSelect;