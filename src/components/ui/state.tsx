export type StateProps = {
  title: string;
  description: string;
  label?: string;
};

export { EmptyState } from './empty-state';
export { ErrorState } from './error-state';
export { LoadingState } from './loading-state';
