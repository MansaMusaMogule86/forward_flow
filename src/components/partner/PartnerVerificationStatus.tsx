import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertCircle, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { NavLink } from "react-router-dom";

interface VerificationStatus {
  id: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  verification_type: string;
  verified_at?: string;
  expires_at?: string;
  notes?: string;
}

export const PartnerVerificationStatus = () => {
  const { user } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchVerificationStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchVerificationStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('partner_verifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        // Log but don't surface to user - show "not verified" state instead
        console.error('Error fetching verification status:', error);
      } else if (data) {
        setVerificationStatus({
          ...data,
          verification_type: data.organization_type
        } as VerificationStatus);
      }
    } catch (error) {
      // Silently fail - component shows "Not Verified" as the fallback state
      console.error('Error fetching verification status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-osu-gray/20">
        <CardContent className="p-6 text-center">
          <div className="animate-spin h-6 w-6 border-2 border-osu-scarlet border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-osu-gray">Loading verification status...</p>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="border-osu-gray/20">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-osu-gray mx-auto mb-3" />
          <h3 className="font-semibold mb-2 text-osu-scarlet">Authentication Required</h3>
          <p className="text-sm text-osu-gray mb-4">
            Please sign in to view your partner verification status.
          </p>
          <Button asChild size="sm" className="bg-osu-scarlet hover:bg-osu-scarlet-dark">
            <NavLink to="/partner-signin">Sign In</NavLink>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = () => {
    if (!verificationStatus) return <Shield className="h-5 w-5 text-osu-gray" />;

    switch (verificationStatus.status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'denied':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Shield className="h-5 w-5 text-osu-gray" />;
    }
  };

  const getStatusBadge = () => {
    if (!verificationStatus) {
      return <Badge variant="outline" className="text-osu-gray border-osu-gray/30">Not Verified</Badge>;
    }

    // Check expiration status if approved
    if (verificationStatus.status === 'approved' && verificationStatus.expires_at) {
      const daysLeft = Math.ceil((new Date(verificationStatus.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 0) {
        return <Badge variant="destructive">Expired</Badge>;
      } else if (daysLeft <= 7) {
        return <Badge className="bg-red-100 text-red-800 border-red-200">Expiring Soon ({daysLeft} days)</Badge>;
      } else if (daysLeft <= 30) {
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Expiring ({daysLeft} days)</Badge>;
      }
    }

    switch (verificationStatus.status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Verified Partner</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Verification Pending</Badge>;
      case 'denied':
        return <Badge variant="destructive">Verification Denied</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired - Renewal Required</Badge>;
      default:
        return <Badge variant="outline" className="text-osu-gray border-osu-gray/30">Unknown Status</Badge>;
    }
  };

  const getStatusMessage = () => {
    if (!verificationStatus) {
      return "You haven't submitted a verification request yet. Apply to become a verified partner to access additional features.";
    }

    switch (verificationStatus.status) {
      case 'approved':
        return "Congratulations! You are a verified partner with full access to all partner features.";
      case 'pending':
        return "Your verification request is being reviewed. We'll notify you once it's processed.";
      case 'denied':
        return verificationStatus.notes || "Your verification request was denied. Please contact support for more information.";
      default:
        return "Your verification status is unclear. Please contact support.";
    }
  };

  return (
    <Card className="border-osu-gray/20">
      <CardHeader className="bg-gradient-to-r from-osu-scarlet/5 to-osu-gray/5">
        <CardTitle className="flex items-center gap-2 text-osu-scarlet">
          {getStatusIcon()}
          Partner Verification Status
        </CardTitle>
        <CardDescription className="text-osu-gray">
          Your current verification level and partner privileges
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-osu-scarlet">Status:</span>
            {getStatusBadge()}
          </div>

          <p className="text-sm text-osu-gray">
            {getStatusMessage()}
          </p>

          {verificationStatus?.verified_at && (
            <div className="space-y-1">
              <p className="text-xs text-osu-gray">
                Verified on: {new Date(verificationStatus.verified_at).toLocaleDateString()}
              </p>
              {verificationStatus.expires_at && (
                <p className="text-xs text-osu-gray">
                  Expires on: {new Date(verificationStatus.expires_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {!verificationStatus && (
            <div className="pt-2">
              <Button asChild size="sm" className="bg-osu-scarlet hover:bg-osu-scarlet-dark">
                <NavLink to="/partners/request-verification">
                  Request Verification
                </NavLink>
              </Button>
            </div>
          )}

          {verificationStatus?.status === 'denied' && (
            <div className="pt-2">
              <Button asChild size="sm" variant="outline" className="border-osu-scarlet text-osu-scarlet hover:bg-osu-scarlet/10">
                <NavLink to="/partners/request-verification">
                  Reapply for Verification
                </NavLink>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};