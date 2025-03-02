import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { Configuration, PlaidApi, PlaidEnvironments, CountryCode, Products } from "plaid";
import { insertPlaidAccountSchema } from "@shared/schema";

const plaidClient = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV || "sandbox"],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
        "PLAID-SECRET": process.env.PLAID_SECRET,
      },
    },
  })
);

async function syncPlaidData(plaidAccountId: number, accessToken: string) {
  try {
    // Get accounts
    const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
    const accounts = accountsResponse.data.accounts;

    // Store accounts
    for (const account of accounts) {
      await storage.createAccount({
        plaidAccountId,
        plaidAccountId2: account.account_id,
        name: account.name,
        type: account.type,
        subtype: account.subtype || null,
        balance: account.balances.current || 0,
        isoCurrencyCode: account.balances.iso_currency_code || 'USD',
      });
    }

    // Get transactions from the last 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();

    const transactionsResponse = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    });

    // Store transactions
    for (const transaction of transactionsResponse.data.transactions) {
      const account = await storage.getAccountByPlaidId(transaction.account_id);
      if (account) {
        await storage.createTransaction({
          accountId: account.id,
          plaidTransactionId: transaction.transaction_id,
          date: new Date(transaction.date),
          name: transaction.name,
          amount: transaction.amount,
          category: transaction.category ? transaction.category[0] : null,
          pending: transaction.pending,
        });
      }
    }
  } catch (error) {
    console.error('Error syncing Plaid data:', error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.post("/api/plaid/create-link-token", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const request = {
        user: { client_user_id: req.user.id.toString() },
        client_name: "Finance Dashboard",
        products: ["transactions"] as Products[],
        country_codes: ["US"] as CountryCode[],
        language: "en",
      };

      const response = await plaidClient.linkTokenCreate(request);
      res.json(response.data);
    } catch (error) {
      console.error("Plaid link token creation error:", error);
      res.status(500).json({ error: "Failed to create link token" });
    }
  });

  app.post("/api/plaid/exchange-token", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const exchange = await plaidClient.itemPublicTokenExchange({
        public_token: req.body.public_token,
      });

      const institution = await plaidClient.institutionsGetById({
        institution_id: req.body.institution_id,
        country_codes: ["US"] as CountryCode[],
      });

      const plaidAccount = await storage.createPlaidAccount({
        userId: req.user.id,
        accessToken: exchange.data.access_token,
        itemId: exchange.data.item_id,
        institutionName: institution.data.institution.name,
        lastSync: new Date(),
      });

      // Sync account and transaction data
      await syncPlaidData(plaidAccount.id, exchange.data.access_token);

      res.json(plaidAccount);
    } catch (error) {
      console.error("Plaid token exchange error:", error);
      res.status(500).json({ error: "Failed to exchange token" });
    }
  });

  app.get("/api/accounts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const accounts = await storage.getAccountsByUserId(req.user.id);
    res.json(accounts);
  });

  app.get("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const transactions = await storage.getTransactionsByUserId(req.user.id);
    res.json(transactions);
  });

  const httpServer = createServer(app);
  return httpServer;
}