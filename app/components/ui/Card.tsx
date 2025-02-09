interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
   <div className={`bg-white rounded-lg shadow p-3 sm:p-6 w-full max-w-[95vw] sm:max-w-4xl ${className}`}>
  {children}
</div>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }: CardProps) {
  return (
    <h2 className={`text-2xl font-bold ${className}`}>
      {children}
    </h2>
  );
}

export function CardContent({ children, className = "" }: CardProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}