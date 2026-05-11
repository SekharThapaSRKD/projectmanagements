"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileText,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Search,
  Clock,
  ChevronRight,
  Download,
  Paperclip,
  Loader2,
} from "lucide-react";

import {
  useMemo,
  useState,
  useEffect,
  useRef,
  ChangeEvent,
} from "react";

import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import {
  createTeamFlowResource,
  getTeamFlowApiBase,
} from "@/lib/teamflow-api";

import { useAppStore } from "@/lib/store";

import type { DocumentFile } from "@/lib/types";

export function DocsView() {
  const {
    documents,
    activeProjectId,
    addDocument,
    updateDocument,
    deleteDocument,
    addNotification,
  } = useAppStore();

  const projectDocs = useMemo(() => {
    return documents.filter(
      (document) => document.projectId === activeProjectId
    );
  }, [documents, activeProjectId]);

  const [selectedId, setSelectedId] = useState<string | null>(
    projectDocs[0]?.id ?? null
  );

  useEffect(() => {
    if (
      projectDocs.length > 0 &&
      (!selectedId ||
        !projectDocs.find((d) => d.id === selectedId))
    ) {
      setSelectedId(projectDocs[0].id);
    }
  }, [projectDocs, selectedId]);

  const selectedDoc =
    projectDocs.find((document) => document.id === selectedId) ??
    projectDocs[0] ??
    null;

  const [draftTitle, setDraftTitle] = useState(
    selectedDoc?.title ?? ""
  );

  const [draftContent, setDraftContent] = useState(
    selectedDoc?.content ?? ""
  );

  const [searchQuery, setSearchQuery] = useState("");

  const [viewMode, setViewMode] = useState<
    "split" | "edit" | "preview"
  >("split");

  useEffect(() => {
    setDraftTitle(selectedDoc?.title ?? "");
    setDraftContent(selectedDoc?.content ?? "");
  }, [selectedDoc]);

  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return projectDocs;

    const lowerQuery = searchQuery.toLowerCase();

    return projectDocs.filter(
      (d) =>
        d.title.toLowerCase().includes(lowerQuery) ||
        d.content.toLowerCase().includes(lowerQuery)
    );
  }, [projectDocs, searchQuery]);

  const handleSave = () => {
    if (!selectedDoc) {
      const id = addDocument({
        title: draftTitle || "Untitled doc",
        content: draftContent,
        projectId: activeProjectId,
      });

      setSelectedId(id);

      return;
    }

    updateDocument(selectedDoc.id, {
      title: draftTitle,
      content: draftContent,
    });
  };

  const [uploadingFiles, setUploadingFiles] = useState<
    Set<string>
  >(new Set());

  const [uploadProgress, setUploadProgress] = useState<
    Record<string, number>
  >({});

  const [uploadNames, setUploadNames] = useState<
    Record<string, string>
  >({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const openUploadPicker = () => {
    fileInputRef.current?.click();
  };

  const uploadFileWithProgress = (
    file: File,
    docId: string,
    onProgress: (p: number) => void
  ) => {
    return new Promise<DocumentFile>((resolve, reject) => {
      const base = getTeamFlowApiBase();

      if (!base) {
        reject(new Error("Backend not configured"));
        return;
      }

      const xhr = new XMLHttpRequest();

      xhr.open(
        "POST",
        `${base}/api/v1/documents/${docId}/files`
      );

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("authToken")
          : null;

      if (token) {
        xhr.setRequestHeader(
          "Authorization",
          `Bearer ${token}`
        );
      }

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = Math.round(
            (ev.loaded / ev.total) * 100
          );

          onProgress(pct);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(
              xhr.responseText
            ) as DocumentFile;

            resolve(res);
          } catch (err) {
            reject(err);
          }
        } else {
          reject(
            new Error(
              xhr.responseText ||
              `Upload failed (${xhr.status})`
            )
          );
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network error"));
      };

      const fd = new FormData();

      fd.append("file", file);

      xhr.send(fd);
    });
  };

  const handleFileUpload = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.currentTarget.files;

    if (!files) return;

    const MAX_BYTES = 50 * 1024 * 1024;

    const allowedTypes = [
      /^image\//,
      /pdf$/,
      /msword|officedocument/,
      /zip$/,
      /text\//,
    ];

    let docId = selectedDoc?.id ?? null;

    let serverDoc: any = null;

    if (!docId) {
      try {
        serverDoc = await createTeamFlowResource(
          "documents",
          {
            title: "Uploaded Files",
            content: "",
            projectId: activeProjectId,
          }
        );

        useAppStore.setState((state) => ({
          documents: [serverDoc, ...state.documents],
        }));

        setSelectedId(serverDoc.id);

        docId = serverDoc.id;
      } catch (err) {
        console.error(
          "Failed to create document on server:",
          err
        );

        addNotification?.({
          type: "system",
          title: "Upload failed",
          message:
            "Unable to create document on server.",
        });

        return;
      }
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      const fileKey = `${Date.now()}-${i}-${file.name}`;

      setUploadingFiles(
        (prev) => new Set([...prev, fileKey])
      );

      setUploadProgress((prev) => ({
        ...prev,
        [fileKey]: 0,
      }));

      setUploadNames((prev) => ({
        ...prev,
        [fileKey]: file.name,
      }));

      if (file.size > MAX_BYTES) {
        addNotification?.({
          type: "system",
          title: "File too large",
          message: `${file.name} exceeds 50MB limit.`,
        });

        setUploadingFiles((prev) => {
          const s = new Set(prev);

          s.delete(fileKey);

          return s;
        });

        continue;
      }

      if (
        !allowedTypes.some(
          (rx) =>
            rx.test(file.type) ||
            rx.test(file.name)
        )
      ) {
        addNotification?.({
          type: "system",
          title: "Unsupported file",
          message: `File type not allowed: ${file.name}`,
        });

        setUploadingFiles((prev) => {
          const s = new Set(prev);

          s.delete(fileKey);

          return s;
        });

        continue;
      }

      try {
        const uploadedFile =
          await uploadFileWithProgress(
            file,
            docId!,
            (p) => {
              setUploadProgress((prev) => ({
                ...prev,
                [fileKey]: p,
              }));
            }
          );

        updateDocument(docId!, {
          files: [
            ...(selectedDoc?.files || []),
            uploadedFile,
          ],
        });
      } catch (err) {
        console.error(
          "File upload failed:",
          err
        );

        addNotification?.({
          type: "system",
          title: "Upload error",
          message: String(err),
        });
      } finally {
        setUploadingFiles((prev) => {
          const s = new Set(prev);

          s.delete(fileKey);

          return s;
        });

        setUploadProgress((prev) => {
          const copy = { ...prev };

          delete copy[fileKey];

          return copy;
        });

        setUploadNames((prev) => {
          const copy = { ...prev };

          delete copy[fileKey];

          return copy;
        });
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = async (
    fileId: string
  ) => {
    if (!selectedDoc) return;

    try {
      const response = await fetch(
        `/api/v1/documents/${selectedDoc.id}/files/${fileId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        updateDocument(selectedDoc.id, {
          ...selectedDoc,
          files:
            selectedDoc.files?.filter(
              (f) => f.id !== fileId
            ) || [],
        });
      }
    } catch (error) {
      console.error(
        "File deletion failed:",
        error
      );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";

    const k = 1024;

    const sizes = ["B", "KB", "MB", "GB"];

    const i = Math.floor(
      Math.log(bytes) / Math.log(k)
    );

    return (
      Math.round(
        (bytes / Math.pow(k, i)) * 100
      ) /
      100 +
      " " +
      sizes[i]
    );
  };

  return (
    <div className="grid h-[calc(100vh-8rem)] lg:h-[calc(100vh-12rem)] grid-cols-1 lg:grid-cols-[300px_1fr] overflow-hidden rounded-[32px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))]">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      <aside className="hidden lg:flex flex-col border-r border-[hsl(var(--border)/0.5)] bg-[hsl(var(--bg-panel)/0.5)]">
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-3 text-white uppercase tracking-tighter italic">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] shadow-inner">
                <FileText className="h-6 w-6" />
              </div>
              Documentation
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                const id = addDocument({
                  title: "Untitled Document",
                  content: "# New Document\n\nStart typing here...",
                  projectId: activeProjectId,
                });
                setSelectedId(id);
              }}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[hsl(var(--accent))] text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-[hsl(var(--accent)/0.2)] transition hover:scale-[1.02] active:scale-95"
            >
              <Plus className="h-4 w-4" />
              New Doc
            </button>

            <button
              onClick={openUploadPicker}
              disabled={uploadingFiles.size > 0}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/10 active:scale-95 disabled:opacity-50"
            >
              {uploadingFiles.size > 0 ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
              Upload
            </button>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted))] group-focus-within:text-[hsl(var(--accent))] transition-colors" />
            <input
              type="text"
              placeholder="Search doc sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 text-sm text-white placeholder-[hsl(var(--muted))] outline-none focus:border-[hsl(var(--accent)/0.5)] focus:ring-4 focus:ring-[hsl(var(--accent)/0.05)] transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
          <AnimatePresence>
            {filteredDocs.map((document) => {
              const fileCount = document.files?.length ?? 0;

              return (
              <motion.button
                key={document.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.95,
                }}
                onClick={() =>
                  setSelectedId(document.id)
                }
                className={cn(
                  "group relative flex w-full flex-col items-start gap-2 rounded-2xl px-5 py-4 text-left transition-all",
                  selectedId === document.id
                    ? "bg-white/10 border border-white/20 shadow-lg shadow-black/20"
                    : "border border-transparent hover:bg-white/5"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <p className={cn(
                    "truncate font-black uppercase tracking-tight text-xs",
                    selectedId === document.id ? "text-white" : "text-white/60 group-hover:text-white"
                  )}>
                    {document.title || "Untitled Document"}
                  </p>
                  <ChevronRight className={cn(
                    "h-3.5 w-3.5 transition-transform group-hover:translate-x-1",
                    selectedId === document.id ? "text-[hsl(var(--accent))]" : "text-[hsl(var(--muted))]"
                  )} />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(document.updatedAt).toLocaleDateString()}</span>
                  </div>
                  {fileCount > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--accent))]">
                      <Paperclip className="h-3 w-3" />
                      <span>{fileCount}</span>
                    </div>
                  )}
                </div>
                
                {selectedId === document.id && (
                  <motion.div 
                    layoutId="doc-active-indicator"
                    className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-[hsl(var(--accent))] shadow-[0_0_8px_hsl(var(--accent)/0.5)]"
                  />
                )}
              </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </aside>

      <main className="flex flex-col bg-transparent">
        {selectedDoc ? (
          <>
            <header className="flex h-20 shrink-0 items-center justify-between border-b border-white/5 px-8 bg-white/[0.02] backdrop-blur-md">
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Document Node Title"
                className="bg-transparent text-xl font-black uppercase tracking-tighter text-white outline-none placeholder:text-white/20 w-1/2"
              />

              <div className="flex items-center gap-6">
                <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 shadow-inner">
                  {(['edit', 'split', 'preview'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all",
                        viewMode === mode ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"
                      )}
                    >
                      {mode === 'edit' && <Edit3 className="h-3.5 w-3.5" />}
                      {mode === 'preview' && <Eye className="h-3.5 w-3.5" />}
                      {mode}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 border-l border-white/10 pl-6">
                  <button
                    onClick={handleSave}
                    className="h-10 rounded-xl bg-[hsl(var(--accent))] px-6 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-[hsl(var(--accent)/0.2)] transition hover:scale-105 active:scale-95"
                  >
                    Deploy Changes
                  </button>

                  <button
                    onClick={() => {
                      deleteDocument(selectedDoc.id);
                      setSelectedId(projectDocs.find((d) => d.id !== selectedDoc.id)?.id ?? null);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 transition hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </header>

            <div
              className={`flex-1 overflow-hidden grid ${viewMode === "split"
                  ? "xl:grid-cols-[2fr_1fr]"
                  : "grid-cols-1"
                }`}
            >
              <div
                className={`flex-1 overflow-hidden grid ${viewMode === "split"
                    ? "grid-cols-2"
                    : "grid-cols-1"
                  }`}
              >
                {(viewMode === "edit" ||
                  viewMode === "split") && (
                    <div className="flex flex-col p-6">
                      <textarea
                        value={draftContent}
                        onChange={(e) =>
                          setDraftContent(
                            e.target.value
                          )
                        }
                        placeholder="Start writing markdown..."
                        className="flex-1 resize-none bg-transparent font-mono text-sm leading-relaxed outline-none"
                      />
                    </div>
                  )}

                {(viewMode === "preview" ||
                  viewMode === "split") && (
                    <div className="flex-1 overflow-y-auto p-8 bg-[hsl(var(--bg-panel)/0.2)]">
                      <div className="markdown-preview prose prose-invert prose-emerald max-w-none">
                        {draftContent ? (
                          <ReactMarkdown
                            remarkPlugins={[
                              remarkGfm,
                            ]}
                          >
                            {draftContent}
                          </ReactMarkdown>
                        ) : (
                          <div className="text-center mt-20 opacity-30">
                            <FileText className="h-16 w-16 mx-auto mb-4" />
                            <p>
                              Preview will appear
                              here
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>

              {viewMode === "split" && (
                <div className="flex flex-col border-l border-white/5 bg-white/[0.02]">
                  <div className="sticky top-0 border-b border-white/5 px-6 py-4 bg-white/[0.02] backdrop-blur-sm z-10">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--muted))] flex items-center gap-2">
                        <Paperclip className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
                        Attachments ({selectedDoc?.files?.length || 0})
                      </h3>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFiles.size > 0}
                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.1)] transition-colors"
                      >
                        {uploadingFiles.size > 0 ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            Upload
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {Object.keys(uploadNames).length > 0 && (
                      <div className="space-y-3 mb-6">
                        {Object.keys(uploadNames).map((key) => (
                          <div key={key} className="rounded-2xl border border-[hsl(var(--accent)/0.2)] bg-[hsl(var(--accent)/0.05)] p-4">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-[10px] font-black uppercase tracking-tight truncate text-white">
                                {uploadNames[key]}
                              </p>
                              <span className="text-[10px] font-black text-[hsl(var(--accent))]">{uploadProgress[key] ?? 0}%</span>
                            </div>
                            <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress[key] ?? 0}%` }}
                                className="h-full bg-[hsl(var(--accent))] shadow-[0_0_8px_hsl(var(--accent)/0.5)]"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedDoc?.files && selectedDoc.files.length > 0 ? (
                      <AnimatePresence mode="popLayout">
                        {selectedDoc.files.map((file) => (
                          <motion.div
                            key={file.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="group flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 hover:bg-white/5 hover:border-white/10 transition-all"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[hsl(var(--muted))] group-hover:text-white transition-colors">
                              <Paperclip className="h-5 w-5" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white truncate mb-1">{file.name}</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted))]">
                                {formatFileSize(file.size)}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a
                                href={file.url}
                                download
                                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 text-[hsl(var(--muted))] hover:text-white transition-all"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                              <button
                                onClick={() => handleDeleteFile(file.id)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-red-500/10 text-[hsl(var(--muted))] hover:text-red-500 transition-all"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center opacity-20">
                        <Paperclip className="h-12 w-12 mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Zero Attachments</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-[hsl(var(--muted))]">
            <FileText className="mb-4 h-16 w-16 opacity-20" />

            <p className="text-lg font-medium">
              Select a document or create a new
              one
            </p>
          </div>
        )}
      </main>
    </div>
  );
}