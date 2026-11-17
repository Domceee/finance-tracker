import type MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';

export type NavItem = {
  screen: string;
  href: '/' | '/explore' | '/accounts' | '/overview' | '/profile';
  label: string;
  icon: ComponentProps<typeof MaterialIcons>['name'];
};

export const NAV_ITEMS: NavItem[] = [
  { screen: 'index', href: '/', label: 'Dashboard', icon: 'home' },
  { screen: 'explore', href: '/explore', label: 'Transactions', icon: 'receipt-long' },
  { screen: 'accounts', href: '/accounts', label: 'Accounts', icon: 'account-balance-wallet' },
  { screen: 'overview', href: '/overview', label: 'Overview', icon: 'bar-chart' },
  { screen: 'profile', href: '/profile', label: 'Profile', icon: 'person' },
];

export function isActiveNavItem(pathname: string, item: NavItem) {
  return item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
}
