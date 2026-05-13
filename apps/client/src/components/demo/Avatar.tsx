interface AvatarProps {
  name: string;
}

export function Avatar({ name }: AvatarProps) {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-medium">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
