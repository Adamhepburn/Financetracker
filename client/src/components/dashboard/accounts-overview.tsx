import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Account } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export function AccountsOverview() {
  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accounts Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalBalance = accounts?.reduce((sum, account) => sum + Number(account.balance), 0) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">Total Balance</p>
          <p className="text-2xl font-bold">${totalBalance.toFixed(2)}</p>
        </div>
        <div className="space-y-4">
          {accounts?.map((account) => (
            <div key={account.id} className="flex justify-between items-center">
              <div>
                <p className="font-medium">{account.name}</p>
                <p className="text-sm text-muted-foreground">{account.type}</p>
              </div>
              <p className="font-medium">${Number(account.balance).toFixed(2)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
