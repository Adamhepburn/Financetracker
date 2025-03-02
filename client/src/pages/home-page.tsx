import { AccountsOverview } from "@/components/dashboard/accounts-overview";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { ExpenseChart } from "@/components/dashboard/expense-chart";
import { InvestmentPortfolio } from "@/components/dashboard/investment-portfolio";
import { PlaidLinkButton } from "@/components/plaid/link-button";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function HomePage() {
  const { logoutMutation, user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Finance Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.username}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-end mb-6">
          <PlaidLinkButton />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AccountsOverview />
          <ExpenseChart />
          <RecentTransactions />
          <div className="md:col-span-2 lg:col-span-3">
            <InvestmentPortfolio />
          </div>
        </div>
      </main>
    </div>
  );
}