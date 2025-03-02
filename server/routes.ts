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
    console.log('Fetched accounts from Plaid:', accounts.length);

    // Store accounts
    for (const account of accounts) {
      await storage.createAccount({
        plaidAccountId,
        plaidAccountId2: account.account_id,
        name: account.name,
        type: account.type,
        subtype: account.subtype || null,
        balance: account.balances.current?.toString() || "0",
        isoCurrencyCode: account.balances.iso_currency_code || 'USD',
      });
    }

    // Sync investment holdings if available
    try {
      const holdingsResponse = await plaidClient.investmentsHoldingsGet({ access_token: accessToken });
      console.log('Fetched investment holdings from Plaid:', holdingsResponse.data.holdings.length);

      // Store securities
      for (const security of holdingsResponse.data.securities) {
        await storage.createSecurity({
          securityId: security.security_id,
          name: security.name,
          tickerSymbol: security.ticker_symbol || null,
          type: security.type,
          closePrice: security.close_price?.toString(),
          updateDate: new Date(security.update_datetime || Date.now()),
        });
      }

      // Store holdings
      for (const holding of holdingsResponse.data.holdings) {
        const account = await storage.getAccountByPlaidId(holding.account_id);
        if (account) {
          await storage.createHolding({
            accountId: account.id,
            securityId: holding.security_id,
            quantity: holding.quantity.toString(),
            costBasis: holding.cost_basis?.toString() || null,
            value: holding.institution_value.toString(),
            lastPrice: holding.institution_price.toString(),
            priceAsOf: new Date(holding.institution_price_as_of),
          });
        }
      }
    } catch (error) {
      console.log('No investment data available or error fetching:', error);
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

    console.log('Fetched transactions from Plaid:', transactionsResponse.data.transactions.length);

    // Store transactions
    let storedTransactions = 0;
    for (const transaction of transactionsResponse.data.transactions) {
      const account = await storage.getAccountByPlaidId(transaction.account_id);
      if (account) {
        // Convert amount to negative for expenses (default Plaid behavior)
        // Plaid returns positive amounts for withdrawals/expenses
        const amount = (-transaction.amount).toString();

        await storage.createTransaction({
          accountId: account.id,
          plaidTransactionId: transaction.transaction_id,
          date: new Date(transaction.date),
          name: transaction.name,
          amount: amount,
          category: transaction.category ? transaction.category[0] : null,
          pending: transaction.pending,
        });
        storedTransactions++;
      } else {
        console.log('Could not find account for transaction:', transaction.account_id);
      }
    }

    // Log the sync results
    console.log(`Synced ${accounts.length} accounts and ${storedTransactions} transactions`);
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
        products: ["transactions", "investments"] as Products[],
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

  app.get("/api/investments/holdings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const holdings = await storage.getHoldingsByUserId(req.user.id);
      // Enrich holdings with security names
      const enrichedHoldings = await Promise.all(holdings.map(async (holding) => {
        const security = await storage.getSecurityById(holding.securityId);
        return {
          ...holding,
          securityName: security?.name || 'Unknown Security',
          tickerSymbol: security?.tickerSymbol,
          securityType: security?.type
        };
      }));

      console.log('Fetched enriched holdings:', enrichedHoldings.length);
      res.json(enrichedHoldings);
    } catch (error) {
      console.error('Error fetching holdings:', error);
      res.status(500).json({ error: "Failed to fetch holdings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}