import toast from 'react-hot-toast';

export const notify = {
  success: (message: string) => toast.success(message, {
    duration: 3000,
    position: 'top-right',
    style: {
      background: 'var(--toast-bg-success)',
      color: 'var(--toast-text)',
    },
  }),
  
  error: (message: string) => toast.error(message, {
    duration: 4000,
    position: 'top-right',
    style: {
      background: 'var(--toast-bg-error)',
      color: 'var(--toast-text)',
    },
  }),
  
  info: (message: string) => toast(message, {
    duration: 3000,
    position: 'top-right',
    icon: 'ℹ️',
    style: {
      background: 'var(--toast-bg-info)',
      color: 'var(--toast-text)',
    },
  }),
  
  loading: (message: string) => toast.loading(message, {
    position: 'top-right',
    style: {
      background: 'var(--toast-bg-info)',
      color: 'var(--toast-text)',
    },
  }),
  
  promise: <T,>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: string }
  ) => toast.promise(promise, msgs, {
    position: 'top-right',
  }),
};
