import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  Trash2,
  Lock,
  Link2Off,
  UserCheck,
  CheckCircle2,
  Loader2,
  XCircle
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import { api } from '../../api/client';
import { DeletePreviewData, AllowedAction } from '../../types';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string;
  subId?: string;
  entityTitle?: string;
  onSuccess: (message: string) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  subId,
  entityTitle,
  onSuccess,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [executing, setExecuting] = useState<boolean>(false);
  const [preview, setPreview] = useState<DeletePreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmedIrreversible, setConfirmedIrreversible] = useState<boolean>(false);

  // Fetch live dependency preview whenever modal opens
  useEffect(() => {
    if (!isOpen || !entityType || !entityId) {
      setPreview(null);
      setError(null);
      setConfirmedIrreversible(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    setConfirmedIrreversible(false);

    api
      .getDeletePreview(entityType, entityId, subId)
      .then((res) => {
        if (isMounted) {
          setPreview(res.data);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err.message || 'Failed to introspect deletion dependencies.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, entityType, entityId, subId]);

  // Determine if permanent deletion can be executed
  const canExecutePermanentDelete = Boolean(
    preview &&
    !preview.isBlocked &&
    confirmedIrreversible &&
    !executing
  );

  // Execute Permanent Delete
  const handlePermanentDelete = async () => {
    if (!canExecutePermanentDelete || !preview) return;

    setExecuting(true);
    setError(null);
    try {
      const res = await api.confirmPermanentDelete(entityType, entityId, subId);
      onSuccess(res.message || 'Record successfully deleted permanently.');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Deletion failed. State may have changed concurrently.');
    } finally {
      setExecuting(false);
    }
  };

  // Execute Alternative Lifecycle Action (Close, Deactivate, Block, Settle, etc.)
  const handleLifecycleAction = async (action: AllowedAction) => {
    if (!action.enabled) return;

    setExecuting(true);
    setError(null);
    try {
      const res = await api.executeLifecycleAction(entityType, entityId, action.action);
      onSuccess(res.message || `Action '${action.label}' completed successfully.`);
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to execute ${action.label}.`);
    } finally {
      setExecuting(false);
    }
  };

  const getActionVariantStyle = (variant: string) => {
    switch (variant) {
      case 'danger':
        return 'danger';
      case 'warning':
        return 'secondary';
      case 'success':
        return 'success';
      default:
        return 'secondary';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!executing) onClose();
      }}
      title={preview?.entityTitle || entityTitle || `Delete ${entityType}`}
      description="Live CockroachDB Referential Dependency Analysis & Impact Assessment"
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between w-full gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={executing}
          >
            Cancel
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {/* Alternative Action Buttons (Close, Deactivate, Block, Settle) */}
            {preview &&
              preview.allowedActions
                .filter((a) => a.action !== 'delete_permanent')
                .map((action) => (
                  <div key={action.action} className="relative group">
                    <Button
                      variant={getActionVariantStyle(action.variant)}
                      size="sm"
                      onClick={() => handleLifecycleAction(action)}
                      disabled={!action.enabled || executing}
                      isLoading={executing}
                      className={
                        action.variant === 'warning'
                          ? 'border-amber-500/40 text-amber-300 hover:bg-amber-500/10'
                          : ''
                      }
                    >
                      {action.label}
                    </Button>
                    {!action.enabled && action.disabledReason && (
                      <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50 w-64 p-2 bg-obsidian-950 border border-obsidian-700 text-xs text-obsidian-300 rounded shadow-xl pointer-events-none">
                        {action.disabledReason}
                      </div>
                    )}
                  </div>
                ))}

            {/* Permanent Delete Action Button */}
            <div className="relative group">
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={handlePermanentDelete}
                disabled={!canExecutePermanentDelete}
                isLoading={executing}
              >
                Delete Permanently
              </Button>
              {preview?.isBlocked && (
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50 w-72 p-2 bg-obsidian-950 border border-rose-500/40 text-xs text-rose-300 rounded shadow-xl pointer-events-none">
                  {preview.blockReasons[0] || 'Permanent deletion is restricted by database constraints.'}
                </div>
              )}
              {!preview?.isBlocked && !confirmedIrreversible && (
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50 w-64 p-2 bg-obsidian-950 border border-obsidian-700 text-xs text-obsidian-300 rounded shadow-xl pointer-events-none">
                  Check confirmation box to enable permanent deletion.
                </div>
              )}
            </div>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-obsidian-400">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <div className="text-sm font-medium text-obsidian-200">
            Querying CockroachDB Dependencies...
          </div>
          <div className="text-xs text-obsidian-500">
            Introspecting foreign keys, ledger transactions, and child records in finora_da3
          </div>
        </div>
      ) : error ? (
        <div className="py-6 space-y-4">
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-rose-300">
                Action Blocked / Error
              </div>
              <div className="text-xs text-rose-200/80 mt-1">{error}</div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setLoading(true);
                api
                  .getDeletePreview(entityType, entityId, subId)
                  .then((res) => {
                    setPreview(res.data);
                    setError(null);
                    setLoading(false);
                  })
                  .catch((e: any) => {
                    setError(e.message);
                    setLoading(false);
                  });
              }}
            >
              Retry Dependency Check
            </Button>
          </div>
        </div>
      ) : preview ? (
        <div className="space-y-5">
          {/* Status / Warning Notification Banner */}
          {preview.isBlocked ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-amber-200">
                  Permanent Deletion Restricted
                </div>
                <div className="text-xs text-amber-300/90">
                  This record cannot be deleted because of active structural dependencies or corporate hierarchy rules:
                </div>
                <ul className="text-xs text-amber-200/90 list-disc list-inside space-y-0.5 pt-1">
                  {preview.blockReasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
                <div className="text-[11px] text-obsidian-400 pt-1 leading-relaxed">
                  Reassign attached resources or transfer domiciled accounts to enable deletion, or execute an alternative lifecycle action (e.g. Deactivate) below.
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-rose-200">
                  Permanent Deletion Warning
                </div>
                <div className="text-xs text-rose-200/90 leading-relaxed">
                  {preview.consequenceWarning ||
                    'This action will permanently delete this record and its associated dependencies from CockroachDB.'}
                </div>
                <div className="text-[11px] text-rose-400/80 pt-0.5">
                  This operation is final, atomic, and cannot be undone.
                </div>
              </div>
            </div>
          )}

          {/* Impact Matrix Grid (4 cards: To Delete, To Remove, Retained, Protected Financial Records) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 1. Records to Delete */}
            <div className="p-3.5 rounded-xl bg-obsidian-950/60 border border-obsidian-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-rose-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Records to Delete
                </span>
                <span className="text-[11px] text-obsidian-500 font-mono">
                  {preview.impact.recordsToDelete.reduce((acc, r) => acc + r.count, 0)} items
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                {preview.impact.recordsToDelete.length === 0 ? (
                  <div className="text-xs text-obsidian-500 italic">None</div>
                ) : (
                  preview.impact.recordsToDelete.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-obsidian-900/60 border border-obsidian-800/80 text-xs"
                    >
                      <div>
                        <span className="font-medium text-obsidian-200">{item.label}</span>
                        <p className="text-[10px] text-obsidian-500">{item.description}</p>
                      </div>
                      <Badge variant="rose" size="sm">
                        {item.count}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. Relationships to Sever */}
            <div className="p-3.5 rounded-xl bg-obsidian-950/60 border border-obsidian-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Link2Off className="w-3.5 h-3.5 text-amber-400" /> Relationships to Remove
                </span>
                <span className="text-[11px] text-obsidian-500 font-mono">
                  {preview.impact.relationshipsToRemove.reduce((acc, r) => acc + r.count, 0)} links
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                {preview.impact.relationshipsToRemove.length === 0 ? (
                  <div className="text-xs text-obsidian-500 italic">None</div>
                ) : (
                  preview.impact.relationshipsToRemove.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-obsidian-900/60 border border-obsidian-800/80 text-xs"
                    >
                      <div>
                        <span className="font-medium text-obsidian-200">{item.label}</span>
                        <p className="text-[10px] text-obsidian-500">{item.description}</p>
                      </div>
                      <Badge variant="amber" size="sm">
                        {item.count}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. Retained Records */}
            <div className="p-3.5 rounded-xl bg-obsidian-950/60 border border-obsidian-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-cyan-400" /> Retained Records
                </span>
                <span className="text-[11px] text-obsidian-500 font-mono">
                  {preview.impact.retainedRecords.reduce((acc, r) => acc + r.count, 0)} records
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                {preview.impact.retainedRecords.length === 0 ? (
                  <div className="text-xs text-obsidian-500 italic">None</div>
                ) : (
                  preview.impact.retainedRecords.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-obsidian-900/60 border border-obsidian-800/80 text-xs"
                    >
                      <div>
                        <span className="font-medium text-obsidian-200">{item.label}</span>
                        <p className="text-[10px] text-obsidian-500">{item.description}</p>
                      </div>
                      <Badge variant="cyan" size="sm">
                        {item.count}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 4. Protected Financial History */}
            <div className="p-3.5 rounded-xl bg-obsidian-950/60 border border-obsidian-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-violet-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-violet-400" /> Protected Financial History
                </span>
                <span className="text-[11px] text-obsidian-500 font-mono">
                  {preview.impact.protectedFinancialRecords.reduce((acc, r) => acc + r.count, 0)} records
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                {preview.impact.protectedFinancialRecords.length === 0 ? (
                  <div className="text-xs text-obsidian-500 italic">None (No linked financial ledger records)</div>
                ) : (
                  preview.impact.protectedFinancialRecords.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-obsidian-900/60 border border-obsidian-800/80 text-xs"
                    >
                      <div>
                        <span className="font-medium text-obsidian-200">{item.label}</span>
                        <p className="text-[10px] text-violet-300/80">{item.description}</p>
                      </div>
                      <Badge variant="violet" size="sm" className="bg-violet-500/10 text-violet-400 border-violet-500/30">
                        {item.count}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Single Standard Confirmation Checkbox */}
          {!preview.isBlocked && (
            <div className="p-3.5 rounded-xl bg-obsidian-950/60 border border-obsidian-800 flex items-start gap-3">
              <input
                type="checkbox"
                id="confirm-delete-checkbox"
                checked={confirmedIrreversible}
                onChange={(e) => setConfirmedIrreversible(e.target.checked)}
                className="mt-0.5 rounded border-obsidian-700 bg-obsidian-900 text-rose-500 focus:ring-rose-500/40 focus:ring-offset-obsidian-950 cursor-pointer"
              />
              <label
                htmlFor="confirm-delete-checkbox"
                className="text-xs text-obsidian-200 cursor-pointer select-none leading-relaxed"
              >
                I understand that this action is permanent and cannot be undone.
              </label>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
};
