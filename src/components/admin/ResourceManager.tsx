import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "boolean";
  required?: boolean;
  placeholder?: string;
};

type Props = {
  table: string;
  title: string;
  columns: { key: string; label: string; render?: (row: any) => ReactNode }[];
  fields: FieldDef[];
  orderBy?: string;
  ascending?: boolean;
};

const emptyFromFields = (fields: FieldDef[]) => {
  const o: any = {};
  fields.forEach((f) => { o[f.name] = f.type === "boolean" ? false : f.type === "number" ? 0 : ""; });
  return o;
};

export default function ResourceManager({ table, title, columns, fields, orderBy = "created_at", ascending = false }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from(table as any).select("*").order(orderBy, { ascending }) as any);
    if (error) toast({ title: `Failed to load ${title}`, description: error.message, variant: "destructive" });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [table]);

  const openCreate = () => { setEditing(emptyFromFields(fields)); setEditOpen(true); };
  const openEdit = (row: any) => { setEditing({ ...row }); setEditOpen(true); };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const payload: any = {};
    fields.forEach((f) => {
      let v = editing[f.name];
      if (f.type === "number") v = v === "" || v === null ? null : Number(v);
      payload[f.name] = v;
    });
    let error;
    if (editing.id) {
      ({ error } = await (supabase.from(table as any).update(payload).eq("id", editing.id) as any));
    } else {
      ({ error } = await (supabase.from(table as any).insert(payload) as any));
    }
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing.id ? "Updated" : "Created" });
    setEditOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase.from(table as any).delete().eq("id", id) as any);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deleted" });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Button size="sm" onClick={openCreate} className="gap-1"><Plus className="h-4 w-4" />Add</Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className="max-w-xs truncate">
                      {c.render ? c.render(r) : String(r[c.key] ?? "")}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove(r.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-8">No records yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? `Edit ${title.slice(0, -1)}` : `Add ${title.slice(0, -1)}`}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3 py-2">
              {fields.map((f) => (
                <div key={f.name}>
                  <Label htmlFor={f.name}>{f.label}{f.required && " *"}</Label>
                  {f.type === "textarea" ? (
                    <Textarea id={f.name} value={editing[f.name] ?? ""} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} rows={3} />
                  ) : f.type === "boolean" ? (
                    <div className="pt-2"><Switch checked={!!editing[f.name]} onCheckedChange={(v) => setEditing({ ...editing, [f.name]: v })} /></div>
                  ) : (
                    <Input id={f.name} type={f.type === "number" ? "number" : "text"} step="any"
                      value={editing[f.name] ?? ""} placeholder={f.placeholder}
                      onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} />
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
