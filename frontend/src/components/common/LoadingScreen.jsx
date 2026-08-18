import Spinner from '../ui/Spinner';

export default function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Spinner size="lg" />
      <p className="mt-4 text-surface-500 text-sm">{message}</p>
    </div>
  );
}
