import { useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function PlaidLinkButton() {
  const [token, setToken] = useState<string | null>(null);
  const { toast } = useToast();

  const { refetch: getLinkToken } = useQuery({
    queryKey: ["/api/plaid/create-link-token"],
    enabled: false,
  });

  const exchangeToken = useMutation({
    mutationFn: async (publicToken: string) => {
      const res = await apiRequest("POST", "/api/plaid/exchange-token", {
        public_token: publicToken,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Account connected",
        description: "Your bank account has been successfully connected",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { open, ready } = usePlaidLink({
    token,
    onSuccess: (public_token, metadata) => {
      exchangeToken.mutate(public_token);
    },
  });

  const handleClick = async () => {
    const { data } = await getLinkToken();
    setToken(data.link_token);
    open();
  };

  return (
    <Button
      onClick={handleClick}
      disabled={!ready || exchangeToken.isPending}
    >
      {exchangeToken.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Plus className="mr-2 h-4 w-4" />
      )}
      Connect Bank Account
    </Button>
  );
}
