import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, FileIcon, CheckCircle2, Send } from "lucide-react";
import { DemoCard, InlineSpinner } from "@/components/demo";
import { trpc } from "@/lib/trpc";

function FileField({
  label,
  file,
  onSelect,
  onClear,
}: {
  label: string;
  file: File | null;
  onSelect: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      {file ? (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
          <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {file.type || "unknown"} • {formatSize(file.size)}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
            onClick={onClear}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div
          className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-muted/20 cursor-pointer transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4 text-muted-foreground/60 shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Click to upload</span>{" "}
            {label.toLowerCase()}
          </p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onSelect(f);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
}

export function FileUploadExample() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cv, setCv] = useState<File | null>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);

  const submitMutation = trpc.submitUserData.submit.useMutation();

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    if (cv) formData.append("cv", cv);
    if (profileImage) formData.append("profileImage", profileImage);

    await submitMutation.mutateAsync(formData);

    setName("");
    setEmail("");
    setCv(null);
    setProfileImage(null);
  };

  const canSubmit = name.trim() && email.trim() && !submitMutation.isPending;

  return (
    <DemoCard
      title="Submit User Data"
      description="Submit name, email, and files in one tRPC call via multipart/form-data"
      icon={Send}
      iconColorClass="bg-amber-500/10 text-amber-500"
      glowClass="glow-primary"
    >
      {/* Text Fields */}
      <div className="flex gap-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="flex-1"
        />
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          className="flex-1"
        />
      </div>

      {/* Named File Fields */}
      <FileField
        label="CV"
        file={cv}
        onSelect={setCv}
        onClear={() => setCv(null)}
      />
      <FileField
        label="Profile Picture"
        file={profileImage}
        onSelect={setProfileImage}
        onClear={() => setProfileImage(null)}
      />

      {/* Submit */}
      <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
        {submitMutation.isPending ? (
          <>
            <InlineSpinner /> Submitting...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Submit
          </>
        )}
      </Button>

      {/* Error */}
      {submitMutation.error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          {submitMutation.error.message}
        </div>
      )}

      {/* Last Result */}
      {submitMutation.data && (
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
            <span className="text-sm font-medium">
              {submitMutation.data.received.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {submitMutation.data.received.email}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 ml-5">
            {(
              [
                ["cv", submitMutation.data.received.cv],
                ["profileImage", submitMutation.data.received.profileImage],
              ] as const
            )
              .filter(([, f]) => f !== null)
              .map(([key, f]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                >
                  <FileIcon className="h-3 w-3" />
                  {key}: {f!.name}
                </span>
              ))}
          </div>
        </div>
      )}
    </DemoCard>
  );
}
