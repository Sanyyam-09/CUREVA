import { useState, useEffect, useRef } from "react";
import { Upload, FileText, Image, Shield, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";

const recordTypes = ["Lab Report", "Prescription", "X-Ray", "Diagnostic", "Discharge Summary", "Other"];

const MedicalRecords = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [recordType, setRecordType] = useState("Lab Report");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const t = useTranslation();

  useEffect(() => { if (user) fetchRecords(); }, [user]);

  const fetchRecords = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("medical_records")
      .select("*")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false });
    if (data) setRecords(data);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("medical-records")
        .upload(filePath, file);

      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        continue;
      }

      const { data: { publicUrl } } = supabase.storage.from("medical-records").getPublicUrl(filePath);

      await supabase.from("medical_records").insert({
        user_id: user.id,
        file_name: file.name,
        file_url: filePath,
        file_type: file.type,
        record_type: recordType,
      });
    }

    setUploading(false);
    fetchRecords();
    toast({ title: t("common.success"), description: "Files uploaded successfully" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (record: any) => {
    if (!window.confirm(`Delete "${record.file_name}"? This cannot be undone.`)) return;
    setDeletingId(record.id);
    const { error: sErr } = await supabase.storage.from("medical-records").remove([record.file_url]);
    const { error: dErr } = await supabase.from("medical_records").delete().eq("id", record.id);
    setDeletingId(null);
    if (sErr || dErr) {
      toast({ title: "Delete failed", description: (sErr || dErr)?.message, variant: "destructive" });
      return;
    }
    fetchRecords();
    toast({ title: "Record deleted" });
  };

  const handleView = async (record: any) => {
    setViewingId(record.id);
    const { data, error } = await supabase.storage.from("medical-records").createSignedUrl(record.file_url, 3600);
    setViewingId(null);
    if (error || !data?.signedUrl) {
      toast({ title: "Couldn't open file", description: error?.message ?? "No signed URL", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("records.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("records.subtitle")}</p>
        </div>

        <div className="rounded-xl border-2 border-dashed border-border bg-card p-8 text-center">
          <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="font-semibold text-foreground mb-1">{t("records.upload")}</h3>
          <p className="text-sm text-muted-foreground mb-4">Prescriptions, lab reports, X-rays (PDF, JPG, PNG)</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Select value={recordType} onValueChange={setRecordType}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {recordTypes.map((rt) => <SelectItem key={rt} value={rt}>{rt}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="gap-2" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              {uploading ? t("common.loading") : t("records.chooseFiles")}
            </Button>
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleUpload} />
          </div>
        </div>

        <div className="space-y-3">
          {records.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No records uploaded yet. Upload your first document above.</p>
          ) : records.map((record) => (
            <div key={record.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {record.file_type?.includes("image") ? <Image className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground truncate">{record.file_name}</h4>
                <p className="text-xs text-muted-foreground">{record.record_type} · {new Date(record.uploaded_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => handleView(record)}>
                  <ExternalLink className="h-3.5 w-3.5" />{t("records.view")}
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(record)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MedicalRecords;
