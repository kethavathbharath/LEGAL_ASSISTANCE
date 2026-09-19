import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileCheck2,
  FileText,
  GitCompareArrows,
  Info,
  LayoutDashboard,
  ListChecks,
  Loader2,
  LockKeyhole,
  Menu,
  MessageSquareText,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type {
  AnalysisResult,
  Clause,
  ComparisonResult,
  DocumentRecord,
  QAResult,
} from "../../../shared/legal";

const navItems: Array<{ id: View; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "review", label: "Document review", icon: FileCheck2 },
  { id: "compare", label: "Compare", icon: GitCompareArrows },
  { id: "ask", label: "Ask LegalLens", icon: MessageSquareText },
  { id: "checklist", label: "Checklists", icon: ListChecks },
];

type View = "overview" | "review" | "compare" | "ask" | "checklist";
type UploadMode = "primary" | "compare";

const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  helper: string;
  tone: "blue" | "amber" | "mint" | "violet";
}) {
  return (
    <article className={`stat-card stat-${tone}`}>
      <div className="stat-icon" aria-hidden="true">
        <Icon size={18} strokeWidth={2.2} />
      </div>
      <div>
        <p className="eyebrow">{label}</p>
        <p className="stat-value">{value}</p>
        <p className="stat-helper">{helper}</p>
      </div>
    </article>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-header">
      <div>
        {eyebrow && <p className="eyebrow accent-eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <p className="section-description">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "blue" | "amber" | "mint" | "red";
}) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function UploadZone({
  onFile,
  isBusy,
  mode,
  compact = false,
}: {
  onFile: (file: File) => void;
  isBusy: boolean;
  mode: UploadMode;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const accept =
    ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
  const pick = (file?: File) => file && onFile(file);
  return (
    <div
      className={`upload-zone ${dragging ? "is-dragging" : ""} ${compact ? "upload-compact" : ""}`}
      onDragOver={event => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={event => {
        event.preventDefault();
        setDragging(false);
        pick(event.dataTransfer.files[0]);
      }}
      role="button"
      tabIndex={0}
      aria-label={
        mode === "primary"
          ? "Upload a legal document"
          : "Upload a second document for comparison"
      }
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ")
          inputRef.current?.click();
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={accept}
        onChange={event => {
          pick(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      <div className="upload-icon" aria-hidden="true">
        {isBusy ? (
          <Loader2 className="spin" size={22} />
        ) : (
          <UploadCloud size={22} />
        )}
      </div>
      <div className="upload-copy">
        <strong>
          {isBusy
            ? "Reading and analyzing…"
            : compact
              ? "Add a second document"
              : "Drop a legal document here"}
        </strong>
        <span>
          {isBusy
            ? "Extracting text and highlighting what may matter."
            : "or choose a file from your device · PDF, DOCX, TXT · up to 10 MB"}
        </span>
      </div>
      {!isBusy && (
        <span className="upload-cta">
          Browse files <ChevronRight size={15} />
        </span>
      )}
    </div>
  );
}

function ClauseRow({ clause }: { clause: Clause }) {
  return (
    <article className="clause-row">
      <div
        className={`severity-dot severity-${clause.severity}`}
        aria-label={`${clause.severity} attention`}
      />
      <div className="clause-main">
        <div className="row-title">
          <strong>{clause.type}</strong>
          <Pill
            tone={
              clause.severity === "high"
                ? "red"
                : clause.severity === "medium"
                  ? "amber"
                  : "blue"
            }
          >
            {clause.severity} attention
          </Pill>
        </div>
        <p>{clause.explanation}</p>
        <blockquote>“{clause.text}”</blockquote>
        <div className="row-meta">
          <span>
            <Info size={13} />
            {clause.location}
          </span>
          <span>{clause.whyItMatters}</span>
        </div>
      </div>
    </article>
  );
}

function ObligationItem({
  item,
  onToggle,
}: {
  item: AnalysisResult["obligations"][number];
  onToggle: () => void;
}) {
  return (
    <div className={`obligation-item ${item.completed ? "is-complete" : ""}`}>
      <button
        type="button"
        className={`check-button ${item.completed ? "checked" : ""}`}
        onClick={onToggle}
        aria-pressed={item.completed}
        aria-label={
          item.completed
            ? `Mark incomplete: ${item.text}`
            : `Mark complete: ${item.text}`
        }
      >
        {item.completed && <Check size={14} />}
      </button>
      <span className="obligation-copy">
        <strong>{item.text}</strong>
        <small>
          {item.owner} · {item.timing}
        </small>
        <em>Source: {item.source}</em>
      </span>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeDocumentId, setActiveDocumentId] = useState("demo-northstar");
  const [localDocuments, setLocalDocuments] = useState<DocumentRecord[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMode, setUploadMode] = useState<UploadMode>("primary");
  const [question, setQuestion] = useState(
    "What happens if I terminate this agreement early?"
  );
  const [answer, setAnswer] = useState<QAResult | null>(null);
  const [compareAId, setCompareAId] = useState("demo-northstar");
  const [compareBId, setCompareBId] = useState("");
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [completedObligations, setCompletedObligations] = useState<
    Record<string, boolean>
  >({});
  const [showAllClauses, setShowAllClauses] = useState(false);
  // Never block the UI indefinitely — give the server 3 s then show the app
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setLoadingTimedOut(true), 3000);
    return () => window.clearTimeout(t);
  }, []);

  const demoQuery = trpc.legal.demo.useQuery(undefined, {
    staleTime: Infinity,
  });
  const documentsQuery = trpc.legal.documents.useQuery(undefined, {
    staleTime: 30_000,
  });
  const analyzeMutation = trpc.legal.analyze.useMutation();
  const askMutation = trpc.legal.ask.useMutation();
  const compareMutation = trpc.legal.compare.useMutation();

  const demo = demoQuery.data;
  const documents = useMemo(() => {
    const all = [
      ...(demo ? [demo] : []),
      ...localDocuments,
      ...(documentsQuery.data ?? []),
    ];
    return Array.from(
      new Map(all.map(document => [document.id, document])).values()
    );
  }, [demo, localDocuments, documentsQuery.data]);
  const activeDocument =
    documents.find(document => document.id === activeDocumentId) ??
    demo ??
    localDocuments[0];
  const compareA = documents.find(document => document.id === compareAId);
  const compareB = documents.find(document => document.id === compareBId);
  const analysis = activeDocument?.analysis;
  const clauses = analysis?.clauses ?? [];
  const visibleClauses = showAllClauses ? clauses : clauses.slice(0, 4);
  const totalAttention = clauses.filter(
    clause => clause.severity === "high"
  ).length;
  const obligations = analysis?.obligations ?? [];
  const checkedCount = obligations.filter(
    (item, index) =>
      completedObligations[`${activeDocumentId}-${index}`] ?? item.completed
  ).length;

  useEffect(() => {
    if (demo && !activeDocumentId) setActiveDocumentId(demo.id);
  }, [demo, activeDocumentId]);

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(new Error("Could not read that file."));
      reader.readAsDataURL(file);
    });

  const handleFile = async (file: File, mode: UploadMode = uploadMode) => {
    const extension = file.name.toLowerCase().split(".").pop();
    if (!extension || !["pdf", "docx", "txt"].includes(extension))
      return toast.error("Upload a PDF, DOCX, or TXT file.");
    if (file.size === 0) return toast.error("That file is empty.");
    if (file.size > 10 * 1024 * 1024)
      return toast.error("Files must be 10 MB or smaller.");
    setUploadProgress(18);
    try {
      const data = await fileToBase64(file);
      setUploadProgress(52);
      const record = await analyzeMutation.mutateAsync({
        name: file.name,
        size: file.size,
        data,
      });
      setUploadProgress(100);
      setLocalDocuments(previous => [
        record,
        ...previous.filter(document => document.id !== record.id),
      ]);
      if (mode === "compare") {
        setCompareBId(record.id);
        setView("compare");
      } else {
        setActiveDocumentId(record.id);
        setView("review");
      }
      toast.success("Document analyzed", {
        description: `${record.name} is ready for review.`,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The document could not be analyzed."
      );
    } finally {
      window.setTimeout(() => setUploadProgress(0), 700);
    }
  };

  const loadRevision = async () => {
    const revisionText = `INDEPENDENT CONTRACTOR AGREEMENT\n\nThis Agreement is between Northstar Studio LLC (Client) and Jordan Lee (Contractor), effective March 1, 2026.\n\n1. Services. Contractor will provide product design services and deliver the final design system by May 15, 2026.\n2. Payment. Client will pay Contractor $5,200 in one installment on delivery. Invoices are due within 30 days.\n3. Confidentiality. Each party must protect confidential information during the engagement and for one year after termination.\n4. Work product. Client owns final design files only after payment in full.\n5. Termination. Either party may terminate with 30 days written notice. Client pays for accepted work completed through the termination date.\n6. Limitation of liability. Neither party is liable for indirect or consequential damages.\n`;
    const file = new File(
      [revisionText],
      "Northstar contractor agreement — revision.txt",
      { type: "text/plain" }
    );
    setUploadMode("compare");
    await handleFile(file, "compare");
  };

  const askQuestion = async () => {
    if (!activeDocument || question.trim().length < 3) return;
    try {
      const result = await askMutation.mutateAsync({
        documentId: activeDocument.id,
        question: question.trim(),
      });
      setAnswer(result);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The question could not be answered."
      );
    }
  };

  const runComparison = async () => {
    if (!compareA || !compareB || compareA.id === compareB.id)
      return toast.error("Choose two different documents to compare.");
    try {
      setComparison(
        await compareMutation.mutateAsync({
          documentAId: compareA.id,
          documentBId: compareB.id,
        })
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The comparison could not be completed."
      );
    }
  };

  const navigate = (next: View) => {
    setView(next);
    setMobileNavOpen(false);
  };

  if ((!activeDocument || demoQuery.isLoading) && !loadingTimedOut)
    return (
      <div className="loading-screen">
        <Loader2 className="spin" size={28} />
        <span>Preparing your secure review workspace…</span>
      </div>
    );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Scale size={20} />
          </div>
          <div>
            <strong>
              Legal<span>Lens</span>
            </strong>
            <small>Document intelligence</small>
          </div>
          <button
            className="mobile-close"
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Primary navigation">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                className={`nav-item ${view === item.id ? "active" : ""}`}
                onClick={() => navigate(item.id)}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {item.id === "review" && <Pill tone="blue">Live</Pill>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-documents">
          <div className="workspace-label">RECENT DOCUMENTS</div>
          {documents.slice(0, 3).map(document => (
            <button
              type="button"
              className={`doc-nav ${document.id === activeDocumentId ? "selected" : ""}`}
              key={document.id}
              onClick={() => {
                setActiveDocumentId(document.id);
                navigate("review");
              }}
            >
              <FileText size={15} />
              <span>{document.name.replace(/\.[^.]+$/, "")}</span>
              <small>{document.type}</small>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="privacy-card">
            <LockKeyhole size={16} />
            <div>
              <strong>Private by design</strong>
              <span>Documents stay in this review session.</span>
            </div>
          </div>
          <button type="button" className="user-card">
            <div className="avatar">
              <UserRound size={15} />
            </div>
            <div>
              <strong>Guest workspace</strong>
              <span>Hackathon demo mode</span>
            </div>
            <ChevronRight size={15} />
          </button>
        </div>
      </aside>
      {mobileNavOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}
      <main className="main-content">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumbs">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{navItems.find(item => item.id === view)?.label}</strong>
          </div>
          <div className="topbar-actions">
            <span className="status-dot">
              <span /> AI ready
            </span>
            <button type="button" className="icon-button" aria-label="Help">
              <CircleHelp size={18} />
            </button>
          </div>
        </header>
        <div className="content-wrap">
          <div className="legal-banner">
            <ShieldCheck size={17} />
            <span>
              <strong>Information, not legal advice.</strong> LegalLens
              simplifies documents and helps you prepare for professional
              review. It does not replace a qualified lawyer.
            </span>
            <button
              type="button"
              onClick={() =>
                toast(
                  "LegalLens never invents missing information and treats uploads as untrusted text.",
                  { icon: <ShieldCheck size={16} /> }
                )
              }
            >
              How it works <ArrowUpRight size={14} />
            </button>
          </div>
          {view === "overview" && (
            <>
              <section className="hero-section">
                <div>
                  <p className="eyebrow accent-eyebrow">A clearer first read</p>
                  <h1>
                    Make the fine print
                    <br />
                    <em>feel navigable.</em>
                  </h1>
                  <p className="hero-copy">
                    Upload a legal document to see plain-language summaries,
                    important clauses, obligations, and questions worth taking
                    to a professional.
                  </p>
                  <div className="hero-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() =>
                        document
                          .getElementById("primary-upload")
                          ?.scrollIntoView({ behavior: "smooth" })
                      }
                    >
                      Analyze a document <ArrowUpRight size={16} />
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => navigate("compare")}
                    >
                      Compare two versions <GitCompareArrows size={16} />
                    </button>
                  </div>
                </div>
                <div className="hero-visual" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="hero-document">
                    <div className="doc-top">
                      <span className="mini-logo">
                        <Scale size={11} />
                      </span>
                      <span>AGREEMENT</span>
                      <span className="doc-number">01</span>
                    </div>
                    <div className="doc-line line-long" />
                    <div className="doc-line line-mid" />
                    <div className="doc-highlight" />
                    <div className="doc-line line-long" />
                    <div className="doc-line line-short" />
                    <div className="doc-signature">
                      <span />
                      <span />
                    </div>
                    <div className="doc-stamp">
                      <CheckCircle2 size={14} />
                      <span>reviewed</span>
                    </div>
                  </div>
                  <div className="floating-note">
                    <Sparkles size={15} />
                    <span>
                      <strong>6 insights found</strong>
                      <small>ready to review</small>
                    </span>
                  </div>
                </div>
              </section>
              <section className="stats-grid">
                <StatCard
                  icon={FileText}
                  label="Active document"
                  value={
                    activeDocument.name.length > 24
                      ? `${activeDocument.name.slice(0, 24)}…`
                      : activeDocument.name
                  }
                  helper={`${activeDocument.wordCount.toLocaleString()} words · ${activeDocument.type}`}
                  tone="blue"
                />
                <StatCard
                  icon={AlertTriangle}
                  label="Attention areas"
                  value={totalAttention || "—"}
                  helper="high-priority clauses"
                  tone="amber"
                />
                <StatCard
                  icon={ListChecks}
                  label="Obligations"
                  value={obligations.length}
                  helper={`${checkedCount} marked complete`}
                  tone="mint"
                />
                <StatCard
                  icon={CalendarDays}
                  label="Dates surfaced"
                  value={analysis?.dates.length ?? 0}
                  helper="review your calendar"
                  tone="violet"
                />
              </section>
              <section className="dashboard-grid">
                <div className="panel upload-panel" id="primary-upload">
                  <SectionHeader
                    eyebrow="START HERE"
                    title="Bring in a document"
                    description="Your file is parsed on the server, then analyzed with document-grounded prompts."
                  />
                  <UploadZone
                    onFile={file => {
                      setUploadMode("primary");
                      void handleFile(file, "primary");
                    }}
                    isBusy={
                      analyzeMutation.isPending && uploadMode === "primary"
                    }
                    mode="primary"
                  />
                  {uploadProgress > 0 && (
                    <div className="progress-wrap" aria-live="polite">
                      <div className="progress-label">
                        <span>Processing securely</span>
                        <strong>{uploadProgress}%</strong>
                      </div>
                      <div className="progress-track">
                        <div style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                  <div className="upload-trust">
                    <CheckCircle2 size={15} />
                    <span>Accepted: PDF, DOCX, TXT</span>
                    <span>·</span>
                    <span>10 MB limit</span>
                    <span>·</span>
                    <span>Files are treated as untrusted data</span>
                  </div>
                </div>
                <div className="panel snapshot-panel">
                  <SectionHeader
                    eyebrow="CURRENT SNAPSHOT"
                    title="What to review first"
                    action={
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => navigate("review")}
                        aria-label="Open document review"
                      >
                        <ArrowUpRight size={16} />
                      </button>
                    }
                  />
                  <div className="snapshot-list">
                    <div className="snapshot-item">
                      <div className="snapshot-icon amber">
                        <AlertTriangle size={16} />
                      </div>
                      <div>
                        <strong>
                          {totalAttention
                            ? `${totalAttention} high-attention clause${totalAttention === 1 ? "" : "s"}`
                            : "No high-attention clauses"}
                        </strong>
                        <span>
                          Start with risk and responsibility language.
                        </span>
                      </div>
                    </div>
                    <div className="snapshot-item">
                      <div className="snapshot-icon blue">
                        <WalletCards size={16} />
                      </div>
                      <div>
                        <strong>
                          {analysis?.financialTerms[0] ??
                            "Payment terms are ready"}
                        </strong>
                        <span>Confirm amounts, timing, and conditions.</span>
                      </div>
                    </div>
                    <div className="snapshot-item">
                      <div className="snapshot-icon mint">
                        <ClipboardCheck size={16} />
                      </div>
                      <div>
                        <strong>
                          {obligations.length} obligations extracted
                        </strong>
                        <span>
                          Turn the document into a practical checklist.
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="panel-link"
                    onClick={() => navigate("review")}
                  >
                    Open full document review <ChevronRight size={15} />
                  </button>
                </div>
              </section>
              <section className="feature-strip">
                <div>
                  <p className="eyebrow accent-eyebrow">
                    Built for the first pass
                  </p>
                  <h2>
                    From “what does this mean?” to “what should I ask next?”
                  </h2>
                </div>
                <div className="feature-points">
                  <span>
                    <Sparkles size={15} /> Plain-language summary
                  </span>
                  <span>
                    <GitCompareArrows size={15} /> Version comparison
                  </span>
                  <span>
                    <MessageSquareText size={15} /> Grounded Q&A
                  </span>
                </div>
              </section>
            </>
          )}
          {view === "review" && (
            <section className="page-section">
              <SectionHeader
                eyebrow="DOCUMENT REVIEW"
                title={activeDocument.name}
                description={`${activeDocument.type} · ${formatBytes(activeDocument.size)} · ${activeDocument.wordCount.toLocaleString()} words`}
                action={
                  <div className="header-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => navigate("ask")}
                    >
                      <MessageSquareText size={15} /> Ask a question
                    </button>
                    <button
                      type="button"
                      className="primary-button small"
                      onClick={() => navigate("checklist")}
                    >
                      <ListChecks size={15} /> View checklist
                    </button>
                  </div>
                }
              />
              <div className="review-grid">
                <div className="panel summary-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">EXECUTIVE SUMMARY</p>
                      <h3>In plain language</h3>
                    </div>
                    <Pill
                      tone={analysis?.confidence === "high" ? "mint" : "amber"}
                    >
                      {analysis?.confidence ?? "medium"} confidence
                    </Pill>
                  </div>
                  <p className="lead-paragraph">{analysis?.overview}</p>
                  <div className="summary-block">
                    <span className="summary-label">Main purpose</span>
                    <p>{analysis?.purpose}</p>
                  </div>
                  <div className="summary-two-col">
                    <div>
                      <span className="summary-label">Parties</span>
                      <ul className="clean-list">
                        {(analysis?.parties.length
                          ? analysis.parties
                          : [
                            "Parties were not clearly named in the extracted text.",
                          ]
                        ).map(item => (
                          <li key={item}>
                            <span className="list-bullet" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="summary-label">Termination</span>
                      <p>{analysis?.termination}</p>
                    </div>
                  </div>
                  <div className="summary-callout">
                    <ShieldCheck size={17} />
                    <span>
                      LegalLens only reports what it can ground in this
                      document. Review the original before relying on any
                      summary.
                    </span>
                  </div>
                </div>
                <div className="panel quick-facts">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">QUICK FACTS</p>
                      <h3>Signals to verify</h3>
                    </div>
                    <Info size={17} className="muted-icon" />
                  </div>
                  <div className="fact-list">
                    <div>
                      <CalendarDays size={16} />
                      <span>Important dates</span>
                      <strong>{analysis?.dates.length ?? 0}</strong>
                    </div>
                    <div>
                      <WalletCards size={16} />
                      <span>Financial signals</span>
                      <strong>{analysis?.financialTerms.length ?? 0}</strong>
                    </div>
                    <div>
                      <AlertTriangle size={16} />
                      <span>Attention areas</span>
                      <strong>{analysis?.attentionAreas.length ?? 0}</strong>
                    </div>
                    <div>
                      <Scale size={16} />
                      <span>Clauses detected</span>
                      <strong>{clauses.length}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="panel-link"
                    onClick={() => navigate("compare")}
                  >
                    Compare with another document <ChevronRight size={15} />
                  </button>
                </div>
              </div>
              <div className="review-lower-grid">
                <div className="panel clauses-panel">
                  <SectionHeader
                    eyebrow="IMPORTANT CLAUSES"
                    title="What may matter"
                    description="Keyword-assisted extraction plus document-grounded explanations."
                    action={
                      clauses.length > 4 ? (
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => setShowAllClauses(current => !current)}
                        >
                          {showAllClauses
                            ? "Show fewer"
                            : `View all ${clauses.length}`}{" "}
                          <ChevronRight size={14} />
                        </button>
                      ) : undefined
                    }
                  />
                  <div className="clause-list">
                    {visibleClauses.map(clause => (
                      <ClauseRow
                        clause={clause}
                        key={`${clause.type}-${clause.location}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="panel attention-panel">
                  <SectionHeader
                    eyebrow="ATTENTION AREAS"
                    title="Read with care"
                  />
                  <div className="attention-list">
                    {(analysis?.attentionAreas ?? []).map(item => (
                      <div className="attention-item" key={item}>
                        <AlertTriangle size={15} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="lawyer-questions">
                    <p className="eyebrow">PREP FOR A PROFESSIONAL</p>
                    <h3>Questions to bring</h3>
                    {(analysis?.lawyerQuestions ?? []).slice(0, 3).map(item => (
                      <div className="question-chip" key={item}>
                        <CircleHelp size={14} />
                        <span>{item}</span>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="panel-link"
                      onClick={() => navigate("ask")}
                    >
                      Ask LegalLens about this <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
          {view === "compare" && (
            <section className="page-section">
              <SectionHeader
                eyebrow="COMPARE DOCUMENTS"
                title="See what changed"
                description="Compare two versions in plain language, with the original text kept in view."
                action={
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void loadRevision()}
                  >
                    <Sparkles size={15} /> Load demo revision
                  </button>
                }
              />
              <div className="compare-picker panel">
                <div className="select-field">
                  <label htmlFor="document-a">Document A · original</label>
                  <select
                    id="document-a"
                    value={compareAId}
                    onChange={event => setCompareAId(event.target.value)}
                  >
                    {documents.map(document => (
                      <option value={document.id} key={document.id}>
                        {document.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="versus">vs</div>
                <div className="select-field">
                  <label htmlFor="document-b">Document B · revision</label>
                  <select
                    id="document-b"
                    value={compareBId}
                    onChange={event => setCompareBId(event.target.value)}
                  >
                    <option value="">Choose a second document</option>
                    {documents
                      .filter(document => document.id !== compareAId)
                      .map(document => (
                        <option value={document.id} key={document.id}>
                          {document.name}
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  disabled={compareMutation.isPending || !compareBId}
                  onClick={() => void runComparison()}
                >
                  {compareMutation.isPending ? (
                    <Loader2 className="spin" size={15} />
                  ) : (
                    <GitCompareArrows size={15} />
                  )}{" "}
                  Compare now
                </button>
              </div>
              {!compareBId && (
                <div className="compare-empty">
                  <div className="empty-icon">
                    <GitCompareArrows size={22} />
                  </div>
                  <h3>Bring in the second version</h3>
                  <p>
                    Upload a revised contract or use the demo revision to see
                    changed dates, money, duties, and exit terms.
                  </p>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setUploadMode("compare");
                      document
                        .getElementById("compare-upload")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Upload second document <UploadCloud size={15} />
                  </button>
                </div>
              )}
              <div id="compare-upload" className="compare-upload">
                <UploadZone
                  onFile={file => {
                    setUploadMode("compare");
                    void handleFile(file, "compare");
                  }}
                  isBusy={analyzeMutation.isPending && uploadMode === "compare"}
                  mode="compare"
                  compact
                />
              </div>
              {comparison && (
                <div className="comparison-results">
                  <div className="comparison-summary panel">
                    <div className="panel-heading">
                      <div>
                        <p className="eyebrow">AI COMPARISON</p>
                        <h3>What changed overall</h3>
                      </div>
                      <Pill
                        tone={
                          comparison.overallRisk === "high"
                            ? "red"
                            : comparison.overallRisk === "medium"
                              ? "amber"
                              : "mint"
                        }
                      >
                        {comparison.overallRisk} review priority
                      </Pill>
                    </div>
                    <p className="lead-paragraph">{comparison.summary}</p>
                  </div>
                  <div className="change-list">
                    {comparison.changes.map((change, index) => (
                      <article
                        className="change-card"
                        key={`${change.title}-${index}`}
                      >
                        <div className="change-top">
                          <Pill
                            tone={
                              change.impact === "high"
                                ? "red"
                                : change.impact === "medium"
                                  ? "amber"
                                  : "blue"
                            }
                          >
                            {change.impact} impact
                          </Pill>
                          <span>{change.category}</span>
                        </div>
                        <h3>{change.title}</h3>
                        <div className="diff-grid">
                          <div>
                            <small>Document A</small>
                            <p>{change.documentA}</p>
                          </div>
                          <div>
                            <small>Document B</small>
                            <p>{change.documentB}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  {comparison.unchanged.length > 0 && (
                    <div className="panel unchanged">
                      <p className="eyebrow">NO MATERIAL CHANGE DETECTED</p>
                      <div>
                        {comparison.unchanged.map(item => (
                          <span key={item}>
                            <CheckCircle2 size={14} />
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
          {view === "ask" && (
            <section className="page-section ask-page">
              <SectionHeader
                eyebrow="DOCUMENT-GROUNDED Q&A"
                title="Ask about the document"
                description="Answers are based on the selected document only. If the text does not say, LegalLens will say so."
                action={
                  <select
                    className="document-select"
                    aria-label="Choose document for questions"
                    value={activeDocumentId}
                    onChange={event => setActiveDocumentId(event.target.value)}
                  >
                    {documents.map(document => (
                      <option value={document.id} key={document.id}>
                        {document.name}
                      </option>
                    ))}
                  </select>
                }
              />
              <div className="ask-layout">
                <div className="panel chat-panel">
                  <div className="chat-top">
                    <div className="assistant-avatar">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <strong>LegalLens assistant</strong>
                      <span>Grounded in {activeDocument.name}</span>
                    </div>
                    <Pill tone="mint">
                      <span className="tiny-dot" /> Ready
                    </Pill>
                  </div>
                  <div className="suggestion-row">
                    <button
                      type="button"
                      onClick={() =>
                        setQuestion(
                          "What happens if I terminate this agreement early?"
                        )
                      }
                    >
                      Early termination
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setQuestion("What payment terms should I review?")
                      }
                    >
                      Payment terms
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuestion("Who owns the work product?")}
                    >
                      Ownership
                    </button>
                  </div>
                  <label className="question-label" htmlFor="question">
                    Your question
                  </label>
                  <textarea
                    id="question"
                    value={question}
                    onChange={event => setQuestion(event.target.value)}
                    placeholder="Ask a question about the uploaded document…"
                    maxLength={600}
                  />
                  <div className="chat-actions">
                    <span>
                      {question.length}/600 · document content is treated as
                      untrusted text
                    </span>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={
                        askMutation.isPending || question.trim().length < 3
                      }
                      onClick={() => void askQuestion()}
                    >
                      {askMutation.isPending ? (
                        <Loader2 className="spin" size={15} />
                      ) : (
                        <MessageSquareText size={15} />
                      )}{" "}
                      Ask LegalLens
                    </button>
                  </div>
                  {answer && (
                    <div
                      className={`answer-card ${answer.grounded ? "grounded" : "not-grounded"}`}
                      aria-live="polite"
                    >
                      <div className="answer-header">
                        <div>
                          <p className="eyebrow">ANSWER</p>
                          <h3>
                            {answer.grounded
                              ? "Here is what the document says"
                              : "Not enough information in this copy"}
                          </h3>
                        </div>
                        {answer.grounded ? (
                          <CheckCircle2 size={20} />
                        ) : (
                          <Info size={20} />
                        )}
                      </div>
                      <p className="answer-copy">{answer.answer}</p>
                      <div className="answer-detail">
                        <span className="summary-label">Relevant section</span>
                        <p>{answer.relevantSection}</p>
                      </div>
                      <div className="answer-detail">
                        <span className="summary-label">Why it matters</span>
                        <p>{answer.whyItMatters}</p>
                      </div>
                      <div className="answer-detail">
                        <span className="summary-label">
                          What to review next
                        </span>
                        <p>{answer.whatToReviewNext}</p>
                      </div>
                    </div>
                  )}
                </div>
                <aside className="panel question-side">
                  <div className="side-illustration">
                    <Scale size={25} />
                    <div className="side-spark spark-a" />
                    <div className="side-spark spark-b" />
                  </div>
                  <p className="eyebrow">A SAFER ANSWER</p>
                  <h3>Ask narrowly. Verify broadly.</h3>
                  <p>
                    LegalLens uses relevant excerpts instead of blindly
                    repeating the entire document. It never treats instructions
                    inside a document as commands.
                  </p>
                  <div className="safety-list">
                    <span>
                      <ShieldCheck size={15} />
                      No invented clauses
                    </span>
                    <span>
                      <ShieldCheck size={15} />
                      No fabricated citations
                    </span>
                    <span>
                      <ShieldCheck size={15} />
                      Uncertainty is explicit
                    </span>
                  </div>
                </aside>
              </div>
            </section>
          )}
          {view === "checklist" && (
            <section className="page-section">
              <SectionHeader
                eyebrow="ACTIONABLE CHECKLIST"
                title="Turn review into next steps"
                description="Mark practical obligations as you verify them, then bring the open items to a professional."
                action={
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setCompletedObligations({})}
                  >
                    <RotateCcw size={15} /> Reset checks
                  </button>
                }
              />
              <div className="checklist-grid">
                <div className="panel checklist-panel">
                  <div className="checklist-progress">
                    <div>
                      <p className="eyebrow">OBLIGATIONS</p>
                      <h3>
                        {checkedCount} of {obligations.length} checked
                      </h3>
                    </div>
                    <div className="progress-ring">
                      <span>
                        {obligations.length
                          ? Math.round(
                            (checkedCount / obligations.length) * 100
                          )
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                  <div className="checklist-track">
                    <div
                      style={{
                        width: `${obligations.length ? (checkedCount / obligations.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="obligation-list">
                    {obligations.map((item, index) => (
                      <ObligationItem
                        key={`${item.text}-${index}`}
                        item={{
                          ...item,
                          completed:
                            completedObligations[
                            `${activeDocumentId}-${index}`
                            ] ?? item.completed,
                        }}
                        onToggle={() =>
                          setCompletedObligations(current => ({
                            ...current,
                            [`${activeDocumentId}-${index}`]: !(
                              current[`${activeDocumentId}-${index}`] ??
                              item.completed
                            ),
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>
                <div className="panel dates-panel">
                  <p className="eyebrow">DATES & MONEY</p>
                  <h3>Keep these in view</h3>
                  <div className="date-list">
                    {(analysis?.dates.length
                      ? analysis.dates
                      : ["No explicit date was detected."]
                    ).map(date => (
                      <div key={date}>
                        <CalendarDays size={15} />
                        <span>{date}</span>
                      </div>
                    ))}
                  </div>
                  <div className="money-list">
                    {(analysis?.financialTerms ?? []).slice(0, 4).map(term => (
                      <div key={term}>
                        <WalletCards size={15} />
                        <span>{term}</span>
                      </div>
                    ))}
                  </div>
                  <div className="summary-callout">
                    <LockKeyhole size={16} />
                    <span>
                      Checklist state is local to this browser session.
                    </span>
                  </div>
                </div>
              </div>
              <div className="review-cta">
                <div>
                  <p className="eyebrow">READY FOR THE NEXT CONVERSATION?</p>
                  <h2>Bring the open questions with you.</h2>
                  <p>
                    Use the generated questions as a starting point for a
                    qualified legal professional.
                  </p>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => navigate("review")}
                >
                  Review lawyer questions <ArrowUpRight size={16} />
                </button>
              </div>
            </section>
          )}
        </div>
        <footer className="app-footer">
          <span>
            <ShieldCheck size={14} /> Built for legal information & document
            assistance
          </span>
          <span>LegalLens · Hackathon demo</span>
        </footer>
      </main>
    </div>
  );
}
