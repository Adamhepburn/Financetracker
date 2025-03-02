import { useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LinkTokenResponse {
  link_token: string;
}

interface ExchangeTokenData {
  public_token: string;
  institution_id: string;
}

export function PlaidLinkButton() {
  const [token, setToken] = useState<string | null>(null);
  const { toast } = useToast();

  const linkTokenMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/plaid/create-link-token");
      return res.json() as Promise<LinkTokenResponse>;
    },
    onSuccess: (data) => {
      setToken(data.link_token);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to initialize Plaid",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const exchangeToken = useMutation({
    mutationFn: async (data: ExchangeTokenData) => {
      const res = await apiRequest("POST", "/api/plaid/exchange-token", data);
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
      exchangeToken.mutate({
        public_token,
        institution_id: metadata.institution?.institution_id ?? "",
      });
    },
  });

  const handleClick = () => {
    linkTokenMutation.mutate();
  };

  return (
    <Button
      onClick={handleClick}
      disabled={!ready || linkTokenMutation.isPending || exchangeToken.isPending}
    >
      {(linkTokenMutation.isPending || exchangeToken.isPending) ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Plus className="mr-2 h-4 w-4" />
      )}
      Connect Bank Account
    </Button>
  );
}