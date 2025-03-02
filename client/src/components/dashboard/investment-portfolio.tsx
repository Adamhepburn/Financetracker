import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { InvestmentHolding } from "@shared/schema";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

interface EnrichedHolding extends InvestmentHolding {
  securityName: string;
  tickerSymbol?: string | null;
  securityType?: string;
}

export function InvestmentPortfolio() {
  const { data: holdings, isLoading } = useQuery<EnrichedHolding[]>({
    queryKey: ["/api/investments/holdings"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investment Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const portfolioValue = holdings?.reduce((sum, holding) => sum + Number(holding.value), 0) || 0;

  const holdingsByValue = holdings?.reduce((acc, holding) => {
    const displayName = holding.tickerSymbol || holding.securityName;
    const value = Number(holding.value);
    acc[displayName] = (acc[displayName] || 0) + value;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(holdingsByValue || {}).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2)),
  }));

  if (!holdings?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investment Portfolio</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">No investment data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Investment Portfolio</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
          <p className="text-2xl font-bold">${portfolioValue.toFixed(2)}</p>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}