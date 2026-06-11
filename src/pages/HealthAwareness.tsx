import { useEffect, useState } from "react";
import { Heart, Brain, Apple, AlertTriangle, BookOpen, Loader2, Clock, Search } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  category: string;
  cover_url: string | null;
  author: string | null;
  published_at: string;
  read_minutes: number;
};

const categoryIcons: Record<string, any> = {
  "Preventive Care": Heart,
  "Mental Health": Brain,
  "Nutrition": Apple,
  "Chronic Diseases": AlertTriangle,
  "Cardiac": Heart,
  "Womens Health": Heart,
  "Children": BookOpen,
  "Respiratory": Heart,
  "Bone & Joint": BookOpen,
  "Schemes": BookOpen,
  "Fitness": Heart,
};

// Minimal markdown to JSX
function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const out: JSX.Element[] = [];
  let listBuf: string[] = [];
  const flushList = () => {
    if (listBuf.length) {
      out.push(<ul key={out.length} className="list-disc pl-6 space-y-1 my-3 text-foreground/90">{listBuf.map((l, i) => <li key={i}>{l}</li>)}</ul>);
      listBuf = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("## ")) { flushList(); out.push(<h2 key={out.length} className="text-xl font-bold mt-5 mb-2 text-foreground">{line.slice(3)}</h2>); }
    else if (line.startsWith("### ")) { flushList(); out.push(<h3 key={out.length} className="text-lg font-semibold mt-4 mb-2 text-foreground">{line.slice(4)}</h3>); }
    else if (line.startsWith("- ")) { listBuf.push(line.slice(2)); }
    else if (/^\d+\.\s/.test(line)) { listBuf.push(line.replace(/^\d+\.\s/, "")); }
    else if (line === "") { flushList(); }
    else { flushList(); out.push(<p key={out.length} className="my-2 text-foreground/90 leading-relaxed">{line}</p>); }
  }
  flushList();
  return out;
}

const HealthAwareness = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [open, setOpen] = useState<Article | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("health_articles").select("*").eq("is_published", true).order("published_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast({ title: "Failed to load articles", description: error.message, variant: "destructive" });
        setArticles((data as Article[]) || []);
        setLoading(false);
      });
  }, []);

  const categories = ["All", ...Array.from(new Set(articles.map((a) => a.category)))];
  const filtered = articles.filter((a) => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || (a.excerpt || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || a.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Health Awareness</h1>
        <p className="text-muted-foreground mb-6">Trusted articles from doctors and health experts</p>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((c) => (
              <Button key={c} size="sm" variant={category === c ? "default" : "outline"} onClick={() => setCategory(c)}>{c}</Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a, i) => {
              const Icon = categoryIcons[a.category] || BookOpen;
              return (
                <motion.button
                  key={a.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}
                  onClick={() => setOpen(a)}
                  className="text-left rounded-xl border border-border bg-card shadow-card overflow-hidden hover:shadow-card-hover transition-shadow"
                >
                  <div className="aspect-video bg-gradient-to-br from-primary/10 via-secondary/10 to-medical-green/10 flex items-center justify-center">
                    <Icon className="h-12 w-12 text-primary/50" />
                  </div>
                  <div className="p-4">
                    <span className="inline-block text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-2">{a.category}</span>
                    <h3 className="font-semibold text-card-foreground line-clamp-2">{a.title}</h3>
                    {a.excerpt && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.excerpt}</p>}
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{a.author}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{a.read_minutes} min read</span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
            {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-10">No articles found.</p>}
          </div>
        )}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl">{open?.title}</DialogTitle>
            <div className="flex items-center gap-3 text-sm text-muted-foreground pt-1">
              <span>{open?.author}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{open?.read_minutes} min</span>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{open?.category}</span>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            {open && renderMarkdown(open.content)}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default HealthAwareness;
