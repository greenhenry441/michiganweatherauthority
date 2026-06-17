import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, FileText, Radio, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MI_OFFICES, getProductTypes, getProductList, getProductText } from "@/lib/weather-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/forecasts")({
  head: () => ({
    meta: [
      { title: "NWS Text Products — Michigan Weather Authority" },
      { name: "description", content: "Read the latest NWS forecast discussions, hazardous weather outlooks, and other text products for Michigan." },
    ],
  }),
  component: ForecastsPage,
});

function ForecastsPage() {
  const [office, setOffice] = useState(MI_OFFICES[0].id);
  const [productCode, setProductCode] = useState<string>("AFD");
  const [productId, setProductId] = useState<string | null>(null);

  const types = useQuery({
    queryKey: ["product-types", office],
    queryFn: () => getProductTypes(office),
  });

  // Reset product type if not available for new office
  useEffect(() => {
    if (types.data && types.data.length && !types.data.some((t) => t.productCode === productCode)) {
      const preferred = types.data.find((t) => t.productCode === "AFD") ?? types.data[0];
      setProductCode(preferred.productCode);
    }
  }, [types.data, productCode]);

  const list = useQuery({
    queryKey: ["products", office, productCode],
    queryFn: () => getProductList(office, productCode),
    enabled: !!productCode,
  });

  useEffect(() => {
    if (list.data?.length) setProductId(list.data[0].id);
    else setProductId(null);
  }, [list.data]);

  const product = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProductText(productId!),
    enabled: !!productId,
  });

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-xs text-muted-foreground hover:text-accent inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Back to MWA
        </Link>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
          <Radio className="h-3 w-3 text-accent alert-pulse" /> NWS LIVE
        </div>
      </div>

      <header>
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">Text Products</p>
        <h1 className="font-display text-3xl tracking-tight text-glow flex items-center gap-2">
          <FileText className="h-7 w-7 text-accent" /> Forecast Discussions & Outlooks
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Raw NWS office products — Area Forecast Discussions, Hazardous Weather Outlooks, and more, straight from the source.
        </p>
      </header>

      <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">NWS Office</label>
          <Select value={office} onValueChange={setOffice}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MI_OFFICES.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.id} — {o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Product Type</label>
          <Select value={productCode} onValueChange={setProductCode}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {(types.data ?? []).map((t) => (
                <SelectItem key={t.productCode} value={t.productCode}>
                  {t.productCode} — {t.productName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => { types.refetch(); list.refetch(); product.refetch(); }}>
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", (list.isFetching || product.isFetching) && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-4">
        <aside className="rounded-xl border border-border bg-card p-3 space-y-1 max-h-[70vh] overflow-y-auto">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-1">
            Recent issuances
          </p>
          {(list.data ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground p-3">No recent products.</p>
          )}
          {(list.data ?? []).map((p) => (
            <button
              key={p.id}
              onClick={() => setProductId(p.id)}
              className={cn(
                "w-full text-left rounded-md px-2.5 py-2 text-xs transition-colors",
                productId === p.id ? "bg-accent/15 text-accent border border-accent/40" : "hover:bg-secondary/60 border border-transparent",
              )}
            >
              <p className="font-mono text-[10px] opacity-80">{new Date(p.issuanceTime).toLocaleString()}</p>
              <p className="font-medium truncate">{p.productName}</p>
            </button>
          ))}
        </aside>

        <article className="rounded-xl border border-border bg-card p-5 min-h-[60vh]">
          {product.isLoading && <p className="text-sm text-muted-foreground">Loading product…</p>}
          {product.isError && <p className="text-sm text-destructive">Failed to load product.</p>}
          {product.data && (
            <pre className="font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
              {product.data}
            </pre>
          )}
        </article>
      </div>
    </div>
  );
}
