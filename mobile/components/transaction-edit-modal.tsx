import { updateTransaction, type Transaction, type TransactionInput } from '../lib/api';
import { useToast } from '../providers/toast-provider';
import { ModalCard } from './modal-card';
import { TransactionForm } from './transaction-form';

export function TransactionEditModal({
  transaction,
  onClose,
  onSaved,
}: {
  transaction: Transaction | null;
  onClose: () => void;
  onSaved: (transaction: Transaction) => void;
}) {
  const toast = useToast();

  async function handleSubmit(input: TransactionInput) {
    if (!transaction) return;

    const updated = await updateTransaction(transaction.id, input);
    onSaved(updated);
    onClose();
    toast.success('Transaction updated');
  }

  return (
    <ModalCard visible={transaction !== null} title="Edit Transaction" onClose={onClose}>
      {transaction ? (
        <TransactionForm
          key={transaction.id}
          initial={transaction}
          submitLabel="Save Changes"
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      ) : null}
    </ModalCard>
  );
}
