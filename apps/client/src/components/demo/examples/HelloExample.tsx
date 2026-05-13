import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Sparkles, Zap } from "lucide-react";
import { DemoCard, InlineSpinner, CodePreview } from "@/components/demo";

export function HelloExample() {
  const [name, setName] = useState("");
  const { data, isLoading, refetch } = trpc.hello.useQuery(
    { name: name || undefined },
    { enabled: false }
  );

  return (
    <DemoCard
      title="Hello Query"
      description="Simple query to test the connection"
      icon={Zap}
      iconColorClass="bg-primary/10 text-primary"
      glowClass="glow-primary"
    >
      <div className="flex gap-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name..."
          className="flex-1"
        />
        <Button
          onClick={() => refetch()}
          disabled={isLoading}
          className="min-w-[100px]"
        >
          {isLoading ? (
            <InlineSpinner />
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Send
            </>
          )}
        </Button>
      </div>
      {data && <CodePreview data={data} />}
    </DemoCard>
  );
}
