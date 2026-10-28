import type { AccountType, TransactionCategory } from './api';

export function formatCategoryLabel(category: TransactionCategory) {
  if (category === 'EATOUT') {
    return 'Eat Out';
  }

  return category.charAt(0) + category.slice(1).toLowerCase();
}

export function formatAccountType(type: AccountType) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}
