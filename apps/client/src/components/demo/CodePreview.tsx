interface CodePreviewProps {
  data: unknown;
}

export function CodePreview({ data }: CodePreviewProps) {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 rounded-lg" />
      <pre className="relative p-4 rounded-lg text-sm font-mono overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
