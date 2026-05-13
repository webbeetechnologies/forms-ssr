import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

const NotFoundPage = () => {
  return (
    <section className="space-y-4 text-center">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          404
        </p>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground">
          The page you are looking for does not exist or has moved.
        </p>
      </div>
      <div className="flex justify-center">
        <Button asChild>
          <Link to="/">Go back home</Link>
        </Button>
      </div>
    </section>
  );
};

export default NotFoundPage;
