
export function Avatar({ value, className = "" }: { value?: string; className?: string }) {
  if (!value) return null;
  
  if (value.startsWith('path:')) {
    const src = value.substring(5);
    return (
      <img 
        src={src} 
        alt="Avatar"
        className={`object-cover bg-slate-900 ${className}`}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 'inherit'
        }}
      />
    );
  }
  
  return (
    <span className={`flex items-center justify-center select-none ${className}`}>
      {value}
    </span>
  );
}
