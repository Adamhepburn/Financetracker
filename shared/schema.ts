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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPlaidAccountSchema = createInsertSchema(plaidAccounts);
export const insertAccountSchema = createInsertSchema(accounts);
export const insertTransactionSchema = createInsertSchema(transactions);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPlaidAccount = z.infer<typeof insertPlaidAccountSchema>;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type User = typeof users.$inferSelect;
export type PlaidAccount = typeof plaidAccounts.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
