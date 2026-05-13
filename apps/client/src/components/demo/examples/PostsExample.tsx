import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { FileText, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  DemoCard,
  LoadingSpinner,
  InlineSpinner,
  EmptyState,
  StatusBadge,
} from "@/components/demo";

interface Post {
  id: number;
  title: string;
  content: string | null;
  published: boolean;
}

export function PostsExample() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [authorId, setAuthorId] = useState("1");

  const utils = trpc.useUtils();
  const { data: posts, isLoading } = trpc.posts.getAll.useQuery();

  const createMutation = trpc.posts.create.useMutation({
    onSuccess: () => {
      utils.posts.getAll.invalidate();
      setTitle("");
      setContent("");
    },
  });

  const publishMutation = trpc.posts.publish.useMutation({
    onSuccess: () => utils.posts.getAll.invalidate(),
  });

  const deleteMutation = trpc.posts.delete.useMutation({
    onSuccess: () => utils.posts.getAll.invalidate(),
  });

  const handleCreate = () => {
    createMutation.mutate({
      title,
      content,
    });
  };

  return (
    <DemoCard
      title="Posts"
      description="With publish action and filtering"
      icon={FileText}
      iconColorClass="bg-accent/10 text-accent"
      glowClass="glow-accent"
    >
      {/* Create Form */}
      <CreatePostForm
        title={title}
        content={content}
        authorId={authorId}
        onTitleChange={setTitle}
        onContentChange={setContent}
        onAuthorIdChange={setAuthorId}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      {/* Posts List */}
      {isLoading ? (
        <LoadingSpinner colorClass="text-accent" />
      ) : (
        <div className="space-y-3">
          {posts?.length === 0 && (
            <EmptyState message="No posts yet. Create your first post!" />
          )}
          {posts?.map((post) => {
            if (!post.id || !post.title || post.published === undefined) return null;
            return (
            <PostCard
              key={post.id}
              post={post as Post}
              onPublish={() => publishMutation.mutate({ id: post.id! })}
              onDelete={() => deleteMutation.mutate({ id: post.id! })}
            />
          )})}
        </div>
      )}
    </DemoCard>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface CreatePostFormProps {
  title: string;
  content: string;
  authorId: string;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onAuthorIdChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

function CreatePostForm({
  title,
  content,
  authorId,
  onTitleChange,
  onContentChange,
  onAuthorIdChange,
  onSubmit,
  isLoading,
}: CreatePostFormProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Post title..."
          className="flex-1"
        />
        <div className="w-28">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Author ID
          </Label>
          <Input
            value={authorId}
            onChange={(e) => onAuthorIdChange(e.target.value)}
            type="number"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <Input
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Write something amazing..."
          className="flex-1"
        />
        <Button onClick={onSubmit} disabled={!title || !content || isLoading}>
          {isLoading ? (
            <InlineSpinner />
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface PostCardProps {
  post: Post;
  onPublish: () => void;
  onDelete: () => void;
}

function PostCard({ post, onPublish, onDelete }: PostCardProps) {
  return (
    <div className="item-row p-4 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{post.title}</h3>
            <StatusBadge status={post.published ? "success" : "warning"}>
              {post.published ? "Published" : "Draft"}
            </StatusBadge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {post.content}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!post.published && (
            <Button
              size="sm"
              variant="outline"
              className="text-secondary border-secondary/30 hover:bg-secondary/10"
              onClick={onPublish}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Publish
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
