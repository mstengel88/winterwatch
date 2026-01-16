import { useState } from 'react';
import { Account, ServiceType } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MapPin, Building2, Phone, Search, LogIn } from 'lucide-react';

interface AccountListProps {
  accounts: Account[];
  onCheckIn: (accountId: string, serviceType?: ServiceType) => Promise<boolean>;
  isLoading?: boolean;
  variant?: 'plow' | 'shovel';
}

export function AccountList({ 
  accounts, 
  onCheckIn, 
  isLoading = false,
  variant = 'plow'
}: AccountListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const filteredAccounts = accounts.filter(
    (account) =>
      account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCheckIn = async (accountId: string) => {
    setCheckingIn(accountId);
    const serviceType: ServiceType = variant === 'shovel' ? 'shovel' : 'both';
    await onCheckIn(accountId, serviceType);
    setCheckingIn(null);
  };

  const themeClass = variant === 'shovel' ? 'theme-shovel' : 'theme-plow';

  return (
    <div className={`space-y-4 ${themeClass}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search accounts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredAccounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Building2 className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No accounts match your search' : 'No accounts available'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAccounts.map((account) => (
            <Card key={account.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{account.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {account.address}
                      {account.city && `, ${account.city}`}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    Priority {account.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex items-center justify-between">
                  {account.contact_phone && (
                    <a
                      href={`tel:${account.contact_phone}`}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Phone className="h-3 w-3" />
                      {account.contact_phone}
                    </a>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleCheckIn(account.id)}
                    disabled={isLoading || checkingIn === account.id}
                    className="ml-auto"
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    {checkingIn === account.id ? 'Checking in...' : 'Check In'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}