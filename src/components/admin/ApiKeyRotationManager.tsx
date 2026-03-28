import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Key, AlertTriangle, CheckCircle, Clock, RefreshCw, Shield, ExternalLink } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";

interface ApiKeyRotation {
  id: string;
  key_name: string;
  key_description: string | null;
  last_rotated_at: string | null;
  rotation_interval_days: number;
  rotated_by: string | null;
  notes: string | null;
  is_critical: boolean;
  created_at: string;
  updated_at: string;
}

export function ApiKeyRotationManager() {
  const [keys, setKeys] = useState<ApiKeyRotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKeyRotation | null>(null);
  const [rotationNotes, setRotationNotes] = useState("");

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_key_rotation_tracking')
        .select('*')
        .order('is_critical', { ascending: false })
        .order('key_name');

      if (error) throw error;
      setKeys(data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Failed to load API key rotation data');
    } finally {
      setLoading(false);
    }
  };

  const getNextRotationDate = (key: ApiKeyRotation) => {
    const baseDate = key.last_rotated_at ? new Date(key.last_rotated_at) : new Date(key.created_at);
    return addDays(baseDate, key.rotation_interval_days);
  };

  const getDaysUntilRotation = (key: ApiKeyRotation) => {
    const nextRotation = getNextRotationDate(key);
    return differenceInDays(nextRotation, new Date());
  };

  const getRotationStatus = (key: ApiKeyRotation) => {
    const daysUntil = getDaysUntilRotation(key);
    if (daysUntil < 0) return { status: 'overdue', color: 'destructive', icon: AlertTriangle };
    if (daysUntil <= 14) return { status: 'due-soon', color: 'warning', icon: Clock };
    return { status: 'ok', color: 'success', icon: CheckCircle };
  };

  const handleRotateClick = (key: ApiKeyRotation) => {
    setSelectedKey(key);
    setRotationNotes("");
    setRotateDialogOpen(true);
  };

  const handleMarkAsRotated = async () => {
    if (!selectedKey) return;

    try {
      const { error } = await supabase
        .from('api_key_rotation_tracking')
        .update({
          last_rotated_at: new Date().toISOString(),
          notes: rotationNotes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedKey.id);

      if (error) throw error;

      toast.success(`${selectedKey.key_name} marked as rotated`);
      setRotateDialogOpen(false);
      fetchKeys();

      // Log to audit
      await supabase.from('audit_logs').insert({
        action: 'API_KEY_ROTATED',
        resource_type: 'api_key',
        details: { key_name: selectedKey.key_name, notes: rotationNotes },
        severity: 'info'
      });
    } catch (error) {
      console.error('Error updating rotation:', error);
      toast.error('Failed to update rotation status');
    }
  };

  const overdueKeys = keys.filter(k => getDaysUntilRotation(k) < 0);
  const dueSoonKeys = keys.filter(k => {
    const days = getDaysUntilRotation(k);
    return days >= 0 && days <= 14;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Loading API key data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {overdueKeys.length > 0 && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  {overdueKeys.length} API key{overdueKeys.length > 1 ? 's' : ''} overdue for rotation
                </p>
                <p className="text-sm text-muted-foreground">
                  {overdueKeys.map(k => k.key_name).join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {dueSoonKeys.length > 0 && !overdueKeys.length && (
        <Card className="border-warning bg-warning/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium text-warning">
                  {dueSoonKeys.length} API key{dueSoonKeys.length > 1 ? 's' : ''} due for rotation soon
                </p>
                <p className="text-sm text-muted-foreground">
                  {dueSoonKeys.map(k => k.key_name).join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Key Rotation Tracking
              </CardTitle>
              <CardDescription>
                Monitor and track API key rotations for security compliance
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/API_KEY_ROTATION_GUIDE.md" target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Guide
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Last Rotated</TableHead>
                <TableHead>Next Rotation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => {
                const { status, color, icon: StatusIcon } = getRotationStatus(key);
                const daysUntil = getDaysUntilRotation(key);
                
                return (
                  <TableRow key={key.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{key.key_name}</span>
                        {key.is_critical && (
                          <Badge variant="destructive" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Critical
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {key.key_description || '-'}
                    </TableCell>
                    <TableCell>
                      {key.last_rotated_at ? (
                        <span className="text-sm">
                          {format(new Date(key.last_rotated_at), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {format(getNextRotationDate(key), 'MMM d, yyyy')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={color === 'destructive' ? 'destructive' : color === 'warning' ? 'secondary' : 'outline'}
                        className={color === 'success' ? 'border-green-500 text-green-600' : color === 'warning' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : ''}
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {daysUntil < 0 
                          ? `${Math.abs(daysUntil)} days overdue`
                          : daysUntil === 0 
                            ? 'Due today'
                            : `${daysUntil} days`
                        }
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={status === 'overdue' ? 'destructive' : 'outline'}
                        onClick={() => handleRotateClick(key)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Mark Rotated
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rotation Dialog */}
      <Dialog open={rotateDialogOpen} onOpenChange={setRotateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Key as Rotated</DialogTitle>
            <DialogDescription>
              Confirm that you have rotated {selectedKey?.key_name} following the rotation guide.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
              <p className="font-medium">Before marking as rotated, ensure you have:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Generated a new key in the service provider's dashboard</li>
                <li>Updated the secret in Supabase Dashboard</li>
                <li>Tested that the application works with the new key</li>
                <li>Revoked or scheduled deletion of the old key</li>
              </ul>
            </div>
            
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="Add any notes about this rotation..."
                value={rotationNotes}
                onChange={(e) => setRotationNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRotateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsRotated}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Rotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ApiKeyRotationManager;
