'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Lock, LockOpen, Pencil, Plus, Trash2 } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { BrokerageUserRole, CrsBrokerageUser } from '@/lib/customer-risk/types';
import { ALL_USER_ROLES } from '@/lib/customer-risk/types';
import {
  defaultActorName,
  deleteUser,
  listUsers,
  lockUser,
  pushAuditEntry,
  unlockUser,
  upsertUser,
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

interface DraftUser {
  id?: string;
  username: string;
  displayName: string;
  role: BrokerageUserRole;
  isActive: boolean;
}

const EMPTY: DraftUser = {
  username: '',
  displayName: '',
  role: 'Operator',
  isActive: true,
};

export function AdminUsersContent() {
  const { t } = useTranslation('customer-risk');
  const { brokerageId, tick } = useActingBrokerage();
  const [users, setUsers] = useState<CrsBrokerageUser[]>([]);
  const [draft, setDraft] = useState<DraftUser | null>(null);

  const refresh = () => {
    if (!brokerageId) {
      setUsers([]);
      return;
    }
    setUsers(listUsers(brokerageId));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brokerageId, tick]);

  const openAdd = () => setDraft({ ...EMPTY });
  const openEdit = (u: CrsBrokerageUser) =>
    setDraft({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      role: u.role,
      isActive: u.isActive,
    });

  const handleSave = () => {
    if (!draft || !brokerageId) return;
    const actor = defaultActorName(brokerageId);
    const isEdit = !!draft.id;
    upsertUser({
      id: draft.id,
      brokerageId,
      username: draft.username.trim(),
      displayName: draft.displayName.trim(),
      role: draft.role,
      isActive: draft.isActive,
    });
    pushAuditEntry({
      brokerageId,
      userName: actor,
      action: isEdit ? 'UserUpdated' : 'UserCreated',
      resourceId: draft.id,
      resourceLabel: draft.username,
    });
    showSuccess(t('toastUserSaved', { defaultValue: 'User saved.' }));
    setDraft(null);
    refresh();
  };

  const handleDelete = (u: CrsBrokerageUser) => {
    if (!brokerageId) return;
    if (!window.confirm(t('confirmUserDelete', { defaultValue: 'Remove this user?' }))) return;
    const actor = defaultActorName(brokerageId);
    deleteUser(u.id);
    pushAuditEntry({
      brokerageId,
      userName: actor,
      action: 'UserUpdated',
      resourceId: u.id,
      resourceLabel: u.username,
      details: 'deleted',
    });
    showSuccess(t('toastUserDeleted', { defaultValue: 'User removed.' }));
    refresh();
  };

  const handleLock = (u: CrsBrokerageUser) => {
    if (!brokerageId) return;
    const actor = defaultActorName(brokerageId);
    lockUser(u.id);
    pushAuditEntry({
      brokerageId,
      userName: actor,
      action: 'UserLocked',
      resourceId: u.id,
      resourceLabel: u.username,
    });
    showSuccess(t('toastUserLocked', { defaultValue: 'User locked.' }));
    refresh();
  };

  const handleUnlock = (u: CrsBrokerageUser) => {
    if (!brokerageId) return;
    const actor = defaultActorName(brokerageId);
    unlockUser(u.id);
    pushAuditEntry({
      brokerageId,
      userName: actor,
      action: 'UserUnlocked',
      resourceId: u.id,
      resourceLabel: u.username,
    });
    showSuccess(t('toastUserUnlocked', { defaultValue: 'User unlocked.' }));
    refresh();
  };

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Card className="bg-rose-50/25! border-rose-100! dark:bg-rose-950/25! dark:border-rose-900! shadow-lg shadow-black/5">
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text={t('pageTitleAdminUsers', { defaultValue: 'Brokerage Users' })} />
              <ToolbarDescription>{t('descAdminUsers')}</ToolbarDescription>
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
                {t('userAdd', { defaultValue: 'Add user' })}
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('userUsername', { defaultValue: 'Username' })}</TableHead>
                  <TableHead>{t('userDisplayName', { defaultValue: 'Display name' })}</TableHead>
                  <TableHead>{t('userRole', { defaultValue: 'Role' })}</TableHead>
                  <TableHead className="text-center">{t('userActive', { defaultValue: 'Active' })}</TableHead>
                  <TableHead>{t('userLastLogin', { defaultValue: 'Last login' })}</TableHead>
                  <TableHead>{t('userLockedUntil', { defaultValue: 'Locked until' })}</TableHead>
                  <TableHead className="text-center w-44">{t('actions', { defaultValue: 'Actions' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-xs">{u.username}</TableCell>
                    <TableCell className="font-medium">{u.displayName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" appearance="light" className="text-xs">
                        {t(`userRole${u.role}`, { defaultValue: u.role })}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {u.isActive ? (
                        <Badge variant="success" appearance="light" className="text-xs">
                          {t('userActive', { defaultValue: 'Active' })}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" appearance="light" className="text-xs">
                          —
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : '—'}</TableCell>
                    <TableCell className="text-xs">{u.lockedUntil ? formatDateTime(u.lockedUntil) : '—'}</TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" mode="icon" size="sm" onClick={() => openEdit(u)}>
                          <Pencil className="size-4" />
                        </Button>
                        {u.lockedUntil ? (
                          <Button
                            variant="ghost"
                            mode="icon"
                            size="sm"
                            onClick={() => handleUnlock(u)}
                            title={t('userUnlock', { defaultValue: 'Unlock' })}
                          >
                            <LockOpen className="size-4 text-emerald-600" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            mode="icon"
                            size="sm"
                            onClick={() => handleLock(u)}
                            title={t('userLock', { defaultValue: 'Lock' })}
                          >
                            <Lock className="size-4 text-amber-600" />
                          </Button>
                        )}
                        <Button variant="ghost" mode="icon" size="sm" onClick={() => handleDelete(u)}>
                          <Trash2 className="size-4 text-rose-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t('noUsers', { defaultValue: 'No users.' })}
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
                ? t('userEdit', { defaultValue: 'Edit user' })
                : t('userAdd', { defaultValue: 'Add user' })}
            </DialogTitle>
            <DialogDescription>{t('descAdminUsers')}</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{t('userUsername', { defaultValue: 'Username' })}</Label>
                <Input
                  value={draft.username}
                  onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('userDisplayName', { defaultValue: 'Display name' })}</Label>
                <Input
                  value={draft.displayName}
                  onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('userRole', { defaultValue: 'Role' })}</Label>
                <Select
                  value={draft.role}
                  onValueChange={(v) => setDraft({ ...draft, role: v as BrokerageUserRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_USER_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {t(`userRole${r}`, { defaultValue: r })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>{t('userActive', { defaultValue: 'Active' })}</Label>
                <Switch
                  checked={draft.isActive}
                  onCheckedChange={(v) => setDraft({ ...draft, isActive: v })}
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
              disabled={!draft?.username.trim() || !draft?.displayName.trim()}
            >
              {t('save', { defaultValue: 'Save' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
