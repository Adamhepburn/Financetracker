import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Transaction } from "@shared/schema";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export function RecentTransactions() {
  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions?.slice(0, 5).map((transaction) => (
            <div
              key={transaction.id}
              className="flex justify-between items-center border-b pb-4 last:border-0"
            >
              <div>
                <p className="font-medium">{transaction.name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(transaction.date), "MMM d, yyyy")}
                </p>
              </div>
              <p className={`font-medium ${Number(transaction.amount) > 0 ? "text-green-500" : "text-red-500"}`}>
                ${Math.abs(Number(transaction.amount)).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}