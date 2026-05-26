import { Link } from "@tanstack/react-router";

export function NotFound() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
        gap: 16,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#8b5cf6",
        }}
      >
        404
      </p>
      <h1
        style={{
          margin: 0,
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "#111827",
        }}
      >
        Page not found
      </h1>
      <p style={{ margin: 0, maxWidth: 360, fontSize: 15, lineHeight: 1.5, color: "#4b5563" }}>
        This URL is not part of this app. Check the address or return to the form.
      </p>
      <Link
        to="/"
        style={{
          marginTop: 8,
          display: "inline-block",
          padding: "10px 18px",
          borderRadius: 999,
          background: "#8b5cf6",
          color: "#ffffff",
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Go home
      </Link>
    </main>
  );
}
