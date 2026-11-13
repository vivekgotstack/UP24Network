'use client';

import { AlertDialog } from 'radix-ui';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  cancelLabel = 'Cancel',
  destructive = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => unknown | Promise<unknown>;
  cancelLabel?: string;
  destructive?: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(value) => {
        if (submitting) return;
        setError('');
        onOpenChange(value);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="confirmation-overlay" />
        <AlertDialog.Content className="confirmation-dialog" aria-busy={submitting}>
          <AlertDialog.Title>{title}</AlertDialog.Title>
          <AlertDialog.Description>{description}</AlertDialog.Description>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <div className="cms-row-actions">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" disabled={submitting}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                variant={destructive ? 'destructive' : 'default'}
                disabled={submitting}
                onClick={async (event) => {
                  event.preventDefault();
                  setSubmitting(true);
                  setError('');
                  try {
                    const result = await onConfirm();
                    if (result === false)
                      setError(
                        'The change could not be completed. Close this dialog and review the message on the page.',
                      );
                    else onOpenChange(false);
                  } catch (reason) {
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : 'The change could not be completed. Please try again.',
                    );
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {submitting ? 'Updating…' : confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
