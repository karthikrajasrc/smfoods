import { LinkButton } from "../components/ui/Button";

export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-4xl font-bold text-paddy">{title}</h1>
      <p className="mt-3 text-muted">This page is coming in the next phase.</p>
      <LinkButton to="/products" className="mt-8">Back to shop</LinkButton>
    </div>
  );
}
