'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/useTranslation';
import { useActingBrokerage } from '../../components/acting-brokerage-picker';
import type { CrsIpWhitelistEntry } from '@/lib/customer-risk/types';
import {
  defaultActorName,
  deleteIp,
  listIps,
  pushAuditEntry,
  upsertIp,
} from '@/lib/customer-risk/mock-store';
import { formatDateTime } from '@/lib/customer-risk/format';

function showSuccess(msg: string) {
  toast.custom(
    () => (
      <Alert variant="mono" icon="success">
        <AlertIcon>
          <RiCheckboxCircleFill />
        </AlertIcon>
        <AlertTitle>{msg}</AlertTitle>
      </Alert>
    ),
    { position: 'top-center' },
  );
}

interface DraftIp {
  id?: string;
  ipAddress: string;
  label: string;
}

const EMPTY: DraftIp = { ipAddress: '', label: '' };

export function AdminIpsContent() {
  const { t } = useTranslation('customer-risk');
  const { brokerageId, tick } = useActingBrokerage();
  const [ips, setIps] = useState<CrsIpWhitelistEntry[]>([]);
  const [draft, setDraft] = useState<DraftIp | null>(null);

  const refresh = () => {
    if (!brokerageId) {
      setIps([]);
      return;
    }
    setIps(listIps(brokerageId));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brokerageId, tick]);

  const openAdd = () => setDraft({ ...EMPTY });
  const openEdit = (ip: CrsIpWhitelistEntry) =>
    setDraft({ id: ip.id, ipAddress: ip.ipAddress, label: ip.label });

  const handleSave = () => {
    if (!draft || !brokerageId) return;
    const actor = defaultActorName(brokerageId);
    const isEdit = !!draft.id;
    upsertIp({
      id: draft.id,
      brokerageId,
      ipAddress: draft.ipAddress.trim(),
      label: draft.label.trim(),
      addedByUserName: actor,
    });
    pushAuditEntry({
      brokerageId,
      userName: actor,
      action: 'IpWhitelistAdded',
      resourceLabel: draft.ipAddress.trim(),
      details: isEdit ? 'updated' : 'added',
    });
    showSuccess(t('toastIpSaved', { defaultValue: 'IP saved.' }));
    setDraft(null);
    refresh();
  };

  const handleDelete = (ip: CrsIpWhitelistEntry) => {
    if (!brokerageId) return;
    if (!window.confirm(t('confirmIpDelete', { defaultValue: 'Remove this IP?' }))) return;
    const actor = defaultActorName(brokerageId);
    deleteIp(ip.id);
    pushAuditEntry({
      brokerageId,
      userName: actor,
      action: 'IpWhitelistRemoved',
      resourceLabel: ip.ipAddress,
    });
    showSuccess(t('toastIpDeleted', { defaultValue: 'IP removed.' }));
    refresh();
  };

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Card className="bg-rose-50/25! border-rose-100! dark:bg-rose-950/25! dark:border-rose-900! shadow-lg shadow-black/5">
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text={t('pageTitleAdminIps', { defaultValue: 'IP Whitelist' })} />
              <ToolbarDescription>{t('descAdminIps')}</ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
        </CardContent>
      </Card>

      <div
        className={
          'space-y-5 lg:space-y-7.5 ' +
          '[&_div.rounded-xl.bg-card]:bg-rose-50/25! ' +
          '[&_div.rounded-xl.bg-card]:border-rose-100! ' +
          'dark:[&_div.rounded-xl.bg-card]:bg-rose-950/25! ' +
          'dark:[&_div.rounded-xl.bg-card]:border-rose-900! ' +
          '[&_div.rounded-xl.bg-card]:shadow-lg ' +
          '[&_div.rounded-xl.bg-card]:shadow-black/5'
        }
      >
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-end mb-4">
              <Button onClick={openAdd}>
                <Plus className="size-4" />
                {t('ipAdd', { defaultValue: 'Add IP' })}
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ipAddress', { defaultValue: 'IP address' })}</TableHead>
                  <TableHead>{t('ipLabel', { defaultValue: 'Label' })}</TableHead>
                  <TableHead>{t('ipAddedBy', { defaultValue: 'Added by' })}</TableHead>
                  <TableHead>{t('ipAddedAt', { defaultValue: 'Added at' })}</TableHead>
                  <TableHead className="text-center w-24">{t('actions', { defaultValue: 'Actions' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ips.map((ip) => (
                  <TableRow key={ip.id}>
                    <TableCell className="font-mono text-xs">{ip.ipAddress}</TableCell>
                    <TableCell>{ip.label}</TableCell>
                    <TableCell className="text-xs">{ip.addedByUserName}</TableCell>
                    <TableCell className="text-xs">{formatDateTime(ip.addedAt)}</TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" mode="icon" size="sm" onClick={() => openEdit(ip)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" mode="icon" size="sm" onClick={() => handleDelete(ip)}>
                          <Trash2 className="size-4 text-rose-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {ips.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {t('noIps', { defaultValue: 'No IPs.' })}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {draft?.id
                ? t('ipEdit', { defaultValue: 'Edit IP' })
                : t('ipAdd', { defaultValue: 'Add IP' })}
            </DialogTitle>
            <DialogDescription>{t('descAdminIps')}</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{t('ipAddress', { defaultValue: 'IP address' })}</Label>
                <Input
                  value={draft.ipAddress}
                  onChange={(e) => setDraft({ ...draft, ipAddress: e.target.value })}
                  placeholder="10.20.30.40"
                />
              </div>
              <div className="space-y-1">
                <Label>{t('ipLabel', { defaultValue: 'Label' })}</Label>
                <Input
                  value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              {t('cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!draft?.ipAddress.trim() || !draft?.label.trim()}
            >
              {t('save', { defaultValue: 'Save' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
